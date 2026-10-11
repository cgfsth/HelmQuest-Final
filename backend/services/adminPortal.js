import { getRankConfiguration } from '../../shared/progression.js';
import { canonicalMissionId, hasMissionCompletion } from './missionRewards.js';
import { buildStudentTrainingRecord } from './studentTrainingRecords.js';

const records = snapshot => snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
const owner = record => record?.instructorid ?? record?.instructorId ?? null;
const timestamp = value => value?.toMillis?.() || new Date(value?.toDate?.() ?? value).getTime() || 0;
const resultTime = result => timestamp(result?.completedAt ?? result?.submittedAt ?? result?.updatedAt ?? result?.createdAt);
const isoDate = value => timestamp(value) ? new Date(timestamp(value)).toISOString() : null;
const numericScore = value => value === null || value === undefined || value === '' || !Number.isFinite(Number(value))
  ? null : Number(value);
const quizScore = result => numericScore(result?.['Quiz-score-percentage'] ?? result?.score);
const missionTitle = mission => mission?.mission_title || mission?.title || 'Mission';
const quizTitle = quiz => quiz?.title || quiz?.quizTitle || 'Quiz';
const ADMIN_TIME_ZONE = 'Asia/Manila';
const adminDateFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: ADMIN_TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit'
});

function adminDateKey(value) {
  const milliseconds = value instanceof Date ? value.getTime() : timestamp(value);
  if (!Number.isFinite(milliseconds) || milliseconds <= 0) return null;
  const parts = Object.fromEntries(adminDateFormatter.formatToParts(new Date(milliseconds))
    .filter(part => part.type !== 'literal').map(part => [part.type, part.value]));
  return `${parts.year}-${parts.month}-${parts.day}`;
}

function shiftDateKey(dateKey, days) {
  const [year, month, day] = dateKey.split('-').map(Number);
  const shifted = new Date(Date.UTC(year, month - 1, day + days));
  return shifted.toISOString().slice(0, 10);
}

function uniqueResults(results, identity, preserveMissionPass = false) {
  const selected = new Map();
  for (const result of results) {
    const key = identity(result);
    if (!key) continue;
    const previous = selected.get(key);
    const passed = preserveMissionPass && hasMissionCompletion(result);
    const previousPassed = previous && preserveMissionPass && hasMissionCompletion(previous);
    if (!previous || (passed && !previousPassed) ||
        (passed === previousPassed && resultTime(result) > resultTime(previous))) {
      selected.set(key, result);
    }
  }
  return [...selected.values()];
}

function quizMissionIds(quiz) {
  return [quiz?.moduleId, quiz?.missionId]
    .flatMap(value => Array.isArray(value) ? value : [value])
    .filter(Boolean)
    .map(canonicalMissionId);
}

function average(values) {
  const numbers = values.filter(value => value !== null);
  return numbers.length ? Math.round(numbers.reduce((total, value) => total + value, 0) / numbers.length) : 0;
}

export function publicInstructor(instructor = {}) {
  return {
    id: instructor.id,
    name: instructor.name || 'Instructor',
    email: instructor.email || '',
    role: instructor.role || 'instructor',
    status: instructor.status || 'active',
    createdAt: isoDate(instructor.createdAt),
    updatedAt: isoDate(instructor.updatedAt)
  };
}

export function buildAdminStats({
  students = [], instructors = [], missions = [], quizzes = [], assignments = [], missionScores = [], quizScores = [], now = new Date()
}) {
  const studentsById = new Map(students.map(student => [student.id, student]));
  const instructorsById = new Map(instructors.map(instructor => [instructor.id, instructor]));
  const missionsById = new Map(missions.map(mission => [canonicalMissionId(mission.id), mission]));
  const quizzesById = new Map(quizzes.map(quiz => [quiz.id, quiz]));

  const currentMissionResults = uniqueResults(missionScores.filter(result =>
    studentsById.has(result.studentId) && missionsById.has(canonicalMissionId(result.missionId))),
  result => result.studentId && result.missionId
    ? JSON.stringify([result.studentId, canonicalMissionId(result.missionId)]) : null, true);
  const currentQuizResults = uniqueResults(quizScores.filter(result =>
    studentsById.has(result.studentId) && quizzesById.has(result.quizId)),
  result => result.studentId && result.quizId ? JSON.stringify([result.studentId, result.quizId]) : null);
  const passedMissions = currentMissionResults.filter(hasMissionCompletion);
  const passedQuizzes = currentQuizResults.filter(result => result.passed === true);
  const studentsStarted = new Set([...currentMissionResults, ...currentQuizResults].map(result => result.studentId)).size;

  const quizIds = new Set(quizzes.map(quiz => quiz.id));
  const assignmentMissionIds = assignments
    .filter(assignment => assignment.targetType === 'module' && quizIds.has(assignment.quizId))
    .map(assignment => canonicalMissionId(assignment.targetId));
  const linkedMissionIds = new Set([...quizzes.flatMap(quizMissionIds), ...assignmentMissionIds]);
  const unassignedStudents = students.filter(student => {
    const instructorId = owner(student);
    return !instructorId || !instructorsById.has(instructorId);
  }).length;
  const attention = {
    pendingStudents: students.filter(student => student.status === 'pending').length,
    inactiveInstructors: instructors.filter(instructor => instructor.status === 'inactive').length,
    unassignedStudents,
    missionsWithoutQuiz: missions.filter(mission => !linkedMissionIds.has(canonicalMissionId(mission.id))).length
  };
  attention.total = Object.values(attention).reduce((total, count) => total + count, 0);

  const currentDateKey = adminDateKey(now);
  // Start at Monday in the application's timezone; keep real consecutive dates.
  const weekday = new Date(`${currentDateKey}T00:00:00.000Z`).getUTCDay();
  const mondayDateKey = shiftDateKey(currentDateKey, -((weekday + 6) % 7));
  const trainingTrend = Array.from({ length: 7 }, (_, index) => {
    const date = shiftDateKey(mondayDateKey, index);
    return {
      date,
      completions: passedMissions.filter(result => adminDateKey(resultTime(result)) === date).length
    };
  });

  const recentResults = [
    ...currentMissionResults.map(result => ({
      id: result.id,
      studentId: result.studentId,
      studentName: studentsById.get(result.studentId)?.name || 'Student',
      type: 'Mission',
      title: missionTitle(missionsById.get(canonicalMissionId(result.missionId))),
      status: hasMissionCompletion(result) ? 'Passed' : 'Failed',
      passed: hasMissionCompletion(result),
      score: numericScore(result.score),
      timestamp: isoDate(result.completedAt ?? result.updatedAt ?? result.createdAt)
    })),
    ...currentQuizResults.map(result => ({
      id: result.id,
      studentId: result.studentId,
      studentName: studentsById.get(result.studentId)?.name || 'Student',
      type: 'Quiz',
      title: quizTitle(quizzesById.get(result.quizId)),
      status: result.passed === true ? 'Passed' : result.passed === false ? 'Failed' : 'Recorded',
      passed: result.passed === true,
      score: quizScore(result),
      timestamp: isoDate(result.completedAt ?? result.submittedAt ?? result.updatedAt ?? result.createdAt)
    }))
  ].sort((a, b) => timestamp(b.timestamp) - timestamp(a.timestamp)).slice(0, 5);

  const missionScoresUsed = currentMissionResults.map(result => numericScore(result.score));
  const quizScoresUsed = currentQuizResults.map(quizScore);
  const studentsStats = {
    total: students.length,
    active: students.filter(student => !student.status || student.status === 'active').length,
    pending: attention.pendingStudents,
    inactive: students.filter(student => student.status === 'inactive' || student.status === 'rejected').length
  };
  const instructorStats = {
    total: instructors.length,
    active: instructors.filter(instructor => !instructor.status || instructor.status === 'active').length,
    inactive: attention.inactiveInstructors
  };

  return {
    students: studentsStats,
    instructors: instructorStats,
    missions: { total: missions.length },
    quizzes: { total: quizzes.length },
    progress: {
      studentsStarted,
      missionPasses: passedMissions.length,
      quizzesTaken: currentQuizResults.length,
      quizzesPassed: passedQuizzes.length
    },
    attention,
    trainingTrend,
    recentResults,
    // Kept for older clients while the admin interface moves to the aligned names above.
    performance: {
      missions: {
        completed: currentMissionResults.length,
        passed: passedMissions.length,
        failed: currentMissionResults.length - passedMissions.length,
        averageScore: average(missionScoresUsed)
      },
      quizzes: {
        completed: currentQuizResults.length,
        passed: passedQuizzes.length,
        failed: currentQuizResults.length - passedQuizzes.length,
        averageScore: average(quizScoresUsed)
      }
    },
    missionTrend: trainingTrend.map(item => ({ date: `${item.date}T00:00:00.000Z`, completions: item.completions })),
    recentActivity: recentResults.map(result => ({
      id: `${result.type}-${result.id}`,
      type: result.type === 'Mission' ? 'mission_completed' : 'quiz_submitted',
      message: `${result.studentName} saved ${result.title} (${result.status})`,
      timestamp: result.timestamp
    }))
  };
}

async function rankSettings(db) {
  const snapshot = await db.collection('course_settings').doc('global').get();
  return { ranks: getRankConfiguration(snapshot.exists ? snapshot.data() : {}) };
}

async function catalog(db) {
  const [missions, quizzes, assignments] = await Promise.all([
    db.collection('missions').get(),
    db.collection('quiz').get(),
    db.collection('quiz_assignments').get()
  ]);
  return { missions: records(missions), quizzes: records(quizzes), assignments: records(assignments) };
}

export async function loadAdminStats(db, now = new Date()) {
  const [students, instructors, missions, quizzes, assignments, missionScores, quizScores] = await Promise.all([
    db.collection('students').get(),
    db.collection('instructor').get(),
    db.collection('missions').get(),
    db.collection('quiz').get(),
    db.collection('quiz_assignments').get(),
    db.collection('mission_score').get(),
    db.collection('quiz_score').get()
  ]);
  return buildAdminStats({
    students: records(students), instructors: records(instructors), missions: records(missions), quizzes: records(quizzes),
    assignments: records(assignments), missionScores: records(missionScores), quizScores: records(quizScores), now
  });
}

export async function loadAdminInstructors(db) {
  const [instructorSnapshot, studentSnapshot] = await Promise.all([
    db.collection('instructor').get(), db.collection('students').get()
  ]);
  const students = records(studentSnapshot);
  return records(instructorSnapshot).map(instructor => ({
    ...publicInstructor(instructor),
    studentCount: new Set(students.filter(student => owner(student) === instructor.id).map(student => student.id)).size
  })).sort((a, b) => a.name.localeCompare(b.name));
}

function normalizePage(limit, offset) {
  const parsedLimit = Number.parseInt(limit, 10);
  const parsedOffset = Number.parseInt(offset, 10);
  return {
    limit: Number.isFinite(parsedLimit) ? Math.min(100, Math.max(1, parsedLimit)) : 25,
    offset: Number.isFinite(parsedOffset) ? Math.max(0, parsedOffset) : 0
  };
}

function withInstructor(record, instructorsById) {
  const instructor = record.instructorId ? instructorsById.get(record.instructorId) : null;
  return {
    ...record,
    instructorId: record.instructorId || null,
    instructorName: instructor?.name || (record.instructorId ? 'Unknown instructor' : 'Unassigned')
  };
}

export async function loadAdminStudents(db, { status, instructorId, search, limit, offset } = {}) {
  const [studentSnapshot, instructorSnapshot, data, settings, missionScores, quizScores] = await Promise.all([
    db.collection('students').get(),
    db.collection('instructor').get(),
    catalog(db),
    rankSettings(db),
    db.collection('mission_score').get(),
    db.collection('quiz_score').get()
  ]);
  const instructors = records(instructorSnapshot);
  const instructorsById = new Map(instructors.map(instructor => [instructor.id, instructor]));
  let students = records(studentSnapshot).map(student => withInstructor(buildStudentTrainingRecord({
    student, ...data, rankSettings: settings, missionScores: records(missionScores), quizScores: records(quizScores)
  }), instructorsById));

  if (status) students = students.filter(student => student.status === status);
  if (instructorId) students = students.filter(student => student.instructorId === instructorId);
  if (search?.trim()) {
    const term = search.trim().toLocaleLowerCase();
    students = students.filter(student => [student.name, student.email, student.studentId]
      .some(value => String(value || '').toLocaleLowerCase().includes(term)));
  }
  students.sort((a, b) => a.name.localeCompare(b.name) || a.id.localeCompare(b.id));
  const page = normalizePage(limit, offset);
  const total = students.length;
  const paginated = students.slice(page.offset, page.offset + page.limit);
  return {
    students: paginated,
    pagination: { ...page, count: paginated.length, total },
    count: paginated.length,
    total,
    ...page
  };
}

export async function loadAdminStudentRecord(db, studentId) {
  const studentSnapshot = await db.collection('students').doc(studentId).get();
  if (!studentSnapshot.exists) return null;
  const student = { ...studentSnapshot.data(), id: studentSnapshot.id };
  const instructorId = owner(student);
  const [data, settings, missionScores, quizScores, instructorSnapshot] = await Promise.all([
    catalog(db),
    rankSettings(db),
    db.collection('mission_score').where('studentId', '==', studentId).get(),
    db.collection('quiz_score').where('studentId', '==', studentId).get(),
    instructorId ? db.collection('instructor').doc(instructorId).get() : Promise.resolve(null)
  ]);
  const record = buildStudentTrainingRecord({
    student, ...data, rankSettings: settings, missionScores: records(missionScores), quizScores: records(quizScores)
  });
  return {
    ...record,
    instructorId: record.instructorId || null,
    instructorName: instructorSnapshot?.exists ? (instructorSnapshot.data().name || 'Instructor')
      : instructorId ? 'Unknown instructor' : 'Unassigned'
  };
}
