# Collision Box Adjustment Guide

## Visual Debugging Added! 🔴

The collision box is now **VISIBLE IN RED** so you can easily adjust it to match the port structure perfectly!

## What You'll See

### Red Wireframe Box
- **Color:** Bright RED wireframe
- **Height:** 20 meters tall (extends above water)
- **Position:** Centered on collision zone
- **Purpose:** Shows exact collision boundaries

### Red Semi-Transparent Plane
- **Color:** RED with 15% opacity
- **Position:** At water level
- **Purpose:** Shows collision area from above (for radar view)

### Console Output
```
[HarborDocks] Created dock collider: { minX, maxX, minZ, maxZ }
[HarborDocks] Collision box visualization: 200m × 160m at (17300, -4300)
```

## Current Settings

### Location in Code
**File:** `capstone/src/helpers/harborDocks.js`  
**Line:** ~737-745

```javascript
activeDockColliders = [
  {
    minX: portX - 100,  // ← ADJUST THIS: west boundary
    maxX: portX + 100,  // ← ADJUST THIS: east boundary
    minZ: portZ - 80,   // ← ADJUST THIS: north boundary
    maxZ: portZ + 80    // ← ADJUST THIS: south boundary
  }
];
```

### Current Size
- **Width (X-axis):** 200 meters (100m × 2)
- **Depth (Z-axis):** 160 meters (80m × 2)
- **Center:** (17300, -4300)

## How to Adjust

### Step 1: Run the Simulation
1. Start the application: `npm run dev`
2. Load a mission
3. Look for the **RED BOX** around the port

### Step 2: Check the Fit
Look at the red box compared to the visible port structure:

- **Too Small?** Red box inside the port structures → Increase values
- **Too Large?** Red box far from port structures → Decrease values
- **Perfect?** Red box matches pier/wharf edges → Good!

### Step 3: Adjust the Values

#### Make Box WIDER (X-axis)
```javascript
minX: portX - 150,  // Increase from 100 to 150
maxX: portX + 150,  // Now 300m wide total
```

#### Make Box NARROWER (X-axis)
```javascript
minX: portX - 75,   // Decrease from 100 to 75
maxX: portX + 75,   // Now 150m wide total
```

#### Make Box DEEPER (Z-axis)
```javascript
minZ: portZ - 120,  // Increase from 80 to 120
maxZ: portZ + 120,  // Now 240m deep total
```

#### Make Box SHALLOWER (Z-axis)
```javascript
minZ: portZ - 60,   // Decrease from 80 to 60
maxZ: portZ + 60,   // Now 120m deep total
```

### Step 4: Reload and Test
1. Save the file
2. Refresh browser (F5)
3. Check new red box position
4. Test collision by driving toward port
5. Repeat until perfect!

## Adjustment Examples

### Example 1: Port Too Visible Outside Box
**Problem:** Port structures extend beyond red box  
**Solution:** Increase both width and depth

```javascript
minX: portX - 150,  // Was 100
maxX: portX + 150,  // Was 100
minZ: portZ - 120,  // Was 80
maxZ: portZ + 120   // Was 80
```
**Result:** 300m × 240m box

### Example 2: Box Too Large, Empty Space
**Problem:** Lots of empty water inside red box  
**Solution:** Decrease both width and depth

```javascript
minX: portX - 75,   // Was 100
maxX: portX + 75,   // Was 100
minZ: portZ - 60,   // Was 80
maxZ: portZ + 60    // Was 80
```
**Result:** 150m × 120m box

### Example 3: Box Offset from Port
**Problem:** Red box not centered on port structures

**Check port position in console:**
```
[HarborDocks] Final port position: (17300, Y, -4300)
```

**Adjust center position if needed:**
```javascript
// If port is actually at different coordinates
let portX = 17500;  // Adjust X center
let portZ = -4200;  // Adjust Z center
```

### Example 4: Asymmetric Port
**Problem:** Port extends more to one side

**Use different values for each side:**
```javascript
minX: portX - 120,  // West side extends further
maxX: portX + 80,   // East side shorter
minZ: portZ - 100,  // North side longer
maxZ: portZ + 60    // South side shorter
```
**Result:** 200m × 160m asymmetric box

## Recommended Sizes by Port Type

### Small Fishing Pier (Single Dock)
```javascript
minX: portX - 40,
maxX: portX + 40,
minZ: portZ - 30,
maxZ: portZ + 30
```
**Size:** 80m × 60m

### Medium Commercial Wharf (Current)
```javascript
minX: portX - 100,
maxX: portX + 100,
minZ: portZ - 80,
maxZ: portZ + 80
```
**Size:** 200m × 160m ← **DEFAULT**

### Large Port Complex
```javascript
minX: portX - 200,
maxX: portX + 200,
minZ: portZ - 150,
maxZ: portZ + 150
```
**Size:** 400m × 300m

### Mega Container Terminal
```javascript
minX: portX - 400,
maxX: portX + 400,
minZ: portZ - 300,
maxZ: portZ + 300
```
**Size:** 800m × 600m

## Visual Reference Guide

### Boat Size Reference (88m Trawler)
- **1× boat length:** 88m
- **2× boat length:** 176m
- **3× boat length:** 264m

**Current box (200m × 160m) = ~2.3× boat length**

### Real Maritime Clearance Zones
- **Very close:** 50-100m (berthing distance)
- **Close:** 100-200m (approach distance) ← **Current**
- **Medium:** 200-400m (harbor traffic zone)
- **Far:** 400m+ (open water)

## Testing Checklist

After adjusting, test these scenarios:

### 1. Far Away
- [ ] No collision warning at 500m+ distance
- [ ] Red box not visible yet

### 2. Approaching
- [ ] Red box becomes visible at ~300-400m
- [ ] No collision warning until entering red box

### 3. At Red Box Edge
- [ ] Collision warning appears when entering red box
- [ ] Warning: "⚠️ COLLISION WITH PIER"

### 4. Inside Red Box
- [ ] Collision physics active (bounce-back)
- [ ] Cannot pass through red zone
- [ ] Speed reduced on impact

### 5. Visual Match
- [ ] Red box covers all visible port structures
- [ ] Red box doesn't extend too far into open water
- [ ] Realistic safety margin around structures

## Removing Visualization (Production)

Once you're happy with the size, you can remove the red box visualization:

**Comment out or delete lines ~750-780 in `harborDocks.js`:**

```javascript
// REMOVE THIS SECTION FOR PRODUCTION:
/*
const boxGeometry = new THREE.BoxGeometry(boxWidth, 20, boxDepth);
const boxMaterial = new THREE.MeshBasicMaterial({ ... });
// ... rest of visualization code ...
group.add(collisionBoxMesh);
group.add(fillMesh);
*/
```

**Keep the collision box data and console log:**
```javascript
activeDockColliders = [ ... ]; // KEEP THIS
console.log('[HarborDocks] Created dock collider:', ...); // KEEP THIS
```

## Tips for Perfect Adjustment

### Tip 1: Use Multiple Camera Angles
- Free camera (F3) to fly around
- Chase camera (F1) from boat
- Top-down view to see red plane

### Tip 2: Check Console Logs
```
[HarborDocks] Collision box visualization: 200m × 160m at (17300, -4300)
```
Verify size matches your intentions

### Tip 3: Test at Different Speeds
- Slow approach (1-2 knots): Should collide at box edge
- Fast approach (5+ knots): Should bounce back strongly

### Tip 4: Compare to Berth Zone
- Berth zone (green): 22m × 10m (parking)
- Collision box (red): ~200m × 160m (safety zone)
- Red should be much larger than green

### Tip 5: Incremental Changes
Don't change by more than 20-30m at a time:
```javascript
// Good: Small incremental change
minX: portX - 100  →  portX - 120  (+20m)

// Bad: Huge change, hard to evaluate
minX: portX - 100  →  portX - 300  (+200m!)
```

## Troubleshooting

### Red Box Not Visible
**Problem:** Can't see the red wireframe box  
**Solutions:**
- Check console for "Collision box visualization" message
- Make sure you're close enough (<500m)
- Try different camera angles (F1, F3)
- Increase opacity in code: `opacity: 1.0`

### Red Box at Wrong Location
**Problem:** Red box not near port structure  
**Solutions:**
- Check port position in console log
- Verify `portX` and `portZ` values
- Port may be placed at unexpected coordinates

### Collision Still Too Early/Late
**Problem:** Collision triggers before/after entering red box  
**Solutions:**
- The red box shows EXACT collision boundaries
- If triggers early: visualization code might be wrong
- If triggers late: check collision detection is using same values

## Summary

**Added:** Red wireframe box + semi-transparent plane  
**Purpose:** Visual guide for adjusting collision zone  
**Location:** `capstone/src/helpers/harborDocks.js` line ~737-780  
**Default Size:** 200m × 160m  
**Adjust:** Change the ±100 and ±80 values to your preference  

**Karon makita nimo ang RED BOX! Adjust lang ang numbers hangtod match sa port structure!** 🔴🚢⚓
