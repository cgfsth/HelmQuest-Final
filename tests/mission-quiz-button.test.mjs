import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as Vue from 'vue';
import { compile } from '@vue/compiler-dom';
import { renderToString } from '@vue/server-renderer';

const source = readFileSync(new URL('../src/App.vue', import.meta.url), 'utf8').replace(/\r\n/g, '\n');
function between(start, end) {
  const index = source.indexOf(start);
  const last = source.indexOf(end, index);
  assert.ok(index >= 0 && last > index);
  return source.slice(index, last);
}
const state = between('// Saved quizzes drive the instructor mission buttons', '// Computed property to access quizzes');
const actions = between('// Get quiz button text dynamically', '// Open quiz editor modal with given quiz data');
const lookup = between('async function getQuizForModuleFromFirestore', '// Normalize quiz data');
const local = between('function getQuizForModuleFromLocalStorage', 'function editQuiz');
const button = source.match(/<button type="button" class="instructor-mission-btn instructor-mission-btn--quiz"[\s\S]*?<\/button>/)[0];
const render = new Function('Vue', compile(button, { mode: 'function', prefixIdentifiers: true }).code)(Vue);
const saved = { id: 'saved-quiz', moduleId: 'mission', title: 'Existing quiz', questions: [{ id: 'q1', prompt: 'Keep this question' }] };
function page(api) {
  const opened = [], alerts = [];
  const deps = { ref: Vue.ref, watch: Vue.watch, currentUser: Vue.ref({ id: 'teacher' }), userRole: Vue.ref('instructor'),
    activeScreen: Vue.ref('landing'), instructorTab: Vue.ref('overview'), progressData: Vue.ref({ quizzes: [], quizAssignments: [] }),
    firebaseApi: api, window: { firebaseApi: api }, quizManagerModal: Vue.ref(null), quizLoadError: Vue.ref(null), quizDraftRestorePrompt: Vue.ref(null),
    normalizeQuizData: quiz => quiz, openQuizEditor: (...args) => opened.push(args), loadDraftFromLocalStorage: () => null,
    createBlankQuestion: () => ({ prompt: '' }), saveProgress() {}, alert: message => alerts.push(message), console: { log() {}, warn() {}, error() {} } };
  const scope = Vue.effectScope();
  const bindings = scope.run(() => new Function(...Object.keys(deps), `${state}\n${lookup}\n${local}\n${actions}
    return { missionQuizzes, missionQuizzesLoading, missionQuizzesError, fetchMissionQuizzes,
      getQuizButtonText, startCreatingQuiz, getQuizForModuleFromLocalStorage };`)(...Object.values(deps)));
  return { ...deps, ...bindings, scope, opened, alerts,
    html: module => renderToString(Vue.createSSRApp({ render, setup: () => ({ ...bindings, module }) })) };
}

test('saved backend quiz renders Update Quiz without any browser assignments; absent quiz renders Create Quiz', async () => {
  const view = page({ getAllQuizzes: async () => ({ quizzes: [saved] }) });
  try {
    await view.fetchMissionQuizzes();
    assert.equal(view.getQuizButtonText('mission'), 'Update Quiz');
    assert.match(await view.html({ id: 'mission' }), /Update Quiz/);
    assert.equal(view.getQuizButtonText('without-quiz'), 'Create Quiz');
    assert.match(await view.html({ id: 'without-quiz' }), /Create Quiz/);
  } finally { view.scope.stop(); }
});

test('opening mission management loads quiz labels automatically and refreshes after reopening', async () => {
  let quizzes = [saved], calls = 0;
  const view = page({ getAllQuizzes: async () => { calls++; return { quizzes }; } });
  try {
    view.activeScreen.value = 'dashboard';
    view.instructorTab.value = 'missions';
    await Vue.nextTick();
    await Vue.nextTick();
    assert.equal(view.getQuizButtonText('mission'), 'Update Quiz');
    view.instructorTab.value = 'overview';
    await Vue.nextTick();
    quizzes = [];
    view.instructorTab.value = 'missions';
    await Vue.nextTick();
    await Vue.nextTick();
    assert.equal(view.getQuizButtonText('mission'), 'Create Quiz');
    assert.equal(calls, 2);
  } finally { view.scope.stop(); }
});

test('clicking an existing quiz opens its original ID/questions and never creates another document', async () => {
  let creates = 0;
  const view = page({ getAllQuizzes: async () => ({ quizzes: [saved] }), createQuiz: async () => { creates++; } });
  try {
    await view.startCreatingQuiz('mission', 'Mission title');
    assert.equal(creates, 0);
    assert.deepEqual(view.opened, [[saved, 'mission', false]]);
    assert.equal(view.getQuizButtonText('mission'), 'Update Quiz');
    assert.equal(view.progressData.value.quizzes.length, 0);
  } finally { view.scope.stop(); }
});

test('verified absent quiz creates once through the existing API and immediately changes the label to Update Quiz', async () => {
  const created = [];
  const view = page({ getAllQuizzes: async () => ({ quizzes: [] }), createQuiz: async quiz => { created.push(quiz); return { quizId: 'new-id' }; } });
  try {
    await view.startCreatingQuiz('without-quiz', 'New mission');
    assert.equal(created.length, 1);
    assert.equal(view.opened[0][0].id, 'new-id');
    assert.equal(view.progressData.value.quizAssignments[0].quizId, 'new-id');
    assert.equal(view.getQuizButtonText('without-quiz'), 'Update Quiz');
  } finally { view.scope.stop(); }
});

test('failed backend lookup never creates a quiz, including a missing list endpoint', async () => {
  for (const message of ['Offline', '404 Not Found']) {
    let creates = 0;
    const view = page({ getAllQuizzes: async () => { throw new Error(message); }, createQuiz: async () => { creates++; } });
    try {
      await view.fetchMissionQuizzes();
      assert.equal(view.getQuizButtonText('mission'), 'Retry Quiz');
      await view.startCreatingQuiz('mission');
      assert.equal(creates, 0);
      assert.equal(view.opened.length, 0);
      assert.match(view.alerts[0], /Could not check the saved quiz/);
    } finally { view.scope.stop(); }
  }
});

test('local fallback recognizes direct module links and existing legacy assignments', () => {
  const view = page({});
  try {
    view.progressData.value.quizzes = [saved, { id: 'legacy' }];
    view.progressData.value.quizAssignments = [{ quizId: 'legacy', targetType: 'module', targetId: 'legacy-mission' }];
    assert.equal(view.getQuizButtonText('mission'), 'Update Quiz');
    assert.equal(view.getQuizButtonText('legacy-mission'), 'Update Quiz');
    view.missionQuizzes.value = [];
    assert.equal(view.getQuizButtonText('mission'), 'Create Quiz');
  } finally { view.scope.stop(); }
});

test('legacy array module links use the same lookup for labels and editor selection', async () => {
  const quiz = { ...saved, moduleId: ['mission', 'other-mission'] };
  const view = page({ getAllQuizzes: async () => ({ quizzes: [quiz] }) });
  try {
    await view.fetchMissionQuizzes();
    assert.equal(view.getQuizButtonText('other-mission'), 'Update Quiz');
    await view.startCreatingQuiz('other-mission');
    assert.equal(view.opened[0][0].id, 'saved-quiz');
  } finally { view.scope.stop(); }
});

test('a delayed response from the previous instructor cannot replace the new account quiz snapshot', async () => {
  let resolveOld, calls = 0;
  const view = page({ getAllQuizzes: () => ++calls === 1 ? new Promise(resolve => { resolveOld = resolve; }) : Promise.resolve({ quizzes: [] }) });
  try {
    const old = view.fetchMissionQuizzes();
    view.currentUser.value = { id: 'other-teacher' };
    await Vue.nextTick();
    await view.fetchMissionQuizzes();
    resolveOld({ quizzes: [saved] });
    await old;
    assert.equal(view.getQuizButtonText('mission'), 'Create Quiz');
    assert.equal(view.missionQuizzesLoading.value, false);
  } finally { view.scope.stop(); }
});
