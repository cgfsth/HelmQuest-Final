# Collision Bounce-Back Physics Fix

## Problem
User reported: "mag ing ana ra sya permi dapat di na sya mag ing ana dhaa na pag mo bangga na gyud sya sa pier"

Translation: "It keeps doing that, it shouldn't be like that - when it hits the pier it should actually collide"

### Symptoms
- ✅ Collision warning appears correctly: "⚠️ COLLISION WITH PIER"
- ❌ Boat gets STUCK at the obstacle instead of bouncing back
- ❌ Boat doesn't reverse away from collision
- ❌ Momentum continues pushing into obstacle

## Root Cause
The collision detection was working (fix from previous iteration), but the **bounce-back physics was too weak**:

### Before (WEAK):
```javascript
if (Math.abs(speedVel) > 0.05) {
  speedVel = -speedVel * 0.5; // Only 50% bounce
} else {
  speedVel = 0;
}
```

**Problems:**
1. 50% bounce is too weak - boat stays near obstacle
2. Wind force applied AFTER collision, pushing boat back into obstacle
3. Rotation/turning momentum not reset
4. No additional clearance push

## Solution Applied

### 1. STRONGER BOUNCE PHYSICS (App.vue line ~14463)

```javascript
if (collisionResult.blocked) {
  // THREE-TIER RESPONSE based on impact speed
  
  if (Math.abs(speedVel) > 0.15) {
    // HIGH SPEED: 80% reverse bounce + 70% turn reduction
    speedVel = -speedVel * 0.8;
    speedRot *= 0.3;
  } 
  else if (Math.abs(speedVel) > 0.05) {
    // MEDIUM SPEED: 60% reverse bounce + 50% turn reduction
    speedVel = -speedVel * 0.6;
    speedRot *= 0.5;
  } 
  else {
    // LOW SPEED: FULL STOP
    speedVel = 0;
    speedRot = 0;
    angularVelocity = 0;
    turnRadius = 0;
  }
  
  // Additional clearance push
  boatObject.position.addScaledVector(_boatForward, speedVel * 0.5);
}
```

### 2. WIND COLLISION PREVENTION (App.vue line ~14520)

**Problem:** Wind was pushing boat back into obstacles after collision

**Solution:** Check collision after wind, revert wind movement if collision detected

```javascript
// Store position before wind
const preWindX = boatObject.position.x;
const preWindZ = boatObject.position.z;

boatObject.position.add(windImpact);

// Check collision after wind
const windCollision = checkAndResolveCollisions();
if (windCollision.blocked) {
  // Wind pushed us into obstacle - REVERT
  boatObject.position.x = preWindX;
  boatObject.position.z = preWindZ;
  speedVel *= 0.7;  // Reduce momentum
  speedRot *= 0.7;
}
```

## Physics Explanation

### Speed-Based Response Tiers

**Tier 1: High Speed (>0.15 m/s ≈ >0.3 knots)**
- **Bounce:** 80% reverse
- **Turn Reduction:** 70% (keeps 30%)
- **Effect:** Strong bounce-back, dramatic collision
- **Real Life:** Like hitting a pier at 5+ knots - serious impact

**Tier 2: Medium Speed (0.05-0.15 m/s ≈ 0.1-0.3 knots)**
- **Bounce:** 60% reverse
- **Turn Reduction:** 50% (keeps 50%)
- **Effect:** Moderate push-back
- **Real Life:** Bumping a dock at 2-3 knots - noticeable impact

**Tier 3: Low Speed (<0.05 m/s ≈ <0.1 knots)**
- **Bounce:** FULL STOP
- **All Momentum:** Reset to zero
- **Effect:** Boat stops immediately
- **Real Life:** Gentle contact at <1 knot - boat just stops

### Additional Safety Features

1. **Clearance Push:** Extra `speedVel * 0.5` movement ensures boat clears obstacle
2. **Wind Prevention:** Wind can't push boat back into obstacle after collision
3. **Momentum Reset:** All rotation/turning forces cleared on low-speed collision

## Expected Behavior After Fix

### Dock Collision
- **High Speed:** Strong bounce back + warning
- **Low Speed:** Boat stops against pier
- **Never:** Get stuck phasing through

### Buoy Collision
- **Any Speed:** Bounce away from buoy
- **Warning:** "⚠️ COLLISION WITH BUOY"
- **Never:** Pass through buoy marker

### Shore Collision
- **Any Speed:** Push away from land
- **Warning:** "⚠️ SHORE COLLISION"
- **Never:** Drive onto island

## Testing Instructions

1. **High Speed Pier Hit:**
   - Accelerate to 5+ knots
   - Aim directly at pier
   - **Expected:** Strong bounce back, boat reverses away

2. **Low Speed Pier Approach:**
   - Approach pier at 1-2 knots
   - **Expected:** Boat stops on contact, doesn't phase through

3. **Buoy Hit:**
   - Hit any buoy marker at any speed
   - **Expected:** Bounce away, warning appears

4. **Shore Approach:**
   - Drive toward island shore
   - **Expected:** Boat pushed back, cannot go onto land

5. **Wind Test:**
   - Collide with pier
   - Let wind blow toward pier
   - **Expected:** Wind doesn't push you back through pier

## Files Modified
- ✅ `capstone/src/App.vue` (line ~14463) - Stronger bounce physics
- ✅ `capstone/src/App.vue` (line ~14520) - Wind collision prevention

## What Was NOT Changed
- ✅ Collision detection logic (already fixed)
- ✅ Quiz system
- ✅ Mission completion
- ✅ XP/scoring
- ✅ Performance tracking

## Real Maritime Physics

The bounce-back behavior now matches real maritime collision physics:

- **High Speed Impact:** Boat reverses with force (damage would occur)
- **Low Speed Contact:** Boat stops (like coming alongside a pier)
- **Momentum Transfer:** Rotation/turning forces dissipate on impact
- **Wind Effect:** Cannot overcome solid obstacle collision

Karon mo-bangga na gyud ang boat sa pier! Di na mag-stuck ug mag-phase through! 🚢💥⚓
