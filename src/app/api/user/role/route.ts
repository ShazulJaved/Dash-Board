import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { auth as adminAuth, db } from '@/lib/firebase/admin';

export async function PATCH(
  req: Request,
  { params }: { params: { userId: string } }
) {
  try {
    await Promise.resolve(); // Ensures params are awaited
    // Verify authentication
    const cookieStore =await cookies();
    const sessionCookie = cookieStore.get('session')?.value;

    if (!sessionCookie) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Verify session and admin status
    const decodedClaims = await adminAuth.verifySessionCookie(sessionCookie, true);
    const adminDoc = await db.collection('users').doc(decodedClaims.uid).get();
    
    if (!adminDoc.exists || adminDoc.data()?.role !== 'admin') {
      return NextResponse.json(
        { error: "Only admins can update roles" },
        { status: 403 }
      );
    }

    const { role } = await req.json();

    // Validate role
    const validRoles = ['user', 'admin'];
    if (!role || !validRoles.includes(role)) {
      return NextResponse.json(
        { error: "Invalid role. Must be 'user' or 'admin'" },
        { status: 400 }
      );
    }

    // Get user document
    const userDoc = await db.collection('users').doc(params.userId).get();
    
    if (!userDoc.exists) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // Update user role
    await db.collection('users').doc(params.userId).update({
      role,
      updatedAt: new Date(),
      updatedBy: decodedClaims.uid
    });

    return NextResponse.json({
      message: "Role updated successfully",
      userId: params.userId,
      role
    });

  } catch (error: any) {
    console.error('Role update error:', error);
    return NextResponse.json(
      { error: error.message || "Failed to update role" },
      { status: 500 }
    );
  }
}