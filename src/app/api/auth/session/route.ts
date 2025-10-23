// src/app/api/auth/session/route.ts
import { NextResponse } from 'next/server';
import { auth } from '@/lib/firebase/admin';
import { db } from '@/lib/firebase/admin';

const SESSION_EXPIRY_HOURS = 12;

export async function POST(request: Request) {
  try {
    const { idToken } = await request.json();

    if (!idToken) {
      return NextResponse.json(
        { error: 'No ID token provided' },
        { status: 400 }
      );
    }

    // Verify the ID token
    const decodedToken = await auth.verifyIdToken(idToken);
    const uid = decodedToken.uid;

    // Get user data from Firestore to include in the response
    const userDoc = await db.collection('users').doc(uid).get();
    const userData = userDoc.exists ? userDoc.data() : null;
    const role = userData?.role || 'user';

    // Create session cookie
    const sessionCookie = await auth.createSessionCookie(idToken, {
      expiresIn: SESSION_EXPIRY_HOURS * 60 * 60 * 1000,
    });

    // Set the cookie
    const response = NextResponse.json({ 
      success: true,
      role,
      user: {
        uid,
        email: decodedToken.email,
        role,
        displayName: userData?.displayName
      }
    });
    
    response.cookies.set('session', sessionCookie, {
      maxAge: SESSION_EXPIRY_HOURS * 60 * 60,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Session creation error:', error);
    return NextResponse.json(
      { error: 'Failed to create session' },
      { status: 401 }
    );
  }
}
