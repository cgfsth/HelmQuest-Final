import { LESSON_ALIGNMENT_VERSION, LessonAlignmentError, validateOutcomeQuiz } from '../../shared/lessonAlignment.js';
import { missionIdAliases } from './missionRewards.js';
export async function validateLessonQuiz(db, quiz) {
  const ids=[quiz.moduleId,quiz.missionId].flat().filter(id=>typeof id==='string' && /^[\w-]{1,128}$/.test(id));
  for(const id of new Set(ids.flatMap(id => missionIdAliases(id)))) {
    const doc=await db.collection('missions').doc(id).get();
    if(!doc.exists || doc.data().outcomeAlignmentVersion!==LESSON_ALIGNMENT_VERSION)continue;
    const mission=doc.data();
    const lesson=mission.syllabusModuleId ? await db.collection('syllabus_modules').doc(mission.syllabusModuleId).get() : null;
    try { validateOutcomeQuiz(quiz,lesson?.data()?.objectives || mission.lesson_outcomes); }
    catch(error) { throw new LessonAlignmentError(error.message); }
  }
  return quiz;
}
