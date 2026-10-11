import { ensureCourseSettings } from './courseSettings.js';
import { getStudentDisplayBadges } from './studentMotivation.js';

const STORAGE_KEY = 'helmquest-progress-v3';

/**
 * @typedef {Object} Quiz
 * @property {string} id - Unique quiz identifier (e.g., "quiz-1234567890")
 * @property {string} title - Quiz title
 * @property {string} description - Quiz description/instructions
 * @property {Question[]} questions - Array of questions in the quiz
 * @property {number} buoyCount - Number of buoys to display in simulator (0-20)
 * @property {string} createdAt - ISO timestamp of quiz creation
 * @property {string} createdBy - Instructor ID who created the quiz
 * @property {string} updatedAt - ISO timestamp of last update
 */

/**
 * @typedef {Object} Question
 * @property {string} id - Unique question identifier
 * @property {string} prompt - Question text
 * @property {'multiple-choice'|'true-false'|'fill-in-the-blank'} type - Question format
 * @property {MultipleChoiceOption[]} [options] - Answer options (for multiple-choice only)
 * @property {string} correctAnswer - Correct answer text
 * @property {number} order - Display order (0-indexed)
 * @property {number} [checkpointLat] - Checkpoint latitude coordinate for in-simulator quizzes
 * @property {number} [checkpointLng] - Checkpoint longitude coordinate for in-simulator quizzes
 */

/**
 * @typedef {Object} MultipleChoiceOption
 * @property {string} text - Option text
 * @property {boolean} isCorrect - Whether this is the correct answer
 */

/**
 * @typedef {Object} QuizAssignment
 * @property {string} id - Unique assignment identifier (e.g., "assignment-1234567890")
 * @property {string} quizId - Reference to Quiz
 * @property {'module'|'mission'} targetType - What the quiz is assigned to
 * @property {string} targetId - Module ID (e.g., "m1-mission1") or Mission ID (e.g., "M1-1")
 * @property {string} createdAt - ISO timestamp of assignment creation
 * @property {string} createdBy - Instructor ID who created the assignment
 */

/**
 * @typedef {Object} QuizSubmission
 * @property {string} id - Unique submission identifier (e.g., "submission-1234567890")
 * @property {string} quizId - Reference to Quiz
 * @property {string} studentId - Student ID
 * @property {string} studentName - Student display name
 * @property {string[]} answers - Student answers (index matches question order)
 * @property {string} submittedAt - ISO timestamp of submission
 * @property {'pending'|'graded'} status - Validation status
 */

/**
 * @typedef {Object} QuizResult
 * @property {string} id - Unique result identifier (e.g., "result-1234567890")
 * @property {string} submissionId - Reference to QuizSubmission
 * @property {string} quizId - Reference to Quiz
 * @property {string} studentId - Student ID
 * @property {number} score - Score percentage (0-100)
 * @property {boolean[]} validation - Array of correct/incorrect flags (index matches question order)
 * @property {string} [feedback] - Optional instructor feedback
 * @property {string} gradedAt - ISO timestamp of grading
 * @property {string} gradedBy - Instructor ID who graded the submission
 */

import { DEMO_USERS } from '../../shared/demoAccounts.js';
export { DEMO_USERS };

function defaultProgress() {
  return {
    students: [
      {
        id: 'student-alex',
        studentId: 'STU-2026-001',
        name: 'Alex Rivera',
        email: 'student@helmquest.local',
        status: 'active',
        boatUsed: 'Commercial Trawler',
        instructorId: 'instructor-helen'
      },
      {
        id: 'student-jordan',
        studentId: 'STU-2026-002',
        name: 'Jordan Lee',
        email: 'student-jordan@helmquest.local',
        status: 'active',
        boatUsed: 'Commercial Trawler',
        instructorId: 'instructor-helen'
      },
      {
        id: 'student-sarah',
        studentId: 'STU-2026-003',
        name: 'Sarah Chen',
        email: 'student-sarah@helmquest.local',
        status: 'active',
        boatUsed: 'Commercial Trawler',
        instructorId: 'instructor-marcus'
      },
      {
        id: 'student-taylor',
        studentId: 'STU-2026-004',
        name: 'Taylor Wong',
        email: 'student-taylor@helmquest.local',
        status: 'active',
        boatUsed: 'Commercial Trawler',
        instructorId: 'instructor-marcus'
      }
    ],
    sessions: [],
    completedModules: {},
    studentProfiles: {
      'student-alex': {
        xp: 120,
        badges: [],
        certificates: []
      },
      'student-jordan': {
        xp: 80,
        badges: [],
        certificates: []
      },
      'student-sarah': {
        xp: 250,
        badges: [],
        certificates: []
      },
      'student-taylor': {
        xp: 0,
        badges: [],
        certificates: []
      }
    },
    courseSettings: {
      sequentialUnlock: true,
      autoAwardBadgesAndCerts: true,
      lockedModuleIds: [],
      moduleOrder: [
        'm1-mission1',
        'm1-mission2',
        'm1-mission3'
      ]
    }
  };
}

/**
 * Ensures quiz-related data arrays exist in progressData.
 * Initializes missing quiz arrays to empty arrays.
 * @param {ReturnType<typeof defaultProgress>} progress - Progress data object
 */
export function ensureQuizData(progress) {
  if (!progress) return;
  if (!progress.quizzes) progress.quizzes = [];
  if (!progress.quizAssignments) progress.quizAssignments = [];
  if (!progress.quizSubmissions) progress.quizSubmissions = [];
  if (!progress.quizResults) progress.quizResults = [];
}

/**
 * Fill in newer fields (studentId, status, boatUsed) for existing student
 * records that pre-date those columns. Idempotent — only sets missing values.
 */
function backfillStudentFields(progress) {
  if (!Array.isArray(progress?.students)) return;
  const seedIds = {
    'student-alex': 'STU-2026-001',
    'student-jordan': 'STU-2026-002',
    'student-sarah': 'STU-2026-003',
    'student-taylor': 'STU-2026-004'
  };
  let nextIdx = 5;
  for (const s of progress.students) {
    if (!s.studentId) {
      s.studentId = seedIds[s.id] || `STU-2026-${String(nextIdx++).padStart(3, '0')}`;
    }
    if (!s.status) s.status = 'active';
    if (!s.boatUsed) s.boatUsed = 'Commercial Trawler';
  }
}

function normalizeProgress(progress) {
  if (!progress) return progress;
  ensureCourseSettings(progress);
  ensureQuizData(progress);
  dedupeProgressSessions(progress);
  backfillStudentFields(progress);
  return progress;
}

export function authenticateUser(email, password) {
  const normalized = email.trim().toLowerCase();
  const account = DEMO_USERS[normalized];
  if (!account || account.password !== password) return null;
  return { ...account, email: normalized };
}

export function loadProgress() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const data = JSON.parse(raw);
      return normalizeProgress(data);
    }
  } catch {
    // Ignore storage read errors and fall back to demo seed data.
  }

  const initial = normalizeProgress(defaultProgress());
  saveProgress(initial);
  return initial;
}

/**
 * Keep an earned pass, otherwise the latest attempt, per student + mission.
 * @param {ReturnType<typeof defaultProgress>} progress
 */
export function dedupeProgressSessions(progress) {
  if (!progress?.sessions?.length) return;

  const sorted = [...progress.sessions].sort(compareMissionResults);
  const seen = new Set();
  const kept = [];

  for (const session of sorted) {
    const key = `${session.studentId}:${missionResultId(session.missionId)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    kept.push(session);
  }

  progress.sessions = kept.sort(
    (a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime()
  );
}

export function hasMissionAttempt(studentId, missionId, progress) {
  return progress.sessions.some(
    (entry) => entry.studentId === studentId && entry.missionId === missionId
  );
}

export function saveProgress(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // Ignore storage write errors in demo mode.
  }
}

export function recordMissionSession(sessionInput, progress) {
  const existing = progress.sessions.find(
    (entry) =>
      entry.studentId === sessionInput.studentId &&
      missionResultId(entry.missionId) === missionResultId(sessionInput.missionId)
  );

  if (existing) {
    if (existing.passed) return existing;
    existing.studentName = sessionInput.studentName;
    existing.mission = sessionInput.missionTitle;
    existing.moduleId = sessionInput.moduleId;
    existing.score = sessionInput.score;
    existing.passScore = sessionInput.passScore;
    existing.passed = sessionInput.passed;
    existing.completedAt = sessionInput.completedAt || new Date().toISOString();
    // Persist performance metrics + timing so instructors can review reports
    if (sessionInput.performanceMetrics) {
      existing.performanceMetrics = sessionInput.performanceMetrics;
    }
    if (typeof sessionInput.elapsedMs === 'number') {
      existing.elapsedMs = sessionInput.elapsedMs;
    }
  } else {
    const session = {
      id: `session-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      studentId: sessionInput.studentId,
      studentName: sessionInput.studentName,
      missionId: sessionInput.missionId,
      mission: sessionInput.missionTitle,
      moduleId: sessionInput.moduleId,
      score: sessionInput.score,
      passScore: sessionInput.passScore,
      passed: sessionInput.passed,
      completedAt: sessionInput.completedAt || new Date().toISOString(),
      performanceMetrics: sessionInput.performanceMetrics || null,
      elapsedMs: typeof sessionInput.elapsedMs === 'number' ? sessionInput.elapsedMs : null
    };
    progress.sessions.unshift(session);
  }

  if (sessionInput.passed && sessionInput.moduleId) {
    if (!progress.completedModules[sessionInput.studentId]) {
      progress.completedModules[sessionInput.studentId] = [];
    }
    if (!progress.completedModules[sessionInput.studentId].includes(sessionInput.moduleId)) {
      progress.completedModules[sessionInput.studentId].push(sessionInput.moduleId);
    }
  }

  saveProgress(progress);
  return (
    existing ??
    progress.sessions.find(
      (entry) =>
        entry.studentId === sessionInput.studentId &&
        entry.missionId === sessionInput.missionId
    )
  );
}

export function getCompletedModuleIds(studentId, progress) {
  return progress.completedModules[studentId] ?? [];
}

export function getLatestMissionResult(studentId, missionId, progress) {
  const sessions = progress.sessions.filter(
    (entry) => entry.studentId === studentId && missionResultId(entry.missionId) === missionResultId(missionId)
  );
  if (!sessions.length) return null;

  const session = sessions.sort(compareMissionResults)[0];

  return {
    score: session.score,
    passScore: session.passScore,
    passed: session.passed,
    completedAt: session.completedAt
  };
}

// CUSTOM- is the simulation wrapper; custom-mission-* is the document ID.
const missionResultId = id => String(id || '').replace(/^CUSTOM-/, '');
function missionResultTime(result) {
  const value = result.completedAt ?? result.updatedAt ?? result.createdAt;
  if (value?.toMillis) return value.toMillis();
  if (value?._seconds !== undefined) return Number(value._seconds) * 1000;
  return new Date(value).getTime() || 0;
}
function compareMissionResults(a, b) {
  return Number(b.passed === true) - Number(a.passed === true) || missionResultTime(b) - missionResultTime(a);
}

/** Restore the browser cache from saved results without awarding XP or writing to Firestore. */
export function restoreSavedMissionResults(studentId, scores, progress, getMissionsForModule, moduleIds = []) {
  const missionById = new Map(moduleIds.flatMap(moduleId => getMissionsForModule(moduleId)
    .map(mission => [missionResultId(mission.id), mission])));
  const savedByMission = new Map();
  for (const score of [...scores].sort(compareMissionResults)) {
    if (!score.missionId || (score.studentId && score.studentId !== studentId)) continue;
    const key = missionResultId(score.missionId);
    if (!savedByMission.has(key)) savedByMission.set(key, score);
  }
  const previous = progress.sessions || [];
  const previousByMission = new Map(previous.filter(entry => entry.studentId === studentId)
    .map(entry => [missionResultId(entry.missionId), entry]));
  const restored = [...savedByMission].map(([key, score]) => {
    const cached = previousByMission.get(key);
    const mission = missionById.get(key);
    return {
      ...cached,
      id: cached?.id || score.id || `saved-${studentId}:${key}`,
      studentId,
      missionId: mission?.id || score.missionId,
      mission: score.missionTitle || mission?.title || cached?.mission || key,
      moduleId: mission?.moduleId || score.moduleId || cached?.moduleId ||
        (key.startsWith('custom-mission-') ? key : undefined),
      score: score.score,
      passScore: mission?.passScore ?? score.passScore ?? cached?.passScore,
      passed: score.passed === true,
      completedAt: score.completedAt ?? score.updatedAt ?? score.createdAt
    };
  });
  progress.sessions = [...previous.filter(entry => entry.studentId !== studentId), ...restored];
  if (!progress.completedModules) progress.completedModules = {};
  const knownCompleted = moduleIds.filter(moduleId => {
    const missions = getMissionsForModule(moduleId);
    return missions.length > 0 && missions.every(mission => savedByMission.get(missionResultId(mission.id))?.passed === true);
  });
  const unknownCompleted = restored.filter(result => result.passed && result.moduleId && !moduleIds.includes(result.moduleId))
    .map(result => result.moduleId);
  progress.completedModules[studentId] = [...new Set([...knownCompleted, ...unknownCompleted])];
  saveProgress(progress);
}

export function getStudentSessions(studentId, progress) {
  const seen = new Set();
  return progress.sessions
    .filter((session) => session.studentId === studentId)
    .filter((session) => {
      if (seen.has(session.missionId)) return false;
      seen.add(session.missionId);
      return true;
    })
    .map((session) => ({
      id: session.id,
      missionId: session.missionId,
      mission: session.mission,
      moduleId: session.moduleId,
      score: session.score,
      passScore: session.passScore,
      passed: session.passed,
      completedAt: session.completedAt,
      performanceMetrics: session.performanceMetrics || null,
      elapsedMs: session.elapsedMs ?? null
    }));
}

export function buildInstructorStudents(progress) {
  const studentMap = new Map(progress.students.map((student) => [student.id, student]));
  const aggregates = new Map();

  for (const student of progress.students ?? []) {
    const profile = progress.studentProfiles?.[student.id];
    aggregates.set(student.id, {
      id: student.id,
      name: student.name,
      sessions: 0,
      totalScore: 0,
      passed: 0,
      feedback: 0,
      badgesEarned: getStudentDisplayBadges(student.id, progress, student).filter(badge => badge.earned).length,
      certificates: profile?.certificates?.length ?? 0
    });
  }

  for (const session of progress.sessions) {
    if (!aggregates.has(session.studentId)) {
      const student = studentMap.get(session.studentId);
      const profile = progress.studentProfiles?.[session.studentId];
      aggregates.set(session.studentId, {
        id: session.studentId,
        name: student?.name ?? session.studentName,
        sessions: 0,
        totalScore: 0,
        passed: 0,
        feedback: 0,
        badgesEarned: getStudentDisplayBadges(session.studentId, progress, student ?? profile).filter(badge => badge.earned).length,
        certificates: profile?.certificates?.length ?? 0
      });
    }

    const row = aggregates.get(session.studentId);
    row.sessions += 1;
    row.totalScore += session.score;
    if (session.passed) row.passed += 1;
  }

  return [...aggregates.values()].map((row) => ({
    id: row.id,
    name: row.name,
    sessions: row.sessions,
    avgScore: row.sessions ? Number((row.totalScore / row.sessions).toFixed(1)) : 0,
    passed: row.passed,
    feedback: row.feedback,
    badgesEarned: row.badgesEarned ?? 0,
    certificates: row.certificates ?? 0
  }));
}

export function buildInstructorRecentSessions(progress, limit = 10) {
  return progress.sessions.slice(0, limit).map((session) => ({
    id: session.id,
    studentName: session.studentName,
    mission: session.mission,
    score: session.score,
    passed: session.passed
  }));
}

export function buildInstructorStats(progress) {
  const students = buildInstructorStudents(progress);
  const sessionsCompleted = progress.sessions.length;
  const averageScore = sessionsCompleted
    ? progress.sessions.reduce((sum, session) => sum + session.score, 0) / sessionsCompleted
    : 0;

  return {
    students: students.length,
    sessionsCompleted,
    averageScore: averageScore.toFixed(2)
  };
}

/** Clear all mission scores and module completions for one student. */
export function resetStudentProgress(studentId, progress) {
  progress.sessions = progress.sessions.filter((session) => session.studentId !== studentId);
  if (progress.completedModules[studentId]) {
    progress.completedModules[studentId] = [];
  }
  if (progress.studentProfiles?.[studentId]) {
    progress.studentProfiles[studentId] = { xp: 0, badges: [], certificates: [] };
  }
  saveProgress(progress);
  return progress;
}

/** Clear one mission attempt for a student (latest saved score for that mission). */
export function resetStudentMission(studentId, missionId, progress) {
  const removed = progress.sessions.find(
    (session) => session.studentId === studentId && session.missionId === missionId
  );
  if (!removed) return false;

  progress.sessions = progress.sessions.filter(
    (session) => !(session.studentId === studentId && session.missionId === missionId)
  );

  if (removed.moduleId && removed.passed) {
    const stillPassedModule = progress.sessions.some(
      (session) =>
        session.studentId === studentId &&
        session.moduleId === removed.moduleId &&
        session.passed
    );
    if (!stillPassedModule && progress.completedModules[studentId]) {
      progress.completedModules[studentId] = progress.completedModules[studentId].filter(
        (moduleId) => moduleId !== removed.moduleId
      );
    }
  }

  saveProgress(progress);
  return true;
}

export function getInstructorsWithStudents(progress) {
  const instructors = Object.entries(DEMO_USERS)
    .filter(([email, user]) => user.role === 'instructor')
    .map(([email, user]) => ({
      id: user.id,
      name: user.name,
      email: email,
      students: [],
      sessionCount: 0
    }));

  for (const student of progress.students ?? []) {
    const instId = student.instructorId || 'instructor-helen';
    const instructor = instructors.find(i => i.id === instId);
    if (instructor) {
      instructor.students.push(student);
    }
  }

  for (const session of progress.sessions ?? []) {
    const student = progress.students?.find(s => s.id === session.studentId);
    if (student) {
      const instId = student.instructorId || 'instructor-helen';
      const instructor = instructors.find(i => i.id === instId);
      if (instructor) {
        instructor.sessionCount++;
      }
    }
  }

  return instructors;
}
