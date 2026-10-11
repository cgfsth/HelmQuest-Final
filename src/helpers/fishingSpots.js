import * as THREE from 'three';
import { isBoatInZone } from './missionWaypoints.js';
import { SAMAL_STRAIT_SPAWN } from './sceneEnvironment.js';

const ANCHOR_X = SAMAL_STRAIT_SPAWN.x;
const ANCHOR_Z = SAMAL_STRAIT_SPAWN.z;

/**
 * @param {number} dx — meters east of Samal Strait spawn
 * @param {number} dz — meters north of spawn (+Z = north in world)
 * @param {number} radius
 * @param {string} id
 * @param {string} label
 */
function spot(dx, dz, radius, id, label) {
  return { id, label, x: ANCHOR_X + dx, z: ANCHOR_Z + dz, radius };
}

/** @param {number} bearingDeg — 0° = north, 90° = east */
function spotPolar(bearingDeg, distM, radius, id, label) {
  const br = (bearingDeg * Math.PI) / 180;
  return spot(Math.sin(br) * distM, Math.cos(br) * distM, radius, id, label);
}

/**
 * Open-water fishing grounds around the Samal Strait play area (world meters).
 * Spread 2.2 – 12 km from spawn, well separated for exploration.
 */
export const FISHING_SPOTS = [
  spotPolar(8, 2200, 145, 'strait-north', 'Samal Strait'),
  spotPolar(52, 4600, 140, 'east-grounds', 'East Grounds'),
  spotPolar(98, 3800, 135, 'se-passage', 'SE Passage'),
  spotPolar(142, 6200, 150, 'south-channel', 'South Channel'),
  spotPolar(188, 7600, 145, 'south-strait', 'South Strait'),
  spotPolar(232, 5000, 140, 'west-shelf', 'West Shelf'),
  spotPolar(278, 6800, 135, 'davao-offshore', 'Davao Offshore'),
  spotPolar(322, 9000, 155, 'gulf-entrance', 'Gulf Entrance'),
  spotPolar(18, 5400, 140, 'north-flats', 'North Flats'),
  spotPolar(64, 8200, 150, 'igacos-approach', 'Igacos Approach'),
  spotPolar(108, 9600, 145, 'talikud-sound', 'Talikud Sound'),
  spotPolar(154, 10400, 135, 'apo-approach', 'Apo Approach'),
  spotPolar(198, 11200, 155, 'south-basin', 'South Basin'),
  spotPolar(244, 2800, 130, 'strait-west', 'Strait West'),
  spotPolar(288, 5200, 140, 'samal-lee', 'Samal Lee'),
  spotPolar(334, 7400, 145, 'west-deep', 'West Deep'),
  spotPolar(28, 10800, 150, 'north-grounds', 'North Grounds'),
  spotPolar(74, 6000, 135, 'mid-channel', 'Mid Channel'),
  spotPolar(118, 8400, 140, 'east-deep', 'East Deep'),
  spotPolar(164, 10000, 145, 'panabo-bay', 'Panabo Bay'),
  spotPolar(208, 11600, 130, 'bunawan-flats', 'Bunawan Flats'),
  spotPolar(254, 11800, 150, 'victoria-bank', 'Victoria Bank'),
];

/** Amber/gold — distinct from blue radar ocean and dark water. */
export const FISHING_GROUND_COLOR = 0xe8a020;
export const FISHING_GROUND_ACTIVE_COLOR = 0xfbbf24;
export const FISHING_RING_COLOR = 0xf59e0b;
export const FISHING_RING_ACTIVE_COLOR = 0xfde047;
export const FISHING_FILL_COLOR = 0xb45309;

/** Radar / tactical chart (not blue). */
export const FISHING_CHART_FILL = 'rgba(180, 83, 9, 0.75)';
export const FISHING_CHART_FILL_ACTIVE = 'rgba(251, 191, 36, 0.88)';
export const FISHING_CHART_STROKE = 'rgba(245, 158, 11, 0.95)';
export const FISHING_CHART_STROKE_ACTIVE = 'rgba(253, 224, 71, 1)';
export const FISHING_CHART_LABEL = 'rgba(254, 243, 199, 0.95)';

const WATER_SURFACE_Y = 0.25;

function circleXZ(radius, segments = 72) {
  const pts = [];
  for (let i = 0; i <= segments; i++) {
    const t = (i / segments) * Math.PI * 2;
    pts.push(new THREE.Vector3(Math.cos(t) * radius, 0, Math.sin(t) * radius));
  }
  return pts;
}

/** @returns {typeof FISHING_SPOTS[number] | null} */
export function getFishingSpotAt(boatX, boatZ) {
  for (const spot of FISHING_SPOTS) {
    if (isBoatInZone(boatX, boatZ, spot)) return spot;
  }
  return null;
}

export function isInFishingSpot(boatX, boatZ) {
  return getFishingSpotAt(boatX, boatZ) != null;
}

/** @returns {{ spot: typeof FISHING_SPOTS[number], distance: number } | null} */
export function getNearestFishingSpot(boatX, boatZ) {
  let best = null;
  for (const spot of FISHING_SPOTS) {
    const dx = boatX - spot.x;
    const dz = boatZ - spot.z;
    const distance = Math.hypot(dx, dz);
    if (!best || distance < best.distance) {
      best = { spot, distance };
    }
  }
  return best;
}

/**
 * World markers: boundary ring + corner buoys (no filled plane — avoids water shader conflicts).
 * @param {THREE.Scene} scene
 */
export function createFishingSpotMarkers(scene) {
  const group = new THREE.Group();
  group.name = 'FishingSpots';

  const spotMeshes = [];

  for (const spot of FISHING_SPOTS) {
    const spotGroup = new THREE.Group();
    spotGroup.name = `FishingSpot_${spot.id}`;
    spotGroup.position.set(spot.x, WATER_SURFACE_Y, spot.z);

    const ringGeo = new THREE.BufferGeometry().setFromPoints(circleXZ(spot.radius));
    const ring = new THREE.LineLoop(
      ringGeo,
      new THREE.LineBasicMaterial({
        color: FISHING_RING_COLOR,
        transparent: true,
        opacity: 0.85,
        depthWrite: false,
      })
    );
    ring.renderOrder = 3;
    ring.frustumCulled = false;
    spotGroup.add(ring);

    const innerRing = new THREE.Mesh(
      new THREE.RingGeometry(spot.radius * 0.985, spot.radius, 72),
      new THREE.MeshBasicMaterial({
        color: FISHING_FILL_COLOR,
        transparent: true,
        opacity: 0.28,
        side: THREE.DoubleSide,
        depthWrite: false,
      })
    );
    innerRing.rotation.x = -Math.PI / 2;
    innerRing.position.y = 0.02;
    innerRing.renderOrder = 2;
    spotGroup.add(innerRing);

    const buoyMat = new THREE.MeshStandardMaterial({
      color: 0xff6600,
      emissive: 0x331100,
      emissiveIntensity: 0.25,
      roughness: 0.45,
    });

    const buoyR = Math.max(0.75, spot.radius * 0.008);
    const centerBuoyR = buoyR * 1.15;
    const perimeterAngles =
      spot.radius < 180
        ? [0, (Math.PI * 2) / 3, (Math.PI * 4) / 3]
        : [0, Math.PI * 0.5, Math.PI, Math.PI * 1.5];

    const buoys = [];
    for (const angle of perimeterAngles) {
      const buoy = new THREE.Mesh(
        new THREE.SphereGeometry(buoyR, 10, 8),
        buoyMat.clone()
      );
      buoy.position.set(
        Math.cos(angle) * spot.radius * 0.78,
        0.45,
        Math.sin(angle) * spot.radius * 0.78
      );
      spotGroup.add(buoy);
      buoys.push(buoy);
    }

    const centerBuoy = new THREE.Mesh(
      new THREE.SphereGeometry(centerBuoyR, 12, 10),
      buoyMat.clone()
    );
    centerBuoy.position.y = 0.52;
    spotGroup.add(centerBuoy);
    buoys.push(centerBuoy);

    group.add(spotGroup);
    spotMeshes.push({ spot, spotGroup, ring, innerRing, buoys });
  }

  scene.add(group);

  return {
    group,
    spotMeshes,
    update(boatX, boatZ, elapsed = 0) {
      const active = getFishingSpotAt(boatX, boatZ);
      const pulse = 0.65 + Math.sin(elapsed * 2.4) * 0.2;

      for (const { spot, ring, innerRing, buoys } of spotMeshes) {
        const isActive = active?.id === spot.id;
        ring.material.color.setHex(isActive ? FISHING_RING_ACTIVE_COLOR : FISHING_RING_COLOR);
        ring.material.opacity = isActive ? 1 : 0.8;
        innerRing.material.opacity = isActive ? 0.42 : 0.26;
        innerRing.material.color.setHex(isActive ? FISHING_GROUND_ACTIVE_COLOR : FISHING_FILL_COLOR);

        for (const buoy of buoys) {
          buoy.position.y = (buoy === buoys[buoys.length - 1] ? 0.52 : 0.45)
            + Math.sin(elapsed * 2 + spot.x * 0.001) * 0.08;
          buoy.material.emissiveIntensity = isActive ? 0.45 + pulse * 0.2 : 0.2;
        }
      }
    },
    dispose() {
      scene.remove(group);
      group.traverse((obj) => {
        obj.geometry?.dispose?.();
        if (obj.material) {
          if (Array.isArray(obj.material)) obj.material.forEach((m) => m.dispose());
          else obj.material.dispose?.();
        }
      });
    },
  };
}

/**
 * For tactical chart / HUD overlays.
 */
export function getFishingSpotChartWaypoints(boatX, boatZ) {
  const active = getFishingSpotAt(boatX, boatZ);
  return FISHING_SPOTS.map((spot) => ({
    x: spot.x,
    z: spot.z,
    radius: spot.radius,
    label: spot.label,
    color: FISHING_GROUND_COLOR,
    kind: 'fishing',
    active: active?.id === spot.id,
  }));
}
