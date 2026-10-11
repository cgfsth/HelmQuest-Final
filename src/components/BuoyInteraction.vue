<template>
  <transition name="modal-fade">
    <div v-if="show" class="buoy-interaction-overlay" @click.self="$emit('close')">
      <div class="buoy-interaction-card">
        <div class="interaction-icon">{{ actionIcon }}</div>
        
        <h2 class="interaction-title">BUOY REACHED</h2>
        
        <div class="interaction-details">
          <div class="detail-label">Required Action:</div>
          <div class="detail-value">{{ actionLabel }}</div>
        </div>
        
        <button class="interaction-btn" @click="$emit('interact')">
          {{ actionButtonText }}
        </button>
        
        <button class="interaction-close" @click="$emit('close')">
          Close
        </button>
      </div>
    </div>
  </transition>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  show: {
    type: Boolean,
    required: true
  },
  action: {
    type: String,
    required: true
    // 'photograph', 'verify_id', 'remove_debris', 'inspect'
  },
  buoyName: {
    type: String,
    default: 'Buoy'
  }
})

defineEmits(['interact', 'close'])

const actionIcon = computed(() => {
  const icons = {
    photograph: '📸',
    verify_id: '🔍',
    remove_debris: '🧹',
    inspect: '👁️'
  }
  return icons[props.action] || '📝'
})

const actionLabel = computed(() => {
  const labels = {
    photograph: `Photograph the ${props.buoyName}`,
    verify_id: `Verify ${props.buoyName} ID`,
    remove_debris: `Clear Debris from ${props.buoyName}`,
    inspect: `Inspect ${props.buoyName}`
  }
  return labels[props.action] || `Interact with ${props.buoyName}`
})

const actionButtonText = computed(() => {
  const texts = {
    photograph: 'PHOTOGRAPH',
    verify_id: 'VERIFY ID',
    remove_debris: 'CLEAR DEBRIS',
    inspect: 'INSPECT'
  }
  return texts[props.action] || 'INTERACT'
})
</script>

<style scoped>
.buoy-interaction-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 900;
}

.buoy-interaction-card {
  max-width: 500px;
  width: 90%;
  padding: 40px;
  background: linear-gradient(135deg, rgba(10, 37, 64, 0.98), rgba(14, 44, 76, 0.98));
  border: 2px solid rgba(6, 182, 212, 0.4);
  border-radius: 16px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.8);
  text-align: center;
  animation: modalSlideUp 0.3s ease;
}

@keyframes modalSlideUp {
  from {
    transform: translateY(40px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

.interaction-icon {
  font-size: 64px;
  margin-bottom: 24px;
  filter: drop-shadow(0 0 20px rgba(6, 182, 212, 0.6));
  animation: iconFloat 3s ease-in-out infinite;
}

@keyframes iconFloat {
  0%, 100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-10px);
  }
}

.interaction-title {
  font-size: 28px;
  font-weight: 700;
  color: #F0F9FF;
  margin: 0 0 32px 0;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.5);
}

.interaction-details {
  margin-bottom: 32px;
  padding: 24px;
  background: rgba(245, 158, 11, 0.1);
  border: 2px solid rgba(245, 158, 11, 0.3);
  border-radius: 12px;
}

.detail-label {
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 1.5px;
  color: #F59E0B;
  margin-bottom: 8px;
}

.detail-value {
  font-size: 20px;
  font-weight: 700;
  color: #FFF;
  line-height: 1.4;
}

.interaction-btn {
  width: 100%;
  padding: 18px 32px;
  background: linear-gradient(135deg, #F59E0B, #D97706);
  border: none;
  border-radius: 10px;
  color: #FFF;
  font-size: 16px;
  font-weight: 700;
  letter-spacing: 1px;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 4px 16px rgba(245, 158, 11, 0.4);
  margin-bottom: 12px;
}

.interaction-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(245, 158, 11, 0.6);
}

.interaction-btn:active {
  transform: translateY(0);
}

.interaction-close {
  width: 100%;
  padding: 12px;
  background: rgba(148, 163, 184, 0.1);
  border: 2px solid rgba(148, 163, 184, 0.3);
  border-radius: 8px;
  color: #94A3B8;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.interaction-close:hover {
  background: rgba(148, 163, 184, 0.2);
  border-color: rgba(148, 163, 184, 0.5);
  color: #CBD5E1;
}

/* Transition */
.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: opacity 0.3s ease;
}

.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
}

.modal-fade-enter-active .buoy-interaction-card {
  animation: modalSlideUp 0.3s ease;
}
</style>
