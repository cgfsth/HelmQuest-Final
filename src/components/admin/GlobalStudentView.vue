<template>
  <section class="student-management-panel">
    <header class="panel-header">
      <div>
        <p class="panel-eyebrow">System-wide records</p>
        <h2>Student accounts and records</h2>
        <p>Review student accounts and the same saved progression shown in the training portals.</p>
      </div>
      <button type="button" class="button button-secondary" :disabled="loading" @click="loadStudents">
        {{ loading ? 'Refreshing...' : 'Refresh' }}
      </button>
    </header>

    <div class="filters-grid">
      <label class="field search-field">
        <span>Search students</span>
        <input v-model="searchQuery" type="search" placeholder="Name, student ID or email" autocomplete="off" />
      </label>
      <label class="field">
        <span>Account status</span>
        <select v-model="statusFilter">
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="pending">Pending</option>
          <option value="inactive">Inactive</option>
        </select>
      </label>
      <label class="field">
        <span>Instructor</span>
        <select v-model="instructorFilter">
          <option value="">All instructors</option>
          <option v-for="instructor in instructorsList" :key="instructor.id" :value="instructor.id">
            {{ instructor.name }}
          </option>
        </select>
      </label>
      <button type="button" class="button button-clear" :disabled="!hasFilters" @click="clearFilters">Clear</button>
    </div>

    <div v-if="selectedStudents.length" class="bulk-bar">
      <strong>{{ selectedStudents.length }} selected</strong>
      <span>Update the account status for the selected rows.</span>
      <div>
        <button type="button" class="button button-success" :disabled="bulkBusy" @click="bulkUpdateStatus('active')">Activate</button>
        <button type="button" class="button button-danger-outline" :disabled="bulkBusy" @click="bulkUpdateStatus('inactive')">Deactivate</button>
      </div>
    </div>

    <div v-if="loadError && students.length" class="inline-message inline-message-error" role="alert">
      <span>{{ loadError }}</span>
      <button type="button" @click="loadStudents">Try again</button>
    </div>

    <div v-if="loading && !students.length" class="empty-state" aria-live="polite">
      <span class="spinner" aria-hidden="true"></span>
      <p>Loading student records...</p>
    </div>

    <div v-else-if="loadError && !students.length" class="empty-state empty-state-error" role="alert">
      <strong>Student records could not be loaded.</strong>
      <p>{{ loadError }}</p>
      <button type="button" class="button button-secondary" @click="loadStudents">Try again</button>
    </div>

    <template v-else>
      <div class="table-shell">
        <table class="student-table">
          <thead>
            <tr>
              <th class="select-column">
                <input
                  type="checkbox"
                  aria-label="Select all students on this page"
                  :checked="allPageStudentsSelected"
                  @change="toggleSelectAll"
                />
              </th>
              <th>Student</th>
              <th>Instructor</th>
              <th>Rank / XP</th>
              <th>Training</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="student in students" :key="student.id">
              <td class="select-column" data-label="Select">
                <input
                  type="checkbox"
                  :aria-label="`Select ${student.name}`"
                  :checked="selectedStudents.includes(student.id)"
                  @change="toggleSelect(student.id)"
                />
              </td>
              <td data-label="Student">
                <div class="student-identity">
                  <strong>{{ student.name }}</strong>
                  <small>{{ student.studentId || 'No student ID' }}</small>
                  <small>{{ student.email || 'No email saved' }}</small>
                </div>
              </td>
              <td data-label="Instructor">
                <span :class="['instructor-name', { unassigned: !student.instructorId }]">
                  {{ student.instructorName || 'Unassigned' }}
                </span>
              </td>
              <td data-label="Rank / XP">
                <div class="rank-cell">
                  <strong>{{ student.rank || 'Deck Cadet' }}</strong>
                  <span>{{ number(student.xp) }} XP</span>
                </div>
              </td>
              <td data-label="Training">
                <div class="training-cell">
                  <span><strong>{{ number(student.missionsCompleted) }}/{{ number(student.missionsTotal) }}</strong> missions passed</span>
                  <span>
                    <strong>{{ number(student.quizzesCompleted) }}/{{ number(student.quizzesTotal) }}</strong> quizzes taken
                    <small>({{ number(student.quizzesPassed) }} passed)</small>
                  </span>
                </div>
              </td>
              <td data-label="Status">
                <span :class="['status-badge', `status-${normalizedStatus(student.status)}`]">
                  <span class="status-dot" aria-hidden="true"></span>
                  {{ statusLabel(student.status) }}
                </span>
              </td>
              <td data-label="Actions">
                <div class="row-actions">
                  <button type="button" class="action-button action-button-primary" @click="viewStudent(student)">View records</button>
                  <button type="button" class="action-button" @click="editStudent(student)">Edit</button>
                  <button type="button" class="action-button" @click="transferStudent(student)">Transfer</button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>

        <div v-if="!students.length" class="empty-state">
          <strong>No matching students</strong>
          <p>Change the filters to see other student accounts.</p>
        </div>
      </div>

      <footer v-if="students.length" class="table-footer">
        <span>Showing {{ pageStart }}–{{ pageEnd }} of {{ totalCount }} students</span>
        <div class="pagination">
          <button type="button" class="button button-secondary" :disabled="currentPage === 0 || loading" @click="changePage(-1)">Previous</button>
          <span>Page {{ currentPage + 1 }} of {{ totalPages }}</span>
          <button type="button" class="button button-secondary" :disabled="currentPage >= totalPages - 1 || loading" @click="changePage(1)">Next</button>
        </div>
      </footer>
    </template>
  </section>

  <div v-if="showEditModal" class="modal-overlay" @click.self="closeEditModal" @keydown.esc="closeEditModal">
    <section class="modal-card" role="dialog" aria-modal="true" aria-labelledby="edit-student-title">
      <header class="modal-header">
        <div>
          <p class="panel-eyebrow">Student account</p>
          <h3 id="edit-student-title">Edit Student</h3>
        </div>
        <button type="button" class="close-button" aria-label="Close" @click="closeEditModal">×</button>
      </header>

      <form class="account-form" @submit.prevent="saveStudent">
        <label>
          <span>Name</span>
          <input v-model.trim="editForm.name" type="text" required />
        </label>
        <label>
          <span>Email</span>
          <input v-model="editForm.email" type="email" disabled />
        </label>
        <label>
          <span>Student ID</span>
          <input v-model.trim="editForm.studentId" type="text" />
        </label>
        <label>
          <span>Account status</span>
          <select v-model="editForm.status">
            <option value="active">Active</option>
            <option value="pending">Pending</option>
            <option value="inactive">Inactive</option>
          </select>
        </label>
        <label>
          <span>New password (optional)</span>
          <div class="password-field">
            <input v-model="editForm.password" :type="showPassword ? 'text' : 'password'" minlength="6" placeholder="Leave blank to keep the password" />
            <button type="button" @click="showPassword = !showPassword">{{ showPassword ? 'Hide' : 'Show' }}</button>
          </div>
        </label>

        <p v-if="editError" class="form-error" role="alert">{{ editError }}</p>
        <footer class="modal-actions">
          <button type="button" class="button button-secondary" :disabled="savingStudent" @click="closeEditModal">Cancel</button>
          <button type="submit" class="button button-primary" :disabled="savingStudent">{{ savingStudent ? 'Saving...' : 'Save Changes' }}</button>
        </footer>
      </form>
    </section>
  </div>

  <div v-if="showTransferModal" class="modal-overlay" @click.self="closeTransferModal" @keydown.esc="closeTransferModal">
    <section class="modal-card modal-card-small" role="dialog" aria-modal="true" aria-labelledby="transfer-student-title">
      <header class="modal-header">
        <div>
          <p class="panel-eyebrow">Class assignment</p>
          <h3 id="transfer-student-title">Transfer Student</h3>
        </div>
        <button type="button" class="close-button" aria-label="Close" @click="closeTransferModal">×</button>
      </header>
      <p class="modal-copy">Assign <strong>{{ studentToTransfer?.name }}</strong> to an active instructor.</p>
      <label class="field modal-field">
        <span>New instructor</span>
        <select v-model="newInstructorId">
          <option value="">Select an instructor</option>
          <option v-for="instructor in activeInstructors" :key="instructor.id" :value="instructor.id">
            {{ instructor.name }}
          </option>
        </select>
      </label>
      <p v-if="transferError" class="form-error" role="alert">{{ transferError }}</p>
      <footer class="modal-actions">
        <button type="button" class="button button-secondary" :disabled="transferring" @click="closeTransferModal">Cancel</button>
        <button type="button" class="button button-primary" :disabled="!newInstructorId || transferring" @click="confirmTransfer">
          {{ transferring ? 'Transferring...' : 'Transfer Student' }}
        </button>
      </footer>
    </section>
  </div>

  <div v-if="showDetailsModal" class="modal-overlay" @click.self="closeDetailsModal" @keydown.esc="closeDetailsModal">
    <section class="modal-card records-modal" role="dialog" aria-modal="true" aria-labelledby="student-record-title">
      <header class="modal-header records-header">
        <div>
          <p class="panel-eyebrow">Saved training record</p>
          <h3 id="student-record-title">{{ selectedStudent?.name || 'Student' }}</h3>
          <p>{{ selectedStudent?.studentId || 'No student ID' }} · {{ selectedStudent?.email || 'No email saved' }}</p>
        </div>
        <button type="button" class="close-button" aria-label="Close" @click="closeDetailsModal">×</button>
      </header>

      <div v-if="detailLoading" class="empty-state details-loading">
        <span class="spinner" aria-hidden="true"></span>
        <p>Loading the latest saved records...</p>
      </div>
      <div v-else-if="detailError" class="empty-state empty-state-error">
        <strong>Training records could not be loaded.</strong>
        <p>{{ detailError }}</p>
        <button type="button" class="button button-secondary" @click="loadStudentRecord(selectedStudent?.id)">Try again</button>
      </div>
      <template v-else-if="selectedStudent">
        <div class="record-meta">
          <span>{{ selectedStudent.instructorName || 'Unassigned' }}</span>
          <span :class="['status-badge', `status-${normalizedStatus(selectedStudent.status)}`]">
            <span class="status-dot" aria-hidden="true"></span>
            {{ statusLabel(selectedStudent.status) }}
          </span>
          <span v-if="selectedStudent.latestActivity">Last activity: {{ formatDate(selectedStudent.latestActivity) }}</span>
        </div>

        <section class="rank-progress-card">
          <div>
            <span>Current rank</span>
            <strong>{{ selectedStudent.rank || 'Deck Cadet' }}</strong>
          </div>
          <div class="rank-xp-copy">
            <strong>{{ number(selectedStudent.xp) }} XP</strong>
            <span v-if="selectedStudent.nextRank">Next: {{ selectedStudent.nextRank }} at {{ number(selectedStudent.xpNextAt) }} XP</span>
            <span v-else>Highest rank reached</span>
          </div>
          <div class="progress-track" aria-hidden="true">
            <span :style="{ width: `${progressPercent(selectedStudent.xpProgress)}%` }"></span>
          </div>
        </section>

        <div class="record-summary-grid">
          <article>
            <span>Missions passed</span>
            <strong>{{ number(selectedStudent.missionsCompleted) }}/{{ number(selectedStudent.missionsTotal) }}</strong>
            <small v-if="number(selectedStudent.missionsFailed)">{{ number(selectedStudent.missionsFailed) }} latest failed result{{ number(selectedStudent.missionsFailed) === 1 ? '' : 's' }}</small>
          </article>
          <article>
            <span>Quizzes taken</span>
            <strong>{{ number(selectedStudent.quizzesCompleted) }}/{{ number(selectedStudent.quizzesTotal) }}</strong>
            <small>{{ number(selectedStudent.quizzesPassed) }} passed</small>
          </article>
          <article>
            <span>Badges earned</span>
            <strong>{{ number(selectedStudent.badgesEarned) }}</strong>
            <small>Based on saved progression</small>
          </article>
          <article>
            <span>Certificates</span>
            <strong>{{ number(selectedStudent.certificates) }}</strong>
            <small>Saved certificates</small>
          </article>
        </div>

        <section class="recent-results">
          <header>
            <h4>Latest saved results</h4>
            <span>Most recent mission and quiz records</span>
          </header>
          <div v-if="recentTrainingResults.length" class="result-list">
            <article v-for="result in recentTrainingResults" :key="result.key">
              <span class="result-type">{{ result.type }}</span>
              <div>
                <strong>{{ result.title }}</strong>
                <small>{{ formatDate(result.timestamp) }}</small>
              </div>
              <span :class="['result-status', { passed: result.status === 'Passed', failed: result.status === 'Failed' }]">{{ result.status }}</span>
              <strong class="result-score">{{ formatScore(result.score) }}</strong>
            </article>
          </div>
          <p v-else class="no-results">No mission or quiz result has been saved for this student.</p>
        </section>
      </template>
    </section>
  </div>

  <div v-if="toast.show" :class="['toast', `toast-${toast.type}`]" role="status">{{ toast.message }}</div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { API_BASE_URL } from '../../api/firebaseApi.js';

const props = defineProps({
  adminId: { type: String, default: 'admin-root' }
});

const API_BASE = `${API_BASE_URL}/admin`;
const REQUEST_TIMEOUT_MS = 20000;
const PAGE_LIMIT = 25;

const students = ref([]);
const instructorsList = ref([]);
const loading = ref(false);
const loadError = ref('');
const searchQuery = ref('');
const statusFilter = ref('');
const instructorFilter = ref('');
const selectedStudents = ref([]);
const currentPage = ref(0);
const totalCount = ref(0);
const bulkBusy = ref(false);

const showEditModal = ref(false);
const studentToEdit = ref(null);
const editForm = ref({ name: '', email: '', studentId: '', password: '', status: 'active' });
const editError = ref('');
const savingStudent = ref(false);
const showPassword = ref(false);

const showTransferModal = ref(false);
const studentToTransfer = ref(null);
const newInstructorId = ref('');
const transferError = ref('');
const transferring = ref(false);

const showDetailsModal = ref(false);
const selectedStudent = ref(null);
const detailLoading = ref(false);
const detailError = ref('');
const toast = ref({ show: false, message: '', type: 'success' });

let listController = null;
let detailController = null;
let searchTimer = null;
let toastTimer = null;

const totalPages = computed(() => Math.max(1, Math.ceil(totalCount.value / PAGE_LIMIT)));
const pageStart = computed(() => totalCount.value ? (currentPage.value * PAGE_LIMIT) + 1 : 0);
const pageEnd = computed(() => Math.min(totalCount.value, (currentPage.value * PAGE_LIMIT) + students.value.length));
const hasFilters = computed(() => Boolean(searchQuery.value || statusFilter.value || instructorFilter.value));
const activeInstructors = computed(() => instructorsList.value.filter(instructor => instructor.status !== 'inactive'));
const allPageStudentsSelected = computed(() => students.value.length > 0 && students.value.every(student => selectedStudents.value.includes(student.id)));
const recentTrainingResults = computed(() => {
  const student = selectedStudent.value;
  if (!student) return [];
  const missions = (student.missionsDetail || [])
    .filter(item => item.status !== 'Not Started')
    .map(item => ({ key: `mission-${item.missionId}`, type: 'Mission', title: item.title, status: item.status, score: item.score, timestamp: item.completedAt }));
  const quizzes = (student.quizzesDetail || [])
    .filter(item => item.status !== 'Not Started')
    .map(item => ({ key: `quiz-${item.quizId}`, type: 'Quiz', title: item.title, status: item.status, score: item.score, timestamp: item.submittedAt }));
  return [...missions, ...quizzes]
    .sort((left, right) => dateTime(right.timestamp) - dateTime(left.timestamp))
    .slice(0, 6);
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

async function loadStudents() {
  listController?.abort();
  const requestController = new AbortController();
  listController = requestController;
  loading.value = true;
  loadError.value = '';
  try {
    const params = new URLSearchParams({
      limit: String(PAGE_LIMIT),
      offset: String(currentPage.value * PAGE_LIMIT)
    });
    if (searchQuery.value.trim()) params.set('search', searchQuery.value.trim());
    if (statusFilter.value) params.set('status', statusFilter.value);
    if (instructorFilter.value) params.set('instructorId', instructorFilter.value);

    const response = await fetchWithTimeout(`${API_BASE}/students?${params.toString()}`, {
      headers: adminHeaders(), controller: requestController
    });
    const data = await responseData(response, 'Student records could not be loaded.');
    if (listController !== requestController) return;
    students.value = Array.isArray(data.students) ? data.students : [];
    totalCount.value = Number(data.pagination?.total ?? data.total ?? students.value.length) || 0;
    selectedStudents.value = selectedStudents.value.filter(id => students.value.some(student => student.id === id));
  } catch (error) {
    if (listController !== requestController || error?.name === 'AbortError') return;
    loadError.value = error.message || 'Student records could not be loaded.';
  } finally {
    if (listController === requestController) loading.value = false;
  }
}

async function loadInstructors() {
  try {
    const response = await fetchWithTimeout(`${API_BASE}/instructors`, { headers: adminHeaders() });
    const data = await responseData(response, 'Instructor choices could not be loaded.');
    instructorsList.value = Array.isArray(data.instructors) ? data.instructors : [];
  } catch (error) {
    showToast(error.message || 'Instructor choices could not be loaded.', 'error');
  }
}

function scheduleListLoad(delay = 0) {
  clearTimeout(searchTimer);
  currentPage.value = 0;
  searchTimer = setTimeout(loadStudents, delay);
}

function clearFilters() {
  searchQuery.value = '';
  statusFilter.value = '';
  instructorFilter.value = '';
  scheduleListLoad();
}

function toggleSelectAll() {
  if (allPageStudentsSelected.value) {
    selectedStudents.value = selectedStudents.value.filter(id => !students.value.some(student => student.id === id));
  } else {
    selectedStudents.value = [...new Set([...selectedStudents.value, ...students.value.map(student => student.id)])];
  }
}

function toggleSelect(studentId) {
  selectedStudents.value = selectedStudents.value.includes(studentId)
    ? selectedStudents.value.filter(id => id !== studentId)
    : [...selectedStudents.value, studentId];
}

async function bulkUpdateStatus(status) {
  if (!selectedStudents.value.length || bulkBusy.value) return;
  const label = status === 'active' ? 'activate' : 'deactivate';
  if (!window.confirm(`${label.charAt(0).toUpperCase() + label.slice(1)} ${selectedStudents.value.length} selected student account(s)?`)) return;
  bulkBusy.value = true;
  try {
    const response = await fetchWithTimeout(`${API_BASE}/students/bulk-status`, {
      method: 'PATCH', headers: adminHeaders(true),
      body: JSON.stringify({ studentIds: selectedStudents.value, status })
    });
    const data = await responseData(response, 'The selected accounts could not be updated.');
    selectedStudents.value = [];
    showToast(data.message || 'Student accounts updated.');
    await loadStudents();
  } catch (error) {
    showToast(error.message || 'The selected accounts could not be updated.', 'error');
  } finally {
    bulkBusy.value = false;
  }
}

function editStudent(student) {
  studentToEdit.value = student;
  editForm.value = {
    name: student.name || '', email: student.email || '', studentId: student.studentId || '',
    password: '', status: normalizedStatus(student.status) === 'rejected' ? 'inactive' : normalizedStatus(student.status)
  };
  editError.value = '';
  showPassword.value = false;
  showEditModal.value = true;
}

function closeEditModal() {
  if (savingStudent.value) return;
  showEditModal.value = false;
  editError.value = '';
}

async function saveStudent() {
  if (!studentToEdit.value || savingStudent.value) return;
  savingStudent.value = true;
  editError.value = '';
  try {
    const body = {
      name: editForm.value.name,
      studentId: editForm.value.studentId,
      status: editForm.value.status,
      ...(editForm.value.password.trim() ? { password: editForm.value.password } : {})
    };
    const response = await fetchWithTimeout(`${API_BASE}/students/${encodeURIComponent(studentToEdit.value.id)}`, {
      method: 'PUT', headers: adminHeaders(true), body: JSON.stringify(body)
    });
    const data = await responseData(response, 'The student account could not be updated.');
    showEditModal.value = false;
    showToast(data.message || 'Student updated.');
    await loadStudents();
  } catch (error) {
    editError.value = error.message || 'The student account could not be updated.';
  } finally {
    savingStudent.value = false;
  }
}

function transferStudent(student) {
  studentToTransfer.value = student;
  newInstructorId.value = student.instructorId || '';
  transferError.value = '';
  showTransferModal.value = true;
}

function closeTransferModal() {
  if (transferring.value) return;
  showTransferModal.value = false;
  transferError.value = '';
}

async function confirmTransfer() {
  if (!studentToTransfer.value || !newInstructorId.value || transferring.value) return;
  transferring.value = true;
  transferError.value = '';
  try {
    const response = await fetchWithTimeout(`${API_BASE}/students/${encodeURIComponent(studentToTransfer.value.id)}/transfer`, {
      method: 'PUT', headers: adminHeaders(true), body: JSON.stringify({ newInstructorId: newInstructorId.value })
    });
    const data = await responseData(response, 'The student could not be transferred.');
    showTransferModal.value = false;
    showToast(data.message || 'Student transferred.');
    await Promise.all([loadStudents(), loadInstructors()]);
  } catch (error) {
    transferError.value = error.message || 'The student could not be transferred.';
  } finally {
    transferring.value = false;
  }
}

function viewStudent(student) {
  selectedStudent.value = student;
  showDetailsModal.value = true;
  loadStudentRecord(student.id);
}

async function loadStudentRecord(studentId) {
  if (!studentId) return;
  detailController?.abort();
  const requestController = new AbortController();
  detailController = requestController;
  detailLoading.value = true;
  detailError.value = '';
  try {
    const response = await fetchWithTimeout(`${API_BASE}/students/${encodeURIComponent(studentId)}/training-record`, {
      headers: adminHeaders(), controller: requestController
    });
    const data = await responseData(response, 'Training records could not be loaded.');
    if (detailController !== requestController) return;
    selectedStudent.value = data.student || selectedStudent.value;
  } catch (error) {
    if (detailController !== requestController || error?.name === 'AbortError') return;
    detailError.value = error.message || 'Training records could not be loaded.';
  } finally {
    if (detailController === requestController) detailLoading.value = false;
  }
}

function closeDetailsModal() {
  detailController?.abort();
  showDetailsModal.value = false;
  detailError.value = '';
}

function changePage(direction) {
  const target = currentPage.value + direction;
  if (target < 0 || target >= totalPages.value) return;
  currentPage.value = target;
  loadStudents();
}

function number(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
}

function normalizedStatus(status) {
  if (status === 'pending') return 'pending';
  if (status === 'inactive' || status === 'rejected') return 'inactive';
  return 'active';
}

function statusLabel(status) {
  const normalized = normalizedStatus(status);
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

function progressPercent(value) {
  return Math.min(100, Math.max(0, Number(value) || 0));
}

function dateTime(value) {
  const parsed = new Date(value || 0).getTime();
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatDate(value) {
  const parsed = dateTime(value);
  if (!parsed) return 'Date unavailable';
  return new Intl.DateTimeFormat('en-PH', { dateStyle: 'medium', timeStyle: 'short' }).format(parsed);
}

function formatScore(value) {
  return value === null || value === undefined || value === '' ? '—' : `${number(value)}%`;
}

function showToast(message, type = 'success') {
  clearTimeout(toastTimer);
  toast.value = { show: true, message, type };
  toastTimer = setTimeout(() => { toast.value.show = false; }, 3200);
}

watch(searchQuery, () => scheduleListLoad(300));
watch([statusFilter, instructorFilter], () => scheduleListLoad());
watch(() => props.adminId, () => {
  currentPage.value = 0;
  Promise.all([loadStudents(), loadInstructors()]);
});

onMounted(() => Promise.all([loadStudents(), loadInstructors()]));
onBeforeUnmount(() => {
  listController?.abort();
  detailController?.abort();
  clearTimeout(searchTimer);
  clearTimeout(toastTimer);
});
</script>

<style scoped>
* { box-sizing: border-box; }
.student-management-panel {
  width: 100%; min-width: 0; padding: 22px; color: #eaf4ff;
  background: rgba(9, 23, 43, .74); border: 1px solid rgba(53,112,153,.55); border-radius: 14px;
}
.panel-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 20px; }
.panel-header h2, .modal-header h3 { margin: 3px 0 5px; color: #fff; font-size: 1.25rem; }
.panel-header p:not(.panel-eyebrow), .records-header p { margin: 0; color: #94abc5; font-size: .84rem; }
.panel-eyebrow { margin: 0; color: #40c7ff; font-size: .68rem; font-weight: 800; letter-spacing: .13em; text-transform: uppercase; }
.button, .action-button, .inline-message button, .close-button, .password-field button {
  border-radius: 7px; border: 1px solid rgba(71,154,205,.65); cursor: pointer; font: inherit;
}
.button { min-height: 36px; padding: 8px 14px; color: #eaf7ff; font-size: .76rem; font-weight: 750; }
.button-primary { background: #087fae; }
.button-secondary { background: rgba(13,40,67,.9); }
.button-clear { align-self: end; background: rgba(53,70,88,.42); }
.button-success { background: #087a5a; border-color: #28bd89; }
.button-danger-outline { color: #ff9aaa; background: rgba(105,24,42,.35); border-color: #d84b61; }
.button:hover:not(:disabled), .action-button:hover:not(:disabled) { filter: brightness(1.17); }
.button:disabled, .action-button:disabled { cursor: not-allowed; opacity: .46; }
.filters-grid { display: grid; grid-template-columns: minmax(220px, 1fr) 150px 180px auto; gap: 10px; margin: 20px 0 14px; }
.field { display: grid; gap: 6px; color: #a8bdd4; font-size: .71rem; }
.field input, .field select, .account-form input, .account-form select {
  width: 100%; min-height: 40px; padding: 9px 11px; color: #f4f9ff; background: #091b30;
  border: 1px solid #284966; border-radius: 8px; outline: none;
}
.field input:focus, .field select:focus, .account-form input:focus, .account-form select:focus { border-color: #35bff4; box-shadow: 0 0 0 2px rgba(53,191,244,.12); }
.field input::placeholder, .account-form input::placeholder { color: #65809a; }
.field select option, .account-form select option { color: #f4f9ff; background: #0b1f36; }
.account-form input:disabled { color: #7890a8; cursor: not-allowed; background: #0b1929; }
.bulk-bar { display: flex; align-items: center; gap: 12px; margin-bottom: 12px; padding: 10px 12px; color: #a9bed3; background: rgba(23,84,121,.28); border: 1px solid rgba(54,160,220,.38); border-radius: 9px; font-size: .74rem; }
.bulk-bar strong { color: #fff; }
.bulk-bar > div { display: flex; gap: 7px; margin-left: auto; }
.table-shell { overflow: hidden; border: 1px solid #24435f; border-radius: 11px; background: rgba(6,18,35,.55); }
.student-table { width: 100%; border-collapse: collapse; table-layout: fixed; }
.student-table th { padding: 10px 9px; color: #91a9c2; background: #0d2239; font-size: .66rem; letter-spacing: .055em; text-align: left; text-transform: uppercase; }
.student-table th:nth-child(1) { width: 4%; }
.student-table th:nth-child(2) { width: 21%; }
.student-table th:nth-child(3) { width: 13%; }
.student-table th:nth-child(4) { width: 13%; }
.student-table th:nth-child(5) { width: 20%; }
.student-table th:nth-child(6) { width: 9%; }
.student-table th:nth-child(7) { width: 20%; }
.student-table td { padding: 12px 9px; border-top: 1px solid rgba(42,72,99,.62); vertical-align: middle; }
.student-table tbody tr:hover { background: rgba(20,55,82,.35); }
.select-column { text-align: center !important; }
.select-column input { width: 15px; height: 15px; accent-color: #36bff4; }
.student-identity { display: grid; min-width: 0; gap: 2px; }
.student-identity strong, .student-identity small { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.student-identity strong { color: #f7fbff; font-size: .84rem; }
.student-identity small { color: #819ab4; font-size: .66rem; }
.instructor-name { display: block; overflow: hidden; color: #56ddb0; font-size: .76rem; font-weight: 700; text-overflow: ellipsis; white-space: nowrap; }
.instructor-name.unassigned { color: #d2a45d; }
.rank-cell, .training-cell { display: grid; gap: 3px; }
.rank-cell strong { color: #f1f6fb; font-size: .77rem; }
.rank-cell span { color: #43caff; font-size: .7rem; font-weight: 800; }
.training-cell span { color: #aec0d2; font-size: .68rem; line-height: 1.35; }
.training-cell strong { color: #f4f8fc; }
.training-cell small { color: #6fe2b1; font-size: .62rem; }
.status-badge { display: inline-flex; align-items: center; gap: 5px; padding: 4px 7px; border: 1px solid; border-radius: 999px; font-size: .66rem; font-weight: 800; }
.status-dot { width: 6px; height: 6px; border-radius: 50%; background: currentColor; }
.status-active { color: #42e7a5; background: rgba(17,114,78,.18); border-color: rgba(66,231,165,.34); }
.status-pending { color: #ffd16c; background: rgba(136,91,12,.2); border-color: rgba(255,209,108,.36); }
.status-inactive { color: #a5b4c6; background: rgba(94,111,132,.14); border-color: rgba(165,180,198,.28); }
.row-actions { display: flex; align-items: center; gap: 5px; flex-wrap: wrap; }
.action-button { min-height: 29px; padding: 5px 8px; color: #bdeaff; background: rgba(11,44,70,.9); font-size: .64rem; font-weight: 750; white-space: nowrap; }
.action-button-primary { color: #e6f8ff; background: #0b668c; border-color: #35bdf1; }
.table-footer { display: flex; align-items: center; justify-content: space-between; gap: 14px; margin-top: 11px; color: #819bb5; font-size: .7rem; }
.pagination { display: flex; align-items: center; gap: 10px; }
.empty-state { display: grid; place-items: center; gap: 7px; min-height: 180px; padding: 28px; color: #8fa7c0; text-align: center; }
.empty-state p { margin: 0; font-size: .8rem; }
.empty-state-error strong { color: #ff9ba9; }
.spinner { width: 28px; height: 28px; border: 3px solid rgba(64,199,255,.2); border-top-color: #40c7ff; border-radius: 50%; animation: spin .8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
.inline-message { display: flex; justify-content: space-between; gap: 12px; margin: 12px 0; padding: 10px 12px; border-radius: 8px; font-size: .77rem; }
.inline-message-error { color: #ffb0bb; background: rgba(121,26,44,.28); border: 1px solid rgba(244,83,107,.48); }
.inline-message button { color: #fff; background: transparent; border-color: currentColor; }
.modal-overlay { position: fixed; inset: 0; z-index: 10000; display: grid; place-items: center; padding: 18px; background: rgba(2,8,18,.84); backdrop-filter: blur(5px); }
.modal-card { width: min(520px, 100%); max-height: calc(100vh - 36px); overflow-y: auto; padding: 22px; color: #eaf4ff; background: #0c1d33; border: 1px solid #316484; border-radius: 14px; box-shadow: 0 24px 70px rgba(0,0,0,.52); }
.modal-card-small { width: min(450px, 100%); }
.records-modal { width: min(820px, 100%); }
.modal-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; }
.close-button { flex: 0 0 32px; width: 32px; height: 32px; color: #b5c9dc; background: #112b46; border-color: #2a516f; font-size: 1.2rem; }
.account-form { display: grid; gap: 14px; margin-top: 18px; }
.account-form > label { display: grid; gap: 6px; color: #a8bdd4; font-size: .72rem; }
.password-field { position: relative; }
.password-field input { padding-right: 58px; }
.password-field button { position: absolute; top: 5px; right: 5px; height: 30px; padding: 0 8px; color: #8edfff; background: #102c48; border-color: #28587b; font-size: .68rem; }
.modal-copy { margin: 18px 0 0; color: #aec0d2; font-size: .84rem; }
.modal-field { margin-top: 16px; }
.form-error { margin: 0; padding: 10px 12px; color: #ffabb8; background: rgba(119,24,42,.3); border: 1px solid rgba(244,83,107,.45); border-radius: 8px; font-size: .78rem; }
.modal-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 18px; }
.details-loading { min-height: 300px; }
.record-meta { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; margin: 16px 0 12px; color: #8da5bc; font-size: .7rem; }
.rank-progress-card { display: grid; grid-template-columns: 1fr auto; gap: 8px 18px; padding: 14px; background: linear-gradient(120deg, rgba(9,82,117,.45), rgba(11,40,67,.68)); border: 1px solid rgba(60,184,236,.42); border-radius: 10px; }
.rank-progress-card > div:first-child, .rank-xp-copy { display: grid; gap: 3px; }
.rank-progress-card span { color: #9ab2c9; font-size: .68rem; }
.rank-progress-card strong { color: #fff; font-size: .98rem; }
.rank-xp-copy { text-align: right; }
.rank-xp-copy strong { color: #4fd1ff; }
.progress-track { grid-column: 1 / -1; height: 5px; overflow: hidden; background: rgba(4,18,32,.75); border-radius: 99px; }
.progress-track span { display: block; height: 100%; background: linear-gradient(90deg, #37bff3, #3ee7a7); border-radius: inherit; }
.record-summary-grid { display: grid; grid-template-columns: repeat(4, minmax(0,1fr)); gap: 9px; margin-top: 10px; }
.record-summary-grid article { display: grid; gap: 4px; min-width: 0; padding: 12px; background: rgba(7,22,39,.65); border: 1px solid #24445f; border-radius: 9px; }
.record-summary-grid span { color: #8fa8bf; font-size: .66rem; }
.record-summary-grid strong { color: #f7fbff; font-size: 1.02rem; }
.record-summary-grid small { color: #6f8ca6; font-size: .61rem; line-height: 1.35; }
.recent-results { margin-top: 16px; }
.recent-results > header { display: flex; align-items: baseline; justify-content: space-between; gap: 10px; margin-bottom: 7px; }
.recent-results h4 { margin: 0; color: #fff; font-size: .86rem; }
.recent-results header span { color: #7791aa; font-size: .65rem; }
.result-list { overflow: hidden; border: 1px solid #25445f; border-radius: 9px; }
.result-list article { display: grid; grid-template-columns: 58px minmax(0,1fr) 66px 48px; align-items: center; gap: 10px; padding: 9px 11px; border-top: 1px solid rgba(42,72,99,.55); }
.result-list article:first-child { border-top: 0; }
.result-type { color: #55ccfa; font-size: .64rem; font-weight: 800; text-transform: uppercase; }
.result-list article > div { display: grid; min-width: 0; gap: 2px; }
.result-list article > div strong { overflow: hidden; color: #e9f2fa; font-size: .75rem; text-overflow: ellipsis; white-space: nowrap; }
.result-list article small { color: #738ba3; font-size: .6rem; }
.result-status { color: #a9b9ca; font-size: .67rem; font-weight: 750; }
.result-status.passed { color: #46dda5; }
.result-status.failed { color: #ff8798; }
.result-score { color: #f8fbff; font-size: .72rem; text-align: right; }
.no-results { margin: 0; padding: 22px; color: #8199b1; background: rgba(7,22,39,.55); border: 1px dashed #2b506e; border-radius: 9px; font-size: .75rem; text-align: center; }
.toast { position: fixed; right: 24px; bottom: 24px; z-index: 11000; max-width: min(380px, calc(100vw - 32px)); padding: 12px 16px; border-radius: 9px; color: #fff; font-size: .8rem; font-weight: 750; box-shadow: 0 12px 35px rgba(0,0,0,.4); }
.toast-success { background: #087a5a; border: 1px solid #31d69a; }
.toast-error { background: #8e263a; border: 1px solid #ff7083; }
@media (max-width: 1080px) {
  .filters-grid { grid-template-columns: minmax(220px, 1fr) 150px 180px; }
  .button-clear { grid-column: 3; justify-self: end; }
  .student-table, .student-table tbody, .student-table tr, .student-table td { display: block; width: 100%; }
  .student-table { table-layout: auto; }
  .student-table thead { display: none; }
  .student-table tr { position: relative; padding: 11px 13px; border-top: 1px solid rgba(42,72,99,.72); }
  .student-table tr:first-child { border-top: 0; }
  .student-table td { display: grid; grid-template-columns: 122px minmax(0,1fr); padding: 7px 0; border: 0; }
  .student-table td::before { content: attr(data-label); align-self: center; color: #7893ad; font-size: .63rem; font-weight: 800; letter-spacing: .05em; text-transform: uppercase; }
  .student-table .select-column { position: absolute; top: 12px; right: 12px; display: block; width: auto; padding: 0; }
  .student-table .select-column::before { display: none; }
  .student-identity { padding-right: 28px; }
}
@media (max-width: 720px) {
  .panel-header { align-items: stretch; flex-direction: column; }
  .filters-grid { grid-template-columns: 1fr 1fr; }
  .search-field { grid-column: 1 / -1; }
  .button-clear { grid-column: auto; justify-self: stretch; align-self: end; }
  .bulk-bar, .table-footer { align-items: stretch; flex-direction: column; }
  .bulk-bar > div { margin-left: 0; }
  .bulk-bar .button { flex: 1; }
  .pagination { justify-content: space-between; }
  .record-summary-grid { grid-template-columns: 1fr 1fr; }
}
@media (max-width: 480px) {
  .student-management-panel { padding: 15px; }
  .filters-grid { grid-template-columns: 1fr; }
  .search-field { grid-column: auto; }
  .student-table td { grid-template-columns: 1fr; gap: 5px; }
  .row-actions .action-button { flex: 1; }
  .modal-actions .button { flex: 1; }
  .rank-progress-card { grid-template-columns: 1fr; }
  .rank-xp-copy { text-align: left; }
  .progress-track { grid-column: auto; }
  .result-list article { grid-template-columns: 50px minmax(0,1fr) 48px; }
  .result-status { grid-column: 2; }
  .result-score { grid-column: 3; grid-row: 1 / span 2; }
}
</style>
