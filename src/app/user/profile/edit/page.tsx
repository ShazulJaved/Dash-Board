"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth, db } from "@/lib/firebase/firebase";
import {
  doc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
} from "firebase/firestore";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AlertCircle, Loader2, Plus, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

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
  phoneNumber: string;
  dateOfBirth: string;
  dateOfJoining: string;

  // Additional Information
  photoURL?: string;
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
  employeeType?: "permanent" | "freelancer" | "contract" | "probation";
  status?: "active" | "terminated" | "resigned";

  // Additional Details
  education?: Education[];
  experience?: Experience[];
  skills?: string[];
  dependents?: Dependent[];
}

interface Manager {
  id: string;
  displayName: string;
}

export default function EditProfilePage() {
  // State management
  const [user, authLoading] = useAuthState(auth);
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("basic");
  const [managers, setManagers] = useState<Manager[]>([]);
  const [newSkill, setNewSkill] = useState("");

  // Profile state
  const [profile, setProfile] = useState<UserProfile>({
    displayName: "",
    email: "",
    phoneNumber: "",
    dateOfBirth: "",
    dateOfJoining: "",
    role: "user",
    education: [],
    experience: [],
    skills: [],
    dependents: [],
  });

  // Education and Experience state
  const [newEducation, setNewEducation] = useState<Education>({
    institute: "",
    startDate: "",
    endDate: "",
    results: "",
  });
  const [newExperience, setNewExperience] = useState<Experience>({
    company: "",
    designation: "",
    years: "",
  });
  const [newDependent, setNewDependent] = useState<Dependent>({
    name: "",
    mobile: "",
    relationship: "",
  });

  // Dialog states
  const [educationDialogOpen, setEducationDialogOpen] = useState(false);
  const [experienceDialogOpen, setExperienceDialogOpen] = useState(false);
  const [dependentDialogOpen, setDependentDialogOpen] = useState(false);

  // Fetch user data and managers
useEffect(() => {
  async function fetchData() {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);

      // Fetch user profile
      const userDoc = await getDoc(doc(db, "users", user.uid));

      if (userDoc.exists()) {
        const data = userDoc.data();
        setProfile({
          displayName: data.displayName || user.displayName || "",
          email: data.email || user.email || "",
          phoneNumber: data.phoneNumber || "",
          dateOfBirth: data.dateOfBirth || "",
          dateOfJoining:
            data.dateOfJoining || new Date().toISOString().split("T")[0],
          photoURL: data.photoURL || user.photoURL || "",
          reportingManager: data.reportingManager || "",
          reportingManagerId: data.reportingManagerId || "",
          officeLocation: data.officeLocation || "",
          homeLocation: data.homeLocation || "",
          seatingLocation: data.seatingLocation || "",
          extensionNumber: data.extensionNumber || "",
          role: data.role || "user",
          designation: data.designation || "",
          department: data.department || "",
          position: data.position || "",
          employeeType: data.employeeType || "",
          status: data.status || "active",
          education: data.education || [],
          experience: data.experience || [],
          skills: data.skills || [],
          dependents: data.dependents || [],
        });
      } else {
        // Set defaults from Firebase auth user
        setProfile((prev) => ({
          ...prev,
          displayName: user.displayName || "",
          email: user.email || "",
          photoURL: user.photoURL || "",
        }));
      }

      // Fetch admin users directly from Firestore
      try {
        const adminsQuery = query(
          collection(db, "users"),
          where("role", "==", "admin")
        );
        const adminsSnapshot = await getDocs(adminsQuery);
        const adminsList: Manager[] = [];

        adminsSnapshot.forEach((doc) => {
          adminsList.push({
            id: doc.id,
            displayName: doc.data().displayName || doc.data().email || "Admin User",
          });
        });

        setManagers(adminsList);
      } catch (error) {
        console.error("Error fetching admin users:", error);
        setManagers([]);
      }

    } catch (error) {
      console.error("Error fetching data:", error);
      setError(
        error instanceof Error ? error.message : "Failed to fetch data"
      );
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load profile data",
      });
    } finally {
      setLoading(false);
    }
  }

  if (!user && !authLoading) {
    router.push("/auth/sign-in");
  } else if (user) {
    fetchData();
  }
}, [user, authLoading, router, toast]);


  // Handle form input changes
  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setProfile((prev) => ({ ...prev, [name]: value }));
  };

  // Handle select changes
  const handleSelectChange = (name: string, value: string) => {
    setProfile((prev) => ({ ...prev, [name]: value }));
  };

  // Handle education form
  const handleEducationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setNewEducation((prev) => ({ ...prev, [name]: value }));
  };

  // Add education
  const addEducation = () => {
    const education = [...(profile.education || []), newEducation];
    setProfile({ ...profile, education });
    setNewEducation({ institute: "", startDate: "", endDate: "", results: "" });
    setEducationDialogOpen(false);
  };

  // Remove education
  const removeEducation = (index: number) => {
    const education = [...(profile.education || [])];
    education.splice(index, 1);
    setProfile({ ...profile, education });
  };

  // Handle experience form
  const handleExperienceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setNewExperience((prev) => ({ ...prev, [name]: value }));
  };

  // Add experience
  const addExperience = () => {
    const experience = [...(profile.experience || []), newExperience];
    setProfile({ ...profile, experience });
    setNewExperience({ company: "", designation: "", years: "" });
    setExperienceDialogOpen(false);
  };

  // Remove experience
  const removeExperience = (index: number) => {
    const experience = [...(profile.experience || [])];
    experience.splice(index, 1);
    setProfile({ ...profile, experience });
  };

  // Handle dependent form
  const handleDependentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setNewDependent((prev) => ({ ...prev, [name]: value }));
  };

  // Add dependent
  const addDependent = () => {
    const dependents = [...(profile.dependents || []), newDependent];
    setProfile({ ...profile, dependents });
    setNewDependent({ name: "", mobile: "", relationship: "" });
    setDependentDialogOpen(false);
  };

  // Remove dependent
  const removeDependent = (index: number) => {
    const dependents = [...(profile.dependents || [])];
    dependents.splice(index, 1);
    setProfile({ ...profile, dependents });
  };

  // Add skill
  const addSkill = () => {
    if (!newSkill.trim()) return;

    const skills = [...(profile.skills || []), newSkill.trim()];
    setProfile({ ...profile, skills });
    setNewSkill("");
  };

  // Remove skill
  const removeSkill = (index: number) => {
    const skills = [...(profile.skills || [])];
    skills.splice(index, 1);
    setProfile({ ...profile, skills });
  };

  // Save profile
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    // Validate required fields
    const requiredFields = [
      "displayName",
      "email",
      "phoneNumber",
      "dateOfBirth",
      "dateOfJoining",
    ];
    const missingFields = requiredFields.filter(
      (field) => !profile[field as keyof UserProfile]
    );

    if (missingFields.length > 0) {
      toast({
        variant: "destructive",
        title: "Missing required fields",
        description: `Please fill in all required fields: ${missingFields.join(
          ", "
        )}`,
      });
      return;
    }

    setSaving(true);
    try {
      // Use the API endpoint to update the profile
      const response = await fetch('/api/auth/verify', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await user.getIdToken()}`
        },
        body: JSON.stringify(profile)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update profile');
      }

      toast({
        title: "Success",
        description: "Profile updated successfully",
      });
      router.push("/user/profile");
    } catch (error) {
      console.error("Error updating profile:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update profile"
      });
    } finally {
      setSaving(false);
    }
  };

  // Loading state
  if (authLoading || loading) {
    return (
      <div className="max-w-4xl mx-auto p-6 flex justify-center items-center min-h-[60vh]">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto" />
          <p className="mt-2 text-gray-500">Loading profile data...</p>
        </div>
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

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Edit Profile</h1>
        <Button
          onClick={() => router.push("/user/profile")}
          variant="outline"
          size="sm"
        >
          Cancel
        </Button>
      </div>

      <form onSubmit={handleSubmit}>
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
                <CardDescription>
                  Fields marked with <span className="text-red-500">*</span> are
                  required
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="displayName">
                        Full Name <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="displayName"
                        name="displayName"
                        value={profile.displayName}
                        onChange={handleInputChange}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="email">
                        Email <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="email"
                        name="email"
                        type="email"
                        value={profile.email}
                        onChange={handleInputChange}
                        required
                        disabled
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="phoneNumber">
                        Phone Number <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="phoneNumber"
                        name="phoneNumber"
                        value={profile.phoneNumber}
                        onChange={handleInputChange}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="dateOfBirth">
                        Date of Birth <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="dateOfBirth"
                        name="dateOfBirth"
                        type="date"
                        value={profile.dateOfBirth}
                        onChange={handleInputChange}
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="dateOfJoining">
                        Date of Joining <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="dateOfJoining"
                        name="dateOfJoining"
                        type="date"
                        value={profile.dateOfJoining}
                        onChange={handleInputChange}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="reportingManagerId">
                        Reporting Manager
                      </Label>
                      <Select
                        value={profile.reportingManagerId || ""}
                        onValueChange={(value) => {
                          const manager = managers.find((m) => m.id === value);
                          setProfile({
                            ...profile,
                            reportingManagerId: value,
                            reportingManager: manager
                              ? manager.displayName
                              : "",
                          });
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select a manager" />
                        </SelectTrigger>
                        <SelectContent>
                          {managers.map((manager) => (
                            <SelectItem key={manager.id} value={manager.id}>
                              {manager.displayName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="designation">Designation</Label>
                      <Input
                        id="designation"
                        name="designation"
                        value={profile.designation || ""}
                        onChange={handleInputChange}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="department">Department</Label>
                      <Input
                        id="department"
                        name="department"
                        value={profile.department || ""}
                        onChange={handleInputChange}
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="location">
            <Card>
              <CardHeader>
                <CardTitle className="text-xl">Location Information</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="officeLocation">Office Location</Label>
                      <Input
                        id="officeLocation"
                        name="officeLocation"
                        value={profile.officeLocation || ""}
                        onChange={handleInputChange}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="homeLocation">Home Location</Label>
                      <Input
                        id="homeLocation"
                        name="homeLocation"
                        value={profile.homeLocation || ""}
                        onChange={handleInputChange}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="seatingLocation">Seating Location</Label>
                      <Input
                        id="seatingLocation"
                        name="seatingLocation"
                        value={profile.seatingLocation || ""}
                        onChange={handleInputChange}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="extensionNumber">Extension Number</Label>
                      <Input
                        id="extensionNumber"
                        name="extensionNumber"
                        value={profile.extensionNumber || ""}
                        onChange={handleInputChange}
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="employment">
            <Card>
              <CardHeader>
                <CardTitle className="text-xl">Employment Details</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="employeeType">Employee Type</Label>
                      <Select
                        value={profile.employeeType || ""}
                        onValueChange={(value) =>
                          handleSelectChange("employeeType", value)
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select employee type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="permanent">Permanent</SelectItem>
                          <SelectItem value="freelancer">Freelancer</SelectItem>
                          <SelectItem value="contract">On Contract</SelectItem>
                          <SelectItem value="probation">
                            Probation Period
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="status">Status</Label>
                      <Select
                        value={profile.status || ""}
                        onValueChange={(value) =>
                          handleSelectChange("status", value)
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="active">Active</SelectItem>
                          <SelectItem value="terminated">Terminated</SelectItem>
                          <SelectItem value="resigned">Resigned</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="position">Position</Label>
                      <Input
                        id="position"
                        name="position"
                        value={profile.position || ""}
                        onChange={handleInputChange}
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="education">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-xl">Educational Details</CardTitle>
                <Dialog
                  open={educationDialogOpen}
                  onOpenChange={setEducationDialogOpen}
                >
                  <DialogTrigger asChild>
                    <Button size="sm">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Education
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add Education</DialogTitle>
                      <DialogDescription>
                        Add your educational qualification details
                      </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      <div className="space-y-2">
                        <Label htmlFor="institute">Institute Name</Label>
                        <Input
                          id="institute"
                          name="institute"
                          value={newEducation.institute}
                          onChange={handleEducationChange}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="startDate">Start Date</Label>
                          <Input
                            id="startDate"
                            name="startDate"
                            type="date"
                            value={newEducation.startDate}
                            onChange={handleEducationChange}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="endDate">End Date</Label>
                          <Input
                            id="endDate"
                            name="endDate"
                            type="date"
                            value={newEducation.endDate}
                            onChange={handleEducationChange}
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="results">Results</Label>
                        <Input
                          id="results"
                          name="results"
                          value={newEducation.results}
                          onChange={handleEducationChange}
                          placeholder="e.g., First Class, 3.8 GPA"
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button
                        variant="outline"
                        onClick={() => setEducationDialogOpen(false)}
                      >
                        Cancel
                      </Button>
                      <Button onClick={addEducation}>Add</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                {profile.education && profile.education.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Institute Name</TableHead>
                        <TableHead>Start Date</TableHead>
                        <TableHead>End Date</TableHead>
                        <TableHead>Results</TableHead>
                        <TableHead className="w-[100px]">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {profile.education.map((edu, index) => (
                        <TableRow key={index}>
                          <TableCell>{edu.institute}</TableCell>
                          <TableCell>{edu.startDate}</TableCell>
                          <TableCell>{edu.endDate}</TableCell>
                          <TableCell>{edu.results}</TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeEducation(index)}
                            >
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <p>No educational details added yet.</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="mt-6">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-xl">Work Experience</CardTitle>
                <Dialog
                  open={experienceDialogOpen}
                  onOpenChange={setExperienceDialogOpen}
                >
                  <DialogTrigger asChild>
                    <Button size="sm">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Experience
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add Work Experience</DialogTitle>
                      <DialogDescription>
                        Add your previous work experience
                      </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      <div className="space-y-2">
                        <Label htmlFor="company">Company Name</Label>
                        <Input
                          id="company"
                          name="company"
                          value={newExperience.company}
                          onChange={handleExperienceChange}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="designation">Designation</Label>
                        <Input
                          id="designation"
                          name="designation"
                          value={newExperience.designation}
                          onChange={handleExperienceChange}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="years">Years of Service</Label>
                        <Input
                          id="years"
                          name="years"
                          value={newExperience.years}
                          onChange={handleExperienceChange}
                          placeholder="e.g., 2 years 3 months"
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button
                        variant="outline"
                        onClick={() => setExperienceDialogOpen(false)}
                      >
                        Cancel
                      </Button>
                      <Button onClick={addExperience}>Add</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                {profile.experience && profile.experience.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Company</TableHead>
                        <TableHead>Designation</TableHead>
                        <TableHead>Years of Service</TableHead>
                        <TableHead className="w-[100px]">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {profile.experience.map((exp, index) => (
                        <TableRow key={index}>
                          <TableCell>{exp.company}</TableCell>
                          <TableCell>{exp.designation}</TableCell>
                          <TableCell>{exp.years}</TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeExperience(index)}
                            >
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <p>No work experience added yet.</p>
                  </div>
                )}
              </CardContent>

            </Card>
          </TabsContent>

          <TabsContent value="additional">
            <div className="grid grid-cols-1 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-xl">Skills</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2 mb-4">
                    {profile.skills &&
                      profile.skills.map((skill, index) => (
                        <Badge
                          key={index}
                          variant="secondary"
                          className="px-3 py-1"
                        >
                          {skill}
                          <button
                            className="ml-2 text-gray-500 hover:text-red-500"
                            onClick={() => removeSkill(index)}
                          >
                            ×
                          </button>
                        </Badge>
                      ))}
                  </div>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Add a skill"
                      value={newSkill}
                      onChange={(e) => setNewSkill(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          addSkill();
                        }
                      }}
                    />
                    <Button onClick={addSkill}>Add</Button>
                  </div>
                </CardContent>
              </Card>

              <Card className="mt-6">
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-xl">Dependent Details</CardTitle>
                  <Dialog
                    open={dependentDialogOpen}
                    onOpenChange={setDependentDialogOpen}
                  >
                    <DialogTrigger asChild>
                      <Button size="sm">
                        <Plus className="h-4 w-4 mr-2" />
                        Add Dependent
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Add Dependent</DialogTitle>
                        <DialogDescription>
                          Add details of your dependent
                        </DialogDescription>
                      </DialogHeader>
                      <div className="grid gap-4 py-4">
                        <div className="space-y-2">
                          <Label htmlFor="name">Name</Label>
                          <Input
                            id="name"
                            name="name"
                            value={newDependent.name}
                            onChange={handleDependentChange}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="mobile">Mobile Number</Label>
                          <Input
                            id="mobile"
                            name="mobile"
                            value={newDependent.mobile}
                            onChange={handleDependentChange}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="relationship">Relationship</Label>
                          <Select
                            value={newDependent.relationship}
                            onValueChange={(value) =>
                              setNewDependent((prev) => ({
                                ...prev,
                                relationship: value,
                              }))
                            }
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select relationship" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Father">Father</SelectItem>
                              <SelectItem value="Mother">Mother</SelectItem>
                              <SelectItem value="Brother">Brother</SelectItem>
                              <SelectItem value="Sister">Sister</SelectItem>
                              <SelectItem value="Spouse">Spouse</SelectItem>
                              <SelectItem value="Child">Child</SelectItem>
                              <SelectItem value="Friend">Friend</SelectItem>
                              <SelectItem value="Other">Other</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <DialogFooter>
                        <Button
                          variant="outline"
                          onClick={() => setDependentDialogOpen(false)}
                        >
                          Cancel
                        </Button>
                        <Button onClick={addDependent}>Add</Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </CardHeader>
                <CardContent>
                  {profile.dependents && profile.dependents.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Mobile</TableHead>
                          <TableHead>Relationship</TableHead>
                          <TableHead className="w-[100px]">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {profile.dependents.map((dep, index) => (
                          <TableRow key={index}>
                            <TableCell>{dep.name}</TableCell>
                            <TableCell>{dep.mobile}</TableCell>
                            <TableCell>{dep.relationship}</TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => removeDependent(index)}
                              >
                                <Trash2 className="h-4 w-4 text-red-500" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <p>No dependents added yet.</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>

        <div className="mt-8 flex justify-end space-x-4">
          <Button  
            type="button"
            variant="outline"
            onClick={() => router.push("/user/profile")}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={saving} className="min-w-[120px]">
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              "Save Changes"
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}