'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { useToast } from "@/components/ui/use-toast";
import { auth } from '@/lib/firebase/firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';

export default function SignInPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    
    const form = e.target as HTMLFormElement;
    const email = form.email.value;
    const password = form.password.value;

    try {
      // First authenticate with Firebase client SDK
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      // Get ID token
      const idToken = await user.getIdToken(true);
      
      // Send ID token to backend to create session
      const response = await fetch('/api/auth/signin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          email, 
          password,
          idToken 
        }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Sign-in failed');
      }

      toast({
        title: "Success",
        description: `Welcome back! Logged in as ${data.role}`,
        duration: 2000,
      });

      // Redirect based on role
      const redirectPath = data.redirectTo || (data.role === 'admin' ? '/admin/dashboard' : '/user/dashboard');
      console.log('Redirecting to:', redirectPath);
      
      // Use window.location for a full page reload instead of router.push
      window.location.href = redirectPath;

    } catch (error: any) {
      console.error('Sign-in error:', error);
      
      // Handle Firebase auth errors
      let errorMessage = 'Authentication failed';
      
      if (error.code) {
        switch (error.code) {
          case 'auth/invalid-credential':
          case 'auth/invalid-login-credentials':
            errorMessage = 'Invalid email or password. Please check your credentials and try again.';
            break;
          case 'auth/user-not-found':
            errorMessage = 'No account found with this email. Please sign up first.';
            break;
          case 'auth/wrong-password':
            errorMessage = 'Incorrect password. Please try again.';
            break;
          case 'auth/too-many-requests':
            errorMessage = 'Too many failed login attempts. Please try again later or reset your password.';
            break;
          case 'auth/user-disabled':
            errorMessage = 'This account has been disabled. Please contact support.';
            break;
          default:
            errorMessage = error.message || 'Sign-in failed. Please try again.';
        }
      }
      
      toast({
        variant: 'destructive',
        title: 'Authentication Error',
        description: errorMessage
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-b from-gray-800 to-gray-900">
      <Card className="w-full max-w-md shadow-2xl bg-white border border-gray-200">
        <CardHeader className="text-center border-b border-gray-200 pb-6">
          <CardTitle className="text-2xl font-bold text-gray-800">Sign In</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5 px-8 py-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-gray-700">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="Enter your email"
                required
                className="bg-white border-gray-300 text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-gray-700">Password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="Enter your password"
                required
                className="bg-white border-gray-300 text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
            <Button
              type="submit"
              className="w-full bg-gray-700 hover:bg-gray-800 text-white"
              disabled={loading}
            >
              {loading ? 'Signing In...' : 'Sign In'}
            </Button>
          </form>
          
          <div className="text-center pt-4 border-t border-gray-200">
            <p className="text-gray-600">
              Don't have an account?{" "}
              <Button 
                variant="link" 
                className="text-yellow-800 hover:text-gray-800 p-0"
                onClick={() => router.push('/auth/sign-up')}
              >
                Sign up
              </Button>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}