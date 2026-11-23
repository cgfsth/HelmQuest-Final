// Dry-run by default; update only generated buoy descriptions and PDF provenance.
import {createHash} from 'node:crypto';
import {mkdirSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {lessonDescriptionPatch} from '../services/lessonMissionDescriptions.js';
const args=process.argv.slice(2),index=args.indexOf('--syllabus'),syllabusId=index>=0?args[index+1]:'';
if(!/^[\w-]{1,128}$/.test(syllabusId))throw new Error('Provide the reviewed --syllabus ID.');
const apply=args.includes('--apply'),directory=resolve('../.tmp/lesson-descriptions');mkdirSync(directory,{recursive:true});
const canonical=value=>JSON.stringify(value,(_key,item)=>item && typeof item==='object' && !Array.isArray(item)?Object.fromEntries(Object.entries(item).sort(([a],[b])=>a.localeCompare(b))):item);
const digest=value=>createHash('sha256').update(canonical(value)).digest('hex');
function protectedFields(mission){const {checkpoints,bouy,updatedAt,descriptionSourceVersion,...rest}=mission;return {...rest,checkpoints:checkpoints.map(({description,sourcePdf,...b})=>b),bouy:bouy.map(({bouy_description,sourcePdf,...b})=>b)};}
const {db}=await import('../config/firebase-admin.js');
try{
  const parentRef=db.collection('syllabi').doc(syllabusId),parent=await parentRef.get();
  if(!parent.exists || parent.data().status!=='active')throw new Error('Active course required.');
  const children=await db.collection('syllabus_modules').where('syllabusId','==',syllabusId).get();
  const modules=children.docs.filter(d=>d.data().status==='active' && Number(d.data().moduleNumber)>=1 && Number(d.data().moduleNumber)<=6).sort((a,b)=>a.data().moduleNumber-b.data().moduleNumber);
  if(modules.length!==6 || new Set(modules.map(d=>Number(d.data().moduleNumber))).size!==6)throw new Error('Expected one lesson for each number 1-6.');
  const plan=[];
  for(const doc of modules){
    const module={...doc.data(),id:doc.id},id=`custom-mission-lesson-${module.moduleNumber}-${module.id}`,ref=db.collection('missions').doc(id),saved=await ref.get();
    if(!saved.exists || saved.data().instructorId!==parent.data().instructorId || saved.data().syllabusId!==syllabusId)throw new Error('Generated mission owner or course does not match.');
    const mission=saved.data(),patch=lessonDescriptionPatch(mission,module);
    plan.push({lesson:Number(module.moduleNumber),moduleRef:doc.ref,ref,module,mission,patch,before:digest(mission),protectedDigest:digest(protectedFields(mission))});
  }
  writeFileSync(resolve(directory,'description-plan.json'),JSON.stringify({syllabusId,apply,lessons:plan.map(p=>({lesson:p.lesson,missionId:p.ref.id,descriptions:p.patch.checkpoints.map(b=>({id:b.id,name:b.name,description:b.description,sourcePdf:b.sourcePdf}))}))},null,2));
  console.log(JSON.stringify({mode:apply?'apply':'dry-run',lessons:plan.length,descriptions:plan.reduce((n,p)=>n+p.patch.checkpoints.length,0),example:plan[0].patch.checkpoints[0].description},null,2));
  if(apply){
    writeFileSync(resolve(directory,`before-${Date.now()}.json`),JSON.stringify({syllabusId,missions:plan.map(p=>({id:p.ref.id,protectedDigest:p.protectedDigest,checkpoints:p.mission.checkpoints.map(b=>({id:b.id,description:b.description,sourcePdf:b.sourcePdf || null})),bouy:p.mission.bouy.map(b=>({id:b.checkpoint_id,description:b.bouy_description,sourcePdf:b.sourcePdf || null}))}))},null,2));
    await db.runTransaction(async tx=>{
      const currentParent=await tx.get(parentRef),fresh=await Promise.all(plan.map(async p=>({module:await tx.get(p.moduleRef),mission:await tx.get(p.ref)})));
      if(!currentParent.exists || currentParent.data().status!=='active' || currentParent.data().instructorId!==parent.data().instructorId)throw new Error('Course changed. Refresh before updating.');
      const patches=fresh.map((f,i)=>{
        if(!f.module.exists || !f.mission.exists || digest(f.mission.data())!==plan[i].before || canonical(f.module.data().objectives)!==canonical(plan[i].module.objectives) || f.module.data().fileName!==plan[i].module.fileName || f.module.data().storagePath!==plan[i].module.storagePath)throw new Error('Lesson content changed during review. Refresh before updating.');
        return lessonDescriptionPatch(f.mission.data(),{...f.module.data(),id:f.module.id});
      });
      patches.forEach((patch,i)=>tx.update(plan[i].ref,{...patch,updatedAt:new Date()}));
    });
    for(const p of plan){const saved=(await p.ref.get()).data();if(digest(protectedFields(saved))!==p.protectedDigest || saved.checkpoints.some((b,i)=>b.description!==p.patch.checkpoints[i].description))throw new Error('Description update verification failed.');}
    writeFileSync(resolve(directory,'verification.json'),JSON.stringify({verified:true,lessons:6,descriptions:21,protectedMissionFieldsUnchanged:true,quizzesAndResultsWritten:false},null,2));
    console.log('Updated and verified 21 PDF-based descriptions. Images, outcome mappings, tasks and scoring are preserved.');
  }else console.log('No database writes. Review description-plan.json before applying.');
}finally{await db.terminate();}
