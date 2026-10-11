# Port Structure - Size & Collision Box Inspection

## Port Model Details

### GLB Model File
- **File:** `/assets/seaside_wharf.glb`
- **Model Name:** `MainHarborDock`

### Scale Applied
```javascript
model.scale.set(500, 500, 500);
```
- **Scale Factor:** **500x** (massive commercial port scale)
- **Purpose:** Scaled up to fit large boats (180m LOA reference vessel)
- **Result:** Balanced size for commercial harbor

### Port Position
```javascript
portX = 17300;   // X coordinate (EAST)
portZ = -4300;   // Z coordinate (general area)
portY = groundY - 10;  // 10 meters below ground elevation
```

### Port Rotation
```javascript
model.rotation.y = Math.PI;  // 180 degrees
```
- **Facing:** SOUTH (180°)
- **0° = North, 90° = East, 180° = South, 270° = West**

## Collision Box Dimensions

### Current Collision Box (After Fix)
```javascript
activeDockColliders = [
  {
    minX: portX - 300,  // 300m west of center
    maxX: portX + 300,  // 300m east of center
    minZ: portZ - 200,  // 200m north of center
    maxZ: portZ + 200   // 200m south of center
  }
];
```

### Collision Zone Size
- **Width (X-axis):** **600 meters** (300m × 2)
- **Depth (Z-axis):** **400 meters** (200m × 2)
- **Total Area:** **240,000 m²** (24 hectares)
- **Shape:** Rectangular bounding box

### Visual Representation
```
                North (-Z)
                    ↑
                    |
    West     ┌──────────────┐     East
    (-X) ←── │              │ ──→ (+X)
             │   PORT 500x  │
    300m ←── │   CENTER @   │ ──→ 300m
             │   (17300,    │
             │    -4300)    │
             └──────────────┘
                    |
                    ↓
               South (+Z)
                 200m

    Collision Box: 600m × 400m
```

## Berth Zone (Docking Area)

### Berth Position
```javascript
activeHarborDockBerth = {
  x: portX - 150,  // 150m WEST of port center
  z: portZ - 50,   // 50m north of port center
  length: 22,      // 22m long
  width: 10,       // 10m wide
  berthHeadingDeg: 270,  // Facing WEST
  requireHeadingDeg: 270,
  headingTolerance: 25,
  maxSpeedKnots: 1.5
}
```

### Berth Size
- **Length:** 22 meters
- **Width:** 10 meters
- **Area:** 220 m²
- **Purpose:** Small boat parking zone

### Berth Location
- **Relative to Port:** 150m WEST (left side)
- **Facing Direction:** WEST (270°)
- **Speed Limit:** 1.5 knots
- **Heading Tolerance:** ±25°

## Size Comparisons

### Port vs Boat
- **Port Collision Box:** 600m × 400m = **240,000 m²**
- **88m Boat (Marlow):** ~88m × 15m = **1,320 m²**
- **Port is ~182× larger** than the boat in area

### Port vs Real-World Reference
- **Small Marina:** ~200m × 150m
- **Medium Commercial Port:** ~500m × 400m ← **This is our size**
- **Large Container Terminal:** 1-2 km × 500-800m

### Collision Box vs Actual Model
The collision box (600m × 400m) is intentionally **LARGER** than the actual visible GLB model because:
1. Scaled GLB model size varies based on original modeling
2. Collision box ensures NO PHASE-THROUGH even at edges
3. Safety margin for realistic collision detection
4. Accounts for port structures like piers, cranes, warehouses

## Why This Size?

### 500x Scale Reasoning
1. **Original GLB Model:** Very small (probably ~1-2 meters in original scale)
2. **Target Size:** Need to match 88m boat and 180m commercial vessels
3. **Scale Factor:** 500× makes it a realistic **medium-sized commercial port**
4. **Visual Balance:** Large enough to be visible, not so large it dominates the scene

### Collision Box Reasoning
1. **600m Width:** Covers port structure + side piers + approach channels
2. **400m Depth:** Covers main wharf + loading areas + warehouses
3. **Safety Margin:** Ensures boat collides BEFORE reaching visible structures
4. **Performance:** Single large box is more efficient than hundreds of small boxes

## Testing the Collision Box

### How to Verify Size
1. **Approach from West:** Should hit collision at X = portX - 300 = 17000
2. **Approach from East:** Should hit collision at X = portX + 300 = 17600
3. **Approach from North:** Should hit collision at Z = portZ - 200 = -4500
4. **Approach from South:** Should hit collision at Z = portZ + 200 = -4100

### Console Verification
```javascript
console.log('[HarborDocks] Created dock collider:', activeDockColliders[0]);
```
This logs the exact collision box coordinates when the port loads.

## Potential Adjustments

### If Collision Box Too Large
Reduce the margins:
```javascript
minX: portX - 200,  // 400m wide instead of 600m
maxX: portX + 200,
minZ: portZ - 150,  // 300m deep instead of 400m
maxZ: portZ + 150
```

### If Collision Box Too Small
Increase the margins:
```javascript
minX: portX - 400,  // 800m wide instead of 600m
maxX: portX + 400,
minZ: portZ - 250,  // 500m deep instead of 400m
maxZ: portZ + 250
```

### If Port Too Large Visually
Reduce the scale:
```javascript
model.scale.set(300, 300, 300);  // Smaller port (60% of current)
```

### If Port Too Small Visually
Increase the scale:
```javascript
model.scale.set(700, 700, 700);  // Larger port (140% of current)
```

## Summary

### Current Configuration
- ✅ **Port Scale:** 500× (medium commercial port)
- ✅ **Collision Box:** 600m × 400m (24 hectares)
- ✅ **Location:** X=17300, Z=-4300 (on shore)
- ✅ **Facing:** South (180°)
- ✅ **Berth Zone:** 22m × 10m, facing West

### Collision Detection Status
- ✅ Collision box created successfully
- ✅ Size appropriate for 88m boat
- ✅ Large enough to prevent phase-through
- ✅ Logged to console for verification

### Real-World Context
This is equivalent to a **medium commercial fishing port** or **small cargo terminal** - appropriate for maritime training simulator with 88m trawler vessel.

**Ato nang collision box kay 600m × 400m - dako kaayo para sure gyud nga dili mo-lapos ang boat!** 🚢⚓
