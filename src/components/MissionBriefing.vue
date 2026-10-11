<template>
  <div class="mission-briefing-overlay">
    <div class="mission-briefing-card">
      <!-- Header -->
      <div class="briefing-header">
        <div class="header-decoration">
          <div class="decoration-line"></div>
          <span class="header-icon">⚓</span>
          <div class="decoration-line"></div>
        </div>
        <h1 class="briefing-super-title">MARITIME TRAINING MISSION</h1>
        <h2 class="briefing-title">{{ mission.title }}</h2>
      </div>

      <!-- Mission Info -->
      <div class="briefing-info-grid">
        <div class="info-item">
          <span class="info-icon">⭐</span>
          <div class="info-content">
            <span class="info-label">Difficulty</span>
            <span class="info-value">{{ getDifficultyStars(mission.difficulty) }} {{ mission.difficulty || 'Standard' }}</span>
          </div>
        </div>

        <div class="info-item">
          <span class="info-icon">⏱️</span>
          <div class="info-content">
            <span class="info-label">Duration</span>
            <span class="info-value">{{ mission.duration || '~15 minutes' }}</span>
          </div>
        </div>

        <div class="info-item">
          <span class="info-icon">🚢</span>
          <div class="info-content">
            <span class="info-label">Required Boat</span>
            <span class="info-value">{{ getBoatTypeName(mission.boatType) }}</span>
          </div>
        </div>

        <div class="info-item">
          <span class="info-icon">🎯</span>
          <div class="info-content">
            <span class="info-label">Buoy Checkpoints</span>
            <span class="info-value">{{ buoyCount }} Location{{ buoyCount !== 1 ? 's' : '' }}</span>
          </div>
        </div>
      </div>

      <!-- Mission Description -->
      <div v-if="mission.description" class="briefing-description">
        <h3 class="description-title">MISSION OVERVIEW</h3>
        <p class="description-text">{{ mission.description }}</p>
      </div>

      <!-- Objectives List -->
      <div class="briefing-objectives">
        <h3 class="objectives-title">MISSION OBJECTIVES</h3>
        <ul class="objectives-list">
          <li class="objective-item">
            <span class="objective-bullet">►</span>
            <span class="objective-text">Navigate to all {{ buoyCount }} assigned buoy checkpoint{{ buoyCount !== 1 ? 's' : '' }}</span>
          </li>
          <li class="objective-item">
            <span class="objective-bullet">►</span>
            <span class="objective-text">Complete required interactions at each buoy</span>
          </li>
          <li class="objective-item">
            <span class="objective-bullet">►</span>
            <span class="objective-text">Return to port safely</span>
          </li>
          <li class="objective-item">
            <span class="objective-bullet">►</span>
            <span class="objective-text">Secure vessel properly (stop engine, drop anchor)</span>
          </li>
          <li class="objective-item">
            <span class="objective-bullet">►</span>
            <span class="objective-text">Complete the assessment</span>
          </li>
        </ul>
      </div>

      <!-- Action Buttons -->
      <div class="briefing-actions">
        <button class="btn-start" @click="$emit('start')">
          <span class="btn-icon">▶</span>
          <span class="btn-text">START MISSION</span>
        </button>
        <button class="btn-cancel" @click="$emit('cancel')">
          Cancel
        </button>
      </div>

      <!-- Footer Note -->
      <div class="briefing-footer">
        <p class="footer-note">
          Press <kbd>?</kbd> at any time during the mission to view controls guide.
        </p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  mission: {
    type: Object,
    required: true
    // Shape: { title, difficulty, duration, boatType, description, buoys: [] }
  }
})

defineEmits(['start', 'cancel'])

const buoyCount = computed(() => {
  return props.mission.buoys?.length || 0
})

function getDifficultyStars(difficulty) {
  const levels = {
    'beginner': '⭐',
    'easy': '⭐',
    'intermediate': '⭐⭐',
    'advanced': '⭐⭐⭐',
    'expert': '⭐⭐⭐⭐'
  }
  return levels[difficulty?.toLowerCase()] || '⭐⭐'
}

function getBoatTypeName(boatType) {
  const types = {
    'small': 'Small Vessel',
    'medium': 'Medium Vessel',
    'large': 'Large Vessel',
    'patrol': 'Patrol Boat',
    'fishing': 'Fishing Boat'
  }
  return types[boatType?.toLowerCase()] || 'Medium Vessel'
}
</script>

<style scoped>
.mission-briefing-overlay {
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
  animation: fadeIn 0.3s ease;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

.mission-briefing-card {
  max-width: 700px;
  width: 90%;
  max-height: 90vh;
  overflow-y: auto;
  background: linear-gradient(135deg, rgba(10, 37, 64, 0.98), rgba(14, 44, 76, 0.98));
  border: 2px solid rgba(6, 182, 212, 0.4);
  border-radius: 16px;
  padding: 40px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.8);
  animation: slideUp 0.4s ease;
}

@keyframes slideUp {
  from {
    transform: translateY(40px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

/* Header */
.briefing-header {
  text-align: center;
  margin-bottom: 32px;
  padding-bottom: 24px;
  border-bottom: 2px solid rgba(6, 182, 212, 0.2);
}

.header-decoration {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  margin-bottom: 16px;
}

.decoration-line {
  width: 80px;
  height: 2px;
  background: linear-gradient(90deg, transparent, #06B6D4, transparent);
}

.header-icon {
  font-size: 32px;
  filter: drop-shadow(0 0 10px rgba(6, 182, 212, 0.6));
}

.briefing-super-title {
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 3px;
  color: #F59E0B;
  margin: 0 0 12px 0;
}

.briefing-title {
  font-size: 32px;
  font-weight: 700;
  color: #F0F9FF;
  margin: 0;
  line-height: 1.2;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.5);
}

/* Info Grid */
.briefing-info-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 16px;
  margin-bottom: 32px;
}

.info-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  background: rgba(6, 182, 212, 0.05);
  border: 1px solid rgba(6, 182, 212, 0.2);
  border-radius: 8px;
  transition: all 0.2s ease;
}

.info-item:hover {
  background: rgba(6, 182, 212, 0.1);
  border-color: rgba(6, 182, 212, 0.4);
}

.info-icon {
  font-size: 24px;
  filter: drop-shadow(0 0 8px rgba(6, 182, 212, 0.4));
}

.info-content {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.info-label {
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 1px;
  color: #94A3B8;
  text-transform: uppercase;
}

.info-value {
  font-size: 14px;
  font-weight: 700;
  color: #F0F9FF;
}

/* Description */
.briefing-description {
  margin-bottom: 32px;
  padding: 20px;
  background: rgba(6, 182, 212, 0.05);
  border-left: 4px solid #06B6D4;
  border-radius: 8px;
}

.description-title {
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 2px;
  color: #06B6D4;
  margin: 0 0 12px 0;
}

.description-text {
  font-size: 14px;
  line-height: 1.6;
  color: #CBD5E1;
  margin: 0;
}

/* Objectives */
.briefing-objectives {
  margin-bottom: 32px;
}

.objectives-title {
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 2px;
  color: #06B6D4;
  margin: 0 0 16px 0;
  padding-bottom: 12px;
  border-bottom: 1px solid rgba(6, 182, 212, 0.2);
}

.objectives-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.objective-item {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 12px 16px;
  background: rgba(6, 182, 212, 0.03);
  border-radius: 6px;
  border-left: 3px solid rgba(6, 182, 212, 0.3);
  transition: all 0.2s ease;
}

.objective-item:hover {
  background: rgba(6, 182, 212, 0.08);
  border-left-color: #06B6D4;
}

.objective-bullet {
  color: #06B6D4;
  font-size: 12px;
  margin-top: 2px;
}

.objective-text {
  flex: 1;
  font-size: 14px;
  line-height: 1.5;
  color: #E2E8F0;
}

/* Actions */
.briefing-actions {
  display: flex;
  gap: 16px;
  margin-bottom: 24px;
}

.btn-start {
  flex: 1;
  padding: 18px 32px;
  background: linear-gradient(135deg, #06B6D4, #0891B2);
  border: none;
  border-radius: 10px;
  color: #FFF;
  font-size: 16px;
  font-weight: 700;
  letter-spacing: 1px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  transition: all 0.3s ease;
  box-shadow: 0 4px 16px rgba(6, 182, 212, 0.4);
}

.btn-start:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(6, 182, 212, 0.6);
  background: linear-gradient(135deg, #0891B2, #06B6D4);
}

.btn-start:active {
  transform: translateY(0);
}

.btn-icon {
  font-size: 18px;
}

.btn-text {
  font-size: 16px;
}

.btn-cancel {
  padding: 18px 32px;
  background: rgba(148, 163, 184, 0.1);
  border: 2px solid rgba(148, 163, 184, 0.3);
  border-radius: 10px;
  color: #94A3B8;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-cancel:hover {
  background: rgba(148, 163, 184, 0.2);
  border-color: rgba(148, 163, 184, 0.5);
  color: #CBD5E1;
}

/* Footer */
.briefing-footer {
  text-align: center;
  padding-top: 20px;
  border-top: 1px solid rgba(6, 182, 212, 0.1);
}

.footer-note {
  font-size: 12px;
  color: #64748B;
  margin: 0;
}

.footer-note kbd {
  display: inline-block;
  padding: 2px 6px;
  background: rgba(6, 182, 212, 0.1);
  border: 1px solid rgba(6, 182, 212, 0.3);
  border-radius: 4px;
  color: #06B6D4;
  font-family: monospace;
  font-size: 11px;
  font-weight: 700;
}

/* Scrollbar */
.mission-briefing-card::-webkit-scrollbar {
  width: 8px;
}

.mission-briefing-card::-webkit-scrollbar-track {
  background: rgba(6, 182, 212, 0.05);
  border-radius: 4px;
}

.mission-briefing-card::-webkit-scrollbar-thumb {
  background: rgba(6, 182, 212, 0.3);
  border-radius: 4px;
}

.mission-briefing-card::-webkit-scrollbar-thumb:hover {
  background: rgba(6, 182, 212, 0.5);
}

/* Responsive */
@media (max-width: 768px) {
  .mission-briefing-card {
    padding: 24px;
  }

  .briefing-title {
    font-size: 24px;
  }

  .briefing-info-grid {
    grid-template-columns: 1fr;
  }

  .briefing-actions {
    flex-direction: column;
  }

  .btn-cancel {
    order: 2;
  }
}
</style>
