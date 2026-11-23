// Actual Vue link editor and signed API with synthetic records; no external video requests.
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createServer } from 'vite';
import { materialsFixture, samplePdf } from '../backend/tests/helpers/materialsFixture.js';
import { issueSession } from '../backend/services/authSession.js';
import { headlessBrowser } from './lib/headless-browser.mjs';

const directory = resolve('../.tmp/lesson-links');mkdirSync(directory, { recursive: true });
const fixture = materialsFixture({ middleware(req, res, next) {
  res.setHeader('Access-Control-Allow-Origin', '*');res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  if (req.method === 'OPTIONS') return res.sendStatus(204);next();
} });
const owner = { id: 'a', role: 'instructor' };
const { id: syllabusId } = await fixture.service.save(owner, 'syllabi', null, { title: 'Navigation course' }, { originalname: 'course.pdf', mimetype: 'application/pdf', buffer: samplePdf() });
const { id: lessonId } = await fixture.service.save(owner, 'syllabus_modules', null, { title: 'Lesson 1', moduleNumber: 1 }, null, syllabusId);
await fixture.service.save(owner, 'syllabus_modules', null, { title: 'Lesson 2', moduleNumber: 2 }, null, syllabusId);
fixture.records.students.sa.xp = 100;
fixture.app.post('/auth/demo-login', (req, res) => {
  const role = req.body.email.split('@')[0];res.json({ sessionToken: issueSession(role === 'student' ? 'sa' : 'a', role) });
});
const apiServer = await new Promise(resolve => { const server = fixture.app.listen(0, '127.0.0.1', () => resolve(server)); });
const modulePath = resolve(directory, 'fixture.mjs');
writeFileSync(modulePath, `import {createApp,h,ref,nextTick} from 'vue';
import LearningMaterials from '/src/components/materials/LearningMaterials.vue';
import * as api from '/src/api/firebaseApi.js';
const role=ref('instructor'),user=ref(null);
window.fixture={opens:[],async login(value){user.value=null;await nextTick();api.clearSession();role.value=value;await api.loginDemo(value+'@local','local');user.value={id:value==='student'?'sa':'a',name:value};}};
window.open=(url,target,features)=>{window.fixture.opens.push({url,target,features});return null;};
createApp({setup:()=>()=>h('main',[user.value?h(LearningMaterials,{currentUser:user.value,role:role.value,initialCourseId:${JSON.stringify(syllabusId)}}):null])}).mount('#app');window.fixture.login('instructor');`);
const vite = await createServer({ cacheDir: resolve(directory, 'vite-cache'), optimizeDeps: { entries: [], include: ['vue', '@lucide/vue'] }, resolve: { dedupe: ['vue'] },
  define: { 'import.meta.env.VITE_API_BASE_URL': JSON.stringify(`http://127.0.0.1:${apiServer.address().port}`) },
  server: { host: '127.0.0.1', port: 5295, strictPort: true, hmr: false, fs: { allow: [resolve('..')] } },
  plugins: [{ name: 'lesson-link-fixture', configureServer(server) { server.middlewares.use((req, res, next) => {
    if (req.url !== '/__lesson-links') return next();res.setHeader('Content-Type', 'text/html');
    res.end(`<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0;background:#0a1628;font-family:Arial,sans-serif}main{max-width:1180px;margin:auto;padding:12px;box-sizing:border-box}</style></head><body><div id="app"></div><script type="module" src="/@fs/${modulePath.replaceAll('\\', '/')}"></script></body></html>`);
  }); } }] });
await vite.listen();let browser;
try {
  browser = await headlessBrowser({ directory, port: 9262 });await browser.viewport(1365);await browser.navigate('http://127.0.0.1:5295/__lesson-links');
  await browser.waitFor('document.querySelectorAll(".lm-module").length===2');await browser.click('Add video link');
  await browser.waitFor('document.querySelector(".lm-modal input[type=url]")');
  assert.equal(await browser.evaluate('document.querySelectorAll(".lm-form input,.lm-form textarea,.lm-form select").length'), 1);
  await browser.fill('input[type=url]', 'ftp://example.com/video');await browser.click('Save link');
  await browser.waitFor('document.querySelector(".lm-modal .lm-error")');assert.equal(Object.keys(fixture.records.learning_activities || {}).length, 0);
  const firstUrl = 'https://www.youtube.com/watch?v=nav12345678';
  await browser.fill('input[type=url]', firstUrl);await browser.screenshot('url-only-editor-desktop');await browser.click('Save link');
  await browser.waitFor('!document.querySelector(".lm-modal") && document.querySelector(".lc-type-link")');
  const id = Object.keys(fixture.records.learning_activities)[0];
  assert.equal(fixture.records.learning_activities[id].moduleId, lessonId);assert.equal(fixture.records.learning_activities[id].published, true);
  assert.equal(fixture.records.learning_activities[id].description, '');assert.equal(fixture.files.size, 1);
  await browser.screenshot('lesson-video-link-desktop');
  await browser.viewport(375);assert.equal(await browser.evaluate('document.documentElement.scrollWidth<=innerWidth'), true);
  await browser.clickExpression('document.querySelector(\'[aria-label="Edit activity Video link"]\')');
  await browser.waitFor('document.querySelector(".lm-modal input[type=url]")');
  assert.equal(await browser.evaluate('document.querySelectorAll(".lm-form input,.lm-form textarea,.lm-form select").length'), 1);
  const updatedUrl = 'https://youtu.be/new12345678';
  await browser.fill('input[type=url]', updatedUrl);await browser.screenshot('url-only-editor-mobile');await browser.click('Save link');
  await browser.waitFor('!document.querySelector(".lm-modal") && document.body.textContent.includes("new12345678")');
  await browser.evaluate('window.fixture.login("student")');await browser.waitFor('document.querySelector(".lc-type-link") && !document.querySelector(".lc-section-tools")');
  assert.equal(await browser.evaluate('[...document.querySelectorAll("button")].some(button=>button.textContent.includes("Add video link"))'), false);
  await browser.clickExpression('document.querySelector(".lc-type-link").closest(".lc-activity-open")');
  await browser.waitFor('document.querySelector(".lc-type-link")?.closest(".lc-activity").querySelector(".lc-status summary").textContent.includes("Done")');
  assert.deepEqual(await browser.evaluate('window.fixture.opens'), [{ url: updatedUrl, target: '_blank', features: 'noopener,noreferrer' }]);
  assert.equal(fixture.records.students.sa.xp, 100);assert.equal(fixture.records.mission_score, undefined);await browser.screenshot('student-video-link-mobile');
  await browser.evaluate('window.fixture.login("instructor")');await browser.waitFor('document.querySelector(\'[aria-label="Delete activity Video link"]\')');
  await browser.clickExpression('document.querySelector(\'[aria-label="Delete activity Video link"]\')');await browser.click('Delete document');
  await browser.waitFor('!document.querySelector(".lm-modal") && !document.querySelector(".lc-type-link")');
  assert.equal(fixture.records.learning_activities[id], undefined);assert.deepEqual(browser.errors, []);
  console.log('PASS: URL-only editor, validation, create/edit/delete, published student access, new-tab opening, no XP and desktop/mobile layouts.');
  console.log('Screenshots: ' + directory);
} finally { browser?.close();apiServer.closeAllConnections();await new Promise(resolve => apiServer.close(resolve));await vite.close(); }
