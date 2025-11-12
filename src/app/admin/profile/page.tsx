"use client";

import { useState, useEffect, useRef } from "react";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth, db, storage } from "@/lib/firebase/firebase";
import { doc, getDoc, updateDoc, setDoc } from "firebase/firestore";
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
//import SimpleFloatingDots from "@/components/SimpleFloatingDots";

interface ProfileData {
  displayName: string;
  email: string;
  phoneNumber: string;
  department: string;
  position: string;
  bio: string;
  joinDate: string;
  photoURL: string;
};


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
    if (!authLoading && !user) {
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
          setProfile({
            displayName: userData.displayName || user.displayName || "",
            email: user.email || "",
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

    if (user) {
      fetchUserProfile();
    }
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

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        variant: "destructive",
        title: "Invalid File",
        description: "Please select an image file",
      });
      return;
    }

    try {
      setIsUploading(true);
      setUploadProgress(0);

      if (typeof storage === "undefined") {
        toast({
          variant: "destructive",
          title: "Storage Not Available",
          description: "Firebase Storage is not configured.",
        });
        setIsUploading(false);
        return;
      }

      const storageRef = ref(
        storage,
        `profile-photos/${user.uid}/${Date.now()}-${file.name}`
      );

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
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
          setProfile((prev) => ({ ...prev, photoURL: downloadURL }));
          await updateProfile(user, { photoURL: downloadURL });

          const userDocRef = doc(db, "users", user.uid);
          await updateDoc(userDocRef, { 
            photoURL: downloadURL,
            updatedAt: new Date()
          });

          toast({
            title: "Photo Updated",
            description: "Your profile photo has been updated successfully",
          });
          setIsUploading(false);
          setUploadProgress(0);
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
      
      <div className="min-h-screen flex justify-center items-center bg-gradient-to-br from-slate-50 via-blue-50/30 to-purple-50/20">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-slate-600">Loading your profile...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null; // Redirect will happen in useEffect
  }

  return (
    <div className="min-h-screen relative bg-gray-200 "
    style={{  background: "#FFF7DD"}}>

      
      {/* Main Content */}
      <div className="container mx-auto py-8 px-4 max-w-6xl relative z-10 bg-gray-200 ">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-slate-600 mb-3">
            Admin Profile
          </h1>
          <p className="text-slate-600 text-lg">Manage your account information and preferences</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6"
        style={{background:"#3B0270"}}>
          {/* Profile Photo Card */}
          <div className="lg:col-span-1">
            <Card className=" backdrop-blur-xl border-white/20 shadow-xl hover:shadow-2xl transition-all duration-300 bg-purple-300">
              <CardHeader className="text-center pb-4">
                <CardTitle className="text-slate-800">Profile Photo</CardTitle>
                <CardDescription>Update your profile picture</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col items-center">
                <div className="relative mb-6 group">
                  <Avatar className="h-40 w-40 border-4 border-white shadow-lg group-hover:scale-105 transition-transform duration-300">
                    <AvatarImage 
                      src={profile.photoURL} 
                      alt={profile.displayName} 
                      className="object-cover"
                    />
                    <AvatarFallback className="text-3xl text-black">
                      {profile.displayName?.charAt(0) || user.email?.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <button 
                    className="absolute bottom-2 right-2 text-black bg-purple-400 p-3 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-110 disabled:opacity-50"
                    onClick={handlePhotoClick}
                    disabled={isUploading}
                  >
                    <Camera className="h-5 w-5" />
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
                  <div className="w-full mb-4">
                    <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                      <div 
                        className="h-full text-slate-300 transition-all duration-300"
                        style={{ width: `${uploadProgress}%` }}
                      ></div>
                    </div>
                    <p className="text-sm text-center mt-2 text-slate-600">
                      Uploading: {Math.round(uploadProgress)}%
                    </p>
                  </div>
                )}
                
                <div className="text-center space-y-2">
                  <h3 className="font-semibold text-xl text-slate-800">
                    {profile.displayName || 'Admin User'}
                  </h3>
                  <p className="text-slate-600">{profile.email}</p>
                  {profile.position && (
                    <p className="text-slate-600 font-medium">{profile.position}</p>
                  )}
                  {profile.department && (
                    <p className="text-slate-600">{profile.department}</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
          
          {/* Profile Details Card */}
          <div className="lg:col-span-3">
            <Card className=" backdrop-blur-xl border-white/20 shadow-xl hover:shadow-2xl transition-all duration-300 bg-purple-300">
              <CardHeader className="pb-4">
                <CardTitle className="text-slate-800 text-2xl">Profile Information</CardTitle>
                <CardDescription>Update your personal and work details</CardDescription>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="personal" className="w-full">
                  <TabsList className="grid w-full grid-cols-2 mb-6 bg-slate-100/50 p-1 rounded-lg">
                    <TabsTrigger 
                      value="personal" 
                      className="data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-md transition-all duration-200"
                    >
                      <User className="h-4 w-4 mr-2" />
                      Personal Info
                    </TabsTrigger>
                    <TabsTrigger 
                      value="work"
                      className="data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-md transition-all duration-200"
                    >
                      <Briefcase className="h-4 w-4 mr-2" />
                      Work Details
                    </TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="personal" className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-3">
                        <Label htmlFor="displayName" className="flex items-center gap-2 text-slate-700 font-medium">
                          <User className="h-4 w-4 text-blue-500" />
                          Full Name
                        </Label>
                        <Input
                          id="displayName"
                          name="displayName"
                          value={profile.displayName}
                          onChange={handleInputChange}
                          placeholder="Your full name"
                          className="bg-white/50 border-slate-200 focus:border-blue-500 transition-colors duration-200"
                        />
                      </div>
                      
                      <div className="space-y-3">
                        <Label htmlFor="email" className="flex items-center gap-2 text-slate-700 font-medium">
                          <Mail className="h-4 w-4 text-green-500" />
                          Email
                        </Label>
                        <Input
                          id="email"
                          name="email"
                          value={profile.email || user?.email || ''}
                          disabled
                          className="bg-slate-100/50 border-slate-200 text-slate-500"
                        />
                        <p className="text-xs text-slate-400">Email cannot be changed</p>
                      </div>
                      
                      <div className="space-y-3">
                        <Label htmlFor="phoneNumber" className="flex items-center gap-2 text-slate-700 font-medium">
                          <Phone className="h-4 w-4 text-purple-500" />
                          Phone Number
                        </Label>
                        <Input
                          id="phoneNumber"
                          name="phoneNumber"
                          value={profile.phoneNumber}
                          onChange={handleInputChange}
                          placeholder="Your phone number"
                          className="bg-white/50 border-slate-200 focus:border-purple-500 transition-colors duration-200"
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-3">
                      <Label htmlFor="bio" className="flex items-center gap-2 text-slate-700 font-medium">
                        <User className="h-4 w-4 text-cyan-500" />
                        Bio
                      </Label>
                      <Textarea
                        id="bio"
                        name="bio"
                        value={profile.bio}
                        onChange={handleInputChange}
                        placeholder="A brief description about yourself..."
                        rows={4}
                        className="bg-white/50 border-slate-200 focus:border-cyan-500 transition-colors duration-200 resize-none"
                      />
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="work" className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-3">
                        <Label htmlFor="department" className="flex items-center gap-2 text-slate-700 font-medium">
                          <Building className="h-4 w-4 text-orange-500" />
                          Department
                        </Label>
                        <Input
                          id="department"
                          name="department"
                          value={profile.department}
                          onChange={handleInputChange}
                          placeholder="Your department"
                          className="bg-white/50 border-slate-200 focus:border-orange-500 transition-colors duration-200"
                        />
                      </div>
                      
                      <div className="space-y-3">
                        <Label htmlFor="position" className="flex items-center gap-2 text-slate-700 font-medium">
                          <Briefcase className="h-4 w-4 text-indigo-500" />
                          Position
                        </Label>
                        <Input
                          id="position"
                          name="position"
                          value={profile.position}
                          onChange={handleInputChange}
                          placeholder="Your job position"
                          className="bg-white/50 border-slate-200 focus:border-indigo-500 transition-colors duration-200"
                        />
                      </div>
                      
                      <div className="space-y-3">
                        <Label htmlFor="joinDate" className="flex items-center gap-2 text-slate-700 font-medium">
                          <Calendar className="h-4 w-4 text-pink-500" />
                          Join Date
                        </Label>
                        <Input
                          id="joinDate"
                          name="joinDate"
                          type="date"
                          value={profile.joinDate}
                          onChange={handleInputChange}
                          className="bg-white/50 border-slate-200 focus:border-pink-500 transition-colors duration-200"
                        />
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
              <CardFooter className="flex justify-between border-t border-slate-200/50 pt-6">
                <Button 
                  variant="outline" 
                  onClick={() => router.back()}
                  className="border-slate-300 text-slate-700 hover:bg-slate-100 transition-colors duration-200"
                >
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
                <Button 
                  onClick={handleSaveProfile} 
                  disabled={saving}
                  className="bg-gradient-to-r from-blue-300 to-purple-300 hover:from-blue-400 hover:to-purple-400 text-white shadow-lg hover:shadow-xl transition-all duration-300 disabled:opacity-50"
                >
                  {saving ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Saving Changes...
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
      </div>
    </div>
  );
}