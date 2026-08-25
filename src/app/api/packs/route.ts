import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { resolveTenant } from '@/lib/tenantAuth';
import { checkInItemStatusOnly } from '@/lib/checkInItem';

/**
 * GET /api/packs — list packs for tenant
 * POST /api/packs — create pack { name, status_id?, item_ids? }
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await resolveTenant(request);
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const packs = await prisma.pack.findMany({
      where: { customer_id: auth.customerId },
      include: {
        status: { select: { id: true, status: true } },
        items: {
          include: {
            item: { select: { id: true, name: true, tag: true } },
          },
        },
        _count: { select: { items: true } },
      },
      orderBy: { id: 'desc' },
    });

    return NextResponse.json(packs);
  } catch (error) {
    console.error('Error fetching packs:', error);
    return NextResponse.json({ error: 'Failed to fetch packs' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await resolveTenant(request);
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const body = await request.json();
    const name =
      typeof body.name === 'string' && body.name.trim()
        ? body.name.trim()
        : `Pack ${new Date().toISOString()}`;
    const statusId = body.status_id ? parseInt(body.status_id, 10) : null;
    const itemIds: number[] = Array.isArray(body.item_ids)
      ? body.item_ids.map((id: unknown) => parseInt(String(id), 10)).filter((id: number) => !Number.isNaN(id))
      : [];

    if (statusId) {
      const status = await prisma.status.findFirst({
        where: { id: statusId, customer_id: auth.customerId },
      });
      if (!status) {
        return NextResponse.json({ error: 'Invalid status_id' }, { status: 400 });
      }
    }

    if (itemIds.length > 0) {
      const items = await prisma.item.findMany({
        where: { id: { in: itemIds }, customer_id: auth.customerId },
      });
      if (items.length !== itemIds.length) {
        return NextResponse.json(
          { error: 'One or more items are invalid for this customer' },
          { status: 400 }
        );
      }

      const alreadyPacked = await prisma.packItem.findMany({
        where: { item_id: { in: itemIds } },
      });
      if (alreadyPacked.length > 0) {
        return NextResponse.json(
          {
            error: 'One or more items are already in a pack',
            item_ids: alreadyPacked.map((p) => p.item_id),
          },
          { status: 409 }
        );
      }
    }

    const now = new Date().toISOString();

    const pack = await prisma.pack.create({
      data: {
        customer_id: auth.customerId,
        name,
        status_id: statusId,
        created_at: now,
        items:
          itemIds.length > 0
            ? {
                create: itemIds.map((itemId) => ({
                  customer_id: auth.customerId,
                  item_id: itemId,
                  added_at: now,
                })),
              }
            : undefined,
      },
      include: {
        status: { select: { id: true, status: true } },
        items: {
          include: {
            item: { select: { id: true, name: true, tag: true } },
          },
        },
      },
    });

    // If status set at create and items included, cascade status to items that already have inventory
    if (statusId && itemIds.length > 0) {
      for (const itemId of itemIds) {
        const inv = await prisma.inventory.findFirst({
          where: { customer_id: auth.customerId, item_id: itemId },
        });
        if (!inv) continue;
        await checkInItemStatusOnly({
          customerId: auth.customerId,
          itemId,
          statusId,
          dateString: now,
        });
      }
    }

    return NextResponse.json(pack, { status: 201 });
  } catch (error: unknown) {
    console.error('Error creating pack:', error);
    if (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      (error as { code: string }).code === 'P2002'
    ) {
      return NextResponse.json(
        { error: 'A pack with this name already exists' },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: 'Failed to create pack' }, { status: 500 });
  }
}
