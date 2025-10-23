// src/app/api/user/[userId]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { auth as adminAuth } from '@/lib/firebase/admin';

// Define possible roles
type Role = 'user' | 'admin';

// Simple cache to avoid expensive API calls
const userCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 30 * 60 * 1000; // 30 minutes

// Fetch user data from Firebase Auth with caching
async function getUserData(userId: string) {
  const now = Date.now();
  const cached = userCache.get(userId);
  if (cached && now - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }

  // Retrieve from Auth service
  const userRecord = await adminAuth.getUser(userId);
  const userData = {
    id: userId,
    displayName: userRecord.displayName || 'User',
    email: userRecord.email || '',
    role: (userRecord.customClaims?.role as Role) || 'user',
    status: 'active',
  };
  userCache.set(userId, { data: userData, timestamp: now });
  return userData;
}

// Verify Bearer token and extract uid & role
async function verifyAuth(request: NextRequest): Promise<{ uid: string; role: Role }> {
  const authHeader = request.headers.get('Authorization') || '';
  if (!authHeader.startsWith('Bearer ')) {
    throw new Error('Unauthorized');
  }
  const token = authHeader.slice(7);
  const decoded = await adminAuth.verifyIdToken(token);
  
  // Get user record to check custom claims
  const userRecord = await adminAuth.getUser(decoded.uid);
  console.log('User Record:', {
    uid: userRecord.uid,
    email: userRecord.email,
    customClaims: userRecord.customClaims
  }); 
  
  // Check if user is in admin collection
  const role = userRecord.customClaims?.admin === true ? 'admin' : 'user';
  console.log('Determined Role:', role);
  
  return { uid: decoded.uid, role };
}

// GET /api/user/[userId]
export async function GET(
  request: NextRequest,
  context: { params: { userId: string } }
) {
  const params = await context.params;
  const userId = params.userId;
  
  let auth;
  try {
    auth = await verifyAuth(request);
    console.log('Auth result:', auth);
  } catch (error) {
    console.error('Auth error:', error);
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Regular users can only fetch their own record
  if (auth.uid !== userId && auth.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const userData = await getUserData(userId);
    return NextResponse.json({ user: userData });
  } catch {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }
}

// PUT /api/user/[userId]
export async function PUT(
  request: NextRequest,
  context: { params: { userId: string } }
) {
  const params = await context.params;
  const userId = params.userId;
  
  let auth;
  try {
    auth = await verifyAuth(request);
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Regular users only update their own profile; admins can update anyone
  if (auth.uid !== userId && auth.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const updates = await request.json();
  if (updates.displayName) {
    try {
      await adminAuth.updateUser(userId, { displayName: updates.displayName });
    } catch (e) {
      console.error('Auth update failed:', e);
    }
  }

  // Merge updated fields into cache
  const cached = userCache.get(userId);
  if (cached) {
    userCache.set(userId, {
      data: { ...cached.data, ...updates },
      timestamp: Date.now(),
    });
  }

  return NextResponse.json({ message: 'Profile updated', user: { id: userId, ...updates } });
}

// DELETE /api/user/[userId]
export async function DELETE(
  request: NextRequest,
  context: { params: { userId: string } }
) {
  const params = await context.params;
  const userId = params.userId;
  
  let auth;
  try {
    auth = await verifyAuth(request);
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Only admins can delete users
  if (auth.role !== 'admin') {
    return NextResponse.json({ error: 'Admin required' }, { status: 403 });
  }

  try {
    await adminAuth.deleteUser(userId);
    userCache.delete(userId);
    return NextResponse.json({ message: 'User deleted' });
  } catch (e) {
    console.error('Delete user failed:', e);
    return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 });
  }
}