// src/app/api/admin/users/[uid]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { auth, db } from '@/lib/firebase/admin';

// Add this GET method to your existing route file
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ uid: string }> }
) {
  try {
    const { uid } = await params;
    
    // Verify authentication
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await auth.verifyIdToken(token);
    
    // Check if user is admin
    const adminDoc = await db.collection('users').doc(decodedToken.uid).get();
    const adminData = adminDoc.data();
    
    if (!adminData || adminData.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get user details
    const userDoc = await db.collection('users').doc(uid).get();
    
    if (!userDoc.exists) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    const userData = userDoc.data();
    
    // Return user data
    return NextResponse.json({ 
      user: {
        uid: userDoc.id,
        ...userData,
        // Ensure these fields are included even if null/undefined
        displayName: userData?.displayName || '',
        email: userData?.email || '',
        phoneNumber: userData?.phoneNumber || '',
        department: userData?.department || '',
        position: userData?.position || '',
        role: userData?.role || 'user',
        status: userData?.status || 'inactive',
        dateOfBirth: userData?.dateOfBirth || '',
        dateOfJoining: userData?.dateOfJoining || '',
        photoURL: userData?.photoURL || '',
        reportingManager: userData?.reportingManager || '',
        reportingManagerId: userData?.reportingManagerId || '',
        officeLocation: userData?.officeLocation || '',
        homeLocation: userData?.homeLocation || '',
        seatingLocation: userData?.seatingLocation || '',
        extensionNumber: userData?.extensionNumber || '',
        designation: userData?.designation || '',
        employeeType: userData?.employeeType || '',
        education: userData?.education || [],
        experience: userData?.experience || [],
        skills: userData?.skills || [],
        dependents: userData?.dependents || []
      }
    });
  } catch (error) {
    console.error('Error fetching user details:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ uid: string }> }
) {
  try {
    const { uid } = await params;
    
    // Verify authentication
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await auth.verifyIdToken(token);
    
    // Check if user is admin
    const adminDoc = await db.collection('users').doc(decodedToken.uid).get();
    const adminData = adminDoc.data();
    
    if (!adminData || adminData.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get request body
    const updates = await request.json();
    
    // Prepare update object
    const updateData: Record<string, any> = {
      updatedAt: new Date()
    };
    
    // Only include fields that are provided
    if (updates.displayName) updateData.displayName = updates.displayName;
    if (updates.department) updateData.department = updates.department;
    if (updates.position) updateData.position = updates.position;
    
    // Update user in Firestore
    await db.collection('users').doc(uid).update(updateData);
    
    // If email is being updated, update in Auth as well
    if (updates.email) {
      await auth.updateUser(uid, { email: updates.email });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating user:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}


export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ uid: string }> }
) {
  try {
    const { uid } = await params;
    
    // Verify authentication
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await auth.verifyIdToken(token);
    
    // Check if user is admin
    const adminDoc = await db.collection('users').doc(decodedToken.uid).get();
    const adminData = adminDoc.data();
    
    if (!adminData || adminData.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Check if trying to delete self
    if (uid === decodedToken.uid) {
      return NextResponse.json({ error: 'Cannot delete your own account' }, { status: 400 });
    }

    // Delete user from Firestore
    await db.collection('users').doc(uid).delete();
    
    // Try to delete user from Firebase Auth
    try {
      await auth.deleteUser(uid);
    } catch (authError) {
      console.error('Error deleting user from Auth:', authError);
      // Continue even if Auth deletion fails, as we've already deleted from Firestore
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting user:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
