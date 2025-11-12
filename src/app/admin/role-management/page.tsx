'use client';

import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableCell, TableHead } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import { useState, useEffect } from "react";
import { auth } from '@/lib/firebase/firebase';
import { useAuthState } from 'react-firebase-hooks/auth';
import { useRouter } from 'next/navigation';
import { 
  Loader2, Pencil, Search, Shield, ShieldAlert, UserCog, 
  Users, RefreshCw, Filter, ChevronDown, CheckCircle2,
  Crown, UserCheck, Settings, Mail, Phone, MapPin, Calendar
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { format } from "date-fns";
import React from "react";


interface User {
  uid: string;
  displayName: string;
  email: string;
  role: 'admin' | 'user';
  department?: string;
  position?: string;
  photoURL?: string;
  lastLogin?: string;
  status?: string;
  createdAt?: any;
}



export default function RoleManagement() {
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [currentUser, authLoading] = useAuthState(auth);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();
  const { toast } = useToast();
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [error, setError] = useState<string | null>(null);

  // Check authentication and admin status
  useEffect(() => {
    if (!currentUser && !authLoading) {
      router.push('/auth/sign-in');
      return;
    }
  }, [currentUser, authLoading, router]);

  // Fetch users via API instead of direct Firestore access
  const fetchUsers = async () => {
    if (!currentUser) return;
    
    try {
      setLoading(true);
      setError(null);
      
      // Get ID token for authorization
      const idToken = await currentUser.getIdToken(true);
      
      // Call API endpoint
      const response = await fetch('/api/admin/users', {
        headers: {
          'Authorization': `Bearer ${idToken}`
        }
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch users: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (!data.users) {
        throw new Error('Invalid response format');
      }
      
      setUsers(data.users);
      setFilteredUsers(data.users);
      setLastUpdated(new Date());
    } catch (err: any) {
      console.error('Error fetching users:', err);
      setError(err.message || 'Failed to load users');
      toast({
        variant: "destructive",
        title: "Error",
        description: err.message || 'Failed to load users'
      });
    } finally {
      setLoading(false);
    }
  };

  // Initial data fetch
  useEffect(() => {
    if (currentUser) {
      fetchUsers();
    }
  }, [currentUser]);

  // Filter users based on search and role filter
  useEffect(() => {
    let result = users;
    
    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(user => 
        user.displayName?.toLowerCase().includes(query) || 
        user.email?.toLowerCase().includes(query) ||
        user.department?.toLowerCase().includes(query) ||
        user.position?.toLowerCase().includes(query)
      );
    }
    
    // Apply role filter
    if (roleFilter !== "all") {
      result = result.filter(user => user.role === roleFilter);
    }
    
    setFilteredUsers(result);
  }, [searchQuery, roleFilter, users]);

  const toggleRole = async (user: User) => {
    try {
      const newRole = user.role === 'admin' ? 'user' : 'admin';
      
      // Get ID token for authorization
      const idToken = await currentUser!.getIdToken(true);
      
      // Call API endpoint to update role
      const response = await fetch(`/api/admin/users/${user.uid}/role`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${idToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ role: newRole })
      });
      
      if (!response.ok) {
        throw new Error(`Failed to update role: ${response.status}`);
      }
      
      toast({
        title: "Role Updated",
        description: `${user.displayName} is now a ${newRole}`,
      });
      
      // Refresh user list
      fetchUsers();
    } catch (error: any) {
      console.error("Error updating role:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to update user role"
      });
    }
  };

  const handleEditUser = (user: User) => {
    setEditingUser({...user});
    setIsDialogOpen(true);
  };

  const handleSaveUser = async () => {
    if (!editingUser || !currentUser) return;
    
    try {
      // Get ID token for authorization
      const idToken = await currentUser.getIdToken(true);
      
      // Call API endpoint to update user
      const response = await fetch(`/api/admin/users/${editingUser.uid}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${idToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          displayName: editingUser.displayName,
          email: editingUser.email,
          department: editingUser.department,
          position: editingUser.position
        })
      });
      
      if (!response.ok) {
        throw new Error(`Failed to update user: ${response.status}`);
      }
      
      setIsDialogOpen(false);
      toast({
        title: "User Updated",
        description: "User information has been updated successfully",
      });
      
      // Refresh user list
      fetchUsers();
    } catch (error: any) {
      console.error("Error updating user:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to update user information"
      });
    }
  };

  const refreshData = () => {
    setRefreshing(true);
    fetchUsers().finally(() => setRefreshing(false));
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  if (loading || authLoading) {
    return (
      <div className="min-h-screen flex justify-center items-center bg-gradient-to-br from-slate-50 via-indigo-50/10 to-purple-50/5">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-indigo-600" />
          <p className="text-slate-600">Loading user management...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative bg-transparent">
      
      {/* Main Content */}
      <div className="space-y-6 p-6 max-w-7xl mx-auto relative z-10">
        {/* Enhanced Header Card */}
        <Card className="bg-white/90 backdrop-blur-xl border-white/30 shadow-2xl"
        style={{  background: "AE75DA"}}>
          <CardHeader className="pb-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <CardTitle className="text-3xl font-bold text-black bg-clip-text flex items-center gap-3">
                  <Crown className="h-8 w-8" />
                  User Role Management
                </CardTitle>
                <CardDescription className="text-slate-600 text-lg mt-2">
                  Manage user roles, permissions, and access levels
                </CardDescription>
              </div>
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={refreshData}
                  disabled={refreshing}
                  className="bg-white/80 backdrop-blur-sm border-slate-200 hover:bg-white hover:border-slate-300 shadow-sm"
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
                <div className="text-sm text-slate-500 bg-white/50 px-3 py-1 rounded-full border border-slate-200">
                  Updated: {format(lastUpdated, 'h:mm:ss a')}
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            {error && (
              <div className="bg-red-50/80 backdrop-blur-sm border border-red-200 rounded-xl p-4 mb-6">
                <div className="flex items-center gap-3">
                  <ShieldAlert className="h-5 w-5 text-red-600" />
                  <div>
                    <p className="font-semibold text-red-800">Error loading users</p>
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

            {/* Enhanced Filters */}
            <div className="flex flex-col md:flex-row gap-4 mb-6 bg-gradient-to-r from-slate-50/80 to-indigo-50/50 backdrop-blur-sm rounded-2xl p-6 border border-white/50">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
                <Input
                  placeholder="Search users by name, email, department..."
                  className="pl-10 h-11 bg-white/80 border-slate-200 focus:border-indigo-300"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="w-full md:w-auto h-11 bg-white/80 border-slate-200 hover:bg-white hover:border-slate-300">
                    <Filter className="h-4 w-4 mr-2" />
                    {roleFilter === "all" 
                      ? "All Roles" 
                      : roleFilter === "admin" 
                        ? "Admins Only" 
                        : "Users Only"}
                    <ChevronDown className="h-4 w-4 ml-2" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="bg-white/95 backdrop-blur-sm border border-slate-200">
                  <DropdownMenuItem onClick={() => setRoleFilter("all")} className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    <span>All Roles</span>
                    {roleFilter === "all" && <CheckCircle2 className="h-4 w-4 ml-auto text-green-500" />}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setRoleFilter("admin")} className="flex items-center gap-2">
                    <Crown className="h-4 w-4 text-purple-500" />
                    <span>Admins Only</span>
                    {roleFilter === "admin" && <CheckCircle2 className="h-4 w-4 ml-auto text-green-500" />}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setRoleFilter("user")} className="flex items-center gap-2">
                    <UserCheck className="h-4 w-4 text-blue-500" />
                    <span>Users Only</span>
                    {roleFilter === "user" && <CheckCircle2 className="h-4 w-4 ml-auto text-green-500" />}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Enhanced Table */}
            <Card className="bg-white/90 backdrop-blur-xl border-white/30 shadow-xl">
              <CardContent className="p-0">
                <div className="rounded-2xl overflow-hidden">
                  <Table>
                    <TableHeader className="bg-gradient-to-r from-slate-50 to-indigo-50/80 border-b border-slate-200">
                      <TableRow className="hover:bg-transparent">
                        <TableHead className="w-[300px] text-slate-700 font-bold text-base py-5">User Profile</TableHead>
                        <TableHead className="hidden lg:table-cell text-slate-700 font-bold text-base py-5">Department</TableHead>
                        <TableHead className="hidden md:table-cell text-slate-700 font-bold text-base py-5">Position</TableHead>
                        <TableHead className="text-slate-700 font-bold text-base py-5">Role Level</TableHead>
                        <TableHead className="text-right text-slate-700 font-bold text-base py-5">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredUsers.length > 0 ? (
                        filteredUsers.map((user) => (
                          <TableRow key={user.uid} className="border-b border-slate-100 hover:bg-slate-50/80 transition-colors duration-150 group">
                            <TableCell className="py-4">
                              <div className="flex items-center gap-4">
                                <Avatar className="h-12 w-12 border-2 border-white shadow-sm">
                                  <AvatarImage src={user.photoURL || ''} alt={user.displayName} />
                                  <AvatarFallback className={`text-sm font-semibold ${
                                    user.role === 'admin' 
                                      ? 'bg-gradient-to-br from-purple-500 to-indigo-600 text-white' 
                                      : 'bg-gradient-to-br from-blue-500 to-cyan-600 text-white'
                                  }`}>
                                    {getInitials(user.displayName || 'U')}
                                  </AvatarFallback>
                                </Avatar>
                                <div>
                                  <div className="font-semibold text-slate-800 text-base">{user.displayName || 'Unnamed User'}</div>
                                  <div className="text-sm text-slate-500 mt-1 flex items-center gap-1">
                                    <Mail className="h-3 w-3" />
                                    {user.email}
                                  </div>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="hidden lg:table-cell py-4">
                              <div className="text-slate-700 font-medium">
                                {user.department || <span className="text-slate-400 italic">Not assigned</span>}
                              </div>
                            </TableCell>
                            <TableCell className="hidden md:table-cell py-4">
                              <div className="text-slate-600">
                                {user.position || <span className="text-slate-400 italic">Not specified</span>}
                              </div>
                            </TableCell>
                            <TableCell className="py-4">
                              <Badge className={`px-3 py-1.5 text-sm font-semibold border ${
                                user.role === 'admin' 
                                  ? 'bg-purple-100 text-purple-800 border-purple-200 hover:bg-purple-100 shadow-sm' 
                                  : 'bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-100 shadow-sm'
                              }`}>
                                {user.role === 'admin' ? (
                                  <Crown className="h-3.5 w-3.5 mr-1.5" />
                                ) : (
                                  <UserCheck className="h-3.5 w-3.5 mr-1.5" />
                                )}
                                {user.role.toUpperCase()}
                              </Badge>
                            </TableCell>
                            <TableCell className="py-4">
                              <div className="flex justify-end gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleEditUser(user)}
                                  className="h-9 w-9 p-0 bg-white/80 border-slate-200 hover:bg-white hover:border-slate-300 shadow-sm"
                                >
                                  <Settings className="h-4 w-4" />
                                  <span className="sr-only">Edit</span>
                                </Button>
                                <Button
                                  variant={user.role === 'admin' ? 'outline' : 'default'}
                                  size="sm"
                                  onClick={() => toggleRole(user)}
                                  className={`h-9 font-semibold ${
                                    user.role === 'admin' 
                                      ? 'border-red-200 text-red-700 hover:bg-red-50 hover:text-red-800' 
                                      : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white shadow-lg hover:shadow-xl'
                                  }`}
                                >
                                  {user.role === 'admin' ? 'Revoke Admin' : 'Grant Admin'}
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={5} className="h-32 text-center">
                            {searchQuery || roleFilter !== "all" ? (
                              <div className="flex flex-col items-center gap-3 text-slate-500">
                                <Search className="h-12 w-12 opacity-40" />
                                <p className="text-lg">No users match your search criteria</p>
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  onClick={() => {
                                    setSearchQuery("");
                                    setRoleFilter("all");
                                  }}
                                  className="mt-2"
                                >
                                  Clear Filters
                                </Button>
                              </div>
                            ) : (
                              <div className="flex flex-col items-center gap-3 text-slate-500">
                                <Users className="h-12 w-12 opacity-40" />
                                <p className="text-lg">No users found in the system</p>
                              </div>
                            )}
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
                
                <div className="px-6 py-4 border-t border-slate-200/50 bg-slate-50/50">
                  <div className="text-sm text-slate-600 font-medium">
                    Displaying <span className="font-bold text-slate-800">{filteredUsers.length}</span> of{' '}
                    <span className="font-bold text-slate-800">{users.length}</span> users
                  </div>
                </div>
              </CardContent>
            </Card>
          </CardContent>
        </Card>

        {/* Enhanced Edit Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="sm:max-w-md bg-white/95 backdrop-blur-xl border-white/30">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold text-slate-800 flex items-center gap-2">
                <UserCog className="h-5 w-5 text-indigo-600" />
                Edit User Profile
              </DialogTitle>
              <DialogDescription className="text-slate-600">
                Update user information and organizational details
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="flex items-center justify-center mb-4">
                <Avatar className="h-20 w-20 border-4 border-white shadow-lg">
                  <AvatarImage src={editingUser?.photoURL || ''} alt={editingUser?.displayName} />
                  <AvatarFallback className={`text-lg font-bold ${
                    editingUser?.role === 'admin' 
                      ? 'bg-gradient-to-br from-purple-500 to-indigo-600 text-white' 
                      : 'bg-gradient-to-br from-blue-500 to-cyan-600 text-white'
                  }`}>
                    {getInitials(editingUser?.displayName || 'U')}
                  </AvatarFallback>
                </Avatar>
              </div>
              <div className="grid gap-2">
                <label htmlFor="name" className="text-sm font-semibold text-slate-700">Display Name</label>
                <Input
                  id="name"
                  value={editingUser?.displayName || ''}
                  onChange={(e) => setEditingUser(prev => 
                    prev ? {...prev, displayName: e.target.value} : null
                  )}
                  className="bg-white/80 border-slate-200 focus:border-indigo-300"
                />
              </div>
              <div className="grid gap-2">
                <label htmlFor="email" className="text-sm font-semibold text-slate-700">Email Address</label>
                <Input
                  id="email"
                  type="email"
                  value={editingUser?.email || ''}
                  onChange={(e) => setEditingUser(prev => 
                    prev ? {...prev, email: e.target.value} : null
                  )}
                  className="bg-white/80 border-slate-200 focus:border-indigo-300"
                />
              </div>
              <div className="grid gap-2">
                <label htmlFor="department" className="text-sm font-semibold text-slate-700">Department</label>
                <Input
                  id="department"
                  value={editingUser?.department || ''}
                  onChange={(e) => setEditingUser(prev => 
                    prev ? {...prev, department: e.target.value} : null
                  )}
                  className="bg-white/80 border-slate-200 focus:border-indigo-300"
                />
              </div>
              <div className="grid gap-2">
                <label htmlFor="position" className="text-sm font-semibold text-slate-700">Position</label>
                <Input
                  id="position"
                  value={editingUser?.position || ''}
                  onChange={(e) => setEditingUser(prev => 
                    prev ? {...prev, position: e.target.value} : null
                  )}
                  className="bg-white/80 border-slate-200 focus:border-indigo-300"
                />
              </div>
            </div>
            <DialogFooter>
              <Button 
                variant="outline" 
                onClick={() => setIsDialogOpen(false)}
                className="border-slate-300 text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </Button>
              <Button 
                onClick={handleSaveUser}
                className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white shadow-lg hover:shadow-xl"
              >
                Save Changes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}