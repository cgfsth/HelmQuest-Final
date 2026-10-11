import * as THREE from 'three';
import { SAMAL_STRAIT_SPAWN } from './sceneEnvironment.js';
import { gpsToWorld } from './davaoGulfData.js';

/**
 * Geographic landmarks for navigation and orientation
 */

// Samal Island center point (approximate)
const samalGPS = { lat: 7.17, lon: 125.75 };
const samalWorld = gpsToWorld(samalGPS.lat, samalGPS.lon);

// Convert to world coordinates (multiply by 1000 to get meters)
const samalX = samalWorld.x * 1000;
const samalZ = samalWorld.z * 1000;

console.log(`[Landmarks] Samal Island: X=${samalX}, Z=${samalZ}`);

/**
 * Landmarks that appear on compass/map for navigation reference
 */
export const LANDMARKS = [
  {
    id: 'samal-island',
    label: 'SAMAL ISLAND',
    x: samalX,
    z: samalZ,
    type: 'island',
    icon: '🏝️'
  },
  {
    id: 'sasa-port',
    label: 'SASA PORT',
    x: -5786,
    z: -111,
    type: 'port',
    icon: '⚓'
  }
];

export const LANDMARK_COLOR = 0x4ade80; // Green for islands
export const LANDMARK_PORT_COLOR = 0x60a5fa; // Blue for ports

/**
 * Check if boat is near a landmark
 */
export function getNearbyLandmark(boatX, boatZ, maxDistance = 2000) {
  for (const landmark of LANDMARKS) {
    const dx = boatX - landmark.x;
    const dz = boatZ - landmark.z;
    const dist = Math.sqrt(dx * dx + dz * dz);
    
    if (dist <= maxDistance) {
      return { ...landmark, distance: dist };
    }
  }
  return null;
}
