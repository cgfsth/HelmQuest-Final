/**
 * Trawl Net Fishing System
 * Handles commercial trawl net deployment, fishing, and retrieval
 */

import * as THREE from 'three';
import { createFishingTowRope, getFishingNetDimensions, updateFishingTowRope } from './fishingNetVisuals.js';

// Net configuration
const NET_CONFIG = {
  width: 12,              // meters
  height: 8,              // meters  
  depth: 5,               // meters
  distanceBehind: 20,     // meters behind boat
  cableLength: 25,        // meters
  meshColor: 0x78968c,    // Muted wet netting
  opacity: 0.32,
  deployTime: 3000,       // milliseconds
  retrieveTime: 4000      // milliseconds
};

/**
 * Create the trawl net mesh
 */
export function createTrawlNetMesh() {
  const group = new THREE.Group();
  group.name = 'TrawlNetSystem';

  // An open mouth above a tapered bag, rather than an inverted rigid cone.
  const netGeometry = new THREE.CylinderGeometry(
    NET_CONFIG.width / 2,    // radius at opening
    0.8,                      // narrow cod end
    NET_CONFIG.depth,         // length of cone
    24,                       // radial segments
    14,                       // height segments
    true                      // open-ended
  );

  // Net material - semi-transparent with wireframe
  const netMaterial = new THREE.MeshBasicMaterial({
    color: NET_CONFIG.meshColor,
    transparent: true,
    opacity: NET_CONFIG.opacity,
    wireframe: true,
    side: THREE.DoubleSide,
    depthWrite: false
  });

  const netMesh = new THREE.Mesh(netGeometry, netMaterial);
  // Keep vertical orientation - cone points downward into water
  netMesh.rotation.x = 0; 
  netMesh.name = 'TrawlNet';

  // Create cod end (back of net) - sphere for caught fish
  const codEndGeometry = new THREE.SphereGeometry(1.5, 8, 8);
  const codEndMaterial = new THREE.MeshBasicMaterial({
    color: 0x654321,
    transparent: true,
    opacity: .35,
    wireframe: true,
    depthWrite: false
  });
  const codEnd = new THREE.Mesh(codEndGeometry, codEndMaterial);
  codEnd.position.y = -NET_CONFIG.depth / 2; // Move to bottom of vertical net
  codEnd.name = 'CodEnd';
  netMesh.add(codEnd);

  group.add(netMesh);

  // Create floats/buoys at the opening (visible at water surface)
  // Add floats to main group (NOT to netMesh) so they stay at surface when net sinks
  const floatGroup = new THREE.Group();
  floatGroup.name = 'NetFloats';
  const numFloats = 8;
  const floatRadius = NET_CONFIG.width / 2;
  const floatGeometry = new THREE.SphereGeometry(.3, 12, 8);
  const floatMaterial = new THREE.MeshStandardMaterial({ color: 0xc6b88b, roughness: .85 });
  
  for (let i = 0; i < numFloats; i++) {
    const angle = (i / numFloats) * Math.PI * 2;
    const float = new THREE.Mesh(floatGeometry, floatMaterial);
    float.position.set(
      Math.cos(angle) * floatRadius,
      NET_CONFIG.depth / 2, // At the top of the cone (water surface level)
      Math.sin(angle) * floatRadius
    );
    floatGroup.add(float);
  }
  
  // Add floats to main group (not netMesh) so they can stay at surface
  group.add(floatGroup);

  // Create trawl cables
  const cableGroup = createTrawlCables();
  cableGroup.name = 'TrawlCables';
  group.add(cableGroup);

  group.visible = false;
  group.userData.deployed = false;

  return group;
}

/**
 * Create trawl cables connecting boat to net
 */
function createTrawlCables() {
  const cableGroup = new THREE.Group();
  cableGroup.add(createFishingTowRope(), createFishingTowRope());
  return cableGroup;
}

const _boatPosition = new THREE.Vector3();
const _boatQuaternion = new THREE.Quaternion();
const _offset = new THREE.Vector3();
const _attachment = new THREE.Vector3();
const _netAttachment = new THREE.Vector3();

/**
 * Update trawl net position to follow boat
 */
export function updateTrawlNetPosition(netGroup, boatObject, animProgress = 1.0, elapsed = 0, waterY = 0) {
  if (!netGroup || !boatObject) return;

  const dimensions = getFishingNetDimensions(boatObject);
  const progress = THREE.MathUtils.clamp(animProgress, .001, 1);
  boatObject.getWorldPosition(_boatPosition);
  boatObject.getWorldQuaternion(_boatQuaternion);
  _offset.set(-dimensions.behind, 0, 0).applyQuaternion(_boatQuaternion);
  netGroup.position.copy(_boatPosition).add(_offset);
  netGroup.position.y = waterY - dimensions.depth * progress / 2;
  // Keep the floats level with the water even when the boat rolls and pitches.
  netGroup.rotation.set(0, Math.atan2(_offset.z, -_offset.x), 0);
  const widthScale = dimensions.width / NET_CONFIG.width * progress;
  const depthScale = dimensions.depth / NET_CONFIG.depth * progress;
  netGroup.scale.set(widthScale, depthScale, widthScale);
  netGroup.userData.dimensions = dimensions;

  // Update net mesh visibility and fade based on depth
  const netMesh = netGroup.getObjectByName('TrawlNet');
  if (netMesh) {
    netMesh.visible = animProgress > 0.1;
    
    netMesh.material.opacity = NET_CONFIG.opacity;
    // A small current bends the lower bag while the mouth stays anchored to its floats.
    const positions = netMesh.geometry.attributes.position;
    const original = netMesh.userData.restPositions ??= positions.array.slice();
    for (let i = 0; i < positions.count; i++) {
      const d = .5 - original[i * 3 + 1] / NET_CONFIG.depth;
      positions.setZ(i, original[i * 3 + 2] + Math.sin(elapsed * .9 + d * 2) * d * .35);
    }
    positions.needsUpdate = true;
  }

  // Update cables
  const cables = netGroup.getObjectByName('TrawlCables');
  if (cables) {
    cables.visible = animProgress > 0.1;
    netGroup.updateMatrixWorld(true);
    for (let i = 0; i < cables.children.length; i++) {
      const side = i === 0 ? -1 : 1;
      _attachment.set(-dimensions.sternBack, 0, side * dimensions.loa * .07).applyQuaternion(_boatQuaternion).add(_boatPosition);
      _attachment.y = waterY + THREE.MathUtils.clamp(dimensions.loa * .018, .3, 2.5);
      netGroup.worldToLocal(_attachment);
      _netAttachment.set(0, NET_CONFIG.depth / 2, side * NET_CONFIG.width / 2);
      updateFishingTowRope(cables.children[i], _attachment, _netAttachment, Math.min(dimensions.loa * .015, .6) / depthScale);
    }
  }
  const floats = netGroup.getObjectByName('NetFloats');
  if (floats) {
    floats.children.forEach((cork, i) => {
      cork.position.y = NET_CONFIG.depth / 2 + Math.sin(elapsed * 1.6 + i) * .06 / depthScale;
      cork.scale.set(dimensions.floatRadius * 1.3 / (.3 * widthScale), dimensions.floatRadius * .8 / (.3 * depthScale), dimensions.floatRadius / (.3 * widthScale));
    });
  }
}

/**
 * Create bounding box for net collision detection
 */
export function getTrawlNetBounds(netGroup) {
  if (!netGroup || !netGroup.visible) return null;

  const netMesh = netGroup.getObjectByName('TrawlNet');
  if (!netMesh) return null;

  const box = new THREE.Box3();
  box.setFromObject(netMesh);
  return box;
}

/**
 * Check if a fish position is inside the trawl net
 */
export function isFishInNet(fishPosition, netGroup) {
  const bounds = getTrawlNetBounds(netGroup);
  if (!bounds) return false;

  return bounds.containsPoint(fishPosition);
}

/**
 * Spawn fish entities in the world
 */
export function spawnFishEntity(scene, position, species) {
  const fishGeometry = new THREE.ConeGeometry(0.3, 0.8, 8);
  const fishColors = {
    'Tamban': 0x4169E1,    // Blue
    'Galunggong': 0x32CD32, // Green
    'Dilis': 0xFFD700,      // Gold
    'Matangbaka': 0xFF6347  // Red
  };

  const color = fishColors[species] || 0x808080;
  const fishMaterial = new THREE.MeshLambertMaterial({ color });
  const fishMesh = new THREE.Mesh(fishGeometry, fishMaterial);

  fishMesh.position.copy(position);
  fishMesh.rotation.x = Math.PI / 2; // Orient horizontally
  fishMesh.userData.species = species;
  fishMesh.userData.isFish = true;
  fishMesh.userData.swimSpeed = 0.5 + Math.random() * 0.5;
  fishMesh.userData.swimDirection = Math.random() * Math.PI * 2;
  fishMesh.name = `Fish_${species}_${Date.now()}`;

  scene.add(fishMesh);
  return fishMesh;
}

/**
 * Update fish swimming behavior
 */
export function updateFishSwimming(fishMesh, deltaTime) {
  if (!fishMesh || !fishMesh.userData.isFish) return;

  // Simple swimming pattern
  const speed = fishMesh.userData.swimSpeed;
  const direction = fishMesh.userData.swimDirection;

  fishMesh.position.x += Math.cos(direction) * speed * deltaTime;
  fishMesh.position.z += Math.sin(direction) * speed * deltaTime;

  // Randomize direction occasionally
  if (Math.random() < 0.01) {
    fishMesh.userData.swimDirection = Math.random() * Math.PI * 2;
  }

  // Keep fish in bounds (simple wrap-around)
  const maxDist = 200;
  if (Math.abs(fishMesh.position.x) > maxDist) {
    fishMesh.position.x = -Math.sign(fishMesh.position.x) * maxDist;
  }
  if (Math.abs(fishMesh.position.z) > maxDist) {
    fishMesh.position.z = -Math.sign(fishMesh.position.z) * maxDist;
  }

  // Bob up and down
  fishMesh.position.y = -5 + Math.sin(Date.now() * 0.001 + fishMesh.position.x) * 2;
}

/**
 * Get random fish species from available types
 */
export function getRandomFishSpecies() {
  const species = ['Tamban', 'Galunggong', 'Dilis', 'Matangbaka'];
  return species[Math.floor(Math.random() * species.length)];
}

/**
 * Spawn initial fish population
 */
export function spawnFishPopulation(scene, count = 100) {
  const fishes = [];
  const spawnRadius = 150;

  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const distance = Math.random() * spawnRadius;
    const position = new THREE.Vector3(
      Math.cos(angle) * distance,
      -5 - Math.random() * 10, // 5-15 meters depth
      Math.sin(angle) * distance
    );

    const species = getRandomFishSpecies();
    const fish = spawnFishEntity(scene, position, species);
    fishes.push(fish);
  }

  return fishes;
}

export { NET_CONFIG };
