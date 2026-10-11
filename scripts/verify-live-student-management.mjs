// Read-only check of the real Vue UI and API. Requires a hidden browser on CDP port 9225.
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const target = (await (await fetch('http://localhost:9225/json/list')).json()).find(tab => tab.type === 'page');
const socket = new WebSocket(target.webSocketDebuggerUrl);
await new Promise(resolve => socket.addEventListener('open', resolve, { once: true }));
let sequence = 0;
const pending = new Map();
const browserErrors = [];
socket.addEventListener('message', event => {
  const message = JSON.parse(event.data);
  if (message.method === 'Runtime.exceptionThrown') browserErrors.push(message.params.exceptionDetails.exception?.description || message.params.exceptionDetails.text);
  if (!message.id) return;
  const request = pending.get(message.id);
  pending.delete(message.id);
  message.error ? request.reject(message.error) : request.resolve(message.result);
});
function send(method, params = {}) {
  return new Promise((resolve, reject) => {
    const id = ++sequence;
    pending.set(id, { resolve, reject });
    socket.send(JSON.stringify({ id, method, params }));
  });
}
async function evaluate(expression) {
  // Serialize in the page so that Vue proxies are unwrapped.
  const result = await send('Runtime.evaluate', { expression: `JSON.stringify(${expression})`, returnByValue: true });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
  return result.result.value === undefined ? undefined : JSON.parse(result.result.value);
}
const pause = () => new Promise(resolve => setTimeout(resolve, 300));
async function fetchJson(url, timeoutMs = 20000) {
  const response = await fetch(url, { signal: AbortSignal.timeout(timeoutMs) });
  return { response, data: await response.json() };
}
async function waitFor(expression) {
  for (let attempt = 0; attempt < 120; attempt++) {
    const result = await evaluate(expression);
    if (result) return result;
    await pause();
  }
  throw new Error('UI did not finish loading');
}
const state = "document.getElementById('app').__vue_app__._instance.setupState";
const output = resolve(process.argv[2] || '../.tmp/student-management-verification');
mkdirSync(output, { recursive: true });
async function screenshot(name) {
  const result = await send('Page.captureScreenshot', { format: 'png' });
  writeFileSync(resolve(output, name + '.png'), Buffer.from(result.data, 'base64'));
}
async function viewport(width) {
  await send('Emulation.setDeviceMetricsOverride', { width, height: 900, deviceScaleFactor: 1, mobile: false });
  await pause();
  const sizes = await evaluate(`(() => {
    const elements = [document.documentElement, ...document.querySelectorAll('.missions-overlay, .missions-main, .student-management-panel, .student-management-detail')];
    return elements.filter(element => element.clientWidth && getComputedStyle(element).display !== 'none').map(element => ({
      name: element.className || element.tagName, client: element.clientWidth, scroll: element.scrollWidth
    }));
  })()`);
  sizes.forEach(size => assert.ok(size.scroll <= size.client + 1, `${width}px overflow: ${JSON.stringify(size)}`));
  const bounds = await evaluate(`(() => {
    const modal = document.querySelector('.student-management-detail');
    if (!modal) return null;
    const box = modal.getBoundingClientRect();
    return {left: box.left, right: box.right, top: box.top, bottom: box.bottom, width: innerWidth, height: innerHeight};
  })()`);
  if (bounds) assert.ok(bounds.left >= 0 && bounds.right <= bounds.width && bounds.top >= 0 && bounds.bottom <= bounds.height,
    `${width}px clipped modal: ${JSON.stringify(bounds)}`);
}
try {
  await send('Page.enable');
  await send('Runtime.enable');
  // Pause the unrelated 3D render loop only in this isolated test browser.
  await send('Page.addScriptToEvaluateOnNewDocument', { source: 'window.requestAnimationFrame=()=>0;' });
  await send('Page.navigate', { url: 'http://localhost:5174' });
  await waitFor("!!document.getElementById('app')?.__vue_app__?._instance?.setupState");
  // Vue's fade transition also uses RAF; make it visible while that loop is paused.
  await evaluate(`(() => {
    const style = document.createElement('style');
    style.textContent = '.fade-enter-from { opacity: 1 !important; } .fade-leave-active { display: none !important; }';
    document.head.append(style);
  })()`);
  const { data: { instructors } } = await fetchJson('http://localhost:3001/api/v1/instructors');
  let account, expected;
  for (const instructor of instructors) {
    const { response, data } = await fetchJson(`http://localhost:3001/api/v1/instructors/${encodeURIComponent(instructor.id)}/student-management`);
    assert.equal(response.status, 200);
    if (data.students.length) { account = instructor; expected = data; break; }
  }
  assert.ok(account, 'An existing class is required for this read-only check');
  await evaluate(`(() => {
    const app = ${state};
    app.userRole = 'instructor';
    app.currentUser = ${JSON.stringify({ id: account.id, name: account.name })};
    app.activeScreen = 'dashboard';
    app.instructorTab = 'students';
  })()`);
  const loaded = `(() => { const app = ${state}; return !app.studentManagementLoading && app.studentManagement ? app.studentManagement : null; })()`;
  assert.deepEqual(await waitFor(loaded), expected);
  const enrolled = expected.students.filter(student => !['pending', 'rejected'].includes(student.status));
  assert.equal(await evaluate("document.querySelectorAll('.student-management-table tbody tr').length"), enrolled.length);
  for (const width of [1365, 1024, 768, 375]) {
    await viewport(width);
    if (width === 375) {
      await evaluate("document.querySelector('.student-management-panel').scrollIntoView({block: 'start', behavior: 'instant'})");
      await pause();
    }
    if (width === 1365 || width === 375) await screenshot('students-' + width);
  }
  const student = enrolled.find(student => student.missionsCompleted > 0) || enrolled[0];
  await evaluate(`${state}.studentSearch = ${JSON.stringify(student.email || student.name)}`);
  await pause();
  assert.ok((await evaluate(`${state}.filteredManagedStudents`)).every(row => row.id === student.id));
  const csv = await evaluate(`${state}.buildStudentManagementCsv(${state}.filteredManagedStudents)`);
  assert.ok(csv.includes('"Total XP"'));
  assert.ok(csv.includes(`"${student.xp}"`));
  await evaluate(`${state}.studentSearch = ''`);
  await pause();
  await viewport(1365);
  await evaluate(`(() => {
    const app = ${state};
    const index = app.filteredManagedStudents.findIndex(student => student.id === ${JSON.stringify(student.id)});
    document.querySelectorAll('.student-management-table tbody tr')[index].querySelector('.overview-action').click();
  })()`);
  const detailLoaded = `(() => { const app = ${state}; return app.showStudentDetailModal && !app.studentDetailLoading && !app.studentDetailError ? app.selectedStudentDetail : null; })()`;
  assert.deepEqual(await waitFor(detailLoaded), student);
  await pause();
  const modalVisibility = await evaluate("({opacity: getComputedStyle(document.querySelector('.instructor-review-overlay[role=dialog]')).opacity, height: document.querySelector('.student-management-detail').getBoundingClientRect().height})");
  assert.equal(modalVisibility.opacity, '1');
  assert.ok(modalVisibility.height > 200);
  assert.deepEqual(await evaluate("[...document.querySelectorAll('.student-summary-value')].map(element => element.textContent.trim())"),
    [`${student.missionsCompleted}/${student.missionsTotal}`, `${student.quizzesCompleted}/${student.quizzesTotal}`, String(student.badgesEarned), String(student.certificates)]);
  await screenshot('records-1365');
  for (const tab of ['missions', 'quizzes']) {
    await evaluate(`${state}.studentDetailTab = ${JSON.stringify(tab)}`);
    await pause();
    const rows = await evaluate("document.querySelectorAll('.student-management-detail .student-missions-table tbody tr').length");
    assert.equal(rows, student[tab + 'Detail'].length);
  }
  await viewport(375);
  await screenshot('records-375');
  assert.ok(!(await evaluate("document.querySelector('.student-management-detail').textContent")).includes('Invalid Date'));
  await evaluate(`${state}.closeStudentDetail()`);
  await pause();
  await evaluate("document.querySelector('.student-management-panel .overview-action').click()");
  assert.deepEqual(await waitFor(loaded), expected);
  await evaluate(`${state}.selectInstructorTab('overview')`);
  await pause();
  await evaluate(`${state}.selectInstructorTab('students')`);
  assert.deepEqual(await waitFor(loaded), expected);
  const { data: after } = await fetchJson(`http://localhost:3001/api/v1/instructors/${encodeURIComponent(account.id)}/student-management`);
  assert.deepEqual(after, expected);
  console.log(JSON.stringify({ students: enrolled.length, xp: student.xp, rank: student.rank,
    missions: `${student.missionsCompleted}/${student.missionsTotal}`, quizzes: `${student.quizzesCompleted}/${student.quizzesTotal}`,
    quizzesPassed: student.quizzesPassed, viewports: [1365, 1024, 768, 375], recordsMatchBackend: true,
    csvMatches: true, refreshConsistent: true, reopenConsistent: true, databaseProjectionUnchanged: true, screenshots: output }));
} catch (error) {
  console.error(JSON.stringify({ browserErrors, page: await evaluate("({url: location.href, title: document.title, body: document.body?.innerText.slice(0,600)})") }));
  await screenshot('verification-error');
  throw error;
} finally {
  // Edge may close its CDP socket before acknowledging Browser.close.
  await Promise.race([send('Browser.close'), new Promise(resolve => setTimeout(resolve, 1000))]);
  socket.close();
}
