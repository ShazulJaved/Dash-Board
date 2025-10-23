'use client';

import { useEffect, useState, useRef } from 'react';
import { auth, db } from '@/lib/firebase/firebase';
import { useAuthState } from 'react-firebase-hooks/auth';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, Clock, UserCheck } from "lucide-react";
import Link from "next/link";
import { useToast } from "@/components/ui/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { doc, getDoc, collection, query, where, getDocs, Timestamp } from 'firebase/firestore';
import { motion, useAnimation } from "framer-motion";
import { StickyNote } from "lucide-react";




interface UserStats {
  attendance: number;
  leaveBalance: number;
  status: 'Checked In' | 'Checked Out' | 'Not Checked In';
}

export default function UserDashboard() {
  const [user] = useAuthState(auth);
  const { toast } = useToast();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [greeting, setGreeting] = useState('');
  const [userData, setUserData] = useState<any>(null);
  const [notes, setNotes] = useState<{ id: string; text: string; completed: boolean }[]>([]);
  // Animated counter display states
  const [displayAttendance, setDisplayAttendance] = useState(0);
  const [displayLeaveBalance, setDisplayLeaveBalance] = useState(0);
  const [userStats, setUserStats] = useState<UserStats>({
    attendance: 0,
    leaveBalance: 0,
    status: 'Not Checked In'
  });

  // Theming: use Tailwind theme colors for all custom styles

  // Set up clock and greeting
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

  // Fetch user data and attendance status
  useEffect(() => {
    if (!user) return;

    const fetchUserData = async () => {
      try {
        // Get user profile data
        const userDocRef = doc(db, 'users', user.uid);
        const userDocSnap = await getDoc(userDocRef);

        if (userDocSnap.exists()) {
          const data = userDocSnap.data();
          setUserData(data);

          // Update attendance percentage and leave balance
          setUserStats(prev => ({
            ...prev,
            attendance: data.attendance || 0,
            leaveBalance: data.leaveBalance || 0
          }));
        }

        // Get today's date at midnight and next day for accurate query
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(today.getDate() + 1);

        // Query for today's attendance record
        const attendanceQuery = query(
          collection(db, 'attendance'),
          where('userId', '==', user.uid),
          where('date', '>=', Timestamp.fromDate(today)),
          where('date', '<', Timestamp.fromDate(tomorrow))
        );

        const attendanceSnapshot = await getDocs(attendanceQuery);

        if (!attendanceSnapshot.empty) {
          // User has an attendance record for today
          const attendanceData = attendanceSnapshot.docs[0].data();

          if (attendanceData.checkOut) {
            setUserStats(prev => ({ ...prev, status: 'Checked Out' }));
          } else if (attendanceData.checkIn) {
            setUserStats(prev => ({ ...prev, status: 'Checked In' }));
          } else {
            setUserStats(prev => ({ ...prev, status: 'Not Checked In' }));
          }
        } else {
          setUserStats(prev => ({ ...prev, status: 'Not Checked In' }));
        }
      } catch (error) {
        console.error('Error fetching data:', error);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to load user data"
        });
      }
    };

    fetchUserData();

    // Set up polling for status updates
    const statusInterval = setInterval(() => {
      fetchUserData();
    }, 30000);

    return () => clearInterval(statusInterval);
  }, [user, toast]);

  // Animate counters when userStats change
  useEffect(() => {
    // Helper for animating counters
    const animateValue = (
      start: number,
      end: number,
      setter: React.Dispatch<React.SetStateAction<number>>,
      duration = 1200
    ) => {
      if (start === end) {
        setter(end);
        return;
      }
      let startTime: number | null = null;
      const step = (timestamp: number) => {
        if (!startTime) startTime = timestamp;
        const progress = timestamp - startTime;
        const progressRatio = Math.min(progress / duration, 1);
        const current = Math.floor(progressRatio * (end - start) + start);
        setter(current);
        if (progress < duration) {
          requestAnimationFrame(step);
        } else {
          setter(end);
        }
      };
      requestAnimationFrame(step);
    };

    animateValue(displayAttendance, userStats.attendance, setDisplayAttendance);
    animateValue(displayLeaveBalance, userStats.leaveBalance, setDisplayLeaveBalance);
    // eslint-disable-next-line
  }, [userStats.attendance, userStats.leaveBalance]);

  if (!user || !userData) {
    return (
      <div className="p-8 relative min-h-screen bg-gradient-to-b from-gray-50 to-white">
        <ParticlesBG />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-40 w-full" />
          ))}
        </div>
      </div>
    );
  }

  // Status color theming
  const getStatusColor = () => {
    switch (userStats.status) {
      case 'Checked In':
        return 'from-green-100 to-green-50 border-green-400';
      case 'Checked Out':
        return 'from-blue-100 to-blue-50 border-blue-400';
      default:
        return 'from-red-100 to-red-50 border-red-400';
    }
  };

  const getStatusTextColor = () => {
    switch (userStats.status) {
      case 'Checked In':
        return 'text-green-700';
      case 'Checked Out':
        return 'text-blue-700';
      default:
        return 'text-red-700';
    }
  };

  // Manual refresh function
  const refreshStatus = async () => {
    if (!user) return;
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(today.getDate() + 1);

      const attendanceQuery = query(
        collection(db, 'attendance'),
        where('userId', '==', user.uid),
        where('date', '>=', Timestamp.fromDate(today)),
        where('date', '<', Timestamp.fromDate(tomorrow))
      );
      const attendanceSnapshot = await getDocs(attendanceQuery);

      if (!attendanceSnapshot.empty) {
        const attendanceData = attendanceSnapshot.docs[0].data();
        if (attendanceData.checkOut) {
          setUserStats(prev => ({ ...prev, status: 'Checked Out' }));
        } else if (attendanceData.checkIn) {
          setUserStats(prev => ({ ...prev, status: 'Checked In' }));
        } else {
          setUserStats(prev => ({ ...prev, status: 'Not Checked In' }));
        }
      } else {
        setUserStats(prev => ({ ...prev, status: 'Not Checked In' }));
      }
    } catch (error) {
      console.error('Error refreshing status:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white p-8 relative overflow-hidden">
      <ParticlesBG />
      {/* Welcome Header */}
      <div className="text-center space-y-4 mb-12 z-10 relative">
        <h1 className="text-4xl font-bold text-gray-800">
          {greeting}, {userData?.displayName || user?.email?.split('@')[0] || 'User'} 👋
        </h1>
        <p className="text-gray-600 text-lg">
          {currentTime.toLocaleDateString([], {
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
          })}
        </p>
      </div>

      {/* Animated Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12 z-10 relative">
        <AnimatedCard
          color="from-blue-100 to-blue-50 border-blue-400"
          icon={<Clock className="w-7 h-7 text-blue-500" />}
          label="Time"
          value={currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        />
        <AnimatedCard
          color={getStatusColor()}
          icon={null}
          label="Status"
          value={userStats.status}
          textColor={getStatusTextColor()}
          onClick={refreshStatus}
          isStatus
        />
        <AnimatedCard
          color="from-purple-100 to-purple-50 border-purple-400"
          icon={null}
          label="Attendance"
          value={`${displayAttendance}%`}
          number={userStats.attendance}

        />
        <AnimatedCard
          color="from-orange-100 to-orange-50 border-orange-400"
          icon={null}
          label="Leave Balance"
          value={`${displayLeaveBalance} Days`}
          number={userStats.leaveBalance}
        />
        <AnimatedCard
          color="from-yellow-100 to-yellow-50 border-yellow-400"
          icon={<svg className="w-7 h-7 text-yellow-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M8 6H21M8 12H21M8 18H21M3 6H3.01M3 12H3.01M3 18H3.01" /></svg>}
          label="Notes"
          value={notes.length > 0 ? notes[notes.length - 1].text.slice(0, 30) + "..." : "No notes yet"}
          number={notes.length}
        />

      </div>

      {/* Quick Actions Grid */}
      <h2 className="text-2xl font-semibold text-gray-800 mb-6 z-10 relative">Quick Actions</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto z-10 relative">
        <Link href="/user/attendance">
          <ActionCard
            color="border-l-blue-500"
            icon={<Clock className="h-5 w-5 text-blue-500" />}
            title="Attendance"
            desc="Track your daily attendance"
            action="Check In/Out →"
            actionColor="text-blue-500"
            
          />
        </Link>
        <Link href="/user/leave-requests">
          <ActionCard
            color="border-l-green-500"
            icon={<Calendar className="h-5 w-5 text-green-500" />}
            title="Leave Requests"
            desc="Manage your leaves"
            action="Request Leave →"
            actionColor="text-green-500"
          />
        </Link>
        <Link href="/user/profile">
          <ActionCard
            color="border-l-purple-500"
            icon={<UserCheck className="h-5 w-5 text-purple-500" />}
            title="Your Profile"
            desc="Update your information"
            action="View Profile →"
            actionColor="text-purple-500"
          />
        </Link>
        <Link href="/user/NotesPage">
          <ActionCard
            color="border-l-yellow-500"
            icon={<StickyNote className="h-5 w-5 text-yellow-500" />}
            title="Notes"
            desc="Add, view, and manage your notes"
            action="Open Notes →"
            actionColor="text-yellow-500"
          />
        </Link>
      </div>
    </div>
  );
}

// Animated Stats Card with 3D Hover
function AnimatedCard({
  color,
  icon,
  label,
  value,
  textColor = "text-gray-800",
  onClick,
  isStatus = false,
  number
}: {
  color: string,
  icon?: React.ReactNode,
  label: string,
  value: string | number,
  textColor?: string,
  onClick?: () => void,
  isStatus?: boolean,
  number?: number
}) {
  // 3D hover effect
  const cardRef = useRef<HTMLDivElement | null>(null);
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const card = cardRef.current;
    if (!card) return;
    const { left, top, width, height } = card.getBoundingClientRect();
    const x = e.clientX - left - width / 2;
    const y = e.clientY - top - height / 2;
    card.style.transform = `perspective(800px) rotateY(${x / 20}deg) rotateX(${-y / 20}deg) scale(1.03)`;
  };
  const handleMouseLeave = () => {
    if (cardRef.current)
      cardRef.current.style.transform = '';
  };

  return (
    <div
      ref={cardRef}
      className={`relative bg-gradient-to-br ${color} border shadow-xl rounded-xl px-6 py-8 transition-transform duration-300 will-change-transform hover:shadow-2xl cursor-pointer group`}
      style={{
        transition: 'transform 0.25s cubic-bezier(.25,.8,.25,1), box-shadow 0.2s'
      }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onClick={onClick}
      tabIndex={isStatus ? 0 : undefined}
      role={isStatus ? "button" : undefined}
      aria-label={isStatus ? "Refresh Status" : undefined}
      title={isStatus ? "Click to refresh status" : undefined}
    >
      {icon && <div className="mb-2">{icon}</div>}
      <div className="text-sm font-semibold text-gray-600">{label}</div>
      <div className={`text-3xl font-bold mt-1 ${textColor}`}>
        {value}
      </div>
      {/* Animated bar for number stats */}
      {typeof number === 'number' && (
        <div className="w-full h-2 bg-gray-200 rounded-full mt-4 overflow-hidden">
          <div
            className="h-full rounded-full transition-all"
            style={{
              width: `${number}%`,
              background: 'linear-gradient(90deg, #6366f1 0%, #f472b6 100%)'
            }}
          />
        </div>
      )}
      {/* Shine effect */}
      <div className="absolute inset-0 pointer-events-none rounded-xl overflow-hidden">
        <div className="absolute -top-6 -left-16 w-48 h-12 bg-white bg-opacity-20 rotate-12 blur-xl animate-shine" />
      </div>
    </div>
  );
}

// Quick Action Card
function ActionCard({
  color,
  icon,
  title,
  desc,
  action,
  actionColor
}: {
  color: string,
  icon: React.ReactNode,
  title: string,
  desc: string,
  action: string,
  actionColor: string
}) {
  return (
    <Card className={`hover:shadow-lg hover:-translate-y-1 transition-all cursor-pointer border-l-4 ${color} bg-white/80`}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-lg font-medium">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <p className="text-gray-600">{desc}</p>
        <p className={`text-sm mt-2 font-medium ${actionColor}`}>
          {action}
        </p>
      </CardContent>
    </Card>
  );
}

// Floating Particles Background
function ParticlesBG() {
  // CSS for particles, use theme colors
  return (
    <>
      <style>{`
        .particle {
          position: absolute;
          border-radius: 50%;
          pointer-events: none;
          opacity: 0.4;
          z-index: 0;
          animation-name: floatUp;
          animation-timing-function: linear;
          background: linear-gradient(135deg, blue 50%, #fef9c3 100%);
        }
        @keyframes floatUp {
          0% { transform: translateY(0) scale(1);}
          100% { transform: translateY(-80vh) scale(1.3);}
        }
        .animate-shine {
          animation: shine 2.5s infinite linear;
        }
        @keyframes shine {
          0% { left: -100px; opacity: 0.2;}
          50% { left: 110%; opacity: 0.4;}
          100% { left: -100px; opacity: 0.2;}
        }
      `}</style>
      <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
        {[...Array(16)].map((_, i) => {
          const size = Math.random() * 32 + 18;
          const left = Math.random() * 100;
          const delay = Math.random() * 12;
          const duration = Math.random() * 14 + 7;
          return (
            <div
              key={i}
              className="particle"
              style={{
                width: size,
                height: size,
                left: `${left}%`,
                bottom: `-10px`,
                animationDelay: `${delay}s`,
                animationDuration: `${duration}s`
              }}
            />
          );
        })}
      </div>
    </>
  );
}