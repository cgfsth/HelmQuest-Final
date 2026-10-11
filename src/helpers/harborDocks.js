import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { SIMULATION_SPAWN, HARBOR_CHANNEL_ORIGIN, HARBOR_COAST_TARGET } from './sceneEnvironment.js';
import { buildHarborRoute } from './missionWaypoints.js';
import { getCachedHeightmapSync, sampleHeightmapElevation } from './terrainHeightmap.js';
import { addWharfPoleLights } from './harborPoleLights.js';

/** Drop your custom dock model here to replace the procedural one. */
export const HARBOR_DOCK_GLB = '/assets/seaside_wharf.glb';

/**
 * Scale reference: 16 m LOA trawler, ~4 m beam.
 * Panels sized to match the vessel — walkway ≈ beam, berth platform wider for alongside mooring.
 */
const DOCK = {
  deckTopY: 1.15,
  frameH: 0.2,
  deckThick: 0.09,
  frameT: 0.14,
  plankWidth: 0.18,
  plankGap: 0.022,
  moduleLength: 6.5,
  walkwayWidth: 7.5,
  cellWidth: 6.5,
  cellLength: 6.8,
  legRadius: 0.12,
  footRadius: 0.52,
  capRadius: 0.12
};

/**
 * @returns {Record<string, THREE.MeshStandardMaterial>}
 */
function createDockMaterials() {
  return {
    deck: new THREE.MeshStandardMaterial({ color: 0x5c4030, roughness: 0.9, metalness: 0.02 }),
    deckGap: new THREE.MeshStandardMaterial({ color: 0x3d2a20, roughness: 0.95, metalness: 0 }),
    frame: new THREE.MeshStandardMaterial({ color: 0xc2c9d4, roughness: 0.36, metalness: 0.74 }),
    leg: new THREE.MeshStandardMaterial({ color: 0xaab2be, roughness: 0.42, metalness: 0.68 }),
    foot: new THREE.MeshStandardMaterial({ color: 0x8d949e, roughness: 0.52, metalness: 0.45 }),
    cap: new THREE.MeshStandardMaterial({ color: 0xf2f4f6, roughness: 0.62, metalness: 0.05 })
  };
}

/**
 * One modular panel: frame, narrow planks, corner legs.
 * Runs +Z (length), spans ±X (width). Origin at waterline.
 *
 * @param {number} length
 * @param {number} width
 * @param {ReturnType<typeof createDockMaterials>} materials
 * @param {{ cornerLegs?: boolean }} opts
 */
function createDockSection(length, width, materials, opts = {}) {
  const { cornerLegs = true } = opts;
  const section = new THREE.Group();
  section.name = 'DockSection';

  const deckTopY = DOCK.deckTopY;
  const deckBottom = deckTopY - DOCK.deckThick;
  const frameCenterY = deckBottom - DOCK.frameH * 0.5;
  const inset = DOCK.frameT * 0.6;
  const innerL = Math.max(length - inset * 2, 0.4);
  const innerW = Math.max(width - inset * 2, 0.4);

  const addBox = (geo, mat, x, y, z, name) => {
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, y, z);
    mesh.name = name;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    section.add(mesh);
    return mesh;
  };

  addBox(new THREE.BoxGeometry(width, DOCK.frameH, DOCK.frameT), materials.frame, 0, frameCenterY, DOCK.frameT * 0.5, 'FrameFront');
  addBox(new THREE.BoxGeometry(width, DOCK.frameH, DOCK.frameT), materials.frame, 0, frameCenterY, length - DOCK.frameT * 0.5, 'FrameBack');
  addBox(new THREE.BoxGeometry(DOCK.frameT, DOCK.frameH, length), materials.frame, -width * 0.5 + DOCK.frameT * 0.5, frameCenterY, length * 0.5, 'FrameLeft');
  addBox(new THREE.BoxGeometry(DOCK.frameT, DOCK.frameH, length), materials.frame, width * 0.5 - DOCK.frameT * 0.5, frameCenterY, length * 0.5, 'FrameRight');

  const plankPitch = DOCK.plankWidth + DOCK.plankGap;
  const plankCount = Math.max(6, Math.floor(innerW / plankPitch));
  const usedW = plankCount * plankPitch - DOCK.plankGap;
  const startX = -usedW * 0.5 + DOCK.plankWidth * 0.5;

  for (let i = 0; i < plankCount; i += 1) {
    const px = startX + i * plankPitch;
    addBox(
      new THREE.BoxGeometry(DOCK.plankWidth, DOCK.deckThick, innerL),
      materials.deck,
      px,
      deckTopY - DOCK.deckThick * 0.5,
      length * 0.5,
      `Plank_${i}`
    );
  }

  const seamCount = Math.max(2, Math.floor(innerL / 0.5));
  for (let s = 1; s < seamCount; s += 1) {
    const pz = inset + (innerL / seamCount) * s;
    addBox(
      new THREE.BoxGeometry(innerW * 0.96, 0.012, DOCK.plankGap * 0.9),
      materials.deckGap,
      0,
      deckTopY - DOCK.deckThick - 0.004,
      pz,
      `Seam_${s}`
    );
  }

  if (cornerLegs) {
    const legInsetX = width * 0.5 - 0.14;
    const legInsetZ = 0.16;
    const legHeight = Math.max(deckBottom - DOCK.frameH - 0.08, 0.55);

    [
      [-legInsetX, legInsetZ],
      [legInsetX, legInsetZ],
      [-legInsetX, length - legInsetZ],
      [legInsetX, length - legInsetZ]
    ].forEach(([lx, lz], idx) => {
      const leg = new THREE.Mesh(
        new THREE.CylinderGeometry(DOCK.legRadius, DOCK.legRadius * 1.05, legHeight, 10),
        materials.leg
      );
      leg.position.set(lx, legHeight * 0.5, lz);
      leg.castShadow = true;
      leg.name = `Leg_${idx}`;
      section.add(leg);

      const foot = new THREE.Mesh(
        new THREE.CylinderGeometry(DOCK.footRadius, DOCK.footRadius * 1.04, 0.04, 16),
        materials.foot
      );
      foot.position.set(lx, 0.02, lz);
      foot.receiveShadow = true;
      section.add(foot);

      const cap = new THREE.Mesh(
        new THREE.CylinderGeometry(DOCK.capRadius, DOCK.capRadius, 0.05, 10),
        materials.cap
      );
      cap.position.set(lx, deckTopY + 0.03, lz);
      cap.castShadow = true;
      section.add(cap);
    });
  }

  return section;
}

/**
 * @param {number} count
 * @param {number} moduleLength
 * @param {number} moduleWidth
 * @param {ReturnType<typeof createDockMaterials>} materials
 */
function buildWalkway(count, moduleLength, moduleWidth, materials) {
  const walkway = new THREE.Group();
  walkway.name = 'Walkway';

  for (let i = 0; i < count; i += 1) {
    const section = createDockSection(moduleLength, moduleWidth, materials);
    section.position.z = i * moduleLength;
    walkway.add(section);
  }

  walkway.userData.length = count * moduleLength;
  walkway.userData.width = moduleWidth;
  return walkway;
}

/**
 * @param {number} cols
 * @param {number} rows
 * @param {number} cellWidth
 * @param {number} cellLength
 * @param {ReturnType<typeof createDockMaterials>} materials
 */
function buildPlatform(cols, rows, cellWidth, cellLength, materials) {
  const platform = new THREE.Group();
  platform.name = 'BerthPlatform';

  for (let c = 0; c < cols; c += 1) {
    for (let r = 0; r < rows; r += 1) {
      const isInterior = c > 0 && c < cols - 1 && r > 0 && r < rows - 1;
      const section = createDockSection(cellLength, cellWidth, materials, {
        cornerLegs: !isInterior
      });
      section.position.set((c - (cols - 1) * 0.5) * cellWidth, 0, r * cellLength);
      platform.add(section);
    }
  }

  platform.userData.length = rows * cellLength;
  platform.userData.width = cols * cellWidth;
  return platform;
}

/**
 * @param {ReturnType<typeof createDockMaterials>} materials
 * @param {{ walkwayModules?: number }} options
 */
function buildTDock(materials, options = {}) {
  const walkwayModules = options.walkwayModules ?? 10;

  const dock = new THREE.Group();
  dock.name = 'TDock';

  const walkway = buildWalkway(
    walkwayModules,
    DOCK.moduleLength,
    DOCK.walkwayWidth,
    materials
  );
  dock.add(walkway);

  const walkwayLen = walkway.userData.length;
  const platform = buildPlatform(6, 1, DOCK.cellWidth, DOCK.cellLength, materials);
  platform.position.set(0, 0, walkwayLen);
  dock.add(platform);

  dock.userData.pierLength = walkwayLen + platform.userData.length;
  dock.userData.alongX = false;
  dock.userData.deckTopY = DOCK.deckTopY;
  dock.userData.walkwayLength = walkwayLen;
  dock.userData.platformWidth = platform.userData.width;
  dock.userData.platformLength = platform.userData.length;

  return dock;
}

/**
 * @param {THREE.Object3D} pier
 * @param {ReturnType<typeof buildHarborRoute>} route
 * @param {{ routeT: number, lateral: number, waterlineY?: number, flip?: boolean, lengthBias?: number }} placement
 */
export function placePierOnHarborRoute(pier, route, placement) {
  const along = route.dist * placement.routeT;
  const px = route.spawnX + route.ux * along + route.px * (placement.lateral ?? 0);
  const pz = route.spawnZ + route.uz * along + route.pz * (placement.lateral ?? 0);
  const waterlineY = placement.waterlineY ?? 0;
  const pierLength = pier.userData.pierLength ?? 40;
  const flip = placement.flip ? -1 : 1;
  const lengthBias = placement.lengthBias ?? 0.05;

  const extendX = -route.ux * flip;
  const extendZ = -route.uz * flip;
  let yaw = Math.atan2(extendX, extendZ);
  if (pier.userData.alongX) yaw += Math.PI / 2;

  pier.rotation.y = yaw;
  pier.position.set(
    px + extendX * pierLength * lengthBias,
    waterlineY,
    pz + extendZ * pierLength * lengthBias
  );

  return pier;
}

/** Boat hull clearance radius for pier collision (m). */
export const BOAT_DOCK_COLLISION_RADIUS = 3.6;

let activeHarborDockBerth = null;
let activeDockColliders = [];

/**
 * @returns {import('./missionWaypoints.js').WaypointZone | null}
 */
export function getActiveHarborDockBerth() {
  return activeHarborDockBerth;
}

/**
 * @returns {Array<{ minX: number, maxX: number, minZ: number, maxZ: number }>}
 */
export function getActiveDockColliders() {
  return activeDockColliders;
}

/**
 * @param {THREE.Object3D} dockGroup
 * @param {ReturnType<typeof buildHarborRoute>} route
 */
function computeBerthZoneFromDock(dockGroup, route) {
  dockGroup.updateMatrixWorld(true);
  const platform = dockGroup.getObjectByName('BerthPlatform');
  if (!platform) return null;

  const walkwayLen = dockGroup.userData.walkwayLength ?? 0;
  const zoneWidth = 10;
  const zoneLength = 22;

  // Open water beside the pier — not on the planks.
  const localXDir = new THREE.Vector3(1, 0, 0).applyQuaternion(dockGroup.quaternion);
  const towardWater = localXDir.x * route.px + localXDir.z * route.pz;
  const sideSign = towardWater >= 0 ? 1 : -1;

  const pierHalfW = Math.max(DOCK.walkwayWidth, platform.userData.width) * 0.5;
  const localX = sideSign * (pierHalfW + zoneWidth * 0.5 + 8);  // Adjusted to 8 for proper docking distance

  // Centered on the walkway line at the T-head, but shifted out into the water.
  const localZ = walkwayLen - zoneLength * 0.32;

  const localPoint = new THREE.Vector3(localX, 0, localZ);
  localPoint.applyMatrix4(dockGroup.matrixWorld);

  return {
    x: localPoint.x,
    z: localPoint.z,
    length: zoneLength,
    width: zoneWidth,
    berthHeadingDeg: route.berthHeadingDeg,
    seawardX: localXDir.x * sideSign,
    seawardZ: localXDir.z * sideSign,
    requireHeadingDeg: route.berthHeadingDeg,
    headingTolerance: 25,
    shape: 'berth',
    pierSide: 'port',
    maxSpeedKnots: 5
  };
}

/**
 * @param {ReturnType<typeof computeBerthZoneFromDock>} berth
 * @param {number} waterlineY
 */
function createBerthZoneVisual(berth, waterlineY) {
  const group = new THREE.Group();
  group.name = 'DockBerthZone';
  group.visible = false;

  const length = berth.length ?? 105;  // Increased from 22 to 65 to match trawler boat (60m)
  const width = berth.width ?? 8;     // Decreased from 10 to 8 for narrower, more realistic berth
  const headingRad = ((berth.berthHeadingDeg ?? 0) * Math.PI) / 180;
  const y = waterlineY + 0.4;

  const fillMat = new THREE.MeshBasicMaterial({
    color: 0x22c55e,
    transparent: true,
    opacity: 0,  // Keep the berth fill invisible so it cannot cover the boat.
    side: THREE.DoubleSide,
    depthWrite: false,
    depthTest: false
  });
  const fill = new THREE.Mesh(new THREE.PlaneGeometry(length, width), fillMat);
  fill.rotation.x = -Math.PI / 2;
  fill.rotation.z = -headingRad;
  fill.position.y = y;
  fill.renderOrder = 997;

  const edgeMat = new THREE.LineBasicMaterial({
    color: 0xfbbf24,  // Bright yellow/orange for high contrast border
    transparent: true,
    opacity: 0,
    depthWrite: false,
    depthTest: false
  });
  const edge = new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.PlaneGeometry(length, width)),
    edgeMat
  );
  edge.rotation.x = -Math.PI / 2;
  edge.rotation.z = -headingRad;
  edge.position.y = y + 0.02;
  edge.renderOrder = 998;

  group.add(fill, edge);
  group.position.set(berth.x, 0, berth.z);
  return group;
}

/**
 * @param {THREE.Object3D} dockGroup
 */
export function collectDockColliders(dockGroup) {
  const colliders = [];
  if (!dockGroup) return colliders;

  dockGroup.updateMatrixWorld(true);
  dockGroup.traverse((node) => {
    if (node.name !== 'DockSection') return;
    const box = new THREE.Box3().setFromObject(node);
    colliders.push({
      minX: box.min.x,
      maxX: box.max.x,
      minZ: box.min.z,
      maxZ: box.max.z
    });
  });
  return colliders;
}

/**
 * Resolve collision with dock structures (supports ROTATED rectangles)
 * @param {number} boatX
 * @param {number} boatZ
 * @param {Array} colliders - Array of collision boxes (can be rotated or axis-aligned)
 * @param {number} [radius]
 */
export function resolveDockCollision(boatX, boatZ, colliders, radius = BOAT_DOCK_COLLISION_RADIUS) {
  let x = boatX;
  let z = boatZ;
  let collided = false;

  for (const box of colliders) {
    // Check if this is a ROTATED rectangle (has rotation property)
    if (box.rotation !== undefined && box.centerX !== undefined) {
      // ROTATED RECTANGLE COLLISION
      const cos = Math.cos(-box.rotation); // Negative for inverse rotation
      const sin = Math.sin(-box.rotation);
      
      // Transform boat position to local (rotated) space
      const localX = (boatX - box.centerX) * cos - (boatZ - box.centerZ) * sin;
      const localZ = (boatX - box.centerX) * sin + (boatZ - box.centerZ) * cos;
      
      // Clamp to rectangle bounds in local space
      let nearestLocalX = Math.max(-box.halfWidth, Math.min(box.halfWidth, localX));
      let nearestLocalZ = Math.max(-box.halfDepth, Math.min(box.halfDepth, localZ));
      
      // Distance check in local space
      let dx = localX - nearestLocalX;
      let dz = localZ - nearestLocalZ;
      let distSq = dx * dx + dz * dz;
      
      if (distSq >= radius * radius) continue; // No collision
      
      collided = true;
      
      // Push boat away in local space
      if (distSq < 1e-8) {
        // Boat at exact center - push to nearest edge
        const dl = localX + box.halfWidth;
        const dr = box.halfWidth - localX;
        const dt = localZ + box.halfDepth;
        const db = box.halfDepth - localZ;
        const min = Math.min(dl, dr, dt, db);
        
        if (min === dl) {
          nearestLocalX = -box.halfWidth - radius;
          nearestLocalZ = localZ;
        } else if (min === dr) {
          nearestLocalX = box.halfWidth + radius;
          nearestLocalZ = localZ;
        } else if (min === dt) {
          nearestLocalX = localX;
          nearestLocalZ = -box.halfDepth - radius;
        } else {
          nearestLocalX = localX;
          nearestLocalZ = box.halfDepth + radius;
        }
        
        dx = localX - nearestLocalX;
        dz = localZ - nearestLocalZ;
      } else {
        // Normal push away from nearest point
        const dist = Math.sqrt(distSq);
        const pushFactor = (dist + radius) / dist;
        nearestLocalX = localX - dx * pushFactor;
        nearestLocalZ = localZ - dz * pushFactor;
      }
      
      // Transform back to world space
      x = box.centerX + (nearestLocalX * cos + nearestLocalZ * sin);
      z = box.centerZ + (-nearestLocalX * sin + nearestLocalZ * cos);
      
    } else {
      // AXIS-ALIGNED RECTANGLE COLLISION (legacy)
      const nearestX = Math.max(box.minX, Math.min(box.maxX, x));
      const nearestZ = Math.max(box.minZ, Math.min(box.maxZ, z));
      let dx = x - nearestX;
      let dz = z - nearestZ;
      let distSq = dx * dx + dz * dz;

      if (distSq >= radius * radius) continue;

      collided = true;
      if (distSq < 1e-8) {
        const dl = x - box.minX;
        const dr = box.maxX - x;
        const dt = z - box.minZ;
        const db = box.maxZ - z;
        const min = Math.min(dl, dr, dt, db);
        if (min === dl) x = box.minX - radius;
        else if (min === dr) x = box.maxX + radius;
        else if (min === dt) z = box.minZ - radius;
        else z = box.maxZ + radius;
      } else {
        const dist = Math.sqrt(distSq);
        const push = radius - dist;
        x += (dx / dist) * push;
        z += (dz / dist) * push;
      }
    }
  }

  return { x, z, collided };
}

/**
 * @param {THREE.Object3D | null} islandGroup
 * @param {number} waterlineY
 * @param {{ walkwayModules?: number, lateral?: number, routeT?: number }} options
 */
/**
 * Add harbor pole lights along the dock for nighttime visibility
 * @param {THREE.Object3D} dockGroup - The main dock structure
 * @param {THREE.Group} parentGroup - The harbor docks group
 */
function addHarborPoleLights(dockGroup, parentGroup) {
  const walkwayLength = dockGroup.userData.walkwayLength || 0;
  const platformWidth = dockGroup.userData.platformWidth || 0;
  
  // Pole specifications
  const poleHeight = 8; // 8 meters tall
  const poleRadius = 0.15;
  const lightHeight = poleHeight - 0.5; // Light slightly below pole top
  const spacing = 15; // 15 meters between poles
  
  // Create pole material (dark gray metal)
  const poleMaterial = new THREE.MeshStandardMaterial({
    color: 0x2a2a2a,
    metalness: 0.8,
    roughness: 0.3
  });
  
  // Create light bulb material (warm yellow, highly emissive for day/night visibility)
  const bulbMaterial = new THREE.MeshStandardMaterial({
    color: 0xffff00, // Brighter yellow
    emissive: 0xffff00, // Yellow glow
    emissiveIntensity: 5.0 // Very bright so visible in daytime
  });
  
  // Place poles along the walkway (both sides)
  const numPoles = Math.floor(walkwayLength / spacing);
  for (let i = 0; i <= numPoles; i++) {
    const zPos = i * spacing;
    
    // Left side pole
    addSinglePoleLight(dockGroup.position.x - 2, zPos, poleMaterial, bulbMaterial, poleHeight, poleRadius, lightHeight, parentGroup);
    
    // Right side pole
    addSinglePoleLight(dockGroup.position.x + 2, zPos, poleMaterial, bulbMaterial, poleHeight, poleRadius, lightHeight, parentGroup);
  }
  
  // Add poles at platform corners
  const platformZ = walkwayLength;
  addSinglePoleLight(dockGroup.position.x - platformWidth / 2 + 2, platformZ + 2, poleMaterial, bulbMaterial, poleHeight, poleRadius, lightHeight, parentGroup);
  addSinglePoleLight(dockGroup.position.x + platformWidth / 2 - 2, platformZ + 2, poleMaterial, bulbMaterial, poleHeight, poleRadius, lightHeight, parentGroup);
  addSinglePoleLight(dockGroup.position.x - platformWidth / 2 + 2, platformZ + 18, poleMaterial, bulbMaterial, poleHeight, poleRadius, lightHeight, parentGroup);
  addSinglePoleLight(dockGroup.position.x + platformWidth / 2 - 2, platformZ + 18, poleMaterial, bulbMaterial, poleHeight, poleRadius, lightHeight, parentGroup);
}

/**
 * Add a single harbor pole light
 * @param {number} x - X position
 * @param {number} z - Z position
 * @param {THREE.Material} poleMaterial - Material for the pole
 * @param {THREE.Material} bulbMaterial - Material for the light bulb
 * @param {number} poleHeight - Height of the pole
 * @param {number} poleRadius - Radius of the pole
 * @param {number} lightHeight - Height where the light is positioned
 * @param {THREE.Group} parentGroup - Group to add the pole to
 */
function addSinglePoleLight(x, z, poleMaterial, bulbMaterial, poleHeight, poleRadius, lightHeight, parentGroup) {
  // Create pole (cylinder)
  const poleGeometry = new THREE.CylinderGeometry(poleRadius, poleRadius, poleHeight, 8);
  const pole = new THREE.Mesh(poleGeometry, poleMaterial);
  pole.position.set(x, poleHeight / 2, z);
  pole.castShadow = true;
  pole.receiveShadow = true;
  parentGroup.add(pole);
  
  // Create horizontal crossbar (T-shape)
  const crossbarLength = 4; // Length of horizontal bar
  const crossbarGeometry = new THREE.CylinderGeometry(poleRadius * 0.7, poleRadius * 0.7, crossbarLength, 8);
  const crossbar = new THREE.Mesh(crossbarGeometry, poleMaterial);
  crossbar.position.set(x, lightHeight, z);
  crossbar.rotation.z = Math.PI / 2; // Rotate to horizontal
  crossbar.castShadow = true;
  crossbar.receiveShadow = true;
  parentGroup.add(crossbar);
  
  // Add light bulbs at each end of the crossbar (2 lights)
  const bulbOffset = crossbarLength / 2;
  
  // Left bulb - larger and brighter for visibility
  const leftBulbGeometry = new THREE.SphereGeometry(0.6, 16, 16); // Increased from 0.3 to 0.6
  const leftBulb = new THREE.Mesh(leftBulbGeometry, bulbMaterial);
  leftBulb.position.set(x - bulbOffset, lightHeight, z);
  parentGroup.add(leftBulb);
  
  // Right bulb - larger and brighter for visibility
  const rightBulbGeometry = new THREE.SphereGeometry(0.6, 16, 16); // Increased from 0.3 to 0.6
  const rightBulb = new THREE.Mesh(rightBulbGeometry, bulbMaterial);
  rightBulb.position.set(x + bulbOffset, lightHeight, z);
  parentGroup.add(rightBulb);
  
  // Create point lights at each bulb position - reduced intensity for realistic harbor lighting
  const leftLight = new THREE.PointLight(0xfff4e0, 1.5, 50);
  leftLight.position.set(x - bulbOffset, lightHeight, z);
  leftLight.castShadow = true;
  leftLight.shadow.bias = -0.001;
  leftLight.shadow.mapSize.width = 1024;
  leftLight.shadow.mapSize.height = 1024;
  parentGroup.add(leftLight);
  
  const rightLight = new THREE.PointLight(0xfff4e0, 1.5, 50);
  rightLight.position.set(x + bulbOffset, lightHeight, z);
  rightLight.castShadow = true;
  rightLight.shadow.bias = -0.001;
  rightLight.shadow.mapSize.width = 1024;
  rightLight.shadow.mapSize.height = 1024;
  parentGroup.add(rightLight);
  
  // Add lamp housings (cone shades pointing down) at each end
  const shadeGeometry = new THREE.ConeGeometry(0.6, 0.8, 8);
  const shadeMaterial = new THREE.MeshStandardMaterial({
    color: 0x1a1a1a,
    metalness: 0.7,
    roughness: 0.4
  });
  
  const leftShade = new THREE.Mesh(shadeGeometry, shadeMaterial);
  leftShade.position.set(x - bulbOffset, lightHeight + 0.5, z);
  leftShade.castShadow = true;
  parentGroup.add(leftShade);
  
  const rightShade = new THREE.Mesh(shadeGeometry, shadeMaterial);
  rightShade.position.set(x + bulbOffset, lightHeight + 0.5, z);
  rightShade.castShadow = true;
  parentGroup.add(rightShade);
}

export function buildHarborDocks(islandGroup, waterlineY = 0, options = {}) {
  const procedural = islandGroup?.userData?.isProceduralTerrain === true;
  const routeX = procedural ? HARBOR_CHANNEL_ORIGIN.x : SIMULATION_SPAWN.x;
  const routeZ = procedural ? HARBOR_CHANNEL_ORIGIN.z : SIMULATION_SPAWN.z;
  const harborRoute = buildHarborRoute(routeX, routeZ, islandGroup);
  const materials = createDockMaterials();

  const group = new THREE.Group();
  group.name = 'HarborDocks';
  group.userData.sharedMaterials = Object.values(materials);

  const mainDock = buildTDock(materials, {
    walkwayModules: options.walkwayModules ?? (procedural ? 12 : 10),
  });
  mainDock.name = 'MainHarborDock';
  placePierOnHarborRoute(mainDock, harborRoute, {
    routeT: options.routeT ?? (procedural ? 0.97 : 0.46),
    lateral: options.lateral ?? (procedural ? -6 : -8),
    waterlineY,
    lengthBias: procedural ? 0.02 : 0.04
  });
  group.add(mainDock);

  // Add harbor pole lights along the dock
  addHarborPoleLights(mainDock, group);

  activeHarborDockBerth = computeBerthZoneFromDock(mainDock, harborRoute);
  activeDockColliders = collectDockColliders(group);

  if (activeHarborDockBerth) {
    group.add(createBerthZoneVisual(activeHarborDockBerth, waterlineY));
  }

  return group;
}

/**
 * Try to load a GLB dock model; returns null if the file isn't found.
 * @param {string} glbPath
 * @param {THREE.Object3D | null} islandGroup
 * @param {number} waterlineY
 */
async function loadHarborDocksFromGlb(glbPath, islandGroup, waterlineY) {
  const loader = new GLTFLoader();
  let gltf;
  try {
    gltf = await new Promise((resolve, reject) => loader.load(glbPath, resolve, undefined, reject));
  } catch {
    return null;
  }

  const procedural = islandGroup?.userData?.isProceduralTerrain === true;
  const routeX = procedural ? HARBOR_CHANNEL_ORIGIN.x : SIMULATION_SPAWN.x;
  const routeZ = procedural ? HARBOR_CHANNEL_ORIGIN.z : SIMULATION_SPAWN.z;
  const harborRoute = buildHarborRoute(routeX, routeZ, islandGroup);

  const group = new THREE.Group();
  group.name = 'HarborDocks';

  const model = gltf.scene;
  model.name = 'MainHarborDock';
  // Scale up the wharf significantly to fit large boats (180m LOA reference)
  // 500x scale - balanced size for commercial port
  model.scale.set(500, 500, 500);
  
  // Position the port ON THE VISIBLE SHORE - based on screenshot analysis
  // Boat is at ~X:12000, port structure visible on left/west side
  const heightmapCache = getCachedHeightmapSync();
  
  // Put port on the visible shore structure (left/west of boat position)
  let portX = 17300;   // Move EAST - increased from 17200 to 19000
  let portZ = -4300;   // Match general area
  let groundY = waterlineY;
  
  if (heightmapCache) {
    // Sample positions near the visible shore structure
    const testPositions = [
      { x: 11200, z: -4300, label: 'Shore X:11200' },
      { x: 11000, z: -4300, label: 'X:11000' },
      { x: 11400, z: -4300, label: 'X:11400' },
      { x: 11200, z: -4100, label: 'North X:11200' },
      { x: 11200, z: -4500, label: 'South X:11200' },
      { x: 10800, z: -4300, label: 'Further west X:10800' }
    ];
    
    console.log('[HarborDocks] Searching for shore/land position on VISIBLE shore (positive X)...');
    let bestPosition = null;
    let highestElevation = waterlineY;
    
    for (const pos of testPositions) {
      const elev = sampleHeightmapElevation(heightmapCache, pos.x, pos.z);
      console.log(`[HarborDocks] ${pos.label} (${pos.x}, ${pos.z}): elevation = ${elev.toFixed(2)}m`);
      
      // If this position is on land (above water), consider it
      if (elev > waterlineY + 1 && elev > highestElevation) {
        highestElevation = elev;
        bestPosition = pos;
      }
    }
    
    if (bestPosition) {
      portX = bestPosition.x;
      portZ = bestPosition.z;
      groundY = highestElevation;
      console.log(`[HarborDocks] ✅ Found land at ${bestPosition.label}: (${portX}, ${portZ}) elevation ${groundY.toFixed(2)}m`);
    } else {
      console.warn('[HarborDocks] ⚠️ No land found in test positions, using default shore coordinates');
      // Even if heightmap fails, use shore coordinates (not ocean)
      groundY = waterlineY + 5;  // Assume 5m above water for shore
    }
  } else {
    console.warn('[HarborDocks] No heightmap available, placing on shore at default coordinates');
    groundY = waterlineY + 5;  // Place 5m above water level
  }
  
  // Place port slightly lower - just 10 meters down from ground level
  const portY = Math.max(groundY, waterlineY) - 10;  // Lower by 10 meters only
  console.log(`[HarborDocks] Final port position: (${portX}, ${portY.toFixed(2)}, ${portZ})`);
  
  model.position.set(portX, portY, portZ);
  // Rotate port to face SOUTH (180 degrees)
  // 0° = North, 90° = East, 180° = South, 270° = West
  model.rotation.y = Math.PI;  // 180 degrees = facing South
  
  // Fix materials for proper lighting - make the port visible with realistic colors
  model.traverse((n) => { 
    if (n.isMesh) { 
      n.castShadow = true; 
      n.receiveShadow = true;
      
      // Fix material to respond to lighting properly
      if (n.material) {
        // If material exists, ensure it's a MeshStandardMaterial for proper lighting
        if (!(n.material instanceof THREE.MeshStandardMaterial)) {
          const oldMaterial = n.material;
          n.material = new THREE.MeshStandardMaterial({
            color: oldMaterial.color || 0xcccccc,  // Light gray default
            map: oldMaterial.map || null,
            roughness: 0.8,
            metalness: 0.2,
            side: THREE.DoubleSide
          });
          oldMaterial.dispose();
        } else {
          // Already standard material, just ensure proper properties
          n.material.roughness = Math.max(n.material.roughness || 0, 0.6);
          n.material.metalness = Math.min(n.material.metalness || 0, 0.3);
          n.material.needsUpdate = true;
        }
      }
    } 
  });
  
  group.add(model);

  // AUTOMATIC COLLISION BOX: Calculate from actual GLB model bounds
  model.updateMatrixWorld(true);
  const portBBox = new THREE.Box3().setFromObject(model);
  
  if (!portBBox.isEmpty()) {
    const portSize = new THREE.Vector3();
    portBBox.getSize(portSize);
    const portCenter = new THREE.Vector3();
    portBBox.getCenter(portCenter);
    
    console.log('[HarborDocks] PORT GLB ACTUAL SIZE:', {
      width: portSize.x.toFixed(1) + 'm',
      height: portSize.y.toFixed(1) + 'm', 
      depth: portSize.z.toFixed(1) + 'm',
      centerX: portCenter.x.toFixed(1),
      centerZ: portCenter.z.toFixed(1)
    });
    
    // Use ACTUAL dimensions from GLB - TIGHT FIT (no extra margin)
    // Reduce size by 10% to ensure collision box stays INSIDE port structure
    const sizeFactor = 0.96; // 90% of actual size (10% reduction)
    const collisionHalfWidth = (portSize.x / 2) * sizeFactor;
    const collisionHalfDepth = (portSize.z / 2) * sizeFactor;
    
    // Berth zone beside the port - extended long berth for full docking area
    // Covers entire approach from start position to end of dock
    activeHarborDockBerth = {
      x: portCenter.x - collisionHalfWidth - 12,  // 12m west of collision box
      z: portCenter.z,
      length: 500,  // Much longer to cover entire docking area from start to end
      width: 10,     // Narrower width for realistic berth
      berthHeadingDeg: 270,  // Facing WEST
      seawardX: -1,
      seawardZ: 0,
      requireHeadingDeg: 270,
      headingTolerance: 25,
      shape: 'berth',
      pierSide: 'port',
      maxSpeedKnots: 1.5
    };
    
    // COLLISION BOX: Use ACTUAL port dimensions with rotation
    activeDockColliders = [
      {
        centerX: portCenter.x,
        centerZ: portCenter.z,
        halfWidth: collisionHalfWidth,
        halfDepth: collisionHalfDepth,
        rotation: model.rotation.y,  // Use ACTUAL port rotation
        
        // Legacy bounds
        minX: portCenter.x - collisionHalfWidth,
        maxX: portCenter.x + collisionHalfWidth,
        minZ: portCenter.z - collisionHalfDepth,
        maxZ: portCenter.z + collisionHalfDepth
      }
    ];
    
    console.log('[HarborDocks] COLLISION BOX from GLB:', {
      width: (collisionHalfWidth * 2).toFixed(1) + 'm',
      depth: (collisionHalfDepth * 2).toFixed(1) + 'm',
      rotation: (model.rotation.y * 180 / Math.PI).toFixed(1) + '°',
      center: `(${portCenter.x.toFixed(1)}, ${portCenter.z.toFixed(1)})`
    });
    
    console.log('[HarborDocks] ✅ Collision box AUTO-FITTED to port GLB model (visualization disabled)');
  } else {
    console.error('[HarborDocks] ❌ Could not calculate port bounding box!');
  }

  group.add(createBerthZoneVisual(activeHarborDockBerth, waterlineY));
  // Mount lamps after measuring the dock so lighting cannot alter collision or spawn bounds.
  addWharfPoleLights(model);
  return group;
}

export async function loadHarborDocks(_loader, islandGroup, waterlineY = 0, options = {}) {
  const glbPath = options.glbPath ?? HARBOR_DOCK_GLB;
  const glbGroup = await loadHarborDocksFromGlb(glbPath, islandGroup, waterlineY);
  if (glbGroup) {
    console.info(`[HarborDocks] Loaded dock from ${glbPath}`);
    return glbGroup;
  }
  // No GLB found — build procedural dock
  return buildHarborDocks(islandGroup, waterlineY, {
    walkwayModules: options.mainSegments ?? options.walkwayModules ?? 10,
    lateral: options.lateral,
    routeT: options.routeT
  });
}

/**
 * @param {THREE.Object3D | null} group
 */
export function disposeHarborDockGroup(group) {
  if (!group) return;

  activeHarborDockBerth = null;
  activeDockColliders = [];

  const disposedMats = new Set();
  group.traverse((obj) => {
    obj.userData.glowTexture?.dispose();
    if (obj.geometry) obj.geometry.dispose();
    if (obj.material && !disposedMats.has(obj.material)) {
      disposedMats.add(obj.material);
      if (Array.isArray(obj.material)) obj.material.forEach((m) => m.dispose());
      else obj.material.dispose();
    }
  });
}
