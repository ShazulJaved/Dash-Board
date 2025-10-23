import { LeaveRequest } from '@/types/user';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/lib/firebase/firebase';

interface SignInResponse {
  success: boolean;
  message?: string;
  user?: {
    uid: string;
    email: string;
    role: 'admin' | 'user';
    displayName?: string;
  };
}

// Common headers with CSRF token
const getHeaders = () => {
  return {
    'Content-Type': 'application/json',
    // Cookie will be sent automatically with credentials: 'include'
  };
};

export async function signIn(
  email: string, 
  password: string, 
  csrfToken: string
): Promise<SignInResponse> {
  try {
    const response = await fetch('/api/auth/signin', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'CSRF-Token': csrfToken,
      },
      credentials: 'include',
      body: JSON.stringify({ email, password, csrfToken }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Authentication failed');
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Sign-in error:', error);
    throw error;
  }
}

// Helper function to handle API errors
const handleApiError = async (response: Response) => {
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'API request failed');
  }
  return data;
};

const API = {
  signIn,

  checkIn: async (userId: string) => {
    const response = await fetch('/api/attendance/check-in', {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ userId }),
      credentials: 'include',
    });
    return handleApiError(response);
  },

  checkOut: async (userId: string, attendanceId: string) => {
    const response = await fetch('/api/attendance/check-out', {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ userId, attendanceId }),
      credentials: 'include',
    });
    return handleApiError(response);
  },

  getMonthlyAttendance: async (userId: string, month?: number, year?: number) => {
    const queryParams = new URLSearchParams({
      userId,
      ...(month !== undefined && { month: month.toString() }),
      ...(year !== undefined && { year: year.toString() }),
    });

    const response = await fetch(`/api/attendance/monthly?${queryParams}`, {
      headers: getHeaders(),
      credentials: 'include',
    });
    return handleApiError(response);
  },

  requestLeave: async (leaveData: LeaveRequest) => {
    const response = await fetch('/api/leave/request', {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(leaveData),
      credentials: 'include',
    });
    return handleApiError(response);
  },

  // Add a method to verify authentication status
  verifyAuth: async () => {
    try {
      const response = await fetch('/api/auth/verify', {
        credentials: 'include',
      });
      return handleApiError(response);
    } catch (error) {
      console.error('Auth verification error:', error);
      throw error;
    }
  },

  // Add a method to sign out
  signOut: async () => {
    try {
      const response = await fetch('/api/auth/signout', {
        method: 'POST',
        credentials: 'include',
      });
      return handleApiError(response);
    } catch (error) {
      console.error('Sign-out error:', error);
      throw error;
    }
  },
};

export default API;
