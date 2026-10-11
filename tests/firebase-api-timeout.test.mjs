import test from 'node:test';
import assert from 'node:assert/strict';
import { getInstructorStudentManagement } from '../src/api/firebaseApi.js';

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
