// Exercises the real Vue library, signed API, multer and PDF.js in hidden Edge.
// All Firebase operations use isolated local substitutes; no live credentials.
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawn } from 'node:child_process';
import { createServer } from 'vite';
import { materialsFixture, samplePdf } from '../backend/tests/helpers/materialsFixture.js';
import { issueSession } from '../backend/services/authSession.js';

const directory = resolve('../.tmp/learning-materials-verification');
mkdirSync(directory, { recursive: true });
const fixture = materialsFixture({middleware(req,res,next) {
  res.setHeader('Access-Control-Allow-Origin','*');res.setHeader('Access-Control-Allow-Headers','Content-Type,Authorization');res.setHeader('Access-Control-Allow-Methods','GET,POST,PUT,DELETE,OPTIONS');
  if(req.method==='OPTIONS') return res.sendStatus(204);next();
}});
const owner = { id:'a',role:'instructor' };
const file = { originalname:'navigation.pdf',mimetype:'application/pdf',buffer:samplePdf() };
const { id: syllabusId } = await fixture.service.save(owner,'syllabi',null,{title:'Basic Maritime Navigation',description:'Fundamentals of maritime navigation and vessel operations.'},file);
await fixture.service.save(owner,'syllabus_modules',null,{title:'Steering and Vessel Control',description:'Vessel handling and safe steering.',moduleNumber:1},file,syllabusId);
await fixture.service.save(owner,'syllabus_modules',null,{title:'Docking and Anchoring',description:'Planning a safe approach.',moduleNumber:2},file,syllabusId);
fixture.app.post('/auth/demo-login',(req,res) => {
  const role = req.body.email?.split('@')[0];
  const ids = {admin:'admin',instructor:'a',student:'sa'};
  if (!ids[role] || req.body.password !== 'local-password') return res.status(401).json({message:'Invalid fixture credentials'});
  res.json({user:{id:ids[role],role},sessionToken:issueSession(ids[role],role)});
});
const apiServer = await new Promise(resolve => { const server=fixture.app.listen(0,'127.0.0.1',()=>resolve(server)); });
const apiOrigin = `http://127.0.0.1:${apiServer.address().port}`;
const modulePath = resolve(directory,'fixture.mjs');
writeFileSync(modulePath, `import {createApp,h,ref,nextTick} from 'vue';
import LearningMaterials from '/src/components/materials/LearningMaterials.vue';
import * as api from '/src/api/firebaseApi.js';
const role=ref('student'),user=ref(null);
async function prepareAccess(){if(role.value==='admin') await api.ensureLearningMaterialsSession('admin@test','local-password');}
window.fixture={async login(nextRole){user.value=null;await nextTick();api.clearSession();role.value=nextRole;if(nextRole!=='admin')await api.loginDemo(nextRole+'@test','local-password');user.value={id:nextRole==='admin'?'admin':nextRole==='instructor'?'a':'sa',name:'Local Test'};await nextTick();}};
createApp({setup:()=>()=>h('main',user.value?[h(LearningMaterials,{key:role.value,currentUser:user.value,role:role.value,prepareAccess})]:[])}).mount('#app');
window.fixture.login('student');`);
const vite = await createServer({ root:resolve('.'), resolve:{dedupe:['vue']}, define:{'import.meta.env.VITE_API_BASE_URL':JSON.stringify(apiOrigin)},
  server:{host:'127.0.0.1',port:5189,strictPort:true,hmr:false,fs:{allow:[resolve('..')]}},
  plugins:[{name:'materials-browser-fixture',configureServer(server){server.middlewares.use((req,res,next)=>{
    if(req.url!=='/__materials-fixture')return next();res.setHeader('Content-Type','text/html');
    res.end(`<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0;background:#0a1628;font-family:Arial,sans-serif}main{max-width:1180px;margin:auto;padding:24px;box-sizing:border-box}@media(max-width:600px){main{padding:12px}}</style></head><body><div id="app"></div><script type="module" src="/@fs/${modulePath.replaceAll('\\','/')}"></script></body></html>`);
  });}}] });
await vite.listen();
const pdfPath=resolve(directory,'test-upload.pdf');writeFileSync(pdfPath,samplePdf());
const browser=spawn(process.env.HELMQUEST_BROWSER || 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',[
  '--headless=new','--disable-gpu','--no-first-run','--no-default-browser-check','--remote-debugging-port=9243',`--user-data-dir=${resolve(directory,'browser-profile')}`,'about:blank'
],{windowsHide:true,stdio:'ignore'});
let socket, sequence=0;
const commands=new Map(),errors=[];
const pause=()=>new Promise(resolve=>setTimeout(resolve,100));
try {
  let targets;
  for(let attempt=0;attempt<100;attempt++){try{targets=await(await fetch('http://127.0.0.1:9243/json/list')).json();if(targets.some(tab=>tab.type==='page'))break;}catch{}await pause();}
  assert.ok(targets?.some(tab=>tab.type==='page'),'Hidden Edge did not start');
  socket=new WebSocket(targets.find(tab=>tab.type==='page').webSocketDebuggerUrl);
  await new Promise((resolve,reject)=>{socket.addEventListener('open',resolve,{once:true});socket.addEventListener('error',reject,{once:true});});
  socket.addEventListener('message',event=>{const message=JSON.parse(event.data);if(message.method==='Runtime.exceptionThrown')errors.push(message.params.exceptionDetails.exception?.description||message.params.exceptionDetails.text);if(!message.id)return;const command=commands.get(message.id);commands.delete(message.id);message.error?command.reject(message.error):command.resolve(message.result);});
  function send(method,params={}){return new Promise((resolve,reject)=>{const id=++sequence;commands.set(id,{resolve,reject});socket.send(JSON.stringify({id,method,params}));});}
  async function evaluate(expression){const result=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(result.exceptionDetails)throw new Error(result.exceptionDetails.exception?.description||result.exceptionDetails.text);return result.result.value;}
  async function waitFor(expression){for(let attempt=0;attempt<150;attempt++){if(await evaluate(expression))return;await pause();}throw new Error('Browser condition failed: '+expression+'\n'+await evaluate('document.body.innerText'));}
  const click = text => evaluate(`(() => {const button=[...document.querySelectorAll('button')].find(b=>b.textContent.trim()===${JSON.stringify(text)});if(!button)throw new Error('Missing button: '+${JSON.stringify(text)});button.click();})()`);
  const fill = (selector,value) => evaluate(`(() => {const input=document.querySelector(${JSON.stringify(selector)});input.value=${JSON.stringify(value)};input.dispatchEvent(new Event('input',{bubbles:true}));input.dispatchEvent(new Event('change',{bubbles:true}));})()`);
  async function attach(){const {root}=await send('DOM.getDocument');const {nodeId}=await send('DOM.querySelector',{nodeId:root.nodeId,selector:'input[type=file]'});await send('DOM.setFileInputFiles',{nodeId,files:[pdfPath]});}
  async function screenshot(name){const result=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});writeFileSync(resolve(directory,name+'.png'),Buffer.from(result.data,'base64'));}
  async function viewport(width){await send('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:width<600});}
  const noOverflow=()=>evaluate('document.documentElement.scrollWidth <= innerWidth');
  await send('Runtime.enable');await send('Page.enable');await viewport(1365);
  await send('Page.navigate',{url:'http://127.0.0.1:5189/__materials-fixture'});
  await waitFor('document.querySelector(".lm-grid .lm-card")');
  assert.equal(await evaluate('[...document.querySelectorAll("button")].some(b=>/Create syllabus|Edit|Delete|Add module/.test(b.textContent))'),false);
  await screenshot('student-library-desktop');await click('View syllabus');
  await waitFor('document.querySelectorAll(".lm-module").length===2');await click('View syllabus PDF');
  await waitFor('document.querySelector(".lm-pdf-page canvas")?.width > 0 && document.querySelector(".lm-pdf-text")?.textContent.includes("Maritime Navigation")');
  assert.equal(await evaluate('document.querySelectorAll(".lm-pdf-page").length'),2);
  await evaluate(`document.querySelector('[aria-label="Next page"]').click()`);
  await waitFor(`Number(document.querySelector('[aria-label="Page number"]').value)===2`);
  await evaluate(`document.querySelector('[aria-label="Zoom in"]').click()`);await waitFor('document.querySelector("output").textContent==="125%"');
  await screenshot('student-reader-desktop');
  for(const width of [768,375]){await viewport(width);await pause();assert.equal(await noOverflow(),true,`PDF reader overflow at ${width}`);await screenshot('student-reader-'+width);}
  await click('Back');await waitFor('document.querySelectorAll(".lm-module").length===2');await click('All syllabi');await waitFor('document.querySelector(".lm-grid")');
  assert.equal(await noOverflow(),true);await screenshot('student-library-mobile');
  await viewport(1365);await evaluate('window.fixture.login("instructor")');await waitFor('document.querySelector(".lm-grid") && [...document.querySelectorAll("button")].some(b=>b.textContent.includes("Create syllabus"))');
  await click('Create syllabus');await waitFor('document.querySelector(".lm-modal input")');
  await fill('.lm-form input:not([type])','Browser uploaded syllabus');await fill('.lm-form textarea','A real multipart upload from the browser.');await attach();await screenshot('instructor-upload-dialog');
  await click('Save document');await waitFor('!document.querySelector(".lm-modal") && document.querySelectorAll(".lm-grid .lm-card").length===2');
  const newId=Object.keys(fixture.records.syllabi).find(id=>fixture.records.syllabi[id].title==='Browser uploaded syllabus');assert.ok(newId);assert.ok(fixture.files.has(fixture.records.syllabi[newId].storagePath));
  await click('View syllabus');await waitFor('document.querySelectorAll(".lm-module").length===2');
  await evaluate(`document.querySelector('[aria-label="Move module 2 up"]').click()`);
  await waitFor('document.querySelector(".lm-module h3")?.textContent==="Docking and Anchoring"');
  await click('Add module');await fill('.lm-form input:not([type])','Browser module');await attach();await click('Save document');await waitFor('!document.querySelector(".lm-modal") && document.querySelectorAll(".lm-module").length===3');
  await evaluate(`[...document.querySelectorAll('.lm-module')].find(item=>item.textContent.includes('Browser module')).querySelector('[aria-label^="Delete module"]').click()`);
  await click('Delete document');await waitFor('!document.querySelector(".lm-modal") && document.querySelectorAll(".lm-module").length===2');
  await evaluate('window.fixture.login("admin")');await waitFor('document.querySelector(".lm-filters select") && document.querySelectorAll(".lm-grid .lm-card").length===2');
  await click('Create syllabus');await fill('.lm-form input:not([type])','Admin assigned syllabus');await fill('.lm-form select','b');await attach();await click('Save document');await waitFor('!document.querySelector(".lm-modal") && document.querySelectorAll(".lm-grid .lm-card").length===3');
  await fill('.lm-filters select','b');await waitFor('document.querySelectorAll(".lm-grid .lm-card").length===1');await screenshot('admin-filtered-library');
  await viewport(375);await click('Create syllabus');await waitFor('document.querySelector(".lm-modal")');assert.equal(await noOverflow(),true);assert.equal(await evaluate('document.querySelector(".lm-modal").getBoundingClientRect().right <= innerWidth'),true);await screenshot('admin-upload-mobile');await click('Cancel');
  await evaluate('window.fixture.login("student")');await waitFor('document.querySelectorAll(".lm-grid .lm-card").length===2');
  assert.equal(await evaluate('document.body.textContent.includes("Admin assigned syllabus")'),false);
  assert.equal(await evaluate('[...document.querySelectorAll("button")].some(b=>/Create syllabus|Edit|Delete|Add module/.test(b.textContent))'),false);
  assert.deepEqual(errors,[]);console.log('PASS: student scoped reads/PDF pages/zoom, instructor upload/order/module deletion, admin assignment/filter, 375/768/1365 responsive layouts.');
  console.log('Screenshots: '+directory);
} catch (error) {
  console.error(error);
  console.error('Browser errors:',errors);
  process.exitCode = 1;
} finally {
  socket?.close();browser.kill();apiServer.closeAllConnections();await new Promise(resolve=>apiServer.close(resolve));await vite.close();
}
