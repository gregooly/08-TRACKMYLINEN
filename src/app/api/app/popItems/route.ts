import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { resolveAppRequest } from '@/lib/appAuth';

/**
 * Android: pop / list items for the logged-in customer.
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
 *   "items": [ { "name": string, "tag": string }, ... ]
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

    const items = await prisma.item.findMany({
      where: { customer_id: auth.customerId },
      select: {
        name: true,
        tag: true,
      },
      orderBy: { id: 'asc' },
    });

    return NextResponse.json({
      success: true,
      count: items.length,
      items,
    });
  } catch (error) {
    console.error('popItems error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch items' },
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
