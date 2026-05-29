import { NextRequest, NextResponse } from 'next/server';
import { SignJWT } from 'jose';
import bcrypt from 'bcryptjs';

// ─── Owner credentials (set these in your .env / Vercel env vars) ───────────
// OWNER_PASSWORD_HASH: generate with: node -e "const b=require('bcryptjs'); console.log(b.hashSync('YourPassword', 12))"
// JWT_SECRET: any long random string (min 32 chars)

function getJwtSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET || 'nexus-alpha-fallback-secret-change-in-production';
  return new TextEncoder().encode(secret);
}

// ─── Brute force protection: in-memory attempt tracker ──────────────────────
const failedAttempts = new Map<string, { count: number; lockedUntil: number }>();
const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 15 * 60 * 1000; // 15 minutes

function getClientIp(request: NextRequest): string {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || '127.0.0.1';
}

function checkBruteForce(ip: string): { locked: boolean; remainingMs: number } {
  const entry = failedAttempts.get(ip);
  if (!entry) return { locked: false, remainingMs: 0 };
  if (Date.now() < entry.lockedUntil) {
    return { locked: true, remainingMs: entry.lockedUntil - Date.now() };
  }
  // Lock expired — reset
  failedAttempts.delete(ip);
  return { locked: false, remainingMs: 0 };
}

function recordFailedAttempt(ip: string): void {
  const entry = failedAttempts.get(ip) || { count: 0, lockedUntil: 0 };
  entry.count++;
  if (entry.count >= MAX_ATTEMPTS) {
    entry.lockedUntil = Date.now() + LOCKOUT_MS;
    console.warn(`[AUTH] IP ${ip} locked out after ${MAX_ATTEMPTS} failed attempts.`);
  }
  failedAttempts.set(ip, entry);
}

function clearFailedAttempts(ip: string): void {
  failedAttempts.delete(ip);
}

async function validateCredentials(passcode?: string, email?: string, password?: string): Promise<boolean> {
  // Method 1: Passcode (from env)
  if (passcode) {
    const envPasscode = process.env.OWNER_PASSCODE;
    if (!envPasscode) {
      console.warn('[AUTH] OWNER_PASSCODE not set in environment. Passcode login disabled.');
      return false;
    }
    return passcode === envPasscode;
  }

  // Method 2: Email + Password (bcrypt compared)
  if (email && password) {
    const envEmail = process.env.OWNER_EMAIL || 'admin@nexusalpha.ai';
    const envHashedPassword = process.env.OWNER_PASSWORD_HASH;

    if (email.toLowerCase() !== envEmail.toLowerCase()) return false;

    // If hash is set in env → use bcrypt compare (secure)
    if (envHashedPassword) {
      return await bcrypt.compare(password, envHashedPassword);
    }

    // Fallback: plain compare for dev only (set OWNER_PASSWORD_HASH in prod!)
    const fallbackPassword = process.env.OWNER_PASSWORD || 'admin';
    return password === fallbackPassword;
  }

  return false;
}

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request);

    // ─── Brute force check ───────────────────────────────────────────────────
    const { locked, remainingMs } = checkBruteForce(ip);
    if (locked) {
      const minutesLeft = Math.ceil(remainingMs / 60000);
      return NextResponse.json(
        { success: false, message: `Too many failed attempts. Try again in ${minutesLeft} minute(s).` },
        { status: 429 }
      );
    }

    const body = await request.json();
    const { passcode, email, password } = body;

    const isValid = await validateCredentials(passcode, email, password);

    if (!isValid) {
      recordFailedAttempt(ip);
      // Small delay to prevent timing attacks
      await new Promise(r => setTimeout(r, 500));
      return NextResponse.json(
        { success: false, message: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // ─── Generate signed JWT ─────────────────────────────────────────────────
    clearFailedAttempts(ip);
    const secret = getJwtSecret();
    const token = await new SignJWT({ role: 'owner' })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setIssuer('nexus-alpha')
      .setAudience('nexus-owner')
      .setExpirationTime('24h')
      .sign(secret);

    // ─── Set secure httpOnly cookie ──────────────────────────────────────────
    const response = NextResponse.json({ success: true, message: 'Authenticated successfully' });

    response.cookies.set('nexus_session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: 60 * 60 * 24, // 24 hours
    });

    return response;
  } catch (error: any) {
    console.error('[AUTH] Login error:', error.message);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    const response = NextResponse.json({ success: true, message: 'Logged out' });
    response.cookies.set('nexus_session', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: 0,
    });
    return response;
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
