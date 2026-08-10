import crypto from 'crypto';
import jwt from 'jsonwebtoken';

// Ensure JWT_SECRET is properly set in production
const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET && process.env.NODE_ENV === 'production') {
  throw new Error('JWT_SECRET environment variable is required in production');
}

// Use a default only in development
const SECRET_KEY = JWT_SECRET || 'dev-secret-key-change-in-production';

/**
 * Hash password using PBKDF2-SHA256 (Passlib compatible)
 * Format: $pbkdf2-sha256$29000$salt$hash
 */
export async function hashPassword(password: string): Promise<string> {
  const iterations = 29000;
  const saltLength = 32;
  const keyLength = 32;
  
  // Generate random salt
  const salt = crypto.randomBytes(saltLength);
  
  // Hash password using PBKDF2-SHA256
  const hash = crypto.pbkdf2Sync(
    password,
    salt,
    iterations,
    keyLength,
    'sha256'
  );
  
  // Convert to base64 (Passlib uses adapted base64)
  const saltB64 = salt.toString('base64').replace(/\+/g, '.').replace(/=/g, '');
  const hashB64 = hash.toString('base64').replace(/\+/g, '.').replace(/=/g, '');
  
  // Return in Passlib format: $pbkdf2-sha256$iterations$salt$hash
  return `$pbkdf2-sha256$${iterations}$${saltB64}$${hashB64}`;
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
    const saltB64 = parts[3];
    const hashB64 = parts[4];
    
    // Convert base64 back (reverse the Passlib adapted base64)
    const salt = Buffer.from(saltB64.replace(/\./g, '+') + '==', 'base64');
    const expectedHash = Buffer.from(hashB64.replace(/\./g, '+') + '==', 'base64');
    
    // Hash the provided password with the same salt
    const keyLength = expectedHash.length;
    const actualHash = crypto.pbkdf2Sync(
      password,
      salt,
      iterations,
      keyLength,
      'sha256'
    );
    
    // Compare hashes using timing-safe comparison
    return crypto.timingSafeEqual(expectedHash, actualHash);
  } catch (error) {
    console.error('Password verification error:', error);
    return false;
  }
}

export function generateToken(userId: number, role?: string, customerId?: number): string {
  const payload: { userId: number; role?: string; customer_id?: number } = { userId };
  if (role) {
    payload.role = role;
  }
  if (customerId) {
    payload.customer_id = customerId;
  }
  return jwt.sign(payload, SECRET_KEY, { expiresIn: '7d' });
}

export function verifyToken(token: string): { userId: number; role?: string; customer_id?: number } | null {
  try {
    const decoded = jwt.verify(token, SECRET_KEY) as unknown as { userId: number; role?: string; customer_id?: number };
    return decoded;
  } catch (error) {
    return null;
  }
}
