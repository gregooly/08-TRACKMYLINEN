import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Get token and role from cookies
  const token = request.cookies.get('token')?.value;
  const userRole = request.cookies.get('userRole')?.value;

  // Protected routes
  const isAdminRoute = pathname.startsWith('/admin');
  const isAgentRoute = pathname.startsWith('/agent');
  const isProtectedRoute = isAdminRoute || isAgentRoute;

  // If accessing protected route without token, redirect to signin
  if (isProtectedRoute && !token) {
    const url = request.nextUrl.clone();
    url.pathname = '/';
    url.searchParams.set('error', 'unauthorized');
    return NextResponse.redirect(url);
  }

  // If token exists, check role (simplified - just trust the cookie for now)
  if (token && isProtectedRoute) {
    if (!userRole) {
      const url = request.nextUrl.clone();
      url.pathname = '/';
      url.searchParams.set('error', 'invalid_token');
      
      const response = NextResponse.redirect(url);
      response.cookies.delete('token');
      response.cookies.delete('userRole');
      return response;
    }

    // Check if user is trying to access admin routes without admin role
    if (isAdminRoute && userRole !== 'admin') {
      const url = request.nextUrl.clone();
      url.pathname = '/';
      url.searchParams.set('error', 'forbidden');
      return NextResponse.redirect(url);
    }

    // Check if user is trying to access agent routes without agent role
    if (isAgentRoute && userRole !== 'agent') {
      const url = request.nextUrl.clone();
      url.pathname = '/';
      url.searchParams.set('error', 'forbidden');
      return NextResponse.redirect(url);
    }

    // Add role to response headers for use in pages
    const response = NextResponse.next();
    response.headers.set('x-user-role', userRole);
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/agent/:path*'],
};
