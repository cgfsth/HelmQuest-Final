<template>
  <div class="lc-course">
    <div class="lc-course-heading"><div><span class="lc-label">MARITIME TRAINING COURSE</span><h2>{{ syllabus.title }}</h2><p v-if="official">{{ official.semester }} · School Year {{ official.schoolYear }}</p><p>{{ syllabus.description }}</p><span class="lc-instructor"><Anchor :size="15" /> {{ syllabus.instructorName }}</span></div><span v-if="syllabus.published === false" class="lc-draft">Unpublished course</span></div>
    <div class="lc-course-bar"><span><BookOpen :size="16" /> Course content <b>{{ visibleModules.length }} modules</b></span><button type="button" @click="toggleAll">{{ allCollapsed ? 'Expand all' : 'Collapse all' }}</button></div>
    <section v-if="!focusedLessonId" class="lc-section" aria-labelledby="lc-general-title">
      <div class="lc-section-heading"><button class="lc-section-toggle" type="button" :aria-expanded="!collapsed.general" aria-controls="lc-general-content" @click="toggle('general')"><ChevronDown :size="21" :class="{ 'lc-chevron-closed': collapsed.general }" /><h3 id="lc-general-title">{{ official ? 'General: Class Orientation — Week 1' : 'General' }}</h3></button><div v-if="manager" class="lc-section-tools"><button type="button" :disabled="busy" @click="$emit('edit-section', 'syllabus', syllabus)"><Pencil :size="15" /> Edit course</button><button type="button" :disabled="busy" @click="$emit('add-activity', null)"><Plus :size="16" /> Add resource</button><button v-if="!official" type="button" :disabled="busy" class="lm-danger" @click="$emit('remove-section', 'syllabus', syllabus)"><Trash2 :size="15" /></button></div></div>
      <Transition name="lc-expand"><div v-show="!collapsed.general" id="lc-general-content" class="lc-section-content">
        <div v-if="syllabus.announcement" class="lc-announcement"><Megaphone :size="22" /><div><strong>Instructor announcement</strong><p>{{ syllabus.announcement }}</p></div></div>
        <details v-if="official" class="lc-official-disclosure"><summary>Official course outline, learning outcomes and grading</summary><OfficialSyllabusMatrix :section="official.general" :course="official" /></details>
        <CourseActivityRow v-for="(item, index) in rows(null)" :key="item.id" :activity="item" :progress="progress[item.id]" :simulation-access="simulationAccess[item.moduleId]" :manager="manager" :preview="preview" :busy="busy" :mission-authoring="missionAuthoring" :mission-quiz-label="missionQuizLabel" :mission-quizzes-loading="missionQuizzesLoading" :first="index === 0" :last="index === rows(null).length - 1" @open="$emit('open', $event)" @edit-mission="$emit('edit-mission', $event)" @edit-mission-quiz="$emit('edit-mission-quiz', $event)" @edit="$emit('edit-activity', $event)" @move="(a, d) => $emit('move-activity', a, d)" @remove="$emit('remove-activity', $event)" />
      </div></Transition>
    </section>
    <section v-for="(module, index) in displayedModules" :key="module.id" class="lc-section lm-module" :aria-labelledby="'lc-title-' + module.id">
      <div class="lc-section-heading"><button class="lc-section-toggle" type="button" :aria-expanded="!collapsed[module.id]" :aria-controls="'lc-content-' + module.id" @click="toggle(module.id)"><ChevronDown :size="21" :class="{ 'lc-chevron-closed': collapsed[module.id] }" /><h3 :id="'lc-title-' + module.id">{{ module.officialSectionId ? module.title : 'Module ' + module.moduleNumber + ': ' + module.title }}</h3></button><span v-if="officialSection(module.officialSectionId)" class="lc-week">{{ officialSection(module.officialSectionId).weeks }}</span><span v-if="module.published === false" class="lc-draft">Draft</span><button v-if="!focusedLessonId" type="button" class="lc-lesson-details" @click="$emit('select-lesson', module.id)">Lesson details</button><div v-if="manager" class="lc-section-tools"><button type="button" :disabled="busy" :aria-label="'Edit module ' + module.moduleNumber" @click="$emit('edit-section', 'module', module)"><Pencil :size="16" /></button><template v-if="!module.officialSectionId"><button type="button" :disabled="busy || index === 0" :aria-label="'Move module ' + module.moduleNumber + ' up'" @click="$emit('move-module', index, -1)"><ArrowUp :size="16" /></button><button type="button" :disabled="busy || index === visibleModules.length - 1" :aria-label="'Move module ' + module.moduleNumber + ' down'" @click="$emit('move-module', index, 1)"><ArrowDown :size="16" /></button><button type="button" :disabled="busy" :aria-label="'Delete module ' + module.moduleNumber" @click="$emit('remove-section', 'module', module)"><Trash2 :size="16" /></button></template></div></div>
      <Transition name="lc-expand"><div v-show="!collapsed[module.id]" :id="'lc-content-' + module.id" class="lc-section-content">
        <p v-if="module.description" class="lc-module-description">{{ module.description }}</p><div v-if="module.objectives" class="lc-objectives"><strong>Learning objectives</strong><p>{{ module.objectives }}</p></div>
        <OfficialSyllabusMatrix v-if="focusedLessonId && officialSection(module.officialSectionId)" :section="officialSection(module.officialSectionId)" />
        <CourseActivityRow v-for="(item, rowIndex) in rows(module.id)" :key="item.id" :activity="item" :progress="progress[item.id]" :simulation-access="simulationAccess[item.moduleId]" :manager="manager" :preview="preview" :busy="busy" :mission-authoring="missionAuthoring" :mission-quiz-label="missionQuizLabel" :mission-quizzes-loading="missionQuizzesLoading" :first="rowIndex === 0" :last="rowIndex === rows(module.id).length - 1" @open="$emit('open', $event)" @edit-mission="$emit('edit-mission', $event)" @edit-mission-quiz="$emit('edit-mission-quiz', $event)" @edit="$emit('edit-activity', $event)" @move="(a, d) => $emit('move-activity', a, d)" @remove="$emit('remove-activity', $event)" />
        <p v-if="!module.fileName && !rows(module.id).length" class="lc-empty">{{ manager ? 'Add learning resources and an optional practical simulation. Configure any quiz on the practical.' : 'Your instructor has not published activities in this module yet.' }}</p>
        <p v-if="manager && !simulationAccess[module.id]?.canCreate" class="lc-assignment-note">Upload a PDF lesson in this module to enable mission creation.</p>
        <p v-else-if="manager && !rows(module.id).some(a => a.type === 'simulation')" class="lc-assignment-note">No mission assigned yet. {{ missionAuthoring ? 'Create a mission for this module, or link an existing mission using Add lesson or activity.' : PRACTICAL_ALIGNMENT[module.officialSectionId]?.guidance || 'Assign an existing mission whose objectives match this lesson.' }}</p>
        <button v-if="manager && missionAuthoring" type="button" class="lm-primary lc-create-mission" :disabled="busy || !simulationAccess[module.id]?.canCreate" @click="$emit('create-mission', module.id)"><Plus :size="17" /> Create mission</button>
        <button v-if="manager" type="button" class="lc-add-activity" :disabled="busy" @click="$emit('add-activity', module.id)"><Plus :size="17" /> Add lesson or activity</button>
      </div></Transition>
    </section>
    <div v-if="!visibleModules.length" class="lc-empty">{{ manager ? 'Create a module to organize lessons and practical activities.' : 'Your instructor has not published modules yet.' }}</div>
    <button v-if="manager && !official" class="lm-primary lc-add-module" type="button" :disabled="busy" @click="$emit('edit-section', 'module')"><Plus :size="18" /> Add module</button>
  </div>
</template>
<script setup>
import { computed, ref } from 'vue';
import { Anchor, ArrowDown, ArrowUp, BookOpen, ChevronDown, Megaphone, Pencil, Plus, Trash2 } from '@lucide/vue';
import CourseActivityRow from './CourseActivityRow.vue';
import OfficialSyllabusMatrix from './OfficialSyllabusMatrix.vue';
import { officialSection, PRACTICAL_ALIGNMENT } from '../../../shared/officialSyllabus.js';
const props = defineProps({ syllabus: { type: Object, required: true }, official: Object, focusedLessonId: String, modules: { type: Array, default: () => [] }, activities: { type: Array, default: () => [] }, progress: { type: Object, default: () => ({}) }, simulationAccess: { type: Object, default: () => ({}) }, missionAuthoring: Boolean, missionQuizLabel: { type: Function, default: () => 'Create / edit quiz' }, missionQuizzesLoading: Boolean, manager: Boolean, preview: Boolean, busy: Boolean });
defineEmits(['create-mission', 'edit-mission', 'edit-mission-quiz', 'open', 'select-lesson', 'edit-section', 'remove-section', 'add-activity', 'edit-activity', 'remove-activity', 'move-activity', 'move-module']);
const collapsed = ref({});
const visibleModules = computed(() => props.modules.filter(m => !props.preview || m.published !== false));
const displayedModules = computed(() => props.focusedLessonId ? visibleModules.value.filter(m => m.id === props.focusedLessonId) : visibleModules.value);
const allCollapsed = computed(() => ['general', ...visibleModules.value.map(m => m.id)].every(id => collapsed.value[id]));
function toggle(id) { collapsed.value = { ...collapsed.value, [id]: !collapsed.value[id] }; }
function toggleAll() { const value = !allCollapsed.value; collapsed.value = Object.fromEntries(['general', ...visibleModules.value.map(m => m.id)].map(id => [id, value])); }
function rows(moduleId) {
  // Lessons precede the practical activity. Legacy standalone quiz rows remain
  // visible only in management; students take quizzes inside the simulator.
  const phase = type => type === 'presentation' ? 0 : type === 'pdf' ? 1 : type === 'simulation' ? 2 : 3;
  const items = props.activities.filter(a => (a.moduleId || null) === moduleId && (!props.preview || a.published !== false) && (props.manager || a.type !== 'quiz'));
  const original = moduleId ? props.modules.find(m => m.id === moduleId) : props.syllabus;
  if (original?.fileName) items.push({ ...legacy(original, moduleId ? 'module' : 'syllabus'), order: -1 });
  return items.sort((a, b) => phase(a.type) - phase(b.type) || a.order - b.order);
}
const legacy = (item, kind) => ({ ...item, id: kind + '-' + item.id, documentId: item.id, title: kind === 'syllabus' ? 'Course syllabus' : item.title + ' — Learning material', type: 'pdf', kind, legacy: true, completionRule: 'view' });
</script>
