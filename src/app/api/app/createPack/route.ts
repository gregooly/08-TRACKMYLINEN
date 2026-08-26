import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { resolveAppRequest } from '@/lib/appAuth';
import { checkInItem, checkInItemStatusOnly } from '@/lib/checkInItem';

/**
 * Android: create a virtual pack.
 *
 * POST /api/app/createPack
 *
 * Headers:
 *   Authorization: Bearer <token>
 *   X-Customer-Id: <customerId>
 *   Content-Type: application/json
 *
 * Body:
 * {
 *   "name": "Pack #2852",
 *   "status": "good",
 *   "locationId": 1,
 *   "itemIds": [12, 34, 56]
 * }
 *
 * Notes:
 * - Pack remains virtual (no location stored on pack).
 * - status is looked up by label for this customer → pack.status_id.
 * - If locationId is provided with a valid status, member items are
 *   checked in (inventory + history) to that location/status.
 * - If only status is provided, status is cascaded for items that
 *   already have inventory (current location kept).
 */
export async function POST(request: NextRequest) {
  try {
    const auth = resolveAppRequest(request);
    if (!auth.ok) {
      return NextResponse.json(
        { success: false, message: auth.message },
        { status: auth.status }
      );
    }

    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { success: false, message: 'Invalid JSON body' },
        { status: 400 }
      );
    }

    const name =
      typeof body.name === 'string' && body.name.trim()
        ? body.name.trim()
        : null;

    if (!name) {
      return NextResponse.json(
        { success: false, message: 'name is required' },
        { status: 400 }
      );
    }

    const statusLabel =
      typeof body.status === 'string' && body.status.trim()
        ? body.status.trim()
        : null;

    const locationIdRaw = body.locationId ?? body.location_id;
    const locationId =
      locationIdRaw !== undefined && locationIdRaw !== null && locationIdRaw !== ''
        ? parseInt(String(locationIdRaw), 10)
        : null;

    if (locationId !== null && Number.isNaN(locationId)) {
      return NextResponse.json(
        { success: false, message: 'Invalid locationId' },
        { status: 400 }
      );
    }

    const itemIdsRaw = body.itemIds ?? body.item_ids;
    const itemIds: number[] = Array.isArray(itemIdsRaw)
      ? [
          ...new Set(
            itemIdsRaw
              .map((id: unknown) => parseInt(String(id), 10))
              .filter((id: number) => !Number.isNaN(id))
          ),
        ]
      : [];

    let statusId: number | null = null;
    let statusName: string | null = null;

    if (statusLabel) {
      const status = await prisma.status.findFirst({
        where: {
          customer_id: auth.customerId,
          status: statusLabel,
        },
      });
      if (!status) {
        return NextResponse.json(
          { success: false, message: `Unknown status: ${statusLabel}` },
          { status: 400 }
        );
      }
      statusId = status.id;
      statusName = status.status;
    }

    if (locationId !== null) {
      const location = await prisma.location.findFirst({
        where: { id: locationId, customer_id: auth.customerId },
      });
      if (!location) {
        return NextResponse.json(
          { success: false, message: 'Invalid locationId' },
          { status: 400 }
        );
      }
    }

    if (itemIds.length > 0) {
      const items = await prisma.item.findMany({
        where: { id: { in: itemIds }, customer_id: auth.customerId },
        select: { id: true },
      });
      if (items.length !== itemIds.length) {
        return NextResponse.json(
          {
            success: false,
            message: 'One or more items are invalid for this customer',
          },
          { status: 400 }
        );
      }

      const alreadyPacked = await prisma.packItem.findMany({
        where: { item_id: { in: itemIds } },
        select: { item_id: true },
      });
      if (alreadyPacked.length > 0) {
        return NextResponse.json(
          {
            success: false,
            message: 'One or more items are already in a pack',
            itemIds: alreadyPacked.map((p) => p.item_id),
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
        status: { select: { status: true } },
        items: {
          include: {
            item: { select: { id: true, name: true, tag: true } },
          },
          orderBy: { id: 'asc' },
        },
      },
    });

    // Apply location/status to member items (pack itself stays virtual — no location_id).
    if (itemIds.length > 0 && statusId !== null) {
      if (locationId !== null) {
        for (const itemId of itemIds) {
          await checkInItem({
            customerId: auth.customerId,
            itemId,
            locationId,
            statusId,
            dateString: now,
          });
        }
      } else {
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
    }

    return NextResponse.json(
      {
        success: true,
        pack: {
          id: pack.id,
          name: pack.name,
          status: pack.status?.status ?? statusName,
          items: pack.items.map((packItem) => ({
            id: packItem.item.id,
            name: packItem.item.name,
            tag: packItem.item.tag,
          })),
        },
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    console.error('createPack error:', error);
    if (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      (error as { code: string }).code === 'P2002'
    ) {
      return NextResponse.json(
        { success: false, message: 'A pack with this name already exists' },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { success: false, message: 'Failed to create pack' },
      { status: 500 }
    );
  }
}
