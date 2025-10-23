import { NextRequest, NextResponse } from 'next/server';
import { auth, db } from '@/lib/firebase/admin';
import { cookies } from 'next/headers';

// Types
interface UserData {
  id: string;
  displayName?: string;
  email?: string;
  role?: string;
  lastActive?: any;
  [key: string]: any;
}

interface AttendanceRecord {
  id: string;
  userId: string;
  checkInTime?: any;
  checkOutTime?: any;
  checkIn?: any;
  checkOut?: any;
  date?: any;
  [key: string]: any;
}

interface AttendanceResponse {
  userId: string;
  userName: string;
  email: string;
  checkInTime: string | null;
  checkOutTime: string | null;
  status: 'Checked In' | 'Checked Out' | 'Absent';
  date: string;
  lastUpdated: string;
  isActive: boolean;
  lastActive: string | null;
}

function isUserActive(lastActive: any): boolean {
  if (!lastActive) return false;
  try {
    const time =
      typeof lastActive.toDate === 'function'
        ? lastActive.toDate()
        : typeof lastActive === 'string'
        ? new Date(lastActive)
        : lastActive instanceof Date
        ? lastActive
        : null;
    return !!time && time > new Date(Date.now() - 5 * 60 * 1000);
  } catch (e) {
    return false;
  }
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const dateParam = searchParams.get('date');

    if (!dateParam) {
      return NextResponse.json({ error: 'Date parameter is required' }, { status: 400 });
    }

    const selectedDate = new Date(dateParam);
    if (isNaN(selectedDate.getTime())) {
      return NextResponse.json({ error: 'Invalid date format. Use YYYY-MM-DD' }, { status: 400 });
    }

    const startOfDay = new Date(selectedDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(selectedDate);
    endOfDay.setHours(23, 59, 59, 999);

    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);
    const page = Math.max(parseInt(searchParams.get('page') || '1'), 1);
    const offset = (page - 1) * limit;

    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('session')?.value;

    let userId = '';
    let isAdmin = false;

    if (sessionCookie) {
      try {
        const decoded = await auth.verifySessionCookie(sessionCookie, true);
        userId = decoded.uid;
        isAdmin = decoded.admin === true || decoded.role === 'admin';
      } catch {}
    }

    if (!userId) {
      const authHeader = request.headers.get('Authorization');
      if (!authHeader?.startsWith('Bearer ')) {
        return NextResponse.json({ error: 'You must be logged in to view this data' }, { status: 401 });
      }

      const token = authHeader.split(' ')[1];
      try {
        const decoded = await auth.verifyIdToken(token);
        userId = decoded.uid;
        isAdmin = decoded.admin === true || decoded.role === 'admin';
      } catch {
        return NextResponse.json({ error: 'Your session has expired. Please log in again.' }, { status: 401 });
      }
    }

    if (!isAdmin) {
      const userDoc = await db.collection('users').doc(userId).get();
      if (!userDoc.exists || userDoc.data()?.role !== 'admin') {
        return NextResponse.json({ error: 'Unauthorized: Admin access required' }, { status: 403 });
      }
    }

    const usersSnapshot = await db.collection('users').limit(limit).offset(offset).get();
    if (usersSnapshot.empty) {
      return NextResponse.json({ attendance: [] });
    }

    const users: UserData[] = usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    const attendanceSnapshot = await db
      .collection('attendance')
      .where('date', '>=', startOfDay)
      .where('date', '<=', endOfDay)
      .get();

    // Fix: Ensure each attendance record has a userId property
    const attendanceRecords: AttendanceRecord[] = attendanceSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        userId: data.userId || '', // Ensure userId exists
        ...data
      };
    });

    console.log(`Fetched ${attendanceRecords.length} attendance records`);

    const attendance: AttendanceResponse[] = users.map(user => {
      const record = attendanceRecords.find(r => r.userId === user.id);

      let checkInRaw = record?.checkInTime ?? record?.checkIn ?? null;
      let checkOutRaw = record?.checkOutTime ?? record?.checkOut ?? null;

      let checkInTime: string | null = null;
      let checkOutTime: string | null = null;
      let lastUpdated = new Date().toISOString();

      try {
        if (checkInRaw) {
          checkInTime =
            typeof checkInRaw.toDate === 'function'
              ? checkInRaw.toDate().toISOString()
              : typeof checkInRaw === 'string'
              ? checkInRaw
              : checkInRaw instanceof Date
              ? checkInRaw.toISOString()
              : null;
          lastUpdated = checkInTime ?? lastUpdated;
        }
        if (checkOutRaw) {
          checkOutTime =
            typeof checkOutRaw.toDate === 'function'
              ? checkOutRaw.toDate().toISOString()
              : typeof checkOutRaw === 'string'
              ? checkOutRaw
              : checkOutRaw instanceof Date
              ? checkOutRaw.toISOString()
              : null;
          lastUpdated = checkOutTime ?? lastUpdated;
        }
      } catch (e) {
        console.error('Error parsing check-in/out times:', e);
      }

      let lastActive = null;
      try {
        const la = user.lastActive;
        if (la) {
          lastActive =
            typeof la.toDate === 'function'
              ? la.toDate().toISOString()
              : typeof la === 'string'
              ? la
              : la instanceof Date
              ? la.toISOString()
              : null;
        }
      } catch (e) {
        console.error('Error parsing lastActive:', e);
      }

      const status: 'Checked In' | 'Checked Out' | 'Absent' =
        checkInTime && checkOutTime
          ? 'Checked Out'
          : checkInTime
          ? 'Checked In'
          : 'Absent';

      const isActive = isUserActive(user.lastActive);

      return {
        userId: user.id,
        userName: user.displayName || '',
        email: user.email || '',
        checkInTime,
        checkOutTime,
        status,
        date: selectedDate.toISOString().split('T')[0],
        lastUpdated,
        isActive,
        lastActive
      };
    });

    return NextResponse.json(
      {
        attendance,
        timestamp: new Date().toISOString(),
        totalUsers: users.length,
        fetchTime: Date.now()
      },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      }
    );
  } catch (error) {
    console.error('Error fetching attendance data:', error);
    return NextResponse.json({ error: 'Failed to fetch attendance data' }, { status: 500 });
  }
}