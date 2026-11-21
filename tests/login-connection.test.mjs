import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { createLoginConnection } from '../src/api/loginConnection.js';

test('the HTML starts waking Render before the app module is loaded', () => {
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  const earlyScript = html.match(/<script>([\s\S]*?)<\/script>/);
  assert.ok(earlyScript && earlyScript.index < html.indexOf('src="/src/main.js"'));
  const requests = [];
  const script = earlyScript[1].replace('%VITE_API_BASE_URL%', 'https://helmquest-api.onrender.com/api/v1');
  vm.runInNewContext(script, {
    URL, AbortSignal,
    fetch: (...args) => { requests.push(args); return Promise.reject(new Error('Temporarily asleep')); },
  });
  assert.equal(requests.length, 1);
  assert.equal(requests[0][0].href, 'https://helmquest-api.onrender.com/health');
  assert.equal(requests[0][1].credentials, 'omit');
  assert.equal(requests[0][1].body, undefined);
});

test('Render warmup starts before login, shares in-flight work and sends no credentials', async () => {
  let finish, time = 0;
  const requests = [];
  const connection = createLoginConnection({
    baseUrl: 'https://helmquest-api.onrender.com/api/v1', now: () => time,
    fetchImpl: (...args) => { requests.push(args); return new Promise(resolve => { finish = resolve; }); },
  });
  const warmup = connection.warmLoginService();
  assert.equal(connection.warmLoginService(), warmup);
  await Promise.resolve();
  assert.equal(requests.length, 1);
  assert.equal(requests[0][0], 'https://helmquest-api.onrender.com/health');
  assert.equal(requests[0][1].credentials, 'omit');
  assert.equal(requests[0][1].body, undefined);
  assert.equal(requests[0][1].headers, undefined);
  assert.ok(connection.loginTimeoutMs > 60000);
  finish({ ok: true });
  assert.equal(await warmup, true);
  assert.equal(await connection.warmLoginService(), true);
  assert.equal(requests.length, 1);
  time = 16 * 60000;
  const returning = connection.warmLoginService();
  await Promise.resolve();
  assert.equal(requests.length, 2);
  finish({ ok: true });
  await returning;
});

test('failed warmup stays silent, permits another attempt, and does not affect local development', async () => {
  let count = 0;
  const connection = createLoginConnection({
    baseUrl: 'https://helmquest-api.onrender.com/api/v1',
    fetchImpl: async () => { if (++count === 1) throw new Error('offline'); return { ok: count > 2 }; },
  });
  assert.equal(await connection.warmLoginService(), false);
  assert.equal(await connection.warmLoginService(), false);
  assert.equal(await connection.warmLoginService(), true);
  const local = createLoginConnection({ baseUrl: 'http://localhost:3001/api/v1', fetchImpl: () => assert.fail('Local development does not need wakeup') });
  assert.equal(await local.warmLoginService(), false);
  assert.equal(local.loginTimeoutMs, 20000);
});
