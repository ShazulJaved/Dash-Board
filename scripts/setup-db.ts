import './load-env.js';
import { db } from '../src/lib/firebase/firebase.js';
import { collection, doc, setDoc, Timestamp } from 'firebase/firestore';

const initializeCollections = async () => {
  try {
    console.log('Starting database initialization...');
    console.log('Using project:', process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID);

    // Add sample user
    const usersRef = collection(db, 'users');
    await setDoc(doc(usersRef, 'admin-user'), {
      email: 'admin@example.com',
      displayName: 'Admin User',
      role: 'admin',
      department: 'Management',
      joinDate: Timestamp.now()
    });

    console.log('✅ Database initialized successfully!');
    return true;
  } catch (error) {
    console.error('❌ Error:', error);
    return false;
  }
};

(async () => {
  try {
    await initializeCollections();
    process.exit(0);
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  }
})();