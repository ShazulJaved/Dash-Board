import {
  collection,
  doc,
  getDoc,
  setDoc,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  Timestamp,
  updateDoc,
  addDoc
} from 'firebase/firestore';
import { serverTimestamp } from 'firebase/firestore';
import { auth } from '@/lib/firebase/firebase';
import { db } from '@/lib/firebase/firebase';
import { AttendanceRecord, LeaveBalance, AttendanceSummary } from '@/types/attendance';

export async function getAttendanceStatus(userId: string): Promise<AttendanceRecord | null> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const attendanceRef = collection(db, 'attendance');
  const q = query(
    attendanceRef,
    where('userId', '==', userId),
    where('date', '>=', Timestamp.fromDate(today)),
    limit(1)
  );

  const snapshot = await getDocs(q);
  if (snapshot.empty) return null;

  const doc = snapshot.docs[0];
  return { id: doc.id, ...doc.data() } as AttendanceRecord;
}

export const checkIn = async () => {
  if (!auth.currentUser) {
    throw new Error('You must be logged in to check in');
  }

  const userId = auth.currentUser.uid;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Check if already checked in
  const existingRecord = await getAttendanceStatus(userId);
  if (existingRecord && existingRecord.checkIn) {
    throw new Error('Already checked in for today');
  }

  // Get current time
  const now = new Date();
  const checkInTime = now.toLocaleTimeString();
  
  // Determine if late (e.g., after 9:30 AM)
  const isLate = now.getHours() > 9 || (now.getHours() === 9 && now.getMinutes() >= 30);
  const status = isLate ? 'Late' : 'Present';

  // Create attendance record
  const attendanceRef = collection(db, 'attendance');
  const docRef = await addDoc(attendanceRef, {
    userId,
    date: serverTimestamp(), // Use server timestamp for accurate time
    checkIn: checkInTime,
    checkOut: null,
    status,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });

  // Update user's lastActive status
  const userRef = doc(db, 'users', userId);
  await updateDoc(userRef, {
    lastActive: serverTimestamp(),
    isActive: true
  });

  return docRef.id;
};

export const checkOut = async (attendanceId: string) => {
  if (!auth.currentUser) {
    throw new Error('You must be logged in to check out');
  }

  const userId = auth.currentUser.uid;
  const now = new Date();
  const checkOutTime = now.toLocaleTimeString();

  // Update attendance record
  const attendanceRef = doc(db, 'attendance', attendanceId);
  await updateDoc(attendanceRef, {
    checkOut: checkOutTime,
    updatedAt: serverTimestamp() // Use server timestamp for accurate time
  });

  // Update user's lastActive status
  const userRef = doc(db, 'users', userId);
  await updateDoc(userRef, {
    lastActive: serverTimestamp(),
    isActive: false
  });

  return true;
};

export async function getMonthlyAttendance(userId: string): Promise<AttendanceRecord[]> {
  try {
    const attendanceRef = collection(db, 'attendance');
    const q = query(
      attendanceRef,
      where('userId', '==', userId),
      orderBy('date', 'desc'),
      limit(30)
    );

    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as AttendanceRecord[];
  } catch (error) {
    console.error('Error fetching monthly attendance:', error);
    throw error;
  }
}

export async function getLeaveBalance(userId: string): Promise<LeaveBalance> {
  const balanceRef = doc(db, 'leaveBalances', userId);
  const snapshot = await getDoc(balanceRef);

  if (!snapshot.exists()) {
    // Initialize default leave balance
    const defaultBalance: LeaveBalance = {
      userId,
      sickLeave: 7,
      annualLeave: 12,
      emergencyLeave: 3,
      updatedAt: Timestamp.now()
    };
    await setDoc(doc(collection(db, 'leaveBalances')), defaultBalance);
    return defaultBalance;
  }

  return snapshot.data() as LeaveBalance;
}

export async function getAttendanceSummary(userId: string): Promise<AttendanceSummary> {
  const monthly = await getMonthlyAttendance(userId);

  const totalDays = getWorkingDays();
  const presentDays = monthly.filter(record => record.status === 'Present').length;
  const lateDays = monthly.filter(record => record.status === 'Late').length;

  return {
    totalDays,
    presentDays,
    lateDays,
    absentDays: totalDays - (presentDays + lateDays),
    percentage: Math.round(((presentDays + lateDays) / totalDays) * 100)
  };
}

// Helper function to calculate working days in current month
function getWorkingDays(): number {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const lastDay = new Date(year, month + 1, 0).getDate();

  let workingDays = 0;
  for (let day = 1; day <= lastDay; day++) {
    const date = new Date(year, month, day);
    const dayOfWeek = date.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) { // Not Sunday(0) or Saturday(6)
      workingDays++;
    }
  }
  return workingDays;
}

// Update user's activity status periodically
export async function updateUserActivity() {
  if (!auth.currentUser) return;
  
  const userId = auth.currentUser.uid;
  const userRef = doc(db, 'users', userId);
  
  try {
    await updateDoc(userRef, {
      lastActive: serverTimestamp(),
      isActive: true
    });
  } catch (error) {
    console.error('Error updating user activity:', error);
  }
}