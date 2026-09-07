import { NextResponse } from 'next/server';

/**
 * Retired.
 *
 * This endpoint was unauthenticated and answered "does this username exist?"
 * with a query that ignored `customer_id` entirely, so it worked as a
 * cross-tenant username-enumeration oracle for anyone on the internet.
 *
 * It was also functionally wrong: usernames are unique per
 * (customer_id, username), not globally, so a global hit did not mean the name
 * was unavailable for the registering tenant.
 *
 * Nothing in this repository called it. Registration already reports a taken
 * username through POST /api/register-user, which resolves the tenant first.
 */
export async function POST() {
  return NextResponse.json(
    {
      success: false,
      message:
        'This endpoint has been retired. Username availability is reported by POST /api/register-user.',
    },
    { status: 410 }
  );
}
