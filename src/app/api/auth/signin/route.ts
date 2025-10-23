import { NextRequest, NextResponse } from 'next/server';
import { auth as adminAuth, db } from '@/lib/firebase/admin';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const { email, password, idToken } = await request.json();

    if (!idToken) {
      return NextResponse.json(
        { error: 'ID token is required' },
        { status: 400 }
      );
    }

    try {
      // Verify the ID token
      const decodedToken = await adminAuth.verifyIdToken(idToken);
      const uid = decodedToken.uid;

      // Get user data from Firestore
      const userDoc = await db.collection('users').doc(uid).get();
      if (!userDoc.exists) {
        return NextResponse.json(
          { error: 'User profile not found' },
          { status: 404 }
        );
      }

      const userData = userDoc.data();
      if (!userData) {
        return NextResponse.json(
          { error: 'User data not found' },
          { status: 404 }
        );
      }

      // Get the role from the Firestore document
      const role = userData.role || 'user';

      // Create a session cookie
      const expiresIn = 60 * 60 * 24 * 5 * 1000; // 5 days
      const sessionCookie = await adminAuth.createSessionCookie(idToken, {
        expiresIn,
      });

      // Set session cookie
      cookieStore.set('session', sessionCookie, {
        maxAge: expiresIn / 1000,
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        path: '/',
      });

      // Return the user data along with the role
      return NextResponse.json({
        success: true,
        user: {
          uid,
          email: userData.email,
          role,
          status: userData.status,
          displayName: userData.displayName
        },
        role,
        redirectTo: role === 'admin' ? '/admin/dashboard' : '/user/dashboard',
        message: 'Successfully signed in'
      });
    } catch (error) {
      console.error('Token verification error:', error);
      return NextResponse.json(
        { error: 'Invalid authentication token' },
        { status: 401 }
      );
    }
  } catch (error: any) {
    console.error('Sign-in error:', error);
    return NextResponse.json(
      { error: 'Authentication failed' },
      { status: 401 }
    );
  }
}