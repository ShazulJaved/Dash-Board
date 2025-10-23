"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableCell,
  TableHead,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar } from "@/components/ui/calendar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { auth } from "@/lib/firebase/firebase";
import { useAuthState } from "react-firebase-hooks/auth";
import { useRouter } from "next/navigation";
import {
  Loader2,
  Calendar as CalendarIcon,
  BarChart,
  Users,
  Download,
  RefreshCw,
  FileBarChart,
  UserCheck,
  UserX,
  Clock,
  AlertCircle,
} from "lucide-react";
import { format, startOfMonth, endOfMonth, subMonths } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

interface User {
  uid: string;
  displayName: string;
  email: string;
}

interface AttendanceRecord {
  id: string;
  userId: string;
  date: Date;
  checkIn: string;
  checkOut: string | null;
  status: "Present" | "Late" | "Absent";
}

interface UserAttendanceSummary {
  userId: string;
  displayName: string;
  email: string;
  present: number;
  late: number;
  absent: number;
  total: number;
  percentage: number;
}

export default function AttendanceReports() {
  const [currentUser, authLoading] = useAuthState(auth);
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [dailyAttendance, setDailyAttendance] = useState<AttendanceRecord[]>(
    []
  );
  const [monthlySummary, setMonthlySummary] = useState<UserAttendanceSummary[]>(
    []
  );
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedMonth, setSelectedMonth] = useState<Date>(new Date());
  const [activeTab, setActiveTab] = useState("daily");
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [refreshing, setRefreshing] = useState(false);

  // Check authentication and admin status
  useEffect(() => {
    if (!currentUser && !authLoading) {
      router.push("/auth/sign-in");
      return;
    }
  }, [currentUser, authLoading, router]);

  // Fetch data via API
  const fetchData = async (type: "daily" | "monthly") => {
    if (!currentUser) return;

    try {
      setLoading(true);
      setError(null);

      // Get ID token for authorization
      const idToken = await currentUser.getIdToken(true);

      if (type === "daily") {
        // Fetch daily attendance data
        const formattedDate = format(selectedDate, "yyyy-MM-dd");
        const response = await fetch(
          `/api/admin/reports/daily?date=${formattedDate}`,
          {
            headers: {
              Authorization: `Bearer ${idToken}`,
            },
          }
        );

        if (!response.ok) {
          throw new Error(`Failed to fetch daily report: ${response.status}`);
        }

        const data = await response.json();
        setDailyAttendance(
          data.attendance.map((record: any) => ({
            ...record,
            date: new Date(record.date),
          }))
        );
        setUsers(data.users);
      } else {
        // Fetch monthly attendance data
        const formattedMonth = format(selectedMonth, "yyyy-MM");
        const response = await fetch(
          `/api/admin/reports/monthly?month=${formattedMonth}`,
          {
            headers: {
              Authorization: `Bearer ${idToken}`,
            },
          }
        );

        if (!response.ok) {
          throw new Error(`Failed to fetch monthly report: ${response.status}`);
        }

        const data = await response.json();
        setMonthlySummary(data.summary);
        setUsers(data.users);
      }

      setLastUpdated(new Date());
    } catch (err: any) {
      console.error(`Error fetching ${type} report:`, err);
      setError(err.message || `Failed to load ${type} report`);
      toast({
        variant: "destructive",
        title: "Error",
        description: err.message || `Failed to load ${type} report`,
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Initial data fetch
  useEffect(() => {
    if (currentUser) {
      fetchData(activeTab as "daily" | "monthly");
    }
  }, [currentUser, selectedDate, selectedMonth, activeTab]);

  const handleDateChange = (date: Date | undefined) => {
    if (date) {
      setSelectedDate(date);
    }
  };

  const handleMonthChange = (month: string) => {
    const [year, monthIndex] = month.split("-").map(Number);
    const date = new Date(year, monthIndex - 1);
    setSelectedMonth(date);
  };

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    fetchData(value as "daily" | "monthly");
  };

  const refreshData = () => {
    setRefreshing(true);
    fetchData(activeTab as "daily" | "monthly");
  };

  const exportToCSV = (type: "daily" | "monthly") => {
    try {
      let csvContent = "";
      let filename = "";

      if (type === "daily") {
        // Create CSV header
        csvContent = "Name,Email,Check-In Time,Check-Out Time,Status\n";

        // Add data rows
        dailyAttendance.forEach((record) => {
          const user = users.find((u) => u.uid === record.userId);
          if (user) {
            csvContent += `"${user.displayName}","${user.email}","${
              record.checkIn || ""
            }","${record.checkOut || ""}","${record.status}"\n`;
          }
        });

        filename = `daily-attendance-${format(selectedDate, "yyyy-MM-dd")}.csv`;
      } else {
        // Create CSV header
        csvContent =
          "Name,Email,Present Days,Late Days,Absent Days,Attendance Percentage\n";

        // Add data rows
        monthlySummary.forEach((summary) => {
          csvContent += `"${summary.displayName}","${summary.email}",${summary.present},${summary.late},${summary.absent},${summary.percentage}%\n`;
        });

        filename = `monthly-attendance-${format(selectedMonth, "yyyy-MM")}.csv`;
      }

      // Create download link
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", filename);
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast({
        title: "Export Successful",
        description: `Attendance data exported to ${filename}`,
      });
    } catch (error) {
      console.error("Error exporting data:", error);
      toast({
        variant: "destructive",
        title: "Export Failed",
        description: "Failed to export attendance data",
      });
    }
  };

  if (authLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6 max-w-7xl mx-auto">
      <Card className="shadow-sm">
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-2xl font-bold flex items-center gap-2">
                <FileBarChart className="h-6 w-6 text-primary" />
                Attendance Reports
              </CardTitle>
              <CardDescription>
                View and analyze employee attendance records
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={refreshData}
                disabled={refreshing || loading}
              >
                <RefreshCw
                  className={`h-4 w-4 mr-2 ${refreshing ? "animate-spin" : ""}`}
                />
                Refresh
              </Button>
              <div className="text-xs text-muted-foreground">
                Last updated: {format(lastUpdated, "h:mm:ss a")}
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="bg-destructive/10 text-destructive p-4 rounded-md mb-4">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5" />
                <p className="font-medium">Error loading report</p>
              </div>
              <p className="text-sm mt-1">{error}</p>
              <Button
                variant="outline"
                size="sm"
                onClick={refreshData}
                className="mt-2"
              >
                Try Again
              </Button>
            </div>
          )}

          <Tabs
            defaultValue="daily"
            value={activeTab}
            onValueChange={handleTabChange}
          >
            <TabsList className="mb-6 grid grid-cols-2 w-full md:w-[400px]">
              <TabsTrigger value="daily" className="flex items-center gap-2">
                <CalendarIcon className="h-4 w-4" />
                Daily Report
              </TabsTrigger>
              <TabsTrigger value="monthly" className="flex items-center gap-2">
                <BarChart className="h-4 w-4" />
                Monthly Summary
              </TabsTrigger>
            </TabsList>

            <TabsContent value="daily" className="space-y-6">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-muted/30 p-4 rounded-lg">
                <div className="flex flex-col">
                  <h3 className="text-lg font-medium">Daily Attendance</h3>
                  <p className="text-sm text-muted-foreground">
                    {format(selectedDate, "EEEE, MMMM d, yyyy")}
                  </p>
                </div>

                <div className="flex flex-col md:flex-row gap-4">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={handleDateChange}
                    className="rounded-md border bg-white shadow-sm"
                  />

                  <Button
                    variant="outline"
                    onClick={() => exportToCSV("daily")}
                    className="flex items-center gap-2 h-10 self-end"
                    disabled={loading || dailyAttendance.length === 0}
                  >
                    <Download className="h-4 w-4" />
                    Export CSV
                  </Button>
                </div>
              </div>

              {loading ? (
                <div className="space-y-2">
                  {Array(5)
                    .fill(0)
                    .map((_, i) => (
                      <Skeleton key={i} className="h-12 w-full" />
                    ))}
                </div>
              ) : (
                <div className="rounded-md border overflow-hidden">
                  <Table>
                    <TableHeader className="bg-muted/50">
                      <TableRow>
                        <TableHead className="w-[250px]">Employee</TableHead>
                        <TableHead className="hidden md:table-cell">
                          Email
                        </TableHead>
                        <TableHead>Check-In</TableHead>
                        <TableHead>Check-Out</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {dailyAttendance.length > 0 ? (
                        dailyAttendance.map((record) => {
                          const user = users.find(
                            (u) => u.uid === record.userId
                          );
                          return (
                            <TableRow
                              key={record.id}
                              className={
                                record.status === "Present"
                                  ? "bg-green-50"
                                  : record.status === "Late"
                                  ? "bg-yellow-50"
                                  : "bg-red-50/30"
                              }
                            >
                              <TableCell className="font-medium">
                                {user?.displayName || "Unknown"}
                              </TableCell>
                              <TableCell className="hidden md:table-cell text-muted-foreground">
                                {user?.email || "Unknown"}
                              </TableCell>
                              <TableCell>
                                {record.checkIn ? (
                                  <div className="flex items-center gap-2">
                                    <Clock className="h-4 w-4 text-green-500" />
                                    {record.checkIn}
                                  </div>
                                ) : (
                                  <span className="text-muted-foreground">
                                    Not checked in
                                  </span>
                                )}
                              </TableCell>
                              <TableCell>
                                {record.checkOut ? (
                                  <div className="flex items-center gap-2">
                                    <Clock className="h-4 w-4 text-blue-500" />
                                    {record.checkOut}
                                  </div>
                                ) : (
                                  <span className="text-muted-foreground">
                                    Not checked out
                                  </span>
                                )}
                              </TableCell>
                              <TableCell>
                                <Badge
                                  variant={
                                    record.status === "Present"
                                      ? "success"
                                      : record.status === "Late"
                                      ? "warning"
                                      : "destructive"
                                  }
                                >
                                  {record.status === "Present" ? (
                                    <UserCheck className="h-3 w-3 mr-1" />
                                  ) : record.status === "Late" ? (
                                    <Clock className="h-3 w-3 mr-1" />
                                  ) : (
                                    <UserX className="h-3 w-3 mr-1" />
                                  )}
                                  {record.status}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          );
                        })
                      ) : (
                        <TableRow>
                          <TableCell colSpan={5} className="h-24 text-center">
                            <div className="flex flex-col items-center gap-2 text-muted-foreground">
                              <CalendarIcon className="h-8 w-8 opacity-40" />
                              <p>No attendance records found for this date</p>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}
            </TabsContent>

            <TabsContent value="monthly" className="space-y-6">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-muted/30 p-4 rounded-lg">
                <div className="flex flex-col">
                  <h3 className="text-lg font-medium">Monthly Summary</h3>
                  <p className="text-sm text-muted-foreground">
                    {format(selectedMonth, "MMMM yyyy")}
                  </p>
                </div>

                <div className="flex flex-col md:flex-row gap-4">
                  <Select
                    value={format(selectedMonth, "yyyy-MM")}
                    onValueChange={handleMonthChange}
                  >
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Select month" />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 12 }, (_, i) => {
                        const date = subMonths(new Date(), i);
                        return (
                          <SelectItem key={i} value={format(date, "yyyy-MM")}>
                            {format(date, "MMMM yyyy")}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>

                  <Button
                    variant="outline"
                    onClick={() => exportToCSV("monthly")}
                    className="flex items-center gap-2"
                    disabled={loading || monthlySummary.length === 0}
                  >
                    <Download className="h-4 w-4" />
                    Export CSV
                  </Button>
                </div>
              </div>

              {loading ? (
                <div className="space-y-2">
                  {Array(5)
                    .fill(0)
                    .map((_, i) => (
                      <Skeleton key={i} className="h-12 w-full" />
                    ))}
                </div>
              ) : (
                <div className="rounded-md border overflow-hidden">
                  <Table>
                    <TableHeader className="bg-muted/50">
                      <TableRow>
                        <TableHead className="w-[250px]">Employee</TableHead>
                        <TableHead className="hidden md:table-cell">
                          Email
                        </TableHead>
                        <TableHead>Present</TableHead>
                        <TableHead>Late</TableHead>
                        <TableHead>Absent</TableHead>
                        <TableHead className="w-[180px]">Attendance</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {monthlySummary.length > 0 ? (
                        monthlySummary.map((summary) => (
                          <TableRow
                            key={summary.userId}
                            className={
                              summary.percentage >= 90
                                ? "bg-green-50/50"
                                : summary.percentage >= 75
                                ? "bg-blue-50/50"
                                : summary.percentage >= 50
                                ? "bg-yellow-50/50"
                                : "bg-red-50/30"
                            }
                          >
                            <TableCell className="font-medium">
                              {summary.displayName}
                            </TableCell>
                            <TableCell className="hidden md:table-cell text-muted-foreground">
                              {summary.email}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="bg-green-50">
                                {summary.present}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="bg-yellow-50">
                                {summary.late}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="bg-red-50">
                                {summary.absent}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Progress
                                  value={summary.percentage}
                                  className="h-2 w-[100px]"
                                  // Replace indicatorClassName with proper className styling
                                  style={
                                    {
                                      "--progress-background":
                                        summary.percentage >= 90
                                          ? "var(--green-500)"
                                          : summary.percentage >= 75
                                          ? "var(--blue-500)"
                                          : summary.percentage >= 50
                                          ? "var(--yellow-500)"
                                          : "var(--red-500)",
                                    } as React.CSSProperties
                                  }
                                />
                                <span className="text-sm font-medium">
                                  {summary.percentage}%
                                </span>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={6} className="h-24 text-center">
                            <div className="flex flex-col items-center gap-2 text-muted-foreground">
                              <BarChart className="h-8 w-8 opacity-40" />
                              <p>No attendance records found for this month</p>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                <Card className="bg-white">
                  <CardContent className="pt-6">
                    <div className="flex flex-col items-center text-center">
                      <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center mb-2">
                        <Users className="h-6 w-6 text-blue-600" />
                      </div>
                      <h4 className="font-medium text-muted-foreground">
                        Total Employees
                      </h4>
                      <p className="text-3xl font-bold">{users.length}</p>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-white">
                  <CardContent className="pt-6">
                    <div className="flex flex-col items-center text-center">
                      <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center mb-2">
                        <UserCheck className="h-6 w-6 text-green-600" />
                      </div>
                      <h4 className="font-medium text-muted-foreground">
                        Average Attendance
                      </h4>
                      <p className="text-3xl font-bold">
                        {monthlySummary.length > 0
                          ? Math.round(
                              monthlySummary.reduce(
                                (sum, user) => sum + user.percentage,
                                0
                              ) / monthlySummary.length
                            )
                          : 0}
                        %
                      </p>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-white">
                  <CardContent className="pt-6">
                    <div className="flex flex-col items-center text-center">
                      <div className="h-12 w-12 rounded-full bg-red-100 flex items-center justify-center mb-2">
                        <UserX className="h-6 w-6 text-red-600" />
                      </div>
                      <h4 className="font-medium text-muted-foreground">
                        Total Absences
                      </h4>
                      <p className="text-3xl font-bold">
                        {monthlySummary.reduce(
                          (sum, user) => sum + user.absent,
                          0
                        )}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
        <CardFooter className="border-t bg-muted/10 flex justify-between text-sm text-muted-foreground">
          <div>
            {activeTab === "daily"
              ? `Showing ${dailyAttendance.length} attendance records`
              : `Showing ${monthlySummary.length} employee summaries`}
          </div>
          <div>Report generated on {format(new Date(), "PPP")}</div>
        </CardFooter>
      </Card>
    </div>
  );
}
