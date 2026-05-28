import { NextRequest, NextResponse } from 'next/server';

const MASTER_PASSCODE = 'admin'; // Custom master terminal passcode for local professional desk
const DEFAULT_EMAIL = 'admin@nexusalpha.ai';
const DEFAULT_PASSWORD = 'admin';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { passcode, email, password, isGoogleSso } = body;

    let isValid = false;

    if (isGoogleSso) {
      // Mock Google SSO integration
      isValid = true;
    } else if (passcode) {
      // Passcode validation
      isValid = passcode === MASTER_PASSCODE;
    } else if (email && password) {
      // Email/password credentials validation
      isValid = email.toLowerCase() === DEFAULT_EMAIL && password === DEFAULT_PASSWORD;
    }

    if (!isValid) {
      return NextResponse.json({ success: false, message: 'Invalid credentials or master passcode' }, { status: 401 });
    }

    // Set secure cookie
    const response = NextResponse.json({ success: true, message: 'Session validated successfully' });
    
    // Set cookie using next/headers or raw response header
    response.cookies.set('nexus_session', 'session_validated_token', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 1 week session
    });

    return response;
  } catch (error: any) {
    console.error('[AUTH API] Error:', error.message);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    const response = NextResponse.json({ success: true, message: 'Logged out successfully' });
    
    // Clear session cookie
    response.cookies.set('nexus_session', '', {
      path: '/',
      maxAge: 0,
    });

    return response;
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
