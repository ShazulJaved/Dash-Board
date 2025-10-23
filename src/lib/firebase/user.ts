import {
    User,
    updateProfile,
    updatePassword,
    EmailAuthProvider,
    reauthenticateWithCredential
} from 'firebase/auth';
import { doc, updateDoc } from 'firebase/firestore';
import { auth, db } from './firebase';

interface ProfileUpdate {
    displayName?: string;
    phoneNumber?: string;
    currentPassword?: string;
    newPassword?: string;
}

export async function updateUserProfile(userId: string, data: ProfileUpdate) {
    const user = auth.currentUser;
    if (!user) throw new Error('No user logged in');

    try {
        const updates: any = {};

        // Update display name in Firebase Auth
        if (data.displayName) {
            await updateProfile(user, {
                displayName: data.displayName
            });
            updates.displayName = data.displayName;
        }

        // Update phone number in Firestore
        if (data.phoneNumber) {
            updates.phoneNumber = data.phoneNumber;
        }

        // Update password if provided
        if (data.currentPassword && data.newPassword) {
            const credential = EmailAuthProvider.credential(
                user.email!,
                data.currentPassword
            );

            // Re-authenticate user before password change
            await reauthenticateWithCredential(user, credential);
            await updatePassword(user, data.newPassword);
        }

        // Update Firestore user document
        if (Object.keys(updates).length > 0) {
            updates.updatedAt = new Date();
            const userRef = doc(db, 'users', userId);
            await updateDoc(userRef, updates);
        }

        return true;
    } catch (error: any) {
        console.error('Error updating profile:', error);
        throw new Error(error.message);
    }
}

export async function updateUserRole(userId: string, role: 'user' | 'admin'): Promise<void> {
    try {
        const response = await fetch(`/api/user/${userId}/role`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify({ role })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Failed to update role');
        }

    } catch (error) {
        console.error('Update role error:', error);
        throw error;
    }
}