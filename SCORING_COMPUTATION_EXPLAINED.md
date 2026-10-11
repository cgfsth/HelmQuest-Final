# Mission Scoring Computation - Detailed Explanation

## Overview

The mission scoring system is **100% deterministic** - NO AI, NO LLM, NO random values. It uses real telemetry data from the boat simulation.

---

## Scoring Components (Weighted)

The overall score is calculated from 3 components:

1. **Steering Precision**: 30% weight
2. **Procedural Correctness**: 40% weight  
3. **Course Accuracy**: 30% weight

### Formula:
```javascript
Overall Score = (Steering Precision × 0.30) + 
                (Procedural Correctness × 0.40) + 
                (Course Accuracy × 0.30)
```

**Pass/Fail**: Score ≥ 80% = PASS

---

## 1. STEERING PRECISION (30%)

**Purpose**: Measures how well the student steers the boat

### Data Tracked:
- `headingErrors[]` - Array of heading errors in degrees
- `sharpTurns` - Number of sharp turns (>30° in <2 seconds)
- `steeringInputs` - Total steering inputs
- `steeringChanges` - Number of steering direction changes

### Computation:

```javascript
Start with: score = 100

// Step 1: Calculate average heading error
if (headingErrors.length > 0) {
  averageError = sum(all heading errors) / count(heading errors)
  errorPenalty = min(50, (averageError / 30°) × 50)
  score -= errorPenalty
}

// Step 2: Penalize sharp turns
if (sharpTurns > 0 && steeringInputs > 0) {
  sharpTurnRatio = sharpTurns / steeringInputs
  sharpTurnPenalty = min(30, sharpTurnRatio × 100)
  score -= sharpTurnPenalty
}

// Final: Clamp to 0-100
return max(0, min(100, score))
```

### Examples:

**Perfect Steering:**
- Average heading error: 0°
- Sharp turns: 0
- **Result**: 100 points ✅

**Good Steering:**
- Average heading error: 5°
- Sharp turns: 2 out of 50 inputs (4%)
- Error penalty: (5/30) × 50 = 8.3 points
- Sharp turn penalty: 0.04 × 100 = 4 points
- **Result**: 100 - 8.3 - 4 = 87.7 ≈ 88 points ✅

**Poor Steering:**
- Average heading error: 20°
- Sharp turns: 15 out of 50 inputs (30%)
- Error penalty: (20/30) × 50 = 33.3 points
- Sharp turn penalty: min(30, 0.30 × 100) = 30 points
- **Result**: 100 - 33.3 - 30 = 36.7 ≈ 37 points ❌

### Fallback (No Data):
If no steering data is tracked:
```javascript
completionRatio = stepsCompleted / totalSteps
score = completionRatio × 85
// Max 85% without tracking data
```

---

## 2. PROCEDURAL CORRECTNESS (40%)

**Purpose**: Measures adherence to mission procedures and requirements

### Data Tracked:
- `violations` - General procedural violations
- `skippedWaypoints` - Waypoints skipped
- `wrongOrder` - Waypoints visited in wrong order
- `restrictedAreaEntries` - Entered restricted/forbidden areas
- `waypointsRequired` - Total waypoints in mission
- `waypointsReached` - Waypoints successfully reached
- `totalSteps` - Total mission steps
- `stepsCompleted` - Mission steps completed

### Computation:

```javascript
// Step 1: Calculate completion ratio
requiredActions = max(1, waypointsRequired + totalSteps)
completedActions = waypointsReached + stepsCompleted
completionScore = (completedActions / requiredActions) × 100

// Step 2: Calculate total violations
totalViolations = violations + skippedWaypoints + wrongOrder + restrictedAreaEntries

// Step 3: Deduct for violations (10 points each)
violationPenalty = min(100, totalViolations × 10)

// Final score
score = completionScore - violationPenalty
return max(0, min(100, score))
```

### Examples:

**Perfect Execution:**
- Waypoints: 5/5 reached
- Steps: 8/8 completed
- Violations: 0
- completionScore = (13/13) × 100 = 100
- violationPenalty = 0
- **Result**: 100 - 0 = 100 points ✅

**Good Execution:**
- Waypoints: 5/5 reached
- Steps: 7/8 completed (1 missed)
- Violations: 1 (entered restricted area once)
- completionScore = (12/13) × 100 = 92.3
- violationPenalty = 1 × 10 = 10
- **Result**: 92.3 - 10 = 82.3 ≈ 82 points ✅

**Poor Execution:**
- Waypoints: 3/5 reached (2 skipped)
- Steps: 5/8 completed
- Violations: 2 (wrong order) + 2 (skipped waypoints) = 4 total
- completionScore = (8/13) × 100 = 61.5
- violationPenalty = 4 × 10 = 40
- **Result**: 61.5 - 40 = 21.5 ≈ 22 points ❌

---

## 3. COURSE ACCURACY (30%)

**Purpose**: Measures how closely the student follows the intended route

### Data Tracked:
- `deviations[]` - Array of deviation distances from intended route (in meters)

### Constants:
- `MAX_ACCEPTABLE_DEVIATION_METERS = 20` (20 meters)

### Computation:

```javascript
// Calculate average deviation
totalDeviation = sum(all deviations)
averageDeviation = totalDeviation / count(deviations)

// Convert deviation to score
// 0m deviation = 100%, 20m+ deviation = 0%
deviationRatio = min(1, averageDeviation / MAX_ACCEPTABLE_DEVIATION_METERS)
score = 100 - (deviationRatio × 100)

return max(0, min(100, score))
```

### Examples:

**Perfect Route:**
- Average deviation: 0 meters
- deviationRatio = 0/20 = 0
- **Result**: 100 - (0 × 100) = 100 points ✅

**Good Route:**
- Average deviation: 5 meters
- deviationRatio = 5/20 = 0.25
- **Result**: 100 - (0.25 × 100) = 75 points ✅

**Acceptable Route:**
- Average deviation: 10 meters
- deviationRatio = 10/20 = 0.5
- **Result**: 100 - (0.5 × 100) = 50 points ❌

**Poor Route:**
- Average deviation: 25 meters
- deviationRatio = min(1, 25/20) = 1
- **Result**: 100 - (1 × 100) = 0 points ❌

### Fallback (No Data):
If no deviation data is tracked:
```javascript
waypointRatio = waypointsReached / waypointsRequired
stepRatio = stepsCompleted / totalSteps
completionRatio = max(waypointRatio, stepRatio)
score = completionRatio × 85
// Max 85% without tracking data
```

---

## COMPLETE EXAMPLE

### Mission Scenario:
- Mission: "Navigate through harbor"
- Pass score: 80%
- Waypoints: 4 required
- Steps: 6 procedural steps

### Student Performance:

**Steering Data:**
- Heading errors: [5°, 3°, 7°, 4°, 6°, 5°, 8°, 2°]
- Average error: 5°
- Sharp turns: 1 out of 40 inputs

**Procedural Data:**
- Waypoints reached: 4/4 ✅
- Steps completed: 6/6 ✅
- Violations: 0
- Wrong order: 0
- Restricted entries: 0

**Course Data:**
- Deviations: [3m, 5m, 4m, 6m, 3m, 7m, 5m, 4m]
- Average deviation: 4.625 meters

### Score Calculation:

#### 1. Steering Precision:
```
errorPenalty = (5/30) × 50 = 8.3
sharpTurnPenalty = (1/40) × 100 = 2.5
score = 100 - 8.3 - 2.5 = 89.2 ≈ 89
```
**Steering Precision: 89/100**

#### 2. Procedural Correctness:
```
completionScore = (10/10) × 100 = 100
violationPenalty = 0 × 10 = 0
score = 100 - 0 = 100
```
**Procedural Correctness: 100/100**

#### 3. Course Accuracy:
```
deviationRatio = 4.625/20 = 0.231
score = 100 - (0.231 × 100) = 76.9 ≈ 77
```
**Course Accuracy: 77/100**

#### Overall Score:
```
Overall = (89 × 0.30) + (100 × 0.40) + (77 × 0.30)
        = 26.7 + 40 + 23.1
        = 89.8
        ≈ 90
```

**FINAL SCORE: 90/100** ✅ **PASSED** (≥80)

---

## XP Calculation

After score is calculated, XP is awarded:

```javascript
baseXP = 10
scoreBonus = floor(score / 10)
totalXP = baseXP + scoreBonus
```

### Examples:
- Score 90: XP = 10 + floor(90/10) = 10 + 9 = **19 XP**
- Score 85: XP = 10 + floor(85/10) = 10 + 8 = **18 XP**
- Score 75: XP = 10 + floor(75/10) = 10 + 7 = **17 XP**
- Score 50: XP = 10 + floor(50/10) = 10 + 5 = **15 XP**

---

## Data Collection During Mission

### When is data tracked?

1. **Steering Input** - Every 500ms:
   ```javascript
   trackSteeringInput(metrics, currentHeading, targetHeading, deltaTime)
   ```

2. **Course Deviation** - When checking route:
   ```javascript
   trackCourseDeviation(metrics, deviationDistance)
   ```

3. **Procedure Violations** - When violation occurs:
   ```javascript
   trackProcedureViolation(metrics, 'waypoint')  // Skipped waypoint
   trackProcedureViolation(metrics, 'order')     // Wrong order
   trackProcedureViolation(metrics, 'restricted') // Restricted area
   ```

4. **Performance Updates** - Continuous:
   ```javascript
   updateTrainingRunMetrics(metrics, stats)
   ```

---

## Important Notes

### 1. **NO AI or Random Values**
All calculations are deterministic based on actual telemetry data collected during mission execution.

### 2. **Heading Error Calculation**
Handles 0°/360° wraparound correctly:
```javascript
// Example: 359° to 1° = 2° difference (not 358°)
normalizeHeadingDifference(359, 1) = 2
normalizeHeadingDifference(1, 359) = -2
```

### 3. **Score Clamping**
All scores are clamped to [0, 100]:
- NaN → 0
- Infinity → 0
- Negative → 0
- > 100 → 100

### 4. **Fallback Scoring**
If telemetry data is missing (no tracking):
- Steering Precision: Up to 85% based on step completion
- Course Accuracy: Up to 85% based on waypoint/step completion
- Procedural: Based only on completion ratio (no violation data)

This ensures a score can still be calculated even with incomplete tracking.

---

## Summary

| Component | Weight | What It Measures | Max Penalty |
|-----------|--------|------------------|-------------|
| **Steering Precision** | 30% | Heading accuracy, smooth steering | -50 (heading) -30 (sharp turns) |
| **Procedural Correctness** | 40% | Following procedures, no violations | -10 per violation |
| **Course Accuracy** | 30% | Stay on intended route | -100 at 20m+ deviation |

**Pass Threshold**: 80/100  
**XP Formula**: 10 + floor(score/10)

**All values calculated from real telemetry data - NO randomness!**

