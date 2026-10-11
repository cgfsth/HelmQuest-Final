# Collision Physics Fix - Preventing Phase-Through

## Problem

The boat was **phasing through** (glitching through) solid objects:
- ❌ Docks/piers
- ❌ Buoys/fishing gear
- ❌ Islands/shore
- ❌ World boundaries

## Root Cause

**Collision detection was happening AFTER movement:**

```javascript
// OLD CODE (BROKEN):
boatObject.position.addScaledVector(_boatForward, speedVel);  // MOVE FIRST
applyWorldCollisionBlocking();  // CHECK COLLISION AFTER (TOO LATE!)
```

The boat would move forward, then collision detection would try to push it back, but the next frame it would move forward again and eventually glitch through.

## Solution

**Check collision BEFORE accepting movement, and REVERT if blocked:**

### 1. Store Position Before Movement
```javascript
const prevX = boatObject.position.x;
const prevZ = boatObject.position.z;
```

### 2. Apply Movement Tentatively
```javascript
boatObject.position.addScaledVector(_boatForward, speedVel);
```

### 3. Check Collision
```javascript
const collisionResult = checkAndResolveCollisions();
```

### 4. Revert if Blocked
```javascript
if (collisionResult.blocked) {
  // Restore previous position
  boatObject.position.x = prevX;
  boatObject.position.z = prevZ;
  
  // Apply physics response
  if (Math.abs(speedVel) > 0.05) {
    speedVel = -speedVel * 0.4; // Bounce back
  } else {
    speedVel = 0; // Full stop
  }
}
```

## New Collision System

### `checkAndResolveCollisions()` Function

Returns `{ blocked: true }` if ANY collision is detected:

1. **Dock/Pier Collision**
   - Uses `resolveDockCollision()`
   - Warning: "⚠️ COLLISION WITH PIER — Cannot pass through!"
   
2. **Buoy/Fishing Gear Collision**
   - Uses `resolveWaypointCollision()`
   - Warning: "⚠️ COLLISION WITH BUOY — Cannot pass through!"

3. **Island/Shore Collision**
   - Uses `resolveIslandCollisionAccurate()`
   - Validates with `distanceToNearestIslandShore()` (must be <10m)
   - Warning: "⚠️ SHORE COLLISION — Cannot pass through land!"

4. **World Boundary**
   - Uses `clampToOceanBounds()`
   - Warning: "⚠️ World boundary — Turn back!"

## Implementation Details

### Boat Movement (Player Input)
```javascript
// Before movement
const prevX = boatObject.position.x;
const prevZ = boatObject.position.z;

// Apply movement
boatObject.position.addScaledVector(_boatForward, speedVel);

// Check and revert if blocked
const collisionResult = checkAndResolveCollisions();
if (collisionResult.blocked) {
  boatObject.position.x = prevX;
  boatObject.position.z = prevZ;
  
  // Bounce or stop based on speed
  if (Math.abs(speedVel) > 0.05) {
    speedVel = -speedVel * 0.4; // 40% bounce-back
  } else {
    speedVel = 0; // Full stop
  }
}
```

### Wind Impact
```javascript
// Before wind push
const windPrevX = boatObject.position.x;
const windPrevZ = boatObject.position.z;

// Apply wind
boatObject.position.add(windImpact);

// Check and revert if blocked
const windCollision = checkAndResolveCollisions();
if (windCollision.blocked) {
  boatObject.position.x = windPrevX;
  boatObject.position.z = windPrevZ;
}
```

## Physics Response

### High Speed Collision (>0.05 velocity)
- **Bounce back** with 40% of original speed reversed
- Simulates elastic collision
- Example: Moving at 0.2 forward → hits wall → bounces at -0.08 backward

### Low Speed Collision (≤0.05 velocity)
- **Full stop** (velocity = 0)
- Simulates inelastic collision
- Example: Moving at 0.03 forward → hits wall → stops completely

## Benefits

✅ **No more phase-through** - Boat cannot glitch through objects  
✅ **Realistic physics** - Proper bounce or stop based on speed  
✅ **Performance tracking** - Collisions are logged for scoring  
✅ **Visual feedback** - Clear warning messages  
✅ **Applies to all forces** - Both player input and environmental (wind)  

## Testing Checklist

- [ ] Cannot phase through docks/piers
- [ ] Cannot phase through buoys/fishing gear  
- [ ] Cannot phase through islands/shore (when <10m away)
- [ ] Cannot go beyond world boundaries
- [ ] High speed collision causes bounce-back
- [ ] Low speed collision causes full stop
- [ ] Wind cannot push boat through obstacles
- [ ] Collision warnings appear correctly
- [ ] Performance system tracks collisions
- [ ] Boat movement feels realistic

## Code Changes

**Files Modified:**
- `src/App.vue` - Boat physics update function

**Functions Added:**
- `checkAndResolveCollisions()` - New collision detection system

**Functions Deprecated:**
- `applyWorldCollisionBlocking()` - Old system (kept for compatibility)

## Technical Notes

### Why This Works

The old system tried to "push back" the boat AFTER it had already moved. But physics runs at 60 FPS, so every frame:
1. Boat moves forward 1 unit
2. Collision pushes back 0.5 units
3. Net result: 0.5 units forward per frame
4. After 10 frames, boat is 5 units through the wall!

The new system:
1. Boat tries to move forward 1 unit
2. Collision detects: "You can't be here!"
3. Position reverted: Still at starting point
4. Speed reversed or zeroed
5. Boat never enters the obstacle

### Shore Collision Validation

Shore collision uses double-check:
```javascript
if (resolved.collided) {
  const actualDist = distanceToNearestIslandShore(...);
  if (actualDist < 10) { // Only block if really close
    blocked = true;
  }
}
```

This prevents false positives from complex island geometry.

## Future Improvements

1. **Add collision sounds** - Play impact sound effect
2. **Add visual effects** - Splash/particles on collision
3. **Damage system** - Track collision damage
4. **Speed-based damage** - Higher speed = more damage
5. **Structural integrity** - Boat can "break" after too many collisions

## Real-Life Physics Comparison

| Real Life | Game Implementation |
|-----------|---------------------|
| Hitting pier at high speed → Boat bounces back, damage | High speed → Bounce with 40% reverse velocity |
| Hitting pier at low speed → Boat stops, minor damage | Low speed → Full stop (velocity = 0) |
| Wind pushing boat into obstacle → Boat stops | Wind impact → Position reverted if blocked |
| Cannot drive through buoys | Buoy collision → Movement blocked |
| Cannot drive on land | Shore collision → Movement blocked |

---

**Status**: ✅ Implemented and Live  
**Date**: 2024-09-29  
**Version**: 1.0

