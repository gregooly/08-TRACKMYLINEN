import { NextResponse } from 'next/server';

/**
 * Public register-by-email is disabled.
 * Use POST /api/app/users while logged in as admin or agent.
 */
export async function POST() {
  return NextResponse.json(
    {
      success: false,
      message:
        'Public app registration is disabled. Please sign in as admin or agent and use App Users.',
    },
    { status: 410 }
  );
}
