// Render the actual student overview markup/styles without loading the 3D scene.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import assert from 'node:assert/strict';
import * as Vue from 'vue';
import { renderToString } from '@vue/server-renderer';
import { compile } from '@vue/compiler-dom';
import { parse } from '@vue/compiler-sfc';
import { deriveProgression, studentTotalXp } from '../shared/progression.js';
import { getStudentDisplayBadges, getStudentCertificates } from '../src/helpers/studentMotivation.js';
import { buildInstructorOverview } from '../backend/services/instructorOverview.js';

const source = readFileSync(new URL('../src/App.vue', import.meta.url), 'utf8').replace(/\r\n/g, '\n');
const leaderboard = process.argv.includes('--leaderboard');
const instructor = process.argv.includes('--instructor');
const previewName = instructor ? 'instructor' : leaderboard ? 'leaderboard' : 'overview';
const bindingsStart = source.indexOf('const studentBadgeList = computed(');
const bindingsEnd = source.indexOf('const studentProfileExtras = computed(', bindingsStart);
const dependencies = {
  currentUser: Vue.ref({ id: 'student', xp: 0 }), userRole: Vue.ref('student'),
  progressData: Vue.ref({ studentProfiles: {}, sessions: [], courseSettings: {} }),
  demoStudent: Vue.ref({ name: 'Kevin ben', completed: 2, certificates: 0 }),
  computed: Vue.computed, watch: Vue.watch, deriveProgression, studentTotalXp,
  getStudentDisplayBadges, getStudentCertificates
};
const bindings = new Function(...Object.keys(dependencies), `${source.slice(bindingsStart, bindingsEnd)}
return { studentBadgeList, profileBadge, studentProgression, rankBadges, xpProgress };`)(...Object.values(dependencies));
const templateStart = source.indexOf('<div v-else class="missions-hub missions-hub--with-sidebar"');
const templateEnd = source.indexOf('</section>', source.indexOf('id="hub-badges"', templateStart)) + '</section>'.length;
const leaderboardStart = source.lastIndexOf('<section', source.indexOf('id="hub-leaderboards"', templateStart));
const leaderboardEnd = source.indexOf('</section>', leaderboardStart) + '</section>'.length;
const overviewStart = source.lastIndexOf('<section', source.indexOf('id="hub-badges"', templateStart));
const instructorStart = source.indexOf('<div class="missions-hub missions-hub--with-sidebar"');
const instructorEnd = source.indexOf('<section v-show="instructorTab === \'missions\'"', instructorStart);
const template = (instructor ? source.slice(instructorStart, instructorEnd) : leaderboard
  ? source.slice(templateStart, overviewStart) + source.slice(leaderboardStart, leaderboardEnd)
  : source.slice(templateStart, templateEnd)).replace('<div v-else ', '<div ') + '</div></div>';
const students = ['Kevin ben', 'Kevin O. Caidic', 'Another Student'].map((name, index) => ({
  id: index ? `student-${index}` : 'student', name, rank: 'Deck Cadet', xp: 0, avgScore: 30
}));
const instructorData = buildInstructorOverview({
  instructorId: 'teacher', students: students.map(student => ({ ...student, instructorid: 'teacher', status: 'active' })),
  missions: [{ id: 'm1', title: 'Mission 1: New Mission' }, { id: 'm2', title: 'Test Mission 2' }],
  missionScores: [
    { id: 'result1', studentId: 'student', missionId: 'CUSTOM-m1', score: 80, passed: true, completedAt: '2026-10-06T01:00:00Z' },
    { id: 'result2', studentId: 'student-1', missionId: 'm2', score: 60, passed: false, completedAt: '2026-10-06T02:00:00Z' }
  ], quizScores: [{ id: 'quiz1', quizId: 'q1', studentId: 'student', quizTitle: 'Navigation Quiz', 'Quiz-score-percentage': 100, passed: true, completedAt: '2026-10-06T00:00:00Z' }]
});
const { code } = compile(template, { mode: 'function', prefixIdentifiers: true });
const component = { render: new Function('Vue', code)(Vue), setup: () => ({
  ...bindings, demoStudent: dependencies.demoStudent, currentUser: instructor ? { name: 'Scarlet' } : dependencies.currentUser,
  instructorTab: 'overview', instructorOverview: instructorData, instructorOverviewLoading: false,
  instructorOverviewError: '', trainingModules: [{}, {}], pendingStudentSignups: [],
  selectInstructorTab() {}, fetchInstructorOverview() {},
  hubTab: previewName === 'overview' ? 'overview' : 'leaderboards', sidebarCollapsed: false, studentProfileExtras: { studentId: 'Dnsc00334-2026' },
  leaderboardTab: 'global', globalLeaderboard: students, myClassLeaderboard: students,
  currentUserGlobalRank: { rank: 1, xp: 0, avgScore: 30 }, currentInstructorName: 'Instructor',
  navigationMissions: [{}, {}, {}], selectHubTab() {}, signOut() {}, formatCertificateDate: date => date
}) };
const markup = await renderToString(Vue.createSSRApp(component));
const styles = parse(source).descriptor.styles.map(style => style.content).join('\n');
const baseStyles = readFileSync(new URL('../src/style.css', import.meta.url), 'utf8');
const directory = resolve('..', '.tmp', 'student-overview-preview');
mkdirSync(directory, { recursive: true });
const previewPath = resolve(directory, `${previewName}.html`);
writeFileSync(previewPath, `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>${baseStyles}\n${styles}</style></head><body><div class="simulation-container"><div class="scene-overlay dashboard-overlay">${markup}</div></div></body></html>`);
console.log(`Preview: ${previewPath}`);

if (process.argv.includes('--browser')) {
  const targets = await (await fetch('http://127.0.0.1:9225/json/list')).json();
  const socket = new WebSocket(targets.find(target => target.type === 'page').webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { socket.addEventListener('open', resolve, { once: true }); socket.addEventListener('error', reject, { once: true }); });
  let sequence = 0;
  const pending = new Map();
  socket.addEventListener('message', event => {
    const message = JSON.parse(event.data);
    if (!message.id) return;
    const request = pending.get(message.id);
    pending.delete(message.id);
    if (message.error) request.reject(new Error(message.error.message));
    else request.resolve(message.result);
  });
  function send(method, params = {}) {
    return new Promise((resolve, reject) => { const id = ++sequence; pending.set(id, { resolve, reject }); socket.send(JSON.stringify({ id, method, params })); });
  }
  try {
    await send('Page.enable');
    await send('Page.navigate', { url: pathToFileURL(previewPath).href });
    for (const width of [1365, 1024, 768, 375]) {
      await send('Emulation.setDeviceMetricsOverride', { width, height: 900, deviceScaleFactor: 1, mobile: false });
      const ready = await send('Runtime.evaluate', { expression: `new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve(document.querySelectorAll('.rank-card').length))))`, awaitPromise: true });
      assert.equal(ready.result.value, leaderboard || instructor ? 0 : 8);
      if (instructor) {
        const result = await send('Runtime.evaluate', { expression: `JSON.stringify({
          overflow: ['.dashboard-overlay','.missions-main','.instructor-overview','.overview-detail-grid'].map(selector=>{const element=document.querySelector(selector);return {selector,width:element.clientWidth,scrollWidth:element.scrollWidth};}),
          cardHeights: Array.from(document.querySelectorAll('.dashboard-stat-card'),card=>card.getBoundingClientRect().height),
          cardValues: Array.from(document.querySelectorAll('.dashboard-stat-number'),card=>card.textContent),
          missionPercentages: Array.from(document.querySelectorAll('.dashboard-mission-percent'),card=>card.textContent)
        })` });
        const metrics = JSON.parse(result.result.value);
        assert.ok(metrics.overflow.every(element => element.scrollWidth <= element.width + 1), JSON.stringify({ width, ...metrics }));
        assert.equal(metrics.cardHeights.length, 4);
        assert.ok(Math.max(...metrics.cardHeights) - Math.min(...metrics.cardHeights) <= 1);
        assert.deepEqual(metrics.cardValues, ['3','1','1','17%']);
        assert.deepEqual(metrics.missionPercentages, ['33%','0%']);
        const screenshot = await send('Page.captureScreenshot', { format: 'png' });
        writeFileSync(resolve(directory, `${previewName}-${width}.png`), Buffer.from(screenshot.data, 'base64'));
        console.log(JSON.stringify({ viewportWidth: width, ...metrics }));
        continue;
      }
      if (leaderboard) {
        const result = await send('Runtime.evaluate', { expression: `JSON.stringify({
          overflow: ['.dashboard-overlay','.missions-main','.leaderboards-section','.leaderboard-card:last-child'].map(selector => {const element=document.querySelector(selector);return {selector,width:element.clientWidth,scrollWidth:element.scrollWidth};}),
          card: {width:document.querySelector('.global-rank-card').getBoundingClientRect().width,height:document.querySelector('.global-rank-card').getBoundingClientRect().height},
          columns: Array.from(document.querySelectorAll('.leaderboard-card:last-child .leaderboard-item'),row=>row.children.length),
          text: document.querySelector('.leaderboard-card:last-child').textContent
        })` });
        const metrics = JSON.parse(result.result.value);
        assert.ok(metrics.overflow.every(element => element.scrollWidth <= element.width + 1), JSON.stringify({ width, ...metrics }));
        assert.ok(metrics.card.width <= 360 && metrics.card.height <= 90, JSON.stringify({ width, ...metrics }));
        assert.ok(metrics.columns.every(columns => columns === 4));
        assert.ok(!/Avg|30%/i.test(metrics.text));
        const screenshot = await send('Page.captureScreenshot', { format: 'png' });
        writeFileSync(resolve(directory, `${previewName}-${width}.png`), Buffer.from(screenshot.data, 'base64'));
        console.log(JSON.stringify({ viewportWidth: width, ...metrics }));
        continue;
      }
      const result = await send('Runtime.evaluate', { expression: `JSON.stringify({
        overflow: ['.dashboard-overlay','.missions-main','.motivation-panel','.badge-grid','.rank-grid'].map(selector => { const element=document.querySelector(selector);return {selector,width:element.clientWidth,scrollWidth:element.scrollWidth}; }),
        rankHeight: Math.max(...Array.from(document.querySelectorAll('.rank-card'),card=>card.getBoundingClientRect().height)),
        profileCards: ['.student-profile-rank-card','.student-profile-badge-large'].map(selector => {
          const { width, height, top } = document.querySelector(selector).getBoundingClientRect();
          return { width, height, top };
        }),
        badges:document.querySelectorAll('.badge-grid:not(.rank-grid) > li').length,
        badgeTitles:Array.from(document.querySelectorAll('.badge-grid:not(.rank-grid) .badge-card-title'),element=>element.textContent)
      })` });
      const metrics = JSON.parse(result.result.value);
      assert.ok(metrics.overflow.every(element => element.scrollWidth <= element.width + 1), JSON.stringify({ width, ...metrics }));
      assert.ok(metrics.rankHeight <= 110, JSON.stringify({ width, ...metrics }));
      const [rankCard, badgeCard] = metrics.profileCards;
      for (const dimension of ['width', 'height', 'top']) {
        assert.ok(Math.abs(rankCard[dimension] - badgeCard[dimension]) <= 1, JSON.stringify({ width, ...metrics }));
      }
      assert.equal(metrics.badges, 8);
      assert.ok(!metrics.badgeTitles.includes('Ordinary Seaman (OS)'));
      const screenshot = await send('Page.captureScreenshot', { format: 'png' });
      writeFileSync(resolve(directory, `overview-${width}.png`), Buffer.from(screenshot.data, 'base64'));
      console.log(JSON.stringify({ viewportWidth: width, ...metrics }));
    }
  } finally {
    await send('Browser.close');
    socket.close();
  }
}
