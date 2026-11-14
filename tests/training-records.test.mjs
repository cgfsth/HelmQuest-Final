import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as Vue from 'vue';
import { compile } from '@vue/compiler-dom';
import { renderToString } from '@vue/server-renderer';
import { restoreSavedMissionResults, getLatestMissionResult } from '../src/helpers/progressStore.js';

const source = readFileSync(new URL('../src/App.vue', import.meta.url), 'utf8').replace(/\r\n/g, '\n');
const stateStart = source.indexOf('// Firestore Training Records Data');
const stateEnd = source.indexOf('// --- Constants ---', stateStart);
const fetchStart = source.indexOf('async function fetchStudentTrainingRecords()');
const fetchEnd = source.indexOf('/**\n * Check if mission is available', fetchStart);
const panelStart = source.indexOf('<div v-show="trainingRecordsTab === \'quizzes\'"');
const panelEnd = source.indexOf('\n              </div>', panelStart);
const { code } = compile(source.slice(panelStart, panelEnd), { mode: 'function', prefixIdentifiers: true });
const render = new Function('Vue', code)(Vue);
const missionPanelStart = source.indexOf('<div v-show="trainingRecordsTab === \'missions\'"');
const missionPanelEnd = source.indexOf('<!-- Quiz Results Tab -->', missionPanelStart);
const missionRender = new Function('Vue', compile(source.slice(missionPanelStart, missionPanelEnd), { mode: 'function', prefixIdentifiers: true }).code)(Vue);
const mission = { id: 'CUSTOM-custom-mission-1', moduleId: 'custom-mission-1', title: 'Saved mission', passScore: 50 };
const module = { id: mission.moduleId, title: mission.title, difficulty: 'Beginner', steps: [], xpReward: 100 };

function page(api) {
  const dependencies = { ref: Vue.ref, watch: Vue.watch, currentUser: Vue.ref({ id: 'student' }),
    userRole: Vue.ref('student'), activeScreen: Vue.ref('landing'), window: { firebaseApi: api },
    restoreSavedMissionResults, progressData: Vue.ref({ sessions: [], completedModules: {} }),
    getLatestMissionResult, getMissionsForModule: () => [mission], trainingModules: Vue.ref([module]),
    isMissionLocked: () => false,
    console: { error() {} } };
  const scope = Vue.effectScope();
  const bindings = scope.run(() => new Function(...Object.keys(dependencies), `${source.slice(stateStart, stateEnd)}
    ${source.slice(fetchStart, fetchEnd)}
    return { firestoreMissionScores, firestoreQuizSubmissions, loadingTrainingRecords,
      missionRecordsError, quizRecordsError, trainingRecordsTab, fetchStudentTrainingRecords };`)(...Object.values(dependencies)));
  return { ...dependencies, ...bindings, scope,
    recordsHtml: () => renderToString(Vue.createSSRApp({ render: missionRender, setup: () => ({ ...bindings,
      formatCertificateDate: value => value || '', getScoreClass: value => value >= 80 ? 'score-excellent' : 'score-poor' }) })),
    html: () => renderToString(Vue.createSSRApp({ render, setup: () => ({ ...bindings,
      formatCertificateDate: value => value || '', getScoreClass: value => value >= 80 ? 'score-excellent' : 'score-poor' }) })) };
}
const quiz = { id: 'saved', quizTitle: 'Saved quiz', 'Quiz-score-percentage': 0, 'raw-score': 0,
  score: 100, correctCount: 9, totalQuestions: 10, submittedAt: '2026-10-06T13:49:23.474Z' };

test('actual quiz panel loads saved results and preserves a zero score and correct count', async () => {
  const view = page({ getMissionScores: async () => ({ scores: [] }), getQuizScores: async () => ({ scores: [quiz] }) });
  try {
    await view.fetchStudentTrainingRecords();
    view.trainingRecordsTab.value = 'quizzes';
    const html = await view.html();
    assert.match(html, /Saved quiz/);
    assert.match(html, /2026-10-06T13:49:23.474Z/);
    assert.match(html, /score-poor/);
    assert.match(html, /0\/10/);
    assert.doesNotMatch(html, /No quiz results yet/);
  } finally { view.scope.stop(); }
});

test('mission loading failure does not prevent saved quizzes from appearing', async () => {
  const view = page({ getMissionScores: async () => { throw new Error('Offline'); }, getQuizScores: async () => ({ scores: [quiz] }) });
  try {
    await view.fetchStudentTrainingRecords();
    assert.match(view.missionRecordsError.value, /Unable to load/);
    assert.equal(view.quizRecordsError.value, '');
    assert.equal(view.firestoreQuizSubmissions.value.length, 1);
    assert.match(await view.html(), /Saved quiz/);
    assert.equal(view.loadingTrainingRecords.value, false);
  } finally { view.scope.stop(); }
});

test('quiz failure shows an error and retry rather than claiming the history is empty', async () => {
  let offline = true;
  const view = page({ getMissionScores: async () => ({ scores: [{ id: 'mission' }] }), getQuizScores: async () => {
    if (offline) throw new Error('Missing index');
    return { scores: [quiz] };
  } });
  try {
    await view.fetchStudentTrainingRecords();
    assert.equal(view.firestoreMissionScores.value.length, 1);
    const html = await view.html();
    assert.match(html, /Unable to load your quiz results/);
    assert.match(html, /Try again/);
    assert.doesNotMatch(html, /No quiz results yet/);
    offline = false;
    await view.fetchStudentTrainingRecords();
    assert.equal(view.quizRecordsError.value, '');
    assert.match(await view.html(), /Saved quiz/);
  } finally { view.scope.stop(); }
});

test('a successful empty response displays the quiz empty state', async () => {
  const view = page({ getMissionScores: async () => ({ scores: [] }), getQuizScores: async () => ({ scores: [] }) });
  try {
    await view.fetchStudentTrainingRecords();
    assert.match(await view.html(), /No quiz results yet/);
    assert.equal(view.quizRecordsError.value, '');
  } finally { view.scope.stop(); }
});

test('changing student clears old records and ignores their delayed response', async () => {
  let resolveOld;
  const view = page({ getMissionScores: async () => ({ scores: [] }), getQuizScores: id => id === 'student'
    ? new Promise(resolve => { resolveOld = resolve; }) : Promise.resolve({ scores: [{ ...quiz, id: 'other' }] }) });
  try {
    const oldRequest = view.fetchStudentTrainingRecords();
    await Promise.resolve();
    view.currentUser.value = { id: 'other-student' };
    await Vue.nextTick();
    assert.equal(view.firestoreQuizSubmissions.value.length, 0);
    await view.fetchStudentTrainingRecords();
    resolveOld({ scores: [quiz] });
    await oldRequest;
    assert.equal(view.firestoreQuizSubmissions.value[0].id, 'other');
    assert.equal(view.loadingTrainingRecords.value, false);
  } finally { view.scope.stop(); }
});

test('reopening Training Records requests fresh results', () => {
  let requests = 0;
  const hubTab = Vue.ref('overview');
  const start = source.indexOf('function selectHubTab(tab)');
  const end = source.indexOf('function selectInstructorTab(tab)', start);
  const select = new Function('hubTab', 'fetchStudentTrainingRecords', 'fetchLeaderboardData', 'maybeAutoCollapseSidebar', 'loadMissionDatesFromFirestore',
    `${source.slice(start, end)} return selectHubTab;`)(hubTab, () => requests++, () => {}, () => {}, () => {});
  select('certificates');
  select('overview');
  select('certificates');
  assert.equal(requests, 2);
  select('missions');
  assert.equal(requests, 3);
});

test('a fresh browser retains the saved mission result in Training Records after mission navigation is removed', async () => {
  const saved = { studentId: 'student', missionId: mission.id, score: 80, passed: true, completedAt: '2026-10-05T04:55:20Z' };
  const view = page({ getMissionScores: async () => ({ scores: [saved] }), getQuizScores: async () => ({ scores: [] }) });
  try {
    assert.equal(view.progressData.value.sessions.length, 0);
    await view.fetchStudentTrainingRecords();
    const html = await view.recordsHtml();
    assert.match(html, /80%/);
    assert.match(html, /2026-10-05T04:55:20Z/);
    assert.doesNotMatch(html, />\s*Start/);
    assert.deepEqual(view.progressData.value.completedModules.student, [module.id]);
  } finally { view.scope.stop(); }
});

test('saved failures remain visible in Results and replace stale browser completion', async () => {
  const scores = [
    { missionId: module.id, score: 20, passed: false, completedAt: '2026-10-05T02:00:00Z' },
    { missionId: mission.id, score: 40, passed: false, completedAt: '2026-10-05T03:00:00Z' }
  ];
  const view = page({ getMissionScores: async () => ({ scores }), getQuizScores: async () => ({ scores: [] }) });
  try {
    view.progressData.value.sessions = [{ studentId: 'student', missionId: mission.id, score: 100, passed: true }];
    await view.fetchStudentTrainingRecords();
    const html = await view.recordsHtml();
    assert.match(html, /40%/);
    assert.equal(getLatestMissionResult('student', mission.id, view.progressData.value).score, 40);
    assert.doesNotMatch(html, /Mission passed|Practice review/);
    assert.equal(view.progressData.value.sessions.length, 1);
    assert.deepEqual(view.progressData.value.completedModules.student, []);
  } finally { view.scope.stop(); }
});

test('repeated refresh keeps the earned pass across aliases and does not change XP or other students', async () => {
  const scores = [
    { id: 'pass', missionId: module.id, score: 80, passed: true, completedAt: '2026-10-05T02:00:00Z' },
    { id: 'fail', missionId: mission.id, score: 20, passed: false, completedAt: '2026-10-06T03:00:00Z' }
  ];
  const view = page({ getMissionScores: async () => ({ scores }), getQuizScores: async () => ({ scores: [] }) });
  try {
    const other = { studentId: 'other', missionId: 'other-mission', score: 90, passed: true };
    view.progressData.value.sessions = [other];
    view.progressData.value.studentProfiles = { student: { xp: 110 } };
    view.progressData.value.completedModules.other = ['other-module'];
    await view.fetchStudentTrainingRecords();
    const before = JSON.stringify(view.progressData.value);
    await view.fetchStudentTrainingRecords();
    assert.equal(JSON.stringify(view.progressData.value), before);
    assert.equal(view.progressData.value.sessions.length, 2);
    assert.equal(view.progressData.value.studentProfiles.student.xp, 110);
    assert.deepEqual(view.progressData.value.completedModules.other, ['other-module']);
    assert.match(await view.recordsHtml(), /80%/);
  } finally { view.scope.stop(); }
});

test('a failed mission fetch keeps existing progress and shows an error; an authoritative empty response clears it', async () => {
  let offline = true;
  const view = page({ getMissionScores: async () => {
    if (offline) throw new Error('Offline');
    return { scores: [] };
  }, getQuizScores: async () => ({ scores: [] }) });
  try {
    view.progressData.value.sessions = [{ studentId: 'student', missionId: mission.id, score: 80, passed: true }];
    await view.fetchStudentTrainingRecords();
    assert.equal(getLatestMissionResult('student', mission.id, view.progressData.value).passed, true);
    assert.match(view.missionRecordsError.value, /Unable to load/);
    offline = false;
    await view.fetchStudentTrainingRecords();
    assert.match(await view.recordsHtml(), /No completed missions yet/);
    assert.equal(view.progressData.value.sessions.length, 0);
  } finally { view.scope.stop(); }
});
