import { createHash, randomUUID } from 'node:crypto';
import { MaterialsError, MaterialsStorageError, canReadSyllabus, canManageSyllabus, documentVersion, validatePdf } from './learningMaterials.js';
import { canonicalMissionId, hasMissionCompletion } from './missionRewards.js';
import { missionOwner } from '../../shared/missionAccess.js';
import { createPresentationPreview } from './presentationPreview.js';

const fail = (status, message) => { throw new MaterialsError(status, message); };
const validId = id => typeof id === 'string' && /^[\w-]{1,128}$/.test(id);
const clean = (value, max, required = false) => {
  if (typeof value !== 'string' || value.trim().length > max || (required && !value.trim())) fail(400, `Provide valid text of ${max} characters or fewer.`);
  return value.trim();
};
const checkRevision = (record, value) => { if (!Number.isInteger(Number(value)) || Number(value) !== record.revision) fail(409, 'This content changed. Refresh before saving again.'); };
const date = value => value?.toDate ? value.toDate().toISOString() : value instanceof Date ? value.toISOString() : typeof value === 'string' ? value : null;
const isFile = type => ['pdf', 'presentation'].includes(type);
const summary = doc => {
  const d = doc.data();
  return { id: doc.id, syllabusId: d.syllabusId, moduleId: d.moduleId, type: d.type, title: d.title, description: d.description,
    objectives: d.objectives, instructions: d.instructions, order: d.order, published: d.published !== false, completionRule: d.completionRule,
    passScore: d.passScore, targetId: d.targetId, targetTitle: d.targetTitle, availableFrom: d.availableFrom, availableUntil: d.availableUntil,
    fileName: d.fileName, sourceFileName: d.sourceFileName, documentVersion: documentVersion(d), revision: d.revision, updatedAt: date(d.updatedAt) };
};

export function activityCompletion(activity, { viewed = false, started = false, results = [] } = {}) {
  const requirements = isFile(activity.type) ? [{ label: activity.type === 'presentation' ? 'View the presentation' : 'View the document', done: viewed }] : [
    { label: activity.type === 'simulation' ? 'Complete the assigned simulation' : 'Complete the quiz', done: results.length > 0 },
    ...(activity.completionRule === 'pass' ? [{ label: activity.passScore !== null && activity.passScore !== undefined ? `Achieve at least ${activity.passScore}%` : 'Meet the configured passing requirements', done: results.some(r => activity.passScore !== null && activity.passScore !== undefined ? Number(r['Quiz-score-percentage'] ?? r.score) >= activity.passScore : hasMissionCompletion(r)) }] : [])
  ];
  const done = requirements.every(item => item.done);
  return { status: done ? 'Done' : viewed || started || results.length ? 'In Progress' : 'To do', requirements };
}

export function createCourseActivitiesService({ db, bucket, timestamp, materials, convert = createPresentationPreview(), saveQuizResult }) {
  const col = name => db.collection(name);
  const ref = (name, id) => { if (!validId(id)) fail(404, 'Content not found.'); return col(name).doc(id); };
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
    const activities = docs.docs.filter(doc => { const d = doc.data(); return d.status === 'active' && (!d.moduleId || modules.has(d.moduleId)) && (user.role !== 'student' || d.published !== false); }).map(summary).sort((a, b) => a.order - b.order || a.id.localeCompare(b.id));
    let progress = {};
    if (user.role === 'student') {
      const [views, missionScores, quizScores] = await Promise.all(['learning_activity_progress', 'mission_score', 'quiz_score'].map(name => col(name).where('studentId', '==', user.id).get()));
      const viewed = new Map(views.docs.map(doc => [doc.data().activityId, doc.data()]));
      const missions = missionScores.docs.map(doc => doc.data()), quizzes = quizScores.docs.map(doc => doc.data());
      for (const a of activities) {
        const state = viewed.get(a.id) || {};
        progress[a.id] = activityCompletion(a, { viewed: !!state.viewedAt && state.documentVersion === a.documentVersion, started: !!state.startedAt,
          results: a.type === 'simulation' ? missions.filter(r => canonicalMissionId(r.missionId) === canonicalMissionId(a.targetId)) : a.type === 'quiz' ? quizzes.filter(r => r.quizId === a.targetId) : [] });
      }
      for (const d of [detail.syllabus, ...detail.modules].filter(d => d.fileName)) {
        const key = `${d.id === id ? 'syllabus' : 'module'}-${d.id}`;
        progress[key] = activityCompletion({ type: 'pdf' }, { viewed: !!viewed.get(key)?.viewedAt && viewed.get(key)?.documentVersion === d.documentVersion });
      }
    }
    const choices = user.role !== 'student' ? { catalog: await catalog(user, id) } : {};
    await context(user, id);
    return { ...detail, activities, progress, ...choices, cleanupPending: !!detail.cleanupPending || (user.role !== 'student' && docs.docs.some(doc => doc.data().status === 'deleting' || doc.data().pendingFileDeletes?.length)) };
  }
  async function save(user, syllabusId, moduleId, id, body, file) {
    if (!['instructor', 'admin'].includes(user.role)) fail(403, 'Students have read-only access.');
    const existing = id ? await activity(user, id, true) : null;
    if (existing) { syllabusId = existing.data.syllabusId; moduleId = existing.data.moduleId; checkRevision(existing.data, body.revision); }
    const { parent } = await context(user, syllabusId, moduleId, true);
    const type = body.type;
    if (!['pdf', 'presentation', 'simulation', 'quiz'].includes(type) || (existing && type !== existing.data.type)) fail(400, 'Choose an activity type. An existing activity cannot change type.');
    if (!moduleId && !isFile(type)) fail(400, 'Add simulations and quizzes inside a module.');
    const title = clean(body.title, 180, true), description = clean(body.description || '', 2500), objectives = clean(body.objectives || '', 2500), instructions = clean(body.instructions || '', 5000);
    const completionRule = isFile(type) ? 'view' : body.completionRule || 'pass';
    if (!['view', 'complete', 'pass'].includes(completionRule) || (!isFile(type) && completionRule === 'view')) fail(400, 'Choose a valid completion requirement.');
    const passScore = body.passScore === '' || body.passScore == null ? null : Number(body.passScore);
    if (passScore !== null && (!Number.isFinite(passScore) || passScore < 0 || passScore > 100)) fail(400, 'Passing score must be between 0 and 100.');
    const dates = {};
    for (const field of ['availableFrom', 'availableUntil']) { const value = body[field]; if (value && !Number.isFinite(Date.parse(value))) fail(400, 'Choose a valid activity date.'); dates[field] = value ? new Date(value).toISOString() : null; }
    if (dates.availableFrom && dates.availableUntil && dates.availableFrom >= dates.availableUntil) fail(400, 'The closing time must be after the opening time.');
    let targetId = null, targetTitle = '';
    if (!isFile(type)) {
      const choices = await catalog(user, syllabusId);
      const chosen = (type === 'simulation' ? choices.missions : choices.quizzes).find(item => item.id === body.targetId);
      if (!chosen) fail(400, 'Choose an existing mission or quiz belonging to this course instructor.');
      targetId = body.targetId;
      targetTitle = chosen.title;
      if (file) fail(400, 'Linked activities do not accept files.');
    } else if (!existing && !file) fail(400, 'Upload a learning document.');
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
        if (!id && siblings.size >= 150) fail(400, 'A course can contain up to 150 learning activities.');
        const pending = [...new Set([...(old?.pendingFileDeletes || []), ...(storagePath && old?.storagePath ? [old.storagePath] : [])])];
        if (pending.length > 50) fail(409, 'Retry pending file cleanup before replacing this document.');
        const data = { title, description, objectives, instructions, type, syllabusId, moduleId: moduleId || null, targetId, targetTitle, completionRule, passScore,
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
      if (body.event === 'viewed' && (body.kind ? body.documentVersion !== documentVersion(fresh) : Number(body.revision) !== fresh.revision)) fail(409, 'This document changed. Open the latest version.');
      const state = { ...(previous.exists ? previous.data() : {}), studentId: user.id, activityId,
        syllabusId: body.kind === 'syllabus' ? id : data.syllabusId, activityRevision: fresh.revision, documentVersion: documentVersion(fresh), startedAt: previous.data()?.startedAt || timestamp(),
        ...((body.kind || isFile(fresh.type)) && body.event === 'viewed' ? { viewedAt: timestamp() } : {}) };
      if (previous.exists) tx.update(progressRef, state); else tx.create(progressRef, state);
    });
    return { success: true };
  }
  async function launch(user, id) {
    if (user.role !== 'student') fail(403, 'Use a student account to start an activity.');
    const { data, syllabus } = await activity(user, id); available(data);
    if (!['simulation', 'quiz'].includes(data.type)) fail(400, 'This activity opens in the document viewer.');
    const doc = await ref(data.type === 'simulation' ? 'missions' : 'quiz', data.targetId).get();
    if (!doc.exists || (data.type === 'simulation' && missionOwner(doc.data()) !== syllabus.instructorId)) fail(404, 'The linked activity is unavailable.');
    // Revalidate quiz ownership/linking against the same instructor catalog.
    if (data.type === 'quiz') {
      const choices = await catalog({ ...user, role: 'instructor', id: syllabus.instructorId }, data.syllabusId);
      if (!choices.quizzes.some(q => q.id === doc.id)) fail(404, 'The linked quiz is unavailable.');
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
    return { type: data.type, target, activityId: id };
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
      quizId: quiz.id, quizTitle: quiz.title || data.title, answers, validation, score, 'Quiz-score-percentage': score, 'raw-score': correct,
      correctAnswers: correct, totalQuestions: questions.length, passed: score >= threshold, status: 'graded', completedAt: new Date() });
    if (!saved.data) fail(409, 'This quiz could not be saved. Refresh the course and check its completion status.');
    return { ...saved, quiz };
  }
  return { course, catalog, save, remove, reorder, pdf, record, launch, submitQuiz };
}
