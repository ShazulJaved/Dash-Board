import { NextResponse } from "next/server";
import { auth } from '@/lib/firebase/firebase';
import {
    EmailAuthProvider,
    reauthenticateWithCredential,
    updatePassword
} from 'firebase/auth';

export async function POST(req: Request) {
    try {
        const { currentPassword, newPassword } = await req.json();
        const user = auth.currentUser;

        if (!user || !user.email) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Create credentials with email and current password
        const credential = EmailAuthProvider.credential(user.email, currentPassword);

        // Re-authenticate user
        await reauthenticateWithCredential(user, credential);

        // Verify new password is different
        if (currentPassword === newPassword) {
            return NextResponse.json(
                { error: "New password cannot be the same as current password" },
                { status: 400 }
            );
        }

        // Update password
        await updatePassword(user, newPassword);

        return NextResponse.json({ message: "Password updated successfully" });
    } catch (error: any) {
        console.error('Password update error:', error);
        return NextResponse.json(
            { error: error.message || "Failed to update password" },
            { status: 500 }
        );
    }
}