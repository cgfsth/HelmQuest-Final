import * as THREE from 'three';
import { getCachedHeightmapSync, sampleHeightmapElevation, WORLD_WIDTH, WORLD_HEIGHT } from './terrainHeightmap.js';

export const BUOY_SHORE_CLEARANCE_M = 600;
export const BUOY_MIN_PORT_DISTANCES_M = [3000, 4000, 5000];
export const BUOY_MIN_SPACING_M = 1000;

/** Check the whole approach area around a buoy, using the terrain loaded in the scene. */
export function createBuoyWaterCheck(islandGroup, dockColliders = [], clearance = BUOY_SHORE_CLEARANCE_M) {
  const procedural = islandGroup?.userData?.isProceduralTerrain === true;
  const cache = procedural ? islandGroup.userData.tileManager?.cache ?? getCachedHeightmapSync() : null;
  const terrainMeshes = [];
  const ray = new THREE.Raycaster();
  if (islandGroup && !cache) {
    islandGroup.updateMatrixWorld(true);
    islandGroup.traverse(node => {
      if (!node.isMesh || !node.visible || !node.geometry || /sky|cloud|water|palm|foliage/i.test(node.name)) return;
      terrainMeshes.push({ mesh: node, box: new THREE.Box3().setFromObject(node) });
    });
  }

  const samples = [[0, 0]];
  // Sample the interior as well as the edge, so coves and small land patches are excluded.
  const step = 80;
  for (let dx = -clearance + step; dx < clearance; dx += step) {
    for (let dz = -clearance + step; dz < clearance; dz += step) {
      if (dx * dx + dz * dz < clearance * clearance) samples.push([dx, dz]);
    }
  }
  for (let i = 0; i < 24; i++) {
    const angle = i * Math.PI / 12;
    samples.push([Math.cos(angle) * clearance, Math.sin(angle) * clearance]);
  }

  const waterAt = (x, z) => {
    const halfWidth = cache ? WORLD_WIDTH / 2 : 28500;
    const halfHeight = cache ? WORLD_HEIGHT / 2 : 28500;
    if (Math.abs(x) >= halfWidth || Math.abs(z) >= halfHeight) return false;
    if (cache) return sampleHeightmapElevation(cache, x, z) <= -2;
    ray.set(new THREE.Vector3(x, 10000, z), new THREE.Vector3(0, -1, 0));
    const meshes = terrainMeshes.filter(({ box }) => x >= box.min.x && x <= box.max.x && z >= box.min.z && z <= box.max.z).map(({ mesh }) => mesh);
    return !ray.intersectObjects(meshes, false).some(hit => hit.point.y >= -2);
  };

  return (x, z) => {
    if (!Number.isFinite(x) || !Number.isFinite(z)) return false;
    for (const collider of dockColliders) {
      const dx = x - collider.centerX;
      const dz = z - collider.centerZ;
      const cos = Math.cos(collider.rotation ?? 0);
      const sin = Math.sin(collider.rotation ?? 0);
      const localX = dx * cos + dz * sin;
      const localZ = -dx * sin + dz * cos;
      if (Math.abs(localX) <= collider.halfWidth + clearance && Math.abs(localZ) <= collider.halfDepth + clearance) return false;
    }
    return samples.every(([dx, dz]) => waterAt(x + dx, z + dz));
  };
}

const isDockZone = zone => zone.shape === 'berth' || zone.zoneType?.includes('dock');
const placementCache = new WeakMap();
const openOcean = {};

/** Place mission buoys at longer training distances, with clear water around each target. */
export function placeMissionBuoysOffshore(zones, islandGroup, dockColliders = [], origin = { x: 0, z: 0 }) {
  // HUD/radar consumers resolve zones every frame. Search only when the layout, dock or terrain changes.
  const terrainKey = islandGroup ?? openOcean;
  const heightmap = islandGroup?.userData?.isProceduralTerrain
    ? islandGroup.userData.tileManager?.cache ?? getCachedHeightmapSync() : null;
  const key = JSON.stringify([
    origin.x, origin.z,
    zones.map(zone => [zone.x, zone.z, zone.radius, zone.zoneType, zone.shape]),
    dockColliders.map(dock => [dock.centerX, dock.centerZ, dock.halfWidth, dock.halfDepth, dock.rotation]),
    islandGroup?.position.toArray(), islandGroup?.rotation.toArray(), islandGroup?.scale.toArray(),
  ]);
  const cached = placementCache.get(terrainKey);
  if (cached?.key === key && cached.heightmap === heightmap) {
    return zones.map((zone, index) => cached.positions[index] ? { ...zone, ...cached.positions[index] } : zone);
  }
  const clearance = Math.max(BUOY_SHORE_CLEARANCE_M, ...zones.filter(zone => !isDockZone(zone)).map(zone => (zone.radius ?? 40) + 80));
  const isWater = createBuoyWaterCheck(islandGroup, dockColliders, clearance);
  const minimumDistances = new Map(zones.filter(zone => !isDockZone(zone)).map((zone, index) => [
    zone, BUOY_MIN_PORT_DISTANCES_M[Math.min(index, BUOY_MIN_PORT_DISTANCES_M.length - 1)],
  ]));
  const occupied = [];
  const atTrainingDistance = (zone, x, z) => Math.hypot(x - origin.x, z - origin.z) >= minimumDistances.get(zone) + (zone.radius ?? 40);
  const separated = (zone, x, z) => occupied.every(other => Math.hypot(other.x - x, other.z - z) >= Math.max(BUOY_MIN_SPACING_M, (other.radius ?? 40) + (zone.radius ?? 40) + 80));
  const safe = new Set();
  for (const zone of zones) {
    if (isDockZone(zone) || !atTrainingDistance(zone, zone.x, zone.z) || !separated(zone, zone.x, zone.z) || !isWater(zone.x, zone.z)) continue;
    safe.add(zone);
    occupied.push(zone);
  }

  const placedZones = zones.map(zone => {
    if (isDockZone(zone) || safe.has(zone)) return zone;
    const dx = Number.isFinite(zone.x) ? zone.x - origin.x : 0;
    const dz = Number.isFinite(zone.z) ? zone.z - origin.z : -1;
    const currentDistance = Math.hypot(dx, dz);
    const bearing = currentDistance > 0 ? Math.atan2(dz, dx) : -Math.PI / 2;
    const targetDistance = Math.max(currentDistance, minimumDistances.get(zone) + (zone.radius ?? 40) + 60);
    const baseX = origin.x + Math.cos(bearing) * targetDistance;
    const baseZ = origin.z + Math.sin(bearing) * targetDistance;
    const accept = (x, z) => {
      if (!atTrainingDistance(zone, x, z) || !separated(zone, x, z) || !isWater(x, z)) return null;
      const placed = { ...zone, x, z };
      occupied.push(placed);
      return placed;
    };
    const preferred = accept(baseX, baseZ);
    if (preferred) return preferred;
    const towardDeparture = Math.atan2(origin.z - baseZ, origin.x - baseX);
    for (let distance = 120; distance <= 24000; distance += 120) {
      const count = Math.min(128, Math.max(16, Math.ceil(2 * Math.PI * distance / 120)));
      for (let i = 0; i < count; i++) {
        const angle = towardDeparture + i * 2 * Math.PI / count;
        const x = baseX + Math.cos(angle) * distance;
        const z = baseZ + Math.sin(angle) * distance;
        const placed = accept(x, z);
        if (placed) return placed;
      }
    }
    throw new Error(`No clear water location found for mission buoy ${zone.id}.`);
  });
  placementCache.set(terrainKey, {
    key, heightmap,
    positions: placedZones.map((zone, index) => zone === zones[index] ? null : { x: zone.x, z: zone.z }),
  });
  return placedZones;
}
