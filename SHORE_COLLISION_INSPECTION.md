# Shore/Land Collision - Complete Inspection

## Terrain System Overview

### **Terrain Type:** Procedural Heightmap-Based Terrain
- **Source:** SRTM heightmap data (real-world elevation data)
- **Coverage:** Davao Gulf region
- **Method:** Heightmap sampling for land detection

## Terrain Coordinates & Dimensions

### **World Bounds:**
```javascript
WORLD_WIDTH = 46,000 meters (46 km)
WORLD_HEIGHT = 60,000 meters (60 km)
```

### **Coordinate System:**
```
Center: (0, 0)
X Range: -23,000m to +23,000m (West to East)
Z Range: -30,000m to +30,000m (North to South)
```

### **Elevation Data:**
```javascript
ELEVATION_MIN = -37 meters (ocean depths)
ELEVATION_MAX = 2,941 meters (Mount Apo peak)
```

### **Water Level:**
```javascript
TERRAIN_CONFIG.waterY = 0 meters (sea level)
```

## Shore Detection Logic

### **Method 1: Heightmap-Based (Procedural Terrain)**

Located in: `capstone/src/helpers/worldIslands.js` line ~295

```javascript
export function resolveIslandCollisionAccurate(x, z, islandGroup) {
  if (islandGroup.userData?.isProceduralTerrain) {
    const cache = getCachedHeightmapSync();
    if (!cache) return { collided: false, x, z };

    // Sample elevation at boat position
    const elev = sampleHeightmapElevation(cache, x, z);
    
    // CHECK: Is boat above water level?
    if (elev <= TERRAIN_CONFIG.waterY + 0.35) {
      return { collided: false, x, z };  // In water - OK
    }

    // COLLISION DETECTED: Boat is on land (elevation > water level)
    // Calculate gradient to find push direction
    const eps = 8;
    const ex = sampleHeightmapElevation(cache, x + eps, z);
    const ez = sampleHeightmapElevation(cache, x, z + eps);
    const gx = (sampleHeightmapElevation(cache, x - eps, z) - ex) / (2 * eps);
    const gz = (sampleHeightmapElevation(cache, x, z - eps) - ez) / (2 * eps);
    const len = Math.hypot(gx, gz) || 1;
    const push = 22;  // Push 22 meters away from shore
    
    return {
      collided: true,
      x: x + (gx / len) * push,
      z: z + (gz / len) * push,
    };
  }
}
```

### **Collision Criteria:**
```javascript
// LAND DETECTION:
if (elevation > waterY + 0.35) {
  // Boat is 0.35m above water level
  // This is LAND/SHORE
  // TRIGGER COLLISION
}

// WATER DETECTION:
if (elevation <= waterY + 0.35) {
  // Boat is at or below water level + 0.35m buffer
  // This is WATER
  // NO COLLISION
}
```

### **Threshold Breakdown:**
- **Water Level:** `0m` (sea level)
- **Buffer:** `+0.35m` (35cm tolerance)
- **Land Trigger:** `elevation > 0.35m`

**Example Elevations:**
- `-10m` = Deep ocean → ❌ No collision (water)
- `-1m` = Shallow ocean → ❌ No collision (water)
- `0m` = Exact water level → ❌ No collision (water)
- `0.3m` = Very shallow → ❌ No collision (within buffer)
- `0.4m` = Beach/sandbar → ✅ **COLLISION!** (land)
- `1m` = Shore → ✅ **COLLISION!** (land)
- `10m` = Hills → ✅ **COLLISION!** (land)
- `100m` = Mountains → ✅ **COLLISION!** (land)

## How Heightmap Sampling Works

### **Step 1: World Coordinates to UV**
```javascript
function worldToHeightmapUV(worldX, worldZ) {
  const u = (worldX + WORLD_WIDTH * 0.5) / WORLD_WIDTH;
  const v = (worldZ + WORLD_HEIGHT * 0.5) / WORLD_HEIGHT;
  return { u, v };
}
```

**Example:** Your boat at position `(7000, -4300)`
```
u = (7000 + 23000) / 46000 = 30000 / 46000 = 0.652
v = (-4300 + 30000) / 60000 = 25700 / 60000 = 0.428
```

### **Step 2: UV to Heightmap Pixel**
```javascript
const px = Math.floor(u * cache.width);
const py = Math.floor(v * cache.height);
```

### **Step 3: Read RGB from Heightmap**
```javascript
const idx = (py * cache.width + px) * 4;
const r = cache.data[idx];
const g = cache.data[idx + 1];
const b = cache.data[idx + 2];
```

### **Step 4: RGB to Elevation**
```javascript
// Heightmap uses RGB to encode elevation
const rawValue = (r * 256 * 256 + g * 256 + b) / (256 * 256 * 256);
const elevation = ELEVATION_MIN + rawValue * (ELEVATION_MAX - ELEVATION_MIN);
```

**This gives REAL ELEVATION at that world coordinate!**

## Current Collision Status

### **In App.vue (line ~14075):**
```javascript
if (islandGroup) {
  const resolved = resolveIslandCollisionAccurate(
    boatObject.position.x,
    boatObject.position.z,
    islandGroup
  );
  
  if (resolved.collided) {
    // ALWAYS enforce - boat is on land!
    blocked = true;
    boatObject.position.x = resolved.x;
    boatObject.position.z = resolved.z;
    showCollisionWarning('⚠️ SHORE COLLISION — Cannot pass through land!');
  }
}
```

## Problem Diagnosis

### **Why Boat Can Stay on Land (Brown Area)?**

Looking at your screenshot, the boat is in a **brown/tan colored area** which indicates **LAND/SHORE**.

**Possible Issues:**

#### **Issue 1: Heightmap Not Loaded**
```javascript
const cache = getCachedHeightmapSync();
if (!cache) return { collided: false, x, z };  // No collision if heightmap missing!
```

**Check:** Open console and look for:
```
[terrain] Heightmap cache ready
```

#### **Issue 2: Elevation Below Threshold**
```javascript
if (elev <= TERRAIN_CONFIG.waterY + 0.35) {
  return { collided: false, x, z };  // No collision if elevation too low
}
```

**Possible:** The "brown area" might be a **very shallow beach** (<0.35m elevation).

#### **Issue 3: Not Using Procedural Terrain**
```javascript
if (islandGroup.userData?.isProceduralTerrain) {
  // Use heightmap collision
} else {
  // Use bounding box collision (legacy)
}
```

**Check:** Console should show:
```
[terrain] Tiled Davao Gulf ready
```

### **Debug Information Needed:**

Add these console logs to check:

```javascript
// In resolveIslandCollisionAccurate:
console.log('[Shore Check]', {
  x: x.toFixed(1),
  z: z.toFixed(1),
  elevation: elev.toFixed(2),
  waterLevel: TERRAIN_CONFIG.waterY,
  threshold: (TERRAIN_CONFIG.waterY + 0.35).toFixed(2),
  isLand: elev > TERRAIN_CONFIG.waterY + 0.35,
  isProcedural: islandGroup.userData?.isProceduralTerrain
});
```

## Recommended Fixes

### **Option 1: Reduce Threshold (More Aggressive)**
```javascript
// Current: 0.35m buffer
if (elev <= TERRAIN_CONFIG.waterY + 0.35) {

// Suggested: 0.1m buffer (more sensitive)
if (elev <= TERRAIN_CONFIG.waterY + 0.1) {
```

### **Option 2: Increase Push Distance**
```javascript
// Current: 22m push
const push = 22;

// Suggested: 30m push (stronger)
const push = 30;
```

### **Option 3: Check More Frequently**
Currently collision is checked **once per frame** in `updatePhysics()`.
Could check **before and after movement**.

## Testing Checklist

### **To Verify Shore Collision:**
1. **Open Console (F12)**
2. **Drive boat onto brown/land area**
3. **Check for:**
   - `[Shore Check]` logs showing elevation
   - `⚠️ SHORE COLLISION` warning
   - Boat being pushed back to water

### **Expected Behavior:**
- ✅ Boat **CANNOT** stay on brown/land area
- ✅ Collision warning appears immediately
- ✅ Boat pushed back to blue/water area
- ✅ Collision tracked in performance system

### **If Still Broken:**
- Check if heightmap is loaded
- Check if procedural terrain is active
- Check actual elevation values at boat position
- Verify threshold (0.35m) is appropriate

## Summary

**Current System:**
- Uses **real-world heightmap data**
- Samples **elevation at boat position**
- Detects **land if elevation > 0.35m above sea level**
- Pushes boat **22m away** using terrain gradient

**Coordinates:**
- World: 46km × 60km
- Center: (0, 0)
- Your boat: Around (7000, -4300) based on radar

**Threshold:**
- Water: ≤ 0.35m elevation
- Land: > 0.35m elevation

**The brown area in screenshot IS land - collision SHOULD trigger but appears to be failing. Need console logs to diagnose why!**
