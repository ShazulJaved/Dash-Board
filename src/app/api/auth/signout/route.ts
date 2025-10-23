import { NextResponse } from 'next/server';
import { auth } from '@/lib/firebase/firebase';
import { cookies } from 'next/headers';

export async function POST() {
    try {
        const cookieStore = await cookies();
        cookieStore.delete('session');
        cookieStore.delete('uid');

        return NextResponse.json({
            message: 'Successfully signed out'
        });
    } catch (error) {
        console.error('Sign-out error:', error);
        return NextResponse.json(
            { error: 'Failed to sign out' },
            { status: 500 }
        );
    }
}