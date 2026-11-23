import { missionOwner } from '../../shared/missionAccess.js';
import { missionIdAliases } from './missionRewards.js';
import { deleteRecordsWithXp } from './deleteRecordsWithXp.js';

const values = value => (Array.isArray(value) ? value : [value]).filter(value => typeof value === 'string' && value);
const matches = (data, fields, ids) => fields.some(field => values(data[field]).some(value => ids.has(value)));
const courseFields = ['syllabusId', 'courseId'];
const foreignCourse = (data, id) => courseFields.some(field => data[field] && data[field] !== id);
const ownCourse = (data, id) => !foreignCourse(data, id) && courseFields.some(field => data[field] === id);
const missionFields = ['missionId', 'missionid', 'mission_id'];
const quizFields = ['quizId', 'quizid', 'quiz_id'];

// Persist identifiers before removing course materials so cleanup can resume
// after a crash without losing the links needed to find results and progress.
export async function planSyllabusRecords(read, db, id, instructorId, modules, activities) {
  const names = ['missions', 'quiz', 'quizzes', 'quiz_assignments', 'quizAssignments', 'learning_activities'];
  const snapshots = await Promise.all(names.map(name => read(db.collection(name))));
  const records = Object.fromEntries(names.map((name, index) => [name, snapshots[index].docs.map(doc => ({ ...doc.data(), id: doc.id }))]));
  const moduleIds = new Set(modules.map(doc => doc.id));
  const local = activities.map(doc => ({ ...doc.data(), id: doc.id }));
  const external = records.learning_activities.filter(item => item.syllabusId !== id);
  const referencedMissions = new Set(local.filter(item => item.type === 'simulation').flatMap(item => missionIdAliases(item.targetId)));
  const externalMissions = new Set(external.filter(item => item.type === 'simulation').flatMap(item => missionIdAliases(item.targetId)));
  const missionIds = new Set();
  for (const mission of records.missions) {
    if (missionOwner(mission) !== instructorId || foreignCourse(mission, id) || externalMissions.has(mission.id)) continue;
    if (ownCourse(mission, id) || referencedMissions.has(mission.id) || moduleIds.has(mission.syllabusModuleId)) missionIds.add(mission.id);
  }
  // Old activity links can outlive their target document; their records still
  // belong to this course, provided no other course references the target.
  for (const target of referencedMissions) {
    if (!externalMissions.has(target) && !records.missions.some(item => missionIdAliases(item.id).includes(target))) missionIds.add(target);
  }
  const missionAliases = new Set([...missionIds].flatMap(missionIdAliases));
  const targetIds = new Set([...moduleIds, ...missionAliases]);
  const quizzes = [...records.quiz, ...records.quizzes];
  const assignments = [...records.quiz_assignments, ...records.quizAssignments];
  const referencedQuizzes = new Set(local.flatMap(item => [item.type === 'quiz' ? item.targetId : '', item.quizPolicy === 'assigned' ? item.quizId : '']).filter(Boolean));
  for (const assignment of assignments) {
    if (!foreignCourse(assignment, id) && (ownCourse(assignment, id) || matches(assignment, ['moduleId', 'missionId'], targetIds)
      || (['module', 'mission'].includes(assignment.targetType) && matches(assignment, ['targetId'], targetIds)))) {
      for (const quizId of values(assignment.quizId)) referencedQuizzes.add(quizId);
    }
  }
  const externalQuizzes = new Set(external.flatMap(item => [item.type === 'quiz' ? item.targetId : '', item.quizPolicy === 'assigned' ? item.quizId : '']).filter(Boolean));
  const quizIds = new Set();
  for (const quiz of quizzes) {
    const owner = missionOwner(quiz);
    if ((owner && owner !== instructorId) || foreignCourse(quiz, id) || externalQuizzes.has(quiz.id)) continue;
    const sharedTarget = ['moduleId', ...missionFields].some(field => values(quiz[field]).some(value => !targetIds.has(value)));
    const sharedAssignment = assignments.some(item => item.quizId === quiz.id && (foreignCourse(item, id)
      || (['module', 'mission'].includes(item.targetType) && values(item.targetId).some(value => !targetIds.has(value)))));
    if (sharedTarget || sharedAssignment) continue;
    if (ownCourse(quiz, id) || referencedQuizzes.has(quiz.id) || matches(quiz, ['moduleId', ...missionFields], targetIds)) quizIds.add(quiz.id);
  }
  for (const target of referencedQuizzes) {
    if (!externalQuizzes.has(target) && !quizzes.some(item => item.id === target)) quizIds.add(target);
  }
  return { instructorId, moduleIds: [...moduleIds], activityIds: local.map(item => item.id), missionIds: [...missionIds], quizIds: [...quizIds] };
}

export async function cleanupSyllabusRecords(db, id, scope) {
  const moduleIds = new Set(scope.moduleIds), activityIds = new Set([...scope.activityIds, `syllabus-${id}`, ...scope.moduleIds.map(value => `module-${value}`)]);
  const names = ['learning_activity_progress', 'mission_score', 'quiz_score', 'quiz_scores', 'quiz_results', 'quiz_result', 'quiz_assignments', 'quizAssignments', 'quiz', 'quizzes', 'missions'];
  const snapshots = await Promise.all([...names, 'learning_activities'].map(name => db.collection(name).get()));
  const docs = Object.fromEntries([...names, 'learning_activities'].map((name, index) => [name, snapshots[index].docs]));
  const external = docs.learning_activities.map(doc => doc.data()).filter(item => item.syllabusId !== id);
  const sharedMissions = new Set(external.filter(item => item.type === 'simulation').flatMap(item => missionIdAliases(item.targetId)));
  const eligibleMissions = new Set(scope.missionIds.filter(key => !sharedMissions.has(key) && docs.missions.filter(doc => doc.id === key)
    .every(doc => !foreignCourse(doc.data(), id) && missionOwner(doc.data()) === scope.instructorId)));
  const missionIds = new Set([...eligibleMissions].flatMap(missionIdAliases));
  const sharedQuizzes = new Set(external.flatMap(item => [item.type === 'quiz' ? item.targetId : '', item.quizPolicy === 'assigned' ? item.quizId : '']).filter(Boolean));
  const quizIds = new Set(scope.quizIds.filter(key => !sharedQuizzes.has(key) && [...docs.quiz, ...docs.quizzes].filter(doc => doc.id === key)
    .every(doc => !foreignCourse(doc.data(), id) && (!missionOwner(doc.data()) || missionOwner(doc.data()) === scope.instructorId))));
  const related = data => !foreignCourse(data, id) && (ownCourse(data, id)
    || matches(data, ['activityId'], activityIds) || matches(data, ['lessonId', 'moduleId', 'syllabusModuleId'], moduleIds)
    || matches(data, [...missionFields, 'moduleId'], missionIds) || matches(data, quizFields, quizIds));
  const submissionIds = new Set(['quiz_score', 'quiz_scores'].flatMap(name => docs[name].filter(doc => related(doc.data())).map(doc => doc.id)));
  const references = [];
  const removedTargets = new Set([...moduleIds, ...missionIds]);
  // Results precede submissions, and target definitions are deleted last. A
  // partial batch failure leaves the persisted scope available for retry.
  for (const name of ['quiz_results', 'quiz_result', ...names.filter(name => !['quiz_results', 'quiz_result'].includes(name))]) {
    for (const doc of docs[name]) {
      const data = doc.data();
      const selected = name === 'missions' ? eligibleMissions.has(doc.id)
        : ['quiz', 'quizzes'].includes(name) ? quizIds.has(doc.id)
          : related(data) || (!foreignCourse(data, id) && matches(data, ['submissionId', 'submissionid'], submissionIds))
            || (['quiz_assignments', 'quizAssignments'].includes(name) && !foreignCourse(data, id)
              && ['module', 'mission'].includes(data.targetType) && matches(data, ['targetId'], removedTargets));
      if (!selected) continue;
      if (['quiz_assignments', 'quizAssignments'].includes(name) && !ownCourse(data, id) && ['module', 'mission'].includes(data.targetType)
        && Array.isArray(data.targetId) && data.targetId.some(value => !removedTargets.has(value))) {
        references.push({ ref: doc.ref, collection: name, patch: { targetId: data.targetId.filter(value => !removedTargets.has(value)) } });
      } else references.push({ ref: doc.ref, collection: name });
    }
  }
  // At most 225 record writes + 225 affected student updates per transaction.
  for (let index = 0; index < references.length; index += 225) {
    await deleteRecordsWithXp(db, references.slice(index, index + 225));
  }
}
