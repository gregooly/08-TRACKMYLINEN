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
    
    if (!customerId) {
      return NextResponse.json({ error: 'Invalid token. Please log out and log back in.' }, { status: 401 });
    }
    
    const locations = await prisma.location.findMany({
      where: { customer_id: customerId },
      orderBy: { id: 'asc' }
    });

    return NextResponse.json(locations);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch locations' }, { status: 500 });
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
    
    if (!customerId) {
      return NextResponse.json({ error: 'Invalid token: customer_id not found. Please log out and log back in.' }, { status: 401 });
    }
    
    const { name } = await request.json();

    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Location name is required' }, { status: 400 });
    }

    const location = await prisma.location.create({
      data: {
        customer_id: customerId,
        name: name.trim()
      }
    });

    return NextResponse.json(location);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create location' }, { status: 500 });
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
    
    if (!customerId) {
      return NextResponse.json({ error: 'Invalid token. Please log out and log back in.' }, { status: 401 });
    }
    
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Location ID is required' }, { status: 400 });
    }

    await prisma.location.delete({
      where: {
        id: parseInt(id),
        customer_id: customerId
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete location' }, { status: 500 });
  }
}
