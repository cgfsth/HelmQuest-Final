import { beforeEach, expect, test } from '@jest/globals';
import request from 'supertest';
import { readFile, writeFile, access } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { materialsFixture, samplePdf } from './helpers/materialsFixture.js';
import { issueSession } from '../services/authSession.js';
import { createPresentationPreview } from '../services/presentationPreview.js';
import { viewModulePdf } from './helpers/coursePdf.js';

const owner = { id: 'a', role: 'instructor' }, student = { id: 'sa', role: 'student', instructorid: 'a' };
const headers = (id = 'a', role = 'instructor') => ({ Authorization: `Bearer ${issueSession(id, role)}` });
const file = () => ({ originalname: 'outline.pdf', mimetype: 'application/pdf', buffer: samplePdf() });
let f, syllabusId, moduleId, savedInputs;
const payload = (extra = {}) => ({ type: 'pdf', title: 'Reading', published: true, ...extra });
async function add(extra = {}, upload = file(), module = moduleId) { return f.course.save(owner, syllabusId, module, null, payload(extra), upload); }
beforeEach(async () => {
  savedInputs = [];
  f = materialsFixture({ saveQuizResult: async data => {
    savedInputs.push(data); f.records.quiz_score ||= {};
    const existing = Object.values(f.records.quiz_score).find(r => r.studentId === data.studentId && r.quizId === data.quizId);
    if (existing) return { data: existing, skipped: true, scoreId: 'saved' };
    f.records.quiz_score.saved = data; return { data, scoreId: 'saved' };
  } });
  ({ id: syllabusId } = await f.service.save(owner, 'syllabi', null, { title: 'Maritime Navigation' }, file()));
  ({ id: moduleId } = await f.service.save(owner, 'syllabus_modules', null, { title: 'Safe Navigation', moduleNumber: 1 }, file(), syllabusId));
  f.records.missions = { mission: { title: 'Harbor Navigation', instructorId: 'a' }, foreign: { title: 'Other class', instructorId: 'b' } };
  f.records.quiz = { quiz: { title: 'Navigation Quiz', moduleId: 'mission', questions: [{ type: 'true-false', correctAnswer: 'True' }, { type: 'multiple-choice', options: [{ text: 'Starboard', isCorrect: true }, { text: 'Port', isCorrect: false }] }] }, foreign: { title: 'Foreign quiz', instructorId: 'b' } };
});

test('existing syllabi and module PDFs become a course with protected activity metadata', async () => {
  await add({}, file(), null);
  await add({ type: 'simulation', title: 'Practice', targetId: 'mission' }, null);
  const response = await request(f.app).get(`/learning-materials/syllabi/${syllabusId}/course`).set(headers('sa', 'student')).expect(200);
  expect(response.body.modules).toHaveLength(1); expect(response.body.activities).toHaveLength(2);
  expect(response.body.catalog).toBeUndefined(); expect(JSON.stringify(response.body)).not.toMatch(/storagePath|pendingFileDeletes|isCorrect|correctAnswer/);
  const managed = await f.course.course(owner, syllabusId);
  expect(managed.catalog.missions.map(m => m.id)).toEqual(['mission']); expect(managed.catalog.quizzes.map(q => q.id)).toEqual(['quiz']);
});

test('anonymous, pending students, foreign classes and student writes are rejected', async () => {
  const { id } = await add();
  await request(f.app).get(`/learning-materials/syllabi/${syllabusId}/course`).expect(401);
  await request(f.app).get(`/learning-materials/syllabi/${syllabusId}/course`).set(headers('pending', 'student')).expect(403);
  for (const [id, role] of [['b', 'instructor'], ['sb', 'student']]) await request(f.app).get(`/learning-materials/syllabi/${syllabusId}/course`).set(headers(id, role)).expect(404);
  await request(f.app).post(`/learning-materials/syllabi/${syllabusId}/activities`).set(headers('sa', 'student')).field('title', 'Forged').expect(403);
  await request(f.app).put(`/learning-materials/activities/${id}`).set(headers('b')).field('title', 'Stolen').expect(404);
  await request(f.app).get(`/learning-materials/activities/${id}/pdf`).set(headers('sb', 'student')).expect(404);
});

test('draft course, module and activity visibility also applies to direct PDF and launch URLs', async () => {
  const { id } = await add();
  const sim = await add({ type: 'simulation', targetId: 'mission', published: false }, null);
  expect((await f.course.course(student, syllabusId)).activities.map(a => a.id)).toEqual([id]);
  await request(f.app).post(`/learning-materials/activities/${sim.id}/launch`).set(headers('sa', 'student')).expect(404);
  f.records.syllabus_modules[moduleId].published = false;
  expect((await f.course.course(student, syllabusId)).modules).toHaveLength(0);
  await request(f.app).get(`/learning-materials/activities/${id}/pdf`).set(headers('sa', 'student')).expect(404);
  f.records.syllabi[syllabusId].published = false;
  expect((await f.service.list(student)).syllabi).toHaveLength(0);
  await request(f.app).get(`/learning-materials/syllabi/${syllabusId}/pdf`).set(headers('sa', 'student')).expect(404);
  expect((await f.course.course(owner, syllabusId)).activities).toHaveLength(2);
});

test('instructors cannot link foreign missions/quizzes or put practical activities in General', async () => {
  await expect(add({ type: 'simulation', targetId: 'foreign' }, null)).rejects.toMatchObject({ status: 400 });
  await expect(add({ type: 'quiz', targetId: 'foreign' }, null)).rejects.toMatchObject({ status: 400 });
  await expect(add({ type: 'simulation', targetId: 'mission' }, null, null)).rejects.toMatchObject({ status: 400 });
  await expect(add({ availableFrom: 'bad-date' })).rejects.toMatchObject({ status: 400 });
  await expect(add({ availableFrom: '2027-01-02', availableUntil: '2027-01-01' })).rejects.toMatchObject({ status: 400 });
});

test('private uploaded PDF is readable and marks only the authenticated student’s current revision as viewed', async () => {
  const { id } = await add();
  const response = await request(f.app).get(`/learning-materials/activities/${id}/pdf`).set(headers('sa', 'student')).expect(200);
  expect(response.headers['cache-control']).toBe('private, no-store'); expect(response.body.equals(samplePdf())).toBe(true);
  await request(f.app).post(`/learning-materials/activities/${id}/progress`).set(headers('sa', 'student')).send({ event: 'viewed', revision: 1, studentId: 'sb' }).expect(200);
  expect((await f.course.course(student, syllabusId)).progress[id].status).toBe('Done');
  expect(Object.values(f.records.learning_activity_progress).map(p => p.studentId)).toEqual(['sa']);
  await f.course.save(owner, null, null, id, payload({ title: 'Revised reading', revision: 1 }), file());
  expect((await f.course.course(student, syllabusId)).progress[id].status).toBe('In Progress');
  await request(f.app).post(`/learning-materials/activities/${id}/progress`).set(headers('sa', 'student')).send({ event: 'viewed', revision: 1 }).expect(409);
});

test('opening simulations never completes them; saved results and CUSTOM aliases determine completion', async () => {
  const { id } = await add({ type: 'simulation', targetId: 'mission', completionRule: 'pass', passScore: 80 }, null);
  await viewModulePdf(f, student, moduleId);
  await request(f.app).post(`/learning-materials/activities/${id}/launch`).set(headers('sa', 'student')).expect(200);
  expect((await f.course.course(student, syllabusId)).progress[id].status).toBe('In Progress');
  await request(f.app).post(`/learning-materials/activities/${id}/progress`).set(headers('sa', 'student')).send({ event: 'viewed', revision: 1 }).expect(200);
  expect((await f.course.course(student, syllabusId)).progress[id].status).toBe('In Progress');
  f.records.mission_score = { other: { studentId: 'sb', missionId: 'mission', score: 100, passed: true }, failed: { studentId: 'sa', missionId: 'CUSTOM-mission', score: 60, passed: false } };
  expect((await f.course.course(student, syllabusId)).progress[id].status).toBe('In Progress');
  f.records.mission_score.failed.score = 85; f.records.mission_score.failed.passed = true;
  expect((await f.course.course(student, syllabusId)).progress[id]).toMatchObject({ status: 'Done', requirements: [{ done: true }, { done: true }] });
});

test('reordering course content preserves viewed documents; replacing a file requires a new view', async () => {
  const { id } = await add(), second = await add({ title: 'More reading' });
  const initial = await f.course.course(student, syllabusId);
  await f.course.record(student, syllabusId, { kind: 'syllabus', event: 'viewed', documentVersion: initial.syllabus.documentVersion });
  await f.course.record(student, id, { event: 'viewed', revision: 1 });
  await f.course.reorder(owner, syllabusId, { moduleId, ids: [second.id, id], revision: f.records.syllabi[syllabusId].revision });
  const after = await f.course.course(student, syllabusId);
  expect(after.progress['syllabus-' + syllabusId].status).toBe('Done'); expect(after.progress[id].status).toBe('Done');
  await f.course.save(owner, null, null, id, payload({ revision: 2 }), file());
  expect((await f.course.course(student, syllabusId)).progress[id].status).toBe('In Progress');
});

test('availability is enforced on the server for files, progress and practical launches', async () => {
  const later = new Date(Date.now() + 86400000).toISOString();
  const pdf = await add({ availableFrom: later });
  const sim = await add({ type: 'simulation', targetId: 'mission', availableFrom: later }, null);
  await request(f.app).get(`/learning-materials/activities/${pdf.id}/pdf`).set(headers('sa', 'student')).expect(403);
  await request(f.app).post(`/learning-materials/activities/${pdf.id}/progress`).set(headers('sa', 'student')).send({ event: 'viewed', revision: 1 }).expect(403);
  await request(f.app).post(`/learning-materials/activities/${sim.id}/launch`).set(headers('sa', 'student')).expect(403);
  await request(f.app).get(`/learning-materials/activities/${pdf.id}/pdf`).set(headers()).expect(200);
});

test('activity order updates atomically and stale updates cannot overwrite another instructor edit', async () => {
  const a = await add({ title: 'First' }), b = await add({ title: 'Second' });
  const revision = f.records.syllabi[syllabusId].revision;
  await f.course.reorder(owner, syllabusId, { moduleId, ids: [b.id, a.id], revision });
  expect((await f.course.course(student, syllabusId)).activities.map(a => a.title)).toEqual(['Second', 'First']);
  await expect(f.course.reorder(owner, syllabusId, { moduleId, ids: [a.id, b.id], revision })).rejects.toMatchObject({ status: 409 });
  await expect(f.course.save(owner, null, null, a.id, payload({ revision: 1 }), null)).rejects.toMatchObject({ status: 409 });
});

test('deletion removes the resource while retaining missions, quizzes and historical results', async () => {
  const { id } = await add();
  await expect(f.service.remove(owner, 'syllabus_modules', moduleId, f.records.syllabus_modules[moduleId].revision)).rejects.toMatchObject({ status: 409 });
  const path = f.records.learning_activities[id].storagePath;
  await f.course.remove(owner, id, 1);
  expect(f.files.has(path)).toBe(false); expect(f.records.learning_activities[id]).toBeUndefined();
  expect(f.records.missions.mission).toBeDefined(); expect(f.records.quiz.quiz).toBeDefined();
  const removed = await f.service.remove(owner, 'syllabus_modules', moduleId, f.records.syllabus_modules[moduleId].revision);
  expect(removed.cleanupPending).toBe(false); expect(f.records.syllabus_modules[moduleId]).toBeUndefined();
});

test('a failed metadata commit cleans the uploaded activity file; a lost acknowledgement preserves committed files', async () => {
  const before = f.files.size; f.state.failCommit = true;
  await expect(add()).rejects.toThrow('Firestore unavailable'); expect(f.files.size).toBe(before);
  f.state.failCommit = false; f.state.loseCommitAcknowledgement = true;
  await expect(add()).rejects.toThrow('Commit acknowledgement lost');
  const saved = Object.values(f.records.learning_activities)[0]; expect(f.files.has(saved.storagePath)).toBe(true);
});

test('legacy quiz links remain manageable but are hidden from students and cannot launch separately', async () => {
  const { id } = await add({ type: 'quiz', targetId: 'quiz', published: true }, null);
  expect((await f.course.course(student, syllabusId)).activities.some(a => a.type === 'quiz')).toBe(false);
  expect((await f.course.course(owner, syllabusId)).activities.some(a => a.id === id)).toBe(true);
  await request(f.app).post('/learning-materials/activities/' + id + '/launch').set(headers('sa', 'student')).expect(409);
});

test('presentation conversion uses an isolated profile, disabled macros, timeout and private local files', async () => {
  let directory;
  const preview = createPresentationPreview({ executable: 'test-soffice', run: async (executable, args, options) => {
    expect(executable).toBe('test-soffice'); expect(options).toMatchObject({ timeout: 90000, windowsHide: true });
    expect(args).toContain('pdf:impress_pdf_Export'); directory = dirname(args.at(-1));
    const profile = fileURLToPath(args[0].split('UserInstallation=')[1]);
    expect(await readFile(join(profile, 'user', 'registrymodifications.xcu'), 'utf8')).toMatch(/MacroSecurityLevel.*<value>3<\/value>/);
    await writeFile(join(directory, 'presentation.pdf'), samplePdf());
  } });
  const converted = await preview({ originalname: 'lesson.pptx', buffer: Buffer.from([0x50, 0x4b, 0x03, 0x04, 1]) });
  expect(converted.originalname).toBe('lesson.pdf'); expect(converted.buffer.equals(samplePdf())).toBe(true);
  await expect(access(directory)).rejects.toMatchObject({ code: 'ENOENT' });
  await expect(preview({ originalname: 'fake.pptx', buffer: Buffer.from('not a presentation') })).rejects.toMatchObject({ status: 400 });
  const missing = createPresentationPreview({ run: async () => { throw Object.assign(new Error('missing'), { code: 'ENOENT' }); } });
  await expect(missing({ originalname: 'lesson.ppt', buffer: Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]) })).rejects.toMatchObject({ status: 503 });
});
