import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';
import { checkInItem } from '@/lib/checkInItem';

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value;

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const customer_id = decoded.customer_id || decoded.userId;
    if (!customer_id) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const body = await request.json();
    const { item_id, location_id, status_id } = body;

    if (!item_id || !location_id || !status_id) {
      return NextResponse.json(
        { error: 'item_id, location_id, and status_id are required' },
        { status: 400 }
      );
    }

    const membership = await prisma.packItem.findUnique({
      where: { item_id },
      include: { pack: { select: { id: true, name: true } } },
    });

    if (membership && membership.customer_id === customer_id) {
      return NextResponse.json(
        {
          error: `This item is in pack "${membership.pack.name}". Transmit the pack or remove the item from the pack first.`,
        },
        { status: 409 }
      );
    }

    const result = await checkInItem({
      customerId: customer_id,
      itemId: item_id,
      locationId: location_id,
      statusId: status_id,
    });

    return NextResponse.json({
      message: result.isUpdate
        ? 'Inventory updated successfully'
        : 'Inventory registered successfully',
      inventory: result.inventory,
      isUpdate: result.isUpdate,
    });
  } catch (error) {
    console.error('Error registering inventory:', error);
    const message =
      error instanceof Error ? error.message : 'Failed to register inventory';
    const status = message.includes('Unauthorized')
      ? 403
      : message.includes('not found')
        ? 404
        : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value;

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const customer_id = decoded.customer_id || decoded.userId;

    const inventories = await prisma.inventory.findMany({
      where: { customer_id },
      include: {
        item: {
          select: {
            name: true,
            tag: true,
          },
        },
        location: {
          select: {
            name: true,
          },
        },
        status: {
          select: {
            status: true,
          },
        },
        category: {
          select: {
            name: true,
          },
        },
      },
      orderBy: {
        id: 'desc',
      },
    });

    return NextResponse.json(inventories);
  } catch (error) {
    console.error('Error fetching inventories:', error);
    return NextResponse.json(
      { error: 'Failed to fetch inventories' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value;

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const customer_id = decoded.customer_id || decoded.userId;
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Inventory ID is required' },
        { status: 400 }
      );
    }

    await prisma.inventory.deleteMany({
      where: {
        id: parseInt(id),
        customer_id,
      },
    });

    return NextResponse.json({ message: 'Inventory deleted successfully' });
  } catch (error) {
    console.error('Error deleting inventory:', error);
    return NextResponse.json(
      { error: 'Failed to delete inventory' },
      { status: 500 }
    );
  }
}
