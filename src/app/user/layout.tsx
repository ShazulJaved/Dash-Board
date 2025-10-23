'use client';

import { UserSidebar } from "@/components/user-sidebar";
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '@/lib/firebase/firebase';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Toaster } from "@/components/ui/toaster";
import { Skeleton } from "@/components/ui/skeleton";

export default function UserLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [user, loading, error] = useAuthState(auth);
  const [verifying, setVerifying] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    async function verifySession() {
      try {
        const response = await fetch('/api/auth/verify', {
          method: 'GET',
          credentials: 'include',
        });

        if (!response.ok) {
          throw new Error('Session verification failed');
        }

        const { role } = await response.json();
        
        // If user is admin but on user route, redirect
        if (role === 'admin' && pathname.startsWith('/user')) {
          router.push('/admin/dashboard');
          return;
        }
        
        setVerifying(false);
      } catch (err) {
        console.error('Session verification error:', err);
        if (!pathname.startsWith('/auth')) {
          router.push('/auth/sign-in');
        }
      }
    }

    if (!loading && user) {
      verifySession();
    } else if (!loading && !user && !pathname.startsWith('/auth')) {
      router.push('/auth/sign-in');
    }
  }, [user, loading, router, pathname]);

  if (loading || verifying) {
    return (
      <div className="flex h-screen">
        <Skeleton className="w-64 h-full" />
        <div className="flex-1 p-8">
          <div className="space-y-4">
            <Skeleton className="h-12 w-64" />
            <Skeleton className="h-6 w-96" />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center text-red-500">
          <p>Error: {error.message}</p>
          <button 
            onClick={() => router.push('/auth/sign-in')}
            className="mt-4 text-blue-500 hover:underline"
          >
            Go to Sign In
          </button>
        </div>
      </div>
    );
  }

  if (!user) {
    return null; // Will redirect to sign-in from useEffect
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <UserSidebar />
      <main className="flex-1 overflow-auto bg-gray-50">
        {children}
      </main>
      <Toaster />
    </div>
  );
}