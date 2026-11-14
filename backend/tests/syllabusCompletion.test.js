import { beforeEach, expect, test } from '@jest/globals';
import request from 'supertest';
import { materialsFixture, samplePdf } from './helpers/materialsFixture.js';
import { issueSession } from '../services/authSession.js';
import { OFFICIAL_SYLLABUS, OFFICIAL_SYLLABUS_KEY } from '../../shared/officialSyllabus.js';
import { attachModulePdf, viewModulePdf } from './helpers/coursePdf.js';
const owner = { id: 'a', role: 'instructor' }, student = { id: 'sa', role: 'student', instructorid: 'a' };
const headers = (id = 'sa', role = 'student') => ({ Authorization: `Bearer ${issueSession(id, role)}` });
const upload = { originalname: 'syllabus.pdf', mimetype: 'application/pdf', buffer: samplePdf() };
const completed = { objectivesComplete: true, completedSteps: 3, totalSteps: 3, anchored: true, engineStopped: true, inPort: true, speedKnots: 0 };
const scores = { steering: 90, course: 80, docking: 70, time: 100, safety: 90 };
let f, syllabusId, moduleId, activityId, quizOptions;
beforeEach(async () => {
  f = materialsFixture({
    saveMissionResult: async data => {
      f.records.mission_score ||= {}; const previous = f.records.mission_score.saved;
      if (previous?.passed) return { data: previous, skipped: true, xpAwarded: 0 };
      f.records.mission_score.saved = data; return { data, scoreId: 'saved', xpAwarded: data.passed ? 100 : 0, totalXp: 100 };
    },
    saveQuizResult: async (data, options) => { quizOptions = options; f.records.quiz_score ||= {}; const previous = f.records.quiz_score.saved; if (previous) return { data: previous, skipped: true, scoreId: 'saved' }; f.records.quiz_score.saved = data; return { data, scoreId: 'saved' }; }
  });
  ({ id: syllabusId } = await f.service.save(owner, 'syllabi', null, { title: OFFICIAL_SYLLABUS.title, officialSyllabusKey: OFFICIAL_SYLLABUS_KEY }, upload));
  moduleId = `${syllabusId}--lesson-3`;
  await attachModulePdf(f, owner, moduleId);
  await viewModulePdf(f, student, moduleId);
  f.records.missions = { navigation: { title: 'Route practice', instructorId: 'a', pass_score: 70 } };
  f.records.quiz = { q: { title: 'Navigation quiz', moduleId: 'navigation', instructorId: 'a', published: true, questions: [{ id: 'one', type: 'true-false', correctAnswer: 'True' }, { id: 'two', type: 'multiple-choice', options: [{ text: 'Starboard', isCorrect: true }, { text: 'Port', isCorrect: false }] }] } };
  ({ id: activityId } = await f.course.save(owner, syllabusId, moduleId, null, { title: 'Practical navigation', type: 'simulation', targetId: 'navigation', published: true }, null));
});
const complete = (patch = {}) => request(f.app).post(`/learning-materials/activities/${activityId}/complete-simulation`).set(headers()).send({ scores, completion: completed, ...patch });
test('official course creation uses existing collections and the exact syllabus section order', async () => {
  const course = await f.course.course(student, syllabusId);
  expect(course.modules.map(m => m.title)).toEqual(OFFICIAL_SYLLABUS.sections.map(s => s.title)); expect(course.modules).toHaveLength(8);
  expect(course.official.outcomes).toEqual(OFFICIAL_SYLLABUS.outcomes); expect(course.official.grading).toMatchObject({ summativeAssessments: 60, performanceTasksWrittenOutputs: 40 });
  expect(f.records.training_modules.untouched).toEqual({ title: 'Simulation' });
});
test('instructors can edit their notes but cannot overwrite official titles, ordering or schedule', async () => {
  const record = f.records.syllabus_modules[moduleId];
  await expect(f.service.save(owner, 'syllabus_modules', moduleId, { title: 'Invented lesson', moduleNumber: 3, revision: record.revision }, null)).rejects.toMatchObject({ status: 400 });
  await f.service.save(owner, 'syllabus_modules', moduleId, { title: record.title, moduleNumber: record.moduleNumber, revision: record.revision, description: 'Instructor note' }, null);
  expect(f.records.syllabus_modules[moduleId].description).toBe('Instructor note');
  await expect(f.service.reorder(owner, syllabusId, { ids: [], revision: f.records.syllabi[syllabusId].revision })).rejects.toMatchObject({ status: 400 });
});
test('mission quiz endpoint rejects requests before actual objective and docking completion', async () => {
  await request(f.app).get(`/learning-materials/activities/${activityId}/mission-quiz`).set(headers()).expect(409);
  for (const patch of [{ objectivesComplete: false }, { completedSteps: 1 }, { inPort: false }, { anchored: false }, { engineStopped: false }, { speedKnots: 3 }]) await complete({ completion: { ...completed, ...patch } }).expect(409);
  expect(f.records.mission_score).toBeUndefined();
});
test('completion binds the current student and exact mission while preserving simulation and quiz scores separately', async () => {
  const saved = await complete({ studentId: 'sb', score: 100 }).expect(200);
  expect(saved.body.data).toMatchObject({ studentId: 'sa', missionId: 'navigation', lessonId: moduleId, score: 90, scoringVersion: 'simulation-v2', performanceMetrics: { objectiveCompletion: 100, taskAccuracy: 80, safetyCompliance: 90 } });
  const quiz = await request(f.app).get(`/learning-materials/activities/${activityId}/mission-quiz`).set(headers()).expect(200); expect(quiz.body.quiz.id).toBe('q');
  expect(quiz.body.quiz.questions[0]).not.toHaveProperty('correctAnswer');
  expect(quiz.body.quiz.questions[1].options[0]).not.toHaveProperty('isCorrect');
  const submitted = await request(f.app).post(`/learning-materials/activities/${activityId}/mission-quiz`).set(headers()).send({ quizId: 'q', answers: { one: 'False', two: 'Starboard' }, studentId: 'sb', score: 100 }).expect(200);
  expect(submitted.body.data).toMatchObject({ studentId: 'sa', missionId: 'navigation', score: 50, 'raw-score': 1 }); expect(quizOptions).toEqual({ allowAfterSimulation: true });
  expect(f.records.mission_score.saved.score).toBe(90);
});
test('published lessons never expose standalone quiz activities', async () => {
  await f.course.save(owner, syllabusId, moduleId, null, { type: 'quiz', title: 'Legacy quiz', targetId: 'q', published: true }, null);
  const course = await f.course.course(student, syllabusId); expect(course.activities.map(a => a.type)).toEqual(['simulation']);
  const legacy = (await f.course.course(owner, syllabusId)).activities.find(a => a.type === 'quiz');
  await request(f.app).post(`/learning-materials/activities/${legacy.id}/launch`).set(headers()).expect(409);
});
test('no assignment and unpublished quizzes skip the quiz without writing a zero score', async () => {
  await complete().expect(200); f.records.quiz.q.published = false;
  let result = await request(f.app).get(`/learning-materials/activities/${activityId}/mission-quiz`).set(headers()).expect(200);
  expect(result.body.quiz).toBeNull(); expect(f.records.quiz_score).toBeUndefined(); expect(result.body.simulation.score).toBe(90);
  delete f.records.quiz.q;
  result = await request(f.app).get(`/learning-materials/activities/${activityId}/mission-quiz`).set(headers()).expect(200); expect(result.body.quiz).toBeNull();
});
test('quiz query failure is an error and never discards the persisted simulation', async () => {
  await complete().expect(200); const original = f.db.collection;
  f.db.collection = name => { if (name === 'quiz') throw new Error('Quiz database offline'); return original(name); };
  await request(f.app).get(`/learning-materials/activities/${activityId}/mission-quiz`).set(headers()).expect(503); expect(f.records.mission_score.saved.score).toBe(90);
  f.db.collection = original; await request(f.app).get(`/learning-materials/activities/${activityId}/mission-quiz`).set(headers()).expect(200);
});
test('repeated completion and quiz submission preserve the first saved pass/quiz and avoid new rewards', async () => {
  await complete().expect(200); const again = await complete({ scores: { ...scores, steering: 0 } }).expect(200); expect(again.body.skipped).toBe(true); expect(again.body.xpAwarded).toBe(0);
  const path = `/learning-materials/activities/${activityId}/mission-quiz`;
  await request(f.app).post(path).set(headers()).send({ quizId: 'q', answers: { one: 'True', two: 'Starboard' } }).expect(200);
  const repeat = await request(f.app).post(path).set(headers()).send({ quizId: 'q', answers: { one: 'False', two: 'Port' } }).expect(200); expect(repeat.body.skipped).toBe(true); expect(repeat.body.data.score).toBe(100);
});
test('foreign classes and instructors cannot complete or submit a student practical', async () => {
  const path = `/learning-materials/activities/${activityId}`;
  await request(f.app).post(path + '/complete-simulation').set(headers('sb')).send({ scores, completion: completed }).expect(404);
  await request(f.app).post(path + '/complete-simulation').set(headers('a', 'instructor')).send({ scores, completion: completed }).expect(403);
});

test('assigned vessel exercises require a resolved summary matching the saved mission configuration', async () => {
  f.records.missions.navigation.encounter = { type: 'crossing-red', clearance: 100, warningDistance: 600 };
  await complete().expect(409);
  const result = { type: 'crossing-red', resolved: true, successful: true, collision: false, minimumClearance: 140, accuracy: 100 };
  for (const patch of [{ resolved: false }, { type: 'anchored' }, { minimumClearance: 50 }, { collision: true }]) {
    await complete({ encounter: { ...result, ...patch } }).expect(409);
  }
  expect(f.records.mission_score).toBeUndefined();
  const saved = await complete({ scores: { completion: 1, accuracy: 80, safety: 90 }, encounter: result }).expect(200);
  expect(saved.body.data.performanceMetrics.objectiveCompletion).toBe(100);
  expect(saved.body.data.encounter).toMatchObject(result);
  expect(saved.body.data.score).toBe(90);
});

test('a vessel collision or failed required clearance cannot earn a pass or XP despite high submitted marks', async () => {
  f.records.missions.navigation.encounter = { type: 'anchored', clearance: 100, warningDistance: 600 };
  const result = { type: 'anchored', resolved: true, successful: false, collision: true, minimumClearance: 0, accuracy: 0 };
  let saved = await complete({ scores: { completion: 100, accuracy: 100, safety: 100 }, encounter: result }).expect(200);
  expect(saved.body.data.passed).toBe(false); expect(saved.body.xpAwarded).toBe(0);
  expect(saved.body.data.performanceMetrics.safetyCompliance).toBe(0);
  expect(saved.body.data.criticalSafetyFailure).toBe(true);
  saved = await complete({ scores: { accuracy: 100, safety: 100 }, encounter: { ...result, collision: false, minimumClearance: 70 } }).expect(200);
  expect(saved.body.data.passed).toBe(false); expect(saved.body.data.requiredExerciseFailed).toBe(true);
});

test('missing assessed performance cannot be turned into assumed perfect marks', async () => {
  await complete({ scores: { accuracy: null, completion: 100, safety: 100 } }).expect(409);
  expect(f.records.mission_score).toBeUndefined();
});

test('a clear passing distance does not excuse the wrong required give-way response', async () => {
  f.records.missions.navigation.encounter = { type: 'crossing-red', clearance: 100, warningDistance: 600 };
  const encounter = { type: 'crossing-red', resolved: true, successful: true, collision: false, minimumClearance: 180, accuracy: 50 };
  const saved = await complete({ scores: { accuracy: 100, safety: 100 }, encounter }).expect(200);
  expect(saved.body.data.requiredExerciseFailed).toBe(true);
  expect(saved.body.data.passed).toBe(false); expect(saved.body.xpAwarded).toBe(0);
  expect(saved.body.data.performanceMetrics.objectiveCompletion).toBe(75);
});
