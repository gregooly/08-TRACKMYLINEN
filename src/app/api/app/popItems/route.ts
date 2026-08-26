import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { resolveAppRequest } from '@/lib/appAuth';

/**
 * Android: pop / list items, packs, and locations for the logged-in customer.
 *
 * POST or GET /api/app/popItems
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
 *   "packCount": number,
 *   "locationCount": number,
 *   "items": [ { "id": number, "name": string, "tag": string }, ... ],
 *   "packs": [
 *     {
 *       "id": number,
 *       "name": string,
 *       "status": string | null,
 *       "items": [ { "id": number, "name": string, "tag": string }, ... ]
 *     },
 *     ...
 *   ],
 *   "locations": [ { "id": number, "name": string }, ... ]
 * }
 */
async function handlePopItems(request: NextRequest) {
  try {
    const auth = resolveAppRequest(request);
    if (!auth.ok) {
      return NextResponse.json(
        { success: false, message: auth.message },
        { status: auth.status }
      );
    }

    const [items, rawPacks, locations] = await Promise.all([
      prisma.item.findMany({
        where: { customer_id: auth.customerId },
        select: {
          id: true,
          name: true,
          tag: true,
        },
        orderBy: { id: 'asc' },
      }),
      prisma.pack.findMany({
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
      }),
      prisma.location.findMany({
        where: { customer_id: auth.customerId },
        select: {
          id: true,
          name: true,
        },
        orderBy: { id: 'asc' },
      }),
    ]);

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
      count: items.length,
      packCount: packs.length,
      locationCount: locations.length,
      items,
      packs,
      locations,
    });
  } catch (error) {
    console.error('popItems error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch items, packs, and locations' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  return handlePopItems(request);
}

export async function POST(request: NextRequest) {
  return handlePopItems(request);
}
