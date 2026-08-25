import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { resolveTenant } from '@/lib/tenantAuth';
import { z } from 'zod';

const registerSchema = z.object({
  username: z.string().min(3, 'Username must be at least 3 characters').max(255),
  machineNumber: z
    .string()
    .length(16, 'Machine number must be exactly 16 characters')
    .regex(/^[A-Za-z0-9]{16}$/, 'Machine number must be 16 letters or digits'),
});

/**
 * GET /api/app/users — list app users for logged-in tenant
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await resolveTenant(request);
    if (!auth.ok) {
      return NextResponse.json({ success: false, message: auth.error }, { status: auth.status });
    }

    if (auth.role === 'app') {
      return NextResponse.json(
        { success: false, message: 'Forbidden' },
        { status: 403 }
      );
    }

    const users = await prisma.appUser.findMany({
      where: { customer_id: auth.customerId },
      select: {
        id: true,
        customer_id: true,
        username: true,
        machine_number: true,
        created_at: true,
      },
      orderBy: { id: 'desc' },
    });

    return NextResponse.json({ success: true, users });
  } catch (error) {
    console.error('Error fetching app users:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch app users' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/app/users — register app device (admin/agent JWT)
 * Body: { username, machineNumber }
 * customer_id from token
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await resolveTenant(request);
    if (!auth.ok) {
      return NextResponse.json({ success: false, message: auth.error }, { status: auth.status });
    }

    if (auth.role === 'app' || auth.role === 'api') {
      return NextResponse.json(
        { success: false, message: 'Only admin or agent can register app users' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validated = registerSchema.parse(body);
    const username = validated.username.trim();
    const machineNumber = validated.machineNumber;

    const existingMachine = await prisma.appUser.findFirst({
      where: { machine_number: machineNumber },
    });
    if (existingMachine) {
      return NextResponse.json(
        { success: false, message: 'This machine number is already registered.' },
        { status: 400 }
      );
    }

    const existingUsername = await prisma.appUser.findFirst({
      where: {
        customer_id: auth.customerId,
        username,
      },
    });
    if (existingUsername) {
      return NextResponse.json(
        {
          success: false,
          message: 'This username is already registered for your account.',
        },
        { status: 400 }
      );
    }

    const user = await prisma.appUser.create({
      data: {
        customer_id: auth.customerId,
        username,
        machine_number: machineNumber,
        created_at: new Date().toISOString(),
      },
      select: {
        id: true,
        customer_id: true,
        username: true,
        machine_number: true,
        created_at: true,
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: 'App user registered successfully.',
        user,
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, message: 'Validation error', details: error.issues },
        { status: 400 }
      );
    }

    console.error('App user register error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to register app user' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/app/users?id=
 */
export async function DELETE(request: NextRequest) {
  try {
    const auth = await resolveTenant(request);
    if (!auth.ok) {
      return NextResponse.json({ success: false, message: auth.error }, { status: auth.status });
    }

    if (auth.role === 'app') {
      return NextResponse.json(
        { success: false, message: 'Forbidden' },
        { status: 403 }
      );
    }

    const idParam = request.nextUrl.searchParams.get('id');
    const id = idParam ? parseInt(idParam, 10) : NaN;
    if (Number.isNaN(id)) {
      return NextResponse.json(
        { success: false, message: 'User id is required' },
        { status: 400 }
      );
    }

    const deleted = await prisma.appUser.deleteMany({
      where: {
        id,
        customer_id: auth.customerId,
      },
    });

    if (deleted.count === 0) {
      return NextResponse.json(
        { success: false, message: 'App user not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'App user deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting app user:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to delete app user' },
      { status: 500 }
    );
  }
}
