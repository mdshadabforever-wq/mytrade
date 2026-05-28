import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Protect dashboard, settings, and main pages
  const isLoginPage = pathname === '/login';
  const isApiRoute = pathname.startsWith('/api/');
  const isAuthApi = pathname === '/api/auth';
  const isStatic = pathname.match(/\.(png|jpg|jpeg|gif|svg|ico|css|js)$/);

  // Exclude static assets, icons, and authentication endpoint
  if (isStatic || isAuthApi) {
    return NextResponse.next();
  }

  const sessionToken = request.cookies.get('nexus_session')?.value;
  const isAuthenticated = sessionToken === 'session_validated_token';

  if (!isAuthenticated && !isLoginPage && !isApiRoute) {
    // Redirect to login page
    return NextResponse.redirect(new URL('/login', request.url));
  }

  if (isAuthenticated && isLoginPage) {
    // Already logged in, redirect to dashboard
    return NextResponse.redirect(new URL('/', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api/auth (auth API)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
