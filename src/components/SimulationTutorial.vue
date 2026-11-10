<template>
  <div class="simulation-tour" @keydown.stop="onKeydown" @pointerdown.stop>
    <svg class="tour-shade" :viewBox="`0 0 ${viewport.width} ${viewport.height}`" preserveAspectRatio="none" aria-hidden="true"><path :d="shadePath" fill-rule="evenodd" /></svg>
    <div v-if="spotlight" class="tour-spotlight" :style="spotlightStyle" aria-hidden="true"></div>
    <section ref="card" class="tour-tooltip" :class="`tour-tooltip--${layout.side}`" :style="cardStyle"
      role="dialog" aria-modal="true" aria-labelledby="tour-title" aria-describedby="tour-description" tabindex="-1">
      <span v-if="layout.side !== 'center'" class="tour-arrow" :style="arrowStyle" aria-hidden="true"></span>
      <header class="tour-topline">
        <span class="tour-brand"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="5" r="2"/><path d="M12 7v14M6 11h12M3 14c0 9 18 9 18 0M3 14l-1 3m19-3 1 3"/></svg> HELMQUEST TOUR</span>
        <button type="button" class="tour-close" aria-label="Close guided tour" title="Continue later" @click="emit('close')">×</button>
      </header>
      <div class="tour-body">
        <p class="tour-step-label">{{ waiting ? 'BEFORE WE SET SAIL' : `STEP ${String(stepIndex + 1).padStart(2, '0')} / ${String(steps.length).padStart(2, '0')}` }}</p>
        <h2 id="tour-title" ref="title" tabindex="-1">{{ waiting ? 'Choose a mission to continue' : step.title }}</h2>
        <p id="tour-description" class="tour-description">{{ waiting ? 'This tour continues beside the real boat controls after you start a mission.' : step.description }}</p>
        <template v-if="waiting">
          <ol class="tour-instructions">
            <li>Choose an available mission from your instructor.</li><li>Read the briefing, then start the simulation.</li><li>The guide will return automatically. You can read it while the boat is paused.</li>
          </ol>
          <p class="tour-tip">No available mission yet? Your instructor may need to publish one or unlock it for you. You can close the tour and return with the help icon.</p>
        </template>
        <template v-else>
          <ol class="tour-instructions"><li v-for="instruction in step.instructions" :key="instruction">{{ instruction }}</li></ol>
          <div v-if="step.desktop" class="tour-device-picker" role="group" aria-label="Show controls for your device">
            <button type="button" :aria-pressed="!showTouch" @click="showTouch = false">Keyboard</button><button type="button" :aria-pressed="showTouch" @click="showTouch = true">Phone / tablet</button>
          </div>
          <dl v-if="step.desktop" class="tour-controls"><div v-for="control in showTouch ? step.touch : step.desktop" :key="control.key"><dt><kbd>{{ control.key }}</kbd></dt><dd>{{ control.action }}</dd></div></dl>
          <p class="tour-tip">{{ step.tip }}</p>
        </template>
        <p v-if="storageNotice" class="tour-storage-notice" role="status">{{ storageNotice }}</p>
      </div>
      <footer class="tour-footer">
        <div class="tour-dots" role="img" :aria-label="`Step ${stepIndex + 1} of ${steps.length}`"><span v-for="(_, index) in steps" :key="index" :class="{ current: index === stepIndex, read: index < stepIndex }"></span></div>
        <div class="tour-actions"><button v-if="stepIndex > (screen === 'simulation' ? 1 : 0)" type="button" class="tour-back" @click="emit('back')">Back</button><button type="button" class="tour-next" @click="emit(waiting ? 'choose-mission' : 'next')">{{ waiting ? 'Choose a mission' : stepIndex === 0 && screen === 'dashboard' ? 'Show missions' : stepIndex === steps.length - 1 ? 'Finish tour' : 'Next' }} <span aria-hidden="true">→</span></button></div>
      </footer>
      <p class="tour-pause-note">{{ screen === 'simulation' ? 'Simulation paused while you read' : 'Go at your own pace · Esc to close' }}</p>
    </section>
  </div>
</template>

<script setup>
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue';
import { SIMULATION_TUTORIAL_STEPS as steps } from '../helpers/simulationTutorial.js';
import { getSimulationTourLayout, getSimulationTourSpotlight } from '../helpers/simulationTourLayout.js';

const props = defineProps({ stepIndex: { type: Number, default: 0 }, screen: { type: String, default: 'dashboard' }, touch: Boolean, storageNotice: { type: String, default: '' } });
const emit = defineEmits(['next', 'back', 'close', 'choose-mission']);
const showTouch = ref(props.touch);
const step = computed(() => steps[props.stepIndex] || steps[0]);
const waiting = computed(() => props.screen === 'dashboard' && props.stepIndex > 0);
const card = ref(null), title = ref(null), spotlight = ref(null);
const viewport = ref({ width: 1024, height: 768 });
const layout = ref({ left: 16, top: 16, side: 'center' });
const cardStyle = computed(() => ({ left: `${layout.value.left}px`, top: `${layout.value.top}px` }));
const spotlightStyle = computed(() => ({ left: `${spotlight.value.left}px`, top: `${spotlight.value.top}px`, width: `${spotlight.value.width}px`, height: `${spotlight.value.height}px` }));
const arrowStyle = computed(() => {
  if (!spotlight.value) return {};
  const rect = spotlight.value;
  return ['left', 'right'].includes(layout.value.side)
    ? { top: `${Math.max(22, Math.min((card.value?.offsetHeight || 400) - 22, rect.top + rect.height / 2 - layout.value.top))}px` }
    : { left: `${Math.max(22, Math.min((card.value?.offsetWidth || 380) - 22, rect.left + rect.width / 2 - layout.value.left))}px` };
});
const shadePath = computed(() => {
  const { width, height } = viewport.value;
  const outer = `M0 0H${width}V${height}H0Z`;
  if (!spotlight.value) return outer;
  const { left: x, top: y, right: r, bottom: b, width: w, height: h } = spotlight.value;
  const radius = Math.min(12, w / 2, h / 2);
  return `${outer} M${x + radius} ${y}H${r - radius}Q${r} ${y} ${r} ${y + radius}V${b - radius}Q${r} ${b} ${r - radius} ${b}H${x + radius}Q${x} ${b} ${x} ${b - radius}V${y + radius}Q${x} ${y} ${x + radius} ${y}Z`;
});
function findTarget() {
  const selectors = waiting.value
    ? ['#hub-missions .hub-mission-start:not(:disabled)', '#hub-missions .training-card-title', '[data-tour="student-header"]']
    : [props.touch && step.value.touchTarget, step.value.target];
  for (const selector of selectors.filter(Boolean)) {
    const element = [...document.querySelectorAll(selector)].find(item => item.getClientRects().length && getComputedStyle(item).visibility !== 'hidden');
    if (element) return element;
  }
  return null;
}
function measure() {
  if (!card.value) return;
  viewport.value = { width: window.innerWidth, height: window.innerHeight };
  const target = findTarget()?.getBoundingClientRect();
  spotlight.value = getSimulationTourSpotlight(target, viewport.value.width, viewport.value.height);
  const bounds = card.value.getBoundingClientRect();
  layout.value = getSimulationTourLayout({ target: spotlight.value, ...viewport.value, cardWidth: bounds.width, cardHeight: bounds.height });
}
let frame = 0, observer;
function scheduleMeasure() { cancelAnimationFrame(frame); frame = requestAnimationFrame(measure); }
async function updateStep() {
  await nextTick();
  const target = findTarget();
  if (target) {
    const rect = target.getBoundingClientRect();
    if (rect.top < 16 || rect.bottom > window.innerHeight - 16) target.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'instant' });
  }
  measure(); title.value?.focus({ preventScroll: true });
}
function onKeydown(event) {
  if (event.key === 'Escape') { event.preventDefault(); emit('close'); return; }
  if (event.key !== 'Tab') return;
  const controls = [...card.value.querySelectorAll('button:not([disabled])')];
  const first = controls[0], last = controls.at(-1);
  if ((event.shiftKey && (document.activeElement === first || document.activeElement === title.value)) || (!event.shiftKey && document.activeElement === last)) {
    event.preventDefault(); (event.shiftKey ? last : first)?.focus();
  }
}
watch(() => [props.stepIndex, props.screen], updateStep);
onMounted(() => {
  window.addEventListener('resize', scheduleMeasure); window.addEventListener('scroll', scheduleMeasure, true);
  observer = new ResizeObserver(scheduleMeasure); observer.observe(card.value);
  const target = findTarget(); if (target) observer.observe(target);
  updateStep();
});
onUnmounted(() => {
  cancelAnimationFrame(frame); observer?.disconnect();
  window.removeEventListener('resize', scheduleMeasure); window.removeEventListener('scroll', scheduleMeasure, true);
});
</script>

<style scoped>
.simulation-tour { position: fixed; inset: 0; z-index: 260000; cursor: default; isolation: isolate; }
.tour-shade { position: absolute; inset: 0; width: 100%; height: 100%; fill: rgba(2, 8, 20, .76); }
.tour-spotlight { position: fixed; pointer-events: none; border: 2px solid #67e8f9; border-radius: 12px; box-shadow: 0 0 0 4px #67e8f91a, 0 0 28px #22d3ee40; }
.tour-tooltip { position: fixed; width: min(380px, calc(100vw - 32px)); max-height: calc(100dvh - 32px); display: flex; flex-direction: column; box-sizing: border-box; border: 1px solid #d8e8ee; border-radius: 16px; background: #f8fcff; color: #142d41; box-shadow: 0 18px 70px #0008, 0 4px 16px #02081733; font-family: 'Outfit', sans-serif; outline: none; }
.tour-arrow { position: absolute; width: 14px; height: 14px; background: #f8fcff; transform: translate(-50%, -50%) rotate(45deg); z-index: -1; border: 1px solid #d8e8ee; }
.tour-tooltip--right .tour-arrow { left: 0; }.tour-tooltip--left .tour-arrow { left: 100%; }.tour-tooltip--bottom .tour-arrow { top: 0; }.tour-tooltip--top .tour-arrow { top: 100%; }
.tour-topline { display: flex; align-items: center; justify-content: space-between; padding: 12px 16px 0 22px; flex-shrink: 0; }
.tour-brand { display: flex; align-items: center; gap: 7px; color: #477180; font-size: 10px; font-weight: 700; letter-spacing: 1.4px; }
.tour-brand svg { width: 19px; height: 19px; stroke: #0891a5; stroke-width: 1.8; fill: none; stroke-linecap: round; }
.tour-close { width: 36px; height: 36px; border: 0; border-radius: 8px; background: transparent; color: #5b7281; font: inherit; font-size: 25px; cursor: pointer; }
.tour-close:hover { background: #e8f1f6; }
.tour-body { padding: 10px 22px 0; overflow-y: auto; overscroll-behavior: contain; min-height: 0; }
.tour-step-label { margin: 0 0 8px; color: #087f91; font-size: 10px; font-weight: 700; letter-spacing: 1.3px; }
.tour-body h2 { margin: 0 0 10px; color: #102c40; font-size: 22px; line-height: 1.25; letter-spacing: -.4px; outline: none; }
.tour-description { margin: 0; color: #4e6778; font-size: 13px; line-height: 1.65; }
.tour-instructions { padding-left: 18px; margin: 14px 0; font-size: 12px; line-height: 1.65; color: #29495e; }
.tour-instructions li { padding-left: 3px; margin: 0 0 7px; }
.tour-tip { margin: 12px 0 0; padding: 11px 12px; background: #eaf5f8; border-left: 3px solid #38b7c6; border-radius: 0 7px 7px 0; color: #356578; font-size: 11px; line-height: 1.6; }
.tour-device-picker { display: flex; gap: 6px; margin-top: 12px; }
.tour-device-picker button { min-height: 36px; padding: 6px 10px; border: 1px solid #c8dce5; border-radius: 6px; color: #4b687a; background: #f8fcff; font: inherit; font-size: 11px; cursor: pointer; }
.tour-device-picker button[aria-pressed="true"] { color: #087789; background: #e0f4f6; border-color: #69c6d0; }
.tour-controls { display: flex; flex-wrap: wrap; gap: 9px 14px; margin: 12px 0; }
.tour-controls > div { display: flex; align-items: center; gap: 6px; }.tour-controls dd { margin: 0; color: #3d5b6e; font-size: 11px; }
.tour-controls kbd { display: inline-block; min-width: 25px; padding: 4px 6px; border: 1px solid #bcd0dc; border-bottom-width: 2px; border-radius: 5px; text-align: center; color: #17445d; background: #edf4f8; font: inherit; font-size: 11px; }
.tour-footer { display: flex; justify-content: space-between; align-items: center; gap: 12px; padding: 18px 22px 10px; flex-shrink: 0; }
.tour-dots, .tour-actions { display: flex; align-items: center; gap: 6px; }.tour-dots span { width: 5px; height: 5px; border-radius: 8px; background: #c5d8e2; }.tour-dots span.current { width: 17px; background: #0d91a5; }.tour-dots span.read { background: #60bdc7; }
.tour-actions button { min-height: 40px; border-radius: 8px; padding: 8px 12px; font: inherit; font-size: 12px; font-weight: 600; cursor: pointer; }
.tour-back { color: #486579; background: transparent; border: 1px solid #cddfe8; }.tour-next { display: flex; align-items: center; gap: 10px; background: #087f91; color: #fff; border: 1px solid #087f91; }
.tour-next:hover { background: #066879; }.tour-next span { font-size: 17px; }
.tour-pause-note { margin: 0; padding: 0 22px 15px; color: #6a8392; font-size: 10px; text-align: right; flex-shrink: 0; }
.tour-storage-notice { margin: 10px 0 0; color: #8a5b19; font-size: 11px; line-height: 1.5; }.tour-tooltip button:focus-visible { outline: 2px solid #0d91a5; outline-offset: 3px; }
@media (max-width: 400px) { .tour-body { padding-inline: 18px; }.tour-footer { padding-inline: 18px; gap: 8px; }.tour-actions button { padding-inline: 10px; }.tour-dots { gap: 4px; } }
</style>
