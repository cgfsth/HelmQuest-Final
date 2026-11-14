import { test, expect } from '@jest/globals';
import express from 'express';
import request from 'supertest';
import bcrypt from 'bcrypt';
import { createAccountRouter } from '../routes/accountRouter.js';
import { issueSession } from '../services/authSession.js';
import { materialsFixture } from './helpers/materialsFixture.js';

async function account() {
  const fixture = materialsFixture();
  fixture.records.students.sa.password = await bcrypt.hash('old-password', 4);
  fixture.records.students.sb.password = await bcrypt.hash('other-password', 4);
  fixture.records.instructor.a.password = await bcrypt.hash('teacher-password', 4);
  let clock = Date.now();
  const app = express(); app.use(express.json()); app.use('/auth', createAccountRouter({ db: fixture.db, now: () => clock }));
  const change = (body, id = 'sa', role = 'student') => request(app).post('/auth/change-password').set('Authorization', `Bearer ${issueSession(id, role)}`).send(body);
  return { ...fixture, app, change, advance: () => { clock += 16 * 60 * 1000; } };
}
const fields = { currentPassword: 'old-password', newPassword: 'new-password' };

test('password changes use the signed-in account, store bcrypt, and preserve identity, XP and other accounts', async () => {
  const f = await account(), before = structuredClone(f.records.students.sa), other = structuredClone(f.records.students.sb);
  const result = await f.change({ ...fields, studentId: 'sb', role: 'instructor' }).expect(200);
  expect(result.headers['cache-control']).toBe('no-store');
  expect(Object.keys(result.body)).toEqual(['message']);
  expect(await bcrypt.compare(fields.newPassword, f.records.students.sa.password)).toBe(true);
  expect(await bcrypt.compare(fields.currentPassword, f.records.students.sa.password)).toBe(false);
  expect(Number.isFinite(f.records.students.sa.passwordChangedAt.getTime())).toBe(true);
  const { password, passwordChangedAt, ...profile } = f.records.students.sa;
  const { password: previous, ...previousProfile } = before;
  expect(profile).toEqual(previousProfile); expect(f.records.students.sb).toEqual(other);
});

test('missing/tampered sessions, shared demos and missing or disabled accounts cannot change passwords', async () => {
  const f = await account();
  await request(f.app).post('/auth/change-password').send(fields).expect(401);
  await request(f.app).post('/auth/change-password').set('Authorization', 'Bearer forged').send(fields).expect(401);
  await f.change(fields, 'student-alex').expect(403);
  await f.change(fields, 'admin', 'admin').expect(403);
  await f.change(fields, 'missing').expect(403);
  for (const status of ['pending', 'inactive', 'rejected']) {
    f.records.students.sa.status = status;
    await f.change(fields).expect(403);
  }
  expect(f.events).toHaveLength(0);
});

test('wrong current password, reused passwords, invalid types and oversized UTF-8 input never write', async () => {
  const f = await account();
  for (const body of [{ ...fields, currentPassword: 'wrong' }, { ...fields, newPassword: 'short' },
    { ...fields, newPassword: fields.currentPassword }, { ...fields, currentPassword: {} },
    { ...fields, newPassword: '🛳'.repeat(19) }, { ...fields, newPassword: 'a'.repeat(73) }]) await f.change(body).expect(400);
  expect(f.events).toHaveLength(0);
  await f.change({ ...fields, newPassword: '界'.repeat(24) }).expect(200);
  expect(await bcrypt.compare('界'.repeat(24), f.records.students.sa.password)).toBe(true);
});

test('repeated guesses are limited across newly issued sessions and can resume after the window', async () => {
  const f = await account();
  for (let i = 0; i < 5; i++) await f.change({ ...fields, currentPassword: 'wrong' }).expect(400);
  const limited = await f.change(fields).expect(429); expect(Number(limited.headers['retry-after'])).toBeGreaterThan(0);
  expect(f.events).toHaveLength(0); f.advance(); await f.change(fields).expect(200);
});

test('database failures and concurrent password/status changes do not report success or overwrite newer credentials', async () => {
  const f = await account(), original = f.records.students.sa.password;
  f.state.failCommit = true;
  await f.change(fields).expect(503); expect(f.records.students.sa.password).toBe(original);
  f.state.failCommit = false;
  const newer = await bcrypt.hash('already-changed', 4);
  f.state.beforeCommit = () => { f.records.students.sa.password = newer; };
  await f.change(fields).expect(409); expect(f.records.students.sa.password).toBe(newer);
  f.records.students.sa.password = original;
  f.state.beforeCommit = () => { f.records.students.sa.status = 'inactive'; };
  await f.change(fields).expect(409); expect(f.records.students.sa.password).toBe(original);
  expect(f.events).toHaveLength(0);
});

test('instructors update their own instructor credentials using the same protected endpoint', async () => {
  const f = await account();
  await f.change({ currentPassword: 'teacher-password', newPassword: 'new-teacher-password' }, 'a', 'instructor').expect(200);
  expect(await bcrypt.compare('new-teacher-password', f.records.instructor.a.password)).toBe(true);
});
