# Engine Control Requirement - Start/Stop Engine

## Feature Added
Engine must be turned OFF before "Take Quiz" button appears after docking.

## New Workflow

### Mission Start
1. Student starts mission
2. Engine is OFF by default
3. **Must press 'P' to START engine** before boat can move
4. Complete mission objectives

### Return to Port
1. Navigate back to port
2. **Press 'P' to STOP engine**
3. Drop anchor (press 'X')
4. **"Take Quiz" button appears** ✅

### If Engine Still Running
- Drop anchor (press 'X')
- **Warning message appears**: "Engine Still Running - Please press 'P' to stop the engine before taking the quiz"
- Press 'P' to stop engine
- **"Take Quiz" button appears** ✅

## Changes Made

### 1. Engine Toggle Function
**File**: `src/App.vue` (line ~9523)

**Before** (Start only):
```javascript
function startEngine() {
  if (engineRunning.value || engineStarting.value) return;
  // Only starts engine, cannot stop
}
```

**After** (Toggle start/stop):
```javascript
function startEngine() {
  // If engine is running, stop it
  if (engineRunning.value) {
    engineRunning.value = false;
    engineStarting.value = false;
    showTrainingNotification('Engine stopped', 'Engine has been turned off.', { variant: 'info', durationMs: 2000 });
    return;
  }
  
  // If already starting, ignore
  if (engineStarting.value) return;
  
  // Start the engine
  engineStarting.value = true;
  // ... start sequence
}
```

### 2. Take Quiz Button Visibility
**File**: `src/App.vue` (line ~2768)

**Before**:
```vue
<div v-if="anchor.deployed && activeTrainingModule && !showPostDockingQuiz">
```

**After** (Added engine check):
```vue
<div v-if="anchor.deployed && activeTrainingModule && !showPostDockingQuiz && !engineRunning">
```

**New Condition**: `!engineRunning` - Engine must be OFF

### 3. Warning Message When Engine Running
**File**: `src/App.vue` (line ~2784)

**New Section**:
```vue
<!-- Engine Still Running Warning - CENTER OVERLAY -->
<transition name="fade">
  <div v-if="anchor.deployed && activeTrainingModule && !showPostDockingQuiz && engineRunning" class="report-mission-overlay">
    <div class="report-mission-card" style="background: linear-gradient(135deg, rgba(239, 68, 68, 0.15), rgba(220, 38, 38, 0.15)); border-color: rgba(239, 68, 68, 0.6);">
      <div class="report-icon">⚠️</div>
      <h2 style="color: #ef4444;">Engine Still Running</h2>
      <p style="color: #fca5a5;">Please press 'P' to stop the engine before taking the quiz.</p>
    </div>
  </div>
</transition>
```

### 4. Button Tooltip Update
**File**: `src/App.vue` (line ~2682)

**Before**:
```vue
:title="engineRunning ? 'Engine running' : (engineStarting ? 'Starting engine' : 'Start engine')"
```

**After**:
```vue
:title="engineRunning ? 'Press P to stop engine' : (engineStarting ? 'Starting engine' : 'Press P to start engine')"
```

## User Flow

### Scenario 1: Proper Procedure ✅
```
Mission Start → Press P (start engine) → Complete mission → 
Return to port → Press P (stop engine) → Press X (drop anchor) → 
"Take Quiz" button appears
```

### Scenario 2: Forgot to Stop Engine ⚠️
```
Mission Start → Press P (start engine) → Complete mission → 
Return to port → Press X (drop anchor) → 
Warning: "Engine Still Running" → Press P (stop engine) → 
"Take Quiz" button appears
```

## Visual Feedback

### Engine Button States
- **Engine OFF**: Gray icon, tooltip: "Press P to start engine"
- **Starting**: Yellow/orange icon, tooltip: "Starting engine"
- **Engine ON**: Green icon, tooltip: "Press P to stop engine"

### Modal Messages
1. **Engine Starting**: Blue notification, "Starting engine…"
2. **Engine Started**: Green notification, "Engine is running. You can now drive the boat."
3. **Engine Stopped**: Blue notification, "Engine has been turned off."

### Anchor + Engine Warnings
- **Anchor deployed + Engine OFF**: "Take Quiz" button (blue)
- **Anchor deployed + Engine ON**: Warning message (red), "Engine Still Running"

## Benefits

✅ **Realistic Simulation**: Mimics real boat operation procedures  
✅ **Safety Training**: Teaches proper sequence (stop engine → anchor → disembark)  
✅ **Clear Instructions**: Warning message guides students  
✅ **Prevents Mistakes**: Cannot take quiz with engine running  
✅ **Better Workflow**: Enforces correct docking procedure  

## Keyboard Controls

| Key | Action |
|-----|--------|
| **P** | Toggle engine (Start/Stop) |
| **X** | Deploy/Raise anchor |

## Testing Checklist

- [x] Press P to start engine at mission start
- [x] Boat cannot move without engine running
- [x] Complete mission and return to port
- [x] Drop anchor with engine running → Warning appears
- [x] Press P to stop engine → "Take Quiz" button appears
- [x] Press P again → Engine starts (button becomes "Stop")
- [x] Tooltips update correctly based on engine state

---
**Date**: 2026-10-01  
**Feature**: Engine control requirement for quiz access  
**Reason**: Add realistic boat operation procedure  
**Status**: ✅ COMPLETE
