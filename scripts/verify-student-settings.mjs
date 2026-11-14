// Real profile-card markup, settings component, preferences and password API;
// only isolated accounts and Firestore substitutes are used.
import { createServer } from 'vite';
import { compile } from '@vue/compiler-dom';
import { parse, compileStyle } from '@vue/compiler-sfc';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import assert from 'node:assert/strict';
import bcrypt from '../backend/node_modules/bcrypt/bcrypt.js';
import { materialsFixture } from '../backend/tests/helpers/materialsFixture.js';
import { createAccountRouter } from '../backend/routes/accountRouter.js';
import { issueSession } from '../backend/services/authSession.js';
import { headlessBrowser } from './lib/headless-browser.mjs';

const directory = resolve('../.tmp/student-settings'); mkdirSync(directory, { recursive: true });
const fixture = materialsFixture({ middleware(req, res, next) {
  res.setHeader('Access-Control-Allow-Origin', '*'); res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  if (req.method === 'OPTIONS') return res.sendStatus(204); next();
} });
fixture.records.students.sa = { name: 'Kevin ben', email: 'kevin@dnsc.edu.ph', studentId: 'Dnsc00334–2026', status: 'active', password: await bcrypt.hash('old-password', 4) };
fixture.records.students.sb = { name: 'Another Student', email: 'other@dnsc.edu.ph', studentId: 'Dnsc00335–2026', status: 'active' };
fixture.app.use('/auth', createAccountRouter({ db: fixture.db }));
fixture.app.post('/auth/demo-login', (req, res) => res.json({ sessionToken: issueSession(req.body.email === 'other@dnsc.edu.ph' ? 'sb' : 'sa', 'student') }));
const apiServer = await new Promise(resolve => { const server = fixture.app.listen(0, '127.0.0.1', () => resolve(server)); });
const apiOrigin = `http://127.0.0.1:${apiServer.address().port}`;
const source = readFileSync(new URL('../src/App.vue', import.meta.url), 'utf8').replace(/\r\n/g, '\n');
const start = source.indexOf('<div v-else class="missions-hub missions-hub--with-sidebar student-hub-shell"');
const end = source.indexOf('<LearningMaterials v-if="hubTab', start);
const settingsStart = source.indexOf('<StudentSettings v-if="hubTab', end);
const settingsEnd = source.indexOf('/>', settingsStart) + 2;
assert.ok(start > 0 && end > start && settingsEnd > settingsStart);
const template = `<div class="simulation-container"><div class="scene-overlay dashboard-overlay student-dashboard-overlay">${source.slice(start, end).replace('<div v-else ', '<div ')}${source.slice(settingsStart, settingsEnd)}</div></div></div></div>`;
const { code } = compile(template, { mode: 'function', prefixIdentifiers: true });
const styles = parse(source).descriptor.styles.map(style => compileStyle({ source: style.content, id: 'data-v-settings-host', scoped: style.scoped }).code).join('\n');
const appFunction = name => { const start = source.indexOf(`function ${name}(`); return source.slice(source.slice(start - 6, start) === 'async ' ? start - 6 : start, source.indexOf('\n}', start) + 2); };
const modulePath = resolve(directory, 'fixture.mjs');
writeFileSync(modulePath, `import * as Vue from 'vue';
import StudentSettings from '/src/components/StudentSettings.vue';
import {Settings,BookOpen} from '@lucide/vue';
import {useSimulationPreferences,DEFAULT_SIMULATION_PREFERENCES} from '/src/composables/useSimulationPreferences.js';
import * as api from '/src/api/firebaseApi.js';
import '/src/style.css';
import '/src/student-portal.css';
const {ref,computed,watch,nextTick,onMounted,onUnmounted}=Vue;
const component={__scopeId:'data-v-settings-host',components:{StudentSettings,Settings,BookOpen},render:new Function('Vue',${JSON.stringify(code)})(Vue),setup(){
  const currentUser=ref(null),isAuthenticated=ref(false),userRole=ref('student'),hubTab=ref('overview');
  const controls=Object.fromEntries(Object.entries(DEFAULT_SIMULATION_PREFERENCES).map(([key,value])=>[key,ref(value)])),preferencesStorageNotice=ref('');
  const {preferences:studentPreferences,resetPreferences:resetStudentPreferences}=useSimulationPreferences({currentUser,isAuthenticated,userRole,controls,storageNotice:preferencesStorageNotice});
  const demoStudent=computed(()=>({...currentUser.value,rank:'Deck Cadet',xp:110,xpProgress:22,completed:0,badgesEarned:0,badgesTotal:8,certificates:0}));
  const studentProfileExtras=computed(()=>({studentId:currentUser.value?.studentId}));
  const studentCompactLayout=ref(false),studentMenuOpen=ref(false),studentMenuPanel=ref(null),studentMenuTrigger=ref(null),studentMenuClose=ref(null);
  ${['openStudentMenu','closeStudentMenu','trapStudentMenuFocus','updateStudentMenuLayout'].map(appFunction).join('\n')}
  const media=window.matchMedia('(width < 1024px)');onMounted(()=>{updateStudentMenuLayout(media);media.addEventListener('change',updateStudentMenuLayout);});onUnmounted(()=>media.removeEventListener('change',updateStudentMenuLayout));
  window.fixture={get preferences(){return studentPreferences.value;},async login(other=false){isAuthenticated.value=false;await api.loginDemo(other?'other@dnsc.edu.ph':'kevin@dnsc.edu.ph','fixture');currentUser.value=other?{id:'sb',name:'Another Student',email:'other@dnsc.edu.ph',studentId:'Dnsc00335–2026'}:{id:'sa',name:'Kevin ben',email:'kevin@dnsc.edu.ph',studentId:'Dnsc00334–2026'};isAuthenticated.value=true;}};
  window.fixture.login();
  return {currentUser,demoStudent,studentProfileExtras,hubTab,studentPreferences,resetStudentPreferences,preferencesStorageNotice,
    studentCompactLayout,studentMenuOpen,studentMenuPanel,studentMenuTrigger,studentMenuClose,openStudentMenu,closeStudentMenu,trapStudentMenuFocus,
    tutorialVisible:false,tutorialEligible:false,sidebarCollapsed:false,navigationMissions:[],selectHubTab:tab=>{hubTab.value=tab;},signOut(){}};
}};
const root={setup:()=>()=>Vue.h(component)};Vue.createApp(root).mount('#app');`);
const vite = await createServer({ cacheDir: resolve(directory, 'vite-cache'), define: { 'import.meta.env.VITE_API_BASE_URL': JSON.stringify(apiOrigin) },
  server: { host: '127.0.0.1', port: 5294, strictPort: true, hmr: false, fs: { allow: [resolve('..')] } },
  plugins: [{ name: 'settings-fixture', configureServer(server) { server.middlewares.use((req, res, next) => {
    if (req.url !== '/__settings-test') return next(); res.setHeader('Content-Type', 'text/html');
    res.end(`<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>${styles}</style></head><body><div id="app"></div><script type="module" src="/@fs/${modulePath.replaceAll('\\', '/')}"></script></body></html>`);
  }); } }] });
let browser;
try {
  await vite.listen(); browser = await headlessBrowser({ directory, port: 9260 }); await browser.viewport(1365);
  const url = 'http://127.0.0.1:5294/__settings-test'; await browser.navigate(url);
  await browser.waitFor('document.querySelector(".hub-sidebar-name")?.textContent === "Kevin ben"');
  await browser.clickExpression('document.querySelector(\'[aria-label="Open account settings"]\')');
  await browser.waitFor('document.querySelector("#ss-current-password")');
  assert.equal(await browser.evaluate('document.querySelector(\'[aria-label="Open account settings"]\').getAttribute("aria-current")'), 'page');
  await browser.fill('#ss-current-password', 'old-password'); await browser.fill('#ss-new-password', 'new-password'); await browser.fill('#ss-confirm-password', 'mismatch');
  await browser.click('Update password'); await browser.waitFor('document.querySelector(".ss-error")?.textContent.includes("do not match")');
  await browser.fill('#ss-current-password', 'wrong-password'); await browser.fill('#ss-confirm-password', 'new-password');
  await browser.click('Update password'); await browser.waitFor('document.querySelector(".ss-error")?.textContent.includes("incorrect")');
  await browser.fill('#ss-current-password', 'old-password'); await browser.click('Update password');
  await browser.waitFor('document.querySelector(".ss-success")');
  assert.equal(await bcrypt.compare('new-password', fixture.records.students.sa.password), true);
  assert.equal(await bcrypt.compare('old-password', fixture.records.students.sa.password), false);
  assert.equal(await browser.evaluate('document.querySelector("#ss-current-password").value'), '');
  await browser.fill('#ss-graphics', 'low'); await browser.fill('#ss-camera', 'helm'); await browser.fill('#ss-volume', '0');
  assert.equal(await browser.evaluate('window.fixture.preferences.soundVolume'), 0);
  await browser.evaluate('document.querySelector(".dashboard-overlay").scrollTop=0');
  await browser.screenshot('settings-desktop');
  for (const width of [768, 375]) {
    await browser.viewport(width); await browser.waitFor('!document.querySelector(".missions-main").inert');
    assert.equal(await browser.evaluate('document.documentElement.scrollWidth<=innerWidth'), true);
    assert.equal(await browser.evaluate('document.querySelector(".missions-main").scrollWidth<=document.querySelector(".missions-main").clientWidth'), true);
    await browser.evaluate('document.querySelector(".dashboard-overlay").scrollTop=0');
    await browser.screenshot('settings-' + width);
  }
  await browser.clickExpression('document.querySelector(".student-menu-trigger")');
  await browser.waitFor('document.querySelector(".student-hub--menu-open")');
  await browser.waitFor('document.querySelector(".hub-sidebar").getBoundingClientRect().x >= -1');
  await browser.clickExpression('document.querySelector(\'[aria-label="Open account settings"]\')');
  await browser.waitFor('!document.querySelector(".student-hub--menu-open")');
  await browser.viewport(1365); await browser.navigate(url);
  await browser.waitFor('document.querySelector(".hub-sidebar-name")?.textContent === "Kevin ben"');
  await browser.clickExpression('document.querySelector(\'[aria-label="Open account settings"]\')');
  await browser.waitFor('document.querySelector("#ss-graphics")?.value === "low"');
  assert.equal(await browser.evaluate('document.querySelector("#ss-camera").value'), 'helm');
  assert.equal(await browser.evaluate('document.querySelector("#ss-volume").value'), '0');
  await browser.evaluate('window.fixture.login(true)'); await browser.waitFor('document.querySelector(".ss-identity strong")?.textContent === "Another Student"');
  assert.equal(await browser.evaluate('document.querySelector("#ss-graphics").value'), 'medium');
  assert.equal(await browser.evaluate('document.querySelector("#ss-current-password").value'), '');
  await browser.evaluate('window.fixture.login()'); await browser.waitFor('document.querySelector("#ss-graphics")?.value === "low"');
  await browser.click('Restore defaults'); assert.equal(await browser.evaluate('document.querySelector("#ss-graphics").value'), 'medium');
  assert.deepEqual(browser.errors, []);
  console.log('PASS: profile opens Settings; mobile drawer closes; password errors/success use the real API; preferences persist, reset and stay separate per student; 375/768/1365px layouts fit.');
  console.log('Screenshots: ' + directory);
} finally { browser?.close(); apiServer.closeAllConnections(); await new Promise(resolve => apiServer.close(resolve)); await vite.close(); }
