import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { ref } from 'vue';
import { canViewMission, missionOwner } from '../shared/missionAccess.js';
import { getCourseSettings } from '../src/helpers/courseSettings.js';
import { loginInstructor, loginStudent, getAllMissions, clearSession } from '../src/api/firebaseApi.js';

const source = readFileSync(new URL('../src/App.vue', import.meta.url), 'utf8').replace(/\r\n/g, '\n');
const savedSource = source.slice(source.indexOf('function applySavedLevelCreator()'), source.indexOf('/**\n * Open the mission editor modal'));
const catalogSource = source.slice(source.indexOf('let missionCatalogRequest = 0;'), source.indexOf('/**\n * Cheap accessor for the module'));
const ma = { id: 'ma', createdBy: 'a', mission_title: 'Class A' };
const mb = { id: 'mb', instructorId: 'b', mission_title: 'Class B' };

function page(api, viewer = { id: 'a' }, role = 'instructor') {
  const dependencies = {
    currentUser: ref(viewer), userRole: ref(role), isAuthenticated: ref(true),
    trainingModules: ref([ma, mb, { id: 'unknown' }]),
    progressData: ref({ courseSettings: { customMissions: [ma, mb, { id: 'unknown' }], moduleOrder: ['ma', 'mb', 'unknown'] } }),
    window: { firebaseApi: api }, canViewMission, missionOwner, getCourseSettings,
    ensureMissionBuoySteps() {}, saveProgress() {}, levelCreator: ref({}),
    console: { log() {}, warn() {}, error() {} }
  };
  const functions = new Function(...Object.keys(dependencies), `${savedSource}\n${catalogSource}
    return { applySavedLevelCreator, loadMissionDatesFromFirestore };`)(...Object.values(dependencies));
  return { ...dependencies, ...functions };
}

test('restoring browser missions shows only the current instructor\'s missions or their assigned student\'s missions', () => {
  for (const [viewer, role, expected] of [
    [{ id: 'a' }, 'instructor', ['ma']], [{ id: 'b' }, 'instructor', ['mb']],
    [{ id: 'sa', instructorid: 'a' }, 'student', ['ma']],
    [{ id: 'sb', instructorId: 'b' }, 'student', ['mb']], [{ id: 'unassigned' }, 'student', []]
  ]) {
    const view = page({}, viewer, role);
    view.applySavedLevelCreator();
    assert.deepEqual(view.trainingModules.value.map(mission => mission.id), expected);
  }
});

test('remote loading filters foreign missions and preserves ownership in the local cache', async () => {
  const view = page({ getAllMissions: async () => ({ missions: [ma, mb, { id: 'unknown' }] }) });
  await view.loadMissionDatesFromFirestore();
  assert.deepEqual(view.trainingModules.value.map(mission => mission.id), ['ma']);
  assert.equal(view.trainingModules.value[0].instructorId, 'a');
  assert.deepEqual(view.progressData.value.courseSettings.moduleOrder, ['ma']);
  assert.deepEqual(view.progressData.value.courseSettings.customMissions.map(mission => mission.id), ['ma']);
  view.currentUser.value = { id: 'b' };
  view.applySavedLevelCreator();
  assert.deepEqual(view.trainingModules.value, []);
  await view.loadMissionDatesFromFirestore();
  assert.deepEqual(view.trainingModules.value.map(mission => mission.id), ['mb']);
});

test('a delayed response from the previous instructor cannot replace the current class', async () => {
  let release;
  let calls = 0;
  const view = page({ getAllMissions: () => ++calls === 1
    ? new Promise(resolve => { release = resolve; }) : Promise.resolve({ missions: [mb] }) });
  const oldRequest = view.loadMissionDatesFromFirestore();
  view.currentUser.value = { id: 'b' };
  view.applySavedLevelCreator();
  await view.loadMissionDatesFromFirestore();
  release({ missions: [ma] });
  await oldRequest;
  assert.deepEqual(view.trainingModules.value.map(mission => mission.id), ['mb']);
  assert.deepEqual(view.progressData.value.courseSettings.customMissions.map(mission => mission.id), ['mb']);
});

test('signed-out users do not restore cached missions or make a catalog request', async () => {
  let called = false;
  const view = page({ getAllMissions: async () => { called = true; } });
  view.isAuthenticated.value = false;
  view.applySavedLevelCreator();
  await view.loadMissionDatesFromFirestore();
  assert.deepEqual(view.trainingModules.value, []);
  assert.equal(called, false);
});

test('login passes the server-issued session on mission requests and clears it on logout or failed account switch', async () => {
  const originalFetch = globalThis.fetch;
  const originalError = console.error;
  const requests = [];
  let fail = false;
  globalThis.fetch = async (url, options) => {
    requests.push({ url, headers: options.headers });
    if (url.endsWith('/instructor-login') || url.endsWith('/students/login')) {
      return { ok: !fail, json: async () => fail ? { message: 'Invalid credentials' } : { sessionToken: 'signed-session' } };
    }
    return { ok: true, json: async () => ({ missions: [] }) };
  };
  console.error = () => {};
  try {
    await loginInstructor('a@example.com', 'password');
    await getAllMissions();
    assert.equal(requests.at(-1).headers.Authorization, 'Bearer signed-session');
    clearSession();
    await getAllMissions();
    assert.equal(requests.at(-1).headers.Authorization, undefined);
    await loginStudent('sa@example.com', 'password');
    fail = true;
    await assert.rejects(loginInstructor('b@example.com', 'wrong'));
    await getAllMissions();
    assert.equal(requests.at(-1).headers.Authorization, undefined);
  } finally {
    clearSession();
    globalThis.fetch = originalFetch;
    console.error = originalError;
  }
});
