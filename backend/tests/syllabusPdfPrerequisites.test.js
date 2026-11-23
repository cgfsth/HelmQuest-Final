import { beforeEach, expect, test } from '@jest/globals';
import request from 'supertest';
import { materialsFixture } from './helpers/materialsFixture.js';
import { attachModulePdf, coursePdf } from './helpers/coursePdf.js';
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

test('students launch, record and complete a simulation without viewing its legacy PDF', async () => {
  await attachModulePdf(f, owner, moduleId);
  const { id } = await link();
  const initial = await f.course.course(student, syllabusId);
  expect(initial.simulationAccess[moduleId]).toMatchObject({ canStart: true, message: '', documents: [{ viewed: false }] });
  expect(JSON.stringify(initial)).not.toMatch(/storagePath|pendingFileDeletes/);
  await request(f.app).post(`/learning-materials/activities/${id}/launch`).set(headers()).expect(200);
  await request(f.app).post(`/learning-materials/activities/${id}/progress`).set(headers()).send({ event: 'started' }).expect(200);
  await request(f.app).post(`/learning-materials/activities/${id}/complete-simulation`).set(headers()).send({}).expect(409);
  const completed = await request(f.app).post(`/learning-materials/activities/${id}/complete-simulation`).set(headers()).send({
    completion: { objectivesComplete: true, completedSteps: 3, totalSteps: 3, anchored: true, engineStopped: true, inPort: true, speedKnots: 0 },
    scores: { steering: 90, course: 80, docking: 70, time: 100, safety: 90 }
  }).expect(200);
  expect(completed.body.data.completion.verified).toBe(true);
  expect(Object.values(f.records.learning_activity_progress).some(item => item.viewedAt)).toBe(false);
});

test('multiple unread PDF resources do not lock a simulation or mark those resources complete', async () => {
  const first = await pdf('First PDF'), second = await pdf('Second PDF'); await pdf('Draft PDF', { published: false });
  const { id } = await link();
  const course = await f.course.course(student, syllabusId);
  expect(course.simulationAccess[moduleId]).toMatchObject({ canStart: true, message: '' });
  expect(course.simulationAccess[moduleId].documents).toHaveLength(2);
  expect(course.simulationAccess[moduleId].documents.every(item => !item.viewed)).toBe(true);
  await expect(f.course.launch(student, id)).resolves.toMatchObject({ target: { id: 'existing' } });
  const after = await f.course.course(student, syllabusId);
  expect(after.progress[first.id].status).toBe('To do');
  expect(after.progress[second.id].status).toBe('To do');
});

test('reordering, replacing and removing a PDF never relocks an existing simulation', async () => {
  const reading = await pdf(); const simulation = await link();
  await f.course.reorder(owner, syllabusId, { moduleId, ids: [simulation.id, reading.id], revision: f.records.syllabi[syllabusId].revision });
  expect((await f.course.course(student, syllabusId)).simulationAccess[moduleId].canStart).toBe(true);
  await f.course.save(owner, null, null, reading.id, { type: 'pdf', title: 'New PDF', published: true, revision: 2 }, coursePdf());
  await expect(f.course.launch(student, simulation.id)).resolves.toMatchObject({ type: 'simulation' });
  await f.course.remove(owner, reading.id, 3);
  expect((await f.course.course(student, syllabusId)).simulationAccess[moduleId]).toMatchObject({ hasPdf: false, canStart: true, canCreate: false });
  await expect(f.course.launch(student, simulation.id)).resolves.toMatchObject({ type: 'simulation' });
  await expect(f.course.saveModuleMission(owner, syllabusId, moduleId, missionPayload())).rejects.toMatchObject({ status: 400 });
});

test('a draft PDF permits authoring and never blocks the student simulation', async () => {
  const reading = await pdf('Draft reading', { published: false });
  const simulation = await link();
  expect((await f.course.course(student, syllabusId)).simulationAccess[moduleId].documents).toHaveLength(0);
  await expect(f.course.launch(student, simulation.id)).resolves.toMatchObject({ type: 'simulation' });
  await f.course.save(owner, null, null, reading.id, { type: 'pdf', title: 'Published reading', published: true, revision: 1 }, null);
  await expect(f.course.launch(student, simulation.id)).resolves.toMatchObject({ type: 'simulation' });
});

test('all six lessons can start independently without previous results or PDF views', async () => {
  const ids = [];
  for (let number = 1; number <= 6; number++) {
    const { id: lessonId } = await f.service.save(owner, 'syllabus_modules', null, { title: `Lesson ${number}`, moduleNumber: number + 2 }, coursePdf(), syllabusId);
    const { id } = await f.course.save(owner, syllabusId, lessonId, null, { type: 'simulation', targetId: 'existing', title: `Mission ${number}`, published: true }, null);
    ids.push(id);
  }
  for (const id of ids.reverse()) await request(f.app).post(`/learning-materials/activities/${id}/launch`).set(headers()).expect(200);
  expect(Object.values(f.records.learning_activity_progress).every(item => !item.viewedAt)).toBe(true);
  expect(Object.keys(f.records.mission_score || {})).toHaveLength(0);
});

test('creation rechecks the PDF inside the transaction when an instructor removes it during saving', async () => {
  const reading = await pdf();
  f.state.beforeCommit = () => { f.records.learning_activities[reading.id].status = 'deleting'; };
  await expect(f.course.saveModuleMission(owner, syllabusId, moduleId, missionPayload())).rejects.toMatchObject({ status: 400 });
  expect(f.records.missions['new-mission']).toBeUndefined();
});
