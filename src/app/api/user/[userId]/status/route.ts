// src/app/api/user/status/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { auth as adminAuth, db } from '@/lib/firebase/admin';

export async function POST(request: NextRequest) {
  try {
    const { userId, status } = await request.json();
    
    // Update user status in Firestore
    await db.collection('users').doc(userId).update({
      status,
      lastActive: new Date(),
      updatedAt: new Date()
    });
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating status:', error);
    return NextResponse.json(
      { error: 'Failed to update status' },
      { status: 500 }
    );
  }
}
