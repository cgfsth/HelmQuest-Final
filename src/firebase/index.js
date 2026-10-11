// Firebase integration entry point
export { db, auth, analytics } from './config.js';
export { 
  signInUser, 
  signOutUser, 
  createUser, 
  onAuthStateChange, 
  getCurrentUser 
} from './auth.js';
export { 
  migrateToFirebase, 
  isMigrationCompleted, 
  createSampleData 
} from './migration.js';
export {
  initializeFirebaseData,
  cleanupFirebaseListeners,
  recordMissionSession,
  getCompletedModuleIds,
  getLatestMissionResult,
  hasMissionAttempt,
  getStudentSessions,
  getAssignedQuizzes,
  submitQuiz,
  gradeQuizSubmission,
  getStudentQuizSubmissions,
  getStudentTrainingRecords,
  firebaseUser,
  studentsData,
  missionsData,
  quizzesData,
  courseSettingsData,
  isLoading,
  isInitialized,
  instructorStats,
  studentsWithStats,
  handleFirebaseError
} from './progressStore.js';

// Re-export all Firestore operations for direct use
export * from './firestore.js';