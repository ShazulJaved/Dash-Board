import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { validateCSRFToken } from '@/utils/csrf';

export function middleware(request: NextRequest) {
    // Skip CSRF check for non-mutating methods
    if (['GET', 'HEAD', 'OPTIONS'].includes(request.method)) {
        return NextResponse.next();
    }

    // Skip CSRF check for authentication routes
    if (request.nextUrl.pathname.startsWith('/api/auth')) {
        return NextResponse.next();
    }

    const csrfToken = request.headers.get('X-CSRF-Token');
    const storedToken = request.cookies.get('csrfToken')?.value;

    if (!validateCSRFToken(csrfToken!, storedToken!)) {
        return NextResponse.json(
            { message: 'Invalid CSRF token' },
            { status: 403 }
        );
    }

    return NextResponse.next();
}

export const config = {
    matcher: '/api/:path*',
}