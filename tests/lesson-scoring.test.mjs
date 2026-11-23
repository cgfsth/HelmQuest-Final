import test from 'node:test';
import assert from 'node:assert/strict';
import { OFFICIAL_SYLLABUS } from '../shared/officialSyllabus.js';
import { lessonScoringDefinition, gradeChartTask, gradeLightingTask, scoreLessonSimulation, outcomeQuizScores, chartProject, chartUnproject, LIGHT_KEYS } from '../shared/lessonScoring.js';
import { gradeSimulationSafety } from '../shared/simulationSafety.js';
import { createTrainingRunMetrics, recordCollision, observeProcedureSafety, calculateSafetyCompliance } from '../src/helpers/missionScoring.js';
import { simulationAttempt } from '../shared/simulationAttempts.js';
import { createStudentNavigationLights } from '../src/helpers/studentNavigationLights.js';
import * as THREE from 'three';
import {restoreSavedMissionResults,getLatestMissionResult,buildInstructorStats} from '../src/helpers/progressStore.js';
const outcomes=n=>OFFICIAL_SYLLABUS.sections.find(s=>s.id===`lesson-${n}`).outcomes;
const plan=n=>lessonScoringDefinition(outcomes(n),{required_boat:'medium'});
const practice={score:100,performanceMetrics:{safetyCompliance:100}};
const grade=(def,task,encounter=null,events=[])=>scoreLessonSimulation(def,task,encounter,practice,70,events);
const lights=Object.fromEntries(LIGHT_KEYS.map(key=>[key,key!=='anchor']));

test('only the exact selected right-column outcomes define the lesson rubric',()=>{
  assert.deepEqual(plan(2).outcomes.map(o=>o.key),['branches','terms']);
  assert.deepEqual(plan(3).outcomes.map(o=>o.key),['chart']);
  assert.deepEqual(plan(4).outcomes.map(o=>o.key),['giveWay','lighting']);
  assert.deepEqual(plan(5).outcomes.map(o=>o.key),['lightKnowledge']);
  for(const n of [2,3,4,5])assert.equal(lessonScoringDefinition(OFFICIAL_SYLLABUS.sections.find(s=>s.id===`lesson-${n}`).content),null);
  assert.equal(lessonScoringDefinition(outcomes(1)),null);
});
test('Mercator and equirectangular charts round-trip independent coordinates',()=>{
  const bounds=plan(3).chart.bounds,location={lat:7.10123,lon:125.77123};
  for(const projection of ['mercator','equirectangular']){
    const restored=chartUnproject(chartProject(location,bounds,projection),bounds,projection);
    assert.ok(Math.abs(restored.lat-location.lat)<1e-9);assert.ok(Math.abs(restored.lon-location.lon)<1e-9);
  }
});
test('chart inputs actually change scores; navigation practice cannot replace a missing chart task',()=>{
  const def=plan(3),body={projection:'mercator',reading:def.chart.reference,plots:def.chart.targets};
  assert.equal(grade(def,gradeChartTask(def,body)).score,100);
  const wrong=grade(def,gradeChartTask(def,{...body,projection:'equirectangular',reading:{lat:0,lon:0},plots:[{lat:0,lon:0},{lat:0,lon:0}]}));
  assert.equal(wrong.score,20);assert.equal(wrong.passed,false);
  const missing=grade(def,null);assert.equal(missing.score,20);assert.equal(missing.assessmentComplete,false);
  assert.throws(()=>gradeChartTask(def,{...body,reading:{lat:NaN,lon:0}}));
});
test('navigation lights are inside Safety compliance, not a separate weighted criterion',()=>{
  const def=plan(4);assert.deepEqual(def.criteria.map(c=>[c.key,c.weight]),[['giveWay',.8],['safety',.2]]);
  const encounter={type:'crossing-red',resolved:true,accuracy:100,collision:false};
  const good=grade(def,gradeLightingTask(def,{lights}),encounter);
  assert.equal(good.score,100);assert.equal(good.lessonScoring.safety.score,100);
  const wrong=grade(def,gradeLightingTask(def,{lights:{...lights,anchor:true}}),encounter);
  assert.equal(wrong.score,96);assert.equal(wrong.lessonScoring.safety.score,80);
  assert.equal(wrong.lessonScoring.safety.deductions[0].type,'INCORRECT_LIGHTS');
  assert.equal(wrong.lessonScoring.outcomes.find(o=>o.key==='lighting').score,0);
  assert.equal(grade(def,null,encounter).assessmentComplete,false);
});
test('a second masthead is mandatory at 50 m, optional on the 18 m training vessel',()=>{
  assert.equal(gradeLightingTask(plan(4),{lights:{...lights,aftMasthead:false}}).scores.lighting,0);
  const small=lessonScoringDefinition(outcomes(4),{required_boat:'small'});
  for(const aftMasthead of [true,false])assert.equal(gradeLightingTask(small,{lights:{...lights,aftMasthead}}).scores.lighting,100);
  assert.throws(()=>gradeLightingTask(small,{lights:{port:true}}));
});
test('all requested safety violations reduce the same safety score with named deductions',()=>{
  const types=['UNSAFE_ANCHOR','DOCK_ENGINE_RUNNING','MOVE_WHILE_ANCHORED','PORT_COLLISION','SHORE_COLLISION','BUOY_COLLISION','NET_COLLISION','MOVE_WITH_NET'];
  for(const type of types){const result=gradeSimulationSafety([{type,timestamp:100}]);assert.ok(result.score<100);assert.equal(result.deductions[0].type,type);}
  const crash=grade(plan(4),gradeLightingTask(plan(4),{lights}),{type:'crossing-red',resolved:true,accuracy:0,collision:true});
  assert.equal(crash.criticalSafetyFailure,true);assert.equal(crash.passed,false);assert.equal(crash.lessonScoring.safety.score,0);
  assert.throws(()=>gradeSimulationSafety(undefined));assert.throws(()=>gradeSimulationSafety([{type:'invented',timestamp:1}]));
});
test('unresolved give-way exercise gets zero; perfect lights cannot grant the response score',()=>{
  const result=grade(plan(4),gradeLightingTask(plan(4),{lights}));
  assert.equal(result.score,20);assert.equal(result.passed,false);assert.equal(result.lessonScoring.rubric[0].attempted,false);
});
test('knowledge outcomes use tagged final-quiz answers, never buoy completion or a driving percentage',()=>{
  const simulation=grade(plan(2),null);assert.equal(simulation.score,null);assert.equal(simulation.passed,false);
  const report=simulation.lessonScoring;
  const quiz={answers:report.outcomes.map((o,index)=>({learningOutcome:o.text,isCorrect:index===0}))};
  assert.deepEqual(outcomeQuizScores(report,quiz).map(o=>o.score),[100,0]);assert.equal(simulation.score,null);
  assert.equal(simulationAttempt([{...simulation,completion:{verified:true}}],false).reviewable,true);
});
test('continuous collision contact is charged once and a held propulsion attempt is one event',()=>{
  const metrics=createTrainingRunMetrics();recordCollision(metrics,'BUOY');recordCollision(metrics,'BUOY');
  assert.equal(metrics.safety.collisions.length,1);assert.equal(calculateSafetyCompliance(metrics),90);
  for(let i=0;i<20;i++)observeProcedureSafety(metrics,{anchorDown:true,propulsion:true,engineRunning:true});
  assert.equal(metrics.safety.violations.filter(e=>e.type==='MOVE_WHILE_ANCHORED').length,1);
  observeProcedureSafety(metrics,{netDown:true,propulsion:true,engineRunning:true});assert.equal(calculateSafetyCompliance(metrics),65);
});
test('applied 3D lights respect port, starboard, stern sectors and dispose cleanly',()=>{
  const boat=new THREE.Group();boat.userData.loaMeters=60;const rig=createStudentNavigationLights(boat);rig.set(lights);
  rig.update(new THREE.Vector3(100,20,100));assert.equal(rig.lamps.port.visible,true);assert.equal(rig.lamps.starboard.visible,false);assert.equal(rig.lamps.stern.visible,false);
  rig.update(new THREE.Vector3(-100,20,0));assert.equal(rig.lamps.stern.visible,true);assert.equal(rig.lamps.masthead.visible,false);
  rig.dispose();assert.equal(boat.children.length,0);
});
test('saved outcome reports survive refresh and neutral practice does not lower numeric averages',()=>{
  const practical=grade(plan(3),gradeChartTask(plan(3),{projection:'mercator',reading:plan(3).chart.reference,plots:plan(3).chart.targets}));
  const progress={sessions:[],students:[],completedModules:{}};
  restoreSavedMissionResults('s',[{...practical,missionId:'m',studentId:'s'},{...grade(plan(2),null),missionId:'k',studentId:'s'}],progress,()=>[],[]);
  assert.equal(getLatestMissionResult('s','m',progress).lessonScoring.safety.score,100);
  assert.equal(buildInstructorStats(progress).averageScore,'100.00');
});
