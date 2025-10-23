"use client";

import React, { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
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
  CheckCircle2,
  XCircle,
  Timer,
  User,
  Mail,
  LogIn,
  LogOut,
  Filter,
  CalendarDays,
  ChevronDown,
  ChevronUp,
  Search,
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
  _key?: string; // Add unique key for forcing re-renders
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
  const [refreshTrigger, setRefreshTrigger] = useState<number>(0); // Add refresh trigger

  // Format display time
  const displayTime = format(lastUpdated, "hh:mm:ss a");

  // Calculate summary statistics
  const totalEmployees = attendanceData.length;
  const checkedInCount = attendanceData.filter(
    (e) => e.status === "Checked In"
  ).length;
  const checkedOutCount = attendanceData.filter(
    (e) => e.status === "Checked Out"
  ).length;
  const absentCount = attendanceData.filter(
    (e) => e.status === "Absent"
  ).length;
  const activeNowCount = attendanceData.filter((e) => e.isActive).length;

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

      // Log the request for debugging
      console.log(`Fetching attendance data at ${timestamp} for date ${currentDate}`);

      const attendanceResponse = await fetch(
        `/api/admin/attendance?date=${currentDate}&t=${timestamp}&r=${random}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${idToken}`,
            "Cache-Control": "no-cache, no-store, must-revalidate",
            "Pragma": "no-cache",
            "Expires": "0"
          },
          cache: "no-store"
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
      
      // Log the raw response for debugging
      console.log("Raw API response:", attendanceResult);

      if (!attendanceResult?.attendance) {
        throw new Error("Invalid attendance data format");
      }

      const formattedData = attendanceResult.attendance.map((record: any) => {
        // Log each record for debugging
        console.log("Processing record:", record);
        
        let checkInTime = null;
        let checkOutTime = null;
        let recordDate = currentDate;

        // More robust date handling
        try {
          if (record.checkInTime) {
            // Try multiple date parsing approaches
            try {
              checkInTime = format(new Date(record.checkInTime), "hh:mm a");
            } catch (e) {
              try {
                checkInTime = format(parseISO(record.checkInTime), "hh:mm a");
              } catch (e2) {
                // If all parsing fails, just use the raw string
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
              } catch (e2) {
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
              } catch (e2) {
                recordDate = currentDate;
              }
            }
          }
        } catch (e) {
          console.error("Date parsing error:", e);
        }

        // Determine status more reliably
        let status = "Absent";
        if (record.status) {
          // Use status from API if available
          status = record.status;
        } else if (record.checkOutTime) {
          status = "Checked Out";
        } else if (record.checkInTime) {
          status = "Checked In";
        }

        const userId = record.userId || record.id;
        const nameParts = (
          record.userName ||
          record.name ||
          record.email.split("@")[0]
        ).split(" ");
        const initials =
          nameParts.length >= 2
            ? `${nameParts[0][0]}${nameParts[nameParts.length - 1][0]}`
            : nameParts[0][0];

        // Determine activity status based on check-in/check-out
        const isActive = Boolean(record.isActive) || 
                        (Boolean(record.checkInTime) && !record.checkOutTime);

        return {
          id: userId,
          name: record.userName || record.name || record.email.split("@")[0],
          email: record.email,
          checkInTime,
          checkOutTime,
          status,
          date: recordDate,
          isActive,
          lastActivity: record.lastActive || null,
          avatar: `https://ui-avatars.com/api/?name=${initials}&background=random`,
          _key: `${timestamp}-${random}` // Add unique key for forcing re-renders
        };
      });

      // Log the formatted data for debugging
      console.log("Formatted data:", formattedData);

      const sortedData = formattedData.sort(
        (a: EmployeeRecord, b: EmployeeRecord) => {
          const statusOrder = { "Checked In": 0, "Checked Out": 1, Absent: 2 };
          return (
            statusOrder[a.status] - statusOrder[b.status] ||
            a.name.localeCompare(b.name)
          );
        }
      );

      setAttendanceData(sortedData);
      setLastUpdated(new Date());
      setRefreshTrigger(prev => prev + 1); // Increment refresh trigger
    } catch (error) {
      setError(error instanceof Error ? error.message : "Unknown error");
      console.error("Fetch error:", error);
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  // Auth state listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setAuthInitialized(true);
    });
    return () => unsubscribe();
  }, []);

  // Data fetching and auto-refresh
  useEffect(() => {
    if (!authInitialized || !user) return;

    console.log("Fetching data due to dependency change");
    fetchAttendanceData();

    if (autoRefresh) {
      console.log("Setting up auto-refresh interval");
      const interval = setInterval(() => {
        console.log("Auto-refresh triggered");
        fetchAttendanceData(false);
      }, 2000); // Reduce to 2 seconds for more frequent updates

      return () => {
        console.log("Clearing interval");
        clearInterval(interval);
      };
    }
  }, [currentDate, autoRefresh, authInitialized, user]); // Don't include lastUpdated to avoid infinite loops

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
      <div className="flex justify-center items-center min-h-screen">
        <div className="space-y-4 w-full max-w-7xl px-4">
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
      <div className="p-6 max-w-md mx-auto">
        <Alert variant="destructive">
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
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Employee Attendance
          </h1>
          <p className="text-muted-foreground">
            Monitor and manage employee attendance in real-time
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={loading}
            className="gap-1"
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
                  className="gap-1 data-[state=on]:bg-green-50 data-[state=on]:text-green-600"
                >
                  <Clock
                    className={`h-4 w-4 ${autoRefresh ? "animate-pulse" : ""}`}
                  />
                </Toggle>
              </TooltipTrigger>
              <TooltipContent>
                {autoRefresh
                  ? "Auto-refresh enabled"
                  : "Click to enable auto-refresh"}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Total Employees
                </p>
                <h3 className="text-2xl font-bold mt-1">{totalEmployees}</h3>
              </div>
              <div className="bg-blue-100 p-3 rounded-full">
                <User className="h-5 w-5 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Checked In
                </p>
                <h3 className="text-2xl font-bold mt-1">{checkedInCount}</h3>
                <Progress
                  value={(checkedInCount / totalEmployees) * 100}
                  className="h-2 mt-2 bg-green-100"
                  style={{
                    backgroundColor: "#eff6ff", // blue-50 equivalent
                    ["--progress-indicator-color" as any]: "#3b82f6", // blue-500 equivalent
                  }}
                />
              </div>
              <div className="bg-green-100 p-3 rounded-full">
                <LogIn className="h-5 w-5 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Checked Out
                </p>
                <h3 className="text-2xl font-bold mt-1">{checkedOutCount}</h3>
                <Progress
                  value={(checkedOutCount / totalEmployees) * 100}
                  className="h-2 mt-2 bg-blue-100"
                  style={{
                    backgroundColor: "#f5f3ff", // purple-50 equivalent
                    ["--progress-indicator-color" as any]: "#8b5cf6", // purple-500 equivalent
                  }}
                />
              </div>
              <div className="bg-blue-100 p-3 rounded-full">
                <LogOut className="h-5 w-5 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Active Now
                </p>
                <h3 className="text-2xl font-bold mt-1">{activeNowCount}</h3>
                <Progress
                  value={(activeNowCount / totalEmployees) * 100}
                  className="h-2 mt-2 bg-purple-100"
                  style={{
                    backgroundColor: "#f5f3ff", // purple-50 equivalent
                    ["--progress-indicator-color" as any]: "#8b5cf6", // purple-500 equivalent
                  }}
                />
              </div>
              <div className="bg-purple-100 p-3 rounded-full">
                <Timer className="h-5 w-5 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Controls */}
      <Card className="shadow-sm">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4 items-start md:items-end">
            <div className="w-full md:w-64 space-y-1">
              <Label className="text-sm flex items-center gap-2">
                <CalendarDays className="h-4 w-4" />
                View Date
              </Label>
              <Input
                type="date"
                value={currentDate}
                onChange={handleDateChange}
                className="h-10"
              />
            </div>

            <div className="w-full md:w-64 space-y-1">
              <Label className="text-sm flex items-center gap-2">
                <Filter className="h-4 w-4" />
                Filter Status
              </Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-10">
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

            <div className="w-full space-y-1">
              <Label className="text-sm flex items-center gap-2">
                <Search className="h-4 w-4" />
                Search Employees
              </Label>
              <Input
                placeholder="Search by name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-10"
              />
            </div>

            <div className="ml-auto">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setExpandedView(!expandedView)}
                className="gap-1 text-muted-foreground"
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

      {error && (
        <Alert variant="destructive" className="mx-auto max-w-4xl">
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
      <Card className="shadow-sm">
        <div className="overflow-auto rounded-lg">
          <Table className="min-w-[1000px]">
            <TableHeader className="bg-gray-50 dark:bg-gray-800">
              <TableRow>
                <TableHead className="min-w-[200px]">Employee</TableHead>
                {expandedView && (
                  <TableHead className="min-w-[200px]">Email</TableHead>
                )}
                <TableHead className="w-[140px]">Check-In</TableHead>
                <TableHead className="w-[140px]">Check-Out</TableHead>
                <TableHead className="w-[140px]">Status</TableHead>
                <TableHead className="w-[140px]">Activity</TableHead>
                {expandedView && (
                  <TableHead className="w-[180px]">Last Activity</TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && filteredData.length === 0 ? (
                Array(5)
                  .fill(0)
                  .map((_, index) => (
                    <TableRow key={index}>
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
                    className={
                      employee.status === "Checked In"
                        ? "bg-green-50/50 hover:bg-green-100/50"
                        : employee.status === "Checked Out"
                        ? "hover:bg-blue-50/50"
                        : "hover:bg-muted/50"
                    }
                  >
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9">
                          <AvatarImage src={employee.avatar} />
                          <AvatarFallback>
                            {employee.name
                              .split(" ")
                              .map((n) => n[0])
                              .join("")}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium">{employee.name}</div>
                          {expandedView && (
                            <div className="text-sm text-muted-foreground">
                              {employee.email}
                            </div>
                          )}
                        </div>
                      </div>
                    </TableCell>

                    {expandedView && (
                      <TableCell className="text-muted-foreground">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="line-clamp-1">
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
                        <Badge variant="outline" className="font-normal gap-1">
                          <LogIn className="h-3 w-3" />
                          {employee.checkInTime}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>

                    <TableCell>
                      {employee.checkOutTime ? (
                        <Badge variant="outline" className="font-normal gap-1">
                          <LogOut className="h-3 w-3" />
                          {employee.checkOutTime}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>

                    <TableCell>
                      <Badge
                        variant={
                          employee.status === "Checked In"
                            ? "success"
                            : employee.status === "Checked Out"
                            ? "default"
                            : "destructive"
                        }
                        className="capitalize flex items-center gap-1.5"
                      >
                        {employee.status === "Checked In" && (
                          <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                        )}
                        {employee.status.toLowerCase()}
                      </Badge>
                    </TableCell>

                    <TableCell>
                      <Badge
                        variant={employee.isActive ? "default" : "secondary"}
                        className="flex items-center gap-1.5"
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
                          <div className="text-sm text-muted-foreground">
                            {format(
                              new Date(employee.lastActivity),
                              "MMM d, h:mm a"
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                    )}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={expandedView ? 7 : 5}
                    className="h-24 text-center"
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
      <div className="flex flex-col md:flex-row justify-between items-center gap-2 text-sm text-muted-foreground">
        <div>
          Showing <span className="font-medium">{filteredData.length}</span> of{" "}
          <span className="font-medium">{attendanceData.length}</span> employees
        </div>
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4" />
          Last updated: {displayTime}
        </div>
      </div>
    </div>
  );
}