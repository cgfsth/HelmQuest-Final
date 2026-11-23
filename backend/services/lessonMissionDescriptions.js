import {LESSON_DESCRIPTION_VERSION,LESSON_MISSION_PACK_VERSION,LESSON_MISSION_SPECS} from '../content/lessonMissions.js';
import {lessonOutcomes} from '../../shared/lessonAlignment.js';

// Patch teaching text only. Preserve the live mission's images, outcome tags and tasks.
export function lessonDescriptionPatch(mission,module) {
  const spec=LESSON_MISSION_SPECS.find(s=>s.lesson===Number(module.moduleNumber));
  if(!spec || mission.missionPackVersion!==LESSON_MISSION_PACK_VERSION || mission.syllabusModuleId!==module.id)throw new Error('Only the reviewed generated lesson missions can be updated.');
  const prefix=`custom-mission-lesson-${spec.lesson}-${module.id}`,outcomes=lessonOutcomes(module.objectives);
  const expected=new Map(spec.buoys.map((b,i)=>[`${prefix}-buoy-${i+1}`,{description:b.description,sourcePdf:{fileName:module.fileName || `HelmQuest_Lesson_${spec.lesson}.pdf`,pages:b.pdfPages},outcome:outcomes[b.outcome]}]));
  const known=(array,id)=>Array.isArray(array) && array.length===expected.size && new Set(array.map(id)).size===expected.size && array.every(b=>expected.has(id(b)));
  if(!known(mission.checkpoints,b=>b.id) || !known(mission.bouy,b=>b.checkpoint_id))throw new Error('The mission checkpoints changed. Review their descriptions individually.');
  if(mission.checkpoints.some(b=>b.learningOutcome!==expected.get(b.id).outcome))throw new Error('The lesson outcome mapping changed. Review it before updating descriptions.');
  return {
    checkpoints:mission.checkpoints.map(b=>({...b,description:expected.get(b.id).description,sourcePdf:expected.get(b.id).sourcePdf})),
    bouy:mission.bouy.map(b=>({...b,bouy_description:expected.get(b.checkpoint_id).description,sourcePdf:expected.get(b.checkpoint_id).sourcePdf})),
    descriptionSourceVersion:LESSON_DESCRIPTION_VERSION
  };
}
