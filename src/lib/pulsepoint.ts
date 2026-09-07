import axios from 'axios';

const API_TIMEOUT = 10000;
const PULSEPOINT_BASE_URL =
  process.env.PULSEPOINT_API_BASE_URL || 'https://api.pulsepoint.clinotag.com';
const PULSEPOINT_ALL_USERS_URL = `${PULSEPOINT_BASE_URL}/api/user/allusers`;

// Cache resolved lookups briefly. Previously EVERY admin login, agent login and
// registration downloaded the provider's entire user directory.
const LOOKUP_TTL_MS = 60_000;
const LOOKUP_MAX_ENTRIES = 5_000;

export class PulsePointUnavailableError extends Error {
  constructor(message = 'PulsePoint service may be unavailable') {
    super(message);
    this.name = 'PulsePointUnavailableError';
  }
}

export type PulsePointAdmin = {
  id: number;
  email: string;
};

type CacheEntry = { value: PulsePointAdmin | null; expiresAt: number };

const globalForPulsePoint = globalThis as unknown as {
  __pulsePointLookupCache?: Map<string, CacheEntry>;
};

const lookupCache: Map<string, CacheEntry> =
  globalForPulsePoint.__pulsePointLookupCache ?? new Map<string, CacheEntry>();
globalForPulsePoint.__pulsePointLookupCache = lookupCache;

/**
 * Log an upstream failure without echoing the request, which for these calls
 * carries HTTP Basic credentials and (on the signin path) a user's plaintext
 * password. `console.error(axiosError)` serialised all of it into the logs.
 */
export function logUpstreamError(context: string, error: unknown): void {
  if (axios.isAxiosError(error)) {
    console.error(
      `${context}: ${error.code || 'HTTP_ERROR'} status=${
        error.response?.status ?? 'n/a'
      }`
    );
    return;
  }
  console.error(`${context}: ${error instanceof Error ? error.message : 'unknown error'}`);
}

function cacheGet(key: string): CacheEntry | undefined {
  const entry = lookupCache.get(key);
  if (!entry) return undefined;
  if (entry.expiresAt <= Date.now()) {
    lookupCache.delete(key);
    return undefined;
  }
  return entry;
}

function cacheSet(key: string, value: PulsePointAdmin | null): void {
  if (lookupCache.size >= LOOKUP_MAX_ENTRIES) {
    const now = Date.now();
    for (const [k, v] of lookupCache) {
      if (v.expiresAt <= now) lookupCache.delete(k);
    }
    // Still full: drop the oldest insertion so the cache stays bounded.
    if (lookupCache.size >= LOOKUP_MAX_ENTRIES) {
      const oldest = lookupCache.keys().next();
      if (!oldest.done) lookupCache.delete(oldest.value);
    }
  }
  lookupCache.set(key, { value, expiresAt: Date.now() + LOOKUP_TTL_MS });
}

/**
 * Resolve a PulsePoint admin by email (same lookup used at agent registration).
 */
export async function findPulsePointAdminByEmail(
  email: string
): Promise<PulsePointAdmin | null> {
  const normalized = email.trim().toLowerCase();

  const cached = cacheGet(normalized);
  if (cached) {
    return cached.value;
  }

  const username = process.env.PULSEPOINT_API_USERNAME;
  const password = process.env.PULSEPOINT_API_PASSWORD;

  // Previously these fell back to '' and the call went out unauthenticated.
  if (!username || !password) {
    console.error(
      'PULSEPOINT_API_USERNAME / PULSEPOINT_API_PASSWORD are not configured'
    );
    throw new PulsePointUnavailableError();
  }

  try {
    const response = await axios.get(PULSEPOINT_ALL_USERS_URL, {
      auth: { username, password },
      timeout: API_TIMEOUT,
      // Bound the response so a hostile or broken upstream cannot exhaust
      // this process's memory with an unbounded body.
      maxContentLength: 20 * 1024 * 1024,
      maxBodyLength: 20 * 1024 * 1024,
    });

    const allUsers = response.data?.data || response.data || [];

    if (!Array.isArray(allUsers)) {
      throw new PulsePointUnavailableError('Unexpected PulsePoint response shape');
    }

    const user = (allUsers as { email?: string; id: number }[]).find(
      (u) => u.email?.toLowerCase() === normalized
    );

    const result = user ? { id: user.id, email: user.email || email } : null;
    cacheSet(normalized, result);
    return result;
  } catch (error) {
    if (error instanceof PulsePointUnavailableError) {
      throw error;
    }
    logUpstreamError('PulsePoint API error', error);
    throw new PulsePointUnavailableError();
  }
}
