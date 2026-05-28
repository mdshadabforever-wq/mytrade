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

async function validateCredentials(passcode?: string, email?: string, password?: string): Promise<boolean> {
  // Method 1: Passcode (from env)
  if (passcode) {
    const envPasscode = process.env.OWNER_PASSCODE || 'nexus2026';
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
    const body = await request.json();
    const { passcode, email, password } = body;

    const isValid = await validateCredentials(passcode, email, password);

    if (!isValid) {
      // Add small delay to prevent brute force timing attacks
      await new Promise(r => setTimeout(r, 500));
      return NextResponse.json(
        { success: false, message: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // ─── Generate signed JWT ─────────────────────────────────────────────────
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
