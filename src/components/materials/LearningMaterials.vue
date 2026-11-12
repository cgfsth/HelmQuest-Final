<template>
  <section class="lm" aria-label="Learning materials" :aria-busy="loading || busy">
    <PdfDocumentViewer v-if="document" :key="document.kind + document.id" :document="document" @back="closeReader" @loaded="documentViewed" />
    <section v-else-if="activityDetail" class="lc-course lc-detail">
      <button type="button" @click="activityDetail = null; refresh()"><ArrowLeft :size="17" /> Back to Module</button>
      <span class="lc-label">{{ activityDetail.type === 'simulation' ? 'PRACTICAL SIMULATION' : 'KNOWLEDGE CHECK' }}</span>
      <h2>{{ activityDetail.title }}</h2><p>{{ activityDetail.description }}</p>
      <div v-if="activityDetail.objectives" class="lc-objectives"><strong>Learning objectives</strong><p>{{ activityDetail.objectives }}</p></div>
      <div class="lc-detail-instructions"><h3>Instructions</h3><p>{{ activityDetail.instructions || (activityDetail.type === 'simulation' ? 'Complete the linked mission in the HelmQuest maritime simulator. Your saved mission results determine completion.' : 'Answer the questions in the existing HelmQuest quiz. Your saved submission determines completion.') }}</p></div>
      <p><strong>{{ activityDetail.type === 'simulation' ? 'Assigned mission:' : 'Assigned quiz:' }}</strong> {{ linkedTitle(activityDetail) }}</p>
      <p v-if="activityDetail.completionRule === 'pass'">{{ activityDetail.passScore != null ? 'Required score: ' + activityDetail.passScore + '%' : 'Meet the linked activity’s passing requirements.' }}</p>
      <p v-if="error" class="lm-alert lm-error" role="alert">{{ error }}</p>
      <p v-if="preview || manager" class="lc-preview-note">Student preview. Use a student account to start this activity and record progress.</p>
      <button v-else type="button" class="lm-primary" :disabled="busy" @click="startActivity">{{ busy ? 'Opening…' : activityDetail.type === 'simulation' ? 'Start Simulation' : courseProgress[activityDetail.id]?.status === 'Done' ? 'View Quiz Results' : 'Start Quiz' }}</button>
    </section>
    <template v-else>
      <div class="lm-toolbar" :class="{ 'lc-course-toolbar': selected }">
        <div v-if="!selected"><p class="lm-eyebrow">COURSE LIBRARY</p><h2>Your learning materials</h2><p>{{ manager ? 'Organize course documents for your students.' : 'Read the course documents shared by your instructor.' }}</p></div>
        <div class="lm-actions">
          <button v-if="selected" type="button" @click="back"><ArrowLeft :size="17" /> All syllabi</button>
          <button v-if="manager && selected" type="button" :aria-pressed="preview" @click="preview = !preview"><Eye :size="17" /> {{ preview ? 'Exit student preview' : 'Preview as student' }}</button>
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
        <p v-else-if="preview && selected.published === false" class="lm-empty">This course is unpublished. Students will see it after you publish it.</p>
        <CourseOutline v-else :syllabus="selected" :official="official" :focused-lesson-id="lessonId" :modules="modules" :activities="activities" :progress="preview ? {} : courseProgress" :manager="manager && !preview" :preview="preview" :busy="busy" @select-lesson="selectLesson" @open="openActivity" @edit-section="edit" @remove-section="confirmDelete" @add-activity="addActivity" @edit-activity="item => edit('activity', item)" @remove-activity="item => confirmDelete('activity', item)" @move-activity="moveActivity" @move-module="move" />
      </template>
    </template>
    <Teleport to="body">
      <div v-if="editor || removal" class="lm-modal-backdrop" @click.self="closeModal" @keydown.esc="closeModal">
        <section ref="modal" class="lm lm-modal" role="dialog" aria-modal="true" aria-labelledby="lm-dialog-title" tabindex="-1" @keydown.tab="trapFocus">
          <template v-if="editor">
            <div class="lm-toolbar"><h2 id="lm-dialog-title">{{ editor.id ? 'Edit' : 'Create' }} {{ editor.kind === 'activity' ? 'learning activity' : editor.kind === 'module' ? 'module' : 'syllabus' }}</h2><button type="button" aria-label="Close dialog" :disabled="busy" @click="closeModal"><X :size="20" /></button></div>
            <form class="lm-form" @submit.prevent="save">
              <label v-if="editor.kind === 'syllabus'">Course structure<select v-model="form.officialSyllabusKey" data-field="course-structure" :disabled="busy || !!editor.id" @change="setCourseTemplate"><option :value="OFFICIAL_SYLLABUS_KEY">Official FISH ELECT 6 · First Semester 2026–2027</option><option value="">Existing custom course</option></select></label>
              <p v-if="form.officialSyllabusKey || editor.officialSectionId" class="lm-alert">Official academic titles, outcomes and week schedule are preserved. Edit instructor notes and uploaded resources separately.</p>
              <label>Title<input v-model="form.title" required maxlength="180" :disabled="busy" :readonly="!!form.officialSyllabusKey || !!editor.officialSectionId" autofocus /></label>
              <label>Description<textarea v-model="form.description" rows="3" maxlength="2500" :disabled="busy" /></label>
              <label v-if="editor.kind === 'activity'">Activity type<select v-model="form.type" :disabled="busy || !!editor.id"><option value="pdf">PDF learning material</option><option value="presentation">PowerPoint lesson</option><option v-if="form.moduleId" value="simulation">Practical simulation</option><option v-if="editor.id && form.type === 'quiz'" value="quiz">Legacy quiz link (not shown to students)</option></select></label>
              <label>Learning objectives<textarea v-model="form.objectives" rows="3" maxlength="2500" :disabled="busy" placeholder="What should students learn?" /></label>
              <label v-if="editor.kind === 'syllabus'">Instructor announcement<textarea v-model="form.announcement" rows="3" maxlength="2500" :disabled="busy" /></label>
              <label v-if="editor.kind === 'syllabus' && role === 'admin'">Assigned instructor<select v-model="form.instructorId" data-field="assigned-instructor" required :disabled="busy"><option value="" disabled>Select an instructor</option><option v-for="item in instructors" :key="item.id" :value="item.id">{{ item.name }}</option></select></label>
              <label v-if="editor.kind === 'module'">Module number<input v-model.number="form.moduleNumber" type="number" min="1" max="999" required :disabled="busy" :readonly="!!editor.officialSectionId" /></label>
              <template v-if="editor.kind === 'activity' && ['simulation', 'quiz'].includes(form.type)">
                <label>{{ form.type === 'simulation' ? 'Assigned mission' : 'Assigned quiz' }}<select v-model="form.targetId" required :disabled="busy"><option value="" disabled>Select an existing {{ form.type === 'simulation' ? 'mission' : 'quiz' }}</option><option v-for="item in form.type === 'simulation' ? catalog.missions : catalog.quizzes" :key="item.id" :value="item.id">{{ item.title }}</option></select></label>
                <p v-if="!(form.type === 'simulation' ? catalog.missions : catalog.quizzes).length" class="lm-alert">Create a {{ form.type === 'simulation' ? 'mission in Mission Management' : 'quiz in Quiz Management' }} first, then link it here.</p>
                <label>Activity instructions<textarea v-model="form.instructions" rows="4" maxlength="5000" :disabled="busy" /></label>
                <template v-if="form.type === 'simulation'"><p class="lm-alert">{{ PRACTICAL_ALIGNMENT[modules.find(m => m.id === form.moduleId)?.officialSectionId]?.guidance || 'Choose a mission whose actual objectives match this lesson.' }}</p><label>Quiz after successful docking<select v-model="form.quizPolicy" :disabled="busy"><option value="inherit">Use the mission’s assigned quiz, if published</option><option value="none">No quiz — show simulation results</option><option value="assigned">Assign a specific instructor quiz</option></select></label><label v-if="form.quizPolicy === 'assigned'">Assigned quiz<select v-model="form.quizId" required :disabled="busy"><option value="" disabled>Choose a quiz</option><option v-for="quiz in catalog.quizzes" :key="quiz.id" :value="quiz.id">{{ quiz.title }}</option></select></label></template>
                <label>Completion requirement<select v-model="form.completionRule" :disabled="busy"><option value="complete">Complete the activity</option><option value="pass">Complete and meet the passing requirement</option></select></label>
                <label v-if="form.completionRule === 'pass'">Passing score (%)<input v-model="form.passScore" type="number" min="0" max="100" step="0.1" placeholder="Use the mission / quiz passing result" :disabled="busy" /></label>
              </template>
              <label v-else class="lm-upload"><Upload :size="24" /><strong>{{ editor.id ? 'Replace document (optional)' : editor.kind === 'module' ? 'Module PDF (optional)' : form.type === 'presentation' ? 'Upload presentation' : 'Upload PDF' }}</strong><span>{{ file?.name || editor.sourceFileName || editor.fileName || 'Choose a learning document' }}</span><input type="file" :accept="form.type === 'presentation' ? '.ppt,.pptx,.pdf' : 'application/pdf,.pdf'" :required="!editor.id && editor.kind !== 'module'" :disabled="busy" @change="chooseFile" /><small>{{ form.type === 'presentation' ? 'PPT, PPTX or PDF · Slides are converted to a private, read-only PDF preview.' : 'PDF' }} · Maximum 15 MB</small></label>
              <template v-if="editor.kind === 'activity'"><label>Available from (optional)<input v-model="form.availableFrom" type="datetime-local" :disabled="busy" /></label><label>Available until (optional)<input v-model="form.availableUntil" type="datetime-local" :disabled="busy" /></label></template>
              <label class="lc-publish"><input v-model="form.published" type="checkbox" :disabled="busy" /> Publish to students</label>
              <div v-if="busy" role="status"><label for="lm-progress">{{ progress < 100 ? 'Uploading… ' + progress + '%' : 'Saving document…' }}</label><progress id="lm-progress" :value="progress" max="100" /></div>
              <p v-if="modalError" class="lm-alert lm-error" role="alert">{{ modalError }}</p>
              <div class="lm-actions lm-form-footer"><button type="button" :disabled="busy" @click="closeModal">Cancel</button><button type="submit" class="lm-primary" :disabled="busy">{{ busy ? 'Saving…' : 'Save document' }}</button></div>
            </form>
          </template>
          <template v-else>
            <h2 id="lm-dialog-title">Delete {{ removal.kind === 'activity' ? 'activity' : removal.kind === 'module' ? 'module' : 'syllabus' }}?</h2><p>“{{ removal.title }}” will be removed from this course. Linked missions, quizzes and their saved results are retained.</p><p v-if="removal.kind !== 'activity'">Delete this section’s learning activities and modules first.</p>
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
import CourseOutline from './CourseOutline.vue';
import { OFFICIAL_SYLLABUS, OFFICIAL_SYLLABUS_KEY, PRACTICAL_ALIGNMENT } from '../../../shared/officialSyllabus.js';
import './materials.css';
import './course.css';
const PdfDocumentViewer = defineAsyncComponent(() => import('./PdfDocumentViewer.vue'));
const props = defineProps({ currentUser: { type: Object, required: true }, role: { type: String, required: true }, initialCourseId: { type: String, default: '' }, initialLessonId: { type: String, default: '' }, prepareAccess: { type: Function, default: async () => {} } });
const emit = defineEmits(['navigate-course', 'launch-simulation', 'launch-quiz']);
const manager = computed(() => ['instructor', 'admin'].includes(props.role));
const syllabi = ref([]), modules = ref([]), instructors = ref([]), selected = ref(null), document = ref(null);
const activities = ref([]), courseProgress = ref({}), catalog = ref({ missions: [], quizzes: [] }), preview = ref(false), activityDetail = ref(null);
const official = ref(null), lessonId = ref(props.initialLessonId || '');
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
    const result = id ? await api.getLearningCourse(id, { signal }) : await api.listLearningSyllabi({ signal });
    if (ticket !== generation || signal.aborted) return;
    if (id) { selected.value = result.syllabus; modules.value = result.modules; activities.value = result.activities; courseProgress.value = result.progress; official.value = result.official || null; catalog.value = result.catalog || { missions: [], quizzes: [] }; if (!result.modules.some(m => m.id === lessonId.value)) lessonId.value = ''; emit('navigate-course', { syllabusId: id, lessonId: lessonId.value }); }
    else { selected.value = null; syllabi.value = result.syllabi; }
    cleanupPending.value = !!result.cleanupPending || !!result.syllabus?.cleanupPending;
    ready.value = true;
  } catch (err) { if (ticket === generation && !signal.aborted) error.value = err.message || 'Unable to load materials.'; }
  finally { if (ticket === generation) loading.value = false; }
}
const open = id => load(id);
const refresh = () => load(selected.value?.id);
function back() { selected.value = null; lessonId.value = ''; modules.value = []; activities.value = []; preview.value = false; notice.value = ''; emit('navigate-course', { syllabusId: '', lessonId: '' }); load(); }
function selectLesson(id) { lessonId.value = id; emit('navigate-course', { syllabusId: selected.value.id, lessonId: id }); }
function openActivity(item) {
  error.value = '';
  if (item.moduleId) selectLesson(item.moduleId);
  if (['simulation', 'quiz'].includes(item.type)) { activityDetail.value = item; return; }
  document.value = { kind: item.legacy ? item.kind : 'activity', id: item.documentId || item.id, title: item.title, objectives: item.objectives || '', presentation: item.type === 'presentation', revision: item.revision, documentVersion: item.documentVersion };
}
function closeReader() { document.value = null; refresh(); }
async function documentViewed() {
  if (props.role !== 'student' || !document.value) return;
  const current = { ...document.value }, ticket = identity;
  try { await api.recordLearningActivity(current.id, { event: 'viewed', ...(current.kind !== 'activity' ? { kind: current.kind, documentVersion: current.documentVersion } : { revision: current.revision }) }); }
  catch (err) { if (ticket === identity) { error.value = err.message; notice.value = 'The document opened, but reading progress was not saved. Open it again to retry.'; } }
}
const linkedTitle = item => (item.type === 'simulation' ? catalog.value.missions : catalog.value.quizzes).find(target => target.id === item.targetId)?.title || item.targetTitle || item.title;
async function startActivity() {
  if (busy.value || manager.value || preview.value) return;
  const item = activityDetail.value, ticket = identity, operation = mutation = new AbortController();
  busy.value = true; error.value = '';
  try {
    const result = await api.launchLearningActivity(item.id, { signal: operation.signal });
    if (ticket !== identity || operation.signal.aborted) return;
    const fail = err => { if (ticket === identity) { error.value = err?.message || 'This activity could not be opened.'; busy.value = false; } };
    emit(result.type === 'simulation' ? 'launch-simulation' : 'launch-quiz', { target: result.target, simulationResult: result.simulationResult, activityId: item.id, syllabusId: selected.value.id, lessonId: item.moduleId, fail });
  } catch (err) { if (ticket === identity && !operation.signal.aborted) error.value = err.message; }
  finally { if (ticket === identity && mutation === operation) busy.value = false; }
}
function beginModal() { focusReturn = window.document.activeElement; previousOverflow = window.document.body.style.overflow; window.document.body.style.overflow = 'hidden'; nextTick(() => (modal.value?.querySelector('input,button') || modal.value)?.focus()); }
function edit(kind, item = {}) {
  if (!manager.value) return;
  editor.value = { ...item, kind }; modalError.value = ''; file.value = null; progress.value = 0;
  const localDate = value => { if (!value) return ''; const d = new Date(value); return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16); };
  form.value = { title: item.title || '', description: item.description || '', instructorId: item.instructorId || (props.role === 'instructor' ? props.currentUser.id : ''), moduleNumber: item.moduleNumber || Math.max(0, ...modules.value.map(module => module.moduleNumber)) + 1, revision: item.revision,
    ...(kind === 'syllabus' ? { officialSyllabusKey: item.id ? item.officialSyllabusKey || '' : OFFICIAL_SYLLABUS_KEY } : {}),
    objectives: item.objectives || '', announcement: item.announcement || '', published: item.id ? item.published !== false : kind !== 'activity',
    ...(kind === 'activity' ? { moduleId: item.moduleId || '', type: item.type || 'pdf', targetId: item.targetId || '', instructions: item.instructions || '', completionRule: item.completionRule || 'pass', passScore: item.passScore ?? '', quizPolicy: item.quizPolicy || 'inherit', quizId: item.quizId || '', availableFrom: localDate(item.availableFrom), availableUntil: localDate(item.availableUntil) } : {}) };
  if (kind === 'syllabus' && !item.id) setCourseTemplate();
  beginModal();
}
function addActivity(moduleId) { edit('activity', { moduleId }); }
function setCourseTemplate() { if (editor.value?.id) return; form.value.title = form.value.officialSyllabusKey ? OFFICIAL_SYLLABUS.title : ''; }
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
  const extension = form.value.type === 'presentation' ? /\.(pdf|ppt|pptx)$/i : /\.pdf$/i;
  if (chosen && (!extension.test(chosen.name) || !chosen.size || chosen.size > 15 * 1024 * 1024)) { modalError.value = 'Choose a supported learning document of 15 MB or smaller.'; event.target.value = ''; file.value = null; return; }
  file.value = chosen || null;
}
async function save() {
  if (busy.value || !manager.value) return;
  const needsFile = editor.value.kind === 'syllabus' || (editor.value.kind === 'activity' && ['pdf', 'presentation'].includes(form.value.type));
  if (!editor.value.id && needsFile && !file.value) { modalError.value = 'Choose a learning document.'; return; }
  const current = { ...editor.value }, ticket = identity, operation = mutation = new AbortController();
  busy.value = true; modalError.value = ''; progress.value = file.value ? 0 : 100;
  try {
    const fields = { ...form.value };
    if (current.kind === 'activity') { for (const key of ['availableFrom', 'availableUntil']) fields[key] = fields[key] ? new Date(fields[key]).toISOString() : ''; delete fields.instructorId; delete fields.moduleNumber; delete fields.announcement; }
    const linked = current.kind === 'activity' && ['simulation', 'quiz'].includes(fields.type);
    const result = await api.saveLearningMaterial({ ...current, syllabusId: selected.value?.id, fields, file: linked ? null : file.value, signal: operation.signal, onProgress: value => { if (ticket === identity) progress.value = value; } });
    if (ticket !== identity || operation.signal.aborted) return;
    closeModal(true); notice.value = result.cleanupPending ? 'Document saved. Previous file cleanup will be retried.' : 'Document saved.';
    await load(selected.value?.id || null);
  } catch (err) { if (ticket === identity && !operation.signal.aborted) modalError.value = err.message; }
  finally { if (mutation === operation && ticket === identity) busy.value = false; }
}
async function moveActivity(item, delta) {
  if (busy.value || !manager.value) return;
  const phase = type => type === 'presentation' ? 0 : type === 'pdf' ? 1 : type === 'simulation' ? 2 : 3;
  const group = activities.value.filter(a => a.moduleId === item.moduleId).sort((a, b) => phase(a.type) - phase(b.type) || a.order - b.order);
  const index = group.findIndex(a => a.id === item.id), other = index + delta;
  if (other < 0 || other >= group.length) return;
  if (phase(group[index].type) !== phase(group[other].type)) { notice.value = 'Lesson materials come first, followed by practical simulations and quizzes. You can reorder activities within each group.'; return; }
  [group[index], group[other]] = [group[other], group[index]];
  const ticket = identity, operation = mutation = new AbortController(); busy.value = true; error.value = '';
  try { await api.reorderLearningActivities(selected.value.id, { moduleId: item.moduleId, ids: group.map(a => a.id), revision: selected.value.revision }, { signal: operation.signal }); if (ticket === identity && !operation.signal.aborted) await refresh(); }
  catch (err) { if (ticket === identity && !operation.signal.aborted) error.value = err.message; }
  finally { if (ticket === identity && mutation === operation) busy.value = false; }
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
  identity++; generation++; controller?.abort(); mutation?.abort(); closeModal(true); document.value = null; activityDetail.value = null; selected.value = null; lessonId.value = props.initialLessonId || ''; syllabi.value = []; modules.value = []; activities.value = []; courseProgress.value = {}; preview.value = false; instructors.value = []; ready.value = false; busy.value = false; notice.value = ''; load(props.initialCourseId || null);
}, { immediate: true });
onBeforeUnmount(() => { identity++; generation++; controller?.abort(); mutation?.abort(); if (previousOverflow !== undefined) window.document.body.style.overflow = previousOverflow; });
</script>
