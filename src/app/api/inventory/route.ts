import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';

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
    const body = await request.json();
    const { item_id, location_id, status_id } = body;

    if (!item_id || !location_id || !status_id) {
      return NextResponse.json(
        { error: 'item_id, location_id, and status_id are required' },
        { status: 400 }
      );
    }

    // Get the item to retrieve category_id
    const item = await prisma.item.findUnique({
      where: { id: item_id },
      select: { category_id: true, customer_id: true }
    });

    if (!item) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    }

    if (item.customer_id !== customer_id) {
      return NextResponse.json({ error: 'Unauthorized access to this item' }, { status: 403 });
    }

    const category_id = item.category_id;

    // Get current date/time for history
    const now = new Date();
    const dateString = now.toISOString();

    // Check if inventory record already exists for this item
    const existingInventory = await prisma.inventory.findFirst({
      where: {
        customer_id,
        item_id
      }
    });

    if (existingInventory) {
      // Update existing inventory record
      const updatedInventory = await prisma.inventory.update({
        where: { id: existingInventory.id },
        data: {
          category_id,
          location_id,
          status_id
        }
      });

      // Create new history record
      await prisma.history.create({
        data: {
          customer_id,
          category_id,
          item_id,
          location_id,
          status_id,
          date: dateString
        }
      });

      return NextResponse.json({
        message: 'Inventory updated successfully',
        inventory: updatedInventory,
        isUpdate: true
      });
    } else {
      // Create new inventory record
      const newInventory = await prisma.inventory.create({
        data: {
          customer_id,
          category_id,
          item_id,
          location_id,
          status_id
        }
      });

      // Create new history record
      await prisma.history.create({
        data: {
          customer_id,
          category_id,
          item_id,
          location_id,
          status_id,
          date: dateString
        }
      });

      return NextResponse.json({
        message: 'Inventory registered successfully',
        inventory: newInventory,
        isUpdate: false
      });
    }
  } catch (error) {
    console.error('Error registering inventory:', error);
    return NextResponse.json(
      { error: 'Failed to register inventory' },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
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
            tag: true
          }
        },
        location: {
          select: {
            name: true
          }
        },
        status: {
          select: {
            status: true
          }
        },
        category: {
          select: {
            name: true
          }
        }
      },
      orderBy: {
        id: 'desc'
      }
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
      return NextResponse.json({ error: 'Inventory ID is required' }, { status: 400 });
    }

    await prisma.inventory.deleteMany({
      where: {
        id: parseInt(id),
        customer_id
      }
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
