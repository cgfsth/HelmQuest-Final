// Verify actual tour, student header, handlers and pause logic against a local simulation HUD fixture.
// This exercises layout and interactions without starting a graded mission or writing to a backend.
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { spawn } from 'node:child_process';
import { parse, compileScript } from '@vue/compiler-sfc';

const read = path => readFileSync(new URL(path, import.meta.url), 'utf8').replace(/\r\n/g, '\n');
const app = read('../src/App.vue');
const component = parse(read('../src/components/SimulationTutorial.vue')).descriptor;
const compiled = compileScript(component, { id: 'tour-browser-fixture', inlineTemplate: true }).content
  .replace(/import \{([^}]+)\} from ['"]vue['"];?/g, (_, names) => `const {${names.replace(/\bas\b/g, ':')}} = Vue;`)
  .replace(/import \{ SIMULATION_TUTORIAL_STEPS as steps \} from '[^']+';/, 'const steps = SIMULATION_TUTORIAL_STEPS;')
  .replace(/import \{ getSimulationTourLayout, getSimulationTourSpotlight \} from '[^']+';/, '')
  .replace('export default', 'return');
const state = read('../src/helpers/simulationTutorial.js').replace(/import[^\n]+\n/, '').replace(/export /g, '');
const layout = read('../src/helpers/simulationTourLayout.js').replace(/export /g, '');
const binding = app.match(/const \{\n  stepIndex: tutorialStepIndex[\s\S]+?\} = useSimulationTutorial\([^;]+;/)[0];
const pause = app.slice(app.indexOf('const tutorialVisible = computed('), app.indexOf('watch(simulationNeedsLandscape,'));
function actualFunction(name) {
  const start = app.search(new RegExp(`(?:async )?function ${name}\\(`));
  assert.ok(start >= 0);
  return app.slice(start, app.indexOf('\n}', start) + 2);
}
const handlers = ['openStudentTour','advanceStudentTour','previousStudentTourStep','chooseMissionForTour','restoreStudentTourFocus','closeStudentTour'].map(actualFunction).join('\n');
const shellStart = app.indexOf('<div v-else class="missions-hub missions-hub--with-sidebar student-hub-shell"');
const shell = app.slice(shellStart, app.indexOf('<section v-show="hubTab === \'overview\'"', shellStart)).replace('<div v-else ', '<div ');
const overlay = app.slice(app.indexOf('    <SimulationTutorial v-if="tutorialVisible"'), app.indexOf('    <InventoryModal/>'));
const template = `${overlay}<div v-if="activeScreen==='dashboard'" class="scene-overlay dashboard-overlay student-dashboard-overlay">${shell}
  <section v-if="hubTab==='overview'" class="fixture-summary"><h2>Your training at a glance</h2><p>Complete navigation missions to build your skills at sea.</p><div class="fixture-rewards">⚓ Deck Cadet &nbsp; · &nbsp; 0 XP &nbsp; · &nbsp; 0 missions passed</div></section>
  <section v-if="hubTab==='missions'" id="hub-missions" class="fixture-summary"><h2 class="training-card-title">Mission 1: Harbor Navigation</h2><p>Practice the basics of safe departure and navigation.</p><button class="hub-mission-start" @click="startMission">Start mission</button></section>
  </div></div></div>
  <div v-if="activeScreen==='simulation'" class="fixture-sea"><div class="tactical-minimap">RADAR<svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="40"/><path d="M10 50h80M50 10v80M50 50l25-25"/></svg></div>
    <div class="fixture-hud"><div class="mission-objective-box">CURRENT OBJECTIVE<br><strong>Depart the harbor safely</strong></div><div class="speed-pill">0.0 Knots</div><div class="simulation-primary-actions"><button class="engine-btn">Engine</button><button>Anchor</button></div><button class="exit-hold-btn">Hold to exit</button></div>
    <div v-if="simulationTouchEnabled" class="simulation-touch-controls">↑<br>← &nbsp; ↓ &nbsp; →</div>
  </div>`;
const styles = [read('../src/style.css'), ...parse(app).descriptor.styles.map(style => style.content), read('../src/student-portal.css'), ...component.styles.map(style => style.content)].join('\n');
const directory = resolve('../.tmp/simulation-tour-verification'); mkdirSync(directory,{recursive:true});
const fixturePath = resolve(directory,'tour.html');
const vueUrl = pathToFileURL(resolve('node_modules/vue/dist/vue.global.prod.js')).href;
writeFileSync(fixturePath, `<!doctype html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>${styles}
.fixture-summary{padding:28px;border:1px solid #28465f;border-radius:16px;background:#12283d;color:#dceef7}.fixture-summary h2{margin:0 0 12px;font-size:22px}.fixture-summary p{color:#9eb8cd;line-height:1.7}.fixture-rewards{margin-top:30px;padding:24px;background:#16364a;border-radius:12px}.fixture-summary button{margin-top:24px;padding:12px 20px}.fixture-sea{position:fixed;inset:0;background:linear-gradient(#416878 0%,#63858e 30%,#124a63 31%,#063045 100%)}.fixture-hud{position:absolute;right:18px;top:80px;display:grid;gap:20px;width:220px}.fixture-hud button{padding:14px;border:1px solid #507c91;background:#0d2639;color:white;border-radius:8px}.fixture-hud .mission-objective-box{padding:14px;background:#0d2639;color:#d7efff;border-radius:10px}.fixture-hud .speed-pill{padding:12px;text-align:center;color:#b6efff;background:#0d2639}.fixture-hud .simulation-primary-actions{display:flex;gap:8px}.fixture-hud .exit-hold-btn{position:static}.fixture-sea .tactical-minimap{position:absolute;left:22px;top:26px;width:160px;height:180px;padding:15px;color:#9ff2d2;background:#072c35;border:1px solid #7adbb5;border-radius:50%}.fixture-sea .tactical-minimap svg{width:130px;height:130px;fill:none;stroke:#75cba8;stroke-width:1}.fixture-sea .simulation-touch-controls{left:22px;bottom:22px;background:#12394d;border:1px solid #7bc4d9;border-radius:12px;padding:20px;color:#bcf4ff;font-size:23px}
</style></head><body><div id="app"></div><script src="${vueUrl}"></script><script>
const {ref,computed,watch,nextTick}=Vue;
${state}\n${layout}
const currentUser=ref({id:'fixture-'+Date.now(),status:'active'}),isAuthenticated=ref(true),userRole=ref('student');
const activeScreen=ref('dashboard'),hubTab=ref('overview'),simulationTouchEnabled=ref(false),simulationRunning=ref(true);
const showCinematicLoading=ref(false),showMissionBriefing=ref(false),simulationNeedsLandscape=ref(false),controlsGuideVisible=ref(false),gearInfoPopup=ref(null),showPostDockingQuiz=ref(false),showQuizResults=ref(false),exitConfirmVisible=ref(false),exitFinalConfirmVisible=ref(false);
const trainingRunMetrics=ref({startedAt:performance.now(),endedAt:null}),trainingStepStartedAt=ref(0),trainingHeadingHold=ref({startedAt:null}),performanceManager={state:{missionStartTime:Date.now()}},keyStates={KeyW:false};
const cancelExitHold=()=>{},syncUiCursor=()=>{},closeStudentMenu=async()=>{},selectHubTab=tab=>{hubTab.value=tab};
${binding}\n${pause}\n${handlers}
const Tutorial=new Function('Vue','SIMULATION_TUTORIAL_STEPS','getSimulationTourLayout','getSimulationTourSpotlight',${JSON.stringify(compiled)})(Vue,SIMULATION_TUTORIAL_STEPS,getSimulationTourLayout,getSimulationTourSpotlight);
const demoStudent={name:'Kevin',rank:'Deck Cadet',xp:0,xpProgress:0,completed:0,badgesEarned:0,badgesTotal:8,certificates:0};
const studentCompactLayout=ref(innerWidth<1024);window.addEventListener('resize',()=>{studentCompactLayout.value=innerWidth<1024});
const studentMenuOpen=ref(false),studentMenuPanel=ref(null),studentMenuTrigger=ref(null),studentMenuClose=ref(null),studentProfileExtras={studentId:'STU-2026-001'},navigationMissions=[{},{}];
function startMission(){simulationRunning.value=true;activeScreen.value='simulation'}
const snapshot=()=>({step:tutorialStepIndex.value,visible:tutorialVisible.value,completed:tutorialCompleted.value,screen:activeScreen.value,running:simulationRunning.value});
window.fixture={snapshot,reset(touch=false){activeScreen.value='dashboard';hubTab.value='overview';simulationTouchEnabled.value=touch;currentUser.value={id:'fixture-'+Math.random(),status:'active'}},backToDashboard(){activeScreen.value='dashboard';hubTab.value='overview'},completeForTest(){while(!tutorialCompleted.value)nextTutorialCard()}};
Vue.createApp({components:{SimulationTutorial:Tutorial},template:${JSON.stringify(template)},setup:()=>({activeScreen,hubTab,tutorialVisible,tutorialStepIndex,tutorialStorageNotice,tutorialEligible,simulationTouchEnabled,advanceStudentTour,previousStudentTourStep,closeStudentTour,chooseMissionForTour,openStudentTour,demoStudent,studentCompactLayout,studentMenuOpen,studentMenuPanel,studentMenuTrigger,studentMenuClose,studentProfileExtras,navigationMissions,closeStudentMenu,selectHubTab,startMission,trapStudentMenuFocus(){},signOut(){},openStudentMenu(){}})}).mount('#app');
</script></body></html>`);

const executable=process.env.HELMQUEST_BROWSER||'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const port=9239;
const browser=spawn(executable,['--headless=new','--disable-gpu','--no-first-run','--no-default-browser-check',`--remote-debugging-port=${port}`,`--user-data-dir=${resolve(directory,'browser-profile')}`,'about:blank'],{windowsHide:true,stdio:'ignore'});
browser.on('error',error=>console.error(error.message));
const sleep=()=>new Promise(resolve=>setTimeout(resolve,100));
let socket,sequence=0;const commands=new Map(),errors=[];
try {
  let targets;
  for(let attempt=0;attempt<100;attempt++){try{targets=await(await fetch(`http://127.0.0.1:${port}/json/list`)).json();if(targets.some(tab=>tab.type==='page'))break}catch{}await sleep()}
  assert.ok(targets?.some(tab=>tab.type==='page'),'Hidden browser did not start');
  socket=new WebSocket(targets.find(tab=>tab.type==='page').webSocketDebuggerUrl);
  await new Promise((resolve,reject)=>{socket.addEventListener('open',resolve,{once:true});socket.addEventListener('error',reject,{once:true})});
  socket.addEventListener('message',event=>{const message=JSON.parse(event.data);if(message.method==='Runtime.exceptionThrown')errors.push(message.params.exceptionDetails.exception?.description||message.params.exceptionDetails.text);if(!message.id)return;const command=commands.get(message.id);commands.delete(message.id);message.error?command.reject(message.error):command.resolve(message.result)});
  function send(method,params={}){return new Promise((resolve,reject)=>{const id=++sequence;commands.set(id,{resolve,reject});socket.send(JSON.stringify({id,method,params}))})}
  async function evaluate(expression){const result=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(result.exceptionDetails)throw new Error(result.exceptionDetails.exception?.description||result.exceptionDetails.text);return result.result.value}
  async function waitFor(expression){for(let attempt=0;attempt<70;attempt++){if(await evaluate(expression))return;await sleep()}throw new Error('Browser condition failed: '+expression+' '+JSON.stringify(errors))}
  async function click(selector){const point=await evaluate(`(()=>{const e=document.querySelector(${JSON.stringify(selector)});e.scrollIntoView({block:'nearest'});const r=e.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}})()`);await send('Input.dispatchMouseEvent',{type:'mouseMoved',...point});await send('Input.dispatchMouseEvent',{type:'mousePressed',...point,button:'left',clickCount:1});await send('Input.dispatchMouseEvent',{type:'mouseReleased',...point,button:'left',clickCount:1});await sleep()}
  async function bounds(){const values=await evaluate(`(()=>{const element=document.querySelector('.tour-tooltip'),c=element.getBoundingClientRect(),s=document.querySelector('.tour-spotlight')?.getBoundingClientRect();return {card:{left:c.left,top:c.top,right:c.right,bottom:c.bottom},spotlight:!!s,clickable:element.contains(document.elementFromPoint(c.left+c.width/2,c.top+25)),focus:document.activeElement.id||document.activeElement.className,width:innerWidth,height:innerHeight}})()`);assert.ok(values.card.left>=15&&values.card.top>=15&&values.card.right<=values.width-15&&values.card.bottom<=values.height-15,JSON.stringify(values));assert.equal(values.clickable,true,'Tour must be above the actual dashboard and HUD');return values}
  async function screenshot(name){const shot=await send('Page.captureScreenshot',{format:'png'});writeFileSync(resolve(directory,name+'.png'),Buffer.from(shot.data,'base64'))}
  await send('Runtime.enable');await send('Page.enable');
  await send('Page.navigate',{url:pathToFileURL(fixturePath).href});await waitFor('window.fixture && document.querySelector(".tour-tooltip")');
  const results=[];
  for(const [width,height,touch] of [[1365,900,false],[375,812,true],[812,375,true]]){
    await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:false});
    await evaluate(`window.fixture.reset(${touch});Vue.nextTick()`);await sleep();
    assert.ok((await bounds()).spotlight);await screenshot('overview-'+width);
    assert.equal(await evaluate('Math.abs(document.querySelector(".student-tour-trigger").getBoundingClientRect().top-document.querySelector(".missions-hub-title").getBoundingClientRect().top)<30'),true,'Help icon must stay beside the heading on phones too');
    assert.equal(await evaluate('document.querySelector(".hub-sidebar-nav").textContent.includes("Simulation Tutorial")'),false);
    assert.equal(await evaluate('document.querySelector(".student-hub-shell").inert'),true);
    await click('.tour-next');assert.equal((await evaluate('window.fixture.snapshot()')).step,1);await bounds();
    await click('.tour-next');assert.equal(await evaluate('!!document.querySelector(".tour-tooltip")'),false);
    assert.equal(await evaluate('document.activeElement.className'),'hub-mission-start');
    await click('.hub-mission-start');await waitFor('window.fixture.snapshot().visible && window.fixture.snapshot().screen==="simulation"');
    assert.equal((await evaluate('window.fixture.snapshot()')).running,false);
    assert.ok((await bounds()).spotlight);await screenshot('engine-'+width);
    for(let step=2;step<6;step++){await click('.tour-next');assert.equal((await evaluate('window.fixture.snapshot()')).step,step);assert.ok((await bounds()).spotlight)}
    await evaluate('document.querySelector(".tour-next").focus()');
    await send('Input.dispatchKeyEvent',{type:'keyDown',key:'Tab',code:'Tab',windowsVirtualKeyCode:9});await send('Input.dispatchKeyEvent',{type:'keyUp',key:'Tab',code:'Tab',windowsVirtualKeyCode:9});
    assert.equal(await evaluate('document.activeElement.className'),'tour-close');
    await click('.tour-next');assert.equal(await evaluate('!!document.querySelector(".tour-tooltip")'),false);assert.equal((await evaluate('window.fixture.snapshot()')).completed,true);assert.equal((await evaluate('window.fixture.snapshot()')).running,true);
    await evaluate('window.fixture.backToDashboard();Vue.nextTick()');assert.equal(await evaluate('!!document.querySelector(".tour-tooltip")'),false);
    await click('.student-tour-trigger');assert.equal((await evaluate('window.fixture.snapshot()')).step,0);await bounds();
    await send('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});await send('Input.dispatchKeyEvent',{type:'keyUp',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});
    await waitFor('!window.fixture.snapshot().visible');assert.equal(await evaluate('document.activeElement.className'),'student-tour-trigger');
    results.push({width,height,spotlight:true,viewportSafe:true,missionHandoff:true,paused:true,focusTrap:true,replay:true});
  }
  assert.deepEqual(errors,[]);console.log(JSON.stringify({viewports:results,screenshots:directory}));
  await Promise.race([send('Browser.close'),new Promise(resolve=>setTimeout(resolve,1000))]);
}finally{socket?.close();browser.kill()}
