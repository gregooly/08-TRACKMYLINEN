import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';

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

    // Parse pagination parameters from URL
    const url = new URL(request.url);
    const page = Math.max(1, parseInt(url.searchParams.get('page') || '1'));
    const limit = Math.min(1000, Math.max(1, parseInt(url.searchParams.get('limit') || '500')));
    const skip = (page - 1) * limit;

    // Get total count for pagination info
    const totalCount = await prisma.history.count({
      where: { customer_id }
    });

    const histories = await prisma.history.findMany({
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
      },
      skip,
      take: limit
    });

    return NextResponse.json({
      data: histories,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching histories:', error);
    return NextResponse.json(
      { error: 'Failed to fetch histories' },
      { status: 500 }
    );
  }
}
