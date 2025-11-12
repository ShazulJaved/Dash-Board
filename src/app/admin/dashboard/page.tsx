"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { auth } from "@/lib/firebase/firebase";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  AlertCircle,
  RefreshCw,
  Clock,
  LogIn,
  LogOut,
  Filter,
  CalendarDays,
  ChevronDown,
  ChevronUp,
  Search,
  Users,
  Activity,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { format, parseISO } from "date-fns";
import { onAuthStateChanged } from "firebase/auth";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Toggle } from "@/components/ui/toggle";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
//import CloudBackground from "@/components/cloudBackground";

// Two themes: modern and classic. Classic gets richer visual differences.
const THEMES = {
  modern: {
    key: "modern",
    primary: "#473472",
    secondary: "#6F00FF",
    accent: "#9929EA",
    background: "#3B0270", // Sky gradient base
    active: "#4300FF", // Light coral
    text: {
      primary: "#2D3748",
      secondary: "#4A5568",
      light: "#718096",
    },

    cardShadow: "shadow-lg",
    cardBorderClass: "border-0",
    headerFontClass: "font-sans",
    roundedClass: "rounded-xl",
    cardBackground: "bg-white",
  },
  classic: {
    key: "classic",
    primary: "#3B3A30", // darker muted
    secondary: "#6B5B3A",
    accent: "#C9A66B",
    background: "#F6F3EE", // soft parchment
    text: {
      primary: "#1F2937",
      secondary: "#374151",
      light: "#6B7280",
    },
    cardShadow: "shadow-md",
    cardBorderClass: "border",
    headerFontClass: "font-serif",
    roundedClass: "rounded-md",
    cardBackground: "bg-[#FBF7EE]",
    // additional decorative styles for classic theme
    classicHeaderBg: "linear-gradient(90deg, rgba(245,236,214,1) 0%, rgba(231,220,196,1) 100%)",
    classicBorderColor: "#E0D6C3",
  },
};

interface EmployeeRecord {
  id: string;
  name: string;
  email: string;
  checkInTime: string | null;
  checkOutTime: string | null;
  status: "Checked In" | "Checked Out" | "Absent";
  date: string;
  isActive?: boolean;
  lastActivity?: string;
  avatar?: string;
  _key?: string;
}

export default function AdminDashboard() {
  const [attendanceData, setAttendanceData] = useState<EmployeeRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [currentDate, setCurrentDate] = useState<string>(
    format(new Date(), "yyyy-MM-dd")
  );
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [autoRefresh, setAutoRefresh] = useState<boolean>(true);
  const [user, setUser] = useState(auth.currentUser);
  const [authInitialized, setAuthInitialized] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [expandedView, setExpandedView] = useState<boolean>(false);
  const [refreshTrigger, setRefreshTrigger] = useState<number>(0);
  const [themeKey, setThemeKey] = useState<"modern" | "classic">("modern");

  const currentTheme = THEMES[themeKey];
  const displayTime = format(lastUpdated, "hh:mm:ss a");

  // Calculate summary statistics
  const totalEmployees = attendanceData.length;
  const checkedInCount = attendanceData.filter(
    (e) => e.status === "Checked In"
  ).length;
  const checkedOutCount = attendanceData.filter(
    (e) => e.status === "Checked Out"
  ).length;
  const absentCount = attendanceData.filter((e) => e.status === "Absent")
    .length;
  const activeNowCount = attendanceData.filter((e) => e.isActive).length;

  // Aggregate activity counts by hour (0-23) for the selected date
  const hourlyActivity = useMemo(() => {
    const buckets = new Array(24).fill(0);
    attendanceData.forEach((rec) => {
      const ts = rec.lastActivity || rec.checkInTime || null;
      if (!ts) return;
      // Attempt parse with Date and fallback to parseISO
      let d: Date | null = null;
      try {
        d = new Date(ts);
        if (isNaN(d.getTime())) throw new Error("Invalid");
      } catch {
        try {
          d = parseISO(ts);
        } catch {
          d = null;
        }
      }
      if (!d) return;
      const dtStr = format(d, "yyyy-MM-dd");
      if (dtStr !== currentDate) return;
      const h = d.getHours();
      buckets[h] += 1;
    });
    return buckets;
  }, [attendanceData, currentDate, refreshTrigger]);

  // Simple lightweight SVG sparkline/area chart for activity
  function ActivitySparkline({
    data,
    width = 600,
    height = 120,
  }: {
    data: number[];
    width?: number;
    height?: number;
  }) {
    const max = Math.max(...data, 1);
    const points = data
      .map((v, i) => {
        const x = (i / (data.length - 1)) * width;
        const y = height - (v / max) * (height - 20) - 10;
        return `${x},${y}`;
      })
      .join(" ");
    const areaPath = data
      .map((v, i) => {
        const x = (i / (data.length - 1)) * width;
        const y = height - (v / max) * (height - 20) - 10;
        return `${i === 0 ? "M" : "L"} ${x} ${y}`;
      })
      .join(" ");

    const areaClose = `${areaPath} L ${width} ${height} L 0 ${height} Z`;

    return (
      <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" className="rounded">
        <defs>
          <linearGradient id="g1" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor={themeKey === "classic" ? "#C9A66B" : "#91C4C3"} stopOpacity="0.35" />
            <stop offset="100%" stopColor={themeKey === "classic" ? "#C9A66B" : "#91C4C3"} stopOpacity="0.05" />
          </linearGradient>
        </defs>
        <path d={areaClose} fill="url(#g1)" />
        <polyline fill="none" stroke={themeKey === "classic" ? "#6B5B3A" : "#2C7A7B"} strokeWidth={2} points={points} strokeLinecap="round" strokeLinejoin="round" />
        {data.map((v, i) => {
          const x = (i / (data.length - 1)) * width;
          const y = height - (v / max) * (height - 20) - 10;
          return <circle key={i} cx={x} cy={y} r={2.2} fill={themeKey === "classic" ? "#6B5B3A" : "#2C7A7B"} />;
        })}
      </svg>
    );
  }

  // Status distribution horizontal bars
  function StatusDistribution({
    checkedIn,
    checkedOut,
    absent,
  }: {
    checkedIn: number;
    checkedOut: number;
    absent: number;
  }) {
    const total = Math.max(checkedIn + checkedOut + absent, 1);
    const pct = (n: number) => Math.round((n / total) * 100);
    const barBg = themeKey === "classic" ? "#EDE6D6" : "#f1f5f9";
    return (
      <div className="space-y-2">
        <div className="text-sm font-medium" style={{ color: currentTheme.text.primary }}>
          Status Distribution
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs" style={{ color: currentTheme.text.secondary }}>
            <span>Checked In</span>
            <span>{checkedIn} ({pct(checkedIn)}%)</span>
          </div>
          <div className="w-full h-3 rounded overflow-hidden" style={{ background: barBg }}>
            <div style={{ width: `${(checkedIn / total) * 100}%`, background: "#B4DEBD", height: "100%" }} />
          </div>

          <div className="flex items-center justify-between text-xs" style={{ color: currentTheme.text.secondary }}>
            <span>Checked Out</span>
            <span>{checkedOut} ({pct(checkedOut)}%)</span>
          </div>
          <div className="w-full h-3 rounded overflow-hidden" style={{ background: barBg }}>
            <div style={{ width: `${(checkedOut / total) * 100}%`, background: "#91C4C3", height: "100%" }} />
          </div>

          <div className="flex items-center justify-between text-xs" style={{ color: currentTheme.text.secondary }}>
            <span>Absent</span>
            <span>{absent} ({pct(absent)}%)</span>
          </div>
          <div className="w-full h-3 rounded overflow-hidden" style={{ background: barBg }}>
            <div style={{ width: `${(absent / total) * 100}%`, background: themeKey === "classic" ? "#C9A66B" : "#F5B7B1", height: "100%" }} />
          </div>
        </div>
      </div>
    );
  }

  // Fetch attendance data
  const fetchAttendanceData = async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      setError(null);

      const currentUser = auth.currentUser;
      if (!currentUser) {
        setError("Authentication required");
        setLoading(false);
        return;
      }

      const idToken = await currentUser.getIdToken(true);
      const timestamp = Date.now();
      const random = Math.random();

      const attendanceResponse = await fetch(
        `/api/admin/attendance?date=${currentDate}&t=${timestamp}&r=${random}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${idToken}`,
            "Cache-Control": "no-cache, no-store, must-revalidate",
            Pragma: "no-cache",
            Expires: "0",
          },
          cache: "no-store",
        }
      );

      if (!attendanceResponse.ok) {
        throw new Error(
          attendanceResponse.status === 403
            ? "Permission denied"
            : "Failed to fetch attendance data"
        );
      }

      const attendanceResult = await attendanceResponse.json();

      if (!attendanceResult?.attendance) {
        throw new Error("Invalid attendance data format");
      }

      const formattedData = attendanceResult.attendance.map((record: any) => {
        let checkInTime = null;
        let checkOutTime = null;
        let recordDate = currentDate;

        try {
          if (record.checkInTime) {
            try {
              checkInTime = format(new Date(record.checkInTime), "hh:mm a");
            } catch (e) {
              try {
                checkInTime = format(parseISO(record.checkInTime), "hh:mm a");
              } catch {
                checkInTime = record.checkInTime;
              }
            }
          }

          if (record.checkOutTime) {
            try {
              checkOutTime = format(new Date(record.checkOutTime), "hh:mm a");
            } catch (e) {
              try {
                checkOutTime = format(parseISO(record.checkOutTime), "hh:mm a");
              } catch {
                checkOutTime = record.checkOutTime;
              }
            }
          }

          if (record.date) {
            try {
              recordDate = format(new Date(record.date), "yyyy-MM-dd");
            } catch (e) {
              try {
                recordDate = format(parseISO(record.date), "yyyy-MM-dd");
              } catch {
                recordDate = currentDate;
              }
            }
          }
        } catch (e) {
          console.error("Date parsing error:", e);
        }

        let status = "Absent";
        if (record.status) {
          status = record.status;
        } else if (record.checkOutTime) {
          status = "Checked Out";
        } else if (record.checkInTime) {
          status = "Checked In";
        }

        const userId = record.userId || record.id;
        const emailLocal = record.email ? record.email.split("@")[0] : "unknown";
        const nameParts = (record.userName || record.name || emailLocal).split(
          " "
        );
        const initials =
          nameParts.length >= 2
            ? `${nameParts[0][0]}${nameParts[nameParts.length - 1][0]}`
            : nameParts[0][0];

        const isActive =
          Boolean(record.isActive) ||
          (Boolean(record.checkInTime) && !record.checkOutTime);

        return {
          id: userId,
          name: record.userName || record.name || (record.email || "unknown").split("@")[0],
          email: record.email || "",
          checkInTime,
          checkOutTime,
          status,
          date: recordDate,
          isActive,
          lastActivity: record.lastActive || null,
          avatar: `https://ui-avatars.com/api/?name=${initials}&background=random`,
          _key: `${timestamp}-${random}`,
        } as EmployeeRecord;
      });

      const sortedData = formattedData.sort(
        (a: EmployeeRecord, b: EmployeeRecord) => {
          const statusOrder: any = { "Checked In": 0, "Checked Out": 1, Absent: 2 };
          return (
            statusOrder[a.status] - statusOrder[b.status] ||
            a.name.localeCompare(b.name)
          );
        }
      );

      setAttendanceData(sortedData);
      setLastUpdated(new Date());
      setRefreshTrigger((prev) => prev + 1);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Unknown error");
      console.error("Fetch error:", error);
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  // Auth state listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setAuthInitialized(true);
    });
    return () => unsubscribe();
  }, []);

  // Data fetching and auto-refresh
  useEffect(() => {
    if (!authInitialized || !user) return;

    fetchAttendanceData();

    if (autoRefresh) {
      const interval = setInterval(() => {
        fetchAttendanceData(false);
      }, 2000);

      return () => {
        clearInterval(interval);
      };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentDate, autoRefresh, authInitialized, user]);

  const handleRefresh = () => fetchAttendanceData(true);
  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) =>
    setCurrentDate(e.target.value);
  const toggleAutoRefresh = () => setAutoRefresh((prev) => !prev);

  // Filter data based on status and search
  const filteredData = attendanceData.filter((employee) => {
    const statusMatch =
      statusFilter === "all" || employee.status === statusFilter;
    const searchMatch =
      employee.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      employee.email.toLowerCase().includes(searchQuery.toLowerCase());
    return statusMatch && searchMatch;
  });

  if (!authInitialized) {
    return (
      <div className="min-h-screen overflow-hidden relative bg-gray-100">
       
        <div className={`p-4 md:p-6 space-y-6 max-w-7xl mx-auto ${currentTheme.headerFontClass}`}>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-32 rounded-xl" />
            ))}
          </div>
          <Skeleton className="h-[500px] w-full rounded-xl" />
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <Alert variant="destructive" className="max-w-md bg-red-50 border-red-200">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Access Denied</AlertTitle>
          <AlertDescription>
            You must be logged in with admin privileges to view this dashboard.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 ">
      {/* Header Section */}
      <div className="container mx-auto py-8 px-4 max-w-7xl">
        <div className={`flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-8 ${currentTheme.headerFontClass}`}>
          <div>
            <h1 className="text-3xl font-bold" style={{ color: currentTheme.text.primary }}>
              Employee Attendance Dashboard
            </h1>
            <p className="mt-2" style={{ color: currentTheme.text.secondary }}>
              Monitor and manage employee attendance in real-time — built with Next.js
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={loading}
              className={`gap-1 ${currentTheme.cardBorderClass} ${currentTheme.cardBackground} ${currentTheme.cardShadow} hover:bg-gray-50`}
              style={{ color: currentTheme.text.primary }}
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              <span>Refresh</span>
            </Button>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Toggle
                    pressed={autoRefresh}
                    onPressedChange={toggleAutoRefresh}
                    size="sm"
                    className="gap-1 data-[state=on]:bg-green-50 data-[state=on]:text-green-600 border-white bg-white shadow-sm"
                  >
                    <Clock
                      className={`h-4 w-4 ${autoRefresh ? "animate-pulse" : ""}`}
                    />
                  </Toggle>
                </TooltipTrigger>
                <TooltipContent>
                  {autoRefresh ? "Auto-refresh enabled" : "Click to enable auto-refresh"}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <div className="w-36">
              <Select value={themeKey} onValueChange={(val) => setThemeKey(val as "modern" | "classic")}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Theme" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="modern">Modern</SelectItem>
                  <SelectItem value="classic">Classic</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className={`${currentTheme.cardBorderClass} ${currentTheme.cardShadow}`} style={{ backgroundColor: currentTheme.primary }}>
            <CardContent className="p-6 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium opacity-90">Total Employees</p>
                  <h3 className="text-3xl font-bold mt-2">{totalEmployees}</h3>
                </div>
                <div className="bg-white/20 p-3 rounded-full">
                  <Users className="h-6 w-6" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className={`${currentTheme.cardBorderClass} ${currentTheme.cardShadow}`} style={{ backgroundColor: currentTheme.secondary }}>
            <CardContent className="p-6 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium opacity-90">Checked In</p>
                  <h3 className="text-3xl font-bold mt-2">{checkedInCount}</h3>
                  <Progress
                    value={(checkedInCount / Math.max(totalEmployees, 1)) * 100}
                    className="h-2 mt-3 bg-white/30"
                    style={{
                      ["--progress-indicator-color" as any]: "#ffffff",
                    }}
                  />
                </div>
                <div className="bg-white/20 p-3 rounded-full">
                  <LogIn className="h-6 w-6" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className={`${currentTheme.cardBorderClass} ${currentTheme.cardShadow}`} style={{ backgroundColor: currentTheme.accent }}>
            <CardContent className="p-6 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium opacity-90">Checked Out</p>
                  <h3 className="text-3xl font-bold mt-2">{checkedOutCount}</h3>
                  <Progress
                    value={(checkedOutCount / Math.max(totalEmployees, 1)) * 100}
                    className="h-2 mt-3 bg-white/30"
                    style={{
                      ["--progress-indicator-color" as any]: "#ffffff",
                    }}
                  />
                </div>
                <div className="bg-white/20 p-3 rounded-full">
                  <LogOut className="h-6 w-6" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className={`${currentTheme.cardBorderClass} ${currentTheme.cardShadow}`} style={{ backgroundColor: themeKey === "modern" ? "#F5B7B1" : "#E6D2C3" }}>
            <CardContent className="p-6 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium opacity-90">Active Now</p>
                  <h3 className="text-3xl font-bold mt-2">{activeNowCount}</h3>
                  <Progress
                    value={(activeNowCount / Math.max(totalEmployees, 1)) * 100}
                    className="h-2 mt-3 bg-white/30"
                    style={{
                      ["--progress-indicator-color" as any]: "#ffffff",
                    }}
                  />
                </div>
                <div className="bg-white/20 p-3 rounded-full">
                  <Activity className="h-6 w-6" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts: Activity sparkline + Status distribution - shown more "classic" style when classic selected */}
        <Card className={`${currentTheme.cardBorderClass} ${currentTheme.cardShadow} mb-6 ${currentTheme.cardBackground}`}>
          <CardContent className="p-6">
            <div className="flex flex-col lg:flex-row gap-6 items-start">
              <div className="flex-1">
                <div className="flex items-center justify-between mb-3">
                  <div className="text-sm font-medium" style={{ color: currentTheme.text.primary }}>
                    Activity Over the Day
                  </div>
                  <div className="text-xs" style={{ color: currentTheme.text.secondary }}>
                    {currentDate}
                  </div>
                </div>
                <div className={`p-3 ${themeKey === "classic" ? "border" : ""}`} style={ themeKey === "classic" ? { borderColor: THEMES.classic.classicBorderColor, borderRadius: 8, background: "linear-gradient(180deg, rgba(255,255,255,0.6), rgba(250,248,241,0.9))" } : {} }>
                  <ActivitySparkline data={hourlyActivity} />
                  <div className="mt-2 text-xs" style={{ color: currentTheme.text.secondary }}>
                    Sparkline shows the number of activity events per hour for the selected date.
                  </div>
                </div>
              </div>

              <div className="w-64"
              style={{background:"#c9baeaff"}}>
                <div className="mb-3 text-sm font-medium" style={{ color: currentTheme.text.primary }}>
                  Snapshot
                </div>
                <div className={`p-3 ${themeKey === "classic" ? "border" : ""}`} style={ themeKey === "classic" ? { borderColor: THEMES.classic.classicBorderColor, borderRadius: 8, background: "#FBF7EE" } : {} }>
                  <StatusDistribution checkedIn={checkedInCount} checkedOut={checkedOutCount} absent={absentCount} />
                  <div className="mt-3 text-xs" style={{ color: currentTheme.text.secondary }}>
                    Quick view of current statuses.
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Filters and Controls */}
        <Card className={`${currentTheme.cardBorderClass} ${currentTheme.cardShadow} mb-6 ${currentTheme.cardBackground}`}>
          <CardContent className="p-6">
            <div className="flex flex-col lg:flex-row gap-6 items-start lg:items-end">
              <div className="w-full lg:w-64 space-y-2">
                <Label className="text-sm font-medium flex items-center gap-2" style={{ color: currentTheme.text.primary }}>
                  <CalendarDays className="h-4 w-4" />
                  View Date
                </Label>
                <Input
                  type="date"
                  value={currentDate}
                  onChange={handleDateChange}
                  className="h-10 border-gray-200 focus:border-blue-300"
                />
              </div>

              <div className="w-full lg:w-64 space-y-2">
                <Label className="text-sm font-medium flex items-center gap-2" style={{ color: currentTheme.text.primary }}>
                  <Filter className="h-4 w-4" />
                  Filter Status
                </Label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="h-10 border-gray-200 focus:border-blue-300">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="Checked In">Checked In</SelectItem>
                    <SelectItem value="Checked Out">Checked Out</SelectItem>
                    <SelectItem value="Absent">Absent</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="w-full space-y-2">
                <Label className="text-sm font-medium flex items-center gap-2" style={{ color: currentTheme.text.primary }}>
                  <Search className="h-4 w-4" />
                  Search Employees
                </Label>
                <Input
                  placeholder="Search by name or email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-10 border-gray-200 focus:border-blue-300"
                />
              </div>

              <div className="ml-auto">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setExpandedView(!expandedView)}
                  className="gap-1 border-gray-200 hover:bg-gray-50"
                  style={{ color: currentTheme.text.primary }}
                >
                  {expandedView ? (
                    <>
                      <ChevronUp className="h-4 w-4" />
                      Compact View
                    </>
                  ) : (
                    <>
                      <ChevronDown className="h-4 w-4" />
                      Expanded View
                    </>
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Error Alert */}
        {error && (
          <Alert variant="destructive" className="mb-6 bg-red-50 border-red-200">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>
              {error.includes("Permission denied")
                ? "You don't have admin privileges to view this data."
                : error}
            </AlertDescription>
          </Alert>
        )}

        {/* Attendance Table */}
        <Card className={`${currentTheme.cardBorderClass} ${currentTheme.cardShadow} ${currentTheme.cardBackground}`}>
          <div className="overflow-auto rounded-lg">
            <Table className="min-w-[1000px]">
              <TableHeader className="bg-gray-50">
                <TableRow className="border-gray-200 hover:bg-gray-100">
                  <TableHead className="min-w-[200px] font-semibold" style={{ color: currentTheme.text.primary }}>
                    Employee
                  </TableHead>
                  {expandedView && (
                    <TableHead className="min-w-[200px] font-semibold" style={{ color: currentTheme.text.primary }}>
                      Email
                    </TableHead>
                  )}
                  <TableHead className="w-[140px] font-semibold" style={{ color: currentTheme.text.primary }}>
                    Check-In
                  </TableHead>
                  <TableHead className="w-[140px] font-semibold" style={{ color: currentTheme.text.primary }}>
                    Check-Out
                  </TableHead>
                  <TableHead className="w-[140px] font-semibold" style={{ color: currentTheme.text.primary }}>
                    Status
                  </TableHead>
                  <TableHead className="w-[140px] font-semibold" style={{ color: currentTheme.text.primary }}>
                    Activity
                  </TableHead>
                  {expandedView && (
                    <TableHead className="w-[180px] font-semibold" style={{ color: currentTheme.text.primary }}>
                      Last Activity
                    </TableHead>
                  )}
                </TableRow>
              </TableHeader>

              <TableBody>
                {loading && filteredData.length === 0 ? (
                  Array(5)
                    .fill(0)
                    .map((_, index) => (
                      <TableRow key={index} className="border-gray-200">
                        <TableCell colSpan={expandedView ? 7 : 5}>
                          <div className="flex items-center space-x-4">
                            <Skeleton className="h-10 w-10 rounded-full" />
                            <Skeleton className="h-4 w-[150px]" />
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                ) : filteredData.length > 0 ? (
                  filteredData.map((employee) => (
                    <TableRow
                      key={`${employee.id}-${employee._key || refreshTrigger}`}
                      className="border-gray-200 hover:bg-gray-50 transition-colors"
                    >
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-9 w-9 border border-gray-200">
                            <AvatarImage src={employee.avatar} />
                            <AvatarFallback className="text-xs">
                              {employee.name
                                .split(" ")
                                .map((n) => n[0])
                                .join("")}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-medium" style={{ color: currentTheme.text.primary }}>
                              {employee.name}
                            </div>
                            {expandedView && (
                              <div className="text-sm" style={{ color: currentTheme.text.light }}>
                                {employee.email}
                              </div>
                            )}
                          </div>
                        </div>
                      </TableCell>

                      {expandedView && (
                        <TableCell style={{ color: currentTheme.text.secondary }}>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="line-clamp-1 cursor-help">
                                  {employee.email}
                                </span>
                              </TooltipTrigger>
                              <TooltipContent>{employee.email}</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </TableCell>
                      )}

                      <TableCell>
                        {employee.checkInTime ? (
                          <Badge
                            variant="outline"
                            className="font-normal gap-1 border-green-200 bg-green-50 text-green-700"
                          >
                            <LogIn className="h-3 w-3" />
                            {employee.checkInTime}
                          </Badge>
                        ) : (
                          <span style={{ color: currentTheme.text.light }}>-</span>
                        )}
                      </TableCell>

                      <TableCell>
                        {employee.checkOutTime ? (
                          <Badge
                            variant="outline"
                            className="font-normal gap-1 border-blue-200 bg-blue-50 text-blue-700"
                          >
                            <LogOut className="h-3 w-3" />
                            {employee.checkOutTime}
                          </Badge>
                        ) : (
                          <span style={{ color: currentTheme.text.light }}>-</span>
                        )}
                      </TableCell>

                      <TableCell>
                        <Badge
                          className="capitalize flex items-center gap-1.5 font-medium border-0"
                          style={{
                            backgroundColor:
                              employee.status === "Checked In"
                                ? "#B4DEBD"
                                : employee.status === "Checked Out"
                                ? "#91C4C3"
                                : "#F5B7B1",
                            color:
                              employee.status === "Checked In"
                                ? "#22543D"
                                : employee.status === "Checked Out"
                                ? "#234E52"
                                : "#742A2A",
                          }}
                        >
                          {employee.status === "Checked In" && (
                            <span className="h-2 w-2 rounded-full bg-green-600 animate-pulse" />
                          )}
                          {employee.status.toLowerCase()}
                        </Badge>
                      </TableCell>

                      <TableCell>
                        <Badge
                          variant={employee.isActive ? "default" : "secondary"}
                          className="flex items-center gap-1.5 font-medium border-0"
                          style={{
                            backgroundColor: employee.isActive ? "#B4DEBD" : "#E2E8F0",
                            color: employee.isActive ? "#22543D" : "#4A5568",
                          }}
                        >
                          {employee.isActive ? (
                            <>
                              <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                              Online
                            </>
                          ) : (
                            <>
                              <span className="h-2 w-2 rounded-full bg-gray-400" />
                              Offline
                            </>
                          )}
                        </Badge>
                      </TableCell>

                      {expandedView && (
                        <TableCell>
                          {employee.lastActivity ? (
                            <div className="text-sm" style={{ color: currentTheme.text.secondary }}>
                              {format(
                                new Date(employee.lastActivity),
                                "MMM d, h:mm a"
                              )}
                            </div>
                          ) : (
                            <span style={{ color: currentTheme.text.light }}>-</span>
                          )}
                        </TableCell>
                      )}
                    </TableRow>
                  ))
                ) : (
                  <TableRow className="border-gray-200">
                    <TableCell
                      colSpan={expandedView ? 7 : 5}
                      className="h-24 text-center"
                      style={{ color: currentTheme.text.secondary }}
                    >
                      {statusFilter === "all"
                        ? "No attendance records found for this date"
                        : `No employees with status "${statusFilter}" found`}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </Card>

        {/* Footer */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-2 mt-6 p-4 text-sm">
          <div style={{ color: currentTheme.text.secondary }}>
            Showing <span className="font-medium" style={{ color: currentTheme.text.primary }}>{filteredData.length}</span> of{" "}
            <span className="font-medium" style={{ color: currentTheme.text.primary }}>{attendanceData.length}</span> employees
          </div>
          <div className="flex items-center gap-2" style={{ color: currentTheme.text.secondary }}>
            <Clock className="h-4 w-4" />
            Last updated: <span className="font-medium" style={{ color: currentTheme.text.primary }}>{displayTime}</span>
          </div>
        </div>
      </div>
    </div>
  );
}