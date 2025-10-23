import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '../src/lib/firebase/firebase';

async function createAdmin() {
  try {
    // Create admin user with email and password
    const adminEmail = 'admin@example.com';
    const adminPassword = 'admin123';

    const userCredential = await createUserWithEmailAndPassword(
      auth,
      adminEmail,
      adminPassword
    );

    // Add admin user to Firestore
    await setDoc(doc(db, 'users', userCredential.user.uid), {
      uid: userCredential.user.uid,
      email: adminEmail,
      role: 'admin',
      displayName: 'Admin User',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    console.log('✅ Admin user created successfully');
  } catch (error: any) {
    if (error.code === 'auth/email-already-in-exists') {
      console.log('Admin user already exists');
    } else {
      console.error('Error creating admin:', error);
    }
  }
}

createAdmin();