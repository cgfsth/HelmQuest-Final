import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as Vue from 'vue';
import { renderToString } from '@vue/server-renderer';
import { compile } from '@vue/compiler-dom';
import { deriveProgression, studentTotalXp } from '../shared/progression.js';
import { getStudentDisplayBadges, getStudentCertificates } from '../src/helpers/studentMotivation.js';

// Exercise the actual App.vue reactive bindings and overview markup without WebGL.
const source = readFileSync(new URL('../src/App.vue', import.meta.url), 'utf8').replace(/\r\n/g, '\n');
const bindingsStart = source.indexOf('const studentBadgeList = computed(');
const bindingsEnd = source.indexOf('const studentProfileExtras = computed(', bindingsStart);
const bindingsSource = source.slice(bindingsStart, bindingsEnd);
const templateStart = source.lastIndexOf('<section', source.indexOf('id="hub-badges"'));
const templateEnd = source.indexOf('</section>', templateStart) + '</section>'.length;
const template = source.slice(templateStart, templateEnd);
const { code } = compile(template, { mode: 'function', prefixIdentifiers: true });
const render = new Function('Vue', code)(Vue);

function dashboard(student, localXp = 0) {
  const currentUser = Vue.ref(student);
  const userRole = Vue.ref('student');
  const progressData = Vue.ref({ studentProfiles: { student: { xp: localXp, badges: [], certificates: [] } }, sessions: [], courseSettings: {} });
  const demoStudent = Vue.ref({ name: 'Student' });
  const dependencies = { currentUser, userRole, progressData, demoStudent, computed: Vue.computed, watch: Vue.watch,
    deriveProgression, studentTotalXp, getStudentDisplayBadges, getStudentCertificates };
  const bindings = new Function(...Object.keys(dependencies), `${bindingsSource}\nreturn { studentBadgeList, profileBadge, totalXP, currentRank, rankBadges, xpProgress, studentProgression };`)(...Object.values(dependencies));
  const component = { render, setup: () => ({ ...bindings, demoStudent, hubTab: 'overview', studentProfileExtras: { studentId: 'STU-1' }, formatCertificateDate: date => date }) };
  return { currentUser, demoStudent, bindings, html: () => renderToString(Vue.createSSRApp(component)) };
}

test('overview renders Deck Cadet and earned Welcome Aboard at 0 XP, including profile badge styling', async () => {
  const view = dashboard({ id: 'student', xp: 0, rank: 'Master / Captain', badges: [{ id: 'welcome-aboard' }] }, 10000);
  const html = await view.html();
  assert.equal(view.demoStudent.value.rank, 'Deck Cadet');
  assert.equal(view.bindings.totalXP.value, 0);
  assert.equal(view.bindings.profileBadge.value.earned, true);
  assert.equal(view.demoStudent.value.badgesEarned, 1);
  assert.match(html, /class="badge-card badge-card--earned"[^]*?Welcome Aboard[^]*?✓ EARNED/);
  assert.doesNotMatch(html, /student-profile-badge--placeholder/);
  assert.equal(view.bindings.studentBadgeList.value.length, 8);
  assert.ok(view.bindings.studentBadgeList.value.every(badge => !badge.id.startsWith('rank-')));
  assert.match(html, /500 XP Required/);
});

test('reactive promotion updates rank, progress, cards and badges together, retaining Welcome Aboard', async () => {
  const view = dashboard({ id: 'student', xp: 499 });
  assert.equal(view.demoStudent.value.rank, 'Deck Cadet');
  assert.equal(view.bindings.rankBadges.value[1].state, 'locked');
  view.currentUser.value = { id: 'student', xp: 500 };
  await Vue.nextTick();
  assert.equal(view.demoStudent.value.rank, 'Ordinary Seaman (OS)');
  assert.equal(view.demoStudent.value.xpNextAt, 1000);
  assert.equal(view.demoStudent.value.badgesEarned, 1);
  assert.equal(view.bindings.rankBadges.value[1].state, 'current');
  assert.ok(view.bindings.studentBadgeList.value.every(badge => !badge.id.startsWith('rank-')));
  assert.equal(view.bindings.studentBadgeList.value.find(badge => badge.id === 'welcome-aboard').earned, true);
  view.currentUser.value = { id: 'student', xp: 7500 };
  await Vue.nextTick();
  assert.equal(view.demoStudent.value.rank, 'Chief Officer (C/O)');
  assert.equal(view.demoStudent.value.badgesEarned, 1);
  assert.equal(view.bindings.rankBadges.value.filter(rank => rank.state !== 'locked').length, 7);
  assert.equal(view.bindings.xpProgress.value.nextAt, 10000);
  assert.equal(view.bindings.xpProgress.value.percent, 17);
  const html = await view.html();
  assert.match(html, /10000 XP Required/);
});

test('legacy local student profiles use the same fallback XP for rank and badge eligibility', async () => {
  const view = dashboard({ id: 'student' }, 2000);
  await view.html();
  assert.equal(view.demoStudent.value.rank, 'Bosun');
  assert.equal(view.demoStudent.value.xp, 2000);
  assert.equal(view.demoStudent.value.badgesEarned, 1);
  assert.equal(view.bindings.rankBadges.value.filter(rank => rank.state !== 'locked').length, 4);
});
