import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { resolveAppRequest } from '@/lib/appAuth';

/**
 * Android: delete a virtual pack (items are not moved).
 *
 * POST /api/app/deletePack
 *
 * Headers:
 *   Authorization: Bearer <token>
 *   X-Customer-Id: <customerId>
 *   Content-Type: application/json
 *
 * Body:
 * {
 *   "packId": 2847
 * }
 *
 * Behavior:
 * - Deletes the pack (pack_item rows cascade)
 * - Does NOT update inventory / history
 * - Item rows remain
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

    const pack = await prisma.pack.findFirst({
      where: { id: packId, customer_id: auth.customerId },
      select: { id: true, name: true },
    });

    if (!pack) {
      return NextResponse.json(
        { success: false, message: 'Pack not found' },
        { status: 404 }
      );
    }

    await prisma.pack.delete({ where: { id: packId } });

    return NextResponse.json({
      success: true,
      message: 'Pack deleted successfully',
      packId: pack.id,
      name: pack.name,
    });
  } catch (error) {
    console.error('deletePack error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to delete pack' },
      { status: 500 }
    );
  }
}
