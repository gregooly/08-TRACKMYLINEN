import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import { z } from 'zod';

const updateStatusSchema = z.object({
  userId: z.number(),
  isActive: z.number().min(0).max(1),
});

export async function POST(request: NextRequest) {
  try {
    // Get token from Authorization header
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Verify token
    const decoded = verifyToken(token);
    if (!decoded) {
      return NextResponse.json(
        { success: false, message: 'Invalid token' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const validatedData = updateStatusSchema.parse(body);

    // Update user status
    const updatedUser = await prisma.user.update({
      where: {
        id: validatedData.userId,
      },
      data: {
        isActive: validatedData.isActive,
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
