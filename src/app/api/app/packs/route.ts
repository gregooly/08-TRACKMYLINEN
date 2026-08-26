import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { resolveAppRequest } from '@/lib/appAuth';

/**
 * Android: list packs for the logged-in customer.
 *
 * POST (or GET) /api/app/packs
 *
 * Headers:
 *   Authorization: Bearer <token>
 *   X-Customer-Id: <customerId>
 *   Content-Type: application/json
 *   Accept: application/json
 *
 * Response:
 * {
 *   "success": true,
 *   "count": number,
 *   "packs": [
 *     {
 *       "id": number,
 *       "name": string,
 *       "status": string | null,
 *       "items": [ { "id": number, "name": string, "tag": string }, ... ]
 *     },
 *     ...
 *   ]
 * }
 */
async function handleListPacks(request: NextRequest) {
  try {
    const auth = resolveAppRequest(request);
    if (!auth.ok) {
      return NextResponse.json(
        { success: false, message: auth.message },
        { status: auth.status }
      );
    }

    const rawPacks = await prisma.pack.findMany({
      where: { customer_id: auth.customerId },
      include: {
        status: { select: { status: true } },
        items: {
          include: {
            item: { select: { id: true, name: true, tag: true } },
          },
          orderBy: { id: 'asc' },
        },
      },
      orderBy: { id: 'asc' },
    });

    const packs = rawPacks.map((pack) => ({
      id: pack.id,
      name: pack.name,
      status: pack.status?.status ?? null,
      items: pack.items.map((packItem) => ({
        id: packItem.item.id,
        name: packItem.item.name,
        tag: packItem.item.tag,
      })),
    }));

    return NextResponse.json({
      success: true,
      count: packs.length,
      packs,
    });
  } catch (error) {
    console.error('app packs list error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch packs' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  return handleListPacks(request);
}

export async function GET(request: NextRequest) {
  return handleListPacks(request);
}
