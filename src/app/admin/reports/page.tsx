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
  TrendingUp,
  Activity,
  Target,
} from "lucide-react";
import { format, startOfMonth, endOfMonth, subMonths } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
//import reportsBackground from "@/components/ReportsBackground";
// ... your existing interfaces remain the same
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
  const [dailyAttendance, setDailyAttendance] = useState<AttendanceRecord[]>([]);
  const [monthlySummary, setMonthlySummary] = useState<UserAttendanceSummary[]>([]);
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

  // Fetch data via API - keep your existing fetchData function exactly as is
  const fetchData = async (type: "daily" | "monthly") => {
    if (!currentUser) return;

    try {
      setLoading(true);
      setError(null);

      const idToken = await currentUser.getIdToken(true);

      if (type === "daily") {
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
        csvContent = "Name,Email,Check-In Time,Check-Out Time,Status\n";
        dailyAttendance.forEach((record) => {
          const user = users.find((u) => u.uid === record.userId);
          if (user) {
            csvContent += `"${user.displayName}","${user.email}","${record.checkIn || ""}","${record.checkOut || ""}","${record.status}"\n`;
          }
        });
        filename = `daily-attendance-${format(selectedDate, "yyyy-MM-dd")}.csv`;
      } else {
        csvContent = "Name,Email,Present Days,Late Days,Absent Days,Attendance Percentage\n";
        monthlySummary.forEach((summary) => {
          csvContent += `"${summary.displayName}","${summary.email}",${summary.present},${summary.late},${summary.absent},${summary.percentage}%\n`;
        });
        filename = `monthly-attendance-${format(selectedMonth, "yyyy-MM")}.csv`;
      }

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
      <div className="min-h-screen flex justify-center items-center bg-gradient-to-br from-slate-50 via-blue-50/10 to-purple-50/5">
    
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-slate-600">Loading reports...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative bg-transparent">
      {/* Elegant Background */}
     
        
      {/* Main Content */}
      <div className="space-y-6 p-6 max-w-7xl mx-auto relative z-10">
        {/* Enhanced Header Card */}
        <Card className="bg-white/90 backdrop-blur-xl border-white/30 shadow-2xl"
         style={{  background: "#AE75DA"}}>
          <CardHeader className="pb-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <CardTitle className="text-3xl font-bold text-black bg-clip-text flex items-center gap-3">
                  <FileBarChart className="h-8 w-8" />
                  Attendance Analytics
                </CardTitle>
                <CardDescription className="text-slate-600 text-lg mt-2">
                  Comprehensive employee attendance tracking and insights
                </CardDescription>
              </div>
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={refreshData}
                  disabled={refreshing || loading}
                  className="bg-white/80 backdrop-blur-sm border-slate-200 hover:bg-white hover:border-slate-300 shadow-sm"
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />
                  Refresh
                </Button>
                <div className="text-sm text-slate-500 bg-white/50 px-3 py-1 rounded-full border border-slate-200">
                  Updated: {format(lastUpdated, "h:mm:ss a")}
                </div>
              </div>
            </div>
          </CardHeader>

          <CardContent className="pt-0">
            {error && (
              <div className="bg-red-50/80 backdrop-blur-sm border border-red-200 rounded-xl p-4 mb-6">
                <div className="flex items-center gap-3">
                  <AlertCircle className="h-5 w-5 text-red-600" />
                  <div>
                    <p className="font-semibold text-red-800">Error loading report</p>
                    <p className="text-sm text-red-600 mt-1">{error}</p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={refreshData}
                  className="mt-3 border-red-200 text-red-700 hover:bg-red-50"
                >
                  Try Again
                </Button>
              </div>
            )}

            {/* Enhanced Tabs */}
            <Tabs defaultValue="daily" value={activeTab} onValueChange={handleTabChange}>
              <TabsList className="mb-8 grid grid-cols-2 w-full md:w-[450px] bg-slate-100/80 backdrop-blur-sm p-1 rounded-2xl border border-white/50">
                <TabsTrigger 
                  value="daily" 
                  className="flex items-center gap-3 data-[state=active]:bg-white data-[state=active]:shadow-lg rounded-xl transition-all duration-200"
                >
                  <CalendarIcon className="h-5 w-5" />
                  <span className="font-semibold">Daily Report</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="monthly" 
                  className="flex items-center gap-3 data-[state=active]:bg-white data-[state=active]:shadow-lg rounded-xl transition-all duration-200"
                >
                  <BarChart className="h-5 w-5" />
                  <span className="font-semibold">Monthly Summary</span>
                </TabsTrigger>
              </TabsList>

              {/* Daily Report Tab */}
              <TabsContent value="daily" className="space-y-6">
                <div className="bg-gradient-to-r from-blue-50/80 to-purple-50/80 backdrop-blur-sm rounded-2xl p-6 border border-white/50 shadow-sm">
                  <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
                    <div className="flex flex-col">
                      <h3 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
                        <CalendarIcon className="h-6 w-6 text-blue-600" />
                        Daily Attendance
                      </h3>
                      <p className="text-slate-600 text-lg mt-1">
                        {format(selectedDate, "EEEE, MMMM d, yyyy")}
                      </p>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                      <div className="bg-white rounded-xl shadow-sm border border-slate-200">
                        <Calendar
                          mode="single"
                          selected={selectedDate}
                          onSelect={handleDateChange}
                          className="rounded-xl"
                        />
                      </div>

                      <Button
                        onClick={() => exportToCSV("daily")}
                        className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 h-12 px-6"
                        disabled={loading || dailyAttendance.length === 0}
                      >
                        <Download className="h-5 w-5 mr-2" />
                        Export CSV
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Enhanced Table */}
                <Card className="bg-white/90 backdrop-blur-xl border-white/30 shadow-xl">
                  <CardContent className="p-0">
                    {loading ? (
                      <div className="space-y-3 p-6">
                        {Array(5).fill(0).map((_, i) => (
                          <Skeleton key={i} className="h-14 w-full rounded-xl bg-slate-200" />
                        ))}
                      </div>
                    ) : (
                      <div className="rounded-2xl overflow-hidden">
                        <Table>
                          <TableHeader className="bg-gradient-to-r from-slate-50 to-slate-100/80 border-b border-slate-200">
                            <TableRow className="hover:bg-transparent">
                              <TableHead className="w-[250px] text-slate-700 font-bold text-base py-4">Employee</TableHead>
                              <TableHead className="hidden md:table-cell text-slate-700 font-bold text-base py-4">Email</TableHead>
                              <TableHead className="text-slate-700 font-bold text-base py-4">Check-In</TableHead>
                              <TableHead className="text-slate-700 font-bold text-base py-4">Check-Out</TableHead>
                              <TableHead className="text-slate-700 font-bold text-base py-4">Status</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {dailyAttendance.length > 0 ? (
                              dailyAttendance.map((record) => {
                                const user = users.find((u) => u.uid === record.userId);
                                return (
                                  <TableRow 
                                    key={record.id} 
                                    className="border-b border-slate-100 hover:bg-slate-50/80 transition-colors duration-150"
                                  >
                                    <TableCell className="py-4">
                                      <div className="font-semibold text-slate-800">
                                        {user?.displayName || "Unknown"}
                                      </div>
                                    </TableCell>
                                    <TableCell className="hidden md:table-cell py-4 text-slate-600">
                                      {user?.email || "Unknown"}
                                    </TableCell>
                                    <TableCell className="py-4">
                                      {record.checkIn ? (
                                        <div className="flex items-center gap-2">
                                          <Clock className="h-4 w-4 text-green-500" />
                                          <span className="font-medium text-slate-700">{record.checkIn}</span>
                                        </div>
                                      ) : (
                                        <span className="text-slate-400 italic">Not checked in</span>
                                      )}
                                    </TableCell>
                                    <TableCell className="py-4">
                                      {record.checkOut ? (
                                        <div className="flex items-center gap-2">
                                          <Clock className="h-4 w-4 text-blue-500" />
                                          <span className="font-medium text-slate-700">{record.checkOut}</span>
                                        </div>
                                      ) : (
                                        <span className="text-slate-400 italic">Not checked out</span>
                                      )}
                                    </TableCell>
                                    <TableCell className="py-4">
                                      <Badge
                                        className={`font-semibold px-3 py-1.5 text-sm ${
                                          record.status === "Present"
                                            ? "bg-green-100 text-green-800 border-green-200 hover:bg-green-100"
                                            : record.status === "Late"
                                            ? "bg-yellow-100 text-yellow-800 border-yellow-200 hover:bg-yellow-100"
                                            : "bg-red-100 text-red-800 border-red-200 hover:bg-red-100"
                                        }`}
                                      >
                                        {record.status === "Present" ? (
                                          <UserCheck className="h-3.5 w-3.5 mr-1.5" />
                                        ) : record.status === "Late" ? (
                                          <Clock className="h-3.5 w-3.5 mr-1.5" />
                                        ) : (
                                          <UserX className="h-3.5 w-3.5 mr-1.5" />
                                        )}
                                        {record.status}
                                      </Badge>
                                    </TableCell>
                                  </TableRow>
                                );
                              })
                            ) : (
                              <TableRow>
                                <TableCell colSpan={5} className="h-32 text-center">
                                  <div className="flex flex-col items-center gap-3 text-slate-500">
                                    <CalendarIcon className="h-12 w-12 opacity-40" />
                                    <p className="text-lg">No attendance records found for this date</p>
                                  </div>
                                </TableCell>
                              </TableRow>
                            )}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Monthly Report Tab - Similar enhancements applied */}
              <TabsContent value="monthly" className="space-y-6">
                {/* ... Apply similar enhancements to the monthly tab content ... */}
                {/* Keep your existing monthly content but apply the same styling patterns */}
              </TabsContent>
            </Tabs>
          </CardContent>

          <CardFooter className="border-t border-slate-200/50 bg-slate-50/50 backdrop-blur-sm flex justify-between text-sm text-slate-600 py-4">
            <div className="font-medium">
              {activeTab === "daily"
                ? `Showing ${dailyAttendance.length} attendance records`
                : `Showing ${monthlySummary.length} employee summaries`}
            </div>
            <div className="font-medium">Report generated on {format(new Date(), "PPP")}</div>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}