import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { ref } from 'vue';
import { LESSON_ALIGNMENT_VERSION, lessonOutcomes, alignLessonMission, validateOutcomeQuiz } from '../shared/lessonAlignment.js';
import { simulationPerformance } from '../shared/simulationPerformance.js';
import { gradeMissionQuiz } from '../shared/missionQuiz.js';
const outcomes=['Read a chart','Choose a heading'];
const mission={outcomeAlignmentVersion:LESSON_ALIGNMENT_VERSION,checkpoints:outcomes.map((learningOutcome,index)=>({id:'buoy-'+index,image:'chart.png',description:'Read the picture and explanation.',learningOutcome,requireInteraction:index?'photograph':'inspect_buoy'})),steps:[]};
test('published missions support every saved outcome with a picture and description, without buoy questions',()=>{
  const aligned=alignLessonMission(mission,'• Read a chart\r\n• Choose a heading');
  assert.deepEqual(aligned.lesson_outcomes,outcomes);assert.equal(aligned.steps.length,3);
  assert.equal(aligned.steps.at(-1).type,'dock');assert.equal(aligned.bouy[1].require_interaction,'photograph');
  assert.equal(JSON.stringify(aligned.checkpoints).includes('question'),false);
  assert.equal(aligned.checkpoints[0].assessment,undefined);
  assert.deepEqual(lessonOutcomes('• Read a chart\n\n• Choose a heading'),outcomes);
});
test('uncovered outcomes, missing pictures and ID-entry interactions cannot be published as aligned lessons',()=>{
  assert.throws(()=>alignLessonMission({...mission,checkpoints:mission.checkpoints.slice(0,1)},outcomes),/every lesson/);
  for(const patch of [{image:''},{description:''},{learningOutcome:'Unrelated'},{requireInteraction:'verify_id'}])
    assert.throws(()=>alignLessonMission({...mission,checkpoints:[{...mission.checkpoints[0],...patch},mission.checkpoints[1]]},outcomes));
  assert.doesNotThrow(()=>alignLessonMission({...mission,checkpoints:[{id:'draft',description:'',image:'',learningOutcome:''}]},outcomes,false));
});
test('only the final quiz carries questions and it must cover every outcome when published',()=>{
  const quiz={published:true,questions:outcomes.map((learningOutcome,index)=>({id:String(index),learningOutcome,type:'true-false',prompt:'Identify the displayed scenario.',correctAnswer:'True'}))};
  assert.equal(validateOutcomeQuiz(quiz,outcomes),quiz);
  assert.throws(()=>validateOutcomeQuiz({...quiz,questions:quiz.questions.slice(0,1)},outcomes),/every lesson/);
  assert.throws(()=>validateOutcomeQuiz({...quiz,questions:[{prompt:'Unmapped question'}]},outcomes),/Link every/);
  assert.doesNotThrow(()=>validateOutcomeQuiz({published:false,status:'draft',questions:[{}]},outcomes));
  const result=gradeMissionQuiz(quiz,{'0':'True','1':'False'});
  assert.equal(result.score,50);assert.equal(result.answers[0].learningOutcome,outcomes[0]);
  const simulation=simulationPerformance({completion:100,accuracy:80,safety:90},70);
  assert.equal(simulation.score,90);assert.equal(simulation.scoringVersion,'simulation-v3');
});
const source=readFileSync(new URL('../src/App.vue',import.meta.url),'utf8').replace(/\r\n/g,'\n');
function actual(name){const i=source.indexOf(`function ${name}(`);return source.slice(i,source.indexOf('\n}',i)+2);}
test('the actual buoy popup shows the picture and description, without an outcome block or questions',()=>{
  const template=source.split('<!-- Gear Info Popup (after photographing) -->')[1].split('<!-- Fish caught popup -->')[0];
  assert.doesNotMatch(template,/<input|<textarea|<select|question\.prompt|correctAnswer|Submit answer/);
  assert.doesNotMatch(template,/Learning outcome|\{\{\s*gearInfoPopup\.learningOutcome\s*\}\}/);
  let completed=0;const context={activeTrainingModule:ref({buoys:[{waypointZone:'buoy-0',name:'Chart',imageSrc:'chart.png',description:'Read the chart.',learningOutcome:outcomes[0]}]}),
    gearInfoPopup:ref(null),activeMiniGame:ref('inspect_buoy'),pendingPopupMinigame:null,GEAR_INFO_DATA:{},cancelMiniGame(){},completeMiniGame(){completed++;}};
  vm.createContext(context);vm.runInContext(actual('showGearInfoPopup')+'\n'+actual('dismissGearInfoPopup'),context);
  context.showGearInfoPopup('buoy-0');assert.equal(context.gearInfoPopup.value.learningOutcome,outcomes[0]);
  context.dismissGearInfoPopup();assert.equal(completed,1);
});
test('aligned missions keep teacher-selected practical tasks instead of random ID questions or debris tasks',()=>{
  const context={LESSON_ALIGNMENT_VERSION};vm.createContext(context);vm.runInContext(actual('randomizeBuoyTasks'),context);
  const configured={outcomeAlignmentVersion:LESSON_ALIGNMENT_VERSION,buoys:[{waypointZone:'one'}],steps:[{waypointZone:'one',requireInteraction:'photograph'}]};
  context.randomizeBuoyTasks(configured);assert.equal(configured.steps[0].requireInteraction,'photograph');
});
