// app/api/auth/verify-session/route.ts
import { NextResponse } from 'next/server';
import { verifySessionCookie } from '@/lib/firebase/auth';

export async function POST(request: Request) {
  const session = request.headers.get('Cookie')?.split('session=')[1]?.split(';')[0];
  
  if (!session) {
    return NextResponse.json(
      { error: 'No session provided' },
      { status: 401 }
    );
  }

  try {
    const decodedClaims = await verifySessionCookie(session);
    return NextResponse.json({ valid: true, user: decodedClaims });
  } catch (error) {
    return NextResponse.json(
      { error: 'Invalid session' },
      { status: 401 }
    );
  }
}