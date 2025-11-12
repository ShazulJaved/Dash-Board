"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth, db } from "@/lib/firebase/firebase";
import { signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/ui/use-toast";
import {
  Clock,
  LogOut,
  Home,
  Calendar,
  Menu,
  UserCircle,
  AlertCircle,
  Loader2,
  NotepadText,
  Bell ,
  
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { setUserOffline } from "@/lib/firebase/presence";


// Define interfaces for type safety
interface UserData {
  displayName: string;
  email: string;
  photoURL?: string;
  role: string;
  status?: string;
}

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

export function UserSidebar() {
  // State management
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [userName, setUserName] = useState<string>("User");

  // Hooks
  const [user, authLoading] = useAuthState(auth);
  const pathname = usePathname();
  const router = useRouter();
  const { toast } = useToast();

  // Navigation items
  const navItems: NavItem[] = [
    {
      href: "/user/dashboard",
      label: "Dashboard",
      icon: Home,
    },
    {
      href: "/user/profile",
      label: "Profile",
      icon: UserCircle,
    },
    {
      href: "/user/attendance",
      label: "Attendance",
      icon: Clock,
    },
    {
      href: "/user/leave-requests",
      label: "Appeal Requests",
      icon: Calendar,
    },
    {
      href: "/user/NotesPage",
      label: "Notes",
      icon: NotepadText,
    },
    {
      href: "/user/announcements",
      label: "Notifications",
      icon: Bell  ,
    },
  ];

  // Fetch user data directly from Firestore
  useEffect(() => {
    const fetchUserData = async () => {
      if (!user) return;

      try {
        setIsLoading(true);
        
        // Direct Firestore access for faster name retrieval
        const userDocRef = doc(db, 'users', user.uid);
        const userDocSnap = await getDoc(userDocRef);
        
        if (userDocSnap.exists()) {
          const data = userDocSnap.data();
          setUserName(data.displayName || user.email?.split('@')[0] || 'User');
          setUserData(data as UserData);
        } else {
          setUserName(user.email?.split('@')[0] || 'User');
          
          // Fallback to API if needed
          const idToken = await user.getIdToken();
          const response = await fetch(`/api/user/${user.uid}`, {
            method: "GET",
            headers: {
              Authorization: `Bearer ${idToken}`,
              "Content-Type": "application/json",
            },
          });
      
          if (response.ok) {
            const data = await response.json();
            setUserData(data.user);
            if (data.user?.displayName) {
              setUserName(data.user.displayName);
            }
          }
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
        setUserName(user.email?.split('@')[0] || 'User');
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserData();
  }, [user]);

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
        await fetch("/api/auth/signout", {
          method: "POST",
        });
      } catch (error) {
        console.error("Error clearing session:", error);
      }

      // Show success message
      toast({
        title: "Logged out",
        description: "You have been successfully logged out",
      });

      // Redirect to sign-in page
      router.push("/auth/sign-in");
    } catch (error) {
      console.error("Logout error:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to log out. Please try again.",
      });
    } finally {
      setIsLoggingOut(false);
    }
  };

  // Loading state
  if (authLoading || isLoading) {
    return (
      <div className="flex flex-col h-screen bg-gray-800 w-64 animate-pulse">
        <div className="p-4">
          <div className="h-8 w-8 rounded-full bg-gray-700" />
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex flex-col h-screen bg-gray-800 w-64 p-4">
        <div className="flex items-center space-x-2 text-red-400">
          <AlertCircle className="h-5 w-5" />
          <span className="text-sm">Error loading sidebar</span>
        </div>
      </div>
    );
  }

  // Not authenticated
  if (!user) {
    router.push("/auth/sign-in");
    return null;
  }

  return (
    <div
      className={cn(
        "flex flex-col h-screen text-black  transition-all duration-300",
        isCollapsed ? "w-20" : "w-64"
      )}
      style={{ background: "white" }}
    >
      {/* Header section */}
      <div className="p-4 flex items-center justify-between ">
        <div className="flex items-center space-x-3">
          <Avatar className="h-8 w-8">
            <AvatarImage src={userData?.photoURL} alt={userName} />
            <AvatarFallback>
              {userName.charAt(0) || "?"}
            </AvatarFallback>
          </Avatar>
          {!isCollapsed && (
            <div className="flex flex-col">
              <h1 className="text-sm font-semibold truncate">
                {userName}
              </h1>
              <p className="text-xs text-gray-400 truncate">
                {userData?.status || "Online"}
              </p>
            </div>
          )}
        </div>
        <button
          className="p-2 rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500"
          onClick={() => setIsCollapsed(!isCollapsed)}
          aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          <Menu className="w-6 h-6 text-black" />
        </button>
      </div>

      {/* Navigation section */}
      <nav className="flex flex-col flex-grow space-y-2 p-4">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-2 rounded-md px-3 py-2 text-blue-900 hover:bg-gray-400 transition-colors duration-200",
              pathname === item.href && "bg-white text-blue"
            )}
          >
            <item.icon className="w-4 h-4 text-blue-900" />
            {!isCollapsed && <span className="text-sm">{item.label}</span>}
          </Link>
        ))}

        {/* Logout section */}
        <div className="mt-auto">
          <button
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="w-full p-2 rounded-md hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500 flex items-center gap-2"
          >
            {isLoggingOut ? (
              <Loader2 className="w-4 h-4 text-blue-900 animate-spin" />
            ) : (
              <LogOut className="w-4 h-4 text-blue-900" />
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
