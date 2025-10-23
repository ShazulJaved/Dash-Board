// src/lib/firebase/presence.ts
import { auth, db } from '@/lib/firebase/firebase';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';

export const setupPresence = () => {
  // Listen for authentication state changes
  return onAuthStateChanged(auth, async (user) => {
    if (user) {
      // User is signed in, update status to active
      try {
        const userRef = doc(db, 'users', user.uid);
        await updateDoc(userRef, {
          status: 'active',
          lastActive: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
        console.log('User status set to active');
      } catch (error) {
        console.error('Error updating user status:', error);
      }
    }
  });
};

export const setUserOffline = async (userId: string) => {
  try {
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      status: 'inactive',
      lastActive: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    console.log('User status set to inactive');
  } catch (error) {
    console.error('Error updating user status:', error);
  }
};
