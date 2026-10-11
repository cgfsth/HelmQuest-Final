import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as Vue from 'vue';
import { compile } from '@vue/compiler-dom';
import { renderToString } from '@vue/server-renderer';
import { findCompletedQuizSubmission, quizScoreCounts, restoreQuizSubmissions } from '../src/helpers/quizCompletion.js';

const source = readFileSync(new URL('../src/App.vue', import.meta.url), 'utf8').replace(/\r\n/g, '\n');
const quiz = { id: 'quiz', title: 'Mission quiz', questions: [
  { id: 'q1', type: 'multiple-choice', options: [{ text: 'Correct', isCorrect: true }, { text: 'Wrong' }] }
] };
const stored = { id: 'saved', studentId: 'student', moduleId: 'module', missionId: 'mission', quizId: 'quiz',
  'Quiz-score-percentage': 0, 'raw-score': 0, totalQuestions: 1, completedAt: '2026-10-10T00:00:00Z' };
function actualFunction(name) {
  const start = source.indexOf(`function ${name}(`);
  assert.ok(start >= 0);
  const prefix = source.slice(start - 6, start) === 'async ' ? start - 6 : start;
  return source.slice(prefix, source.indexOf('\n}', start) + 2);
}
const overlay = source.slice(source.indexOf('<!-- Take Quiz Button - CENTER OVERLAY'), source.indexOf('<!-- Sinking Crash Alarm Overlay'));
const render = new Function('Vue', compile(`<div>${overlay}</div>`, { mode: 'function', prefixIdentifiers: true }).code)(Vue);
function page(api = {}) {
  const alerts = [], notifications = [], reports = [];
  const deps = {
    ref: Vue.ref, computed: Vue.computed, watch: Vue.watch, nextTick: Vue.nextTick,
    findCompletedQuizSubmission, quizScoreCounts, restoreQuizSubmissions,
    currentUser: Vue.ref({ id: 'student' }), activeTrainingModule: Vue.ref({ id: 'module' }),
    activeMission: Vue.ref({ id: 'mission' }), isTrainingReviewMode: Vue.ref(false),
    progressData: Vue.ref({ quizSubmissions: [] }), anchor: Vue.ref({ deployed: true }),
    missionReadyToReport: Vue.ref(false), postDockingQuizTriggered: Vue.ref(false),
    missionCompleteModal: Vue.ref(null), engineRunning: Vue.ref(false),
    postDockingQuizData: Vue.ref(quiz), showPostDockingQuiz: Vue.ref(false),
    firebaseApi: { getQuizScores: async () => ({ scores: [] }), ...api },
    getQuizForModuleFromFirestore: async () => quiz, saveProgress() {},
    alert: message => alerts.push(message), showTrainingNotification: (...args) => notifications.push(args),
    console: { warn() {}, error() {}, log() {} },
    openSavedMissionReport: module => reports.push({ module, saved: true }),
    openMissionCompleteModal: module => reports.push({ module, saved: false }),
    trainingFeedback: Vue.ref(''), trainingRunMetrics: Vue.ref({}), window: { setTimeout: fn => fn() }
  };
  const state = source.slice(source.indexOf('const isPostDockingQuizSubmitting = ref('), source.indexOf('const showMissionBriefing = ref('));
  const scope = Vue.effectScope();
  const bindings = scope.run(() => new Function(...Object.keys(deps), `${state}
    ${['handlePostDockingQuizClose', 'handleTakeQuizClick', 'checkForPostDockingQuiz', 'handlePostDockingQuizSubmit', 'reportMissionCompletion'].map(actualFunction).join('\n')}
    return { activeMissionQuizSubmission, missionQuizLoading, missionQuizLoadError,
      isPostDockingQuizSubmitting, restoreMissionQuizCompletion, handleTakeQuizClick,
      checkForPostDockingQuiz, handlePostDockingQuizSubmit, reportMissionCompletion };`)(...Object.values(deps)));
  return { ...deps, ...bindings, alerts, notifications, reports, scope,
    html: () => renderToString(Vue.createSSRApp({ render, setup: () => ({ ...deps, ...bindings }) })) };
}

test('refresh restores a failed quiz and shows only Report Mission; redocking keeps the quiz completed', async () => {
  const view = page({ getQuizScores: async () => ({ scores: [stored] }) });
  try {
    await view.restoreMissionQuizCompletion();
    await Vue.nextTick();
    assert.equal(view.activeMissionQuizSubmission.value.score, 0);
    assert.deepEqual(quizScoreCounts(view.activeMissionQuizSubmission.value), { correct: 0, total: 1 });
    assert.equal(view.missionReadyToReport.value, true);
    const html = await view.html();
    assert.match(html, /Report Mission Completion/);
    assert.doesNotMatch(html.replace(/<!--[\s\S]*?-->/g, ''), /Take Quiz/);
    await view.handleTakeQuizClick();
    assert.equal(view.showPostDockingQuiz.value, false);
    view.anchor.value.deployed = false;
    view.missionReadyToReport.value = false;
    await Vue.nextTick();
    view.anchor.value.deployed = true;
    await Vue.nextTick();
    assert.equal(view.missionReadyToReport.value, true);
  } finally { view.scope.stop(); }
});

test('first attempt opens the quiz after checking persisted results', async () => {
  const view = page();
  try {
    await view.handleTakeQuizClick();
    assert.equal(view.showPostDockingQuiz.value, true);
    assert.equal(view.missionReadyToReport.value, false);
  } finally { view.scope.stop(); }
});

test('double tapping Submit sends one request and enables reporting only after saving', async () => {
  let resolveSave, calls = 0;
  const view = page({ saveQuizScore: () => { calls++; return new Promise(resolve => { resolveSave = resolve; }); } });
  try {
    view.showPostDockingQuiz.value = true;
    const first = view.handlePostDockingQuizSubmit({ q1: 'Wrong' });
    await view.handlePostDockingQuizSubmit({ q1: 'Correct' });
    assert.equal(calls, 1);
    assert.equal(view.isPostDockingQuizSubmitting.value, true);
    assert.equal(view.missionReadyToReport.value, false);
    assert.equal(view.progressData.value.quizSubmissions.length, 0);
    resolveSave({ data: stored, scoreId: 'saved', skipped: false });
    await first;
    assert.equal(view.isPostDockingQuizSubmitting.value, false);
    assert.equal(view.missionReadyToReport.value, true);
    assert.equal(view.showPostDockingQuiz.value, false);
    assert.equal(view.progressData.value.quizSubmissions.length, 1);
    view.postDockingQuizData.value = quiz;
    await view.handlePostDockingQuizSubmit({ q1: 'Correct' });
    assert.equal(calls, 1);
    assert.equal(view.activeMissionQuizSubmission.value.score, 0);
  } finally { view.scope.stop(); }
});

test('failed save preserves the open quiz and does not mark it completed', async () => {
  const view = page({ saveQuizScore: async () => { throw new Error('Offline'); } });
  try {
    view.showPostDockingQuiz.value = true;
    await view.handlePostDockingQuizSubmit({ q1: 'Correct' });
    assert.equal(view.showPostDockingQuiz.value, true);
    assert.equal(view.postDockingQuizData.value.id, 'quiz');
    assert.equal(view.activeMissionQuizSubmission.value, null);
    assert.equal(view.missionReadyToReport.value, false);
    assert.equal(view.isPostDockingQuizSubmitting.value, false);
    assert.equal(view.alerts.length, 1);
  } finally { view.scope.stop(); }
});

test('submission in another tab preserves its authoritative score and counts', async () => {
  const view = page({ saveQuizScore: async () => ({ data: stored, scoreId: stored.id, skipped: true }) });
  try {
    await view.handlePostDockingQuizSubmit({ q1: 'Correct' });
    assert.equal(view.activeMissionQuizSubmission.value.score, 0);
    assert.deepEqual(quizScoreCounts(view.activeMissionQuizSubmission.value), { correct: 0, total: 1 });
    assert.equal(view.activeMissionQuizSubmission.value.answers, undefined);
  } finally { view.scope.stop(); }
});

test('a failed history lookup does not reopen a possibly completed quiz', async () => {
  const view = page({ getQuizScores: async () => { throw new Error('Offline'); } });
  try {
    await view.handleTakeQuizClick();
    assert.equal(view.showPostDockingQuiz.value, false);
    assert.equal(view.missionReadyToReport.value, false);
    assert.match(view.missionQuizLoadError.value, /retry/i);
    assert.match(await view.html(), /Retry Quiz Check/);
  } finally { view.scope.stop(); }
});

test('late quiz history from a previous student does not update the new account', async () => {
  let resolve;
  const view = page({ getQuizScores: () => new Promise(done => { resolve = done; }) });
  try {
    const pending = view.restoreMissionQuizCompletion();
    view.currentUser.value = { id: 'other-student' };
    resolve({ scores: [stored] });
    await pending;
    assert.equal(view.progressData.value.quizSubmissions.length, 0);
    assert.equal(view.activeMissionQuizSubmission.value, null);
  } finally { view.scope.stop(); }
});

test('restored quiz counts work without question data and retain a zero score', () => {
  const entries = restoreQuizSubmissions([], [stored], 'student');
  assert.deepEqual(quizScoreCounts(entries[0]), { correct: 0, total: 1 });
  assert.equal(entries[0].score, 0);
  assert.equal(findCompletedQuizSubmission(entries, { studentId: 'other', moduleId: 'module' }), null);
  const start = source.indexOf('  // Reuse the completed quiz on every mission retry');
  const end = source.indexOf('  // Calculate mission score using NEW 4-METRIC SYSTEM', start);
  const counts = new Function('currentUser', 'progressData', 'module', 'mission', 'findCompletedQuizSubmission', 'quizScoreCounts',
    `${source.slice(start, end)}\nreturn { quizCorrect, quizTotal };`)(
      { value: { id: 'student' } }, { value: { quizSubmissions: entries } },
      { id: 'module' }, { id: 'mission' }, findCompletedQuizSubmission, quizScoreCounts);
  assert.deepEqual(counts, { quizCorrect: 0, quizTotal: 1 });
  const passing = restoreQuizSubmissions([], [{ ...stored, 'raw-score': 1, 'Quiz-score-percentage': 100 }], 'student');
  assert.deepEqual(quizScoreCounts(passing[0]), { correct: 1, total: 1 });
  assert.equal(passing[0].score, 100);
});

test('practice review shows Report Mission and opens the saved report while keeping the quiz locked', async () => {
  const view = page();
  try {
    view.isTrainingReviewMode.value = true;
    view.missionReadyToReport.value = true;
    await Vue.nextTick();
    await view.handleTakeQuizClick();
    const html = (await view.html()).replace(/<!--[\s\S]*?-->/g, '');
    assert.doesNotMatch(html, /Take Quiz/);
    assert.match(html, /Report Mission Completion/);
    assert.match(html, /Your saved mission result is ready to view/);
    assert.equal(view.showPostDockingQuiz.value, false);
    view.reportMissionCompletion();
    assert.deepEqual(view.reports, [{ module: view.activeTrainingModule.value, saved: true }]);
  } finally { view.scope.stop(); }
});

test('entering practice while already anchored makes the report available without a quiz submission', async () => {
  const view = page();
  try {
    assert.equal(view.missionReadyToReport.value, false);
    view.isTrainingReviewMode.value = true;
    await Vue.nextTick();
    assert.equal(view.missionReadyToReport.value, true);
    assert.equal(view.progressData.value.quizSubmissions.length, 0);
    view.anchor.value.deployed = false;
    view.missionReadyToReport.value = false;
    await Vue.nextTick();
    view.anchor.value.deployed = true;
    await Vue.nextTick();
    assert.equal(view.missionReadyToReport.value, true);
  } finally { view.scope.stop(); }
});

test('reporting requires a deployed anchor, stopped engine, and closed quiz', () => {
  const view = page();
  try {
    view.missionReadyToReport.value = true;
    view.engineRunning.value = true;
    view.reportMissionCompletion();
    view.engineRunning.value = false;
    view.anchor.value.deployed = false;
    view.reportMissionCompletion();
    view.anchor.value.deployed = true;
    view.showPostDockingQuiz.value = true;
    view.reportMissionCompletion();
    assert.equal(view.reports.length, 0);
    view.showPostDockingQuiz.value = false;
    view.reportMissionCompletion();
    assert.equal(view.reports[0].saved, false);
  } finally { view.scope.stop(); }
});

test('saved report displays the persisted mission and quiz scores without saving or awarding XP', () => {
  const saved = { score: 85, passed: true, passScore: 70 };
  const deps = { activeMission: { value: { id: 'mission', title: 'Test Mission 2' } },
    getMissionResult: () => saved, currentUser: { value: { id: 'student' } },
    progressData: { value: { quizSubmissions: restoreQuizSubmissions([], [stored], 'student') } },
    missionCompleteModal: { value: null }, findCompletedQuizSubmission, quizScoreCounts, syncUiCursor() {} };
  const open = new Function(...Object.keys(deps), `${actualFunction('openSavedMissionReport')}\nreturn openSavedMissionReport;`)(...Object.values(deps));
  open({ id: 'module' });
  assert.deepEqual(deps.missionCompleteModal.value, { id: 'mission', title: 'Test Mission 2',
    passScore: 70, score: 85, passed: true, isSavedReport: true, quizScore: 1, quizCorrect: 0, quizTotal: 1 });
  assert.deepEqual(saved, { score: 85, passed: true, passScore: 70 });
});

test('a graded quiz cannot start another student quiz session', () => {
  const deps = { currentUser: { value: { id: 'student' } },
    progressData: { value: { quizSubmissions: [{ studentId: 'student', quizId: 'quiz', status: 'graded' }] } },
    activeQuizSession: { value: null } };
  const start = new Function(...Object.keys(deps), `${actualFunction('canTakeQuiz')}\n${actualFunction('startQuizSession')}\nreturn startQuizSession;`)(...Object.values(deps));
  start(quiz);
  assert.equal(deps.activeQuizSession.value, null);
});
