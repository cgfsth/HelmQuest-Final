import { jest, test, expect, beforeEach } from '@jest/globals';
import express from 'express';
import request from 'supertest';
import bcrypt from 'bcrypt';

// In-memory Firestore adapter: run the actual backend routes/services without live writes.
const collections = new Map();
let updates = [];
let nextId = 0;
let transactionTail = Promise.resolve();
let failNextCommit = false;
function bucket(name) {
  if (!collections.has(name)) collections.set(name, new Map());
  return collections.get(name);
}
function reference(name, id) {
  return {
    id,
    collectionName: name,
    async get() {
      const data = bucket(name).get(id);
      return { id, ref: reference(name, id), exists: data !== undefined, data: () => structuredClone(data) };
    },
    async update(patch) {
      updates.push({ name, id, patch: structuredClone(patch) });
      bucket(name).set(id, { ...bucket(name).get(id), ...structuredClone(patch) });
    }
  };
}
function query(name, filters = [], maximum = Infinity) {
  return {
    doc: id => reference(name, id),
    where: (key, operator, value) => query(name, [...filters, [key, operator, value]], maximum),
    limit: count => query(name, filters, count),
    async get() {
      const docs = [];
      for (const [id, data] of bucket(name)) {
        if (filters.every(([key, operator, value]) => operator === 'in' ? value.includes(data[key]) : data[key] === value) && docs.length < maximum) docs.push(await reference(name, id).get());
      }
      return { docs, empty: !docs.length, size: docs.length };
    },
    async add(data) {
      const id = `new-${++nextId}`;
      bucket(name).set(id, structuredClone(data));
      return reference(name, id);
    }
  };
}
const db = {
  collection: name => query(name),
  runTransaction(callback) {
    // Model Firestore's serializable transactions, including atomic commit failure.
    const operation = transactionTail.then(async () => {
      const pending = [];
      const result = await callback({
        get: ref => ref.get(),
        update: (ref, patch) => pending.push([ref, patch]),
        set: (ref, patch) => pending.push([ref, patch])
      });
      if (failNextCommit) { failNextCommit = false; throw new Error('Simulated commit failure'); }
      for (const [ref, patch] of pending) await ref.update(patch);
      return result;
    });
    transactionTail = operation.catch(() => {});
    return operation;
  }
};
jest.unstable_mockModule('../config/firebase-admin.js', () => ({ db }));
const { default: studentsRoutes } = await import('../routes/students.js');
const { default: missionScoresRoutes } = await import('../routes/mission_scores.js');
const { default: quizScoresRoutes } = await import('../routes/quiz_scores.js');
const { default: quizzesRoutes } = await import('../routes/quizzes.js');
const { reconcileStudentMissionXp } = await import('../services/reconcileMissionXp.js');
const app = express();
app.use(express.json());
app.use('/students', studentsRoutes);
app.use('/mission-scores', missionScoresRoutes);
app.use('/quiz-scores', quizScoresRoutes);
app.use('/quizzes', quizzesRoutes);

beforeEach(() => {
  collections.clear();
  updates = [];
  failNextCommit = false;
  bucket('students').set('student', { xp: 0, rank: 'Deck Hand', name: 'Preserve', unrelated: { value: true } });
  bucket('missions').set('mission', { xp_reward: 500 });
});

const missionPayload = (score, passed, completedAt = '2026-10-06T00:00:00Z') => ({
  studentId: 'student', missionId: 'mission', score, passed, completedAt
});
const quizPayload = (score = 50, completedAt = '2026-10-06T00:00:00Z') => ({
  studentId: 'student', missionId: 'mission', moduleId: 'module', quizId: 'quiz',
  'Quiz-score-percentage': score, 'raw-score': score / 10, totalQuestions: 10,
  passed: score >= 70, completedAt
});

test('student quiz history reads without a compound index and includes legacy dates and zero scores', async () => {
  bucket('quiz_score').set('old', { studentId: 'student', quizId: 'quiz', submittedAt: '2026-10-01T00:00:00Z', 'Quiz-score-percentage': 0, 'raw-score': 0 });
  bucket('quiz_score').set('new', { ...quizPayload(100), quizTitle: 'Saved quiz' });
  bucket('quiz_score').set('created-only', { studentId: 'student', createdAt: new Date('2026-10-03T00:00:00Z') });
  bucket('quiz_score').set('undated', { studentId: 'student', quizId: 'another-quiz' });
  bucket('quiz_score').set('other-student', { ...quizPayload(), studentId: 'other-student' });
  const before = structuredClone([...bucket('quiz_score')]);
  const response = await request(app).get('/quiz-scores/student').expect(200);
  expect(response.body.count).toBe(4);
  expect(response.body.scores.map(score => score.id)).toEqual(['new', 'created-only', 'old', 'undated']);
  expect(response.body.scores[0].submittedAt).toBe('2026-10-06T00:00:00.000Z');
  expect(response.body.scores[1].submittedAt).toBe('2026-10-03T00:00:00.000Z');
  expect(response.body.scores[2]['Quiz-score-percentage']).toBe(0);
  expect(response.body.scores[2]['raw-score']).toBe(0);
  expect(response.body.scores[3].submittedAt).toBeNull();
  expect([...bucket('quiz_score')]).toEqual(before);
  expect(updates).toHaveLength(0);
});

test('student quiz history serializes Firestore timestamps for the displayed date', async () => {
  const where = jest.fn();
  const timestamp = { toDate: () => new Date('2026-10-06T13:49:23.474Z') };
  where.mockReturnValue({ get: async () => ({ docs: [{ id: 'timestamp-result', data: () => ({ completedAt: timestamp }) }] }) });
  const spy = jest.spyOn(db, 'collection').mockReturnValueOnce({ where });
  try {
    const response = await request(app).get('/quiz-scores/student').expect(200);
    expect(where).toHaveBeenCalledWith('studentId', '==', 'student');
    expect(response.body.scores[0].submittedAt).toBe('2026-10-06T13:49:23.474Z');
    expect(response.body.scores[0].completedAt).toBe('2026-10-06T13:49:23.474Z');
  } finally { spy.mockRestore(); }
});

test('student with no saved quizzes receives a successful empty quiz history', async () => {
  const response = await request(app).get('/quiz-scores/student').expect(200);
  expect(response.body).toEqual({ scores: [], count: 0 });
  expect(updates).toHaveLength(0);
});

test('failed retries replace the same mission document with the latest score and never award XP', async () => {
  const first = await request(app).post('/mission-scores').send(missionPayload(20, false)).expect(201);
  const retry = await request(app).post('/mission-scores').send(missionPayload(65, false, '2026-10-06T01:00:00Z')).expect(200);
  expect(retry.body.scoreId).toBe(first.body.scoreId);
  expect(retry.body.data.score).toBe(65);
  expect(retry.body.data.createdAt).toBe(first.body.data.createdAt);
  expect(bucket('mission_score').size).toBe(1);
  expect(bucket('students').get('student').xp).toBe(0);
});

test('failed retry can pass once; later practice preserves the score, timestamp, and XP forever', async () => {
  const failed = await request(app).post('/mission-scores').send(missionPayload(20, false)).expect(201);
  const passed = await request(app).post('/mission-scores').send(missionPayload(85, true, '2026-10-06T01:00:00Z')).expect(200);
  expect(passed.body.scoreId).toBe(failed.body.scoreId);
  expect(passed.body.xpAwarded).toBe(500);
  const persisted = structuredClone(bucket('mission_score').get(passed.body.scoreId));
  const writes = updates.length;
  for (const [score, isPass] of [[99, true], [0, false]]) {
    const practice = await request(app).post('/mission-scores').send(missionPayload(score, isPass, '2026-10-08T00:00:00Z')).expect(200);
    expect(practice.body.skipped).toBe(true);
    expect(practice.body.reason).toBe('mission_already_passed');
    expect(practice.body.xpAwarded).toBe(0);
    expect(practice.body.data.score).toBe(85);
  }
  expect(bucket('mission_score').get(passed.body.scoreId)).toEqual(persisted);
  expect(bucket('students').get('student').xp).toBe(500);
  expect(updates).toHaveLength(writes);
});

test('concurrent first mission saves create one document and award XP only once', async () => {
  const responses = await Promise.all(Array.from({ length: 6 }, () =>
    request(app).post('/mission-scores').send(missionPayload(85, true))));
  expect(responses.every(response => [200, 201].includes(response.status))).toBe(true);
  expect(new Set(responses.map(response => response.body.scoreId)).size).toBe(1);
  expect(responses.reduce((total, response) => total + response.body.xpAwarded, 0)).toBe(500);
  expect(bucket('mission_score').size).toBe(1);
  expect(bucket('students').get('student').xp).toBe(500);
});

test('an atomic commit failure leaves both XP and result untouched; retry succeeds once', async () => {
  failNextCommit = true;
  await request(app).post('/mission-scores').send(missionPayload(85, true)).expect(500);
  expect(bucket('mission_score').size).toBe(0);
  expect(bucket('students').get('student').xp).toBe(0);
  const retry = await request(app).post('/mission-scores').send(missionPayload(85, true)).expect(201);
  expect(retry.body.xpAwarded).toBe(500);
  expect(bucket('mission_score').size).toBe(1);
});

test('legacy duplicate mission documents with any passed result cannot be overwritten or re-awarded', async () => {
  bucket('mission_score').set('old-failed', { ...missionPayload(20, false), xpAwarded: false });
  bucket('mission_score').set('old-passed', { ...missionPayload(80, true), xpAwarded: false });
  const before = structuredClone([...bucket('mission_score')]);
  const response = await request(app).post('/mission-scores').send(missionPayload(99, true)).expect(200);
  expect(response.body.scoreId).toBe('old-passed');
  expect(response.body.skipped).toBe(true);
  expect([...bucket('mission_score')]).toEqual(before);
  expect(bucket('students').get('student').xp).toBe(0);
});

test('legacy failed document IDs and unrelated fields survive retry updates', async () => {
  bucket('mission_score').set('legacy-id', { ...missionPayload(20, false), unrelated: 'preserve', createdAt: '2026-10-01' });
  const response = await request(app).post('/mission-scores').send(missionPayload(65, false)).expect(200);
  expect(response.body.scoreId).toBe('legacy-id');
  expect(bucket('mission_score').size).toBe(1);
  expect(bucket('mission_score').get('legacy-id').unrelated).toBe('preserve');
  expect(bucket('mission_score').get('legacy-id').createdAt).toBe('2026-10-01');
});

test('quiz retries preserve the first result even if module context changes or another endpoint saves', async () => {
  const first = await request(app).post('/quiz-scores').send(quizPayload()).expect(201);
  const retry = await request(app).post('/quiz-scores').send({ ...quizPayload(90, '2026-10-06T01:00:00Z'), moduleId: 'other-module' }).expect(200);
  expect(retry.body.scoreId).toBe(first.body.scoreId);
  expect(retry.body.skipped).toBe(true);
  expect(retry.body.reason).toBe('quiz_already_completed');
  expect(retry.body.data).toEqual(first.body.data);
  const submission = await request(app).post('/quizzes/quiz/submit').send({
    studentId: 'student', moduleId: 'module', missionId: 'mission', score: 80,
    correctCount: 8, totalQuestions: 10, answers: []
  }).expect(200);
  expect(submission.body.submissionId).toBe(first.body.scoreId);
  expect(bucket('quiz_score').size).toBe(1);
  expect(bucket('quiz_score').get(first.body.scoreId)['Quiz-score-percentage']).toBe(first.body.data['Quiz-score-percentage']);
});

test('concurrent quiz submissions create one document per student and quiz', async () => {
  const responses = await Promise.all(Array.from({ length: 6 }, () =>
    request(app).post('/quiz-scores').send(quizPayload())));
  expect(responses.every(response => [200, 201].includes(response.status))).toBe(true);
  expect(new Set(responses.map(response => response.body.scoreId)).size).toBe(1);
  expect(bucket('quiz_score').size).toBe(1);
});

test('completed quiz stays fixed while a failed mission improves and passes', async () => {
  const quiz = await request(app).post('/quiz-scores').send(quizPayload(100)).expect(201);
  await request(app).post('/mission-scores').send(missionPayload(20, false)).expect(201);
  const retry = await request(app).post('/quiz-scores').send(quizPayload(80, '2026-10-06T01:00:00Z')).expect(200);
  expect(retry.body.data['Quiz-score-percentage']).toBe(100);
  expect(retry.body.skipped).toBe(true);
  await request(app).post('/mission-scores').send(missionPayload(85, true, '2026-10-06T02:00:00Z')).expect(200);
  const persisted = structuredClone(bucket('quiz_score').get(quiz.body.scoreId));
  const practice = await request(app).post('/quiz-scores').send(quizPayload(0, '2026-10-08T00:00:00Z')).expect(200);
  expect(practice.body.skipped).toBe(true);
  expect(bucket('quiz_score').get(quiz.body.scoreId)).toEqual(persisted);
  expect(bucket('quiz_score').size).toBe(1);
});

test('no quiz document is created by practice when the mission already passed', async () => {
  await request(app).post('/mission-scores').send(missionPayload(85, true)).expect(201);
  const practice = await request(app).post('/quiz-scores').send(quizPayload()).expect(200);
  expect(practice.body.skipped).toBe(true);
  expect(practice.body.scoreId).toBeNull();
  expect(bucket('quiz_score').size).toBe(0);
});

test('older delayed failed mission and quiz saves cannot replace the latest retry', async () => {
  await request(app).post('/mission-scores').send(missionPayload(65, false, '2026-10-06T02:00:00Z')).expect(201);
  const mission = await request(app).post('/mission-scores').send(missionPayload(20, false)).expect(200);
  expect(mission.body.skipped).toBe(true);
  expect(mission.body.data.score).toBe(65);
  await request(app).post('/quiz-scores').send(quizPayload(80, '2026-10-06T02:00:00Z')).expect(201);
  const quiz = await request(app).post('/quiz-scores').send(quizPayload()).expect(200);
  expect(quiz.body.skipped).toBe(true);
  expect(quiz.body.data['Quiz-score-percentage']).toBe(80);
});

test('different students and different missions/quizzes keep separate records', async () => {
  await request(app).post('/mission-scores').send(missionPayload(20, false)).expect(201);
  await request(app).post('/mission-scores').send({ ...missionPayload(20, false), missionId: 'other-mission' }).expect(201);
  await request(app).post('/mission-scores').send({ ...missionPayload(20, false), studentId: 'other-student' }).expect(201);
  await request(app).post('/quiz-scores').send(quizPayload()).expect(201);
  await request(app).post('/quiz-scores').send({ ...quizPayload(), quizId: 'other-quiz' }).expect(201);
  await request(app).post('/quiz-scores').send({ ...quizPayload(), studentId: 'other-student' }).expect(201);
  expect(bucket('mission_score').size).toBe(3);
  expect(bucket('quiz_score').size).toBe(3);
});

test('legacy quiz saves without missionId cannot overwrite a passed synthetic mission quiz', async () => {
  bucket('mission_score').set('legacy-pass', { ...missionPayload(80, true), missionId: 'CUSTOM-module' });
  const payload = quizPayload();
  delete payload.missionId;
  const practice = await request(app).post('/quiz-scores').send(payload).expect(200);
  expect(practice.body.skipped).toBe(true);
  expect(bucket('quiz_score').size).toBe(0);
});

test('legacy random quiz document remains unchanged on retry', async () => {
  bucket('quiz_score').set('legacy-quiz', { ...quizPayload(), instructorNote: 'preserve' });
  const before = structuredClone(bucket('quiz_score').get('legacy-quiz'));
  const retry = await request(app).post('/quiz-scores').send(quizPayload(80, '2026-10-06T01:00:00Z')).expect(200);
  expect(retry.body.scoreId).toBe('legacy-quiz');
  expect(bucket('quiz_score').size).toBe(1);
  expect(bucket('quiz_score').get('legacy-quiz').instructorNote).toBe('preserve');
  expect(bucket('quiz_score').get('legacy-quiz')).toEqual(before);
});

test('a failed quiz cannot be replaced by a later perfect quiz attempt', async () => {
  const first = await request(app).post('/quiz-scores').send(quizPayload(0)).expect(201);
  const retry = await request(app).post('/quiz-scores').send(quizPayload(100, '2026-10-08T00:00:00Z')).expect(200);
  expect(retry.body.skipped).toBe(true);
  expect(retry.body.data).toEqual(first.body.data);
  expect(bucket('quiz_score').get(first.body.scoreId)['raw-score']).toBe(0);
});

test('repeated and concurrent grading reuses one quiz result and preserves grading fields', async () => {
  const quiz = await request(app).post('/quiz-scores').send(quizPayload()).expect(201);
  const payload = { score: 80, validation: [true, false], feedback: 'Reviewed', gradedBy: 'instructor' };
  const responses = await Promise.all(Array.from({ length: 3 }, () =>
    request(app).post(`/quizzes/submissions/${quiz.body.scoreId}/grade`).send(payload)));
  expect(responses.every(response => response.status === 200)).toBe(true);
  expect(bucket('quiz_results').size).toBe(1);
  const grade = [...bucket('quiz_results').values()][0];
  expect(grade.score).toBe(80);
  expect(grade.quizid).toBe('quiz');
  expect(grade.studentid).toBe('student');
  expect(grade.validation).toEqual(payload.validation);
  expect(bucket('quiz_score').get(quiz.body.scoreId).status).toBe('graded');
});

test('refresh repairs a legacy student without changing XP or unrelated fields; repeated reads do not write', async () => {
  const first = await request(app).get('/students/student').expect(200);
  expect(first.body.student.rank).toBe('Deck Cadet');
  expect(first.body.student.badges).toEqual([{ id: 'welcome-aboard' }]);
  expect(bucket('students').get('student').xp).toBe(0);
  expect(bucket('students').get('student').unrelated).toEqual({ value: true });
  expect(updates[0].patch).not.toHaveProperty('xp');
  const writeCount = updates.length;
  const second = await request(app).get('/students/student').expect(200);
  expect(second.body).toEqual(first.body);
  expect(updates).toHaveLength(writeCount);
});

test('passed mission promotes at exact threshold and persists corresponding rank badges', async () => {
  const response = await request(app).post('/mission-scores').send({ studentId: 'student', missionId: 'mission', score: 80, passed: true, completedAt: '2026-10-06T00:00:00Z' }).expect(201);
  expect(response.body.xpAwarded).toBe(500);
  expect(response.body.totalXp).toBe(500);
  expect(response.body.rankId).toBe('ordinary_seaman');
  expect(response.body.rankChanged).toBe(true);
  const student = bucket('students').get('student');
  expect(student.xp).toBe(500);
  expect(student.total_xp).toBe(500);
  expect(student.badges.map(badge => badge.id)).toEqual(['welcome-aboard', 'rank-ordinary_seaman']);
});

test('one passed mission can promote through multiple ranks using unchanged mission XP reward', async () => {
  bucket('missions').set('mission', { xp_reward: '7,000 XP' });
  const response = await request(app).post('/mission-scores').send({ studentId: 'student', missionId: 'mission', score: 95, passed: true }).expect(201);
  expect(response.body.xpAwarded).toBe(7000);
  expect(response.body.rankId).toBe('chief_officer');
  expect(bucket('students').get('student').badges).toHaveLength(7);
});

test('failed missions do not award XP or promote, even when the score is high', async () => {
  bucket('students').set('student', { xp: 499, rank: 'Deck Cadet' });
  for (let retry = 0; retry < 3; retry++) {
    const response = await request(app).post('/mission-scores').send({ studentId: 'student', missionId: 'mission', score: 95, passed: false });
    expect(response.body.xpAwarded).toBe(0);
    expect(response.body.totalXp).toBe(499);
    expect(response.body.rankId).toBe('deck_cadet');
  }
  expect(bucket('students').get('student').xp).toBe(499);
  expect(bucket('students').get('student').badges).toEqual([{ id: 'welcome-aboard' }]);
});

test('repeated mission retries preserve duplicate marker, XP and badges', async () => {
  const payload = { studentId: 'student', missionId: 'mission', score: 80, passed: true, completedAt: '2026-10-06T00:00:00Z' };
  await request(app).post('/mission-scores').send(payload).expect(201);
  for (let retry = 0; retry < 3; retry++) {
    const response = await request(app).post('/mission-scores').send(payload).expect(200);
    expect(response.body.xpAwarded).toBe(0);
    expect(response.body.totalXp).toBe(500);
  }
  expect(bucket('students').get('student').xp).toBe(500);
  expect(bucket('students').get('student').badges).toHaveLength(2);
});

test('login repairs persisted fields and retains state across sign out/sign in', async () => {
  bucket('students').set('student', {
    xp: 2000, total_xp: 2000, rank: 'Deck Hand', email: 'student@dnsc.edu.ph',
    password: await bcrypt.hash('password', 4), badges: ['Welcome Aboard', 'welcome-aboard']
  });
  for (let login = 0; login < 2; login++) {
    const response = await request(app).post('/students/login').send({ email: 'student@dnsc.edu.ph', password: 'password' }).expect(200);
    expect(response.body.student.rankId).toBe('bosun');
    expect(response.body.student.xp).toBe(2000);
    expect(response.body.student.badges).toHaveLength(4);
    expect(response.body.student).not.toHaveProperty('password');
  }
});

test('signup initializes Deck Cadet and Welcome Aboard without missions', async () => {
  const response = await request(app).post('/students/signup').send({ studentId: 'STU-1', name: 'New', email: 'new@dnsc.edu.ph', password: 'password', instructorId: 'instructor' }).expect(201);
  const student = bucket('students').get(response.body.studentId);
  expect(student.xp).toBe(0);
  expect(student.rankId).toBe('deck_cadet');
  expect(student.xpNextAt).toBe(500);
  expect(student.badges).toEqual([{ id: 'welcome-aboard' }]);
});

test('course settings drive both backend awards and the configuration returned to the UI', async () => {
  const { DEFAULT_RANKS } = await import('../../shared/progression.js');
  bucket('course_settings').set('global', { ranks: DEFAULT_RANKS.map((rank, index) => ({ id: rank.id, minXp: index * 1000 })) });
  await request(app).post('/mission-scores').send({ studentId: 'student', missionId: 'mission', score: 80, passed: true }).expect(201);
  const response = await request(app).get('/students/student').expect(200);
  expect(response.body.student.rankId).toBe('deck_cadet');
  expect(response.body.student.xpNextAt).toBe(1000);
  expect(response.body.rankSettings.ranks[1].minXp).toBe(1000);
});

test('synthetic custom mission ID looks up the actual mission and awards its configured XP once', async () => {
  bucket('missions').set('custom-mission-123', { xp_reward: 100 });
  const payload = { ...missionPayload(85, true), missionId: 'CUSTOM-custom-mission-123' };
  const first = await request(app).post('/mission-scores').send(payload).expect(201);
  expect(first.body.xpAwarded).toBe(100);
  expect(first.body.data.xpAmount).toBe(100);
  expect(first.body.data.xpAwarded).toBe(true);
  const retry = await request(app).post('/mission-scores').send({ ...payload, missionId: 'custom-mission-123' }).expect(200);
  expect(retry.body.skipped).toBe(true);
  expect(retry.body.scoreId).toBe(first.body.scoreId);
  expect(bucket('mission_score').size).toBe(1);
  expect(bucket('students').get('student').xp).toBe(100);
});

test('explicit zero rewards stay zero and unresolved missions are not marked as awarded', async () => {
  bucket('missions').set('zero', { xp_reward: 0, reward: '100 XP' });
  const zero = await request(app).post('/mission-scores').send({ ...missionPayload(85, true), missionId: 'CUSTOM-zero' }).expect(201);
  expect(zero.body.xpAwarded).toBe(0);
  expect(zero.body.data.xpAwarded).toBe(false);
  expect(zero.body.data.xpProcessed).toBe(true);
  const missing = await request(app).post('/mission-scores').send({ ...missionPayload(85, true), missionId: 'CUSTOM-missing' }).expect(201);
  expect(missing.body.data.xpAwarded).toBe(false);
  expect(missing.body.data.xpProcessed).toBe(false);
  expect(bucket('students').get('student').xp).toBe(0);
});

test('a failed legacy zero-XP marker does not lock out a valid passed retry', async () => {
  bucket('mission_score').set('failed-marker', { ...missionPayload(20, false), xpAwarded: true, xpAmount: 0 });
  const response = await request(app).post('/mission-scores').send(missionPayload(85, true)).expect(200);
  expect(response.body.skipped).toBe(false);
  expect(response.body.xpAwarded).toBe(500);
});

test('XP repair handles legacy true/zero markers and duplicates atomically; repeating adds nothing', async () => {
  bucket('students').set('student', { xp: 25, total_xp: 25, unrelated: 'preserve' });
  bucket('missions').set('custom-one', { xp_reward: 100 });
  bucket('missions').set('custom-two', { xp_reward: 10 });
  bucket('missions').set('custom-three', { xp_reward: 100 });
  bucket('mission_score').set('pass1', { ...missionPayload(80, true), missionId: 'CUSTOM-custom-one', xpAwarded: false, xpAmount: 0 });
  bucket('mission_score').set('duplicate-pass1', { ...missionPayload(80, true), missionId: 'custom-one', xpAwarded: false });
  bucket('mission_score').set('pass2', { ...missionPayload(40, true), missionId: 'CUSTOM-custom-two', xpAwarded: false });
  bucket('mission_score').set('pass3', { ...missionPayload(100, true), missionId: 'CUSTOM-custom-three', xpAwarded: true, xpAmount: 0 });
  const dry = await reconcileStudentMissionXp('student');
  expect(dry.xpAdded).toBe(210);
  expect(bucket('students').get('student').xp).toBe(25);
  failNextCommit = true;
  await expect(reconcileStudentMissionXp('student', { apply: true })).rejects.toThrow('Simulated commit failure');
  expect(bucket('students').get('student').xp).toBe(25);
  const repair = await reconcileStudentMissionXp('student', { apply: true });
  expect(repair.xpAfter).toBe(235);
  expect(bucket('students').get('student').total_xp).toBe(235);
  expect(bucket('students').get('student').unrelated).toBe('preserve');
  expect(bucket('students').get('student').rankId).toBe('deck_cadet');
  expect(bucket('mission_score').get('pass3').score).toBe(100);
  expect(bucket('mission_score').get('pass3').completedAt).toBe(missionPayload(100, true).completedAt);
  const again = await reconcileStudentMissionXp('student', { apply: true });
  expect(again.xpAdded).toBe(0);
  expect(again.credits).toEqual([]);
  expect(bucket('students').get('student').xp).toBe(235);
});

test('repair never re-awards positive credits, failed results, or intentionally processed zero rewards', async () => {
  bucket('mission_score').set('credited', { ...missionPayload(85, true), xpAwarded: true, xpAmount: 500 });
  bucket('mission_score').set('failed', { ...missionPayload(20, false), missionId: 'failed-mission' });
  bucket('missions').set('zero', { xp_reward: 100 });
  bucket('mission_score').set('zero', { ...missionPayload(85, true), missionId: 'zero', xpAmount: 0, xpProcessed: true });
  const repair = await reconcileStudentMissionXp('student', { apply: true });
  expect(repair.xpAdded).toBe(0);
  expect(repair.credits).toEqual([]);
});

test('total-XP lookup deduplicates aliases and uses the same configured reward as the award handler', async () => {
  bucket('missions').set('custom-mission-123', { xp_reward: 100 });
  bucket('mission_score').set('legacy', { ...missionPayload(85, true), missionId: 'CUSTOM-custom-mission-123' });
  bucket('mission_score').set('alias', { ...missionPayload(85, true), missionId: 'custom-mission-123' });
  const response = await request(app).get('/mission-scores/student/student/total-xp').expect(200);
  expect(response.body.totalXp).toBe(100);
  expect(response.body.missionsCompleted).toBe(1);
});
