import { randomUUID } from 'node:crypto';

export const PDF_LIMIT = 15 * 1024 * 1024;
export class MaterialsError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}
export class MaterialsStorageError extends MaterialsError {
  constructor(error, operation) {
    const sourceCode = String(error?.code || 'unknown');
    let code = 'MATERIALS_STORAGE_UNAVAILABLE';
    let message = 'PDF storage is temporarily unavailable. Please try again later.';
    if (sourceCode === '404' && operation === 'upload') {
      code = 'MATERIALS_STORAGE_NOT_CONFIGURED';
      message = 'PDF storage is not set up yet. Ask your administrator to create the Firebase Storage bucket.';
    } else if (['401', '403', 'storage/unauthorized', 'storage/unauthenticated'].includes(sourceCode)) {
      code = 'MATERIALS_STORAGE_ACCESS_DENIED';
      message = 'The server cannot access PDF storage. Ask your administrator to check its storage permissions.';
    } else if (sourceCode === '404') {
      code = 'MATERIALS_PDF_NOT_FOUND';
      message = 'This PDF is unavailable. Ask your instructor to check or replace the document.';
    }
    super(503, message);
    this.code = code;
    this.operation = operation;
    this.sourceCode = sourceCode;
  }
}
const fail = (status, message) => { throw new MaterialsError(status, message); };
const validId = id => typeof id === 'string' && /^[\w-]{1,128}$/.test(id);
const text = (value, name, max, required = true) => {
  if (typeof value !== 'string' || value.trim().length > max || (required && !value.trim())) fail(400, `${name} is required and must be ${max} characters or fewer.`);
  return value.trim();
};
const revision = (record, value) => {
  if (!Number.isInteger(Number(value)) || Number(value) !== record.revision) fail(409, 'This material changed. Refresh it before saving again.');
};
export function validatePdf(file) {
  if (!file || !Buffer.isBuffer(file.buffer)) fail(400, 'Choose a PDF document.');
  if (!/\.pdf$/i.test(file.originalname) || file.mimetype !== 'application/pdf') fail(400, 'Only PDF documents are accepted.');
  if (!file.buffer.length || file.buffer.length > PDF_LIMIT) fail(400, 'PDF documents must be 15 MB or smaller.');
  if (file.buffer.subarray(0, 5).toString() !== '%PDF-' || !file.buffer.subarray(-2048).includes(Buffer.from('%%EOF'))) fail(400, 'The file does not contain a complete PDF document.');
  return file.originalname.split(/[\\/]/).pop().replace(/[\x00-\x1f\x7f]/g, '').slice(0, 180) || 'document.pdf';
}

// All ownership decisions use the current parent, including after reassignment.
export function canReadSyllabus(record, user) {
  const owner = record.instructorId;
  return user.role === 'admin' || (typeof owner === 'string' && !!owner && ((user.role === 'instructor' && owner === user.id) ||
    (user.role === 'student' && owner === (user.instructorid || user.instructorId))));
}
export const canManageSyllabus = (record, user) => user.role !== 'student' && canReadSyllabus(record, user);

export function createLearningMaterialsService({ db, bucket, timestamp, demos = [] }) {
  const col = name => db.collection(name);
  const ref = (name, id) => {
    if (!validId(id)) fail(404, 'Material not found.');
    return col(name).doc(id);
  };
  const filePath = (name, id, path) => typeof path === 'string' && new RegExp(`^${name}/${id}/[a-f0-9-]{36}\\.pdf$`).test(path);
  const usable = data => data?.status === 'active' && !!data.title?.trim() && !!data.storagePath;
  function check(doc, user, write = false, allowDeleting = false) {
    const data = doc.exists && doc.data();
    if (!data || (!usable(data) && !(allowDeleting && data.status === 'deleting')) || !(write ? canManageSyllabus(data, user) : canReadSyllabus(data, user))) fail(404, 'Material not found.');
    return data;
  }
  const managers = user => { if (!['admin', 'instructor'].includes(user.role)) fail(403, 'Only instructors and administrators can manage materials.'); };
  const ownerQuery = (user, includeAll = false) => user.role === 'admin' && includeAll ? col('syllabi') : col('syllabi').where('instructorId', '==', user.role === 'student' ? user.instructorid || user.instructorId || '__unassigned__' : user.id);
  const date = value => value?.toDate ? value.toDate().toISOString() : value?.toISOString ? value.toISOString() : null;
  const summary = (doc, user) => {
    const data = doc.data();
    return { id: doc.id, title: data.title, description: data.description, instructorId: data.instructorId,
      syllabusId: data.syllabusId, moduleNumber: data.moduleNumber, moduleCount: data.moduleCount || 0,
      fileName: data.fileName, fileSize: data.fileSize, createdAt: date(data.createdAt), updatedAt: date(data.updatedAt),
      ...(user.role !== 'student' ? { revision: data.revision, cleanupPending: !!data.pendingFileDeletes?.length } : {}) };
  };
  async function instructor(id) {
    if (!validId(id)) fail(400, 'Choose an instructor.');
    const doc = await col('instructor').doc(id).get();
    const data = doc.exists ? doc.data() : demos.find(item => item.role === 'instructor' && item.id === id);
    if (!data || (data.status && data.status !== 'active') || (data.role && data.role !== 'instructor')) fail(400, 'Choose an active instructor.');
    return { id, name: data.name || data.fullName || data.email || 'Instructor' };
  }
  async function instructors(user) {
    managers(user);
    if (user.role !== 'admin') return [await instructor(user.id)];
    const docs = await col('instructor').get();
    const map = new Map(demos.filter(item => item.role === 'instructor').map(item => [item.id, { id: item.id, name: item.name }]));
    docs.docs.forEach(doc => {
      const item = doc.data();
      map.delete(doc.id);
      if ((!item.status || item.status === 'active') && (!item.role || item.role === 'instructor')) map.set(doc.id, { id: doc.id, name: item.name || item.fullName || item.email || 'Instructor' });
    });
    return [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
  }
  async function list(user, { instructorId, search = '' } = {}) {
    if (user.role === 'student' && !(user.instructorid || user.instructorId)) return { syllabi: [], cleanupPending: false };
    let query = ownerQuery(user, true);
    if (user.role === 'admin' && instructorId) query = query.where('instructorId', '==', instructorId);
    const docs = await query.get();
    const needle = String(search).slice(0, 180).toLocaleLowerCase();
    const names = new Map();
    const items = docs.docs.filter(doc => usable(doc.data()) && canReadSyllabus(doc.data(), user) && doc.data().title.toLocaleLowerCase().includes(needle));
    await Promise.all([...new Set(items.map(doc => doc.data().instructorId))].map(async id => {
      try { names.set(id, (await instructor(id)).name); } catch { names.set(id, 'Instructor'); }
    }));
    return { syllabi: items.map(doc => ({ ...summary(doc, user), instructorName: names.get(doc.data().instructorId) })).sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || '')),
      cleanupPending: user.role !== 'student' && docs.docs.some(doc => doc.data().status === 'deleting' || doc.data().pendingFileDeletes?.length) };
  }
  async function detail(user, id) {
    const doc = await ref('syllabi', id).get();
    const data = check(doc, user);
    const children = await col('syllabus_modules').where('syllabusId', '==', id).get();
    // Recheck the parent after querying children to avoid exposing reassigned materials.
    check(await doc.ref.get(), user);
    let name = 'Instructor';
    try { name = (await instructor(data.instructorId)).name; } catch { /* deleted instructor */ }
    return { syllabus: { ...summary(doc, user), instructorName: name },
      modules: children.docs.filter(item => usable(item.data())).map(item => summary(item, user)).sort((a, b) => a.moduleNumber - b.moduleNumber),
      cleanupPending: user.role !== 'student' && children.docs.some(item => item.data().status === 'deleting' || item.data().pendingFileDeletes?.length) };
  }
  async function removeFile(name, id, path) {
    if (!filePath(name, id, path)) fail(500, 'Invalid document storage reference.');
    await bucket().file(path).delete({ ignoreNotFound: true });
  }
  // Tombstones and obsolete paths stay private and durable until cleanup succeeds.
  async function cleanupRecord(name, id) {
    try {
      const docRef = ref(name, id);
      const initial = await docRef.get();
      if (!initial.exists) return true;
      for (const path of [...new Set(initial.data().pendingFileDeletes || [])]) {
        await removeFile(name, id, path);
        await db.runTransaction(async tx => {
          const current = await tx.get(docRef);
          if (!current.exists) return;
          tx.update(docRef, { pendingFileDeletes: (current.data().pendingFileDeletes || []).filter(item => item !== path) });
        });
      }
      return await db.runTransaction(async tx => {
        const current = await tx.get(docRef);
        if (!current.exists) return true;
        if (current.data().pendingFileDeletes?.length) return false;
        if (current.data().status === 'deleting') tx.delete(docRef);
        return true;
      });
    } catch { return false; }
  }
  async function save(user, name, id, body, file, parentId = null) {
    managers(user);
    const isModule = name === 'syllabus_modules';
    const creating = !id;
    const docRef = creating ? col(name).doc() : ref(name, id);
    const title = text(body.title, 'Title', 180);
    const description = text(body.description ?? '', 'Description', 2500, false);
    let instructorId;
    if (!isModule) {
      instructorId = user.role === 'admin' ? body.instructorId : user.id;
      if (user.role === 'instructor' && body.instructorId && body.instructorId !== user.id) fail(403, 'You can only assign your own syllabi.');
      await instructor(instructorId);
    }
    const moduleNumber = Number(body.moduleNumber);
    if (isModule && (!Number.isInteger(moduleNumber) || moduleNumber < 1 || moduleNumber > 999)) fail(400, 'Module number must be between 1 and 999.');
    if (creating || file) validatePdf(file);
    // Scope validation happens before uploading and again in the transaction.
    if (!creating) {
      const old = await docRef.get();
      if (!old.exists || !usable(old.data())) fail(404, 'Material not found.');
      if (isModule) parentId = old.data().syllabusId;
      else { check(old, user, true); revision(old.data(), body.revision); }
    }
    if (isModule) check(await ref('syllabi', parentId).get(), user, true);
    const storagePath = file ? `${name}/${docRef.id}/${randomUUID()}.pdf` : null;
    if (file) {
      try {
        await bucket().file(storagePath).save(file.buffer, { resumable: false, validation: 'crc32c', preconditionOpts: { ifGenerationMatch: 0 },
          metadata: { contentType: 'application/pdf', cacheControl: 'private, no-store', metadata: { recordId: docRef.id, collection: name } } });
      } catch (error) { throw new MaterialsStorageError(error, 'upload'); }
    }
    try {
      await db.runTransaction(async tx => {
        const current = await tx.get(docRef);
        const old = current.exists && current.data();
        if (!creating && (!old || !usable(old))) fail(404, 'Material not found.');
        if (!creating) revision(old, body.revision);
        let parentRef, parent;
        if (isModule) {
          parentRef = ref('syllabi', parentId);
          parent = check(await tx.get(parentRef), user, true);
          const siblings = await tx.get(col(name).where('syllabusId', '==', parentId));
          if (creating && siblings.size >= 200) fail(400, 'A syllabus can contain up to 200 modules.');
          if (siblings.docs.some(item => item.id !== docRef.id && usable(item.data()) && item.data().moduleNumber === moduleNumber)) fail(409, 'That module number is already used. Choose another number or use the reorder arrows.');
        } else if (!creating) check(current, user, true);
        const pending = [...new Set([...(old?.pendingFileDeletes || []), ...(storagePath && old?.storagePath ? [old.storagePath] : [])])];
        if (pending.length > 50) fail(409, 'Retry pending file cleanup before replacing this document again.');
        const data = { title, description, updatedAt: timestamp(), revision: (old?.revision || 0) + 1, pendingFileDeletes: pending,
          ...(isModule ? { syllabusId: parentId, moduleNumber } : { instructorId }),
          ...(creating ? { status: 'active', createdAt: timestamp(), [isModule ? 'uploadedBy' : 'createdBy']: user.id, ...(!isModule ? { moduleCount: 0 } : {}) } : {}),
          ...(storagePath ? { storagePath, fileName: validatePdf(file), fileSize: file.buffer.length, contentType: 'application/pdf' } : {}) };
        if (creating) tx.create(docRef, data); else tx.update(docRef, data);
        if (parentRef) tx.update(parentRef, { moduleCount: (parent.moduleCount || 0) + (creating ? 1 : 0), updatedAt: timestamp(), revision: parent.revision + 1 });
      });
    } catch (error) {
      if (storagePath) {
        try {
          // A lost commit acknowledgement must never delete a committed PDF.
          const latest = await docRef.get();
          if (!latest.exists || (latest.data().storagePath !== storagePath && !latest.data().pendingFileDeletes?.includes(storagePath))) await removeFile(name, docRef.id, storagePath);
        } catch { /* orphan sweeper retries unreferenced objects */ }
      }
      throw error;
    }
    return { id: docRef.id, cleanupPending: !(await cleanupRecord(name, docRef.id)) };
  }
  async function remove(user, name, id, expectedRevision) {
    managers(user);
    const docRef = ref(name, id);
    await db.runTransaction(async tx => {
      const doc = await tx.get(docRef);
      if (!doc.exists) fail(404, 'Material not found.');
      const data = doc.data();
      if (name === 'syllabi') {
        check(doc, user, true, true);
        if (data.status !== 'deleting') revision(data, expectedRevision);
        const children = await tx.get(col('syllabus_modules').where('syllabusId', '==', id));
        if (children.size) fail(409, 'Delete all modules and finish pending file cleanup before deleting this syllabus.');
      } else {
        const parentRef = ref('syllabi', data.syllabusId);
        const parent = check(await tx.get(parentRef), user, true);
        if (data.status !== 'deleting') {
          revision(data, expectedRevision);
          tx.update(parentRef, { moduleCount: Math.max(0, (parent.moduleCount || 0) - 1), updatedAt: timestamp(), revision: parent.revision + 1 });
        }
      }
      if (data.status !== 'deleting') tx.update(docRef, { status: 'deleting', updatedAt: timestamp(), revision: data.revision + 1,
        pendingFileDeletes: [...new Set([...(data.pendingFileDeletes || []), data.storagePath])] });
    });
    return { cleanupPending: !(await cleanupRecord(name, id)) };
  }
  async function reorder(user, id, body) {
    managers(user);
    const parentRef = ref('syllabi', id);
    await db.runTransaction(async tx => {
      const parent = check(await tx.get(parentRef), user, true);
      revision(parent, body.revision);
      const docs = await tx.get(col('syllabus_modules').where('syllabusId', '==', id));
      const active = docs.docs.filter(doc => usable(doc.data()));
      if (!Array.isArray(body.ids) || body.ids.length !== active.length || new Set(body.ids).size !== active.length || active.some(doc => !body.ids.includes(doc.id))) fail(409, 'The module list changed. Refresh it before reordering.');
      active.forEach(doc => tx.update(doc.ref, { moduleNumber: body.ids.indexOf(doc.id) + 1, updatedAt: timestamp(), revision: doc.data().revision + 1 }));
      tx.update(parentRef, { updatedAt: timestamp(), revision: parent.revision + 1 });
    });
    return { success: true };
  }
  async function pdf(user, name, id) {
    const doc = await ref(name, id).get();
    if (!doc.exists || !usable(doc.data())) fail(404, 'Document not found.');
    const data = doc.data();
    const parentRef = name === 'syllabi' ? doc.ref : ref('syllabi', data.syllabusId);
    check(await parentRef.get(), user);
    if (!filePath(name, id, data.storagePath)) fail(404, 'Document not found.');
    let buffer;
    try { [buffer] = await bucket().file(data.storagePath).download({ start: 0, end: PDF_LIMIT, validation: false }); }
    catch (error) { throw new MaterialsStorageError(error, 'read'); }
    if (buffer.length > PDF_LIMIT) fail(400, 'PDF documents must be 15 MB or smaller.');
    // File access always follows the latest parent assignment and current revision.
    check(await parentRef.get(), user);
    const latest = await doc.ref.get();
    if (!latest.exists || latest.data().status !== 'active' || latest.data().storagePath !== data.storagePath) fail(409, 'This document changed. Open it again.');
    return { buffer, fileName: data.fileName };
  }
  async function cleanup(user) {
    managers(user);
    const docs = await ownerQuery(user, true).get();
    let pending = 0;
    for (const doc of docs.docs) {
      if (!canManageSyllabus(doc.data(), user)) continue;
      const children = await col('syllabus_modules').where('syllabusId', '==', doc.id).get();
      for (const child of children.docs) if (!(await cleanupRecord('syllabus_modules', child.id))) pending++;
      if (!(await cleanupRecord('syllabi', doc.id))) pending++;
    }
    return { cleanupPending: pending > 0 };
  }
  // A crashed upload can leave a unique object before its metadata commit. Only
  // objects older than a day and unreferenced by either current or pending paths
  // are eligible. Never touches simulation files or other Storage prefixes.
  async function sweepOrphans() {
    let removed = 0;
    for (const name of ['syllabi', 'syllabus_modules']) {
      let pageToken;
      do {
        const [files, next] = await bucket().getFiles({ prefix: `${name}/`, autoPaginate: false, maxResults: 100, pageToken });
        for (const file of files) {
          const id = file.name.split('/')[1];
          if (!validId(id) || !filePath(name, id, file.name)) continue;
          const [metadata] = await file.getMetadata();
          const created = Date.parse(metadata.timeCreated);
          if (!Number.isFinite(created) || Date.now() - created < 86400000) continue;
          const doc = await ref(name, id).get();
          if (doc.exists && (doc.data().storagePath === file.name || doc.data().pendingFileDeletes?.includes(file.name))) continue;
          await removeFile(name, id, file.name); removed++;
        }
        pageToken = next?.pageToken;
      } while (pageToken);
    }
    return removed;
  }
  return { list, detail, instructors, save, remove, reorder, pdf, cleanup, sweepOrphans };
}
