<template>
  <section class="simulation-tutorial" aria-labelledby="simulation-tutorial-title">
    <header class="tutorial-header">
      <div>
        <p class="tutorial-eyebrow">FIRST VOYAGE GUIDE</p>
        <h2 id="simulation-tutorial-title">{{ completed ? 'You have completed the tutorial' : 'Welcome aboard! Learn the simulation' }}</h2>
        <p>{{ completed ? 'Revisit these cards anytime from Simulation Tutorial.' : 'Six short cards to help you prepare for your first mission. Go at your own pace.' }}</p>
      </div>
      <span class="tutorial-status">{{ completed ? 'Guide completed' : `${stepIndex + 1} of ${steps.length} cards` }}</span>
    </header>

    <template v-if="!completed">
      <div class="tutorial-progress" role="progressbar" aria-label="Tutorial cards read"
        :aria-valuenow="stepIndex" :aria-valuemin="0" :aria-valuemax="steps.length"
        :aria-valuetext="`Card ${stepIndex + 1} of ${steps.length}`">
        <span :style="{ width: `${stepIndex / steps.length * 100}%` }"></span>
      </div>
      <ol class="tutorial-outline" aria-label="Tutorial steps">
        <li v-for="(item, index) in steps" :key="item.label"
          :class="{ 'tutorial-outline-current': index === stepIndex, 'tutorial-outline-read': index < stepIndex }"
          :aria-current="index === stepIndex ? 'step' : undefined">
          <span class="tutorial-step-number" aria-hidden="true">{{ index < stepIndex ? '✓' : index + 1 }}</span>
          <span>{{ item.label }}</span>
        </li>
      </ol>

      <article class="tutorial-card" aria-labelledby="tutorial-card-title">
        <div class="tutorial-card-illustration" aria-hidden="true">
          <svg viewBox="0 0 220 180" fill="none">
            <circle cx="110" cy="83" r="66" stroke="currentColor" stroke-opacity=".2" />
            <circle cx="110" cy="83" r="49" stroke="currentColor" stroke-opacity=".15" stroke-dasharray="4 6" />
            <template v-if="step.icon === 'compass' || step.icon === 'help'">
              <path d="m126 61-9 34-33 10 10-34 32-10Z" stroke="currentColor" stroke-width="3" stroke-linejoin="round" />
              <path d="m126 61-22 22-20 22 10-34 32-10Z" fill="currentColor" fill-opacity=".2" />
              <path d="M110 27v11m0 90v11M54 83h11m90 0h11" stroke="currentColor" stroke-width="3" />
            </template>
            <template v-else-if="step.icon === 'engine'">
              <path d="M110 48v37m-20-31a37 37 0 1 0 40 0" stroke="currentColor" stroke-width="7" stroke-linecap="round" />
            </template>
            <template v-else-if="step.icon === 'steer'">
              <circle cx="110" cy="83" r="31" stroke="currentColor" stroke-width="4" />
              <circle cx="110" cy="83" r="9" stroke="currentColor" stroke-width="3" />
              <path d="M110 37v37m0 18v37M64 83h37m18 0h37M78 51l26 26m12 12 26 26M78 115l26-26m12-12 26-26" stroke="currentColor" stroke-width="4" stroke-linecap="round" />
            </template>
            <template v-else-if="step.icon === 'buoy'">
              <path d="m93 113 8-45h18l8 45H93Zm17-66v21m-26 45h52M83 59l-7-7m61 7 7-7" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" />
              <path d="M100 88h20" stroke="currentColor" stroke-width="7" />
            </template>
            <template v-else>
              <path d="M89 123V45m0 3c17-14 27 14 46 0v40c-19 14-29-14-46 0" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" />
            </template>
            <path d="M32 151c13-12 26 12 39 0s26 12 39 0 26 12 39 0 26 12 39 0" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-opacity=".45" />
          </svg>
          <span>HELMQUEST / {{ String(stepIndex + 1).padStart(2, '0') }}</span>
        </div>
        <div class="tutorial-card-content">
          <p class="tutorial-eyebrow">CARD {{ stepIndex + 1 }} · {{ step.label }}</p>
          <h3 id="tutorial-card-title" ref="cardTitle" tabindex="-1">{{ step.title }}</h3>
          <p class="tutorial-description">{{ step.description }}</p>
          <ol class="tutorial-instructions">
            <li v-for="instruction in step.instructions" :key="instruction">{{ instruction }}</li>
          </ol>
          <div v-if="step.desktop" class="tutorial-device-controls">
            <div class="tutorial-device-picker" role="group" aria-label="Show controls for your device">
              <button type="button" :aria-pressed="!showTouch" @click="showTouch = false">Keyboard</button>
              <button type="button" :aria-pressed="showTouch" @click="showTouch = true">Phone / tablet</button>
            </div>
            <dl class="tutorial-controls">
              <div v-for="control in showTouch ? step.touch : step.desktop" :key="control.key">
                <dt><kbd>{{ control.key }}</kbd></dt><dd>{{ control.action }}</dd>
              </div>
            </dl>
          </div>
          <p class="tutorial-tip"><strong>Remember:</strong> {{ step.tip }}</p>
        </div>
      </article>

      <footer class="tutorial-footer">
        <button type="button" class="tutorial-button tutorial-button-secondary" :disabled="stepIndex === 0" @click="emit('back')">Back</button>
        <span class="tutorial-save-hint">Continue later from this browser.</span>
        <button type="button" class="tutorial-button tutorial-button-primary" @click="emit('next')">{{ stepIndex === steps.length - 1 ? 'Finish tutorial' : 'Next card →' }}</button>
      </footer>
    </template>
    <div v-else class="tutorial-complete">
      <span class="tutorial-complete-icon" aria-hidden="true">✓</span>
      <div><h3 ref="completeTitle" tabindex="-1">Your next step: choose a mission</h3><p>Read the briefing, follow the objectives and take your time at the helm.</p></div>
      <div class="tutorial-complete-actions">
        <button type="button" class="tutorial-button tutorial-button-primary" @click="emit('missions')">Open Missions</button>
        <button type="button" class="tutorial-button tutorial-button-secondary" @click="emit('restart')">Review tutorial</button>
      </div>
    </div>
    <p v-if="storageNotice" class="tutorial-storage-notice" role="status">{{ storageNotice }}</p>
  </section>
</template>

<script setup>
import { computed, nextTick, ref, watch } from 'vue';
import { SIMULATION_TUTORIAL_STEPS as steps } from '../helpers/simulationTutorial.js';

const props = defineProps({
  stepIndex: { type: Number, default: 0 }, completed: Boolean,
  touch: Boolean, storageNotice: { type: String, default: '' },
});
const emit = defineEmits(['next', 'back', 'restart', 'missions']);
const showTouch = ref(props.touch);
const step = computed(() => steps[props.stepIndex] || steps[0]);
const cardTitle = ref(null);
const completeTitle = ref(null);
watch(() => [props.stepIndex, props.completed], async () => {
  await nextTick();
  (props.completed ? completeTitle.value : cardTitle.value)?.focus();
});
</script>

<style scoped>
.simulation-tutorial { min-width: 0; color: #e2e8f0; border: 1px solid #28475b; border-radius: 18px; padding: clamp(18px, 3vw, 30px); background: linear-gradient(135deg, #102d40, #101e30 65%); }
.tutorial-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 20px; }
.tutorial-eyebrow { margin: 0 0 8px; color: #67d8e8; font-size: 11px; font-weight: 700; letter-spacing: 1.5px; }
.tutorial-header h2 { margin: 0; color: #f0f9ff; font-size: clamp(20px, 2vw, 27px); line-height: 1.3; }
.tutorial-header > div > p:last-child { margin: 10px 0 0; color: #b0c5d5; font-size: 14px; line-height: 1.6; }
.tutorial-status { flex-shrink: 0; padding: 7px 11px; border: 1px solid #396377; border-radius: 30px; color: #a5f3fc; font-size: 12px; }
.tutorial-progress { height: 4px; margin-top: 24px; background: #263d50; border-radius: 4px; overflow: hidden; }
.tutorial-progress > span { display: block; height: 100%; background: #5eead4; }
.tutorial-outline { display: grid; grid-template-columns: repeat(6, minmax(0, 1fr)); gap: 10px; padding: 0; margin: 20px 0; list-style: none; }
.tutorial-outline li { display: flex; align-items: center; gap: 8px; color: #91a8bc; font-size: 11px; line-height: 1.4; }
.tutorial-step-number { display: grid; place-items: center; flex: 0 0 26px; height: 26px; border: 1px solid #3b5267; border-radius: 50%; font-weight: 700; }
.tutorial-outline-current { color: #e0faff !important; }
.tutorial-outline-current .tutorial-step-number { border-color: #67e8f9; color: #67e8f9; background: #164457; }
.tutorial-outline-read .tutorial-step-number { color: #5eead4; border-color: #2b706f; }
.tutorial-card { display: grid; grid-template-columns: minmax(130px, .65fr) minmax(0, 2fr); border: 1px solid #2d465c; border-radius: 13px; background: #122538; overflow: hidden; }
.tutorial-card-illustration { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 10px; padding: 20px; color: #67d8e8; background: radial-gradient(ellipse at center, #164457, #102b3d 75%); }
.tutorial-card-illustration svg { width: 100%; max-width: 230px; }
.tutorial-card-illustration > span { color: #8fb7cb; font-size: 10px; letter-spacing: 2px; }
.tutorial-card-content { padding: clamp(18px, 2vw, 28px); min-width: 0; }
.tutorial-card h3 { margin: 0 0 10px; color: #f0f9ff; font-size: 22px; line-height: 1.3; }
.tutorial-card h3:focus { outline: none; }
.tutorial-description, .tutorial-complete p { margin: 0; color: #b0c5d5; font-size: 14px; line-height: 1.7; }
.tutorial-instructions { padding-left: 20px; margin: 18px 0; color: #d4e1eb; font-size: 14px; line-height: 1.7; }
.tutorial-instructions li { padding-left: 4px; margin-bottom: 9px; }
.tutorial-device-picker { display: flex; flex-wrap: wrap; gap: 6px; }
.tutorial-device-picker button { min-height: 40px; padding: 7px 12px; background: #172f45; color: #b8ccdc; border: 1px solid #385268; border-radius: 7px; font: inherit; font-size: 12px; cursor: pointer; }
.tutorial-device-picker button[aria-pressed="true"] { color: #a5f3fc; border-color: #3a91a5; background: #164457; }
.tutorial-controls { display: flex; flex-wrap: wrap; gap: 12px 22px; margin: 14px 0; }
.tutorial-controls > div { display: flex; align-items: center; gap: 8px; }
.tutorial-controls dd { margin: 0; color: #c6d8e6; font-size: 12px; }
.tutorial-controls kbd { display: inline-block; min-width: 28px; padding: 5px 7px; box-sizing: border-box; border: 1px solid #4d687e; border-bottom-width: 3px; border-radius: 6px; text-align: center; color: #e0faff; background: #1c364b; font: inherit; font-size: 12px; }
.tutorial-tip { padding: 12px 14px; margin: 18px 0 0; border-left: 3px solid #4cc3cd; background: #173447; border-radius: 0 7px 7px 0; color: #b8dbe7; font-size: 12px; line-height: 1.7; }
.tutorial-footer { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px; margin-top: 18px; }
.tutorial-button { min-height: 44px; padding: 10px 18px; border: 1px solid transparent; border-radius: 8px; font: inherit; font-size: 13px; font-weight: 600; cursor: pointer; }
.tutorial-button-primary { background: #67e8f9; color: #082f49; }
.tutorial-button-primary:hover { background: #a5f3fc; }
.tutorial-button-secondary { background: #172f45; border-color: #3b5267; color: #d4e1eb; }
.tutorial-button:disabled { opacity: .4; cursor: default; }
.tutorial-button:focus-visible, .tutorial-device-picker button:focus-visible { outline: 2px solid #a5f3fc; outline-offset: 3px; }
.tutorial-save-hint { color: #97b0c4; font-size: 12px; }
.tutorial-complete { display: flex; align-items: center; flex-wrap: wrap; gap: 18px; margin-top: 24px; padding-top: 24px; border-top: 1px solid #28475b; }
.tutorial-complete-icon { display: grid; place-items: center; width: 46px; height: 46px; border-radius: 50%; color: #5eead4; background: #164c4f; font-size: 24px; }
.tutorial-complete > div { flex: 1 1 220px; }
.tutorial-complete h3 { margin: 0 0 6px; font-size: 17px; }
.tutorial-complete .tutorial-complete-actions { display: flex; flex: 0 1 auto; flex-wrap: wrap; gap: 10px; }
.tutorial-storage-notice { margin: 15px 0 0; color: #fcd9a5; font-size: 12px; line-height: 1.6; }
@media (max-width: 1100px) { .tutorial-outline { grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; } }
@media (max-width: 600px) {
  .tutorial-header { flex-direction: column; gap: 12px; }
  .tutorial-card { grid-template-columns: minmax(0, 1fr); }
  .tutorial-card-illustration { flex-direction: row; padding: 8px 18px; justify-content: flex-start; }
  .tutorial-card-illustration svg { width: 85px; height: 65px; }
  .tutorial-outline { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .tutorial-save-hint { order: 3; flex-basis: 100%; text-align: center; }
  .tutorial-card h3 { font-size: 20px; }
}
</style>
