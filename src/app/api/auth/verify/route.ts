// src/app/api/auth/verify/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { auth, db } from '@/lib/firebase/admin';

// Simple in-memory cache for managers list
const managerCache = {
  data: [] as { id: string; displayName: string }[],
  timestamp: 0,
};
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// POST /api/auth/verify
export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('Authorization') || '';
  if (!authHeader.startsWith('Bearer ')) {
    return NextResponse.json(
      { error: 'Authorization header missing or invalid' },
      { status: 401 }
    );
  }
  const idToken = authHeader.slice(7);
  try {
    const decoded = await auth.verifyIdToken(idToken, true);
    console.log('Token claims:', decoded);
    
    // Check for admin claim first
    if (decoded.admin === true) {
      return NextResponse.json({ role: 'admin' });
    }
    
    // Then check for role claim
    const role = (decoded as any).role || 'user';
    
    // If still not admin, check Firestore for admin status
    if (role !== 'admin') {
      const userDoc = await db.collection('users').doc(decoded.uid).get();
      if (userDoc.exists && userDoc.data()?.role === 'admin') {
        return NextResponse.json({ role: 'admin' });
      }
    }
    
    return NextResponse.json({ role });
  } catch (e: any) {
    console.error('POST /verify error:', e);
    const status = e.code === 'auth/id-token-expired' || e.code === 'auth/argument-error' ? 401 : 500;
    return NextResponse.json({ error: e.message || 'Failed to verify token' }, { status });
  }
}

// GET /api/auth/verify
export async function GET(request: NextRequest) {
  const session = request.cookies.get('session')?.value;
  if (!session) {
    return NextResponse.json({ error: 'No session cookie found' }, { status: 401 });
  }
  try {
    const decoded = await auth.verifySessionCookie(session, true);
    
    // Check for admin claim first
    if (decoded.admin === true) {
      return NextResponse.json({
        uid: decoded.uid,
        email: decoded.email,
        emailVerified: decoded.email_verified,
        role: 'admin',
      });
    }
    
    // Then check for role claim
    const role = (decoded as any).role || 'user';
    
    // If still not admin, check Firestore for admin status
    let finalRole = role;
    if (role !== 'admin') {
      const userDoc = await db.collection('users').doc(decoded.uid).get();
      if (userDoc.exists && userDoc.data()?.role === 'admin') {
        finalRole = 'admin';
      }
    }
    
    return NextResponse.json({
      uid: decoded.uid,
      email: decoded.email,
      emailVerified: decoded.email_verified,
      role: finalRole,
    });
  } catch (e: any) {
    console.error('GET /verify error:', e);
    const status = e.code === 'auth/id-token-expired' ? 401 : 500;
    return NextResponse.json({ error: e.message || 'Failed to verify session' }, { status });
  }
}

// PUT /api/auth/verify - update profile
export async function PUT(request: NextRequest) {
  const authHeader = request.headers.get('Authorization') || '';
  if (!authHeader.startsWith('Bearer ')) {
    return NextResponse.json(
      { error: 'Authorization header missing or invalid' },
      { status: 401 }
    );
  }
  const idToken = authHeader.slice(7);
  try {
    const decoded = await auth.verifyIdToken(idToken, true);
    const userId = decoded.uid;
    const updates = await request.json();
    const allowed = [
      'displayName','phoneNumber','dateOfBirth','dateOfJoining',
      'reportingManager','reportingManagerId','designation','department','position',
      'officeLocation','homeLocation','seatingLocation','extensionNumber',
      'employeeType','education','experience','skills','dependents'
    ];
    const updateData: any = { updatedAt: new Date() };
    for (const field of allowed) {
      if (updates[field] !== undefined) updateData[field] = updates[field];
    }
    if (updateData.displayName) {
      await auth.updateUser(userId, { displayName: updateData.displayName });
    }
    await db.collection('users').doc(userId).update(updateData);
    return NextResponse.json({ message: 'Profile updated', user: { id: userId, ...updateData } });
  } catch (e: any) {
    console.error('PUT /verify error:', e);
    const status = e.code === 8 ? 503 : 500;
    return NextResponse.json({ error: e.message || 'Failed to update profile' }, { status });
  }
}

// PATCH /api/auth/verify - fetch managers
export async function PATCH(request: NextRequest) {
  const authHeader = request.headers.get('Authorization') || '';
  if (!authHeader.startsWith('Bearer ')) {
    return NextResponse.json(
      { error: 'Authorization header missing or invalid' },
      { status: 401 }
    );
  }
  // return cached if valid
  const now = Date.now();
  if (managerCache.data.length && now - managerCache.timestamp < CACHE_TTL) {
    return NextResponse.json({ managers: managerCache.data });
  }
  try {
    const decoded = await auth.verifyIdToken(authHeader.slice(7), true);
    // only admins can fetch managers
    if (!(decoded as any).admin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    const snap = await db.collection('users').where('role','==','admin').get();
    const managers = snap.docs.map(d => ({ id: d.id, displayName: d.data().displayName || d.data().email }));
    managerCache.data = managers;
    managerCache.timestamp = now;
    return NextResponse.json({ managers });
  } catch (e: any) {
    console.error('PATCH /verify error:', e);
    const status = e.code === 8 ? 503 : 500;
    return NextResponse.json({ error: e.message || 'Failed to fetch managers' }, { status });
  }
}