import axios from 'axios';

const API_TIMEOUT = 10000;
const PULSEPOINT_ALL_USERS_URL = 'https://api.pulsepoint.clinotag.com/api/user/allusers';

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

/**
 * Resolve a PulsePoint admin by email (same lookup used at agent registration).
 */
export async function findPulsePointAdminByEmail(
  email: string
): Promise<PulsePointAdmin | null> {
  try {
    const response = await axios.get(PULSEPOINT_ALL_USERS_URL, {
      auth: {
        username: process.env.PULSEPOINT_API_USERNAME || '',
        password: process.env.PULSEPOINT_API_PASSWORD || '',
      },
      timeout: API_TIMEOUT,
    });

    const allUsers = response.data?.data || response.data || [];
    const normalized = email.trim().toLowerCase();
    const user = (allUsers as { email?: string; id: number }[]).find(
      (u) => u.email?.toLowerCase() === normalized
    );

    if (!user) {
      return null;
    }

    return { id: user.id, email: user.email || email };
  } catch (error) {
    console.error('PulsePoint API error:', error);
    throw new PulsePointUnavailableError();
  }
}
