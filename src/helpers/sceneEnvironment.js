import * as THREE from 'three';

/** World-space water surface height (meters). */
export const SCENE_WATERLINE_Y = 0;

/**
 * Davao mainland wharf approach (Region XI).
 * Route runs from channel origin offshore → coast target; pier sits near the target.
 * Formula: worldX = (lon - 125.7) * 111300,  worldZ = (lat - 7.1) * 111200
 * Sasa Port: 7.099°N 125.648°E → x:-5786  z:-111
 * Sta. Ana:  7.068°N 125.637°E → x:-7011  z:-3558
 * ICTSI:     7.085°N 125.641°E → x:-6522  z:-1668
 */
export const HARBOR_CHANNEL_ORIGIN = { x: -5500, z: -890 };  // offshore bay approach E of Sasa
export const HARBOR_COAST_TARGET   = { x: -7000, z: -890 };  // Sasa Wharf (7.092°N 125.637°E)

/** Samal Strait — open water with coastlines visible on both sides. */
export const SAMAL_STRAIT_SPAWN = { x: 8200, z: -4200 };

/** Boat spawn (updated when islands / harbor docks load). */
export const SIMULATION_SPAWN = { x: SAMAL_STRAIT_SPAWN.x, z: SAMAL_STRAIT_SPAWN.z };

export const SPAWN_CLEARANCE_FROM_PIER_M = 120;

/**
 * @param {number} compassHeadingDeg — 0° = north, 90° = east (matches HUD compass).
 * @returns {number} Y rotation for boat (bow +X in world space).
 */
export function compassHeadingToBoatRotation(compassHeadingDeg) {
  return ((90 - compassHeadingDeg) * Math.PI) / 180;
}

/**
 * Place spawn alongside the harbor berth.
 * @param {{ x: number, z: number, berthHeadingDeg?: number }} berth
 */
export function applySpawnAtBerth(berth) {
  if (berth?.x == null || berth?.z == null) return null;

  SIMULATION_SPAWN.x = berth.x;
  SIMULATION_SPAWN.z = berth.z;
  return {
    x: berth.x,
    z: berth.z,
    headingRad: compassHeadingToBoatRotation(berth.berthHeadingDeg ?? 90),
  };
}

/** Keep the port as the mission origin, with extra seaward room for a large hull. */
export function getBoatDepartureSpawn(berth, length, headingRad, beam = length * 0.18) {
  const origin = berth ?? SIMULATION_SPAWN;
  if (!berth || length < 120) return { x: origin.x, z: origin.z };
  const berthYaw = compassHeadingToBoatRotation(berth.berthHeadingDeg ?? 90);
  const rawX = berth.seawardX ?? Math.cos(berthYaw);
  const rawZ = berth.seawardZ ?? -Math.sin(berthYaw);
  const magnitude = Math.hypot(rawX, rawZ) || 1;
  const nx = rawX / magnitude, nz = rawZ / magnitude;
  const along = Math.abs(nx * Math.cos(headingRad) - nz * Math.sin(headingRad));
  const across = Math.abs(nx * Math.sin(headingRad) + nz * Math.cos(headingRad));
  const hullExtent = length * 0.5 * along + beam * 0.5 * across;
  const clearance = Math.max(50, hullExtent + 20);
  return { x: origin.x + nx * clearance, z: origin.z + nz * clearance };
}

/**
 * Pick spawn on open water near the archipelago / gulf features.
 * @param {THREE.Object3D} islandGroup
 * @param {boolean} isProceduralTerrain
 * @returns {{ x: number, z: number }}
 */
export function updateSimulationSpawn(islandGroup, isProceduralTerrain = false) {
  if (isProceduralTerrain) {
    SIMULATION_SPAWN.x = SAMAL_STRAIT_SPAWN.x;
    SIMULATION_SPAWN.z = SAMAL_STRAIT_SPAWN.z;
    return { x: SIMULATION_SPAWN.x, z: SIMULATION_SPAWN.z };
  }

  if (!islandGroup) {
    return { x: SIMULATION_SPAWN.x, z: SIMULATION_SPAWN.z };
  }

  const box = new THREE.Box3().setFromObject(islandGroup);
  if (box.isEmpty()) {
    return { x: SIMULATION_SPAWN.x, z: SIMULATION_SPAWN.z };
  }

  const center = new THREE.Vector3();
  box.getCenter(center);

  const baseX = box.max.x + 250;
  const baseZ = center.z;
  const targetX = box.max.x + 32;
  const targetZ = center.z;

  const dx = targetX - baseX;
  const dz = targetZ - baseZ;
  const dist = Math.hypot(dx, dz) || 180;
  const ux = dx / dist;
  const uz = dz / dist;

  SIMULATION_SPAWN.x = baseX - ux * SPAWN_CLEARANCE_FROM_PIER_M;
  SIMULATION_SPAWN.z = baseZ - uz * SPAWN_CLEARANCE_FROM_PIER_M;

  return { x: SIMULATION_SPAWN.x, z: SIMULATION_SPAWN.z };
}
