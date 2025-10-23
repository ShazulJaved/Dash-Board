import { useState, useEffect } from 'react';
import { auth } from '@/lib/firebase/firebase';
import { useRouter } from 'next/navigation';

export function useAuth() {
    const [csrfToken, setCsrfToken] = useState<string | null>(null);
    const router = useRouter();

    const signIn = async (email: string, password: string) => {
        try {
            const response = await fetch('/api/auth/signin', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email, password }),
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.message);

            // Store CSRF token in memory
            setCsrfToken(data.csrfToken);

            return data.user;
        } catch (error) {
            throw error;
        }
    };

    const makeAuthenticatedRequest = async (url: string, options: RequestInit = {}) => {
        if (!csrfToken) {
            throw new Error('No CSRF token available');
        }

        const headers = new Headers(options.headers);
        headers.set('X-CSRF-Token', csrfToken);

        const response = await fetch(url, {
            ...options,
            headers,
        });

        if (response.status === 403) {
            // CSRF token expired or invalid
            router.push('/auth/sign-in');
            return null;
        }

        return response;
    };

    return {
        signIn,
        makeAuthenticatedRequest,
        csrfToken,
    };
}