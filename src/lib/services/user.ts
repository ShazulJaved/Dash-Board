import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
  Timestamp,
  Firestore
} from 'firebase/firestore';
import { db as defaultDb } from '@/lib/firebase/firebase';
import { User, CreateUserData } from '@/types/user';

export async function createUser(
  uid: string,
  userData: CreateUserData,
  db: Firestore = defaultDb
): Promise<User> {
  const userRef = doc(db, 'users', uid);

  const newUser = {
    ...userData,
    uid,
    createdAt: serverTimestamp() as Timestamp,
    updatedAt: serverTimestamp() as Timestamp,
    lastLogin: serverTimestamp() as Timestamp,
  };

  await setDoc(userRef, newUser);
  return newUser;
}

export async function getUser(uid: string, db: Firestore = defaultDb): Promise<User | null> {
  const userRef = doc(db, 'users', uid);
  const userSnap = await getDoc(userRef);

  if (!userSnap.exists()) {
    return null;
  }

  return userSnap.data() as User;
}

export async function updateUser(uid: string, data: Partial<User>, db: Firestore = defaultDb): Promise<void> {
  const userRef = doc(db, 'users', uid);

  await updateDoc(userRef, {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

export async function updateUserLastLogin(uid: string, db: Firestore = defaultDb): Promise<void> {
  const userRef = doc(db, 'users', uid);

  await updateDoc(userRef, {
    lastLogin: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}