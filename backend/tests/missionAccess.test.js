import { jest, test, expect, beforeEach } from '@jest/globals';
import express from 'express';
import request from 'supertest';
import { issueSession, verifySession } from '../services/authSession.js';

let collections;
const mutations = [];
function query(name, filters = []) {
  const rows = () => collections[name] || [];
  return {
    doc: (id = 'generated') => {
      const ref = { id, path: `${name}/${id}`,
        get: async () => {
          const row = rows().find(row => row.id === id);
          return { id, exists: Boolean(row), data: () => row, ref };
        },
        create: async data => {
          if (rows().some(row => row.id === id)) throw Object.assign(new Error('exists'), { code: 6 });
          mutations.push(['create', name, id]);
          (collections[name] ||= []).push({ ...data, id });
        },
        update: async data => { mutations.push(['update', name, id]); Object.assign(rows().find(row => row.id === id), data); },
        delete: async () => { mutations.push(['delete', name, id]); collections[name] = rows().filter(row => row.id !== id); }
      };
      return ref;
    },
    add: async data => { const ref = query(name).doc(); await ref.create(data); return ref; },
    where: (field, operator, value) => query(name, [...filters, [field, value]]),
    get: async () => ({ docs: rows().filter(row => filters.every(([field, value]) => row[field] === value))
      .map(row => ({ id: row.id, data: () => row, ref: query(name).doc(row.id) })) })
  };
}
jest.unstable_mockModule('../config/firebase-admin.js', () => ({ db: {
  collection: name => query(name), batch: () => ({ delete() {}, commit: async () => {} })
} }));
const { default: missions } = await import('../routes/missions.js');
const { default: modules } = await import('../routes/modules.js');
const { default: instructors } = await import('../routes/instructors.js');
const { default: students } = await import('../routes/students.js');
const app = express();
app.use(express.json());
app.use('/missions', missions);
app.use('/modules', modules);
app.use('/instructors', instructors);
app.use('/students', students);
const headers = (id, role = 'instructor') => ({ Authorization: `Bearer ${issueSession(id, role)}` });

beforeEach(() => {
  mutations.length = 0;
  collections = {
    instructor: [{ id: 'a', status: 'active' }, { id: 'b', status: 'active' }],
    students: [
      { id: 'sa', instructorid: 'a', status: 'active' }, { id: 'sb', instructorId: 'b', status: 'active' },
      { id: 'unassigned', status: 'active' }, { id: 'pending', instructorid: 'a', status: 'pending' }
    ],
    missions: [
      { id: 'ma', instructorId: 'a', createdBy: 'a', moduleId: 'level' },
      { id: 'legacy-a', createdBy: 'a', moduleId: 'level' },
      { id: 'mb', instructorid: 'b', moduleId: 'level' }, { id: 'unowned', moduleId: 'level' }
    ]
  };
});

test.each(['/missions', '/modules'])('%s lists only the creator\'s missions or the assigned instructor\'s missions', async path => {
  for (const [id, role, expected] of [
    ['a', 'instructor', ['ma', 'legacy-a']], ['b', 'instructor', ['mb']],
    ['sa', 'student', ['ma', 'legacy-a']], ['sb', 'student', ['mb']], ['unassigned', 'student', []]
  ]) {
    const response = await request(app).get(path + '?moduleId=level&instructorId=b').set(headers(id, role)).expect(200);
    expect((response.body.missions || response.body.modules).map(row => row.id)).toEqual(expected);
    expect(response.body.count).toBe(expected.length);
  }
});

test.each(['/missions', '/modules'])('%s denies anonymous requests, forged user IDs, and invalid sessions', async path => {
  await request(app).get(path).expect(401);
  await request(app).get(path).set('x-user-id', 'a').expect(401);
  await request(app).get(path).set('Authorization', `Bearer ${issueSession('a', 'instructor')}x`).expect(401);
  await request(app).get(path).set(headers('pending', 'student')).expect(403);
  collections.instructor[0].status = 'inactive';
  await request(app).get(path).set(headers('a')).expect(403);
});

test.each(['/missions', '/modules'])('%s blocks foreign reads and every foreign write without mutating records', async path => {
  await request(app).get(`${path}/mb`).set(headers('a')).expect(404);
  await request(app).get(`${path}/mb`).set(headers('sa', 'student')).expect(404);
  await request(app).get(`${path}/ma`).set(headers('sa', 'student')).expect(200);
  await request(app).put(`${path}/mb`).set(headers('a')).send({ title: 'Hijacked' }).expect(404);
  await request(app).put(`${path}/missing`).set(headers('a')).send({ title: 'Upsert' }).expect(404);
  await request(app).delete(`${path}/mb`).set(headers('a')).expect(404);
  await request(app).post(path).set(headers('sa', 'student')).send({ title: 'New' }).expect(403);
  await request(app).put(`${path}/ma`).set(headers('sa', 'student')).send({ title: 'Change' }).expect(403);
  await request(app).delete(`${path}/ma`).set(headers('sa', 'student')).expect(403);
  expect(mutations).toEqual([]);
});

test.each(['/missions', '/modules'])('%s stamps the authenticated owner and preserves it when editing', async path => {
  const response = await request(app).post(path).set(headers('a'))
    .send({ id: 'new', title: 'Own mission', instructorId: 'b', instructorid: 'b', createdBy: 'b' }).expect(201);
  const id = response.body.missionId || response.body.moduleId;
  expect(collections.missions.find(row => row.id === id)).toMatchObject({ instructorId: 'a', instructorid: 'a', createdBy: 'a' });
  await request(app).put(`${path}/legacy-a`).set(headers('a'))
    .send({ title: 'Updated', instructorId: 'b', createdBy: 'b' }).expect(200);
  expect(collections.missions.find(row => row.id === 'legacy-a')).toMatchObject({ title: 'Updated', instructorId: 'a', createdBy: 'a' });
  await request(app).delete(`${path}/${id}`).set(headers('a')).expect(200);
  expect(collections.missions.some(row => row.id === id)).toBe(false);
});

test('creating with an existing mission ID cannot overwrite another instructor\'s mission', async () => {
  await request(app).post('/missions').set(headers('a')).send({ id: 'mb', title: 'Overwrite' }).expect(409);
  expect(collections.missions.find(row => row.id === 'mb').instructorid).toBe('b');
  expect(mutations).toEqual([]);
});

test('score deletion is restricted to the mission owner', async () => {
  await request(app).delete('/missions/mb/scores').set(headers('a')).expect(404);
  await request(app).delete('/missions/ma/scores').set(headers('sa', 'student')).expect(403);
  expect(mutations).toEqual([]);
});

test('student assignment changes are read from the database for each request', async () => {
  const session = headers('sa', 'student');
  collections.students[0].instructorid = 'b';
  const response = await request(app).get('/missions').set(session).expect(200);
  expect(response.body.missions.map(row => row.id)).toEqual(['mb']);
});

test('class summaries and training records cannot expose another instructor\'s missions', async () => {
  for (const path of ['/instructors/b/overview', '/instructors/b/student-management', '/instructors/b/students/sb/training-record']) {
    await request(app).get(path).expect(401);
    await request(app).get(path).set(headers('a')).expect(404);
    await request(app).get(path).set(headers('sa', 'student')).expect(404);
  }
  for (const path of ['/students/sb/training-summary', '/students/sb/missions-detail', '/students/sb/quizzes-detail']) {
    await request(app).get(path).expect(401);
    await request(app).get(path).set(headers('a')).expect(404);
    await request(app).get(path).set(headers('sa', 'student')).expect(404);
  }
});

test('expired and malformed session tokens are rejected', () => {
  expect(verifySession('invalid')).toBeNull();
  const now = jest.spyOn(Date, 'now');
  const token = issueSession('a', 'instructor');
  now.mockReturnValue(Date.now() + 13 * 60 * 60 * 1000);
  expect(verifySession(token)).toBeNull();
  now.mockRestore();
});
