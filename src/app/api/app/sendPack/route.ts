import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { resolveAppRequest } from '@/lib/appAuth';
import { checkInItem } from '@/lib/checkInItem';
import { notifyPackSendByEmail } from '@/lib/packSendNotification';

/**
 * Android: send / transmit a virtual pack.
 *
 * POST /api/app/sendPack
 *
 * Headers:
 *   Authorization: Bearer <token>
 *   X-Customer-Id: <customerId>
 *   Content-Type: application/json
 *
 * Body:
 * {
 *   "packId": 1,
 *   "status": "good",
 *   "locationId": 3
 * }
 *
 * Behavior:
 * 1. Move every member item to locationId + status (inventory + history)
 * 2. Delete the pack (pack_item rows cascade)
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

    const statusLabel =
      typeof body.status === 'string' && body.status.trim()
        ? body.status.trim()
        : null;

    const location = await prisma.location.findFirst({
      where: { id: locationId, customer_id: auth.customerId },
    });
    if (!location) {
      return NextResponse.json(
        { success: false, message: 'Invalid locationId' },
        { status: 400 }
      );
    }

    const pack = await prisma.pack.findFirst({
      where: { id: packId, customer_id: auth.customerId },
      include: {
        items: {
          include: {
            item: { select: { id: true, name: true, tag: true } },
          },
        },
      },
    });

    if (!pack) {
      return NextResponse.json(
        { success: false, message: 'Pack not found' },
        { status: 404 }
      );
    }

    if (pack.items.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Cannot send an empty pack' },
        { status: 400 }
      );
    }

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
    } else if (pack.status_id) {
      const status = await prisma.status.findFirst({
        where: { id: pack.status_id, customer_id: auth.customerId },
      });
      if (!status) {
        return NextResponse.json(
          { success: false, message: 'Pack status is invalid' },
          { status: 400 }
        );
      }
      statusId = status.id;
      statusName = status.status;
    }

    if (!statusId) {
      return NextResponse.json(
        {
          success: false,
          message: 'status is required (pack has no status set)',
        },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();
    const movedItems: { id: number; name: string; tag: string }[] = [];

    for (const packItem of pack.items) {
      await checkInItem({
        customerId: auth.customerId,
        itemId: packItem.item_id,
        locationId,
        statusId,
        dateString: now,
      });
      movedItems.push({
        id: packItem.item.id,
        name: packItem.item.name,
        tag: packItem.item.tag,
      });
    }

    // Destroy virtual pack after send (cascade deletes pack_item)
    await prisma.pack.delete({ where: { id: packId } });

    const emailResult = await notifyPackSendByEmail({
      locationName: location.name,
      locationEmail: location.email,
      packName: pack.name,
      statusName: statusName ?? '',
      items: movedItems,
      sentAt: now,
    });

    return NextResponse.json({
      success: true,
      message: 'Pack sent and deleted',
      packId,
      locationId,
      location: location.name,
      status: statusName,
      movedCount: movedItems.length,
      items: movedItems,
      emailSent: emailResult.emailSent,
    });
  } catch (error) {
    console.error('sendPack error:', error);
    const message =
      error instanceof Error ? error.message : 'Failed to send pack';
    return NextResponse.json(
      { success: false, message },
      { status: 500 }
    );
  }
}
