import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as Vue from 'vue';
import { parse, compileScript } from '@vue/compiler-sfc';
import { renderToString } from '@vue/server-renderer';
import { useSimulationTutorial, SIMULATION_TUTORIAL_STEPS } from '../src/helpers/simulationTutorial.js';

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
      const returning = student(storage);
      try {
        assert.equal(returning.completed.value, true);
        returning.restart();
        assert.equal(returning.stepIndex.value, 0);
        assert.equal(returning.completed.value, false);
      } finally { returning.stop(); }
    } finally { reloaded.stop(); }
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
  .replace('export default', 'return');
const Tutorial = new Function('Vue', 'SIMULATION_TUTORIAL_STEPS', compiled)(Vue, SIMULATION_TUTORIAL_STEPS);

test('actual Vue cards render keyboard and phone controls, final action and the completion path', async () => {
  async function render(props) {
    return renderToString(Vue.createSSRApp({ render: () => Vue.h(Tutorial, props) }));
  }
  for (let stepIndex = 0; stepIndex < SIMULATION_TUTORIAL_STEPS.length; stepIndex++) {
    const html = await render({ stepIndex });
    assert.ok(html.includes(SIMULATION_TUTORIAL_STEPS[stepIndex].title));
    assert.match(html, /aria-current="step"/);
    assert.match(html, stepIndex === SIMULATION_TUTORIAL_STEPS.length - 1 ? /Finish tutorial/ : /Next card/);
    assert.doesNotMatch(html, /<button[^>]*>Open Missions<\/button>/);
  }
  assert.match(await render({ stepIndex: 1 }), /<kbd>P<\/kbd>/);
  const phone = await render({ stepIndex: 1, touch: true });
  assert.match(phone, /<kbd>Engine<\/kbd>/);
  assert.doesNotMatch(phone, /<kbd>P<\/kbd>/);
  const completed = await render({ completed: true });
  assert.match(completed, /Open Missions/);
  assert.match(completed, /Review tutorial/);
  assert.doesNotMatch(completed, /Next card/);
});
