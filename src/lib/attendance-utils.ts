// lib/attendance-utils.ts
import { getAttendanceSummary } from './firebase/attendance';

export const fetchUserAttendanceStats = async (userId: string) => {
  try {
    const summary = await getAttendanceSummary(userId);
    return {
      monthlyAttendance: summary.percentage || 0,
      workingDays: summary.totalDays || 0,
      presentDays: summary.presentDays || 0,
      lateDays: summary.lateDays || 0,
    };
  } catch (error) {
    console.error('Error fetching attendance stats:', error);
    return {
      monthlyAttendance: 0,
      workingDays: 0,
      presentDays: 0,
      lateDays: 0,
    };
  }
};