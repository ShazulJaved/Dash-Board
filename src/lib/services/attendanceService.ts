import { db } from '@/lib/firebase/firebase';
import {
    collection,
    doc,
    query,
    where,
    getDocs,
    getDoc,
    addDoc,
    updateDoc,
    Timestamp,
    orderBy,
    serverTimestamp,
    DocumentData
} from 'firebase/firestore';
import { AttendanceRecord, LeaveRequest, WorkSchedule } from '@/types/attendance';

export const attendanceService = {
    // Check-in API
    async checkIn(userId: string): Promise<string> {
        try {
            // Check if already checked in today
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            const attendanceRef = collection(db, 'attendance');
            const existingAttendance = query(
                attendanceRef,
                where('userId', '==', userId),
                where('date', '>=', Timestamp.fromDate(today))
            );

            const snapshot = await getDocs(existingAttendance);
            if (!snapshot.empty) {
                throw new Error('Already checked in today');
            }

            // Create new attendance record
            const now = new Date();
            const attendanceDoc = await addDoc(attendanceRef, {
                userId,
                date: Timestamp.fromDate(now),
                checkIn: now.toLocaleTimeString(),
                status: now.getHours() >= 9 ? 'Late' : 'Present',
                createdAt: Timestamp.now(),
                updatedAt: Timestamp.now()
            });

            return attendanceDoc.id;

        } catch (error) {
            console.error('Check-in error:', error);
            throw error;
        }
    },

    // Check-out API
    async checkOut(userId: string, attendanceId: string): Promise<void> {
        const now = new Date();
        const attendanceRef = doc(db, 'attendance', attendanceId);

        await updateDoc(attendanceRef, {
            checkOut: now.toLocaleTimeString(),
            updatedAt: serverTimestamp()
        });
    },

    // Get monthly attendance
    async getMonthlyAttendance(userId: string): Promise<AttendanceRecord[]> {
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);

        const q = query(
            collection(db, 'attendance'),
            where('userId', '==', userId),
            where('date', '>=', startOfMonth),
            orderBy('date', 'desc')
        );

        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        })) as AttendanceRecord[];
    },

    // Request leave - Use API endpoint instead of direct Firestore access
    async requestLeave(leaveData: any): Promise<string> {
        try {
            // Use fetch to call the API endpoint
            const response = await fetch('/api/leave/request', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(leaveData)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to submit leave request');
            }

            const data = await response.json();
            return data.leaveId;
        } catch (error) {
            console.error('Error requesting leave:', error);
            throw error;
        }
    },

    // Get leave requests - Use API endpoint instead of direct Firestore access
    async getUserLeaveRequests(userId: string, status?: string): Promise<any[]> {
        try {
            // Use fetch to call the API endpoint
            const url = new URL('/api/leave/request', window.location.origin);
            if (status) {
                url.searchParams.append('status', status);
            }

            const response = await fetch(url.toString(), {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                }
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to fetch leave requests');
            }

            const data = await response.json();
            return data.leaveRequests || [];
        } catch (error) {
            console.error('Error fetching leave requests:', error);
            // Return empty array on error to prevent UI crashes
            return [];
        }
    },

    // Get leave balance
    async getLeaveBalance(userId: string): Promise<any> {
        try {
            // Try to get from API first
            try {
                const response = await fetch(`/api/leave/balance?userId=${userId}`, {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                    }
                });

                if (response.ok) {
                    const data = await response.json();
                    return data.balance;
                }
            } catch (apiError) {
                console.error('API error, falling back to default balance:', apiError);
            }

            // Return default balance if API fails
            return {
                sickLeave: 7,
                annualLeave: 12,
                emergencyLeave: 3
            };
        } catch (error) {
            console.error('Error getting leave balance:', error);
            // Return default values on error
            return {
                sickLeave: 7,
                annualLeave: 12,
                emergencyLeave: 3
            };
        }
    }
};
