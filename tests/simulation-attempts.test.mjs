import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { ref, computed } from 'vue';
import { simulationAttempt, simulationResultsForActivity } from '../shared/simulationAttempts.js';

const source = readFileSync(new URL('../src/components/materials/LearningMaterials.vue', import.meta.url), 'utf8').replace(/\r\n/g, '\n');
function actualFunction(name) {
  let start = source.indexOf(`function ${name}(`);
  assert.ok(start >= 0, name);
  if (source.slice(start - 6, start) === 'async ') start -= 6;
  return source.slice(start, source.indexOf('\n}', start) + 2);
}
function page({ allowed = true, scores = [], state = {}, fetchScores } = {}) {
  const activity = { id: 'practical', type: 'simulation', targetId: 'mission', moduleId: 'module', allowRetakes: allowed };
  const events = [];
  const context = { AbortController, computed, simulationAttempt, simulationResultsForActivity,
    props: { currentUser: { id: 'student' }, prepareAccess: async () => {} },
    api: { getLearningCourse: async () => ({ syllabus: { id: 'course' }, modules: [{ id: 'module' }], activities: [activity], progress: { practical: state }, simulationAccess: { module: { canStart: true } } }),
      getMissionScores: fetchScores || (async () => ({ scores })) },
    controller: null, generation: 0, identity: 1, activityOpenRequest: 0,
    manager: ref(false), preview: ref(false), loading: ref(false), error: ref(''), ready: ref(false),
    instructors: ref([]), selected: ref({ id: 'course' }), activities: ref([activity]), modules: ref([]), courseProgress: ref({}),
    simulationAccess: ref({}), official: ref(null), lessonId: ref('module'), catalog: ref({}), cleanupPending: ref(false),
    activityDetail: ref(null), simulationAttemptReady: ref(false), selectLesson() {}, emit: (...args) => events.push(args) };
  vm.createContext(context);
  const start = source.indexOf('const currentSimulationAttempt = computed(');
  vm.runInContext(source.slice(start, source.indexOf('const official =', start)), context);
  for (const name of ['load', 'openActivity']) vm.runInContext(actualFunction(name), context);
  const bindings = vm.runInContext('({ currentSimulationAttempt, simulationActionLabel, showActivityAction })', context);
  return { context, activity, events, ...bindings };
}
const failed = { studentId: 'student', missionId: 'CUSTOM-mission', score: 40, passed: false };

test('opening an old course snapshot fetches the real 40% result before showing Retry Simulation', async () => {
  let release;
  const pendingScores = new Promise(resolve => { release = resolve; });
  const view = page({ state: { simulation: { attempted: false } }, fetchScores: () => pendingScores });
  const pending = view.context.openActivity(view.activity);
  assert.equal(view.showActivityAction.value, false, 'Start Simulation must not flash while checking results');
  await Promise.resolve();
  release({ scores: [failed, { ...failed, studentId: 'other', passed: true, score: 100 }] });
  await pending;
  assert.equal(view.currentSimulationAttempt.value.score, 40);
  assert.equal(view.simulationActionLabel.value, 'Retry Simulation');
  assert.equal(view.showActivityAction.value, true);
});

test('an attempted simulation has no start/retry button when the instructor disables retakes', async () => {
  for (const options of [{ scores: [failed] }, { state: { status: 'In Progress' } }]) {
    const view = page({ ...options, allowed: false });
    await view.context.openActivity(view.activity);
    assert.equal(view.currentSimulationAttempt.value.attempted, true);
    assert.equal(view.showActivityAction.value, false);
  }
});

test('only a first attempt says Start Simulation; an unfinished allowed attempt says Retry Simulation', async () => {
  const first = page({ allowed: false });
  await first.context.openActivity(first.activity);
  assert.equal(first.simulationActionLabel.value, 'Start Simulation');
  assert.equal(first.showActivityAction.value, true);
  const unfinished = page({ state: { status: 'In Progress' } });
  await unfinished.context.openActivity(unfinished.activity);
  assert.equal(unfinished.simulationActionLabel.value, 'Retry Simulation');
  assert.equal(unfinished.showActivityAction.value, true);
});

test('a missing score response never falls back to an unsafe Start Simulation button', async () => {
  const view = page({ fetchScores: async () => { throw new Error('Score service unavailable'); } });
  await view.context.openActivity(view.activity);
  assert.equal(view.showActivityAction.value, false);
  assert.equal(view.context.simulationAttemptReady.value, false);
  assert.match(view.context.error.value, /unavailable/);
});

test('saved results also match the exact activity link and preserve zero scores', () => {
  const scores = [{ activityId: 'practical', score: 0, passed: false, completedAt: { seconds: 10 } },
    { missionId: 'other', score: 100, passed: true }];
  const attempt = simulationAttempt(simulationResultsForActivity(scores, { id: 'practical', targetId: 'mission' }));
  assert.equal(attempt.attempted, true);
  assert.equal(attempt.score, 0);
  assert.equal(attempt.passed, false);
});
