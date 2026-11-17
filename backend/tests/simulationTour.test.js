import { test, expect } from '@jest/globals';
import express from 'express';
import request from 'supertest';
import { createAccountRouter } from '../routes/accountRouter.js';
import { issueSession } from '../services/authSession.js';
import { materialsFixture } from './helpers/materialsFixture.js';

function account() {
  const fixture = materialsFixture();
  const app = express(); app.use(express.json()); app.use('/auth', createAccountRouter({ db: fixture.db, now: () => 1794900000000 }));
  const claim = (body = {}, id = 'sa', role = 'student') => request(app).post('/auth/simulation-tour')
    .set('Authorization', `Bearer ${issueSession(id, role)}`).send(body);
  return { ...fixture, app, claim };
}

test('the first admitted-account login offers the tour once across browsers and preserves the student profile', async () => {
  const f = account(), previous = structuredClone(f.records.students.sa);
  const first = await f.claim({ studentId: 'sb' }).expect(200);
  expect(first.body).toEqual({ showAutomatically: true });
  expect(first.headers['cache-control']).toBe('no-store');
  expect(Number.isFinite(f.records.students.sa.simulationTourSeenAt.getTime())).toBe(true);
  expect(f.records.students.sb.simulationTourSeenAt).toBeUndefined();
  const seen = f.records.students.sa.simulationTourSeenAt;
  expect((await f.claim().expect(200)).body.showAutomatically).toBe(false);
  expect(f.records.students.sa).toEqual({ ...previous, simulationTourSeenAt: seen });
  expect((await f.claim({}, 'sb').expect(200)).body.showAutomatically).toBe(true);
});

test('simultaneous first logins can offer only one automatic tour', async () => {
  const f = account();
  const results = await Promise.all([f.claim(), f.claim(), f.claim()]);
  expect(results.map(r => r.status)).toEqual([200, 200, 200]);
  expect(results.filter(r => r.body.showAutomatically)).toHaveLength(1);
  expect(f.events.filter(([type]) => type === 'update')).toHaveLength(1);
});

test('existing local acknowledgements and students with training history are not welcomed again', async () => {
  const f = account();
  expect((await f.claim({ alreadySeen: true }).expect(200)).body.showAutomatically).toBe(false);
  for (const field of ['xp', 'total_xp', 'completed', 'missionsCompleted', 'totalsessions', 'totalSessions']) {
    const next = account(); next.records.students.sa[field] = '110';
    expect((await next.claim().expect(200)).body.showAutomatically).toBe(false);
    expect(next.records.students.sa[field]).toBe('110');
  }
});

test('pending, disabled, missing, demo and nonstudent accounts cannot claim the admitted-student tour', async () => {
  const f = account();
  await request(f.app).post('/auth/simulation-tour').send({}).expect(401);
  await request(f.app).post('/auth/simulation-tour').set('Authorization', 'Bearer forged').send({}).expect(401);
  for (const status of ['pending', 'rejected', 'inactive']) {
    f.records.students.sa.status = status;
    await f.claim().expect(403);
  }
  await f.claim({}, 'missing').expect(403);
  await f.claim({}, 'student-alex').expect(403);
  await f.claim({}, 'a', 'instructor').expect(403);
  await f.claim({}, 'admin', 'admin').expect(403);
  expect(f.events).toHaveLength(0);
});

test('invalid claims and failed storage never report a saved acknowledgement or alter another account', async () => {
  const f = account();
  await f.claim({ alreadySeen: 'true' }).expect(400);
  f.state.failCommit = true;
  await f.claim().expect(503);
  expect(f.records.students.sa.simulationTourSeenAt).toBeUndefined();
  f.state.failCommit = false;
  expect((await f.claim().expect(200)).body.showAutomatically).toBe(true);
});
