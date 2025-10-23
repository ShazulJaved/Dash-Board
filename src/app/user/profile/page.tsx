'use client';

import { useState, useEffect } from 'react';
import { auth, db } from '@/lib/firebase/firebase';
import { useAuthState } from 'react-firebase-hooks/auth';
import { useRouter } from 'next/navigation';
import { doc, getDoc } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { formatDate } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, Pencil, UserCircle, Briefcase, GraduationCap, Code, Users } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

// Define interfaces for type safety
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

interface UserProfile {
  // Basic Information (Required)
  displayName: string;
  email: string;
  photoURL?: string;
  phoneNumber?: string;
  dateOfBirth?: string;
  dateOfJoining?: string;
  
  // Additional Information
  reportingManager?: string;
  reportingManagerId?: string;
  officeLocation?: string;
  homeLocation?: string;
  seatingLocation?: string;
  extensionNumber?: string;
  role: string;
  designation?: string;
  department?: string;
  position?: string;
  
  // Employment Details
  employeeType?: 'permanent' | 'freelancer' | 'contract' | 'probation';
  status?: 'active' | 'inactive' | 'terminated' | 'resigned';
  
  // Additional Details
  education?: Education[];
  experience?: Experience[];
  skills?: string[];
  dependents?: Dependent[];
  
  // System Fields
  createdAt?: Date | null;
  updatedAt?: Date | null;
}

interface ProfileField {
  label: string;
  key: keyof UserProfile;
  type?: 'text' | 'date' | 'status' | 'employeeType';
  required?: boolean;
}

export default function ProfilePage() {
  // State management
  const [user, authLoading] = useAuthState(auth);
  const [userDetails, setUserDetails] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("basic");

  // Hooks
  const router = useRouter();
  const { toast } = useToast();

  // Profile fields configuration
  const basicFields: ProfileField[] = [
    { label: 'Full Name', key: 'displayName', required: true },
    { label: 'Email', key: 'email', required: true },
    { label: 'Phone Number', key: 'phoneNumber', required: true },
    { label: 'Date of Birth', key: 'dateOfBirth', type: 'date', required: true },
    { label: 'Date of Joining', key: 'dateOfJoining', type: 'date', required: true },
    { label: 'Reporting Manager', key: 'reportingManager' },
    { label: 'Role', key: 'role' },
    { label: 'Designation', key: 'designation' },
  ];
  
  const locationFields: ProfileField[] = [
    { label: 'Office Location', key: 'officeLocation' },
    { label: 'Home Location', key: 'homeLocation' },
    { label: 'Seating Location', key: 'seatingLocation' },
    { label: 'Extension Number', key: 'extensionNumber' },
  ];
  
  const employmentFields: ProfileField[] = [
    { label: 'Employee Type', key: 'employeeType', type: 'employeeType' },
    { label: 'Status', key: 'status', type: 'status' },
    { label: 'Department', key: 'department' },
    { label: 'Position', key: 'position' },
  ];

  // Fetch user data
  useEffect(() => {
    async function fetchUserData() {
      if (!user) return;

      try {
        setLoading(true);
        setError(null);

        const userDoc = await getDoc(doc(db, 'users', user.uid));
        
        if (!userDoc.exists()) {
          throw new Error('User profile not found');
        }

        const data = userDoc.data();
        setUserDetails({
          ...data,
          createdAt: data.createdAt?.toDate(),
          updatedAt: data.updatedAt?.toDate()
        } as UserProfile);

      } catch (error) {
        console.error('Error fetching user data:', error);
        setError(error instanceof Error ? error.message : 'Failed to fetch user data');
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to fetch user data",
          action: (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => fetchUserData()}
            >
              Retry
            </Button>
          ),
        });
      } finally {
        setLoading(false);
      }
    }

    if (!user && !authLoading) {
      router.push('/auth/sign-in');
    } else if (user) {
      fetchUserData();
    }
  }, [user, authLoading, router, toast]);

  // Loading state
  if (authLoading || loading) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <Skeleton className="h-12 w-48 mb-8" />
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-4">
              {[...Array(7)].map((_, i) => (
                <div key={i} className="grid grid-cols-1 md:grid-cols-12 gap-x-8">
                  <Skeleton className="h-6 w-24 md:col-span-4" />
                  <Skeleton className="h-6 w-full md:col-span-8" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2 text-red-800">
              <AlertCircle className="h-5 w-5" />
              <p>{error}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // No user details state
  if (!userDetails) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <Card>
          <CardContent className="pt-6 text-center">
            <UserCircle className="h-12 w-12 mx-auto text-gray-400" />
            <p className="mt-2">User details not found.</p>
            <Button 
              onClick={() => router.push('/user/profile/edit')}
              variant="outline"
              size="sm"
              className="mt-4"
            >
              <Pencil className="h-4 w-4 mr-2" />
              Complete Your Profile
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Helper function to render field value
  const renderFieldValue = (field: ProfileField) => {
    const value = userDetails[field.key];
    
    if (field.type === 'date') {
      return <span>{value ? formatDate(value as string) : 'Not provided'}</span>;
    } else if (field.type === 'status') {
      const status = value as string;
      let variant: "default" | "success" | "warning" | "destructive" = "default";
      
      if (status === 'active') variant = "success";
      else if (status === 'resigned') variant = "warning";
      else if (status === 'terminated') variant = "destructive";
      
      return <Badge variant={variant}>{status || 'Not specified'}</Badge>;
    } else if (field.type === 'employeeType') {
      const type = value as string;
      let variant: "default" | "outline" | "secondary" = "default";
      
      if (type === 'permanent') variant = "secondary";
      else if (type === 'contract' || type === 'freelancer') variant = "outline";
      
      return <Badge variant={variant}>{type || 'Not specified'}</Badge>;
    } else {
      return <span>{value ? String(value) : 'Not provided'}</span>;
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Profile Details</h1>
        <Button 
          onClick={() => router.push('/user/profile/edit')}
          variant="outline"
          size="sm"
        >
          <Pencil className="h-4 w-4 mr-2" />
          Edit Profile
        </Button>
      </div>
      
      <Card className="mb-8">
        <CardHeader className="pb-4">
          <div className="flex items-center space-x-4">
            <Avatar className="h-20 w-20">
              <AvatarImage src={userDetails.photoURL} alt={userDetails.displayName} />
              <AvatarFallback>{userDetails.displayName?.[0]}</AvatarFallback>
            </Avatar>
            <div>
              <CardTitle className="text-2xl">{userDetails.displayName}</CardTitle>
              <CardDescription className="text-base">{userDetails.designation || userDetails.role}</CardDescription>
              <p className="text-sm text-gray-500 mt-1">{userDetails.email}</p>
            </div>
          </div>
        </CardHeader>
      </Card>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-8">
        <TabsList className="grid grid-cols-5 mb-6">
          <TabsTrigger value="basic">Basic Info</TabsTrigger>
          <TabsTrigger value="location">Location</TabsTrigger>
          <TabsTrigger value="employment">Employment</TabsTrigger>
          <TabsTrigger value="education">Education</TabsTrigger>
          <TabsTrigger value="additional">Additional</TabsTrigger>
        </TabsList>
        
        <TabsContent value="basic">
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">Basic Information</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-4">
                {basicFields.map((field) => (
                  <li 
                    key={field.key} 
                    className="grid grid-cols-1 md:grid-cols-12 gap-x-8 items-center py-2 border-b border-gray-100"
                  >
                    <div className="md:col-span-4">
                      <span className="text-gray-600">
                        {field.label}
                        {field.required && <span className="text-red-500 ml-1">*</span>}
                      </span>
                    </div>
                    <div className="md:col-span-8">
                      {renderFieldValue(field)}
                    </div>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="location">
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">Location Information</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-4">
                {locationFields.map((field) => (
                  <li 
                    key={field.key} 
                    className="grid grid-cols-1 md:grid-cols-12 gap-x-8 items-center py-2 border-b border-gray-100"
                  >
                    <div className="md:col-span-4">
                      <span className="text-gray-600">
                        {field.label}
                        {field.required && <span className="text-red-500 ml-1">*</span>}
                      </span>
                    </div>
                    <div className="md:col-span-8">
                      {renderFieldValue(field)}
                    </div>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="employment">
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">Employment Details</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-4">
                {employmentFields.map((field) => (
                  <li 
                    key={field.key} 
                    className="grid grid-cols-1 md:grid-cols-12 gap-x-8 items-center py-2 border-b border-gray-100"
                  >
                    <div className="md:col-span-4">
                      <span className="text-gray-600">
                        {field.label}
                        {field.required && <span className="text-red-500 ml-1">*</span>}
                      </span>
                    </div>
                    <div className="md:col-span-8">
                      {renderFieldValue(field)}
                    </div>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="education">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <GraduationCap className="h-5 w-5 mr-2" />
                Educational Details
              </CardTitle>
            </CardHeader>
            <CardContent>
              {userDetails.education && userDetails.education.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Institute Name</TableHead>
                      <TableHead>Start Date</TableHead>
                      <TableHead>End Date</TableHead>
                      <TableHead>Results</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {userDetails.education.map((edu, index) => (
                      <TableRow key={index}>
                        <TableCell>{edu.institute}</TableCell>
                        <TableCell>{formatDate(edu.startDate)}</TableCell>
                        <TableCell>{formatDate(edu.endDate)}</TableCell>
                        <TableCell>{edu.results}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <GraduationCap className="h-12 w-12 mx-auto text-gray-300 mb-2" />
                  <p>No educational details added yet.</p>
                </div>
              )}
            </CardContent>
          </Card>
          
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Briefcase className="h-5 w-5 mr-2" />
                Work Experience
              </CardTitle>
            </CardHeader>
            <CardContent>
              {userDetails.experience && userDetails.experience.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Company</TableHead>
                      <TableHead>Designation</TableHead>
                      <TableHead>Years of Service</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {userDetails.experience.map((exp, index) => (
                      <TableRow key={index}>
                        <TableCell>{exp.company}</TableCell>
                        <TableCell>{exp.designation}</TableCell>
                        <TableCell>{exp.years}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Briefcase className="h-12 w-12 mx-auto text-gray-300 mb-2" />
                  <p>No work experience added yet.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="additional">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Code className="h-5 w-5 mr-2" />
                  Skills
                </CardTitle>
              </CardHeader>
              <CardContent>
                {userDetails.skills && userDetails.skills.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {userDetails.skills.map((skill, index) => (
                      <Badge key={index} variant="secondary">{skill}</Badge>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6 text-gray-500">
                    <p>No skills added yet.</p>
                  </div>
                )}
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Users className="h-5 w-5 mr-2" />
                  Dependent Details
                </CardTitle>
              </CardHeader>
              <CardContent>
                {userDetails.dependents && userDetails.dependents.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Mobile</TableHead>
                        <TableHead>Relationship</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {userDetails.dependents.map((dep, index) => (
                        <TableRow key={index}>
                          <TableCell>{dep.name}</TableCell>
                          <TableCell>{dep.mobile}</TableCell>
                          <TableCell>{dep.relationship}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-6 text-gray-500">
                    <p>No dependents added yet.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
