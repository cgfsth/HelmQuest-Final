import test from 'node:test';
import assert from 'node:assert/strict';
import { getInstructorStudentManagement, loginStudent, loginInstructor, loginDemo } from '../src/api/firebaseApi.js';

test('Student Management stops waiting when its backend request times out', async () => {
  const originalFetch = globalThis.fetch;
  const originalError = console.error;
  globalThis.fetch = (_url, options) => new Promise((_resolve, reject) => {
    options.signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')), { once: true });
  });
  console.error = () => {};
  try {
    await assert.rejects(
      getInstructorStudentManagement('teacher', { timeoutMs: 10 }),
      error => error?.name === 'TimeoutError' && /timed out/.test(error.message)
    );
  } finally {
    globalThis.fetch = originalFetch;
    console.error = originalError;
  }
});

test('every server login aborts a stalled request and can retry successfully', async () => {
  const originalFetch = globalThis.fetch;
  const originalError = console.error;
  console.error = () => {};
  try {
    for (const login of [loginStudent, loginInstructor, loginDemo]) {
      let aborted = false;
      globalThis.fetch = (_url, options) => new Promise((_resolve, reject) => {
        options.signal.addEventListener('abort', () => {
          aborted = true;
          reject(new DOMException('Aborted', 'AbortError'));
        }, { once: true });
      });
      await assert.rejects(login('account@example.com', 'password', { timeoutMs: 10 }), { name: 'TimeoutError' });
      assert.equal(aborted, true);
      globalThis.fetch = async () => ({ ok: true, json: async () => ({ sessionToken: 'retry-session' }) });
      assert.equal((await login('account@example.com', 'password')).sessionToken, 'retry-session');
    }
  } finally {
    globalThis.fetch = originalFetch;
    console.error = originalError;
  }
});
