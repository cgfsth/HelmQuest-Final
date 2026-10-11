import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import * as THREE from 'three';
import { crossTrackDistance } from '../src/helpers/navigationMetrics.js';
import { IntegratedPerformanceManager } from '../src/helpers/performanceManager.js';
import { calculateMissionScore } from '../src/helpers/missionScoring.js';
import { setupBoatAnchorRig, beginAnchorDeploy, updateBoatAnchorRig } from '../src/helpers/boatAnchor.js';
import { disposeBoatModel } from '../src/helpers/loadBoatModel.js';
import { evaluateTrainingStep } from '../src/helpers/trainingValidation.js';

const source = readFileSync(new URL('../src/App.vue', import.meta.url), 'utf8').replace(/\r\n/g, '\n');
const ref = value => ({ value });
function appFunction(name, context) {
  let start = source.indexOf(`function ${name}(`);
  assert.ok(start >= 0);
  if (source.slice(start - 6, start) === 'async ') start -= 6;
  vm.createContext(context);
  vm.runInContext(source.slice(start, source.indexOf('\n}', start) + 2), context);
  return context[name];
}

test('course deviation resolves the actual waypoint ID and measures perpendicular course error', () => {
  const context = { crossTrackDistance, trainingWaypoints: ref([{ id:'buoy-1', x:1000, z:0 }]),
    trainingStepBaseline: ref({ boatX:0, boatZ:0 }), findWaypoint:(zones,id)=>zones.find(z=>z.id===id) };
  const deviation = appFunction('calculateCrossTrackDeviation', context);
  assert.equal(deviation(100, 0, 'buoy-1'), 0);
  assert.equal(deviation(100, 30, 'buoy-1'), 30);
  assert.equal(deviation(100, 0, 'missing'), 0);
});

test('invalid legacy waypoint coordinates cannot poison steering scores; cancelling clears the previous route', () => {
  const pm = new IntegratedPerformanceManager();
  pm.startMission({ id:'mission-1', studentId:'student', steps:[], duration:5 });
  pm.setActiveWaypoint('buoy-1', { x:0, z:0 });
  pm.update({ boatPosition:{x:50,z:10}, boatHeading:0 });
  assert.ok(Number.isFinite(pm.state.steeringScore));
  assert.equal(pm.state.routeDeviations.length, 0);
  pm.setActiveWaypoint({id:'buoy-1', x:1000,z:0}, {x:0,z:0});
  pm.update({boatPosition:{x:50,z:30},boatHeading:20});
  assert.equal(pm.state.currentDeviation, 30);
  pm.cancelMission();
  assert.equal(pm.isActive, false);
  assert.equal(pm.currentWaypoint, null);
  pm.startMission({id:'mission-2',steps:[]});
  assert.equal(pm.idealRouteStart, null);
  assert.equal(pm.state.routeDeviations.length, 0);
});

test('the actual animation loop sends the displayed heading to performance tracking', () => {
  const start=source.indexOf('      performanceManager.update({');
  const end=source.indexOf('\n      });',start)+9;
  const updates=[];
  vm.runInNewContext(source.slice(start,end), {
    stats:ref({boatX:0,boatZ:0,rotationDeg:355,speedKnots:10}),
    activeTrainingModule:ref({steps:[]}),currentTrainingStep:ref(0),
    performanceManager:{update:value=>updates.push(value)}
  });
  assert.equal(updates[0].boatHeading,355);
});

test('teacher-created steps without IDs retain their expected order in performance tracking', () => {
  const pm=new IntegratedPerformanceManager();
  pm.startMission({id:'custom',steps:[{waypointZone:'buoy-1'},{}]});
  pm.onObjectiveCompleted('step-0','waypoint');
  pm.onObjectiveCompleted('step-1','waypoint');
  assert.equal(pm.state.sequenceViolations,0);
  pm.cancelMission();
  assert.equal(pm.courseTracker.expectedSequence.length,0);
});

test('repeated route legs count unique destinations consistently with recorded waypoint visits', () => {
  const count=appFunction('countWaypointSteps',{});
  assert.equal(count({steps:[{waypointZone:'buoy-1'},{waypointZone:'harbor'},{waypointZone:'buoy-1'}]}),2);
  assert.equal(count({steps:[]}),0);
});

test('dropping the anchor outside the required port cannot complete the return-to-port step', () => {
  const context={baseline:{anchorDeployed:false,boatX:100,boatZ:0},startedAt:0,now:5000,
    stats:{speedKnots:0,rotationDeg:0},anchor:{deployed:true},boatPosition:{x:100,z:0},
    waypoints:[{id:'port',x:0,z:0,radius:20,maxSpeedKnots:2}],interactionReady:true};
  const step={anchorAction:'deploy',waypointZone:'port'};
  assert.equal(evaluateTrainingStep(step,context),false);
  context.boatPosition={x:0,z:0};
  assert.equal(evaluateTrainingStep(step,context),true);
  context.stats.speedKnots=8;
  assert.equal(evaluateTrainingStep(step,context),false);
  assert.equal(evaluateTrainingStep({anchorAction:'deploy'},context),true);
});

test('heading-only missions have finite scores without requiring nonexistent waypoints', () => {
  const result=calculateMissionScore({stepsCompleted:2,totalSteps:2,waypointsReached:0,totalWaypoints:0,
    quizCorrect:1,quizTotal:1,actualTimeMinutes:4,targetTimeMinutes:5},{passScore:80});
  assert.equal(result.score,100);
  assert.equal(result.passed,true);
});

test('score normalization handles zero totals, bad telemetry, string times and overcounted visits', () => {
  for (const params of [
    {totalSteps:0,totalWaypoints:0,quizTotal:0},
    {stepsCompleted:99,totalSteps:2,waypointsReached:5,totalWaypoints:1,quizCorrect:9,quizTotal:1,actualTimeMinutes:'12',targetTimeMinutes:'6'},
    {stepsCompleted:NaN,waypointsReached:Infinity,quizTotal:0,actualTimeMinutes:Infinity,targetTimeMinutes:-5}
  ]) {
    const result=calculateMissionScore(params);
    assert.ok(Number.isFinite(result.score));
    assert.ok(result.score>=0 && result.score<=100);
  }
  assert.equal(calculateMissionScore({totalSteps:1,totalWaypoints:1,quizTotal:1},{passScore:0}).passScore,0);
});

function stepRun() {
  const timers=[];
  const module={id:'custom',title:'Audit',steps:[{id:'step-1',waypointZone:'buoy-1'},{id:'step-2'}]};
  const metrics={startedAt:0,visitedWaypoints:new Set(),waypointsReached:0,stepsCompleted:0};
  const reached=[];
  const context={activeTrainingModule:ref(module),activeScreen:ref('simulation'),trainingStepSuccess:ref(false),
    trainingRunFinished:ref(false),currentTrainingStep:ref(0),trainingRunMetrics:ref(metrics),
    trainingWaypoints:ref([{id:'buoy-1',x:0,z:0}]),stats:ref({boatX:0,boatZ:0}),anchor:ref({}),
    interactionReadyStep:ref(null),trainingHeadingHold:ref({}),trainingStepBaseline:ref({}),trainingStepStartedAt:ref(0),
    activeInteraction:ref(null),trainingStepError:ref(false),trainingFeedback:ref(''),stormMode:ref(false),
    console:{log(){}},performance:{now:()=>6000},window:{setTimeout:fn=>timers.push(fn)},
    refreshTrainingWaypointZones(){},findWaypoint:(zones,id)=>zones.find(z=>z.id===id),isBoatInZone:()=>true,
    updateHeadingHoldState(){},getBoatPositionXZ:()=>({x:0,z:0}),evaluateTrainingStep:()=>true,
    syncTrainingWaypointMarkers(){},captureTrainingStepBaseline(){},
    performanceManager:{isActive:true,onWaypointReached:id=>reached.push(id),onObjectiveCompleted(){},setActiveWaypoint(){}}
  };
  return {context,timers,metrics,reached,check:appFunction('checkTrainingStep',context)};
}

test('a completed step records the real waypoint ID and advances the current mission', () => {
  const run=stepRun(); run.check(); run.timers[0]();
  assert.equal(run.context.currentTrainingStep.value,1);
  assert.equal(run.metrics.stepsCompleted,1);
  assert.deepEqual(run.reached,['buoy-1']);
});

test('a delayed completed step cannot advance a restarted run of the same module', () => {
  const run=stepRun(); run.check();
  const next={startedAt:10000,visitedWaypoints:new Set(),waypointsReached:0,stepsCompleted:0};
  run.context.trainingRunMetrics.value=next;
  run.context.trainingStepSuccess.value=false;
  run.timers[0]();
  assert.equal(next.stepsCompleted,0);
  assert.equal(run.context.currentTrainingStep.value,0);
  assert.equal(run.reached.length,0);
});

test('exiting while the engine starts prevents its delayed callback from starting it on the dashboard', () => {
  const timers=[];
  const context={activeScreen:ref('simulation'),engineRunning:ref(false),engineStarting:ref(false),showEngineStatus:ref(false),
    boatObject:{},trainingRunMetrics:ref({}),showTrainingNotification(){},setTimeout:fn=>timers.push(fn),window:{},performance:{now:()=>0}};
  appFunction('startEngine',context)();
  context.activeScreen.value='dashboard';
  timers[0]();
  assert.equal(context.engineRunning.value,false);
});

test('the actual anchor update uses elapsed time at 30, 60 and 144 FPS and pauses with the simulation', () => {
  const expression=source.match(/const anchorMilestone = (updateBoatAnchorRig\([^;]+);/)[1];
  for (const fps of [30,60,144]) {
    const boat=new THREE.Group(),body=new THREE.Group();body.name='main body anchor';boat.add(body);
    const rig=setupBoatAnchorRig(boat);beginAnchorDeploy(rig);
    const context={boatAnchorRig:rig,simulationRunning:ref(true),visualDelta:1/fps,delta:1/60,updateBoatAnchorRig};
    for(let frame=0;frame<Math.ceil(2.5*fps);frame++)vm.runInNewContext(expression,context);
    assert.equal(rig.state,'deployed');
    rig.state='deploying';rig.progress=0;context.simulationRunning.value=false;
    vm.runInNewContext(expression,context);
    assert.equal(rig.progress,0);
  }
});

test('the medium boat anchor rig recognizes the actual GLTF node names without matching child materials', () => {
  const boat=new THREE.Group();
  for(const name of ['main_body_anchor002','anchor_chain002','enroul_ancre002','chaine_poulie002']) {
    const node=new THREE.Group();node.name=name;boat.add(node);
  }
  const child=new THREE.Mesh();child.name='main_body_anchor002_metal_noir_ancre_et_misc_0';boat.add(child);
  const rig=setupBoatAnchorRig(boat);
  assert.equal(rig.anchorBody.name,'main_body_anchor002');
  assert.equal(rig.chain.name,'anchor_chain002');
  assert.equal(rig.windlass.name,'enroul_ancre002');
  beginAnchorDeploy(rig);updateBoatAnchorRig(rig,1.2);
  assert.equal(rig.state,'deploying');
  assert.equal(rig.progress,0.5);
  updateBoatAnchorRig(rig,1.2);
  assert.equal(rig.state,'deployed');
});

function missionReport(save) {
  const module={id:'module',title:'Audit',duration:'5 minutes',completed:false,steps:[{},{}]};
  const data={sessions:[],quizSubmissions:[]},effects={awards:0,saves:0,reports:0};
  const context={activeMission:ref({id:'mission',passScore:70}),getMissionResult:()=>null,isTrainingReviewMode:ref(false),
    missionReportSaving:ref(false),activeTrainingModule:ref(module),currentUser:ref({id:'student',name:'Student'}),
    trainingRunMetrics:ref({startedAt:0,endedAt:300000,stepsCompleted:2,visitedWaypoints:new Set(['buoy-1']),maxSpeedKnots:5}),
    performance:{now:()=>300000},performanceManager:{isActive:false,parseExpectedTime:()=>300000},
    MODULE_PASS_SCORES:{},countWaypointSteps:()=>1,progressData:ref(data),findCompletedQuizSubmission:()=>null,
    calculateMissionScore,userRole:ref('student'),saveMissionScoreToFirestore:save,
    recordMissionSession:value=>data.sessions.push(value),processMissionRewards:()=>{effects.awards++;return {xpEarned:50};},
    saveProgress:()=>effects.saves++,loadProgress:()=>data,syncStudentMotivation:async()=>{},calculateAndUpdateMissionScores:async()=>{},
    achievementPopup:ref(''),showAchievement(){},missionCompleteModal:ref(null),formatElapsedDuration:()=> '5m',
    showTrainingNotification(){},syncUiCursor(){},trainingFeedback:ref(''),missionReadyToReport:ref(false),
    console:{log(){},error(){}},openSavedMissionReport:()=>effects.reports++};
  return {context,module,data,effects,report:appFunction('openMissionCompleteModal',context)};
}

test('failed mission persistence grants no local pass or XP and re-enables reporting for retry', async () => {
  const run=missionReport(async()=>{throw new Error('Offline');});
  await run.report(run.module);
  assert.equal(run.module.completed,false);
  assert.equal(run.data.sessions.length,0);
  assert.equal(run.effects.awards,0);
  assert.equal(run.context.missionCompleteModal.value,null);
  assert.equal(run.context.missionReadyToReport.value,true);
  assert.equal(run.context.missionReportSaving.value,false);
});

test('double reporting saves once and a late response cannot award the newly signed-in student', async () => {
  let resolve,calls=0;
  const run=missionReport(()=>{calls++;return new Promise(done=>resolve=done);});
  const first=run.report(run.module);
  await run.report(run.module);
  assert.equal(calls,1);
  run.context.currentUser.value={id:'other-student'};
  resolve({xpAwarded:50,totalXp:50});await first;
  assert.equal(run.effects.awards,0);
  assert.equal(run.data.sessions.length,0);
  assert.equal(run.module.completed,false);
});

test('saved mission results create one local result and display the backend XP', async () => {
  const run=missionReport(async()=>({xpAwarded:50,totalXp:150,rank:'Deck Cadet'}));
  await run.report(run.module);
  assert.equal(run.module.completed,true);
  assert.equal(run.data.sessions.length,1);
  assert.equal(run.context.missionCompleteModal.value.totalXp,150);
  assert.equal(run.context.missionCompleteModal.value.score,80);
});

test('a late actual API save cannot display XP or refresh the account that signed in afterward', async () => {
  let resolve;
  const context={trainingRunMetrics:ref({}),currentUser:ref({id:'student'}),
    fetch:()=>new Promise(done=>resolve=done),console:{log(){},error(){}},
    showAchievement(){assert.fail('Stale XP notification');},refreshCurrentUser(){assert.fail('Stale account refresh');}};
  const save=appFunction('saveMissionScoreToFirestore',context);
  const pending=save({studentId:'student',missionId:'mission',score:100,passed:true});
  context.currentUser.value={id:'other-student'};
  resolve({ok:true,json:async()=>({xpAwarded:100,totalXp:100})});
  assert.equal((await pending).xpAwarded,100);
});

test('attempt lookup uses the backend query routes and encodes IDs', async () => {
  const api=readFileSync(new URL('../src/api/firebaseApi.js',import.meta.url),'utf8');
  for(const [name,expected] of [['getStudentAttempts','studentId'],['getMissionAttempts','missionId']]) {
    const body=api.match(new RegExp(`export (async function ${name}\\([^]+?\\n})`))[1];
    const fn=new Function('apiFetch',`${body}; return ${name};`)(url=>url);
    assert.equal(await fn('A /&B'),`/attempts?${expected}=A%20%2F%26B`);
  }
});

test('replacing a boat releases shared model resources once while preserving the scene environment texture', () => {
  const model=new THREE.Group(),geometry=new THREE.BoxGeometry(),texture=new THREE.Texture(),environment=new THREE.Texture();
  const material=new THREE.MeshStandardMaterial({map:texture,envMap:environment});
  model.add(new THREE.Mesh(geometry,material),new THREE.Mesh(geometry,material));
  const disposed={geometry:0,material:0,texture:0,environment:0};
  for(const [key,item] of Object.entries({geometry,material,texture,environment}))item.addEventListener('dispose',()=>disposed[key]++);
  disposeBoatModel(model);
  assert.deepEqual(disposed,{geometry:1,material:1,texture:1,environment:0});
});
