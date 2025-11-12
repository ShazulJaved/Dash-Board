import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { generateCSRFToken } from '@/utils/csrf';

export async function GET() {
  const csrfToken = generateCSRFToken();
  const cookieStore = await cookies();
  
  // Set CSRF token in a cookie
  cookieStore.set('csrf-token', csrfToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: 60 * 10, // 10 minutes
  });

  return NextResponse.json({ csrfToken });
}