import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import axios from 'axios';

const registerSchema = z.object({
  adminEmail: z.string().email('Invalid admin email address'),
  username: z.string().min(3, 'Username must be at least 3 characters').max(255),
  machineNumber: z
    .string()
    .length(16, 'Machine number must be exactly 16 characters')
    .regex(/^[A-Za-z0-9]{16}$/, 'Machine number must be 16 letters or digits'),
});

/**
 * POST /api/app/register
 * Register an Android app device user under a PulsePoint customer.
 * Body: { adminEmail, username, machineNumber }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = registerSchema.parse(body);

    let customerId: number;
    try {
      const adminCheckResponse = await axios.get(
        'https://api.pulsepoint.clinotag.com/api/user/allusers',
        {
          auth: {
            username: process.env.PULSEPOINT_API_USERNAME || '',
            password: process.env.PULSEPOINT_API_PASSWORD || '',
          },
          timeout: 10000,
        }
      );

      const allUsers =
        adminCheckResponse.data?.data || adminCheckResponse.data || [];
      const adminUser = allUsers.find(
        (user: { email?: string; id: number }) =>
          user.email?.toLowerCase() === validated.adminEmail.toLowerCase()
      );

      if (!adminUser) {
        return NextResponse.json(
          {
            success: false,
            message: 'Administrator email does not exist in PulsePoint system.',
          },
          { status: 400 }
        );
      }

      customerId = adminUser.id;
    } catch (apiError) {
      console.error('PulsePoint API error:', apiError);
      return NextResponse.json(
        {
          success: false,
          message:
            'Failed to verify administrator email. PulsePoint service may be unavailable.',
        },
        { status: 503 }
      );
    }

    const machineNumber = validated.machineNumber;
    const username = validated.username.trim();

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
        customer_id: customerId,
        username,
      },
    });
    if (existingUsername) {
      return NextResponse.json(
        {
          success: false,
          message: 'This username is already registered for this customer.',
        },
        { status: 400 }
      );
    }

    const appUser = await prisma.appUser.create({
      data: {
        customer_id: customerId,
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
        user: appUser,
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

    console.error('App register error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to register app user' },
      { status: 500 }
    );
  }
}
