// Exercise the App docking handlers and real quiz component without live saves.
import { createServer } from 'vite';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import assert from 'node:assert/strict';
import { headlessBrowser } from './lib/headless-browser.mjs';

const directory = resolve('../.tmp/port-docking-browser');
mkdirSync(directory, { recursive: true });
const source = readFileSync(new URL('../src/App.vue', import.meta.url), 'utf8').replace(/\r\n/g, '\n');
function extract(name) {
  let start = source.indexOf(`function ${name}(`);
  assert.ok(start >= 0, name);
  const end = source.indexOf('\n}', start) + 2;
  if (source.slice(start - 6, start) === 'async ') start -= 6;
  return source.slice(start, end);
}
const portStart = source.indexOf('const isBoatInPortZone = computed(');
const readyStart = source.indexOf('const courseReadyToComplete = computed(');
const watchStart = source.indexOf('watch(courseReadyToComplete,');
const modulePath = resolve(directory, 'fixture.mjs');
writeFileSync(modulePath, `
import { createApp, ref, computed, watch, nextTick } from 'vue';
import PostDockingQuizModal from '/src/components/PostDockingQuizModal.vue';
import { isBoatAtPort } from '/src/helpers/portDocking.js';
import { createMissionCompletionFlow } from '/src/helpers/missionCompletionFlow.js';
import { validDockingCompletion, simulationScoringInputs, simulationPerformance } from '/shared/simulationPerformance.js';
import { createTrainingRunMetrics, calculateSafetyCompliance } from '/src/helpers/missionScoring.js';
import { IntegratedPerformanceManager } from '/src/helpers/performanceManager.js';
import { restoreQuizSubmissions } from '/src/helpers/quizCompletion.js';
import { vesselEncounterResult } from '/src/helpers/vesselEncounter.js';
const currentUser=ref({id:'fixture',name:'Fixture'}),userRole=ref('student'),activeScreen=ref('simulation');
const activeCoursePractical=ref(null),activeTrainingModule=ref(null),activeMission=ref({id:'sample'});
const trainingRunMetrics=ref({}),trainingRunFinished=ref(false),isTrainingReviewMode=ref(false);
const stats=ref({boatX:17168.5,boatZ:-4425.56,rotationDeg:355,speedKnots:0}),anchor=ref({deployed:false});
const engineRunning=ref(false),engineStarting=ref(false),missionCompleteModal=ref(null),showPostDockingQuiz=ref(false);
const courseCompletionState=ref('IN_PROGRESS'),courseCompletionError=ref(''),postDockingQuizData=ref(null),postDockingQuizTriggered=ref(false),isPostDockingQuizSubmitting=ref(false);
const progressData=ref({quizSubmissions:[]}),demoStudent=ref({xp:0}),encounterSetupError=ref('');
const vesselEncounterState=null,performanceManager=new IntegratedPerformanceManager();
const boatObject={userData:{loaMeters:60,beamMeters:12}};
const resolveTrainingZonesAtSpawn=()=>[{x:17174.3276,z:-4299.9008,shape:'berth',length:500,width:10,berthHeadingDeg:270,zoneType:'dock'}];
const getActiveDockColliders=()=>[{centerX:17300,centerZ:-4300,halfWidth:113.67,halfDepth:250,rotation:Math.PI}];
let courseCompletionFlow=null,assignedQuiz=null,saves=0,quizSaves=0;
const normalizeQuizData=q=>q,saveProgress=()=>{},recordMissionSession=()=>{},processMissionRewards=()=>{},instructorAwardBadge=()=>{},syncUiCursor=()=>{},formatElapsedDuration=()=>'';
const firebaseApi={
 async completeLearningSimulation(id,{completion,scores}){saves++;return{data:{...simulationPerformance(scores),completion,missionTitle:'Sample mission'},xpAwarded:0,totalXp:0};},
 async getLearningMissionQuiz(){return{quiz:assignedQuiz,saved:null};},
 async submitLearningMissionQuiz(id,{answers}){quizSaves++;if(answers.q1!=='True')throw new Error('Expected the selected answer');return{data:{studentId:'fixture',quizId:'sample-quiz',score:100,'raw-score':1,totalQuestions:1,passed:true}};}
};
${source.slice(portStart, source.indexOf('\n});', portStart) + 4)}
${extract('courseDockingEvidence')}
${source.slice(readyStart, source.indexOf('\nasync function continueCourseCompletion', readyStart))}
${extract('currentSimulationScores')}
${extract('continueCourseCompletion')}
${extract('handlePostDockingQuizSubmit')}
${source.slice(watchStart, source.indexOf('\n});', watchStart) + 4)}
window.fixture={
 async start(steps,hasQuiz){courseCompletionFlow?.dispose();courseCompletionFlow=null;anchor.value.deployed=false;activeCoursePractical.value=null;showPostDockingQuiz.value=false;missionCompleteModal.value=null;await nextTick();
 saves=0;quizSaves=0;assignedQuiz=hasQuiz?{id:'sample-quiz',title:'Sample mission quiz',questions:[{id:'q1',type:'true-false',prompt:'Stop the engine and anchor before completing the attempt.',correctAnswer:'True'}]}:null;
 activeTrainingModule.value={id:'sample',title:'Sample mission',steps:[{id:'buoy'},{id:'dock'}]};activeCoursePractical.value={studentId:'fixture',activityId:'practical'};
 trainingRunMetrics.value=createTrainingRunMetrics();trainingRunMetrics.value.totalSteps=2;trainingRunMetrics.value.stepsCompleted=steps;trainingRunMetrics.value.startedAt=performance.now();trainingRunFinished.value=steps===2;
 performanceManager.startMission(activeTrainingModule.value);performanceManager.state.headingHistory=[{heading:0},{heading:1}];performanceManager.state.steeringScore=90;
 progressData.value={quizSubmissions:[]};courseCompletionState.value='IN_PROGRESS';await nextTick();anchor.value.deployed=true;await nextTick();},
 get snapshot(){return{inPort:isBoatInPortZone.value,steps:trainingRunMetrics.value.stepsCompleted,state:courseCompletionState.value,saves,quizSaves,error:courseCompletionError.value};}
};
createApp({components:{PostDockingQuizModal},setup:()=>({postDockingQuizData,showPostDockingQuiz,isPostDockingQuizSubmitting,courseCompletionError,missionCompleteModal,handlePostDockingQuizSubmit}),
 template:'<PostDockingQuizModal :quiz="postDockingQuizData || {}" :is-visible="showPostDockingQuiz" :is-submitting="isPostDockingQuizSubmitting" :error-message="courseCompletionError" @submit="handlePostDockingQuizSubmit"/><div v-if="missionCompleteModal" id="results"><h1>Simulation result</h1><p>{{missionCompleteModal.stepsLabel}} steps completed</p><p>Simulation score: {{missionCompleteModal.score}}%</p><p v-if="missionCompleteModal.quizApplicable">Quiz score: {{missionCompleteModal.quizScore}}%</p></div>'}).mount('#app');
`);

const server = await createServer({ resolve: { alias: { vue: resolve('node_modules/vue/dist/vue.esm-bundler.js') } },
  server: { host: '127.0.0.1', port: 5296, strictPort: true, hmr: false, fs: { allow: [resolve('..')] } },
  plugins: [{ name: 'docking-fixture', configureServer(vite) { vite.middlewares.use((req, res, next) => {
    if (req.url !== '/__port-docking') return next();
    res.setHeader('Content-Type', 'text/html');
    res.end(`<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0;background:#0a1c2d;color:white;font-family:Arial}#results{padding:40px}</style></head><body><div id="app"></div><script type="module" src="/@fs/${modulePath.replaceAll('\\', '/')}"></script></body></html>`);
  }); } }] });
let browser;
try {
  await server.listen();
  browser = await headlessBrowser({ directory, port: 9262 });
  await browser.viewport(1365, 692);
  await browser.navigate('http://127.0.0.1:5296/__port-docking');
  await browser.waitFor('!!window.fixture');
  const results = [];
  for (const steps of [0, 1, 2]) for (const hasQuiz of [true, false]) {
    await browser.evaluate(`window.fixture.start(${steps},${hasQuiz})`);
    await browser.waitFor(hasQuiz ? '!!document.querySelector(".quiz-modal")' : '!!document.querySelector("#results")');
    const initial = await browser.evaluate('window.fixture.snapshot');
    assert.equal(initial.inPort, true); assert.equal(initial.saves, 1); assert.equal(initial.steps, steps);
    if (hasQuiz) {
      assert.equal(await browser.evaluate('getComputedStyle(document.querySelector(".quiz-wrapper")).position'), 'fixed');
      await browser.waitFor('Number(getComputedStyle(document.querySelector(".quiz-wrapper")).opacity) >= .99');
      if (steps === 0) await browser.screenshot('zero-steps-quiz');
      await browser.click('True'); await browser.click('Submit Quiz');
      await browser.waitFor('!!document.querySelector("#results") && !document.querySelector(".quiz-modal")');
      assert.equal((await browser.evaluate('window.fixture.snapshot')).quizSaves, 1);
    } else assert.equal(await browser.evaluate('!!document.querySelector(".quiz-modal")'), false);
    if (steps === 0) await browser.screenshot(hasQuiz ? 'zero-steps-after-quiz' : 'zero-steps-no-quiz');
    results.push({ steps, hasQuiz, ...(await browser.evaluate('window.fixture.snapshot')) });
  }
  assert.deepEqual(browser.errors, []);
  writeFileSync(resolve(directory, 'verification.json'), JSON.stringify(results, null, 2));
  console.log('PASS: real App docking handlers and quiz UI at 0/2, 1/2 and 2/2 steps, with/without quiz.');
} finally { browser?.close(); await server.close(); }
