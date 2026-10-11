import { deriveProgression, studentTotalXp, studentProgressionFields } from '../../shared/progression.js';
import { canonicalMissionId, hasMissionCompletion } from './missionRewards.js';
import { loadRankSettings } from './progression.js';
import { canViewMission } from '../../shared/missionAccess.js';

const number = value => value === null || value === undefined || value === '' || !Number.isFinite(Number(value)) ? null : Number(value);
const time = value => value == null ? 0 : value?.toMillis?.() || new Date(value?.toDate?.() ?? value).getTime() || 0;
const date = value => time(value) ? new Date(time(value)).toISOString() : null;
const resultTime = result => time(result.completedAt ?? result.submittedAt ?? result.updatedAt ?? result.createdAt);
const owner = record => record.instructorid ?? record.instructorId;
const average = values => {
  const scores = values.filter(value => value !== null);
  return scores.length ? Math.round(scores.reduce((sum, value) => sum + value, 0) / scores.length) : null;
};
function latestResults(records, identity, preservePass = false) {
  const selected = new Map();
  for (const record of records) {
    const id = identity(record);
    if (!id) continue;
    const previous = selected.get(id);
    const passed = preservePass && hasMissionCompletion(record);
    const wasPassed = previous && preservePass && hasMissionCompletion(previous);
    if (!previous || (passed && !wasPassed) || (passed === wasPassed && resultTime(record) > resultTime(previous))) selected.set(id, record);
  }
  return selected;
}

// One read-only projection for the student list, Review, CSV, and legacy detail APIs.
export function buildStudentTrainingRecord({ student, missions = [], quizzes = [], assignments = [], missionScores = [], quizScores = [], rankSettings = {} }) {
  const instructorId = owner(student);
  const classMissions = missions.filter(mission => canViewMission(mission, { ...student, role: 'student' }));
  const missionIds = new Set(classMissions.map(mission => canonicalMissionId(mission.id)));
  const linked = value => (Array.isArray(value) ? value : [value]).some(id => id && missionIds.has(canonicalMissionId(id)));
  const assignedQuizIds = new Set(assignments.filter(assignment => assignment.targetType === 'module' && linked(assignment.targetId)).map(assignment => assignment.quizId));
  const classQuizzes = quizzes.filter(quiz => (!owner(quiz) || owner(quiz) === instructorId) &&
    (linked(quiz.moduleId) || linked(quiz.missionId) || assignedQuizIds.has(quiz.id)));
  const missionResults = latestResults(missionScores.filter(result => result.studentId === student.id), result => canonicalMissionId(result.missionId), true);
  const quizResults = latestResults(quizScores.filter(result => result.studentId === student.id), result => result.quizId);
  const missionsDetail = classMissions.map(mission => {
    const result = missionResults.get(canonicalMissionId(mission.id));
    return { missionId: mission.id, title: mission.mission_title || mission.title || 'Mission',
      score: result ? number(result.score) : null, status: result ? (hasMissionCompletion(result) ? 'Passed' : 'Failed') : 'Not Started',
      completedAt: result ? date(result.completedAt ?? result.createdAt) : null };
  });
  const quizzesDetail = classQuizzes.map(quiz => {
    const result = quizResults.get(quiz.id);
    return { quizId: quiz.id, title: quiz.title || 'Quiz',
      score: result ? number(result['Quiz-score-percentage'] ?? result.score) : null,
      correctCount: result ? number(result['raw-score'] ?? result.correctCount ?? result.correctAnswers) : null,
      totalQuestions: result ? number(result.totalQuestions) : null,
      status: !result ? 'Not Started' : result.passed === true ? 'Passed' : result.passed === false ? 'Failed' : 'Recorded',
      submittedAt: result ? date(result.completedAt ?? result.submittedAt ?? result.createdAt) : null };
  });
  const progression = deriveProgression(studentTotalXp(student), rankSettings);
  const fields = studentProgressionFields(student, rankSettings);
  const latestActivity = [...missionsDetail.map(record => record.completedAt), ...quizzesDetail.map(record => record.submittedAt)].filter(Boolean).sort().at(-1) || null;
  return {
    id: student.id, studentId: student.studentId || student.studentid || '', name: student.name || 'Student', email: student.email || '',
    instructorId, status: student.status || 'active', xp: progression.xp, rank: progression.rank.name, rankId: progression.rank.id,
    xpProgress: progression.xpProgress.percent, xpNextAt: progression.xpProgress.nextAt, nextRank: progression.nextRank?.name || null,
    badgesEarned: fields.badgesEarned,
    certificates: Array.isArray(student.certificates) ? new Set(student.certificates.map(certificate => certificate.id)).size : Math.max(0, number(student.certificates) ?? 0),
    missionsCompleted: missionsDetail.filter(mission => mission.status === 'Passed').length, missionsTotal: missionsDetail.length,
    missionsFailed: missionsDetail.filter(mission => mission.status === 'Failed').length,
    quizzesCompleted: quizzesDetail.filter(quiz => quiz.status !== 'Not Started').length, quizzesTotal: quizzesDetail.length,
    quizzesPassed: quizzesDetail.filter(quiz => quiz.status === 'Passed').length,
    missionScore: average(missionsDetail.map(mission => mission.score)), quizScore: average(quizzesDetail.map(quiz => quiz.score)),
    latestActivity, createdAt: date(student.createdAt), missionsDetail, quizzesDetail
  };
}

const records = snapshot => snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
async function catalog(db) {
  const [missions, quizzes, assignments] = await Promise.all([
    db.collection('missions').get(), db.collection('quiz').get(), db.collection('quiz_assignments').get()
  ]);
  return { missions: records(missions), quizzes: records(quizzes), assignments: records(assignments) };
}
export async function loadStudentTrainingRecord(db, studentId, instructorId) {
  const snapshot = await db.collection('students').doc(studentId).get();
  if (!snapshot.exists) return null;
  const student = { ...snapshot.data(), id: snapshot.id };
  if (instructorId && owner(student) !== instructorId) return null;
  const [data, rankSettings, missionScores, quizScores] = await Promise.all([
    catalog(db), loadRankSettings(), db.collection('mission_score').where('studentId', '==', studentId).get(),
    db.collection('quiz_score').where('studentId', '==', studentId).get()
  ]);
  return buildStudentTrainingRecord({ student, ...data, rankSettings, missionScores: records(missionScores), quizScores: records(quizScores) });
}
export async function loadInstructorStudentManagement(db, instructorId) {
  const instructor = await db.collection('instructor').doc(instructorId).get();
  if (!instructor.exists) return null;
  const [canonical, legacy, data, rankSettings] = await Promise.all([
    db.collection('students').where('instructorid', '==', instructorId).get(),
    db.collection('students').where('instructorId', '==', instructorId).get(), catalog(db), loadRankSettings()
  ]);
  const students = [...new Map([...records(canonical), ...records(legacy)].map(student => [student.id, student])).values()]
    .filter(student => owner(student) === instructorId);
  const batches = [];
  for (let index = 0; index < students.length; index += 10) {
    const ids = students.slice(index, index + 10).map(student => student.id);
    batches.push(Promise.all([
      db.collection('mission_score').where('studentId', 'in', ids).get(), db.collection('quiz_score').where('studentId', 'in', ids).get()
    ]));
  }
  const scores = await Promise.all(batches);
  const missionScores = scores.flatMap(([snapshot]) => records(snapshot));
  const quizScores = scores.flatMap(([, snapshot]) => records(snapshot));
  return { students: students.map(student => buildStudentTrainingRecord({ student, ...data, rankSettings, missionScores, quizScores }))
    .sort((a, b) => a.name.localeCompare(b.name)), rankSettings };
}
