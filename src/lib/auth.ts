import {
  randomBytes,
  pbkdf2 as pbkdf2Callback,
  timingSafeEqual,
} from 'node:crypto';
import { promisify } from 'node:util';
import jwt from 'jsonwebtoken';

/**
 * NOTE: this module imports `node:crypto`, never the bare `crypto` specifier.
 * The `crypto` npm package (a deprecated npm name-holder with no code) used to
 * sit in node_modules and could shadow the built-in; the `node:` prefix is
 * resolved by the runtime and can never be shadowed by a package.
 */

const pbkdf2 = promisify(pbkdf2Callback);

// Ensure JWT_SECRET is properly set in production
const JWT_SECRET = process.env.JWT_SECRET;

const PLACEHOLDER_SECRETS = new Set([
  'your-super-secret-jwt-key-change-this-in-production',
  'dev-secret-key-change-in-production',
  'secret',
  'changeme',
]);

let secretChecked = false;

/**
 * Validated on first token use rather than at module load.
 *
 * `next build` runs with NODE_ENV=production, so a module-level throw here
 * would fail the build on a machine that legitimately has no production
 * secret. Checking lazily still refuses to mint or accept a token on a
 * misconfigured server, which is where it actually matters.
 *
 * A weak or shipped-default secret is not a lint issue: anyone who knows it
 * can forge a token with role:'admin' and any customer_id, which defeats every
 * other authorization check in this codebase.
 */
function assertUsableSecret(): void {
  if (secretChecked || process.env.NODE_ENV !== 'production') return;

  if (!JWT_SECRET) {
    throw new Error('JWT_SECRET environment variable is required in production');
  }

  if (JWT_SECRET.length < 32 || PLACEHOLDER_SECRETS.has(JWT_SECRET)) {
    throw new Error(
      'JWT_SECRET must be a unique random string of at least 32 characters in production'
    );
  }

  secretChecked = true;
}

// Use a default only in development
const SECRET_KEY = JWT_SECRET || 'dev-secret-key-change-in-production';

const PBKDF2_ITERATIONS = 29000;
const PBKDF2_SALT_LENGTH = 32;
const PBKDF2_KEY_LENGTH = 32;
const PBKDF2_DIGEST = 'sha256';

// Passlib's "adapted base64": `+` -> `.` and padding stripped.
function toAdaptedB64(buf: Buffer): string {
  return buf.toString('base64').replace(/\+/g, '.').replace(/=+$/g, '');
}

function fromAdaptedB64(value: string): Buffer {
  const standard = value.replace(/\./g, '+');
  const padding = standard.length % 4 === 0 ? '' : '='.repeat(4 - (standard.length % 4));
  return Buffer.from(standard + padding, 'base64');
}

/**
 * Hash password using PBKDF2-SHA256 (Passlib compatible)
 * Format: $pbkdf2-sha256$29000$salt$hash
 */
export async function hashPassword(password: string): Promise<string> {
  // Async pbkdf2 runs on the libuv threadpool; the sync variant blocked the
  // single Node event loop for ~20-30ms per call and stalled every other request.
  const salt = randomBytes(PBKDF2_SALT_LENGTH);

  const hash = await pbkdf2(
    password,
    salt,
    PBKDF2_ITERATIONS,
    PBKDF2_KEY_LENGTH,
    PBKDF2_DIGEST
  );

  // Return in Passlib format: $pbkdf2-sha256$iterations$salt$hash
  return `$pbkdf2-sha256$${PBKDF2_ITERATIONS}$${toAdaptedB64(salt)}$${toAdaptedB64(hash)}`;
}

/**
 * Verify password against PBKDF2-SHA256 hash (Passlib compatible)
 */
export async function verifyPassword(
  password: string,
  hashedPassword: string
): Promise<boolean> {
  try {
    // Parse the hash format: $pbkdf2-sha256$iterations$salt$hash
    const parts = hashedPassword.split('$');

    if (parts.length !== 5 || parts[1] !== 'pbkdf2-sha256') {
      console.error('Invalid hash format');
      return false;
    }

    const iterations = parseInt(parts[2], 10);
    if (!Number.isInteger(iterations) || iterations < 1 || iterations > 1_000_000) {
      // Guards against a stored hash forcing an unbounded CPU burn.
      console.error('Invalid hash iteration count');
      return false;
    }

    const salt = fromAdaptedB64(parts[3]);
    const expectedHash = fromAdaptedB64(parts[4]);

    if (salt.length === 0 || expectedHash.length === 0) {
      return false;
    }

    // Hash the provided password with the same salt
    const actualHash = await pbkdf2(
      password,
      salt,
      iterations,
      expectedHash.length,
      PBKDF2_DIGEST
    );

    // Compare hashes using timing-safe comparison.
    // timingSafeEqual throws on length mismatch, so check length first.
    if (actualHash.length !== expectedHash.length) {
      return false;
    }

    return timingSafeEqual(expectedHash, actualHash);
  } catch (error) {
    console.error('Password verification error:', error);
    return false;
  }
}

export type TokenRole = 'admin' | 'agent' | 'app' | 'api';

export type TokenPayload = {
  userId: number;
  role?: TokenRole;
  customer_id?: number;
};

export function generateToken(
  userId: number,
  role?: TokenRole,
  customerId?: number
): string {
  assertUsableSecret();
  const payload: TokenPayload = { userId };
  if (role) {
    payload.role = role;
  }
  if (customerId) {
    payload.customer_id = customerId;
  }
  return jwt.sign(payload, SECRET_KEY, {
    expiresIn: '7d',
    algorithm: 'HS256',
  });
}

export function verifyToken(token: string): TokenPayload | null {
  assertUsableSecret();

  try {
    // Pinning the algorithm blocks "alg": "none" and RS/HS confusion attacks.
    const decoded = jwt.verify(token, SECRET_KEY, {
      algorithms: ['HS256'],
    }) as unknown as TokenPayload;

    if (!decoded || typeof decoded.userId !== 'number') {
      return null;
    }

    return decoded;
  } catch {
    return null;
  }
}
