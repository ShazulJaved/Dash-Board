'use client';

import { useEffect, useState, useRef } from 'react';
import { auth, db } from '@/lib/firebase/firebase';
import { useAuthState } from 'react-firebase-hooks/auth';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, Clock, UserCheck, StickyNote } from "lucide-react";
import Link from "next/link";
import { useToast } from "@/components/ui/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { doc, getDoc, collection, query, where, getDocs, Timestamp } from 'firebase/firestore';
import { fetchUserAttendanceStats } from '@/lib/attendance-utils';


interface UserStats {
  attendance: number;
  leaveBalance: number;
  status: 'Checked In' | 'Checked Out' | 'Not Checked In';
}

// Custom hook for count animation
const useCountAnimation = (
  targetValue: number, 
  duration: number = 2000,
  format: 'percentage' | 'number' | 'days' | 'time' = 'number'
) => {
  const [currentValue, setCurrentValue] = useState(0);

  useEffect(() => {
    if (targetValue === 0) {
      setCurrentValue(0);
      return;
    }

    let startTime: number;
    const startValue = 0;
    const endValue = targetValue;

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = timestamp - startTime;
      const percentage = Math.min(progress / duration, 1);

      // Easing function for smooth animation
      const easeOutQuart = 1 - Math.pow(1 - percentage, 4);
      const current = startValue + (endValue - startValue) * easeOutQuart;

      setCurrentValue(Math.floor(current));

      if (percentage < 1) {
        requestAnimationFrame(animate);
      } else {
        setCurrentValue(endValue);
      }
    };

    requestAnimationFrame(animate);
  }, [targetValue, duration]);

  // Format the output based on the type
  const formatValue = () => {
    switch (format) {
      case 'percentage':
        return `${currentValue}%`;
      case 'days':
        return `${currentValue} Days`;
      case 'time':
        return `${currentValue.toString().padStart(2, '0')}:00`;
      default:
        return currentValue.toString();
    }
  };

  return {
    rawValue: currentValue,
    displayValue: formatValue()
  };
};

export default function UserDashboard() {
  const [user] = useAuthState(auth);
  const { toast } = useToast();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [greeting, setGreeting] = useState('');
  const [userData, setUserData] = useState<any>(null);
  const [notes, setNotes] = useState<{ id: string; text: string; completed: boolean }[]>([]);
   // Status background image theming
  const getStatusBackground = (): string => {
    switch (userStats.status) {
      case 'Checked In':
        return "/assets/checked-in-bg.jpg";
      case 'Checked Out':
        return "/assets/checked-out-bg.jpg";
      default:
        return "/assets/not-checked-bg.jpg";
    }
  };

  // Stats state
  const [userStats, setUserStats] = useState<UserStats>({
    attendance: 0,
    leaveBalance: 0,
    status: 'Not Checked In'
  });

  const [loading, setLoading] = useState(true);

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
        setLoading(true);
        
        // Get user profile data
        const userDocRef = doc(db, 'users', user.uid);
        const userDocSnap = await getDoc(userDocRef);

        let userAttendance = 0;
        let userLeaveBalance = 0;

        if (userDocSnap.exists()) {
          const data = userDocSnap.data();
          setUserData(data);
          
          // Get attendance and leave balance from user document
          userAttendance = data.attendance || 0;
          userLeaveBalance = data.leaveBalance || 0;
        }

        // Fetch attendance stats from attendance collection
        try {
          const attendanceStats = await fetchUserAttendanceStats(user.uid);
          // Use the attendance percentage from attendance collection, fallback to user document
          userAttendance = attendanceStats.monthlyAttendance || userAttendance;
        } catch (error) {
          console.error('Error fetching attendance stats:', error);
          // Continue with user document data if attendance collection fails
        }

        // Update stats with the fetched data
        setUserStats(prev => ({
          ...prev,
          attendance: userAttendance,
          leaveBalance: userLeaveBalance
        }));

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
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();

    // Set up polling for status updates
    const statusInterval = setInterval(() => {
      fetchUserData();
    }, 30000);

    return () => clearInterval(statusInterval);
  }, [user, toast]);

  // Status color theming
  const getStatusColor = (): string => {
    switch (userStats.status) {
      case 'Checked In':
        return 'from-green-100 to-green-50 border-green-400';
      case 'Checked Out':
        return 'from-blue-100 to-blue-50 border-blue-400';
      default:
        return 'from-red-100 to-red-50 border-red-400';
    }
  };

  // Status text color
  const getStatusTextColor = (): string => {
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
      // Refresh all data
      const userDocRef = doc(db, 'users', user.uid);
      const userDocSnap = await getDoc(userDocRef);

      if (userDocSnap.exists()) {
        const data = userDocSnap.data();
        const attendanceStats = await fetchUserAttendanceStats(user.uid);
        
        setUserStats(prev => ({
          ...prev,
          attendance: attendanceStats.monthlyAttendance || data.attendance || 0,
          leaveBalance: data.leaveBalance || 0
        }));
      }

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
      
      toast({
        title: "Status Updated",
        description: "All data refreshed successfully",
      });
    } catch (error) {
      console.error('Error refreshing status:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to refresh data"
      });
    }
  };

  if (!user || !userData || loading) {
    return (
      <div className="p-8 relative min-h-screen bg-gradient-to-b from-gray-50 to-white">
        
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

  return (
    <div className="min-h-screen p-8 relative">
      {/* Dark overlay for 30% of height */}
      <div className="absolute top-0 left-0 right-0 h-[30%] bg-gradient-to-b from-teal-900/60 to-emerald-800/40 pointer-events-none" />

      {/* Welcome Header */}
      <div className="text-center space-y-4 mb-12 z-10 relative">
        <h1 className="text-4xl font-bold text-white drop-shadow-lg">
          {greeting}, {userData?.displayName || user?.email?.split('@')[0] || 'User'} 👋
        </h1>
        <p className="text-white/90 text-lg drop-shadow-md">
          {currentTime.toLocaleDateString([], {
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
          })}
        </p>
      </div>

      {/* Animated Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12 z-10 relative">
        <AnimatedCard
          backgroundImage="/assets/checked-in-bg.jpg"
          icon={<Clock className="w-7 h-7 text-white" />}
          label="Time"
          value={currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          textColor="text-white"
        />
        <AnimatedCard
          backgroundImage={getStatusBackground()}
          icon={null}
          label="Status"
          value={userStats.status}
          textColor="text-white"
          onClick={refreshStatus}
          isStatus
        />
        {/* Attendance Card with Counting Animation */}
        <AnimatedCard
          backgroundImage="/assets/attendance-bg.jpg"
          icon={null}
          label="Attendance"
          number={userStats.attendance}
          format="percentage"
          duration={1500}
          value={''}
          textColor="text-white"
        />
        {/* Leave Balance Card with Counting Animation */}
        <AnimatedCard
          backgroundImage="/assets/blue1.jpg"
          icon={null}
          label="Leave Balance"
          number={userStats.leaveBalance}
          format="days"
          duration={1200}
          value={''}
          textColor="text-white"
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
  backgroundImage,
  icon,
  label,
  value,
  textColor = "text-white",
  onClick,
  isStatus = false,
  number,
  format = 'number',
  duration = 2000
}: {
  backgroundImage?: string,
  icon?: React.ReactNode,
  label: string,
  value: string | number,
  textColor?: string,
  onClick?: () => void,
  isStatus?: boolean,
  number?: number,
  format?: 'percentage' | 'number' | 'days' | 'time',
  duration?: number
}) {
  const { displayValue } = useCountAnimation(number || 0, duration, format);
  
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

  // If number prop is provided, use the animated value
  const finalDisplayValue = number !== undefined ? displayValue : value;

  return (
    <div
      ref={cardRef}
      className="relative border shadow-xl rounded-xl px-6 py-8 transition-transform duration-300 will-change-transform hover:shadow-2xl cursor-pointer group overflow-hidden"
      style={{
        backgroundImage: `url(${backgroundImage})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
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
      {/* Dark overlay for better text readability */}
      <div className="absolute inset-0 bg-black/40 rounded-xl" />
      
      {/* Content */}
      <div className="relative z-10">
        {icon && <div className="mb-2">{icon}</div>}
        <div className="text-sm font-semibold text-white/90">{label}</div>
        <div className={`text-3xl font-bold mt-1 ${textColor} drop-shadow-lg`}>
          {finalDisplayValue}
        </div>
        {/* Animated bar for number stats */}
        {typeof number === 'number' && (
          <div className="w-full h-2 bg-white/20 rounded-full mt-4 overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-1000"
              style={{
                width: `${number}%`,
                background: 'linear-gradient(90deg, #ffffff 0%, #f0f0f0 100%)'
              }}
            />
          </div>
        )}
      </div>
      
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
  // Get the color name from the border class
  const getColorName = (borderClass: string) => {
    if (borderClass.includes('blue')) return 'blue';
    if (borderClass.includes('green')) return 'green';
    if (borderClass.includes('purple')) return 'purple';
    if (borderClass.includes('yellow')) return 'yellow';
    return 'blue';
  };
  
  const colorName = getColorName(color);
  
  return (
    <Card className="group hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer bg-white border-0 overflow-hidden relative">
      {/* Top gradient border */}
      <div className={`absolute top-0 left-0 w-full h-1 bg-gradient-to-r ${
        colorName === 'blue' ? 'from-blue-400 via-blue-500 to-blue-600' :
        colorName === 'green' ? 'from-green-400 via-green-500 to-green-600' :
        colorName === 'purple' ? 'from-purple-400 via-purple-500 to-purple-600' :
        'from-yellow-400 via-yellow-500 to-yellow-600'
      }`} />
      
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-lg font-medium text-gray-900">{title}</CardTitle>
        <div className={`p-2 rounded-full ${
          colorName === 'blue' ? 'bg-blue-100' :
          colorName === 'green' ? 'bg-green-100' :
          colorName === 'purple' ? 'bg-purple-100' :
          'bg-yellow-100'
        } group-hover:scale-110 transition-transform duration-300`}>
          {icon}
        </div>
      </CardHeader>
      
      <CardContent>
        <p className="text-gray-600 mb-4">{desc}</p>
        <div className="flex items-center justify-between">
          <p className={`text-sm font-medium ${actionColor} group-hover:underline transition-all`}>
            {action}
          </p>
          <div className={`w-6 h-6 rounded-full ${
            colorName === 'blue' ? 'bg-blue-200' :
            colorName === 'green' ? 'bg-green-200' :
            colorName === 'purple' ? 'bg-purple-200' :
            'bg-yellow-200'
          } opacity-60`} />
        </div>
      </CardContent>
    </Card>
  );
}

// Floating Particles Background
// Enhanced Animated Background
