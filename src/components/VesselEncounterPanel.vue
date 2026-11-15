<template>
  <aside v-if="status" class="encounter-panel" :class="{ 'encounter-panel--danger': status.emergency && !status.resolved }" aria-label="Vessel avoidance exercise">
    <div class="encounter-heading"><span class="encounter-light" :class="'encounter-light--' + status.light" aria-hidden="true"></span><strong>{{ status.status }}</strong></div>
    <div class="encounter-reading"><span>Bearing <strong>{{ status.bearing }}°</strong></span><span>Clearance <strong>{{ status.distance == null ? '—' : status.distance + ' m' }}</strong></span></div>
    <details @toggle="guideOpen = $event.target.open">
      <summary>{{ guideOpen ? 'Hide guide' : 'Show guide' }}<span>Min. {{ status.clearance }} m</span></summary>
      <div class="encounter-guide">
        <p>{{ status.instruction }}</p>
        <p v-if="status.yielding" class="encounter-yield">The other vessel is giving way. Continue your lookout.</p>
        <ul><li v-for="tip in status.tips" :key="tip">{{ tip }}</li></ul>
        <small>Power-driven crossing exercise, vessels in sight. Anchored vessels show white anchor light. Distance limits are training margins.</small>
        <a :href="ENCOUNTER_RULES_SOURCE" target="_blank" rel="noopener noreferrer">Navigation rules: 5, 7, 8, 15–17, 21 &amp; 30</a>
      </div>
    </details>
  </aside>
</template>
<script setup>
import { ref } from 'vue';
import { ENCOUNTER_RULES_SOURCE } from '../../shared/vesselEncounter.js';

defineProps({ status: Object });
const guideOpen = ref(false);
</script>
<style scoped>
.encounter-panel { position:absolute; left:18px; bottom:18px; z-index:35; width:min(260px,calc(100vw - 36px)); border:1px solid #59cafa80; border-radius:10px; background:#071a2deF; color:#edf8ff; padding:10px 12px; box-sizing:border-box; font:12px/1.4 sans-serif; pointer-events:auto; }
.encounter-panel--danger { border-color:#ff8e72; }
.encounter-heading { display:flex; align-items:center; gap:7px; }
.encounter-reading { display:flex; flex-wrap:wrap; gap:4px 14px; margin:7px 0 3px; color:#b4d4e7; font-size:11px; }
.encounter-panel summary { display:flex; align-items:center; justify-content:space-between; gap:8px; min-height:28px; color:#7cdbff; cursor:pointer; font-size:11px; list-style:none; }
.encounter-panel summary::-webkit-details-marker { display:none; }
.encounter-panel summary span { color:#a6bfce; font-size:10px; }
.encounter-panel summary:focus-visible { outline:2px solid #7cdbff; outline-offset:2px; }
.encounter-guide { max-height:min(210px,30dvh); overflow-y:auto; overscroll-behavior:contain; border-top:1px solid #59cafa40; scrollbar-width:thin; }
.encounter-panel p { margin:8px 0; }.encounter-panel ul { padding-left:17px; margin:8px 0; }.encounter-panel li { margin:4px 0; }.encounter-panel small { display:block; color:#a6bfce; }.encounter-panel a { display:block; margin:7px 0 2px; color:#7cdbff; }
.encounter-light { width:9px; height:9px; border-radius:50%; background:white; flex-shrink:0; }.encounter-light--red { background:#ff5050; }.encounter-light--green { background:#4cff8b; }.encounter-light--both { background:linear-gradient(90deg,#ff5050 50%,#4cff8b 50%); }.encounter-yield { color:#7ff5c2; }
@media(max-height:600px) { .encounter-panel { left:max(6px,env(safe-area-inset-left,0px)); bottom:max(6px,env(safe-area-inset-bottom,0px)); width:clamp(170px,26vw,220px); max-width:calc(100vw - 12px); font-size:11px; padding:8px 10px; }.encounter-guide { max-height:min(100px,24dvh); } }
</style>
