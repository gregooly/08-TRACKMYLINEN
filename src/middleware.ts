import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyJwtEdge } from '@/lib/edgeJwt';

const JWT_SECRET =
  process.env.JWT_SECRET || 'dev-secret-key-change-in-production';

function redirect(request: NextRequest, error: string, clear = false) {
  const url = request.nextUrl.clone();
  url.pathname = '/';
  url.search = '';
  url.searchParams.set('error', error);

  const response = NextResponse.redirect(url);
  if (clear) {
    response.cookies.delete('token');
    response.cookies.delete('userRole');
  }
  return response;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const token = request.cookies.get('token')?.value;

  // Protected routes
  const isAdminRoute = pathname.startsWith('/admin');
  const isAgentRoute = pathname.startsWith('/agent');
  const isProtectedRoute = isAdminRoute || isAgentRoute;

  if (!isProtectedRoute) {
    return NextResponse.next();
  }

  if (!token) {
    return redirect(request, 'unauthorized');
  }

  // The role now comes from the *verified* JWT payload. The previous version
  // read it from the `userRole` cookie, which is set with httpOnly:false and
  // could therefore be changed to "admin" by any client from the browser
  // console to walk straight into the admin area.
  const payload = await verifyJwtEdge(token, JWT_SECRET);

  if (!payload) {
    return redirect(request, 'invalid_token', true);
  }

  const userRole = payload.role;

  if (!userRole) {
    return redirect(request, 'invalid_token', true);
  }

  if (isAdminRoute && userRole !== 'admin') {
    return redirect(request, 'forbidden');
  }

  if (isAgentRoute && userRole !== 'agent') {
    return redirect(request, 'forbidden');
  }

  const response = NextResponse.next();
  // Strip any client-supplied value before setting the trusted one, so a page
  // reading this header cannot be fed a forged role.
  response.headers.set('x-user-role', userRole);
  return response;
}

export const config = {
  matcher: ['/admin/:path*', '/agent/:path*'],
};
