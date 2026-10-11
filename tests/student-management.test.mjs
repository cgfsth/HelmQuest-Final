import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as Vue from 'vue';
import { compile } from '@vue/compiler-dom';
import { renderToString } from '@vue/server-renderer';

const source = readFileSync(new URL('../src/App.vue', import.meta.url), 'utf8').replace(/\r\n/g, '\n');
function between(start, end) {
  const first = source.indexOf(start), last = source.indexOf(end, first);
  assert.ok(first >= 0 && last > first);
  return source.slice(first, last);
}
const bindingsSource = between('// Student Management reads account data', '// End Student Management bindings.');
const detailSource = between('async function openStudentDetail(student)', '/**\n * Approve a pending student signup');
const csvSource = between('function buildStudentManagementCsv(rows)', 'function exportStudentRecords()');
const legacyStudentLoadSource = between('async function loadAllStudents()', '/**\n * Load training summaries for all students');
const instructorTabSource = between('function selectInstructorTab(tab)', 'function selectAdminTab(tab)');
const renderTable = new Function('Vue', compile(between('<!-- Student Management -->', '<!-- Leaderboards Section (Instructor) -->'), { mode: 'function', prefixIdentifiers: true }).code)(Vue);
const renderDetail = new Function('Vue', compile(between('<!-- Student Detail Modal -->', '<!-- Gamification popup -->'), { mode: 'function', prefixIdentifiers: true }).code)(Vue);
const student = { id: 'student', studentId: 'S-001', name: 'Student One', email: 'one@dnsc.edu.ph', status: 'active', rank: 'Deck Cadet', xp: 110,
  nextRank: 'Ordinary Seaman (OS)', xpNextAt: 500, missionsCompleted: 3, missionsTotal: 3, missionsFailed: 0,
  quizzesCompleted: 3, quizzesTotal: 3, quizzesPassed: 2, badgesEarned: 1, certificates: 0, missionScore: 73, quizScore: 67,
  latestActivity: '2026-10-06T13:30:00.000Z', missionsDetail: [{ missionId: 'm1', title: 'Saved mission', score: 0, status: 'Failed', completedAt: '2026-10-06' }],
  quizzesDetail: [{ quizId: 'q1', title: 'Saved quiz', score: 0, correctCount: 0, totalQuestions: 1, status: 'Failed', submittedAt: '2026-10-06' }] };
const data = { students: [student, { ...student, id: 'inactive', name: 'Inactive Student', status: 'inactive' }, { ...student, id: 'pending', name: 'Pending Student', status: 'pending' }] };
function page(api) {
  const dependencies = { ref: Vue.ref, computed: Vue.computed, watch: Vue.watch, currentUser: Vue.ref({ id: 'teacher' }),
    userRole: Vue.ref('instructor'), activeScreen: Vue.ref('landing'), instructorTab: Vue.ref('overview'), firebaseApi: api,
    selectedStudentDetail: Vue.ref(null), studentDetailTab: Vue.ref('overview'), showStudentDetailModal: Vue.ref(false) };
  const scope = Vue.effectScope();
  const bindings = scope.run(() => new Function(...Object.keys(dependencies), `${bindingsSource}\n${detailSource}\n${csvSource}
    return { studentManagement, studentManagementLoading, studentManagementError, studentSearch, studentStatusFilter,
      managedStudents, filteredManagedStudents, fetchStudentManagement, studentDetailLoading, studentDetailError,
      openStudentDetail, loadStudentDetailData, closeStudentDetail, buildStudentManagementCsv };`)(...Object.values(dependencies)));
  const setup = () => ({ ...dependencies, ...bindings, exportStudentRecords() {}, confirmRemoveStudent() {}, formatSessionDate: value => value });
  return { ...dependencies, ...bindings, scope,
    html: () => renderToString(Vue.createSSRApp({ render: renderTable, setup })),
    detailHtml: () => renderToString(Vue.createSSRApp({ render: renderDetail, setup })) };
}

test('actual student table shows saved XP, rank and counts without browser-local training data', async () => {
  const view = page({ getInstructorStudentManagement: async () => data });
  try {
    await view.fetchStudentManagement();
    const html = await view.html();
    assert.match(html, /110 XP/);
    assert.match(html, /Deck Cadet/);
    assert.match(html, /3\/3/);
    assert.match(html, /one@dnsc.edu.ph/);
    assert.match(html, /View records/);
    assert.match(html, /aria-label="Remove Student One"/);
    assert.match(html, /student-remove-icon/);
    assert.match(html, /Enrolled students: 2/);
    assert.doesNotMatch(html, /2 of 2 students/);
    assert.doesNotMatch(html, /Pending Student|Reset progress|Mission Score|Quiz Score/);
  } finally { view.scope.stop(); }
});

test('a background refresh keeps the last successful student rows visible', async () => {
  const view = page({ getInstructorStudentManagement: async () => data });
  try {
    await view.fetchStudentManagement();
    view.studentManagementLoading.value = true;
    const html = await view.html();
    assert.match(html, /Student One/);
    assert.match(html, /Refreshing/);
    assert.doesNotMatch(html, /Loading student records/);
  } finally { view.scope.stop(); }
});

test('legacy instructor loaders cannot start a duplicate Student Management request', () => {
  assert.doesNotMatch(legacyStudentLoadSource, /fetchStudentManagement\s*\(/);
  assert.doesNotMatch(instructorTabSource, /loadAllStudents\s*\(|loadPendingStudents\s*\(|fetchStudentManagement\s*\(/);
});

test('role, identity and screen changes during login load Student Management without cancelling it', async () => {
  const calls = [];
  const view = page({ getInstructorStudentManagement: async id => { calls.push(id); return data; } });
  try {
    view.userRole.value = 'student'; view.currentUser.value = { id: 'student' };
    await Vue.nextTick();
    view.userRole.value = 'instructor'; view.currentUser.value = { id: 'teacher' };
    view.activeScreen.value = 'dashboard'; view.instructorTab.value = 'students';
    await Vue.nextTick(); await Vue.nextTick();
    assert.deepEqual(calls, ['teacher']);
    assert.equal(view.managedStudents.value.length, 2);
  } finally { view.scope.stop(); }
});

test('search supports name, school ID and email; status filtering does not merge students sharing a school ID', async () => {
  const view = page({ getInstructorStudentManagement: async () => data });
  try {
    await view.fetchStudentManagement();
    view.studentSearch.value = 'one@dnsc';
    assert.equal(view.filteredManagedStudents.value.length, 2);
    view.studentSearch.value = 'S-001';
    assert.equal(view.filteredManagedStudents.value.length, 2);
    view.studentStatusFilter.value = 'inactive';
    assert.equal(view.filteredManagedStudents.value[0].id, 'inactive');
    view.studentSearch.value = 'none';
    assert.match(await view.html(), /No students match/);
  } finally { view.scope.stop(); }
});

test('Review fetches a fresh class-scoped record and updates the table/export snapshot too', async () => {
  const fresh = { ...student, missionScore: 0, quizScore: 0 };
  const calls = [];
  const view = page({ getInstructorStudentManagement: async () => structuredClone(data), getInstructorStudentRecord: async (...args) => { calls.push(args); return { student: fresh }; } });
  try {
    await view.fetchStudentManagement();
    await view.openStudentDetail(student);
    assert.deepEqual(calls, [['teacher', 'student']]);
    assert.equal(view.studentManagement.value.students[0].missionScore, 0);
    const html = await view.detailHtml();
    assert.match(html, /Average mission score/);
    assert.match(html, /0%/);
    assert.match(html, /Badges earned/);
    view.studentDetailTab.value = 'missions';
    assert.match(await view.detailHtml(), /Saved mission/);
    assert.match(await view.detailHtml(), /0%/);
    view.studentDetailTab.value = 'quizzes';
    assert.match(await view.detailHtml(), /Saved quiz/);
    assert.match(await view.detailHtml(), /0\/1/);
    assert.match(view.buildStudentManagementCsv([view.studentManagement.value.students[0]]), /"0","0"/);
  } finally { view.scope.stop(); }
});

test('backend failures show errors and retries, while true empty classes show an empty state', async () => {
  let offline = true;
  const view = page({ getInstructorStudentManagement: async () => { if (offline) throw new Error('Offline'); return { students: [] }; },
    getInstructorStudentRecord: async () => { throw new Error('Offline'); } });
  try {
    await view.fetchStudentManagement();
    assert.match(await view.html(), /Could not load your students/);
    assert.doesNotMatch(await view.html(), /No enrolled students yet/);
    offline = false;
    await view.fetchStudentManagement();
    assert.match(await view.html(), /No enrolled students yet/);
    await view.openStudentDetail(student);
    assert.match(await view.detailHtml(), /Could not load this student/);
    assert.match(await view.detailHtml(), /Try again/);
    assert.doesNotMatch(await view.detailHtml(), /Average mission score/);
  } finally { view.scope.stop(); }
});

test('changing instructor ignores the previous class response and clears its open student record', async () => {
  let resolveOld;
  const view = page({ getInstructorStudentManagement: id => id === 'teacher' ? new Promise(resolve => { resolveOld = resolve; }) : Promise.resolve({ students: [] }) });
  try {
    const old = view.fetchStudentManagement();
    view.selectedStudentDetail.value = student; view.showStudentDetailModal.value = true;
    view.currentUser.value = { id: 'other-teacher' };
    await Vue.nextTick();
    assert.equal(view.showStudentDetailModal.value, false);
    await view.fetchStudentManagement();
    resolveOld(data); await old;
    assert.equal(view.managedStudents.value.length, 0);
  } finally { view.scope.stop(); }
});

test('quickly reviewing another student ignores the first student’s delayed response', async () => {
  let resolveOld;
  const other = { ...student, id: 'other', name: 'Other' };
  const view = page({ getInstructorStudentRecord: (_, id) => id === 'student' ? new Promise(resolve => { resolveOld = resolve; }) : Promise.resolve({ student: other }) });
  try {
    const old = view.openStudentDetail(student);
    await view.openStudentDetail(other);
    resolveOld({ student }); await old;
    assert.equal(view.selectedStudentDetail.value.id, 'other');
    assert.equal(view.studentDetailLoading.value, false);
    view.closeStudentDetail();
    assert.equal(view.selectedStudentDetail.value, null);
  } finally { view.scope.stop(); }
});

test('CSV uses the displayed filtered records, exact XP/counts and nullable scores with proper quoting', async () => {
  const view = page({ getInstructorStudentManagement: async () => data });
  try {
    await view.fetchStudentManagement();
    view.studentStatusFilter.value = 'active';
    const csv = view.buildStudentManagementCsv(view.filteredManagedStudents.value.map(row => ({ ...row, name: 'One, "Captain"', missionScore: 0, quizScore: null })));
    assert.match(csv, /"One, ""Captain"""/);
    assert.match(csv, /"110","3","3","3","3","0",""/);
    assert.doesNotMatch(csv, /Inactive Student|Pending Student|password/);
  } finally { view.scope.stop(); }
});
