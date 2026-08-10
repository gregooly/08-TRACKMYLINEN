import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET - Export inventory data as CSV
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const customerId = searchParams.get('customer_id');
    const apiKey = searchParams.get('apikey');

    if (!customerId || !apiKey) {
      return NextResponse.json({ error: 'Missing customer_id or apikey' }, { status: 400 });
    }

    // Verify API key
    const validApiKey = await prisma.apiKey.findFirst({
      where: {
        customer_id: parseInt(customerId),
        api_key: apiKey,
      },
    });

    if (!validApiKey) {
      return NextResponse.json({ error: 'Invalid API key' }, { status: 401 });
    }

    // Fetch inventory data
    const inventories = await prisma.inventory.findMany({
      where: {
        customer_id: parseInt(customerId),
      },
      include: {
        item: true,
        category: true,
        location: true,
        status: true,
      },
      orderBy: {
        id: 'desc',
      },
    });

    // Return JSON data
    const jsonData = inventories.map(inv => ({
      id: inv.id,
      customer_id: inv.customer_id,
      item_name: inv.item.name,
      tag: inv.item.tag,
      category: inv.category.name,
      location: inv.location.name,
      status: inv.status.status,
    }));

    return NextResponse.json({
      success: true,
      count: jsonData.length,
      data: jsonData
    });
  } catch (error) {
    console.error('Error exporting CSV:', error);
    return NextResponse.json({ error: 'Failed to export CSV' }, { status: 500 });
  }
}
