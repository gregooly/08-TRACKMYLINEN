import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hashPassword } from '@/lib/auth';
import { findPulsePointAdminByEmail, PulsePointUnavailableError } from '@/lib/pulsepoint';
import { z } from 'zod';
import { rateLimit } from '@/lib/rateLimit';

const registerSchema = z.object({
  adminEmail: z.string().email('Invalid admin email address'),
  username: z.string().min(3, 'Username must be at least 3 characters'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

export async function POST(request: NextRequest) {
  try {
    const limited = rateLimit(request, {
      name: 'register-user',
      limit: 5,
      windowMs: 60_000,
    });
    if (!limited.allowed) {
      return limited.response;
    }

    const body = await request.json();
    const validatedData = registerSchema.parse(body);

    // Step 1: Verify admin email exists in PulsePoint API
    let customerId: number;
    try {
      const adminUser = await findPulsePointAdminByEmail(validatedData.adminEmail);

      if (!adminUser) {
        return NextResponse.json(
          { success: false, message: 'Administrator email does not exist in PulsePoint system.' },
          { status: 400 }
        );
      }

      customerId = adminUser.id;
    } catch (apiError) {
      if (apiError instanceof PulsePointUnavailableError) {
        return NextResponse.json(
          { success: false, message: 'Failed to verify administrator email. PulsePoint service may be unavailable.' },
          { status: 503 }
        );
      }
      throw apiError;
    }

    // Step 2: Username must be unique for this PulsePoint admin (customer_id)
    const existingUser = await prisma.user.findUnique({
      where: {
        customer_id_username: {
          customer_id: customerId,
          username: validatedData.username.trim(),
        },
      },
    });

    if (existingUser) {
      return NextResponse.json(
        { success: false, message: 'This username is already registered for this manager email.' },
        { status: 400 }
      );
    }

    // Hash password
    const hashedPassword = await hashPassword(validatedData.password);

    // Create user in users table with pending approval status
    const user = await prisma.user.create({
      data: {
        customer_id: customerId,
        username: validatedData.username.trim(),
        password: hashedPassword,
        isActive: 0, // Pending approval
        passwordRequest: '',
        ispasswordRequest: 0,
      },
      select: {
        id: true,
        username: true,
        customer_id: true,
        isActive: true,
      },
    });

    return NextResponse.json(
      { 
        success: true, 
        message: 'Registration successful! Account pending approval.',
        user 
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

    console.error('Registration error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to register user' },
      { status: 500 }
    );
  }
}
