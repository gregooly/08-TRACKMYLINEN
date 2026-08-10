import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const customerId = decoded.customer_id || decoded.userId;

    const items = await prisma.item.findMany({
      where: {
        customer_id: customerId
      },
      include: {
        category: {
          select: {
            name: true
          }
        }
      },
      orderBy: {
        id: 'asc'
      }
    });

    return NextResponse.json(items);
  } catch (error) {
    console.error('Error fetching items:', error);
    return NextResponse.json({ error: 'Failed to fetch items' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const customerId = decoded.customer_id || decoded.userId;
    const { category_id, name, tag } = await request.json();

    if (!category_id || !name || !tag) {
      return NextResponse.json({ error: 'Category ID, name, and tag are required' }, { status: 400 });
    }

    // Check if tag already exists for this customer
    const existingItem = await prisma.item.findFirst({
      where: {
        customer_id: customerId,
        tag: tag.trim()
      }
    });

    if (existingItem) {
      return NextResponse.json({ error: 'This tag already exists. Please use a unique tag.' }, { status: 400 });
    }

    const item = await prisma.item.create({
      data: {
        customer_id: customerId,
        category_id: parseInt(category_id),
        name: name.trim(),
        tag: tag.trim()
      },
      include: {
        category: {
          select: {
            name: true
          }
        }
      }
    });

    return NextResponse.json(item, { status: 201 });
  } catch (error) {
    console.error('Error creating item:', error);
    return NextResponse.json({ error: 'Failed to create item' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const token = request.cookies.get('token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const customerId = decoded.customer_id || decoded.userId;
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Item ID is required' }, { status: 400 });
    }

    await prisma.item.deleteMany({
      where: {
        id: parseInt(id),
        customer_id: customerId
      }
    });

    return NextResponse.json({ message: 'Item deleted successfully' });
  } catch (error) {
    console.error('Error deleting item:', error);
    return NextResponse.json({ error: 'Failed to delete item' }, { status: 500 });
  }
}
