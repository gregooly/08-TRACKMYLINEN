import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { resolveTenant } from '@/lib/tenantAuth';

type RouteContext = { params: Promise<{ id: string }> };

/**
 * POST /api/packs/:id/items — add items { item_id } | { tag } | { item_ids: number[] }
 */
export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const auth = await resolveTenant(request);
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { id } = await context.params;
    const packId = parseInt(id, 10);
    if (Number.isNaN(packId)) {
      return NextResponse.json({ error: 'Invalid pack id' }, { status: 400 });
    }

    const pack = await prisma.pack.findFirst({
      where: { id: packId, customer_id: auth.customerId },
    });

    if (!pack) {
      return NextResponse.json({ error: 'Pack not found' }, { status: 404 });
    }

    const body = await request.json();
    const itemIds: number[] = [];

    if (Array.isArray(body.item_ids)) {
      for (const raw of body.item_ids) {
        const n = parseInt(String(raw), 10);
        if (!Number.isNaN(n)) itemIds.push(n);
      }
    } else if (body.item_id) {
      itemIds.push(parseInt(String(body.item_id), 10));
    } else if (typeof body.tag === 'string' && body.tag.trim()) {
      const item = await prisma.item.findFirst({
        where: {
          customer_id: auth.customerId,
          tag: body.tag.trim(),
        },
      });
      if (!item) {
        return NextResponse.json({ error: 'Item tag not found' }, { status: 404 });
      }
      itemIds.push(item.id);
    }

    if (itemIds.length === 0 || itemIds.some((id) => Number.isNaN(id))) {
      return NextResponse.json(
        { error: 'item_id, tag, or item_ids is required' },
        { status: 400 }
      );
    }

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

    const now = new Date().toISOString();
    await prisma.packItem.createMany({
      data: itemIds.map((itemId) => ({
        customer_id: auth.customerId,
        pack_id: packId,
        item_id: itemId,
        added_at: now,
      })),
    });

    const updated = await prisma.pack.findFirst({
      where: { id: packId },
      include: {
        status: { select: { id: true, status: true } },
        items: {
          include: {
            item: { select: { id: true, name: true, tag: true } },
          },
        },
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Error adding pack items:', error);
    return NextResponse.json({ error: 'Failed to add items to pack' }, { status: 500 });
  }
}
