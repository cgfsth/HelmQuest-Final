<template>
  <section class="management-panel">
    <header class="panel-header">
      <div>
        <p class="panel-eyebrow">Account access</p>
        <h2>Instructor accounts</h2>
        <p>Manage instructor accounts and see how many students are assigned to each one.</p>
      </div>
      <div class="header-actions">
        <button type="button" class="button button-secondary" :disabled="loading" @click="loadInstructors">
          {{ loading ? 'Refreshing...' : 'Refresh' }}
        </button>
        <button type="button" class="button button-primary" @click="openAddForm">Add Instructor</button>
      </div>
    </header>

    <label class="search-field">
      <span>Search instructors</span>
      <input v-model.trim="searchQuery" type="search" placeholder="Name or email" autocomplete="off" />
    </label>

    <div v-if="loadError && instructors.length" class="inline-message inline-message-error" role="alert">
      <span>{{ loadError }}</span>
      <button type="button" @click="loadInstructors">Try again</button>
    </div>

    <div v-if="loading && !instructors.length" class="empty-state" aria-live="polite">
      <span class="spinner" aria-hidden="true"></span>
      <p>Loading instructor accounts...</p>
    </div>

    <div v-else-if="loadError && !instructors.length" class="empty-state empty-state-error" role="alert">
      <strong>Instructor accounts could not be loaded.</strong>
      <p>{{ loadError }}</p>
      <button type="button" class="button button-secondary" @click="loadInstructors">Try again</button>
    </div>

    <template v-else>
      <div class="table-shell">
        <table class="management-table">
          <thead>
            <tr>
              <th>Instructor</th>
              <th>Status</th>
              <th>Assigned Students</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="instructor in filteredInstructors" :key="instructor.id">
              <td data-label="Instructor">
                <div class="person-cell">
                  <span class="person-avatar" aria-hidden="true">{{ initial(instructor.name) }}</span>
                  <span class="person-copy">
                    <strong>{{ instructor.name }}</strong>
                    <small>{{ instructor.email || 'No email saved' }}</small>
                  </span>
                </div>
              </td>
              <td data-label="Status">
                <span :class="['status-badge', `status-${normalizedStatus(instructor.status)}`]">
                  <span class="status-dot" aria-hidden="true"></span>
                  {{ statusLabel(instructor.status) }}
                </span>
              </td>
              <td data-label="Assigned Students">
                <div class="student-count-cell">
                  <strong>{{ Number(instructor.studentCount) || 0 }}</strong>
                  <span>{{ Number(instructor.studentCount) === 1 ? 'student' : 'students' }}</span>
                </div>
              </td>
              <td data-label="Actions">
                <div class="row-actions">
                  <button type="button" class="action-button" @click="openEditForm(instructor)">Edit</button>
                  <button
                    type="button"
                    class="action-button"
                    :disabled="statusBusyId === instructor.id"
                    @click="toggleStatus(instructor)"
                  >
                    {{ statusBusyId === instructor.id ? 'Saving...' : (normalizedStatus(instructor.status) === 'active' ? 'Deactivate' : 'Activate') }}
                  </button>
                  <button
                    type="button"
                    class="action-button action-button-danger"
                    :disabled="Number(instructor.studentCount) > 0"
                    :title="Number(instructor.studentCount) > 0 ? 'Transfer assigned students before removing this instructor.' : 'Remove instructor'"
                    @click="confirmDelete(instructor)"
                  >
                    Remove
                  </button>
                </div>
                <small v-if="Number(instructor.studentCount) > 0" class="action-help">
                  Transfer students before removal.
                </small>
              </td>
            </tr>
          </tbody>
        </table>

        <div v-if="filteredInstructors.length === 0" class="empty-state">
          <strong>No matching instructors</strong>
          <p>Change the search text to see other accounts.</p>
        </div>
      </div>

      <p class="table-note">
        Showing {{ filteredInstructors.length }} of {{ instructors.length }} instructor accounts.
      </p>
    </template>
  </section>

  <div v-if="showModal" class="modal-overlay" @click.self="closeModal" @keydown.esc="closeModal">
    <section class="modal-card" role="dialog" aria-modal="true" :aria-labelledby="isEditing ? 'edit-instructor-title' : 'add-instructor-title'">
      <header class="modal-header">
        <div>
          <p class="panel-eyebrow">Instructor account</p>
          <h3 :id="isEditing ? 'edit-instructor-title' : 'add-instructor-title'">
            {{ isEditing ? 'Edit Instructor' : 'Add Instructor' }}
          </h3>
        </div>
        <button type="button" class="close-button" aria-label="Close" @click="closeModal">×</button>
      </header>

      <form class="account-form" @submit.prevent="saveInstructor">
        <label>
          <span>Name</span>
          <input v-model.trim="form.name" type="text" required placeholder="Full name" />
        </label>
        <label>
          <span>Email</span>
          <input
            v-model.trim="form.email"
            type="email"
            required
            :disabled="isEditing"
            :placeholder="isEditing ? 'Email cannot be changed' : 'name@dnsc.edu.ph'"
          />
        </label>
        <label>
          <span>{{ isEditing ? 'New password (optional)' : 'Password' }}</span>
          <div class="password-field">
            <input
              v-model="form.password"
              :type="showPassword ? 'text' : 'password'"
              :required="!isEditing"
              minlength="6"
              :placeholder="isEditing ? 'Leave blank to keep the password' : 'At least 6 characters'"
            />
            <button type="button" @click="showPassword = !showPassword">
              {{ showPassword ? 'Hide' : 'Show' }}
            </button>
          </div>
        </label>

        <p v-if="formError" class="form-error" role="alert">{{ formError }}</p>

        <footer class="modal-actions">
          <button type="button" class="button button-secondary" :disabled="saving" @click="closeModal">Cancel</button>
          <button type="submit" class="button button-primary" :disabled="saving">
            {{ saving ? 'Saving...' : (isEditing ? 'Save Changes' : 'Create Account') }}
          </button>
        </footer>
      </form>
    </section>
  </div>

  <div v-if="showDeleteConfirm" class="modal-overlay" @click.self="closeDeleteConfirm" @keydown.esc="closeDeleteConfirm">
    <section class="modal-card modal-card-small" role="alertdialog" aria-modal="true" aria-labelledby="remove-instructor-title">
      <header class="modal-header">
        <div>
          <p class="panel-eyebrow panel-eyebrow-danger">Permanent action</p>
          <h3 id="remove-instructor-title">Remove Instructor</h3>
        </div>
        <button type="button" class="close-button" aria-label="Close" @click="closeDeleteConfirm">×</button>
      </header>
      <p class="confirm-copy">
        Remove <strong>{{ deleteTarget?.name }}</strong>? This is available only when the instructor has no assigned students.
      </p>
      <p v-if="deleteError" class="form-error" role="alert">{{ deleteError }}</p>
      <footer class="modal-actions">
        <button type="button" class="button button-secondary" :disabled="deleting" @click="closeDeleteConfirm">Cancel</button>
        <button type="button" class="button button-danger" :disabled="deleting" @click="executeDelete">
          {{ deleting ? 'Removing...' : 'Remove Instructor' }}
        </button>
      </footer>
    </section>
  </div>

  <div v-if="toast.show" :class="['toast', `toast-${toast.type}`]" role="status">{{ toast.message }}</div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { API_BASE_URL } from '../../api/firebaseApi.js';

const props = defineProps({
  adminId: { type: String, default: 'admin-root' }
});

const API_BASE = `${API_BASE_URL}/admin`;
const REQUEST_TIMEOUT_MS = 20000;

const instructors = ref([]);
const loading = ref(false);
const loadError = ref('');
const searchQuery = ref('');
const showModal = ref(false);
const isEditing = ref(false);
const form = ref({ id: '', name: '', email: '', password: '' });
const formError = ref('');
const saving = ref(false);
const showPassword = ref(false);
const statusBusyId = ref('');
const showDeleteConfirm = ref(false);
const deleteTarget = ref(null);
const deleteError = ref('');
const deleting = ref(false);
const toast = ref({ show: false, message: '', type: 'success' });

let loadController = null;
let toastTimer = null;

const filteredInstructors = computed(() => {
  const query = searchQuery.value.toLocaleLowerCase();
  if (!query) return instructors.value;
  return instructors.value.filter(instructor => [instructor.name, instructor.email]
    .some(value => String(value || '').toLocaleLowerCase().includes(query)));
});

function adminHeaders(json = false) {
  return {
    ...(json ? { 'Content-Type': 'application/json' } : {}),
    'x-user-id': props.adminId || 'admin-root'
  };
}

async function fetchWithTimeout(url, options = {}) {
  const controller = options.controller || new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => { timedOut = true; controller.abort(); }, REQUEST_TIMEOUT_MS);
  try {
    const { controller: _controller, ...fetchOptions } = options;
    return await fetch(url, { ...fetchOptions, signal: controller.signal });
  } catch (error) {
    if (error?.name === 'AbortError' && timedOut) throw new Error('The server took too long to respond.');
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

async function responseData(response, fallback) {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || fallback);
  return data;
}

async function loadInstructors() {
  loadController?.abort();
  loadController = new AbortController();
  const requestController = loadController;
  loading.value = true;
  loadError.value = '';
  try {
    const response = await fetchWithTimeout(`${API_BASE}/instructors`, {
      headers: adminHeaders(),
      controller: requestController
    });
    const data = await responseData(response, 'Instructor accounts could not be loaded.');
    if (loadController !== requestController) return;
    instructors.value = Array.isArray(data.instructors) ? data.instructors : [];
  } catch (error) {
    if (loadController !== requestController || error?.name === 'AbortError') return;
    loadError.value = error.message || 'Instructor accounts could not be loaded.';
  } finally {
    if (loadController === requestController) loading.value = false;
  }
}

function initial(name) {
  return String(name || 'I').trim().charAt(0).toUpperCase();
}

function normalizedStatus(status) {
  return status === 'inactive' ? 'inactive' : 'active';
}

function statusLabel(status) {
  return normalizedStatus(status) === 'active' ? 'Active' : 'Inactive';
}

function openAddForm() {
  isEditing.value = false;
  form.value = { id: '', name: '', email: '', password: '' };
  formError.value = '';
  showPassword.value = false;
  showModal.value = true;
}

function openEditForm(instructor) {
  isEditing.value = true;
  form.value = { id: instructor.id, name: instructor.name || '', email: instructor.email || '', password: '' };
  formError.value = '';
  showPassword.value = false;
  showModal.value = true;
}

function closeModal() {
  if (saving.value) return;
  showModal.value = false;
  formError.value = '';
}

async function saveInstructor() {
  saving.value = true;
  formError.value = '';
  try {
    const editing = isEditing.value;
    const body = {
      name: form.value.name,
      email: form.value.email,
      ...(form.value.password.trim() ? { password: form.value.password } : {})
    };
    const response = await fetchWithTimeout(
      editing ? `${API_BASE}/instructors/${encodeURIComponent(form.value.id)}` : `${API_BASE}/instructors`,
      { method: editing ? 'PUT' : 'POST', headers: adminHeaders(true), body: JSON.stringify(body) }
    );
    const data = await responseData(response, 'The instructor account could not be saved.');
    showModal.value = false;
    showToast(data.message || (editing ? 'Instructor updated.' : 'Instructor created.'));
    await loadInstructors();
  } catch (error) {
    formError.value = error.message || 'The instructor account could not be saved.';
  } finally {
    saving.value = false;
  }
}

async function toggleStatus(instructor) {
  if (statusBusyId.value) return;
  statusBusyId.value = instructor.id;
  const status = normalizedStatus(instructor.status) === 'active' ? 'inactive' : 'active';
  try {
    const response = await fetchWithTimeout(`${API_BASE}/instructors/${encodeURIComponent(instructor.id)}/status`, {
      method: 'PATCH', headers: adminHeaders(true), body: JSON.stringify({ status })
    });
    const data = await responseData(response, 'The instructor status could not be updated.');
    instructor.status = status;
    showToast(data.message || `Instructor ${status === 'active' ? 'activated' : 'deactivated'}.`);
  } catch (error) {
    showToast(error.message || 'The instructor status could not be updated.', 'error');
  } finally {
    statusBusyId.value = '';
  }
}

function confirmDelete(instructor) {
  if (Number(instructor.studentCount) > 0) {
    showToast('Transfer assigned students before removing this instructor.', 'error');
    return;
  }
  deleteTarget.value = instructor;
  deleteError.value = '';
  showDeleteConfirm.value = true;
}

function closeDeleteConfirm() {
  if (deleting.value) return;
  showDeleteConfirm.value = false;
  deleteTarget.value = null;
  deleteError.value = '';
}

async function executeDelete() {
  if (!deleteTarget.value || Number(deleteTarget.value.studentCount) > 0) return;
  deleting.value = true;
  deleteError.value = '';
  try {
    const response = await fetchWithTimeout(`${API_BASE}/instructors/${encodeURIComponent(deleteTarget.value.id)}`, {
      method: 'DELETE', headers: adminHeaders()
    });
    const data = await responseData(response, 'The instructor account could not be removed.');
    showDeleteConfirm.value = false;
    deleteTarget.value = null;
    showToast(data.message || 'Instructor removed.');
    await loadInstructors();
  } catch (error) {
    deleteError.value = error.message || 'The instructor account could not be removed.';
  } finally {
    deleting.value = false;
  }
}

function showToast(message, type = 'success') {
  clearTimeout(toastTimer);
  toast.value = { show: true, message, type };
  toastTimer = setTimeout(() => { toast.value.show = false; }, 3200);
}

onMounted(loadInstructors);
onBeforeUnmount(() => {
  loadController?.abort();
  clearTimeout(toastTimer);
});
</script>

<style scoped>
* { box-sizing: border-box; }
.management-panel {
  width: 100%;
  min-width: 0;
  padding: 22px;
  color: #eaf4ff;
  background: rgba(9, 23, 43, 0.74);
  border: 1px solid rgba(53, 112, 153, 0.55);
  border-radius: 14px;
}
.panel-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 20px; }
.panel-header h2, .modal-header h3 { margin: 3px 0 5px; color: #fff; font-size: 1.25rem; }
.panel-header p:not(.panel-eyebrow) { margin: 0; color: #94abc5; font-size: .88rem; }
.panel-eyebrow { margin: 0; color: #40c7ff; font-size: .68rem; font-weight: 800; letter-spacing: .13em; text-transform: uppercase; }
.panel-eyebrow-danger { color: #fb7185; }
.header-actions, .modal-actions, .row-actions { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.button, .action-button, .inline-message button, .close-button, .password-field button {
  border-radius: 7px; border: 1px solid rgba(71, 154, 205, .65); cursor: pointer; font: inherit;
}
.button { min-height: 36px; padding: 8px 14px; color: #eaf7ff; font-size: .8rem; font-weight: 750; }
.button-primary { background: #087fae; }
.button-secondary { background: rgba(13, 40, 67, .9); }
.button-danger { color: #fff; background: #b42335; border-color: #ef5267; }
.button:hover:not(:disabled), .action-button:hover:not(:disabled) { filter: brightness(1.17); }
.button:disabled, .action-button:disabled { cursor: not-allowed; opacity: .46; }
.search-field { display: grid; gap: 6px; margin: 20px 0 14px; color: #a8bdd4; font-size: .75rem; }
.search-field input, .account-form input {
  width: 100%; min-height: 40px; padding: 9px 12px; color: #f4f9ff; background: #091b30;
  border: 1px solid #284966; border-radius: 8px; outline: none;
}
.search-field input:focus, .account-form input:focus { border-color: #35bff4; box-shadow: 0 0 0 2px rgba(53, 191, 244, .12); }
.search-field input::placeholder, .account-form input::placeholder { color: #65809a; }
.account-form input:disabled { color: #7890a8; cursor: not-allowed; background: #0b1929; }
.table-shell { overflow: hidden; border: 1px solid #24435f; border-radius: 11px; background: rgba(6, 18, 35, .55); }
.management-table { width: 100%; border-collapse: collapse; table-layout: fixed; }
.management-table th { padding: 11px 13px; color: #91a9c2; background: #0d2239; font-size: .69rem; letter-spacing: .06em; text-align: left; text-transform: uppercase; }
.management-table th:nth-child(1) { width: 35%; }
.management-table th:nth-child(2) { width: 14%; }
.management-table th:nth-child(3) { width: 17%; }
.management-table th:nth-child(4) { width: 34%; }
.management-table td { padding: 13px; border-top: 1px solid rgba(42, 72, 99, .62); vertical-align: middle; }
.management-table tbody tr:hover { background: rgba(20, 55, 82, .35); }
.person-cell { display: flex; align-items: center; gap: 10px; min-width: 0; }
.person-avatar { display: grid; place-items: center; flex: 0 0 34px; width: 34px; height: 34px; color: #061524; background: #35bff4; border-radius: 50%; font-weight: 900; }
.person-copy { display: grid; min-width: 0; gap: 2px; }
.person-copy strong, .person-copy small { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.person-copy strong { color: #f6f9fd; font-size: .88rem; }
.person-copy small { color: #87a0ba; font-size: .72rem; }
.status-badge { display: inline-flex; align-items: center; gap: 6px; padding: 4px 8px; border: 1px solid; border-radius: 999px; font-size: .7rem; font-weight: 800; }
.status-dot { width: 7px; height: 7px; border-radius: 50%; background: currentColor; }
.status-active { color: #42e7a5; background: rgba(17, 114, 78, .18); border-color: rgba(66, 231, 165, .34); }
.status-inactive { color: #a5b4c6; background: rgba(94, 111, 132, .14); border-color: rgba(165, 180, 198, .28); }
.student-count-cell { display: flex; align-items: baseline; gap: 5px; }
.student-count-cell strong { color: #4bc9ff; font-size: 1.02rem; }
.student-count-cell span { color: #92a9c1; font-size: .73rem; }
.action-button { min-height: 30px; padding: 5px 9px; color: #bdeaff; background: rgba(11, 44, 70, .9); font-size: .7rem; font-weight: 750; }
.action-button-danger { color: #ff98a6; background: rgba(112, 25, 43, .36); border-color: rgba(244, 83, 107, .65); }
.action-help { display: block; margin-top: 6px; color: #d8a35e; font-size: .66rem; }
.table-note { margin: 10px 2px 0; color: #7f98b2; font-size: .72rem; }
.empty-state { display: grid; place-items: center; gap: 7px; min-height: 180px; padding: 28px; color: #8fa7c0; text-align: center; }
.empty-state p { margin: 0; font-size: .82rem; }
.empty-state-error strong { color: #ff9ba9; }
.spinner { width: 28px; height: 28px; border: 3px solid rgba(64, 199, 255, .2); border-top-color: #40c7ff; border-radius: 50%; animation: spin .8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
.inline-message { display: flex; justify-content: space-between; gap: 12px; margin: 12px 0; padding: 10px 12px; border-radius: 8px; font-size: .77rem; }
.inline-message-error { color: #ffb0bb; background: rgba(121, 26, 44, .28); border: 1px solid rgba(244, 83, 107, .48); }
.inline-message button { color: #fff; background: transparent; border-color: currentColor; }
.modal-overlay { position: fixed; inset: 0; z-index: 10000; display: grid; place-items: center; padding: 18px; background: rgba(2, 8, 18, .82); backdrop-filter: blur(5px); }
.modal-card { width: min(500px, 100%); max-height: calc(100vh - 36px); overflow-y: auto; padding: 22px; color: #eaf4ff; background: #0c1d33; border: 1px solid #316484; border-radius: 14px; box-shadow: 0 24px 70px rgba(0,0,0,.52); }
.modal-card-small { width: min(440px, 100%); }
.modal-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; }
.close-button { width: 32px; height: 32px; color: #b5c9dc; background: #112b46; border-color: #2a516f; font-size: 1.2rem; }
.account-form { display: grid; gap: 15px; margin-top: 18px; }
.account-form > label { display: grid; gap: 6px; color: #a8bdd4; font-size: .74rem; }
.password-field { position: relative; }
.password-field input { padding-right: 58px; }
.password-field button { position: absolute; top: 5px; right: 5px; height: 30px; padding: 0 8px; color: #8edfff; background: #102c48; border-color: #28587b; font-size: .68rem; }
.form-error { margin: 0; padding: 10px 12px; color: #ffabb8; background: rgba(119, 24, 42, .3); border: 1px solid rgba(244, 83, 107, .45); border-radius: 8px; font-size: .78rem; }
.modal-actions { justify-content: flex-end; margin-top: 18px; }
.confirm-copy { color: #afc0d2; line-height: 1.55; }
.toast { position: fixed; right: 24px; bottom: 24px; z-index: 11000; max-width: min(380px, calc(100vw - 32px)); padding: 12px 16px; border-radius: 9px; color: #fff; font-size: .8rem; font-weight: 750; box-shadow: 0 12px 35px rgba(0,0,0,.4); }
.toast-success { background: #087a5a; border: 1px solid #31d69a; }
.toast-error { background: #8e263a; border: 1px solid #ff7083; }
@media (max-width: 820px) {
  .panel-header { align-items: stretch; flex-direction: column; }
  .header-actions .button { flex: 1; }
  .management-table, .management-table tbody, .management-table tr, .management-table td { display: block; width: 100%; }
  .management-table { table-layout: auto; }
  .management-table thead { display: none; }
  .management-table tr { padding: 10px 12px; border-top: 1px solid rgba(42,72,99,.72); }
  .management-table tr:first-child { border-top: 0; }
  .management-table td { display: grid; grid-template-columns: 118px minmax(0, 1fr); padding: 8px 0; border: 0; }
  .management-table td::before { content: attr(data-label); align-self: center; color: #7893ad; font-size: .65rem; font-weight: 800; letter-spacing: .05em; text-transform: uppercase; }
  .person-cell, .row-actions { min-width: 0; }
}
@media (max-width: 480px) {
  .management-panel { padding: 15px; }
  .management-table td { grid-template-columns: 1fr; gap: 6px; }
  .management-table td::before { display: block; }
  .row-actions .action-button { flex: 1; }
  .modal-actions .button { flex: 1; }
}
</style>
