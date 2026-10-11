// Firebase configuration and initialization
import { initializeApp } from 'firebase/app';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { getAnalytics } from 'firebase/analytics';

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyC2vjxKM1OxfiKV9tAnJkLrzKy3Gk4x4ak",
  authDomain: "helmquest-565d6.firebaseapp.com",
  projectId: "helmquest-565d6",
  storageBucket: "helmquest-565d6.firebasestorage.app",
  messagingSenderId: "754434556742",
  appId: "1:754434556742:web:c95a51ff6ba79ca6619b47",
  measurementId: "G-LGNRL80PH8"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const db = getFirestore(app);
export const auth = getAuth(app);

// Initialize Analytics (optional)
let analytics = null;
if (typeof window !== 'undefined' && window.location.hostname !== 'localhost') {
  analytics = getAnalytics(app);
}
export { analytics };

// Development mode - connect to emulators if running locally
if (import.meta.env.DEV && import.meta.env.VITE_USE_FIREBASE_EMULATOR === 'true') {
  console.log('🔥 Connecting to Firebase Emulators...');
  
  // Connect to Firestore emulator
  try {
    connectFirestoreEmulator(db, 'localhost', 8080);
  } catch (error) {
    console.warn('Firestore emulator already connected or unavailable');
  }
  
  // Connect to Auth emulator
  try {
    connectAuthEmulator(auth, 'http://localhost:9099');
  } catch (error) {
    console.warn('Auth emulator already connected or unavailable');
  }
}

export default app;