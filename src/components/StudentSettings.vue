<template>
  <section class="student-settings" aria-label="Account and simulation settings">
    <div class="ss-grid">
      <section class="ss-card" aria-labelledby="ss-account-heading">
        <div class="ss-card-heading"><UserRound :size="21" aria-hidden="true" /><div><h2 id="ss-account-heading">Your account</h2><p>Your training profile and sign-in details.</p></div></div>
        <div class="ss-identity"><span class="ss-avatar" aria-hidden="true">{{ (currentUser.name || 'S').charAt(0).toUpperCase() }}</span><div><strong>{{ currentUser.name }}</strong><span>{{ rank || 'Student' }}</span></div></div>
        <dl class="ss-account-details"><div><dt>Email address</dt><dd>{{ currentUser.email || 'Not provided' }}</dd></div><div><dt>Student ID</dt><dd>{{ studentId || currentUser.studentId || 'Not provided' }}</dd></div><div><dt>Account type</dt><dd>Student</dd></div></dl>
        <p class="ss-note">Contact your instructor to correct your name, email, or student ID.</p>
      </section>
      <section class="ss-card" aria-labelledby="ss-password-heading">
        <div class="ss-card-heading"><ShieldCheck :size="21" aria-hidden="true" /><div><h2 id="ss-password-heading">Change password</h2><p>Keep your HelmQuest account secure.</p></div></div>
        <p v-if="demoAccount" class="ss-message">This is a shared demo account. Password changes are available for registered accounts.</p>
        <form v-else class="ss-password-form" :aria-busy="saving" @submit.prevent="submitPassword">
          <input class="ss-visually-hidden" name="username" autocomplete="username" :value="currentUser.email" readonly tabindex="-1" aria-hidden="true" />
          <fieldset :disabled="saving">
            <label for="ss-current-password">Current password<input id="ss-current-password" v-model="currentPassword" name="currentPassword" :type="showPasswords ? 'text' : 'password'" autocomplete="current-password" required /></label>
            <label for="ss-new-password">New password<input id="ss-new-password" v-model="newPassword" name="newPassword" :type="showPasswords ? 'text' : 'password'" autocomplete="new-password" minlength="8" required aria-describedby="ss-password-help" /></label>
            <label for="ss-confirm-password">Confirm new password<input id="ss-confirm-password" v-model="confirmation" name="confirmation" :type="showPasswords ? 'text' : 'password'" autocomplete="new-password" minlength="8" required /></label>
            <p id="ss-password-help" class="ss-note">Use at least 8 characters. Avoid reusing a password from another account.</p>
            <button class="ss-show-password" type="button" :aria-pressed="showPasswords" @click="showPasswords = !showPasswords"><component :is="showPasswords ? EyeOff : Eye" :size="16" aria-hidden="true" />{{ showPasswords ? 'Hide passwords' : 'Show passwords' }}</button>
            <p v-if="passwordError" class="ss-message ss-error" role="alert">{{ passwordError }}</p>
            <p v-if="passwordSuccess" class="ss-message ss-success" role="status">{{ passwordSuccess }}</p>
            <button class="ss-primary" type="submit"><LockKeyhole :size="16" aria-hidden="true" />{{ saving ? 'Updating password…' : 'Update password' }}</button>
          </fieldset>
        </form>
      </section>
    </div>
    <section class="ss-card ss-preferences" aria-labelledby="ss-preferences-heading">
      <div class="ss-card-heading"><SlidersHorizontal :size="21" aria-hidden="true" /><div><h2 id="ss-preferences-heading">Simulation preferences</h2><p>Changes apply automatically and are saved for your account on this browser.</p></div></div>
      <div class="ss-preference-grid">
        <label class="ss-setting" for="ss-volume"><span><strong>Music volume</strong><small>Set to 0 to mute background music.</small></span><span class="ss-volume"><input id="ss-volume" type="range" min="0" max="1" step="0.05" :value="preferences.soundVolume" @input="updatePreference('soundVolume', Number($event.target.value))" /><output for="ss-volume">{{ Math.round(preferences.soundVolume * 100) }}%</output></span></label>
        <label class="ss-setting" for="ss-camera"><span><strong>Starting camera</strong><small>Your preferred view when you set sail.</small></span><select id="ss-camera" :value="preferences.menuStartCamera" @change="updatePreference('menuStartCamera', $event.target.value)"><option value="chase">Chase camera</option><option value="orbit">Orbit camera</option><option value="helm">Helm camera</option></select></label>
        <label class="ss-setting" for="ss-graphics"><span><strong>Graphics quality</strong><small>Lower quality can improve performance.</small></span><select id="ss-graphics" :value="preferences.graphicsQuality" @change="updatePreference('graphicsQuality', $event.target.value)"><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="ultra">Ultra</option></select></label>
        <label class="ss-setting" for="ss-water"><span><strong>Water quality</strong><small>Choose the detail of the ocean surface.</small></span><select id="ss-water" :value="preferences.waterQuality" @change="updatePreference('waterQuality', $event.target.value)"><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option></select></label>
        <label class="ss-setting" for="ss-shadows"><span><strong>Shadow quality</strong><small>Turn off shadows for lighter rendering.</small></span><select id="ss-shadows" :value="preferences.shadowQuality" @change="updatePreference('shadowQuality', $event.target.value)"><option value="off">Off</option><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option></select></label>
        <label class="ss-setting" for="ss-scale"><span><strong>Interface size</strong><small>Adjust text and controls to suit your screen.</small></span><select id="ss-scale" :value="preferences.uiScale" @change="updatePreference('uiScale', $event.target.value)"><option value="0.8">Small</option><option value="1.0">Normal</option><option value="1.2">Large</option><option value="1.4">Extra large</option></select></label>
        <label class="ss-setting ss-fps" for="ss-fps"><span><strong>Show FPS</strong><small>Display the rendering frame rate.</small></span><input id="ss-fps" type="checkbox" :checked="preferences.showFPS" @change="updatePreference('showFPS', $event.target.checked)" /></label>
      </div>
      <div class="ss-preferences-footer"><p v-if="storageNotice" class="ss-message ss-error" role="status">{{ storageNotice }}</p><p v-else class="ss-note"><Check :size="15" aria-hidden="true" /> Preferences are saved automatically.</p><button class="ss-secondary" type="button" @click="$emit('reset-preferences')"><RotateCcw :size="16" aria-hidden="true" />Restore defaults</button></div>
    </section>
  </section>
</template>

<script setup>
import { computed, onBeforeUnmount, ref, watch } from 'vue';
import { Check, Eye, EyeOff, LockKeyhole, RotateCcw, ShieldCheck, SlidersHorizontal, UserRound } from '@lucide/vue';
import { changePassword } from '../api/firebaseApi.js';
const props = defineProps({ currentUser: { type: Object, required: true }, studentId: String, rank: String, preferences: { type: Object, required: true }, storageNotice: String });
const emit = defineEmits(['update:preferences', 'reset-preferences']);
const demoAccount = computed(() => props.currentUser.email?.toLowerCase().endsWith('@helmquest.local'));
const currentPassword = ref(''), newPassword = ref(''), confirmation = ref('');
const showPasswords = ref(false), saving = ref(false), passwordError = ref(''), passwordSuccess = ref('');
let request;
function updatePreference(key, value) { emit('update:preferences', { ...props.preferences, [key]: value }); }
function clearPasswords() { currentPassword.value = ''; newPassword.value = ''; confirmation.value = ''; showPasswords.value = false; }
async function submitPassword() {
  if (saving.value || demoAccount.value) return;
  passwordError.value = ''; passwordSuccess.value = '';
  if (!currentPassword.value || newPassword.value.length < 8 || new TextEncoder().encode(newPassword.value).length > 72) { passwordError.value = 'Enter your current password and a new password of at least 8 characters (up to 72 UTF-8 bytes).'; return; }
  if (newPassword.value !== confirmation.value) { passwordError.value = 'Your new passwords do not match.'; return; }
  if (newPassword.value === currentPassword.value) { passwordError.value = 'Choose a password different from your current password.'; return; }
  const userId = props.currentUser.id, operation = request = new AbortController();
  saving.value = true;
  try {
    const result = await changePassword(currentPassword.value, newPassword.value, { signal: operation.signal });
    if (operation.signal.aborted || props.currentUser.id !== userId) return;
    clearPasswords(); passwordSuccess.value = result.message;
  } catch (error) {
    if (!operation.signal.aborted && props.currentUser.id === userId) passwordError.value = error.message || 'Unable to update your password. Please try again.';
  } finally { if (request === operation) saving.value = false; }
}
watch(() => props.currentUser.id, () => { request?.abort(); clearPasswords(); passwordError.value = ''; passwordSuccess.value = ''; saving.value = false; });
onBeforeUnmount(() => { request?.abort(); clearPasswords(); });
</script>

<style scoped>
.student-settings { --ss-border:rgba(85,150,181,.28); --ss-muted:#a2b8cb; color:#f1f7fc; display:grid; gap:24px; min-width:0; padding-bottom:24px; }
.ss-grid { display:grid; grid-template-columns:minmax(0,.85fr) minmax(0,1.15fr); gap:24px; align-items:start; }
.ss-card { min-width:0; padding:26px; border:1px solid var(--ss-border); border-radius:18px; background:linear-gradient(145deg,#132638,#0c1d2d); box-shadow:0 8px 24px #00000012; }
.ss-card-heading { display:flex; gap:12px; align-items:flex-start; margin-bottom:24px; }.ss-card-heading>svg { flex-shrink:0; color:#5cd7ff; margin-top:3px; }
.ss-card h2 { margin:0; font-size:1.08rem; color:#f1f7fc; }.ss-card-heading p { margin:6px 0 0; font-size:.82rem; line-height:1.6; color:var(--ss-muted); }
.ss-identity { display:flex; gap:14px; align-items:center; padding:18px 0 22px; }.ss-avatar { display:grid; place-items:center; width:56px; height:56px; flex-shrink:0; border-radius:50%; background:linear-gradient(135deg,#0788ba,#26c5f2); font-size:1.3rem; font-weight:800; }
.ss-identity strong,.ss-identity span:not(.ss-avatar) { display:block; }.ss-identity strong { overflow-wrap:anywhere; }.ss-identity div>span { color:#68dbff; font-size:.78rem; margin-top:5px; }
.ss-account-details { margin:0; }.ss-account-details>div { padding:15px 0; border-top:1px solid var(--ss-border); }.ss-account-details dt { color:var(--ss-muted); font-size:.75rem; }.ss-account-details dd { margin:7px 0 0; font-size:.9rem; overflow-wrap:anywhere; }
.ss-note { color:var(--ss-muted); font-size:.76rem; line-height:1.6; margin:14px 0 0; }.ss-password-form fieldset { border:0; padding:0; margin:0; min-width:0; display:grid; gap:16px; }.ss-password-form label { display:grid; gap:8px; font-size:.8rem; font-weight:600; }
.student-settings input:not([type=range]):not([type=checkbox]),.student-settings select { box-sizing:border-box; width:100%; min-width:0; min-height:44px; padding:10px 12px; border:1px solid #36536b; border-radius:9px; background:#0a1928; color:#eef6ff; font:inherit; font-size:.85rem; }
.student-settings button { display:inline-flex; align-items:center; justify-content:center; gap:8px; min-height:44px; padding:10px 16px; border-radius:9px; font:inherit; font-size:.8rem; font-weight:600; cursor:pointer; }.ss-primary { color:#052032; background:#4bd5ff; border:1px solid #70e1ff; justify-self:start; }.ss-primary:hover { background:#80e4ff; }.ss-secondary { color:#c8e6f5; background:#152d40; border:1px solid #36536b; }
.student-settings .ss-show-password { justify-self:start; min-height:32px; padding:0; color:#7addff; border:0; background:transparent; font-size:.76rem; }.student-settings :focus-visible { outline:2px solid #55dbff; outline-offset:3px; }.student-settings button:disabled,.student-settings fieldset:disabled { opacity:.6; cursor:wait; }
.ss-password-form .ss-note { margin:0; }.ss-message { margin:0; padding:12px 14px; border:1px solid var(--ss-border); border-radius:9px; background:#193247; font-size:.82rem; line-height:1.6; }.ss-error { color:#ffcece; border-color:#fa70704d; background:#41252f; }.ss-success { color:#aff5db; border-color:#5ae1b14d; background:#123d36; }
.ss-preference-grid { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); column-gap:32px; }.ss-setting { display:flex; flex-direction:column; gap:14px; padding:20px 0; border-top:1px solid var(--ss-border); min-width:0; }.ss-setting strong { display:block; font-size:.86rem; }.ss-setting small { display:block; font-size:.75rem; line-height:1.6; color:var(--ss-muted); margin-top:5px; }
.ss-volume { display:flex; gap:14px; align-items:center; min-height:44px; }.ss-volume input { min-width:0; flex:1; accent-color:#40caff; }.ss-volume output { min-width:3rem; color:#8de4ff; font-size:.85rem; text-align:right; }.ss-fps { flex-direction:row; justify-content:space-between; align-items:center; }.ss-fps input { width:20px; height:20px; accent-color:#40caff; flex-shrink:0; }
.ss-preferences-footer { border-top:1px solid var(--ss-border); padding-top:20px; display:flex; gap:16px; justify-content:space-between; align-items:center; flex-wrap:wrap; }.ss-preferences-footer .ss-note { display:flex; align-items:center; gap:7px; margin:0; }.ss-preferences-footer .ss-note svg { color:#6ddfbe; }
.ss-visually-hidden { position:absolute!important; width:1px!important; height:1px!important; padding:0!important; margin:-1px!important; overflow:hidden; clip:rect(0,0,0,0); white-space:nowrap; border:0!important; }
@media(max-width:1000px) { .ss-grid { grid-template-columns:1fr; } }@media(max-width:600px) { .ss-card { padding:20px 16px; border-radius:14px; }.student-settings,.ss-grid { gap:16px; }.ss-preference-grid { grid-template-columns:1fr; }.ss-preferences-footer { align-items:stretch; flex-direction:column; }.ss-preferences-footer button { width:100%; } }
</style>
