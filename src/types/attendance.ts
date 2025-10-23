import { Timestamp } from 'firebase/firestore';

export interface AttendanceRecord {
  id: string;
  userId: string;
  date: Timestamp;
  checkIn: string;
  checkOut?: string;
  status: 'Present' | 'Late' | 'Absent';
  workHours?: number;
  notes?: string;
}

export interface LeaveBalance {
  userId: string;
  sickLeave: number;
  annualLeave: number;
  emergencyLeave: number;
  updatedAt: Timestamp;
}

export interface AttendanceSummary {
  totalDays: number;
  presentDays: number;
  lateDays: number;
  absentDays: number;
  percentage: number;
}

export interface LeaveRequest {
  id: string;
  userId: string;
  startDate: Timestamp;
  endDate: Timestamp;
  type: 'sick' | 'annual' | 'emergency';
  status: 'pending' | 'approved' | 'rejected';
  reason: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  approvedBy?: string;
  notes?: string;
}

export interface WorkSchedule {
  userId: string;
  workDays: ('Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday')[];
  startTime: string;
  endTime: string;
  breakTime: number; // in minutes
  updatedAt: Timestamp;
}

export interface User {
  uid: string;
  email: string;
  displayName: string;
  role: 'admin' | 'user';
  department: string;
  joinDate: Timestamp;
}