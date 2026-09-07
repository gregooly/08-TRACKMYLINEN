import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/authz';

const MAX_PAGE_SIZE = 200;

export async function GET(request: NextRequest) {
  try {
    // Admin role required, and results are scoped to the caller's tenant.
    // Previously ANY valid token listed every user of every customer.
    const auth = await requireAdmin(request);
    if (!auth.ok) {
      return auth.response;
    }

    const { searchParams } = request.nextUrl;
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1);
    const pageSize = Math.min(
      MAX_PAGE_SIZE,
      Math.max(1, parseInt(searchParams.get('pageSize') || '100', 10) || 100)
    );

    const where = { customer_id: auth.actor.customerId };

    const [totalCount, users] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        select: {
          id: true,
          customer_id: true,
          username: true,
          isActive: true,
          passwordRequest: true,
          ispasswordRequest: true,
        },
        orderBy: {
          id: 'desc',
        },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    return NextResponse.json(
      {
        success: true,
        users,
        pagination: {
          page,
          pageSize,
          totalCount,
          totalPages: Math.ceil(totalCount / pageSize),
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch users' },
      { status: 500 }
    );
  }
}
