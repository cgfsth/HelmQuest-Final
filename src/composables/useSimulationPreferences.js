import { computed, watch } from 'vue';

export const DEFAULT_SIMULATION_PREFERENCES = Object.freeze({
  soundVolume: 0.5, menuStartCamera: 'chase', graphicsQuality: 'medium', waterQuality: 'medium',
  shadowQuality: 'low', uiScale: '1.0', showFPS: false,
});
const choices = {
  menuStartCamera: ['chase', 'orbit', 'helm'], graphicsQuality: ['low', 'medium', 'high', 'ultra'],
  waterQuality: ['low', 'medium', 'high'], shadowQuality: ['off', 'low', 'medium', 'high'],
  uiScale: ['0.8', '1.0', '1.2', '1.4'],
};
export function normalizeSimulationPreferences(value) {
  const result = { ...DEFAULT_SIMULATION_PREFERENCES };
  if (!value || typeof value !== 'object') return result;
  if (typeof value.soundVolume === 'number' && Number.isFinite(value.soundVolume)) result.soundVolume = Math.min(1, Math.max(0, value.soundVolume));
  for (const [key, values] of Object.entries(choices)) if (values.includes(value[key])) result[key] = value[key];
  if (typeof value.showFPS === 'boolean') result.showFPS = value.showFPS;
  return result;
}

export function useSimulationPreferences({ currentUser, isAuthenticated, userRole, controls, storageNotice, storage = () => window.localStorage }) {
  let activeKey = null, loading = false;
  const apply = value => {
    const normalized = normalizeSimulationPreferences(value);
    for (const [key, control] of Object.entries(controls)) control.value = normalized[key];
  };
  const preferences = computed({
    get: () => Object.fromEntries(Object.entries(controls).map(([key, control]) => [key, control.value])),
    set: apply,
  });
  watch(() => [isAuthenticated.value, userRole.value, currentUser.value?.id], ([authenticated, role, id]) => {
    loading = true;
    activeKey = authenticated && role === 'student' && id ? `helmquest:preferences:student:${id}` : null;
    storageNotice.value = '';
    let saved = null;
    try { if (activeKey) saved = JSON.parse(storage().getItem(activeKey)); }
    catch { storageNotice.value = 'Preferences work for this session, but this browser could not load saved settings.'; }
    apply(saved);
    loading = false;
  }, { immediate: true, flush: 'sync' });
  watch(preferences, value => {
    if (loading || !activeKey) return;
    try { storage().setItem(activeKey, JSON.stringify(normalizeSimulationPreferences(value))); storageNotice.value = ''; }
    catch { storageNotice.value = 'Preferences applied for this session. This browser could not save them for your next visit.'; }
  }, { flush: 'sync' });
  return { preferences, resetPreferences: () => apply(DEFAULT_SIMULATION_PREFERENCES) };
}
