<template>
  <div class="admin-overview-shell" :aria-busy="loading ? 'true' : 'false'">
    <div v-if="error" class="admin-overview-alert" role="alert">
      <div>
        <strong>Could not refresh the system overview</strong>
        <p>{{ error }}</p>
      </div>
      <button type="button" @click="$emit('retry')">Try again</button>
    </div>

    <div v-if="loading && !stats" class="admin-overview-loading" role="status">
      <span class="admin-loading-spinner" aria-hidden="true"></span>
      <div>
        <strong>Loading system records</strong>
        <p>Reading the latest accounts and saved training results…</p>
      </div>
    </div>

    <template v-if="stats">
      <p v-if="loading" class="admin-overview-refreshing" role="status">Refreshing system totals…</p>

      <section class="admin-overview-stats-grid" aria-label="System totals">
        <article class="admin-stat-card admin-stat-card--students">
          <div class="admin-stat-card-heading">
            <span class="admin-stat-icon" aria-hidden="true">👥</span>
            <span class="admin-stat-label">Students</span>
          </div>
          <strong class="admin-stat-value">{{ count(stats.students?.total) }}</strong>
          <div class="admin-stat-details">
            <span class="admin-status-dot admin-status-dot--active"></span>
            {{ count(stats.students?.active) }} active
            <span>·</span>
            {{ count(stats.students?.pending) }} pending
            <span>·</span>
            {{ count(stats.students?.inactive) }} inactive
          </div>
        </article>

        <article class="admin-stat-card admin-stat-card--instructors">
          <div class="admin-stat-card-heading">
            <span class="admin-stat-icon" aria-hidden="true">🧑‍🏫</span>
            <span class="admin-stat-label">Instructors</span>
          </div>
          <strong class="admin-stat-value">{{ count(stats.instructors?.total) }}</strong>
          <div class="admin-stat-details">
            <span class="admin-status-dot admin-status-dot--active"></span>
            {{ count(stats.instructors?.active) }} active
            <span>·</span>
            {{ count(stats.instructors?.inactive) }} inactive
          </div>
        </article>

        <article class="admin-stat-card admin-stat-card--missions">
          <div class="admin-stat-card-heading">
            <span class="admin-stat-icon" aria-hidden="true">🧭</span>
            <span class="admin-stat-label">Missions</span>
          </div>
          <strong class="admin-stat-value">{{ count(stats.missions?.total) }}</strong>
          <div class="admin-stat-details">
            {{ count(stats.progress?.missionPasses) }} unique passed results
          </div>
        </article>

        <article class="admin-stat-card admin-stat-card--quizzes">
          <div class="admin-stat-card-heading">
            <span class="admin-stat-icon" aria-hidden="true">📝</span>
            <span class="admin-stat-label">Quizzes</span>
          </div>
          <strong class="admin-stat-value">{{ count(stats.quizzes?.total) }}</strong>
          <div class="admin-stat-details">
            {{ count(stats.progress?.quizzesTaken) }} submitted · {{ count(stats.progress?.quizzesPassed) }} passed
          </div>
        </article>
      </section>

      <div class="admin-overview-main-grid">
        <section class="admin-overview-panel admin-attention-panel">
          <div class="admin-panel-heading">
            <div>
              <h2>Needs Attention</h2>
              <p>Account and course items that may need admin action.</p>
            </div>
            <span class="admin-panel-count" :class="{ 'admin-panel-count--clear': attentionTotal === 0 }">
              {{ attentionTotal }}
            </span>
          </div>

          <div v-if="attentionTotal === 0" class="admin-clear-state">
            <span aria-hidden="true">✓</span>
            <div>
              <strong>No pending admin items</strong>
              <p>Accounts and course links are currently in order.</p>
            </div>
          </div>

          <div v-else class="admin-attention-list">
            <div v-for="item in visibleAttentionItems" :key="item.key" class="admin-attention-item">
              <span class="admin-attention-icon" aria-hidden="true">{{ item.icon }}</span>
              <div>
                <strong>{{ item.label }}</strong>
                <p>{{ item.help }}</p>
              </div>
              <span class="admin-attention-value">{{ item.value }}</span>
            </div>
          </div>
        </section>

        <section class="admin-overview-panel admin-training-panel">
          <div class="admin-panel-heading">
            <div>
              <h2>Training Activity</h2>
              <p>Saved progress across the system; daily mission passes for this week, Monday to Sunday.</p>
            </div>
            <div class="admin-training-period" aria-label="Displayed month">
              <strong>{{ trendMonthLabel }}</strong>
            </div>
          </div>

          <div class="admin-progress-summary">
            <div>
              <span>Students started</span>
              <strong>{{ count(stats.progress?.studentsStarted) }}</strong>
            </div>
            <div>
              <span>Mission passes</span>
              <strong>{{ count(stats.progress?.missionPasses) }}</strong>
            </div>
            <div>
              <span>Quizzes taken</span>
              <strong>{{ count(stats.progress?.quizzesTaken) }}</strong>
            </div>
            <div>
              <span>Quiz passes</span>
              <strong>{{ count(stats.progress?.quizzesPassed) }}</strong>
            </div>
          </div>

          <div class="admin-mini-chart" aria-label="Mission passes by day">
            <div
              v-for="day in trainingTrend"
              :key="day.date"
              class="admin-mini-chart-day"
              :aria-label="formatActivityLabel(day)"
            >
              <span class="admin-mini-chart-value">{{ count(day.completions) }}</span>
              <div class="admin-mini-chart-track">
                <span
                  class="admin-mini-chart-bar"
                  :class="{ 'admin-mini-chart-bar--empty': count(day.completions) === 0 }"
                  :style="{ height: trendHeight(day.completions) }"
                ></span>
              </div>
              <time class="admin-mini-chart-label" :datetime="day.date" :title="formatFullDate(day.date)">
                <strong>{{ formatWeekday(day.date) }}</strong>
                <span>{{ formatShortDate(day.date) }}</span>
              </time>
            </div>
          </div>
        </section>
      </div>

      <section class="admin-overview-panel admin-results-panel">
        <div class="admin-panel-heading">
          <div>
            <h2>Recent Saved Results</h2>
            <p>Latest mission and quiz records saved by students.</p>
          </div>
        </div>

        <div v-if="recentResults.length" class="admin-results-table" role="table" aria-label="Recent saved results">
          <div class="admin-results-row admin-results-head" role="row">
            <span role="columnheader">Student</span>
            <span role="columnheader">Activity</span>
            <span role="columnheader">Result</span>
            <span role="columnheader">Saved</span>
          </div>
          <div
            v-for="(result, index) in recentResults"
            :key="`${result.type}-${result.id || index}`"
            class="admin-results-row"
            role="row"
          >
            <strong role="cell">{{ result.studentName || 'Student' }}</strong>
            <div role="cell" class="admin-result-activity">
              <span>{{ result.type || 'Result' }}</span>
              <small>{{ result.title || 'Training activity' }}</small>
            </div>
            <div role="cell" class="admin-result-outcome">
              <span class="admin-result-status" :class="statusClass(result.status)">{{ result.status || 'Recorded' }}</span>
              <strong v-if="hasScore(result.score)">{{ result.score }}%</strong>
              <span v-else>—</span>
            </div>
            <time role="cell" :datetime="result.timestamp || undefined">{{ formatTimestamp(result.timestamp) }}</time>
          </div>
        </div>

        <div v-else class="admin-empty-state">
          <span aria-hidden="true">📋</span>
          <strong>No saved training results yet</strong>
          <p>Mission and quiz results will appear here after students submit them.</p>
        </div>
      </section>
    </template>
  </div>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  stats: { type: Object, default: null },
  loading: { type: Boolean, default: false },
  error: { type: String, default: '' }
});

defineEmits(['retry']);

const attentionItems = computed(() => [
  {
    key: 'pendingStudents',
    icon: '⏳',
    label: 'Pending students',
    help: 'Student accounts waiting for review.',
    value: count(props.stats?.attention?.pendingStudents)
  },
  {
    key: 'inactiveInstructors',
    icon: '🧑‍🏫',
    label: 'Inactive instructors',
    help: 'Instructor accounts that cannot currently sign in.',
    value: count(props.stats?.attention?.inactiveInstructors)
  },
  {
    key: 'unassignedStudents',
    icon: '👤',
    label: 'Unassigned students',
    help: 'Students without a valid instructor assignment.',
    value: count(props.stats?.attention?.unassignedStudents)
  },
  {
    key: 'missionsWithoutQuiz',
    icon: '📝',
    label: 'Missions without a quiz',
    help: 'Mission records that do not have a linked quiz.',
    value: count(props.stats?.attention?.missionsWithoutQuiz)
  }
]);

const attentionTotal = computed(() => attentionItems.value.reduce((total, item) => total + item.value, 0));
const visibleAttentionItems = computed(() => attentionItems.value.filter(item => item.value > 0));
const trainingTrend = computed(() => Array.isArray(props.stats?.trainingTrend)
  ? [...props.stats.trainingTrend].sort((left, right) => String(left?.date || '').localeCompare(String(right?.date || '')))
  : []);
const recentResults = computed(() => Array.isArray(props.stats?.recentResults) ? props.stats.recentResults : []);
const maxTrendValue = computed(() => Math.max(1, ...trainingTrend.value.map(day => count(day.completions))));
const trendDates = computed(() => trainingTrend.value.map(day => parseTrendDate(day.date)).filter(Boolean));
const trendMonthLabel = computed(() => formatMonthSpan(trendDates.value));

function count(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
}

function trendHeight(value) {
  const amount = count(value);
  return amount ? `${Math.max(14, Math.round((amount / maxTrendValue.value) * 100))}%` : '3px';
}

function parseTrendDate(value) {
  const match = String(value || '').slice(0, 10).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatWeekday(value) {
  const date = parseTrendDate(value);
  return date ? date.toLocaleDateString('en-PH', { weekday: 'short' }) : '—';
}

function formatShortDate(value) {
  const date = parseTrendDate(value);
  return date ? date.toLocaleDateString('en-PH', { month: 'short', day: 'numeric' }) : String(value || '—');
}

function formatFullDate(value) {
  const date = parseTrendDate(value);
  return date ? date.toLocaleDateString('en-PH', { month: 'long', day: 'numeric', year: 'numeric' }) : 'Unknown date';
}

function formatActivityLabel(day) {
  const amount = count(day?.completions);
  return `${amount} mission ${amount === 1 ? 'pass' : 'passes'} on ${formatFullDate(day?.date)}`;
}

function formatMonthSpan(dates) {
  if (!dates.length) return 'Last 7 days';
  const first = dates[0];
  const last = dates.at(-1);
  const firstMonth = first.toLocaleDateString('en-PH', { month: 'long' });
  const lastMonth = last.toLocaleDateString('en-PH', { month: 'long' });
  const firstYear = first.getFullYear();
  const lastYear = last.getFullYear();
  if (firstMonth === lastMonth && firstYear === lastYear) return `${firstMonth} ${firstYear}`;
  if (firstYear === lastYear) return `${firstMonth} – ${lastMonth} ${lastYear}`;
  return `${firstMonth} ${firstYear} – ${lastMonth} ${lastYear}`;
}

function formatTimestamp(value) {
  if (!value) return 'Unknown time';
  const date = value?.toDate ? value.toDate() : new Date(value);
  if (Number.isNaN(date.getTime())) return 'Unknown time';
  return date.toLocaleString([], {
    month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit'
  });
}

function hasScore(value) {
  return value !== null && value !== undefined && value !== '' && Number.isFinite(Number(value));
}

function statusClass(status) {
  const normalized = String(status || '').toLowerCase();
  if (normalized === 'passed') return 'admin-result-status--passed';
  if (normalized === 'failed') return 'admin-result-status--failed';
  return 'admin-result-status--recorded';
}
</script>

<style scoped>
.admin-overview-shell {
  min-width: 0;
  display: grid;
  gap: 18px;
  color: #e2e8f0;
}

.admin-overview-alert,
.admin-overview-loading,
.admin-overview-refreshing {
  border-radius: 11px;
}

.admin-overview-alert {
  padding: 14px 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  color: #fecaca;
  background: rgba(127, 29, 29, 0.22);
  border: 1px solid rgba(248, 113, 113, 0.42);
}

.admin-overview-alert strong,
.admin-overview-loading strong { color: #f8fafc; }
.admin-overview-alert p,
.admin-overview-loading p { margin: 4px 0 0; font-size: 0.82rem; }

.admin-overview-alert button {
  flex-shrink: 0;
  min-height: 36px;
  padding: 7px 14px;
  color: #fee2e2;
  font: inherit;
  font-size: 0.8rem;
  font-weight: 800;
  background: rgba(239, 68, 68, 0.18);
  border: 1px solid rgba(248, 113, 113, 0.55);
  border-radius: 7px;
  cursor: pointer;
}

.admin-overview-loading {
  min-height: 150px;
  padding: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 14px;
  color: #94a3b8;
  background: rgba(15, 23, 42, 0.68);
  border: 1px solid rgba(71, 104, 132, 0.55);
}

.admin-loading-spinner {
  width: 26px;
  height: 26px;
  border: 3px solid rgba(56, 189, 248, 0.18);
  border-top-color: #38bdf8;
  border-radius: 50%;
  animation: admin-spin 0.8s linear infinite;
}

@keyframes admin-spin { to { transform: rotate(360deg); } }

.admin-overview-refreshing {
  margin: 0;
  padding: 9px 12px;
  color: #7dd3fc;
  font-size: 0.78rem;
  background: rgba(14, 116, 144, 0.12);
  border: 1px solid rgba(56, 189, 248, 0.2);
}

.admin-overview-stats-grid {
  min-width: 0;
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 14px;
}

.admin-stat-card {
  --card-accent: #38bdf8;
  position: relative;
  min-width: 0;
  min-height: 138px;
  padding: 18px;
  display: flex;
  flex-direction: column;
  gap: 9px;
  overflow: hidden;
  background: rgba(15, 23, 42, 0.7);
  border: 1px solid rgba(71, 104, 132, 0.55);
  border-radius: 12px;
  box-shadow: 0 10px 26px rgba(2, 6, 23, 0.18);
}

.admin-stat-card::before {
  content: '';
  position: absolute;
  inset: 0 auto 0 0;
  width: 3px;
  background: var(--card-accent);
}

.admin-stat-card--students { --card-accent: #38bdf8; }
.admin-stat-card--instructors { --card-accent: #34d399; }
.admin-stat-card--missions { --card-accent: #fbbf24; }
.admin-stat-card--quizzes { --card-accent: #a78bfa; }

.admin-stat-card-heading {
  display: flex;
  align-items: center;
  gap: 9px;
}

.admin-stat-icon {
  width: 34px;
  height: 34px;
  display: grid;
  place-items: center;
  font-size: 1.05rem;
  background: color-mix(in srgb, var(--card-accent) 14%, transparent);
  border: 1px solid color-mix(in srgb, var(--card-accent) 28%, transparent);
  border-radius: 9px;
}

.admin-stat-label {
  color: #94a3b8;
  font-size: 0.73rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.admin-stat-value {
  color: #f8fafc;
  font-size: 2rem;
  line-height: 1;
}

.admin-stat-details {
  margin-top: auto;
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 5px;
  color: #94a3b8;
  font-size: 0.76rem;
  line-height: 1.35;
}

.admin-status-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
}
.admin-status-dot--active { background: #34d399; box-shadow: 0 0 7px rgba(52, 211, 153, 0.5); }

.admin-overview-main-grid {
  min-width: 0;
  display: grid;
  grid-template-columns: minmax(280px, 0.85fr) minmax(420px, 1.35fr);
  gap: 18px;
}

.admin-overview-panel {
  min-width: 0;
  padding: 20px;
  background: rgba(15, 23, 42, 0.68);
  border: 1px solid rgba(71, 104, 132, 0.55);
  border-radius: 13px;
  box-shadow: 0 12px 30px rgba(2, 6, 23, 0.18);
}

.admin-panel-heading {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.admin-panel-heading h2 {
  margin: 0;
  color: #f8fafc;
  font-size: 1.04rem;
}

.admin-panel-heading p,
.admin-clear-state p,
.admin-attention-item p,
.admin-empty-state p {
  margin: 5px 0 0;
  color: #8393ac;
  font-size: 0.78rem;
  line-height: 1.45;
}

.admin-training-period {
  flex: 0 0 auto;
  min-height: 32px;
  padding: 7px 13px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  background: rgba(14, 116, 144, 0.1);
  border: 1px solid rgba(56, 189, 248, 0.24);
  border-radius: 999px;
}

.admin-training-period strong {
  color: #bae6fd;
  font-size: 0.74rem;
  line-height: 1;
}

.admin-panel-count {
  min-width: 34px;
  height: 28px;
  padding: 0 8px;
  display: grid;
  place-items: center;
  color: #fde68a;
  font-size: 0.82rem;
  font-weight: 800;
  background: rgba(245, 158, 11, 0.13);
  border: 1px solid rgba(245, 158, 11, 0.35);
  border-radius: 999px;
  box-sizing: border-box;
}

.admin-panel-count--clear {
  color: #6ee7b7;
  background: rgba(16, 185, 129, 0.12);
  border-color: rgba(16, 185, 129, 0.3);
}

.admin-clear-state {
  min-height: 170px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  text-align: left;
}

.admin-clear-state > span {
  width: 38px;
  height: 38px;
  display: grid;
  place-items: center;
  color: #6ee7b7;
  font-weight: 900;
  background: rgba(16, 185, 129, 0.12);
  border: 1px solid rgba(16, 185, 129, 0.28);
  border-radius: 50%;
}

.admin-clear-state strong { color: #d1fae5; font-size: 0.86rem; }

.admin-attention-list {
  margin-top: 16px;
  display: grid;
  gap: 8px;
}

.admin-attention-item {
  min-width: 0;
  padding: 10px 11px;
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: 10px;
  background: rgba(30, 41, 59, 0.48);
  border: 1px solid rgba(71, 85, 105, 0.42);
  border-radius: 9px;
}

.admin-attention-icon { font-size: 1rem; }
.admin-attention-item strong { color: #e2e8f0; font-size: 0.82rem; }
.admin-attention-item p { margin-top: 2px; font-size: 0.71rem; }
.admin-attention-value { color: #f8fafc; font-size: 1rem; font-weight: 800; }

.admin-progress-summary {
  margin-top: 17px;
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 8px;
}

.admin-progress-summary > div {
  min-width: 0;
  padding: 10px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  background: rgba(30, 41, 59, 0.48);
  border: 1px solid rgba(71, 85, 105, 0.4);
  border-radius: 8px;
}

.admin-progress-summary span {
  color: #8393ac;
  font-size: 0.67rem;
  line-height: 1.25;
}

.admin-progress-summary strong { color: #7dd3fc; font-size: 1.08rem; }

.admin-mini-chart {
  height: 156px;
  margin-top: 18px;
  padding: 8px 4px 0;
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  gap: clamp(5px, 1.2vw, 12px);
  border-bottom: 1px solid rgba(71, 85, 105, 0.48);
}

.admin-mini-chart-day {
  min-width: 0;
  display: grid;
  grid-template-rows: 18px 1fr 34px;
  justify-items: center;
  gap: 4px;
}

.admin-mini-chart-value,
.admin-mini-chart-label { color: #8393ac; font-size: 0.67rem; }

.admin-mini-chart-label {
  display: grid;
  gap: 1px;
  text-align: center;
  text-decoration: none;
  line-height: 1.2;
}

.admin-mini-chart-label strong {
  color: #a9c2dc;
  font-size: 0.66rem;
  font-weight: 700;
}

.admin-mini-chart-label span {
  color: #5fbfe8;
  font-size: 0.62rem;
  white-space: nowrap;
}

.admin-mini-chart-track {
  width: min(26px, 75%);
  height: 88px;
  display: flex;
  align-items: flex-end;
  background: rgba(30, 41, 59, 0.35);
  border-radius: 5px 5px 0 0;
}

.admin-mini-chart-bar {
  width: 100%;
  min-height: 3px;
  background: linear-gradient(180deg, #38bdf8, #0e7490);
  border-radius: 5px 5px 0 0;
  box-shadow: 0 -3px 10px rgba(56, 189, 248, 0.16);
}

.admin-mini-chart-bar--empty { background: #334155; box-shadow: none; }

.admin-results-table { margin-top: 16px; display: grid; }

.admin-results-row {
  min-width: 0;
  padding: 12px 10px;
  display: grid;
  grid-template-columns: minmax(130px, 0.9fr) minmax(190px, 1.6fr) minmax(120px, 0.75fr) minmax(135px, 0.75fr);
  align-items: center;
  gap: 14px;
  color: #cbd5e1;
  font-size: 0.8rem;
  border-top: 1px solid rgba(71, 85, 105, 0.4);
}

.admin-results-row > * { min-width: 0; overflow-wrap: anywhere; }
.admin-results-row > time { color: #94a3b8; }
.admin-results-head { padding-top: 8px; color: #8393ac; font-size: 0.68rem; font-weight: 800; letter-spacing: 0.07em; text-transform: uppercase; border-top: 0; }

.admin-result-activity,
.admin-result-outcome { display: flex; align-items: center; gap: 9px; }
.admin-result-activity { align-items: flex-start; flex-direction: column; gap: 2px; }
.admin-result-activity small { color: #8393ac; font-size: 0.72rem; }

.admin-result-status {
  padding: 3px 7px;
  font-size: 0.66rem;
  font-weight: 800;
  border: 1px solid;
  border-radius: 999px;
}
.admin-result-status--passed { color: #6ee7b7; background: rgba(16, 185, 129, 0.12); border-color: rgba(16, 185, 129, 0.3); }
.admin-result-status--failed { color: #fca5a5; background: rgba(239, 68, 68, 0.1); border-color: rgba(239, 68, 68, 0.3); }
.admin-result-status--recorded { color: #bae6fd; background: rgba(14, 165, 233, 0.1); border-color: rgba(14, 165, 233, 0.3); }

.admin-empty-state {
  min-height: 150px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  text-align: center;
}
.admin-empty-state > span { margin-bottom: 8px; font-size: 1.7rem; }
.admin-empty-state strong { color: #e2e8f0; font-size: 0.9rem; }

@media (max-width: 1120px) {
  .admin-overview-stats-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .admin-overview-main-grid { grid-template-columns: 1fr; }
}

@media (max-width: 680px) {
  .admin-overview-stats-grid { grid-template-columns: 1fr; }
  .admin-stat-card { min-height: 120px; }
  .admin-progress-summary { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .admin-results-head { display: none; }
  .admin-results-row {
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 8px 12px;
  }
  .admin-result-activity { grid-column: 1; }
  .admin-result-outcome { grid-column: 2; grid-row: 1 / span 2; align-items: flex-end; flex-direction: column; }
  .admin-results-row > time { grid-column: 1 / -1; font-size: 0.7rem; }
  .admin-overview-alert { align-items: flex-start; flex-direction: column; }
  .admin-training-panel .admin-panel-heading { align-items: stretch; flex-direction: column; }
  .admin-training-period { width: fit-content; }
}

@media (max-width: 420px) {
  .admin-overview-panel { padding: 15px; }
  .admin-mini-chart { gap: 3px; }
  .admin-mini-chart-track { width: 16px; }
  .admin-mini-chart-label { font-size: 0.58rem; }
}
</style>
