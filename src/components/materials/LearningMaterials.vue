<template>
  <section class="lm" aria-label="Learning materials" :aria-busy="loading || busy">
    <PdfDocumentViewer v-if="document" :key="document.kind + document.id" :document="document" @back="document = null" />
    <template v-else>
      <div class="lm-toolbar">
        <div><p class="lm-eyebrow">COURSE LIBRARY</p><h2>{{ selected ? selected.title : 'Your learning materials' }}</h2><p>{{ selected ? 'Syllabus and learning modules' : manager ? 'Organize course documents for your students.' : 'Read the course documents shared by your instructor.' }}</p></div>
        <div class="lm-actions">
          <button v-if="selected" type="button" @click="back"><ArrowLeft :size="17" /> All syllabi</button>
          <button v-if="manager && !selected" class="lm-primary" type="button" :disabled="loading || busy || !ready" @click="edit('syllabus')"><Plus :size="18" /> Create syllabus</button>
          <button type="button" :disabled="loading || busy" aria-label="Refresh learning materials" @click="refresh"><RefreshCw :size="18" /></button>
        </div>
      </div>
      <p v-if="error" class="lm-alert lm-error" role="alert">{{ error }} <button type="button" :disabled="loading || busy" @click="refresh">Try again</button></p>
      <p v-if="notice" class="lm-alert" role="status">{{ notice }}</p>
      <div v-if="manager && cleanupPending" class="lm-alert">Some file cleanup is pending. <button type="button" :disabled="busy" @click="retryCleanup">Retry cleanup</button></div>
      <p v-if="loading" class="lm-empty" role="status">Loading learning materials…</p>
      <template v-else-if="ready">
        <form v-if="!selected" class="lm-filters" role="search" @submit.prevent>
          <label><span class="lm-sr">Search syllabi</span><Search :size="18" /><input v-model="search" placeholder="Search syllabi by title" type="search" maxlength="180" /></label>
          <label v-if="role === 'admin'"><span class="lm-sr">Filter by instructor</span><select v-model="filter"><option value="">All instructors</option><option v-for="item in instructors" :key="item.id" :value="item.id">{{ item.name }}</option></select></label>
        </form>
        <div v-if="!selected && visibleSyllabi.length" class="lm-grid">
          <article v-for="item in visibleSyllabi" :key="item.id" class="lm-card">
            <div class="lm-card-top"><span class="lm-document-icon"><BookOpen :size="24" /></span><span class="lm-tag">SYLLABUS</span></div>
            <h3>{{ item.title }}</h3><p class="lm-description">{{ item.description || 'Course syllabus and supporting reading.' }}</p>
            <div class="lm-card-meta"><span>{{ item.instructorName }}</span><span><FolderOpen :size="15" /> {{ item.moduleCount }} {{ item.moduleCount === 1 ? 'module' : 'modules' }}</span></div>
            <button type="button" class="lm-primary" @click="open(item.id)"><Eye :size="17" /> View syllabus <ChevronRight :size="17" /></button>
          </article>
        </div>
        <div v-else-if="!selected" class="lm-empty"><BookOpen :size="36" /><h3>{{ search || filter ? 'No matching syllabi' : 'No syllabi yet' }}</h3><p>{{ manager ? 'Create a syllabus and upload its PDF to start your course library.' : 'Your instructor’s uploaded course materials will appear here.' }}</p></div>
        <template v-else>
          <article class="lm-card lm-syllabus">
            <div class="lm-card-top"><span class="lm-tag">SYLLABUS</span><span>{{ selected.instructorName }}</span></div>
            <p class="lm-full-description">{{ selected.description || 'No description provided.' }}</p>
            <p class="lm-file"><FileText :size="17" /> {{ selected.fileName }} <span>{{ size(selected.fileSize) }}</span></p>
            <div class="lm-actions"><button type="button" class="lm-primary" @click="view('syllabus', selected)"><Eye :size="17" /> View syllabus PDF</button><template v-if="manager"><button type="button" :disabled="busy" @click="edit('syllabus', selected)"><Pencil :size="16" /> Edit</button><button type="button" class="lm-danger" :disabled="busy" @click="confirmDelete('syllabus', selected)"><Trash2 :size="16" /> Delete</button></template></div>
          </article>
          <div class="lm-module-header"><h3><FolderOpen :size="21" /> Learning modules <span>{{ modules.length }}</span></h3><button v-if="manager" type="button" class="lm-primary" :disabled="busy" @click="edit('module')"><Plus :size="17" /> Add module</button></div>
          <ol v-if="modules.length" class="lm-modules">
            <li v-for="(item, index) in modules" :key="item.id" class="lm-card lm-module">
              <span class="lm-number">{{ String(item.moduleNumber).padStart(2, '0') }}</span>
              <div class="lm-module-copy"><h3>{{ item.title }}</h3><p>{{ item.description }}</p><p class="lm-file"><FileText :size="15" /> {{ item.fileName }} <span>{{ size(item.fileSize) }}</span></p></div>
              <div class="lm-actions"><button type="button" @click="view('module', item)"><Eye :size="17" /> View PDF</button><template v-if="manager"><button type="button" :disabled="busy" :aria-label="'Edit module ' + item.moduleNumber" @click="edit('module', item)"><Pencil :size="17" /></button><button type="button" class="lm-danger" :disabled="busy" :aria-label="'Delete module ' + item.moduleNumber" @click="confirmDelete('module', item)"><Trash2 :size="17" /></button><button type="button" :disabled="busy || index === 0" :aria-label="'Move module ' + item.moduleNumber + ' up'" @click="move(index, -1)"><ArrowUp :size="17" /></button><button type="button" :disabled="busy || index === modules.length - 1" :aria-label="'Move module ' + item.moduleNumber + ' down'" @click="move(index, 1)"><ArrowDown :size="17" /></button></template></div>
            </li>
          </ol>
          <div v-else class="lm-empty"><FolderOpen :size="32" /><h3>No modules yet</h3><p>{{ manager ? 'Add a module and its PDF to this syllabus.' : 'Your instructor has not added modules to this syllabus yet.' }}</p></div>
        </template>
      </template>
    </template>
    <Teleport to="body">
      <div v-if="editor || removal" class="lm-modal-backdrop" @click.self="closeModal" @keydown.esc="closeModal">
        <section ref="modal" class="lm lm-modal" role="dialog" aria-modal="true" aria-labelledby="lm-dialog-title" tabindex="-1" @keydown.tab="trapFocus">
          <template v-if="editor">
            <div class="lm-toolbar"><h2 id="lm-dialog-title">{{ editor.id ? 'Edit' : 'Create' }} {{ editor.kind === 'module' ? 'module' : 'syllabus' }}</h2><button type="button" aria-label="Close dialog" :disabled="busy" @click="closeModal"><X :size="20" /></button></div>
            <form class="lm-form" @submit.prevent="save">
              <label>Title<input v-model="form.title" required maxlength="180" :disabled="busy" autofocus /></label>
              <label>Description<textarea v-model="form.description" rows="3" maxlength="2500" :disabled="busy" /></label>
              <label v-if="editor.kind === 'syllabus' && role === 'admin'">Assigned instructor<select v-model="form.instructorId" required :disabled="busy"><option value="" disabled>Select an instructor</option><option v-for="item in instructors" :key="item.id" :value="item.id">{{ item.name }}</option></select></label>
              <label v-if="editor.kind === 'module'">Module number<input v-model.number="form.moduleNumber" type="number" min="1" max="999" required :disabled="busy" /></label>
              <label class="lm-upload"><Upload :size="24" /><strong>{{ editor.id ? 'Replace PDF (optional)' : 'Upload PDF' }}</strong><span>{{ file?.name || editor.fileName || 'Choose a PDF document' }}</span><input type="file" accept="application/pdf,.pdf" :required="!editor.id" :disabled="busy" @change="chooseFile" /><small>PDF only · Maximum 15 MB</small></label>
              <div v-if="busy" role="status"><label for="lm-progress">{{ progress < 100 ? 'Uploading… ' + progress + '%' : 'Saving document…' }}</label><progress id="lm-progress" :value="progress" max="100" /></div>
              <p v-if="modalError" class="lm-alert lm-error" role="alert">{{ modalError }}</p>
              <div class="lm-actions lm-form-footer"><button type="button" :disabled="busy" @click="closeModal">Cancel</button><button type="submit" class="lm-primary" :disabled="busy">{{ busy ? 'Saving…' : 'Save document' }}</button></div>
            </form>
          </template>
          <template v-else>
            <h2 id="lm-dialog-title">Delete {{ removal.kind === 'module' ? 'module' : 'syllabus' }}?</h2><p>“{{ removal.title }}” and its PDF will be removed from the course library.</p><p v-if="removal.kind === 'syllabus'">Delete its modules first. A syllabus with modules cannot be deleted.</p>
            <p v-if="modalError" class="lm-alert lm-error" role="alert">{{ modalError }}</p><div class="lm-actions lm-form-footer"><button type="button" :disabled="busy" @click="closeModal">Cancel</button><button type="button" class="lm-danger" :disabled="busy" @click="remove">{{ busy ? 'Deleting…' : 'Delete document' }}</button></div>
          </template>
        </section>
      </div>
    </Teleport>
  </section>
</template>

<script setup>
import { computed, defineAsyncComponent, nextTick, onBeforeUnmount, ref, watch } from 'vue';
import { ArrowDown, ArrowLeft, ArrowUp, BookOpen, ChevronRight, Eye, FileText, FolderOpen, Pencil, Plus, RefreshCw, Search, Trash2, Upload, X } from '@lucide/vue';
import * as api from '../../api/firebaseApi.js';
import './materials.css';
const PdfDocumentViewer = defineAsyncComponent(() => import('./PdfDocumentViewer.vue'));
const props = defineProps({ currentUser: { type: Object, required: true }, role: { type: String, required: true }, prepareAccess: { type: Function, default: async () => {} } });
const manager = computed(() => ['instructor', 'admin'].includes(props.role));
const syllabi = ref([]), modules = ref([]), instructors = ref([]), selected = ref(null), document = ref(null);
const loading = ref(false), busy = ref(false), ready = ref(false), error = ref(''), notice = ref(''), cleanupPending = ref(false);
const search = ref(''), filter = ref(''), editor = ref(null), removal = ref(null), modal = ref(null), modalError = ref('');
const form = ref({}), file = ref(null), progress = ref(0);
const visibleSyllabi = computed(() => syllabi.value.filter(item => (!filter.value || item.instructorId === filter.value) && item.title.toLowerCase().includes(search.value.toLowerCase())));
let controller, mutation, generation = 0, identity = 0, focusReturn, previousOverflow;
const size = value => value ? value < 1048576 ? Math.ceil(value / 1024) + ' KB' : (value / 1048576).toFixed(1) + ' MB' : '';
async function load(id = null) {
  controller?.abort(); controller = new AbortController();
  const signal = controller.signal, ticket = ++generation;
  loading.value = true; error.value = '';
  try {
    await props.prepareAccess({ signal });
    if (signal.aborted) return;
    if (manager.value && !instructors.value.length) {
      const choices = await api.getMaterialsInstructors({ signal });
      if (ticket !== generation || signal.aborted) return;
      instructors.value = choices;
    }
    const result = id ? await api.getLearningSyllabus(id, { signal }) : await api.listLearningSyllabi({ signal });
    if (ticket !== generation || signal.aborted) return;
    if (id) { selected.value = result.syllabus; modules.value = result.modules; }
    else { selected.value = null; syllabi.value = result.syllabi; }
    cleanupPending.value = !!result.cleanupPending || !!result.syllabus?.cleanupPending;
    ready.value = true;
  } catch (err) { if (ticket === generation && !signal.aborted) error.value = err.message || 'Unable to load materials.'; }
  finally { if (ticket === generation) loading.value = false; }
}
const open = id => load(id);
const refresh = () => load(selected.value?.id);
function back() { selected.value = null; modules.value = []; notice.value = ''; load(); }
function view(kind, item) { document.value = { kind, id: item.id, title: item.title }; }
function beginModal() { focusReturn = window.document.activeElement; previousOverflow = window.document.body.style.overflow; window.document.body.style.overflow = 'hidden'; nextTick(() => (modal.value?.querySelector('input,button') || modal.value)?.focus()); }
function edit(kind, item = {}) {
  if (!manager.value) return;
  editor.value = { ...item, kind }; modalError.value = ''; file.value = null; progress.value = 0;
  form.value = { title: item.title || '', description: item.description || '', instructorId: item.instructorId || (props.role === 'instructor' ? props.currentUser.id : ''), moduleNumber: item.moduleNumber || Math.max(0, ...modules.value.map(module => module.moduleNumber)) + 1, revision: item.revision };
  beginModal();
}
function confirmDelete(kind, item) { if (!manager.value) return; removal.value = { ...item, kind }; modalError.value = ''; beginModal(); }
function closeModal(force = false) {
  if (busy.value && force !== true) return;
  editor.value = null; removal.value = null; file.value = null;
  if (previousOverflow !== undefined) { window.document.body.style.overflow = previousOverflow; previousOverflow = undefined; }
  nextTick(() => focusReturn?.isConnected && focusReturn.focus());
}
function trapFocus(event) {
  const items = [...modal.value.querySelectorAll('button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled),[tabindex="0"]')];
  if (!items.length) { event.preventDefault(); return; }
  const target = window.document.activeElement;
  if (event.shiftKey && (target === items[0] || target === modal.value)) { event.preventDefault(); items.at(-1).focus(); }
  else if (!event.shiftKey && target === items.at(-1)) { event.preventDefault(); items[0].focus(); }
}
function chooseFile(event) {
  const chosen = event.target.files?.[0]; modalError.value = '';
  if (chosen && (!/\.pdf$/i.test(chosen.name) || chosen.type !== 'application/pdf' || !chosen.size || chosen.size > 15 * 1024 * 1024)) { modalError.value = 'Choose a PDF document of 15 MB or smaller.'; event.target.value = ''; file.value = null; return; }
  file.value = chosen || null;
}
async function save() {
  if (busy.value || !manager.value) return;
  if (!editor.value.id && !file.value) { modalError.value = 'Choose a PDF document.'; return; }
  const current = { ...editor.value }, ticket = identity, operation = mutation = new AbortController();
  busy.value = true; modalError.value = ''; progress.value = file.value ? 0 : 100;
  try {
    const result = await api.saveLearningMaterial({ ...current, syllabusId: selected.value?.id, fields: form.value, file: file.value, signal: operation.signal, onProgress: value => { if (ticket === identity) progress.value = value; } });
    if (ticket !== identity || operation.signal.aborted) return;
    closeModal(true); notice.value = result.cleanupPending ? 'Document saved. Previous file cleanup will be retried.' : 'Document saved.';
    await load(current.kind === 'module' ? selected.value.id : selected.value?.id || null);
  } catch (err) { if (ticket === identity && !operation.signal.aborted) modalError.value = err.message; }
  finally { if (mutation === operation && ticket === identity) busy.value = false; }
}
async function remove() {
  if (busy.value || !manager.value) return;
  busy.value = true; modalError.value = ''; const ticket = identity, operation = mutation = new AbortController();
  const current = { ...removal.value };
  try {
    const result = await api.deleteLearningMaterial(current.kind, current.id, current.revision, { signal: operation.signal });
    if (ticket !== identity || operation.signal.aborted) return;
    closeModal(true); notice.value = result.cleanupPending ? 'Document removed from view. File cleanup is pending.' : 'Document deleted.';
    if (current.kind === 'syllabus') selected.value = null;
    await refresh();
  } catch (err) { if (ticket === identity && !operation.signal.aborted) modalError.value = err.message; }
  finally { if (mutation === operation && ticket === identity) busy.value = false; }
}
async function move(index, delta) {
  if (busy.value || !manager.value) return;
  const ids = modules.value.map(item => item.id); [ids[index], ids[index + delta]] = [ids[index + delta], ids[index]];
  busy.value = true; error.value = ''; const ticket = identity, operation = mutation = new AbortController();
  try { await api.reorderLearningModules(selected.value.id, ids, selected.value.revision, { signal: operation.signal }); if (ticket === identity && !operation.signal.aborted) { notice.value = 'Module order updated.'; await refresh(); } }
  catch (err) { if (ticket === identity && !operation.signal.aborted) error.value = err.message; }
  finally { if (mutation === operation && ticket === identity) busy.value = false; }
}
async function retryCleanup() {
  if (busy.value) return; busy.value = true; const ticket = identity, operation = mutation = new AbortController();
  try { const result = await api.retryMaterialsCleanup({ signal: operation.signal }); if (ticket === identity && !operation.signal.aborted) { notice.value = result.cleanupPending ? 'Some cleanup is still pending. Try again later.' : 'File cleanup completed.'; await refresh(); } }
  catch (err) { if (ticket === identity && !operation.signal.aborted) error.value = err.message; }
  finally { if (mutation === operation && ticket === identity) busy.value = false; }
}
watch(() => [props.currentUser.id, props.role], () => {
  identity++; generation++; controller?.abort(); mutation?.abort(); closeModal(true); document.value = null; selected.value = null; syllabi.value = []; modules.value = []; instructors.value = []; ready.value = false; busy.value = false; notice.value = ''; load();
}, { immediate: true });
onBeforeUnmount(() => { identity++; generation++; controller?.abort(); mutation?.abort(); if (previousOverflow !== undefined) window.document.body.style.overflow = previousOverflow; });
</script>
