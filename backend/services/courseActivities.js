import { createHash, randomUUID } from 'node:crypto';
import { MaterialsError, MaterialsStorageError, canReadSyllabus, canManageSyllabus, documentVersion, validatePdf } from './learningMaterials.js';
import { canonicalMissionId, hasMissionCompletion } from './missionRewards.js';
import { missionOwner } from '../../shared/missionAccess.js';
import { createPresentationPreview } from './presentationPreview.js';
import { OFFICIAL_SYLLABUS, OFFICIAL_SYLLABUS_KEY } from '../../shared/officialSyllabus.js';
import { simulationPerformance, validDockingCompletion, completedSimulationScores } from '../../shared/simulationPerformance.js';
import { normalizeEncounter, normalizeEncounterAttempt } from '../../shared/vesselEncounter.js';
import { selectMissionQuiz, gradeMissionQuiz } from '../../shared/missionQuiz.js';
import { simulationAttempt } from '../../shared/simulationAttempts.js';
import { normalizeLearningLink } from '../../shared/learningLinks.js';
import { LESSON_ALIGNMENT_VERSION, alignLessonMission, validateOutcomeQuiz } from '../../shared/lessonAlignment.js';
import { LESSON_SCORING_VERSION, INTEGRATED_SIMULATION_VERSIONS, lessonScoringDefinition, gradeChartTask, gradeLightingTask, scoreLessonSimulation, outcomeQuizScores } from '../../shared/lessonScoring.js';

const fail = (status, message) => { throw new MaterialsError(status, message); };
const validId = id => typeof id === 'string' && /^[\w-]{1,128}$/.test(id);
const clean = (value, max, required = false) => {
  if (typeof value !== 'string' || value.trim().length > max || (required && !value.trim())) fail(400, `Provide valid text of ${max} characters or fewer.`);
  return value.trim();
};
const checkRevision = (record, value) => { if (!Number.isInteger(Number(value)) || Number(value) !== record.revision) fail(409, 'This content changed. Refresh before saving again.'); };
const date = value => value?.toDate ? value.toDate().toISOString() : value instanceof Date ? value.toISOString() : typeof value === 'string' ? value : null;
const isFile = type => ['pdf', 'presentation'].includes(type);
const isResource = type => isFile(type) || type === 'link';
const summary = doc => {
  const d = doc.data();
  return { id: doc.id, syllabusId: d.syllabusId, moduleId: d.moduleId, type: d.type, title: d.title, description: d.description,
    objectives: d.objectives, instructions: d.instructions, order: d.order, published: d.published !== false, completionRule: d.completionRule,
    passScore: d.passScore, targetId: d.targetId, targetTitle: d.targetTitle, allowRetakes: d.allowRetakes !== false, quizPolicy: d.quizPolicy || 'inherit', quizId: d.quizId || '', availableFrom: d.availableFrom, availableUntil: d.availableUntil,
    fileName: d.fileName, sourceFileName: d.sourceFileName, url: d.type === 'link' ? d.url : '', documentVersion: documentVersion(d), revision: d.revision, updatedAt: date(d.updatedAt) };
};

function retakesSetting(value, previous = true) {
  if (value === undefined) return previous !== false;
  if (value === true || value === 'true') return true;
  if (value === false || value === 'false') return false;
  fail(400, 'Choose whether to allow simulation retakes.');
}

export function activityCompletion(activity, { viewed = false, started = false, results = [], quizResults = [] } = {}) {
  const knowledge=results.find(r=>r.lessonScoring?.mode==='knowledge' && r.completion?.verified);
  if(knowledge) {
    const quiz=quizResults.find(q=>q.activityId===activity.id || canonicalMissionId(q.missionId || q.moduleId)===canonicalMissionId(activity.targetId));
    const threshold=Number(activity.passScore ?? knowledge.passScore ?? 70);
    const outcomes=outcomeQuizScores(knowledge.lessonScoring,quiz);
    const requirements=[{label:'Complete the navigation practice',done:true},{label:'Complete the final quiz for the selected learning outcomes',done:outcomes.length>0 && outcomes.every(o=>o.score!=null)},
      ...(activity.completionRule==='pass'?[{label:`Achieve at least ${threshold}% for each selected knowledge outcome`,done:outcomes.length>0 && outcomes.every(o=>o.score!=null && o.score>=threshold)}]:[])];
    return {status:requirements.every(r=>r.done)?'Done':'In Progress',requirements};
  }
  const requirements = isResource(activity.type) ? [{ label: activity.type === 'link' ? 'Open the video link' : activity.type === 'presentation' ? 'View the presentation' : 'View the document', done: viewed }] : [
    { label: activity.type === 'simulation' ? 'Complete the assigned simulation' : 'Complete the quiz', done: results.length > 0 },
    ...(activity.completionRule === 'pass' ? [{ label: activity.passScore !== null && activity.passScore !== undefined ? `Achieve at least ${activity.passScore}%` : 'Meet the configured passing requirements', done: results.some(r => activity.passScore !== null && activity.passScore !== undefined ? Number(r['Quiz-score-percentage'] ?? r.score) >= activity.passScore : hasMissionCompletion(r)) }] : [])
  ];
  const done = requirements.every(item => item.done);
  return { status: done ? 'Done' : viewed || started || results.length ? 'In Progress' : 'To do', requirements };
}

export function createCourseActivitiesService({ db, bucket, timestamp, materials, convert = createPresentationPreview(), saveQuizResult, saveMissionResult }) {
  const col = name => db.collection(name);
  const ref = (name, id) => { if (!validId(id)) fail(404, 'Content not found.'); return col(name).doc(id); };
  function modulePdfAccess(moduleId, module, docs, viewed = new Map(), student = false) {
    const records = docs.docs.map(doc => ({ ...doc.data(), id: doc.id }));
    const pdfs = records.filter(item => item.status === 'active' && item.moduleId === moduleId && item.type === 'pdf' && item.fileName && item.storagePath && (!student || item.published !== false));
    if (module?.fileName && (module.storagePath || module.documentVersion) && (!student || module.published !== false)) {
      pdfs.unshift({ ...module, id: `module-${moduleId}`, title: module.title + ' — Learning material', kind: 'module' });
    }
    const documents = pdfs.map(item => ({ id: item.id, kind: item.kind || 'activity', title: item.title,
      viewed: !!viewed.get(item.id)?.viewedAt && viewed.get(item.id)?.documentVersion === (item.documentVersion || documentVersion(item)) }));
    const hasPdf = documents.length > 0, canStart = hasPdf && documents.every(item => item.viewed);
    const missing = documents.filter(item => !item.viewed);
    return { hasPdf, canCreate: hasPdf, canStart,
      message: !hasPdf ? student ? 'Your instructor must publish a PDF lesson in this module before you can start the simulation.' : 'Upload a PDF lesson in this module before creating or linking a simulation.'
        : student && !canStart ? `View the PDF ${missing.length === 1 ? 'lesson' : 'lessons'} in this module first: ${missing.map(item => item.title).join(', ')}.` : '', documents };
  }
  function requireModulePdf(moduleId, module, docs) {
    const access = modulePdfAccess(moduleId, module, docs);
    if (!access.canCreate) fail(400, access.message);
  }
  async function requireViewedModulePdfs(user, item) {
    const [docs, views] = await Promise.all([
      col('learning_activities').where('syllabusId', '==', item.data.syllabusId).get(),
      col('learning_activity_progress').where('studentId', '==', user.id).get()
    ]);
    const viewed = new Map(views.docs.map(doc => [doc.data().activityId, doc.data()]));
    const access = modulePdfAccess(item.data.moduleId, item.module, docs, viewed, true);
    if (!access.canStart) fail(403, access.message);
  }
  async function context(user, syllabusId, moduleId = null, write = false) {
    const parent = await ref('syllabi', syllabusId).get();
    const syllabus = parent.exists && parent.data();
    if (!syllabus || syllabus.status !== 'active' || !(write ? canManageSyllabus(syllabus, user) : canReadSyllabus(syllabus, user))) fail(404, 'Course not found.');
    let module = null;
    if (moduleId) {
      const doc = await ref('syllabus_modules', moduleId).get();
      module = doc.exists && doc.data();
      if (!module || module.status !== 'active' || module.syllabusId !== syllabusId || (user.role === 'student' && module.published === false)) fail(404, 'Module not found.');
    }
    return { parent: parent.ref, syllabus, module };
  }
  async function activity(user, id, write = false) {
    const doc = await ref('learning_activities', id).get();
    const data = doc.exists && doc.data();
    if (!data || data.status !== 'active' || (user.role === 'student' && data.published === false)) fail(404, 'Activity not found.');
    return { doc, data, ...await context(user, data.syllabusId, data.moduleId, write) };
  }
  async function catalog(user, syllabusId) {
    const { syllabus } = await context(user, syllabusId, null, true);
    const [missions, quizzes, assignments] = await Promise.all(['missions', 'quiz', 'quiz_assignments'].map(name => col(name).get()));
    const owned = missions.docs.filter(doc => missionOwner(doc.data()) === syllabus.instructorId);
    const ids = new Set(owned.map(doc => canonicalMissionId(doc.id)));
    const linked = value => (Array.isArray(value) ? value : [value]).some(id => id && ids.has(canonicalMissionId(id)));
    const assigned = new Set(assignments.docs.filter(doc => doc.data().targetType === 'module' && linked(doc.data().targetId)).map(doc => doc.data().quizId));
    const allowed = quizzes.docs.filter(doc => {
      const q = doc.data(), owner = q.instructorId || q.instructorid || q.createdBy;
      return q.status !== 'deleted' && (!owner || owner === syllabus.instructorId) && (owner === syllabus.instructorId || linked(q.moduleId) || linked(q.missionId) || assigned.has(doc.id));
    });
    return { missions: owned.map(doc => ({ id: doc.id, title: doc.data().mission_title || doc.data().title || 'Mission' })), quizzes: allowed.map(doc => ({ id: doc.id, title: doc.data().title || 'Quiz' })) };
  }
  async function course(user, id) {
    const detail = await materials.detail(user, id);
    const docs = await col('learning_activities').where('syllabusId', '==', id).get();
    await context(user, id);
    const modules = new Set(detail.modules.map(m => m.id));
    const activities = docs.docs.filter(doc => { const d = doc.data(); return d.status === 'active' && (!d.moduleId || modules.has(d.moduleId)) && (user.role !== 'student' || (d.published !== false && d.type !== 'quiz')); }).map(summary).sort((a, b) => a.order - b.order || a.id.localeCompare(b.id));
    let progress = {}, viewed = new Map();
    if (user.role === 'student') {
      const [views, missionScores, quizScores] = await Promise.all(['learning_activity_progress', 'mission_score', 'quiz_score'].map(name => col(name).where('studentId', '==', user.id).get()));
      viewed = new Map(views.docs.map(doc => [doc.data().activityId, doc.data()]));
      const missions = missionScores.docs.map(doc => doc.data()), quizzes = quizScores.docs.map(doc => doc.data());
      for (const a of activities) {
        const state = viewed.get(a.id) || {};
        const results = a.type === 'simulation' ? missions.filter(r => canonicalMissionId(r.missionId) === canonicalMissionId(a.targetId)) : a.type === 'quiz' ? quizzes.filter(r => r.quizId === a.targetId) : [];
        progress[a.id] = activityCompletion(a, { viewed: !!state.viewedAt && state.documentVersion === a.documentVersion, started: !!state.startedAt,
          results, quizResults:quizzes });
        if (a.type === 'simulation') {
          const { result, ...attempt } = simulationAttempt(results, a.allowRetakes, !!state.startedAt);
          progress[a.id].simulation = attempt;
        }
      }
      for (const d of [detail.syllabus, ...detail.modules].filter(d => d.fileName)) {
        const key = `${d.id === id ? 'syllabus' : 'module'}-${d.id}`;
        progress[key] = activityCompletion({ type: 'pdf' }, { viewed: !!viewed.get(key)?.viewedAt && viewed.get(key)?.documentVersion === d.documentVersion });
      }
    }
    const choices = user.role !== 'student' ? { catalog: await catalog(user, id) } : {};
    const simulationAccess = Object.fromEntries(detail.modules.map(module => [module.id, modulePdfAccess(module.id, module, docs, viewed, user.role === 'student')]));
    await context(user, id);
    return { ...detail, activities, progress, simulationAccess, ...choices, official: detail.syllabus.officialSyllabusKey === OFFICIAL_SYLLABUS_KEY ? OFFICIAL_SYLLABUS : null, cleanupPending: !!detail.cleanupPending || (user.role !== 'student' && docs.docs.some(doc => doc.data().status === 'deleting' || doc.data().pendingFileDeletes?.length)) };
  }
  async function saveModuleMission(user, syllabusId, moduleId, body) {
    if (user.role !== 'instructor') fail(403, 'Only instructors can create module missions.');
    if (!validId(body.missionId) || !moduleId) fail(400, 'Choose a module and a valid mission.');
    const { parent } = await context(user, syllabusId, moduleId, true);
    let input = body.mission || {};
    const lesson = (await ref('syllabus_modules', moduleId).get()).data();
    try { input = alignLessonMission(input, lesson?.objectives || input.learning_objectives, body.published !== false); }
    catch (error) { fail(400, error.message); }
    if (input.outcomeAlignmentVersion === LESSON_ALIGNMENT_VERSION) {
      try {
        const definition=lessonScoringDefinition(lesson?.objectives || input.learning_objectives,input);
        input={...input,lessonScoring:definition,...(definition?.chart?{chartExercise:definition.chart}:{})};
        if(body.published!==false && definition?.criteria.some(c=>c.key==='giveWay') && !['crossing-red','crossing-green'].includes(input.encounter?.type)) fail(400,'This lesson needs a crossing-vessel exercise to assess the give-way outcome.');
      } catch(error) { if(error instanceof MaterialsError)throw error;fail(400,error.message); }
    }
    try { input.encounter = normalizeEncounter(input.encounter); } catch (error) { fail(400, error.message); }
    const title = clean(input.mission_title, 180, true);
    const duration = clean(input.estimated_duration, 100, true);
    const description = clean(input.description || '', 2500);
    if (!Number.isFinite(input.xp_reward) || input.xp_reward < 0 || !Number.isFinite(input.pass_score) || input.pass_score < 0 || input.pass_score > 100) fail(400, 'Provide valid XP and a passing score from 0 to 100.');
    if (!Array.isArray(input.bouy) || !input.bouy.length || !Array.isArray(input.steps)) fail(400, 'Add at least one buoy checkpoint.');
    if (!Array.isArray(input.learning_objectives) || input.learning_objectives.some(value => typeof value !== 'string') || input.learning_objectives.join('\n').length > 2500) fail(400, 'Provide valid learning objectives of 2500 characters or fewer.');
    for (const value of [input.opendate, input.deadline]) if (value && !Number.isFinite(Date.parse(value))) fail(400, 'Choose valid mission dates.');
    if (input.opendate && input.deadline && Date.parse(input.opendate) >= Date.parse(input.deadline)) fail(400, 'The deadline must be after the opening date.');
    const missionRef = ref('missions', body.missionId);
    const activityId = body.activityId || 'mission-' + createHash('sha256').update(JSON.stringify([syllabusId, moduleId, body.missionId])).digest('hex');
    const activityRef = ref('learning_activities', activityId);
    let savedRevision;
    await db.runTransaction(async tx => {
      const course = await tx.get(parent), module = await tx.get(ref('syllabus_modules', moduleId));
      const mission = await tx.get(missionRef), linked = await tx.get(activityRef);
      const siblings = await tx.get(col('learning_activities').where('syllabusId', '==', syllabusId));
      if (!course.exists || course.data().status !== 'active' || !canManageSyllabus(course.data(), user) || course.data().instructorId !== user.id) fail(404, 'Course not found.');
      if (!module.exists || module.data().status !== 'active' || module.data().syllabusId !== syllabusId) fail(404, 'Module not found.');
      try { alignLessonMission(input, module.data().objectives || input.learning_objectives, body.published !== false); }
      catch (error) { fail(400, error.message); }
      if (!body.activityId) requireModulePdf(moduleId, module.data(), siblings);
      const old = linked.exists ? linked.data() : null;
      if (body.activityId) {
        if (!old || old.status !== 'active' || old.type !== 'simulation' || old.syllabusId !== syllabusId || old.moduleId !== moduleId || old.targetId !== body.missionId || !mission.exists || missionOwner(mission.data()) !== user.id) fail(404, 'Module mission not found.');
        checkRevision(old, body.revision);
      } else if (mission.exists || linked.exists) {
        // The client keeps the same mission ID when retrying a lost response.
        if (mission.exists && missionOwner(mission.data()) === user.id && old?.status === 'active' && old.syllabusId === syllabusId && old.moduleId === moduleId && old.targetId === body.missionId) {
          savedRevision = old.revision; return;
        }
        fail(409, 'This mission already exists. Link it as an existing mission instead.');
      }
      const now = timestamp();
      const missionData = { ...input, mission_title: title, description, estimated_duration: duration,
        instructorId: user.id, instructorid: user.id, createdBy: mission.data()?.createdBy || user.id,
        createdAt: mission.data()?.createdAt || now, updatedAt: now,
        syllabusId: mission.data()?.syllabusId || syllabusId, syllabusModuleId: mission.data()?.syllabusModuleId || moduleId };
      delete missionData.id;
      savedRevision = (old?.revision || 0) + 1;
      const activityData = { ...(old || {}), type: 'simulation', syllabusId, moduleId, title,
        description, objectives: (input.learning_objectives || []).join('\n'), instructions: old?.instructions || '',
        targetId: body.missionId, targetTitle: title, completionRule: old?.completionRule || 'pass', passScore: old?.passScore ?? null,
        allowRetakes: retakesSetting(body.allowRetakes, old?.allowRetakes),
        quizPolicy: old?.quizPolicy || 'inherit', quizId: old?.quizId || '',
        availableFrom: input.opendate || null, availableUntil: input.deadline || null,
        published: body.published !== false, status: 'active', revision: savedRevision,
        order: old?.order ?? siblings.docs.filter(doc => doc.data().status === 'active' && doc.data().moduleId === moduleId).length,
        createdBy: old?.createdBy || user.id, createdAt: old?.createdAt || now, updatedAt: now };
      if (mission.exists) tx.update(missionRef, missionData); else tx.create(missionRef, missionData);
      if (linked.exists) tx.update(activityRef, activityData); else tx.create(activityRef, activityData);
      tx.update(parent, { revision: course.data().revision + 1, updatedAt: now });
    });
    return { missionId: body.missionId, activityId, revision: savedRevision };
  }
  async function save(user, syllabusId, moduleId, id, body, file) {
    if (!['instructor', 'admin'].includes(user.role)) fail(403, 'Students have read-only access.');
    const existing = id ? await activity(user, id, true) : null;
    if (existing) { syllabusId = existing.data.syllabusId; moduleId = existing.data.moduleId; checkRevision(existing.data, body.revision); }
    const { parent } = await context(user, syllabusId, moduleId, true);
    const type = body.type;
    if (!['pdf', 'presentation', 'link', 'simulation', 'quiz'].includes(type) || (existing && type !== existing.data.type)) fail(400, 'Choose an activity type. An existing activity cannot change type.');
    if (!moduleId && !isResource(type)) fail(400, 'Add simulations and quizzes inside a lesson.');
    const title = clean(body.title || (type === 'link' ? 'Video link' : ''), 180, true), description = clean(body.description || '', 2500), objectives = clean(body.objectives || '', 2500), instructions = clean(body.instructions || '', 5000);
    const completionRule = isResource(type) ? 'view' : body.completionRule || 'pass';
    if (!['view', 'complete', 'pass'].includes(completionRule) || (!isResource(type) && completionRule === 'view')) fail(400, 'Choose a valid completion requirement.');
    const passScore = body.passScore === '' || body.passScore == null ? null : Number(body.passScore);
    if (passScore !== null && (!Number.isFinite(passScore) || passScore < 0 || passScore > 100)) fail(400, 'Passing score must be between 0 and 100.');
    const dates = {};
    for (const field of ['availableFrom', 'availableUntil']) { const value = body[field]; if (value && !Number.isFinite(Date.parse(value))) fail(400, 'Choose a valid activity date.'); dates[field] = value ? new Date(value).toISOString() : null; }
    if (dates.availableFrom && dates.availableUntil && dates.availableFrom >= dates.availableUntil) fail(400, 'The closing time must be after the opening time.');
    let targetId = null, targetTitle = '';
    let url;
    if (type === 'link') {
      try { url = normalizeLearningLink(body.url); } catch (error) { fail(400, error.message); }
      if (file) fail(400, 'Video links do not accept uploaded files.');
    }
    const quizPolicy = type === 'simulation' ? body.quizPolicy || existing?.data.quizPolicy || 'inherit' : 'none';
    if (!['inherit', 'none', 'assigned'].includes(quizPolicy)) fail(400, 'Choose a valid mission quiz assignment.');
    if (!isResource(type)) {
      const choices = await catalog(user, syllabusId);
      const chosen = (type === 'simulation' ? choices.missions : choices.quizzes).find(item => item.id === body.targetId);
      if (!chosen) fail(400, 'Choose an existing mission or quiz belonging to this course instructor.');
      targetId = body.targetId;
      targetTitle = chosen.title;
      if (quizPolicy === 'assigned' && !choices.quizzes.some(q => q.id === body.quizId)) fail(400, 'Choose a quiz belonging to this instructor.');
      if (file) fail(400, 'Linked activities do not accept files.');
    } else if (isFile(type) && !existing && !file) fail(400, 'Upload a learning document.');
    if (type === 'pdf' && file) validatePdf(file);
    const converted = file ? await convert(file) : null;
    const docRef = id ? existing.doc.ref : col('learning_activities').doc();
    const storagePath = converted ? `learning_activities/${docRef.id}/${randomUUID()}.pdf` : null;
    if (converted) {
      try { await bucket().file(storagePath).save(converted.buffer, { resumable: false, preconditionOpts: { ifGenerationMatch: 0 }, metadata: { contentType: 'application/pdf', cacheControl: 'private, no-store' } }); }
      catch (error) { throw new MaterialsStorageError(error, 'upload'); }
    }
    try {
      await db.runTransaction(async tx => {
        const course = await tx.get(parent);
        if (!course.exists || course.data().status !== 'active' || !canManageSyllabus(course.data(), user)) fail(404, 'Course not found.');
        const module = moduleId ? await tx.get(ref('syllabus_modules', moduleId)) : null;
        if (moduleId && (!module.exists || module.data().status !== 'active' || module.data().syllabusId !== syllabusId)) fail(404, 'Module not found.');
        const current = await tx.get(docRef), old = current.exists ? current.data() : null;
        if (id) { if (!old || old.status !== 'active') fail(404, 'Activity not found.'); checkRevision(old, body.revision); }
        const siblings = await tx.get(col('learning_activities').where('syllabusId', '==', syllabusId));
        if (type === 'simulation' && (!id || old.targetId !== targetId)) requireModulePdf(moduleId, module?.data(), siblings);
        if (!id && siblings.size >= 150) fail(400, 'A course can contain up to 150 learning activities.');
        const pending = [...new Set([...(old?.pendingFileDeletes || []), ...(storagePath && old?.storagePath ? [old.storagePath] : [])])];
        if (pending.length > 50) fail(409, 'Retry pending file cleanup before replacing this document.');
        const data = { title, description, objectives, instructions, type, syllabusId, moduleId: moduleId || null, targetId, targetTitle, completionRule, passScore,
          ...(type === 'link' ? { url } : {}),
          ...(type === 'simulation' ? { allowRetakes: retakesSetting(body.allowRetakes, old?.allowRetakes) } : {}),
          quizPolicy, quizId: quizPolicy === 'assigned' ? body.quizId : '',
          ...dates, published: body.published === true || body.published === 'true', status: 'active', revision: (old?.revision || 0) + 1,
          order: old?.order ?? siblings.docs.filter(d => (d.data().moduleId || null) === (moduleId || null)).length,
          updatedAt: timestamp(), pendingFileDeletes: pending,
          ...(!id ? { createdAt: timestamp(), createdBy: user.id } : {}),
          ...(converted ? { storagePath, fileName: validatePdf(converted), sourceFileName: clean(file.originalname.split(/[\\/]/).pop().replace(/[\x00-\x1f\x7f]/g, ''), 180, true), fileSize: converted.buffer.length } : {}) };
        if (id) tx.update(docRef, data); else tx.create(docRef, data);
        tx.update(parent, { revision: course.data().revision + 1, updatedAt: timestamp() });
      });
    } catch (error) {
      if (storagePath) {
        try { const current = await docRef.get(); if (!current.exists || (current.data().storagePath !== storagePath && !current.data().pendingFileDeletes?.includes(storagePath))) await bucket().file(storagePath).delete({ ignoreNotFound: true }); } catch { /* orphan sweep retries */ }
      }
      throw error;
    }
    return { id: docRef.id, cleanupPending: !(await materials.cleanupRecord('learning_activities', docRef.id)) };
  }
  async function remove(user, id, revision) {
    const { doc, parent } = await activity(user, id, true);
    await db.runTransaction(async tx => {
      const course = await tx.get(parent), current = await tx.get(doc.ref);
      if (!course.exists || !canManageSyllabus(course.data(), user) || !current.exists || current.data().status !== 'active') fail(404, 'Activity not found.');
      checkRevision(current.data(), revision);
      tx.update(doc.ref, { status: 'deleting', revision: current.data().revision + 1, pendingFileDeletes: [...new Set([...(current.data().pendingFileDeletes || []), ...(current.data().storagePath ? [current.data().storagePath] : [])])] });
      tx.update(parent, { revision: course.data().revision + 1, updatedAt: timestamp() });
    });
    return { cleanupPending: !(await materials.cleanupRecord('learning_activities', id)) };
  }
  async function reorder(user, syllabusId, body) {
    const { parent } = await context(user, syllabusId, body.moduleId || null, true);
    await db.runTransaction(async tx => {
      const course = await tx.get(parent);
      if (!course.exists || !canManageSyllabus(course.data(), user)) fail(404, 'Course not found.');
      checkRevision(course.data(), body.revision);
      const docs = await tx.get(col('learning_activities').where('syllabusId', '==', syllabusId));
      const items = docs.docs.filter(doc => doc.data().status === 'active' && (doc.data().moduleId || null) === (body.moduleId || null));
      if (!Array.isArray(body.ids) || body.ids.length !== items.length || new Set(body.ids).size !== items.length || items.some(doc => !body.ids.includes(doc.id))) fail(409, 'The activity list changed. Refresh before reordering.');
      items.forEach(doc => tx.update(doc.ref, { order: body.ids.indexOf(doc.id), revision: doc.data().revision + 1, updatedAt: timestamp() }));
      tx.update(parent, { revision: course.data().revision + 1, updatedAt: timestamp() });
    });
    return { success: true };
  }
  function available(data) {
    const now = Date.now();
    if (data.availableFrom && Date.parse(data.availableFrom) > now) fail(403, 'This activity is not open yet.');
    if (data.availableUntil && Date.parse(data.availableUntil) < now) fail(403, 'This activity has closed.');
  }
  async function pdf(user, id) {
    const { data } = await activity(user, id);
    if (user.role === 'student') available(data);
    if (!isFile(data.type)) fail(404, 'Document not found.');
    // The established PDF service checks storage references and rechecks ownership
    // after download; additionally recheck the activity's module publication here.
    const result = await materials.pdf(user, 'learning_activities', id);
    await activity(user, id);
    return result;
  }
  async function record(user, id, body) {
    if (user.role !== 'student') fail(403, 'Only students record their own progress.');
    if ((body.kind && !['syllabus', 'module'].includes(body.kind)) || !['viewed', 'started'].includes(body.event)) fail(400, 'Invalid progress event.');
    let data, parentRef, moduleRef;
    if (body.kind === 'syllabus' || body.kind === 'module') {
      const doc = await ref(body.kind === 'syllabus' ? 'syllabi' : 'syllabus_modules', id).get();
      data = doc.exists && doc.data();
      if (!data?.storagePath) fail(404, 'Document not found.');
      await context(user, body.kind === 'syllabus' ? id : data.syllabusId, body.kind === 'module' ? id : null);
      parentRef = doc.ref; moduleRef = body.kind === 'module' ? doc.ref : null;
    } else {
      const item = await activity(user, id); data = item.data; parentRef = item.parent; moduleRef = data.moduleId ? ref('syllabus_modules', data.moduleId) : null; available(data);
    }
    const activityId = body.kind ? `${body.kind}-${id}` : id;
    const progressRef = col('learning_activity_progress').doc(createHash('sha256').update(JSON.stringify([user.id, activityId])).digest('hex'));
    await db.runTransaction(async tx => {
      const parent = await tx.get(parentRef), module = moduleRef ? await tx.get(moduleRef) : null;
      const course = body.kind === 'module' ? await tx.get(ref('syllabi', data.syllabusId)) : parent;
      const source = body.kind ? parent : await tx.get(ref('learning_activities', id));
      const previous = await tx.get(progressRef);
      if (!course.exists || course.data().status !== 'active' || !canReadSyllabus(course.data(), user) || (module && (!module.exists || module.data().status !== 'active' || module.data().published === false)) || !source.exists || source.data().status !== 'active' || source.data().published === false) fail(404, 'Activity not found.');
      const fresh = source.data();
      if (!body.kind) available(fresh);
      if (!body.kind && fresh.type === 'simulation') {
        const docs = await tx.get(col('learning_activities').where('syllabusId', '==', fresh.syllabusId));
        const views = await tx.get(col('learning_activity_progress').where('studentId', '==', user.id));
        const access = modulePdfAccess(fresh.moduleId, module?.data(), docs, new Map(views.docs.map(doc => [doc.data().activityId, doc.data()])), true);
        if (!access.canStart) fail(403, access.message);
        if (body.event === 'started' && fresh.allowRetakes === false) {
          const scores = await tx.get(col('mission_score').where('studentId', '==', user.id));
          const attempt = simulationAttempt(scores.docs.map(doc => doc.data()).filter(r => canonicalMissionId(r.missionId) === canonicalMissionId(fresh.targetId)), false, !!previous.data()?.startedAt);
          if (attempt.attempted && !attempt.passed && !attempt.reviewable) fail(403, 'Retakes are disabled for this simulation. Ask your instructor to allow a retake.');
        }
      }
      if (body.event === 'viewed' && (body.kind ? body.documentVersion !== documentVersion(fresh) : Number(body.revision) !== fresh.revision)) fail(409, 'This document changed. Open the latest version.');
      const state = { ...(previous.exists ? previous.data() : {}), studentId: user.id, activityId,
        syllabusId: body.kind === 'syllabus' ? id : data.syllabusId, activityRevision: fresh.revision, documentVersion: documentVersion(fresh), startedAt: previous.data()?.startedAt || timestamp(),
        ...((body.kind || isResource(fresh.type)) ? { viewedAt: body.event === 'viewed' ? timestamp() : previous.data()?.documentVersion === documentVersion(fresh) ? previous.data()?.viewedAt || null : null } : {}) };
      if (previous.exists) tx.update(progressRef, state); else tx.create(progressRef, state);
    });
    return { success: true };
  }
  async function launch(user, id) {
    if (user.role !== 'student') fail(403, 'Use a student account to start an activity.');
    const { data, syllabus, module } = await activity(user, id); available(data);
    if (data.type === 'quiz') fail(409, 'Quizzes are available after completing and docking in the assigned practical simulation.');
    if (!['simulation', 'quiz'].includes(data.type)) fail(400, 'This activity opens in the document viewer.');
    const doc = await ref(data.type === 'simulation' ? 'missions' : 'quiz', data.targetId).get();
    if (!doc.exists || (data.type === 'simulation' && missionOwner(doc.data()) !== syllabus.instructorId)) fail(404, 'The linked activity is unavailable.');
    // Revalidate quiz ownership/linking against the same instructor catalog.
    if (data.type === 'quiz') {
      const choices = await catalog({ ...user, role: 'instructor', id: syllabus.instructorId }, data.syllabusId);
      if (!choices.quizzes.some(q => q.id === doc.id)) fail(404, 'The linked quiz is unavailable.');
    }
    if (doc.data().outcomeAlignmentVersion === LESSON_ALIGNMENT_VERSION) {
      try { alignLessonMission(doc.data(), module?.objectives || doc.data().lesson_outcomes, true); }
      catch(error) { fail(409, 'Your instructor must update this mission to match the current lesson outcomes.'); }
      const [quizzes, assignments] = await Promise.all([col('quiz').get(), col('quiz_assignments').get()]);
      const quiz = selectMissionQuiz({missionId:data.targetId,instructorId:syllabus.instructorId,quizzes:quizzes.docs.map(d=>({...d.data(),id:d.id})),assignments:assignments.docs.map(d=>d.data()),policy:data.quizPolicy || 'inherit',quizId:data.quizId});
      if (!quiz) fail(409, 'Your instructor must assign and publish the lesson’s final quiz before you start this mission.');
      try { validateOutcomeQuiz(quiz, module?.objectives || doc.data().lesson_outcomes); }
      catch(error) { fail(409, 'Your instructor must finish linking the final quiz questions to this lesson’s outcomes.'); }
    }
    await record(user, id, { event: 'started' });
    await activity(user, id);
    const target = { ...doc.data(), id: doc.id };
    if (data.type === 'quiz') {
      const scores = await col('quiz_score').where('studentId', '==', user.id).get();
      if (!scores.docs.some(result => result.data().quizId === target.id)) {
        target.questions = (target.questions || []).map(question => {
          const { correctAnswer, ...item } = question;
          if (Array.isArray(item.options)) item.options = item.options.map(({ isCorrect, ...option }) => option);
          return item;
        });
      }
    }
    let simulationResult = null;
    if (data.type === 'simulation') {
      const records = await col('mission_score').where('studentId', '==', user.id).get();
      const attempt = simulationAttempt(records.docs.map(doc => ({ ...doc.data(), id: doc.id })).filter(r => canonicalMissionId(r.missionId) === canonicalMissionId(data.targetId)), data.allowRetakes);
      // Failed attempts must start a fresh run, never resume the saved failure.
      if ((attempt.passed || attempt.reviewable) && INTEGRATED_SIMULATION_VERSIONS.includes(attempt.result.scoringVersion) && attempt.result.completion?.verified) simulationResult = attempt.result;
    }
    let lessonRunId=null;
    if(target.lessonScoring?.version===LESSON_SCORING_VERSION && target.lessonScoring.mode==='practical' && !simulationResult) {
      lessonRunId=randomUUID();const progress=lessonProgress(user.id,id);
      await db.runTransaction(async tx=>{const state=await tx.get(progress);if(!state.exists)fail(409,'Start this practical again.');tx.update(progress,{lessonRunId,lessonTask:null,lessonTaskClosed:false,lessonTaskStamp:taskStamp(target)});});
    }
    return { type: data.type, target, activityId: id, simulationResult, lessonRunId };
  }
  async function submitQuiz(user, id, body) {
    const launched = await launch(user, id);
    if (launched.type !== 'quiz') fail(400, 'This activity is not a quiz.');
    const { data } = await activity(user, id);
    const quiz = { ...(await ref('quiz', launched.target.id).get()).data(), id: launched.target.id }, questions = quiz.questions || [], answers = body.answers;
    if (!questions.length || !Array.isArray(answers) || answers.length !== questions.length || answers.some(a => typeof a !== 'string' || !a.trim() || a.length > 5000)) fail(400, 'Answer every question before submitting.');
    const validation = questions.map((q, index) => {
      const answer = answers[index];
      if (q.type === 'multiple-choice') return q.options?.some(o => o.isCorrect && o.text === answer) || false;
      if (q.type === 'true-false') return String(q.correctAnswer).toLowerCase() === answer.toLowerCase();
      if (q.type === 'fill-in-the-blank') return String(q.correctAnswer || '').trim().toLowerCase() === answer.trim().toLowerCase();
      return false;
    });
    const correct = validation.filter(Boolean).length, score = Math.round(correct / questions.length * 100);
    const threshold = Number(quiz.passScore ?? quiz.pass_score ?? 70);
    if (!saveQuizResult) fail(503, 'Quiz saving is not configured.');
    const saved = await saveQuizResult({ studentId: user.id, studentName: user.name || '', instructorId: user.instructorid || user.instructorId || '', moduleId: data.moduleId,
      syllabusId: data.syllabusId, lessonId: data.moduleId, activityId: id,
      quizId: quiz.id, quizTitle: quiz.title || data.title, answers, validation, score, 'Quiz-score-percentage': score, 'raw-score': correct,
      correctAnswers: correct, totalQuestions: questions.length, passed: score >= threshold, status: 'graded', completedAt: new Date() });
    if (!saved.data) fail(409, 'This quiz could not be saved. Refresh the course and check its completion status.');
    return { ...saved, quiz };
  }
  async function practical(user, id) {
    if (user.role !== 'student') fail(403, 'Use an approved student account.');
    const item = await activity(user, id);
    if (item.data.type !== 'simulation') fail(404, 'Practical activity not found.');
    available(item.data);
    const mission = await ref('missions', item.data.targetId).get();
    if (!mission.exists || missionOwner(mission.data()) !== item.syllabus.instructorId) fail(404, 'Assigned mission not found.');
    return { ...item, mission };
  }
  const lessonProgress=(studentId,id)=>col('learning_activity_progress').doc(createHash('sha256').update(JSON.stringify([studentId,id])).digest('hex'));
  const canonicalJson=value=>JSON.stringify(value,(_key,item)=>item && typeof item==='object' && !Array.isArray(item)?Object.fromEntries(Object.entries(item).sort(([a],[b])=>a.localeCompare(b))):item);
  const taskStamp=mission=>createHash('sha256').update(canonicalJson([mission.lessonScoring,mission.encounter,mission.required_boat])).digest('hex');
  async function lessonTaskState(user,id,body,operation) {
    const item=await practical(user,id), progress=lessonProgress(user.id,id);
    return db.runTransaction(async tx=>{
      const course=await tx.get(item.parent), module=await tx.get(ref('syllabus_modules',item.data.moduleId));
      const activityDoc=await tx.get(item.doc.ref), missionDoc=await tx.get(item.mission.ref), saved=await tx.get(progress);
      if(!course.exists || course.data().status!=='active' || !canReadSyllabus(course.data(),user) || !module.exists || module.data().status!=='active' || module.data().published===false || !activityDoc.exists || activityDoc.data().status!=='active' || activityDoc.data().published===false || !missionDoc.exists || missionOwner(missionDoc.data())!==course.data().instructorId)fail(404,'Practical not found.');
      available(activityDoc.data());const mission=missionDoc.data(),state=saved.data();
      if(!state || !body.lessonRunId || state.lessonRunId!==body.lessonRunId || state.lessonTaskStamp!==taskStamp(mission))fail(409,'This practical changed or another attempt started. Reopen it from the lesson.');
      const definition=lessonScoringDefinition(module.data().objectives || mission.lesson_outcomes,mission);
      if(!definition || canonicalJson(definition)!==canonicalJson(mission.lessonScoring))fail(409,'The lesson outcomes changed. Ask the instructor to update this mission.');
      return operation({definition,state,tx,progress});
    });
  }
  async function submitLessonTask(user,id,body) {
    return lessonTaskState(user,id,body,({definition,state,tx,progress})=>{
      if(state.lessonTaskClosed)fail(409,'This attempt is complete. View its saved results.');
      if(state.lessonTask)return {saved:true,type:state.lessonTask.type,repeated:true};
      let task;
      try {task=definition.lesson===3?gradeChartTask(definition,body):definition.lesson===4?gradeLightingTask(definition,body):null;}
      catch(error){fail(400,error.message);}
      if(!task)fail(400,'This lesson has no separate practical instrument task.');
      tx.update(progress,{lessonTask:task});return {saved:true,type:task.type};
    });
  }
  async function completeSimulation(user, id, body) {
    const item = await practical(user, id);
    await requireViewedModulePdfs(user, item);
    if (!validDockingCompletion(body.completion)) fail(409, 'Dock in the assigned port, stop the engine and deploy the anchor first.');
    let performance;
    let encounter;
    try {
      const config = normalizeEncounter(item.mission.data().encounter);
      try { encounter = normalizeEncounterAttempt(config, body.encounter || null); }
      catch (error) { fail(409, error.message); }
      performance = simulationPerformance(completedSimulationScores(body.scores || {}, body.completion, encounter), Number(item.mission.data().pass_score ?? item.mission.data().passScore ?? 70));
      if(item.mission.data().lessonScoring?.version===LESSON_SCORING_VERSION) {
        const definition=lessonScoringDefinition(item.module.objectives || item.mission.data().lesson_outcomes,item.mission.data());
        if(!definition || canonicalJson(definition)!==canonicalJson(item.mission.data().lessonScoring))fail(409,'The lesson outcomes changed. Ask the instructor to update this mission.');
        if(definition.mode==='practical') {
          performance=await lessonTaskState(user,id,body,({definition,state,tx,progress})=>{
            const grade=scoreLessonSimulation(definition,state.lessonTask,encounter,performance,performance.passScore,body.safetyEvents);
            tx.update(progress,{lessonTaskClosed:true});return grade;
          });
        } else performance=scoreLessonSimulation(definition,null,encounter,performance,performance.passScore,body.safetyEvents);
      } else if (!performance.assessmentComplete) fail(409, 'Some performance criteria were not recorded. Complete the practical exercise before reporting.');
    }
    catch (error) { if (error instanceof MaterialsError) throw error; fail(400, error.message); }
    if (!saveMissionResult) fail(503, 'Mission saving is not configured.');
    return saveMissionResult({ studentId: user.id, missionId: item.data.targetId, missionTitle: item.mission.data().mission_title || item.mission.data().title || item.data.title,
      ...performance, encounter, completion: { ...body.completion, verified: true }, lessonId: item.data.moduleId, syllabusId: item.data.syllabusId, activityId: id, completedAt: new Date() });
  }
  async function practicalQuiz(user, id, { includeAnswers = false } = {}) {
    const item = await practical(user, id);
    const records = await col('mission_score').where('studentId', '==', user.id).get();
    const results = records.docs.map(doc => ({ ...doc.data(), id: doc.id })).filter(r => canonicalMissionId(r.missionId) === canonicalMissionId(item.data.targetId));
    const simulation = results.find(r => INTEGRATED_SIMULATION_VERSIONS.includes(r.scoringVersion) && r.completion?.verified) || null;
    if (!simulation) fail(409, 'Save the completed simulation before checking its quiz.');
    const [quizDocs, assignmentDocs, scores] = await Promise.all([col('quiz').get(), col('quiz_assignments').get(), col('quiz_score').where('studentId', '==', user.id).get()]);
    const quiz = selectMissionQuiz({ missionId: item.data.targetId, instructorId: item.syllabus.instructorId,
      quizzes: quizDocs.docs.map(d => ({ ...d.data(), id: d.id })), assignments: assignmentDocs.docs.map(d => d.data()), policy: item.data.quizPolicy || 'inherit', quizId: item.data.quizId });
    const saved = quiz ? scores.docs.map(d => ({ ...d.data(), id: d.id })).find(r => r.quizId === quiz.id) || null : null;
    if (item.mission.data().outcomeAlignmentVersion === LESSON_ALIGNMENT_VERSION && !saved) {
      if (!quiz) fail(409, 'The final quiz is not available. Ask your instructor to publish it, then try again.');
      try { validateOutcomeQuiz(quiz, item.module?.objectives || item.mission.data().lesson_outcomes); }
      catch(error) { fail(409, 'The final quiz needs an instructor update to cover this lesson’s outcomes.'); }
    }
    if (quiz) quiz.questions = quiz.questions.map((question, index) => {
      const normalized = { ...question, id: question.id ?? String(index) };
      if (includeAnswers || saved) return normalized;
      const { correctAnswer, ...visible } = normalized;
      if (Array.isArray(visible.options)) visible.options = visible.options.map(({ isCorrect, ...option }) => option);
      return visible;
    });
    // No missing/failed query is converted into a no-quiz result.
    await practical(user, id);
    return { simulation, quiz, saved };
  }
  async function submitPracticalQuiz(user, id, body) {
    const current = await practicalQuiz(user, id, { includeAnswers: true });
    if (!current.quiz || current.quiz.id !== body.quizId) fail(409, 'The assigned quiz changed. Check the mission quiz again.');
    if (current.saved) return { data: current.saved, skipped: true, scoreId: current.saved.id };
    const item = await practical(user, id);
    let grade;
    try { grade = gradeMissionQuiz(current.quiz, body.answers); } catch (error) { fail(400, error.message); }
    if (!saveQuizResult) fail(503, 'Quiz saving is not configured.');
    return saveQuizResult({ studentId: user.id, studentName: user.name || '', instructorId: item.syllabus.instructorId,
      syllabusId: item.data.syllabusId, lessonId: item.data.moduleId, activityId: id,
      missionId: item.data.targetId, moduleId: item.data.targetId, quizId: current.quiz.id, quizTitle: current.quiz.title || 'Quiz',
      ...grade, status: 'graded', completedAt: new Date() }, { allowAfterSimulation: true });
  }
  return { course, catalog, saveModuleMission, save, remove, reorder, pdf, record, launch, submitQuiz, submitLessonTask, completeSimulation, practicalQuiz, submitPracticalQuiz };
}
