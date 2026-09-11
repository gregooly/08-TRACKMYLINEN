import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET - Export passage history (item × location) with check-in counts
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const customerId = searchParams.get('customer_id');
    const apiKey = searchParams.get('apikey');

    if (!customerId || !apiKey) {
      return NextResponse.json({ error: 'Missing customer_id or apikey' }, { status: 400 });
    }

    const customerIdNum = parseInt(customerId, 10);
    if (Number.isNaN(customerIdNum)) {
      return NextResponse.json({ error: 'Invalid customer_id' }, { status: 400 });
    }

    const validApiKey = await prisma.apiKey.findFirst({
      where: {
        customer_id: customerIdNum,
        api_key: apiKey,
      },
    });

    if (!validApiKey) {
      return NextResponse.json({ error: 'Invalid API key' }, { status: 401 });
    }

    const passageGroups = await prisma.history.groupBy({
      by: ['item_id', 'location_id'],
      where: {
        customer_id: customerIdNum,
      },
      _count: {
        id: true,
      },
    });

    if (passageGroups.length === 0) {
      return NextResponse.json({
        success: true,
        count: 0,
        data: [],
      });
    }

    const itemIds = [...new Set(passageGroups.map((group) => group.item_id))];
    const locationIds = [...new Set(passageGroups.map((group) => group.location_id))];

    const [items, locations, inventories] = await Promise.all([
      prisma.item.findMany({
        where: { id: { in: itemIds } },
        include: { category: true },
      }),
      prisma.location.findMany({
        where: { id: { in: locationIds } },
      }),
      prisma.inventory.findMany({
        where: {
          customer_id: customerIdNum,
          item_id: { in: itemIds },
        },
        include: { status: true },
        orderBy: { id: 'desc' },
      }),
    ]);

    const itemMap = Object.fromEntries(items.map((item) => [item.id, item]));
    const locationMap = Object.fromEntries(locations.map((location) => [location.id, location]));
    const statusByItemId: Record<number, string> = {};
    for (const inv of inventories) {
      if (statusByItemId[inv.item_id] === undefined) {
        statusByItemId[inv.item_id] = inv.status.status;
      }
    }

    const jsonData = passageGroups
      .map((group) => {
        const item = itemMap[group.item_id];
        const location = locationMap[group.location_id];
        return {
          item_tag: item?.tag || '',
          item_name: item?.name || '',
          category: item?.category.name || '',
          location: location?.name || '',
          passages: group._count.id,
          status: statusByItemId[group.item_id] || '',
        };
      })
      .sort((a, b) => {
        const tagCompare = a.item_tag.localeCompare(b.item_tag);
        if (tagCompare !== 0) return tagCompare;
        return a.location.localeCompare(b.location);
      });

    return NextResponse.json({
      success: true,
      count: jsonData.length,
      data: jsonData,
    });
  } catch (error) {
    console.error('Error exporting passages:', error);
    return NextResponse.json({ error: 'Failed to export passages' }, { status: 500 });
  }
}
