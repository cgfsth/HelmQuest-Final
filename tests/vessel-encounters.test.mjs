import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createVesselEncounter, updateVesselEncounter, vesselEncounterResult, observedSidelight, closestApproach } from '../src/helpers/vesselEncounter.js';
import { createEncounterVesselVisual } from '../src/helpers/encounterVesselVisual.js';
import { normalizeEncounter, validEncounterResult } from '../shared/vesselEncounter.js';
import { simulationPerformance, simulationScoringInputs, completedSimulationScores } from '../shared/simulationPerformance.js';
import { calculateMissionScore, calculateSafetyCompliance, createTrainingRunMetrics } from '../src/helpers/missionScoring.js';

function sail(type, avoid) {
  const own = { x: 0, z: 0, heading: 0, speed: 8, length: 60 };
  const state = createVesselEncounter({ type }, own);
  let turnStarted = null;
  for (let frame = 0; frame < 15000 && !state.resolved; frame++) {
    if (avoid && state.approached && type !== 'crossing-green' && turnStarted == null) turnStarted = frame;
    if (turnStarted != null) own.heading = frame - turnStarted < 900 ? 45 : 0;
    own.x += Math.sin(own.heading * Math.PI / 180) * own.speed * .514444 * .1;
    own.z -= Math.cos(own.heading * Math.PI / 180) * own.speed * .514444 * .1;
    updateVesselEncounter(state, own, .1);
  }
  return { state, own };
}
for (const type of ['anchored', 'crossing-red', 'crossing-green']) {
  test(`${type}: actual hulls can be passed with safe clearance and an appropriate response`, () => {
    const { state } = sail(type, true), result = vesselEncounterResult(state);
    assert.equal(result.resolved, true, JSON.stringify(result));
    assert.equal(result.successful, true, JSON.stringify(result));
    assert.equal(result.accuracy, 100, JSON.stringify(result));
    assert.equal(validEncounterResult(normalizeEncounter({ type }), result), true);
    assert.equal(state.npc.anchored, type === 'anchored');
    if (type === 'crossing-green') assert.equal(state.yielding, true);
  });
}
test('sailing straight into the anchored or red-crossing vessel records one collision and fails safety', () => {
  for (const type of ['anchored', 'crossing-red']) {
    const { state } = sail(type, false), result = vesselEncounterResult(state);
    assert.equal(result.collision, true, JSON.stringify(result));
    assert.equal(result.successful, false);
    assert.equal(result.events.filter(event => event.type === 'VESSEL_COLLISION').length, 1);
    const run = createTrainingRunMetrics(); run.safety.violations.push(...result.events);
    assert.equal(calculateSafetyCompliance(run), 0);
    assert.equal(simulationPerformance({ completion: 100, accuracy: 100, safety: 0, criticalSafetyFailure: result.collision }).passed, false);
  }
});

test('a crossing still presents a real collision risk while the student accelerates to normal simulator speeds', () => {
  for (const topSpeed of [20, 45, 60]) {
    const own = { x: 0, z: 0, speed: 0, heading: 0, length: 60 };
    const state = createVesselEncounter({ type: 'crossing-red' }, own);
    for (let frame = 0; frame < 10000 && !state.resolved; frame++) {
      own.speed = Math.min(topSpeed, own.speed + .3);
      own.z -= own.speed * .514444 * .1;
      updateVesselEncounter(state, own, .1);
    }
    assert.equal(state.resolved, true, `unresolved at ${topSpeed} knots`);
    assert.ok(state.collision || state.minimumClearance < state.config.clearance, `no close-quarters risk at ${topSpeed} knots: ${state.minimumClearance} m`);
  }
});
test('idle waiting, warnings alone, and unresolved/forged exercise summaries do not earn a completion', () => {
  const own = { x: 0, z: 0, speed: 0, heading: 0, length: 60 };
  const state = createVesselEncounter({ type: 'anchored' }, own);
  for (let frame = 0; frame < 10000; frame++) updateVesselEncounter(state, own, .1);
  assert.equal(state.resolved, false);
  assert.equal(state.events.length, 0);
  assert.equal(validEncounterResult(state.config, vesselEncounterResult(state)), false);
  assert.equal(validEncounterResult(state.config, { ...vesselEncounterResult(state), resolved: true, successful: true }), false);
  assert.throws(() => normalizeEncounter({ clearance: 200, warningDistance: 300 }), /valid vessel/);
});
test('sidelight colors match geometry, with both lights forward and only stern white astern', () => {
  const npc = { x: 0, z: 0, heading: 0 };
  assert.equal(observedSidelight(npc, { x: -10, z: -10 }), 'red');
  assert.equal(observedSidelight(npc, { x: 10, z: -10 }), 'green');
  assert.equal(observedSidelight(npc, { x: 0, z: -10 }), 'both');
  assert.equal(observedSidelight(npc, { x: 0, z: 10 }), 'white');
  for (const type of ['crossing-red', 'crossing-green']) {
    const own = { x: 0, z: 0, heading: 0, length: 60 };
    const state = createVesselEncounter({ type }, own);
    assert.equal(observedSidelight(state.npc, own), type.split('-')[1]);
    const scene = new THREE.Scene(), visual = createEncounterVesselVisual(scene, state.config);
    visual.update(state, own);
    assert.equal(visual.lamps[type.split('-')[1]].visible, true);
    assert.equal(visual.lamps[type === 'crossing-red' ? 'green' : 'red'].visible, false);
    visual.dispose(); assert.equal(scene.children.length, 0);
  }
});
test('CPA uses relative vessel motion, and continuous detection catches fast swept collisions', () => {
  assert.equal(closestApproach({ x: 100, z: 100 }, { x: -1, z: -1 }).distance, 0);
  const own = { x: 0, z: 0, heading: 0, speed: 8, length: 18 };
  const state = createVesselEncounter({ type: 'anchored' }, own);
  own.z = state.npc.z - 100;
  updateVesselEncounter(state, own, .1);
  assert.equal(state.collision, true);
});

test('leaving while the real vessel model loads releases the late asset without reattaching it', async () => {
  const scene = new THREE.Scene();
  let release, disposals = 0;
  const loaded = new THREE.Group();
  const geometry = new THREE.BoxGeometry(44, 8, 12);
  geometry.addEventListener('dispose', () => disposals++);
  loaded.add(new THREE.Mesh(geometry, new THREE.MeshStandardMaterial()));
  const visual = createEncounterVesselVisual(scene, normalizeEncounter({ type: 'anchored' }), {
    loadModel: true, loader: { loadAsync: () => new Promise(resolve => { release = resolve; }) },
  });
  visual.dispose(); visual.dispose(); release({ scene: loaded }); await visual.ready;
  assert.equal(scene.children.length, 0); assert.equal(disposals, 1); assert.equal(loaded.parent, null);
});

test('after completion, live distance updates cannot alter the recorded encounter result', () => {
  const { state, own } = sail('crossing-green', true);
  const saved = vesselEncounterResult(state);
  own.x += 2000; updateVesselEncounter(state, own, .1);
  assert.ok(state.clearance > 1000);
  assert.deepEqual(vesselEncounterResult(state), saved);
});
test('one rubric is used for all modules, preserves zero values, and excludes quizzes and time from the overall score', () => {
  const scores = { completion: 100, accuracy: 80, safety: 90, docking: 0 };
  const first = simulationPerformance(scores);
  assert.equal(first.score, 90); assert.equal(first.passed, true);
  for (const lesson of ['lesson-1', 'lesson-3', 'lesson-4', 'lesson-5', 'lesson-6']) {
    assert.equal(simulationPerformance({ ...scores, lesson, quiz: 0, time: 0 }).score, first.score);
    assert.equal(simulationPerformance({ ...scores, lesson, quiz: 100, time: 100 }).score, first.score);
  }
  assert.equal(first.performanceMetrics.dockingAccuracy, 0);
  assert.equal(calculateMissionScore({ simulation: scores }).score, first.score);
  assert.equal(simulationPerformance({ ...scores, accuracy: null, steering: null }).assessmentComplete, false);
  assert.throws(() => simulationPerformance({ ...scores, completion: NaN }), /Invalid/);
  const input = simulationScoringInputs({ steeringScore: 100, courseScore: 100, safetyScore: 100 }, { totalSteps: 2, stepsCompleted: 0 });
  assert.equal(input.accuracy, null, 'untouched defaults do not prove proficiency');
  const derived = completedSimulationScores(scores, { totalSteps: 4, completedSteps: 4 }, { successful: false, collision: true });
  assert.equal(derived.completion, 80); assert.equal(derived.criticalSafetyFailure, true);
});

test('correct task execution is not penalized for absent waypoint, anchoring or docking subtasks', () => {
  const run = { totalSteps: 2, stepsCompleted: 2 };
  for (const legacyCourseScore of [0, 30, 65, 100]) {
    const state = { courseScore: legacyCourseScore, objectivesCompleted: [{ id: 'one' }, { id: 'two' }],
      penalties: [], safetyScore: 100, dockingScore: null, headingHistory: [] };
    assert.equal(simulationPerformance(simulationScoringInputs(state, run)).score, 100);
    state.penalties.push({ type: 'SequenceViolation', amount: 15 });
    assert.equal(simulationPerformance(simulationScoringInputs(state, run)).score, 94);
  }
});
