# Performance System Testing Guide

## Quick Start Testing

### Test 1: Perfect Navigation (Should Score ~95-100%)

1. Start any training mission
2. Navigate smoothly without sharp turns
3. Stay close to ideal route line
4. Visit all waypoints in order
5. Complete all objectives
6. Avoid collisions
7. Complete mission and check scores

**Expected Result:**
- Steering Precision: 95-100%
- Course Accuracy: 100%
- Sharp Turns: 0-2

### Test 2: Poor Navigation (Should Score ~60-80%)

1. Start any training mission
2. Make sharp, jerky turns frequently
3. Zigzag between waypoints
4. Deviate far from route (50+ meters)
5. Bump into buoys/pier at least once
6. Complete mission and check scores

**Expected Result:**
- Steering Precision: 60-80%
- Course Accuracy: May vary
- Sharp Turns: 5+
- Collisions: 1+

### Test 3: Incomplete Mission (Should Score ~40-60%)

1. Start any training mission
2. Skip first waypoint completely
3. Go directly to second waypoint
4. Complete some but not all objectives
5. Complete mission and check scores

**Expected Result:**
- Steering Precision: May vary
- Course Accuracy: 40-70%
- Sequence Violations: 1+

## Browser Console Testing

### During Mission

```javascript
// Check if tracking is active
window.__performanceManager.isActive
// Should return: true

// Get current scores in real-time
window.__performanceManager.getCurrentScores()
// Returns: { steering: 87, course: 95, docking: null, time: null, overall: null }

// Get detailed statistics
window.__performanceManager.getCurrentStatistics()
// Shows: navigation stats, collisions, mission progress

// Get current state
window.__performanceManager.getState()
// Shows: full performance state with all tracked data
```

### After Mission

```javascript
// Get full performance report
window.__performanceManager.getPerformanceReport()
// Returns: complete report with scores, statistics, events, penalties

// Get performance descriptions
window.__performanceManager.getPerformanceDescriptions()
// Returns: human-readable descriptions of performance levels
```

## What to Look For

### ✅ Success Indicators

1. **Console Logs:**
   ```
   [App] Performance tracking started for mission: m1-mission2
   [App] Initial waypoint set: Buoy-01
   [App] Waypoint reached tracked: Buoy-01
   [App] Objective completed tracked: step-0
   [App] Performance report generated
   ```

2. **Scores Decrease with Poor Performance:**
   - Make sharp turn → Steering score drops
   - Collide with buoy → Steering score drops
   - Skip waypoint → Course score drops

3. **Mission Results Modal:**
   - Steering Precision shows value < 100%
   - Course Accuracy reflects completion
   - Sharp turns count is displayed

### ❌ Failure Indicators

1. **Scores Always 100%:**
   - Performance tracking not active
   - Check if in review mode (tracking disabled)
   - Check console for errors

2. **No Console Logs:**
   - Integration not working
   - JavaScript error preventing execution

3. **Scores Don't Change:**
   - Update loop not running
   - Events not being triggered

## Performance Report Structure

After mission completion, the report should look like:

```javascript
{
  scores: {
    steering: 87,      // Based on navigation quality
    course: 95,        // Based on objectives completed
    docking: null,     // Only if docking occurred
    time: 88,          // Based on completion time
    overall: 90        // Weighted average
  },
  
  statistics: {
    navigation: {
      averageDeviation: "8.3",
      maxDeviation: "23.5",
      headingCorrections: 12,
      sharpTurns: 2
    },
    
    collisions: {
      total: 1,
      minor: 1,
      medium: 0,
      heavy: 0
    },
    
    mission: {
      waypointsReached: 4,
      waypointsRequired: 4,
      objectivesCompleted: 8,
      sequenceViolations: 0
    }
  },
  
  penalties: [
    {
      type: "RouteDeviation",
      amount: 1.5,
      reason: "Deviated 18.2m from route"
    }
  ]
}
```

## Common Test Scenarios

### Scenario 1: First Time User
- Expect: Lower steering scores due to learning curve
- Expect: Multiple sharp turns
- Expect: Some route deviation
- Score Range: 60-80%

### Scenario 2: Experienced User
- Expect: High steering scores
- Expect: Few corrections
- Expect: Minimal deviation
- Score Range: 90-100%

### Scenario 3: Rushed Completion
- Expect: More sharp turns
- Expect: Higher deviation
- Expect: Possible waypoint overshoots
- Score Range: 70-90%

## Adjusting Sensitivity

If scores are too harsh or too lenient, adjust in `src/helpers/performanceTracking.js`:

```javascript
export const PERFORMANCE_CONFIG = {
  steering: {
    // Make deviation more forgiving:
    idealDeviationTolerance: 10,      // was 5
    minorDeviationThreshold: 25,      // was 15
    
    // Make sharp turns less penalized:
    sharpTurnPenalty: 1,              // was 3
    
    // Make heading corrections less strict:
    headingCorrectionThreshold: 25,   // was 15
  }
};
```

## Expected Console Output Example

```
[App] Performance manager accessible via window.__performanceManager
[App] Performance tracking started for mission: m1-mission2
[IntegratedPM] Mission started with config: {waypoints: 4, tasks: 4, expectedTime: 600000}

[App] Initial waypoint set: Buoy-01
[Performance] WaypointActivated: {waypointId: "Buoy-01", position: {x: 245, z: 380}}

[Performance] PenaltyApplied: {type: "RouteDeviation", amount: 0.8, reason: "Deviated 13.2m from route"}
[Performance] PenaltyApplied: {type: "SharpTurn", amount: 3, reason: "Sharp turn detected: 45.2° in 0.8s"}

[App] Waypoint reached tracked: Buoy-01
[Performance] WaypointReached: {waypointId: "Buoy-01"}

[App] Objective completed tracked: step-0
[Performance] ObjectiveCompleted: {objectiveId: "step-0", sequence: "correct"}

[App] Active waypoint set: Buoy-02
[Performance] WaypointActivated: {waypointId: "Buoy-02", position: {x: 298, z: 445}}

[App] Buoy collision tracked
[Performance] CollisionDetected: {type: "buoy", speed: "3.2", severity: "minor"}
[Performance] PenaltyApplied: {type: "Collision", amount: 5, reason: "minor collision with buoy"}

[App] Performance report generated: {scores: {steering: 87, course: 95, overall: 91}}
[IntegratedPM] Mission completed. Final scores: {steering: 87, course: 95, overall: 91}
```

## Bug Reporting

If you find issues, include:

1. **Console logs** (full output)
2. **Performance report** (from `window.__performanceManager.getPerformanceReport()`)
3. **Steps to reproduce**
4. **Expected vs actual behavior**
5. **Mission ID** being tested

## Success Criteria

✅ Performance tracking initializes when mission starts  
✅ Scores decrease with poor navigation  
✅ Collisions are detected and penalized  
✅ Waypoints are tracked correctly  
✅ Mission results modal shows dynamic scores  
✅ Console logs show tracking events  
✅ `window.__performanceManager` accessible in console  

---

**Ready to test!** Start a mission and watch the console for tracking events.
