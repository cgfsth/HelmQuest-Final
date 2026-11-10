import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { ref } from 'vue';
import { authenticateUser } from '../src/helpers/progressStore.js';
import { studentTotalXp } from '../shared/progression.js';

const source = readFileSync(new URL('../src/App.vue', import.meta.url), 'utf8').replace(/\r\n/g, '\n');
function actualFunction(name) {
  const start = source.search(new RegExp(`(?:async )?function ${name}\\(`));
  assert.ok(start >= 0);
  return source.slice(start, source.indexOf('\n}', start) + 2);
}
function deferred() {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
const tick = async () => { await Promise.resolve(); await Promise.resolve(); };

function login({ role = 'student', api, proceed, FormData } = {}) {
  const calls = [], users = [];
  const dependencies = {
    authSubmitting: ref(false), authError: ref(''),
    authForm: ref({ email: role === 'admin' ? 'admin@helmquest.local' : `${role}@dnsc.edu.ph`, password: 'password' }),
    adminLoginMode: ref(role === 'admin'), instructorLoginMode: ref(role === 'instructor'),
    authenticateUser, studentTotalXp, FormData,
    console: { error() {} },
    proceedWithAuthentication: async user => { users.push(user); await proceed?.(user); },
    firebaseApi: {
      clearSession() { calls.push('clear'); },
      loginDemo: async (...args) => { calls.push(['demo', ...args]); return api?.(...args) ?? { user: {} }; },
      loginStudent: async (...args) => { calls.push(['student', ...args]); return api?.(...args) ?? { student: { id: 's1', status: 'active', xp: 10 } }; },
      loginInstructor: async (...args) => { calls.push(['instructor', ...args]); return api?.(...args) ?? { instructor: { id: 'i1', status: 'active' } }; },
    },
  };
  dependencies.window = { firebaseApi: dependencies.firebaseApi };
  const handlers = new Function(...Object.keys(dependencies), `
    ${actualFunction('submitLoginOnEnter')}
    ${actualFunction('mockAuthenticate')}
    ${actualFunction('tryStudentAuthenticationFallback')}
    return { mockAuthenticate, submitLoginOnEnter };
  `)(...Object.values(dependencies));
  return { ...dependencies, ...handlers, calls, users };
}

for (const role of ['student', 'instructor']) {
  test(`${role}: the first submit starts once and remains locked until the dashboard finishes loading`, async () => {
    const request = deferred(), dashboard = deferred();
    const view = login({ role, api: () => request.promise, proceed: () => dashboard.promise });
    const first = view.mockAuthenticate();
    assert.equal(view.authSubmitting.value, true);
    assert.equal(view.calls.length, 1);
    await view.mockAuthenticate();
    assert.equal(view.calls.length, 1);
    request.resolve({ [role]: { id: 'account', status: 'active' } });
    await tick();
    assert.equal(view.users.length, 1);
    assert.equal(view.authSubmitting.value, true);
    await view.mockAuthenticate();
    assert.equal(view.calls.length, 1);
    dashboard.resolve(); await first;
    assert.equal(view.authSubmitting.value, false);
    assert.equal(view.authError.value, '');
    assert.equal(view.users[0].role, role);
  });
}

test('admin submits once locally and demo users retain their server-session login path', async () => {
  const dashboard = deferred();
  const admin = login({ role: 'admin', proceed: () => dashboard.promise });
  const pending = admin.mockAuthenticate();
  await admin.mockAuthenticate();
  assert.deepEqual(admin.calls, ['clear']);
  assert.equal(admin.users.length, 1);
  dashboard.resolve(); await pending;
  assert.equal(admin.authSubmitting.value, false);
  for (const role of ['student', 'instructor']) {
    const demo = login({ role });
    demo.authForm.value.email = `${role}@helmquest.local`;
    await demo.mockAuthenticate();
    assert.equal(demo.calls[0][0], 'demo');
    assert.equal(demo.users[0].role, role);
  }
});

test('a failed attempt restores the button and a single retry succeeds', async () => {
  let fail = true;
  const view = login({ api: async () => {
    if (fail) throw new Error('Failed to fetch');
    return { student: { id: 's1', status: 'active' } };
  } });
  await view.mockAuthenticate();
  assert.equal(view.authSubmitting.value, false);
  assert.match(view.authError.value, /unavailable/);
  assert.equal(view.users.length, 0);
  fail = false;
  await view.mockAuthenticate();
  assert.equal(view.users.length, 1);
  assert.equal(view.authError.value, '');
});

test('autofilled values are taken from the form before the controls are disabled', async () => {
  const form = { elements: {} };
  const view = login({ FormData: class {
    constructor(element) { assert.equal(element, form); }
    get(name) { return name === 'email' ? '  AUTOFILLED@dnsc.edu.ph  ' : 'autofilled-password'; }
  } });
  view.authForm.value = { email: '', password: '' };
  await view.mockAuthenticate({ currentTarget: form });
  assert.deepEqual(view.calls[0], ['student', 'autofilled@dnsc.edu.ph', 'autofilled-password']);
  assert.equal(view.users.length, 1);
});

test('Enter requests the native validated submit; held keys, IME, eye button and pending login cannot duplicate it', () => {
  const view = login();
  let submitted = 0, prevented = 0;
  const event = { target: { tagName: 'INPUT' }, currentTarget: { requestSubmit() { submitted++; } }, preventDefault() { prevented++; } };
  view.submitLoginOnEnter(event);
  assert.equal(submitted, 1);
  assert.equal(prevented, 1);
  view.submitLoginOnEnter({ ...event, repeat: true });
  view.submitLoginOnEnter({ ...event, isComposing: true });
  view.submitLoginOnEnter({ ...event, target: { tagName: 'BUTTON' } });
  view.authSubmitting.value = true;
  view.submitLoginOnEnter(event);
  assert.equal(submitted, 1);
});

test('approval and account-status checks still prevent restricted logins and release the submit lock', async () => {
  for (const status of ['pending', 'inactive', 'rejected']) {
    const view = login({ api: async () => ({ student: { id: 's1', status } }) });
    await view.mockAuthenticate();
    assert.equal(view.users.length, 0);
    assert.equal(view.authSubmitting.value, false);
    assert.match(view.authError.value, status === 'pending' ? /approval/ : /disabled/);
  }
  const instructor = login({ role: 'instructor', api: async () => ({ instructor: { status: 'inactive' } }) });
  await instructor.mockAuthenticate();
  assert.equal(instructor.users.length, 0);
  assert.match(instructor.authError.value, /disabled/);
  const admin = login({ role: 'admin' });
  admin.authForm.value.email = 'student@dnsc.edu.ph';
  await admin.mockAuthenticate();
  assert.equal(admin.users.length, 0);
  assert.match(admin.authError.value, /Invalid admin/);
});

function handoff({ loadMissions = async () => {}, loadStudent = async () => {} } = {}) {
  const screens = [], calls = [];
  const dependencies = {
    showCinematicLoading: ref(false), loadingHint: ref(''), isAuthenticated: ref(false),
    userRole: ref(null), currentUser: ref(null), progressData: ref({}), adminLoginMode: ref(false), hubTab: ref('missions'),
    loadProgress: () => ({}), applySavedLevelCreator() {}, loadMissionDatesFromFirestore: loadMissions,
    applyStoredStudentProgress: async () => { calls.push('student-progress'); await loadStudent(); },
    syncStudentMotivation() { throw new Error('Student progress already syncs motivation; do not load it twice'); },
    refreshInstructorProgress() { calls.push('instructor-progress'); }, fetchInstructorRecentActivities() {},
    goToScreen: screen => screens.push(screen), showAchievement() {},
    localStorage: { getItem: () => '1' }, WELCOME_ACHIEVEMENT_KEY: 'welcome',
    firebaseApi: { clearSession() { calls.push('clear-session'); } },
  };
  const proceed = new Function(...Object.keys(dependencies), `${actualFunction('proceedWithAuthentication')}; return proceedWithAuthentication;`)(...Object.values(dependencies));
  return { ...dependencies, proceed, screens, calls };
}

test('dashboard loading remains visible through initialization with no timed delay or duplicate student sync', async () => {
  const missions = deferred(), student = deferred();
  const view = handoff({ loadMissions: () => missions.promise, loadStudent: () => student.promise });
  const pending = view.proceed({ id: 's1', role: 'student', status: 'active' });
  assert.equal(view.showCinematicLoading.value, true);
  assert.deepEqual(view.screens, []);
  missions.resolve(); await tick();
  assert.equal(view.showCinematicLoading.value, true);
  assert.deepEqual(view.calls, ['student-progress']);
  student.resolve(); await pending;
  assert.deepEqual(view.screens, ['dashboard']);
  assert.equal(view.hubTab.value, 'overview');
  assert.equal(view.showCinematicLoading.value, false);
});

test('initialization failures release the loading overlay and return to a retryable login', async () => {
  const view = handoff({ loadMissions: async () => { throw new Error('dashboard failed'); } });
  await assert.rejects(view.proceed({ id: 's1', role: 'student' }), /dashboard failed/);
  assert.equal(view.showCinematicLoading.value, false);
  assert.equal(view.isAuthenticated.value, false);
  assert.equal(view.currentUser.value, null);
  assert.deepEqual(view.screens, ['auth']);
  assert.deepEqual(view.calls, ['clear-session']);
});
