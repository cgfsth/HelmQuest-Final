// Firebase-based progress store - Replaces localStorage progressStore
import { ref, computed } from 'vue';
import { studentProgressionFields } from '../../shared/progression.js';
import { 
  getStudents, 
  getMissionAttemptsByStudent, 
  getMissionScoresByStudent,
  getCompletedModules,
  createMissionAttempt,
  updateModuleProgress,
  updateStudent,
  getQuizzes,
  getQuizAssignmentsByTarget,
  createQuizSubmission,
  getQuizSubmissionsByStudent,
  createQuizResult,
  getCourseSettings,
  subscribeToCollection,
  subscribeToDocument
} from './firestore.js';

// Reactive state
export const firebaseUser = ref(null);
export const studentsData = ref([]);
export const missionsData = ref([]);
export const quizzesData = ref([]);
export const courseSettingsData = ref(null);

// Loading states
export const isLoading = ref(false);
export const isInitialized = ref(false);

// Real-time subscriptions
let unsubscribeFunctions = [];

/**
 * Initialize Firebase data and real-time listeners
 * @param {Object} user - Current authenticated user
 * @returns {Promise<void>}
 */
export async function initializeFirebaseData(user) {
  if (!user) {
    console.warn('No user provided for Firebase initialization');
    return;
  }
  
  console.log('🔄 Initializing Firebase data...');
  isLoading.value = true;
  firebaseUser.value = user;
  
  try {
    // Load initial data
    await Promise.all([
      loadStudents(),
      loadQuizzes(),
      loadCourseSettings()
    ]);
    
    // Setup real-time listeners
    setupRealtimeListeners();
    
    isInitialized.value = true;
    console.log('✅ Firebase data initialized successfully');
    
  } catch (error) {
    console.error('❌ Firebase initialization failed:', error);
    throw error;
  } finally {
    isLoading.value = false;
  }
}

/**
 * Load students data
 */
async function loadStudents() {
  try {
    const students = await getStudents();
    studentsData.value = students;
    console.log(`📊 Loaded ${students.length} students`);
  } catch (error) {
    console.error('Error loading students:', error);
    studentsData.value = [];
  }
}

/**
 * Load quizzes data
 */
async function loadQuizzes() {
  try {
    const quizzes = await getQuizzes();
    quizzesData.value = quizzes;
    console.log(`📝 Loaded ${quizzes.length} quizzes`);
  } catch (error) {
    console.error('Error loading quizzes:', error);
    quizzesData.value = [];
  }
}

/**
 * Load course settings
 */
async function loadCourseSettings() {
  try {
    const settings = await getCourseSettings();
    courseSettingsData.value = settings;
    console.log('⚙️ Loaded course settings');
  } catch (error) {
    console.error('Error loading course settings:', error);
    courseSettingsData.value = null;
  }
}

/**
 * Setup real-time listeners for live data updates
 */
function setupRealtimeListeners() {
  // Listen to students collection
  const unsubscribeStudents = subscribeToCollection('students', (students) => {
    studentsData.value = students;
    console.log(`🔄 Real-time update: ${students.length} students`);
  });
  
  // Listen to quizzes collection
  const unsubscribeQuizzes = subscribeToCollection('quizzes', (quizzes) => {
    quizzesData.value = quizzes.filter(quiz => quiz.isActive);
    console.log(`🔄 Real-time update: ${quizzes.length} active quizzes`);
  });
  
  // Listen to course settings
  const unsubscribeSettings = subscribeToDocument('course_settings', 'global', (settings) => {
    courseSettingsData.value = settings;
    console.log('🔄 Real-time update: course settings');
  });
  
  // Store unsubscribe functions
  unsubscribeFunctions.push(unsubscribeStudents, unsubscribeQuizzes, unsubscribeSettings);
}

/**
 * Cleanup Firebase listeners
 */
export function cleanupFirebaseListeners() {
  unsubscribeFunctions.forEach(unsubscribe => {
    if (typeof unsubscribe === 'function') {
      unsubscribe();
    }
  });
  unsubscribeFunctions = [];
  console.log('🧹 Firebase listeners cleaned up');
}

// ============================================================================
// COMPATIBILITY FUNCTIONS (replacing localStorage progressStore functions)
// ============================================================================

/**
 * Record mission session (replaces recordMissionSession)
 * @param {Object} sessionInput - Mission session data
 * @returns {Promise<Object>} Created session
 */
export async function recordMissionSession(sessionInput) {
  try {
    // Check if student has existing attempts for this mission
    const existingAttempts = await getMissionAttemptsByStudent(sessionInput.studentId);
    const missionAttempts = existingAttempts.filter(
      attempt => attempt.missionId === sessionInput.missionId
    );
    
    // Calculate attempt number
    const attemptNumber = missionAttempts.length + 1;
    
    // Find highest existing score
    const highestExistingScore = missionAttempts.length > 0
      ? Math.max(...missionAttempts.map(a => a.score || 0))
      : 0;
    
    // ONLY save to database if this is an improvement OR first attempt
    const shouldSaveAttempt = attemptNumber === 1 || sessionInput.score > highestExistingScore;
    
    console.log('🎯 [MISSION SAVE CHECK]', {
      missionId: sessionInput.missionId,
      attemptNumber,
      currentScore: sessionInput.score,
      highestExistingScore,
      shouldSaveAttempt
    });
    
    let attemptId = null;
    
    if (shouldSaveAttempt) {
      // Create mission attempt ONLY if improved or first attempt
      const attemptData = {
        studentId: sessionInput.studentId,
        studentName: sessionInput.studentName,
        missionId: sessionInput.missionId,
        missionTitle: sessionInput.missionTitle,
        moduleId: sessionInput.moduleId,
        score: sessionInput.score,
        passScore: sessionInput.passScore,
        maxScore: 100,
        passed: sessionInput.passed,
        elapsedMs: sessionInput.elapsedMs || null,
        performanceMetrics: sessionInput.performanceMetrics || null,
        attemptNumber
      };
      
      attemptId = await createMissionAttempt(attemptData);
      console.log('✅ [MISSION SAVED] Attempt recorded to database:', attemptId);
    } else {
      console.log('⏭️ [MISSION SKIPPED] Score not improved - not saving to database');
    }
    
    // Update student module progress if passed (regardless of save)
    if (sessionInput.passed && sessionInput.moduleId) {
      await updateModuleProgress(sessionInput.studentId, sessionInput.moduleId, {
        status: 'completed',
        highestScore: Math.max(highestExistingScore, sessionInput.score),
        attemptsCount: attemptNumber,
        firstAttemptAt: attemptNumber === 1 ? new Date() : undefined,
        completedAt: new Date(),
        certificateIssued: false
      });
      
      // Update student XP ONLY if this is the first pass or improved score
      if (shouldSaveAttempt) {
        const student = studentsData.value.find(s => s.id === sessionInput.studentId);
        if (student) {
          const xpGain = Math.floor(sessionInput.score); // 1 XP per score point
          await updateStudent(sessionInput.studentId, {
            xp: (student.xp || 0) + xpGain,
            missionsCompleted: attemptNumber === 1 ? (student.missionsCompleted || 0) + 1 : student.missionsCompleted,
            lastActiveAt: new Date()
          });
        }
      }
    }
    
    return { 
      id: attemptId, 
      saved: shouldSaveAttempt,
      attemptNumber,
      score: sessionInput.score,
      highestScore: Math.max(highestExistingScore, sessionInput.score)
    };
    
  } catch (error) {
    console.error('Error recording mission session:', error);
    throw error;
  }
}

/**
 * Get completed module IDs for student (replaces getCompletedModuleIds)
 * @param {string} studentId - Student ID
 * @returns {Promise<Array>} Array of completed module IDs
 */
export async function getCompletedModuleIds(studentId) {
  try {
    return await getCompletedModules(studentId);
  } catch (error) {
    console.error('Error getting completed modules:', error);
    return [];
  }
}

/**
 * Get latest mission result (replaces getLatestMissionResult)
 * @param {string} studentId - Student ID
 * @param {string} missionId - Mission ID
 * @returns {Promise<Object|null>} Latest mission result or null
 */
export async function getLatestMissionResult(studentId, missionId) {
  try {
    const attempts = await getMissionAttemptsByStudent(studentId);
    const missionAttempts = attempts.filter(attempt => attempt.missionId === missionId);
    
    if (missionAttempts.length === 0) {
      return null;
    }
    
    // Get the latest attempt
    const latestAttempt = missionAttempts.sort((a, b) => 
      new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime()
    )[0];
    
    return {
      score: latestAttempt.score,
      passScore: latestAttempt.passScore,
      passed: latestAttempt.passed,
      completedAt: latestAttempt.completedAt
    };
    
  } catch (error) {
    console.error('Error getting latest mission result:', error);
    return null;
  }
}

/**
 * Check if student has mission attempt (replaces hasMissionAttempt)
 * @param {string} studentId - Student ID
 * @param {string} missionId - Mission ID
 * @returns {Promise<boolean>} True if student has attempted mission
 */
export async function hasMissionAttempt(studentId, missionId) {
  try {
    const result = await getLatestMissionResult(studentId, missionId);
    return result !== null;
  } catch (error) {
    console.error('Error checking mission attempt:', error);
    return false;
  }
}

/**
 * Get student sessions (replaces getStudentSessions)
 * @param {string} studentId - Student ID
 * @returns {Promise<Array>} Array of student session data
 */
export async function getStudentSessions(studentId) {
  try {
    const attempts = await getMissionAttemptsByStudent(studentId);
    
    // Group by mission ID and get latest attempt for each mission
    const sessionMap = new Map();
    
    attempts.forEach(attempt => {
      const existing = sessionMap.get(attempt.missionId);
      if (!existing || new Date(attempt.completedAt) > new Date(existing.completedAt)) {
        sessionMap.set(attempt.missionId, {
          id: attempt.id,
          missionId: attempt.missionId,
          mission: attempt.missionTitle,
          moduleId: attempt.moduleId,
          score: attempt.score,
          passScore: attempt.passScore,
          passed: attempt.passed,
          completedAt: attempt.completedAt,
          performanceMetrics: attempt.performanceMetrics,
          elapsedMs: attempt.elapsedMs
        });
      }
    });
    
    return Array.from(sessionMap.values());
    
  } catch (error) {
    console.error('Error getting student sessions:', error);
    return [];
  }
}

/**
 * Get assigned quizzes for target (replaces getAssignedQuizzes from quiz management)
 * @param {string} targetId - Module or mission ID
 * @param {string} targetType - 'module' or 'mission'
 * @returns {Promise<Array>} Array of assigned quiz data
 */
export async function getAssignedQuizzes(targetId, targetType = 'module') {
  try {
    const assignments = await getQuizAssignmentsByTarget(targetType, targetId);
    const assignedQuizzes = [];
    
    for (const assignment of assignments) {
      const quiz = quizzesData.value.find(q => q.id === assignment.quizId);
      if (quiz) {
        assignedQuizzes.push({
          ...quiz,
          assignmentId: assignment.id
        });
      }
    }
    
    return assignedQuizzes;
    
  } catch (error) {
    console.error('Error getting assigned quizzes:', error);
    return [];
  }
}

/**
 * Submit quiz (for student quiz taking)
 * @param {Object} submissionData - Quiz submission data
 * @returns {Promise<string>} Created submission ID
 */
export async function submitQuiz(submissionData) {
  try {
    return await createQuizSubmission(submissionData);
  } catch (error) {
    console.error('Error submitting quiz:', error);
    throw error;
  }
}

/**
 * Grade quiz submission (for instructor grading)
 * @param {Object} resultData - Quiz result data
 * @returns {Promise<string>} Created result ID
 */
export async function gradeQuizSubmission(resultData) {
  try {
    return await createQuizResult(resultData);
  } catch (error) {
    console.error('Error grading quiz submission:', error);
    throw error;
  }
}

/**
 * Get quiz submissions for student
 * @param {string} studentId - Student ID
 * @returns {Promise<Array>} Array of quiz submissions
 */
export async function getStudentQuizSubmissions(studentId) {
  try {
    if (!studentId || firebaseUser.value?.uid !== studentId) return [];
    const submissions = await getQuizSubmissionsByStudent(studentId);
    return submissions.filter((submission) => submission.studentId === studentId);
  } catch (error) {
    console.error('Error getting student quiz submissions:', error);
    return [];
  }
}

/**
 * Get training records for the currently authenticated student only.
 * The student ID is taken from Firebase Auth instead of a UI-supplied ID.
 * @returns {Promise<{missionScores: Array, quizSubmissions: Array}>}
 */
export async function getStudentTrainingRecords() {
  const studentId = firebaseUser.value?.uid;
  if (!studentId || firebaseUser.value?.role !== 'student') {
    return { missionScores: [], quizSubmissions: [] };
  }

  try {
    const [missionScores, quizSubmissions] = await Promise.all([
      getMissionScoresByStudent(studentId),
      getStudentQuizSubmissions(studentId)
    ]);

    return {
      missionScores: missionScores.filter((score) => score.studentId === studentId),
      quizSubmissions
    };
  } catch (error) {
    console.error('Error getting student training records:', error);
    return { missionScores: [], quizSubmissions: [] };
  }
}

// ============================================================================
// COMPUTED PROPERTIES (for Vue reactivity)
// ============================================================================

/**
 * Computed property for instructor student statistics
 */
export const instructorStats = computed(() => {
  if (!studentsData.value.length) {
    return {
      students: 0,
      sessionsCompleted: 0,
      averageScore: 0
    };
  }

  // TODO: Calculate actual session stats from Firebase
  return {
    students: studentsData.value.length,
    sessionsCompleted: 0, // Will be calculated from mission_attempts
    averageScore: 0 // Will be calculated from mission_attempts
  };
});

/**
 * Computed property for student list with aggregated data
 */
export const studentsWithStats = computed(() => {
  return studentsData.value.map(student => ({
    id: student.id,
    name: student.name,
    sessions: 0, // TODO: Calculate from mission_attempts
    avgScore: 0, // TODO: Calculate from mission_attempts
    passed: 0, // TODO: Calculate from mission_attempts
    feedback: 0, // TODO: Calculate from instructor_feedback
    badgesEarned: studentProgressionFields(student, courseSettingsData.value).badgesEarned,
    certificates: student.certificates?.length || 0
  }));
});

// ============================================================================
// ERROR HANDLING
// ============================================================================

/**
 * Handle Firebase errors with user-friendly messages
 * @param {Error} error - Firebase error
 * @returns {string} User-friendly error message
 */
export function handleFirebaseError(error) {
  console.error('Firebase error:', error);
  
  switch (error.code) {
    case 'permission-denied':
      return 'You do not have permission to perform this action.';
    case 'unavailable':
      return 'The service is currently unavailable. Please try again later.';
    case 'network-request-failed':
      return 'Network error. Please check your internet connection.';
    case 'quota-exceeded':
      return 'Database quota exceeded. Please contact support.';
    default:
      return 'An unexpected error occurred. Please try again.';
  }
}
