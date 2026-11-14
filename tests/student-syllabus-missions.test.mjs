import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import * as Vue from 'vue';
import { renderToString } from '@vue/server-renderer';
import { compile } from '@vue/compiler-dom';
import { parse } from '@vue/compiler-sfc';
import { normalizeEncounter } from '../shared/vesselEncounter.js';
import { Anchor, ArrowDown, ArrowLeft, ArrowUp, BookOpen, ChevronDown, Megaphone, Pencil, Plus, Trash2 } from '@lucide/vue';

const app = readFileSync(new URL('../src/App.vue', import.meta.url), 'utf8').replace(/\r\n/g, '\n');
const outline = readFileSync(new URL('../src/components/materials/CourseOutline.vue', import.meta.url), 'utf8');
const materials = readFileSync(new URL('../src/components/materials/LearningMaterials.vue', import.meta.url), 'utf8').replace(/\r\n/g, '\n');
const render = new Function('Vue', compile(parse(outline).descriptor.template.content, { mode: 'function', prefixIdentifiers: true }).code)(Vue);
const modules = [{ id: 'first', title: 'Navigation', moduleNumber: 1 }, { id: 'second', title: 'Docking', moduleNumber: 2 }];

async function course(manager, hasPdf = true) {
  return renderToString(Vue.createSSRApp({ render,
    components: { Anchor, ArrowDown, ArrowLeft, ArrowUp, BookOpen, ChevronDown, Megaphone, Pencil, Plus, Trash2,
      CourseActivityRow: { render: () => null }, OfficialSyllabusMatrix: { render: () => null } },
    setup: () => ({ syllabus: { title: 'Maritime Training' }, visibleModules: modules, displayedModules: modules,
      official: null, focusedLessonId: '', manager, missionAuthoring: manager, missionQuizzesLoading: false, missionQuizLabel: () => 'Create Quiz',
      simulationAccess: Object.fromEntries(modules.map(module => [module.id, { canCreate: hasPdf, canStart: hasPdf }])),
      busy: false, collapsed: {}, allCollapsed: false, rows: () => [], officialSection: () => null, PRACTICAL_ALIGNMENT: {}, toggle() {}, toggleAll() {} })
  }));
}

test('each instructor module has Create mission; students get course content without mission authoring or a separate sidebar tab', async () => {
  assert.equal((await course(true)).match(/Create mission/g).length, 2);
  assert.doesNotMatch(await course(false), /Create mission/);
  const navStart = app.indexOf('<nav class="hub-sidebar-nav" aria-label="Instructor sections"');
  assert.doesNotMatch(app.slice(navStart, app.indexOf('</nav>', navStart)), /selectInstructorTab\('missions'\)/);
  assert.doesNotMatch(app, /instructorTab === 'missions'|template #missions/);
});

test('the module explains that a PDF is required and disables Create mission until it is uploaded', async () => {
  const blocked = await course(true, false);
  assert.match(blocked, /Upload a PDF lesson in this module to enable mission creation/);
  assert.equal((blocked.match(/class="lm-primary lc-create-mission" disabled/g) || []).length, 2);
});

function extract(source, name) {
  let start = source.indexOf(`function ${name}(`);
  if (source.slice(start - 6, start) === 'async ') start -= 6;
  assert.ok(start >= 0, name);
  return source.slice(start, source.indexOf('\n}', start) + 2);
}

test('module context carries the exact course, module and saved activity and ignores callbacks after navigating away', async () => {
  const loaded = [], context = { props: { role: 'instructor' }, preview: Vue.ref(false), modules: Vue.ref(modules),
    selected: Vue.ref({ id: 'course', title: 'Course' }), identity: 1, notice: Vue.ref(''), load: async id => loaded.push(id) };
  vm.createContext(context); vm.runInContext(extract(materials, 'missionContext'), context);
  const link = context.missionContext('second', { id: 'activity', targetId: 'existing', revision: 3 });
  assert.equal(link.moduleId, 'second'); assert.equal(link.syllabusId, 'course');
  assert.equal(link.activityId, 'activity'); assert.equal(link.missionId, 'existing');
  await link.onSaved(); assert.deepEqual(loaded, ['course']);
  context.identity++; await link.onSaved(); assert.equal(loaded.length, 1);
  context.props.role = 'student'; assert.equal(context.missionContext('first'), null);
});

function editorPage(saveModuleMission) {
  const notifications = [], refreshes = [];
  const context = { normalizeEncounter, currentUser: Vue.ref({ id: 'teacher' }), userRole: Vue.ref('instructor'),
    missionEditorModal: Vue.ref(null), missionEditorError: Vue.ref(''), missionSaving: Vue.ref(false),
    trainingModules: Vue.ref([]), progressData: Vue.ref({}), Date, console: { log() {}, error() {} },
    firebaseApi: { saveModuleMission }, window: { firebaseApi: { createMission: () => assert.fail('Must save through the module API') } },
    ensureMissionBuoySteps() {}, saveProgress() {}, persistMissionQuiz: async () => {}, showAchievement: text => notifications.push(text) };
  vm.createContext(context);
  vm.runInContext(['openMissionCreator', 'openCourseMissionCreator', 'addMissionBuoy', 'saveMissionEditor'].map(name => extract(app, name)).join('\n'), context);
  context.openCourseMissionCreator({ syllabusId: 'course', syllabusTitle: 'Course', moduleId: 'second', moduleTitle: 'Docking', onSaved: async () => refreshes.push(true) });
  context.addMissionBuoy();
  return { context, refreshes, notifications };
}

test('Save Mission uses the originating module API and refreshes that syllabus instead of creating an unlinked mission', async () => {
  const requests = [];
  const page = editorPage(async (...args) => { requests.push(args); return { activityId: 'linked', revision: 1 }; });
  const id = page.context.missionEditorModal.value.data.id;
  await page.context.saveMissionEditor();
  assert.equal(requests.length, 1); assert.equal(requests[0][0], 'course'); assert.equal(requests[0][1], 'second');
  assert.equal(requests[0][2].missionId, id); assert.equal(requests[0][2].published, true);
  assert.equal(page.context.trainingModules.value.length, 1); assert.equal(page.refreshes.length, 1);
  assert.equal(page.context.missionEditorModal.value, null);
});

test('failed module saves keep the editor and mission ID for retry; late saves cannot update another instructor', async () => {
  let fail = true;
  const page = editorPage(async () => { if (fail) throw new Error('Offline'); return { activityId: 'linked', revision: 1 }; });
  const draft = page.context.missionEditorModal.value;
  await page.context.saveMissionEditor();
  assert.equal(page.context.missionEditorModal.value, draft);
  assert.match(page.context.missionEditorError.value, /Offline/);
  assert.equal(page.context.trainingModules.value.length, 0);
  fail = false; await page.context.saveMissionEditor(); assert.equal(page.context.trainingModules.value.length, 1);
  let release;
  const late = editorPage(() => new Promise(resolve => { release = resolve; }));
  const pending = late.context.saveMissionEditor();
  late.context.currentUser.value = { id: 'other' };
  release({ activityId: 'linked', revision: 1 }); await pending;
  assert.equal(late.context.trainingModules.value.length, 0); assert.equal(late.refreshes.length, 0);
});

test('editing a linked mission retains the activity schedule in the mission editor', async () => {
  const context = { currentUser: Vue.ref({ id: 'teacher' }), userRole: Vue.ref('instructor'), missionSaving: Vue.ref(false),
    missionCatalogError: Vue.ref(''), trainingModules: Vue.ref([{ id: 'existing' }]), missionEditorModal: Vue.ref(null),
    loadMissionDatesFromFirestore: async () => {}, openMissionEditor: () => { context.missionEditorModal.value = { data: {} }; }, showAchievement() {} };
  vm.createContext(context); vm.runInContext(extract(app, 'openCourseMissionEditor'), context);
  await context.openCourseMissionEditor({ missionId: 'existing', availableFrom: '2026-12-01T08:00:00Z', availableUntil: '2026-12-10T08:00:00Z' });
  assert.match(context.missionEditorModal.value.data.openDate, /^2026-12-01T/);
  assert.match(context.missionEditorModal.value.data.deadline, /^2026-12-10T/);
});

test('client-side authoring and launch handlers cannot bypass missing PDF prerequisites', async () => {
  const emitted = [], apiCalls = [];
  const authoring = { simulationAccess: Vue.ref({}), error: Vue.ref(''), emit: (...args) => emitted.push(args), missionContext: () => ({}) };
  vm.createContext(authoring); vm.runInContext(extract(materials, 'createModuleMission'), authoring);
  authoring.createModuleMission('first');
  assert.equal(emitted.length, 0); assert.match(authoring.error.value, /Upload a PDF/);
  const student = { busy: Vue.ref(false), manager: Vue.ref(false), preview: Vue.ref(false), activityDetail: Vue.ref({ type: 'simulation' }),
    currentSimulationAccess: Vue.ref({ canStart: false, message: 'View the module PDF first.' }), error: Vue.ref(''), api: { launchLearningActivity: () => apiCalls.push(true) } };
  vm.createContext(student); vm.runInContext(extract(materials, 'startActivity'), student);
  await student.startActivity();
  assert.equal(apiCalls.length, 0); assert.equal(student.error.value, 'View the module PDF first.');
});

test('returning from the PDF reader waits for the saved view before refreshing simulation access', async () => {
  let release;
  const refreshes = [], context = { identity: 1, document: Vue.ref({ id: 'pdf' }), loading: Vue.ref(false),
    viewRecording: new Promise(resolve => { release = resolve; }), refresh: async () => refreshes.push(true) };
  vm.createContext(context); vm.runInContext(extract(materials, 'closeReader'), context);
  const pending = context.closeReader();
  assert.equal(refreshes.length, 0); assert.equal(context.loading.value, true);
  release(); await pending; assert.equal(refreshes.length, 1);
});
