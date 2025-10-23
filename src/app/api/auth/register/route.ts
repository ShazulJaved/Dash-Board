import { NextResponse } from "next/server";
import { fetchSignInMethodsForEmail } from "firebase/auth";
import { auth as clientAuth } from "@/lib/firebase/firebase";
import { auth as adminAuth, db } from "@/lib/firebase/admin";
import { FieldValue } from 'firebase-admin/firestore';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { email, password, displayName, department, position } = body;

        // Check for required fields
        if (!email || !password || !displayName || !department || !position) {
            return NextResponse.json(
                { message: "Missing required fields" },
                { status: 400 }
            );
        }

        // Check if email exists first
        const signInMethods = await fetchSignInMethodsForEmail(clientAuth, email);
        if (signInMethods.length > 0) {
            return NextResponse.json(
                { message: "Email already registered" },
                { status: 409 }
            );
        }

        // Create user using Admin SDK
        const userRecord = await adminAuth.createUser({
            email,
            password,
            displayName
        });

        // Create user profile in Firestore using Admin SDK
        await db.collection('users').doc(userRecord.uid).set({
            uid: userRecord.uid,
            email,
            displayName,
            department,
            position,
            role: 'user',
            status: 'pending',
            joinDate: FieldValue.serverTimestamp(),
            createdAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp()
        });

        // Initialize leave balance
        await db.collection('leaveBalances').doc(userRecord.uid).set({
            userId: userRecord.uid,
            sickLeave: 7,
            annualLeave: 12,
            emergencyLeave: 3,
            updatedAt: FieldValue.serverTimestamp()
        });

        return NextResponse.json(
            {
                message: "User registered successfully",
                uid: userRecord.uid
            },
            { status: 201 }
        );

    } catch (error: any) {
        console.error("Registration error:", error);

        // Handle specific Firebase Auth errors
        switch (error.code) {
            case 'auth/email-already-exists':
                return NextResponse.json(
                    { message: "Email already registered" },
                    { status: 409 }
                );
            case 'auth/invalid-email':
                return NextResponse.json(
                    { message: "Invalid email format" },
                    { status: 400 }
                );
            case 'auth/invalid-password':
                return NextResponse.json(
                    { message: "Password should be at least 6 characters" },
                    { status: 400 }
                );
            default:
                return NextResponse.json(
                    { message: "Registration failed", error: error.message },
                    { status: 500 }
                );
        }
    }
}