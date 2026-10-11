import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const source = readFileSync(new URL('../src/App.vue', import.meta.url), 'utf8').replace(/\r\n/g, '\n');
function appFunction(name) {
  const start = source.indexOf(`function ${name}(`);
  assert.ok(start >= 0, `${name} must exist`);
  return source.slice(start, source.indexOf('\n}', start) + 2);
}

function simulation({ review = false, quickSail = false } = {}) {
  const listeners = new Map();
  const context = {
    isAuthenticated: { value: true }, userRole: { value: 'student' },
    currentUser: { value: { id: 'student-1', name: 'Test Student', email: 'student@example.test' } },
    authForm: { value: { email: 'student@example.test', password: '', remember: true } },
    activeScreen: { value: 'simulation' }, simulationRunning: { value: true },
    simulationNeedsLandscape: { value: false },
    isQuickSailMode: { value: quickSail },
    exitConfirmVisible: { value: false }, exitFinalConfirmVisible: { value: false },
    activeTrainingModule: { value: quickSail ? null : { id: 'module-1' } },
    activeMission: { value: quickSail ? null : { id: 'mission-1' } },
    isTrainingReviewMode: { value: review }, interactionReadyStep: { value: 'buoy-1' },
    trainingStepBaseline: { value: {} }, trainingRunMetrics: { value: { startedAt: 123 } },
    currentTrainingStep: { value: 1 }, trainingStepSuccess: { value: false },
    trainingRunFinished: { value: false }, trainingStepError: { value: true }, trainingFeedback: { value: 'Try again' },
    postDockingQuizTriggered: { value: false }, showPostDockingQuiz: { value: false }, postDockingQuizData: { value: {} },
    missionReadyToReport: { value: true },
    adminLoginMode: { value: false }, activeCamera: { value: 'chase' }, menuStartCamera: { value: 'chase' },
    gearInfoPopup: { value: null }, orbitControls: { enabled: true }, mouseLookReady: true,
    keyStates: {}, waypointClears: 0,
    engineStarting: { value: true }, engineRunning: { value: true },
    performanceManager: { isActive: true, cancelMission() { this.isActive = false; } },
    clearWaypointMarkers() { context.waypointClears++; }, dismissTrainingNotification() {},
    createTrainingRunMetrics() { return { startedAt: null }; },
    cancelExitHold() {}, resetCameraLookOffset() {}, syncUiCursor() {}, syncOrbitControlsEnabled() {},
    snapChaseCamera() {}, updateCompassStripViewportWidth() {},
    nextTick(callback) { callback(); }, requestAnimationFrame(callback) { callback(); },
    window: { addEventListener(type, callback) { const handlers = listeners.get(type) ?? []; handlers.push(callback); listeners.set(type, handlers); } },
    document: { getElementById() { return null; } },
  };
  vm.createContext(context);
  for (const name of ['showExitConfirm', 'confirmExit', 'cancelExitConfirm', 'confirmFinalExit', 'cancelFinalExit', 'exitTraining', 'goToScreen', 'setupInputs']) {
    vm.runInContext(appFunction(name), context);
  }
  context.setupInputs();
  const press = (code, repeat = false) => {
    const event = { code, key: code, repeat, defaultPrevented: false, preventDefault() { this.defaultPrevented = true; } };
    for (const handler of listeners.get('keydown')) handler(event);
    return event;
  };
  return { context, press };
}

for (const mode of [{ name: 'mission' }, { name: 'practice review', review: true }, { name: 'Quick Sail', quickSail: true }]) {
  test(`ESC quits ${mode.name} to the dashboard while retaining the signed-in student`, () => {
    const { context, press } = simulation(mode);
    const identity = context.currentUser.value;
    const loginForm = context.authForm.value;
    assert.equal(press('Escape').defaultPrevented, true);
    assert.equal(context.exitConfirmVisible.value, true);
    press('Enter');
    assert.equal(context.exitFinalConfirmVisible.value, true);
    press('Enter');
    assert.equal(context.activeScreen.value, 'dashboard');
    assert.equal(context.simulationRunning.value, false);
    assert.equal(context.performanceManager.isActive, false);
    assert.equal(context.engineStarting.value, false);
    assert.equal(context.engineRunning.value, false);
    assert.equal(context.isAuthenticated.value, true);
    assert.equal(context.currentUser.value, identity);
    assert.equal(context.authForm.value, loginForm);
    assert.equal(context.userRole.value, 'student');
    assert.equal(context.activeMission.value, null);
    assert.equal(context.activeTrainingModule.value, null);
    assert.equal(context.isTrainingReviewMode.value, false);
    assert.equal(context.missionReadyToReport.value, false);
    assert.equal(context.isQuickSailMode.value, false);
    assert.equal(context.waypointClears, 1);
    assert.equal(context.exitConfirmVisible.value, false);
    assert.equal(context.exitFinalConfirmVisible.value, false);
  });
}

test('ESC cancels either exit dialog without leaving the simulation or clearing login', () => {
  const { context, press } = simulation();
  const mission = context.activeMission.value;
  press('Escape');
  press('Escape');
  assert.equal(context.exitConfirmVisible.value, false);
  press('Escape');
  press('Enter');
  press('Escape');
  assert.equal(context.exitFinalConfirmVisible.value, false);
  assert.equal(context.activeScreen.value, 'simulation');
  assert.equal(context.activeMission.value, mission);
  assert.equal(context.simulationRunning.value, true);
  assert.equal(context.isAuthenticated.value, true);
  assert.equal(context.waypointClears, 0);
});

test('ESC outside the simulation never opens a quit dialog or changes authentication', () => {
  const { context, press } = simulation();
  context.activeScreen.value = 'dashboard';
  press('Escape');
  assert.equal(context.activeScreen.value, 'dashboard');
  assert.equal(context.exitConfirmVisible.value, false);
  assert.equal(context.exitFinalConfirmVisible.value, false);
  assert.equal(context.isAuthenticated.value, true);
});
