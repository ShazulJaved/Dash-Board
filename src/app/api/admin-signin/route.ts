import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();
    const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
    const signInUrl = 'https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword';

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' }, 
        { status: 400 }
      );
    }

    const response = await fetch(`${signInUrl}?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        password,
        returnSecureToken: true,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      const errorMessage = getErrorMessage(data.error.message);
      return NextResponse.json(
        { error: errorMessage }, 
        { status: response.status }
      );
    }

    // Set auth cookie
    const cookieStore = await cookies();
    cookieStore.set('auth_token', data.idToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 3600 // 1 hour
    });

    return NextResponse.json({
      success: true,
      user: {
        email: data.email,
        uid: data.localId,
        expiresIn: data.expiresIn
      }
    });

  } catch (error) {
    console.error('Admin sign-in error:', error);
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    );
  }
}

function getErrorMessage(code: string): string {
  const errorMap: Record<string, string> = {
    'EMAIL_NOT_FOUND': 'No user found with this email',
    'INVALID_PASSWORD': 'Incorrect password',
    'USER_DISABLED': 'This account has been disabled',
    'TOO_MANY_ATTEMPTS_TRY_LATER': 'Too many failed attempts. Try again later',
    'EMAIL_EXISTS': 'Email already in use',
    'OPERATION_NOT_ALLOWED': 'Email/password sign in is not enabled',
    'INVALID_EMAIL': 'Invalid email format'
  };

  return errorMap[code] || 'Authentication failed';
}