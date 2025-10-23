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
} from "lucide-react";
import { auth } from "@/lib/firebase/firebase";
import { useRouter } from "next/navigation";
import { useAuthState } from "react-firebase-hooks/auth";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  const [displayTime, setDisplayTime] = useState<string>("");
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
      setDisplayTime(new Date().toLocaleTimeString());
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

  const handleViewUser = async (userId: string) => {
    try {
      setIsDetailLoading(true);

      if (!user) return;
      const idToken = await user.getIdToken();

      const response = await fetch(
        `/api/admin/users/${userId}?t=${Date.now()}`,
        {
          headers: {
            Authorization: `Bearer ${idToken}`,
            "Cache-Control": "no-cache",
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to fetch user details");
      }

      const data = await response.json();
      setDetailedUser(data.user);
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
      active: { color: "bg-green-100 text-green-800", text: "Active" },
      pending: { color: "bg-yellow-100 text-yellow-800", text: "Pending" },
      inactive: { color: "bg-red-100 text-red-800", text: "Inactive" },
    };

    return (
      <Badge className={`${statusMap[status]?.color || "bg-gray-100 text-gray-800"} px-2 py-1 rounded-full text-xs font-medium`}>
        {statusMap[status]?.text || status}
      </Badge>
    );
  };

  const roleBadge = (role: string) => {
    return (
      <Badge variant={role === "admin" ? "default" : "secondary"} className="px-2 py-1 rounded-full text-xs font-medium">
        {role === "admin" ? "Admin" : "Employee"}
      </Badge>
    );
  };

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="flex flex-col space-y-6">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Employee Management</h1>
            <p className="text-sm text-gray-500">Manage your organization's employees</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              onClick={handleRefresh}
              variant="outline"
              size="sm"
              disabled={isLoading}
              className="gap-2"
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
              className="gap-2"
            >
              <UserPlus className="w-4 h-4" />
              <span>Add Employee</span>
            </Button>
          </div>
        </div>

        {/* Filters Section */}
        <div className="bg-white rounded-lg shadow-sm p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search employees..."
                className="pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full">
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4 text-gray-400" />
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
            <div className="flex items-center justify-end text-xs text-gray-500">
              Last updated: {displayTime || "Never"}
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          {isLoading && filteredUsers.length === 0 ? (
            <div className="p-6">
              <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="p-6 text-center">
              <div className="text-gray-500 mb-4">No employees found</div>
              {searchTerm || statusFilter !== "all" ? (
                <Button
                  variant="ghost"
                  onClick={() => {
                    setSearchTerm("");
                    setStatusFilter("all");
                  }}
                >
                  Clear filters
                </Button>
              ) : (
                <Button
                  variant="ghost"
                  onClick={handleRefresh}
                >
                  Refresh data
                </Button>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader className="bg-gray-50">
                <TableRow>
                  <TableHead className="w-[50px]"></TableHead>
                  <TableHead>Employee</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Position</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user) => (
                  <>
                    <TableRow key={user.uid} className="hover:bg-gray-50">
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => toggleRowExpansion(user.uid)}
                          className="h-8 w-8"
                        >
                          {expandedRows[user.uid] ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                        </Button>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={user.photoURL} />
                            <AvatarFallback>{getInitials(user.displayName)}</AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-medium">{user.displayName}</div>
                            <div className="text-sm text-gray-500">{user.email}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm text-gray-900">{user.department}</div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm text-gray-900">{user.position}</div>
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
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleViewUser(user.uid)}>
                              <Eye className="mr-2 h-4 w-4" />
                              <span>View</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleEditUser(user)}>
                              <Pencil className="mr-2 h-4 w-4" />
                              <span>Edit</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-red-600"
                              onClick={() => handleDeleteUser(user.uid)}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              <span>Delete</span>
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                    {expandedRows[user.uid] && (
                      <TableRow className="bg-gray-50">
                        <TableCell colSpan={7}>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4">
                            <div>
                              <p className="text-xs font-medium text-gray-500">Phone</p>
                              <p className="text-sm">{user.phoneNumber || "N/A"}</p>
                            </div>
                            <div>
                              <p className="text-xs font-medium text-gray-500">Joined</p>
                              <p className="text-sm">{user.dateOfJoining || "N/A"}</p>
                            </div>
                            <div>
                              <p className="text-xs font-medium text-gray-500">Manager</p>
                              <p className="text-sm">{user.reportingManager || "N/A"}</p>
                            </div>
                            <div>
                              <p className="text-xs font-medium text-gray-500">Location</p>
                              <p className="text-sm">{user.officeLocation || "N/A"}</p>
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </div>

      {/* Edit User Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Edit Employee</DialogTitle>
            <DialogDescription>
              Update employee details below. Click save when you're done.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpdateUser}>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="displayName">Full Name</Label>
                  <Input
                    id="displayName"
                    value={selectedUser?.displayName || ""}
                    onChange={(e) =>
                      setSelectedUser((prev) => ({
                        ...prev!,
                        displayName: e.target.value,
                      }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phoneNumber">Phone Number</Label>
                  <Input
                    id="phoneNumber"
                    value={selectedUser?.phoneNumber || ""}
                    onChange={(e) =>
                      setSelectedUser((prev) => ({
                        ...prev!,
                        phoneNumber: e.target.value,
                      }))
                    }
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="department">Department</Label>
                  <Input
                    id="department"
                    value={selectedUser?.department || ""}
                    onChange={(e) =>
                      setSelectedUser((prev) => ({
                        ...prev!,
                        department: e.target.value,
                      }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="position">Position</Label>
                  <Input
                    id="position"
                    value={selectedUser?.position || ""}
                    onChange={(e) =>
                      setSelectedUser((prev) => ({
                        ...prev!,
                        position: e.target.value,
                      }))
                    }
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="role">Role</Label>
                  <Select
                    value={selectedUser?.role || ""}
                    onValueChange={(value: "user" | "admin") =>
                      setSelectedUser((prev) => ({
                        ...prev!,
                        role: value,
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="user">Employee</SelectItem>
                      <SelectItem value="admin">Administrator</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select
                    value={selectedUser?.status || ""}
                    onValueChange={(value: "active" | "pending" | "inactive") =>
                      setSelectedUser((prev) => ({
                        ...prev!,
                        status: value,
                      }))
                    }
                  >
                    <SelectTrigger>
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
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
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

      {/* View User Details Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          {isDetailLoading ? (
            <div className="flex justify-center items-center h-64">
              <Loader2 className="w-8 h-8 animate-spin" />
            </div>
          ) : (
            <>
              <DialogHeader>
                <div className="flex items-center gap-4">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={detailedUser?.photoURL} />
                    <AvatarFallback>
                      {detailedUser?.displayName ? getInitials(detailedUser.displayName) : "U"}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <DialogTitle>{detailedUser?.displayName || "Employee Profile"}</DialogTitle>
                    <DialogDescription>{detailedUser?.position}</DialogDescription>
                  </div>
                </div>
              </DialogHeader>

              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-5">
                  <TabsTrigger value="basic">Basic</TabsTrigger>
                  <TabsTrigger value="employment">Employment</TabsTrigger>
                  <TabsTrigger value="location">Location</TabsTrigger>
                  <TabsTrigger value="education">Education</TabsTrigger>
                  <TabsTrigger value="additional">More</TabsTrigger>
                </TabsList>

                <TabsContent value="basic" className="pt-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Personal Information</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div>
                          <Label className="text-sm font-medium text-gray-500">Email</Label>
                          <p>{detailedUser?.email || "N/A"}</p>
                        </div>
                        <div>
                          <Label className="text-sm font-medium text-gray-500">Phone</Label>
                          <p>{detailedUser?.phoneNumber || "N/A"}</p>
                        </div>
                        <div>
                          <Label className="text-sm font-medium text-gray-500">Date of Birth</Label>
                          <p>{detailedUser?.dateOfBirth || "N/A"}</p>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Work Information</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div>
                          <Label className="text-sm font-medium text-gray-500">Department</Label>
                          <p>{detailedUser?.department || "N/A"}</p>
                        </div>
                        <div>
                          <Label className="text-sm font-medium text-gray-500">Designation</Label>
                          <p>{detailedUser?.designation || "N/A"}</p>
                        </div>
                        <div>
                          <Label className="text-sm font-medium text-gray-500">Date of Joining</Label>
                          <p>{detailedUser?.dateOfJoining || "N/A"}</p>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>

                <TabsContent value="employment" className="pt-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Employment Details</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label className="text-sm font-medium text-gray-500">Employee Type</Label>
                          <p>{detailedUser?.employeeType || "N/A"}</p>
                        </div>
                        <div>
                          <Label className="text-sm font-medium text-gray-500">Status</Label>
                          <div className="mt-1">
                            {statusBadge(detailedUser?.status || "inactive")}
                          </div>
                        </div>
                        <div>
                          <Label className="text-sm font-medium text-gray-500">Role</Label>
                          <div className="mt-1">
                            {roleBadge(detailedUser?.role || "user")}
                          </div>
                        </div>
                        <div>
                          <Label className="text-sm font-medium text-gray-500">Reporting Manager</Label>
                          <p>{detailedUser?.reportingManager || "N/A"}</p>
                        </div>
                      </div>

                      <Separator />

                      <div>
                        <CardTitle className="text-lg mb-4">Work Experience</CardTitle>
                        {detailedUser?.experience && detailedUser.experience.length > 0 ? (
                          <div className="space-y-4">
                            {detailedUser.experience.map((exp, index) => (
                              <div key={index} className="border rounded-lg p-4">
                                <div className="font-medium">{exp.company}</div>
                                <div className="text-sm text-gray-600">{exp.designation}</div>
                                <div className="text-sm text-gray-500">{exp.years}</div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-4 text-gray-500">
                            No work experience available
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="location" className="pt-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Location Information</CardTitle>
                    </CardHeader>
                    <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <div>
                          <Label className="text-sm font-medium text-gray-500">Office Location</Label>
                          <p>{detailedUser?.officeLocation || "N/A"}</p>
                        </div>
                        <div>
                          <Label className="text-sm font-medium text-gray-500">Seating Location</Label>
                          <p>{detailedUser?.seatingLocation || "N/A"}</p>
                        </div>
                      </div>
                      <div className="space-y-4">
                        <div>
                          <Label className="text-sm font-medium text-gray-500">Home Location</Label>
                          <p>{detailedUser?.homeLocation || "N/A"}</p>
                        </div>
                        <div>
                          <Label className="text-sm font-medium text-gray-500">Extension Number</Label>
                          <p>{detailedUser?.extensionNumber || "N/A"}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="education" className="pt-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Education & Qualifications</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {detailedUser?.education && detailedUser.education.length > 0 ? (
                        <div className="space-y-4">
                          {detailedUser.education.map((edu, index) => (
                            <div key={index} className="border rounded-lg p-4">
                              <div className="font-medium">{edu.institute}</div>
                              <div className="text-sm text-gray-600">
                                {edu.startDate} - {edu.endDate}
                              </div>
                              <div className="text-sm text-gray-500 mt-1">
                                Results: {edu.results}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-4 text-gray-500">
                          No educational details available
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="additional" className="pt-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Skills</CardTitle>
                      </CardHeader>
                      <CardContent>
                        {detailedUser?.skills && detailedUser.skills.length > 0 ? (
                          <div className="flex flex-wrap gap-2">
                            {detailedUser.skills.map((skill, index) => (
                              <Badge key={index} variant="outline" className="px-3 py-1">
                                {skill}
                              </Badge>
                            ))}
                          </div>
                        ) : (
                          <div className="text-gray-500">No skills listed</div>
                        )}
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Dependents</CardTitle>
                      </CardHeader>
                      <CardContent>
                        {detailedUser?.dependents && detailedUser.dependents.length > 0 ? (
                          <div className="space-y-4">
                            {detailedUser.dependents.map((dep, index) => (
                              <div key={index} className="border rounded-lg p-4">
                                <div className="font-medium">{dep.name}</div>
                                <div className="text-sm text-gray-600">{dep.relationship}</div>
                                <div className="text-sm text-gray-500">{dep.mobile}</div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-4 text-gray-500">
                            No dependents listed
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>
              </Tabs>

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setIsViewDialogOpen(false)}
                >
                  Close
                </Button>
                <Button
                  onClick={() => {
                    if (detailedUser) {
                      setSelectedUser(detailedUser);
                      setIsViewDialogOpen(false);
                      setIsDialogOpen(true);
                    }
                  }}
                >
                  Edit Profile
                </Button>
              </DialogFooter>
            </>
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
              <Skeleton className="h-8 w-48" />
              <Skeleton className="h-4 w-64 mt-2" />
            </div>
            <div className="flex gap-3">
              <Skeleton className="h-10 w-24" />
              <Skeleton className="h-10 w-36" />
            </div>
          </div>
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    );
  }
  return <ClientOnlyUserManagement />;
}