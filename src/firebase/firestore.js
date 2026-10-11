// Firestore database operations
import { 
  collection, 
  doc, 
  addDoc, 
  getDoc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  limit,
  onSnapshot,
  Timestamp,
  writeBatch
} from 'firebase/firestore';
import { db } from './config.js';
import { studentProgressionFields } from '../../shared/progression.js';
import * as missionApi from '../api/firebaseApi.js';

function getEquivalentModuleIds(moduleId) {
  if (!moduleId || typeof moduleId !== 'string') return [];

  const normalized = moduleId.trim();
  const values = new Set();

  if (normalized) values.add(normalized);
  const withoutPrefix = normalized.replace(/^CUSTOM-/i, '');
  if (withoutPrefix) values.add(withoutPrefix);
  if (normalized.startsWith('CUSTOM-')) {
    values.add(normalized);
  } else {
    values.add(`CUSTOM-${normalized}`);
  }

  return [...values].filter(Boolean);
}

async function getCollectionDocs(collectionName) {
  const names = [collectionName, collectionName.endsWith('s') ? collectionName.slice(0, -1) : `${collectionName}s`];
  const seen = new Set();
  const docs = [];

  for (const name of [...new Set(names)]) {
    try {
      const snap = await getDocs(collection(db, name));
      snap.forEach((docSnap) => {
        if (seen.has(docSnap.id)) return;
        seen.add(docSnap.id);
        docs.push({ id: docSnap.id, ...docSnap.data() });
      });
    } catch (error) {
      // Ignore missing collection names; some deployments use a singular collection name.
    }
  }

  return docs;
}

// ============================================================================
// USERS COLLECTION
// ============================================================================

/**
 * Create or update user document
 * @param {string} userId - User ID
 * @param {Object} userData - User data
 * @returns {Promise<void>}
 */
export async function createUser(userId, userData) {
  const userRef = doc(db, 'users', userId);
  await setDoc(userRef, {
    ...userData,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now()
  });
}

/**
 * Get user by ID
 * @param {string} userId - User ID
 * @returns {Promise<Object|null>} User data or null
 */
export async function getUser(userId) {
  const userRef = doc(db, 'users', userId);
  const userSnap = await getDoc(userRef);
  return userSnap.exists() ? { id: userSnap.id, ...userSnap.data() } : null;
}

// ============================================================================
// STUDENTS COLLECTION
// ============================================================================

/**
 * Create student profile
 * @param {string} studentId - Student ID
 * @param {Object} studentData - Student data
 * @returns {Promise<void>}
 */
export async function createStudent(studentId, studentData) {
  const studentRef = doc(db, 'students', studentId);
  await setDoc(studentRef, {
    ...studentData,
    enrolledAt: Timestamp.now(),
    lastActiveAt: Timestamp.now()
  });
}

/**
 * Get all students
 * @returns {Promise<Array>} Array of student documents
 */
export async function getStudents() {
  const studentsRef = collection(db, 'students');
  const studentsSnap = await getDocs(studentsRef);
  const rankSettings = await getDoc(doc(db, 'course_settings', 'global'));
  const settings = rankSettings.exists() ? rankSettings.data() : {};
  return studentsSnap.docs.map(doc => ({ id: doc.id, ...doc.data(), ...studentProgressionFields(doc.data(), settings) }));
}

/**
 * Get student by ID
 * @param {string} studentId - Student ID
 * @returns {Promise<Object|null>} Student data or null
 */
export async function getStudent(studentId) {
  const studentRef = doc(db, 'students', studentId);
  const studentSnap = await getDoc(studentRef);
  if (!studentSnap.exists()) return null;
  const settings = await getDoc(doc(db, 'course_settings', 'global'));
  return { id: studentSnap.id, ...studentSnap.data(), ...studentProgressionFields(studentSnap.data(), settings.exists() ? settings.data() : {}) };
}

/**
 * Update student profile
 * @param {string} studentId - Student ID
 * @param {Object} updates - Fields to update
 * @returns {Promise<void>}
 */
export async function updateStudent(studentId, updates) {
  const studentRef = doc(db, 'students', studentId);
  await updateDoc(studentRef, {
    ...updates,
    lastActiveAt: Timestamp.now()
  });
}

// ============================================================================
// MISSIONS COLLECTION
// ============================================================================

/**
 * Get all training modules
 * @returns {Promise<Array>} Array of training module documents
 */
export async function getTrainingModules() {
  return (await missionApi.getAllModules()).modules;
}

/**
 * Create training module
 * @param {Object} moduleData - Module data
 * @returns {Promise<string>} Created module ID
 */
export async function createTrainingModule(moduleData) {
  return (await missionApi.createModule(moduleData)).moduleId;
}

// ============================================================================
// NAVIGATION MISSIONS COLLECTION
// ============================================================================

/**
 * Get missions by module ID
 * @param {string} moduleId - Module ID
 * @returns {Promise<Array>} Array of mission documents
 */
export async function getMissionsByModule(moduleId) {
  const equivalentIds = getEquivalentModuleIds(moduleId);

  if (!equivalentIds.length) return [];

  return (await missionApi.getAllMissions(moduleId)).missions;
}

/**
 * Get mission by ID
 * @param {string} missionId - Mission ID
 * @returns {Promise<Object|null>} Mission data or null
 */
export async function getMission(missionId) {
  return (await missionApi.getMission(missionId)).mission;
}

// ============================================================================
// MISSION ATTEMPTS COLLECTION
// ============================================================================

/**
 * Create mission attempt
 * @param {Object} attemptData - Mission attempt data
 * @returns {Promise<string>} Created attempt ID
 */
export async function createMissionAttempt(attemptData) {
  const attemptsRef = collection(db, 'mission_attempts');
  const docRef = await addDoc(attemptsRef, {
    ...attemptData,
    completedAt: Timestamp.now()
  });
  return docRef.id;
}

/**
 * Get mission attempts by student ID
 * @param {string} studentId - Student ID
 * @returns {Promise<Array>} Array of attempt documents
 */
export async function getMissionAttemptsByStudent(studentId) {
  const attemptsRef = collection(db, 'mission_attempts');
  const attemptsQuery = query(
    attemptsRef, 
    where('studentId', '==', studentId),
    orderBy('completedAt', 'desc')
  );
  const attemptsSnap = await getDocs(attemptsQuery);
  return attemptsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

/**
 * Get mission scores by the authenticated student's ID.
 * @param {string} studentId - Authenticated student's Firebase UID
 * @returns {Promise<Array>} Array of mission score documents
 */
export async function getMissionScoresByStudent(studentId) {
  if (!studentId) return [];

  const scoresRef = collection(db, 'mission_score');
  const scoresQuery = query(
    scoresRef,
    where('studentId', '==', studentId),
    orderBy('completedAt', 'desc')
  );
  const scoresSnap = await getDocs(scoresQuery);
  return scoresSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

/**
 * Get latest mission attempt for student and mission
 * @param {string} studentId - Student ID
 * @param {string} missionId - Mission ID
 * @returns {Promise<Object|null>} Latest attempt or null
 */
export async function getLatestMissionAttempt(studentId, missionId) {
  const attemptsRef = collection(db, 'mission_attempts');
  const attemptsQuery = query(
    attemptsRef, 
    where('studentId', '==', studentId),
    where('missionId', '==', missionId),
    orderBy('completedAt', 'desc'),
    limit(1)
  );
  const attemptsSnap = await getDocs(attemptsQuery);
  return attemptsSnap.empty ? null : { id: attemptsSnap.docs[0].id, ...attemptsSnap.docs[0].data() };
}

// ============================================================================
// STUDENT MODULE PROGRESS COLLECTION
// ============================================================================

/**
 * Update student module progress
 * @param {string} studentId - Student ID
 * @param {string} moduleId - Module ID
 * @param {Object} progressData - Progress data
 * @returns {Promise<void>}
 */
export async function updateModuleProgress(studentId, moduleId, progressData) {
  const progressId = `${studentId}_${moduleId}`;
  const progressRef = doc(db, 'student_module_progress', progressId);
  await setDoc(progressRef, {
    progressId,
    studentId,
    moduleId,
    ...progressData,
    updatedAt: Timestamp.now()
  }, { merge: true });
}

/**
 * Get completed modules for student
 * @param {string} studentId - Student ID
 * @returns {Promise<Array>} Array of completed module IDs
 */
export async function getCompletedModules(studentId) {
  const progressRef = collection(db, 'student_module_progress');
  const progressQuery = query(
    progressRef, 
    where('studentId', '==', studentId),
    where('status', '==', 'completed')
  );
  const progressSnap = await getDocs(progressQuery);
  return progressSnap.docs.map(doc => doc.data().moduleId);
}

// ============================================================================
// QUIZZES COLLECTION
// ============================================================================

/**
 * Create quiz
 * @param {Object} quizData - Quiz data
 * @returns {Promise<string>} Created quiz ID
 */
export async function createQuiz(quizData) {
  const quizzesRef = collection(db, 'quizzes');
  const docRef = await addDoc(quizzesRef, {
    ...quizData,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
    isActive: true
  });
  return docRef.id;
}

/**
 * Get all active quizzes
 * @returns {Promise<Array>} Array of quiz documents
 */
export async function getQuizzes() {
  const docs = await getCollectionDocs('quizzes');
  return docs.filter((doc) => doc.isActive !== false);
}

/**
 * Get quiz by ID
 * @param {string} quizId - Quiz ID
 * @returns {Promise<Object|null>} Quiz data or null
 */
export async function getQuiz(quizId) {
  const quizRef = doc(db, 'quizzes', quizId);
  const quizSnap = await getDoc(quizRef);
  return quizSnap.exists() ? { id: quizSnap.id, ...quizSnap.data() } : null;
}

/**
 * Get quizzes by module ID
 * @param {string} moduleId - Module ID
 * @returns {Promise<Array>} Array of quiz documents for the module
 */
export async function getQuizzesByModule(moduleId) {
  const equivalentIds = getEquivalentModuleIds(moduleId);
  if (!equivalentIds.length) return [];

  const quizzes = await getQuizzes();
  return quizzes.filter((quiz) => {
    const values = Array.isArray(quiz.moduleId) ? quiz.moduleId : [quiz.moduleId];
    return values.some((value) => equivalentIds.includes(value));
  });
}

/**
 * Update quiz
 * @param {string} quizId - Quiz ID
 * @param {Object} updates - Fields to update
 * @returns {Promise<void>}
 */
export async function updateQuiz(quizId, updates) {
  const quizRef = doc(db, 'quizzes', quizId);
  await updateDoc(quizRef, {
    ...updates,
    updatedAt: Timestamp.now()
  });
}

/**
 * Delete quiz (soft delete by marking inactive)
 * @param {string} quizId - Quiz ID
 * @returns {Promise<void>}
 */
export async function deleteQuiz(quizId) {
  const quizRef = doc(db, 'quizzes', quizId);
  await updateDoc(quizRef, {
    isActive: false,
    updatedAt: Timestamp.now()
  });
}

// ============================================================================
// QUIZ ASSIGNMENTS COLLECTION
// ============================================================================

/**
 * Create quiz assignment
 * @param {Object} assignmentData - Assignment data
 * @returns {Promise<string>} Created assignment ID
 */
export async function createQuizAssignment(assignmentData) {
  const assignmentsRef = collection(db, 'quiz_assignments');
  const docRef = await addDoc(assignmentsRef, {
    ...assignmentData,
    createdAt: Timestamp.now(),
    isActive: true
  });
  return docRef.id;
}

/**
 * Get quiz assignments by target
 * @param {string} targetType - Target type ('module' or 'mission')
 * @param {string} targetId - Target ID
 * @returns {Promise<Array>} Array of assignment documents
 */
export async function getQuizAssignmentsByTarget(targetType, targetId) {
  const equivalentIds = getEquivalentModuleIds(targetId);
  const docs = await getCollectionDocs('quiz_assignments');

  return docs.filter((assignment) => {
    if (assignment.targetType !== targetType) return false;
    if (assignment.isActive === false) return false;

    const values = Array.isArray(assignment.targetId) ? assignment.targetId : [assignment.targetId];
    return values.some((value) => equivalentIds.includes(value));
  });
}

/**
 * Delete quiz assignment
 * @param {string} assignmentId - Assignment ID
 * @returns {Promise<void>}
 */
export async function deleteQuizAssignment(assignmentId) {
  const assignmentRef = doc(db, 'quiz_assignments', assignmentId);
  await deleteDoc(assignmentRef);
}

// ============================================================================
// QUIZ SUBMISSIONS COLLECTION
// ============================================================================

/**
 * Create quiz submission
 * @param {Object} submissionData - Submission data
 * @returns {Promise<string>} Created submission ID
 */
export async function createQuizSubmission(submissionData) {
  const submissionsRef = collection(db, 'quiz_submissions');
  const docRef = await addDoc(submissionsRef, {
    ...submissionData,
    submittedAt: Timestamp.now(),
    status: 'pending'
  });
  return docRef.id;
}

/**
 * Get quiz submissions by student
 * @param {string} studentId - Student ID
 * @returns {Promise<Array>} Array of submission documents
 */
export async function getQuizSubmissionsByStudent(studentId) {
  const submissionsRef = collection(db, 'quiz_submissions');
  const submissionsQuery = query(
    submissionsRef, 
    where('studentId', '==', studentId),
    orderBy('submittedAt', 'desc')
  );
  const submissionsSnap = await getDocs(submissionsQuery);
  return submissionsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

/**
 * Get pending quiz submissions for instructor grading
 * @returns {Promise<Array>} Array of pending submission documents
 */
export async function getPendingQuizSubmissions() {
  const submissionsRef = collection(db, 'quiz_submissions');
  const submissionsQuery = query(
    submissionsRef, 
    where('status', '==', 'pending'),
    orderBy('submittedAt', 'desc')
  );
  const submissionsSnap = await getDocs(submissionsQuery);
  return submissionsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

/**
 * Update quiz submission status
 * @param {string} submissionId - Submission ID
 * @param {string} status - New status ('pending' or 'graded')
 * @returns {Promise<void>}
 */
export async function updateQuizSubmissionStatus(submissionId, status) {
  const submissionRef = doc(db, 'quiz_submissions', submissionId);
  await updateDoc(submissionRef, { status });
}

// ============================================================================
// QUIZ RESULTS COLLECTION
// ============================================================================

/**
 * Create quiz result
 * @param {Object} resultData - Result data
 * @returns {Promise<string>} Created result ID
 */
export async function createQuizResult(resultData) {
  const resultsRef = collection(db, 'quiz_results');
  const docRef = await addDoc(resultsRef, {
    ...resultData,
    gradedAt: Timestamp.now(),
    passed: resultData.score >= 70 // Default passing threshold
  });
  return docRef.id;
}

/**
 * Get quiz result by submission ID
 * @param {string} submissionId - Submission ID
 * @returns {Promise<Object|null>} Result data or null
 */
export async function getQuizResultBySubmission(submissionId) {
  const resultsRef = collection(db, 'quiz_results');
  const resultsQuery = query(resultsRef, where('submissionId', '==', submissionId));
  const resultsSnap = await getDocs(resultsQuery);
  return resultsSnap.empty ? null : { id: resultsSnap.docs[0].id, ...resultsSnap.docs[0].data() };
}

// ============================================================================
// COURSE SETTINGS COLLECTION
// ============================================================================

/**
 * Get course settings
 * @returns {Promise<Object>} Course settings
 */
export async function getCourseSettings() {
  const settingsRef = doc(db, 'course_settings', 'global');
  const settingsSnap = await getDoc(settingsRef);
  
  if (settingsSnap.exists()) {
    return settingsSnap.data();
  } else {
    // Return default settings if none exist
    const defaultSettings = {
      sequentialUnlock: true,
      autoAwardBadgesAndCerts: true,
      lockedModuleIds: [],
      moduleOrder: ['m1-mission1', 'm1-mission2', 'm1-mission3'],
      passingThreshold: 70,
      maxRetakes: -1,
      updatedAt: Timestamp.now(),
      updatedBy: 'system'
    };
    await setDoc(settingsRef, defaultSettings);
    return defaultSettings;
  }
}

/**
 * Update course settings
 * @param {Object} updates - Settings to update
 * @param {string} updatedBy - User ID who made the update
 * @returns {Promise<void>}
 */
export async function updateCourseSettings(updates, updatedBy) {
  const settingsRef = doc(db, 'course_settings', 'global');
  await updateDoc(settingsRef, {
    ...updates,
    updatedAt: Timestamp.now(),
    updatedBy
  });
}

// ============================================================================
// REAL-TIME LISTENERS
// ============================================================================

/**
 * Listen to real-time updates for a collection
 * @param {string} collectionName - Name of the collection
 * @param {Function} callback - Callback function to handle updates
 * @param {Object} queryConstraints - Optional query constraints
 * @returns {Function} Unsubscribe function
 */
export function subscribeToCollection(collectionName, callback, queryConstraints = []) {
  const collectionRef = collection(db, collectionName);
  const q = queryConstraints.length > 0 ? query(collectionRef, ...queryConstraints) : collectionRef;
  
  return onSnapshot(q, (snapshot) => {
    const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    callback(docs);
  }, (error) => {
    console.error(`Error listening to ${collectionName}:`, error);
  });
}

/**
 * Listen to real-time updates for a specific document
 * @param {string} collectionName - Name of the collection
 * @param {string} docId - Document ID
 * @param {Function} callback - Callback function to handle updates
 * @returns {Function} Unsubscribe function
 */
export function subscribeToDocument(collectionName, docId, callback) {
  const docRef = doc(db, collectionName, docId);
  
  return onSnapshot(docRef, (docSnap) => {
    if (docSnap.exists()) {
      callback({ id: docSnap.id, ...docSnap.data() });
    } else {
      callback(null);
    }
  }, (error) => {
    console.error(`Error listening to ${collectionName}/${docId}:`, error);
  });
}

// ============================================================================
// BATCH OPERATIONS
// ============================================================================

/**
 * Perform batch write operations
 * @param {Array} operations - Array of operation objects
 * @returns {Promise<void>}
 */
export async function performBatchWrite(operations) {
  const batch = writeBatch(db);
  
  operations.forEach(operation => {
    const { type, ref, data } = operation;
    
    if (type === 'set') {
      batch.set(ref, data);
    } else if (type === 'update') {
      batch.update(ref, data);
    } else if (type === 'delete') {
      batch.delete(ref);
    }
  });
  
  await batch.commit();
}
