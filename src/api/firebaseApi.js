/**
 * Firebase REST API Client
 * 
 * Provides a comprehensive interface for communicating between the Vue.js 
 * frontend and the Express.js backend with Firestore database integration.
 * 
 * This module handles all HTTP communication for:
 * - Authentication (students and instructors)
 * - Training modules and missions management
 * - Quiz creation, assignment, and grading
 * - Student enrollment and progress tracking
 * - Administrative operations
 * 
 * Error Handling:
 * - All API calls include standardized error handling
 * - Network errors are caught and re-thrown with context
 * - HTTP errors are parsed and provide meaningful messages
 * - Console logging for debugging API issues
 * 
 * Base URL Configuration:
 * - Development: http://localhost:3000/api/v1
 * - Production: Should be updated for production deployment
 */

const API_BASE_URL = 'http://localhost:3001/api/v1';
let sessionToken = null;

export function clearSession() {
  sessionToken = null;
}

async function loginWithSession(endpoint, email, password) {
  clearSession();
  const response = await apiFetch(endpoint, { method: 'POST', body: JSON.stringify({ email, password }) });
  sessionToken = response.sessionToken || null;
  return response;
}

export async function loginDemo(email, password) {
  return loginWithSession('/auth/demo-login', email, password);
}

export async function getInstructorOverview(instructorId) {
  return apiFetch(`/instructors/${encodeURIComponent(instructorId)}/overview`);
}
export async function getInstructorStudentManagement(instructorId, options = {}) {
  return apiFetch(`/instructors/${encodeURIComponent(instructorId)}/student-management`, { timeoutMs: 20000, ...options });
}
export async function getInstructorStudentRecord(instructorId, studentId, options = {}) {
  return apiFetch(`/instructors/${encodeURIComponent(instructorId)}/students/${encodeURIComponent(studentId)}/training-record`, { timeoutMs: 20000, ...options });
}

/**
 * Generic fetch wrapper with comprehensive error handling
 * 
 * Provides standardized HTTP communication with:
 * - Automatic JSON content-type headers
 * - Consistent error parsing and reporting
 * - Centralized logging for debugging
 * - Promise-based interface
 * 
 * @param {string} endpoint - API endpoint path (e.g., '/auth/instructor-login')
 * @param {Object} options - Fetch options (method, body, headers, etc.)
 * @returns {Promise<Object>} Parsed JSON response
 * @throws {Error} Network errors or HTTP error responses
 */
async function apiFetch(endpoint, options = {}) {
  const { timeoutMs = 0, signal: externalSignal, ...requestOptions } = options;
  const timeoutController = timeoutMs > 0 ? new AbortController() : null;
  let timeoutId = null;
  let timedOut = false;
  let forwardAbort = null;

  if (timeoutController) {
    if (externalSignal?.aborted) timeoutController.abort(externalSignal.reason);
    else if (externalSignal) {
      forwardAbort = () => timeoutController.abort(externalSignal.reason);
      externalSignal.addEventListener('abort', forwardAbort, { once: true });
    }
    timeoutId = setTimeout(() => {
      timedOut = true;
      timeoutController.abort();
    }, timeoutMs);
  }

  try {
    const url = `${API_BASE_URL}${endpoint}`;
    const response = await fetch(url, {
      ...requestOptions,
      headers: {
        'Content-Type': 'application/json',
        ...(sessionToken ? { Authorization: `Bearer ${sessionToken}` } : {}),
        ...requestOptions.headers,
      },
      signal: timeoutController?.signal ?? externalSignal,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: response.statusText }));
      throw new Error(error.message || `API Error: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    if (timedOut) {
      const timeoutError = new Error(`Request timed out after ${timeoutMs}ms`);
      timeoutError.name = 'TimeoutError';
      console.error(`API Error [${endpoint}]:`, timeoutError);
      throw timeoutError;
    }
    if (error?.name !== 'AbortError') console.error(`API Error [${endpoint}]:`, error);
    throw error;
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
    if (externalSignal && forwardAbort) externalSignal.removeEventListener('abort', forwardAbort);
  }
}

// =============================================================================
// TRAINING MODULES API
// =============================================================================

export async function createModule(moduleData) {
  return apiFetch('/modules', {
    method: 'POST',
    body: JSON.stringify(moduleData),
  });
}

export async function updateModule(moduleId, moduleData) {
  return apiFetch(`/modules/${moduleId}`, {
    method: 'PUT',
    body: JSON.stringify(moduleData),
  });
}

export async function getAllModules() {
  return apiFetch('/modules');
}

export async function getModule(moduleId) {
  return apiFetch(`/modules/${moduleId}`);
}

export async function deleteModule(moduleId) {
  return apiFetch(`/modules/${moduleId}`, {
    method: 'DELETE',
  });
}

// =============================================================================
// QUIZZES API
// =============================================================================

export async function createQuiz(quizData) {
  return apiFetch('/quizzes', {
    method: 'POST',
    body: JSON.stringify(quizData),
  });
}

export async function updateQuiz(quizId, quizData) {
  return apiFetch(`/quizzes/${quizId}`, {
    method: 'PUT',
    body: JSON.stringify(quizData),
  });
}

export async function getAllQuizzes() {
  return apiFetch('/quizzes');
}

export async function getQuiz(quizId) {
  return apiFetch(`/quizzes/${quizId}`);
}

export async function getQuizByModuleId(moduleId) {
  return apiFetch(`/quizzes/by-module/${moduleId}`);
}

export async function deleteQuiz(quizId) {
  return apiFetch(`/quizzes/${quizId}`, {
    method: 'DELETE',
  });
}

export async function deleteQuizSubmissions(quizId) {
  return apiFetch(`/quizzes/${quizId}/submissions`, {
    method: 'DELETE',
  });
}

export async function deleteQuizScores(quizId) {
  return apiFetch(`/quiz-scores/${quizId}/scores`, {
    method: 'DELETE',
  });
}

export async function saveQuizScore(scoreData) {
  return apiFetch('/quiz-scores', {
    method: 'POST',
    body: JSON.stringify(scoreData),
    timeoutMs: 15000,
  });
}

export async function assignQuiz(assignmentData) {
  return apiFetch('/quizzes/assign', {
    method: 'POST',
    body: JSON.stringify(assignmentData),
  });
}

export async function createQuizAssignment(assignmentData) {
  return apiFetch('/quiz-assignments', {
    method: 'POST',
    body: JSON.stringify(assignmentData),
  });
}

export async function submitQuiz(submissionData) {
  const quizId = submissionData.quizId;
  if (!quizId) {
    throw new Error('quizId is required for quiz submission');
  }
  return apiFetch(`/quizzes/${quizId}/submit`, {
    method: 'POST',
    body: JSON.stringify(submissionData),
  });
}

export async function gradeQuiz(submissionId) {
  return apiFetch(`/quizzes/grade/${submissionId}`, {
    method: 'POST',
  });
}

export async function getQuizResults(filters = {}) {
  const params = new URLSearchParams(filters);
  return apiFetch(`/quizzes/results?${params}`);
}

// =============================================================================
// STUDENTS API
// =============================================================================

export async function createStudent(studentData) {
  return apiFetch('/students/signup', {
    method: 'POST',
    body: JSON.stringify(studentData),
  });
}

/**
 * Authenticate student against Firestore
 * @param {string} email - Student email (should end with @dnsc.edu.ph)
 * @param {string} password - Plain text password
 * @returns {Promise} Resolves to student data or rejects with error
 */
export async function loginStudent(email, password) {
  return loginWithSession('/students/login', email, password);
}

/**
 * Authenticate instructor against Firestore database
 * 
 * Handles authentication for instructors created through the admin panel.
 * This method communicates with the backend /auth/instructor-login endpoint
 * which validates credentials against the Firestore instructor collection.
 * 
 * Email Pattern Requirements:
 * - Expected: @helmquest.edu.ph (Firestore-managed instructors)
 * - Demo accounts (@helmquest.local) are handled by frontend logic first
 * 
 * Authentication Process:
 * 1. Sends credentials to backend API endpoint
 * 2. Backend queries Firestore by email
 * 3. Backend validates instructor status (must be 'active')
 * 4. Backend compares password using bcrypt
 * 5. Returns instructor profile data on success
 * 
 * Error Scenarios:
 * - Invalid credentials: Promise rejects with 401 error
 * - Inactive account: Promise rejects with 403 error
 * - Network issues: Promise rejects with network error
 * - Server errors: Promise rejects with 500 error
 * 
 * @param {string} email - Instructor email (should end with @helmquest.edu.ph)
 * @param {string} password - Plain text password (will be hashed by backend)
 * @returns {Promise<Object>} Resolves to instructor profile data
 * @throws {Error} Authentication failures, network errors, or server errors
 * 
 * @example
 * try {
 *   const result = await loginInstructor('prof@helmquest.edu.ph', 'password123');
 *   console.log('Login successful:', result.instructor);
 * } catch (error) {
 *   console.error('Login failed:', error.message);
 * }
 */
export async function loginInstructor(email, password) {
  return loginWithSession('/auth/instructor-login', email, password);
}

export async function getPendingStudents(instructorId = null) {
  const params = instructorId ? `?instructorId=${instructorId}` : '';
  return apiFetch(`/students/pending${params}`);
}

export async function approveStudent(studentId, instructorId) {
  return apiFetch(`/students/${studentId}/approve`, {
    method: 'PUT',
    body: JSON.stringify({ instructorId }),
  });
}

export async function rejectStudent(studentId) {
  return apiFetch(`/students/${studentId}/reject`, {
    method: 'PUT',
  });
}

export async function updateStudent(studentId, studentData) {
  return apiFetch(`/students/${studentId}`, {
    method: 'PUT',
    body: JSON.stringify(studentData),
  });
}

export async function getAllStudents(instructorId = null) {
  const params = instructorId ? `?instructorId=${instructorId}` : '';
  return apiFetch(`/students${params}`);
}

export async function getStudent(studentId) {
  return apiFetch(`/students/${studentId}`);
}

export async function deleteStudent(studentId) {
  return apiFetch(`/students/${studentId}`, {
    method: 'DELETE',
  });
}

// =============================================================================
// INSTRUCTORS API
// =============================================================================

export async function getAllInstructors() {
  return apiFetch('/instructors');
}

export async function getInstructor(instructorId) {
  return apiFetch(`/instructors/${instructorId}`);
}

export async function getInstructorStudents(instructorId) {
  return apiFetch(`/instructors/${instructorId}/students`);
}

// =============================================================================
// MISSIONS (Navigation Missions) API
// =============================================================================

export async function createMission(missionData) {
  return apiFetch('/missions', {
    method: 'POST',
    body: JSON.stringify(missionData),
  });
}

export async function updateMission(missionId, missionData) {
  return apiFetch(`/missions/${missionId}`, {
    method: 'PUT',
    body: JSON.stringify(missionData),
  });
}

export async function getAllMissions(moduleId = null) {
  const params = moduleId ? `?moduleId=${moduleId}` : '';
  return apiFetch(`/missions${params}`);
}

export async function getMission(missionId) {
  return apiFetch(`/missions/${missionId}`);
}

export async function deleteMission(missionId) {
  return apiFetch(`/missions/${missionId}`, {
    method: 'DELETE',
  });
}

export async function deleteMissionScores(missionId) {
  return apiFetch(`/missions/${missionId}/scores`, {
    method: 'DELETE',
  });
}

// =============================================================================
// MISSION ATTEMPTS API
// =============================================================================

export async function recordAttempt(attemptData) {
  return apiFetch('/attempts', {
    method: 'POST',
    body: JSON.stringify(attemptData),
  });
}

export async function getStudentAttempts(studentId) {
  return apiFetch(`/attempts?studentId=${encodeURIComponent(studentId)}`);
}

export async function getMissionAttempts(missionId) {
  return apiFetch(`/attempts?missionId=${encodeURIComponent(missionId)}`);
}

// =============================================================================
// PROGRESS API
// =============================================================================

export async function getStudentProgress(studentId) {
  return apiFetch(`/progress/student/${studentId}`);
}

export async function updateModuleProgress(progressData) {
  return apiFetch('/progress/module', {
    method: 'POST',
    body: JSON.stringify(progressData),
  });
}

export async function getCourseSettings() {
  return apiFetch('/progress/course-settings');
}

export async function updateCourseSettings(settings) {
  return apiFetch('/progress/course-settings', {
    method: 'PUT',
    body: JSON.stringify(settings),
  });
}

// =============================================================================
// TRAINING RECORDS API
// =============================================================================

/**
 * Fetch mission scores for a specific student
 * @param {string} studentId - The student's ID
 * @returns {Promise<Object>} Response containing scores array and count
 */
export async function getMissionScores(studentId) {
  return apiFetch(`/mission-scores/${studentId}`);
}

/**
 * Fetch quiz scores for a specific student (from quiz_score collection)
 * @param {string} studentId - The student's ID
 * @returns {Promise<Object>} Response containing scores array and count
 */
export async function getQuizScores(studentId, options = {}) {
  return apiFetch(`/quiz-scores/${encodeURIComponent(studentId)}`, { timeoutMs: 15000, ...options });
}

/**
 * Fetch quiz submissions for a specific student (legacy - from quiz_submissions collection)
 * @param {string} studentId - The student's ID
 * @returns {Promise<Object>} Response containing submissions array and count
 */
export async function getQuizSubmissions(studentId) {
  return apiFetch(`/quiz-submissions/student/${studentId}`);
}
