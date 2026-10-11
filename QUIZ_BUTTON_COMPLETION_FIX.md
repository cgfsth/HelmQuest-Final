# Quiz Button Port Zone Requirement Fix

## User Requirement
The "Take Quiz" button should appear when:
1. ✅ **In port zone** - Boat is inside harbor/port area
2. ✅ **Engine stopped** - Must turn off engine
3. ✅ **Anchor deployed** - Must drop anchor

**Note:** The student does NOT need to complete all mission steps. The quiz can be taken at any time as long as they are in port with engine off and anchor deployed.

## Implementation

### Quiz Button Condition
```javascript
v-if="anchor.deployed && activeTrainingModule && !showPostDockingQuiz && !engineRunning && isBoatInPortZone"
```

### Port Zone Detection
Added `isBoatInPortZone` computed property (~line 6695):
```javascript
const isBoatInPortZone = computed(() => {
  if (!activeTrainingModule.value || !boatObject) return false;
  
  // Find the port/harbor waypoint
  const zones = resolveTrainingZonesAtSpawn();
  const portZone = zones.find(z => 
    z.id === 'harbor' || 
    z.label?.toLowerCase().includes('port') || 
    z.label?.toLowerCase().includes('harbor')
  );
  
  if (!portZone) return false;
  
  // Check if boat is inside the port zone
  return isBoatInZone(stats.value.boatX, stats.value.boatZ, portZone);
});
```

## Requirements for Quiz Button
The button appears when ALL of these conditions are met:

1. ✅ **Anchor deployed** - `anchor.deployed`
2. ✅ **Active training module** - `activeTrainingModule` exists
3. ✅ **Quiz not already showing** - `!showPostDockingQuiz`
4. ✅ **Engine stopped** - `!engineRunning`
5. ✅ **In port zone** - `isBoatInPortZone`

## File Modified
- `src/App.vue` - Line ~2790 (quiz button condition)
- `src/App.vue` - Line ~6695 (isBoatInPortZone computed property)

## Testing
1. Start a mission
2. Navigate to port (doesn't matter if steps are completed)
3. Enter the port/harbor zone
4. Stop engine
5. Drop anchor
6. ✅ Quiz button SHOULD appear

## Behavior
- Student can take quiz at ANY time as long as they return to port properly
- No need to complete all waypoints/steps
- This allows early quiz completion or retaking quiz if needed

---
**Fixed:** January 4, 2025
**Requirement:** Quiz available anytime when in port with proper docking procedure

