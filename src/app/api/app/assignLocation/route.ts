import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { resolveAppRequest } from '@/lib/appAuth';
import { checkInItem } from '@/lib/checkInItem';

/**
 * Android: move individual linens by RFID tag.
 *
 * POST /api/app/assignLocation
 *
 * Headers:
 *   Authorization: Bearer <token>
 *   X-Customer-Id: <customerId>
 *   Content-Type: application/json
 *
 * Body:
 * {
 *   "tags": ["E280689400005012C5A2B3D4", "E2000017221101441890C8A1"],
 *   "status": "good",
 *   "locationId": 5
 * }
 *
 * Behavior:
 * - Resolve each tag → item for this customer
 * - Resolve status by label
 * - Check-in each item (inventory + history) to locationId + status
 * - Does not create/delete packs
 * - Fails if any tag is unknown or any item is currently in a pack
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

    const tagsRaw = body.tags;
    const tags: string[] = Array.isArray(tagsRaw)
      ? [
          ...new Set(
            tagsRaw
              .map((t) => (typeof t === 'string' ? t.trim() : String(t).trim()))
              .filter((t) => t.length > 0)
          ),
        ]
      : [];

    if (tags.length === 0) {
      return NextResponse.json(
        { success: false, message: 'tags is required' },
        { status: 400 }
      );
    }

    const statusLabel =
      typeof body.status === 'string' && body.status.trim()
        ? body.status.trim()
        : null;

    if (!statusLabel) {
      return NextResponse.json(
        { success: false, message: 'status is required' },
        { status: 400 }
      );
    }

    const locationIdRaw = body.locationId ?? body.location_id;
    const locationId =
      locationIdRaw !== undefined && locationIdRaw !== null && locationIdRaw !== ''
        ? parseInt(String(locationIdRaw), 10)
        : NaN;

    if (Number.isNaN(locationId)) {
      return NextResponse.json(
        { success: false, message: 'locationId is required' },
        { status: 400 }
      );
    }

    const location = await prisma.location.findFirst({
      where: { id: locationId, customer_id: auth.customerId },
    });
    if (!location) {
      return NextResponse.json(
        { success: false, message: 'Invalid locationId' },
        { status: 400 }
      );
    }

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

    const items = await prisma.item.findMany({
      where: {
        customer_id: auth.customerId,
        tag: { in: tags },
      },
      select: { id: true, name: true, tag: true },
    });

    const foundByTag = new Map(items.map((item) => [item.tag, item]));
    const unknownTags = tags.filter((tag) => !foundByTag.has(tag));

    if (unknownTags.length > 0) {
      return NextResponse.json(
        {
          success: false,
          message: 'One or more tags were not found',
          unknownTags,
        },
        { status: 400 }
      );
    }

    const itemIds = items.map((item) => item.id);
    const packed = await prisma.packItem.findMany({
      where: {
        item_id: { in: itemIds },
        customer_id: auth.customerId,
      },
      include: {
        pack: { select: { id: true, name: true } },
        item: { select: { tag: true } },
      },
    });

    if (packed.length > 0) {
      return NextResponse.json(
        {
          success: false,
          message: 'One or more items are in a pack. Send or delete the pack first.',
          packedItems: packed.map((p) => ({
            tag: p.item.tag,
            packId: p.pack.id,
            packName: p.pack.name,
          })),
        },
        { status: 409 }
      );
    }

    const now = new Date().toISOString();
    const moved: { id: number; name: string; tag: string }[] = [];

    for (const tag of tags) {
      const item = foundByTag.get(tag)!;
      await checkInItem({
        customerId: auth.customerId,
        itemId: item.id,
        locationId,
        statusId: status.id,
        dateString: now,
      });
      moved.push({
        id: item.id,
        name: item.name,
        tag: item.tag,
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Items assigned to location',
      locationId,
      location: location.name,
      status: status.status,
      movedCount: moved.length,
      items: moved,
    });
  } catch (error) {
    console.error('assignLocation error:', error);
    const message =
      error instanceof Error ? error.message : 'Failed to assign location';
    return NextResponse.json(
      { success: false, message },
      { status: 500 }
    );
  }
}
