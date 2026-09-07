import { NextRequest, NextResponse } from 'next/server';

/**
 * Small fixed-window rate limiter for unauthenticated endpoints.
 *
 * Deliberately bounded: the map is swept lazily and hard-capped, so it cannot
 * itself become the unbounded-growth problem it is meant to protect against.
 * Note this is per-process — behind several instances put the limit in a shared
 * store (Redis) or at the reverse proxy.
 */

type Bucket = { count: number; resetAt: number };

const MAX_TRACKED_KEYS = 10_000;

const globalForRateLimit = globalThis as unknown as {
  __rateLimitBuckets?: Map<string, Bucket>;
};

const buckets: Map<string, Bucket> =
  globalForRateLimit.__rateLimitBuckets ?? new Map<string, Bucket>();
globalForRateLimit.__rateLimitBuckets = buckets;

function sweep(now: number) {
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) {
      buckets.delete(key);
    }
  }
  // Hard cap: if still oversized after dropping expired entries, drop oldest
  // insertions (Map preserves insertion order).
  if (buckets.size > MAX_TRACKED_KEYS) {
    const excess = buckets.size - MAX_TRACKED_KEYS;
    let removed = 0;
    for (const key of buckets.keys()) {
      buckets.delete(key);
      if (++removed >= excess) break;
    }
  }
}

/** Best-effort client IP from proxy headers. */
export function clientIp(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  return request.headers.get('x-real-ip')?.trim() || 'unknown';
}

export type RateLimitOptions = {
  /** Bucket namespace, e.g. 'app-login'. */
  name: string;
  /** Max requests allowed per window. */
  limit: number;
  /** Window length in milliseconds. */
  windowMs: number;
};

export type RateLimitResult =
  | { allowed: true }
  | { allowed: false; response: NextResponse };

export function rateLimit(
  request: NextRequest,
  options: RateLimitOptions
): RateLimitResult {
  const now = Date.now();

  // Sweep occasionally rather than on every call.
  if (buckets.size > 0 && Math.random() < 0.01) {
    sweep(now);
  }

  const key = `${options.name}:${clientIp(request)}`;
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + options.windowMs });
    return { allowed: true };
  }

  bucket.count += 1;

  if (bucket.count > options.limit) {
    const retryAfter = Math.max(1, Math.ceil((bucket.resetAt - now) / 1000));
    return {
      allowed: false,
      response: NextResponse.json(
        {
          success: false,
          message: 'Too many attempts. Please try again later.',
        },
        {
          status: 429,
          headers: { 'Retry-After': String(retryAfter) },
        }
      ),
    };
  }

  return { allowed: true };
}
