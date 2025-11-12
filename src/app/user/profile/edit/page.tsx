"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth, db, storage } from "@/lib/firebase/firebase";
import {
  doc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
  updateDoc,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
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
import { AlertCircle, Loader2, Plus, Trash2, Camera, User } from "lucide-react";
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

// Create a default profile object
const defaultProfile: UserProfile = {
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
};

export default function EditProfilePage() {
  // State management
  const [user, authLoading] = useAuthState(auth);
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("basic");
  const [managers, setManagers] = useState<Manager[]>([]);
  const [newSkill, setNewSkill] = useState("");

  // Profile state - use the defaultProfile object
  const [profile, setProfile] = useState<UserProfile>(defaultProfile);

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
          setProfile({
            ...defaultProfile,
            displayName: user.displayName || "",
            email: user.email || "",
            photoURL: user.photoURL || "",
          });
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

  // Image upload handler
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!user || !e.target.files || !e.target.files[0]) return;

    const file = e.target.files[0];
    
    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        variant: "destructive",
        title: "Invalid file type",
        description: "Please select an image file (JPEG, PNG, etc.)",
      });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        variant: "destructive",
        title: "File too large",
        description: "Please select an image smaller than 5MB",
      });
      return;
    }

    setUploading(true);
    try {
      // Create a reference to the storage location
      const storageRef = ref(storage, `profile-pictures/${user.uid}/${file.name}`);
      
      // Upload the file
      const snapshot = await uploadBytes(storageRef, file);
      
      // Get the download URL
      const downloadURL = await getDownloadURL(snapshot.ref);
      
      // Update the profile state with the new image URL
      setProfile(prev => ({ ...prev, photoURL: downloadURL }));
      
      toast({
        title: "Success",
        description: "Profile picture updated successfully",
      });
    } catch (error) {
      console.error("Error uploading image:", error);
      toast({
        variant: "destructive",
        title: "Upload failed",
        description: "Failed to upload profile picture",
      });
    } finally {
      setUploading(false);
      // Reset the file input
      e.target.value = '';
    }
  };

  // Remove profile picture
  const handleRemoveImage = () => {
    setProfile(prev => ({ ...prev, photoURL: "" }));
    toast({
      title: "Profile picture removed",
      description: "Your profile picture has been removed",
    });
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
    <div className="max-w-4xl mx-auto p-6"
    style={{ background: "#FFF7DD" }}>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-blue-1000 bg-clip-text ">Edit Profile</h1>
        <Button
          onClick={() => router.push("/user/profile")}
          variant="outline"
          size="sm"
          className="bg-teal-100"
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
                <CardTitle className="text-xl text-blue-1000 bg-clip-text">Basic Information</CardTitle>
                <CardDescription>
                  Fields marked with <span className="text-red-500">*</span> are
                  required
                </CardDescription>
              </CardHeader>
              <CardContent>
                {/* Profile Image Section */}
                <div className="flex flex-col items-center mb-6">
                  <div className="relative group">
                    {profile.photoURL ? (
                      <img 
                        className="w-32 h-32 rounded-full object-cover border-4 border-gray-200 group-hover:border-gray-300 transition-colors"
                        src={profile.photoURL} 
                        alt="Profile picture" 
                      />
                    ) : (
                      <div className="w-32 h-32 rounded-full bg-gray-200 flex items-center justify-center border-4 border-gray-200 group-hover:border-gray-300 transition-colors">
                        <User className="h-16 w-16 text-gray-400" />
                      </div>
                    )}
                    
                    {/* Camera icon overlay */}
                    <div className="absolute inset-0 bg-black bg-opacity-40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                      <Camera className="h-8 w-8 text-white" />
                    </div>
                    
                    {/* Hidden file input */}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      disabled={uploading}
                    />
                  </div>
                  
                  {/* Upload status and actions */}
                  <div className="mt-4 flex flex-col items-center space-y-2">
                    {uploading && (
                      <div className="flex items-center space-x-2 text-blue-600">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span className="text-sm">Uploading...</span>
                      </div>
                    )}
                    
                    <div className="flex space-x-2">
                      <label className="cursor-pointer">
                        <span className="text-sm text-blue-600 hover:text-blue-900 font-medium">
                          Change Photo
                        </span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleImageUpload}
                          className="hidden"
                          disabled={uploading}
                        />
                      </label>
                      
                      {profile.photoURL && (
                        <button
                          type="button"
                          onClick={handleRemoveImage}
                          className="text-sm text-red-600 hover:text-red-700 font-medium"
                          disabled={uploading}
                        >
                          Remove
                        </button>
                      )}
                    </div>
                    
                    <p className="text-xs text-gray-500 text-center max-w-xs">
                      Click on the image to upload a new one<br />
                      JPG, PNG, WebP supported. Max 5MB.
                    </p>
                  </div>
                </div>

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

          {/* Rest of your tabs content remains the same */}
          <TabsContent value="location">
            {/* Your location tab content */}
          </TabsContent>

          <TabsContent value="employment">
            {/* Your employment tab content */}
          </TabsContent>

          <TabsContent value="education">
            {/* Your education tab content */}
          </TabsContent>

          <TabsContent value="additional">
            {/* Your additional tab content */}
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
          <Button type="submit" disabled={saving || uploading} className="min-w-[120px]">
            {(saving || uploading) ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {uploading ? 'Uploading...' : 'Saving...'}
              </>
            ) : (
              'Save Changes'
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}