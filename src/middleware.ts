// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  const session = request.cookies.get('session');
  
  // Check if this is an API route
  if (request.nextUrl.pathname.startsWith('/api/')) {
    return NextResponse.next();
  }

  // Paths that don't require authentication
  const publicPaths = ['/auth/sign-in', '/auth/sign-up', '/auth/reset-password'];
  const isPublicPath = publicPaths.some(path => 
    request.nextUrl.pathname === path || request.nextUrl.pathname.startsWith(`${path}/`)
  );
  
  // If no session and trying to access protected route, redirect to sign-in
  if (!session && !isPublicPath) {
    const signInUrl = new URL('/auth/sign-in', request.url);
    return NextResponse.redirect(signInUrl);
  }

  // If user is authenticated and tries to access auth pages, redirect to dashboard
  if (session && isPublicPath) {
    const dashboardUrl = new URL('/user/dashboard', request.url);
    return NextResponse.redirect(dashboardUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};