import { NextRequest, NextResponse } from 'next/server';
import { auth as adminAuth, db } from '@/lib/firebase/admin';
import { Timestamp } from 'firebase-admin/firestore';

export async function POST(
    request: NextRequest,
    context: { params: { userId: string } }
) {
    try {
        const userId = context.params.userId;

        // Get authorization token
        const authHeader = request.headers.get('Authorization');
        if (!authHeader?.startsWith('Bearer ')) {
            return NextResponse.json(
                { error: "Missing authorization token" },
                { status: 401 }
            );
        }

        // Verify Firebase ID token
        const idToken = authHeader.split('Bearer ')[1];
        const decodedToken = await adminAuth.verifyIdToken(idToken);

        // Check if token belongs to the requested user
        if (decodedToken.uid !== userId) {
            return NextResponse.json(
                { error: "Invalid user ID" },
                { status: 403 }
            );
        }

        const body = await request.json();
        const { attendanceId } = body;

        if (!attendanceId) {
            return NextResponse.json(
                { error: 'Attendance ID is required' },
                { status: 400 }
            );
        }

        // Verify the attendance record belongs to the user
        const attendanceDoc = await db.collection('attendance').doc(attendanceId).get();
        
        if (!attendanceDoc.exists) {
            return NextResponse.json(
                { error: 'Attendance record not found' },
                { status: 404 }
            );
        }

        const attendanceData = attendanceDoc.data();
        if (attendanceData?.userId !== userId) {
            return NextResponse.json(
                { error: 'Unauthorized to modify this attendance record' },
                { status: 403 }
            );
        }

        if (attendanceData?.checkOut) {
            return NextResponse.json(
                { error: 'Already checked out' },
                { status: 400 }
            );
        }

        // Update the attendance record
        const now = new Date();
        await db.collection('attendance').doc(attendanceId).update({
            checkOut: now.toLocaleTimeString(),
            updatedAt: Timestamp.fromDate(now)
        });

        return NextResponse.json({
            message: 'Successfully checked out',
            checkOut: now.toLocaleTimeString()
        });

    } catch (error: any) {
        console.error('Check-out error:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to check out' },
            { status: 500 }
        );
    }
}