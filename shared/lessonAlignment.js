export const LESSON_ALIGNMENT_VERSION = 'lesson-outcomes-v1';
export class LessonAlignmentError extends Error {}
export const lessonOutcomes = value => (Array.isArray(value) ? value : String(value || '').split(/\r?\n/))
  .map(line => String(line).replace(/^\s*[•\-*]\s*/, '').trim()).filter(Boolean);

// Buoys provide the lesson's picture, explanation and practical navigation task.
// Knowledge questions belong to the existing post-docking quiz, never a buoy.
export function alignLessonMission(mission, savedOutcomes, published = true) {
  if (mission.outcomeAlignmentVersion !== LESSON_ALIGNMENT_VERSION) return mission;
  const outcomes = lessonOutcomes(savedOutcomes), covered = new Set(), ids = new Set();
  if (!outcomes.length) throw new Error('Save the lesson learning outcomes before creating its mission.');
  if (!mission.checkpoints?.length || mission.checkpoints.length > 20) throw new Error('Add between 1 and 20 lesson buoy checkpoints.');
  const checkpoints = mission.checkpoints.map((checkpoint,index) => {
    const id = checkpoint.waypointZone || checkpoint.id, outcome = String(checkpoint.learningOutcome || '').trim();
    const original = mission.bouy?.find(b => b.checkpoint_id === id) || {};
    const image = checkpoint.image || original.Image || '', description = checkpoint.description || original.bouy_description || '';
    if (typeof id !== 'string' || !/^[\w-]{1,128}$/.test(id) || ids.has(id)) throw new Error('Use a unique checkpoint ID for each buoy.');
    ids.add(id);
    if (outcome && !outcomes.includes(outcome)) throw new Error('Choose an existing lesson learning outcome for every buoy.');
    if (published && (!outcome || !image || !description.trim())) throw new Error('Each published buoy needs a lesson outcome, picture and description.');
    const interaction = checkpoint.requireInteraction || 'inspect_buoy';
    if (!['inspect_buoy','photograph'].includes(interaction)) throw new Error('Use Inspect or Photograph for lesson buoys. Knowledge questions are answered in the final quiz.');
    covered.add(outcome);
    return { ...checkpoint, id, waypointZone:id, name:checkpoint.name || `Buoy ${index+1}`, image, description, learningOutcome:outcome, requireInteraction:interaction };
  });
  if (published && outcomes.some(outcome => !covered.has(outcome))) throw new Error('Support every lesson learning outcome with at least one buoy before publishing.');
  const steps = checkpoints.map((b,index) => ({type:'compass',heading:String((45+index*360/checkpoints.length)%360),
    ...(mission.steps || []).find(s => s.waypointZone === b.waypointZone),waypointZone:b.waypointZone,
    instruction:`Navigate to ${b.name} and ${b.requireInteraction === 'photograph' ? 'photograph' : 'inspect'} its lesson material (Q)`,requireInteraction:b.requireInteraction}));
  steps.push({...(mission.steps || []).find(s=>s.type==='dock'),type:'dock',waypointZone:'harbor-berth',anchorAction:'deploy',instruction:'Return to port, stop the engine and deploy the anchor'});
  const bouy = checkpoints.map(b=>({Image:b.image,bouy_description:b.description,checkpoint_id:b.waypointZone,require_interaction:b.requireInteraction,learningOutcome:b.learningOutcome}));
  return {...mission,checkpoints,bouy,steps,mission_steps:[],lesson_outcomes:outcomes};
}

export function validateOutcomeQuiz(quiz, outcomes) {
  const expected = lessonOutcomes(outcomes), covered = new Set();
  const published = quiz.published !== false && !['draft','inactive','unpublished','deleted'].includes(quiz.status);
  if (!expected.length) throw new Error('Save the lesson outcomes before publishing its final quiz.');
  for(const q of quiz.questions || []) {
    const outcome = String(q.learningOutcome || '').trim();
    if(outcome && !expected.includes(outcome)) throw new Error('Choose a saved lesson outcome for each quiz question.');
    if(published && !outcome) throw new Error('Link every published quiz question to a lesson learning outcome.');
    covered.add(outcome);
  }
  if(published && expected.some(outcome=>!covered.has(outcome))) throw new Error('Add a quiz question for every lesson learning outcome before publishing.');
  return quiz;
}
