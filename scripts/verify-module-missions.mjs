// Exercise the actual course UI and App mission editor against isolated records.
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { createServer } from 'vite';
import { compile } from '@vue/compiler-dom';
import { parse, compileStyle } from '@vue/compiler-sfc';
import { materialsFixture, samplePdf } from '../backend/tests/helpers/materialsFixture.js';
import { issueSession } from '../backend/services/authSession.js';
import { headlessBrowser } from './lib/headless-browser.mjs';

const directory = resolve('../.tmp/module-mission-authoring'); mkdirSync(directory, { recursive: true });
const pdfPath = resolve(directory, 'module-lesson.pdf'); writeFileSync(pdfPath, samplePdf());
const fixture = materialsFixture({ middleware(req, res, next) {
  res.setHeader('Access-Control-Allow-Origin', '*'); res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
  if (req.method === 'OPTIONS') return res.sendStatus(204); next();
} });
fixture.app.post('/auth/demo-login', (req, res) => { const student = req.body.email.startsWith('student'); res.json({ sessionToken: issueSession(student ? 'sa' : 'a', student ? 'student' : 'instructor') }); });
fixture.app.get('/missions', (req, res) => res.json({ missions: Object.entries(fixture.records.missions || {}).map(([id, data]) => ({ id, ...data })) }));
const owner = { id: 'a', role: 'instructor' }, file = { originalname: 'syllabus.pdf', mimetype: 'application/pdf', buffer: samplePdf() };
const { id: syllabusId } = await fixture.service.save(owner, 'syllabi', null, { title: 'Maritime Training' }, file);
const { id: firstModule } = await fixture.service.save(owner, 'syllabus_modules', null, { title: 'Navigation', moduleNumber: 1 }, null, syllabusId);
const { id: secondModule } = await fixture.service.save(owner, 'syllabus_modules', null, { title: 'Docking', moduleNumber: 2 }, null, syllabusId);
const apiServer = await new Promise(resolve => { const server = fixture.app.listen(0, '127.0.0.1', () => resolve(server)); });
const source = readFileSync(new URL('../src/App.vue', import.meta.url), 'utf8').replace(/\r\n/g, '\n');
function extract(name) {
  let start = source.indexOf(`function ${name}(`); if (source.slice(start - 6, start) === 'async ') start -= 6;
  assert.ok(start >= 0, name); return source.slice(start, source.indexOf('\n}', start) + 2);
}
const modalStart = source.indexOf('<div v-if="missionEditorModal"');
const modalEnd = source.indexOf('<div v-if="quizEditorModal"', modalStart);
const modalCode = compile(source.slice(modalStart, modalEnd), { mode: 'function', prefixIdentifiers: true }).code;
const functions = ['openMissionCreator', 'openCourseMissionCreator', 'openCourseMissionEditor', 'openMissionEditor', 'addMissionBuoy', 'removeMissionBuoy', 'handleMissionBuoyImage', 'saveMissionEditor', 'ensureMissionBuoySteps', 'getModuleSchedule'].map(extract).join('\n');
const loader = source.slice(source.indexOf('let missionCatalogRequest = 0;'), source.indexOf('/**\n * Cheap accessor for the module'));
const styles = parse(source).descriptor.styles.map(style => style.scoped ? compileStyle({ source: style.content, id: 'data-v-module-preview', filename: 'App.vue', scoped: true }).code : style.content).join('\n');
const modulePath = resolve(directory, 'fixture.mjs');
writeFileSync(modulePath, `import * as Vue from 'vue';
import LearningMaterials from '/src/components/materials/LearningMaterials.vue';
import * as firebaseApi from '/src/api/firebaseApi.js';
import {canViewMission,canManageMission,missionOwner} from '/shared/missionAccess.js';
import {getCourseSettings} from '/src/helpers/courseSettings.js';
const {ref}=Vue,currentUser=ref({id:'a',name:'Instructor'}),userRole=ref('instructor'),isAuthenticated=ref(true),trainingModules=ref([]),progressData=ref({courseSettings:{moduleOrder:[],customMissions:[]}}),missionEditorModal=ref(null),missionEditorError=ref(''),missionSaving=ref(false),missionCatalogLoading=ref(false),missionCatalogError=ref('');
window.firebaseApi=firebaseApi;function saveProgress(){}function showAchievement(){}async function persistMissionQuiz(){}
${functions}
${loader}
const state={missionEditorModal,missionEditorError,missionSaving,addMissionBuoy,removeMissionBuoy,handleMissionBuoyImage,saveMissionEditor};
const MissionEditor={__scopeId:'data-v-module-preview',render:new Function('Vue',${JSON.stringify(modalCode)})(Vue),setup:()=>state};
window.fixture={quizzes:[],launches:[],async login(role){missionEditorModal.value=null;await firebaseApi.loginDemo(role+'@local','local');userRole.value=role;currentUser.value={id:role==='student'?'sa':'a',name:role,instructorid:'a'};await loadMissionDatesFromFirestore();}};
await window.fixture.login('instructor');
Vue.createApp({setup:()=>()=>Vue.h('main',[
 Vue.h(LearningMaterials,{key:currentUser.value.id,currentUser:currentUser.value,role:userRole.value,initialCourseId:${JSON.stringify(syllabusId)},missionQuizLabel:()=> 'Create Quiz',onCreateMission:openCourseMissionCreator,onEditMission:openCourseMissionEditor,onEditMissionQuiz:item=>window.fixture.quizzes.push(item),onLaunchSimulation:item=>window.fixture.launches.push({missionId:item.target.id,moduleId:item.lessonId,syllabusId:item.syllabusId})}),Vue.h(MissionEditor)
])}).mount('#app');`);
const vite = await createServer({ cacheDir: resolve(directory, 'cache'), define: { 'import.meta.env.VITE_API_BASE_URL': JSON.stringify(`http://127.0.0.1:${apiServer.address().port}`) },
  server: { host: '127.0.0.1', port: 5297, strictPort: true, hmr: false, fs: { allow: [resolve('..')] } },
  plugins: [{ name: 'module-mission-fixture', configureServer(server) { server.middlewares.use((req, res, next) => {
    if (req.url !== '/__module-missions') return next(); res.setHeader('Content-Type', 'text/html');
    res.end(`<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>${styles}\nbody{margin:0;background:#0a1628;color:#e2e8f0;font-family:Arial,sans-serif}main{max-width:1180px;margin:auto;padding:20px}@media(max-width:600px){main{padding:10px}}</style></head><body><div id="app"></div><script type="module" src="/@fs/${modulePath.replaceAll('\\', '/')}"></script></body></html>`);
  }); } }] });
await vite.listen(); let browser;
try {
  browser = await headlessBrowser({ directory, port: 9264 }); await browser.viewport(1365); await browser.navigate('http://127.0.0.1:5297/__module-missions');
  await browser.waitFor('document.querySelectorAll(".lc-create-mission").length === 2');
  assert.equal(await browser.evaluate('[...document.querySelectorAll(".lc-create-mission")].every(button=>button.disabled)'), true);
  await browser.screenshot('mission-creation-blocked-without-pdf');
  await browser.clickExpression(`document.querySelector('[aria-labelledby="lc-title-${secondModule}"] .lc-add-activity')`);
  await browser.waitFor('document.querySelector(".lm-form")');
  await browser.fill('.lm-form input:not([type])', 'Docking PDF lesson'); await browser.attach(pdfPath);
  await browser.clickExpression('document.querySelector(".lc-publish input")'); await browser.click('Save document');
  await browser.waitFor(`!document.querySelector('.lm-modal') && document.querySelector('[aria-labelledby="lc-title-${secondModule}"] .lc-create-mission')?.disabled === false`);
  await browser.clickExpression(`document.querySelector('[aria-labelledby="lc-title-${secondModule}"] .lc-create-mission')`);
  await browser.waitFor('document.querySelector(".mission-editor-card")');
  assert.match(await browser.evaluate('document.querySelector(".mission-editor-context").textContent'), /Docking/);
  await browser.fill('input[placeholder^="e.g., Mission"]', 'Module 2 Harbor Docking');
  await browser.click('+ Add Buoy'); await browser.screenshot('create-mission-in-module');
  fixture.state.failCommit = true;
  await browser.clickExpression('document.querySelector(".quiz-save-btn")');
  await browser.waitFor('document.querySelector(".mission-editor-error")');
  assert.equal(Object.keys(fixture.records.missions || {}).length, 0);
  fixture.state.failCommit = false; await browser.clickExpression('document.querySelector(".quiz-save-btn")');
  await browser.waitFor('!document.querySelector(".mission-editor-card") && document.body.textContent.includes("Module 2 Harbor Docking")');
  const missionId = Object.keys(fixture.records.missions)[0];
  const activityId = Object.keys(fixture.records.learning_activities).find(id => fixture.records.learning_activities[id].type === 'simulation');
  assert.equal(fixture.records.learning_activities[activityId].moduleId, secondModule);
  assert.equal(await browser.evaluate(`document.querySelector('[aria-labelledby="lc-title-${firstModule}"]').textContent.includes('Module 2 Harbor Docking')`), false);
  await browser.click('Edit mission'); await browser.waitFor('document.querySelector(".mission-editor-card")');
  await browser.fill('input[placeholder^="e.g., Mission"]', 'Revised Docking Mission');
  await browser.clickExpression('document.querySelector(".quiz-save-btn")');
  await browser.waitFor('!document.querySelector(".mission-editor-card") && document.body.textContent.includes("Revised Docking Mission")');
  assert.equal(Object.keys(fixture.records.missions).length, 1); assert.equal(fixture.records.missions[missionId].mission_title, 'Revised Docking Mission');
  await browser.click('Create Quiz'); assert.equal((await browser.evaluate('window.fixture.quizzes[0]')).missionId, missionId);
  for (const width of [1365, 768, 375]) { await browser.viewport(width); assert.equal(await browser.evaluate('document.documentElement.scrollWidth<=innerWidth'), true); await browser.screenshot('module-missions-instructor-' + width); }
  await browser.evaluate('window.fixture.login("student")');
  await browser.waitFor('document.querySelectorAll(".lc-create-mission").length === 0 && document.body.textContent.includes("Revised Docking Mission")');
  assert.equal(await browser.evaluate('document.querySelectorAll(".lc-mission-tools").length'), 0);
  const simulationButton = `[...document.querySelectorAll('.lc-activity-open')].find(button=>button.textContent.includes('Revised Docking Mission'))`;
  assert.equal(await browser.evaluate(`(${simulationButton}).disabled`), true);
  await browser.screenshot('simulation-blocked-before-pdf-view');
  const readingId = Object.keys(fixture.records.learning_activities).find(id => fixture.records.learning_activities[id].type === 'pdf');
  const readingPath = fixture.records.learning_activities[readingId].storagePath, savedFile = fixture.files.get(readingPath);
  fixture.files.delete(readingPath);
  await browser.clickExpression(`[...document.querySelectorAll('.lc-activity-open')].find(button=>button.textContent.includes('Docking PDF lesson'))`);
  await browser.waitFor('document.querySelector(".lm-reader .lm-error")');
  await browser.click('Back to Module'); await browser.waitFor('!document.querySelector(".lm-reader") && !document.querySelector(".lm-empty[role=status]")');
  assert.equal(await browser.evaluate(`(${simulationButton}).disabled`), true);
  assert.equal(Object.values(fixture.records.learning_activity_progress || {}).some(item => item.activityId === readingId && item.viewedAt), false);
  fixture.files.set(readingPath, savedFile);
  await browser.clickExpression(`[...document.querySelectorAll('.lc-activity-open')].find(button=>button.textContent.includes('Docking PDF lesson'))`);
  await browser.waitFor('document.querySelector(".lm-pdf-page canvas")?.width > 0');
  await browser.waitFor('document.querySelector(".lm-pdf-text")?.textContent.length > 0 && !document.querySelector(\'[data-pdf-page="1"] .lm-pdf-placeholder\')');
  await browser.click('Back to Module');
  await browser.waitFor(`!document.querySelector('.lm-reader') && (${simulationButton}) && !(${simulationButton}).disabled`);
  await browser.screenshot('simulation-unlocked-after-pdf-view');
  await browser.clickExpression(`[...document.querySelectorAll('.lc-activity-open')].find(button=>button.textContent.includes('Revised Docking Mission'))`);
  await browser.click('Start Simulation');
  await browser.waitFor('window.fixture.launches.length === 1');
  assert.deepEqual(await browser.evaluate('window.fixture.launches[0]'), { missionId, moduleId: secondModule, syllabusId });
  assert.deepEqual(browser.errors, []);
  console.log('PASS: PDF upload required for authoring, failed PDF open keeps simulation locked, successful rendering unlocks it, per-module creation/editing/retry/quiz controls, correct student launch and mobile layouts.');
  console.log('Screenshots: ' + directory);
} finally { browser?.close(); apiServer.closeAllConnections(); await new Promise(resolve => apiServer.close(resolve)); await vite.close(); }
