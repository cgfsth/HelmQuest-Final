import { beforeEach, expect, test } from '@jest/globals';
import request from 'supertest';
import { materialsFixture, samplePdf } from './helpers/materialsFixture.js';
import { issueSession } from '../services/authSession.js';
import { viewModulePdf } from './helpers/coursePdf.js';

const owner = { id: 'a', role: 'instructor' }, student = { id: 'sa', role: 'student', instructorid: 'a' };
const file = { originalname: 'syllabus.pdf', mimetype: 'application/pdf', buffer: samplePdf() };
const headers = (id = 'a', role = 'instructor') => ({ Authorization: `Bearer ${issueSession(id, role)}` });
const payload = (extra = {}) => ({ missionId: 'module-mission', published: true, mission: {
  mission_title: 'Harbor Navigation', description: 'Navigate and dock.', estimated_duration: '10 minutes',
  xp_reward: 100, pass_score: 70, required_boat: 'medium', difficulty: 'Beginner', learning_objectives: ['Navigate safely'],
  bouy: [{ checkpoint_id: 'harbor-buoy', bouy_description: 'Inspect buoy' }], steps: [{ type: 'dock', instruction: 'Dock safely' }], ...extra } });
let f, syllabusId, moduleId, otherModule;
beforeEach(async () => {
  f = materialsFixture();
  ({ id: syllabusId } = await f.service.save(owner, 'syllabi', null, { title: 'Navigation' }, file));
  ({ id: moduleId } = await f.service.save(owner, 'syllabus_modules', null, { title: 'Harbor', moduleNumber: 1 }, file, syllabusId));
  ({ id: otherModule } = await f.service.save(owner, 'syllabus_modules', null, { title: 'Offshore', moduleNumber: 2 }, null, syllabusId));
});
const endpoint = () => `/learning-materials/syllabi/${syllabusId}/modules/${moduleId}/missions`;

test('module creation atomically creates the owned mission and a published practical in exactly the chosen module', async () => {
  const result = await request(f.app).post(endpoint()).set(headers()).send(payload()).expect(200);
  expect(f.records.missions['module-mission'].instructorId).toBe('a');
  expect(f.records.missions['module-mission'].syllabusModuleId).toBe(moduleId);
  const course = await f.course.course(student, syllabusId);
  expect(course.activities).toHaveLength(1);
  expect(course.activities[0]).toMatchObject({ id: result.body.activityId, moduleId, type: 'simulation', targetId: 'module-mission', published: true });
  expect(course.activities.filter(a => a.moduleId === otherModule)).toHaveLength(0);
  await viewModulePdf(f, student, moduleId);
  expect((await f.course.launch(student, result.body.activityId)).target.id).toBe('module-mission');
});

test('foreign instructors, students and modules from another syllabus cannot create missions', async () => {
  await request(f.app).post(endpoint()).send(payload()).expect(401);
  await request(f.app).post(endpoint()).set(headers('sa', 'student')).send(payload()).expect(403);
  await request(f.app).post(endpoint()).set(headers('b')).send(payload()).expect(404);
  const other = await f.service.save(owner, 'syllabi', null, { title: 'Other syllabus' }, file);
  await expect(f.course.saveModuleMission(owner, other.id, moduleId, payload())).rejects.toMatchObject({ status: 404 });
  expect(Object.keys(f.records.missions || {})).toHaveLength(0);
});

test('database failure leaves neither an orphan mission nor a detached activity; a lost response retries without duplicates', async () => {
  f.state.failCommit = true;
  await expect(f.course.saveModuleMission(owner, syllabusId, moduleId, payload())).rejects.toThrow();
  expect(Object.keys(f.records.missions || {})).toHaveLength(0); expect(Object.keys(f.records.learning_activities || {})).toHaveLength(0);
  f.state.failCommit = false; f.state.loseCommitAcknowledgement = true;
  await expect(f.course.saveModuleMission(owner, syllabusId, moduleId, payload())).rejects.toThrow();
  const saved = await f.course.saveModuleMission(owner, syllabusId, moduleId, payload());
  expect(saved.revision).toBe(1);
  expect(Object.keys(f.records.missions)).toHaveLength(1); expect(Object.keys(f.records.learning_activities)).toHaveLength(1);
});

test('module edits update the same mission and activity, preserve quiz policy, and reject stale revisions', async () => {
  const saved = await f.course.saveModuleMission(owner, syllabusId, moduleId, payload());
  f.records.learning_activities[saved.activityId].quizPolicy = 'none';
  const change = { ...payload({ mission_title: 'Revised harbor' }), activityId: saved.activityId, revision: 1, published: false };
  const updated = await f.course.saveModuleMission(owner, syllabusId, moduleId, change);
  expect(updated.activityId).toBe(saved.activityId); expect(updated.revision).toBe(2);
  expect(f.records.missions['module-mission'].mission_title).toBe('Revised harbor');
  expect(f.records.learning_activities[saved.activityId].quizPolicy).toBe('none');
  expect((await f.course.course(student, syllabusId)).activities).toHaveLength(0);
  await expect(f.course.saveModuleMission(owner, syllabusId, moduleId, change)).rejects.toMatchObject({ status: 409 });
});

test('invalid checkpoint and date settings never create a mission', async () => {
  for (const data of [payload({ bouy: [] }), payload({ opendate: 'invalid' }), payload({ opendate: '2026-12-01', deadline: '2026-11-01' })]) {
    await request(f.app).post(endpoint()).set(headers()).send(data).expect(400);
  }
  expect(Object.keys(f.records.missions || {})).toHaveLength(0);
});

test('module missions preserve vessel exercise settings and reject invalid distance margins', async () => {
  const encounter = { type: 'crossing-green', clearance: 120, warningDistance: 720 };
  await request(f.app).post(endpoint()).set(headers()).send(payload({ encounter })).expect(200);
  expect(f.records.missions['module-mission'].encounter).toEqual(encounter);
  const before = Object.keys(f.records.missions).length;
  for (const invalid of [{ type: 'bad' }, { type: 'anchored', clearance: -1 }, { type: 'crossing-red', clearance: 200, warningDistance: 300 }]) {
    await request(f.app).post(endpoint()).set(headers()).send({ ...payload({ encounter: invalid }), missionId: 'another' }).expect(400);
  }
  expect(Object.keys(f.records.missions)).toHaveLength(before);
});
