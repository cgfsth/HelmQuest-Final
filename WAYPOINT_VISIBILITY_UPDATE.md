# Waypoint Visibility Update - Show All Buoys Simultaneously

## Summary
Gipausab ang waypoint marker system para mohabol sa scoring computation. Karon, **tanan waypoint buoys mugawas samtang** sa mission start, dili na one-by-one.

## Changes Made

### File: `src/App.vue`

**Function Modified:** `syncTrainingWaypointMarkers()` (around line 10111)

#### Before (Old Behavior):
- **Progressive visibility**: Only the CURRENT step's waypoint marker appears
- Completed waypoints disappear
- Future waypoints don't appear yet
- Students could only see one buoy at a time

#### After (New Behavior):
- **All-visible from start**: ALL waypoint markers appear simultaneously when mission starts
- The ACTIVE/CURRENT waypoint is highlighted (brighter, bigger)
- Students can see the complete route/path from the beginning
- This matches the scoring system which tracks course deviation from ALL waypoints

## Implementation Details

### What Changed:
1. **Loop through ALL steps** instead of just the current step
2. **Collect all waypoint zones** into an array `allWaypointZones`
3. **Pass complete array** to `createWaypointMarkerGroup()`
4. **Highlight current waypoint** by passing `activeZoneId` parameter

### Code Flow:
```javascript
// Old: Only current step
const step = activeTrainingModule.value.steps[currentTrainingStep.value];
const zone = findWaypoint(zones, step.waypointZone);
// Create marker for [single zone]

// New: All steps
for (const step of activeTrainingModule.value.steps) {
  const zone = findWaypoint(zones, step.waypointZone);
  allWaypointZones.push(zone);
}
// Create markers for [all zones]
```

### Visual Differentiation:
- **Active waypoint**: Highlighted with `activeZoneId` (brighter emissive, larger scale)
- **Future waypoints**: Shown but dimmer (normal scale and emissive intensity)
- **Duplicate handling**: Zones are deduplicated using a Set to avoid multiple markers for the same location

## Why This Change?

### Aligns with Performance Scoring System:
The deterministic performance scoring (implemented in `src/helpers/missionScoring.js`) tracks:
- **Course Accuracy**: Measures deviation from the optimal route to ALL waypoints
- **Steering Precision**: Tracks heading errors across the entire mission
- **Procedural Correctness**: Checks if waypoints are visited in the correct order

For these metrics to work correctly, students need to see:
- The complete route layout
- Where they need to navigate
- The sequence of waypoints
- The overall mission path

### Better Learning Experience:
- Students can plan their route in advance
- They understand the full mission scope
- Navigation becomes more realistic (like real GPS waypoint navigation)
- Visual feedback matches the scoring criteria

## Testing

### To Verify:
1. Start any training mission (Module 1 - Mission 1, 2, 3, or 4)
2. All waypoint buoys should appear immediately
3. The first/current waypoint should be highlighted (brighter)
4. As you complete each waypoint and advance, the highlight moves to the next one
5. Course accuracy scoring should reflect navigation to all visible waypoints

### Missions Affected:
- **Module 1 - Mission 1**: Crab Pot, Gillnet, Longline + Harbor Return (4 waypoints)
- **Module 1 - Mission 2**: Buoy Alfa, Bravo, Charlie + Harbor Return (4 waypoints)
- **Module 1 - Mission 3**: Missing Net Marker + Harbor Return (2 waypoints)
- **Module 1 - Mission 4**: Patrol Point 1, 2, 3 + Harbor Return (4 waypoints)
- **Custom Instructor Missions**: All waypoints defined by instructor

## Related Files
- `src/App.vue` - Main application, waypoint marker synchronization
- `src/helpers/missionWaypoints.js` - Waypoint creation and rendering
- `src/helpers/missionScoring.js` - Performance scoring (course accuracy calculation)

## Notes
- The `createWaypointMarkerGroup()` function already supports multiple waypoints
- The `activeZoneId` parameter controls which waypoint is highlighted
- Buoy floating animations work correctly with multiple markers
- No changes needed to the marker creation logic itself
