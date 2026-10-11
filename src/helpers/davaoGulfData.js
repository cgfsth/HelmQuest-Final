import * as THREE from 'three';

// Fixed origin for Region XI (Davao Gulf center)
const ORIGIN = { lat: 7.1, lon: 125.7 };

/**
 * Projects GPS coordinates to world coordinates using fixed origin.
 * Uses Earth radius for accurate projection, scaled to kilometers.
 * 
 * @param {number} lat - Latitude
 * @param {number} lon - Longitude
 * @returns {{ x: number, z: number }}
 */
export function gpsToWorld(lat, lon) {
  const R = 6371000; // Earth radius in meters

  const x = (lon - ORIGIN.lon) * Math.PI / 180 * R;
  const z = (lat - ORIGIN.lat) * Math.PI / 180 * R;

  return { x: x * 0.001, z: z * 0.001 }; // Convert to kilometers
}

/**
 * Unprojects world coordinates back to GPS coordinates.
 * 
 * @param {number} x - World X coordinate (kilometers)
 * @param {number} z - World Z coordinate (kilometers)
 * @returns {{ lat: number, lon: number }}
 */
export function worldToGps(x, z) {
  const R = 6371000; // Earth radius in meters

  // Convert from kilometers back to meters
  const xMeters = x / 0.001;
  const zMeters = z / 0.001;

  const lon = ORIGIN.lon + (xMeters / R) * 180 / Math.PI;
  const lat = ORIGIN.lat + (zMeters / R) * 180 / Math.PI;

  return { lat, lon };
}

// 1. Samal Island (IGACOS) - Enhanced with higher resolution
export const SAMAL_ISLAND = [
  { lat: 7.185, lon: 125.735, elev: 45 }, // NW tip
  { lat: 7.190, lon: 125.742, elev: 52 },
  { lat: 7.195, lon: 125.748, elev: 58 }, // North tip
  { lat: 7.182, lon: 125.760, elev: 42 },
  { lat: 7.168, lon: 125.772, elev: 38 },
  { lat: 7.152, lon: 125.784, elev: 35 },
  { lat: 7.135, lon: 125.795, elev: 32 },
  { lat: 7.118, lon: 125.808, elev: 28 },
  { lat: 7.098, lon: 125.820, elev: 25 }, // East coast (Balet)
  { lat: 7.078, lon: 125.832, elev: 22 },
  { lat: 7.052, lon: 125.845, elev: 18 }, // East coast (Peñaplata side)
  { lat: 7.030, lon: 125.848, elev: 15 },
  { lat: 7.008, lon: 125.848, elev: 12 },
  { lat: 6.988, lon: 125.842, elev: 10 },
  { lat: 6.965, lon: 125.835, elev: 8 },
  { lat: 6.948, lon: 125.820, elev: 12 },
  { lat: 6.928, lon: 125.805, elev: 15 }, // SE tip
  { lat: 6.918, lon: 125.798, elev: 18 },
  { lat: 6.908, lon: 125.792, elev: 22 }, // Southern tip
  { lat: 6.912, lon: 125.784, elev: 25 },
  { lat: 6.915, lon: 125.775, elev: 28 },
  { lat: 6.928, lon: 125.765, elev: 32 },
  { lat: 6.945, lon: 125.755, elev: 35 },
  { lat: 6.960, lon: 125.746, elev: 38 },
  { lat: 6.975, lon: 125.738, elev: 42 }, // West coast (Kaputian)
  { lat: 6.990, lon: 125.734, elev: 38 },
  { lat: 7.005, lon: 125.732, elev: 35 },
  { lat: 7.020, lon: 125.728, elev: 32 },
  { lat: 7.035, lon: 125.728, elev: 28 },
  { lat: 7.048, lon: 125.702, elev: 25 },
  { lat: 7.065, lon: 125.675, elev: 22 }, // West protrusion (Babak)
  { lat: 7.078, lon: 125.686, elev: 25 },
  { lat: 7.095, lon: 125.698, elev: 28 },
  { lat: 7.112, lon: 125.704, elev: 32 },
  { lat: 7.132, lon: 125.712, elev: 35 },
  { lat: 7.148, lon: 125.716, elev: 38 },
  { lat: 7.165, lon: 125.722, elev: 42 }
];

// 2. Talikud Island - Enhanced with higher resolution
export const TALIKUD_ISLAND = [
  { lat: 6.960, lon: 125.685, elev: 35 }, // North tip
  { lat: 6.952, lon: 125.694, elev: 32 },
  { lat: 6.945, lon: 125.702, elev: 28 }, // East side
  { lat: 6.932, lon: 125.702, elev: 25 },
  { lat: 6.915, lon: 125.698, elev: 22 },
  { lat: 6.902, lon: 125.686, elev: 18 },
  { lat: 6.888, lon: 125.675, elev: 15 }, // South tip
  { lat: 6.890, lon: 125.664, elev: 18 },
  { lat: 6.895, lon: 125.652, elev: 22 }, // West side
  { lat: 6.906, lon: 125.648, elev: 25 },
  { lat: 6.920, lon: 125.648, elev: 28 },
  { lat: 6.934, lon: 125.654, elev: 32 },
  { lat: 6.948, lon: 125.665, elev: 35 }
];

// 3. West Mainland (Davao City Coastline, Carmen, Panabo, Digos) - Enhanced with higher resolution
export const WEST_MAINLAND = [
  { lat: 6.400, lon: 125.380, elev: 8 }, // Southernmost West coast
  { lat: 6.475, lon: 125.365, elev: 12 },
  { lat: 6.550, lon: 125.350, elev: 15 }, // Padada
  { lat: 6.625, lon: 125.352, elev: 18 },
  { lat: 6.688, lon: 125.358, elev: 22 },
  { lat: 6.750, lon: 125.360, elev: 25 }, // Digos
  { lat: 6.815, lon: 125.378, elev: 28 },
  { lat: 6.880, lon: 125.400, elev: 32 }, // Santa Cruz
  { lat: 6.930, lon: 125.414, elev: 35 },
  { lat: 6.980, lon: 125.430, elev: 38 }, // Toril
  { lat: 7.005, lon: 125.454, elev: 42 },
  { lat: 7.030, lon: 125.480, elev: 45 }, // Talomo
  { lat: 7.050, lon: 125.520, elev: 48 },
  { lat: 7.070, lon: 125.560, elev: 52 }, // Davao City downtown
  { lat: 7.092, lon: 125.598, elev: 48 },
  { lat: 7.115, lon: 125.635, elev: 45 }, // Lanang
  { lat: 7.135, lon: 125.648, elev: 42 },
  { lat: 7.155, lon: 125.662, elev: 38 }, // Sasa
  { lat: 7.182, lon: 125.672, elev: 35 },
  { lat: 7.208, lon: 125.682, elev: 32 }, // Panabo
  { lat: 7.242, lon: 125.698, elev: 28 },
  { lat: 7.275, lon: 125.715, elev: 25 }, // Carmen
  { lat: 7.310, lon: 125.758, elev: 22 },
  { lat: 7.345, lon: 125.805, elev: 18 }, // Tagum City
  { lat: 7.356, lon: 125.828, elev: 15 },
  { lat: 7.368, lon: 125.850, elev: 12 }  // Maco (connection to East Mainland)
  // Removed large closing lines that extend far inland
];

// 4. East Mainland (Pantukan, Lupon, Governor Generoso, Cape San Agustin) - Enhanced with higher resolution
export const EAST_MAINLAND = [
  { lat: 7.368, lon: 125.850, elev: 12 }, // Connection point
  { lat: 7.345, lon: 125.868, elev: 15 },
  { lat: 7.322, lon: 125.885, elev: 18 },
  { lat: 7.284, lon: 125.904, elev: 22 },
  { lat: 7.245, lon: 125.922, elev: 25 }, // Pantukan
  { lat: 7.180, lon: 125.942, elev: 28 },
  { lat: 7.115, lon: 125.962, elev: 32 },
  { lat: 7.050, lon: 125.975, elev: 35 },
  { lat: 6.985, lon: 125.988, elev: 38 }, // Lupon
  { lat: 6.918, lon: 126.006, elev: 42 },
  { lat: 6.852, lon: 126.025, elev: 45 },
  { lat: 6.788, lon: 126.044, elev: 48 },
  { lat: 6.722, lon: 126.062, elev: 52 }, // Governor Generoso
  { lat: 6.652, lon: 126.074, elev: 48 },
  { lat: 6.582, lon: 126.085, elev: 45 },
  { lat: 6.502, lon: 126.110, elev: 42 },
  { lat: 6.422, lon: 126.135, elev: 38 },
  { lat: 6.368, lon: 126.160, elev: 35 },
  { lat: 6.315, lon: 126.185, elev: 32 }, // Lavigan
  { lat: 6.290, lon: 126.190, elev: 28 },
  { lat: 6.265, lon: 126.195, elev: 25 }  // Cape San Agustin tip
  // Removed large closing lines that extend far inland
];

// Combine all land polygons for collision and rendering
export const ALL_POLYGONS = [
  { name: 'Samal Island', coords: SAMAL_ISLAND },
  { name: 'Talikud Island', coords: TALIKUD_ISLAND },
  { name: 'West Mainland', coords: WEST_MAINLAND },
  { name: 'East Mainland', coords: EAST_MAINLAND }
];

/**
 * Standard Raycasting algorithm for point-in-polygon checks.
 */
export function isPointInPolygon(lat, lon, polygon) {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].lat, yi = polygon[i].lon;
    const xj = polygon[j].lat, yj = polygon[j].lon;
    const intersect = ((yi > lon) !== (yj > lon))
        && (lat < (xj - xi) * (lon - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

/**
 * Check if a coordinate is inside any of the georeferenced landmasses.
 */
export function isPointInLand(lat, lon) {
  for (const poly of ALL_POLYGONS) {
    if (isPointInPolygon(lat, lon, poly.coords)) {
      return true;
    }
  }
  return false;
}

/**
 * Find the nearest point on any coastline segment to the boat, in meters.
 * 
 * @param {number} x - Boat world X
 * @param {number} z - Boat world Z
 * @returns {{ x: number, z: number, distance: number, normalX: number, normalZ: number }}
 */
export function getNearestCoastlinePoint(x, z) {
  const gps = worldToGps(x, z);
  let minDistance = Infinity;
  let nearestPt = { x: x, z: z };
  let normal = { x: 0, z: -1 };

  for (const poly of ALL_POLYGONS) {
    const worldCoords = poly.coords.map(c => gpsToWorld(c.lat, c.lon));
    
    for (let i = 0; i < worldCoords.length; i++) {
      const nextIdx = (i + 1) % worldCoords.length;
      const p1 = worldCoords[i];
      const p2 = worldCoords[nextIdx];

      // Exclude large closing lines for mainland segments to prevent hitting "fake" inland bounds
      if (poly.name.includes('Mainland')) {
        const c1 = poly.coords[i];
        const c2 = poly.coords[nextIdx];
        if (Math.abs(c1.lon - c2.lon) > 0.8 || Math.abs(c1.lat - c2.lat) > 0.8) {
          continue;
        }
      }

      // Calculate nearest point on segment p1-p2 to point (x, z)
      const dx = p2.x - p1.x;
      const dz = p2.z - p1.z;
      const lenSq = dx * dx + dz * dz;
      if (lenSq === 0) continue;

      let t = ((x - p1.x) * dx + (z - p1.z) * dz) / lenSq;
      t = Math.max(0, Math.min(1, t));

      const projX = p1.x + t * dx;
      const projZ = p1.z + t * dz;
      const dist = Math.hypot(x - projX, z - projZ);

      if (dist < minDistance) {
        minDistance = dist;
        nearestPt = { x: projX, z: projZ };

        // Normal pointing outward (towards the water)
        // Normal is (-dz, dx) normalized
        const len = Math.sqrt(lenSq);
        let nx = -dz / len;
        let nz = dx / len;

        // Ensure normal points outward by checking distance to a point pushed along the normal
        const testX = projX + nx * 5;
        const testZ = projZ + nz * 5;
        const testGps = worldToGps(testX, testZ);
        if (isPointInPolygon(testGps.lat, testGps.lon, poly.coords)) {
          nx = -nx;
          nz = -nz;
        }
        normal = { x: nx, z: nz };
      }
    }
  }

  return {
    x: nearestPt.x,
    z: nearestPt.z,
    distance: minDistance,
    normalX: normal.x,
    normalZ: normal.z
  };
}
