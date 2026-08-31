import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { resolveTenant } from '@/lib/tenantAuth';
import { checkInItem } from '@/lib/checkInItem';
import { notifyPackSendByEmail } from '@/lib/packSendNotification';

/**
 * POST /api/packs/transmit
 * Web convenience: virtual pack from selection — move items then discard pack.
 * Body: { item_ids: number[], location_id, status_id, name? }
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await resolveTenant(request);
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const body = await request.json();
    const itemIds: number[] = Array.isArray(body.item_ids)
      ? body.item_ids
          .map((id: unknown) => parseInt(String(id), 10))
          .filter((id: number) => !Number.isNaN(id))
      : [];
    const locationId = parseInt(String(body.location_id), 10);
    const statusId = parseInt(String(body.status_id), 10);

    if (itemIds.length === 0) {
      return NextResponse.json({ error: 'item_ids is required' }, { status: 400 });
    }
    if (Number.isNaN(locationId) || Number.isNaN(statusId)) {
      return NextResponse.json(
        { error: 'location_id and status_id are required' },
        { status: 400 }
      );
    }

    const location = await prisma.location.findFirst({
      where: { id: locationId, customer_id: auth.customerId },
    });
    if (!location) {
      return NextResponse.json({ error: 'Invalid location_id' }, { status: 400 });
    }

    const status = await prisma.status.findFirst({
      where: { id: statusId, customer_id: auth.customerId },
    });
    if (!status) {
      return NextResponse.json({ error: 'Invalid status_id' }, { status: 400 });
    }

    const items = await prisma.item.findMany({
      where: { id: { in: itemIds }, customer_id: auth.customerId },
      select: { id: true, name: true, tag: true },
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
          error: 'One or more items are already in another pack',
          item_ids: alreadyPacked.map((p) => p.item_id),
        },
        { status: 409 }
      );
    }

    const now = new Date().toISOString();
    const packName =
      typeof body.name === 'string' && body.name.trim()
        ? body.name.trim()
        : `Transmit ${now}-${Math.random().toString(36).slice(2, 8)}`;

    // Create virtual pack → check-in all → destroy pack
    const pack = await prisma.pack.create({
      data: {
        customer_id: auth.customerId,
        name: packName,
        status_id: statusId,
        created_at: now,
        items: {
          create: itemIds.map((itemId) => ({
            customer_id: auth.customerId,
            item_id: itemId,
            added_at: now,
          })),
        },
      },
    });

    try {
      for (const itemId of itemIds) {
        await checkInItem({
          customerId: auth.customerId,
          itemId,
          locationId,
          statusId,
          dateString: now,
        });
      }
    } catch (moveError) {
      // Roll back pack if move fails mid-way
      await prisma.pack.delete({ where: { id: pack.id } }).catch(() => undefined);
      throw moveError;
    }

    await prisma.pack.delete({ where: { id: pack.id } });

    const emailResult = await notifyPackSendByEmail({
      locationName: location.name,
      locationEmail: location.email,
      packName,
      statusName: status.status,
      items: items.map((item) => ({ name: item.name, tag: item.tag })),
      sentAt: now,
    });

    return NextResponse.json({
      message: 'Items transmitted successfully',
      moved_count: itemIds.length,
      item_ids: itemIds,
      location_id: locationId,
      status_id: statusId,
      emailSent: emailResult.emailSent,
    });
  } catch (error) {
    console.error('Error transmitting selection:', error);
    const message =
      error instanceof Error ? error.message : 'Failed to transmit items';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
