/**
 * Minimal HS256 JWT verification that runs in the Edge runtime.
 *
 * `jsonwebtoken` depends on Node built-ins and cannot run in middleware, which
 * is why the middleware previously just trusted a non-httpOnly `userRole`
 * cookie that any client could set. This uses the standard Web Crypto API, so
 * middleware can verify the real signature with no extra dependency.
 */

export type EdgeJwtPayload = {
  userId?: number;
  role?: string;
  customer_id?: number;
  exp?: number;
};

function base64UrlToBytes(input: string): Uint8Array {
  const base64 = input.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function timingSafeEqualBytes(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a[i] ^ b[i];
  }
  return diff === 0;
}

/**
 * Verify an HS256 JWT and return its payload, or null if the token is
 * malformed, wrongly signed, using another algorithm, or expired.
 */
export async function verifyJwtEdge(
  token: string,
  secret: string
): Promise<EdgeJwtPayload | null> {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const [encodedHeader, encodedPayload, encodedSignature] = parts;

    const header = JSON.parse(
      new TextDecoder().decode(base64UrlToBytes(encodedHeader))
    ) as { alg?: string; typ?: string };

    // Pin the algorithm: reject "none" and any asymmetric-confusion attempt.
    if (header.alg !== 'HS256') return null;

    const key = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );

    const expected = new Uint8Array(
      await crypto.subtle.sign(
        'HMAC',
        key,
        new TextEncoder().encode(`${encodedHeader}.${encodedPayload}`)
      )
    );

    const actual = base64UrlToBytes(encodedSignature);
    if (!timingSafeEqualBytes(expected, actual)) return null;

    const payload = JSON.parse(
      new TextDecoder().decode(base64UrlToBytes(encodedPayload))
    ) as EdgeJwtPayload;

    if (typeof payload.exp === 'number' && payload.exp * 1000 <= Date.now()) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}
