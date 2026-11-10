// Exercise the actual auth markup and handlers in a hidden browser, using local mock accounts.
// No real credentials or backend/database writes are involved.
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { spawn } from 'node:child_process';
import { parse } from '@vue/compiler-sfc';
import { DEMO_USERS } from '../shared/demoAccounts.js';

const source = readFileSync(new URL('../src/App.vue', import.meta.url), 'utf8').replace(/\r\n/g, '\n');
function actualFunction(name) {
  const start = source.search(new RegExp(`(?:async )?function ${name}\\(`));
  assert.ok(start >= 0);
  return source.slice(start, source.indexOf('\n}', start) + 2);
}
const template = source.slice(source.indexOf('    <!-- Auth -->'), source.indexOf('    <!-- Dashboard — instructor console -->'));
assert.ok(template.includes('@submit.prevent="mockAuthenticate"'));
const styles = parse(source).descriptor.styles.map(style => style.content).join('\n');
const baseStyles = readFileSync(new URL('../src/style.css', import.meta.url), 'utf8');
const directory = resolve('../.tmp/login-submit-verification');
mkdirSync(directory, { recursive: true });
const fixturePath = resolve(directory, 'login.html');
const vueUrl = pathToFileURL(resolve('node_modules/vue/dist/vue.global.prod.js')).href;
const handlers = ['submitLoginOnEnter', 'mockAuthenticate', 'tryStudentAuthenticationFallback', 'proceedWithAuthentication'].map(actualFunction).join('\n');
writeFileSync(fixturePath, `<!doctype html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1"><style>${baseStyles}\n${styles}</style></head><body><div id="app"></div><script src="${vueUrl}"></script><script>
const { ref } = Vue;
const authSubmitting = ref(false), authError = ref(''), authForm = ref({email:'',password:''});
const authMode = ref('signin'), adminLoginMode = ref(false), instructorLoginMode = ref(false), showPassword = ref(false);
const activeScreen = ref('auth'), isAuthenticated = ref(false), userRole = ref(null), currentUser = ref(null);
const showCinematicLoading = ref(false), loadingHint = ref(''), progressData = ref({}), hubTab = ref('overview');
const signupForm = ref({}), availableInstructors = ref([]), signupSuccess = ref(false);
const WELCOME_ACHIEVEMENT_KEY = 'login-fixture-welcome';
const DEMO_USERS = ${JSON.stringify(DEMO_USERS)};
function authenticateUser(email,password) { const account=DEMO_USERS[email]; return account?.password===password ? {...account,email} : null; }
const studentTotalXp = user => Number(user.xp || 0);
const loadProgress = () => ({}), applySavedLevelCreator = () => {}, loadMissionDatesFromFirestore = async () => {};
const applyStoredStudentProgress = async () => {}, refreshInstructorProgress = () => {}, fetchInstructorRecentActivities = () => {};
const showAchievement = () => {}, goToScreen = screen => { activeScreen.value = screen; };
const switchAuthMode = mode => { authMode.value = mode; }, submitStudentSignup = () => {};
let requests = [], pending;
const makeRequest = type => (email,password) => { requests.push({type,email,password}); return new Promise((resolve,reject) => { pending={resolve,reject,type,email}; }); };
const firebaseApi = { clearSession() {}, loginStudent: makeRequest('student'), loginInstructor: makeRequest('instructor'), loginDemo: makeRequest('demo') };
window.firebaseApi = firebaseApi;
${handlers}
window.fixture = {
  reset(role) { requests=[]; pending=null; authSubmitting.value=false; authError.value=''; authForm.value={email:'',password:''}; authMode.value='signin'; adminLoginMode.value=role==='admin'; instructorLoginMode.value=role==='instructor'; activeScreen.value='auth'; isAuthenticated.value=false; currentUser.value=null; showPassword.value=false; },
  release() { const account={id:'fixture-account',name:'Local Test',email:pending.email,status:'active',instructorid:'fixture-instructor'}; pending.resolve(pending.type==='demo' ? {user:account} : {[pending.type]:account}); },
  reject() { pending.reject(new Error('Invalid credentials')); },
  snapshot() { return {requests:requests.length,busy:authSubmitting.value,screen:activeScreen.value,error:authError.value,role:userRole.value,showPassword:showPassword.value}; }
};
Vue.createApp({ template:${JSON.stringify(template + '<p v-if="activeScreen === \'dashboard\'" id="signed-in">Dashboard ready</p>')}, setup: () => ({
  activeScreen,authMode,authSubmitting,authError,authForm,adminLoginMode,instructorLoginMode,showPassword,
  mockAuthenticate,submitLoginOnEnter,signupForm,availableInstructors,signupSuccess,submitStudentSignup,switchAuthMode,goToScreen
}) }).mount('#app');
</script></body></html>`);

const executable = process.env.HELMQUEST_BROWSER || 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const port = 9238;
const browser = spawn(executable, ['--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
  `--remote-debugging-port=${port}`, `--user-data-dir=${resolve(directory, 'browser-profile')}`, 'about:blank'],
{ windowsHide: true, stdio: 'ignore' });
browser.on('error', error => { console.error(error.message); });
const pause = () => new Promise(resolve => setTimeout(resolve, 100));
let socket, sequence = 0;
const pendingCommands = new Map(), browserErrors = [];
try {
  let targets;
  for (let attempt = 0; attempt < 100; attempt++) {
    try { targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json(); if (targets.some(tab => tab.type === 'page')) break; } catch {}
    await pause();
  }
  assert.ok(targets?.some(tab => tab.type === 'page'), 'Hidden browser did not start');
  socket = new WebSocket(targets.find(tab => tab.type === 'page').webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { socket.addEventListener('open', resolve, { once: true }); socket.addEventListener('error', reject, { once: true }); });
  socket.addEventListener('message', event => {
    const message = JSON.parse(event.data);
    if (message.method === 'Runtime.exceptionThrown') browserErrors.push(message.params.exceptionDetails.text);
    if (!message.id) return;
    const command = pendingCommands.get(message.id);
    pendingCommands.delete(message.id);
    message.error ? command.reject(message.error) : command.resolve(message.result);
  });
  function send(method, params = {}) {
    return new Promise((resolve, reject) => { const id=++sequence; pendingCommands.set(id,{resolve,reject}); socket.send(JSON.stringify({id,method,params})); });
  }
  async function evaluate(expression) {
    const result = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
    if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
    return result.result.value;
  }
  async function waitFor(expression) {
    for (let attempt=0; attempt<70; attempt++) { if (await evaluate(expression)) return; await pause(); }
    throw new Error(`Browser condition did not complete: ${expression}`);
  }
  async function enter() {
    await send('Input.dispatchKeyEvent', {type:'keyDown',key:'Enter',code:'Enter',windowsVirtualKeyCode:13,text:'\r'});
    await send('Input.dispatchKeyEvent', {type:'keyUp',key:'Enter',code:'Enter',windowsVirtualKeyCode:13});
  }
  async function click() {
    const point = await evaluate(`(() => { const r=document.querySelector('.auth-signin-btn').getBoundingClientRect(); return {x:r.x+r.width/2,y:r.y+1}; })()`);
    await send('Input.dispatchMouseEvent', {type:'mouseMoved',...point});
    await send('Input.dispatchMouseEvent', {type:'mousePressed',...point,button:'left',clickCount:1});
    await send('Input.dispatchMouseEvent', {type:'mouseReleased',...point,button:'left',clickCount:1});
  }
  async function prepare(role, {autofill=false}={}) {
    await evaluate(`window.fixture.reset(${JSON.stringify(role)}); Vue.nextTick()`);
    const email = role==='admin' ? 'admin@helmquest.local' : `${role}@dnsc.edu.ph`;
    await evaluate(`(() => { for (const [name,value] of Object.entries(${JSON.stringify({email,password:'password'})})) { const input=document.querySelector('[name='+name+']'); input.value=value; ${autofill ? '' : "input.dispatchEvent(new Event('input',{bubbles:true}));"} } })()`);
  }
  await send('Runtime.enable'); await send('Page.enable');
  await send('Emulation.setDeviceMetricsOverride', {width:1365,height:900,deviceScaleFactor:1,mobile:false});
  await send('Page.navigate', {url:pathToFileURL(fixturePath).href});
  await waitFor('window.fixture && document.querySelector(".auth-signin-btn")');
  let cases = 0;
  for (const role of ['student','instructor','admin']) {
    for (const method of ['click','email-enter','password-enter']) {
      await prepare(role);
      if (method==='click') await click();
      else { await evaluate(`document.querySelector('[name="${method.startsWith('email') ? 'email' : 'password'}"]').focus()`); await enter(); }
      if (role!=='admin') {
        await waitFor('window.fixture.snapshot().busy');
        assert.equal((await evaluate('window.fixture.snapshot()')).requests,1);
        assert.equal(await evaluate('document.querySelector(".auth-signin-btn").disabled'),true);
        assert.match(await evaluate('document.querySelector(".auth-signin-btn").textContent'),/Signing in/);
        await click(); await enter();
        assert.equal((await evaluate('window.fixture.snapshot()')).requests,1);
        await evaluate('window.fixture.release()');
      }
      await waitFor('window.fixture.snapshot().screen==="dashboard" && !window.fixture.snapshot().busy');
      assert.equal((await evaluate('window.fixture.snapshot()')).role,role);
      cases++;
    }
  }
  for (const method of ['click','enter']) {
    await prepare('student',{autofill:true});
    await evaluate('document.querySelector("[name=password]").focus()');
    method==='click' ? await click() : await enter();
    await waitFor('window.fixture.snapshot().requests===1');
    await evaluate('window.fixture.release()');
    await waitFor('window.fixture.snapshot().screen==="dashboard"'); cases++;
  }
  await prepare('student');
  await evaluate('document.querySelector("[name=email]").value="invalid-address"; document.querySelector("[name=password]").focus()');
  await enter(); await click();
  assert.equal((await evaluate('window.fixture.snapshot()')).requests,0); cases++;
  await prepare('student');
  await evaluate('document.querySelector(".password-toggle-btn").focus()'); await enter();
  assert.equal((await evaluate('window.fixture.snapshot()')).requests,0);
  assert.equal((await evaluate('window.fixture.snapshot()')).showPassword,true); cases++;
  await prepare('student'); await click();
  await evaluate('window.fixture.reject()');
  await waitFor('!window.fixture.snapshot().busy && !!window.fixture.snapshot().error');
  await click(); assert.equal((await evaluate('window.fixture.snapshot()')).requests,2);
  await evaluate('window.fixture.release()'); await waitFor('window.fixture.snapshot().screen==="dashboard"'); cases++;
  for (const width of [1365,375]) {
    await send('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:false});
    await prepare('student');
    assert.equal(await evaluate('document.querySelector(".auth-shell").scrollWidth <= document.querySelector(".auth-shell").clientWidth + 1'),true);
    const screenshot=await send('Page.captureScreenshot',{format:'png'});
    writeFileSync(resolve(directory,`login-${width}.png`),Buffer.from(screenshot.data,'base64'));
  }
  assert.deepEqual(browserErrors,[]);
  console.log(JSON.stringify({passed:cases,roles:['student','instructor','admin'],click:true,enterFromBothFields:true,autofill:true,duplicateGuard:true,validation:true,retry:true,screenshots:directory}));
  await Promise.race([send('Browser.close'),new Promise(resolve=>setTimeout(resolve,1000))]);
} finally { socket?.close(); browser.kill(); }
