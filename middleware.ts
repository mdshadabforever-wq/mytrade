import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

// Routes that are always public (no auth needed)
const PUBLIC_ROUTES = ['/login', '/api/auth'];

// Rate limiting store (in-memory, resets on cold start)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX = 20; // max 20 requests per minute per IP on heavy routes
const RATE_LIMITED_APIS = ['/api/stream-analysis', '/api/analyze'];

function getJwtSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET || 'nexus-alpha-fallback-secret-change-in-production';
  return new TextEncoder().encode(secret);
}

function isRateLimited(ip: string, pathname: string): boolean {
  if (!RATE_LIMITED_APIS.some(r => pathname.startsWith(r))) return false;

  const key = `${ip}:${pathname}`;
  const now = Date.now();
  const entry = rateLimitMap.get(key);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }

  if (entry.count >= RATE_LIMIT_MAX) return true;

  entry.count++;
  return false;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Always allow static assets
  if (pathname.match(/\.(png|jpg|jpeg|gif|svg|ico|css|js|woff2|woff|ttf)$/)) {
    return NextResponse.next();
  }

  // Always allow Next.js internals
  if (pathname.startsWith('/_next/')) {
    return NextResponse.next();
  }

  // Check if route is public
  const isPublic = PUBLIC_ROUTES.some(r => pathname === r || pathname.startsWith(r + '/'));
  if (isPublic) {
    return NextResponse.next();
  }

  // ─── Rate limiting check ───
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || '127.0.0.1';
  if (isRateLimited(ip, pathname)) {
    return NextResponse.json(
      { error: 'Too many requests. Slow down.' },
      { status: 429 }
    );
  }

  // ─── JWT Authentication ───
  const sessionToken = request.cookies.get('nexus_session')?.value;

  if (!sessionToken) {
    return handleUnauthenticated(request, pathname);
  }

  try {
    await jwtVerify(sessionToken, getJwtSecret(), {
      issuer: 'nexus-alpha',
      audience: 'nexus-owner',
    });
    // Valid token — proceed
    return addSecurityHeaders(NextResponse.next());
  } catch {
    // Invalid or expired JWT
    return handleUnauthenticated(request, pathname);
  }
}

function handleUnauthenticated(request: NextRequest, pathname: string): NextResponse {
  // API routes → return 401 JSON
  if (pathname.startsWith('/api/')) {
    return NextResponse.json(
      { error: 'Unauthorized. Valid session required.' },
      { status: 401 }
    );
  }
  // Page routes → redirect to login
  return NextResponse.redirect(new URL('/login', request.url));
}

function addSecurityHeaders(response: NextResponse): NextResponse {
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'no-referrer');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
