import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import * as THREE from 'three';
import * as Vue from 'vue';
import { setupBoatAnchorRig, beginAnchorDeploy, beginAnchorRetract, isAnchorFullyDeployed, applyAnchorPose } from '../src/helpers/boatAnchor.js';

const source = readFileSync(new URL('../src/App.vue', import.meta.url), 'utf8').replace(/\r\n/g, '\n');
function page(withRig = true) {
  const boat = new THREE.Group(), body = new THREE.Group(); body.name = 'main_body_anchor002'; boat.add(body);
  const callbacks = new Map(), dockings = [], transitions = []; let sequence = 0;
  const context = { boatObject: boat, boatAnchorRig: withRig ? setupBoatAnchorRig(boat) : null, anchorMesh: null,
    anchorTransitionTimerId: null, anchor: Vue.ref({ deployed: false, deploying: false, retracting: false, position: new THREE.Vector3(), maxChainLength: 50 }),
    activeScreen: Vue.ref('simulation'), activeTrainingModule: Vue.ref({ id: 'sample' }), trainingRunMetrics: Vue.ref({ stepsCompleted: 0, totalSteps: 2 }),
    isBoatInPortZone: Vue.ref(true), missionReadyToReport: Vue.ref(false), postDockingQuizTriggered: Vue.ref(false), showPostDockingQuiz: Vue.ref(false), lastQuizCheckTime: 0,
    speedVel: 2, speedRot: 1, angularVelocity: 1, scene: new THREE.Scene(), baselineWaterlineY: 0,
    setupBoatAnchorRig, beginAnchorDeploy, beginAnchorRetract, isAnchorFullyDeployed, applyAnchorPose,
    getActiveHarborDockBerth: () => ({ x: 0, z: 0 }), trackDockingAttempt: (...args) => dockings.push(args), checkTrainingStep() {},
    createAnchorMesh: () => new THREE.Group(), requestAnimationFrame() {},
    window: { setTimeout: (callback, delay) => { const id = ++sequence; callbacks.set(id, { callback, delay }); return id; }, clearTimeout: id => callbacks.delete(id) } };
  vm.createContext(context);
  for (const name of ['cancelAnchorTransition', 'finishAnchorTransition', 'scheduleAnchorTransition', 'toggleAnchor']) {
    const start = source.indexOf(`function ${name}(`);
    vm.runInContext(source.slice(start, source.indexOf('\n}', start) + 2), context);
  }
  const stop = Vue.watch(() => context.anchor.value.deployed, deployed => transitions.push(deployed));
  return { context, callbacks, dockings, transitions, stop, finishTimer() { const [id, timer] = callbacks.entries().next().value; callbacks.delete(id); timer.callback(); } };
}

test('the actual Anchor action completes and enables docking without any rendered frames or completed steps', async () => {
  const p = page();
  try {
    p.context.toggleAnchor();
    assert.equal(p.context.anchor.value.deploying, true);
    assert.equal(p.context.anchor.value.deployed, false);
    assert.equal(p.context.boatAnchorRig.progress, 0, 'no animation frames ran');
    assert.equal([...p.callbacks.values()][0].delay, 2400);
    p.finishTimer(); await Vue.nextTick();
    assert.equal(p.context.anchor.value.deployed, true);
    assert.equal(p.context.anchor.value.deploying, false);
    assert.equal(p.context.boatAnchorRig.state, 'deployed');
    assert.equal(p.context.boatAnchorRig.progress, 1);
    assert.equal(p.context.trainingRunMetrics.value.stepsCompleted, 0);
    assert.deepEqual(p.transitions, [true]);
    assert.equal(p.dockings.length, 1);
  } finally { p.stop(); }
});

test('an animation milestone and the completion timer cannot record docking twice', () => {
  const p = page();
  try {
    p.context.toggleAnchor();
    const timer = [...p.callbacks.values()][0].callback;
    p.context.finishAnchorTransition('deployed'); timer();
    assert.equal(p.dockings.length, 1);
    assert.equal(p.callbacks.size, 0);
  } finally { p.stop(); }
});

test('leaving, resetting, swapping boats or starting another attempt invalidates late anchoring callbacks', () => {
  for (const change of [c => { c.activeScreen.value = 'dashboard'; }, c => { c.anchor.value.deploying = false; },
    c => { c.boatObject = new THREE.Group(); }, c => { c.trainingRunMetrics.value = {}; }]) {
    const p = page();
    try { p.context.toggleAnchor(); change(p.context); p.finishTimer(); assert.equal(p.context.anchor.value.deployed, false); assert.equal(p.dockings.length, 0); }
    finally { p.stop(); }
  }
});

test('raising the anchor also completes without rendered frames and clears docking readiness', () => {
  const p = page();
  try {
    p.context.toggleAnchor(); p.finishTimer();
    p.context.missionReadyToReport.value = true; p.context.postDockingQuizTriggered.value = true;
    p.context.toggleAnchor(); assert.equal(p.context.anchor.value.retracting, true); p.finishTimer();
    assert.equal(p.context.anchor.value.deployed, false);
    assert.equal(p.context.anchor.value.retracting, false);
    assert.equal(p.context.boatAnchorRig.state, 'stowed');
    assert.equal(p.context.missionReadyToReport.value, false);
    assert.equal(p.context.postDockingQuizTriggered.value, false);
  } finally { p.stop(); }
});

test('boats without an animated rig use the same completion path immediately', () => {
  const p = page(false);
  try { p.context.toggleAnchor(); assert.equal(p.context.anchor.value.deployed, true); assert.equal(p.dockings.length, 1); p.context.toggleAnchor(); assert.equal(p.context.anchor.value.deployed, false); }
  finally { p.stop(); }
});
