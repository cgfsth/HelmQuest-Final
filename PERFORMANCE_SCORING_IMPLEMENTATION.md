# Mission Performance Scoring System - 5-Metric Implementation

## Overview
This document describes the redesigned Mission Performance Scoring System with 5 comprehensive metrics that accurately reflect student performance during simulation missions.

**CRITICAL:** This implementation does NOT modify any quiz-related functionality.

## System Architecture

### Current State Analysis
The project already has:
- ✅ `performanceTracking.js` - Core performance tracking classes
- ✅ `performanceManager.js` - Integrated manager coordinating all subsystems  
- ✅ `missionScoring.js` - Score calculation and telemetry
- ✅ Existing steering, course, docking, time, and collision tracking components

### Required Changes
Transform from 3-metric system to 5-metric system:

**OLD (3 metrics)**:
1. Steering Precision (30%)
2. Procedural Correctness (40%)  
3. Course Accuracy (30%)

**NEW (5 metrics)**:
1. Steering Precision (20%)
2. Course Accuracy (25%)
3. **Docking Accuracy** (20%) - NEW
4. **Time Efficiency** (15%) - NEW
5. **Safety Compliance** (20%) - NEW (replaces Procedural Correctness)

## Metric Specifications

### 1. STEERING PRECISION (20%)

**Purpose**: Evaluate vessel control quality and heading stability

**Measures**:
- Heading stability over time
- Excessive heading changes
- Sharp turns (>30° in <2 seconds)
- Large heading oscillations
- Smooth vs erratic steering

**Data Sources**:
- `SteeringPerformanceTracker` in `performanceTracking.js`
- Real-time heading data from boat telemetry
- Steering input frequency and magnitude

**Scoring Logic**:
```
Base Score = 100
Deduct for:
- Average heading oscillation
- Sharp turn count  
- Excessive steering changes
- Heading instability

Final Score = clamp(Base - Penalties, 0, 100)
```

**Implementation Status**: ✅ Already implemented in `SteeringPerformanceTracker`

---

### 2. COURSE ACCURACY (25%)

**Purpose**: Measure route adherence to intended navigation path

**Measures**:
- Cross-Track Error (XTE) from intended route (PRIMARY - 80% weight)
- Bearing/heading alignment to target (SECONDARY - 20% weight)
- Step-aware route tracking (changes target per training step)

**Data Sources**:
- `CoursePerformanceTracker` in `performanceTracking.js`
- Training step waypoints and targets
- Real-time boat position vs intended route

**Key Requirements**:
- Must track deviation PER TRAINING STEP
- When Step 1 completes → reset tracking for Step 2's route
- Large detours reduce score even if target eventually reached

**Scoring Logic**:
```
For each navigation step:
  - Calculate average XTE
  - Calculate bearing deviation
  
Step Score = (XTE Score × 0.80) + (Bearing Score × 0.20)

Final Course Accuracy = weighted average of all step scores
```

**Implementation Status**: ✅ Already implemented in `CoursePerformanceTracker`

---

### 3. DOCKING ACCURACY (20%) - NEW METRIC

**Purpose**: Evaluate final docking precision

**Measures**:
- **Position Accuracy** (60% weight): Distance from target docking position
- **Heading Accuracy** (40% weight): Alignment to required heading (0° North)

**Data Sources**:
- `DockingPerformanceCalculator` in `performanceTracking.js`
- Final boat position when anchor deployed
- Final boat heading
- Target docking coordinates from mission config

**Heading Requirement**:
- Required final heading: **0° (North)**
- Must handle 0°/360° wraparound correctly
- Example: 359° vs 0° = 1° error (NOT 359°)

**Scoring Logic**:
```
Position Score:
  distance = √((x - targetX)² + (z - targetZ)²)
  Score = 100 × (1 - min(distance / maxAcceptable, 1))

Heading Score:
  angleDiff = shortestAngleDifference(actual, 0°)
  Score = 100 × (1 - min(|angleDiff| / 180, 1))

Docking Accuracy = (Position × 0.60) + (Heading × 0.40)
```

**Implementation Status**: ⚠️ EXISTS but needs integration into 5-metric system

---

### 4. TIME EFFICIENCY (15%) - NEW METRIC

**Purpose**: Reward completing mission within estimated time

**Measures**:
- Actual completion time vs estimated mission duration
- Penalties for exceeding expected time
- Bounded scoring (never negative)

**Data Sources**:
- `TimeEfficiencyCalculator` in `performanceTracking.js`
- Mission `duration` field (e.g., "5-10 minutes")
- Actual mission start/end timestamps

**Scoring Logic**:
```
expectedTime = parse mission duration (average if range given)
actualTime = endTime - startTime

if actualTime <= expectedTime:
  Score = 100
else:
  overtime = actualTime - expectedTime
  overPercent = (overtime / expectedTime) × 100
  Score = max(0, 100 - overPercent)

Final Score = clamp(Score, 0, 100)
```

**Examples**:
- Expected: 5min, Actual: 5min → 100%
- Expected: 5min, Actual: 6min (20% over) → 80%
- Expected: 5min, Actual: 10min (100% over) → 0%

**Implementation Status**: ⚠️ EXISTS but needs integration into 5-metric system

---

### 5. SAFETY COMPLIANCE (20%) - NEW METRIC

**Purpose**: Track safety violations and unsafe operational behavior

**Measures**:
- Collision violations (buoy, shore, port)
- Unsafe anchoring (engine still running)
- Moving with fishing gear deployed (net or long line)
- Other operational safety violations

**CRITICAL DISTINCTION - Warnings vs Violations**:
```
Unsafe Action Detected
         ↓
   WARNING DISPLAYED
         ↓
   Student Response?
      /        \
   CORRECTS    IGNORES
     ↓            ↓
  NO PENALTY   VIOLATION
                  ↓
            SCORE DEDUCTION
```

**Example**:
- Warning: "Retrieve net before moving"
- If student stops and retrieves → No penalty
- If student continues moving → Confirmed violation → Penalty applied

**Data Sources**:
- `CollisionTracker` in `performanceTracking.js`
- Existing collision detection system
- Existing warning/violation event system
- Safety event logs

**Violation Types & Penalties**:
```javascript
const SAFETY_PENALTIES = {
  BUOY_COLLISION: 10,
  PORT_COLLISION: 15,
  SHORE_COLLISION: 15,
  UNSAFE_ANCHORING: 10,
  MOVE_WITH_NET: 10,
  MOVE_WITH_LONGLINE: 10,
  GENERAL_VIOLATION: 5
};
```

**Scoring Logic**:
```
Base Score = 100

For each confirmed violation:
  Score -= SAFETY_PENALTIES[violationType]

Final Score = max(Score, 0)
```

**Implementation Status**: ⚠️ Collision tracking EXISTS, needs safety violation integration

---

## Overall Score Calculation

### Weighted Formula
```javascript
Overall Score = 
  (Steering Precision × 0.20) +
  (Course Accuracy × 0.25) +
  (Docking Accuracy × 0.20) +
  (Time Efficiency × 0.15) +
  (Safety Compliance × 0.20)
```

### Score Bounds
- All individual metrics: **0 ≤ score ≤ 100**
- Overall Score: **0 ≤ score ≤ 100**
- Never produce NaN or Infinity

---

## UI Updates Required

### Mission Complete Modal

**Current Display** (Performance Analysis):
- Steering Precision: XX%
- Course Accuracy: XX%

**NEW Display** (Performance Analysis):
```
📊 Performance Analysis

1. Steering Precision         92%
   "3 sharp turns"

2. Course Accuracy            84%  
   "Avg deviation: 18.4m"

3. Docking Accuracy           91%
   "4.2° heading error"

4. Time Efficiency            78%
   "1m 12s over target"

5. Safety Compliance          70%
   "3 violations"

Overall Score: 83%
```

**Implementation Notes**:
- Preserve existing UI styling and layout
- Add new metric cards following existing design patterns
- Display supporting detail beneath each score
- Use existing color scheme for score ranges (green/yellow/red)

---

## Data Flow

### Mission Start
```
1. App.vue calls startMission() on performanceManager
2. Manager initializes all 5 tracking subsystems
3. Expected mission time parsed from duration string
4. Training steps/waypoints loaded for course tracking
5. Telemetry collection begins
```

### During Mission (Game Loop)
```
Every frame/interval:
1. Boat telemetry updated (position, heading, speed)
2. SteeringTracker records heading data
3. CourseTracker calculates XTE from current step's route
4. CollisionTracker monitors for collision events
5. Safety events logged as they occur
```

### Mission End
```
1. App.vue calls completeMission() on performanceManager
2. TimeCalculator finalizes time efficiency score
3. DockingCalculator evaluates final position/heading
4. All 5 metrics finalized
5. Overall score calculated with weights
6. Performance report returned to UI
7. Mission complete modal displays all 5 metrics
```

---

## Quiz Protection Strategy

### What Will NOT Be Modified
- ❌ Quiz UI components
- ❌ Quiz question/answer logic
- ❌ Quiz scoring calculations
- ❌ Quiz submission to database
- ❌ Quiz result display
- ❌ Quiz Firestore collections
- ❌ Quiz state management
- ❌ Quiz navigation flow

### Safe Modification Zones
- ✅ `missionScoring.js` - Mission performance only
- ✅ `performanceManager.js` - Mission telemetry only
- ✅ `performanceTracking.js` - Mission metrics only
- ✅ Mission complete modal UI (performance section only)

### Shared File Strategy
If modifying `App.vue`:
- Only edit mission performance display section
- Do NOT modify quiz modal sections
- Do NOT modify quiz transition logic
- Do NOT modify quiz data handling

---

## Implementation Checklist

### Phase 1: Core Metric Integration
- [ ] Update `missionScoring.js` weights to 5-metric system
- [ ] Add Docking Accuracy calculation function
- [ ] Add Time Efficiency calculation function  
- [ ] Add Safety Compliance calculation function
- [ ] Update `calculateMissionPerformance()` to return all 5 metrics

### Phase 2: Performance Manager Integration
- [ ] Ensure `DockingPerformanceCalculator` is properly called
- [ ] Ensure `TimeEfficiencyCalculator` is properly called
- [ ] Add safety violation tracking integration
- [ ] Update `completeMission()` to finalize all 5 metrics
- [ ] Update performance report structure

### Phase 3: UI Updates
- [ ] Update Mission Complete modal to show 5 metrics
- [ ] Add supporting detail text for each metric
- [ ] Preserve existing UI styling
- [ ] Test responsive layout

### Phase 4: Testing
- [ ] Test all 10 scenarios from requirements
- [ ] Verify quiz system untouched
- [ ] Verify score bounds (0-100)
- [ ] Verify telemetry reset on retry
- [ ] Verify heading wraparound handling

---

## Testing Scenarios

### TEST 1: Perfect Performance
Student follows route, no collisions, on-time, perfect docking
**Expected**: All metrics >90%, high overall score

### TEST 2: Large Detour
Student reaches target but takes huge detour
**Expected**: Course Accuracy decreases, other metrics unaffected

### TEST 3: Buoy Collision
Student collides with buoy
**Expected**: Safety Compliance decreases only

### TEST 4: Unsafe Anchoring
Student drops anchor with engine running, then corrects
**Expected**: No penalty if corrected

### TEST 5: Moving with Net
Student moves with net deployed, gets warning, stops
**Expected**: No penalty if behavior corrected

### TEST 6: Wrong Heading
Student docks at correct position but facing 90° instead of 0°
**Expected**: Position high, heading low, docking score moderate

### TEST 7: Heading Wraparound
Student docks facing 359° when required is 0°
**Expected**: 1° error, NOT 359°

### TEST 8: Overtime
Student exceeds estimated time
**Expected**: Time Efficiency decreases only

### TEST 9: Poor Navigation Only
Student has good safety but poor route following
**Expected**: Safety high, Course Accuracy low

### TEST 10: Mission Retry
Student retries mission
**Expected**: Fresh telemetry, no data carryover

---

## Configuration Constants

### Scoring Weights
```javascript
const METRIC_WEIGHTS = {
  STEERING_PRECISION: 0.20,    // 20%
  COURSE_ACCURACY: 0.25,        // 25%
  DOCKING_ACCURACY: 0.20,       // 20%
  TIME_EFFICIENCY: 0.15,        // 15%
  SAFETY_COMPLIANCE: 0.20       // 20%
};
```

### Safety Penalties
```javascript
const SAFETY_PENALTIES = {
  BUOY_COLLISION: 10,
  PORT_COLLISION: 15,
  SHORE_COLLISION: 15,
  UNSAFE_ANCHORING: 10,
  MOVE_WITH_NET: 10,
  MOVE_WITH_LONGLINE: 10,
  GENERAL_VIOLATION: 5
};
```

### Docking Tolerances
```javascript
const DOCKING_CONFIG = {
  MAX_POSITION_ERROR_METERS: 50,
  REQUIRED_HEADING_DEG: 0,  // North
  MAX_HEADING_ERROR_DEG: 180
};
```

---

## Files Modified

### Core Scoring
- `src/helpers/missionScoring.js` - Add 5-metric calculations
- `src/helpers/performanceManager.js` - Integrate all subsystems
- `src/helpers/performanceTracking.js` - Minor updates if needed

### UI
- `src/App.vue` - Update mission complete modal (performance section only)

### Documentation
- `PERFORMANCE_SCORING_IMPLEMENTATION.md` (this file)

---

## Implementation Status

- ✅ Analysis Complete
- ⏳ Implementation In Progress
- ⏳ UI Updates Pending
- ⏳ Testing Pending

---

**Last Updated**: 2026-10-01  
**Status**: Design Complete, Implementation Ready
