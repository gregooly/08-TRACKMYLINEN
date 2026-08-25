/**
 * Legacy path. Prefer POST /api/app/login for Android.
 */
export { POST } from '../login/route';

export async function GET() {
  return Response.json({
    success: true,
    message: 'Use POST /api/app/login with { machineNumber: "0000000000000000" }',
    endpoint: '/api/app/login',
  });
}
