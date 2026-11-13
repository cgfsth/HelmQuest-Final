import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import * as Vue from 'vue';
import { renderToString } from '@vue/server-renderer';
import { compile } from '@vue/compiler-dom';
import { parse } from '@vue/compiler-sfc';
import { BookOpen, Search, RefreshCw, ArrowLeft, Eye, Plus, FolderOpen, ChevronRight, X, Upload } from '@lucide/vue';

const app = readFileSync(new URL('../src/App.vue', import.meta.url), 'utf8').replace(/\r\n/g, '\n');
const materials = readFileSync(new URL('../src/components/materials/LearningMaterials.vue', import.meta.url), 'utf8');
const slotStart = app.indexOf('<section class="student-syllabus-missions"');
const slotTemplate = app.slice(slotStart, app.indexOf('</section>', slotStart) + '</section>'.length);
const render = template => new Function('Vue', compile(template, { mode: 'function', prefixIdentifiers: true }).code)(Vue);
const mission = { id: 'harbor', title: 'Harbor Navigation', difficulty: 'Beginner', description: 'Follow the buoys and dock.', duration: '10 minutes', xpReward: 100 };

async function library({ catalogError = '', modules = [mission], selected = null, materialsError = '', ready = true } = {}) {
  const MissionSection = { render: render(slotTemplate), setup: () => ({
    trainingModules: modules, missionCatalogLoading: false, missionCatalogError: catalogError,
    startingSyllabusMission: '', syllabusMissionError: '', refreshStudentMissions() {},
    isModuleFullyComplete: () => false, isModuleLockedForStudent: () => false,
    displayModuleLevel: () => 'Level 1', trainingDifficultyClass: () => '', moduleLockMessage: () => '',
    getModuleSchedule: () => ({}), getMissionsForModule: id => [{ id: `CUSTOM-${id}`, passScore: 70 }],
    missionCardClass: () => '', isMissionLocked: () => false, getMissionResult: () => null,
    missionActionLabel: () => 'Start →', launchSyllabusMission() {}
  }) };
  const Library = {
    render: render(parse(materials).descriptor.template.content),
    components: { BookOpen, Search, RefreshCw, ArrowLeft, Eye, Plus, FolderOpen, ChevronRight, X, Upload,
      PdfDocumentViewer: { render: () => null }, CourseOutline: { render: () => Vue.h('div', 'Course lessons') } },
    setup: () => ({ document: null, activityDetail: null, role: 'student', manager: false, selected,
      busy: false, loading: false, ready, search: '', filter: '', visibleSyllabi: [],
      error: materialsError, notice: '', cleanupPending: false, editor: null, removal: null,
      preview: false, official: null, lessonId: '', modules: [], activities: [], courseProgress: {},
      refresh() {}, back() {}, selectLesson() {}, openActivity() {}, edit() {}, confirmDelete() {}, addActivity() {}, moveActivity() {}, move() {} })
  };
  return renderToString(Vue.createSSRApp({ render: () => Vue.h(Library, {}, { missions: () => Vue.h(MissionSection) }) }));
}

test('students can see and start class missions inside the syllabus library even without an uploaded syllabus', async () => {
  const html = await library();
  assert.match(html, /No syllabi yet/);
  assert.match(html, /Your missions/);
  assert.match(html, /Harbor Navigation/);
  assert.match(html, /Start →/);
  const studentNav = app.slice(app.indexOf('<nav class="hub-sidebar-nav" aria-label="Training sections"'), app.indexOf('<!-- Main content -->', app.indexOf('id="student-navigation"')));
  assert.doesNotMatch(studentNav, /selectHubTab\('missions'\)/);
  assert.match(studentNav, /selectHubTab\('materials'\)/);
});

test('missions remain reachable when the document library fails; catalog failure has a retry instead of a false empty state', async () => {
  assert.match(await library({ materialsError: 'Documents unavailable', ready: false }), /Harbor Navigation/);
  const failed = await library({ catalogError: 'Unable to load your missions.', modules: [] });
  assert.match(failed, /Unable to load your missions/);
  assert.match(failed, /Refresh missions/);
  assert.doesNotMatch(failed, /has not shared any missions/);
  assert.match(await library({ modules: [] }), /has not shared any missions/);
  assert.doesNotMatch(await library({ selected: { id: 'course', title: 'Navigation' } }), /Your missions/);
});

function launcher(overrides = {}) {
  const launches = [];
  const context = {
    currentUser: Vue.ref({ id: 'student' }), userRole: Vue.ref('student'), isStudentPending: Vue.ref(false),
    startingSyllabusMission: Vue.ref(''), syllabusMissionError: Vue.ref(''), missionCatalogError: Vue.ref(''),
    activeCoursePractical: Vue.ref({ activityId: 'old-lesson' }), loadMissionDatesFromFirestore: async () => {},
    findMissionForModule: id => id === mission.id ? mission : null, isMissionLocked: () => false,
    moduleLockMessage: () => 'Not open yet', startMissionSimulation: async item => launches.push(item), ...overrides
  };
  const start = app.indexOf('async function launchSyllabusMission(');
  vm.createContext(context);
  vm.runInContext(app.slice(start, app.indexOf('\n}', start) + 2), context);
  return { context, launches, start: context.launchSyllabusMission };
}

test('mission launch refreshes access, clears old lesson context and preserves lock/deletion guards', async () => {
  const page = launcher();
  await page.start('harbor');
  assert.equal(page.launches.length, 1);
  assert.equal(page.launches[0], mission);
  assert.equal(page.context.activeCoursePractical.value, null);
  await page.start('deleted');
  assert.equal(page.launches.length, 1);
  assert.match(page.context.syllabusMissionError.value, /no longer available/);
  page.context.isMissionLocked = () => true;
  await page.start('harbor');
  assert.equal(page.launches.length, 1);
  assert.equal(page.context.syllabusMissionError.value, 'Not open yet');
});

test('double clicks and switching student accounts during mission refresh cannot launch twice or leak into a new account', async () => {
  let release;
  const page = launcher({ loadMissionDatesFromFirestore: () => new Promise(resolve => { release = resolve; }) });
  const pending = page.start('harbor');
  await page.start('harbor');
  page.context.currentUser.value = { id: 'other' };
  release(); await pending;
  assert.equal(page.launches.length, 0);
  assert.equal(page.context.startingSyllabusMission.value, '');
  assert.equal(page.context.syllabusMissionError.value, '');
});
