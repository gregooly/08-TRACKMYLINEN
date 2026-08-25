import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { generateToken } from '@/lib/auth';
import { formatMachineNumber, normalizeMachineNumber } from '@/lib/appAuth';
import { z } from 'zod';

/**
 * Android app user login
 * POST /api/app/login
 *
 * Body:
 * {
 *   "username": "string",
 *   "machineNumber": "0000-0000-0000-0000" // hyphens optional
 * }
 *
 * Success (200):
 * {
 *   "success": true,
 *   "message": "Login successful",
 *   "token": "<jwt>",
 *   "user": {
 *     "id": number,
 *     "customerId": number,
 *     "username": string,
 *     "machineNumber": "XXXX-XXXX-XXXX-XXXX",
 *     "role": "app"
 *   }
 * }
 *
 * Use header on later requests:
 *   Authorization: Bearer <token>
 */
const loginSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  machineNumber: z.string().min(1, 'Machine number is required'),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = loginSchema.parse(body);

    const username = validated.username.trim();
    const machineNumber = normalizeMachineNumber(validated.machineNumber);

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
        username,
        machine_number: machineNumber,
      },
    });

    if (!appUser) {
      return NextResponse.json(
        {
          success: false,
          message: 'Invalid username or machine number.',
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
