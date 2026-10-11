import { jest, test, expect } from '@jest/globals';
import express from 'express';
import request from 'supertest';
import { buildInstructorOverview } from '../services/instructorOverview.js';
import { issueSession } from '../services/authSession.js';

const students = [
  { id: 's1', name: 'One', instructorid: 'teacher', status: 'active' },
  { id: 's2', name: 'Two', instructorid: 'teacher', status: 'active' },
  { id: 's3', name: 'Three', instructorId: 'teacher', status: 'active' },
  { id: 'pending', instructorid: 'teacher', status: 'pending' },
  { id: 'inactive', instructorid: 'teacher', status: 'inactive' },
  { id: 'other', instructorid: 'another-teacher', status: 'active' }
];
const missions = [{ id: 'm1', mission_title: 'First Mission', createdBy: 'teacher' }, { id: 'm2', title: 'Second Mission', instructorId: 'teacher' }];
const scores = [
  { id: 'old', studentId: 's1', missionId: 'CUSTOM-m1', score: 20, passed: false, completedAt: '2026-10-01' },
  { id: 'pass', studentId: 's1', missionId: 'CUSTOM-m1', score: 80, passed: true, completedAt: '2026-10-02' },
  { id: 'later-fail', studentId: 's1', missionId: 'm1', score: 10, passed: false, completedAt: '2026-10-03' },
  { id: 'fail-old', studentId: 's2', missionId: 'm2', score: 10, passed: false, completedAt: '2026-10-01' },
  { id: 'fail-new', studentId: 's2', missionId: 'm2', score: 60, passed: false, completedAt: '2026-10-04' },
  { id: 'foreign', studentId: 'other', missionId: 'm1', score: 100, passed: true },
  { id: 'pending-score', studentId: 'pending', missionId: 'm1', score: 100, passed: true },
  { id: 'deleted', studentId: 's1', missionId: 'deleted-mission', score: 100, passed: true }
];
const makeOverview = patch => buildInstructorOverview({ instructorId: 'teacher', students, missions, missionScores: scores, ...patch });

test('class completion and per-mission progress share the same deduplicated saved results', () => {
  const data = makeOverview();
  expect(data.totalStudents).toBe(3);
  expect(data.studentsPassed).toBe(1);
  expect(data.studentsNeedingRetry).toBe(1);
  expect(data.completed).toBe(1);
  expect(data.totalPossibleCompletions).toBe(6);
  expect(data.completionRate).toBe(17);
  expect(data.missionProgress[0]).toMatchObject({ id: 'm1', passed: 1, total: 3, percentage: 33 });
  expect(data.missionProgress[1].percentage).toBe(0);
  expect(data.missionProgress.reduce((sum, mission) => sum + mission.passed, 0)).toBe(data.completed);
});

test('attention shows latest failed missions first, then students with no attempts', () => {
  const data = makeOverview();
  expect(data.attention).toEqual([
    { id: 's2', name: 'Two', failedMissions: 1, status: 'retry' },
    { id: 's3', name: 'Three', failedMissions: 0, status: 'not_started' }
  ]);
  expect(data.recentResults[0]).toMatchObject({ id: 'fail-new', score: 60, passed: false });
  expect(data.recentResults.find(result => result.id === 'pass')).toBeDefined();
  expect(data.recentResults.find(result => result.id === 'later-fail')).toBeUndefined();
});

test('passing a failed retry removes attention and updates all completion counts', () => {
  const data = makeOverview({ missionScores: [...scores,
    { id: 'retry-pass', studentId: 's2', missionId: 'm2', score: 90, passed: true, completedAt: '2026-10-05' }] });
  expect(data.studentsPassed).toBe(2);
  expect(data.studentsNeedingRetry).toBe(0);
  expect(data.completed).toBe(2);
  expect(data.completionRate).toBe(33);
  expect(data.attention.map(student => student.id)).toEqual(['s3']);
});

test('quiz results use the latest saved quiz score and do not affect mission completion', () => {
  const data = makeOverview({ quizScores: [
    { id: 'q-old', studentId: 's1', quizId: 'quiz', 'Quiz-score-percentage': 0, completedAt: '2026-10-03' },
    { id: 'q-new', studentId: 's1', quizId: 'quiz', 'Quiz-score-percentage': 100, passed: true, completedAt: '2026-10-05' },
    { id: 'q-other', studentId: 'other', quizId: 'quiz', passed: true, completedAt: '2026-10-06' }
  ] });
  expect(data.recentResults[0]).toMatchObject({ id: 'q-new', type: 'Quiz', score: 100, passed: true });
  expect(data.recentResults.filter(result => result.type === 'Quiz')).toHaveLength(1);
  expect(data.completed).toBe(1);
});

test('empty classes/missions show zero progress and no invented denominator', () => {
  const empty = makeOverview({ students: [] });
  expect(empty.totalPossibleCompletions).toBe(0);
  expect(empty.completionRate).toBe(0);
  expect(empty.attention).toEqual([]);
  const noMissions = makeOverview({ missions: [] });
  expect(noMissions.completed).toBe(0);
  expect(noMissions.attention).toEqual([]);
});

test('explicitly owned missions from another instructor are excluded', () => {
  const data = makeOverview({ missions: [...missions, { id: 'foreign-mission', instructorId: 'another-teacher' },
    { id: 'legacy-foreign', createdBy: 'another-teacher' }, { id: 'unowned' }] });
  expect(data.missionProgress.map(mission => mission.id)).toEqual(['m1', 'm2']);
});

test('real custom-mission IDs retain their lowercase prefix when matching synthetic results', () => {
  const data = makeOverview({ missions: [{ id: 'custom-mission-123', title: 'Custom Mission', createdBy: 'teacher' }],
    missionScores: [{ id: 'result', studentId: 's1', missionId: 'CUSTOM-custom-mission-123', score: 80, passed: true }] });
  expect(data.completed).toBe(1);
  expect(data.missionProgress[0].passed).toBe(1);
  expect(data.studentsPassed).toBe(1);
});

const collections = {
  instructor: [{ id: 'teacher', name: 'Instructor' }], students, missions,
  mission_score: scores, quiz_score: []
};
function query(name, filters = []) {
  return {
    doc: id => ({ get: async () => ({ id, exists: (collections[name] || []).some(row => row.id === id), data: () => (collections[name] || []).find(row => row.id === id) }) }),
    where: (field, operator, value) => query(name, [...filters, [field, operator, value]]),
    get: async () => ({ docs: collections[name].filter(row => filters.every(([field, operator, value]) =>
      operator === 'in' ? value.includes(row[field]) : row[field] === value)).map(row => ({ id: row.id, data: () => row })) })
  };
}
jest.unstable_mockModule('../config/firebase-admin.js', () => ({ db: { collection: name => query(name) } }));
const { default: routes } = await import('../routes/instructors.js');
const app = express();
app.use('/instructors', routes);

test('actual overview endpoint reads Firestore schema aliases and returns a class-scoped summary', async () => {
  const response = await request(app).get('/instructors/teacher/overview').set('Authorization', `Bearer ${issueSession('teacher', 'instructor')}`).expect(200);
  expect(response.body).toEqual(makeOverview());
  expect(response.body).not.toHaveProperty('students');
});

test('unknown instructor returns 404', async () => {
  await request(app).get('/instructors/missing/overview').set('Authorization', `Bearer ${issueSession('teacher', 'instructor')}`).expect(404);
});
