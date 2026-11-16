import { isBoatInZone } from './missionWaypoints.js';

// Allow a secured hull alongside the pier, including outside its precision berth.
export const PORT_DOCKING_CLEARANCE_METRES = 25;

export function isBoatAtPort(boat, { zones = [], dockColliders = [] } = {}) {
  if (!Number.isFinite(boat?.x) || !Number.isFinite(boat?.z)) return false;
  if (zones.some(zone => (zone.zoneType === 'dock' || zone.id === 'harbor'
    || /port|harbor|return/i.test(zone.label || '')) && isBoatInZone(boat.x, boat.z, zone))) return true;

  const heading = (boat.headingDeg || 0) * Math.PI / 180;
  const length = Math.max(0, boat.length || 0), beam = Math.max(0, boat.beam || length * .18);
  return dockColliders.some(box => {
    const rotated = box.centerX != null && box.rotation != null;
    const centerX = rotated ? box.centerX : (box.minX + box.maxX) / 2;
    const centerZ = rotated ? box.centerZ : (box.minZ + box.maxZ) / 2;
    const halfWidth = rotated ? box.halfWidth : (box.maxX - box.minX) / 2;
    const halfDepth = rotated ? box.halfDepth : (box.maxZ - box.minZ) / 2;
    if (![centerX, centerZ, halfWidth, halfDepth].every(Number.isFinite) || halfWidth < 0 || halfDepth < 0) return false;
    const rotation = rotated ? box.rotation : 0, cos = Math.cos(rotation), sin = Math.sin(rotation);
    const localX = (boat.x - centerX) * cos + (boat.z - centerZ) * sin;
    const localZ = -(boat.x - centerX) * sin + (boat.z - centerZ) * cos;
    const dx = localX - Math.max(-halfWidth, Math.min(halfWidth, localX));
    const dz = localZ - Math.max(-halfDepth, Math.min(halfDepth, localZ));
    const distance = Math.hypot(dx, dz);
    if (distance === 0) return true;
    const nx = (dx * cos - dz * sin) / distance, nz = (dx * sin + dz * cos) / distance;
    const hullExtent = Math.abs(nx * Math.sin(heading) - nz * Math.cos(heading)) * length / 2
      + Math.abs(nx * Math.cos(heading) + nz * Math.sin(heading)) * beam / 2;
    return distance <= PORT_DOCKING_CLEARANCE_METRES + hullExtent;
  });
}
