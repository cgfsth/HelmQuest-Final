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
