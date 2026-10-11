import * as THREE from 'three';
import {
  generateDavaoGulfTerrain,
  collectTerrainFootprints as collectProceduralFootprints,
  TERRAIN_CONFIG,
} from './terrainGenerator.js';
import { getCachedHeightmapSync, sampleHeightmapElevation } from './terrainHeightmap.js';

export const OCEAN_MAP_HALF_EXTENT = 30000; // Increased for Davao Gulf (~60km span)
export const ISLAND_PROXIMITY_MARGIN = 14;

const ISLAND_GLB = new URL('./tropical_island/scene.gltf', import.meta.url).href;
const DAVAO_GULF_GLB = '/assets/terrain/Davao_Gulf.glb';

// Use the Davao Gulf GLB as primary terrain; procedural as fallback
export const USE_PROCEDURAL_TERRAIN = true;

/** Island colliders — terrain only (no skybox / palms / huge LOD shells). */
const islandBoxes = [];

const _box = new THREE.Box3();
const _size = new THREE.Vector3();

/**
 * @param {THREE.Object3D} node
 */
function isGhostIslandMesh(node) {
  const name = (node.name || '').toLowerCase();
  if (/skybox|sky_|_sky|cloud|fogmesh|atmosphere|dome/i.test(name)) return true;
  if (/armature|bone|_joint|line|points/i.test(name)) return true;
  return false;
}

/**
 * Colliders only on main land mass — not palms, sky, or oversized shells.
 * @param {THREE.Object3D} node
 */
function isTerrainColliderMesh(node) {
  if (!node.isMesh || !node.geometry) return false;
  if (isGhostIslandMesh(node)) return false;

  const name = (node.name || '').toLowerCase();
  if (/palm|palme|blaetter|lod|cat_|areca|tropical_palm|treibholz/i.test(name)) {
    return false;
  }

  _box.setFromObject(node);
  _box.getSize(_size);
  const maxDim = Math.max(_size.x, _size.y, _size.z);
  if (maxDim > 220) return false;

  if (/beach|rock|root|sand|terrain|island|baked|material\.001/i.test(name)) {
    return true;
  }

  const footprint = Math.max(_size.x, _size.z);
  return footprint >= 6 && _size.y <= footprint * 0.85;
}

/**
 * @param {THREE.Object3D} root
 */
function stripGhostIslandContent(root) {
  root.traverse((node) => {
    if (isGhostIslandMesh(node)) {
      node.visible = false;
      return;
    }

    if (!node.isMesh) return;

    const name = (node.name || '').toLowerCase();
    if (/skybox|sky/i.test(name)) {
      node.visible = false;
      return;
    }

    _box.setFromObject(node);
    _box.getSize(_size);
    const maxDim = Math.max(_size.x, _size.y, _size.z);
    if (maxDim > 280) {
      node.visible = false;
      return;
    }

    const mats = Array.isArray(node.material) ? node.material : [node.material];
    const allInvisible = mats.every((mat) => mat && mat.transparent && mat.opacity < 0.08);
    if (allInvisible) {
      node.visible = false;
    }
  });
}

function rebuildIslandBoxes(islandGroup) {
  islandBoxes.length = 0;
  if (!islandGroup) return;

  islandGroup.updateMatrixWorld(true);
  islandGroup.traverse((node) => {
    if (!isTerrainColliderMesh(node)) return;
    const box = new THREE.Box3().setFromObject(node);
    if (box.isEmpty()) return;
    box.expandByScalar(4);
    islandBoxes.push(box);
  });
}

/** Same as rebuildIslandBoxes but accepts meshes of any size (for large terrain GLBs). */
function rebuildIslandBoxesLarge(islandGroup) {
  islandBoxes.length = 0;
  if (!islandGroup) return;

  islandGroup.updateMatrixWorld(true);
  islandGroup.traverse((node) => {
    if (!node.isMesh || !node.visible || !node.geometry) return;
    const name = (node.name || '').toLowerCase();
    if (/skybox|sky_|_sky|cloud|atmosphere|dome/i.test(name)) return;
    const box = new THREE.Box3().setFromObject(node);
    if (box.isEmpty()) return;
    box.expandByScalar(4);
    islandBoxes.push(box);
  });
}

/**
/**
 * Apply elevation-based realistic materials to all terrain meshes in the group.
 * Low = sandy beach, mid = tropical forest green, high = rocky brown.
 */
function applyRealisticTerrainMaterials(group) {
  const _worldPos = new THREE.Vector3();

  const matSand   = new THREE.MeshStandardMaterial({ color: 0xc2a96e, roughness: 0.9, metalness: 0.0 });
  const matGrass  = new THREE.MeshStandardMaterial({ color: 0x4a7c35, roughness: 0.85, metalness: 0.0 });
  const matForest = new THREE.MeshStandardMaterial({ color: 0x2d5a1b, roughness: 0.88, metalness: 0.0 });
  const matRock   = new THREE.MeshStandardMaterial({ color: 0x7a6652, roughness: 0.95, metalness: 0.05 });
  const matPeak   = new THREE.MeshStandardMaterial({ color: 0x9e8a78, roughness: 0.92, metalness: 0.03 });

  group.updateMatrixWorld(true);
  group.traverse((node) => {
    if (!node.isMesh) return;
    node.getWorldPosition(_worldPos);
    const y = _worldPos.y;

    if (y < 2)        node.material = matSand;
    else if (y < 12)  node.material = matGrass;
    else if (y < 30)  node.material = matForest;
    else if (y < 60)  node.material = matRock;
    else              node.material = matPeak;

    node.castShadow = true;
    node.receiveShadow = true;
  });
}

 /**
 * @param {import('three/examples/jsm/loaders/GLTFLoader.js').GLTFLoader} gltfLoader
 * @param {Object} options - Configuration options
 * @param {boolean} options.useProcedural - Use procedural terrain instead of GLTF
 * @returns {Promise<THREE.Group>}
 */
export async function loadArchipelago(gltfLoader, options = {}) {
  const useProcedural = options.useProcedural !== undefined ? options.useProcedural : USE_PROCEDURAL_TERRAIN;

  // Procedural Davao Gulf terrain (primary when USE_PROCEDURAL_TERRAIN = true)
  if (useProcedural) {
    try {
      const terrainGroup = await generateDavaoGulfTerrain();
      return terrainGroup;
    } catch (error) {
      console.warn('[worldIslands] Procedural terrain failed, falling back to legacy GLTF:', error);
    }
  }

  // Legacy tropical island GLTF as last resort
  return new Promise((resolve, reject) => {
    gltfLoader.load(
      ISLAND_GLB,
      (gltf) => {
        const group = new THREE.Group();
        group.name = 'Archipelago';

        const island = gltf.scene;
        island.scale.set(2.2, 2.2, 2.2);
        island.position.set(-420, -1.5, 80);
        island.rotation.y = 0.35;

        stripGhostIslandContent(island);

        island.traverse((child) => {
          if (!child.isMesh || !child.visible) return;
          child.castShadow = true;
          child.receiveShadow = true;
        });

        group.add(island);
        rebuildIslandBoxes(group);
        resolve(group);
      },
      undefined,
      reject
    );
  });
}

/** Load Davao_Gulf.glb and apply realistic terrain materials. */
function loadDavaoGulfGlb(gltfLoader) {
  return new Promise((resolve, reject) => {
    console.info('[worldIslands] Loading Davao_Gulf.glb…');
    gltfLoader.load(
      DAVAO_GULF_GLB,
      (gltf) => {
        console.info('[worldIslands] Davao_Gulf.glb parsed, setting up scene…');
        const group = new THREE.Group();
        group.name = 'Archipelago';
        // Use bounding-box collision (not heightmap) for GLB terrain
        group.userData.isDavaoGulfTerrain = true;
        group.userData.isProceduralTerrain = false;

        const terrain = gltf.scene;

        // Enable shadows on every mesh — skip the size-based ghost filter
        // which would incorrectly hide large terrain geometry
        terrain.traverse((child) => {
          if (!child.isMesh) return;
          child.castShadow = true;
          child.receiveShadow = true;
          child.visible = true;
          // Remove sky/atmosphere objects only
          const name = (child.name || '').toLowerCase();
          if (/skybox|sky_|_sky|cloud|atmosphere|dome/i.test(name)) {
            child.visible = false;
          }
        });

        // Centre the terrain's XZ footprint on the world origin
        const bbox = new THREE.Box3().setFromObject(terrain);
        if (!bbox.isEmpty()) {
          const center = new THREE.Vector3();
          bbox.getCenter(center);
          const size = new THREE.Vector3();
          bbox.getSize(size);
          console.info(`[worldIslands] GLB bounds: ${size.x.toFixed(1)} × ${size.y.toFixed(1)} × ${size.z.toFixed(1)}`);

          // If the model is very small (< 1000 units wide), scale it up to a realistic size
          const maxDim = Math.max(size.x, size.z);
          if (maxDim > 0 && maxDim < 1000) {
            const targetWidth = 12000; // ~12km wide terrain footprint
            const scaleFactor = targetWidth / maxDim;
            terrain.scale.setScalar(scaleFactor);
            console.info(`[worldIslands] Scaled terrain by ${scaleFactor.toFixed(2)}×`);
          }

          // Re-compute bounds after potential scale, then centre XZ only.
          // Keep position.y = 0 so the model's sea-level (Y=0) stays at world Y=0.
          // Using -min.y caused the terrain to float into the sky whenever the model
          // had below-sea-level (negative-Y) geometry.
          const scaledBBox = new THREE.Box3().setFromObject(terrain);
          scaledBBox.getCenter(center);
          terrain.position.set(-center.x, 0, -center.z);
        }

        applyRealisticTerrainMaterials(terrain);

        group.add(terrain);
        // Rebuild island boxes using a relaxed size limit for large terrain meshes
        rebuildIslandBoxesLarge(group);
        console.info('[worldIslands] Davao_Gulf.glb loaded successfully');
        resolve(group);
      },
      undefined,
      reject
    );
  });
}

/** Shared mission and Quick Sail heading: bow +X rotates toward north (0° on the compass). */
export function getDefaultSimHeading() {
  return Math.PI / 2;
}

/**
 * @param {number} x
 * @param {number} z
 * @param {THREE.Object3D} islandGroup
 */
export function resolveIslandCollisionAccurate(x, z, islandGroup) {
  if (!islandGroup) return { collided: false, x, z };

  if (islandGroup.userData?.isProceduralTerrain) {
    const cache = getCachedHeightmapSync();
    if (!cache) {
      console.warn('[Shore Collision] ❌ Heightmap cache not loaded! Cannot detect land.');
      return { collided: false, x, z };
    }

    const elev = sampleHeightmapElevation(cache, x, z);
    // REDUCED THRESHOLD: 0.10m instead of 0.35m for more aggressive land detection
    // This catches beaches and shallow shore areas
    const waterThreshold = TERRAIN_CONFIG.waterY + 0.10;
    
    // DEBUG LOGGING - Show every check
    console.log('[Shore Collision Check]', {
      boatPos: `(${x.toFixed(1)}, ${z.toFixed(1)})`,
      elevation: elev.toFixed(2) + 'm',
      waterLevel: TERRAIN_CONFIG.waterY + 'm',
      threshold: waterThreshold.toFixed(2) + 'm',
      isLand: elev > waterThreshold,
      result: elev > waterThreshold ? '🚫 COLLISION!' : '✅ Water - OK'
    });
    
    if (elev <= waterThreshold) {
      return { collided: false, x, z };
    }

    // COLLISION DETECTED: Boat is on land!
    // Calculate terrain gradient to find the direction away from shore
    const eps = 8;
    const ex = sampleHeightmapElevation(cache, x + eps, z);
    const ez = sampleHeightmapElevation(cache, x, z + eps);
    const gx = (sampleHeightmapElevation(cache, x - eps, z) - ex) / (2 * eps);
    const gz = (sampleHeightmapElevation(cache, x, z - eps) - ez) / (2 * eps);
    const len = Math.hypot(gx, gz) || 1;
    
    // INCREASED PUSH: 30m instead of 22m for stronger pushback
    const push = 30;
    
    const newX = x + (gx / len) * push;
    const newZ = z + (gz / len) * push;
    
    console.warn('[Shore Collision] ⚠️ PUSHING BOAT BACK FROM LAND!', {
      elevation: elev.toFixed(2) + 'm',
      pushDistance: push + 'm',
      from: `(${x.toFixed(1)}, ${z.toFixed(1)})`,
      to: `(${newX.toFixed(1)}, ${newZ.toFixed(1)})`
    });
    
    return {
      collided: true,
      x: newX,
      z: newZ,
    };
  }

  if (islandBoxes.length === 0) {
    rebuildIslandBoxes(islandGroup);
  }

  const point = new THREE.Vector3(x, 0, z);
  for (const box of islandBoxes) {
    if (box.containsPoint(point)) {
      const center = new THREE.Vector3();
      box.getCenter(center);
      const dx = x - center.x;
      const dz = z - center.z;
      const len = Math.hypot(dx, dz) || 1;
      const push = Math.max(box.max.x - box.min.x, box.max.z - box.min.z) * 0.55;
      return {
        collided: true,
        x: center.x + (dx / len) * push,
        z: center.z + (dz / len) * push
      };
    }
  }
  return { collided: false, x, z };
}

/**
 * @param {number} x
 * @param {number} z
 * @param {THREE.Object3D} islandGroup
 */
export function distanceToNearestIslandShore(x, z, islandGroup) {
  if (!islandGroup || islandBoxes.length === 0) {
    rebuildIslandBoxes(islandGroup);
  }
  if (islandBoxes.length === 0) return Infinity;

  const point = new THREE.Vector3(x, 0, z);
  let minDist = Infinity;

  for (const box of islandBoxes) {
    const clamped = new THREE.Vector3(
      THREE.MathUtils.clamp(x, box.min.x, box.max.x),
      0,
      THREE.MathUtils.clamp(z, box.min.z, box.max.z)
    );
    if (box.containsPoint(point)) return 0;
    minDist = Math.min(minDist, point.distanceTo(clamped));
  }
  return minDist;
}

/**
 * @param {number} x
 * @param {number} z
 */
export function clampToOceanBounds(x, z) {
  const limit = OCEAN_MAP_HALF_EXTENT * 0.95;
  return {
    x: THREE.MathUtils.clamp(x, -limit, limit),
    z: THREE.MathUtils.clamp(z, -limit, limit)
  };
}

/** Footprint rectangles for the navigation chart (from terrain colliders). */
export function collectIslandChartFootprints(islandGroup) {
  // Check if this is procedural terrain
  if (islandGroup && islandGroup.userData?.isProceduralTerrain) {
    return collectProceduralFootprints(islandGroup);
  }

  // Original GLTF-based footprint collection
  rebuildIslandBoxes(islandGroup);
  if (!islandBoxes.length && islandGroup) {
    const box = new THREE.Box3().setFromObject(islandGroup);
    if (!box.isEmpty()) {
      return [
        {
          label: 'Island',
          minX: box.min.x,
          maxX: box.max.x,
          minZ: box.min.z,
          maxZ: box.max.z
        }
      ];
    }
    return [];
  }

  return islandBoxes.map((box, index) => ({
    label: index === 0 ? 'Island' : `Land ${index + 1}`,
    minX: box.min.x,
    maxX: box.max.x,
    minZ: box.min.z,
    maxZ: box.max.z
  }));
}
