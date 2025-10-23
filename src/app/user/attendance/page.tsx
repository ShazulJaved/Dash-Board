"use client";

import { useEffect, useState } from "react";
import { auth } from "@/lib/firebase/firebase";
import { useAuthState } from "react-firebase-hooks/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Calendar,
  Clock,
  UserCheck,
  CalendarCheck,
  AlertCircle,
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { AttendanceRecord } from "@/types/attendance";
import Swal from "sweetalert2";
import { UserSidebar } from "@/components/user-sidebar";
import { useRouter } from "next/navigation";
import {
  getAttendanceStatus,
  checkIn,
  checkOut,
  getMonthlyAttendance,
  getAttendanceSummary,
} from "@/lib/firebase/attendance";

interface AttendanceData {
  todayStatus: string;
  lastCheckIn: string;
  lastCheckOut: string;
  monthlyAttendance: number;
  workingDays: number;
  presentDays: number;
  lateDays: number;
  recentActivities: AttendanceRecord[];
  currentAttendanceId: string | null;
}

export default function AttendancePage() {
  const [user, authLoading, authError] = useAuthState(auth);
  const router = useRouter();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [attendanceData, setAttendanceData] = useState<AttendanceData>({
    todayStatus: "Loading...",
    lastCheckIn: "--:--",
    lastCheckOut: "--:--",
    monthlyAttendance: 0,
    workingDays: 0,
    presentDays: 0,
    lateDays: 0,
    recentActivities: [],
    currentAttendanceId: null,
  });
  const { toast } = useToast();

  // Protect the route
  useEffect(() => {
    if (!user && !authLoading) {
      router.push("/auth/sign-in");
    }
  }, [user, authLoading, router]);

  const fetchData = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const [status, monthly, summary] = await Promise.all([
        getAttendanceStatus(user.uid),
        getMonthlyAttendance(user.uid),
        getAttendanceSummary(user.uid),
      ]);

      setAttendanceData((prev) => ({
        ...prev,
        todayStatus: status?.checkOut
          ? "Checked out"
          : status?.checkIn
          ? "Checked in"
          : "Not checked in",
        lastCheckIn: status?.checkIn || "--:--",
        lastCheckOut: status?.checkOut || "--:--",
        monthlyAttendance: summary.percentage,
        workingDays: summary.totalDays,
        presentDays: summary.presentDays,
        lateDays: summary.lateDays,
        recentActivities: monthly.slice(0, 5),
        currentAttendanceId: status?.id || null,
      }));
    } catch (error) {
      console.error("Error fetching attendance data:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to fetch attendance data",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, [user]);

  const handleCheckIn = async () => {
    if (!user) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "You must be logged in to check in",
      });
      return;
    }

    // Check if already checked out today
    if (attendanceData.todayStatus === "Checked out") {
      const result = await Swal.fire({
        title: "Already Checked Out",
        text: "You have already completed your attendance for today",
        icon: "warning",
        showCancelButton: true,
        confirmButtonText: "Contact Admin",
        cancelButtonText: "Close",
        confirmButtonColor: "#3085d6",
        cancelButtonColor: "#d33",
      });

      if (result.isConfirmed) {
        // Add contact admin functionality here
        toast({
          description: "Please contact your administrator for assistance",
        });
      }
      return;
    }

    try {
      setLoading(true);
      const attendanceId = await checkIn();

      if (attendanceId) {
        const now = new Date();
        setAttendanceData((prev) => ({
          ...prev,
          todayStatus: "Checked in",
          lastCheckIn: now.toLocaleTimeString(),
          currentAttendanceId: attendanceId,
        }));

        toast({
          title: "Success",
          description: "Checked in successfully",
        });

        await fetchData();
      }
    } catch (error: any) {
      console.error("Error checking in:", error);

      if (error.message.includes("Already checked in")) {
        await Swal.fire({
          title: "Already Checked In",
          text: "You have already checked in for today",
          icon: "info",
          confirmButtonText: "OK",
          confirmButtonColor: "#3085d6",
        });
      } else {
        toast({
          variant: "destructive",
          title: "Error",
          description: error.message || "Failed to check in",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCheckOut = async () => {
    if (!user || !attendanceData.currentAttendanceId) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Missing required information for check-out",
      });
      return;
    }

    const result = await Swal.fire({
      title: "Confirm Check Out",
      text: "Are you sure you want to check out?",
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Yes, Check Out",
      cancelButtonText: "Cancel",
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#d33",
    });

    if (!result.isConfirmed) return;

    try {
      setLoading(true);
      await checkOut(attendanceData.currentAttendanceId);

      const now = new Date();
      setAttendanceData((prev) => ({
        ...prev,
        todayStatus: "Checked out",
        lastCheckOut: now.toLocaleTimeString(),
      }));

      toast({
        title: "Success",
        description: "Checked out successfully",
      });

      await fetchData();
    } catch (error: any) {
      console.error("Error checking out:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to check out",
      });
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-2">Loading...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (authError) {
    return (
      <div className="flex h-screen">
        <UserSidebar />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center text-red-500">
            <p>Error: {authError.message}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return null; // Router will handle redirect
  }

  return (
    <div className="flex h-screen bg-gray-100">
      <div className="flex-1 overflow-auto">
        <div className="p-8 space-y-6">
          {/* Header */}
          <div className="flex justify-between items-center">
            <h1 className="text-3xl font-bold">Attendance Management</h1>
            <div className="flex items-center space-x-2">
              <Clock className="h-5 w-5 text-gray-500" />
              <span className="font-medium">
                {currentTime.toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
              <span className="text-gray-500">
                {currentTime.toLocaleDateString([], {
                  weekday: "long",
                  month: "long",
                  day: "numeric",
                })}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Today's Status Card */}
            <Card className="border-blue-100">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">
                  Today's Status
                </CardTitle>
                <UserCheck className="h-4 w-4 text-blue-500" />
              </CardHeader>
              <CardContent>
  <div className="text-2xl font-bold mb-2">
    {attendanceData.todayStatus === "Checked in" ? (
      <Badge variant="default">Checked In</Badge>
    ) : attendanceData.todayStatus === "Checked out" ? (
      <Badge variant="secondary">Checked Out</Badge>
    ) : (
      <Badge variant="destructive">Not Checked In</Badge>
    )}
  </div>
  <div className="grid grid-cols-2 gap-4 mt-4">
    <div>
      <p className="text-sm text-muted-foreground">
        Last Check-in
      </p>
      <p className="font-medium">{attendanceData.lastCheckIn}</p>
    </div>
    <div>
      <p className="text-sm text-muted-foreground">
        Last Check-out
      </p>
      <p className="font-medium">{attendanceData.lastCheckOut}</p>
    </div>
  </div>
  <div className="mt-6 space-y-2">
    {attendanceData.todayStatus === "Checked in" ? (
      <Button
        variant="destructive"
        className="w-full"
        onClick={handleCheckOut}
        disabled={loading}
      >
        {loading ? "Processing..." : "Check Out"}
      </Button>
    ) : attendanceData.todayStatus === "Checked out" ? (
      <Button
        variant="outline"
        className="w-full"
        disabled={true}
      >
        Completed Today
      </Button>
    ) : (
      <Button
        className="w-full bg-blue-600 hover:bg-blue-700"
        onClick={handleCheckIn}
        disabled={loading}
      >
        {loading ? "Processing..." : "Check In"}
      </Button>
    )}
  </div>
</CardContent>

            </Card>

            {/* Monthly Attendance Card */}
            <Card className="border-green-100">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">
                  Monthly Attendance
                </CardTitle>
                <CalendarCheck className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold mb-2">
                  {attendanceData.monthlyAttendance}%
                </div>
                <p className="text-xs text-muted-foreground mb-3">
                  Your attendance rate this month
                </p>
                <Progress
                  value={attendanceData.monthlyAttendance}
                  className="h-2"
                />
                <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                  <div>
                    <p className="text-sm font-medium">
                      {attendanceData.workingDays}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Working Days
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">
                      {attendanceData.presentDays}
                    </p>
                    <p className="text-xs text-muted-foreground">Present</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">
                      {attendanceData.lateDays}
                    </p>
                    <p className="text-xs text-muted-foreground">Late</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Recent Activities Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <AlertCircle className="h-5 w-5 mr-2 text-orange-500" />
                  Recent Activities
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {attendanceData.recentActivities.map((activity, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg"
                    >
                      <div className="flex items-center space-x-4">
                        <Avatar>
                          <AvatarFallback>
                            {activity.date.toDate().getDate()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">
                            {activity.date.toDate().toLocaleDateString([], {
                              weekday: "short",
                              month: "short",
                              day: "numeric",
                            })}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {activity.checkIn}
                          </p>
                        </div>
                      </div>
                      <Badge
                        variant={
                          activity.status === "Late" ? "secondary" : "default"
                        }
                      >
                        {activity.status}
                      </Badge>
                    </div>
                  ))}
                </div>
                <Button variant="ghost" className="w-full mt-4 text-blue-600">
                  View Full History
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
