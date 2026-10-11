import { beforeEach, expect, jest, test } from '@jest/globals';
import express from 'express';
import request from 'supertest';

let collections;
const reads = [];

function docs(rows) {
  return rows.map(row => ({ id: row.id, data: () => row }));
}

function query(name, filters = []) {
  return {
    doc: id => ({
      get: async () => {
        reads.push({ name, doc: id });
        const row = (collections[name] || []).find(item => item.id === id);
        return { id, exists: Boolean(row), data: () => row };
      }
    }),
    where: (field, operator, value) => query(name, [...filters, [field, operator, value]]),
    get: async () => {
      reads.push({ name, filters });
      const matches = (collections[name] || []).filter(row => filters.every(([field, operator, value]) => {
        if (operator === 'in') return value.includes(row[field]);
        return row[field] === value;
      }));
      return { docs: docs(matches), size: matches.length, empty: matches.length === 0 };
    }
  };
}

const db = { collection: name => query(name) };
jest.unstable_mockModule('../config/firebase-admin.js', () => ({ db }));
jest.unstable_mockModule('../middleware/requireAdmin.js', () => ({
  requireAdmin: (req, res, next) => { req.adminUser = { id: 'admin-test', role: 'admin' }; next(); }
}));

const { buildAdminStats } = await import('../services/adminPortal.js');
const { default: adminRoutes } = await import('../routes/admin.js');
const app = express();
app.use(express.json());
app.use('/admin', adminRoutes);

const instructors = [
  { id: 'teacher-a', name: 'Scarlet', email: 'scarlet@dnsc.edu.ph', status: 'active', password: 'private-a' },
  { id: 'teacher-b', name: 'Kevin', email: 'kevin@dnsc.edu.ph', status: 'inactive', password: 'private-b' }
];
const students = [
  { id: 'student-a', studentId: 'DNSC-001', name: 'Alpha', email: 'alpha@dnsc.edu.ph', instructorid: 'teacher-a', status: 'active', xp: 110, password: 'private-student' },
  { id: 'student-b', studentId: 'DNSC-002', name: 'Bravo', email: 'bravo@dnsc.edu.ph', instructorid: undefined, instructorId: 'teacher-a', status: 'pending', xp: 500 },
  { id: 'student-c', studentId: 'DNSC-003', name: 'Charlie', email: 'charlie@dnsc.edu.ph', status: 'active', xp: 0 }
];
const missions = [
  { id: 'custom-mission-1', mission_title: 'Harbor Start', createdBy: 'teacher-a' },
  { id: 'custom-mission-2', mission_title: 'Open Water', createdBy: 'teacher-a' },
  { id: 'custom-mission-3', mission_title: 'Return to Port', createdBy: 'teacher-a' }
];
const quizzes = [
  { id: 'quiz-1', moduleId: 'custom-mission-1', title: 'Harbor Quiz' },
  { id: 'quiz-2', moduleId: ['CUSTOM-custom-mission-2'], title: 'Open Water Quiz' }
];
const assignments = [
  { id: 'assignment-3', quizId: 'quiz-2', targetType: 'module', targetId: 'CUSTOM-custom-mission-3' }
];
const missionScores = [
  { id: 'mission-pass', studentId: 'student-a', missionId: 'CUSTOM-custom-mission-1', score: 80, passed: true, completedAt: '2026-10-06T04:00:00Z' },
  { id: 'mission-practice', studentId: 'student-a', missionId: 'custom-mission-1', score: 0, passed: false, completedAt: '2026-10-08T04:00:00Z' },
  { id: 'mission-fail', studentId: 'student-a', missionId: 'custom-mission-2', score: 40, passed: false, completedAt: '2026-10-08T02:00:00Z' },
  { id: 'mission-pass-b', studentId: 'student-b', missionId: 'custom-mission-1', score: 100, passed: true, completedAt: '2026-10-07T04:00:00Z' },
  { id: 'deleted-mission', studentId: 'student-a', missionId: 'deleted', score: 100, passed: true, completedAt: '2026-10-08T05:00:00Z' },
  { id: 'foreign-student', studentId: 'missing', missionId: 'custom-mission-1', score: 100, passed: true, completedAt: '2026-10-08T05:00:00Z' }
];
const quizScores = [
  { id: 'quiz-old', studentId: 'student-a', quizId: 'quiz-1', 'Quiz-score-percentage': 100, passed: true, completedAt: '2026-10-06T06:00:00Z' },
  { id: 'quiz-new', studentId: 'student-a', quizId: 'quiz-1', 'Quiz-score-percentage': 40, passed: false, completedAt: '2026-10-08T06:00:00Z' },
  { id: 'quiz-zero', studentId: 'student-a', quizId: 'quiz-2', 'Quiz-score-percentage': 0, passed: false, completedAt: '2026-10-08T05:00:00Z' },
  { id: 'quiz-pass-b', studentId: 'student-b', quizId: 'quiz-1', 'Quiz-score-percentage': 100, passed: true, completedAt: '2026-10-07T06:00:00Z' },
  { id: 'deleted-quiz', studentId: 'student-a', quizId: 'deleted', 'Quiz-score-percentage': 100, passed: true, completedAt: '2026-10-08T07:00:00Z' }
];

beforeEach(() => {
  reads.length = 0;
  collections = {
    students: structuredClone(students),
    instructor: structuredClone(instructors),
    missions: structuredClone(missions),
    quiz: structuredClone(quizzes),
    quiz_assignments: structuredClone(assignments),
    mission_score: structuredClone(missionScores),
    quiz_score: structuredClone(quizScores),
    course_settings: []
  };
});

test('stats use current collections, deduplicate results, retain mission passes and preserve zero quiz scores', () => {
  const stats = buildAdminStats({ students, instructors, missions, quizzes, assignments, missionScores, quizScores, now: new Date('2026-10-08T12:00:00Z') });
  expect(stats.students).toEqual({ total: 3, active: 2, pending: 1, inactive: 0 });
  expect(stats.instructors).toEqual({ total: 2, active: 1, inactive: 1 });
  expect(stats.missions.total).toBe(3);
  expect(stats.quizzes.total).toBe(2);
  expect(stats.progress).toEqual({ studentsStarted: 2, missionPasses: 2, quizzesTaken: 3, quizzesPassed: 1 });
  expect(stats.attention).toEqual({ pendingStudents: 1, inactiveInstructors: 1, unassignedStudents: 1, missionsWithoutQuiz: 0, total: 3 });
  expect(stats.trainingTrend.map(day => day.completions)).toEqual([0, 1, 1, 0, 0, 0, 0]);
  expect(stats.recentResults).toHaveLength(5);
  expect(stats.recentResults[0]).toMatchObject({ id: 'quiz-new', type: 'Quiz', status: 'Failed', score: 40 });
  expect(stats.recentResults.find(result => result.id === 'quiz-zero')).toMatchObject({ score: 0, status: 'Failed' });
  expect(stats.recentResults.find(result => result.id === 'mission-practice')).toBeUndefined();
  expect(stats.recentResults.find(result => result.id === 'deleted-quiz')).toBeUndefined();
});

test('training dates use Manila calendar days around midnight', () => {
  const stats = buildAdminStats({
    students: [{ id: 'student-night', status: 'active' }], instructors: [],
    missions: [{ id: 'mission-night', title: 'Night Watch' }], quizzes: [], assignments: [],
    missionScores: [{
      id: 'night-pass', studentId: 'student-night', missionId: 'mission-night', passed: true,
      score: 100, completedAt: '2026-10-07T17:30:00.000Z'
    }],
    quizScores: [], now: new Date('2026-10-08T01:00:00.000Z')
  });
  expect(stats.trainingTrend[3]).toEqual({ date: '2026-10-08', completions: 1 });
  expect(stats.trainingTrend.map(day => day.date)).toEqual([
    '2026-10-05', '2026-10-06', '2026-10-07', '2026-10-08', '2026-10-09', '2026-10-10', '2026-10-11'
  ]);
});

test.each([
  ['2026-10-04T12:00:00Z', '2026-09-28', '2026-10-04'],
  ['2026-10-04T16:00:00Z', '2026-10-05', '2026-10-11'],
  ['2027-01-01T01:00:00Z', '2026-12-28', '2027-01-03']
])('training week stays Monday to Sunday across boundaries at %s', (now, monday, sunday) => {
  const trend = buildAdminStats({ now: new Date(now) }).trainingTrend;
  expect(trend).toHaveLength(7);
  expect(trend[0].date).toBe(monday);
  expect(trend[6].date).toBe(sunday);
  expect(trend.map(day => new Date(`${day.date}T00:00:00Z`).getUTCDay())).toEqual([1, 2, 3, 4, 5, 6, 0]);
});

test('stats endpoint reads only the established current collections', async () => {
  const response = await request(app).get('/admin/stats').expect(200);
  expect(response.body).toMatchObject({ missions: { total: 3 }, quizzes: { total: 2 },
    progress: { missionPasses: 2, quizzesTaken: 3, quizzesPassed: 1 } });
  const collectionReads = reads.filter(read => !read.doc).map(read => read.name);
  expect(collectionReads).toEqual(expect.arrayContaining(['students', 'instructor', 'missions', 'quiz', 'quiz_assignments', 'mission_score', 'quiz_score']));
  expect(collectionReads).not.toEqual(expect.arrayContaining(['mission_attempts', 'quizzes', 'mission_scores', 'quiz_scores']));
});

test('instructors endpoint whitelists account fields and counts canonical and legacy assignments once', async () => {
  collections.students.push({ ...students[1], id: 'student-b-duplicate-shape', instructorid: 'teacher-a', instructorId: 'teacher-a' });
  const response = await request(app).get('/admin/instructors').expect(200);
  expect(response.body.instructors.find(row => row.id === 'teacher-a')).toMatchObject({ name: 'Scarlet', status: 'active', studentCount: 3 });
  expect(JSON.stringify(response.body)).not.toMatch(/password|private-a|private-b/);
  expect(response.body.instructors[0]).not.toHaveProperty('totalsessions');
});

test('instructor removal guard includes legacy instructorId assignments', async () => {
  collections.students = [{ id: 'legacy-student', instructorId: 'teacher-b' }];
  const response = await request(app).delete('/admin/instructors/teacher-b').expect(400);
  expect(response.body).toMatchObject({ studentCount: 1 });
  expect(response.body.message).toMatch(/Transfer them before removing/);
});

test('student list uses shared XP/rank and saved-result rules, supports all filters and never exposes credentials', async () => {
  const before = JSON.stringify(collections);
  const response = await request(app)
    .get('/admin/students?search=DNSC-002&status=pending&instructorId=teacher-a&limit=10&offset=0')
    .expect(200);
  expect(response.body.pagination).toEqual({ limit: 10, offset: 0, count: 1, total: 1 });
  expect(response.body.students[0]).toMatchObject({
    id: 'student-b', instructorName: 'Scarlet', xp: 500, rank: 'Ordinary Seaman (OS)',
    missionsCompleted: 1, missionsTotal: 3, quizzesCompleted: 1, quizzesTotal: 2
  });
  expect(JSON.stringify(response.body)).not.toMatch(/password|private-student|averageScore|bestScore/);
  expect(JSON.stringify(collections)).toBe(before);
});

test('student list pagination is stable and unassigned accounts stay explicit', async () => {
  const first = await request(app).get('/admin/students?limit=2&offset=0').expect(200);
  const second = await request(app).get('/admin/students?limit=2&offset=2').expect(200);
  expect(first.body.students.map(student => student.name)).toEqual(['Alpha', 'Bravo']);
  expect(second.body.students.map(student => student.name)).toEqual(['Charlie']);
  expect(second.body.students[0]).toMatchObject({ instructorId: null, instructorName: 'Unassigned', xp: 0, rank: 'Deck Cadet' });
  expect(first.body.total).toBe(3);
  expect(second.body.pagination.total).toBe(3);
});

test('fresh admin training record matches list semantics and excludes raw account fields', async () => {
  const response = await request(app).get('/admin/students/student-a/training-record').expect(200);
  expect(response.body.student).toMatchObject({
    id: 'student-a', instructorName: 'Scarlet', xp: 110, rank: 'Deck Cadet',
    missionsCompleted: 1, missionsFailed: 1, quizzesCompleted: 2, quizzesPassed: 0,
    missionScore: 60, quizScore: 20
  });
  expect(response.body.student.missionsDetail).toHaveLength(3);
  expect(response.body.student.quizzesDetail).toHaveLength(2);
  expect(JSON.stringify(response.body)).not.toMatch(/password|private-student|averageScore|bestScore/);
  await request(app).get('/admin/students/missing/training-record').expect(404);
});
