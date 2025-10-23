"use client";

import { useState, useEffect, useRef } from "react";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth, db, storage } from "@/lib/firebase/firebase";
import { doc, getDoc, updateDoc, setDoc } from "firebase/firestore"; // Added setDoc import
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { updateProfile } from "firebase/auth";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import {
  Loader2,
  Camera,
  User,
  Mail,
  Phone,
  Building,
  Briefcase,
  Calendar,
  Save,
  X,
} from "lucide-react";
import { format } from "date-fns";

interface ProfileData {
  displayName: string;
  email: string;
  phoneNumber: string;
  department: string;
  position: string;
  bio: string;
  joinDate: string;
  photoURL: string;
}

export default function AdminProfilePage() {
  const [user, authLoading] = useAuthState(auth);
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [profile, setProfile] = useState<ProfileData>({
    displayName: "",
    email: "",
    phoneNumber: "",
    department: "",
    position: "",
    bio: "",
    joinDate: "",
    photoURL: "",
  });

  // Redirect if not authenticated
  useEffect(() => {
    if (!user && !authLoading) {
      router.push("/auth/sign-in");
    }
  }, [user, authLoading, router]);

  // Fetch user profile data
  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!user) return;

      try {
        setLoading(true);
        const userDocRef = doc(db, "users", user.uid);
        const userDoc = await getDoc(userDocRef);

        if (userDoc.exists()) {
          const userData = userDoc.data();

          // Always use the email from Firebase Auth as it's guaranteed to exist
          setProfile({
            displayName: userData.displayName || user.displayName || "",
            email: user.email || "", // Prioritize the email from Firebase Auth
            phoneNumber: userData.phoneNumber || "",
            department: userData.department || "",
            position: userData.position || "",
            bio: userData.bio || "",
            joinDate: userData.joinDate
              ? format(new Date(userData.joinDate), "yyyy-MM-dd")
              : "",
            photoURL: userData.photoURL || user.photoURL || "",
          });
        } else {
          // If no user document exists, create one with the auth data
          const newUserData = {
            displayName: user.displayName || "",
            email: user.email || "",
            phoneNumber: "",
            department: "",
            position: "",
            bio: "",
            joinDate: format(new Date(), "yyyy-MM-dd"),
            photoURL: user.photoURL || "",
            role: "admin",
            createdAt: new Date(),
            updatedAt: new Date(),
          };

          // Create the user document
          await setDoc(userDocRef, newUserData);

          setProfile(newUserData);
        }
      } catch (error) {
        console.error("Error fetching user profile:", error);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to load profile data",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchUserProfile();
  }, [user, toast]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setProfile((prev) => ({ ...prev, [name]: value }));
  };

  const handlePhotoClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    try {
      setIsUploading(true);
      setUploadProgress(0);

      // Check if storage is available
      if (typeof storage === "undefined") {
        // Fallback to a placeholder image or show an error
        toast({
          variant: "destructive",
          title: "Storage Not Available",
          description:
            "Firebase Storage is not configured. Please contact your administrator.",
        });
        setIsUploading(false);
        return;
      }

      // Create a storage reference
      const storageRef = ref(
        storage,
        `profile-photos/${user.uid}/${Date.now()}-${file.name}`
      );

      // Upload file with progress monitoring
      const uploadTask = uploadBytesResumable(storageRef, file);

      uploadTask.on(
        "state_changed",
        (snapshot) => {
          const progress =
            (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          setUploadProgress(progress);
        },
        (error) => {
          console.error("Upload error:", error);
          toast({
            variant: "destructive",
            title: "Upload Failed",
            description: "Failed to upload profile photo",
          });
          setIsUploading(false);
        },
        async () => {
          // Upload completed successfully
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);

          // Update profile state
          setProfile((prev) => ({ ...prev, photoURL: downloadURL }));

          // Update auth profile
          await updateProfile(user, { photoURL: downloadURL });

          // Update Firestore document
          const userDocRef = doc(db, "users", user.uid);
          await updateDoc(userDocRef, { photoURL: downloadURL });

          toast({
            title: "Photo Updated",
            description: "Your profile photo has been updated successfully",
          });

          setIsUploading(false);
        }
      );
    } catch (error) {
      console.error("Error uploading photo:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update profile photo",
      });
      setIsUploading(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!user) return;

    try {
      setSaving(true);

      // Update Firestore document
      const userDocRef = doc(db, "users", user.uid);
      await updateDoc(userDocRef, {
        displayName: profile.displayName,
        phoneNumber: profile.phoneNumber,
        department: profile.department,
        position: profile.position,
        bio: profile.bio,
        joinDate: profile.joinDate,
        updatedAt: new Date(),
      });

      // Update auth profile
      await updateProfile(user, {
        displayName: profile.displayName,
      });

      toast({
        title: "Profile Updated",
        description: "Your profile has been updated successfully",
      });
    } catch (error) {
      console.error("Error updating profile:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update profile",
      });
    } finally {
      setSaving(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!user) {
    return null; // Will redirect in useEffect
  }

  return (
    <div className="container mx-auto py-10 px-4 max-w-4xl">
      <h1 className="text-3xl font-bold mb-6">Admin Profile</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Profile Photo Card */}
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle>Profile Photo</CardTitle>
            <CardDescription>Update your profile picture</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center">
            <div className="relative mb-4">
              <Avatar className="h-32 w-32">
                <AvatarImage src={profile.photoURL} alt={profile.displayName} />
                <AvatarFallback className="text-2xl">
                  {profile.displayName?.charAt(0) || user.email?.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <button 
                className="absolute bottom-0 right-0 bg-blue-600 text-white p-2 rounded-full hover:bg-blue-700 transition-colors"
                onClick={handlePhotoClick}
                disabled={isUploading}
              >
                <Camera className="h-4 w-4" />
              </button>
              <input 
                type="file" 
                ref={fileInputRef}
                className="hidden"
                accept="image/*"
                onChange={handleFileChange}
              />
            </div>
            
            {isUploading && (
              <div className="w-full">
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-blue-600 transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  ></div>
                </div>
                <p className="text-sm text-center mt-1">Uploading: {Math.round(uploadProgress)}%</p>
              </div>
            )}
            
            <div className="text-center mt-4">
              <h3 className="font-medium text-lg">{profile.displayName || 'Admin User'}</h3>
              <p className="text-gray-500">{profile.email}</p>
              <p className="text-gray-500">{profile.position}</p>
              <p className="text-gray-500">{profile.department}</p>
            </div>
          </CardContent>
        </Card>
        
        {/* Profile Details Card */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Profile Information</CardTitle>
            <CardDescription>Update your account details</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="personal">
              <TabsList className="mb-4">
                <TabsTrigger value="personal">Personal Info</TabsTrigger>
                <TabsTrigger value="work">Work Details</TabsTrigger>
              </TabsList>
              
              <TabsContent value="personal" className="space-y-4">
                <div className="grid grid-cols-1 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="displayName" className="flex items-center gap-2">
                      <User className="h-4 w-4" />
                      Full Name
                    </Label>
                    <Input
                      id="displayName"
                      name="displayName"
                      value={profile.displayName}
                      onChange={handleInputChange}
                      placeholder="Your full name"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="email" className="flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      Email
                    </Label>
                    <Input
                      id="email"
                      name="email"
                      value={profile.email || user?.email || ''}
                      disabled
                      className="bg-gray-50"
                    />
                    <p className="text-xs text-gray-500">Email cannot be changed</p>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="phoneNumber" className="flex items-center gap-2">
                      <Phone className="h-4 w-4" />
                      Phone Number
                    </Label>
                    <Input
                      id="phoneNumber"
                      name="phoneNumber"
                      value={profile.phoneNumber}
                      onChange={handleInputChange}
                      placeholder="Your phone number"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="bio" className="flex items-center gap-2">
                      <User className="h-4 w-4" />
                      Bio
                    </Label>
                    <Textarea
                      id="bio"
                      name="bio"
                      value={profile.bio}
                      onChange={handleInputChange}
                      placeholder="A brief description about yourself"
                      rows={4}
                    />
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="work" className="space-y-4">
                <div className="grid grid-cols-1 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="department" className="flex items-center gap-2">
                      <Building className="h-4 w-4" />
                      Department
                    </Label>
                    <Input
                      id="department"
                      name="department"
                      value={profile.department}
                      onChange={handleInputChange}
                      placeholder="Your department"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="position" className="flex items-center gap-2">
                      <Briefcase className="h-4 w-4" />
                      Position
                    </Label>
                    <Input
                      id="position"
                      name="position"
                      value={profile.position}
                      onChange={handleInputChange}
                      placeholder="Your job position"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="joinDate" className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      Join Date
                    </Label>
                    <Input
                      id="joinDate"
                      name="joinDate"
                      type="date"
                      value={profile.joinDate}
                      onChange={handleInputChange}
                    />
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button variant="outline" onClick={() => router.back()}>
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
            <Button onClick={handleSaveProfile} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save Changes
                </>
              )}
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
