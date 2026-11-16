import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import * as Vue from 'vue';
import { isBoatAtPort } from '../src/helpers/portDocking.js';
import { isBoatInZone } from '../src/helpers/missionWaypoints.js';
import { gpsToWorld } from '../src/helpers/davaoGulfData.js';
import { validDockingCompletion } from '../shared/simulationPerformance.js';
import { createMissionCompletionFlow } from '../src/helpers/missionCompletionFlow.js';

const berth = { x: 17174.3276, z: -4299.9008, shape: 'berth', length: 500, width: 10, berthHeadingDeg: 270, zoneType: 'dock' };
const dock = { centerX: 17300, centerZ: -4300, halfWidth: 113.67, halfDepth: 250, rotation: Math.PI };
const position = gpsToWorld(7.0602, 125.8544);
const boat = { x: position.x * 1000, z: position.z * 1000, headingDeg: 355, length: 60, beam: 12 };
const harbor = { zones: [berth], dockColliders: [dock] };
const app = readFileSync(new URL('../src/App.vue', import.meta.url), 'utf8').replace(/\r\n/g, '\n');

test('sample screenshot coordinates are alongside the pier even outside the narrow berth', () => {
  assert.equal(isBoatInZone(boat.x, boat.z, berth), false);
  assert.equal(isBoatAtPort(boat, harbor), true);
  for (const z of [-4500, -4400, -4300, -4200, -4100]) {
    assert.equal(isBoatAtPort({ ...boat, z }, harbor), true, `alongside z=${z}`);
  }
  assert.equal(isBoatAtPort({ ...boat, x: boat.x - 500 }, harbor), false, 'open water is not a port');
});

test('rotated and legacy docks use actual pier bounds; unrelated navigation zones are excluded', () => {
  const local = { x: 40, z: 100, length: 18, beam: 4, headingDeg: 0 };
  const box = { centerX: 100, centerZ: 100, halfWidth: 40, halfDepth: 120, rotation: .7 };
  const dx = local.x - box.centerX, dz = local.z - box.centerZ;
  const rotated = { ...local, x: box.centerX + dx * Math.cos(.7) - dz * Math.sin(.7),
    z: box.centerZ + dx * Math.sin(.7) + dz * Math.cos(.7), headingDeg: -(.7 * 180 / Math.PI) };
  assert.equal(isBoatAtPort(rotated, { dockColliders: [box] }), true);
  assert.equal(isBoatAtPort(local, { dockColliders: [{ minX: 60, maxX: 140, minZ: -20, maxZ: 220 }] }), true);
  assert.equal(isBoatAtPort(local, { zones: [{ x: 40, z: 100, radius: 500, zoneType: 'nav', label: 'Buoy 1' }] }), false);
  assert.equal(isBoatAtPort({ x: NaN, z: 0 }, harbor), false);
  assert.equal(isBoatAtPort(local, { dockColliders: [{}] }), false);
});

test('a large hull can secure near the pier without its centre entering the precision berth', () => {
  const large = { x: 17080, z: -4425, length: 180, beam: 36, headingDeg: 90 };
  assert.equal(isBoatAtPort(large, harbor), true);
  assert.equal(isBoatAtPort({ ...large, x: large.x - 50 }, harbor), false);
});

test('App opens quiz or results from the sample pier position at 0/2, 1/2 and 2/2 steps', async () => {
  for (const completedSteps of [0, 1, 2]) for (const quiz of [null, { id: 'sample-quiz', questions: [{ id: 'one' }] }]) {
    const events = [];
    const context = { computed: Vue.computed, watch: Vue.watch, isBoatAtPort, validDockingCompletion,
      stats: Vue.ref({ boatX: boat.x, boatZ: boat.z, rotationDeg: boat.headingDeg, speedKnots: 0 }),
      boatObject: { userData: { loaMeters: boat.length, beamMeters: boat.beam } },
      activeTrainingModule: Vue.ref({ id: 'sample', steps: [{}, {}] }), activeCoursePractical: Vue.ref({}),
      activeScreen: Vue.ref('simulation'), isTrainingReviewMode: Vue.ref(false), missionCompleteModal: Vue.ref(null),
      showPostDockingQuiz: Vue.ref(false), courseCompletionState: Vue.ref('IN_PROGRESS'),
      trainingRunFinished: Vue.ref(completedSteps === 2), trainingRunMetrics: Vue.ref({ stepsCompleted: completedSteps, totalSteps: 2 }),
      anchor: Vue.ref({ deployed: false }), engineRunning: Vue.ref(false), engineStarting: Vue.ref(false),
      resolveTrainingZonesAtSpawn: () => harbor.zones, getActiveDockColliders: () => harbor.dockColliders };
    const flow = createMissionCompletionFlow({
      saveSimulation: async evidence => { events.push('save'); assert.equal(evidence.completedSteps, completedSteps); return { data: { score: 40 } }; },
      findQuiz: async () => ({ quiz }), saveQuiz: async () => ({}),
      onState: ({ state }) => { context.courseCompletionState.value = state; },
      onQuiz: () => { events.push('quiz'); context.showPostDockingQuiz.value = true; },
      onResults: () => { events.push('results'); context.missionCompleteModal.value = {}; }
    });
    let pending;
    vm.createContext(context);
    const portStart = app.indexOf('const isBoatInPortZone = computed(');
    vm.runInContext(app.slice(portStart, app.indexOf('\n});', portStart) + 4), context);
    const readyStart = app.indexOf('function courseDockingEvidence(');
    vm.runInContext(app.slice(readyStart, app.indexOf('\nasync function continueCourseCompletion', readyStart)), context);
    context.continueCourseCompletion = () => { pending = flow.finish(context.courseDockingEvidence()); };
    const watcherStart = app.indexOf('watch(courseReadyToComplete,');
    const scope = Vue.effectScope();
    scope.run(() => vm.runInContext(app.slice(watcherStart, app.indexOf('\n});', watcherStart) + 4), context));
    try {
      assert.deepEqual(events, []);
      context.anchor.value.deployed = true;
      await Vue.nextTick(); await pending;
      assert.deepEqual(events, ['save', quiz ? 'quiz' : 'results']);
    } finally { scope.stop(); }
  }
});
