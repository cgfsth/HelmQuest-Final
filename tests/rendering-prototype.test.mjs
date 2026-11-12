import test from 'node:test';
import assert from 'node:assert/strict';
import { createPrototypeState, stepPrototype, makeMeasurements } from '../src/experiments/prototypeState.js';
test('prototype movement reuses the existing time-based throttle response at 15, 30, 60 and 144 FPS', () => {
  const samples = [15, 30, 60, 144].map(fps => { const state = createPrototypeState(); state.engineRunning = true; for (let frame = 0; frame < fps * 5; frame++) stepPrototype(state, { KeyW: true }, 1 / fps); return state; });
  for (const state of samples) { assert.ok(Number.isFinite(state.x)); assert.ok(Math.abs(state.speedKnots - samples[0].speedKnots) < .01); assert.ok(Math.abs(state.x - samples[0].x) < 2); }
});
test('anchoring and pausing prevent propulsion without resetting the scene or mission data', () => {
  const state = createPrototypeState(); state.engineRunning = true; state.anchored = true; state.mission = { id: 'existing-mission' };
  const x = state.x; for (let i = 0; i < 60; i++) stepPrototype(state, { KeyW: true }, 1 / 60); assert.equal(state.x, x); assert.equal(state.speed, 0);
  state.paused = true; const before = structuredClone(state); stepPrototype(state, { KeyW: true }, 1 / 60); assert.deepEqual(state, before); assert.equal(state.mission.id, 'existing-mission');
});
test('measurement includes slow frames and excludes explicitly paused background time', () => {
  const previous = { innerWidth: globalThis.innerWidth, innerHeight: globalThis.innerHeight, devicePixelRatio: globalThis.devicePixelRatio };
  Object.assign(globalThis, { innerWidth: 1280, innerHeight: 900, devicePixelRatio: 1 });
  try { const measured = makeMeasurements('babylon', 'low'); [100, 600, 2100, 4100].forEach(time => measured.frame(time)); const sample = measured.snapshot(); assert.equal(sample.frames, 3); assert.equal(sample.fps, .75); assert.equal(sample.p95FrameMs, 2000); measured.resetFrameClock(); measured.frame(30000); assert.equal(measured.snapshot().frames, 3); }
  finally { Object.assign(globalThis, previous); }
});
