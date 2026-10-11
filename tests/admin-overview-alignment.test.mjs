import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as Vue from 'vue';
import { compile } from '@vue/compiler-dom';
import { renderToString } from '@vue/server-renderer';

const dashboardSource = readFileSync(new URL('../src/components/admin/AdminDashboard.vue', import.meta.url), 'utf8');
const overviewSource = readFileSync(new URL('../src/components/admin/SystemOverview.vue', import.meta.url), 'utf8');
const templateBlock = overviewSource.slice(overviewSource.indexOf('<template>') + '<template>'.length, overviewSource.indexOf('<script setup>'));
const template = templateBlock.replace(/<\/template>\s*$/, '');
assert.ok(template, 'SystemOverview template should be available');
const render = new Function('Vue', compile(template, { mode: 'function', prefixIdentifiers: true }).code)(Vue);

function overview(stats) {
  const count = value => Number.isFinite(Number(value)) ? Math.max(0, Number(value)) : 0;
  const parseTrendDate = value => {
    const match = String(value || '').slice(0, 10).match(/^(\d{4})-(\d{2})-(\d{2})$/);
    return match ? new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3])) : null;
  };
  const attentionItems = Vue.computed(() => [
    { key: 'pendingStudents', icon: 'P', label: 'Pending students', help: 'Waiting for review.', value: count(stats.attention.pendingStudents) },
    { key: 'inactiveInstructors', icon: 'I', label: 'Inactive instructors', help: 'Cannot sign in.', value: count(stats.attention.inactiveInstructors) },
    { key: 'unassignedStudents', icon: 'U', label: 'Unassigned students', help: 'Need an instructor.', value: count(stats.attention.unassignedStudents) },
    { key: 'missionsWithoutQuiz', icon: 'M', label: 'Missions without a quiz', help: 'Need a quiz.', value: count(stats.attention.missionsWithoutQuiz) }
  ]);
  return renderToString(Vue.createSSRApp({
    render,
    setup: () => ({
      stats,
      loading: false,
      error: '',
      attentionItems,
      visibleAttentionItems: Vue.computed(() => attentionItems.value.filter(item => item.value > 0)),
      attentionTotal: Vue.computed(() => attentionItems.value.reduce((total, item) => total + item.value, 0)),
      trainingTrend: Vue.computed(() => [...stats.trainingTrend].sort((left, right) => left.date.localeCompare(right.date))),
      recentResults: Vue.computed(() => stats.recentResults),
      trendMonthLabel: Vue.computed(() => 'October 2026'),
      count,
      trendHeight: value => value ? '100%' : '3px',
      formatWeekday: value => parseTrendDate(value).toLocaleDateString('en-PH', { weekday: 'short' }),
      formatShortDate: value => parseTrendDate(value).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' }),
      formatFullDate: value => parseTrendDate(value).toLocaleDateString('en-PH', { month: 'long', day: 'numeric', year: 'numeric' }),
      formatActivityLabel: day => `${day.completions} mission passes on ${day.date}`,
      formatTimestamp: value => value,
      hasScore: value => value !== null && value !== undefined && Number.isFinite(Number(value)),
      statusClass: status => `status-${String(status).toLowerCase()}`
    })
  }));
}

test('admin overview renders actual aligned account, course and saved-result metrics', async () => {
  const html = await overview({
    students: { total: 3, active: 3, pending: 0, inactive: 0 },
    instructors: { total: 3, active: 2, inactive: 1 },
    missions: { total: 3 },
    quizzes: { total: 3 },
    progress: { studentsStarted: 1, missionPasses: 3, quizzesTaken: 3, quizzesPassed: 2 },
    attention: { pendingStudents: 0, inactiveInstructors: 1, unassignedStudents: 0, missionsWithoutQuiz: 0 },
    trainingTrend: [{ date: '2026-10-08', completions: 3 }],
    recentResults: [{ id: 'saved-1', studentName: 'Kevin ben', type: 'Mission', title: 'Test Mission 3', status: 'Passed', score: 100, timestamp: '2026-10-08' }]
  });

  assert.match(html, /Students/);
  assert.match(html, /3 active/);
  assert.match(html, /2 active/);
  assert.match(html, /1 inactive/);
  assert.match(html, /3 unique passed results/);
  assert.match(html, /3 submitted/);
  assert.match(html, /Kevin ben/);
  assert.match(html, /Test Mission 3/);
  assert.match(html, /100%/);
  assert.doesNotMatch(html, /65|Average per Day|Student Status Distribution/);
});

test('admin overview uses real API data with a bounded request and clear retry state', () => {
  assert.match(dashboardSource, /System Overview/);
  assert.match(dashboardSource, /currentSection\.title/);
  assert.match(dashboardSource, /'x-user-id': adminId\.value/);
  assert.match(dashboardSource, /20_000/);
  assert.match(dashboardSource, /AbortController/);
  assert.match(dashboardSource, /statsError/);
  assert.match(overviewSource, /Could not refresh the system overview/);
  assert.match(overviewSource, /Try again/);
  assert.doesNotMatch(overviewSource, /chart\.js|mock data|Mission Completion Trend|Student Status Distribution/i);
});

test('overview is compact and includes responsive small-screen layouts', () => {
  assert.match(overviewSource, /min-height: 138px/);
  assert.match(overviewSource, /@media \(max-width: 680px\)/);
  assert.match(dashboardSource, /@media \(max-width: 900px\)/);
  assert.doesNotMatch(overviewSource, /height:\s*300px|width="400" height="400"/);
});

test('training activity shows only the month above exact chronological daily dates', async () => {
  const html = await overview({
    students: {}, instructors: {}, missions: {}, quizzes: {}, progress: {},
    attention: { pendingStudents: 0, inactiveInstructors: 0, unassignedStudents: 0, missionsWithoutQuiz: 0 },
    trainingTrend: [
      { date: '2026-10-11', completions: 0 },
      { date: '2026-10-07', completions: 1 },
      { date: '2026-10-05', completions: 2 },
      { date: '2026-10-06', completions: 0 },
      { date: '2026-10-10', completions: 0 },
      { date: '2026-10-08', completions: 0 },
      { date: '2026-10-09', completions: 0 }
    ],
    recentResults: []
  });
  assert.match(html, /October 2026/);
  assert.doesNotMatch(html, /Oct 2–8, 2026/);
  const dailyDates = [...html.matchAll(/datetime="(2026-10-\d+)"/g)].map(match => match[1]);
  assert.deepEqual(dailyDates, ['2026-10-05', '2026-10-06', '2026-10-07', '2026-10-08', '2026-10-09', '2026-10-10', '2026-10-11']);
  assert.match(html, /Monday to Sunday/);
  assert.match(overviewSource, /localeCompare/);
  assert.match(overviewSource, /formatMonthSpan/);
  assert.doesNotMatch(overviewSource, /trendDateRange|formatDateRange/);
});
