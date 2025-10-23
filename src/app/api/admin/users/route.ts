// src/app/api/admin/users/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { auth, db } from '@/lib/firebase/admin';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  try {
    // Try to authenticate with session cookie first
    const cookieStore =await cookies();
    const sessionCookie = cookieStore.get('session')?.value;
    
    let userId = '';
    
    if (sessionCookie) {
      try {
        const decodedClaims = await auth.verifySessionCookie(sessionCookie);
        userId = decodedClaims.uid;
      } catch (cookieError) {
        console.error('Session cookie verification failed:', cookieError);
        // Continue to try token auth
      }
    }
    
    // If session cookie auth failed, try token auth
    if (!userId) {
      const authHeader = request.headers.get('Authorization');
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return NextResponse.json(
          { error: 'Unauthorized: Missing or invalid authentication' },
          { status: 401 }
        );
      }

      const token = authHeader.split(' ')[1];
      
      try {
        const decodedToken = await auth.verifyIdToken(token);
        userId = decodedToken.uid;
      } catch (tokenError) {
        console.error('Token verification failed:', tokenError);
        return NextResponse.json(
          { error: 'Invalid or expired token' },
          { status: 401 }
        );
      }
    }
    
    // Check if user is an admin
    const userDoc = await db.collection('users').doc(userId).get();
    if (!userDoc.exists) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const userData = userDoc.data();
    if (userData?.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized: Admin access required' },
        { status: 403 }
      );
    }
    
    // Get pagination parameters
    const searchParams = request.nextUrl.searchParams;
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);
    const page = Math.max(parseInt(searchParams.get('page') || '1'), 1);
    const offset = (page - 1) * limit;
    
    // Get all users with pagination
    const usersQuery = db.collection('users').limit(limit).offset(offset);
    const usersSnapshot = await usersQuery.get();
    
    // Format user data
    const users = usersSnapshot.docs.map(doc => {
      const data = doc.data();
      
      // Format dates if they exist
      return {
        id: doc.id,
        ...data,
        // Add timestamp to force client refresh
        _timestamp: Date.now()
      };
    });
    
    // Get total count for pagination info
    const totalUsersSnapshot = await db.collection('users').count().get();
    const totalUsers = totalUsersSnapshot.data().count;
    const totalPages = Math.ceil(totalUsers / limit);
    
    return NextResponse.json({ 
      users,
      pagination: {
        total: totalUsers,
        page,
        limit,
        totalPages
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    );
  }
}
