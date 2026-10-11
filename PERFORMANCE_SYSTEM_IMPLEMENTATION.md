# HelmQuest Performance Tracking System - Full Implementation

## Overview

A comprehensive, modular performance tracking and scoring system for the HelmQuest maritime training simulator. This system tracks real-time player behavior throughout missions and calculates dynamic performance scores based on actual navigation quality, mission execution, docking accuracy, and time efficiency.

## Architecture

### Core Files Created

1. **`src/helpers/performanceTracking.js`** (800+ lines)
   - Core performance tracking system
   - Configuration management
   - Performance state management
   - All tracking subsystems

2. **`src/helpers/performanceManager.js`** (400+ lines)
   - Integrated performance manager
   - Singleton interface for the application
   - Event handling and coordination
   - Score queries and reporting

### System Components

```
IntegratedPerformanceManager
├── PerformanceState (data storage)
├── SteeringPerformanceTracker
│   ├── Route deviation tracking
│   ├── Heading correction detection
│   ├── Sharp turn detection
│   └── Waypoint overshoot tracking
├── CollisionTracker
│   ├── Collision severity detection
│   ├── Cooldown management
│   └── Penalty application
├── CoursePerformanceTracker
│   ├── Objective sequence tracking
│   ├── Task completion tracking
│   ├── Waypoint progress tracking
│   └── Anti-exploit detection
├── DockingPerformanceCalculator
│   ├── Position error calculation
│   ├── Rotation error calculation
│   ├── Speed assessment
│   └── Weighted scoring
└── TimeEfficiencyCalculator
    └── Time-based scoring
```

## Performance Metrics

### 1. Steering Precision (0-100%)

**What it measures:**
- Route deviation from ideal path
- Heading stability and corrections
- Sharp turn frequency
- Waypoint approach quality
- Collision avoidance

**Scoring factors:**
- Starts at 100%
- Penalties applied for:
  - Route deviation (0.5-2.0 points per meter based on severity)
  - Excessive heading corrections (2 points each)
  - Sharp turns (3 points each)
  - Waypoint overshoots (10 points)
  - Waypoint misses (15 points)
  - Collisions (5-20 points based on severity)

**Configuration:**
```javascript
{
  idealDeviationTolerance: 5m,      // No penalty zone
  minorDeviationThreshold: 15m,     // Small penalty starts
  majorDeviationThreshold: 30m,     // Large penalty starts
  extremeDeviationThreshold: 50m,   // Severe penalty
  headingCorrectionThreshold: 15°,  // Minimum change to count
  sharp TurnThreshold: 30°/s        // Sharp turn detection
}
```

### 2. Course Accuracy (0-100%)

**What it measures:**
- Waypoint completion rate
- Task completion rate
- Objective sequence correctness
- Return to port success
- Anchor deployment
- Overall mission execution

**Scoring factors:**
- Weighted components:
  - Waypoint completion: 30%
  - Task completion: 35%
  - Return to port: 15%
  - Anchor drop: 10%
  - Docking: 10%
- Penalties for:
  - Sequence violations (15 points each)
  - Skipped objectives (25 points each)
  - Waypoint circling (10 points)

### 3. Docking Accuracy (0-100%)

**What it measures:**
- Position accuracy (distance from target)
- Rotation accuracy (alignment with berth)
- Docking speed (approach and final)
- Collision avoidance during docking

**Scoring factors:**
- Weighted components:
  - Position accuracy: 30%
  - Rotation accuracy: 25%
  - Alignment: 20%
  - Speed control: 15%
  - Collision safety: 10%

**Tolerance levels:**
```javascript
Position:
  Excellent: ≤ 0.5m
  Good: ≤ 2.0m
  Fair: ≤ 5.0m

Rotation:
  Excellent: ≤ 3°
  Good: ≤ 10°
  Fair: ≤ 20°

Speed:
  Safe: ≤ 2.0 knots
  Excessive: > 5.0 knots
```

### 4. Time Efficiency (0-100%)

**What it measures:**
- Mission completion time vs expected duration
- Efficient navigation and task execution

**Scoring levels:**
```javascript
Within target time:       100%
Within acceptable time:    95%
Slightly late:            85%
Moderately late:          70%
Very late:                50%
Extremely late:           20%
```

### 5. Overall Performance (0-100%)

**Weighted average:**
```javascript
Overall = 
  (Steering × 35%) +
  (Course × 35%) +
  (Docking × 20%) +
  (Time × 10%)
```

## Real-Time Tracking

### Continuous Monitoring

The system tracks performance data in real-time during gameplay:

1. **Route Deviation** - Sampled every 1000ms
2. **Heading Changes** - Sampled every 500ms
3. **Collision Detection** - Event-based with 2s cooldown
4. **Waypoint Proximity** - Continuous distance tracking
5. **Objective Completion** - Event-based sequence tracking

### Event Logging

All significant events are logged with timestamps:
- Mission started/completed
- Waypoint activated/reached
- Objective completed/skipped
- Collision detected
- Penalty applied
- Sequence violation
- And more...

## Anti-Exploit Features

### Waypoint Circling Detection
- Tracks entries per waypoint
- Penalty after 3+ entries
- Prevents score manipulation

### Collision Cooldown
- 2-second cooldown per collision type
- Prevents frame-by-frame penalty spam

### Route Manipulation Prevention
- Accumulated deviation tracking
- Cannot "reset" score by returning to route
- Total mission performance considered

### Sequence Enforcement
- Expected objective order tracked
- Violations penalized but don't block completion
- Accurate mission execution rewarded

## Integration with HelmQuest

### Modified Files

1. **`src/helpers/missionScoring.js`**
   - Updated `updateTrainingRunMetrics()` to call performance manager
   - Updated score calculations to use step completion ratios

2. **`src/App.vue`**
   - Added performance manager import
   - Ready for lifecycle integration

### Integration Points (To Be Connected)

```javascript
// Mission Start
performanceManager.startMission({
  id: mission.id,
  studentId: currentUser.id,
  steps: module.steps,
  duration: module.duration
});

// Game Loop Updates
performanceManager.update({
  boatPosition: { x: stats.boatX, z: stats.boatZ },
  boatHeading: stats.heading,
  boatSpeed: stats.speedKnots,
  targetWaypoint: currentWaypoint
});

// Waypoint Events
performanceManager.onWaypointReached(waypointId, position);
performanceManager.onWaypointOvershoot(waypointId, distance);

// Collision Events
performanceManager.onCollision('shore', 'coastline', speed);

// Objective Events
performanceManager.onObjectiveCompleted(objectiveId, 'task');
performanceManager.onReturnToPort();
performanceManager.onAnchorDropped();

// Docking
performanceManager.onDockingCompleted({
  targetPosition: { x, z },
  targetRotation: angle,
  currentPosition: { x, z },
  currentRotation: angle,
  speed: knots,
  collisionOccurred: false
});

// Mission End
const report = performanceManager.completeMission();
```

### Accessing Scores

```javascript
// Get current scores (during mission)
const scores = performanceManager.getCurrentScores();
// { steering: 87, course: 95, docking: null, time: null, overall: null }

// Get statistics
const stats = performanceManager.getCurrentStatistics();

// Get performance descriptions
const descriptions = performanceManager.getPerformanceDescriptions();

// Get full report (after mission)
const report = performanceManager.getPerformanceReport();
```

## Configuration

All scoring parameters are configurable in `PERFORMANCE_CONFIG`:

```javascript
import { PERFORMANCE_CONFIG } from './helpers/performanceManager.js';

// Modify thresholds
PERFORMANCE_CONFIG.steering.minorDeviationThreshold = 20;
PERFORMANCE_CONFIG.docking.positionToleranceGood = 3.0;
PERFORMANCE_CONFIG.overall.steeringWeight = 0.40;
```

## Performance Report Structure

```javascript
{
  scores: {
    steering: 87,
    course: 95,
    docking: 91,
    time: 88,
    overall: 90
  },
  
  statistics: {
    navigation: {
      averageDeviation: "8.3",
      maxDeviation: "23.5",
      headingCorrections: 12,
      sharpTurns: 2,
      waypointOvershoots: 1
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
      objectivesSkipped: 0,
      sequenceViolations: 0,
      tasksCompleted: 4,
      tasksRequired: 4
    },
    
    docking: {
      positionError: "0.42",
      rotationError: "2.1",
      speed: "1.8",
      collisions: 0
    },
    
    time: {
      elapsed: "7m 42s",
      elapsedMs: 462000
    }
  },
  
  penalties: [
    {
      timestamp: 1234567890,
      type: "RouteDeviation",
      amount: 1.5,
      reason: "Deviated 18.2m from route"
    }
    // ... more penalties
  ],
  
  events: [
    {
      timestamp: 1234567890,
      type: "MissionStarted",
      missionId: "mission-1"
    }
    // ... more events
  ],
  
  metadata: {
    missionId: "mission-1",
    studentId: "student-123",
    startTime: 1234567890,
    endTime: 1234567890
  }
}
```

## Usage Example

```javascript
// 1. Start mission
performanceManager.startMission({
  id: 'test-mission-1',
  studentId: 'student-001',
  steps: mission.steps,
  duration: '5-10 minutes'
});

// 2. During mission (in game loop)
performanceManager.update({
  boatPosition: { x: boat.position.x, z: boat.position.z },
  boatHeading: boat.rotation.y * (180 / Math.PI),
  boatSpeed: calculateSpeedKnots()
});

// 3. On events
performanceManager.onWaypointReached('buoy-1', boatPosition);
performanceManager.onCollision('buoy', 'Buoy-01', 3.5);
performanceManager.onObjectiveCompleted('photograph-buoy-1', 'task');

// 4. On docking
performanceManager.onDockingCompleted({
  targetPosition: { x: 0, z: 0 },
  targetRotation: 0,
  currentPosition: { x: 0.4, z: 0.2 },
  currentRotation: 2.1,
  speed: 1.8,
  collisionOccurred: false
});

// 5. Complete mission
const report = performanceManager.completeMission();

// 6. Save to database
await savePerformanceReport(report);

// 7. Display in UI
showMissionResults(report);
```

## Next Steps for Full Integration

1. **Connect to mission lifecycle** in App.vue:
   - Call `startMission()` when starting training
   - Call `completeMission()` when mission ends

2. **Add event triggers**:
   - Waypoint events in step completion
   - Collision detection in physics collision handlers
   - Docking calculation when docking completes

3. **Update UI** to display performance data:
   - Real-time score display during mission (optional)
   - Final performance report in mission complete modal
   - Performance descriptions and feedback

4. **Database integration**:
   - Save performance report to Firestore
   - Include in mission_score record
   - Use for instructor analysis

5. **Testing**:
   - Test score calculations with different behaviors
   - Verify penalties apply correctly
   - Ensure anti-exploit systems work
   - Validate score ranges (0-100)

## Benefits

✅ **Dynamic scoring** based on actual behavior
✅ **No more static 100% scores**
✅ **Independent metrics** for different skills
✅ **Real-time tracking** throughout mission
✅ **Detailed event logging** for analysis
✅ **Configurable parameters** for adjustment
✅ **Anti-exploit protection**
✅ **Modular and extensible** architecture
✅ **Professional maritime simulator** feel
✅ **Comprehensive performance reports**

## Technical Notes

- Built for THREE.js/Vue.js web application
- Uses ES6 modules
- Singleton pattern for global access
- Event-driven architecture
- Real-time performance tracking
- Configurable thresholds
- Detailed logging system
- Ready for Firestore integration
