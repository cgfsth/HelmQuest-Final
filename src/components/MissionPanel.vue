<template>
  <div class="mission-panel" :class="{ collapsed: isCollapsed }">
    <button class="mission-panel-toggle" @click="isCollapsed = !isCollapsed">
      <span class="toggle-icon">{{ isCollapsed ? '◀' : '▶' }}</span>
    </button>
    
    <div v-if="!isCollapsed" class="mission-panel-content">
      <!-- Mission Header -->
      <div class="mission-header">
        <div class="mission-number">MISSION {{ missionNumber }}</div>
        <h3 class="mission-title">{{ missionTitle }}</h3>
      </div>

      <!-- Buoy Progress -->
      <div class="progress-section">
        <div class="progress-header">
          <span class="progress-label">PROGRESS</span>
          <span class="progress-count">{{ buoysCompleted }} / {{ totalBuoys }} BUOYS</span>
        </div>
        <div class="progress-bar-container">
          <div class="progress-bar" :style="{ width: progressPercentage + '%' }"></div>
        </div>
        <div class="progress-percentage">{{ progressPercentage }}%</div>
      </div>

      <!-- Current Objective -->
      <div v-if="currentObjective" class="current-objective-section">
        <div class="section-header">CURRENT OBJECTIVE</div>
        <div class="objective-card">
          <div class="objective-name">{{ currentObjective.name }}</div>
          
          <div v-if="currentObjective.distance" class="objective-stats">
            <div class="objective-stat">
              <span class="stat-label">Distance</span>
              <span class="stat-value">{{ currentObjective.distance }}</span>
            </div>
            <div class="objective-stat">
              <span class="stat-label">Bearing</span>
              <span class="stat-value">{{ currentObjective.bearing }}</span>
            </div>
          </div>

          <div v-if="currentObjective.action" class="objective-action">
            <span class="action-label">Required Action:</span>
            <span class="action-type">{{ getActionIcon(currentObjective.action) }} {{ currentObjective.actionLabel }}</span>
          </div>

          <button 
            v-if="currentObjective.canInteract" 
            class="interact-btn"
            @click="$emit('interact')"
          >
            {{ getActionButtonText(currentObjective.action) }}
          </button>
        </div>
      </div>

      <!-- Mission Checklist -->
      <div class="checklist-section">
        <div class="section-header">MISSION CHECKLIST</div>
        <div class="checklist-items">
          <div 
            v-for="(item, index) in checklistItems" 
            :key="index"
            class="checklist-item"
            :class="{
              'item-complete': item.status === 'complete',
              'item-active': item.status === 'active',
              'item-pending': item.status === 'pending'
            }"
          >
            <span class="item-icon">{{ getChecklistIcon(item.status) }}</span>
            <span class="item-label">{{ item.label }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'

const props = defineProps({
  missionNumber: {
    type: [String, Number],
    default: '01'
  },
  missionTitle: {
    type: String,
    required: true
  },
  buoysCompleted: {
    type: Number,
    default: 0
  },
  totalBuoys: {
    type: Number,
    required: true
  },
  currentObjective: {
    type: Object,
    default: null
    // Shape: { name, distance, bearing, action, actionLabel, canInteract }
  },
  checklistItems: {
    type: Array,
    required: true
    // Shape: [{ label, status: 'complete'|'active'|'pending', type }]
  }
})

defineEmits(['interact'])

const isCollapsed = ref(false)

const progressPercentage = computed(() => {
  if (props.totalBuoys === 0) return 0
  return Math.round((props.buoysCompleted / props.totalBuoys) * 100)
})

function getChecklistIcon(status) {
  switch (status) {
    case 'complete': return '✓'
    case 'active': return '→'
    case 'pending': return '○'
    default: return '○'
  }
}

function getActionIcon(action) {
  switch (action) {
    case 'photograph': return '📸'
    case 'verify_id': return '🔍'
    case 'remove_debris': return '🧹'
    case 'inspect': return '👁️'
    default: return '📝'
  }
}

function getActionButtonText(action) {
  switch (action) {
    case 'photograph': return 'PHOTOGRAPH'
    case 'verify_id': return 'VERIFY ID'
    case 'remove_debris': return 'CLEAR DEBRIS'
    case 'inspect': return 'INSPECT'
    default: return 'INTERACT'
  }
}
</script>

<style scoped>
.mission-panel {
  position: fixed;
  top: 80px;
  right: 0;
  width: 380px;
  max-height: calc(100vh - 100px);
  background: linear-gradient(135deg, rgba(10, 37, 64, 0.95), rgba(14, 44, 76, 0.95));
  backdrop-filter: blur(10px);
  border-left: 2px solid rgba(6, 182, 212, 0.3);
  border-top: 2px solid rgba(6, 182, 212, 0.3);
  border-bottom: 2px solid rgba(6, 182, 212, 0.3);
  border-top-left-radius: 12px;
  border-bottom-left-radius: 12px;
  box-shadow: -4px 0 20px rgba(0, 0, 0, 0.5);
  transition: transform 0.3s ease;
  z-index: 100;
  overflow-y: auto;
}

.mission-panel.collapsed {
  transform: translateX(calc(100% - 40px));
}

.mission-panel-toggle {
  position: absolute;
  left: 0;
  top: 50%;
  transform: translateX(-100%) translateY(-50%);
  width: 40px;
  height: 80px;
  background: linear-gradient(135deg, rgba(10, 37, 64, 0.95), rgba(14, 44, 76, 0.95));
  border: 2px solid rgba(6, 182, 212, 0.3);
  border-right: none;
  border-radius: 12px 0 0 12px;
  color: #06B6D4;
  font-size: 20px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.mission-panel-toggle:hover {
  background: linear-gradient(135deg, rgba(6, 182, 212, 0.2), rgba(8, 145, 178, 0.2));
  border-color: rgba(6, 182, 212, 0.6);
}

.mission-panel-content {
  padding: 24px;
}

/* Mission Header */
.mission-header {
  margin-bottom: 24px;
  border-bottom: 1px solid rgba(6, 182, 212, 0.2);
  padding-bottom: 16px;
}

.mission-number {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 1.5px;
  color: #F59E0B;
  margin-bottom: 4px;
}

.mission-title {
  font-size: 20px;
  font-weight: 700;
  color: #F0F9FF;
  margin: 0;
  line-height: 1.3;
}

/* Progress Section */
.progress-section {
  margin-bottom: 24px;
  padding: 16px;
  background: rgba(6, 182, 212, 0.05);
  border-radius: 8px;
  border: 1px solid rgba(6, 182, 212, 0.2);
}

.progress-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.progress-label {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 1.2px;
  color: #06B6D4;
}

.progress-count {
  font-size: 14px;
  font-weight: 700;
  color: #F0F9FF;
}

.progress-bar-container {
  height: 8px;
  background: rgba(6, 182, 212, 0.1);
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 8px;
}

.progress-bar {
  height: 100%;
  background: linear-gradient(90deg, #06B6D4, #0891B2);
  border-radius: 4px;
  transition: width 0.5s ease;
  box-shadow: 0 0 10px rgba(6, 182, 212, 0.5);
}

.progress-percentage {
  text-align: right;
  font-size: 18px;
  font-weight: 700;
  color: #06B6D4;
}

/* Section Headers */
.section-header {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 1.2px;
  color: #06B6D4;
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid rgba(6, 182, 212, 0.2);
}

/* Current Objective */
.current-objective-section {
  margin-bottom: 24px;
}

.objective-card {
  background: rgba(6, 182, 212, 0.05);
  border: 1px solid rgba(6, 182, 212, 0.3);
  border-radius: 8px;
  padding: 16px;
}

.objective-name {
  font-size: 18px;
  font-weight: 700;
  color: #F0F9FF;
  margin-bottom: 12px;
}

.objective-stats {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin-bottom: 12px;
}

.objective-stat {
  display: flex;
  flex-direction: column;
}

.stat-label {
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 1px;
  color: #94A3B8;
  margin-bottom: 4px;
}

.stat-value {
  font-size: 16px;
  font-weight: 700;
  color: #F0F9FF;
}

.objective-action {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 12px;
  background: rgba(245, 158, 11, 0.1);
  border: 1px solid rgba(245, 158, 11, 0.3);
  border-radius: 6px;
  margin-bottom: 12px;
}

.action-label {
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 1px;
  color: #F59E0B;
}

.action-type {
  font-size: 14px;
  font-weight: 700;
  color: #FFF;
}

.interact-btn {
  width: 100%;
  padding: 12px;
  background: linear-gradient(135deg, #F59E0B, #D97706);
  border: none;
  border-radius: 6px;
  color: #FFF;
  font-size: 14px;
  font-weight: 700;
  letter-spacing: 0.5px;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 4px 12px rgba(245, 158, 11, 0.3);
}

.interact-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(245, 158, 11, 0.5);
}

.interact-btn:active {
  transform: translateY(0);
}

/* Checklist */
.checklist-section {
  margin-top: 24px;
}

.checklist-items {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.checklist-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  border-radius: 6px;
  transition: all 0.2s ease;
}

.checklist-item.item-complete {
  background: rgba(16, 185, 129, 0.1);
  border-left: 3px solid #10B981;
}

.checklist-item.item-active {
  background: rgba(6, 182, 212, 0.15);
  border-left: 3px solid #06B6D4;
  animation: pulse 2s ease-in-out infinite;
}

.checklist-item.item-pending {
  background: rgba(148, 163, 184, 0.05);
  border-left: 3px solid rgba(148, 163, 184, 0.3);
}

.item-icon {
  font-size: 16px;
  min-width: 20px;
  text-align: center;
}

.item-complete .item-icon {
  color: #10B981;
}

.item-active .item-icon {
  color: #06B6D4;
}

.item-pending .item-icon {
  color: #64748B;
}

.item-label {
  font-size: 14px;
  font-weight: 500;
  flex: 1;
}

.item-complete .item-label {
  color: #10B981;
}

.item-active .item-label {
  color: #F0F9FF;
  font-weight: 600;
}

.item-pending .item-label {
  color: #94A3B8;
}

@keyframes pulse {
  0%, 100% {
    background: rgba(6, 182, 212, 0.15);
  }
  50% {
    background: rgba(6, 182, 212, 0.25);
  }
}

/* Scrollbar */
.mission-panel::-webkit-scrollbar {
  width: 6px;
}

.mission-panel::-webkit-scrollbar-track {
  background: rgba(6, 182, 212, 0.05);
}

.mission-panel::-webkit-scrollbar-thumb {
  background: rgba(6, 182, 212, 0.3);
  border-radius: 3px;
}

.mission-panel::-webkit-scrollbar-thumb:hover {
  background: rgba(6, 182, 212, 0.5);
}
</style>
