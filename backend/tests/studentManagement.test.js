import { jest, test, expect, beforeEach } from '@jest/globals';
import express from 'express';
import request from 'supertest';
import { DEFAULT_RANKS } from '../../shared/progression.js';
import { issueSession } from '../services/authSession.js';

const student = { id: 'student', studentId: 'S-001', name: 'One', email: 'one@dnsc.edu.ph', instructorid: 'teacher', status: 'active', xp: 110,
  rank: 'Captain', completed: 0, averageScore: 48, bestScore: 100, password: 'private-hash', badges: [{ id: 'welcome-aboard' }, { id: 'welcome-aboard' }], certificates: 0 };
const missions = [1, 2, 3].map(id => ({ id: `custom-mission-${id}`, mission_title: `Mission ${id}`, createdBy: 'teacher' }));
const quizzes = missions.map((mission, index) => ({ id: `q${index + 1}`, moduleId: mission.id, title: `Quiz ${index + 1}` }));
const missionScores = [80, 40, 100].map((score, index) => ({ id: `m${index}`, studentId: 'student', missionId: `CUSTOM-${missions[index].id}`, score, passed: true, completedAt: '2026-10-06T13:00:00Z' }));
const quizScores = [0, 100, 100].map((score, index) => ({ id: `r${index}`, studentId: 'student', quizId: quizzes[index].id, 'Quiz-score-percentage': score, 'raw-score': score / 100, totalQuestions: 1, passed: score === 100, completedAt: '2026-10-06T13:30:00Z' }));
const build = patch => buildStudentTrainingRecord({ student, missions, quizzes, missionScores, quizScores, ...patch });

test('actual schema produces 3/3 missions, 3/3 quizzes, 110 XP and the shared Deck Cadet rank', () => {
  const record = build();
  expect(record).toMatchObject({ missionsCompleted: 3, missionsTotal: 3, quizzesCompleted: 3, quizzesTotal: 3, quizzesPassed: 2,
    xp: 110, rank: 'Deck Cadet', rankId: 'deck_cadet', xpNextAt: 500, xpProgress: 22, missionScore: 73, quizScore: 67, badgesEarned: 1, certificates: 0 });
  expect(record.missionsDetail.map(mission => mission.status)).toEqual(['Passed', 'Passed', 'Passed']);
  expect(record.quizzesDetail[0]).toMatchObject({ score: 0, correctCount: 0, totalQuestions: 1, status: 'Failed' });
  expect(record.latestActivity).toBe('2026-10-06T13:30:00.000Z');
  expect(record).not.toHaveProperty('password');
  expect(record).not.toHaveProperty('bestScore');
});

test('duplicate mission results retain an earned pass; quiz duplicates use the latest retry including zero', () => {
  const record = build({ missionScores: [...missionScores, { ...missionScores[0], id: 'practice', passed: false, score: 0, completedAt: '2026-10-07' }],
    quizScores: [{ ...quizScores[0], id: 'older-pass', 'Quiz-score-percentage': 100, passed: true, completedAt: '2026-10-01' }, ...quizScores] });
  expect(record.missionsCompleted).toBe(3);
  expect(record.missionsDetail[0].score).toBe(80);
  expect(record.quizzesCompleted).toBe(3);
  expect(record.quizzesDetail[0].score).toBe(0);
  expect(record.quizScore).toBe(67);
});

test('failed zero-reward legacy flags do not count as a pass, and missing scores remain null', () => {
  const record = build({ missionScores: [{ ...missionScores[0], passed: false, score: 0, xpAwarded: true, xpAmount: 0 }], quizScores: [] });
  expect(record.missionsCompleted).toBe(0);
  expect(record.missionsFailed).toBe(1);
  expect(record.missionScore).toBe(0);
  expect(record.missionsDetail[1].score).toBeNull();
  expect(record.quizScore).toBeNull();
  expect(record.quizzesCompleted).toBe(0);
});

test('foreign/deleted missions, unassigned quizzes and other students do not contaminate the record', () => {
  const record = build({ missions: [...missions, { id: 'foreign', instructorId: 'other-teacher' }], quizzes: [...quizzes, { id: 'unassigned' }, { id: 'foreign-quiz', moduleId: missions[0].id, instructorid: 'other-teacher' }],
    missionScores: [...missionScores, { studentId: 'other-student', missionId: missions[0].id, score: 1, passed: false }, { studentId: 'student', missionId: 'deleted', score: 1, passed: true }],
    quizScores: [...quizScores, { studentId: 'student', quizId: 'unassigned', score: 1 }, { studentId: 'other-student', quizId: 'q1', score: 100 }] });
  expect(record.missionsTotal).toBe(3);
  expect(record.quizzesTotal).toBe(3);
  expect(record.missionScore).toBe(73);
  expect(record.quizScore).toBe(67);
});

test('legacy array/assignment links and Firestore timestamps are supported without changing raw documents', () => {
  const timestamp = { toDate: () => new Date('2026-10-07T01:00:00Z') };
  const record = build({ quizzes: [{ ...quizzes[0], moduleId: [missions[0].id] }, { id: 'q2', title: 'Assigned quiz' }],
    assignments: [{ quizId: 'q2', targetType: 'module', targetId: `CUSTOM-${missions[1].id}` }], quizScores: [{ ...quizScores[0], completedAt: timestamp }, quizScores[1]] });
  expect(record.quizzesTotal).toBe(2);
  expect(record.quizzesCompleted).toBe(2);
  expect(record.quizzesDetail[0].submittedAt).toBe('2026-10-07T01:00:00.000Z');
  expect(student.rank).toBe('Captain');
  expect(student.badges).toHaveLength(2);
});

test('rank settings and zero XP are shared with the rest of the system', () => {
  const rankSettings = { ranks: DEFAULT_RANKS.map(rank => ({ ...rank, minXp: rank.minXp / 5 })) };
  expect(build({ rankSettings }).rankId).toBe('ordinary_seaman');
  expect(build({ student: { ...student, xp: 0, total_xp: 110 } }).xp).toBe(0);
  expect(build({ missions: [], quizzes: [], missionScores: [], quizScores: [] })).toMatchObject({ missionsTotal: 0, quizzesTotal: 0, missionScore: null, quizScore: null, latestActivity: null });
});

let collections;
const reads = [];
function query(name, filters = []) {
  return {
    doc: id => ({ get: async () => { const row = (collections[name] || []).find(row => row.id === id); return { id, exists: !!row, data: () => row }; } }),
    where: (field, operator, value) => query(name, [...filters, [field, operator, value]]),
    get: async () => {
      reads.push({ name, filters });
      return { docs: (collections[name] || []).filter(row => filters.every(([field, operator, value]) => operator === 'in' ? value.includes(row[field]) : row[field] === value)).map(row => ({ id: row.id, data: () => row })) };
    }
  };
}
jest.unstable_mockModule('../config/firebase-admin.js', () => ({ db: { collection: name => query(name) } }));
const { buildStudentTrainingRecord } = await import('../services/studentTrainingRecords.js');
const { default: instructorsRoutes } = await import('../routes/instructors.js');
const { default: studentsRoutes } = await import('../routes/students.js');
const app = express();
app.use('/instructors', instructorsRoutes);
app.use('/students', studentsRoutes);
beforeEach(() => {
  reads.length = 0;
  collections = { instructor: [{ id: 'teacher' }], students: [student,
    { ...student, id: 'legacy', studentId: 'S-001', name: 'Legacy', instructorid: undefined, instructorId: 'teacher', xp: 0, status: 'inactive' },
    { ...student, id: 'pending', status: 'pending' }, { ...student, id: 'foreign', instructorid: 'another-teacher' }],
    missions, quiz: quizzes, quiz_assignments: [], mission_score: missionScores, quiz_score: quizScores, course_settings: [] };
});

test('class endpoint returns only assigned accounts with canonical document IDs and no credentials', async () => {
  const before = JSON.stringify(collections);
  const response = await request(app).get('/instructors/teacher/student-management').set('Authorization', `Bearer ${issueSession('teacher', 'instructor')}`).expect(200);
  expect(response.body.students.map(row => row.id).sort()).toEqual(['legacy', 'pending', 'student']);
  expect(response.body.students.find(row => row.id === 'student')).toMatchObject({ missionsCompleted: 3, quizzesCompleted: 3, xp: 110 });
  expect(response.body.students.find(row => row.id === 'legacy').missionsCompleted).toBe(0);
  expect(JSON.stringify(response.body)).not.toMatch(/password|private-hash/);
  expect(JSON.stringify(collections)).toBe(before);
  expect(reads.every(read => !['training_modules', 'mission_scores', 'quizzes', 'quiz_scores'].includes(read.name))).toBe(true);
});

test('Review and compatibility endpoints return the same result counts, scores and details', async () => {
  const detail = await request(app).get('/instructors/teacher/students/student/training-record').set('Authorization', `Bearer ${issueSession('teacher', 'instructor')}`).expect(200);
  expect(detail.body.student).toEqual(build());
  const summary = await request(app).get('/students/student/training-summary').set('Authorization', `Bearer ${issueSession('teacher', 'instructor')}`).expect(200);
  expect(summary.body.missions).toEqual({ completed: 3, total: 3, avgScore: 73 });
  expect(summary.body.quizzes).toEqual({ completed: 3, total: 3, avgScore: 67 });
  expect((await request(app).get('/students/student/missions-detail').set('Authorization', `Bearer ${issueSession('teacher', 'instructor')}`).expect(200)).body.missions).toEqual(build().missionsDetail);
  expect((await request(app).get('/students/student/quizzes-detail').set('Authorization', `Bearer ${issueSession('teacher', 'instructor')}`).expect(200)).body.quizzes).toEqual(build().quizzesDetail);
});

test('unknown instructor, student and another class student return 404', async () => {
  await request(app).get('/instructors/missing/student-management').set('Authorization', `Bearer ${issueSession('teacher', 'instructor')}`).expect(404);
  await request(app).get('/instructors/teacher/students/missing/training-record').set('Authorization', `Bearer ${issueSession('teacher', 'instructor')}`).expect(404);
  await request(app).get('/instructors/teacher/students/foreign/training-record').set('Authorization', `Bearer ${issueSession('teacher', 'instructor')}`).expect(404);
  await request(app).get('/students/missing/training-summary').set('Authorization', `Bearer ${issueSession('teacher', 'instructor')}`).expect(404);
});

test('large classes batch score reads in groups of at most ten, including legacy instructorId accounts', async () => {
  collections.students = Array.from({ length: 23 }, (_, index) => ({ ...student, id: `student-${index}`, instructorid: index % 2 ? undefined : 'teacher', instructorId: 'teacher' }));
  const response = await request(app).get('/instructors/teacher/student-management').set('Authorization', `Bearer ${issueSession('teacher', 'instructor')}`).expect(200);
  expect(response.body.students).toHaveLength(23);
  const scoreReads = reads.filter(read => ['mission_score', 'quiz_score'].includes(read.name));
  expect(scoreReads).toHaveLength(6);
  expect(scoreReads.every(read => read.filters[0][2].length <= 10)).toBe(true);
});
