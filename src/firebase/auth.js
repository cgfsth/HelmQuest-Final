// Firebase Authentication service
import { 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  updateProfile
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, db } from './config.js';
import { studentProgressionFields } from '../../shared/progression.js';

/**
 * Sign in user with email and password
 * @param {string} email - User email
 * @param {string} password - User password
 * @returns {Promise<Object>} User data with role
 */
export async function signInUser(email, password) {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    // Get user role from Firestore
    const userDoc = await getDoc(doc(db, 'users', user.uid));
    if (userDoc.exists()) {
      const userData = userDoc.data();
      return {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName || userData.name,
        role: userData.role,
        ...userData
      };
    } else {
      throw new Error('User profile not found in database');
    }
  } catch (error) {
    console.error('Sign in error:', error);
    throw error;
  }
}

/**
 * Sign out current user
 * @returns {Promise<void>}
 */
export async function signOutUser() {
  try {
    await signOut(auth);
  } catch (error) {
    console.error('Sign out error:', error);
    throw error;
  }
}

/**
 * Create new user account
 * @param {Object} userData - User registration data
 * @param {string} userData.email - User email
 * @param {string} userData.password - User password
 * @param {string} userData.name - User display name
 * @param {string} userData.role - User role (student|instructor|admin)
 * @returns {Promise<Object>} Created user data
 */
export async function createUser({ email, password, name, role = 'student' }) {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    // Update user profile
    await updateProfile(user, { displayName: name });
    
    // Create user document in Firestore
    const userData = {
      userId: user.uid,
      name: name,
      email: email,
      role: role,
      createdAt: new Date(),
      updatedAt: new Date(),
      status: 'active'
    };
    
    await setDoc(doc(db, 'users', user.uid), userData);
    
    // Create role-specific profile document
    if (role === 'student') {
      const studentData = {
        studentId: `STU-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 1000)).padStart(3, '0')}`,
        userId: user.uid,
        name: name,
        email: email,
        xp: 0,
        missionsCompleted: 0,
        boatUsed: 'Commercial Trawler',
        badges: [],
        certificates: [],
        status: 'active',
        enrolledAt: new Date(),
        lastActiveAt: new Date()
      };
      const settings = await getDoc(doc(db, 'course_settings', 'global'));
      Object.assign(studentData, studentProgressionFields(studentData, settings.exists() ? settings.data() : {}));
      await setDoc(doc(db, 'students', user.uid), studentData);
    } else if (role === 'instructor') {
      const instructorData = {
        instructorId: user.uid,
        userId: user.uid,
        name: name,
        email: email,
        specialization: 'General',
        studentsCount: 0,
        totalSessions: 0,
        rating: 0,
        joinedAt: new Date()
      };
      await setDoc(doc(db, 'instructors', user.uid), instructorData);
    }
    
    return {
      uid: user.uid,
      email: user.email,
      displayName: name,
      role: role,
      ...userData
    };
  } catch (error) {
    console.error('Create user error:', error);
    throw error;
  }
}

/**
 * Listen to authentication state changes
 * @param {Function} callback - Callback function to handle auth state changes
 * @returns {Function} Unsubscribe function
 */
export function onAuthStateChange(callback) {
  return onAuthStateChanged(auth, async (user) => {
    if (user) {
      try {
        // Get user data from Firestore
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          callback({
            uid: user.uid,
            email: user.email,
            displayName: user.displayName || userData.name,
            role: userData.role,
            ...userData
          });
        } else {
          callback(null);
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
        callback(null);
      }
    } else {
      callback(null);
    }
  });
}

/**
 * Get current user
 * @returns {Object|null} Current user data or null
 */
export function getCurrentUser() {
  return auth.currentUser;
}
