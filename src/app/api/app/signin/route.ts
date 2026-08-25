import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { generateToken } from '@/lib/auth';
import { z } from 'zod';

const loginSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  machineNumber: z
    .string()
    .transform((val) => val.replace(/[^A-Za-z0-9]/g, ''))
    .pipe(
      z
        .string()
        .length(16, 'Machine number must be exactly 16 characters')
    ),
});

const isProduction = process.env.NODE_ENV === 'production';
const cookieOptions = {
  httpOnly: true,
  secure: isProduction,
  sameSite: 'lax' as const,
  maxAge: 7 * 24 * 60 * 60,
  path: '/',
};

/**
 * POST /api/app/signin
 * Body: { username, machineNumber }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = loginSchema.parse(body);

    const appUser = await prisma.appUser.findFirst({
      where: {
        username: validated.username.trim(),
        machine_number: validated.machineNumber,
      },
    });

    if (!appUser) {
      return NextResponse.json(
        { success: false, message: 'Invalid username or machine number.' },
        { status: 401 }
      );
    }

    const token = generateToken(appUser.id, 'app', appUser.customer_id);

    const response = NextResponse.json(
      {
        success: true,
        message: 'Login successful',
        token,
        user: {
          id: appUser.id,
          customerId: appUser.customer_id,
          username: appUser.username,
          machineNumber: appUser.machine_number,
          role: 'app',
        },
      },
      { status: 200 }
    );

    response.cookies.set('token', token, cookieOptions);
    response.cookies.set('userRole', 'app', {
      ...cookieOptions,
      httpOnly: false,
    });

    return response;
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, message: 'Validation error', details: error.issues },
        { status: 400 }
      );
    }

    console.error('App signin error:', error);
    return NextResponse.json(
      { success: false, message: 'Authentication failed' },
      { status: 500 }
    );
  }
}
