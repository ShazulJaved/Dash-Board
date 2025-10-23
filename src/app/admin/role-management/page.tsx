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
  Users, RefreshCw, Filter, ChevronDown, CheckCircle2
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

  if (loading || authLoading) {
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
                <UserCog className="h-6 w-6 text-primary" />
                User Role Management
              </CardTitle>
              <CardDescription>
                Manage user roles and permissions for your organization
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={refreshData}
                disabled={refreshing}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <div className="text-xs text-muted-foreground">
                Last updated: {format(lastUpdated, 'h:mm:ss a')}
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="bg-destructive/10 text-destructive p-4 rounded-md mb-4">
              <p className="font-medium">Error loading users</p>
              <p className="text-sm">{error}</p>
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

          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search users by name, email, or department..."
                className="pl-8"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="w-full md:w-auto">
                  <Filter className="h-4 w-4 mr-2" />
                  {roleFilter === "all" 
                    ? "All Roles" 
                    : roleFilter === "admin" 
                      ? "Admins Only" 
                      : "Users Only"}
                  <ChevronDown className="h-4 w-4 ml-2" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => setRoleFilter("all")}>
                  <Users className="h-4 w-4 mr-2" />
                  All Roles
                  {roleFilter === "all" && <CheckCircle2 className="h-4 w-4 ml-2" />}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setRoleFilter("admin")}>
                  <ShieldAlert className="h-4 w-4 mr-2" />
                  Admins Only
                  {roleFilter === "admin" && <CheckCircle2 className="h-4 w-4 ml-2" />}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setRoleFilter("user")}>
                  <Shield className="h-4 w-4 mr-2" />
                  Users Only
                  {roleFilter === "user" && <CheckCircle2 className="h-4 w-4 ml-2" />}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead className="w-[250px]">User</TableHead>
                  <TableHead className="hidden md:table-cell">Department</TableHead>
                  <TableHead className="hidden md:table-cell">Position</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.length > 0 ? (
                  filteredUsers.map((user) => (
                    <TableRow key={user.uid} className="hover:bg-muted/50">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={user.photoURL || ''} alt={user.displayName} />
                            <AvatarFallback className={user.role === 'admin' ? 'bg-purple-100' : 'bg-blue-100'}>
                              {user.displayName?.charAt(0).toUpperCase() || '?'}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-medium">{user.displayName || 'Unnamed User'}</div>
                            <div className="text-xs text-muted-foreground">{user.email}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        {user.department || <span className="text-muted-foreground">Not set</span>}
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        {user.position || <span className="text-muted-foreground">Not set</span>}
                      </TableCell>
                      <TableCell>
                        <Badge variant={user.role === 'admin' ? 'default' : 'secondary'} className="capitalize">
                          {user.role === 'admin' ? (
                            <ShieldAlert className="h-3 w-3 mr-1" />
                          ) : (
                            <Shield className="h-3 w-3 mr-1" />
                          )}
                          {user.role}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEditUser(user)}
                            className="h-8 w-8 p-0"
                          >
                            <Pencil className="h-4 w-4" />
                            <span className="sr-only">Edit</span>
                          </Button>
                          <Button
                            variant={user.role === 'admin' ? 'destructive' : 'default'}
                            size="sm"
                            onClick={() => toggleRole(user)}
                            className="h-8"
                          >
                            {user.role === 'admin' ? 'Remove Admin' : 'Make Admin'}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center">
                      {searchQuery || roleFilter !== "all" ? (
                        <div className="flex flex-col items-center gap-2">
                          <p className="text-muted-foreground">No users match your search criteria</p>
                          <Button variant="outline" size="sm" onClick={() => {
                            setSearchQuery("");
                            setRoleFilter("all");
                          }}>
                            Clear Filters
                          </Button>
                        </div>
                      ) : (
                        <p className="text-muted-foreground">No users found</p>
                      )}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          
          <div className="mt-4 text-sm text-muted-foreground">
            Showing {filteredUsers.length} of {users.length} users
          </div>
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit User Profile</DialogTitle>
            <DialogDescription>
              Update user information and details
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="flex items-center justify-center mb-4">
              <Avatar className="h-16 w-16">
                <AvatarImage src={editingUser?.photoURL || ''} alt={editingUser?.displayName} />
                <AvatarFallback className={editingUser?.role === 'admin' ? 'bg-purple-100 text-lg' : 'bg-blue-100 text-lg'}>
                  {editingUser?.displayName?.charAt(0).toUpperCase() || '?'}
                </AvatarFallback>
              </Avatar>
            </div>
            <div className="grid gap-2">
              <label htmlFor="name" className="text-sm font-medium">Display Name</label>
              <Input
                id="name"
                value={editingUser?.displayName || ''}
                onChange={(e) => setEditingUser(prev => 
                  prev ? {...prev, displayName: e.target.value} : null
                )}
              />
            </div>
            <div className="grid gap-2">
              <label htmlFor="email" className="text-sm font-medium">Email Address</label>
              <Input
                id="email"
                type="email"
                value={editingUser?.email || ''}
                onChange={(e) => setEditingUser(prev => 
                  prev ? {...prev, email: e.target.value} : null
                )}
              />
            </div>
            <div className="grid gap-2">
              <label htmlFor="department" className="text-sm font-medium">Department</label>
              <Input
                id="department"
                value={editingUser?.department || ''}
                onChange={(e) => setEditingUser(prev => 
                  prev ? {...prev, department: e.target.value} : null
                )}
              />
            </div>
            <div className="grid gap-2">
              <label htmlFor="position" className="text-sm font-medium">Position</label>
              <Input
                id="position"
                value={editingUser?.position || ''}
                onChange={(e) => setEditingUser(prev => 
                  prev ? {...prev, position: e.target.value} : null
                )}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveUser}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
