import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { auth as adminAuth, db } from '@/lib/firebase/admin';

export async function POST(req: Request) {
    try {
        // Verify authentication
        const cookieStore = await cookies();
        const sessionCookie = cookieStore.get('session')?.value;

        if (!sessionCookie) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 }
            );
        }

        // Verify the session cookie
        const decodedClaims = await adminAuth.verifySessionCookie(sessionCookie, true);
        const profileData = await req.json();

        // Create an update object with only defined values
        const updateData: Record<string, any> = {
            updatedAt: new Date()
        };
        
        // Basic Information fields
        if (profileData.displayName !== undefined) updateData.displayName = profileData.displayName;
        if (profileData.phoneNumber !== undefined) updateData.phoneNumber = profileData.phoneNumber;
        if (profileData.dateOfBirth !== undefined) updateData.dateOfBirth = profileData.dateOfBirth;
        if (profileData.dateOfJoining !== undefined) updateData.dateOfJoining = profileData.dateOfJoining;
        
        // Additional Information fields
        if (profileData.reportingManager !== undefined) updateData.reportingManager = profileData.reportingManager;
        if (profileData.reportingManagerId !== undefined) updateData.reportingManagerId = profileData.reportingManagerId;
        if (profileData.designation !== undefined) updateData.designation = profileData.designation;
        if (profileData.department !== undefined) updateData.department = profileData.department;
        if (profileData.position !== undefined) updateData.position = profileData.position;
        
        // Location Information fields
        if (profileData.officeLocation !== undefined) updateData.officeLocation = profileData.officeLocation;
        if (profileData.homeLocation !== undefined) updateData.homeLocation = profileData.homeLocation;
        if (profileData.seatingLocation !== undefined) updateData.seatingLocation = profileData.seatingLocation;
        if (profileData.extensionNumber !== undefined) updateData.extensionNumber = profileData.extensionNumber;
        
        // Employment Details fields
        if (profileData.employeeType !== undefined) updateData.employeeType = profileData.employeeType;
        
        // Additional Details fields
        if (profileData.education !== undefined) updateData.education = profileData.education;
        if (profileData.experience !== undefined) updateData.experience = profileData.experience;
        if (profileData.skills !== undefined) updateData.skills = profileData.skills;
        if (profileData.dependents !== undefined) updateData.dependents = profileData.dependents;
        
        // Update user profile in Firestore
        await db.collection('users').doc(decodedClaims.uid).update(updateData);

        // Update display name in Firebase Auth (only if defined)
        if (profileData.displayName !== undefined) {
            await adminAuth.updateUser(decodedClaims.uid, {
                displayName: profileData.displayName
            });
        }

        return NextResponse.json({
            message: "Profile updated successfully"
        });

    } catch (error: any) {
        console.error('Profile update error:', error);
        return NextResponse.json(
            { error: error.message || "Failed to update profile" },
            { status: 500 }
        );
    }
}
