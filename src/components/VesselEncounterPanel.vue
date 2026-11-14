<template>
  <aside v-if="status" class="encounter-panel" :class="{ 'encounter-panel--danger': status.emergency && !status.resolved }" aria-label="Vessel avoidance exercise">
    <details :open="!compact">
      <summary><span class="encounter-light" :class="'encounter-light--' + status.light" aria-hidden="true"></span><span>{{ status.status }}</span><span class="encounter-guide-label">Guide</span></summary>
      <p>{{ status.instruction }}</p>
      <div class="encounter-distances"><span>Vessel bearing: <strong>{{ status.bearing }}°</strong></span><span>Hull clearance: <strong>{{ status.distance == null ? '—' : status.distance + ' m' }}</strong></span><span>Exercise minimum: <strong>{{ status.clearance }} m</strong></span></div>
      <p v-if="status.yielding" class="encounter-yield">The other vessel is giving way. Continue your lookout.</p>
      <ul><li v-for="tip in status.tips" :key="tip">{{ tip }}</li></ul>
      <small>Power-driven crossing exercise, vessels in sight. Anchored vessels show white anchor light. Distance limits are training margins.</small>
      <a :href="ENCOUNTER_RULES_SOURCE" target="_blank" rel="noopener noreferrer">Navigation rules: 5, 7, 8, 15–17, 21 &amp; 30</a>
    </details>
  </aside>
</template>
<script setup>
import { onMounted, onBeforeUnmount, ref } from 'vue';
import { ENCOUNTER_RULES_SOURCE } from '../../shared/vesselEncounter.js';
defineProps({ status: Object });
const compact = ref(false);
const media = typeof window !== 'undefined' ? window.matchMedia('(max-height:600px)') : null;
const updateLayout = () => { compact.value = !!media?.matches; };
onMounted(() => { updateLayout(); media?.addEventListener('change', updateLayout); });
onBeforeUnmount(() => media?.removeEventListener('change', updateLayout));
</script>
<style scoped>
.encounter-panel { position:absolute; left:18px; bottom:18px; z-index:35; width:min(335px,calc(100vw - 36px)); border:1px solid #59cafa80; border-radius:12px; background:#071a2deF; color:#edf8ff; padding:14px; box-sizing:border-box; font:12px/1.5 sans-serif; max-height:48vh; overflow:auto; pointer-events:auto; }
.encounter-panel--danger { border-color:#ff8e72; }.encounter-panel summary { display:flex; align-items:center; gap:7px; font-weight:700; cursor:pointer; }.encounter-panel p { margin:10px 0; }.encounter-panel ul { padding-left:17px; margin:10px 0; }.encounter-panel li { margin:4px 0; }.encounter-panel small { display:block; color:#a6bfce; }.encounter-panel a { display:block; margin-top:7px; color:#7cdbff; }.encounter-light { width:10px; height:10px; border-radius:50%; background:white; flex-shrink:0; }.encounter-light--red { background:#ff5050; }.encounter-light--green { background:#4cff8b; }.encounter-light--both { background:linear-gradient(90deg,#ff5050 50%,#4cff8b 50%); }.encounter-distances { display:grid; gap:4px; color:#b4d4e7; }.encounter-yield { color:#7ff5c2; }
.encounter-guide-label { color:#7cdbff; font-size:10px; margin-left:auto; flex-shrink:0; }.encounter-panel summary:focus-visible { outline:2px solid #7cdbff; outline-offset:4px; }
@media(max-height:600px) { .encounter-panel { top:62px; bottom:auto; left:calc(50% - 145px); width:290px; max-height:40vh; font-size:11px; padding:10px; }.encounter-panel ul { margin:6px 0; } }
</style>
