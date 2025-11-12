// User-related type definitions
export type UserRole = 'user' | 'admin';
export type UserStatus = 'active' | 'inactive';
export type AttendanceStatus = 'Present' | 'Late' | 'Absent';
export type LeaveType = 'sick' | 'casual' | 'personal';


// types/user.ts
export interface UserProfile {
  displayName: string;
  email: string;
  photoURL?: string;
  role: string;
  department?: string;
  joinDate?: string;
  phoneNumber?: string;
  emergencyContact?: string;
  position?: string;
  status?: 'active' | 'inactive';
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ProfileField {
  label: string;
  key: keyof UserProfile;
  type?: 'text' | 'date' | 'status';
}

// Base user interface
export interface User {
  uid: string;
  email: string;
  displayName: string;
  phoneNumber?: string;
  photoURL?: string;
  department: string;
  position: string;
  employeeId: string;
  status: UserStatus;
  role: UserRole;
  joinDate: Date;
}

// Leave management interfaces
export interface LeaveBalance {
  userId: string;
  sickLeave: number;
  annualLeave: number;
  emergencyLeave: number;
  lastUpdated: Date;
}

export interface LeaveRequest {
  id?: string;
  userId: string;
  startDate: Date;
  endDate: Date;
  type: LeaveType;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  submittedAt: Date;
  updatedAt?: Date;
}

// Attendance tracking interface
export interface AttendanceRecord {
  id?: string;
  userId: string;
  date: Date;
  checkIn: string;
  checkOut?: string;
  status: AttendanceStatus;
  notes?: string;
  location?: {
    latitude: number;
    longitude: number;
  };
}

// API response types
export interface UserResponse {
  user: User;
  leaveBalance: LeaveBalance;
  todayAttendance?: AttendanceRecord;
  recentLeaves?: LeaveRequest[];
}

// Form data types
export type UpdateProfileData = Pick<User, 'displayName' | 'phoneNumber' | 'photoURL'>;
export type CreateLeaveRequestData = Omit<LeaveRequest, 'id' | 'userId' | 'status' | 'submittedAt' | 'updatedAt'>;
export type CreateUserData = Omit<User, 'uid'>;