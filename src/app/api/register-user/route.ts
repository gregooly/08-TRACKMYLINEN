import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hashPassword } from '@/lib/auth';
import { z } from 'zod';
import axios from 'axios';

const registerSchema = z.object({
  adminEmail: z.string().email('Invalid admin email address'),
  username: z.string().min(3, 'Username must be at least 3 characters'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = registerSchema.parse(body);

    // Step 1: Verify admin email exists in PulsePoint API
    let customerId: number;
    try {
      const adminCheckResponse = await axios.get('https://api.pulsepoint.clinotag.com/api/user/allusers', {
        auth: {
          username: process.env.PULSEPOINT_API_USERNAME || '',
          password: process.env.PULSEPOINT_API_PASSWORD || ''
        },
        timeout: 10000 // 10 second timeout
      });

      const allUsers = adminCheckResponse.data?.data || adminCheckResponse.data || [];
      
      // Find admin user by email
      const adminUser = allUsers.find((user: { email?: string; id: number }) => 
        user.email?.toLowerCase() === validatedData.adminEmail.toLowerCase()
      );
      
      if (!adminUser) {
        return NextResponse.json(
          { success: false, message: 'Administrator email does not exist in PulsePoint system.' },
          { status: 400 }
        );
      }

      customerId = adminUser.id;
    } catch (apiError) {
      console.error('PulsePoint API error:', apiError);
      return NextResponse.json(
        { success: false, message: 'Failed to verify administrator email. PulsePoint service may be unavailable.' },
        { status: 503 }
      );
    }

    // Step 2: Check if username already exists in users table
    const existingUser = await prisma.user.findFirst({
      where: {
        username: validatedData.username
      },
    });

    if (existingUser) {
      return NextResponse.json(
        { success: false, message: 'Username already exists' },
        { status: 400 }
      );
    }

    // Hash password
    const hashedPassword = await hashPassword(validatedData.password);

    // Create user in users table with pending approval status
    const user = await prisma.user.create({
      data: {
        customer_id: customerId,
        username: validatedData.username,
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
