import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { assertSameTenant, requireAdmin } from '@/lib/authz';
import { z } from 'zod';

const updateStatusSchema = z.object({
  userId: z.number().int().positive(),
  isActive: z.number().int().min(0).max(1),
});

export async function POST(request: NextRequest) {
  try {
    // Admin role required. Previously ANY valid token could activate or
    // deactivate ANY user in ANY tenant — including approving its own
    // pending registration.
    const auth = await requireAdmin(request);
    if (!auth.ok) {
      return auth.response;
    }

    const body = await request.json();
    const validatedData = updateStatusSchema.parse(body);

    const target = await prisma.user.findUnique({
      where: { id: validatedData.userId },
      select: { id: true, customer_id: true },
    });

    if (!target) {
      return NextResponse.json(
        { success: false, message: 'User not found' },
        { status: 404 }
      );
    }

    const tenantError = assertSameTenant(auth.actor, target.customer_id);
    if (tenantError) {
      return tenantError;
    }

    const updatedUser = await prisma.user.update({
      where: {
        id: target.id,
      },
      data: {
        isActive: validatedData.isActive,
      },
      // Never echo the password hash back to the client.
      select: {
        id: true,
        customer_id: true,
        username: true,
        isActive: true,
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: 'User status updated successfully',
        user: updatedUser
      },
      { status: 200 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, message: 'Validation error', details: error.issues },
        { status: 400 }
      );
    }

    console.error('Error updating user status:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to update user status' },
      { status: 500 }
    );
  }
}
