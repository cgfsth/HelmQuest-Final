// Actual Vue components and signed API, with isolated synthetic records/files.
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createServer } from 'vite';
import { materialsFixture, samplePdf } from '../backend/tests/helpers/materialsFixture.js';
import { issueSession } from '../backend/services/authSession.js';
import { OFFICIAL_SYLLABUS, OFFICIAL_SYLLABUS_KEY } from '../shared/officialSyllabus.js';
import { headlessBrowser } from './lib/headless-browser.mjs';

const directory = resolve('../.tmp/syllabus-deletion');
mkdirSync(directory, { recursive: true });
const fixture = materialsFixture({ middleware(req, res, next) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,DELETE,OPTIONS');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
} });
const owner = { id: 'a', role: 'instructor' }, file = { originalname: 'course.pdf', mimetype: 'application/pdf', buffer: samplePdf() };
const { id: customId } = await fixture.service.save(owner, 'syllabi', null, { title: 'Custom Navigation' }, file);
const { id: moduleId } = await fixture.service.save(owner, 'syllabus_modules', null, { title: 'Navigation lesson', moduleNumber: 1 }, file, customId);
await fixture.course.save(owner, customId, moduleId, null, { type: 'pdf', title: 'Lesson resource', published: true }, file);
const { id: officialId } = await fixture.service.save(owner, 'syllabi', null, { title: OFFICIAL_SYLLABUS.title, officialSyllabusKey: OFFICIAL_SYLLABUS_KEY }, file);
await fixture.service.save({ id: 'b', role: 'instructor' }, 'syllabi', null, { title: 'Other instructor course' }, file);
fixture.app.post('/auth/demo-login', (req, res) => {
  const role = req.body.email.split('@')[0], id = { instructor: 'a', admin: 'admin', student: 'sa' }[role];
  res.json({ sessionToken: issueSession(id, role) });
});
const apiServer = await new Promise(resolve => { const server = fixture.app.listen(0, '127.0.0.1', () => resolve(server)); });
const modulePath = resolve(directory, 'fixture.mjs');
writeFileSync(modulePath, `import {createApp,h,ref,nextTick} from 'vue';
import LearningMaterials from '/src/components/materials/LearningMaterials.vue';
import * as api from '/src/api/firebaseApi.js';
const role=ref('instructor'),user=ref(null);
window.fixture={async login(value){user.value=null;await nextTick();api.clearSession();role.value=value;await api.loginDemo(value+'@local','local');user.value={id:value==='student'?'sa':value==='admin'?'admin':'a',name:'Local test'};}};
createApp({setup:()=>()=>h('main',[user.value?h(LearningMaterials,{currentUser:user.value,role:role.value}):null])}).mount('#app');window.fixture.login('instructor');`);
const vite = await createServer({ cacheDir: resolve(directory, 'vite-cache'), optimizeDeps: { entries: [], include: ['vue', '@lucide/vue'] }, resolve: { dedupe: ['vue'] },
  define: { 'import.meta.env.VITE_API_BASE_URL': JSON.stringify(`http://127.0.0.1:${apiServer.address().port}`) },
  server: { host: '127.0.0.1', port: 5294, strictPort: true, hmr: false, fs: { allow: [resolve('..')] } },
  plugins: [{ name: 'syllabus-delete-fixture', configureServer(server) { server.middlewares.use((req, res, next) => {
    if (req.url !== '/__delete-test') return next();
    res.setHeader('Content-Type', 'text/html');
    res.end(`<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0;background:#0a1628;font-family:Arial,sans-serif}main{max-width:1180px;margin:auto;padding:12px;box-sizing:border-box}</style></head><body><div id="app"></div><script type="module" src="/@fs/${modulePath.replaceAll('\\', '/')}"></script></body></html>`);
  }); } }] });
await vite.listen();
let browser;
try {
  browser = await headlessBrowser({ directory, port: 9261 });
  await browser.viewport(1365);await browser.navigate('http://127.0.0.1:5294/__delete-test');
  await browser.waitFor('document.querySelectorAll(".lm-grid .lm-card").length===2');
  assert.equal(await browser.evaluate('document.querySelectorAll(".lm-card .lm-danger").length'), 2);
  await browser.screenshot('instructor-library-delete-desktop');
  const customDelete = `[...document.querySelectorAll('.lm-card')].find(card=>card.textContent.includes('Custom Navigation')).querySelector('.lm-danger')`;
  await browser.clickExpression(customDelete);await browser.waitFor('document.querySelector(".lm-modal")');
  assert.equal(await browser.evaluate('document.querySelector(".lm-modal").textContent.includes("cannot be undone")'), true);
  await browser.click('Cancel');await browser.waitFor('!document.querySelector(".lm-modal")');
  assert.ok(fixture.records.syllabi[customId]);
  // A stale card must show the server conflict without deleting any content.
  fixture.records.syllabi[customId].revision++;
  await browser.clickExpression(customDelete);await browser.click('Delete document');
  await browser.waitFor('document.querySelector(".lm-modal .lm-error")');assert.ok(fixture.records.syllabi[customId]);
  await browser.click('Cancel');await browser.clickExpression('document.querySelector(\'[aria-label="Refresh learning materials"]\')');
  await browser.waitFor('document.querySelectorAll(".lm-card .lm-danger").length===2');
  await browser.clickExpression(customDelete);await browser.click('Delete document');
  await browser.waitFor('!document.querySelector(".lm-modal") && document.querySelectorAll(".lm-grid .lm-card").length===1');
  assert.equal(fixture.records.syllabi[customId], undefined);assert.equal(fixture.records.syllabus_modules[moduleId], undefined);
  assert.equal(Object.values(fixture.records.learning_activities).some(item => item.syllabusId === customId), false);
  await browser.viewport(375);assert.equal(await browser.evaluate('document.documentElement.scrollWidth<=innerWidth'), true);
  await browser.screenshot('instructor-library-delete-mobile');
  await browser.clickExpression('document.querySelector(".lm-card .lm-danger")');await browser.waitFor('document.querySelector(".lm-modal")');
  assert.equal(await browser.evaluate('document.documentElement.scrollWidth<=innerWidth'), true);await browser.screenshot('confirm-syllabus-delete-mobile');
  await browser.click('Delete document');await browser.waitFor('!document.querySelector(".lm-modal") && document.body.textContent.includes("No syllabi yet")');
  assert.equal(fixture.records.syllabi[officialId], undefined);
  assert.equal(Object.values(fixture.records.syllabus_modules).some(item => item.syllabusId === officialId), false);
  await browser.evaluate('window.fixture.login("admin")');await browser.waitFor('document.querySelector(".lm-card .lm-danger")');
  await browser.clickExpression('document.querySelector(".lm-card .lm-danger")');await browser.click('Delete document');
  await browser.waitFor('!document.querySelector(".lm-modal") && document.body.textContent.includes("No syllabi yet")');
  assert.equal(fixture.files.size, 0);
  await browser.evaluate('window.fixture.login("student")');await browser.waitFor('document.body.textContent.includes("No syllabi yet")');
  assert.equal(await browser.evaluate('[...document.querySelectorAll("button")].some(button=>button.textContent.includes("Delete"))'), false);
  assert.deepEqual(browser.errors, []);
  console.log('PASS: library delete, cancel, stale-revision error, custom/official cascade, admin deletion, student visibility and desktop/mobile layouts.');
  console.log('Screenshots: ' + directory);
} finally {
  browser?.close();apiServer.closeAllConnections();await new Promise(resolve => apiServer.close(resolve));await vite.close();
}
