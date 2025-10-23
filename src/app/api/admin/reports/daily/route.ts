// src/app/api/admin/reports/daily/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { auth, db } from '@/lib/firebase/admin';
import { startOfDay, endOfDay, parseISO } from 'date-fns';

export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await auth.verifyIdToken(token);
    
    // Check if user is admin
    const userDoc = await db.collection('users').doc(decodedToken.uid).get();
    const userData = userDoc.data();
    
    if (!userData || userData.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get date from query params
    const { searchParams } = new URL(request.url);
    const dateParam = searchParams.get('date');
    
    if (!dateParam) {
      return NextResponse.json({ error: 'Date parameter is required' }, { status: 400 });
    }
    
    const date = parseISO(dateParam);
    const startTimestamp = startOfDay(date);
    const endTimestamp = endOfDay(date);

    // Get all users
    const usersSnapshot = await db.collection('users').get();
    const users = usersSnapshot.docs.map(doc => ({
      uid: doc.id,
      displayName: doc.data().displayName || doc.data().email?.split('@')[0] || 'Unknown User',
      email: doc.data().email || '',
    }));

    // Get attendance records for the specified date
    const attendanceSnapshot = await db.collection('attendance')
      .where('date', '>=', startTimestamp)
      .where('date', '<=', endTimestamp)
      .get();
    
    const records = attendanceSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        userId: data.userId,
        date: data.date.toDate(),
        checkIn: data.checkIn || '',
        checkOut: data.checkOut || null,
        status: data.status || 'Absent'
      };
    });
    
    // Add absent records for users not found in attendance
    const presentUserIds = new Set(records.map(record => record.userId));
    
    users.forEach(user => {
      if (!presentUserIds.has(user.uid)) {
        records.push({
          id: `absent-${user.uid}`,
          userId: user.uid,
          date: date,
          checkIn: '',
          checkOut: null,
          status: 'Absent'
        });
      }
    });

    return NextResponse.json({ 
      attendance: records,
      users,
      date: date
    });
  } catch (error) {
    console.error('Error fetching daily report:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
