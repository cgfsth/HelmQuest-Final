// Actual App mission modal, image handler and save path, with isolated course records.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {resolve} from 'node:path';
import {createServer} from 'vite';
import {compile} from '@vue/compiler-dom';
import {parse,compileStyle} from '@vue/compiler-sfc';
import {materialsFixture,samplePdf} from '../backend/tests/helpers/materialsFixture.js';
import {issueSession} from '../backend/services/authSession.js';
import {headlessBrowser} from './lib/headless-browser.mjs';
const directory=resolve('../.tmp/buoy-editor');mkdirSync(directory,{recursive:true});
const fixture=materialsFixture({middleware(req,res,next){res.setHeader('Access-Control-Allow-Origin','*');res.setHeader('Access-Control-Allow-Headers','Content-Type,Authorization');res.setHeader('Access-Control-Allow-Methods','GET,POST,OPTIONS');if(req.method==='OPTIONS')return res.sendStatus(204);next();}});
fixture.app.post('/auth/demo-login',(_req,res)=>res.json({sessionToken:issueSession('a','instructor')}));
const owner={id:'a',role:'instructor'},file={originalname:'lesson.pdf',mimetype:'application/pdf',buffer:samplePdf()},outcomes=['Different branches of Navigation','Discuss different terms used in navigation'];
const {id:syllabusId}=await fixture.service.save(owner,'syllabi',null,{title:'FISH ELECT 6'},file);
const {id:moduleId}=await fixture.service.save(owner,'syllabus_modules',null,{title:'Lesson 2',moduleNumber:2,objectives:outcomes.join('\n')},file,syllabusId);
const apiServer=await new Promise(resolve=>{const server=fixture.app.listen(0,'127.0.0.1',()=>resolve(server));});
const source=readFileSync('src/App.vue','utf8').replaceAll('\r\n','\n');
function extract(name){let start=source.indexOf(`function ${name}(`);assert.ok(start>=0,name);if(source.slice(start-6,start)==='async ')start-=6;return source.slice(start,source.indexOf('\n}',start)+2);}
const start=source.indexOf('<div v-if="missionEditorModal"'),end=source.indexOf('<div v-if="quizEditorModal"',start),render=compile(source.slice(start,end),{mode:'function',prefixIdentifiers:true}).code;
const styles=parse(source).descriptor.styles.map(style=>style.scoped?compileStyle({source:style.content,id:'data-v-buoy-fixture',filename:'App.vue',scoped:true}).code:style.content).join('\n');
const modulePath=resolve(directory,'fixture.mjs');
writeFileSync(modulePath,`import * as Vue from 'vue';
import MissionBuoyContentEditor from '/src/components/MissionBuoyContentEditor.vue';
import LessonScoringSetup from '/src/components/LessonScoringSetup.vue';
import {LESSON_ALIGNMENT_VERSION,lessonOutcomes,alignLessonMission} from '/shared/lessonAlignment.js';
import {lessonScoringDefinition,defaultChartExercise} from '/shared/lessonScoring.js';
import {normalizeEncounter} from '/shared/vesselEncounter.js';
import * as firebaseApi from '/src/api/firebaseApi.js';
const {ref}=Vue,currentUser=ref({id:'a'}),userRole=ref('instructor'),missionEditorModal=ref(null),missionEditorError=ref(''),missionSaving=ref(false),trainingModules=ref([]),progressData=ref({courseSettings:{}});
function saveProgress(){}function showAchievement(message){console.info(message)}async function persistMissionQuiz(){}
${['openMissionCreator','addMissionBuoy','removeMissionBuoy','handleMissionBuoyImage','saveMissionEditor','ensureMissionBuoySteps'].map(extract).join('\n')}
const state={missionEditorModal,missionEditorError,missionSaving,addMissionBuoy,removeMissionBuoy,handleMissionBuoyImage,saveMissionEditor};
window.fixture={get editor(){return missionEditorModal.value},get modules(){return trainingModules.value}};
const Modal={__scopeId:'data-v-buoy-fixture',components:{MissionBuoyContentEditor,LessonScoringSetup},render:new Function('Vue',${JSON.stringify(render)})(Vue),setup:()=>state};
Vue.createApp(Modal).mount('#app');await firebaseApi.loginDemo('instructor@local','local');openMissionCreator(${JSON.stringify({syllabusId,moduleId,syllabusTitle:'FISH ELECT 6',moduleTitle:'Lesson 2',objectives:outcomes.join('\n'),published:true})});`);
const vite=await createServer({cacheDir:resolve(directory,'cache'),resolve:{dedupe:['vue']},optimizeDeps:{entries:[],include:['vue']},define:{'import.meta.env.VITE_API_BASE_URL':JSON.stringify('http://127.0.0.1:'+apiServer.address().port)},server:{host:'127.0.0.1',port:5331,strictPort:true,hmr:false,fs:{allow:[resolve('..')]}},plugins:[{name:'buoy-editor-fixture',configureServer(server){server.middlewares.use((req,res,next)=>{if(req.url!=='/__buoy-editor')return next();res.setHeader('Content-Type','text/html');res.end('<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>'+styles+'body{margin:0;background:#071726;color:#e3eef6;font-family:Arial}</style></head><body><div id="app"></div><script type="module" src="/@fs/'+modulePath.replaceAll('\\','/')+'"></script></body></html>');});}}]});
await vite.listen();let browser;
try{
  browser=await headlessBrowser({directory,port:9284});await browser.viewport(1365,1000);await browser.navigate('http://127.0.0.1:5331/__buoy-editor');await browser.waitFor('document.querySelector(".buoy-editor")');
  await browser.click('+ Add supporting buoy');await browser.waitFor('document.querySelectorAll(".buoy-card").length===1');
  assert.equal(await browser.evaluate('document.querySelector(".buoy-card select").value'),outcomes[0]);
  const firstField=await browser.evaluate('document.querySelector(".buoy-card .field").innerText');assert.match(firstField,/Learning outcome/);
  assert.equal(await browser.evaluate('document.querySelector(".buoy-card").innerText.includes("Checkpoint / waypoint ID")'),false);
  await browser.fill('[aria-label="Title for buoy 1"]','Navigation branches');await browser.fill('[aria-label="Picture explanation for buoy 1"]','Study the navigation reference shown above. Compare the navigation branches introduced in the lesson PDF.');
  await browser.attach(resolve('public/images/helmquest-preview.png'));await browser.waitFor('document.querySelector(".image-preview img") && document.querySelector(".coverage .ready")');
  await browser.evaluate('document.querySelector(".buoy-editor").scrollIntoView({block:"start"})');await browser.screenshot('outcome-first-buoy-editor');
  await browser.clickExpression('document.querySelector(".student-preview summary")');await browser.waitFor('document.querySelector(".student-preview").open');await browser.evaluate('document.querySelector(".preview-card").scrollIntoView({block:"center"})');await browser.screenshot('buoy-student-preview');
  await browser.click('+ Add buoy');await browser.waitFor('document.querySelectorAll(".buoy-card").length===2');
  assert.equal(await browser.evaluate('document.querySelectorAll(".buoy-card select")[2].value'),outcomes[1]);
  assert.equal(await browser.evaluate('document.querySelectorAll(".selected-outcome")[1].textContent'),outcomes[1]);
  await browser.fill('[aria-label="Title for buoy 2"]','Navigation terms');await browser.fill('[aria-label="Picture explanation for buoy 2"]','Use the lesson PDF to identify the navigation terms illustrated in this reference and discuss how they are used.');
  const {root}=await browser.send('DOM.getDocument');const {nodeId}=await browser.send('DOM.querySelector',{nodeId:root.nodeId,selector:'[aria-label="Supporting picture for buoy 2"]'});await browser.send('DOM.setFileInputFiles',{nodeId,files:[resolve('public/images/helmquest-preview.png')]});
  await browser.waitFor('document.querySelectorAll(".coverage .ready").length===2');assert.equal(await browser.evaluate('document.querySelector(".coverage-heading").innerText.includes("2/2")'),true);
  for(const width of [768,375]){await browser.viewport(width,1000);await browser.evaluate('document.querySelectorAll(".buoy-card")[1].scrollIntoView({block:"start"})');assert.equal(await browser.evaluate('document.documentElement.scrollWidth<=innerWidth && document.querySelector(".mission-editor-card").scrollWidth<=document.querySelector(".mission-editor-card").clientWidth'),true);await browser.screenshot('buoy-editor-'+width);}
  await browser.clickExpression('document.querySelector(".quiz-save-btn")');await browser.waitFor('!document.querySelector(".mission-editor-card")');
  const missions=Object.values(fixture.records.missions || {});assert.equal(missions.length,1);assert.deepEqual(missions[0].checkpoints.map(b=>b.learningOutcome),outcomes);assert.equal(missions[0].checkpoints.every(b=>b.image.startsWith('data:image/jpeg') && b.description),true);assert.equal(missions[0].steps.length,3);assert.deepEqual(browser.errors,[]);
  writeFileSync(resolve(directory,'verification.json'),JSON.stringify({passed:true,outcomeFirst:true,automaticOutcomeSelection:true,studentPreview:true,materialCoverage:'2/2',savedRealApi:true,mobile:true},null,2));console.log('PASS: actual mission modal selects uncovered outcomes, shows material coverage and student preview, uploads real images and saves aligned buoys through the course API at desktop/mobile widths.');
}finally{browser?.close();await vite.close();await new Promise(resolve=>apiServer.close(resolve));}
