<template>
  <div class="lc-activity" :class="{ 'lc-activity-unavailable': unavailable }">
    <button type="button" class="lc-activity-open" :disabled="!!unavailable" @click="$emit('open', activity)">
      <span class="lc-type-icon" :class="'lc-type-' + activity.type"><component :is="icons[activity.type] || FileText" :size="23" :stroke-width="1.6" /></span>
      <span class="lc-activity-copy"><strong>{{ activity.title }}</strong><span v-if="activity.description" class="lc-activity-description">{{ activity.description }}</span>
        <span class="lc-activity-meta"><span v-if="activity.type === 'link'" class="lc-video-url">{{ activity.url }}</span><span v-if="activity.type === 'link'">Video link · Opens in a new tab</span><span v-if="activity.sourceFileName || activity.fileName">{{ activity.sourceFileName || activity.fileName }}</span><span v-if="activity.availableFrom"><b>Opens:</b> {{ formatDate(activity.availableFrom) }}</span><span v-if="activity.availableUntil"><b>Closes:</b> {{ formatDate(activity.availableUntil) }}</span><span v-if="unavailable">{{ unavailable }}</span><span v-if="activity.published === false" class="lc-draft">Draft</span></span>
      </span>
    </button>
    <div class="lc-activity-trailing">
      <button v-if="manager && activity.type === 'simulation'" type="button" class="lc-retakes-toggle" :disabled="busy" :aria-pressed="activity.allowRetakes !== false" @click="$emit('set-retakes', activity, activity.allowRetakes === false)">Allow retakes: {{ activity.allowRetakes !== false ? 'On' : 'Off' }}</button>
      <span v-if="!manager && !preview && activity.type === 'simulation' && state.simulation?.attempted" class="lc-simulation-score">{{ state.simulation.reviewable ? 'Practice completed · Final quiz' : (state.simulation.passed ? 'Passed' : 'Failed') + ' · ' + (state.simulation.score == null ? 'Score not recorded' : state.simulation.score + '%') }}</span>
      <div v-if="manager && missionAuthoring && activity.type === 'simulation'" class="lc-mission-tools">
        <button type="button" :disabled="busy" @click="$emit('edit-mission', activity)"><Pencil :size="15" /> Edit mission</button>
        <button type="button" class="lc-mission-quiz" :disabled="busy || missionQuizzesLoading" @click="$emit('edit-mission-quiz', activity)">{{ missionQuizLabel(activity.targetId) }}</button>
      </div>
      <details class="lc-status"><summary :class="'lc-status-' + state.status.toLowerCase().replaceAll(' ', '-')"><Check v-if="state.status === 'Done'" :size="14" /> {{ state.status }} <ChevronDown :size="14" /></summary><div class="lc-requirements"><strong>Completion requirements</strong><p v-for="(rule, index) in state.requirements" :key="index" :class="{ 'lc-requirement-done': rule.done }"><Check v-if="rule.done" :size="14" /><Circle v-else :size="12" />{{ rule.label }}</p><small v-if="preview">Student preview · progress is not recorded.</small></div></details>
      <div v-if="manager && !activity.legacy" class="lc-row-tools"><button type="button" :disabled="busy" :aria-label="'Edit activity ' + activity.title" @click="$emit('edit', activity)"><Pencil :size="15" /></button><button type="button" :disabled="busy || first" :aria-label="'Move activity ' + activity.title + ' up'" @click="$emit('move', activity, -1)"><ArrowUp :size="15" /></button><button type="button" :disabled="busy || last" :aria-label="'Move activity ' + activity.title + ' down'" @click="$emit('move', activity, 1)"><ArrowDown :size="15" /></button><button type="button" :disabled="busy" :aria-label="'Delete activity ' + activity.title" @click="$emit('remove', activity)"><Trash2 :size="15" /></button></div>
    </div>
  </div>
</template>
<script setup>
import { computed } from 'vue';
import { ArrowDown, ArrowUp, Check, ChevronDown, Circle, FileText, Link2, Pencil, Presentation, Ship, ClipboardList, Trash2 } from '@lucide/vue';
const props = defineProps({ activity: { type: Object, required: true }, progress: Object, simulationAccess: Object, missionAuthoring: Boolean, missionQuizLabel: { type: Function, default: () => 'Create / edit quiz' }, missionQuizzesLoading: Boolean, manager: Boolean, preview: Boolean, busy: Boolean, first: Boolean, last: Boolean });
defineEmits(['set-retakes', 'edit-mission', 'edit-mission-quiz', 'open', 'edit', 'move', 'remove']);
const icons = { pdf: FileText, presentation: Presentation, link: Link2, simulation: Ship, quiz: ClipboardList };
const state = computed(() => props.progress || { status: 'To do', requirements: [
  { label: props.activity.type === 'link' ? 'Open the video link' : ['pdf', 'presentation'].includes(props.activity.type) ? props.activity.type === 'presentation' ? 'View the presentation' : 'View the document' : props.activity.type === 'simulation' ? 'Complete the assigned simulation' : 'Complete the quiz', done: false },
  ...(props.activity.completionRule === 'pass' ? [{ label: props.activity.passScore != null ? `Achieve at least ${props.activity.passScore}%` : 'Meet the configured passing requirements', done: false }] : [])
] });
const unavailable = computed(() => {
  if (props.manager || props.preview) return '';
  if (props.activity.type === 'simulation' && !props.simulationAccess?.canStart) return props.simulationAccess?.message || 'Refresh the course to check simulation availability.';
  if (props.activity.availableFrom && Date.parse(props.activity.availableFrom) > Date.now()) return 'Not open yet';
  return props.activity.availableUntil && Date.parse(props.activity.availableUntil) < Date.now() ? 'Activity closed' : '';
});
const formatDate = value => new Date(value).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
</script>
