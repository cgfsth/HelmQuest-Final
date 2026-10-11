import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as Vue from 'vue';
import { compile } from '@vue/compiler-dom';
import { renderToString } from '@vue/server-renderer';
import { buildInstructorOverview } from '../backend/services/instructorOverview.js';

const source = readFileSync(new URL('../src/App.vue', import.meta.url), 'utf8').replace(/\r\n/g, '\n');
const templateStart = source.indexOf('<section v-show="instructorTab === \'overview\'" class="instructor-overview"');
const templateEnd = source.indexOf('<section v-show="instructorTab === \'missions\'"', templateStart);
const { code } = compile(source.slice(templateStart, templateEnd), { mode: 'function', prefixIdentifiers: true });
const render = new Function('Vue', code)(Vue);
const bindingStart = source.indexOf('// The instructor overview always uses');
const bindingEnd = source.indexOf('/**\n * Enhanced student records with training summary data', bindingStart);
const data = buildInstructorOverview({ instructorId: 'teacher',
  students: ['a','b','c'].map(id => ({ id, instructorid: 'teacher', name: id, status: 'active' })),
  missions: [{ id: 'm1', title: 'First Mission', createdBy: 'teacher' }, { id: 'm2', title: 'Second Mission', instructorId: 'teacher' }],
  missionScores: [{ id: 'r1', studentId: 'a', missionId: 'CUSTOM-m1', score: 80, passed: true }]
});
function view(api) {
  const dependencies = { ref: Vue.ref, watch: Vue.watch, currentUser: Vue.ref({ id: 'teacher' }),
    userRole: Vue.ref('instructor'), activeScreen: Vue.ref('landing'), instructorTab: Vue.ref('overview'),
    firebaseApi: { getInstructorOverview: api } };
  const scope = Vue.effectScope();
  const bindings = scope.run(() => new Function(...Object.keys(dependencies), `${source.slice(bindingStart, bindingEnd)}
    return { instructorOverview, instructorOverviewLoading, instructorOverviewError, fetchInstructorOverview };`)(...Object.values(dependencies)));
  return { ...dependencies, ...bindings, scope,
    html: () => renderToString(Vue.createSSRApp({ render, setup: () => ({ ...bindings, instructorTab: 'overview', selectInstructorTab() {} }) })) };
}

test('actual overview loads backend values and renders matching summary/per-mission progress', async () => {
  const calls = [];
  const page = view(async id => { calls.push(id); return data; });
  try {
    await page.fetchInstructorOverview();
    assert.deepEqual(calls, ['teacher']);
    const html = await page.html();
    assert.match(html, /1 \/ 6 student mission completions/);
    assert.match(html, /1 \/ 3 students passed/);
    assert.match(html, /17%/);
    assert.match(html, /33%/);
    assert.match(html, /No mission attempts yet/);
    assert.doesNotMatch(html, /Avg Score|Average Class Score|Top Performing/);
  } finally { page.scope.stop(); }
});

test('refresh reads new saved results and backend failure shows a usable error message', async () => {
  let response = data;
  const page = view(async () => {
    if (!response) throw new Error('Offline');
    return response;
  });
  try {
    await page.fetchInstructorOverview();
    response = { ...data, completionRate: 33, completed: 2 };
    await page.fetchInstructorOverview();
    assert.equal(page.instructorOverview.value.completed, 2);
    response = null;
    await page.fetchInstructorOverview();
    assert.match(page.instructorOverviewError.value, /Please try Refresh/);
    assert.equal(page.instructorOverviewLoading.value, false);
  } finally { page.scope.stop(); }
});

test('changing instructor clears old data and ignores a delayed response from the previous class', async () => {
  let resolveFirst;
  const page = view(id => id === 'teacher' ? new Promise(resolve => { resolveFirst = resolve; }) : Promise.resolve({ ...data, totalStudents: 0 }));
  try {
    const first = page.fetchInstructorOverview();
    page.currentUser.value = { id: 'other-teacher' };
    await Vue.nextTick();
    assert.equal(page.instructorOverview.value, null);
    await page.fetchInstructorOverview();
    resolveFirst(data);
    await first;
    assert.equal(page.instructorOverview.value.totalStudents, 0);
  } finally { page.scope.stop(); }
});

test('opening the overview fetches the backend summary automatically', async () => {
  const calls = [];
  const page = view(async id => { calls.push(id); return data; });
  try {
    page.activeScreen.value = 'dashboard';
    await Vue.nextTick();
    await Vue.nextTick();
    assert.deepEqual(calls, ['teacher']);
    assert.equal(page.instructorOverview.value.totalStudents, 3);
  } finally { page.scope.stop(); }
});

test('instructor login sets role, identity and screen together without clearing the loaded summary', async () => {
  const calls = [];
  const page = view(async id => { calls.push(id); return data; });
  try {
    page.userRole.value = 'student';
    page.currentUser.value = { id: 'student' };
    await Vue.nextTick();
    // Match proceedWithAuthentication: role changes before the account and screen.
    page.userRole.value = 'instructor';
    page.currentUser.value = { id: 'teacher' };
    page.activeScreen.value = 'dashboard';
    await Vue.nextTick();
    await Vue.nextTick();
    assert.deepEqual(calls, ['teacher']);
    assert.equal(page.instructorOverview.value?.totalStudents, 3);
    assert.equal(page.instructorOverviewLoading.value, false);
    assert.equal(page.instructorOverviewError.value, '');
    assert.match(await page.html(), /Total Students/);
  } finally { page.scope.stop(); }
});

test('switching accounts on the open dashboard replaces the previous class with one fresh request', async () => {
  const calls = [];
  const page = view(async id => { calls.push(id); return id === 'teacher' ? data : buildInstructorOverview({ instructorId: id }); });
  try {
    page.activeScreen.value = 'dashboard';
    await Vue.nextTick();
    await Vue.nextTick();
    assert.equal(page.instructorOverview.value.totalStudents, 3);
    page.userRole.value = 'student';
    page.currentUser.value = { id: 'student' };
    await Vue.nextTick();
    assert.equal(page.instructorOverview.value, null);
    page.userRole.value = 'instructor';
    page.currentUser.value = { id: 'other-teacher' };
    await Vue.nextTick();
    await Vue.nextTick();
    assert.deepEqual(calls, ['teacher', 'other-teacher']);
    assert.equal(page.instructorOverview.value.totalStudents, 0);
    assert.match(await page.html(), /No enrolled students yet/);
  } finally { page.scope.stop(); }
});

test('missing instructor identity displays a sign-in error instead of a blank summary', async () => {
  const page = view(async () => { throw new Error('Should not call the API without an ID'); });
  try {
    page.currentUser.value = {};
    page.activeScreen.value = 'dashboard';
    await Vue.nextTick();
    assert.equal(page.instructorOverviewLoading.value, false);
    assert.match(await page.html(), /Please sign in again/);
  } finally { page.scope.stop(); }
});
