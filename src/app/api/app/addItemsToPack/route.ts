import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { resolveAppRequest } from '@/lib/appAuth';

/**
 * Android: add items to an existing virtual pack by RFID tag.
 *
 * POST /api/app/addItemsToPack
 *
 * Headers:
 *   Authorization: Bearer <token>
 *   X-Customer-Id: <customerId>
 *   Content-Type: application/json
 *
 * Body:
 * {
 *   "packId": 2847,
 *   "tags": ["E280689400005012C5A2B3D4", "E2000017221101441890C8A1"]
 * }
 *
 * Behavior:
 * - Resolve tags → items for this customer
 * - Create pack_item rows for items not already in this pack
 * - Reject items already in a different pack
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

    const packIdRaw = body.packId ?? body.pack_id;
    const packId =
      packIdRaw !== undefined && packIdRaw !== null && packIdRaw !== ''
        ? parseInt(String(packIdRaw), 10)
        : NaN;

    if (Number.isNaN(packId)) {
      return NextResponse.json(
        { success: false, message: 'packId is required' },
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

    const pack = await prisma.pack.findFirst({
      where: { id: packId, customer_id: auth.customerId },
    });

    if (!pack) {
      return NextResponse.json(
        { success: false, message: 'Pack not found' },
        { status: 404 }
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

    const itemIds = tags.map((tag) => foundByTag.get(tag)!.id);

    const existingMemberships = await prisma.packItem.findMany({
      where: { item_id: { in: itemIds } },
      include: {
        pack: { select: { id: true, name: true } },
        item: { select: { tag: true } },
      },
    });

    const inOtherPack = existingMemberships.filter((m) => m.pack_id !== packId);
    if (inOtherPack.length > 0) {
      return NextResponse.json(
        {
          success: false,
          message: 'One or more items are already in another pack',
          packedItems: inOtherPack.map((m) => ({
            tag: m.item.tag,
            packId: m.pack.id,
            packName: m.pack.name,
          })),
        },
        { status: 409 }
      );
    }

    const alreadyInThisPack = new Set(
      existingMemberships
        .filter((m) => m.pack_id === packId)
        .map((m) => m.item_id)
    );

    const toAdd = itemIds.filter((itemId) => !alreadyInThisPack.has(itemId));

    if (toAdd.length > 0) {
      const now = new Date().toISOString();
      await prisma.packItem.createMany({
        data: toAdd.map((itemId) => ({
          customer_id: auth.customerId,
          pack_id: packId,
          item_id: itemId,
          added_at: now,
        })),
      });
    }

    const updated = await prisma.pack.findFirst({
      where: { id: packId },
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

    const addedItems = tags
      .map((tag) => foundByTag.get(tag)!)
      .filter((item) => !alreadyInThisPack.has(item.id))
      .map((item) => ({
        id: item.id,
        name: item.name,
        tag: item.tag,
      }));

    return NextResponse.json({
      success: true,
      message:
        addedItems.length > 0
          ? 'Items added to pack'
          : 'All items were already in this pack',
      addedCount: addedItems.length,
      addedItems,
      pack: {
        id: updated!.id,
        name: updated!.name,
        status: updated!.status?.status ?? null,
        items: updated!.items.map((packItem) => ({
          id: packItem.item.id,
          name: packItem.item.name,
          tag: packItem.item.tag,
        })),
      },
    });
  } catch (error) {
    console.error('addItemsToPack error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to add items to pack' },
      { status: 500 }
    );
  }
}
