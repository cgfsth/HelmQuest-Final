import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { API_BASE_URL } from '../src/api/firebaseApi.js';
import { recordMissionSession, getLatestMissionResult, restoreSavedMissionResults } from '../src/helpers/progressStore.js';

const source = readFileSync(new URL('../src/App.vue', import.meta.url), 'utf8').replace(/\r\n/g, '\n');
function actualFunction(name, nextMarker, dependencies) {
  dependencies = { API_BASE_URL, ...dependencies };
  const start = source.indexOf(`async function ${name}(`);
  const end = source.indexOf(nextMarker, start);
  assert.ok(start >= 0 && end > start);
  return new Function(...Object.keys(dependencies), `${source.slice(start, end)}\nreturn ${name};`)(...Object.values(dependencies));
}
function progress() {
  return { sessions: [], completedModules: {} };
}
const session = { studentId: 'student', missionId: 'mission', moduleId: 'module',
  score: 20, passed: false, completedAt: '2026-10-06T00:00:00Z' };

test('local failed retries replace one record and retain the persisted completion timestamp', () => {
  const data = progress();
  const first = recordMissionSession(session, data);
  const retry = recordMissionSession({ ...session, score: 60, completedAt: '2026-10-06T01:00:00Z' }, data);
  assert.equal(first.id, retry.id);
  assert.equal(data.sessions.length, 1);
  assert.equal(retry.score, 60);
  assert.equal(retry.completedAt, '2026-10-06T01:00:00Z');
});

test('local passed result remains unchanged when a later practice run tries to save', () => {
  const data = progress();
  recordMissionSession({ ...session, score: 85, passed: true }, data);
  const before = structuredClone(data);
  recordMissionSession({ ...session, score: 0, completedAt: '2026-10-08T00:00:00Z' }, data);
  assert.deepEqual(data, before);
});

test('legacy local duplicates prefer the earned pass over a newer failure', () => {
  const data = progress();
  data.sessions.push({ ...session, score: 85, passed: true },
    { ...session, completedAt: '2026-10-08T00:00:00Z' });
  assert.equal(getLatestMissionResult('student', 'mission', data).score, 85);
});

test('starting a mission after sign-in restores the database pass and enters practice review', async () => {
  const data = progress();
  const starts = [];
  const run = actualFunction('startMissionSimulation', 'const courseSettingsView = computed(', {
    currentUser: { value: { id: 'student', name: 'Student' } }, userRole: { value: 'student' },
    progressData: { value: data }, recordMissionSession,
    restoreSavedMissionResults, trainingModules: { value: [{ id: 'module' }] },
    getMissionsForModule: () => [{ id: 'mission', moduleId: 'module' }],
    getMissionResult: () => getLatestMissionResult('student', 'mission', data),
    fetch: async () => ({ ok: true, json: async () => ({ scores: [{ ...session, score: 85, passed: true }] }) }),
    startTrainingModule: (moduleId, options) => starts.push({ moduleId, options }),
    console: { log() {}, warn() {} }
  });
  await run({ id: 'mission', moduleId: 'module' });
  assert.equal(starts.length, 1);
  assert.equal(starts[0].options.review, true);
  assert.equal(data.sessions.length, 1);
  assert.equal(data.sessions[0].passed, true);
});

test('practice completion opens the saved report and quiz submission exits before saving', async () => {
  const reviews = [];
  const mission = actualFunction('openMissionCompleteModal', 'function openSavedMissionReport(', {
    activeMission: { value: { id: 'mission' } }, isTrainingReviewMode: { value: true },
    openSavedMissionReport: module => reviews.push(module.id)
  });
  await mission({ id: 'module' });
  assert.deepEqual(reviews, ['module']);
  // No quiz data, database client, or storage dependency is provided: touching
  // any save path would throw instead of returning from the review guard.
  const quiz = actualFunction('handlePostDockingQuizSubmit', 'function handleQuizResultsClose()', {
    isTrainingReviewMode: { value: true }
  });
  await quiz({});
});

test('an authoritative failed result replaces stale local completion so the student can retry', async () => {
  const data = progress();
  recordMissionSession({ ...session, score: 85, passed: true }, data);
  const starts = [];
  const run = actualFunction('startMissionSimulation', 'const courseSettingsView = computed(', {
    currentUser: { value: { id: 'student', name: 'Student' } }, userRole: { value: 'student' },
    progressData: { value: data }, recordMissionSession,
    restoreSavedMissionResults, trainingModules: { value: [{ id: 'module' }] },
    getMissionsForModule: () => [{ id: 'mission', moduleId: 'module' }],
    getMissionResult: () => getLatestMissionResult('student', 'mission', data),
    fetch: async () => ({ ok: true, json: async () => ({ scores: [session] }) }),
    startTrainingModule: (moduleId, options) => starts.push({ moduleId, options }),
    applyBoatTypePhysics() {}, activeBoatModelFile: { value: 'medium' },
    difficultyLevel: { value: 'Easy' }, saveProgress() {}, applyDifficultyEffects() {},
    console: { log() {}, warn() {} }
  });
  await run({ id: 'mission', moduleId: 'module' });
  assert.equal(starts.length, 1);
  assert.equal(starts[0].options.review, false);
  assert.equal(data.sessions.length, 1);
  assert.equal(data.sessions[0].passed, false);
});

test('mission startup reconciles CUSTOM aliases and an absent server result instead of keeping a stale practice pass', async () => {
  for (const scores of [[], [{ ...session, missionId: 'mission' }]]) {
    const data = progress();
    recordMissionSession({ ...session, missionId: 'CUSTOM-mission', score: 85, passed: true }, data);
    const starts = [];
    const mission = { id: 'CUSTOM-mission', moduleId: 'module' };
    const run = actualFunction('startMissionSimulation', 'const courseSettingsView = computed(', {
      currentUser: { value: { id: 'student' } }, userRole: { value: 'student' },
      progressData: { value: data }, restoreSavedMissionResults,
      trainingModules: { value: [{ id: 'module' }] }, getMissionsForModule: () => [mission],
      getMissionResult: () => getLatestMissionResult('student', mission.id, data),
      fetch: async () => ({ ok: true, json: async () => ({ scores }) }),
      startTrainingModule: (moduleId, options) => starts.push({ moduleId, options }),
      applyBoatTypePhysics() {}, activeBoatModelFile: { value: 'medium' }, difficultyLevel: { value: 'Easy' },
      saveProgress() {}, applyDifficultyEffects() {}, console: { log() {}, warn() {} }
    });
    await run(mission);
    assert.equal(starts[0].options.review, false);
    assert.equal(getLatestMissionResult('student', mission.id, data)?.passed ?? false, false);
  }
});
