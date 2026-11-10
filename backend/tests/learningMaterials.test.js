import { beforeEach, expect, test } from '@jest/globals';
import request from 'supertest';
import { randomUUID } from 'node:crypto';
import { materialsFixture, samplePdf } from './helpers/materialsFixture.js';
import { issueSession } from '../services/authSession.js';
import { PDF_LIMIT } from '../services/learningMaterials.js';

let f;
const owner = { id: 'a', role: 'instructor' }, admin = { id: 'admin', role: 'admin' }, student = { id: 'sa', role: 'student', instructorid: 'a' };
const pdf = () => ({ originalname: 'navigation.pdf', mimetype: 'application/pdf', buffer: samplePdf() });
const fields = (extra = {}) => ({ title: 'Maritime Navigation', description: 'Course reading', ...extra });
const headers = (id = 'a', role = 'instructor') => ({ Authorization: `Bearer ${issueSession(id, role)}` });
const create = () => f.service.save(owner, 'syllabi', null, fields(), pdf());
const module = (id, number = 1) => f.service.save(owner, 'syllabus_modules', null, fields({ moduleNumber: number }), pdf(), id);
const record = id => f.records.syllabi[id];
beforeEach(() => { f = materialsFixture(); });

test('real multipart upload creates generated metadata after the file, using injected server timestamps', async () => {
  const result = await request(f.app).post('/learning-materials/syllabi').set(headers()).field('title', 'Navigation').field('description', 'Reading').field('createdBy', 'forged').attach('file', samplePdf(), { filename: 'course.pdf', contentType: 'application/pdf' }).expect(200);
  const data = record(result.body.id);
  expect(data).toMatchObject({ instructorId: 'a', createdBy: 'a', fileName: 'course.pdf', contentType: 'application/pdf', moduleCount: 0, revision: 1 });
  expect(data.storagePath).toMatch(new RegExp(`^syllabi/${result.body.id}/.+\\.pdf$`));
  expect(f.state.timestamps).toBeGreaterThan(0); expect(data.createdAt.toISOString()).toBe('2026-11-10T00:00:00.000Z');
  expect(Object.values(data).some(Buffer.isBuffer)).toBe(false);
  expect(f.events[0][0]).toBe('upload'); expect(f.events[1][0]).toBe('create');
  expect(f.files.get(data.storagePath).options).toMatchObject({ preconditionOpts: { ifGenerationMatch: 0 }, metadata: { cacheControl: 'private, no-store' } });
  expect(f.records.training_modules).toEqual({ untouched: { title: 'Simulation' } });
});

test.each([
  [404, 'MATERIALS_STORAGE_NOT_CONFIGURED', /not set up yet/],
  [403, 'MATERIALS_STORAGE_ACCESS_DENIED', /storage permissions/],
  [401, 'MATERIALS_STORAGE_ACCESS_DENIED', /storage permissions/],
  ['ETIMEDOUT', 'MATERIALS_STORAGE_UNAVAILABLE', /temporarily unavailable/],
])('upload storage failure %s is actionable and never saves a placeholder or leaks provider details', async (sourceCode, code, message) => {
  f.state.saveError = Object.assign(new Error('provider detail: private-account@example.com secret-token'), { code: sourceCode });
  const response = await request(f.app).post('/learning-materials/syllabi').set(headers()).field('title', 'Navigation')
    .attach('file', samplePdf(), { filename: 'course.pdf', contentType: 'application/pdf' }).expect(503);
  expect(response.body.code).toBe(code);expect(response.body.message).toMatch(message);
  expect(JSON.stringify(response.body)).not.toMatch(/private-account|secret-token|provider detail/);
  expect(Object.keys(f.records.syllabi)).toEqual(['placeholder']);expect(f.files.size).toBe(0);
});

test('a missing PDF is distinguished from an unconfigured upload bucket', async () => {
  const { id } = await create();
  f.bucket.file = () => ({ download: async () => { throw Object.assign(new Error('No such object'), { code: 404 }); } });
  const response = await request(f.app).get(`/learning-materials/syllabi/${id}/pdf`).set(headers('sa','student')).expect(503);
  expect(response.body.code).toBe('MATERIALS_PDF_NOT_FOUND');expect(response.body.message).toMatch(/replace the document/);
});

test('anonymous, forged IDs, tampered sessions and pending accounts are denied', async () => {
  await request(f.app).get('/learning-materials/syllabi').expect(401);
  await request(f.app).get('/learning-materials/syllabi').set('x-user-id', 'admin-root').expect(401);
  await request(f.app).get('/learning-materials/syllabi').set('Authorization', `Bearer ${issueSession('a', 'instructor')}x`).expect(401);
  await request(f.app).get('/learning-materials/syllabi').set(headers('pending', 'student')).expect(403);
  await request(f.app).get('/learning-materials/syllabi').set(headers('missing')).expect(403);
  f.records.students.pending.status = undefined;
  await request(f.app).get('/learning-materials/syllabi').set(headers('pending', 'student')).expect(403);
  f.records.instructor.a.status = 'inactive';
  await request(f.app).get('/learning-materials/syllabi').set(headers()).expect(403);
});

test('unassigned students cannot read malformed unowned records or a sentinel instructor', async () => {
  const { id } = await create(); delete record(id).instructorId;
  await expect(f.service.detail({id:'unassigned',role:'student'},id)).rejects.toMatchObject({status:404});
  record(id).instructorId = '__unassigned__';
  expect((await f.service.list({id:'unassigned',role:'student'})).syllabi).toEqual([]);
});

test('a lost Firestore commit response never removes the newly committed PDF', async () => {
  f.state.loseCommitAcknowledgement = true;
  await expect(create()).rejects.toThrow('acknowledgement');
  const doc = Object.values(f.records.syllabi).find(data=>data.status==='active');
  expect(doc).toBeDefined();expect(f.files.has(doc.storagePath)).toBe(true);
});

test('syllabus reassignment during a module upload rechecks permissions before commit', async () => {
  const { id } = await create();
  f.state.afterSave = async path => {
    if (path.startsWith('syllabus_modules/')) await f.service.save(admin,'syllabi',id,fields({instructorId:'b',revision:record(id).revision}),null);
  };
  await expect(module(id)).rejects.toMatchObject({status:404});
  expect(f.files.size).toBe(1);expect(record(id).moduleCount).toBe(0);
});

test('all student mutations are rejected before accepting any file', async () => {
  const { id } = await create();
  const { id: mid } = await module(id);
  for (const [method, path] of [['post','/syllabi'], ['put',`/syllabi/${id}`], ['delete',`/syllabi/${id}`], ['post',`/syllabi/${id}/modules`], ['put',`/modules/${mid}`], ['delete',`/modules/${mid}`], ['post',`/syllabi/${id}/reorder`], ['post','/cleanup']]) {
    await request(f.app)[method](`/learning-materials${path}`).set(headers('sa', 'student')).send({ role: 'admin' }).expect(403);
  }
  await request(f.app).get('/learning-materials/instructors').set(headers('sa', 'student')).expect(403);
  expect(f.files.size).toBe(2);
});

test('foreign instructors and students cannot read or change a syllabus, child or PDF', async () => {
  const { id } = await create(); const { id: mid } = await module(id);
  for (const identity of [headers('b'), headers('sb', 'student'), headers('unassigned', 'student')]) {
    for (const path of [`/syllabi/${id}`, `/syllabi/${id}/pdf`, `/modules/${mid}/pdf`]) await request(f.app).get('/learning-materials' + path).set(identity).expect(404);
    const response = await request(f.app).get('/learning-materials/syllabi?instructorId=a').set(identity).expect(200);
    expect(response.body.syllabi).toEqual([]);
  }
  await request(f.app).put(`/learning-materials/syllabi/${id}`).set(headers('b')).field('title','Stolen').field('revision','1').expect(404);
  await request(f.app).delete(`/learning-materials/modules/${mid}`).set(headers('b')).send({ revision: 1 }).expect(404);
  await expect(f.service.save(owner, 'syllabi', null, fields({ instructorId: 'b' }), pdf())).rejects.toMatchObject({ status: 403 });
});

test('student PDF access is private, and freshly follows account and syllabus reassignment', async () => {
  const { id } = await create(); const { id: mid } = await module(id);
  const result = await request(f.app).get(`/learning-materials/modules/${mid}/pdf`).set(headers('sa','student')).expect(200);
  expect(result.headers['cache-control']).toBe('private, no-store'); expect(result.headers['content-type']).toMatch(/application\/pdf/);
  expect(result.body.equals(samplePdf())).toBe(true);
  f.records.students.sa.instructorid = 'b';
  await request(f.app).get(`/learning-materials/modules/${mid}/pdf`).set(headers('sa','student')).expect(404);
  f.records.students.sa.instructorid = 'a';
  await f.service.save(admin, 'syllabi', id, fields({ instructorId:'b', revision:record(id).revision }), null);
  await request(f.app).get(`/learning-materials/modules/${mid}/pdf`).set(headers('sa','student')).expect(404);
  await request(f.app).get(`/learning-materials/modules/${mid}/pdf`).set(headers('sb','student')).expect(200);
});

test('admin assigns, filters and manages all instructors; placeholders remain untouched', async () => {
  const a = await create();
  const b = await f.service.save(admin, 'syllabi', null, fields({ instructorId: 'b' }), pdf());
  expect((await f.service.list(admin)).syllabi).toHaveLength(2);
  expect((await f.service.list(admin, { instructorId: 'b', search: 'navigation' })).syllabi.map(item => item.id)).toEqual([b.id]);
  expect((await f.service.instructors(admin)).map(item => item.id)).toEqual(['a','b']);
  expect((await f.service.list(student)).syllabi[0].revision).toBeUndefined();
  expect((await f.service.list(student)).syllabi[0].storagePath).toBeUndefined();
  expect(f.records.syllabi.placeholder).toEqual({ title: '' });
  expect(f.records.syllabus_modules.placeholder).toEqual({ title: '' });
  await expect(f.service.detail(owner, 'placeholder')).rejects.toMatchObject({ status: 404 });
  await expect(module('placeholder')).rejects.toMatchObject({ status: 404 });
  await expect(module('missing')).rejects.toMatchObject({ status: 404 });
  expect((await f.service.detail(owner,a.id)).modules).toEqual([]);
});

test.each([
  ['extension', { originalname:'malware.exe' }], ['MIME', { mimetype:'image/png' }], ['empty', { buffer: Buffer.alloc(0) }],
  ['size', { buffer: Buffer.alloc(PDF_LIMIT + 1) }], ['signature', { buffer:Buffer.from('fake PDF %%EOF') }], ['truncated', { buffer:Buffer.from('%PDF-1.4 truncated') }],
])('rejects an invalid PDF %s without uploading', async (_name, extra) => {
  await expect(f.service.save(owner,'syllabi',null,fields(), { ...pdf(), ...extra })).rejects.toMatchObject({ status:400 }); expect(f.files.size).toBe(0);
});

test('multer rejects oversized files and multiple attachments with useful errors', async () => {
  await request(f.app).post('/learning-materials/syllabi').set(headers()).field('title','Course').attach('file',Buffer.alloc(PDF_LIMIT + 1), { filename:'large.pdf',contentType:'application/pdf' }).expect(400);
  await request(f.app).post('/learning-materials/syllabi').set(headers()).field('title','Course').attach('file',samplePdf(),'one.pdf').attach('file',samplePdf(),'two.pdf').expect(400);
  expect(f.files.size).toBe(0);
});

test('module relationships, number uniqueness, reordering and parent deletion are transactional', async () => {
  const { id } = await create(); const first = await module(id,4); const second = await module(id,2);
  expect((await f.service.detail(student,id)).modules.map(item => item.id)).toEqual([second.id,first.id]);
  expect(record(id).moduleCount).toBe(2);
  await expect(module(id,2)).rejects.toMatchObject({ status:409 }); expect(f.files.size).toBe(3);
  await expect(f.service.remove(owner,'syllabi',id,record(id).revision)).rejects.toMatchObject({ status:409 });
  await expect(f.service.reorder(owner,id,{revision:record(id).revision,ids:[first.id,first.id]})).rejects.toMatchObject({status:409});
  await f.service.reorder(owner,id,{revision:record(id).revision,ids:[first.id,second.id]});
  expect((await f.service.detail(student,id)).modules.map(item => item.moduleNumber)).toEqual([1,2]);
  for (const mid of [first.id,second.id]) await f.service.remove(owner,'syllabus_modules',mid,f.records.syllabus_modules[mid].revision);
  await f.service.remove(owner,'syllabi',id,record(id).revision);
  expect(f.records.syllabi[id]).toBeUndefined(); expect(f.files.size).toBe(0);
});

test('competing module numbers cannot commit duplicates and deleting the parent during upload prevents orphans', async () => {
  const { id } = await create();
  const results = await Promise.allSettled([module(id,1),module(id,1)]);
  expect(results.filter(item => item.status === 'fulfilled')).toHaveLength(1); expect(record(id).moduleCount).toBe(1); expect(f.files.size).toBe(2);
  const other = await create();
  f.state.afterSave = async path => { if (path.startsWith('syllabus_modules/')) await f.service.remove(owner,'syllabi',other.id,record(other.id).revision); };
  await expect(module(other.id)).rejects.toMatchObject({status:404});
  expect(Object.values(f.records.syllabus_modules).filter(item => item.syllabusId === other.id)).toEqual([]);
});

test('failed upload writes no metadata; failed transaction cleans its staged file', async () => {
  f.state.failSave = true; await expect(create()).rejects.toThrow(); expect(Object.keys(f.records.syllabi)).toEqual(['placeholder']);
  f.state.failSave = false; f.state.failCommit = true;
  await expect(create()).rejects.toThrow(); expect(f.files.size).toBe(0);
});

test('replacement validates revisions and preserves the old file until new metadata commits', async () => {
  const { id } = await create(); const oldPath = record(id).storagePath;
  f.state.failCommit = true;
  await expect(f.service.save(owner,'syllabi',id,fields({revision:1}),pdf())).rejects.toThrow();
  expect(record(id).storagePath).toBe(oldPath); expect(f.files.has(oldPath)).toBe(true); expect(f.files.size).toBe(1);
  f.state.failCommit = false;
  await f.service.save(owner,'syllabi',id,fields({revision:1}),pdf());
  const newPath = record(id).storagePath; expect(newPath).not.toBe(oldPath); expect(f.files.has(oldPath)).toBe(false); expect(f.files.has(newPath)).toBe(true);
  const uploadIndex = f.events.findLastIndex(([kind]) => kind === 'upload'), metadataIndex = f.events.findLastIndex(([kind,path]) => kind === 'update' && path === `syllabi/${id}`);
  expect(uploadIndex).toBeLessThan(metadataIndex);
  await expect(f.service.save(owner,'syllabi',id,fields({revision:1}),pdf())).rejects.toMatchObject({status:409});
});

test('replacement and deletion cleanup failures remain durable, private and retryable', async () => {
  const { id } = await create(); const oldPath = record(id).storagePath;
  f.state.failDelete = true;
  expect((await f.service.save(owner,'syllabi',id,fields({revision:1}),pdf())).cleanupPending).toBe(true);
  expect(record(id).pendingFileDeletes).toEqual([oldPath]); expect(f.files.size).toBe(2);
  const { id: mid } = await module(id);
  expect((await f.service.remove(owner,'syllabus_modules',mid,1)).cleanupPending).toBe(true);
  expect(record(id).moduleCount).toBe(0); expect((await f.service.detail(student,id)).modules).toEqual([]);
  await request(f.app).get(`/learning-materials/modules/${mid}/pdf`).set(headers('sa','student')).expect(404);
  await expect(f.service.remove(owner,'syllabi',id,record(id).revision)).rejects.toMatchObject({status:409});
  f.state.failDelete = false; expect((await f.service.cleanup(owner)).cleanupPending).toBe(false);
  expect(f.records.syllabus_modules[mid]).toBeUndefined(); expect(record(id).pendingFileDeletes).toEqual([]); expect(f.files.size).toBe(1);
  f.state.failDelete = true; await f.service.remove(owner,'syllabi',id,record(id).revision);
  expect((await f.service.list(student)).syllabi).toEqual([]);
  f.state.failDelete = false; await f.service.cleanup(owner); expect(f.files.size).toBe(0); expect(record(id)).toBeUndefined();
});

test('orphan sweeper touches only old unreferenced objects in the two feature prefixes', async () => {
  const { id } = await create(); const live = record(id).storagePath;
  const orphan = `syllabi/failed/${randomUUID()}.pdf`, recent = `syllabi/recent/${randomUUID()}.pdf`, unrelated = 'training_modules/simulation.pdf';
  for (const path of [orphan,recent,unrelated]) await f.bucket.file(path).save(samplePdf(),{});
  for (const path of [live,orphan,unrelated]) f.files.get(path).timeCreated = '2020-01-01T00:00:00Z';
  expect(await f.service.sweepOrphans()).toBe(1);
  expect(f.files.has(orphan)).toBe(false); expect(f.files.has(live)).toBe(true); expect(f.files.has(recent)).toBe(true); expect(f.files.has(unrelated)).toBe(true);
});

test('corrupted storage references cannot delete other collections or return their files', async () => {
  const { id } = await create(); record(id).storagePath = 'training_modules/private.pdf';
  await expect(f.service.pdf(student,'syllabi',id)).rejects.toMatchObject({status:404});
  await f.service.remove(owner,'syllabi',id,record(id).revision);
  expect(record(id).status).toBe('deleting'); expect(f.events.some(([kind,path]) => kind === 'file-delete' && path === 'training_modules/private.pdf')).toBe(false);
});
