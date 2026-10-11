// Read-only check of the actual Vue app. Requires a hidden browser on CDP port 9225.
import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';

const target = (await (await fetch('http://localhost:9225/json/list')).json()).find(tab => tab.type === 'page');
const socket = new WebSocket(target.webSocketDebuggerUrl);
await new Promise(resolve => socket.addEventListener('open', resolve, { once: true }));
let sequence = 0;
const pending = new Map();
socket.addEventListener('message', event => {
  const message = JSON.parse(event.data);
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
  // Serialize in the page: CDP returnByValue alone does not unwrap Vue proxies.
  const result = await send('Runtime.evaluate', { expression: `JSON.stringify(${expression})`, returnByValue: true });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
  return result.result.value === undefined ? undefined : JSON.parse(result.result.value);
}
const pause = () => new Promise(resolve => setTimeout(resolve, 300));
async function loaded() {
  for (let attempt = 0; attempt < 60; attempt++) {
    const result = await evaluate(`(() => {
      const state = document.getElementById('app')?.__vue_app__?._instance?.setupState;
      return state && !state.instructorOverviewLoading && state.instructorOverview ? {
        summary: state.instructorOverview, cards: document.querySelectorAll('.dashboard-stat-card').length,
        values: [...document.querySelectorAll('.dashboard-stat-number')].map(element => element.textContent),
        missionCards: document.querySelectorAll('.dashboard-mission-card').length
      } : null;
    })()`);
    if (result) return result;
    await pause();
  }
  throw new Error('Instructor overview did not load');
}
try {
  await send('Page.enable');
  await send('Runtime.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: 1365, height: 900, deviceScaleFactor: 1, mobile: false });
  // Stop the unrelated 3D render loop only in the isolated test browser.
  await send('Page.addScriptToEvaluateOnNewDocument', { source: 'window.requestAnimationFrame=()=>0;' });
  await send('Page.navigate', { url: 'http://localhost:5174' });
  let ready = false;
  for (let attempt = 0; attempt < 60; attempt++) {
    ready = await evaluate("!!document.getElementById('app')?.__vue_app__?._instance?.setupState");
    if (ready) break;
    await pause();
  }
  assert.ok(ready);
  const { instructors } = await (await fetch('http://localhost:3001/api/v1/instructors')).json();
  let account, expected;
  for (const instructor of instructors) {
    const response = await fetch(`http://localhost:3001/api/v1/instructors/${encodeURIComponent(instructor.id)}/overview`);
    assert.equal(response.status, 200);
    const summary = await response.json();
    if (!account || summary.totalStudents > 0) { account = instructor; expected = summary; }
    if (summary.totalStudents > 0) break;
  }
  assert.ok(account);
  // Match the actual login state order without authenticating or writing records.
  await evaluate(`(() => {
    const state = document.getElementById('app').__vue_app__._instance.setupState;
    state.userRole = 'instructor';
    state.currentUser = ${JSON.stringify({ id: account.id, name: account.name })};
    state.activeScreen = 'dashboard';
  })()`);
  const first = await loaded();
  assert.deepEqual(first.summary, expected);
  assert.equal(first.cards, 4);
  assert.equal(first.missionCards, expected.missionProgress.length);
  console.log(JSON.stringify({ cards: first.cards, values: first.values, missionCards: first.missionCards, backendMatches: true }));
  await evaluate("document.querySelector('.overview-toolbar button').click()");
  assert.deepEqual((await loaded()).summary, expected);
  await evaluate("document.getElementById('app').__vue_app__._instance.setupState.selectInstructorTab('missions')");
  let missionView;
  for (let attempt = 0; attempt < 60; attempt++) {
    missionView = await evaluate(`(() => {
      const state = document.getElementById('app').__vue_app__._instance.setupState;
      if (state.missionQuizzesLoading || state.missionQuizzes === null) return null;
      return { quizCount: state.missionQuizzes.length,
        labels: [...document.querySelectorAll('.instructor-missions-panel .instructor-mission-btn--quiz')].map(button => button.textContent.trim()),
        missingLabel: state.getQuizButtonText('verification-mission-without-quiz'),
        expectedLabels: state.trainingModules.map(module => state.missionQuizzes.some(quiz =>
          (Array.isArray(quiz.moduleId) ? quiz.moduleId : [quiz.moduleId]).includes(module.id)) ? 'Update Quiz' : 'Create Quiz') };
    })()`);
    if (missionView && missionView.labels.length === expected.missionProgress.length) break;
    await pause();
  }
  assert.ok(missionView);
  assert.equal(missionView.labels.length, expected.missionProgress.length);
  assert.equal(missionView.missingLabel, 'Create Quiz');
  missionView.labels.forEach((label, index) => assert.ok(label.endsWith(missionView.expectedLabels[index])));
  // Open an existing quiz only; creating or saving test records is deliberately excluded.
  await evaluate(`(() => {
    const buttons = [...document.querySelectorAll('.instructor-missions-panel .instructor-mission-btn--quiz')];
    buttons.find(button => button.textContent.includes('Update Quiz'))?.click();
  })()`);
  let editor;
  for (let attempt = 0; attempt < 60; attempt++) {
    editor = await evaluate(`(() => {
      const state = document.getElementById('app').__vue_app__._instance.setupState;
      const quiz = state.quizEditorModal?.quiz;
      if (!quiz) return null;
      const saved = state.missionQuizzes.find(record => record.id === quiz.id);
      return { existingId: !!saved, questionCount: quiz.questions.length, savedQuestionCount: saved?.questions.length };
    })()`);
    if (editor) break;
    await pause();
  }
  assert.ok(editor?.existingId);
  assert.equal(editor.questionCount, editor.savedQuestionCount);
  console.log(JSON.stringify({ quizCount: missionView.quizCount, quizLabels: missionView.expectedLabels,
    missingQuizLabel: missionView.missingLabel, existingQuizOpened: true }));
  await evaluate("document.getElementById('app').__vue_app__._instance.setupState.quizEditorModal = null");
  await evaluate("document.getElementById('app').__vue_app__._instance.setupState.selectInstructorTab('overview')");
  await pause();
  assert.deepEqual((await loaded()).summary, expected);
  const screenshotPath = process.argv[2];
  if (screenshotPath) {
    const screenshot = await send('Page.captureScreenshot', { format: 'png' });
    writeFileSync(screenshotPath, Buffer.from(screenshot.data, 'base64'));
  }
  console.log(JSON.stringify({ refreshConsistent: true, reopenConsistent: true }));
} finally {
  await send('Browser.close');
  socket.close();
}
