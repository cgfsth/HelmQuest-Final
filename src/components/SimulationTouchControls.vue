<template>
  <div class="simulation-touch-controls" :class="{ 'touch-controls-disabled': disabled }" aria-label="Boat touch controls">
    <div class="touch-steering-pad" role="group" aria-label="Steer and throttle">
      <button v-for="control in controls" :key="control.code" type="button"
        :class="[control.className, { 'touch-control-held': heldCodes.includes(control.code) }]"
        :aria-label="control.label" :aria-pressed="heldCodes.includes(control.code)" :disabled="disabled"
        @pointerdown.stop.prevent="hold($event, control.code)"
        @pointerup.stop.prevent="release($event)" @pointercancel="release($event)"
        @lostpointercapture="release($event)" @contextmenu.prevent>
        <span aria-hidden="true">{{ control.arrow }}</span>
      </button>
    </div>
    <button type="button" class="touch-interact-button" :disabled="disabled" @click="emit('interact')">
      <span aria-hidden="true">Q</span><span>Interact</span>
    </button>
  </div>
</template>

<script setup>
import { ref, watch, onMounted, onUnmounted } from 'vue';
import { createSimulationTouchInput } from '../helpers/simulationTouchInput.js';

const props = defineProps({ disabled: Boolean });
const emit = defineEmits(['press', 'release', 'interact']);
const heldCodes = ref([]);
const controls = [
  { code: 'KeyW', label: 'Throttle forward', arrow: '↑', className: 'touch-forward' },
  { code: 'KeyA', label: 'Steer left', arrow: '←', className: 'touch-left' },
  { code: 'KeyS', label: 'Throttle reverse', arrow: '↓', className: 'touch-reverse' },
  { code: 'KeyD', label: 'Steer right', arrow: '→', className: 'touch-right' },
];
const input = createSimulationTouchInput({
  press: code => emit('press', code), release: code => emit('release', code),
  changed: codes => { heldCodes.value = codes; },
});
function hold(event, code) {
  if (props.disabled) return;
  event.currentTarget.setPointerCapture?.(event.pointerId);
  input.press(event.pointerId, code);
}
function release(event) { input.release(event.pointerId); }
function onVisibilityChange() { if (document.hidden) input.reset(); }
watch(() => props.disabled, disabled => { if (disabled) input.reset(); });
onMounted(() => {
  window.addEventListener('blur', input.reset);
  document.addEventListener('visibilitychange', onVisibilityChange);
});
onUnmounted(() => {
  input.reset();
  window.removeEventListener('blur', input.reset);
  document.removeEventListener('visibilitychange', onVisibilityChange);
});
</script>

<style scoped>
.simulation-touch-controls {
  position: fixed;
  left: max(8px, env(safe-area-inset-left, 0px));
  bottom: max(8px, env(safe-area-inset-bottom, 0px));
  z-index: 90600;
  display: flex;
  gap: 10px;
  align-items: flex-end;
  pointer-events: none;
}
.touch-steering-pad {
  display: grid;
  grid-template-columns: repeat(3, 44px);
  grid-template-rows: repeat(2, 44px);
  gap: 5px;
}
button {
  min-width: 44px;
  min-height: 44px;
  border: 1px solid rgba(125, 211, 252, .45);
  border-radius: 10px;
  background: rgba(8, 16, 32, .72);
  color: #e0f2fe;
  pointer-events: auto;
  touch-action: none;
  user-select: none;
  -webkit-user-select: none;
  -webkit-touch-callout: none;
  font: inherit;
}
.touch-steering-pad button { font-size: 24px; }
.touch-forward { grid-column: 2; grid-row: 1; }
.touch-left { grid-column: 1; grid-row: 2; }
.touch-reverse { grid-column: 2; grid-row: 2; }
.touch-right { grid-column: 3; grid-row: 2; }
.touch-control-held, button:active { background: rgba(14, 116, 144, .8); border-color: #7dd3fc; }
.touch-interact-button { display: grid; justify-items: center; align-content: center; gap: 2px; padding: 6px 10px; font-size: 10px; }
.touch-interact-button span:first-child { font-size: 16px; font-weight: 800; }
button:disabled { opacity: .35; pointer-events: none; }
button:focus-visible { outline: 2px solid #7dd3fc; outline-offset: 2px; }
@media (max-width: 640px) { .simulation-touch-controls { gap: 6px; } .touch-interact-button { padding-inline: 6px; } }
</style>
