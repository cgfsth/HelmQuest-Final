<template>
  <transition name="fade-slide">
    <div v-if="show" class="engine-status-indicator" :class="statusClass">
      <div class="status-icon">{{ statusIcon }}</div>
      <div class="status-content">
        <div class="status-label">ENGINE STATUS</div>
        <div class="status-value">{{ statusText }}</div>
        <div v-if="instruction" class="status-instruction">{{ instruction }}</div>
      </div>
    </div>
  </transition>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  running: {
    type: Boolean,
    required: true
  },
  starting: {
    type: Boolean,
    default: false
  },
  show: {
    type: Boolean,
    default: true
  },
  showInstruction: {
    type: Boolean,
    default: true
  }
})

const statusClass = computed(() => {
  if (props.starting) return 'status-starting'
  return props.running ? 'status-running' : 'status-off'
})

const statusIcon = computed(() => {
  if (props.starting) return '⚙️'
  return props.running ? '🟢' : '🔴'
})

const statusText = computed(() => {
  if (props.starting) return 'STARTING...'
  return props.running ? 'ENGINE ON' : 'ENGINE OFF'
})

const instruction = computed(() => {
  if (!props.showInstruction) return null
  if (props.starting) return 'Engine starting up...'
  return props.running ? 'Press [P] to stop engine' : 'Press [P] to start engine'
})
</script>

<style scoped>
.engine-status-indicator {
  position: fixed;
  bottom: 120px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px 24px;
  background: linear-gradient(135deg, rgba(10, 37, 64, 0.95), rgba(14, 44, 76, 0.95));
  backdrop-filter: blur(10px);
  border: 2px solid rgba(6, 182, 212, 0.3);
  border-radius: 12px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5);
  z-index: 500;
}

.status-icon {
  font-size: 32px;
  filter: drop-shadow(0 0 10px rgba(6, 182, 212, 0.6));
}

.status-content {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.status-label {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 1.5px;
  color: #94A3B8;
}

.status-value {
  font-size: 18px;
  font-weight: 700;
  color: #F0F9FF;
}

.status-instruction {
  font-size: 12px;
  color: #CBD5E1;
  margin-top: 4px;
}

.status-instruction kbd {
  display: inline-block;
  padding: 2px 6px;
  background: rgba(6, 182, 212, 0.2);
  border: 1px solid rgba(6, 182, 212, 0.4);
  border-radius: 4px;
  color: #06B6D4;
  font-family: monospace;
  font-weight: 700;
}

/* Status-specific styles */
.status-off {
  border-color: rgba(239, 68, 68, 0.4);
}

.status-off .status-value {
  color: #FCA5A5;
}

.status-running {
  border-color: rgba(16, 185, 129, 0.4);
}

.status-running .status-value {
  color: #6EE7B7;
}

.status-starting {
  border-color: rgba(245, 158, 11, 0.4);
  animation: pulse 1.5s ease-in-out infinite;
}

.status-starting .status-value {
  color: #FCD34D;
}

@keyframes pulse {
  0%, 100% {
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5);
  }
  50% {
    box-shadow: 0 8px 32px rgba(245, 158, 11, 0.4);
  }
}

/* Transitions */
.fade-slide-enter-active,
.fade-slide-leave-active {
  transition: all 0.3s ease;
}

.fade-slide-enter-from {
  opacity: 0;
  transform: translateX(-50%) translateY(20px);
}

.fade-slide-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(-20px);
}
</style>
