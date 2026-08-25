import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { resolveTenant } from '@/lib/tenantAuth';
import { checkInItem } from '@/lib/checkInItem';

type RouteContext = { params: Promise<{ id: string }> };

/**
 * POST /api/packs/:id/transmit
 * Body: { location_id, status_id? }
 * Moves all pack items, then destroys the pack.
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

    const body = await request.json();
    const locationId = parseInt(String(body.location_id), 10);
    const statusIdRaw =
      body.status_id !== undefined && body.status_id !== null
        ? parseInt(String(body.status_id), 10)
        : null;

    if (Number.isNaN(locationId)) {
      return NextResponse.json({ error: 'location_id is required' }, { status: 400 });
    }

    const location = await prisma.location.findFirst({
      where: { id: locationId, customer_id: auth.customerId },
    });
    if (!location) {
      return NextResponse.json({ error: 'Invalid location_id' }, { status: 400 });
    }

    const pack = await prisma.pack.findFirst({
      where: { id: packId, customer_id: auth.customerId },
      include: { items: true },
    });

    if (!pack) {
      return NextResponse.json({ error: 'Pack not found' }, { status: 404 });
    }

    if (pack.items.length === 0) {
      return NextResponse.json(
        { error: 'Cannot transmit an empty pack' },
        { status: 400 }
      );
    }

    let statusId = statusIdRaw;
    if (statusId !== null) {
      if (Number.isNaN(statusId)) {
        return NextResponse.json({ error: 'Invalid status_id' }, { status: 400 });
      }
      const status = await prisma.status.findFirst({
        where: { id: statusId, customer_id: auth.customerId },
      });
      if (!status) {
        return NextResponse.json({ error: 'Invalid status_id' }, { status: 400 });
      }
    } else if (pack.status_id) {
      statusId = pack.status_id;
    }

    if (!statusId) {
      return NextResponse.json(
        { error: 'status_id is required (pack has no status set)' },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();
    const movedItemIds: number[] = [];

    for (const packItem of pack.items) {
      await checkInItem({
        customerId: auth.customerId,
        itemId: packItem.item_id,
        locationId,
        statusId,
        dateString: now,
      });
      movedItemIds.push(packItem.item_id);
    }

    // Destroy pack after transmit (cascade deletes pack_item)
    await prisma.pack.delete({ where: { id: packId } });

    return NextResponse.json({
      message: 'Pack transmitted and destroyed',
      moved_count: movedItemIds.length,
      item_ids: movedItemIds,
      location_id: locationId,
      status_id: statusId,
    });
  } catch (error) {
    console.error('Error transmitting pack:', error);
    const message =
      error instanceof Error ? error.message : 'Failed to transmit pack';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
