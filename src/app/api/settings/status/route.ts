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
    
    const statuses = await prisma.status.findMany({
      where: { customer_id: customerId },
      orderBy: { id: 'asc' }
    });

    return NextResponse.json(statuses);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch statuses' }, { status: 500 });
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
      return NextResponse.json({ error: 'Invalid token. Please log out and log back in.' }, { status: 401 });
    }
    
    const { status } = await request.json();

    if (!status || !status.trim()) {
      return NextResponse.json({ error: 'Status is required' }, { status: 400 });
    }

    const newStatus = await prisma.status.create({
      data: {
        customer_id: customerId,
        status: status.trim()
      }
    });

    return NextResponse.json(newStatus);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create status' }, { status: 500 });
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
      return NextResponse.json({ error: 'Status ID is required' }, { status: 400 });
    }

    await prisma.status.delete({
      where: {
        id: parseInt(id),
        customer_id: customerId
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete status' }, { status: 500 });
  }
}
