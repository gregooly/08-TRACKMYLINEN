import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { assertSameTenant, requireAdmin } from '@/lib/authz';
import { z } from 'zod';

const deleteUserSchema = z.object({
  userId: z.number().int().positive(),
});

export async function DELETE(request: NextRequest) {
  try {
    // Admin role required. Previously ANY valid token could delete ANY user
    // in ANY tenant by id.
    const auth = await requireAdmin(request);
    if (!auth.ok) {
      return auth.response;
    }

    const body = await request.json();
    const validatedData = deleteUserSchema.parse(body);

    if (validatedData.userId === auth.actor.userId) {
      return NextResponse.json(
        { success: false, message: 'You cannot delete your own account.' },
        { status: 400 }
      );
    }

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

    await prisma.user.delete({
      where: {
        id: target.id,
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: 'User deleted successfully'
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

    console.error('Error deleting user:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to delete user' },
      { status: 500 }
    );
  }
}
