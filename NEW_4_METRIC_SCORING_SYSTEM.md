# New 4-Metric Scoring System Implementation

## Overview
Replaced the old 2-metric system (Steering 50% + Course 50%) with a new 4-metric system that better reflects mission objectives.

## Scoring Breakdown

### 1. Steps Completed: 40%
- **Sequential** - Must complete in order
- Requires reaching correct waypoint AND completing interaction
- Skipping a step means it doesn't count (even if you do the next step)

Formula: `(Steps Completed / Total Steps) × 100 × 0.40`

### 2. Waypoints Reached: 30%
- **Non-sequential** - Can reach in any order
- Just entering the zone counts (no interaction needed)
- Can get credit for reaching later waypoints even if skipping steps

Formula: `(Waypoints Reached / Total Waypoints) × 100 × 0.30`

### 3. Quiz Score: 20%
- Based on correct answers in post-mission quiz

Formula: `(Correct Answers / Total Questions) × 100 × 0.20`

### 4. Time Performance: 10%
- Compares actual time vs target time from mission
- Within or under target time = 100%
- Over target time = `(Target Time / Actual Time) × 100`
- Capped at 100%

Formula: `Time Score × 0.10`

## Final Score Calculation

```
Final Score = (Steps × 0.40) + (Waypoints × 0.30) + (Quiz × 0.20) + (Time × 0.10)
```

### Example
Mission with 3 steps, 3 waypoints, 2 quiz questions, 10-minute target:

**Student Performance:**
- Steps: 1/3 = 33.33% → 33.33 × 0.40 = 13.33 points
- Waypoints: 3/3 = 100% → 100 × 0.30 = 30 points
- Quiz: 1/2 = 50% → 50 × 0.20 = 10 points
- Time: 8 min (within target) = 100% → 100 × 0.10 = 10 points

**Final Score: 63%**

## Pass/Fail
- Default pass score: 70%
- Can be overridden per mission in Firestore
- Status: PASSED or NEEDS IMPROVEMENT

## Implementation Files Modified

### 1. `src/helpers/missionScoring.js`
- **NEW:** `calculateMissionScore(params, mission)` function
- Takes object with: stepsCompleted, totalSteps, waypointsReached, totalWaypoints, quizCorrect, quizTotal, actualTimeMinutes, targetTimeMinutes
- Returns: score, passed, individual metrics, contributions, counts, breakdown
- **DEPRECATED:** Old calculateSteeringPrecision and calculateCourseAccuracy functions

### 2. `src/App.vue`
- **Modified:** Mission completion logic (~line 10000)
- Now tracks waypoints non-sequentially (checks ALL steps, not just current)
- Retrieves quiz score from latest submission
- Calculates 4-metric score before recording session
- Uses `activeMission.value?.estimatedDuration` for target time

### Changes in `checkTrainingStep()` function (~line 12025):
```javascript
// NEW: Track ALL waypoint visits (non-sequential)
module.steps.forEach((s, index) => {
  if (s.waypointZone) {
    const zone = findWaypoint(trainingWaypoints.value, s.waypointZone);
    if (zone && isBoatInZone(stats.value.boatX, stats.value.boatZ, zone)) {
      if (!trainingRunMetrics.value.visitedWaypoints.has(s.waypointZone)) {
        trainingRunMetrics.value.visitedWaypoints.add(s.waypointZone);
      }
    }
  }
});
```

### Changes in mission completion (~line 10020):
```javascript
const scoringResult = calculateMissionScore({
  stepsCompleted: trainingRunMetrics.value.stepsCompleted,
  totalSteps,
  waypointsReached: waypointsVisited,
  totalWaypoints: waypointSteps,
  quizCorrect,
  quizTotal: quizTotal || 1,
  actualTimeMinutes,
  targetTimeMinutes
}, { passScore });

const score = scoringResult.score;
const passed = scoringResult.passed;
```

## Data Tracked
- `trainingRunMetrics.value.stepsCompleted` - Sequential step counter
- `trainingRunMetrics.value.visitedWaypoints` - Set of unique waypoints entered (non-sequential)
- `quizCorrect` and `quizTotal` - Retrieved from latest quiz submission
- `actualTimeMinutes` - Calculated from `elapsedMs`
- `targetTimeMinutes` - From `activeMission.value?.estimatedDuration`

## UI Display (TODO)
The mission complete modal needs to be updated to show:

```
MISSION PERFORMANCE

Steps Completed
1 / 3 (33%)

Waypoints Reached
3 / 3 (100%)

Quiz Score
1 / 2 (50%)

Time
8.0 min
Time Performance: 100%

FINAL MISSION SCORE
63%

NEEDS IMPROVEMENT
(Pass score: 70%)
```

## Testing Checklist
- [ ] Complete all steps in order → Should get full step credit
- [ ] Skip a step → That step should NOT count
- [ ] Reach all waypoints (any order) → Should get full waypoint credit
- [ ] Complete quiz → Should see quiz contribution
- [ ] Finish within target time → Time score = 100%
- [ ] Finish over target time → Time score < 100%
- [ ] Final score calculation matches formula
- [ ] Pass/fail status based on pass score threshold

## Benefits
1. **Clear objectives** - Students know exactly what counts
2. **Flexibility** - Can explore waypoints in any order
3. **Balanced scoring** - Multiple ways to earn points
4. **Fair time pressure** - Time only 10% of score
5. **Simple calculation** - Easy to understand and verify

---
**Implemented:** January 4, 2025  
**Status:** Core logic complete, UI display needs update
