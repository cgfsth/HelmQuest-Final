# Rotated Collision Rectangle - Full Implementation

## User Request
"e rotate daw ang collision"

Translation: "Rotate the collision (to match the port structure)"

## Problem
The port GLB model is rotated 180° (facing south):
```javascript
model.rotation.y = Math.PI;  // 180 degrees
```

But the collision rectangle was **axis-aligned** (not rotated), causing mismatch between visual port structure and collision boundaries.

## Solution: Rotated Rectangle Collision

### New Collision Box Format
```javascript
activeDockColliders = [
  {
    // ROTATED RECTANGLE (new format)
    centerX: portX,           // Center X position
    centerZ: portZ,           // Center Z position
    halfWidth: 250,           // Half-width (250m × 2 = 500m total)
    halfDepth: 150,           // Half-depth (150m × 2 = 300m total)
    rotation: Math.PI,        // 180° rotation (same as port)
    
    // Legacy axis-aligned (for fallback)
    minX: portX - 250,
    maxX: portX + 250,
    minZ: portZ - 150,
    maxZ: portZ + 150
  }
];
```

### Rotation Angles
- **0°** = North (no rotation)
- **90°** = East (`Math.PI / 2`)
- **180°** = South (`Math.PI`) ← **Current port rotation**
- **270°** = West (`Math.PI * 1.5`)

## Implementation Details

### 1. Collision Box Definition (harborDocks.js ~line 737)
Added rotation property to collision box:
```javascript
rotation: Math.PI,  // Matches port rotation (180°)
```

### 2. Visual Rotation (harborDocks.js ~line 755)
Red rectangle now rotates to match:
```javascript
collisionBoxMesh.rotation.y = collisionBox.rotation;
fillMesh.rotation.y = collisionBox.rotation;
```

### 3. Rotated Collision Detection (harborDocks.js ~line 397)
Completely rewrote `resolveDockCollision()` with rotation support:

#### Algorithm:
1. **Detect rotation**: Check if `box.rotation` property exists
2. **Transform to local space**: Rotate boat position by `-rotation`
3. **Check collision**: Use standard rectangle collision in local space
4. **Calculate pushback**: Find nearest point and push direction
5. **Transform back**: Rotate pushback vector to world space

#### Math (Rotation Matrix):
```javascript
// To local space (inverse rotation):
localX = (boatX - centerX) * cos(-θ) - (boatZ - centerZ) * sin(-θ)
localZ = (boatX - centerX) * sin(-θ) + (boatZ - centerZ) * cos(-θ)

// To world space (forward rotation):
worldX = localX * cos(θ) + localZ * sin(θ) + centerX
worldZ = -localX * sin(θ) + localZ * cos(θ) + centerZ
```

### 4. Backward Compatibility
The function still supports **axis-aligned rectangles** (old format):
```javascript
if (box.rotation !== undefined) {
  // Use rotated collision
} else {
  // Use axis-aligned collision (legacy)
}
```

## Visual Result

### Before (Axis-Aligned):
```
        North ↑
              |
   ┌──────────────────┐
   │                  │
   │  RED RECTANGLE   │ ← Not rotated
   │  (axis-aligned)  │
   │                  │
   └──────────────────┘
   
But port structure is rotated 180°!
```

### After (Rotated):
```
        North ↑
              |
     ╱──────────────╲
    ╱                ╲
   │  RED RECTANGLE  │ ← ROTATED 180°
   │  (matches port) │
    ╲                ╱
     ╲──────────────╱
   
Port and collision aligned!
```

## Testing the Rotation

### Visual Verification
1. Reload page (F5)
2. Look at red rectangle around port
3. **Should now be rotated** to match port structure
4. Red edges should align with port building edges

### Collision Testing
1. **Approach from North**: Should hit rotated north edge
2. **Approach from South**: Should hit rotated south edge
3. **Approach from East**: Should hit rotated east edge
4. **Approach from West**: Should hit rotated west edge

### Console Output
```
[HarborDocks] ROTATED Collision Rectangle: 500m × 300m, rotation: 180°
```

## Adjusting Rotation

If the rotation doesn't match perfectly, adjust the angle:

### Current Rotation (180° South):
```javascript
rotation: Math.PI,  // 180°
```

### Other Orientations:

#### Facing North (0°):
```javascript
rotation: 0,
```

#### Facing East (90°):
```javascript
rotation: Math.PI / 2,
```

#### Facing West (270°):
```javascript
rotation: Math.PI * 1.5,
```

### Fine-Tuning:

#### Slight clockwise adjustment (10°):
```javascript
rotation: Math.PI + (10 * Math.PI / 180),  // 190°
```

#### Slight counter-clockwise adjustment (10°):
```javascript
rotation: Math.PI - (10 * Math.PI / 180),  // 170°
```

## Performance Impact

### Rotated Collision vs Axis-Aligned

**Axis-Aligned (old):**
- 4 min/max comparisons
- 2 square root operations
- Very fast

**Rotated (new):**
- 4 trigonometric operations (sin/cos)
- 4 min/max comparisons  
- 2 square root operations
- 8 multiplication/addition operations
- Slightly slower, but still very fast

**Verdict:** Negligible performance difference for single collision check per frame.

## Advanced: Multiple Rotation Angles

You can have different collision boxes with different rotations:

```javascript
activeDockColliders = [
  {
    // Main warehouse (180°)
    centerX: portX,
    centerZ: portZ,
    halfWidth: 250,
    halfDepth: 150,
    rotation: Math.PI
  },
  {
    // Side pier (90°)
    centerX: portX + 300,
    centerZ: portZ,
    halfWidth: 50,
    halfDepth: 100,
    rotation: Math.PI / 2
  }
];
```

## Debugging Rotation Issues

### If red rectangle doesn't match port:

1. **Check port rotation**:
```javascript
console.log('Port rotation:', model.rotation.y, 'radians =', 
            (model.rotation.y * 180 / Math.PI), 'degrees');
```

2. **Check collision rotation**:
```javascript
console.log('Collision rotation:', collisionBox.rotation, 'radians =',
            (collisionBox.rotation * 180 / Math.PI), 'degrees');
```

3. **Verify they match**:
```javascript
if (Math.abs(model.rotation.y - collisionBox.rotation) < 0.01) {
  console.log('✅ Rotations match!');
} else {
  console.log('❌ Rotation mismatch!');
}
```

### If collision triggers too early/late:

- Rotation is correct
- Need to adjust `halfWidth` or `halfDepth`
- See previous adjustment guides

## Files Modified
- ✅ `capstone/src/helpers/harborDocks.js` (line ~737) - Added rotation to collision box
- ✅ `capstone/src/helpers/harborDocks.js` (line ~755) - Rotated visualization
- ✅ `capstone/src/helpers/harborDocks.js` (line ~397) - Rewrote collision detection with rotation support

## Summary

**Added:** Full rotated rectangle collision support  
**Rotation:** 180° (matches port facing south)  
**Size:** 500m × 300m rotated rectangle  
**Backward Compatible:** Still supports axis-aligned rectangles  
**Performance:** Negligible impact  

### Key Features:
✅ Collision rectangle rotates with port structure  
✅ Visual red rectangle shows correct rotated bounds  
✅ Accurate collision detection at any rotation angle  
✅ Smooth pushback in rotated local space  
✅ Easy to adjust rotation angle if needed  

**Karon ang collision rectangle NAG-ROTATE na - 180° same as the port! The red rectangle should now match the port structure orientation perfectly!** 🔴🔄🚢⚓

**Refresh (F5) para makita ang ROTATED red rectangle!** 😊
