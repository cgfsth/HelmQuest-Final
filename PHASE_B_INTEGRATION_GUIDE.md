# Phase B: Dynamic Buoy UI Integration Guide

## ✅ Component Created: MissionPanel.vue

Located: `src/components/MissionPanel.vue`

This is a clean, professional maritime-themed mission panel that:
- ✅ Shows dynamic buoy progress
- ✅ Displays current objective with distance/bearing
- ✅ Shows interaction requirements
- ✅ Has dynamic checklist (supports ANY number of buoys)
- ✅ Professional maritime color scheme
- ✅ Collapsible to save screen space

---

## 🎯 How to Integrate into App.vue

### Step 1: Import the Component

Add to imports section (~line 3724):

```javascript
import MissionPanel from './components/MissionPanel.vue'
```

### Step 2: Register the Component

In the `<script setup>` section, add it after other imports if using Options API, or it's already available if using `<script setup>`.

### Step 3: Add Computed Properties for Panel Data

Add these computed properties in App.vue:

```javascript
// Mission panel data
const missionPanelData = computed(() => {
  if (!activeTrainingModule.value) return null
  
  const module = activeTrainingModule.value
  const buoys = module.buoys || []
  const currentStep = currentTrainingStep.value
  
  // Count completed buoys
  const completedBuoys = trainingRunMetrics.value?.waypointsReached || 0
  const totalBuoys = buoys.length
  
  // Get current objective
  const step = module.steps[currentStep]
  const currentObjective = step ? {
    name: step.instruction || 'Navigate to waypoint',
    distance: currentWaypointHint.value?.distanceKm 
      ? `${currentWaypointHint.value.distanceKm} km` 
      : null,
    bearing: currentWaypointHint.value?.bearingDeg 
      ? `${currentWaypointHint.value.bearingDeg}°` 
      : null,
    action: step.requireInteraction || null,
    actionLabel: getActionLabel(step.requireInteraction),
    canInteract: !!currentInteractionPrompt.value
  } : null
  
  // Generate dynamic checklist
  const checklistItems = generateChecklist(module, currentStep, completedBuoys)
  
  return {
    missionNumber: getMissionNumber(module.id),
    missionTitle: module.title,
    buoysCompleted: completedBuoys,
    totalBuoys: totalBuoys,
    currentObjective,
    checklistItems
  }
})

// Helper: Get mission number from ID
function getMissionNumber(missionId) {
  // Extract number from ID like "m1-mission1" -> "01"
  const match = missionId.match(/mission(\d+)/)
  return match ? String(match[1]).padStart(2, '0') : '01'
}

// Helper: Get action label
function getActionLabel(actionType) {
  const labels = {
    photograph: 'Photograph',
    verify_id: 'Verify ID',
    remove_debris: 'Clear Debris',
    inspect: 'Inspect'
  }
  return labels[actionType] || 'Interact'
}

// Helper: Generate dynamic checklist
function generateChecklist(module, currentStep, completedBuoys) {
  const items = []
  const buoys = module.buoys || []
  const steps = module.steps || []
  
  // Add all buoy steps dynamically
  buoys.forEach((buoy, index) => {
    const buoyStep = steps.find(s => s.waypointZone === buoy.waypointZone)
    if (!buoyStep) return
    
    const stepIndex = steps.indexOf(buoyStep)
    const status = stepIndex < currentStep ? 'complete' 
      : stepIndex === currentStep ? 'active' 
      : 'pending'
    
    items.push({
      type: 'buoy',
      label: buoy.name || `Buoy ${index + 1}`,
      status
    })
  })
  
  // Add fixed final steps
  const allBuoysDone = completedBuoys >= buoys.length
  
  items.push({
    type: 'port',
    label: 'Return to Port',
    status: allBuoysDone && !trainingRunFinished.value ? 'active' 
      : allBuoysDone ? 'complete' 
      : 'pending'
  })
  
  items.push({
    type: 'engine',
    label: 'Stop Engine',
    status: !engineRunning.value && anchor.value.deployed ? 'complete'
      : allBuoysDone ? 'active'
      : 'pending'
  })
  
  items.push({
    type: 'anchor',
    label: 'Drop Anchor',
    status: anchor.value.deployed ? 'complete'
      : !engineRunning.value && allBuoysDone ? 'active'
      : 'pending'
  })
  
  return items
}
```

### Step 4: Add Component to Template

Replace the current mission panel (around line 2540-2570) with:

```vue
<MissionPanel
  v-if="activeScreen === 'simulation' && activeTrainingModule && missionPanelData"
  :mission-number="missionPanelData.missionNumber"
  :mission-title="missionPanelData.missionTitle"
  :buoys-completed="missionPanelData.buoysCompleted"
  :total-buoys="missionPanelData.totalBuoys"
  :current-objective="missionPanelData.currentObjective"
  :checklist-items="missionPanelData.checklistItems"
  @interact="handleInteractionClick"
/>
```

### Step 5: Add Interaction Handler

```javascript
function handleInteractionClick() {
  // Trigger the same logic as pressing Q
  const step = activeTrainingModule.value?.steps[currentTrainingStep.value]
  if (!step?.requireInteraction) return
  
  // Call existing interaction handler
  handleQuickInteract()
}
```

---

## 🎨 Visual Result

The new panel will show:

```
┌─────────────────────────────────┐
│ MISSION 01                      │
│ Coastal Navigation Exercise     │
├─────────────────────────────────┤
│ PROGRESS                        │
│ 3 / 5 BUOYS                     │
│ [████████░░░] 60%               │
├─────────────────────────────────┤
│ CURRENT OBJECTIVE               │
│                                 │
│ Buoy 4                          │
│ Distance: 2.4 km                │
│ Bearing: 264°                   │
│                                 │
│ Required Action:                │
│ 📸 Photograph                   │
│                                 │
│ [PHOTOGRAPH]                    │
├─────────────────────────────────┤
│ MISSION CHECKLIST               │
│ ✓ Buoy 1                        │
│ ✓ Buoy 2                        │
│ ✓ Buoy 3                        │
│ → Buoy 4                        │
│ ○ Buoy 5                        │
│ ○ Return to Port                │
│ ○ Stop Engine                   │
│ ○ Drop Anchor                   │
└─────────────────────────────────┘
```

---

## 🧪 Testing the New Panel

### Test Case 1: Mission with 3 Buoys
1. Start mission with 3 buoys
2. Panel should show "0 / 3 BUOYS"
3. Checklist should have 3 buoy items + 3 final steps
4. Complete first buoy
5. Panel should update to "1 / 3 BUOYS" (33%)
6. First buoy should show ✓
7. Second buoy should show →

### Test Case 2: Mission with 7 Buoys
1. Start mission with 7 buoys
2. Panel should show "0 / 7 BUOYS"
3. Checklist should have 7 buoy items
4. All 7 should be dynamically generated from mission data

### Test Case 3: Current Objective Display
1. Navigate toward buoy
2. Distance and bearing should update in real-time
3. When in buoy zone, "PHOTOGRAPH" button should appear
4. Click button, buoy completes
5. Panel automatically shows next buoy

---

## 🎯 Key Features

### 1. Dynamic Buoy Support ✅
- Checklist auto-generates from `mission.buoys` array
- Works with 1, 2, 5, 10, or ANY number of buoys
- No hardcoding anywhere

### 2. Real-time Progress ✅
- Progress bar animates smoothly
- Percentage calculated from completed/total
- Updates immediately when buoy completed

### 3. Clear Current Objective ✅
- Shows current buoy name
- Displays distance and bearing (live updates)
- Shows required interaction type
- Interaction button appears when in zone

### 4. Professional Design ✅
- Maritime color scheme (navy, cyan, gold)
- Glass-morphism effect
- Smooth animations
- Clean typography
- Collapsible to save space

### 5. Status Indicators ✅
- ✓ = Complete (green)
- → = Active (cyan, pulsing)
- ○ = Pending (gray)

---

## 📊 Data Flow

```
FIRESTORE MISSION
↓
activeTrainingModule.value
↓
missionPanelData computed property
├── Extract buoys array
├── Count completed (waypointsReached)
├── Get current step info
├── Generate dynamic checklist
└── Calculate progress %
↓
MissionPanel component
↓
Rendered UI
```

---

## 🔧 Customization Options

### Colors
Edit in MissionPanel.vue `<style>`:
- Primary: `#0A2540` (Dark Navy)
- Accent: `#06B6D4` (Cyan)
- Success: `#10B981` (Green)
- Warning: `#F59E0B` (Gold)

### Sizing
- Default width: `380px`
- Adjust in `.mission-panel` class
- Responsive to screen height

### Position
- Default: Fixed right side
- Can be moved to left by changing `right: 0` to `left: 0`

---

## ✅ Phase B Complete Checklist

- [x] MissionPanel.vue component created
- [x] Dynamic buoy support implemented
- [x] Progress calculation added
- [x] Checklist generation function created
- [x] Professional maritime design applied
- [x] Integration guide written
- [ ] Component imported to App.vue (Next: Do this)
- [ ] Computed properties added (Next: Do this)
- [ ] Template updated (Next: Do this)
- [ ] Testing completed (Next: Do this)

---

## 🚀 Next Steps

1. **Integrate into App.vue**
   - Add imports
   - Add computed properties
   - Replace old panel with new component
   - Test with different buoy counts

2. **Verify Dynamic Behavior**
   - Test with 1 buoy mission
   - Test with 5 buoy mission
   - Test with 10 buoy mission
   - Confirm checklist generates correctly

3. **Move to Phase C**
   - Once Panel is working, add Mission Briefing screen
   - Then engine status improvements
   - Then completion screens

---

## 📝 Notes

- Old mission panel code can be removed after testing
- Keep radar and compass in their current positions
- New panel doesn't cover ocean view
- Panel is collapsible for minimal screen space
- All logic reuses existing state variables
- No backend changes needed

