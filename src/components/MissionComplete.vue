<template>
  <div class="mission-complete-overlay">
    <div class="mission-complete-card">
      <!-- Success Icon -->
      <div class="complete-icon-container">
        <div class="complete-icon">✓</div>
      </div>

      <!-- Title -->
      <h1 class="complete-title">MISSION COMPLETE</h1>

      <!-- Checklist -->
      <div class="complete-checklist">
        <div class="checklist-item">
          <span class="check-icon">✓</span>
          <span class="check-text">All {{ buoysCompleted }} buoy{{ buoysCompleted !== 1 ? 's' : '' }} completed</span>
        </div>
        <div class="checklist-item">
          <span class="check-icon">✓</span>
          <span class="check-text">Returned to port</span>
        </div>
        <div class="checklist-item">
          <span class="check-icon">✓</span>
          <span class="check-text">Engine stopped</span>
        </div>
        <div class="checklist-item">
          <span class="check-icon">✓</span>
          <span class="check-text">Anchor deployed</span>
        </div>
      </div>

      <!-- Success Message -->
      <p class="complete-message">
        Mission successfully completed.
        {{ hasQuiz ? 'Complete the assessment to finish.' : '' }}
      </p>

      <!-- XP Reward (if exists) -->
      <div v-if="xpReward && xpReward > 0" class="xp-reward">
        <span class="xp-icon">⭐</span>
        <span class="xp-text">+{{ xpReward }} XP</span>
      </div>

      <!-- Action Button -->
      <button 
        v-if="hasQuiz" 
        class="complete-btn" 
        @click="$emit('take-quiz')"
      >
        <span class="btn-icon">📝</span>
        <span class="btn-text">TAKE ASSESSMENT</span>
      </button>

      <button 
        v-else 
        class="complete-btn" 
        @click="$emit('finish')"
      >
        <span class="btn-icon">✓</span>
        <span class="btn-text">FINISH</span>
      </button>
    </div>
  </div>
</template>

<script setup>
defineProps({
  buoysCompleted: {
    type: Number,
    required: true
  },
  hasQuiz: {
    type: Boolean,
    default: true
  },
  xpReward: {
    type: Number,
    default: 0
  }
})

defineEmits(['take-quiz', 'finish'])
</script>

<style scoped>
.mission-complete-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.85);
  backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  animation: fadeIn 0.4s ease;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.mission-complete-card {
  max-width: 600px;
  width: 90%;
  padding: 48px;
  background: linear-gradient(135deg, rgba(10, 37, 64, 0.98), rgba(14, 44, 76, 0.98));
  border: 2px solid rgba(16, 185, 129, 0.4);
  border-radius: 20px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.8);
  text-align: center;
  animation: slideUp 0.5s ease;
}

@keyframes slideUp {
  from {
    transform: translateY(60px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

/* Success Icon */
.complete-icon-container {
  margin-bottom: 32px;
}

.complete-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 100px;
  height: 100px;
  background: linear-gradient(135deg, #10B981, #059669);
  border-radius: 50%;
  font-size: 56px;
  color: #FFF;
  font-weight: 700;
  box-shadow: 0 0 40px rgba(16, 185, 129, 0.6);
  animation: iconBounce 0.8s ease;
}

@keyframes iconBounce {
  0%, 100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.1);
  }
}

/* Title */
.complete-title {
  font-size: 36px;
  font-weight: 700;
  color: #F0F9FF;
  margin: 0 0 32px 0;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.5);
  letter-spacing: 2px;
}

/* Checklist */
.complete-checklist {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 32px;
  padding: 24px;
  background: rgba(16, 185, 129, 0.05);
  border-radius: 12px;
  border: 1px solid rgba(16, 185, 129, 0.2);
}

.checklist-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: rgba(16, 185, 129, 0.05);
  border-radius: 8px;
  text-align: left;
}

.check-icon {
  font-size: 20px;
  color: #10B981;
  font-weight: 700;
}

.check-text {
  font-size: 16px;
  color: #E2E8F0;
  font-weight: 500;
}

/* Message */
.complete-message {
  font-size: 16px;
  line-height: 1.6;
  color: #CBD5E1;
  margin: 0 0 32px 0;
}

/* XP Reward */
.xp-reward {
  display: inline-flex;
  align-items: center;
  gap: 12px;
  padding: 16px 32px;
  background: linear-gradient(135deg, rgba(245, 158, 11, 0.2), rgba(217, 119, 6, 0.2));
  border: 2px solid rgba(245, 158, 11, 0.4);
  border-radius: 12px;
  margin-bottom: 32px;
  animation: xpGlow 2s ease-in-out infinite;
}

@keyframes xpGlow {
  0%, 100% {
    box-shadow: 0 0 20px rgba(245, 158, 11, 0.3);
  }
  50% {
    box-shadow: 0 0 30px rgba(245, 158, 11, 0.6);
  }
}

.xp-icon {
  font-size: 32px;
  filter: drop-shadow(0 0 10px rgba(245, 158, 11, 0.8));
}

.xp-text {
  font-size: 24px;
  font-weight: 700;
  color: #FCD34D;
  text-shadow: 0 0 10px rgba(245, 158, 11, 0.6);
}

/* Action Button */
.complete-btn {
  width: 100%;
  padding: 20px 40px;
  background: linear-gradient(135deg, #10B981, #059669);
  border: none;
  border-radius: 12px;
  color: #FFF;
  font-size: 18px;
  font-weight: 700;
  letter-spacing: 1px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  transition: all 0.3s ease;
  box-shadow: 0 4px 20px rgba(16, 185, 129, 0.4);
}

.complete-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 30px rgba(16, 185, 129, 0.6);
}

.complete-btn:active {
  transform: translateY(0);
}

.btn-icon {
  font-size: 24px;
}

.btn-text {
  font-size: 18px;
}

/* Responsive */
@media (max-width: 768px) {
  .mission-complete-card {
    padding: 32px;
  }

  .complete-title {
    font-size: 28px;
  }

  .complete-icon {
    width: 80px;
    height: 80px;
    font-size: 44px;
  }
}
</style>
