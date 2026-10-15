import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import * as THREE from 'three';

const source = readFileSync(new URL('../src/App.vue', import.meta.url), 'utf8').replace(/\r\n/g, '\n');
const start = source.indexOf('async function swapBoatModel(');
const body = source.slice(start, source.indexOf('\n}', start) + 2);
function flow() {
  const loads = new Map(), disposed = [], attached = [];
  const context = {
    scene: new THREE.Scene(), boatObject: new THREE.Group(), boatSwapVersion: 0,
    pendingBoatModels: new Map(), console, poseResets: 0,
    restoreBoatSimPose() { context.poseResets++; },
    loadBoatModel(path) {
      assert.ok(!loads.has(path), 'same pending hull must parse only once');
      return new Promise(resolve => loads.set(path, resolve));
    },
    disposeBoatModel(model) { disposed.push(model); },
    finalizeSpawnedBoat(path) {
      context.boatObject.userData.modelPath = path;
      attached.push(context.boatObject);
    },
  };
  context.boatObject.userData.modelPath = 'initial';
  vm.createContext(context);
  vm.runInContext(body, context);
  return { context, loads, disposed, attached };
}

test('sailing with the already loaded boat resets its pose without another download or parse', async () => {
  const { context, loads } = flow();
  await context.swapBoatModel('initial');
  assert.equal(loads.size, 0);
  assert.equal(context.poseResets, 1);
});

test('startup and Set Sail share a pending boat without disposing the attached result', async () => {
  const { context, loads, disposed, attached } = flow();
  const first = context.swapBoatModel('medium'), second = context.swapBoatModel('medium');
  const model = new THREE.Group();
  loads.get('medium')(model);
  await Promise.all([first, second]);
  assert.deepEqual(attached, [model]);
  assert.ok(!disposed.includes(model));
  assert.equal(context.pendingBoatModels.size, 0);
});

test('switching boats during a download disposes the obsolete hull and keeps the newest choice', async () => {
  const { context, loads, disposed } = flow();
  const first = context.swapBoatModel('medium'), second = context.swapBoatModel('small');
  const medium = new THREE.Group(), small = new THREE.Group();
  loads.get('small')(small);
  await second;
  loads.get('medium')(medium);
  await first;
  assert.equal(context.boatObject, small);
  assert.ok(disposed.includes(medium));
  assert.ok(!disposed.includes(small));
  assert.equal(context.pendingBoatModels.size, 0);
});

test('returning to the active hull cancels a pending replacement', async () => {
  const { context, loads, disposed } = flow();
  const initial = context.boatObject;
  const pending = context.swapBoatModel('medium');
  await context.swapBoatModel('initial');
  const medium = new THREE.Group();
  loads.get('medium')(medium);
  await pending;
  assert.equal(context.boatObject, initial);
  assert.ok(disposed.includes(medium));
});
