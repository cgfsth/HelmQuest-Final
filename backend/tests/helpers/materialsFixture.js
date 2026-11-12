import express from 'express';
import { createLearningMaterialsService } from '../../services/learningMaterials.js';
import { createMaterialsAccess } from '../../middleware/materialsAccess.js';
import { createLearningMaterialsRouter } from '../../routes/learningMaterialsRouter.js';
import { createCourseActivitiesService } from '../../services/courseActivities.js';

export function materialsFixture({ middleware, bucketOverride, convert, saveQuizResult } = {}) {
  const records = { instructor: { a: { name: 'Captain Helen', status: 'active' }, b: { name: 'Captain Marcus', status: 'active' }, admin: { name: 'Admin', role: 'admin', status: 'active' } },
    students: { sa: { status: 'active', instructorid: 'a' }, sb: { status: 'active', instructorId: 'b' }, pending: { status: 'pending', instructorid: 'a' }, unassigned: { status: 'active' } },
    syllabi: { placeholder: { title: '' } }, syllabus_modules: { placeholder: { title: '' } }, training_modules: { untouched: { title: 'Simulation' } } };
  const files = new Map(), events = [], state = { failSave: false, saveError: null, failDelete: false, beforeCommit: null, afterSave: null, failCommit: false, loseCommitAcknowledgement: false, timestamps: 0 };
  let generated = 0, lock = Promise.resolve();
  const clone = value => structuredClone(value);
  const doc = (name, id = `generated-${++generated}`) => {
    const reference = { id, path: `${name}/${id}`, get: async () => {
      const data = records[name]?.[id]; return { id, ref: reference, exists: !!data, data: () => data && clone(data) };
    } };
    return reference;
  };
  const query = (name, filters = []) => ({
    doc: id => doc(name, id), where: (field, op, value) => query(name, [...filters, [field, value]]),
    get: async () => {
      const rows = Object.entries(records[name] || {}).filter(([, data]) => filters.every(([key, value]) => data[key] === value));
      return { size: rows.length, docs: await Promise.all(rows.map(([id]) => doc(name, id).get())) };
    },
  });
  const db = { collection: query, runTransaction: callback => {
    const operation = lock.then(async () => {
      const writes = []; let writing = false;
      const tx = { get: reference => { if (writing) throw new Error('Firestore requires all reads before writes'); return reference.get(); },
        create: (ref, data) => { writing = true; writes.push(['create', ref, data]); }, update: (ref, data) => { writing = true; writes.push(['update', ref, data]); }, delete: ref => { writing = true; writes.push(['delete', ref]); } };
      if (state.beforeCommit) { const hook = state.beforeCommit; state.beforeCommit = null; await hook(); }
      const result = await callback(tx);
      if (state.failCommit) throw new Error('Firestore unavailable');
      for (const [kind, ref, data] of writes) {
        const [name, id] = ref.path.split('/');
        if (kind === 'create' && records[name]?.[id]) throw new Error('Already exists');
        if (kind === 'update' && !records[name]?.[id]) throw new Error('Missing document');
        events.push([kind, ref.path]);
        records[name] ||= {};
        if (kind === 'delete') delete records[name][id]; else records[name][id] = kind === 'create' ? clone(data) : { ...records[name][id], ...clone(data) };
      }
      if (state.loseCommitAcknowledgement) { state.loseCommitAcknowledgement = false; throw new Error('Commit acknowledgement lost'); }
      return result;
    });
    lock = operation.catch(() => {}); return operation;
  } };
  const bucket = { file: path => ({ name: path,
    save: async (buffer, options) => {
      events.push(['upload', path]); if (state.failSave) throw new Error('Storage unavailable');
      if (state.saveError) throw state.saveError;
      if (files.has(path)) throw new Error('Object exists');
      files.set(path, { buffer: Buffer.from(buffer), options, timeCreated: new Date().toISOString() });
      await state.afterSave?.(path);
    },
    delete: async () => { events.push(['file-delete', path]); if (state.failDelete) throw new Error('Delete unavailable'); files.delete(path); },
    download: async () => { if (!files.has(path)) throw new Error('Missing file'); return [Buffer.from(files.get(path).buffer)]; },
    getMetadata: async () => [files.get(path)],
  }), getFiles: async ({ prefix }) => [[...files.keys()].filter(path => path.startsWith(prefix)).map(path => bucket.file(path)), null] };
  const service = createLearningMaterialsService({ db, bucket: () => bucketOverride || bucket, timestamp: () => { state.timestamps++; return new Date('2026-11-10T00:00:00Z'); } });
  const course = createCourseActivitiesService({ db, bucket: () => bucketOverride || bucket, timestamp: () => new Date('2026-11-12T00:00:00Z'), materials: service, convert, saveQuizResult });
  const app = express(); app.use(express.json()); if (middleware) app.use(middleware); app.use('/learning-materials', createLearningMaterialsRouter({ service, course, authenticate: createMaterialsAccess({ db }) }));
  return { app, service, course, db, bucket, records, files, events, state };
}

// A genuine two-page PDF with xref offsets, also used for actual browser rendering.
export function samplePdf() {
  const objects = ['<< /Type /Catalog /Pages 2 0 R >>', '<< /Type /Pages /Kids [3 0 R 5 0 R] /Count 2 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 7 0 R >> >> /Contents 4 0 R >>',
    'STREAM:BT /F1 24 Tf 50 760 Td (Maritime Navigation - Page One) Tj ET',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 7 0 R >> >> /Contents 6 0 R >>',
    'STREAM:BT /F1 24 Tf 50 760 Td (Steering and Vessel Control - Page Two) Tj ET', '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>'];
  let source = '%PDF-1.4\n', offsets = [0];
  objects.forEach((object, index) => {
    offsets.push(Buffer.byteLength(source));
    if (object.startsWith('STREAM:')) { const content = object.slice(7); object = `<< /Length ${Buffer.byteLength(content)} >>\nstream\n${content}\nendstream`; }
    source += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xref = Buffer.byteLength(source);
  source += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n` + offsets.slice(1).map(offset => `${String(offset).padStart(10, '0')} 00000 n \n`).join('') + `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return Buffer.from(source);
}
