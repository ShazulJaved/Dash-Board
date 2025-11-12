"use client";

import { useEffect, useState, useCallback } from "react";
import { auth } from "@/lib/firebase/firebase";
import { useAuthState } from "react-firebase-hooks/auth";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Calendar,
  Clock,
  FileText,
  Plus,
  AlertCircle,
  User,
  RefreshCw,
  CheckCircle,
  XCircle,
  Download,
  Loader2,
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { LeaveBalance } from "@/types/attendance";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { format, differenceInDays, addDays } from "date-fns";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Timestamp } from "firebase/firestore";

interface LeaveRequest {
  id: string;
  userId: string;
  userName: string;
  leaveType: "sick" | "annual" | "emergency";
  startDate: string;
  endDate: string;
  reason: string;
  status: "pending" | "approved" | "rejected";
  approvedBy?: string;
  approvedAt?: string;
  createdAt: string;
  reportingManagerId?: string;
  reportingManagerName?: string;
  documents?: string[];
  numberOfDays: number;
}

interface DocumentRequest {
  id: string;
  userId: string;
  userName: string;
  documentType: string;
  reason: string;
  status: "pending" | "approved" | "rejected";
  approvedBy?: string;
  approvedAt?: string;
  createdAt: string;
  documentUrl?: string;
}

interface UserProfile {
  displayName: string;
  email: string;
  reportingManager?: string;
  reportingManagerId?: string;
  role: string;
}

export default function LeaveRequestsPage() {
  const [user, authLoading, authError] = useAuthState(auth);
  const [leaveBalance, setLeaveBalance] = useState<LeaveBalance>({
    sickLeave: 0,
    annualLeave: 0,
    emergencyLeave: 0,
  } as LeaveBalance);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [documentRequests, setDocumentRequests] = useState<DocumentRequest[]>(
    []
  );
  const [isLeaveDialogOpen, setIsLeaveDialogOpen] = useState(false);
  const [isDocDialogOpen, setIsDocDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("leave-requests");
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [selectedRequest, setSelectedRequest] = useState<LeaveRequest | null>(
    null
  );
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  // Form states
  const [leaveType, setLeaveType] = useState<"sick" | "annual" | "emergency">(
    "sick"
  );
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reason, setReason] = useState("");
  const [documentType, setDocumentType] = useState("");
  const [docReason, setDocReason] = useState("");

  const { toast } = useToast();

  // Fetch data function
  const fetchData = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    try {
  // Get auth token
  const idToken = await user.getIdToken();

  // Fetch user profile
  try {
    const userResponse = await fetch("/api/user/profile", {
      headers: {
        Authorization: `Bearer ${idToken}`,
      },
    });

    if (userResponse.ok) {
      const userData = await userResponse.json();
      setUserProfile(userData.user);
    } else {
      console.error("Failed to fetch user profile");
    }
  } catch (error) {
    console.error("Error fetching user profile:", error);
  }

  // Fetch leave balance with fallback
  try {
  const balanceResponse = await fetch("/api/leave/balance", {
    headers: {
      Authorization: `Bearer ${idToken}`,
    },
  });

  if (balanceResponse.ok) {
    const balanceData = await balanceResponse.json();
    setLeaveBalance(balanceData.balance);
  } else {
    console.error("Failed to fetch leave balance, using default values");
    // Use default values if API fails with proper Timestamp handling
    setLeaveBalance({
      sickLeave: 7,
      annualLeave: 12,
      emergencyLeave: 3,
      userId: user.uid,
      updatedAt: new Date() // This will be cast to LeaveBalance type
    } as unknown as LeaveBalance);
  }
} catch (error) {
  console.error("Error fetching leave balance:", error);
  // Use default values if API fails with proper Timestamp handling
  setLeaveBalance({
    sickLeave: 7,
    annualLeave: 12,
    emergencyLeave: 3,
    userId: user.uid,
    updatedAt: new Date() // This will be cast to LeaveBalance type
  } as unknown as LeaveBalance);
}

  // Fetch leave requests
  try {
    const leaveResponse = await fetch("/api/leave/request?type=leave", {
      headers: {
        Authorization: `Bearer ${idToken}`,
      },
    });

    if (leaveResponse.ok) {
      const leaveData = await leaveResponse.json();
      setLeaveRequests(leaveData.leaveRequests || []);
    } else {
      console.error("Failed to fetch leave requests");
      setLeaveRequests([]);
    }
  } catch (error) {
    console.error("Error fetching leave requests:", error);
    setLeaveRequests([]);
  }

  // Fetch document requests
  try {
    const docResponse = await fetch("/api/leave/request?type=document", {
      headers: {
        Authorization: `Bearer ${idToken}`,
      },
    });

    if (docResponse.ok) {
      const docData = await docResponse.json();
      setDocumentRequests(docData.documentRequests || []);
    } else {
      console.error("Failed to fetch document requests");
      setDocumentRequests([]);
    }
  } catch (error) {
    console.error("Error fetching document requests:", error);
    setDocumentRequests([]);
  }
} catch (error) {
  console.error("Error fetching data:", error);
  toast({
    variant: "destructive",
    title: "Error",
    description: "Failed to fetch data",
  });
} finally {
  setLoading(false);
  setRefreshing(false);
}
  }, [user, toast]);

  // Initial data fetch
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Handle refresh
  const handleRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  // Handle leave request submission
  const handleLeaveRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !userProfile) return;

    // Validate dates
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (start > end) {
      toast({
        variant: "destructive",
        title: "Invalid dates",
        description: "Start date must be before end date",
      });
      return;
    }

    // Calculate number of days
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // +1 to include both start and end days

    // Check if user has enough leave balance
    if (
      (leaveType === "sick" && diffDays > leaveBalance.sickLeave) ||
      (leaveType === "annual" && diffDays > leaveBalance.annualLeave) ||
      (leaveType === "emergency" && diffDays > leaveBalance.emergencyLeave)
    ) {
      toast({
        variant: "destructive",
        title: "Insufficient leave balance",
        description: `You don't have enough ${leaveType} leave balance for ${diffDays} days`,
      });
      return;
    }

    try {
      setLoading(true);

      // Get auth token
      const idToken = await user.getIdToken();

      // Create leave request via API
      const response = await fetch("/api/leave/request", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          type: "leave",
          leaveType,
          startDate: start.toISOString(),
          endDate: end.toISOString(),
          reason,
          numberOfDays: diffDays,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to submit leave request");
      }

      toast({
        title: "Success",
        description: "Leave request submitted successfully",
      });

      // Reset form
      setLeaveType("sick");
      setStartDate("");
      setEndDate("");
      setReason("");
      setIsLeaveDialogOpen(false);

      // Refresh data
      fetchData();
    } catch (error) {
      console.error("Error submitting leave request:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description:
          error instanceof Error
            ? error.message
            : "Failed to submit leave request",
      });
    } finally {
      setLoading(false);
    }
  };

  // Handle document request submission
  const handleDocumentRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (!documentType || !docReason) {
      toast({
        variant: "destructive",
        title: "Missing information",
        description: "Please fill in all fields",
      });
      return;
    }

    try {
      setLoading(true);

      // Get auth token
      const idToken = await user.getIdToken();

      // Create document request via API
      const response = await fetch("/api/leave/request", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          type: "document",
          documentType,
          reason: docReason,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to submit document request");
      }

      toast({
        title: "Success",
        description: "Document request submitted successfully",
      });

      // Reset form
      setDocumentType("");
      setDocReason("");
      setIsDocDialogOpen(false);

      // Refresh data
      fetchData();
    } catch (error) {
      console.error("Error submitting document request:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description:
          error instanceof Error
            ? error.message
            : "Failed to submit document request",
      });
    } finally {
      setLoading(false);
    }
  };

  // Add this helper function to format Firestore timestamps
const formatFirestoreTimestamp = (timestamp: any): string => {
  if (!timestamp) return '';
  
  // Check if it's a Firestore Timestamp object
  if (timestamp && typeof timestamp === 'object' && '_seconds' in timestamp) {
    return format(new Date(timestamp._seconds * 1000), 'MMM dd, yyyy');
  }
  
  // Handle Date objects or ISO strings
  try {
    return format(new Date(timestamp), 'MMM dd, yyyy');
  } catch (error) {
    return String(timestamp);
  }
};

  // Format date for display
  const formatDate = (dateString: any) => {
  if (!dateString) return '';
  
  // Handle Firestore Timestamp objects
  if (typeof dateString === 'object' && '_seconds' in dateString) {
    return formatFirestoreTimestamp(dateString);
  }
  
  // Handle regular date strings
  try {
    const date = new Date(dateString);
    return format(date, 'MMM dd, yyyy');
  } catch (error) {
    return String(dateString);
  }
};

  // Get status badge component
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "approved":
        return (
          <Badge className="bg-green-100 text-green-800 flex items-center gap-1">
            <CheckCircle className="h-3 w-3" /> Approved
          </Badge>
        );
      case "rejected":
        return (
          <Badge className="bg-red-100 text-red-800 flex items-center gap-1">
            <XCircle className="h-3 w-3" /> Rejected
          </Badge>
        );
      default:
        return (
          <Badge className="bg-yellow-100 text-yellow-800 flex items-center gap-1">
            <Clock className="h-3 w-3" /> Pending
          </Badge>
        );
    }
  };

  // View leave request details
  const viewLeaveDetails = (request: LeaveRequest) => {
    setSelectedRequest(request);
    setIsDetailsOpen(true);
  };

  // Calculate leave usage percentages
  const sickLeavePercentage = Math.min(
    100,
    ((7 - leaveBalance.sickLeave) / 7) * 100
  );
  const annualLeavePercentage = Math.min(
    100,
    ((12 - leaveBalance.annualLeave) / 12) * 100
  );
  const emergencyLeavePercentage = Math.min(
    100,
    ((3 - leaveBalance.emergencyLeave) / 3) * 100
  );

  // Handle API errors gracefully
  const handleApiError = useCallback(
    (error: any, fallbackData: any = null) => {
      console.error("API Error:", error);
      toast({
        variant: "destructive",
        title: "API Error",
        description: "The server is currently unavailable. Using cached data.",
      });
      return fallbackData;
    },
    [toast]
  );

  // Loading state
  if (authLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Clock className="h-8 w-8 animate-spin mx-auto text-gray-400" />
          <p className="mt-2 text-gray-500">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className=" top-0 h-[30%] bg-gradient-to-b from-teal-900/60 to-emerald-800/40">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-white bg-clip-text">Leave Management</h1>
        <div className="flex space-x-2">
          <Button
            variant="outline"
            onClick={handleRefresh}
            disabled={refreshing}
          >
            <RefreshCw
              className={`h-4 w-4 mr-2 ${refreshing ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>
          <Button onClick={() => setIsDocDialogOpen(true)}>
            <FileText className="h-4 w-4 mr-2" />
            Request Document
          </Button>
          <Button onClick={() => setIsLeaveDialogOpen(true)}>
            <Calendar className="h-4 w-4 mr-2" />
            Request Leave
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Leave Balance Card */}
        <Card className="border-purple-100 bg-purple-900">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm  text-white font-medium">Leave Balance</CardTitle>
            <Calendar className="h-4 w-4 text-white" />
          </CardHeader>
          <CardContent>
            <div className="space-y-4 text-white">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Sick Leave</span>
                  <span className="font-medium">
                    {leaveBalance.sickLeave}/7 days
                  </span>
                </div>
                <Progress value={sickLeavePercentage} className="h-2" />
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Annual Leave</span>
                  <span className="font-medium">
                    {leaveBalance.annualLeave}/12 days
                  </span>
                </div>
                <Progress value={annualLeavePercentage} className="h-2" />
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Emergency</span>
                  <span className="font-medium">
                    {leaveBalance.emergencyLeave}/3 days
                  </span>
                </div>
                <Progress value={emergencyLeavePercentage} className="h-2" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Reporting Manager Card */}
        <Card className="border-blue-100"
        style={{background:"#3338A0"}}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm text-white font-medium">
              Reporting Manager
            </CardTitle>
            <User className="h-4 w-4 text-white" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-full" />
              </div>
            ) : userProfile?.reportingManager ? (
              <div className="space-y-1">
                <p className="font-medium">{userProfile.reportingManager}</p>
                <p className="text-sm text-white">
                  Your leave requests will be sent to your reporting manager for
                  approval.
                </p>
              </div>
            ) : (
              <div className="text-sm text-white">
                No reporting manager assigned. Please contact HR.
              </div>
            )}
          </CardContent>
        </Card>

        {/* Request Status Card */}
        <Card className="border-green-100"
        style={{background:"#5C3E94"}}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-white">
              Request Status
            </CardTitle>
            <AlertCircle className="h-4 w-4 text-white" />
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-white">
              <div className="flex justify-between text-sm">
                <span>Pending Leaves</span>
                <span className="font-medium">
                  {leaveRequests.filter((r) => r.status === "pending").length}
                </span>
              </div>
              <div className="flex justify-between text-sm text-white">
                <span>Approved Leaves</span>
                <span className="font-medium">
                  {leaveRequests.filter((r) => r.status === "approved").length}
                </span>
              </div>
              <div className="flex justify-between text-sm text-white">
                <span>Pending Documents</span>
                <span className="font-medium">
                  {
                    documentRequests.filter((r) => r.status === "pending")
                      .length
                  }
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs for Leave and Document Requests */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2 text-teal-500">
          <TabsTrigger value="leave-requests">Leave Requests</TabsTrigger>
          <TabsTrigger value="document-requests">Document Requests</TabsTrigger>
        </TabsList>

        <TabsContent value="leave-requests" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className=" text-teal-800 bg-clip-text">Leave History</CardTitle>
              <CardDescription>
                View all your leave requests and their status
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex flex-col space-y-2">
                      <Skeleton className="h-10 w-full" />
                    </div>
                  ))}
                </div>
              ) : leaveRequests.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Type</TableHead>
                      <TableHead>Start Date</TableHead>
                      <TableHead>End Date</TableHead>
                      <TableHead>Days</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Requested On</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {leaveRequests.map((request) => (
                      <TableRow
                        key={request.id}
                        className="cursor-pointer hover:bg-gray-50"
                        onClick={() => viewLeaveDetails(request)}
                      >
                        <TableCell className="capitalize">
                          {request.leaveType}
                        </TableCell>
                        <TableCell>{formatDate(request.startDate)}</TableCell>
                        <TableCell>{formatDate(request.endDate)}</TableCell>
                        <TableCell>{request.numberOfDays} days</TableCell>
                        <TableCell>{getStatusBadge(request.status)}</TableCell>
                        <TableCell>{formatDate(request.createdAt)}</TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              viewLeaveDetails(request);
                            }}
                          >
                            View
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Calendar className="h-12 w-12 mx-auto text-gray-300 mb-2" />
                  <p>No leave requests found</p>
                  <Button
                    variant="outline"
                    className="mt-4"
                    onClick={() => setIsLeaveDialogOpen(true)}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Create New Request
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="document-requests" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Document Requests</CardTitle>
              <CardDescription>
                View all your document requests and their status
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex flex-col space-y-2">
                      <Skeleton className="h-10 w-full" />
                    </div>
                  ))}
                </div>
              ) : documentRequests.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Document Type</TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Requested On</TableHead>
                      <TableHead>Document</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {documentRequests.map((request) => (
                      <TableRow key={request.id}>
                        <TableCell>{request.documentType}</TableCell>
                        <TableCell>{request.reason}</TableCell>
                        <TableCell>{getStatusBadge(request.status)}</TableCell>
                        <TableCell>{formatDate(request.createdAt)}</TableCell>
                        <TableCell>
                          {request.documentUrl ? (
                            <a
                              href={request.documentUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:underline flex items-center gap-1"
                            >
                              <Download className="h-4 w-4" /> Download
                            </a>
                          ) : (
                            <span className="text-gray-400">Not available</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <FileText className="h-12 w-12 mx-auto text-gray-300 mb-2" />
                  <p>No document requests found</p>
                  <Button
                    variant="outline"
                    className="mt-4"
                    onClick={() => setIsDocDialogOpen(true)}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Request Document
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Leave Request Dialog */}
      <Dialog open={isLeaveDialogOpen} onOpenChange={setIsLeaveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request Leave</DialogTitle>
            <DialogDescription>
              Fill in the details to request leave. Your request will be sent to
              your reporting manager for approval.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleLeaveRequest}>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="leaveType">Leave Type</Label>
                <Select
                  value={leaveType}
                  onValueChange={(value: "sick" | "annual" | "emergency") =>
                    setLeaveType(value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select leave type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sick">
                      Sick Leave ({leaveBalance.sickLeave} days available)
                    </SelectItem>
                    <SelectItem value="annual">
                      Annual Leave ({leaveBalance.annualLeave} days available)
                    </SelectItem>
                    <SelectItem value="emergency">
                      Emergency Leave ({leaveBalance.emergencyLeave} days
                      available)
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="startDate">Start Date</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    min={new Date().toISOString().split("T")[0]}
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="endDate">End Date</Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    min={startDate || new Date().toISOString().split("T")[0]}
                    required
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="reason">Reason for Leave</Label>
                <Textarea
                  id="reason"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Please provide a reason for your leave request"
                  required
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsLeaveDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  "Submit Request"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Document Request Dialog */}
      <Dialog open={isDocDialogOpen} onOpenChange={setIsDocDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request Document</DialogTitle>
            <DialogDescription>
              Fill in the details to request an official document.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleDocumentRequest}>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="documentType">Document Type</Label>
                <Select value={documentType} onValueChange={setDocumentType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select document type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="employment_certificate">
                      Employment Certificate
                    </SelectItem>
                    <SelectItem value="salary_certificate">
                      Salary Certificate
                    </SelectItem>
                    <SelectItem value="experience_letter">
                      Experience Letter
                    </SelectItem>
                    <SelectItem value="recommendation_letter">
                      Recommendation Letter
                    </SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="docReason">Purpose</Label>
                <Textarea
                  id="docReason"
                  value={docReason}
                  onChange={(e) => setDocReason(e.target.value)}
                  placeholder="Please provide the purpose for requesting this document"
                  required
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsDocDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  "Submit Request"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Leave Request Details Dialog */}
      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Leave Request Details</DialogTitle>
          </DialogHeader>
          {selectedRequest && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <p className="text-sm text-gray-500">Leave Type</p>
                  <p className="font-medium capitalize">
                    {selectedRequest.leaveType}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Status</p>
                  <div>{getStatusBadge(selectedRequest.status)}</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <p className="text-sm text-gray-500">Start Date</p>
                  <p className="font-medium">
                    {formatDate(selectedRequest.startDate)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">End Date</p>
                  <p className="font-medium">
                    {formatDate(selectedRequest.endDate)}
                  </p>
                </div>
              </div>

              <div>
                <p className="text-sm text-gray-500">Duration</p>
                <p className="font-medium">
                  {selectedRequest.numberOfDays} days
                </p>
              </div>

              <div>
                <p className="text-sm text-gray-500">Reason</p>
                <p className="text-sm mt-1 p-2 bg-gray-50 rounded-md">
                  {selectedRequest.reason}
                </p>
              </div>

              {selectedRequest.reportingManagerName && (
                <div>
                  <p className="text-sm text-gray-500">Reporting Manager</p>
                  <p className="font-medium">
                    {selectedRequest.reportingManagerName}
                  </p>
                </div>
              )}

              {selectedRequest.approvedBy && (
                <div>
                  <p className="text-sm text-gray-500">Approved By</p>
                  <p className="font-medium">{selectedRequest.approvedBy}</p>
                </div>
              )}

              {selectedRequest.approvedAt && (
                <div>
                  <p className="text-sm text-gray-500">Approval Date</p>
                  <p className="font-medium">
                    {formatDate(selectedRequest.approvedAt)}
                  </p>
                </div>
              )}

              <div className="pt-4 border-t border-gray-100">
                <p className="text-sm text-gray-500">Requested On</p>
                <p className="font-medium">
                  {formatDate(selectedRequest.createdAt)}
                </p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDetailsOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
