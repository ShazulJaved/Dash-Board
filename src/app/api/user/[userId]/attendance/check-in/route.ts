import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { auth as adminAuth, db } from '@/lib/firebase/admin';
import { Timestamp } from 'firebase-admin/firestore';

// Change the export style to use named export with const
export const POST = async (
    request: NextRequest,
    { params }: { params: { userId: string } }
) => {
    try {
        // Remove this line as it might be causing issues
        // await Promise.resolve();
        
        const userId = params.userId;

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
            console.log('UID mismatch:', { 
                tokenUid: decodedToken.uid, 
                requestedUid: userId 
            });
            return NextResponse.json(
                { error: "Invalid user ID" },
                { status: 403 }
            );
        }

        // Check for existing attendance
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const existingAttendance = await db.collection('attendance')
            .where('userId', '==', userId)
            .where('date', '>=', Timestamp.fromDate(today))
            .get();

        if (!existingAttendance.empty) {
            return NextResponse.json(
                { error: "Already checked in today" },
                { status: 400 }
            );
        }

        // Create attendance record
        const now = new Date();
        const attendanceDoc = await db.collection('attendance').add({
            userId,
            date: Timestamp.fromDate(now),
            checkIn: now.toLocaleTimeString(),
            status: now.getHours() >= 9 ? 'Late' : 'Present',
            createdAt: Timestamp.fromDate(now),
            updatedAt: Timestamp.fromDate(now)
        });

        return NextResponse.json({
            attendanceId: attendanceDoc.id,
            message: "Checked in successfully"
        });

    } catch (error: any) {
        console.error('Check-in error:', error);
        return NextResponse.json(
            { error: error.message || "Failed to check in" },
            { status: 500 }
        );
    }
};
