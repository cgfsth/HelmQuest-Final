// Create reviewed lesson content using the same owner/PDF/revision checks as the UI.
// Dry run is the default. No existing missions, quizzes or results are overwritten.
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {buildLessonMission,LESSON_MISSION_PACK_VERSION,LESSON_MISSION_SPECS} from '../content/lessonMissions.js';
import {createCourseActivitiesService} from '../services/courseActivities.js';
import {createLearningMaterialsService} from '../services/learningMaterials.js';
import {validateLessonQuiz} from '../services/quizLessonAlignment.js';
const args=process.argv.slice(2),value=key=>args[args.indexOf(key)+1];
const syllabusId=args.includes('--syllabus')?value('--syllabus'):'';
if(!/^[\w-]{1,128}$/.test(syllabusId))throw new Error('Provide --syllabus with the specific reviewed course ID.');
const apply=args.includes('--apply'),directory=resolve(args.includes('--report-dir')?value('--report-dir'):'../.tmp/lesson-missions');mkdirSync(directory,{recursive:true});
const projectRoot=fileURLToPath(new URL('../../',import.meta.url));
const {db}=await import('../config/firebase-admin.js');
try{
  const parent=await db.collection('syllabi').doc(syllabusId).get();
  if(!parent.exists || parent.data().status!=='active' || !parent.data().instructorId)throw new Error('Active course with an instructor required.');
  const user={id:parent.data().instructorId,role:'instructor'};
  const instructor=await db.collection('instructor').doc(user.id).get();
  if(!instructor.exists || instructor.data().status==='inactive')throw new Error('Active course instructor required.');
  const children=await db.collection('syllabus_modules').where('syllabusId','==',syllabusId).get();
  const modules=children.docs.map(doc=>({...doc.data(),id:doc.id})).filter(m=>m.status==='active' && m.published!==false && Number(m.moduleNumber)>=1 && Number(m.moduleNumber)<=6).sort((a,b)=>a.moduleNumber-b.moduleNumber);
  if(modules.length!==6 || new Set(modules.map(m=>Number(m.moduleNumber))).size!==6)throw new Error('The course must have exactly one active lesson numbered 1-6.');
  const existingActivities=await db.collection('learning_activities').where('syllabusId','==',syllabusId).get();
  const images=Object.fromEntries([...new Set(LESSON_MISSION_SPECS.flatMap(spec=>spec.buoys.map(b=>b.image)))].map(key=>[key,'data:image/webp;base64,'+readFileSync(resolve(projectRoot,'public/lesson-missions',key+'.webp')).toString('base64')]));
  const prepared=[];
  for(const module of modules){
    const hasPdf=!!module.fileName && !!module.storagePath || existingActivities.docs.some(doc=>{const a=doc.data();return a.moduleId===module.id && a.status==='active' && a.type==='pdf' && a.fileName && a.storagePath;});
    if(!hasPdf)throw new Error(`Lesson ${module.moduleNumber} needs its PDF before mission creation.`);
    const item=buildLessonMission({syllabusId,module,images});
    if(Buffer.byteLength(JSON.stringify(item.mission))>800000)throw new Error('Mission is too large for safe Firestore storage.');
    const [mission,quiz]=await Promise.all([db.collection('missions').doc(item.missionId).get(),db.collection('quiz').doc(item.quizId).get()]);
    const linked=existingActivities.docs.find(doc=>doc.data().targetId===item.missionId && doc.data().moduleId===module.id && doc.data().status==='active');
    const completed=mission.exists && quiz.exists && linked && mission.data().missionPackVersion===LESSON_MISSION_PACK_VERSION && quiz.data().missionPackVersion===LESSON_MISSION_PACK_VERSION && linked.data().published!==false && linked.data().quizId===item.quizId;
    if(!completed && (mission.exists || quiz.exists || linked))throw new Error(`Lesson ${item.lesson} has a conflicting or partial pack. Review it before retrying; nothing was overwritten.`);
    if(!completed && existingActivities.docs.some(doc=>{const a=doc.data();return a.moduleId===module.id && a.type==='simulation' && a.status==='active';}))throw new Error(`Lesson ${item.lesson} already has a mission. Review it before adding another.`);
    prepared.push({...item,moduleId:module.id,action:completed?'preserve-existing':'create'});
  }
  const summary={syllabusId,courseTitle:parent.data().title,version:LESSON_MISSION_PACK_VERSION,mode:apply?'apply':'dry-run',preparedAt:new Date().toISOString(),lessons:prepared.map(({lesson,missionId,quizId,mission,buoyCount,questionCount,action})=>({lesson,title:mission.mission_title,missionId,quizId,buoyCount,questionCount,scoring:mission.lessonScoring?.mode || 'navigation practice + separate knowledge quiz',action}))};
  writeFileSync(resolve(directory,'mission-plan.json'),JSON.stringify(summary,null,2));
  console.log(JSON.stringify(summary,null,2));
  if(!apply){console.log('Dry run complete. No database writes.');process.exitCode=0;}
  else{
    const timestamp=()=>new Date(),materials=createLearningMaterialsService({db,timestamp,bucket:()=>{throw new Error('This creator does not upload or replace lesson PDFs.');}});
    const course=createCourseActivitiesService({db,timestamp,materials,bucket:()=>{throw new Error('PDF file access is not part of content creation.');}}),receipts=[];
    for(const item of prepared){
      if(item.action==='preserve-existing'){receipts.push({lesson:item.lesson,missionId:item.missionId,quizId:item.quizId,skipped:true});continue;}
      const hash=createHash('sha256').update(JSON.stringify(item.mission)).digest('hex');
      const draft=await course.saveModuleMission(user,syllabusId,item.moduleId,{missionId:item.missionId,mission:{...item.mission,missionPackHash:hash},published:false,allowRetakes:true});
      const quiz={...item.quiz,instructorId:user.id,instructorid:user.id,createdBy:user.id,createdAt:new Date()};
      await validateLessonQuiz(db,quiz);
      await db.runTransaction(async tx=>{const target=db.collection('quiz').doc(item.quizId),existing=await tx.get(target);if(existing.exists)throw new Error('Quiz already exists; nothing was replaced.');tx.create(target,quiz);});
      await course.save(user,syllabusId,item.moduleId,draft.activityId,{revision:draft.revision,type:'simulation',title:item.mission.mission_title,description:item.mission.description,objectives:item.mission.learning_objectives.join('\n'),instructions:item.instructions,targetId:item.missionId,completionRule:'pass',passScore:70,quizPolicy:'assigned',quizId:item.quizId,published:true,allowRetakes:true});
      const [savedMission,savedQuiz,activity]=await Promise.all([db.collection('missions').doc(item.missionId).get(),db.collection('quiz').doc(item.quizId).get(),db.collection('learning_activities').doc(draft.activityId).get()]);
      if(!savedMission.exists || !savedQuiz.exists || !activity.data()?.published || activity.data().quizId!==item.quizId)throw new Error('Saved content verification failed.');
      receipts.push({lesson:item.lesson,missionId:item.missionId,quizId:item.quizId,activityId:draft.activityId,buoys:savedMission.data().checkpoints.length,questions:savedQuiz.data().questions.length,published:true});
      writeFileSync(resolve(directory,'creation-receipts.json'),JSON.stringify({syllabusId,createdAt:new Date().toISOString(),receipts},null,2));console.log(`Created lesson ${item.lesson}: ${item.buoyCount} buoys, ${item.questionCount} final-quiz questions.`);
    }
    console.log(`Verified ${receipts.length} linked lesson missions. No student scores or XP were changed.`);
  }
}finally{await db.terminate();}
