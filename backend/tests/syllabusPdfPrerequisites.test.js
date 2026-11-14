import { beforeEach, expect, test } from '@jest/globals';
import request from 'supertest';
import { materialsFixture } from './helpers/materialsFixture.js';
import { attachModulePdf, viewModulePdf, coursePdf } from './helpers/coursePdf.js';
import { issueSession } from '../services/authSession.js';

const owner = { id: 'a', role: 'instructor' }, student = { id: 'sa', role: 'student', instructorid: 'a' };
const headers = (id = 'sa') => ({ Authorization: `Bearer ${issueSession(id, 'student')}` });
let f, syllabusId, moduleId, otherModule;
const missionPayload = () => ({ missionId: 'new-mission', published: true, mission: {
  mission_title: 'Harbor practice', estimated_duration: '10 minutes', description: '', xp_reward: 100, pass_score: 70,
  learning_objectives: [], bouy: [{ checkpoint_id: 'one' }], steps: [{ type: 'dock' }]
} });
const link = () => f.course.save(owner, syllabusId, moduleId, null, { type: 'simulation', targetId: 'existing', title: 'Practical', published: true }, null);
async function pdf(title = 'PDF lesson', extra = {}) {
  return f.course.save(owner, syllabusId, moduleId, null, { type: 'pdf', title, published: true, ...extra }, coursePdf());
}
beforeEach(async () => {
  f = materialsFixture({ saveMissionResult: async data => ({ data }) });
  ({ id: syllabusId } = await f.service.save(owner, 'syllabi', null, { title: 'Course' }, coursePdf()));
  ({ id: moduleId } = await f.service.save(owner, 'syllabus_modules', null, { title: 'Harbor', moduleNumber: 1 }, null, syllabusId));
  ({ id: otherModule } = await f.service.save(owner, 'syllabus_modules', null, { title: 'Offshore', moduleNumber: 2 }, coursePdf(), syllabusId));
  f.records.missions = { existing: { title: 'Existing mission', instructorId: 'a' } };
});

test('the syllabus PDF or another module PDF cannot enable creation; both create and link endpoints require a PDF in this module', async () => {
  const course = await f.course.course(owner, syllabusId);
  expect(course.simulationAccess[moduleId].canCreate).toBe(false);
  expect(course.simulationAccess[otherModule].canCreate).toBe(true);
  await expect(f.course.saveModuleMission(owner, syllabusId, moduleId, missionPayload())).rejects.toMatchObject({ status: 400 });
  await expect(link()).rejects.toMatchObject({ status: 400 });
  expect(f.records.missions['new-mission']).toBeUndefined();
  expect(Object.keys(f.records.learning_activities || {})).toHaveLength(0);
  await pdf();
  expect((await f.course.course(owner, syllabusId)).simulationAccess[moduleId].canCreate).toBe(true);
  const saved = await f.course.saveModuleMission(owner, syllabusId, moduleId, missionPayload());
  expect(f.records.learning_activities[saved.activityId].moduleId).toBe(moduleId);
});

test('legacy module PDFs must be viewed by this student before launch or completion; viewing syllabus/another module is insufficient', async () => {
  await attachModulePdf(f, owner, moduleId);
  const { id } = await link();
  const initial = await f.course.course(student, syllabusId);
  await f.course.record(student, syllabusId, { kind: 'syllabus', event: 'viewed', documentVersion: initial.syllabus.documentVersion });
  await viewModulePdf(f, student, otherModule);
  await request(f.app).post(`/learning-materials/activities/${id}/launch`).set(headers()).send({ viewed: true }).expect(403);
  await request(f.app).post(`/learning-materials/activities/${id}/progress`).set(headers()).send({ event: 'started' }).expect(403);
  await request(f.app).post(`/learning-materials/activities/${id}/complete-simulation`).set(headers()).send({}).expect(403);
  expect((await f.course.course(student, syllabusId)).simulationAccess[moduleId].canStart).toBe(false);
  await viewModulePdf(f, student, moduleId);
  const allowed = await f.course.course(student, syllabusId);
  expect(allowed.simulationAccess[moduleId].canStart).toBe(true);
  expect(JSON.stringify(allowed)).not.toMatch(/storagePath|pendingFileDeletes/);
  await request(f.app).post(`/learning-materials/activities/${id}/launch`).set(headers()).expect(200);
});

test('every published PDF in the module must be viewed; started flags, foreign views and drafts do not satisfy the rule', async () => {
  const first = await pdf('First PDF'), second = await pdf('Second PDF'); await pdf('Draft PDF', { published: false });
  const { id } = await link();
  await f.course.record(student, first.id, { event: 'viewed', revision: 1 });
  await f.course.record(student, second.id, { event: 'started' });
  f.records.learning_activity_progress.foreign = { studentId: 'sb', activityId: second.id, viewedAt: new Date(), documentVersion: f.records.learning_activity_progress[Object.keys(f.records.learning_activity_progress)[0]].documentVersion };
  const blocked = await f.course.course(student, syllabusId);
  expect(blocked.simulationAccess[moduleId].message).toContain('Second PDF');
  expect(blocked.simulationAccess[moduleId].documents).toHaveLength(2);
  await expect(f.course.launch(student, id)).rejects.toMatchObject({ status: 403 });
  await f.course.record(student, second.id, { event: 'viewed', revision: 1 });
  expect((await f.course.course(student, syllabusId)).simulationAccess[moduleId].canStart).toBe(true);
  await expect(f.course.launch(student, id)).resolves.toMatchObject({ target: { id: 'existing' } });
});

test('reordering keeps a PDF view valid; replacing or removing the PDF locks simulations again', async () => {
  const reading = await pdf(); const simulation = await link();
  await f.course.record(student, reading.id, { event: 'viewed', revision: 1 });
  await f.course.reorder(owner, syllabusId, { moduleId, ids: [simulation.id, reading.id], revision: f.records.syllabi[syllabusId].revision });
  expect((await f.course.course(student, syllabusId)).simulationAccess[moduleId].canStart).toBe(true);
  await f.course.save(owner, null, null, reading.id, { type: 'pdf', title: 'New PDF', published: true, revision: 2 }, coursePdf());
  await f.course.record(student, reading.id, { event: 'started' });
  await expect(f.course.launch(student, simulation.id)).rejects.toMatchObject({ status: 403 });
  await f.course.record(student, reading.id, { event: 'viewed', revision: 3 });
  await expect(f.course.launch(student, simulation.id)).resolves.toMatchObject({ type: 'simulation' });
  await f.course.remove(owner, reading.id, 3);
  await expect(f.course.launch(student, simulation.id)).rejects.toMatchObject({ status: 403 });
  await expect(f.course.saveModuleMission(owner, syllabusId, moduleId, missionPayload())).rejects.toMatchObject({ status: 400 });
});

test('a draft PDF permits authoring but cannot unlock a student simulation until published and viewed', async () => {
  const reading = await pdf('Draft reading', { published: false });
  const simulation = await link();
  expect((await f.course.course(student, syllabusId)).simulationAccess[moduleId].documents).toHaveLength(0);
  await expect(f.course.launch(student, simulation.id)).rejects.toMatchObject({ status: 403 });
  await f.course.save(owner, null, null, reading.id, { type: 'pdf', title: 'Published reading', published: true, revision: 1 }, null);
  await f.course.record(student, reading.id, { event: 'viewed', revision: 2 });
  await expect(f.course.launch(student, simulation.id)).resolves.toMatchObject({ type: 'simulation' });
});

test('creation rechecks the PDF inside the transaction when an instructor removes it during saving', async () => {
  const reading = await pdf();
  f.state.beforeCommit = () => { f.records.learning_activities[reading.id].status = 'deleting'; };
  await expect(f.course.saveModuleMission(owner, syllabusId, moduleId, missionPayload())).rejects.toMatchObject({ status: 400 });
  expect(f.records.missions['new-mission']).toBeUndefined();
});
