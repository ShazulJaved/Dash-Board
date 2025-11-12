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
  Megaphone,
} from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { auth } from "@/lib/firebase/firebase";
import { signOut } from "firebase/auth";
import { useToast } from "@/components/ui/use-toast";
import { useAuthState } from 'react-firebase-hooks/auth';
import { setUserOffline } from '@/lib/firebase/presence';
import { Card } from "./ui/card";



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
      className={`flex flex-col  h-screen  border-l-4 text-white shadow-box-lg pl-4 transition-all duration-300 ${isCollapsed ? "w-20" : "w-64"
        }`}>
    
      {/* Header section */}
      <div suppressHydrationWarning className="p-4 flex items-center justify-between">
        <Link
          href="/admin/dashboard"
          className="flex items-center hover:text-black transition-colors"
        >
          {!isCollapsed && <User2 className="w-8 h-8 mr-2 text-white" />}
          <h1 className={`text-xl text-black font-bold ${isCollapsed ? "hidden" : ""}`}>
            Admin Panel
          </h1>
        </Link>
        <button
          className="p-2 rounded-md hover:bg-white focus:outline-none focus:ring-2 focus:ring-teal-100"
          onClick={() => setIsCollapsed(!isCollapsed)}
        >
          <Menu className="w-6 h-6 text-black" />
        </button>
      </div>

      {/* Navigation section */}
      <nav className="flex flex-col flex-grow space-y-2 p-4">
        <Link
          href="/admin/profile"
          className={cn(
            "flex items-center gap-2 rounded-md px-3 py-2 text-black hover:bg-purple-200 transition-colors duration-200",
            pathname === "/admin/profile" ? "bg-purple-200" : ""
          )}
        >
          <UserCircle className="w-4 h-4 text-black" />
          {!isCollapsed && <span className="text-sm text-black">My Profile</span>}
        </Link>

        <Link
          href="/admin/employees"
          className={cn(
            "flex items-center gap-2 rounded-md px-3 py-2 text-black hover:bg-purple-200 transition-colors duration-200",
            pathname === "/admin/employees" ? "bg-purple-200 " : ""
          )}
        >
          <Users className="w-4 h-4 text-black" />
          {!isCollapsed && 
            <span className="text-sm text-black">Employees Registered</span>
          }
        </Link>

        <Link
          href="/admin/role-management"
          className={cn(
            "flex items-center gap-2 rounded-md px-3 py-2 text-black hover:bg-purple-200 transition-colors duration-200",
            pathname === "/admin/role-management" ? "bg-purple-200" : ""
          )}
        >
          <Shield className="w-4 h-4 text-blak" />
          {!isCollapsed && <span className="text-sm text-black">Role Management</span>}
        </Link>

        <Link
          href="/admin/reports"
          className={cn(
            "flex items-center gap-2 rounded-md px-3 py-2 text-black hover:bg-purple-200 transition-colors duration-200",
            pathname === "/admin/reports" ? "bg-purple-200" : ""
          )}
        >
          <BarChart className="w-4 h-4 text-black" />
          {!isCollapsed && <span className="text-sm">Attendance Reports</span>}
        </Link>

        <Link
          href="/admin/announcements"
          className={cn(
            "flex items-center gap-2 rounded-md px-3 py-2 text-black hover:bg-purple-200 transition-colors duration-200",
            pathname === "/admin/announcements" ? "bg-purple-200" : ""
          )}
        >
          <Megaphone className="w-4 h-4 text-black" />
          {!isCollapsed && <span className="text-sm">Announcements</span>}
        </Link>

        {/* Logout section */}
        <div suppressHydrationWarning className="mt-auto">
          <button
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="w-full p-2 rounded-md hover:bg-purple-200 focus:outline-none focus:ring-2 focus:ring-gray-500 flex items-center gap-2"
          >
            {isLoggingOut ? (
              <Loader2 className="w-4 h-4 text-black animate-spin" />
            ) : (
              <LogOut className="w-4 h-4 text-black" />
            )}
            {!isCollapsed && (
              <span className="text-sm text-black">
                {isLoggingOut ? "Logging out..." : "Logout"}
              </span>
            )}
          </button>
        </div>
      </nav>
    </div>
    
   
  );
}
