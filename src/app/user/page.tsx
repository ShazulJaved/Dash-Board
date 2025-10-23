'use client';

import { useEffect, useState } from 'react';
import { auth, db } from '@/lib/firebase/firebase';
import { useAuthState } from 'react-firebase-hooks/auth';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, Clock, UserCheck } from "lucide-react";
import Link from "next/link";
import { UserSidebar } from '@/components/user-sidebar';
import { useRouter } from 'next/navigation';
import { doc, getDoc } from 'firebase/firestore';
import { useToast } from "@/components/ui/use-toast";
import { Skeleton } from "@/components/ui/skeleton";

interface UserStats {
  attendance: number;
  leaveBalance: number;
  status: 'active' | 'inactive';
}

export default function UserDashboard() {
  const [user, loading, error] = useAuthState(auth);
  const router = useRouter();
  const { toast } = useToast();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [greeting, setGreeting] = useState('');
  const [userData, setUserData] = useState<any>(null);
  const [pageLoading, setPageLoading] = useState(true);
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  // Fetch user data and verify role
  useEffect(() => {
    async function checkUserRole() {
      if (!user) return;

      try {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (!userDoc.exists()) {
          throw new Error('User profile not found');
        }

        const userData = userDoc.data();
        if (userData.role !== 'user') {
          throw new Error('Unauthorized access');
        }

        setUserData(userData);
      } catch (error) {
        console.error('Error fetching user data:', error);
        toast({
          variant: "destructive",
          title: "Error",
          description: "You don't have permission to access this page"
        });
        await auth.signOut();
        router.push('/auth/sign-in');
      } finally {
        setPageLoading(false);
      }
    }

    if (user) {
      checkUserRole();
    } else if (!loading) {
      router.push('/auth/sign-in');
    }
  }, [user, loading, router, toast]);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    const hour = new Date().getHours();
    if (hour < 12) setGreeting('Good Morning');
    else if (hour < 18) setGreeting('Good Afternoon');
    else setGreeting('Good Evening');

    return () => clearInterval(timer);
  }, []);

  // Loading state
  if (loading || pageLoading) {
    return (
      <div className="flex h-screen">
        <UserSidebar />
        <div className="flex-1 p-8">
          <div className="space-y-4 mb-12">
            <Skeleton className="h-12 w-64 mx-auto" />
            <Skeleton className="h-6 w-96 mx-auto" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </div>
          <Skeleton className="h-8 w-48 mb-6" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-40 w-full" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!user || !userStats) return null;

  // Error state
  if (error) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center text-red-500">
          <p>Error: {error.message}</p>
        </div>
      </div>
    );
  }

  // Not authenticated
  if (!user || !userData) {
    return null;
  }

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white p-8">
          {/* Welcome Header */}
          <div className="text-center space-y-4 mb-12">
            <h1 className="text-4xl font-bold text-gray-800">
              {greeting}, {user.displayName || 'User'} 👋
            </h1>
            <p className="text-gray-600 text-lg">
              {currentTime.toLocaleDateString([], { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </p>
          </div>

          {/* Quick Stats Row */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
            <div className="bg-blue-50 p-4 rounded-lg">
              <p className="text-blue-600 font-semibold">Time</p>
              <h3 className="text-2xl font-bold text-gray-800">
                {currentTime.toLocaleTimeString([], { 
                  hour: '2-digit', 
                  minute: '2-digit' 
                })}
              </h3>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <p className="text-green-600 font-semibold">Status</p>
              <h3 className="text-2xl font-bold text-gray-800 capitalize">
                {userStats.status}
              </h3>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg">
              <p className="text-purple-600 font-semibold">Attendance</p>
              <h3 className="text-2xl font-bold text-gray-800">
                {userStats.attendance}%
              </h3>
            </div>
            <div className="bg-orange-50 p-4 rounded-lg">
              <p className="text-orange-600 font-semibold">Leave Balance</p>
              <h3 className="text-2xl font-bold text-gray-800">
                {userStats.leaveBalance} Days
              </h3>
            </div>
          </div>

          {/* Quick Actions Grid */}
          <h2 className="text-2xl font-semibold text-gray-800 mb-6">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            <Link href="/user/attendance">
              <Card className="hover:shadow-lg transition-shadow cursor-pointer border-l-4 border-l-blue-500">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-lg font-medium">Attendance</CardTitle>
                  <Clock className="h-5 w-5 text-blue-500" />
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600">Track your daily attendance</p>
                  <p className="text-sm text-blue-500 mt-2 font-medium">
                    Check In/Out →
                  </p>
                </CardContent>
              </Card>
            </Link>

            <Link href="/user/leave-requests">
              <Card className="hover:shadow-lg transition-shadow cursor-pointer border-l-4 border-l-green-500">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-lg font-medium">Leave Requests</CardTitle>
                  <Calendar className="h-5 w-5 text-green-500" />
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600">Manage your leaves</p>
                  <p className="text-sm text-green-500 mt-2 font-medium">
                    Request Leave →
                  </p>
                </CardContent>
              </Card>
            </Link>

            <Link href="/user/profile">
              <Card className="hover:shadow-lg transition-shadow cursor-pointer border-l-4 border-l-purple-500">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-lg font-medium">Your Profile</CardTitle>
                  <UserCheck className="h-5 w-5 text-purple-500" />
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600">Update your information</p>
                  <p className="text-sm text-purple-500 mt-2 font-medium">
                    View Profile →
                  </p>
                </CardContent>
              </Card>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}