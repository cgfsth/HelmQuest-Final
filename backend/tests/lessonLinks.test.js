import { beforeEach, expect, test } from '@jest/globals';
import request from 'supertest';
import { materialsFixture, samplePdf } from './helpers/materialsFixture.js';
import { issueSession } from '../services/authSession.js';

const owner = { id: 'a', role: 'instructor' };
const student = { id: 'sa', role: 'student', instructorid: 'a' };
const headers = (id = 'a', role = 'instructor') => ({ Authorization: `Bearer ${issueSession(id, role)}` });
const video = 'https://www.youtube.com/watch?v=abc12345678';
let f, syllabusId, moduleId;
beforeEach(async () => {
  f = materialsFixture();
  ({ id: syllabusId } = await f.service.save(owner, 'syllabi', null, { title: 'Navigation' }, { originalname: 'course.pdf', mimetype: 'application/pdf', buffer: samplePdf() }));
  ({ id: moduleId } = await f.service.save(owner, 'syllabus_modules', null, { title: 'Lesson 1', moduleNumber: 1 }, null, syllabusId));
});
const create = (url = video, extra = {}, auth = headers()) => {
  let operation = request(f.app).post(`/learning-materials/syllabi/${syllabusId}/activities`).set(auth);
  for (const [key, value] of Object.entries({ type: 'link', title: 'Navigation video', url, moduleId, published: true, ...extra })) operation = operation.field(key, String(value));
  return operation;
};

test('instructor creates a lesson video URL without a file, and opening it records no XP or simulation completion', async () => {
  const students = structuredClone(f.records.students), fileCount = f.files.size;
  const { body: { id } } = await create('  ' + video + '  ').expect(200);
  expect(f.records.learning_activities[id]).toMatchObject({ type: 'link', moduleId, url: video, completionRule: 'view', published: true });
  expect(f.records.learning_activities[id].storagePath).toBeUndefined();expect(f.files.size).toBe(fileCount);
  let course = await f.course.course(student, syllabusId);
  expect(course.activities[0]).toMatchObject({ id, url: video });
  expect(course.progress[id]).toMatchObject({ status: 'To do', requirements: [{ label: 'Open the video link', done: false }] });
  expect(course.simulationAccess[moduleId].canCreate).toBe(false);
  await request(f.app).post(`/learning-materials/activities/${id}/progress`).set(headers('sa', 'student')).send({ event: 'viewed', revision: 1 }).expect(200);
  course = await f.course.course(student, syllabusId);
  expect(course.progress[id].status).toBe('Done');expect(course.simulationAccess[moduleId].canStart).toBe(false);
  expect(f.records.students).toEqual(students);expect(f.records.mission_score).toBeUndefined();expect(f.records.quiz_score).toBeUndefined();
  await request(f.app).get(`/learning-materials/activities/${id}/pdf`).set(headers('sa', 'student')).expect(404);
});

test('a URL-only submission gets its display label automatically', async () => {
  const { body: { id } } = await create(video, { title: '' }).expect(200);
  expect(f.records.learning_activities[id]).toMatchObject({ title: 'Video link', description: '', url: video });
});

test.each(['javascript:alert(1)', 'data:text/html,bad', 'file:///C:/private.pdf', 'ftp://example.com/video', '//youtube.com/watch?v=abc', 'https://user:password@example.com/video', 'not a URL', '', 'https://example.com/' + 'x'.repeat(2048)])('invalid video URL is rejected without saving metadata: %s', async url => {
  await create(url).expect(400);
  expect(Object.keys(f.records.learning_activities || {})).toHaveLength(0);expect(f.files.size).toBe(1);
});

test('drafts, student writes, foreign instructors and out-of-date edits are rejected', async () => {
  await create(video, {}, headers('sa', 'student')).expect(403);
  await create(video, {}, headers('b')).expect(404);
  const { body: { id } } = await create(video, { published: false }).expect(200);
  expect((await f.course.course(student, syllabusId)).activities).toEqual([]);
  await request(f.app).post(`/learning-materials/activities/${id}/progress`).set(headers('sa', 'student')).send({ event: 'viewed', revision: 1 }).expect(404);
  await request(f.app).put(`/learning-materials/activities/${id}`).set(headers('b')).field('type', 'link').field('revision', '1').field('title', 'Hijack').field('url', video).expect(404);
  await request(f.app).put(`/learning-materials/activities/${id}`).set(headers()).field('type', 'link').field('revision', '0').field('title', 'Stale').field('url', video).expect(409);
});

test('changing the URL resets opened progress; edits with the same URL preserve it', async () => {
  const { body: { id } } = await create().expect(200);
  await f.course.record(student, id, { event: 'viewed', revision: 1 });
  await f.course.save(owner, null, null, id, { type: 'link', title: 'Updated title', url: video, revision: 1, published: true }, null);
  expect((await f.course.course(student, syllabusId)).progress[id].status).toBe('Done');
  await f.course.save(owner, null, null, id, { type: 'link', title: 'Updated video', url: 'https://youtu.be/new12345678', revision: 2, published: true }, null);
  expect((await f.course.course(student, syllabusId)).progress[id].status).toBe('In Progress');
  await request(f.app).post(`/learning-materials/activities/${id}/progress`).set(headers('sa', 'student')).send({ event: 'viewed', revision: 2 }).expect(409);
  await f.course.record(student, id, { event: 'viewed', revision: 3 });
  expect((await f.course.course(student, syllabusId)).progress[id].status).toBe('Done');
});

test('video availability and file rejection are enforced on the server', async () => {
  const { body: { id } } = await create(video, { availableFrom: new Date(Date.now() + 86400000).toISOString() }).expect(200);
  await request(f.app).post(`/learning-materials/activities/${id}/progress`).set(headers('sa', 'student')).send({ event: 'viewed', revision: 1 }).expect(403);
  await create().attach('file', samplePdf(), { filename: 'extra.pdf', contentType: 'application/pdf' }).expect(400);
});

test('video rows and their progress are removed with the syllabus', async () => {
  const { body: { id } } = await create().expect(200);
  await f.course.record(student, id, { event: 'viewed', revision: 1 });
  await f.service.remove(owner, 'syllabi', syllabusId, f.records.syllabi[syllabusId].revision, { cascade: true, deleteRecords: true });
  expect(f.records.learning_activities[id]).toBeUndefined();expect(f.records.learning_activity_progress).toEqual({});
  expect(f.files.size).toBe(0);
});
