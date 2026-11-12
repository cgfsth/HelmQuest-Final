<template>
  <div class="lc-course">
    <div class="lc-course-heading"><div><span class="lc-label">MARITIME TRAINING COURSE</span><h2>{{ syllabus.title }}</h2><p>{{ syllabus.description }}</p><span class="lc-instructor"><Anchor :size="15" /> {{ syllabus.instructorName }}</span></div><span v-if="syllabus.published === false" class="lc-draft">Unpublished course</span></div>
    <div class="lc-course-bar"><span><BookOpen :size="16" /> Course content <b>{{ visibleModules.length }} modules</b></span><button type="button" @click="toggleAll">{{ allCollapsed ? 'Expand all' : 'Collapse all' }}</button></div>
    <section class="lc-section" aria-labelledby="lc-general-title">
      <div class="lc-section-heading"><button class="lc-section-toggle" type="button" :aria-expanded="!collapsed.general" aria-controls="lc-general-content" @click="toggle('general')"><ChevronDown :size="21" :class="{ 'lc-chevron-closed': collapsed.general }" /><h3 id="lc-general-title">General</h3></button><div v-if="manager" class="lc-section-tools"><button type="button" :disabled="busy" @click="$emit('edit-section', 'syllabus', syllabus)"><Pencil :size="15" /> Edit course</button><button type="button" :disabled="busy" @click="$emit('add-activity', null)"><Plus :size="16" /> Add resource</button><button type="button" :disabled="busy" class="lm-danger" @click="$emit('remove-section', 'syllabus', syllabus)"><Trash2 :size="15" /></button></div></div>
      <Transition name="lc-expand"><div v-show="!collapsed.general" id="lc-general-content" class="lc-section-content">
        <div v-if="syllabus.announcement" class="lc-announcement"><Megaphone :size="22" /><div><strong>Instructor announcement</strong><p>{{ syllabus.announcement }}</p></div></div>
        <CourseActivityRow v-if="syllabus.fileName" :activity="legacy(syllabus, 'syllabus')" :progress="progress['syllabus-' + syllabus.id]" :manager="manager" :preview="preview" @open="$emit('open', $event)" />
        <CourseActivityRow v-for="(item, index) in rows(null)" :key="item.id" :activity="item" :progress="progress[item.id]" :manager="manager" :preview="preview" :busy="busy" :first="index === 0" :last="index === rows(null).length - 1" @open="$emit('open', $event)" @edit="$emit('edit-activity', $event)" @move="(a, d) => $emit('move-activity', a, d)" @remove="$emit('remove-activity', $event)" />
      </div></Transition>
    </section>
    <section v-for="(module, index) in visibleModules" :key="module.id" class="lc-section lm-module" :aria-labelledby="'lc-title-' + module.id">
      <div class="lc-section-heading"><button class="lc-section-toggle" type="button" :aria-expanded="!collapsed[module.id]" :aria-controls="'lc-content-' + module.id" @click="toggle(module.id)"><ChevronDown :size="21" :class="{ 'lc-chevron-closed': collapsed[module.id] }" /><h3 :id="'lc-title-' + module.id">Module {{ module.moduleNumber }}: {{ module.title }}</h3></button><span v-if="module.published === false" class="lc-draft">Draft</span><div v-if="manager" class="lc-section-tools"><button type="button" :disabled="busy" :aria-label="'Edit module ' + module.moduleNumber" @click="$emit('edit-section', 'module', module)"><Pencil :size="16" /></button><button type="button" :disabled="busy || index === 0" :aria-label="'Move module ' + module.moduleNumber + ' up'" @click="$emit('move-module', index, -1)"><ArrowUp :size="16" /></button><button type="button" :disabled="busy || index === visibleModules.length - 1" :aria-label="'Move module ' + module.moduleNumber + ' down'" @click="$emit('move-module', index, 1)"><ArrowDown :size="16" /></button><button type="button" :disabled="busy" :aria-label="'Delete module ' + module.moduleNumber" @click="$emit('remove-section', 'module', module)"><Trash2 :size="16" /></button></div></div>
      <Transition name="lc-expand"><div v-show="!collapsed[module.id]" :id="'lc-content-' + module.id" class="lc-section-content">
        <p v-if="module.description" class="lc-module-description">{{ module.description }}</p><div v-if="module.objectives" class="lc-objectives"><strong>Learning objectives</strong><p>{{ module.objectives }}</p></div>
        <CourseActivityRow v-if="module.fileName" :activity="legacy(module, 'module')" :progress="progress['module-' + module.id]" :manager="manager" :preview="preview" @open="$emit('open', $event)" />
        <CourseActivityRow v-for="(item, rowIndex) in rows(module.id)" :key="item.id" :activity="item" :progress="progress[item.id]" :manager="manager" :preview="preview" :busy="busy" :first="rowIndex === 0" :last="rowIndex === rows(module.id).length - 1" @open="$emit('open', $event)" @edit="$emit('edit-activity', $event)" @move="(a, d) => $emit('move-activity', a, d)" @remove="$emit('remove-activity', $event)" />
        <p v-if="!module.fileName && !rows(module.id).length" class="lc-empty">{{ manager ? 'Add lessons, then link a practical simulation and quiz.' : 'Your instructor has not published activities in this module yet.' }}</p>
        <button v-if="manager" type="button" class="lc-add-activity" :disabled="busy" @click="$emit('add-activity', module.id)"><Plus :size="17" /> Add lesson or activity</button>
      </div></Transition>
    </section>
    <div v-if="!visibleModules.length" class="lc-empty">{{ manager ? 'Create a module to organize lessons and practical activities.' : 'Your instructor has not published modules yet.' }}</div>
    <button v-if="manager" class="lm-primary lc-add-module" type="button" :disabled="busy" @click="$emit('edit-section', 'module')"><Plus :size="18" /> Add module</button>
  </div>
</template>
<script setup>
import { computed, ref } from 'vue';
import { Anchor, ArrowDown, ArrowUp, BookOpen, ChevronDown, Megaphone, Pencil, Plus, Trash2 } from '@lucide/vue';
import CourseActivityRow from './CourseActivityRow.vue';
const props = defineProps({ syllabus: { type: Object, required: true }, modules: { type: Array, default: () => [] }, activities: { type: Array, default: () => [] }, progress: { type: Object, default: () => ({}) }, manager: Boolean, preview: Boolean, busy: Boolean });
defineEmits(['open', 'edit-section', 'remove-section', 'add-activity', 'edit-activity', 'remove-activity', 'move-activity', 'move-module']);
const collapsed = ref({});
const visibleModules = computed(() => props.modules.filter(m => !props.preview || m.published !== false));
const allCollapsed = computed(() => ['general', ...visibleModules.value.map(m => m.id)].every(id => collapsed.value[id]));
function toggle(id) { collapsed.value = { ...collapsed.value, [id]: !collapsed.value[id] }; }
function toggleAll() { const value = !allCollapsed.value; collapsed.value = Object.fromEntries(['general', ...visibleModules.value.map(m => m.id)].map(id => [id, value])); }
function rows(moduleId) {
  // Lessons precede the practical activity; quizzes finish the module. Teachers
  // control order within each phase so the course retains its learning sequence.
  const phase = type => type === 'simulation' ? 1 : type === 'quiz' ? 2 : 0;
  return props.activities.filter(a => (a.moduleId || null) === moduleId && (!props.preview || a.published !== false)).sort((a, b) => phase(a.type) - phase(b.type) || a.order - b.order);
}
const legacy = (item, kind) => ({ ...item, id: kind + '-' + item.id, documentId: item.id, title: kind === 'syllabus' ? 'Course syllabus' : item.title + ' — Learning material', type: 'pdf', kind, legacy: true, completionRule: 'view' });
</script>
