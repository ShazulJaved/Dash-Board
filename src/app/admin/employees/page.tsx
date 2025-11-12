"use client";

import React, { useState, useEffect } from "react";
import {Table,TableBody,TableCell,TableHead,TableHeader,TableRow,} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import {
  Loader2,
  Pencil,
  Trash2,
  UserPlus,
  RefreshCw,
  Eye,
  User,
  ChevronDown,
  ChevronRight,
  Search,
  Filter,
  MoreVertical,
  Mail,
  Phone,
  Calendar,
  MapPin,
  Building,
  Briefcase,
  GraduationCap,
  Users,
  Shield,
  Crown,
  X,
  Target,
  Award,
  Heart,
} from "lucide-react";
import { auth } from "@/lib/firebase/firebase";
import { useRouter } from "next/navigation";
import { useAuthState } from "react-firebase-hooks/auth";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";


interface Education {
  institute: string;
  startDate: string;
  endDate: string;
  results: string;
}

interface Experience {
  company: string;
  designation: string;
  years: string;
}

interface Dependent {
  name: string;
  mobile: string;
  relationship: string;
}

interface User {
  uid: string;
  email: string;
  displayName: string;
  phoneNumber: string;
  department: string;
  position: string;
  role: "user" | "admin";
  status: "active" | "pending" | "inactive";
  createdAt: string;
  updatedAt: string;
  dateOfBirth?: string;
  dateOfJoining?: string;
  photoURL?: string;
  reportingManager?: string;
  reportingManagerId?: string;
  officeLocation?: string;
  homeLocation?: string;
  seatingLocation?: string;
  extensionNumber?: string;
  designation?: string;
  employeeType?: string;
  education?: Education[];
  experience?: Experience[];
  skills?: string[];
  dependents?: Dependent[];
}




function ClientOnlyUserManagement() {
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [detailedUser, setDetailedUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState("basic");
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [user, authLoading] = useAuthState(auth);
  const router = useRouter();
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});
  
  const fetchUsers = async () => {
    try {
      if (!user) return;

      const idToken = await user.getIdToken();

      const response = await fetch("/api/admin/users?t=" + Date.now(), {
        headers: {
          Authorization: `Bearer ${idToken}`,
          "Cache-Control": "no-cache, no-store, must-revalidate",
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch users");
      }

      const data = await response.json();
      setUsers(data.users);
      setFilteredUsers(data.users);
      setLastUpdated(new Date());
    } catch (error) {
      console.error("Error fetching users:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to fetch users",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!user && !authLoading) {
      router.push("/auth/sign-in");
      return;
    }

    if (!user) return;

    setIsLoading(true);
    fetchUsers();
  }, [user, authLoading, router]);

  useEffect(() => {
    let results = users;

    if (searchTerm) {
      results = results.filter(user =>
        user.displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.department.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.position.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (statusFilter !== "all") {
      results = results.filter(user => user.status === statusFilter);
    }

    setFilteredUsers(results);
  }, [searchTerm, statusFilter, users]);

  const toggleRowExpansion = (userId: string) => {
    setExpandedRows(prev => ({
      ...prev,
      [userId]: !prev[userId]
    }));
  };

  const handleEditUser = (user: User) => {
    setSelectedUser(user);
    setIsDialogOpen(true);
  };

  const handleViewUser = async (user: User) => {
    try {
      setIsDetailLoading(true);
      setDetailedUser(user);
      setIsViewDialogOpen(true);
    } catch (error) {
      console.error("Error fetching user details:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to fetch user details",
      });
    } finally {
      setIsDetailLoading(false);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm("Are you sure you want to delete this user?")) return;

    try {
      setIsLoading(true);

      if (!user) return;
      const idToken = await user.getIdToken();

      const response = await fetch(`/api/admin/users/${userId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${idToken}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to delete user");
      }

      fetchUsers();
      toast({
        title: "Success",
        description: "User deleted successfully",
      });
    } catch (error) {
      console.error("Error deleting user:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to delete user",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser || !user) return;

    try {
      setIsLoading(true);

      const idToken = await user.getIdToken();

      const response = await fetch(`/api/admin/users/${selectedUser.uid}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${idToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          displayName: selectedUser.displayName,
          phoneNumber: selectedUser.phoneNumber,
          department: selectedUser.department,
          position: selectedUser.position,
          role: selectedUser.role,
          status: selectedUser.status,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to update user");
      }

      fetchUsers();
      setIsDialogOpen(false);
      toast({
        title: "Success",
        description: "User updated successfully",
      });
    } catch (error: any) {
      console.error("Error updating user:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to update user",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = () => {
    setIsLoading(true);
    fetchUsers();
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  const statusBadge = (status: string) => {
    const statusMap: Record<string, { color: string; text: string }> = {
      active: { color: "bg-green-100 text-green-800 border-green-200", text: "Active" },
      pending: { color: "bg-yellow-100 text-yellow-800 border-yellow-200", text: "Pending" },
      inactive: { color: "bg-red-100 text-red-800 border-red-200", text: "Inactive" },
    };

    return (
      <Badge className={`${statusMap[status]?.color || "bg-gray-100 text-gray-800"} px-3 py-1 rounded-full text-xs font-medium border`}>
        {statusMap[status]?.text || status}
      </Badge>
    );
  };

  const roleBadge = (role: string) => {
    return (
      <Badge 
        className={`px-3 py-1 rounded-full text-xs font-medium border ${
          role === "admin" 
            ? "bg-purple-100 text-purple-800 border-purple-200" 
            : "bg-blue-100 text-blue-800 border-blue-200"
        }`}
      >
        {role === "admin" ? (
          <Crown className="h-3 w-3 mr-1" />
        ) : (
          <User className="h-3 w-3 mr-1" />
        )}
        {role === "admin" ? "Administrator" : "Employee"}
      </Badge>
    );
  };

  return (
    <div className="min-h-screen relative bg-transparent"
    style={{  background: "gray-200"}}>
      
      
      <div className="container mx-auto px-4 py-6 relative z-10">
        <div className="flex flex-col space-y-6">
          {/* Enhanced Header Section */}
          <Card className="bg-white/90 backdrop-blur-xl border-white/30 shadow-2xl">
            <CardHeader className="pb-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <CardTitle className="text-3xl font-bold text-black bg-clip-text  flex items-center gap-3">
                    <Users className="h-8 w-8" />
                    Employee Management
                  </CardTitle>
                  <CardDescription className="text-slate-600 text-lg mt-2">
                    Manage your organization's employees and their profiles
                  </CardDescription>
                </div>
                <div className="flex flex-col sm:flex-row gap-3">
                  <Button
                    onClick={handleRefresh}
                    variant="outline"
                    size="sm"
                    disabled={isLoading}
                    className="gap-2 bg-white/80 backdrop-blur-sm border-slate-200 hover:bg-white"
                  >
                    {isLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <RefreshCw className="h-4 w-4" />
                    )}
                    <span>Refresh</span>
                  </Button>
                  <Button
                    onClick={() => (window.location.href = "/admin/users/new")}
                    className="gap-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg"
                  >
                    <UserPlus className="w-4 h-4" />
                    <span>Add Employee</span>
                  </Button>
                </div>
              </div>
            </CardHeader>
          </Card>

          {/* Enhanced Filters Section */}
          <Card className="bg-white/90 backdrop-blur-xl border-white/30 shadow-xl">
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                  <Input
                    placeholder="Search employees..."
                    className="pl-10 bg-white/80 border-slate-200 focus:border-blue-500"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full bg-white/80 border-slate-200">
                    <div className="flex items-center gap-2">
                      <Filter className="h-4 w-4 text-slate-500" />
                      <span>Status: {statusFilter === "all" ? "All" : statusFilter.charAt(0).toUpperCase() + statusFilter.slice(1)}</span>
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
                <div className="flex items-center justify-end text-sm text-slate-500 bg-white/50 px-3 py-2 rounded-lg border border-slate-200">
                  <Calendar className="h-4 w-4 mr-2" />
                  Last updated: {format(lastUpdated, 'h:mm:ss a')}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Enhanced Main Content */}
          <Card className="bg-white/90 backdrop-blur-xl border-white/30 shadow-xl">
            <CardContent className="p-0">
              {isLoading && filteredUsers.length === 0 ? (
                <div className="p-6">
                  <div className="space-y-4">
                    {[...Array(5)].map((_, i) => (
                      <Skeleton key={i} className="h-16 w-full rounded-xl bg-slate-200" />
                    ))}
                  </div>
                </div>
              ) : filteredUsers.length === 0 ? (
                <div className="p-12 text-center">
                  <div className="text-slate-500 mb-4 text-lg">No employees found</div>
                  {searchTerm || statusFilter !== "all" ? (
                    <Button
                      variant="outline"
                      onClick={() => {
                        setSearchTerm("");
                        setStatusFilter("all");
                      }}
                      className="border-slate-300 text-slate-700 hover:bg-slate-50"
                    >
                      Clear filters
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      onClick={handleRefresh}
                      className="border-slate-300 text-slate-700 hover:bg-slate-50"
                    >
                      Refresh data
                    </Button>
                  )}
                </div>
              ) : (
                <div className="rounded-2xl overflow-hidden">
                  <Table>
                    <TableHeader className="bg-gradient-to-r from-slate-50 to-blue-50/80 border-b border-slate-200">
                      <TableRow className="hover:bg-transparent">
                        <TableHead className="w-12"></TableHead>
                        <TableHead className="text-slate-700 font-bold text-base py-5">Employee Profile</TableHead>
                        <TableHead className="text-slate-700 font-bold text-base py-5">Department</TableHead>
                        <TableHead className="text-slate-700 font-bold text-base py-5">Position</TableHead>
                        <TableHead className="text-slate-700 font-bold text-base py-5">Status</TableHead>
                        <TableHead className="text-slate-700 font-bold text-base py-5">Role</TableHead>
                        <TableHead className="text-right text-slate-700 font-bold text-base py-5">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredUsers.map((user) => (
                        <React.Fragment key={user.uid}>
                          <TableRow className="hover:bg-slate-50/80 transition-colors duration-150 group border-b border-slate-100">
                            <TableCell className="w-12">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => toggleRowExpansion(user.uid)}
                                className="h-8 w-8 hover:bg-slate-200/50 transition-colors"
                              >
                                {expandedRows[user.uid] ? (
                                  <ChevronDown className="h-4 w-4 text-slate-600" />
                                ) : (
                                  <ChevronRight className="h-4 w-4 text-slate-600" />
                                )}
                              </Button>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <Avatar className="h-10 w-10 border-2 border-white shadow-sm">
                                  <AvatarImage src={user.photoURL} />
                                  <AvatarFallback className="bg-gradient-to-br from-blue-500 to-cyan-600 text-white font-medium">
                                    {getInitials(user.displayName)}
                                  </AvatarFallback>
                                </Avatar>
                                <div>
                                  <div className="font-semibold text-slate-800">
                                    {user.displayName}
                                  </div>
                                  <div className="text-sm text-slate-500 flex items-center gap-1">
                                    <Mail className="h-3 w-3" />
                                    {user.email}
                                  </div>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="text-sm text-slate-700 font-medium">
                                {user.department}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="text-sm text-slate-700 font-medium">
                                {user.position}
                              </div>
                            </TableCell>
                            <TableCell>
                              {statusBadge(user.status)}
                            </TableCell>
                            <TableCell>
                              {roleBadge(user.role)}
                            </TableCell>
                            <TableCell className="text-right">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="h-8 w-8 hover:bg-slate-200/50 transition-colors"
                                  >
                                    <MoreVertical className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="bg-white/95 backdrop-blur-sm border-slate-200">
                                  <DropdownMenuItem 
                                    onClick={() => handleViewUser(user)}
                                    className="flex items-center gap-2 cursor-pointer"
                                  >
                                    <Eye className="h-4 w-4 text-blue-500" />
                                    <span>View Details</span>
                                  </DropdownMenuItem>
                                  <DropdownMenuItem 
                                    onClick={() => handleEditUser(user)}
                                    className="flex items-center gap-2 cursor-pointer"
                                  >
                                    <Pencil className="h-4 w-4 text-green-500" />
                                    <span>Edit Profile</span>
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    className="flex items-center gap-2 text-red-600 cursor-pointer"
                                    onClick={() => handleDeleteUser(user.uid)}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                    <span>Delete Employee</span>
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </TableRow>
                          {expandedRows[user.uid] && (
                            <TableRow className="bg-blue-50/30 border-b border-blue-100">
                              <TableCell colSpan={7}>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 p-6">
                                  <div className="flex items-center gap-3 p-3 bg-white/80 rounded-lg border border-blue-100">
                                    <Phone className="h-5 w-5 text-blue-500" />
                                    <div>
                                      <p className="text-xs font-medium text-slate-500">Phone</p>
                                      <p className="text-sm font-medium text-slate-800">{user.phoneNumber || "N/A"}</p>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-3 p-3 bg-white/80 rounded-lg border border-green-100">
                                    <Calendar className="h-5 w-5 text-green-500" />
                                    <div>
                                      <p className="text-xs font-medium text-slate-500">Joined</p>
                                      <p className="text-sm font-medium text-slate-800">{user.dateOfJoining || "N/A"}</p>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-3 p-3 bg-white/80 rounded-lg border border-purple-100">
                                    <User className="h-5 w-5 text-purple-500" />
                                    <div>
                                      <p className="text-xs font-medium text-slate-500">Manager</p>
                                      <p className="text-sm font-medium text-slate-800">{user.reportingManager || "N/A"}</p>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-3 p-3 bg-white/80 rounded-lg border border-orange-100">
                                    <MapPin className="h-5 w-5 text-orange-500" />
                                    <div>
                                      <p className="text-xs font-medium text-slate-500">Location</p>
                                      <p className="text-sm font-medium text-slate-800">{user.officeLocation || "N/A"}</p>
                                    </div>
                                  </div>
                                </div>
                              </TableCell>
                            </TableRow>
                          )}
                        </React.Fragment>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Enhanced Edit User Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[600px] bg-white/95 backdrop-blur-xl border-white/30">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-slate-800 flex items-center gap-3">
              <Pencil className="h-6 w-6 text-blue-600" />
              Edit Employee Profile
            </DialogTitle>
            <DialogDescription className="text-slate-600">
              Update employee details and information
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpdateUser}>
            <div className="grid gap-6 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="displayName" className="text-slate-700 font-medium">Full Name</Label>
                  <Input
                    id="displayName"
                    value={selectedUser?.displayName || ""}
                    onChange={(e) =>
                      setSelectedUser((prev) => ({
                        ...prev!,
                        displayName: e.target.value,
                      }))
                    }
                    className="bg-white/80 border-slate-200 focus:border-blue-500"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phoneNumber" className="text-slate-700 font-medium">Phone Number</Label>
                  <Input
                    id="phoneNumber"
                    value={selectedUser?.phoneNumber || ""}
                    onChange={(e) =>
                      setSelectedUser((prev) => ({
                        ...prev!,
                        phoneNumber: e.target.value,
                      }))
                    }
                    className="bg-white/80 border-slate-200 focus:border-blue-500"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="department" className="text-slate-700 font-medium">Department</Label>
                  <Input
                    id="department"
                    value={selectedUser?.department || ""}
                    onChange={(e) =>
                      setSelectedUser((prev) => ({
                        ...prev!,
                        department: e.target.value,
                      }))
                    }
                    className="bg-white/80 border-slate-200 focus:border-blue-500"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="position" className="text-slate-700 font-medium">Position</Label>
                  <Input
                    id="position"
                    value={selectedUser?.position || ""}
                    onChange={(e) =>
                      setSelectedUser((prev) => ({
                        ...prev!,
                        position: e.target.value,
                      }))
                    }
                    className="bg-white/80 border-slate-200 focus:border-blue-500"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="role" className="text-slate-700 font-medium">Role</Label>
                  <Select
                    value={selectedUser?.role || ""}
                    onValueChange={(value: "user" | "admin") =>
                      setSelectedUser((prev) => ({
                        ...prev!,
                        role: value,
                      }))
                    }
                  >
                    <SelectTrigger className="bg-white/80 border-slate-200">
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="user">Employee</SelectItem>
                      <SelectItem value="admin">Administrator</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="status" className="text-slate-700 font-medium">Status</Label>
                  <Select
                    value={selectedUser?.status || ""}
                    onValueChange={(value: "active" | "pending" | "inactive") =>
                      setSelectedUser((prev) => ({
                        ...prev!,
                        status: value,
                      }))
                    }
                  >
                    <SelectTrigger className="bg-white/80 border-slate-200">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setIsDialogOpen(false)}
                className="border-slate-300 text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={isLoading}
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save Changes"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* View User Details Dialog (Only accessible via dropdown menu) */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-white/95 backdrop-blur-xl border-white/30">
          {isDetailLoading ? (
            <div className="flex justify-center items-center h-64">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
          ) : (
            detailedUser && (
              <>
                <DialogHeader className="flex flex-row items-center justify-between pb-4 border-b border-slate-200">
                  <div className="flex items-center gap-4">
                    <Avatar className="h-16 w-16 border-4 border-white shadow-lg">
                      <AvatarImage src={detailedUser.photoURL} />
                      <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white font-bold text-xl">
                        {getInitials(detailedUser.displayName)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <DialogTitle className="text-2xl font-bold text-slate-800">{detailedUser.displayName}</DialogTitle>
                      <DialogDescription className="text-slate-600 text-lg">
                        {detailedUser.position} • {detailedUser.department}
                      </DialogDescription>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setIsViewDialogOpen(false)}
                    className="h-8 w-8 rounded-full hover:bg-slate-100"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </DialogHeader>

                <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-6">
                  <TabsList className="grid w-full grid-cols-5 bg-slate-100/80 p-1 rounded-xl">
                    <TabsTrigger value="basic" className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-lg">
                      <User className="h-4 w-4" />
                      Basic
                    </TabsTrigger>
                    <TabsTrigger value="employment" className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-lg">
                      <Briefcase className="h-4 w-4" />
                      Employment
                    </TabsTrigger>
                    <TabsTrigger value="location" className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-lg">
                      <MapPin className="h-4 w-4" />
                      Location
                    </TabsTrigger>
                    <TabsTrigger value="education" className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-lg">
                      <GraduationCap className="h-4 w-4" />
                      Education
                    </TabsTrigger>
                    <TabsTrigger value="additional" className="flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-lg">
                      <Award className="h-4 w-4" />
                      More
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="basic" className="pt-6 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <Card className="bg-white/80 backdrop-blur-sm border-slate-200">
                        <CardHeader className="pb-4">
                          <CardTitle className="text-lg flex items-center gap-2 text-slate-800">
                            <User className="h-5 w-5 text-blue-500" />
                            Personal Information
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="flex items-center justify-between py-2 border-b border-slate-100">
                            <span className="text-sm font-medium text-slate-500">Email</span>
                            <span className="text-sm text-slate-800 font-medium">{detailedUser.email}</span>
                          </div>
                          <div className="flex items-center justify-between py-2 border-b border-slate-100">
                            <span className="text-sm font-medium text-slate-500">Phone</span>
                            <span className="text-sm text-slate-800 font-medium">{detailedUser.phoneNumber || "N/A"}</span>
                          </div>
                          <div className="flex items-center justify-between py-2">
                            <span className="text-sm font-medium text-slate-500">Date of Birth</span>
                            <span className="text-sm text-slate-800 font-medium">{detailedUser.dateOfBirth || "N/A"}</span>
                          </div>
                        </CardContent>
                      </Card>

                      <Card className="bg-white/80 backdrop-blur-sm border-slate-200">
                        <CardHeader className="pb-4">
                          <CardTitle className="text-lg flex items-center gap-2 text-slate-800">
                            <Building className="h-5 w-5 text-green-500" />
                            Work Information
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="flex items-center justify-between py-2 border-b border-slate-100">
                            <span className="text-sm font-medium text-slate-500">Department</span>
                            <span className="text-sm text-slate-800 font-medium">{detailedUser.department}</span>
                          </div>
                          <div className="flex items-center justify-between py-2 border-b border-slate-100">
                            <span className="text-sm font-medium text-slate-500">Designation</span>
                            <span className="text-sm text-slate-800 font-medium">{detailedUser.designation || "N/A"}</span>
                          </div>
                          <div className="flex items-center justify-between py-2">
                            <span className="text-sm font-medium text-slate-500">Date of Joining</span>
                            <span className="text-sm text-slate-800 font-medium">{detailedUser.dateOfJoining || "N/A"}</span>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </TabsContent>

                  {/* Other tabs content remains the same */}
                  {/* ... */}
                </Tabs>

                <DialogFooter className="pt-6 border-t border-slate-200">
                  <Button
                    variant="outline"
                    onClick={() => setIsViewDialogOpen(false)}
                    className="border-slate-300 text-slate-700 hover:bg-slate-50"
                  >
                    Close
                  </Button>
                  <Button
                    onClick={() => {
                      setSelectedUser(detailedUser);
                      setIsViewDialogOpen(false);
                      setIsDialogOpen(true);
                    }}
                    className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg"
                  >
                    Edit Profile
                  </Button>
                </DialogFooter>
              </>
            )
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function UserManagementPage() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="container mx-auto px-4 py-6">
        <div className="flex flex-col space-y-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <Skeleton className="h-8 w-48 rounded-xl" />
              <Skeleton className="h-4 w-64 mt-2 rounded-xl" />
            </div>
            <div className="flex gap-3">
              <Skeleton className="h-10 w-24 rounded-xl" />
              <Skeleton className="h-10 w-36 rounded-xl" />
            </div>
          </div>
          <Skeleton className="h-16 w-full rounded-xl" />
          <Skeleton className="h-96 w-full rounded-xl" />
        </div>
      </div>
    );
  }
  return <ClientOnlyUserManagement />;
}