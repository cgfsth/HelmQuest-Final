import { expect,test } from '@jest/globals';
import request from 'supertest';
import { materialsFixture,samplePdf } from './helpers/materialsFixture.js';
import { viewModulePdf } from './helpers/coursePdf.js';
import { issueSession } from '../services/authSession.js';
import { OFFICIAL_SYLLABUS } from '../../shared/officialSyllabus.js';
import { LIGHT_KEYS } from '../../shared/lessonScoring.js';
const owner={id:'a',role:'instructor'},student={id:'sa',role:'student',instructorid:'a'};
async function fixture(n=3){
  const f=materialsFixture({saveMissionResult:async input=>{f.records.mission_score={saved:input};return{data:input,xpAwarded:0};},saveQuizResult:async input=>{f.records.quiz_score={saved:input};return{data:input};}});
  const file={originalname:'lesson.pdf',mimetype:'application/pdf',buffer:samplePdf()},outcomes=OFFICIAL_SYLLABUS.sections.find(s=>s.id===`lesson-${n}`).outcomes;
  const {id:syllabusId}=await f.service.save(owner,'syllabi',null,{title:'Navigation'},file);
  const {id:moduleId}=await f.service.save(owner,'syllabus_modules',null,{title:`Lesson ${n}`,moduleNumber:n,objectives:outcomes.join('\n')},file,syllabusId);
  const mission={mission_title:`Lesson ${n} practice`,estimated_duration:'10 minutes',required_boat:'medium',xp_reward:100,pass_score:70,outcomeAlignmentVersion:'lesson-outcomes-v1',learning_objectives:outcomes,steps:[],bouy:[],encounter:{type:n===4?'crossing-red':'none'},checkpoints:outcomes.map((learningOutcome,index)=>({id:'buoy-'+index,image:'chart.png',description:'Lesson reference.',learningOutcome,requireInteraction:'inspect_buoy'}))};
  const {activityId}=await f.course.saveModuleMission(owner,syllabusId,moduleId,{missionId:'navigation',mission,published:true});
  f.records.quiz={final:{title:'Final quiz',moduleId:'navigation',instructorId:'a',published:true,questions:outcomes.map((learningOutcome,index)=>({id:'q'+index,prompt:'Lesson knowledge check',type:'true-false',correctAnswer:'True',learningOutcome}))}};
  await viewModulePdf(f,student,moduleId);const launch=await f.course.launch(student,activityId);
  const body={lessonRunId:launch.lessonRunId,safetyEvents:[],scores:{accuracy:100,safety:100},completion:{totalSteps:3,completedSteps:3,anchored:true,engineStopped:true,inPort:true,speedKnots:0}};
  if(n===4)body.encounter={type:'crossing-red',resolved:true,successful:true,collision:false,accuracy:100,minimumClearance:200};
  const chart=launch.target.lessonScoring.chart;
  const task=n===3?{lessonRunId:launch.lessonRunId,projection:'mercator',reading:chart.reference,plots:chart.targets}:{lessonRunId:launch.lessonRunId,lights:Object.fromEntries(LIGHT_KEYS.map(key=>[key,key!=='anchor']))};
  return {...f,syllabusId,moduleId,activityId,launch,body,task};
}
test('chart grading is server-derived, and the final quiz cannot alter the saved practical score',async()=>{
  const f=await fixture();await expect(f.course.practicalQuiz(student,f.activityId)).rejects.toMatchObject({status:409});
  await f.course.submitLessonTask(student,f.activityId,{...f.task,score:0});
  const saved=await f.course.completeSimulation(student,f.activityId,{...f.body,score:0,lessonScoring:{score:0}});
  expect(saved.data).toMatchObject({score:100,passed:true,scoringVersion:'simulation-v4'});
  await f.course.submitPracticalQuiz(student,f.activityId,{quizId:'final',answers:{q0:'False'}});
  expect(f.records.quiz_score.saved.score).toBe(0);expect(f.records.mission_score.saved.score).toBe(100);
  const resumed=await f.course.launch(student,f.activityId);expect(resumed.simulationResult.score).toBe(100);expect(resumed.lessonRunId).toBeNull();
});
test('first submitted configuration is immutable, including repeated requests and completion retries',async()=>{
  const f=await fixture();await f.course.submitLessonTask(student,f.activityId,{...f.task,reading:{lat:0,lon:0}});
  expect((await f.course.submitLessonTask(student,f.activityId,f.task)).repeated).toBe(true);
  const first=await f.course.completeSimulation(student,f.activityId,f.body);expect(first.data.score).toBe(73);
  await expect(f.course.submitLessonTask(student,f.activityId,f.task)).rejects.toMatchObject({status:409});
  expect((await f.course.completeSimulation(student,f.activityId,f.body)).data.score).toBe(73);
});
test('unattempted chart receives only safety credit, while stale and foreign run tokens are rejected',async()=>{
  const f=await fixture();const saved=await f.course.completeSimulation(student,f.activityId,f.body);expect(saved.data).toMatchObject({score:20,passed:false,assessmentComplete:false});
  const launch=await f.course.launch(student,f.activityId);expect(launch.lessonRunId).not.toBe(f.launch.lessonRunId);
  await expect(f.course.submitLessonTask(student,f.activityId,f.task)).rejects.toMatchObject({status:409});
  await request(f.app).post(`/learning-materials/activities/${f.activityId}/lesson-task`).set({Authorization:`Bearer ${issueSession('sb','student')}`}).send({...f.task,lessonRunId:launch.lessonRunId}).expect(404);
});
test('Firestore map key order is irrelevant, but modified outcomes/configuration invalidate a run',async()=>{
  const f=await fixture();const scoring=f.records.missions.navigation.lessonScoring;
  f.records.missions.navigation.lessonScoring=Object.fromEntries(Object.entries(scoring).reverse());
  await expect(f.course.submitLessonTask(student,f.activityId,f.task)).resolves.toMatchObject({saved:true});
  f.records.missions.navigation.chartExercise.reference.lat+=.001;
  await expect(f.course.completeSimulation(student,f.activityId,f.body)).rejects.toMatchObject({status:409});
});
test('lighting errors and physical violations are itemized under the same Safety criterion',async()=>{
  const f=await fixture(4);await f.course.submitLessonTask(student,f.activityId,{...f.task,lights:{...f.task.lights,anchor:true}});
  const result=await f.course.completeSimulation(student,f.activityId,{...f.body,safetyEvents:[{type:'NET_COLLISION',timestamp:300},{type:'MOVE_WHILE_ANCHORED',timestamp:1000}]});
  expect(result.data.lessonScoring.safety).toMatchObject({score:55});expect(result.data.score).toBe(91);
  expect(result.data.lessonScoring.safety.deductions.map(e=>e.type)).toEqual(['NET_COLLISION','MOVE_WHILE_ANCHORED','INCORRECT_LIGHTS']);
  expect(result.data.lessonScoring.rubric.map(c=>c.key)).toEqual(['giveWay','safety']);
});
test('invalid events and incomplete instrument inputs never become a perfect score',async()=>{
  const f=await fixture();await expect(f.course.submitLessonTask(student,f.activityId,{...f.task,plots:[]})).rejects.toMatchObject({status:400});
  await expect(f.course.completeSimulation(student,f.activityId,{...f.body,safetyEvents:undefined})).rejects.toMatchObject({status:400});
  await expect(f.course.completeSimulation(student,f.activityId,{...f.body,safetyEvents:[{type:'unknown',timestamp:1}]})).rejects.toMatchObject({status:400});
});
test('knowledge practice has no fabricated outcome percentage; final quiz determines course outcome completion',async()=>{
  const f=await fixture(2);const saved=await f.course.completeSimulation(student,f.activityId,f.body);
  expect(saved.data).toMatchObject({score:null,passed:false,lessonScoring:{mode:'knowledge'}});
  let course=await f.course.course(student,f.syllabusId);expect(course.progress[f.activityId].status).toBe('In Progress');
  await f.course.submitPracticalQuiz(student,f.activityId,{quizId:'final',answers:{q0:'True',q1:'True'}});
  course=await f.course.course(student,f.syllabusId);expect(course.progress[f.activityId].status).toBe('Done');expect(course.progress[f.activityId].simulation.reviewable).toBe(true);
  const resumed=await f.course.launch(student,f.activityId);expect(resumed.simulationResult.score).toBeNull();
});
