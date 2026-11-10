import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as Vue from 'vue';
import { parse, compileScript } from '@vue/compiler-sfc';
import { renderToString } from '@vue/server-renderer';
import { useSimulationTutorial, SIMULATION_TUTORIAL_STEPS } from '../src/helpers/simulationTutorial.js';
import { getSimulationTourLayout, getSimulationTourSpotlight } from '../src/helpers/simulationTourLayout.js';

function memoryStorage() {
  const records = new Map();
  return { getItem: key => records.get(key) ?? null, setItem: (key, value) => records.set(key, value), records };
}
function student(storage = memoryStorage(), status = 'active') {
  const currentUser = Vue.ref({ id: 'student-a', status });
  const isAuthenticated = Vue.ref(true), userRole = Vue.ref('student');
  const scope = Vue.effectScope();
  const guide = scope.run(() => useSimulationTutorial({ currentUser, isAuthenticated, userRole, storage }));
  return { ...guide, currentUser, isAuthenticated, userRole, storage, stop: () => scope.stop() };
}

test('only an authenticated approved student receives onboarding, including a pending-to-approved transition', () => {
  const guide = student(undefined, 'pending');
  try {
    assert.equal(guide.eligible.value, false);
    guide.next();
    assert.equal(guide.storage.records.size, 0);
    guide.currentUser.value.status = 'active';
    assert.equal(guide.eligible.value, true);
    assert.equal(guide.stepIndex.value, 0);
    guide.userRole.value = 'instructor';
    assert.equal(guide.eligible.value, false);
    guide.userRole.value = 'admin';
    assert.equal(guide.eligible.value, false);
    guide.userRole.value = 'student';
    guide.isAuthenticated.value = false;
    assert.equal(guide.eligible.value, false);
    guide.isAuthenticated.value = true;
    for (const status of ['inactive', 'rejected', undefined]) {
      guide.currentUser.value.status = status;
      assert.equal(guide.eligible.value, false);
    }
  } finally { guide.stop(); }
});

test('cards resume after reload and complete only after the student finishes the final card', () => {
  const storage = memoryStorage(), guide = student(storage);
  try {
    assert.equal(guide.completed.value, false);
    guide.back();
    assert.equal(guide.stepIndex.value, 0);
    guide.next(); guide.next(); guide.back();
    assert.equal(guide.stepIndex.value, 1);
    const reloaded = student(storage);
    try {
      assert.equal(reloaded.stepIndex.value, 1);
      while (reloaded.stepIndex.value < SIMULATION_TUTORIAL_STEPS.length - 1) reloaded.next();
      assert.equal(reloaded.completed.value, false);
      reloaded.next();
      assert.equal(reloaded.completed.value, true);
      assert.equal(reloaded.visible.value, false);
      const returning = student(storage);
      try {
        assert.equal(returning.completed.value, true);
        assert.equal(returning.visible.value, false);
        returning.restart();
        assert.equal(returning.stepIndex.value, 0);
        assert.equal(returning.completed.value, false);
      } finally { returning.stop(); }
    } finally { reloaded.stop(); }
  } finally { guide.stop(); }
});

test('closing, reopening and choosing a mission preserve progress without launching or completing a mission', () => {
  const guide = student();
  try {
    assert.equal(guide.visible.value, true);
    guide.dismiss();
    assert.equal(guide.visible.value, false);
    guide.show(); guide.next(); guide.waitForSimulation();
    assert.equal(guide.visible.value, false);
    assert.equal(guide.waitingForSimulation.value, true);
    guide.resumeInSimulation();
    assert.equal(guide.visible.value, true);
    assert.equal(guide.waitingForSimulation.value, false);
    assert.equal(guide.stepIndex.value, 1);
    guide.waitForSimulation(); guide.dismiss(); guide.resumeInSimulation();
    assert.equal(guide.visible.value, false);
    assert.equal(guide.completed.value, false);
    guide.show();
    while (!guide.completed.value) guide.next();
    guide.show();
    assert.equal(guide.stepIndex.value, 0);
    assert.equal(guide.visible.value, true);
  } finally { guide.stop(); }
});

test('students sharing a browser have independent tutorial progress across sign-out and account changes', () => {
  const guide = student();
  try {
    for (let count = 0; count < SIMULATION_TUTORIAL_STEPS.length; count++) guide.next();
    assert.equal(guide.completed.value, true);
    guide.isAuthenticated.value = false;
    guide.currentUser.value = null;
    assert.equal(guide.completed.value, false);
    guide.currentUser.value = { id: 'student-b', status: 'active' };
    guide.isAuthenticated.value = true;
    assert.equal(guide.stepIndex.value, 0);
    assert.equal(guide.completed.value, false);
    guide.next();
    guide.currentUser.value = { id: 'student-a', status: 'active' };
    assert.equal(guide.completed.value, true);
    guide.currentUser.value = { id: 'student-b', status: 'active' };
    assert.equal(guide.stepIndex.value, 1);
  } finally { guide.stop(); }
});

test('bad stored data cannot skip onboarding and blocked storage does not stop the tutorial', () => {
  for (const saved of ['{bad json', '{"stepIndex":99,"completed":true}', '{"stepIndex":-1}', '{"stepIndex":"2"}', '{"stepIndex":0,"completed":true}']) {
    const guide = student({ getItem: () => saved, setItem() {} });
    assert.equal(guide.stepIndex.value, 0);
    assert.equal(guide.completed.value, false);
    guide.stop();
  }
  const guide = student({ getItem() { throw new Error('blocked'); }, setItem() { throw new Error('quota'); } });
  try {
    guide.next();
    assert.equal(guide.stepIndex.value, 1);
    assert.match(guide.storageNotice.value, /this visit only/);
    guide.isAuthenticated.value = false;
    guide.isAuthenticated.value = true;
    assert.equal(guide.stepIndex.value, 1);
    while (!guide.completed.value) guide.next();
    assert.equal(guide.completed.value, true);
  } finally { guide.stop(); }
});

const componentSource = readFileSync(new URL('../src/components/SimulationTutorial.vue', import.meta.url), 'utf8');
const { descriptor } = parse(componentSource);
const compiled = compileScript(descriptor, { id: 'simulation-tutorial-test', inlineTemplate: true }).content
  .replace(/import \{([^}]+)\} from ['"]vue['"];?/g, (_, names) => `const {${names.replace(/\bas\b/g, ':')}} = Vue;`)
  .replace(/import \{ SIMULATION_TUTORIAL_STEPS as steps \} from '[^']+';/, 'const steps = SIMULATION_TUTORIAL_STEPS;')
  .replace(/import \{ getSimulationTourLayout, getSimulationTourSpotlight \} from '[^']+';/, '')
  .replace('export default', 'return');
const Tutorial = new Function('Vue', 'SIMULATION_TUTORIAL_STEPS', 'getSimulationTourLayout', 'getSimulationTourSpotlight', compiled)(Vue, SIMULATION_TUTORIAL_STEPS, getSimulationTourLayout, getSimulationTourSpotlight);

test('actual floating dialog renders real control instructions and a mission handoff instead of a dashboard panel', async () => {
  async function render(props) {
    return renderToString(Vue.createSSRApp({ render: () => Vue.h(Tutorial, props) }));
  }
  for (let stepIndex = 0; stepIndex < SIMULATION_TUTORIAL_STEPS.length; stepIndex++) {
    const html = await render({ stepIndex, screen: 'simulation' });
    assert.ok(html.includes(SIMULATION_TUTORIAL_STEPS[stepIndex].title));
    assert.match(html, /role="dialog" aria-modal="true"/);
    assert.match(html, /fill-rule="evenodd"/);
    assert.match(html, stepIndex === SIMULATION_TUTORIAL_STEPS.length - 1 ? /Finish tour/ : />Next /);
  }
  assert.match(await render({ stepIndex: 1, screen: 'simulation' }), /<kbd>P<\/kbd>/);
  const phone = await render({ stepIndex: 1, touch: true, screen: 'simulation' });
  assert.match(phone, /<kbd>Engine<\/kbd>/);
  assert.doesNotMatch(phone, /<kbd>P<\/kbd>/);
  assert.match(await render({ stepIndex: 0 }), /Show missions/);
  const waiting = await render({ stepIndex: 1 });
  assert.match(waiting, /Choose a mission to continue/);
  assert.doesNotMatch(waiting, /<kbd>P<\/kbd>/);
});

test('tooltips and spotlights stay within desktop, phone and landscape viewports, including missing targets', () => {
  for (const [width, height] of [[1365, 900], [768, 900], [375, 812], [812, 375]]) {
    for (const [x, y] of [[20, 30], [width - 75, 30], [20, height - 75], [width - 75, height - 75]]) {
      const target = getSimulationTourSpotlight({ left: x, top: y, right: x + 50, bottom: y + 50 }, width, height);
      assert.ok(target.left >= 0 && target.top >= 0 && target.right <= width && target.bottom <= height);
      const cardWidth = Math.min(380, width - 32), cardHeight = Math.min(470, height - 32);
      const layout = getSimulationTourLayout({ target, width, height, cardWidth, cardHeight });
      assert.ok(layout.left >= 16 && layout.top >= 16);
      assert.ok(layout.left + cardWidth <= width - 16 && layout.top + cardHeight <= height - 16);
    }
    const fallback = getSimulationTourLayout({ target: null, width, height, cardWidth: Math.min(380, width - 32), cardHeight: 250 });
    assert.equal(fallback.side, 'center');
  }
  assert.equal(getSimulationTourSpotlight(null, 375, 812), null);
  assert.equal(getSimulationTourSpotlight({ left: 500, top: 900, right: 550, bottom: 950 }, 375, 812), null);
});

test('the actual tour pause stops movement, excludes reading time and restores the current run only', async () => {
  const app = readFileSync(new URL('../src/App.vue', import.meta.url), 'utf8').replace(/\r\n/g, '\n');
  const pauseSource = app.slice(app.indexOf('let tutorialPause = null;'), app.indexOf('watch(simulationNeedsLandscape,'));
  let clock = 1000;
  const dependencies = {
    watch: Vue.watch, performance: { now: () => clock }, tutorialVisible: Vue.ref(false), activeScreen: Vue.ref('simulation'),
    trainingRunMetrics: Vue.ref({ startedAt: 500, endedAt: null }), performanceManager: { state: { missionStartTime: 10000 } },
    simulationRunning: Vue.ref(true), simulationNeedsLandscape: Vue.ref(false), keyStates: { KeyW: true },
    trainingStepStartedAt: Vue.ref(600), trainingHeadingHold: Vue.ref({ startedAt: 700 }), cancelExitHold() {}, syncUiCursor() {},
  };
  const scope = Vue.effectScope();
  scope.run(() => new Function(...Object.keys(dependencies), pauseSource)(...Object.values(dependencies)));
  try {
    dependencies.tutorialVisible.value = true; await Vue.nextTick();
    assert.equal(dependencies.simulationRunning.value, false);
    assert.equal(dependencies.keyStates.KeyW, false);
    clock = 4500;
    dependencies.tutorialVisible.value = false; await Vue.nextTick();
    assert.equal(dependencies.simulationRunning.value, true);
    assert.equal(dependencies.trainingRunMetrics.value.startedAt, 4000);
    assert.equal(dependencies.performanceManager.state.missionStartTime, 13500);
    assert.equal(dependencies.trainingStepStartedAt.value, 4100);
    dependencies.tutorialVisible.value = true; await Vue.nextTick();
    dependencies.activeScreen.value = 'dashboard';
    dependencies.trainingRunMetrics.value = { startedAt: 123 };
    await Vue.nextTick();
    assert.equal(dependencies.trainingRunMetrics.value.startedAt, 123);
  } finally { scope.stop(); }
});
