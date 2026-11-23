// Real Vue instrument/result/quiz components and real course API, synthetic data only.
import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {createServer} from 'vite';
import {materialsFixture,samplePdf} from '../backend/tests/helpers/materialsFixture.js';
import {viewModulePdf} from '../backend/tests/helpers/coursePdf.js';
import {issueSession} from '../backend/services/authSession.js';
import {OFFICIAL_SYLLABUS} from '../shared/officialSyllabus.js';
import {chartProject} from '../shared/lessonScoring.js';
import {headlessBrowser} from './lib/headless-browser.mjs';
const directory=resolve('../.tmp/lesson-scoring');mkdirSync(directory,{recursive:true});
const f=materialsFixture({saveMissionResult:async input=>{f.records.mission_score ||= {};f.records.mission_score[input.missionId]=input;return{data:input,xpAwarded:0};},saveQuizResult:async input=>{f.records.quiz_score ||= {};f.records.quiz_score[input.quizId]=input;return{data:input};},middleware(req,res,next){res.setHeader('Access-Control-Allow-Origin','*');res.setHeader('Access-Control-Allow-Headers','Content-Type,Authorization');res.setHeader('Access-Control-Allow-Methods','GET,POST,OPTIONS');if(req.method==='OPTIONS')return res.sendStatus(204);next();}});
const owner={id:'a',role:'instructor'},student={id:'sa',role:'student',instructorid:'a'},file={originalname:'lesson.pdf',mimetype:'application/pdf',buffer:samplePdf()};
const {id:syllabusId}=await f.service.save(owner,'syllabi',null,{title:'Navigation'},file),activities={};f.records.quiz={};
for(const n of [2,3,4,5]){
  const outcomes=OFFICIAL_SYLLABUS.sections.find(s=>s.id===`lesson-${n}`).outcomes;
  const {id:moduleId}=await f.service.save(owner,'syllabus_modules',null,{title:`Lesson ${n}`,moduleNumber:n,objectives:outcomes.join('\n')},file,syllabusId);
  const mission={mission_title:`Lesson ${n} practical`,required_boat:'medium',estimated_duration:'10 minutes',xp_reward:100,pass_score:70,outcomeAlignmentVersion:'lesson-outcomes-v1',learning_objectives:outcomes,steps:[],bouy:[],encounter:{type:n===4?'crossing-red':'none'},checkpoints:outcomes.map((learningOutcome,index)=>({id:'buoy-'+index,image:'chart.png',description:'Lesson reference.',learningOutcome,requireInteraction:'inspect_buoy'}))};
  ({activityId:activities[n]}=await f.course.saveModuleMission(owner,syllabusId,moduleId,{missionId:'lesson-'+n,mission,published:true}));
  f.records.quiz['quiz-'+n]={title:`Lesson ${n} final quiz`,moduleId:'lesson-'+n,instructorId:'a',published:true,questions:outcomes.map((learningOutcome,index)=>({id:'q'+index,type:'true-false',prompt:'Reference knowledge check '+(index+1),correctAnswer:'True',learningOutcome}))};
  await viewModulePdf(f,student,moduleId);
}
f.app.post('/auth/demo-login',(_req,res)=>res.json({sessionToken:issueSession('sa','student')}));
const apiServer=await new Promise(resolve=>{const server=f.app.listen(0,'127.0.0.1',()=>resolve(server));});
const modulePath=resolve(directory,'fixture.mjs');
writeFileSync(modulePath,`import {createApp,h,ref} from 'vue';
import LessonAssessmentTools from '/src/components/LessonAssessmentTools.vue';
import LessonScoringResult from '/src/components/LessonScoringResult.vue';
import PostDockingQuizModal from '/src/components/PostDockingQuizModal.vue';
import {createMissionCompletionFlow} from '/src/helpers/missionCompletionFlow.js';
import * as api from '/src/api/firebaseApi.js';
const activities=${JSON.stringify(activities)},active=ref(null),paused=ref(false),quiz=ref(null),result=ref(null),appliedLights=ref({});let flow;
async function choose(n){flow?.dispose();quiz.value=null;result.value=null;active.value={...(await api.launchLearningActivity(activities[n])),n};paused.value=false;}
async function finish(){const run=active.value;const completion={totalSteps:3,completedSteps:3,anchored:true,engineStopped:true,inPort:true,speedKnots:0};flow=createMissionCompletionFlow({saveSimulation:()=>api.completeLearningSimulation(run.activityId,{completion,lessonRunId:run.lessonRunId,safetyEvents:run.n===4?[{type:'NET_COLLISION',timestamp:100},{type:'MOVE_WHILE_ANCHORED',timestamp:1000}]:[],scores:{accuracy:100,safety:100},...(run.n===4?{encounter:{type:'crossing-red',resolved:true,successful:true,collision:false,accuracy:100,minimumClearance:200}}:{})}),findQuiz:()=>api.getLearningMissionQuiz(run.activityId),saveQuiz:(q,answers)=>api.submitLearningMissionQuiz(run.activityId,{quizId:q.id,answers}),onQuiz:q=>quiz.value=q,onResults:r=>{quiz.value=null;result.value=r;}});await flow.finish(completion);}
window.fixture={choose,finish,get active(){return active.value},get result(){return result.value},get lights(){return appliedLights.value}};
createApp({setup:()=>()=>h('main',[h('header',[h('h1','Lesson learning-outcome scoring'),...[2,3,4,5].map(n=>h('button',{onClick:()=>choose(n)},'Lesson '+n))]),active.value?h('p',{role:'status'},paused.value?'Simulation paused for instrument task':'Simulation practice'):null,active.value && !result.value && !quiz.value?h(LessonAssessmentTools,{key:active.value.lessonRunId || active.value.n,definition:active.value.target.lessonScoring,activityId:active.value.activityId,runId:active.value.lessonRunId,onPanelChange:v=>paused.value=v,onLightsChange:v=>appliedLights.value=v}):null,active.value && !result.value && !quiz.value?h('button',{onClick:finish},'Complete safe docking'):null,quiz.value?h(PostDockingQuizModal,{isVisible:true,quiz:quiz.value,onSubmit:answers=>flow.submit(answers)}):null,result.value?h(LessonScoringResult,{report:result.value.simulation.data.lessonScoring,quizResult:result.value.quizResult,passScore:70,criticalSafetyFailure:result.value.simulation.data.criticalSafetyFailure}):null])}).mount('#app');
await api.loginDemo('student@local','local');await choose(3);`);
const vite=await createServer({cacheDir:resolve(directory,'vite-cache'),optimizeDeps:{entries:[],include:['vue']},resolve:{dedupe:['vue']},define:{'import.meta.env.VITE_API_BASE_URL':JSON.stringify('http://127.0.0.1:'+apiServer.address().port)},server:{host:'127.0.0.1',port:5327,strictPort:true,hmr:false,fs:{allow:[resolve('..')]}},plugins:[{name:'lesson-scoring-fixture',configureServer(server){server.middlewares.use((req,res,next)=>{if(req.url!=='/__lesson-scoring')return next();res.setHeader('Content-Type','text/html');res.end('<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{background:#0a1a2b;color:#dcebf4;font:14px Arial;margin:0}main{padding:24px;max-width:850px;margin:auto}header{margin-left:260px}button{padding:12px;border:1px solid #3881a5;border-radius:7px;background:#35bff0;margin:5px;cursor:pointer}.lesson-scoring-result{max-width:680px;margin:auto!important}</style></head><body><div id="app"></div><script type="module" src="/@fs/'+modulePath.replaceAll('\\','/')+'"></script></body></html>');});}}]});
await vite.listen();let browser;
try{
  browser=await headlessBrowser({directory,port:9279});await browser.viewport(1365,900);await browser.navigate('http://127.0.0.1:5327/__lesson-scoring');await browser.waitFor('document.body.innerText.includes("Chart workspace")');
  assert.equal(await browser.evaluate('document.body.innerText.includes("Safety compliance · 20%")'),true);
  await browser.click('Chart workspace');await browser.waitFor('document.querySelector(".training-chart")');
  assert.equal(await browser.evaluate('document.body.innerText.includes("Simulation paused for instrument task")'),true);
  await browser.fill('.lesson-task-dialog select','mercator');await browser.fill('.coordinate-inputs label:first-child input','7.08');await browser.fill('.coordinate-inputs label:last-child input','125.76');
  const chart=f.records.missions['lesson-3'].lessonScoring.chart;
  for(const location of chart.targets){
    const p=chartProject(location,chart.bounds,'mercator');await browser.evaluate('document.querySelector(".training-chart").scrollIntoView({block:"center"})');
    const screen=await browser.evaluate(`new DOMPoint(${55+p.x*550},${25+p.y*350}).matrixTransform(document.querySelector('.training-chart').getScreenCTM()).toJSON()`);
    for(const type of ['mousePressed','mouseReleased'])await browser.send('Input.dispatchMouseEvent',{type,x:screen.x,y:screen.y,button:'left',clickCount:1});
  }
  assert.equal(await browser.evaluate('document.body.innerText.includes("2/2 route points plotted")'),true);await browser.screenshot('lesson-3-chart-workspace');
  await browser.click('Apply chart plan');await browser.waitFor('document.body.innerText.includes("Configuration recorded")');await browser.click('Return to simulation');
  await browser.click('Complete safe docking');await browser.waitFor('document.querySelector(".quiz-content")');
  assert.equal(f.records.mission_score['lesson-3'].score,100);
  await browser.clickExpression('[...document.querySelectorAll(".quiz-content button")].find(b=>b.textContent.trim()==="False")');await browser.click('Submit Quiz');await browser.waitFor('document.querySelector(".lesson-scoring-result")');
  assert.equal(f.records.mission_score['lesson-3'].score,100);assert.equal(f.records.quiz_score['quiz-3'].score,0);await browser.screenshot('lesson-3-outcome-results');
  await browser.click('Lesson 4');await browser.waitFor('document.body.innerText.includes("Navigation-light controls")');await browser.click('Navigation-light controls');
  for(let i=1;i<=6;i++)await browser.clickExpression(`document.querySelector('.light-toggles label:nth-child(${i}) input')`);
  assert.equal(await browser.evaluate('window.fixture.lights.port && window.fixture.lights.starboard && window.fixture.lights.anchor'),true);
  await browser.screenshot('lesson-4-light-controls');await browser.click('Apply navigation lights');await browser.waitFor('document.body.innerText.includes("Configuration recorded")');await browser.click('Return to simulation');
  await browser.click('Complete safe docking');await browser.waitFor('document.querySelector(".quiz-content")');
  for(let i=0;i<4;i++){await browser.clickExpression('[...document.querySelectorAll(".quiz-content button")].find(b=>b.textContent.trim()==="True")');await browser.click(i===3?'Submit Quiz':'Next →');}
  await browser.waitFor('document.querySelector(".lesson-scoring-result")');
  assert.equal(f.records.mission_score['lesson-4'].score,91);assert.equal(f.records.mission_score['lesson-4'].lessonScoring.safety.score,55);
  assert.equal(await browser.evaluate('document.body.innerText.includes("Incorrect navigation-light configuration: −20 safety points")'),true);await browser.screenshot('lesson-4-safety-deductions');
  await browser.viewport(375,812);assert.equal(await browser.evaluate('document.documentElement.scrollWidth<=innerWidth'),true);await browser.screenshot('lesson-4-safety-results-mobile');
  await browser.viewport(1365,900);await browser.click('Lesson 2');await browser.waitFor('document.body.innerText.includes("Navigation reference")');assert.equal(await browser.evaluate('document.body.innerText.includes("Knowledge is assessed in the final quiz")'),true);
  await browser.click('Lesson 5');await browser.waitFor('document.body.innerText.includes("Three vessel light references")');await browser.evaluate('document.querySelector(".lesson-tools details").open=true');await browser.screenshot('lesson-5-light-references');
  assert.deepEqual(browser.errors,[]);writeFileSync(resolve(directory,'verification.json'),JSON.stringify({passed:true,chartPractical:100,separateQuiz:0,lightingInsideSafety:true,safetyScore:55,lesson4Score:91,mobileOverflow:false,knowledgeReferences:true},null,2));
  console.log('PASS: real chart and lighting controls save backend grades; lights/net/anchor deductions share Safety compliance; final quiz is separate; mobile result fits.');
}finally{browser?.close();await vite.close();await new Promise(resolve=>apiServer.close(resolve));}
