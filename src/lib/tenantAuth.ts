import { NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export type TenantAuth =
  | { ok: true; customerId: number; role?: string; userId?: number }
  | { ok: false; status: number; error: string };

/**
 * Resolve tenant from JWT cookie or API key query/headers (for Android).
 */
export async function resolveTenant(
  request?: NextRequest
): Promise<TenantAuth> {
  // Prefer JWT cookie (web admin/agent/app session)
  const cookieStore = await cookies();
  const token = cookieStore.get('token')?.value;

  if (token) {
    const decoded = verifyToken(token);
    if (!decoded) {
      return { ok: false, status: 401, error: 'Invalid token' };
    }
    const customerId = decoded.customer_id || decoded.userId;
    if (!customerId) {
      return { ok: false, status: 401, error: 'Invalid token: customer_id missing' };
    }
    return {
      ok: true,
      customerId,
      role: decoded.role,
      userId: decoded.userId,
    };
  }

  // Fallback: API key (Android / external)
  if (request) {
    const searchParams = request.nextUrl.searchParams;
    const customerIdParam =
      searchParams.get('customer_id') ||
      request.headers.get('x-customer-id');
    const apiKey =
      searchParams.get('apikey') ||
      request.headers.get('x-api-key');

    if (customerIdParam && apiKey) {
      const customerId = parseInt(customerIdParam, 10);
      if (Number.isNaN(customerId)) {
        return { ok: false, status: 400, error: 'Invalid customer_id' };
      }

      const validApiKey = await prisma.apiKey.findFirst({
        where: {
          customer_id: customerId,
          api_key: apiKey,
        },
      });

      if (!validApiKey) {
        return { ok: false, status: 401, error: 'Invalid API key' };
      }

      return { ok: true, customerId, role: 'api' };
    }
  }

  return { ok: false, status: 401, error: 'Unauthorized' };
}
