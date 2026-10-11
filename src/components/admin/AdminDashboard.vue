<template>
  <div class="admin-ocean-scene">
    <div class="scene-overlay dashboard-overlay">
      <div class="admin-console-layout">
        <aside class="admin-console-sidebar">
          <div class="admin-sidebar-logo-card">
            <span class="admin-sidebar-logo" aria-hidden="true">⚓</span>
            <div class="admin-sidebar-brand-copy">
              <strong>HELMQUEST</strong>
              <span>Admin</span>
            </div>
          </div>

          <div class="admin-sidebar-profile-card">
            <div class="admin-sidebar-avatar">{{ (currentUser.name || 'A').charAt(0).toUpperCase() }}</div>
            <strong class="admin-sidebar-name">{{ currentUser.name || 'Admin' }}</strong>
            <span class="admin-sidebar-rank">System Admin</span>
          </div>

          <nav class="admin-sidebar-nav" aria-label="Admin sections">
            <button
              v-for="tab in tabs"
              :key="tab.id"
              type="button"
              class="admin-sidebar-tab"
              :class="{ 'admin-sidebar-tab--active': activeTab === tab.id }"
              @click="selectTab(tab.id)"
            >
              <span class="hub-nav-icon" aria-hidden="true">{{ tab.icon }}</span>
              <span>{{ tab.label }}</span>
            </button>
          </nav>

          <button type="button" class="admin-sidebar-logout" @click="$emit('logout')">
            <span aria-hidden="true">⊘</span>
            <span>Log out</span>
          </button>
        </aside>

        <main class="admin-console-main">
          <header class="admin-console-header">
            <div class="admin-console-title-block">
              <p class="admin-console-eyebrow">Admin console</p>
              <h1>{{ currentSection.title }}</h1>
              <p>{{ currentSection.subtitle }}</p>
            </div>

            <div v-if="activeTab === 'overview'" class="admin-console-refresh-block">
              <span v-if="lastUpdatedLabel" class="admin-console-updated">Updated {{ lastUpdatedLabel }}</span>
              <button
                type="button"
                class="admin-refresh-button"
                :disabled="loadingStats"
                @click="loadStats"
              >
                {{ loadingStats ? 'Refreshing…' : 'Refresh' }}
              </button>
            </div>
          </header>

          <div class="admin-console-content">
            <SystemOverview
              v-if="activeTab === 'overview'"
              :stats="stats"
              :loading="loadingStats"
              :error="statsError"
              @retry="loadStats"
            />
            <InstructorManagement
              v-else-if="activeTab === 'instructors'"
              :admin-id="adminId"
            />
            <GlobalStudentView
              v-else
              :admin-id="adminId"
            />
          </div>
        </main>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { API_BASE_URL } from '../../api/firebaseApi.js';
import SystemOverview from './SystemOverview.vue';
import InstructorManagement from './InstructorManagement.vue';
import GlobalStudentView from './GlobalStudentView.vue';

const props = defineProps({
  currentUser: {
    type: Object,
    required: true
  }
});

defineEmits(['logout']);

const tabs = [
  { id: 'overview', label: 'Overview', icon: '📊' },
  { id: 'instructors', label: 'Instructors', icon: '🧑‍🏫' },
  { id: 'students', label: 'Students', icon: '👥' }
];

const sectionCopy = {
  overview: {
    title: 'System Overview',
    subtitle: 'Monitor accounts, training activity, and course content.'
  },
  instructors: {
    title: 'Instructor Management',
    subtitle: 'Manage instructor accounts and assigned students.'
  },
  students: {
    title: 'Global Student Management',
    subtitle: 'Review student accounts and saved training progress.'
  }
};

const activeTab = ref('overview');
const stats = ref(null);
const loadingStats = ref(false);
const statsError = ref('');
const lastUpdatedAt = ref(null);
let statsRequestController = null;

const adminId = computed(() => props.currentUser?.id || props.currentUser?.uid || 'admin-root');
const currentSection = computed(() => sectionCopy[activeTab.value] || sectionCopy.overview);
const lastUpdatedLabel = computed(() => lastUpdatedAt.value
  ? lastUpdatedAt.value.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
  : '');

async function loadStats() {
  statsRequestController?.abort();
  const controller = new AbortController();
  statsRequestController = controller;
  loadingStats.value = true;
  statsError.value = '';
  const timeout = window.setTimeout(() => controller.abort(), 20_000);

  try {
    const response = await fetch(`${API_BASE_URL}/admin/stats`, {
      headers: { 'x-user-id': adminId.value },
      signal: controller.signal
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data.message || 'The admin overview could not be loaded.');
    }
    stats.value = data;
    lastUpdatedAt.value = new Date();
  } catch (error) {
    if (controller.signal.aborted && statsRequestController !== controller) return;
    statsError.value = error?.name === 'AbortError'
      ? 'The overview request took too long. Check the backend and try again.'
      : (error?.message || 'The admin overview could not be loaded.');
  } finally {
    window.clearTimeout(timeout);
    if (statsRequestController === controller) {
      statsRequestController = null;
      loadingStats.value = false;
    }
  }
}

function selectTab(tab) {
  activeTab.value = tab;
  if (tab === 'overview' && !stats.value && !loadingStats.value) loadStats();
}

onMounted(loadStats);
onBeforeUnmount(() => statsRequestController?.abort());
</script>

<style>
.admin-ocean-scene {
  position: fixed;
  inset: 0;
  color: #e2e8f0;
  background:
    linear-gradient(rgba(56, 189, 248, 0.025) 1px, transparent 1px),
    linear-gradient(90deg, rgba(56, 189, 248, 0.025) 1px, transparent 1px),
    linear-gradient(135deg, #0a1628, #101e33 52%, #091523);
  background-size: 24px 24px, 24px 24px, auto;
  overflow: hidden;
}

.admin-ocean-scene .dashboard-overlay {
  width: 100%;
  height: 100%;
  padding: 0;
  overflow: auto;
  background: transparent !important;
}

.admin-console-layout { min-height: 100vh; }

.admin-console-sidebar {
  position: fixed;
  inset: 0 auto 0 0;
  z-index: 3;
  width: 260px;
  min-width: 0;
  padding: 28px 18px 20px;
  display: flex;
  flex-direction: column;
  gap: 20px;
  box-sizing: border-box;
  overflow-y: auto;
  color: #e2e8f0;
  background: rgba(7, 17, 32, 0.9);
  border-right: 1px solid rgba(56, 189, 248, 0.18);
  box-shadow: 12px 0 40px rgba(2, 6, 23, 0.22);
  backdrop-filter: blur(16px);
}

.admin-sidebar-logo-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 0 8px 18px;
  border-bottom: 1px solid rgba(148, 163, 184, 0.16);
}

.admin-sidebar-logo {
  font-size: 2rem;
  color: #38bdf8;
  filter: drop-shadow(0 2px 8px rgba(56, 189, 248, 0.45));
}

.admin-sidebar-brand-copy {
  display: flex;
  flex-direction: column;
  line-height: 1.1;
}

.admin-sidebar-brand-copy strong {
  color: #f8fafc;
  font-size: 1.08rem;
  font-weight: 800;
  letter-spacing: 0.09em;
}

.admin-sidebar-brand-copy span,
.admin-console-eyebrow {
  color: #38bdf8;
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}

.admin-sidebar-profile-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 5px;
  padding: 18px 10px;
  text-align: center;
  background: linear-gradient(180deg, rgba(56, 189, 248, 0.12), rgba(14, 116, 144, 0.08));
  border: 1px solid rgba(56, 189, 248, 0.22);
  border-radius: 14px;
}

.admin-sidebar-avatar {
  width: 54px;
  height: 54px;
  margin-bottom: 3px;
  display: grid;
  place-items: center;
  color: #fff;
  font-size: 1.25rem;
  font-weight: 800;
  background: linear-gradient(135deg, #0ea5e9, #38bdf8);
  border-radius: 50%;
  box-shadow: 0 5px 18px rgba(56, 189, 248, 0.3);
}

.admin-sidebar-name {
  max-width: 100%;
  color: #f8fafc;
  font-size: 0.94rem;
  overflow-wrap: anywhere;
}

.admin-sidebar-rank { color: #94a3b8; font-size: 0.78rem; }
.admin-console-sidebar .admin-sidebar-nav {
  flex: 0 0 auto;
  padding: 0;
  display: grid;
  gap: 8px;
  overflow: visible;
}

.admin-sidebar-tab,
.admin-sidebar-logout,
.admin-refresh-button { font: inherit; cursor: pointer; }

.admin-sidebar-tab {
  width: 100%;
  min-height: 46px;
  padding: 10px 14px;
  display: flex;
  align-items: center;
  gap: 10px;
  color: #cbd5e1;
  font-size: 0.88rem;
  font-weight: 700;
  text-align: left;
  background: transparent;
  border: 1px solid transparent;
  border-radius: 9px;
  transition: background 0.18s ease, border-color 0.18s ease, color 0.18s ease;
}

.admin-sidebar-tab:hover,
.admin-sidebar-tab--active {
  color: #f8fafc;
  background: linear-gradient(90deg, rgba(56, 189, 248, 0.2), rgba(14, 165, 233, 0.12));
  border-color: rgba(56, 189, 248, 0.26);
}

.admin-sidebar-tab--active { box-shadow: inset 3px 0 #38bdf8; }

.admin-sidebar-logout {
  min-height: 46px;
  margin-top: auto;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: #fca5a5;
  font-size: 0.84rem;
  font-weight: 800;
  background: rgba(127, 29, 29, 0.2);
  border: 1px solid rgba(248, 113, 113, 0.45);
  border-radius: 9px;
}

.admin-sidebar-logout:hover { color: #fee2e2; background: rgba(185, 28, 28, 0.28); }

.admin-console-main {
  width: calc(100% - 260px);
  min-width: 0;
  min-height: 100vh;
  margin-left: 260px;
  padding: 34px clamp(20px, 3vw, 44px) 40px;
  box-sizing: border-box;
}

.admin-console-header {
  min-width: 0;
  padding-bottom: 22px;
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 24px;
  border-bottom: 1px solid rgba(148, 163, 184, 0.17);
}

.admin-console-title-block { min-width: 0; }
.admin-console-eyebrow { margin: 0 0 7px; }

.admin-console-header h1 {
  margin: 0;
  color: #f8fafc;
  font-family: 'Outfit', sans-serif;
  font-size: clamp(1.8rem, 3.3vw, 2.55rem);
  line-height: 1.08;
}

.admin-console-header p:not(.admin-console-eyebrow) {
  margin: 8px 0 0;
  color: #94a3b8;
  font-size: 0.95rem;
}

.admin-console-refresh-block {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-shrink: 0;
}

.admin-console-updated { color: #64748b; font-size: 0.76rem; }

.admin-refresh-button {
  min-height: 38px;
  padding: 8px 16px;
  color: #7dd3fc;
  font-size: 0.82rem;
  font-weight: 800;
  background: rgba(14, 116, 144, 0.13);
  border: 1px solid rgba(56, 189, 248, 0.45);
  border-radius: 8px;
}

.admin-refresh-button:hover:not(:disabled) { color: #e0f2fe; background: rgba(14, 116, 144, 0.26); }
.admin-refresh-button:disabled { cursor: wait; opacity: 0.62; }
.admin-console-content { min-width: 0; margin-top: 22px; }

.admin-console-content .instructor-panel {
  color: #e2e8f0;
  background: rgba(15, 23, 42, 0.68) !important;
  border: 1px solid rgba(71, 104, 132, 0.55);
  border-radius: 13px;
  box-shadow: 0 12px 30px rgba(2, 6, 23, 0.2);
  backdrop-filter: blur(12px);
}

.admin-console-content .instructor-panel-title { color: #f8fafc; }
.admin-console-content .instructor-panel-note { color: #94a3b8; }

@media (max-width: 900px) {
  .admin-console-sidebar {
    position: relative;
    inset: auto;
    width: 100%;
    height: auto;
    padding: 16px;
    border-right: 0;
    border-bottom: 1px solid rgba(56, 189, 248, 0.18);
  }
  .admin-sidebar-logo-card { padding-bottom: 12px; }
  .admin-sidebar-profile-card { display: none; }
  .admin-console-sidebar .admin-sidebar-nav { grid-template-columns: repeat(3, minmax(0, 1fr)); }
  .admin-sidebar-logout { margin-top: 0; }
  .admin-console-main { width: 100%; margin-left: 0; padding: 24px 18px 32px; }
}

@media (max-width: 620px) {
  .admin-console-header { align-items: flex-start; flex-direction: column; gap: 14px; }
  .admin-console-refresh-block { width: 100%; justify-content: space-between; }
  .admin-sidebar-tab { justify-content: center; padding: 9px 6px; font-size: 0.76rem; }
  .admin-console-main { padding-inline: 12px; }
}
</style>
