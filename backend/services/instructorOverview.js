import { canonicalMissionId as normalizeMissionId, hasMissionCompletion } from './missionRewards.js';
import { canViewMission } from '../../shared/missionAccess.js';
const time = value => value?.toMillis?.() || new Date(value?.toDate?.() ?? value).getTime() || 0;
const percentage = (passed, total) => total ? Math.round(passed / total * 100) : 0;

function uniqueResults(results, key, preservePass = false) {
  const records = new Map();
  for (const result of results) {
    const identity = key(result);
    if (!identity) continue;
    const previous = records.get(identity);
    const earned = entry => preservePass ? hasMissionCompletion(entry) : entry.passed === true;
    if (!previous || (preservePass && earned(result) && !earned(previous)) ||
      ((!preservePass || earned(result) === earned(previous)) && time(result.completedAt) > time(previous.completedAt))) {
      records.set(identity, result);
    }
  }
  return [...records.values()];
}

export function buildInstructorOverview({ instructorId, students = [], missions = [], missionScores = [], quizScores = [] }) {
  const classStudents = students.filter(student =>
    (student.instructorid ?? student.instructorId) === instructorId && (!student.status || student.status === 'active'));
  const studentsById = new Map(classStudents.map(student => [student.id, student]));
  const classMissions = missions.filter(mission => canViewMission(mission, { id: instructorId, role: 'instructor' }));
  const missionsById = new Map(classMissions.map(mission => [normalizeMissionId(mission.id), mission]));
  const results = uniqueResults(missionScores.filter(result =>
    studentsById.has(result.studentId) && missionsById.has(normalizeMissionId(result.missionId))),
  result => JSON.stringify([result.studentId, normalizeMissionId(result.missionId)]), true);
  const isPassed = hasMissionCompletion;
  const completed = results.filter(isPassed);
  const studentsPassed = new Set(completed.map(result => result.studentId));
  const retryCounts = new Map();
  for (const result of results.filter(result => !isPassed(result))) {
    retryCounts.set(result.studentId, (retryCounts.get(result.studentId) || 0) + 1);
  }
  const attemptedStudents = new Set(results.map(result => result.studentId));
  const totalPossibleCompletions = classStudents.length * classMissions.length;
  const missionProgress = classMissions.map(mission => {
    const passed = completed.filter(result => normalizeMissionId(result.missionId) === normalizeMissionId(mission.id)).length;
    return { id: mission.id, name: mission.mission_title || mission.title || 'Untitled Mission',
      passed, total: classStudents.length, percentage: percentage(passed, classStudents.length) };
  });
  const attention = classStudents.filter(student =>
    retryCounts.has(student.id) || (classMissions.length && !attemptedStudents.has(student.id)))
    .map(student => ({ id: student.id, name: student.name || 'Student',
      failedMissions: retryCounts.get(student.id) || 0,
      status: retryCounts.has(student.id) ? 'retry' : 'not_started' }))
    .sort((a, b) => b.failedMissions - a.failedMissions || a.name.localeCompare(b.name));
  const quizzes = uniqueResults(quizScores.filter(result => studentsById.has(result.studentId)),
    result => result.quizId ? JSON.stringify([result.studentId, result.quizId]) : null);
  const recentResults = [
    ...results.map(result => ({ ...result, type: 'Mission',
      title: missionsById.get(normalizeMissionId(result.missionId)).mission_title ||
        missionsById.get(normalizeMissionId(result.missionId)).title || 'Mission', passed: isPassed(result) })),
    ...quizzes.map(result => ({ ...result, type: 'Quiz', title: result.quizTitle || 'Quiz',
      score: result['Quiz-score-percentage'] ?? result.score ?? 0 }))
  ].sort((a, b) => time(b.completedAt) - time(a.completedAt)).slice(0, 5).map(result => ({
    id: result.id, studentName: studentsById.get(result.studentId).name || 'Student',
    type: result.type, title: result.title, score: Number(result.score) || 0,
    passed: result.passed === true,
    completedAt: time(result.completedAt) ? new Date(time(result.completedAt)).toISOString() : null
  }));
  return {
    totalStudents: classStudents.length, studentsPassed: studentsPassed.size,
    studentsNeedingRetry: retryCounts.size, completed: completed.length,
    totalPossibleCompletions, completionRate: percentage(completed.length, totalPossibleCompletions),
    missionProgress, attention: attention.slice(0, 5), attentionTotal: attention.length, recentResults
  };
}

export async function loadInstructorOverview(db, instructorId) {
  const instructor = await db.collection('instructor').doc(instructorId).get();
  if (!instructor.exists) return null;
  const [canonical, legacy, missionSnapshot] = await Promise.all([
    db.collection('students').where('instructorid', '==', instructorId).get(),
    db.collection('students').where('instructorId', '==', instructorId).get(),
    db.collection('missions').get()
  ]);
  const students = [...new Map([...canonical.docs, ...legacy.docs].map(doc => [doc.id, { ...doc.data(), id: doc.id }])).values()];
  const activeIds = students.filter(student => !student.status || student.status === 'active').map(student => student.id);
  const batches = [];
  for (let index = 0; index < activeIds.length; index += 10) {
    const ids = activeIds.slice(index, index + 10);
    batches.push(Promise.all([
      db.collection('mission_score').where('studentId', 'in', ids).get(),
      db.collection('quiz_score').where('studentId', 'in', ids).get()
    ]));
  }
  const scores = await Promise.all(batches);
  return buildInstructorOverview({ instructorId, students,
    missions: missionSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })),
    missionScores: scores.flatMap(([snapshot]) => snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }))),
    quizScores: scores.flatMap(([, snapshot]) => snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })))
  });
}
