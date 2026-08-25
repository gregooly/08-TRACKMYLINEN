/**
 * Shared helpers for Android / app-user APIs.
 */

import { NextRequest } from 'next/server';
import { verifyToken } from '@/lib/auth';

/** Strip hyphens and non-alnum; keep at most 16 chars for DB storage. */
export function normalizeMachineNumber(value: string): string {
  return value.replace(/[^A-Za-z0-9]/g, '').slice(0, 16);
}

/** Display format: XXXX-XXXX-XXXX-XXXX */
export function formatMachineNumber(value: string): string {
  const cleaned = normalizeMachineNumber(value);
  const parts = cleaned.match(/.{1,4}/g);
  return parts ? parts.join('-') : '';
}

export function isValidMachineNumber(value: string): boolean {
  return /^[A-Za-z0-9]{16}$/.test(normalizeMachineNumber(value));
}

export type AppRequestAuth =
  | { ok: true; customerId: number; userId: number; role: string }
  | { ok: false; status: number; message: string };

/**
 * Android request auth:
 *   Authorization: Bearer <jwt>
 *   X-Customer-Id: <customerId>  (must match token customer_id)
 */
export function resolveAppRequest(request: NextRequest): AppRequestAuth {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return {
      ok: false,
      status: 401,
      message: 'Missing or invalid Authorization Bearer token',
    };
  }

  const token = authHeader.slice(7).trim();
  const decoded = verifyToken(token);
  if (!decoded) {
    return { ok: false, status: 401, message: 'Invalid or expired token' };
  }

  const tokenCustomerId = decoded.customer_id ?? decoded.userId;
  if (!tokenCustomerId) {
    return {
      ok: false,
      status: 401,
      message: 'Token missing customer_id',
    };
  }

  const headerCustomerIdRaw = request.headers.get('x-customer-id');
  if (!headerCustomerIdRaw) {
    return {
      ok: false,
      status: 400,
      message: 'X-Customer-Id header is required',
    };
  }

  const headerCustomerId = parseInt(headerCustomerIdRaw, 10);
  if (Number.isNaN(headerCustomerId)) {
    return { ok: false, status: 400, message: 'Invalid X-Customer-Id' };
  }

  if (headerCustomerId !== tokenCustomerId) {
    return {
      ok: false,
      status: 403,
      message: 'X-Customer-Id does not match token',
    };
  }

  return {
    ok: true,
    customerId: tokenCustomerId,
    userId: decoded.userId,
    role: decoded.role || 'app',
  };
}
