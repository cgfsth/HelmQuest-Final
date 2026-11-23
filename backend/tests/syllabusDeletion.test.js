import { beforeEach, expect, test } from '@jest/globals';
import request from 'supertest';
import { materialsFixture, samplePdf } from './helpers/materialsFixture.js';
import { issueSession } from '../services/authSession.js';
import { OFFICIAL_SYLLABUS, OFFICIAL_SYLLABUS_KEY } from '../../shared/officialSyllabus.js';

const owner = { id: 'a', role: 'instructor' };
const pdf = () => ({ originalname: 'course.pdf', mimetype: 'application/pdf', buffer: samplePdf() });
const headers = (id = 'a', role = 'instructor') => ({ Authorization: `Bearer ${issueSession(id, role)}` });
let f;
beforeEach(() => { f = materialsFixture(); });

async function course(official = false) {
  const { id } = await f.service.save(owner, 'syllabi', null, {
    title: official ? OFFICIAL_SYLLABUS.title : 'Navigation',
    ...(official ? { officialSyllabusKey: OFFICIAL_SYLLABUS_KEY } : {})
  }, pdf());
  const moduleId = official ? Object.keys(f.records.syllabus_modules).find(key => f.records.syllabus_modules[key].syllabusId === id)
    : (await f.service.save(owner, 'syllabus_modules', null, { title: 'Lesson', moduleNumber: 1 }, pdf(), id)).id;
  await f.course.save(owner, id, moduleId, null, { type: 'pdf', title: 'Reading', published: true }, pdf());
  await f.course.save(owner, id, null, null, { type: 'pdf', title: 'General reading', published: true }, pdf());
  return { id, moduleId };
}
const remove = (id, extra = {}, auth = headers()) => request(f.app).delete(`/learning-materials/syllabi/${id}`).set(auth)
  .send({ revision: f.records.syllabi[id].revision, cascade: true, ...extra });

test.each([false, true])('confirmed deletion removes a complete syllabus (official: %s) and only its own materials', async official => {
  const { id } = await course(official);
  await course();
  f.records.missions = { mission: { title: 'Retained mission' } };
  f.records.quiz = { quiz: { title: 'Retained quiz' } };
  f.records.mission_score = { score: { studentId: 'sa', score: 90 } };
  f.records.quiz_score = { score: { studentId: 'sa', score: 85 } };
  const retained = structuredClone(f.records);
  const deletedPaths = [f.records.syllabi[id], ...Object.values(f.records.syllabus_modules), ...Object.values(f.records.learning_activities)]
    .filter(item => item === f.records.syllabi[id] || item.syllabusId === id).map(item => item.storagePath).filter(Boolean);
  const result = await remove(id).expect(200);
  expect(result.body.cleanupPending).toBe(false);
  expect(f.records.syllabi[id]).toBeUndefined();
  for (const name of ['syllabus_modules', 'learning_activities']) {
    expect(Object.values(f.records[name]).some(item => item.syllabusId === id)).toBe(false);
    for (const [key, value] of Object.entries(retained[name])) if (value.syllabusId !== id) expect(f.records[name][key]).toEqual(value);
  }
  for (const name of ['missions', 'quiz', 'mission_score', 'quiz_score', 'training_modules']) expect(f.records[name]).toEqual(retained[name]);
  for (const path of deletedPaths) expect(f.files.has(path)).toBe(false);
  expect(f.files.size).toBeGreaterThan(0);
});

test('cascade deletion requires ownership, a current revision and explicit confirmation', async () => {
  const { id } = await course(true);
  const before = structuredClone(f.records);
  await remove(id, {}, headers('b')).expect(404);
  await remove(id, {}, headers('sa', 'student')).expect(403);
  await remove(id, { revision: 0 }).expect(409);
  await remove(id, { cascade: false }).expect(409);
  expect(f.records).toEqual(before);
  expect(f.events.some(([kind]) => kind === 'file-delete')).toBe(false);
  await remove(id, {}, headers('admin', 'admin')).expect(200);
  expect(f.records.syllabi[id]).toBeUndefined();
});

test('failed file cleanup hides the whole course and keeps the parent until retry succeeds', async () => {
  const { id, moduleId } = await course();
  f.state.failDelete = true;
  const result = await remove(id).expect(200);
  expect(result.body.cleanupPending).toBe(true);
  expect(f.records.syllabi[id].status).toBe('deleting');
  expect(f.records.syllabus_modules[moduleId].status).toBe('deleting');
  expect(Object.values(f.records.learning_activities).every(item => item.status === 'deleting')).toBe(true);
  expect((await f.service.list(owner)).syllabi).toEqual([]);
  await expect(f.service.pdf({ id: 'sa', role: 'student', instructorid: 'a' }, 'syllabus_modules', moduleId)).rejects.toMatchObject({ status: 404 });
  expect((await f.service.cleanup(owner)).cleanupPending).toBe(true);
  expect(f.records.syllabi[id]).toBeDefined();
  f.state.failDelete = false;
  expect((await f.service.cleanup(owner)).cleanupPending).toBe(false);
  expect(f.records.syllabi[id]).toBeUndefined();
  expect(f.records.syllabus_modules[moduleId]).toBeUndefined();
  expect(f.files.size).toBe(0);
});

test('cleanup resumes a cascade after a lost transaction response', async () => {
  const { id } = await course(true);
  f.state.loseCommitAcknowledgement = true;
  await expect(f.service.remove(owner, 'syllabi', id, f.records.syllabi[id].revision, { cascade: true })).rejects.toThrow('Commit acknowledgement lost');
  expect(f.records.syllabi[id].status).toBe('deleting');
  expect((await f.service.cleanup(owner)).cleanupPending).toBe(false);
  expect(f.records.syllabi[id]).toBeUndefined();
  expect(f.files.size).toBe(0);
});

function seedRelatedRecords(id, moduleId) {
  const activityId = Object.keys(f.records.learning_activities).find(key => f.records.learning_activities[key].syllabusId === id);
  f.records.missions = { local: { instructorId: 'a', syllabusId: id }, legacy: { createdBy: 'a' }, unrelated: { instructorId: 'b' } };
  f.records.learning_activities.sim = { syllabusId: id, moduleId, type: 'simulation', targetId: 'legacy', status: 'active', revision: 1 };
  f.records.quiz = { localQuiz: { moduleId: ['CUSTOM-local'], instructorId: 'a' }, assignedQuiz: { instructorId: 'a' }, unrelated: { instructorId: 'b' } };
  f.records.quizzes = { legacyQuiz: { missionId: 'legacy', createdBy: 'a' } };
  f.records.quiz_assignments = { assignment: { targetType: 'module', targetId: 'CUSTOM-local', quizId: 'assignedQuiz' }, unrelated: { quizId: 'unrelated' } };
  f.records.quizAssignments = { legacy: { targetType: 'mission', targetId: 'legacy', quizId: 'legacyQuiz' } };
  f.records.learning_activity_progress = { course: { syllabusId: id }, activity: { activityId }, module: { activityId: `module-${moduleId}` }, unrelated: { syllabusId: 'other' } };
  f.records.mission_score = { local: { missionId: 'CUSTOM-local' }, legacy: { missionid: 'legacy' }, scoped: { syllabusId: id }, unrelated: { missionId: 'unrelated' } };
  f.records.quiz_score = { local: { quizId: 'localQuiz' }, assigned: { quizid: 'assignedQuiz' }, unrelated: { quizId: 'unrelated' } };
  f.records.quiz_scores = { legacy: { moduleId: 'CUSTOM-legacy' } };
  f.records.quiz_results = { grade: { submissionid: 'local' }, unrelated: { submissionid: 'unrelated' } };
  f.records.quiz_result = { legacyGrade: { submissionId: 'legacy' } };
}

test('full-record deletion removes missions, quizzes, assignments, progress, submissions and grades including legacy aliases', async () => {
  const { id, moduleId } = await course();
  seedRelatedRecords(id, moduleId);
  const students = structuredClone(f.records.students);
  const response = await remove(id, { deleteRecords: true }).expect(200);
  expect(response.body.cleanupPending).toBe(false);
  expect(f.records.syllabi[id]).toBeUndefined();
  for (const name of ['missions', 'quiz', 'quiz_assignments', 'learning_activity_progress', 'mission_score', 'quiz_score', 'quiz_results']) {
    expect(Object.keys(f.records[name])).toEqual(['unrelated']);
  }
  for (const name of ['quizzes', 'quizAssignments', 'quiz_scores', 'quiz_result']) expect(f.records[name]).toEqual({});
  expect(f.records.students).toEqual(students);
  expect(f.records.training_modules).toEqual({ untouched: { title: 'Simulation' } });
});

test('shared and foreign course targets and results survive, while this course progress is deleted', async () => {
  const { id, moduleId } = await course();
  seedRelatedRecords(id, moduleId);
  f.records.learning_activities.external = { syllabusId: 'other', type: 'simulation', targetId: 'CUSTOM-legacy', quizPolicy: 'assigned', quizId: 'assignedQuiz' };
  f.records.mission_score.foreign = { syllabusId: 'other', missionId: 'local' };
  f.records.mission_score.thisCourseShared = { syllabusId: id, missionId: 'legacy' };
  f.records.quiz_score.foreign = { syllabusId: 'other', quizId: 'localQuiz' };
  f.records.missions.foreign = { instructorId: 'a', syllabusId: 'other' };
  f.records.learning_activities.foreignLink = { syllabusId: id, type: 'simulation', targetId: 'foreign', status: 'active', revision: 1 };
  await remove(id, { deleteRecords: true }).expect(200);
  expect(f.records.missions.legacy).toBeDefined();expect(f.records.missions.foreign).toBeDefined();
  expect(f.records.mission_score.legacy).toBeDefined();expect(f.records.mission_score.foreign).toBeDefined();
  expect(f.records.mission_score.thisCourseShared).toBeUndefined();
  expect(f.records.quiz.assignedQuiz).toBeDefined();expect(f.records.quizzes.legacyQuiz).toBeDefined();
  expect(f.records.quiz_score.foreign).toBeDefined();
  expect(f.records.learning_activities.external).toBeDefined();
  expect(Object.keys(f.records.learning_activity_progress)).toEqual(['unrelated']);
});

test('record cleanup resumes after a partial batch failure with over 500 results', async () => {
  const { id, moduleId } = await course();
  seedRelatedRecords(id, moduleId);
  for (let index = 0; index < 1000; index++) {
    f.records.quiz_score[`score-${index}`] = { quizId: 'localQuiz' };
    f.records.quiz_results[`grade-${index}`] = { submissionid: `score-${index}` };
  }
  const runTransaction = f.db.runTransaction;
  let calls = 0;
  f.db.runTransaction = callback => ++calls === 3 ? Promise.reject(new Error('Temporary record cleanup failure')) : runTransaction(callback);
  const result = await remove(id, { deleteRecords: true }).expect(200);
  expect(result.body.cleanupPending).toBe(true);
  expect(f.records.syllabi[id].relatedRecordDeletion).toBeDefined();
  f.db.runTransaction = runTransaction;
  expect((await f.service.cleanup(owner)).cleanupPending).toBe(false);
  expect(f.records.syllabi[id]).toBeUndefined();
  expect(Object.keys(f.records.quiz_score)).toEqual(['unrelated']);
  expect(Object.keys(f.records.quiz_results)).toEqual(['unrelated']);
  expect(Object.keys(f.records.missions)).toEqual(['unrelated']);
});

test('full-record deletion cannot bypass access, revision or whole-course confirmation checks', async () => {
  const { id, moduleId } = await course();
  seedRelatedRecords(id, moduleId);
  const before = structuredClone(f.records);
  await remove(id, { deleteRecords: true }, headers('b')).expect(404);
  await remove(id, { deleteRecords: true, revision: 0 }).expect(409);
  await remove(id, { deleteRecords: true, cascade: false }).expect(400);
  expect(f.records).toEqual(before);
});

test('multi-target assignments keep their other course links', async () => {
  const { id, moduleId } = await course();
  seedRelatedRecords(id, moduleId);
  f.records.quiz_assignments.shared = { quizId: 'localQuiz', targetType: 'module', targetId: ['CUSTOM-local', 'other-mission'] };
  await remove(id, { deleteRecords: true }).expect(200);
  expect(f.records.quiz.localQuiz).toBeDefined();
  expect(f.records.quiz_assignments.shared).toEqual({ quizId: 'localQuiz', targetType: 'module', targetId: ['other-mission'] });
});

test('retry preserves targets reassigned to another instructor after deletion was queued', async () => {
  const { id, moduleId } = await course();
  seedRelatedRecords(id, moduleId);
  f.state.loseCommitAcknowledgement = true;
  await expect(f.service.remove(owner, 'syllabi', id, f.records.syllabi[id].revision, { cascade: true, deleteRecords: true })).rejects.toThrow();
  f.records.missions.local = { instructorId: 'b', syllabusId: 'other' };
  f.records.quiz.localQuiz = { instructorId: 'b', syllabusId: 'other' };
  expect((await f.service.cleanup(owner)).cleanupPending).toBe(false);
  expect(f.records.missions.local).toEqual({ instructorId: 'b', syllabusId: 'other' });
  expect(f.records.quiz.localQuiz).toEqual({ instructorId: 'b', syllabusId: 'other' });
  expect(f.records.mission_score.local).toBeDefined();expect(f.records.quiz_score.local).toBeDefined();
  expect(f.records.syllabi[id]).toBeUndefined();
});
