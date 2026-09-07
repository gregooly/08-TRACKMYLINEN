import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken, type TokenPayload, type TokenRole } from '@/lib/auth';

/**
 * Central authorization guard.
 *
 * Every previous admin route only asked "is this JWT signature valid?" and then
 * acted on an arbitrary `userId` from the body. Any token — including a
 * role:'app' token minted from a device machine number, from any tenant — was
 * accepted. This helper makes role AND tenant explicit at every call site.
 */

export type AuthorizedActor = {
  userId: number;
  customerId: number;
  role: TokenRole;
};

export type AuthzResult =
  | { ok: true; actor: AuthorizedActor }
  | { ok: false; response: NextResponse };

function deny(status: number, message: string): AuthzResult {
  return {
    ok: false,
    response: NextResponse.json({ success: false, message }, { status }),
  };
}

function readBearer(request?: NextRequest): string | undefined {
  const header = request?.headers.get('authorization');
  if (!header) return undefined;
  // Only accept a well-formed "Bearer <token>"; `.replace('Bearer ', '')`
  // silently accepted malformed headers.
  const match = /^Bearer\s+(\S+)$/i.exec(header.trim());
  return match?.[1];
}

/**
 * Resolve the caller from an Authorization: Bearer header or the `token` cookie
 * and assert they hold one of `roles`.
 */
export async function requireRole(
  request: NextRequest | undefined,
  roles: readonly TokenRole[]
): Promise<AuthzResult> {
  let token = readBearer(request);

  if (!token) {
    const cookieStore = await cookies();
    token = cookieStore.get('token')?.value;
  }

  if (!token) {
    return deny(401, 'Unauthorized');
  }

  const decoded: TokenPayload | null = verifyToken(token);
  if (!decoded) {
    return deny(401, 'Invalid or expired token');
  }

  const customerId = decoded.customer_id ?? decoded.userId;
  if (!customerId) {
    return deny(401, 'Invalid token: customer_id missing');
  }

  // A token with no role predates role stamping; treat it as unprivileged
  // rather than letting it satisfy an admin check.
  const role = decoded.role;
  if (!role || !roles.includes(role)) {
    return deny(403, 'Forbidden: insufficient privileges');
  }

  return {
    ok: true,
    actor: { userId: decoded.userId, customerId, role },
  };
}

/** Admin-only guard. */
export function requireAdmin(request?: NextRequest): Promise<AuthzResult> {
  return requireRole(request, ['admin']);
}

/**
 * Assert a target `users` row belongs to the actor's tenant before it is read,
 * modified or deleted. Returns a 404 (not 403) so the endpoint cannot be used
 * to enumerate which user ids exist in other tenants.
 */
export function assertSameTenant(
  actor: AuthorizedActor,
  targetCustomerId: number | null | undefined
): NextResponse | null {
  if (targetCustomerId == null || targetCustomerId !== actor.customerId) {
    return NextResponse.json(
      { success: false, message: 'User not found' },
      { status: 404 }
    );
  }
  return null;
}
