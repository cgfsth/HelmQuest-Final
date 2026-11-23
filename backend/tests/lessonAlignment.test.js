import { beforeEach, expect, test } from '@jest/globals';
import request from 'supertest';
import { materialsFixture, samplePdf } from './helpers/materialsFixture.js';
import { viewModulePdf } from './helpers/coursePdf.js';
import { issueSession } from '../services/authSession.js';
import { LESSON_ALIGNMENT_VERSION } from '../../shared/lessonAlignment.js';
import { validateLessonQuiz } from '../services/quizLessonAlignment.js';
const owner={id:'a',role:'instructor'},student={id:'sa',role:'student',instructorid:'a'};
const file={originalname:'lesson.pdf',mimetype:'application/pdf',buffer:samplePdf()};
let f,syllabusId,moduleId,activityId;
beforeEach(async()=>{
  f=materialsFixture({saveMissionResult:async input=>{f.records.mission_score={saved:input};return{data:input,xpAwarded:0};},saveQuizResult:async input=>{f.records.quiz_score={saved:input};return{data:input};}});
  ({id:syllabusId}=await f.service.save(owner,'syllabi',null,{title:'Navigation'},file));
  ({id:moduleId}=await f.service.save(owner,'syllabus_modules',null,{title:'Lesson 3',moduleNumber:3,objectives:'Read a chart\nChoose a heading'},file,syllabusId));
  const mission={mission_title:'Navigation and chart practice',estimated_duration:'10 minutes',xp_reward:100,pass_score:70,learning_objectives:['Read a chart','Choose a heading'],outcomeAlignmentVersion:LESSON_ALIGNMENT_VERSION,
    bouy:[{checkpoint_id:'one',Image:'chart.png',bouy_description:'Chart explanation.'},{checkpoint_id:'two',Image:'heading.png',bouy_description:'Heading explanation.'}],steps:[],
    checkpoints:[{id:'one',image:'chart.png',description:'Chart explanation.',learningOutcome:'Read a chart',requireInteraction:'inspect_buoy'},
      {id:'two',image:'heading.png',description:'Heading explanation.',learningOutcome:'Choose a heading',requireInteraction:'photograph'}]};
  ({activityId}=await f.course.saveModuleMission(owner,syllabusId,moduleId,{missionId:'navigation',mission,published:true}));
  f.records.quiz={final:{title:'Navigation knowledge check',moduleId:'navigation',instructorId:'a',published:true,questions:[
    {id:'chart',prompt:'Recognize the chart.',type:'true-false',correctAnswer:'True',learningOutcome:'Read a chart'},
    {id:'heading',prompt:'Choose the heading.',type:'true-false',correctAnswer:'False',learningOutcome:'Choose a heading'}]}};
  await viewModulePdf(f,student,moduleId);
});
const complete=()=>f.course.completeSimulation(student,activityId,{scores:{accuracy:80,safety:90},completion:{totalSteps:3,completedSteps:3,anchored:true,engineStopped:true,inPort:true,speedKnots:0}});
test('launch returns question-free buoys with lesson outcomes; the final quiz stays locked until docking is saved',async()=>{
  const launched=await f.course.launch(student,activityId);
  expect(launched.target.checkpoints.map(c=>c.learningOutcome)).toEqual(['Read a chart','Choose a heading']);
  expect(launched.target.questions).toBeUndefined();expect(launched.target.checkpoints[0].assessment).toBeUndefined();
  expect(launched.target.steps.map(s=>s.requireInteraction)).toEqual(['inspect_buoy','photograph',undefined]);
  await expect(f.course.practicalQuiz(student,activityId)).rejects.toMatchObject({status:409});
});
test('practical 40/40/20 score and final-quiz score remain separate',async()=>{
  const simulation=await complete();expect(simulation.data).toMatchObject({score:90,scoringVersion:'simulation-v3',performanceMetrics:{taskAccuracy:80}});
  const quiz=await f.course.practicalQuiz(student,activityId);expect(quiz.quiz.questions[0]).not.toHaveProperty('correctAnswer');
  const result=await f.course.submitPracticalQuiz(student,activityId,{quizId:'final',answers:{chart:'True',heading:'True'}});
  expect(result.data.score).toBe(50);expect(result.data.answers[0].learningOutcome).toBe('Read a chart');expect(f.records.mission_score.saved.score).toBe(90);
});
test('students cannot start until the final quiz covers all current lesson outcomes',async()=>{
  f.records.quiz.final.questions.pop();await expect(f.course.launch(student,activityId)).rejects.toMatchObject({status:409});
  delete f.records.quiz.final;await expect(f.course.launch(student,activityId)).rejects.toMatchObject({status:409});
});
test('quiz publication validates coverage while incomplete drafts can be saved',async()=>{
  await expect(validateLessonQuiz(f.db,f.records.quiz.final)).resolves.toBeTruthy();
  const missing={...f.records.quiz.final,questions:[f.records.quiz.final.questions[0]]};
  await expect(validateLessonQuiz(f.db,missing)).rejects.toThrow('every lesson');
  await expect(validateLessonQuiz(f.db,{...missing,published:false,status:'draft'})).resolves.toBeTruthy();
});
test('publishing a mission with an unlinked, missing-image or question-style buoy is rejected',async()=>{
  const original=f.records.missions.navigation;
  for(const patch of [{learningOutcome:''},{image:''},{requireInteraction:'verify_id'}]){
    const mission={...original,checkpoints:[{...original.checkpoints[0],...patch},original.checkpoints[1]],bouy:[]};
    await expect(f.course.saveModuleMission(owner,syllabusId,moduleId,{missionId:'invalid',mission,published:true})).rejects.toMatchObject({status:400});
  }
});
test('foreign students cannot launch or fetch the final quiz',async()=>{
  const headers={Authorization:`Bearer ${issueSession('sb','student')}`};
  await request(f.app).post(`/learning-materials/activities/${activityId}/launch`).set(headers).expect(404);
  await request(f.app).get(`/learning-materials/activities/${activityId}/mission-quiz`).set(headers).expect(404);
});
test('outcomes changed during a mission save are rechecked inside the transaction',async()=>{
  f.state.beforeCommit=()=>{f.records.syllabus_modules[moduleId].objectives+='\nInterpret a new chart projection';};
  await expect(f.course.saveModuleMission(owner,syllabusId,moduleId,{missionId:'stale',mission:f.records.missions.navigation,published:true})).rejects.toMatchObject({status:400});
  expect(f.records.missions.stale).toBeUndefined();
});
