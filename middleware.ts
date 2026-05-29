import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

// Routes that are always public (no auth needed)
const PUBLIC_ROUTES = ['/login', '/api/auth'];

// Rate limiting store (in-memory, resets on cold start)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX = 20; // max 20 requests per minute per IP on heavy routes
const RATE_LIMITED_APIS = ['/api/stream-analysis', '/api/analyze', '/api/auth'];
// Auth gets a much tighter cap; other heavy endpoints use RATE_LIMIT_MAX
const AUTH_RATE_LIMIT_MAX = 5;  // 5 attempts per minute per IP

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

  // Auth endpoints get a tighter per-minute cap
  const limit = pathname.startsWith('/api/auth') ? AUTH_RATE_LIMIT_MAX : RATE_LIMIT_MAX;
  if (entry.count >= limit) return true;

  entry.count++;
  return false;
}

export async function middleware(request: NextRequest) {
  return NextResponse.next();
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
