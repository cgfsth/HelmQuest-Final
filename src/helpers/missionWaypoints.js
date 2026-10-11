import * as THREE from 'three';
import { attachBuoySignal } from './buoySignalLights.js';
import { getActiveHarborDockBerth, getActiveDockColliders } from './harborDocks.js';
import { placeMissionBuoysOffshore } from './missionBuoyPlacement.js';
import { HARBOR_CHANNEL_ORIGIN, HARBOR_COAST_TARGET } from './sceneEnvironment.js';
import { gpsToWorld } from './davaoGulfData.js';

/** Zone blueprints — placed along harbor approach from spawn toward island. */
const MODULE_ZONE_SPECS = {
  'm1-mission1': [
    {
      id: 'm1-crab-pot',
      bearingDeg: 75,
      distance: 900,
      radius: 160,
      zoneType: 'nav',
      label: 'Crab Pot (East)',
      description: 'Sail to Crab Pot and photograph it.',
      gearKind: 'gear'
    },
    {
      id: 'm1-gillnet',
      bearingDeg: 150,
      distance: 1100,
      radius: 160,
      zoneType: 'nav',
      label: 'Gillnet (South)',
      description: 'Verify Gillnet ID number.',
      gearKind: 'gear'
    },
    {
      id: 'm1-longline',
      bearingDeg: 210,
      distance: 900,
      radius: 160,
      zoneType: 'nav',
      label: 'Longline (SW)',
      description: 'Remove debris from Longline.',
      gearKind: 'gear'
    },
    {
      id: 'm1-dock-return',
      bearingDeg: 0,
      distance: 100,
      radius: 50,
      zoneType: 'dock',
      label: 'Harbor Return',
      description: 'Return to the harbor and submit the inspection report.'
    }
  ],
  'm1-mission2': [
    {
      id: 'm1-buoy-alfa',
      bearingDeg: 45,
      distance: 700,
      radius: 40,
      zoneType: 'nav',
      label: 'Buoy Alfa',
      description: 'Follow heading 045° to locate Buoy Alfa.'
    },
    {
      id: 'm1-buoy-bravo',
      bearingDeg: 90,
      distance: 1000,
      radius: 40,
      zoneType: 'nav',
      label: 'Buoy Bravo',
      description: 'Follow heading 135° to locate Buoy Bravo.'
    },
    {
      id: 'm1-buoy-charlie',
      bearingDeg: 150,
      distance: 800,
      radius: 40,
      zoneType: 'nav',
      label: 'Buoy Charlie',
      description: 'Follow heading 220° to locate Buoy Charlie.'
    },
    {
      id: 'm1-dock-return-m2',
      bearingDeg: 0,
      distance: 100,
      radius: 50,
      zoneType: 'dock',
      label: 'Harbor Return',
      description: 'Follow heading 330° to return to harbor docks.'
    }
  ],
  'm1-mission3': [
    {
      id: 'm1-net-marker',
      gps: { lat: 7.08, lon: 125.72 },
      radius: 35,
      zoneType: 'nav',
      label: 'Missing Net Marker',
      description: 'Use Latitude & Longitude search coordinates to find the marker.'
    },
    {
      id: 'm1-dock-return-m3',
      bearingDeg: 0,
      distance: 100,
      radius: 50,
      zoneType: 'dock',
      label: 'Harbor Return',
      description: 'Return to the harbor docks.'
    }
  ],
  'm1-mission4': [
    {
      id: 'm1-patrol-1',
      gps: { lat: 7.11, lon: 125.74 },
      radius: 40,
      zoneType: 'nav',
      label: 'Patrol Point 1',
      description: 'Navigate to coordinate 7.11°N, 125.74°E.'
    },
    {
      id: 'm1-patrol-2',
      bearingDeg: 180,
      distance: 1200,
      radius: 40,
      zoneType: 'nav',
      label: 'Patrol Point 2',
      description: 'Follow heading 180° to reach Patrol Point 2.'
    },
    {
      id: 'm1-patrol-3',
      gps: { lat: 7.05, lon: 125.71 },
      radius: 40,
      zoneType: 'nav',
      label: 'Patrol Point 3',
      description: 'Navigate to coordinate 7.05°N, 125.71°E.'
    },
    {
      id: 'm1-dock-return-m4',
      bearingDeg: 0,
      distance: 100,
      radius: 50,
      zoneType: 'dock',
      label: 'Harbor Return',
      description: 'Return to the harbor docks.'
    }
  ]
};

const ZONE_COLORS = {
  'channel-starboard': 0x22c55e,
  'channel-port': 0xef4444,
  dock: 0x38bdf8,
  'emergency-dock': 0xef4444,
  approach: 0xfbbf24,
  restricted: 0xf87171,
  anchorage: 0x60a5fa,
  nav: 0xa78bfa,
  'nav-return': 0x4ade80,
  'storm-gate': 0xf97316,
  safe: 0x4ade80
};

/** Match App.vue compass: 0° = north (-Z), 90° = east (+X). */
export function compassHeadingFromVector(dx, dz) {
  return ((Math.atan2(dx, -dz) * 180) / Math.PI + 360) % 360;
}

/**
 * Harbor approach vector from spawn toward island shore.
 * @param {number} spawnX
 * @param {number} spawnZ
 * @param {THREE.Object3D | null} islandGroup
 */
export function buildHarborRoute(spawnX, spawnZ, islandGroup) {
  let originX = spawnX;
  let originZ = spawnZ;
  let targetX = spawnX - 180;
  let targetZ = spawnZ;

  if (islandGroup?.userData?.isProceduralTerrain) {
    originX = HARBOR_CHANNEL_ORIGIN.x;
    originZ = HARBOR_CHANNEL_ORIGIN.z;
    targetX = HARBOR_COAST_TARGET.x;
    targetZ = HARBOR_COAST_TARGET.z;
    spawnX = originX;
    spawnZ = originZ;
  } else if (islandGroup) {
    const box = new THREE.Box3().setFromObject(islandGroup);
    if (!box.isEmpty()) {
      const center = new THREE.Vector3();
      box.getCenter(center);
      targetX = box.max.x + 32;
      targetZ = center.z;
    }
  }

  const dx = targetX - spawnX;
  const dz = targetZ - spawnZ;
  const dist = Math.hypot(dx, dz) || 180;
  const ux = dx / dist;
  const uz = dz / dist;
  const px = -uz;
  const pz = ux;
  const approachHeadingDeg = compassHeadingFromVector(dx, dz);
  const berthHeadingDeg = (approachHeadingDeg + 360) % 360;

  return {
    spawnX,
    spawnZ,
    ux,
    uz,
    px,
    pz,
    dist,
    targetX,
    targetZ,
    approachHeadingDeg,
    berthHeadingDeg
  };
}

function pointOnRoute(route, routeT, lateral) {
  const along = route.dist * routeT;
  return {
    x: route.spawnX + route.ux * along + route.px * lateral,
    z: route.spawnZ + route.uz * along + route.pz * lateral
  };
}

function pointOnBearing(spawnX, spawnZ, bearingDeg, distance) {
  const rad = (bearingDeg * Math.PI) / 180;
  // Match compassHeadingFromVector: 0° = north (-Z), 90° = east (+X).
  return {
    x: spawnX + Math.sin(rad) * distance,
    z: spawnZ - Math.cos(rad) * distance
  };
}

function resolveBerthZone(spec, route, baseX, baseZ) {
  const pierSide = spec.pierSide ?? 'port';
  const sideSign = pierSide === 'port' ? -1 : 1;
  const leadIn = spec.leadIn ?? 14;
  const pierOffset = spec.pierOffset ?? 7;

  const x = baseX + route.ux * leadIn;
  const z = baseZ + route.uz * leadIn;

  return {
    x,
    z,
    pierOffsetX: route.px * sideSign * pierOffset,
    pierOffsetZ: route.pz * sideSign * pierOffset,
    berthHeadingDeg: route.berthHeadingDeg,
    approachHeadingDeg: route.approachHeadingDeg,
    requireHeadingDeg: route.berthHeadingDeg,
    headingTolerance: spec.headingTolerance ?? 20,
    shape: 'berth',
    length: spec.length ?? 22,
    width: spec.width ?? 10
  };
}

function resolveZoneSpec(spec, route, spawnX, spawnZ) {
  let x;
  let z;

  if (spec.gps != null) {
    const pos = gpsToWorld(spec.gps.lat, spec.gps.lon);
    // gpsToWorld returns kilometers, App.vue expects meters
    x = pos.x * 1000;
    z = pos.z * 1000;
  } else if (spec.bearingDeg != null) {
    const pos = pointOnBearing(spawnX, spawnZ, spec.bearingDeg, spec.distance ?? 0);
    x = pos.x;
    z = pos.z;
  } else {
    const pos = pointOnRoute(route, spec.routeT, spec.lateral ?? 0);
    x = pos.x;
    z = pos.z;
  }

  const zoneType = spec.zoneType ?? 'nav';
  const color = spec.color ?? ZONE_COLORS[zoneType] ?? 0x38bdf8;

  const base = {
    id: spec.id,
    x,
    z,
    radius: spec.radius ?? 24,
    label: spec.label,
    description: spec.description ?? '',
    zoneType,
    color,
    maxSpeedKnots: spec.maxSpeedKnots,
    approachHeadingDeg: route.approachHeadingDeg,
    visualOnly: spec.visualOnly === true,
    shape: spec.shape ?? 'circle'
  };

  if (spec.shape === 'berth') {
    return {
      ...base,
      ...resolveBerthZone(spec, route, x, z)
    };
  }

  return base;
}

export function getModuleWaypointLayout(moduleId) {
  return MODULE_ZONE_SPECS[moduleId] ?? [];
}

const DOCK_LINKED_ZONE_IDS = new Set([
  'dock-parallel', 'harbor-dock', 'emergency-dock',
  'm1-dock-return', 'm1-dock-return-m2', 'm1-dock-return-m3', 'm1-dock-return-m4'
]);

export function resolveModuleWaypoints(moduleId, spawnX, spawnZ, islandGroup = null, customSteps = null) {
  let specs = getModuleWaypointLayout(moduleId);

  // Support instructor-created missions: any module with typed custom steps
  // (gps/compass/dock) resolves them into waypoint specs on the fly.
  const hasTypedCustomSteps = Array.isArray(customSteps)
    && customSteps.length > 0
    && customSteps.some((s) => s && (s.type === 'gps' || s.type === 'compass' || s.type === 'dock'));
  const customStepIds = hasTypedCustomSteps
    ? new Set(customSteps.map((step) => step?.waypointZone).filter(Boolean))
    : new Set();
  const builtInIds = new Set(specs.map((spec) => spec.id));
  const customLayoutOverridesBuiltIn = hasTypedCustomSteps
    && customStepIds.size > 0
    && [...customStepIds].some((id) => !builtInIds.has(id));

  if ((moduleId === 'm1-mission4' || !specs.length || customLayoutOverridesBuiltIn) && hasTypedCustomSteps) {
    specs = customSteps.map((step, idx) => {
      const spec = {
        id: step.waypointZone || `${moduleId}-step-${idx + 1}`,
        radius: 40,
        zoneType: step.type === 'dock' ? 'dock' : 'nav',
        label: step.type === 'dock' ? 'Harbor Return' : (step.instruction?.slice(0, 40) || `Waypoint ${idx + 1}`),
        description: step.instruction || ''
      };

      if (step.type === 'gps') {
        const lat = parseFloat(step.lat);
        const lon = parseFloat(step.lon);
        if (!isNaN(lat) && !isNaN(lon)) {
          spec.gps = { lat, lon };
        }
      } else if (step.type === 'compass') {
        const heading = parseFloat(step.heading);
        if (!isNaN(heading)) {
          spec.bearingDeg = heading;
          spec.distance = 1200;
        }
      } else if (step.type === 'dock') {
        spec.bearingDeg = 0;
        spec.distance = 100;
        spec.zoneType = 'dock';
      }

      return spec;
    });
  }

  if (!specs.length) return [];

  const route = buildHarborRoute(spawnX, spawnZ, islandGroup);
  const dockBerth = getActiveHarborDockBerth();

  const zones = specs.map((spec) => {
    const zone = resolveZoneSpec(spec, route, spawnX, spawnZ);
    // Link any dock waypoint (builtin ID or custom dock type) to the real berth
    const isDockWaypoint = DOCK_LINKED_ZONE_IDS.has(spec.id) || spec.zoneType === 'dock';
    if (!dockBerth || !isDockWaypoint) return zone;

    return {
      ...zone,
      ...dockBerth,
      id: spec.id,
      label: spec.label ?? zone.label,
      description: spec.description ?? zone.description,
      zoneType: spec.zoneType ?? zone.zoneType,
      color: zone.color,
      maxSpeedKnots: spec.maxSpeedKnots ?? dockBerth.maxSpeedKnots,
      headingTolerance: spec.headingTolerance ?? dockBerth.headingTolerance
    };
  });
  return placeMissionBuoysOffshore(zones, islandGroup, getActiveDockColliders(), { x: spawnX, z: spawnZ });
}

function distanceToBerthZone(boatX, boatZ, zone) {
  const dx = boatX - zone.x;
  const dz = boatZ - zone.z;
  const headingRad = ((zone.berthHeadingDeg ?? 0) * Math.PI) / 180;
  const cos = Math.cos(headingRad);
  const sin = Math.sin(headingRad);
  const localAlong = dx * sin + dz * cos;
  const localAcross = dx * cos - dz * sin;
  const halfLen = (zone.length ?? 22) / 2;
  const halfWid = (zone.width ?? 10) / 2;

  const clampedAlong = Math.max(-halfLen, Math.min(halfLen, localAlong));
  const clampedAcross = Math.max(-halfWid, Math.min(halfWid, localAcross));
  const nearestX = zone.x + clampedAlong * sin + clampedAcross * cos;
  const nearestZ = zone.z + clampedAlong * cos - clampedAcross * sin;
  return Math.hypot(boatX - nearestX, boatZ - nearestZ);
}

export function distanceToZone(boatX, boatZ, zone) {
  if (zone.shape === 'berth') {
    return distanceToBerthZone(boatX, boatZ, zone);
  }
  const dx = boatX - zone.x;
  const dz = boatZ - zone.z;
  return Math.sqrt(dx * dx + dz * dz);
}

/** Distance to zone edge (0 when inside circular zones). */
export function distanceToZoneEdge(boatX, boatZ, zone) {
  const centerDist = distanceToZone(boatX, boatZ, zone);
  if (zone.shape === 'berth') {
    return Math.max(0, centerDist - Math.min(zone.length ?? 22, zone.width ?? 10) * 0.5);
  }
  const radius = zone.radius ?? 24;
  return Math.max(0, centerDist - radius);
}

export function isBoatInZone(boatX, boatZ, zone) {
  if (zone.shape === 'berth') {
    const dx = boatX - zone.x;
    const dz = boatZ - zone.z;
    const headingRad = ((zone.berthHeadingDeg ?? 0) * Math.PI) / 180;
    const cos = Math.cos(headingRad);
    const sin = Math.sin(headingRad);
    const localAlong = dx * sin + dz * cos;
    const localAcross = dx * cos - dz * sin;
    return (
      Math.abs(localAlong) <= (zone.length ?? 22) / 2 &&
      Math.abs(localAcross) <= (zone.width ?? 10) / 2
    );
  }
  return distanceToZone(boatX, boatZ, zone) <= zone.radius;
}

export function findWaypoint(waypoints, zoneId) {
  return waypoints.find((zone) => zone.id === zoneId) ?? null;
}

function createGeofenceShape(zone, color, active) {
  const group = new THREE.Group();
  const y = 0.35;

  if (zone.shape === 'berth') {
    const length = zone.length ?? 22;
    const width = zone.width ?? 10;
    const fillGeo = new THREE.PlaneGeometry(length, width);
    const fillMat = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: active ? 0.16 : 0.07,
      side: THREE.DoubleSide,
      depthWrite: false,
      depthTest: false
    });
    const fill = new THREE.Mesh(fillGeo, fillMat);
    fill.rotation.x = -Math.PI / 2;
    fill.rotation.z = -((zone.berthHeadingDeg ?? 0) * Math.PI) / 180;
    fill.position.y = y;
    fill.renderOrder = 998;

    const edgeGeo = new THREE.EdgesGeometry(new THREE.PlaneGeometry(length, width));
    const edgeMat = new THREE.LineBasicMaterial({
      color,
      transparent: true,
      opacity: active ? 0.85 : 0.4,
      depthWrite: false,
      depthTest: false
    });
    const edge = new THREE.LineSegments(edgeGeo, edgeMat);
    edge.rotation.x = -Math.PI / 2;
    edge.rotation.z = -((zone.berthHeadingDeg ?? 0) * Math.PI) / 180;
    edge.position.y = y + 0.02;
    edge.renderOrder = 999;

    group.add(fill, edge);
    return { fill, ring: edge };
  }

  const radius = zone.radius ?? 24;
  const fillGeo = new THREE.CircleGeometry(radius, 64);
  const fillMat = new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity: active ? 0.14 : 0.06,
    side: THREE.DoubleSide,
    depthWrite: false,
    depthTest: false
  });
  const fill = new THREE.Mesh(fillGeo, fillMat);
  fill.rotation.x = -Math.PI / 2;
  fill.position.y = y;
  fill.renderOrder = 998;

  const ringGeo = new THREE.RingGeometry(Math.max(radius - 1.2, 1), radius + 1.2, 64);
  const ringMat = new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity: active ? 0.55 : 0.22,
    side: THREE.DoubleSide,
    depthWrite: false,
    depthTest: false
  });
  const ring = new THREE.Mesh(ringGeo, ringMat);
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = y + 0.02;
  ring.renderOrder = 999;

  group.add(fill, ring);
  return { fill, ring, groupExtra: group };
}

function createPier(berthHeadingDeg, zoneType) {
  const pier = new THREE.Group();
  const isEmergency = zoneType === 'emergency-dock';
  const plankMat = new THREE.MeshStandardMaterial({
    color: isEmergency ? 0x991b1b : 0x475569,
    roughness: 0.85
  });
  const pileMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.9 });
  const fenderMat = new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.6 });

  const deck = new THREE.Mesh(new THREE.BoxGeometry(16, 0.4, 5.5), plankMat);
  deck.position.set(0, 0.5, 0);
  deck.castShadow = true;
  pier.add(deck);

  for (const z of [-2, 2]) {
    for (const x of [-6, 0, 6]) {
      const pile = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.24, 2.4, 8), pileMat);
      pile.position.set(x, 0.25, z);
      pier.add(pile);
    }
  }

  for (const x of [-5, 0, 5]) {
    const fender = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 1.2, 12), fenderMat);
    fender.rotation.z = Math.PI / 2;
    fender.position.set(x, 0.55, 2.85);
    pier.add(fender);
  }

  const bollardMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.35, roughness: 0.5 });
  for (const x of [-4, 4]) {
    const bollard = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.2, 0.65, 10), bollardMat);
    bollard.position.set(x, 0.85, 0);
    pier.add(bollard);
  }

  if (isEmergency) {
    const light = new THREE.Mesh(
      new THREE.SphereGeometry(0.28, 12, 12),
      new THREE.MeshStandardMaterial({ color: 0xef4444, emissive: 0xef4444, emissiveIntensity: 1.1 })
    );
    light.position.set(7, 1.35, -2.2);
    pier.add(light);

    const sign = new THREE.Mesh(
      new THREE.BoxGeometry(2.2, 0.9, 0.08),
      new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 0.15 })
    );
    sign.position.set(6, 1.6, 2.2);
    pier.add(sign);
  }

  pier.rotation.y = ((berthHeadingDeg + 90) * Math.PI) / 180;
  return pier;
}

function createChannelBuoy(zoneType, active) {
  const group = new THREE.Group();
  const isPort = zoneType === 'channel-port';
  const color = isPort ? 0xef4444 : 0x22c55e;

  const pole = new THREE.Mesh(
    new THREE.CylinderGeometry(0.35, 0.45, 3.6, 8),
    new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.8 })
  );
  pole.position.y = 1.8;
  group.add(pole);

  const buoy = new THREE.Mesh(
    new THREE.CylinderGeometry(active ? 2.2 : 1.8, 2.2, active ? 2.8 : 2.4, 16),
    new THREE.MeshStandardMaterial({
      color,
      emissive: color,
      emissiveIntensity: active ? 0.35 : 0.12,
      roughness: 0.4
    })
  );
  buoy.position.y = 4.2;
  buoy.userData.isBuoy = true;
  buoy.userData.buoyType = isPort ? 'channel-port' : 'channel-starboard';
  group.add(buoy);

  const top = new THREE.Mesh(
    new THREE.CylinderGeometry(0.05, 0.05, active ? 1.1 : 0.8, 8),
    new THREE.MeshStandardMaterial({ color: 0xf8fafc })
  );
  top.position.y = 5.4;
  group.add(top);

  return group;
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function createDistanceLabelSprite() {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 96;
  const ctx = canvas.getContext('2d');
  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;

  const material = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    depthTest: false,
    depthWrite: false
  });
  const sprite = new THREE.Sprite(material);
  sprite.center.set(0.5, 0);
  sprite.position.y = 9.2;
  sprite.renderOrder = 1002;
  sprite.scale.set(11, 4.1, 1);

  sprite.userData = { canvas, ctx, texture, lastText: '' };
  drawDistanceLabelSprite(sprite, '— m', false);
  return sprite;
}

function createBuoyIdLabelSprite(id) {
  const canvas = document.createElement('canvas');
  // Larger canvas so the ID text can be much bigger and still crisp
  canvas.width = 512;
  canvas.height = 160;
  const ctx = canvas.getContext('2d');

  // Rounded yellow badge background with dark border for contrast
  const pad = 8;
  ctx.fillStyle = 'rgba(30, 41, 59, 0.95)';
  roundRect(ctx, 0, 0, canvas.width, canvas.height, 26);
  ctx.fill();

  ctx.fillStyle = '#facc15';
  roundRect(ctx, pad, pad, canvas.width - pad * 2, canvas.height - pad * 2, 22);
  ctx.fill();

  // Bold dark ID text — much larger for readability from a distance
  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 96px monospace, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(id, canvas.width / 2, canvas.height / 2);

  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;

  const material = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    depthTest: false,
    depthWrite: false
  });
  const sprite = new THREE.Sprite(material);
  sprite.center.set(0.5, 0);
  sprite.position.y = 15.5; // A bit higher to make room for the larger badge
  sprite.renderOrder = 1003;
  // Much larger world-space size so the ID stays readable from far away
  sprite.scale.set(22, 7, 1);

  return sprite;
}

function drawDistanceLabelSprite(sprite, text, inside) {
  const { canvas, ctx, texture } = sprite.userData;
  const w = canvas.width;
  const h = canvas.height;
  ctx.clearRect(0, 0, w, h);

  const pad = 10;
  ctx.fillStyle = inside ? 'rgba(22, 101, 52, 0.94)' : 'rgba(30, 41, 59, 0.94)';
  roundRect(ctx, pad, pad, w - pad * 2, h - pad * 2, 14);
  ctx.fill();

  ctx.fillStyle = '#f8fafc';
  ctx.font = `bold ${inside ? 26 : 30}px system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, w / 2, h / 2);
  texture.needsUpdate = true;
}

function createIdLabelSprite(text) {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 96;
  const ctx = canvas.getContext('2d');
  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;

  const material = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    depthTest: false,
    depthWrite: false
  });
  const sprite = new THREE.Sprite(material);
  sprite.center.set(0.5, 0);
  sprite.position.y = 14.0; // Higher than distance label
  sprite.renderOrder = 1003;
  sprite.scale.set(11, 4.1, 1);

  ctx.fillStyle = 'rgba(234, 179, 8, 0.94)'; // Yellow background
  roundRect(ctx, 10, 10, 236, 76, 14);
  ctx.fill();

  ctx.fillStyle = '#1e293b'; // Dark text
  ctx.font = 'bold 32px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(`ID: ${text}`, 128, 48);
  texture.needsUpdate = true;
  
  return sprite;
}

function createMapPinMarker(active) {
  const group = new THREE.Group();
  const pinColor = 0xfacc15;
  const pinMat = new THREE.MeshStandardMaterial({
    color: pinColor,
    emissive: pinColor,
    emissiveIntensity: active ? 0.42 : 0.22,
    roughness: 0.35,
    metalness: 0.08
  });

  const head = new THREE.Mesh(new THREE.SphereGeometry(active ? 1.1 : 0.9, 20, 20), pinMat);
  head.position.y = 6.2;
  group.add(head);

  const body = new THREE.Mesh(new THREE.ConeGeometry(0.95, 3.2, 20), pinMat);
  body.position.y = 4.1;
  group.add(body);

  const stem = new THREE.Mesh(
    new THREE.CylinderGeometry(0.1, 0.1, 1.35, 8),
    new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.75 })
  );
  stem.position.y = 1.85;
  group.add(stem);

  group.scale.set(6, 6, 6);
  return group;
}

/**
 * Uniform navigation buoy used for all generic nav waypoints so every level
 * shares one consistent buoy design. Classic red-and-white floating buoy with
 * a topmark light. Scaled to match the fishing-gear buoys.
 * @param {boolean} active - Whether this is the current target (brighter glow).
 */
function createStandardNavBuoy(active) {
  const group = new THREE.Group();
  const bodyColor = 0xef4444; // Classic red navigation buoy

  // Buoy hull — tapered float body sitting on the surface
  const bodyMat = new THREE.MeshStandardMaterial({
    color: bodyColor,
    emissive: bodyColor,
    emissiveIntensity: active ? 0.32 : 0.14,
    roughness: 0.42
  });
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 1.05, 1.7, 16), bodyMat);
  body.position.y = 0.85;
  group.add(body);

  // White identification band around the hull
  const bandMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.5 });
  const band = new THREE.Mesh(new THREE.CylinderGeometry(0.88, 0.88, 0.42, 16), bandMat);
  band.position.y = 1.05;
  group.add(band);

  // Support pole / cage rising above the hull
  const poleMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.7, metalness: 0.2 });
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 2.4, 8), poleMat);
  pole.position.y = 2.7;
  group.add(pole);

  // Glowing topmark light
  const lightMat = new THREE.MeshStandardMaterial({
    color: 0xfbbf24,
    emissive: 0xfbbf24,
    emissiveIntensity: active ? 1.9 : 0.8
  });
  const light = new THREE.Mesh(new THREE.SphereGeometry(0.38, 14, 14), lightMat);
  light.position.y = 4.0;
  attachBuoySignal(light);
  group.add(light);

  group.scale.set(15, 15, 15);
  group.userData.isBuoy = true;
  group.userData.buoyType = 'nav';
  return group;
}

function createCrabPotMarker(active) {
  const group = new THREE.Group();
  // Crab pot buoy — orange cylinder float with rope going down
  const buoyMat = new THREE.MeshStandardMaterial({
    color: 0xea580c,
    emissive: 0xea580c,
    emissiveIntensity: active ? 0.3 : 0.1,
    roughness: 0.6
  });
  // Horizontal bullet-shaped float
  const buoy = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.8, 2.5, 12), buoyMat);
  buoy.rotation.z = Math.PI / 2;
  buoy.position.y = 1.0;
  group.add(buoy);

  // Rope going down into the water
  const rope = new THREE.Mesh(
    new THREE.CylinderGeometry(0.08, 0.08, 6, 6),
    new THREE.MeshStandardMaterial({ color: 0x94a3b8 })
  );
  rope.position.y = -2.5;
  group.add(rope);

  // Scaled up to be visible next to the 88m boat
  group.scale.set(15, 15, 15);
  group.userData.isBuoy = true;
  group.userData.buoyType = 'crab-pot';
  return group;
}

function createBuoyTexture(text) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  
  // Base color (red buoy)
  ctx.fillStyle = '#ef4444';
  ctx.fillRect(0, 0, 512, 256);
  
  // High contrast yellow center stripe for ID
  ctx.fillStyle = '#facc15';
  ctx.fillRect(0, 78, 512, 100);
  
  // Bold text for ID registration
  ctx.fillStyle = '#1e293b';
  ctx.font = 'bold 72px monospace, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  
  // Draw the text 4 times around the sphere so it is visible from all angles
  ctx.fillText(text, 64, 128);
  ctx.fillText(text, 192, 128);
  ctx.fillText(text, 320, 128);
  ctx.fillText(text, 448, 128);
  
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function createGillnetMarker(active) {
  const group = new THREE.Group();
  const buoyTexture = createBuoyTexture('482');
  const floatMat = new THREE.MeshStandardMaterial({ 
    map: buoyTexture, 
    emissive: 0xef4444, 
    emissiveIntensity: active ? 0.15 : 0.03, 
    roughness: 0.4 
  });
  const ropeMat = new THREE.MeshStandardMaterial({ color: 0xcbd5e1 });

  // 5 floats spaced along a horizontal line
  // Raised so the buoys float on the surface and the ID numbers stay visible
  for (let i = 0; i < 5; i++) {
    const float = new THREE.Mesh(new THREE.SphereGeometry(0.5, 16, 16), floatMat);
    // Align floats to make text upright
    float.rotation.y = Math.PI / 2;
    float.position.set(-8 + i * 4, 1.2, 0);
    group.add(float);
  }

  // Horizontal rope connecting floats
  const rope = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 18, 6), ropeMat);
  rope.rotation.z = Math.PI / 2;
  rope.position.y = 1.2;
  group.add(rope);

  group.scale.set(15, 15, 15);
  group.userData.isBuoy = true;
  group.userData.buoyType = 'gillnet';
  group.userData.buoyId = '482';
  return group;
}

function createLonglineMarker(active) {
  const group = new THREE.Group();
  const poleMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.7 });
  const floatMat = new THREE.MeshStandardMaterial({ color: 0x3b82f6, emissive: 0x3b82f6, emissiveIntensity: active ? 0.3 : 0.1, roughness: 0.5 });
  const flagMat = new THREE.MeshStandardMaterial({ color: 0xf97316, emissive: 0xf97316, emissiveIntensity: active ? 0.4 : 0.1, side: THREE.DoubleSide });

  // Main float
  const float1 = new THREE.Mesh(new THREE.SphereGeometry(1.0, 12, 12), floatMat);
  float1.position.y = 0.6;
  group.add(float1);

  // High-flyer pole
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 6, 8), poleMat);
  pole.position.y = 3.6;
  group.add(pole);

  // Orange flag at top
  const flag = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 1.0), flagMat);
  flag.position.set(0.85, 6.0, 0);
  group.add(flag);

  group.scale.set(15, 15, 15);
  group.userData.isBuoy = true;
  group.userData.buoyType = 'longline';
  return group;
}

function createWaypointMarker(zone, active, sequenceIndex = null) {
  const group = new THREE.Group();
  group.userData.waypointId = zone.id;
  group.userData.zoneRadius = zone.radius;

  if (zone.visualOnly) {
    group.add(createChannelBuoy(zone.zoneType, active));
    return group;
  }

  const isFishingGear = zone.gearKind === 'gear' ||
    zone.id === 'm1-crab-pot' || zone.id === 'm1-gillnet' || zone.id === 'm1-longline';
  const fishingDisabled = typeof window !== 'undefined' &&
    typeof window.isFishingDisabled === 'function' && window.isFishingDisabled();
  const hideGeofence = fishingDisabled;

  if (!hideGeofence) {
    // Gear zones get a bright amber ring; others get the default colour
    const ringColor = isFishingGear ? 0xfb923c : (zone.color ?? 0x38bdf8);
    const { fill, ring } = createGeofenceShape(zone, ringColor, active);
    group.add(fill, ring);
    group.userData.waypointRing = ring;
    group.userData.waypointFill = fill;
  }

  const distanceLabel = createDistanceLabelSprite();

  const iconStack = new THREE.Group();
  iconStack.name = 'WaypointIconStack';
  group.userData.iconStack = iconStack;

  const zoneType = zone.zoneType ?? 'nav';

  if (zoneType === 'dock' || zoneType === 'emergency-dock') {
    // Real wooden pier geometry is placed in the world via helpers/harborDocks.js
  } else if (zone.id === 'm1-crab-pot') {
    iconStack.add(createCrabPotMarker(active));
  } else if (zone.id === 'm1-gillnet') {
    iconStack.add(createGillnetMarker(active));
  } else if (zone.id === 'm1-longline') {
    iconStack.add(createLonglineMarker(active));
  } else if (zoneType === 'channel-starboard' || zoneType === 'channel-port') {
    iconStack.add(createChannelBuoy(zoneType, active));
  } else if (zoneType === 'anchorage') {
    const anchor = new THREE.Group();
    const stock = new THREE.Mesh(
      new THREE.BoxGeometry(0.15, 1.6, 0.15),
      new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.5, roughness: 0.45 })
    );
    stock.position.y = 2.2;
    anchor.add(stock);
    const fluke = new THREE.Mesh(
      new THREE.ConeGeometry(0.9, 1.4, 3),
      new THREE.MeshStandardMaterial({ color: 0x64748b, metalness: 0.4, roughness: 0.55 })
    );
    fluke.position.y = 1.2;
    anchor.add(fluke);
    iconStack.add(anchor);
  } else if (zoneType === 'restricted') {
    iconStack.add(createChannelBuoy('channel-port', active));
    const beacon = new THREE.Mesh(
      new THREE.SphereGeometry(0.4, 12, 12),
      new THREE.MeshStandardMaterial({ color: 0xef4444, emissive: 0xef4444, emissiveIntensity: 1.2 })
    );
    beacon.position.y = 6.2;
    attachBuoySignal(beacon);
    iconStack.add(beacon);
    group.userData.beacon = beacon;
  } else {
    // Uniform navigation buoy for all generic nav waypoints (consistent design)
    iconStack.add(createStandardNavBuoy(active));
  }

  // Gear zones get a tall glowing beacon so they're visible from far away
  if (isFishingGear) {
    const beaconGroup = new THREE.Group();
    beaconGroup.name = 'GearBeacon';

    // Thin vertical pole — scales up so it stays large in world space
    const poleH = active ? 120 : 90;
    const poleMat = new THREE.MeshStandardMaterial({
      color: 0xfb923c,
      emissive: 0xfb923c,
      emissiveIntensity: active ? 0.9 : 0.45,
      transparent: true,
      opacity: 0.82,
    });
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, poleH, 8), poleMat);
    pole.position.y = poleH / 2 + 2;
    beaconGroup.add(pole);

    // Glowing sphere at top
    const topMat = new THREE.MeshStandardMaterial({
      color: active ? 0xfbbf24 : 0xfb923c,
      emissive: active ? 0xfbbf24 : 0xfb923c,
      emissiveIntensity: active ? 2.5 : 1.2,
    });
    const top = new THREE.Mesh(new THREE.SphereGeometry(4, 16, 16), topMat);
    top.position.y = poleH + 6;
    attachBuoySignal(top);
    beaconGroup.add(top);
    group.userData.gearBeaconTop = top;
    
    // Mark for interaction
    top.userData.isBuoy = true;
    top.userData.buoyType = 'fishing-gear';
    top.userData.gearId = zone.id;

    // Downward-pointing arrow cone at mid-height to draw the eye downward
    const arrowMat = new THREE.MeshStandardMaterial({
      color: 0xfef08a,
      emissive: 0xfef08a,
      emissiveIntensity: active ? 1.5 : 0.6,
      transparent: true,
      opacity: 0.9,
    });
    const arrow = new THREE.Mesh(new THREE.ConeGeometry(5, 12, 8), arrowMat);
    arrow.rotation.x = Math.PI; // point downward
    arrow.position.y = poleH * 0.55;
    beaconGroup.add(arrow);
    group.userData.gearBeaconArrow = arrow;

    group.add(beaconGroup);
    group.userData.gearBeaconGroup = beaconGroup;
  }

  iconStack.add(distanceLabel);

  // Sequential buoy ID (BUOY-01, BUOY-02, …). Dock zones don't get one.
  const isDock = zoneType === 'dock' || zoneType === 'emergency-dock';
  if (!isDock && sequenceIndex !== null) {
    // Use verify_id challenge number if present, otherwise sequential label
    const buoyId = zone.verifyId ?? `BUOY-${String(sequenceIndex + 1).padStart(2, '0')}`;
    const idLabel = createBuoyIdLabelSprite(buoyId);
    iconStack.add(idLabel);
    group.userData.buoyIdLabel = idLabel;
    group.userData.buoyId = buoyId;
  }
  
  group.add(iconStack);
  group.userData.distanceLabel = distanceLabel;

  return group;
}

export function createWaypointMarkerGroup(waypoints, activeZoneId = null, waterlineY = 0) {
  const group = new THREE.Group();
  group.name = 'TrainingWaypoints';
  group.userData.buoySignals = [];

  let buoyIndex = 0;
  for (const zone of waypoints) {
    const zt = zone.zoneType ?? 'nav';
    const isDock = zt === 'dock' || zt === 'emergency-dock';
    const seq = isDock ? null : buoyIndex;
    if (!isDock) buoyIndex += 1;

    const marker = createWaypointMarker(zone, zone.id === activeZoneId, seq);
    marker.position.set(zone.x, waterlineY, zone.z);
    marker.userData.zone = zone;
    // Store base waterline Y so wave bobbing can oscillate relative to it
    marker.userData.baseY = waterlineY;
    // Per-buoy phase offset (based on world position) so buoys don't bob in sync
    marker.userData.wavePhase = (zone.x * 0.05) + (zone.z * 0.05);
    marker.traverse((object) => {
      const signal = object.userData.buoySignal;
      if (!signal) return;
      signal.phase = group.userData.buoySignals.length * 0.31;
      group.userData.buoySignals.push(signal);
    });
    group.add(marker);
  }

  return group;
}

/**
 * Make buoy markers float and bob with the waves for a realistic effect.
 * Applies vertical bobbing (relative to the stored base waterline) plus a
 * gentle rocking tilt so each buoy looks like it's riding the swell.
 *
 * @param {THREE.Group} group - The waypoint marker group.
 * @param {number} elapsedSeconds - performance.now() * 0.001.
 * @param {number} waveAmplitude - Wave height in metres (matches boat physics).
 * @param {number} waveFrequency - Wave speed (matches boat physics).
 * @param {(x: number, z: number) => number} [sampleHeight] - Rendered ocean height at the buoy.
 */
export function updateBuoyFloating(group, elapsedSeconds, waveAmplitude = 0.85, waveFrequency = 1.0, sampleHeight) {
  if (!group) return;

  for (const marker of group.children) {
    const baseY = marker.userData.baseY ?? marker.position.y;
    const phase = marker.userData.wavePhase ?? 0;
    const t = elapsedSeconds * waveFrequency + phase;

    // Vertical bob — buoy rides up and down on the swell
    const bob = sampleHeight ? sampleHeight(marker.position.x, marker.position.z) : Math.sin(t) * waveAmplitude;
    marker.position.y = baseY + bob;

    // Gentle rocking tilt applied only to the buoy mesh (iconStack) so the
    // flat geofence ring on the water surface stays flat.
    const iconStack = marker.userData.iconStack;
    if (iconStack) {
      iconStack.rotation.z = Math.sin(t * 0.9) * 0.09;
      iconStack.rotation.x = Math.cos(t * 0.7) * 0.07;
    } else {
      // visualOnly channel buoys have the buoy added directly to the marker.
      marker.rotation.z = Math.sin(t * 0.9) * 0.09;
      marker.rotation.x = Math.cos(t * 0.7) * 0.07;
    }
  }
}

/** Pin scales up with range and down when close (counters perspective). */
export function computeWaypointIconScale(distanceMeters, inside = false) {
  const minScale = 0.45;
  const maxScale = 3.5;
  const nearM = 10;
  const farM = 250;

  if (inside) return minScale;

  const t = THREE.MathUtils.clamp((distanceMeters - nearM) / (farM - nearM), 0, 1);
  const eased = t * t * (3 - 2 * t);
  return THREE.MathUtils.lerp(minScale, maxScale, eased);
}

/** Live distance tag above the world marker (billboard, meters). */
export function updateWaypointMarkerDistances(group, boatX, boatZ, camera, waypoints = null) {
  if (!group || !camera) return;

  for (const marker of group.children) {
    const zone = waypoints?.find((entry) => entry.id === marker.userData.waypointId) ?? marker.userData.zone;
    const label = marker.userData.distanceLabel;
    if (!zone || !label) continue;

    const dist = distanceToZoneEdge(boatX, boatZ, zone);
    const inside = isBoatInZone(boatX, boatZ, zone);
    const text = inside ? 'IN ZONE' : formatDistanceMeters(dist);

    if (text !== label.userData.lastText) {
      drawDistanceLabelSprite(label, text, inside);
      label.userData.lastText = text;
    }

    const iconStack = marker.userData.iconStack;
    if (iconStack) {
      // Fishing gear markers stay fixed size — they are real-world objects, not UI pins.
      const zoneId = marker.userData.waypointId || '';
      const isFixedSize = zoneId === 'm1-crab-pot' || zoneId === 'm1-gillnet' || zoneId === 'm1-longline';
      if (!isFixedSize) {
        const iconScale = computeWaypointIconScale(inside ? 0 : dist, inside);
        iconStack.scale.setScalar(iconScale);
      }
    }
  }
}

export function setActiveWaypointMarker(group, activeZoneId) {
  if (!group) return;
  group.children.forEach((marker) => {
    const isActive = marker.userData.waypointId === activeZoneId;
    const ring = marker.userData.waypointRing;
    const fill = marker.userData.waypointFill;
    const buoy = marker.userData.waypointBuoy;
    const beacon = marker.userData.beacon;

    if (ring?.material) {
      ring.material.opacity = isActive ? (ring.isLineSegments ? 0.85 : 0.55) : (ring.isLineSegments ? 0.4 : 0.22);
    }
    if (fill?.material) {
      fill.material.opacity = isActive ? 0.16 : 0.07;
    }
    if (buoy) {
      buoy.material.emissiveIntensity = isActive ? 0.45 : 0.15;
      buoy.scale.setScalar(isActive ? 1.12 : 1);
    }
    if (beacon) {
      beacon.material.emissiveIntensity = isActive ? 1.6 : 0.9;
    }
  });
}

/** 
 * Check if the boat is hitting a physical buoy/fishing gear marker.
 * @param {number} boatX - Boat X position
 * @param {number} boatZ - Boat Z position
 * @param {THREE.Group} group - Waypoint marker group
 * @param {number} [boatRadius=4] - Boat collision radius (adjustable per boat size)
 */
export function resolveWaypointCollision(boatX, boatZ, group, boatRadius = 4) {
  if (!group) return { collided: false };

  for (const marker of group.children) {
    const zoneId = marker.userData.waypointId || '';
    
    // Skip if this is not a buoy/marker (e.g., distance labels, shapes)
    if (!zoneId || marker.userData.visualOnly === true) continue;
    
    const dx = boatX - marker.position.x;
    const dz = boatZ - marker.position.z;
    const dist = Math.hypot(dx, dz);
    
    // Get ACTUAL buoy radius based on its current scale (for LOD/distance scaling)
    let baseRadius = 12; // Base radius at 1.0 scale
    
    // Different base radii for different marker types
    if (zoneId === 'm1-crab-pot') baseRadius = 8;
    if (zoneId === 'm1-gillnet') baseRadius = 15; // Gillnet has multiple floats
    if (zoneId === 'm1-longline') baseRadius = 10;
    if (zoneId.includes('buoy') || zoneId.includes('channel')) baseRadius = 12;
    
    // CRITICAL: Adjust radius based on ACTUAL buoy scale (for distance-based LOD)
    // If buoy shrinks when far away, collision should shrink too!
    const buoyScale = marker.scale.x || 1.0; // Assume uniform scale
    const scaledRadius = baseRadius * buoyScale;
    
    // Total collision distance = buoy radius + boat radius
    const minDistance = scaledRadius + boatRadius;

    if (dist < minDistance) {
      // Push boat away from marker
      const angle = Math.atan2(dz, dx);
      return {
        collided: true,
        x: marker.position.x + Math.cos(angle) * minDistance,
        z: marker.position.z + Math.sin(angle) * minDistance
      };
    }
  }

  return { collided: false };
}

export function disposeWaypointMarkerGroup(group) {
  if (!group) return;
  group.traverse((obj) => {
    obj.material?.map?.dispose();
    if (obj.geometry) obj.geometry.dispose();
    if (obj.material) {
      if (Array.isArray(obj.material)) obj.material.forEach((m) => m.dispose());
      else obj.material.dispose();
    }
  });
}

export function formatDistanceMeters(meters) {
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(1)} km`;
}

export function getRequiredHeading(zone, step) {
  return step?.requireHeadingDeg ?? zone?.requireHeadingDeg ?? zone?.berthHeadingDeg ?? null;
}

export function getZoneStepHint(zone, inside, dist, step, stats = null) {
  const speedLimit = step?.maxSpeedKnots ?? zone?.maxSpeedKnots;
  const speedPart = speedLimit != null ? ` · max ${speedLimit} kn` : '';
  const requiredHeading = getRequiredHeading(zone, step);

  if (inside && stats) {
    const parts = [`✓ Inside ${zone.label}${speedPart}`];
    if (zone.description) parts.push(zone.description);

    if (speedLimit != null && Math.abs(stats.speedKnots) > speedLimit) {
      parts.push(`Slow down — ${Math.abs(stats.speedKnots).toFixed(1)} kn is too fast`);
    }
    if (requiredHeading != null) {
      parts.push(`Heading ${Math.round(stats.rotationDeg)}° · target ${Math.round(requiredHeading)}°`);
    }
    return parts.join(' — ');
  }

  if (inside) {
    return `✓ Inside ${zone.label}${speedPart}${zone.description ? ` — ${zone.description}` : ''}`;
  }

  let hint = `→ ${zone.label}: ${formatDistanceMeters(dist)} away${speedPart}`;
  if (requiredHeading != null && stats) {
    hint += ` · steer ~${Math.round(requiredHeading)}° when entering`;
  }
  if (zone.description && dist < (zone.radius ?? 40) * 2.5) {
    hint += ` — ${zone.description}`;
  }
  return hint;
}

export function getTrainingCoachHint(step, context) {
  const { stats, boatPosition, waypoints } = context;

  if (step?.requireHeadingDeg != null && !step?.waypointZone && stats) {
    const target = step.requireHeadingDeg;
    const off = Math.abs(
      ((stats.rotationDeg - target + 540) % 360) - 180
    );
    const tol = step.headingTolerance ?? 12;
    if (off > tol) {
      const turn = ((target - stats.rotationDeg + 540) % 360) - 180;
      const dir = turn > 0 ? 'starboard (right)' : 'port (left)';
      return `Use A/D to turn ${dir} toward ${Math.round(target)}°.`;
    }
    if (step.holdHeadingMs && context.headingHold?.startedAt == null) {
      return 'Match the heading, then hold steady while you read the compass.';
    }
    return '';
  }

  if (!step?.waypointZone || !boatPosition || !stats) return '';

  const zone = waypoints?.find((entry) => entry.id === step.waypointZone);
  if (!zone || zone.visualOnly) return '';

  const dist = distanceToZone(boatPosition.x, boatPosition.z, zone);
  const inside = isBoatInZone(boatPosition.x, boatPosition.z, zone);
  const speedLimit = step.maxSpeedKnots ?? zone.maxSpeedKnots;
  const requiredHeading = getRequiredHeading(zone, step);
  const headingTol = step.headingTolerance ?? zone.headingTolerance ?? 20;

  if (!inside) {
    if (zone.shape === 'berth' && dist < 35 && requiredHeading != null) {
      return `Line up parallel to the pier first — turn to ~${Math.round(requiredHeading)}° before entering the berth box.`;
    }
    if (dist < 60 && speedLimit != null && Math.abs(stats.speedKnots) > speedLimit + 0.5) {
      return `Reduce speed early — docking requires control below ${speedLimit} kn.`;
    }
    return '';
  }

  if (speedLimit != null && Math.abs(stats.speedKnots) > speedLimit) {
    return `Too fast for this zone (${Math.abs(stats.speedKnots).toFixed(1)} kn). Ease off the throttle.`;
  }

  if (requiredHeading != null) {
    const delta = Math.abs(((stats.rotationDeg - requiredHeading + 540) % 360) - 180);
    if (delta > headingTol) {
      return `Not parallel to the pier — turn to ~${Math.round(requiredHeading)}° (you are at ${Math.round(stats.rotationDeg)}°).`;
    }
  }

  if (zone.shape === 'berth' && Math.abs(stats.speedKnots) > 0.2) {
    return 'Hold position alongside — neutral throttle, small corrections only.';
  }

  if (step.check && !step.check(stats)) {
    if (requiredHeading != null) {
      return `Hold inside the zone — turn to ~${Math.round(requiredHeading)}° to complete this step.`;
    }
    return 'Hold inside the zone until all step requirements are met.';
  }

  return 'Good — hold steady inside the zone.';
}







