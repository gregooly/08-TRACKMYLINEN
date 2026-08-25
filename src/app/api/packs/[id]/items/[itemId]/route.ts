import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { resolveTenant } from '@/lib/tenantAuth';

type RouteContext = { params: Promise<{ id: string; itemId: string }> };

/**
 * DELETE /api/packs/:id/items/:itemId — remove one item from pack
 */
export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const auth = await resolveTenant(request);
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { id, itemId: itemIdParam } = await context.params;
    const packId = parseInt(id, 10);
    const itemId = parseInt(itemIdParam, 10);

    if (Number.isNaN(packId) || Number.isNaN(itemId)) {
      return NextResponse.json({ error: 'Invalid pack or item id' }, { status: 400 });
    }

    const pack = await prisma.pack.findFirst({
      where: { id: packId, customer_id: auth.customerId },
    });

    if (!pack) {
      return NextResponse.json({ error: 'Pack not found' }, { status: 404 });
    }

    const deleted = await prisma.packItem.deleteMany({
      where: {
        pack_id: packId,
        item_id: itemId,
        customer_id: auth.customerId,
      },
    });

    if (deleted.count === 0) {
      return NextResponse.json({ error: 'Item not in this pack' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Item removed from pack' });
  } catch (error) {
    console.error('Error removing pack item:', error);
    return NextResponse.json({ error: 'Failed to remove item from pack' }, { status: 500 });
  }
}
