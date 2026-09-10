import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyPassword, generateToken } from '@/lib/auth';
import { findPulsePointAdminByEmail, PulsePointUnavailableError, logUpstreamError } from '@/lib/pulsepoint';
import { z } from 'zod';
import axios from 'axios';
import { rateLimit } from '@/lib/rateLimit';

const signinSchema = z.discriminatedUnion('role', [
  z.object({
    role: z.literal('admin'),
    email: z.string().email('A valid manager email is required'),
    password: z.string().min(1, 'Password is required'),
  }),
  z.object({
    role: z.literal('agent'),
    email: z.string().email('A valid manager email is required'),
    username: z.string().min(1, 'Username is required'),
    password: z.string().min(1, 'Password is required'),
  }),
]);

// Cookie security settings based on environment
const isProduction = process.env.NODE_ENV === 'production';
const cookieOptions = {
  httpOnly: true,
  secure: isProduction,
  sameSite: 'lax' as const,
  maxAge: 7 * 24 * 60 * 60, // 7 days
  path: '/',
};

// API timeout setting (10 seconds)
const API_TIMEOUT = 10000;

export async function POST(request: NextRequest) {
  try {
    // Throttle credential stuffing against both the local agent passwords and
    // the upstream PulsePoint admin login.
    const limited = rateLimit(request, {
      name: 'signin',
      limit: 10,
      windowMs: 60_000,
    });
    if (!limited.allowed) {
      return limited.response;
    }

    const body = await request.json();
    const validatedData = signinSchema.parse(body);

    // Handle Admin login (PulsePoint API authentication)
    if (validatedData.role === 'admin') {
      try {
        // Authenticate with PulsePoint API with timeout
        const response = await axios.post('https://api.pulsepoint.clinotag.com/api/user/project/signin', {
          username: validatedData.email,
          password: validatedData.password,
          projectId: process.env.PULSEPOINT_PROJECT_ID
        }, {
          timeout: API_TIMEOUT
        });

        if (response.data.status === 1) {
          const user = await findPulsePointAdminByEmail(validatedData.email);

          if (user) {
            // Generate JWT token with admin role and customer_id
            const token = generateToken(user.id, 'admin', user.id);

            // Return user data and token
            const adminResponse = NextResponse.json(
              {
                success: true,
                message: 'Login successful',
                token,
                user: {
                  customerId: user.id,
                  id: user.id,
                  username: user.email,
                  email: user.email,
                  role: 'admin'
                },
              },
              { status: 200 }
            );

            // Set cookies with proper security settings
            adminResponse.cookies.set('token', token, cookieOptions);

            adminResponse.cookies.set('userRole', 'admin', {
              ...cookieOptions,
              httpOnly: false, // userRole needs to be accessible by client
            });

            return adminResponse;
          }
        } else if (response.data.status === -1) {
          return NextResponse.json(
            { success: false, message: 'Account not found' },
            { status: 401 }
          );
        } else if (response.data.status === 0) {
          return NextResponse.json(
            { success: false, message: 'Incorrect password' },
            { status: 401 }
          );
        }

        return NextResponse.json(
          { success: false, message: 'Login failed: Please check your subscription status' },
          { status: 401 }
        );
      } catch (apiError) {
        // This catch wraps the whole admin flow, including generateToken().
        // It used to report EVERY failure in here as "External authentication
        // service unavailable", so a purely local misconfiguration (missing
        // JWT_SECRET, missing PulsePoint credentials) looked identical to the
        // upstream being down and was undiagnosable from the browser.
        if (apiError instanceof PulsePointUnavailableError) {
          return NextResponse.json(
            {
              success: false,
              code: 'UPSTREAM_UNAVAILABLE',
              message: 'External authentication service unavailable',
            },
            { status: 503 }
          );
        }

        if (axios.isAxiosError(apiError)) {
          // The axios error object embeds the outbound request body, which on
          // this path contains the user's plaintext password. Log shape only.
          logUpstreamError('PulsePoint signin error', apiError);
          return NextResponse.json(
            {
              success: false,
              code: 'UPSTREAM_UNREACHABLE',
              message: 'External authentication service unavailable',
            },
            { status: 503 }
          );
        }

        // Anything else is our own fault, not the provider's. Say so.
        console.error(
          'Admin signin failed for a local reason (check server env config):',
          apiError instanceof Error ? apiError.message : 'unknown error'
        );
        return NextResponse.json(
          {
            success: false,
            code: 'SERVER_MISCONFIGURED',
            message:
              'Server configuration error. Check the server logs and environment variables.',
          },
          { status: 500 }
        );
      }
    }

    // Handle Agent login: PulsePoint manager email + username + local password
    if (validatedData.role === 'agent') {
      let customerId: number;
      try {
        const adminUser = await findPulsePointAdminByEmail(validatedData.email);
        if (!adminUser) {
          return NextResponse.json(
            { success: false, message: 'This account is not registered.' },
            { status: 401 }
          );
        }
        customerId = adminUser.id;
      } catch (apiError) {
        if (apiError instanceof PulsePointUnavailableError) {
          return NextResponse.json(
            { success: false, message: 'External authentication service unavailable' },
            { status: 503 }
          );
        }
        throw apiError;
      }

      const user = await prisma.user.findUnique({
        where: {
          customer_id_username: {
            customer_id: customerId,
            username: validatedData.username.trim(),
          },
        },
      });

      if (!user) {
        return NextResponse.json(
          { success: false, message: 'This account is not registered.' },
          { status: 401 }
        );
      }

      // Check if account is active
      if (!user.isActive || user.isActive === 0) {
        return NextResponse.json(
          { success: false, message: 'Account is not active.' },
          { status: 403 }
        );
      }

      // Verify password using PBKDF2-SHA256
      const isValidPassword = await verifyPassword(
        validatedData.password,
        user.password
      );

      if (!isValidPassword) {
        return NextResponse.json(
          { success: false, message: 'Incorrect password.' },
          { status: 401 }
        );
      }

      // Generate JWT token with agent role and customer_id
      const token = generateToken(user.id, 'agent', user.customer_id);

      // Return user data and token
      const agentResponse = NextResponse.json(
        {
          success: true,
          message: 'Login successful',
          token,
          user: {
            customerId: user.customer_id,
            id: user.id,
            username: user.username,
            email: validatedData.email,
            role: 'agent'
          },
        },
        { status: 200 }
      );

      // Set cookies with proper security settings
      agentResponse.cookies.set('token', token, cookieOptions);

      agentResponse.cookies.set('userRole', 'agent', {
        ...cookieOptions,
        httpOnly: false, // userRole needs to be accessible by client
      });

      return agentResponse;
    }

    return NextResponse.json(
      { success: false, message: 'Invalid role specified' },
      { status: 400 }
    );

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, message: 'Validation error', details: error.issues },
        { status: 400 }
      );
    }

    console.error('Signin error:', error);
    return NextResponse.json(
      { success: false, message: 'Authentication failed' },
      { status: 500 }
    );
  }
}
