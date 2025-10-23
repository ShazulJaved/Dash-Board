"use client";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Menu, User2 } from "lucide-react";
import Link from "next/link";
import { useState, useEffect } from "react";
import {
  LogOut,
  Users,
  Clock3,
  Shield,
  BarChart,
  UserCircle,
  Loader2,
} from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { auth } from "@/lib/firebase/firebase";
import { signOut } from "firebase/auth";
import { useToast } from "@/components/ui/use-toast";
import { useAuthState } from 'react-firebase-hooks/auth';
import { setUserOffline } from '@/lib/firebase/presence';

export function Sidebar() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { toast } = useToast();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [user] = useAuthState(auth);
  const [mounted, setMounted] = useState(false);

  // Only render after client-side hydration
  useEffect(() => {
    setMounted(true);
  }, []);

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);
      
      // Set user status to inactive before signing out
      if (user) {
        await setUserOffline(user.uid);
      }
      
      // Sign out from Firebase
      await signOut(auth);
      
      // Clear any session cookies by calling your API
      try {
        await fetch('/api/auth/signout', {
          method: 'POST',
        });
      } catch (error) {
        console.error('Error clearing session:', error);
      }
      
      // Show success message
      toast({
        title: "Logged out",
        description: "You have been successfully logged out",
      });
      
      // Redirect to sign-in page
      router.push('/auth/sign-in');
      
    } catch (error) {
      console.error('Logout error:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to log out. Please try again.",
      });
    } finally {
      setIsLoggingOut(false);
    }
  };

  if (!mounted) {
    return null; // Return nothing during server-side rendering
  }

  return (
    <div
      suppressHydrationWarning
      className={`flex flex-col h-screen bg-gray-800 text-white border-r border-gray-700 transition-all duration-300 ${
        isCollapsed ? "w-20" : "w-64"
      }`}
    >
      {/* Header section */}
      <div suppressHydrationWarning className="p-4 flex items-center justify-between border-b border-gray-700">
        <Link
          href="/admin/dashboard"
          className="flex items-center hover:text-blue-300 transition-colors"
        >
          {!isCollapsed && <User2 className="w-8 h-8 mr-2 text-gray-300" />}
          <h1 className={`text-xl font-bold ${isCollapsed ? "hidden" : ""}`}>
            Admin Panel
          </h1>
        </Link>
        <button
          className="p-2 rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500"
          onClick={() => setIsCollapsed(!isCollapsed)}
        >
          <Menu className="w-6 h-6 text-gray-300" />
        </button>
      </div>

      {/* Navigation section */}
      <nav className="flex flex-col flex-grow space-y-2 p-4">
        <Link
          href="/admin/profile"
          className={cn(
            "flex items-center gap-2 rounded-md px-3 py-2 text-gray-300 hover:bg-gray-700 transition-colors duration-200",
            pathname === "/admin/profile" ? "bg-gray-700" : ""
          )}
        >
          <UserCircle className="w-4 h-4 text-gray-400" />
          {!isCollapsed && <span className="text-sm">My Profile</span>}
        </Link>

        <Link
          href="/admin/employees"
          className={cn(
            "flex items-center gap-2 rounded-md px-3 py-2 text-gray-300 hover:bg-gray-700 transition-colors duration-200",
            pathname === "/admin/employees" ? "bg-gray-700" : ""
          )}
        >
          <Users className="w-4 h-4 text-gray-400" />
          {!isCollapsed && (
            <span className="text-sm">Employees Registered</span>
          )}
        </Link>

        <Link
          href="/admin/role-management"
          className={cn(
            "flex items-center gap-2 rounded-md px-3 py-2 text-gray-300 hover:bg-gray-700 transition-colors duration-200",
            pathname === "/admin/role-management" ? "bg-gray-700" : ""
          )}
        >
          <Shield className="w-4 h-4 text-gray-400" />
          {!isCollapsed && <span className="text-sm">Role Management</span>}
        </Link>

        <Link
          href="/admin/reports"
          className={cn(
            "flex items-center gap-2 rounded-md px-3 py-2 text-gray-300 hover:bg-gray-700 transition-colors duration-200",
            pathname === "/admin/reports" ? "bg-gray-700" : ""
          )}
        >
          <BarChart className="w-4 h-4 text-gray-400" />
          {!isCollapsed && <span className="text-sm">Attendance Reports</span>}
        </Link>

        {/* Logout section */}
        <div suppressHydrationWarning className="mt-auto">
          <button
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="w-full p-2 rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 flex items-center gap-2"
          >
            {isLoggingOut ? (
              <Loader2 className="w-4 h-4 text-gray-400 animate-spin" />
            ) : (
              <LogOut className="w-4 h-4 text-gray-400" />
            )}
            {!isCollapsed && (
              <span className="text-sm">
                {isLoggingOut ? "Logging out..." : "Logout"}
              </span>
            )}
          </button>
        </div>
      </nav>
    </div>
  );
}
