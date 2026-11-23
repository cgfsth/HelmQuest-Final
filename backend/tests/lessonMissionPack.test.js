import {expect,test} from '@jest/globals';
import {readFileSync} from 'node:fs';
import {materialsFixture,samplePdf} from './helpers/materialsFixture.js';
import {viewModulePdf} from './helpers/coursePdf.js';
import {OFFICIAL_SYLLABUS} from '../../shared/officialSyllabus.js';
import {buildLessonMission,LESSON_MISSION_SPECS} from '../content/lessonMissions.js';
import {gradeMissionQuiz} from '../../shared/missionQuiz.js';
import {validateOutcomeQuiz} from '../../shared/lessonAlignment.js';
import {LIGHT_KEYS} from '../../shared/lessonScoring.js';
import {lessonDescriptionPatch} from '../services/lessonMissionDescriptions.js';
const images=Object.fromEntries([...new Set(LESSON_MISSION_SPECS.flatMap(s=>s.buoys.map(b=>b.image)))].map(key=>[key,'data:image/webp;base64,'+readFileSync(new URL(`../../public/lesson-missions/${key}.webp`,import.meta.url)).toString('base64')]));
const owner={id:'a',role:'instructor'},student={id:'sa',role:'student',instructorid:'a'},file={originalname:'lesson.pdf',mimetype:'application/pdf',buffer:samplePdf()};
const outcomes=n=>OFFICIAL_SYLLABUS.sections.find(s=>s.id===`lesson-${n}`).outcomes;
test.each([1,2,3,4,5,6])('lesson %i creates real aligned buoy material and its final quiz, with the practical and knowledge stages kept separate',async n=>{
  const f=materialsFixture({saveMissionResult:async input=>{f.records.mission_score={saved:input};return {data:input,xpAwarded:0};},saveQuizResult:async input=>{f.records.quiz_score ||= {};f.records.quiz_score.saved=input;return {data:input};}});
  const {id:syllabusId}=await f.service.save(owner,'syllabi',null,{title:'FISH ELECT 6'},file);
  const {id:moduleId}=await f.service.save(owner,'syllabus_modules',null,{title:`Lesson ${n}`,moduleNumber:n,objectives:outcomes(n).map(o=>'• '+o).join('\r\n')},file,syllabusId);
  const item=buildLessonMission({syllabusId,module:{id:moduleId,...f.records.syllabus_modules[moduleId]},images});
  expect(Buffer.byteLength(JSON.stringify(item.mission))).toBeLessThan(800000);
  expect(new Set(item.mission.checkpoints.map(b=>b.learningOutcome))).toEqual(new Set(outcomes(n)));
  expect(item.mission.checkpoints.every(b=>b.image.startsWith('data:image/webp') && b.description && b.requireInteraction==='inspect_buoy' && !b.assessment)).toBe(true);
  expect(validateOutcomeQuiz(item.quiz,outcomes(n))).toBe(item.quiz);
  const linked=await f.course.saveModuleMission(owner,syllabusId,moduleId,{missionId:item.missionId,mission:item.mission,published:false});
  f.records.quiz={[item.quizId]:{...item.quiz,instructorId:'a'}};
  await f.course.save(owner,syllabusId,moduleId,linked.activityId,{revision:linked.revision,type:'simulation',title:item.mission.mission_title,targetId:item.missionId,instructions:item.instructions,quizPolicy:'assigned',quizId:item.quizId,published:true,completionRule:'pass',passScore:70});
  await viewModulePdf(f,student,moduleId);const launched=await f.course.launch(student,linked.activityId);
  await expect(f.course.practicalQuiz(student,linked.activityId)).rejects.toMatchObject({status:409});
  if(n===3){const chart=launched.target.lessonScoring.chart;await f.course.submitLessonTask(student,linked.activityId,{lessonRunId:launched.lessonRunId,projection:chart.projection,reading:chart.reference,plots:chart.targets});}
  if(n===4)await f.course.submitLessonTask(student,linked.activityId,{lessonRunId:launched.lessonRunId,lights:Object.fromEntries(LIGHT_KEYS.map(key=>[key,key!=='anchor']))});
  const result=await f.course.completeSimulation(student,linked.activityId,{lessonRunId:launched.lessonRunId,safetyEvents:[],scores:{accuracy:100,safety:100},completion:{totalSteps:item.mission.steps.length,completedSteps:item.mission.steps.length,anchored:true,engineStopped:true,inPort:true,speedKnots:0},...(n===4?{encounter:{type:'crossing-red',resolved:true,successful:true,collision:false,accuracy:100,minimumClearance:200}}:{})});
  expect(result.data.score).toBe([2,5].includes(n)?null:100);
  const final=await f.course.practicalQuiz(student,linked.activityId);expect(final.quiz.id).toBe(item.quizId);
  expect(final.quiz.questions.every(q=>q.options.every(o=>o.isCorrect===undefined))).toBe(true);
  const answers=Object.fromEntries(item.quiz.questions.map(q=>[q.id,q.options.find(o=>o.isCorrect).text]));
  const quiz=await f.course.submitPracticalQuiz(student,linked.activityId,{quizId:item.quizId,answers});expect(quiz.data.score).toBe(100);
  expect(f.records.mission_score.saved.score).toBe(result.data.score);
  expect((await f.course.course(student,syllabusId)).progress[linked.activityId].status).toBe('Done');
});
test('the lesson-5 light references follow the PDF categories and each has a corresponding knowledge question',()=>{
  const spec=LESSON_MISSION_SPECS.find(s=>s.lesson===5);
  expect(spec.buoys.filter(b=>b.outcome===2).map(b=>b.image)).toEqual(['power-lights','sailing-lights','anchor-lights']);
  expect(spec.questions.filter(q=>q.outcome===2)).toHaveLength(4);
});
test('foreign or changed lesson outcomes are rejected instead of silently assigning mismatched material',()=>{
  expect(()=>buildLessonMission({syllabusId:'s',module:{id:'m',moduleNumber:2,objectives:'An unrelated topic'},images})).toThrow('differ');
  expect(()=>buildLessonMission({syllabusId:'s',module:{id:'m',moduleNumber:3,objectives:outcomes(3)},images:{}})).toThrow('Missing');
});
test('all knowledge questions have one unambiguous keyed answer and grade correctly',()=>{
  for(const spec of LESSON_MISSION_SPECS){
    const {quiz}=buildLessonMission({syllabusId:'s',module:{id:'m',moduleNumber:spec.lesson,objectives:outcomes(spec.lesson)},images});
    for(const q of quiz.questions){expect(q.options.filter(o=>o.isCorrect)).toHaveLength(1);expect(new Set(q.options.map(o=>o.text)).size).toBe(4);}
    expect(gradeMissionQuiz(quiz,Object.fromEntries(quiz.questions.map(q=>[q.id,q.options.find(o=>o.isCorrect).text]))).score).toBe(100);
    expect(gradeMissionQuiz(quiz,Object.fromEntries(quiz.questions.map(q=>[q.id,q.options.find(o=>!o.isCorrect).text]))).score).toBe(0);
  }
});

test.each([1,2,3,4,5,6])('lesson %i description updates preserve every image, outcome tag, practical task and score configuration',n=>{
  const module={id:'m',moduleNumber:n,objectives:outcomes(n),fileName:`HelmQuest_Lesson_${n}.pdf`};
  const {mission}=buildLessonMission({syllabusId:'s',module,images});mission.syllabusModuleId='m';
  const before=structuredClone(mission);mission.checkpoints[0].description='Old outcome explanation';mission.bouy[0].bouy_description='Old outcome explanation';
  const patch=lessonDescriptionPatch(mission,module),updated={...mission,...patch};
  expect(updated.lessonScoring).toEqual(before.lessonScoring);expect(updated.steps).toEqual(before.steps);
  expect(updated.checkpoints.map(b=>({id:b.id,image:b.image,learningOutcome:b.learningOutcome,requireInteraction:b.requireInteraction}))).toEqual(before.checkpoints.map(b=>({id:b.id,image:b.image,learningOutcome:b.learningOutcome,requireInteraction:b.requireInteraction})));
  expect(updated.checkpoints.every(b=>b.sourcePdf.fileName===module.fileName && b.sourcePdf.pages.every(Number.isInteger))).toBe(true);
  expect(updated.checkpoints[0].description).toBe(before.checkpoints[0].description);
  expect(updated.bouy[0].bouy_description).toBe(before.checkpoints[0].description);
  expect(updated.checkpoints.every(b=>!/quiz|learning outcome|instructor.assess|this buoy supports/i.test(b.description))).toBe(true);
  expect(()=>lessonDescriptionPatch({...mission,missionPackVersion:'other'},module)).toThrow('reviewed');
  expect(()=>lessonDescriptionPatch({...mission,checkpoints:mission.checkpoints.slice(1)},module)).toThrow('changed');
});
