import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const source = readFileSync(new URL('../src/App.vue', import.meta.url), 'utf8').replace(/\r\n/g, '\n');
function appFunction(name) {
  let start = source.indexOf(`function ${name}(`);
  assert.ok(start >= 0);
  if (source.slice(start - 6, start) === 'async ') start -= 6;
  return source.slice(start, source.indexOf('\n}', start) + 2);
}

function target() {
  const handlers = new Map(), captures = new Set();
  return {
    handlers, captures,
    addEventListener(type, handler) { handlers.set(type, handler); },
    removeEventListener(type) { handlers.delete(type); },
    setPointerCapture(id) { captures.add(id); },
    hasPointerCapture(id) { return captures.has(id); },
    releasePointerCapture(id) { captures.delete(id); },
    closest() { return false; }, contains() { return false; },
    fire(type, event = {}) { handlers.get(type)?.({ type, pointerType: 'touch', pointerId: 1,
      clientX: 100, clientY: 100, preventDefault() {}, ...event }); },
  };
}
function cameraInput() {
  const canvas = target(), window = target();
  const context = {
    renderer: { domElement: canvas }, canvasContainer: { value: canvas }, window,
    document: { elementFromPoint: () => canvas }, activeScreen: { value: 'simulation' },
    simulationNeedsLandscape: { value: false }, activeCamera: { value: 'chase' }, altKeyPressed: { value: false },
    mouseLookReady: false, lastMouseLookX: 0, lastMouseLookY: 0,
    cameraLookYaw: 0, cameraLookPitch: 0, teardownMouseLook: null,
    MOUSE_LOOK_SENSITIVITY: .002, MOUSE_LOOK_PITCH_LIMIT: 1, MOUSE_LOOK_YAW_LIMIT: 2,
    THREE: { MathUtils: { clamp: (value, min, max) => Math.max(min, Math.min(max, value)) } },
  };
  vm.createContext(context);
  for (const name of ['shouldApplyMouseLook', 'disposeMouseLook', 'setupMouseLook']) vm.runInContext(appFunction(name), context);
  context.setupMouseLook();
  return { context, canvas, window };
}

test('dragging the sea pans the camera and releasing the finger stops panning', () => {
  const { context, canvas } = cameraInput();
  canvas.fire('pointerdown');
  canvas.fire('pointermove', { clientX: 150, clientY: 125 });
  assert.equal(context.cameraLookYaw, -.1);
  assert.equal(context.cameraLookPitch, -.05);
  canvas.fire('pointerup');
  canvas.fire('pointermove', { clientX: 200, clientY: 150 });
  assert.equal(context.cameraLookYaw, -.1);
});

test('a second finger, HUD touches, orbit mode and portrait do not hijack camera dragging', () => {
  const { context, canvas } = cameraInput();
  canvas.fire('pointerdown');
  canvas.fire('pointerdown', { pointerId: 2 });
  canvas.fire('pointermove', { pointerId: 2, clientX: 200 });
  assert.equal(context.cameraLookYaw, 0);
  canvas.fire('pointercancel');
  for (const mode of ['portrait', 'orbit', 'hud']) {
    context.simulationNeedsLandscape.value = mode === 'portrait';
    context.activeCamera.value = mode === 'orbit' ? 'orbit' : 'chase';
    context.document.elementFromPoint = () => mode === 'hud' ? { closest: () => true } : canvas;
    canvas.fire('pointerdown');
    canvas.fire('pointermove', { clientX: 200 });
    assert.equal(context.cameraLookYaw, 0);
  }
});

test('camera listeners and captured touches are released when the simulation is disposed', () => {
  const { context, canvas, window } = cameraInput();
  canvas.fire('pointerdown');
  assert.equal(canvas.captures.size, 1);
  context.disposeMouseLook();
  assert.equal(canvas.captures.size, 0);
  assert.equal(canvas.handlers.size, 0);
  assert.equal(window.handlers.size, 0);
  assert.equal(context.teardownMouseLook, null);
});

test('mobile fullscreen is requested before locking landscape orientation', async () => {
  const calls = [];
  const context = { appRoot: { value: { async requestFullscreen() { calls.push('fullscreen'); } } },
    document: { fullscreenElement: null }, simulationTouchEnabled: { value: true },
    window: { screen: { orientation: { async lock(value) { calls.push(value); } } } } };
  vm.createContext(context);
  vm.runInContext(appFunction('requestSimulationLandscape'), context);
  await context.requestSimulationLandscape();
  assert.deepEqual(calls, ['fullscreen', 'landscape']);
  context.simulationTouchEnabled.value = false;
  calls.length = 0;
  await context.requestSimulationLandscape();
  assert.deepEqual(calls, ['fullscreen']);
});

test('unsupported or rejected native fullscreen/orientation leaves manual rotation usable', async () => {
  const context = { appRoot: { value: {} }, document: { fullscreenElement: null },
    simulationTouchEnabled: { value: true }, window: { screen: {} } };
  vm.createContext(context);
  vm.runInContext(appFunction('requestSimulationLandscape'), context);
  await context.requestSimulationLandscape();
  context.appRoot.value.requestFullscreen = async () => { throw new Error('Fullscreen unavailable'); };
  await context.requestSimulationLandscape();
  context.appRoot.value.requestFullscreen = async () => {};
  context.window.screen.orientation = { async lock() { throw new Error('Orientation lock unavailable'); } };
  await context.requestSimulationLandscape();
});
