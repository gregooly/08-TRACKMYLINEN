import { NextRequest, NextResponse } from 'next/server';

/**
 * Legacy path. Prefer POST /api/app/login for Android.
 * Forwards to the same login handler.
 */
export { POST } from '../login/route';

/** Document the preferred endpoint */
export async function GET() {
  return NextResponse.json({
    success: true,
    message: 'Use POST /api/app/login with { username, machineNumber }',
    endpoint: '/api/app/login',
  });
}
