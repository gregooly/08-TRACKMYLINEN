import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { generateToken } from '@/lib/auth';
import { formatMachineNumber, normalizeMachineNumber } from '@/lib/appAuth';
import { z } from 'zod';

/**
 * Android app user login
 * POST /api/app/login
 *
 * Body (machine number only — 16 chars, no hyphens required):
 * {
 *   "machineNumber": "0000000000000000"
 * }
 *
 * Also accepts "machine_number".
 *
 * Success (200): token + user (username returned for display)
 *
 * Later requests:
 *   Authorization: Bearer <token>
 *   X-Customer-Id: <customerId>
 */
const loginSchema = z
  .object({
    machineNumber: z.union([z.string(), z.number()]).optional(),
    machine_number: z.union([z.string(), z.number()]).optional(),
  })
  .refine(
    (data) => data.machineNumber != null || data.machine_number != null,
    { message: 'machineNumber is required' }
  );

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = loginSchema.parse(body);

    const rawInput = validated.machineNumber ?? validated.machine_number;
    const machineNumber = normalizeMachineNumber(String(rawInput ?? ''));

    if (machineNumber.length !== 16) {
      return NextResponse.json(
        {
          success: false,
          message: 'Machine number must be exactly 16 letters or digits.',
        },
        { status: 400 }
      );
    }

    const appUser = await prisma.appUser.findFirst({
      where: {
        machine_number: machineNumber,
      },
    });

    if (!appUser) {
      return NextResponse.json(
        {
          success: false,
          message: 'Invalid machine number.',
        },
        { status: 401 }
      );
    }

    const token = generateToken(appUser.id, 'app', appUser.customer_id);

    return NextResponse.json(
      {
        success: true,
        message: 'Login successful',
        token,
        user: {
          id: appUser.id,
          customerId: appUser.customer_id,
          username: appUser.username,
          machineNumber: formatMachineNumber(appUser.machine_number),
          role: 'app',
        },
      },
      { status: 200 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          message: 'Validation error',
          details: error.issues,
        },
        { status: 400 }
      );
    }

    console.error('App login error:', error);
    return NextResponse.json(
      { success: false, message: 'Authentication failed' },
      { status: 500 }
    );
  }
}
