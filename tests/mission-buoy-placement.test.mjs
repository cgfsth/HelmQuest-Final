import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PNG } from 'pngjs';
import * as THREE from 'three';
import { sampleHeightmapElevation } from '../src/helpers/terrainHeightmap.js';
import { createBuoyWaterCheck, placeMissionBuoysOffshore } from '../src/helpers/missionBuoyPlacement.js';
import { resolveModuleWaypoints, distanceToZoneEdge } from '../src/helpers/missionWaypoints.js';
import { worldToGps } from '../src/helpers/davaoGulfData.js';
import { createTerrainBackdrop } from '../src/helpers/terrainGenerator.js';

const cache = PNG.sync.read(readFileSync(new URL('../public/davao-heightmap.png', import.meta.url)));
const terrain = new THREE.Group();
terrain.userData.isProceduralTerrain = true;
terrain.userData.tileManager = { cache };
const departure = { x: 17174.3276, z: -4299.9008 };

function assertOffshore(zone) {
  assert.ok(sampleHeightmapElevation(cache, zone.x, zone.z) < -2, `${zone.id} must float in water`);
  // Independently sample the surrounding approach, including smaller coastline features.
  for (let dx = -550; dx <= 550; dx += 40) {
    for (let dz = -550; dz <= 550; dz += 40) {
      if (dx * dx + dz * dz > 550 * 550) continue;
      assert.ok(sampleHeightmapElevation(cache, zone.x + dx, zone.z + dz) < -2, `${zone.id} needs clearance from shore at ${dx},${dz}`);
    }
  }
}

test('mission headings from the real port place buoys in Davao Gulf water with shoreline clearance', () => {
  const steps = [45, 90, 135, 180, 270].map((heading, index) => ({ type: 'compass', heading: String(heading), waypointZone: `buoy-${index + 1}` }));
  steps.push({ type: 'dock', waypointZone: 'return-port' });
  const zones = resolveModuleWaypoints('custom-shore-regression', departure.x, departure.z, terrain, steps);
  assert.equal(zones.length, steps.length);
  const buoys = zones.filter(zone => zone.zoneType === 'nav');
  for (const [index, zone] of buoys.entries()) {
    assertOffshore(zone);
    const minimum = [3000, 4000, 5000][Math.min(index, 2)];
    assert.ok(distanceToZoneEdge(departure.x, departure.z, zone) >= minimum - 1e-6, `${zone.id} needs a longer voyage from port`);
    for (const other of buoys.slice(0, index)) assert.ok(Math.hypot(zone.x - other.x, zone.z - other.z) >= 1000, 'students must navigate between distinct buoy locations');
  }
  assert.deepEqual(zones.map(zone => zone.id), steps.map(step => step.waypointZone));
  const dock = zones.at(-1);
  assert.equal(dock.zoneType, 'dock');
  assert.equal(dock.x, departure.x);
  assert.equal(dock.z, departure.z - 100);
});

test('a buoy in a shoreline cove moves offshore even when its center is already below sea level', () => {
  const zone = { id: 'shore-cove', x: 18023, z: -5000, radius: 40, zoneType: 'nav', label: 'Buoy 1', description: 'Photograph the buoy', color: 0xa78bfa };
  assert.ok(sampleHeightmapElevation(cache, zone.x, zone.z) < -2);
  assert.equal(createBuoyWaterCheck(terrain)(zone.x, zone.z), false);
  const [placed] = placeMissionBuoysOffshore([zone], terrain, [], departure);
  assert.ok(placed.x !== zone.x || placed.z !== zone.z);
  assertOffshore(placed);
  assert.deepEqual({ ...placed, x: zone.x, z: zone.z }, zone, 'retain identity and task metadata');
  assert.deepEqual(placeMissionBuoysOffshore([zone], terrain, [], departure), [placed], 'refresh and restart use stable positions');
});

test('valid GPS buoy coordinates and the return-to-port zone stay unchanged', () => {
  const water = { id: 'gps-water', x: 15000, z: -8000, radius: 40, zoneType: 'nav' };
  const dock = { id: 'harbor-return', x: departure.x, z: departure.z, zoneType: 'dock', shape: 'berth' };
  assertOffshore(water);
  const placed = placeMissionBuoysOffshore([water, dock], terrain, [], departure);
  assert.equal(placed[0], water);
  assert.equal(placed[1], dock);
  const gps = worldToGps(water.x / 1000, water.z / 1000);
  const [resolved] = resolveModuleWaypoints('custom-gps-ocean', departure.x, departure.z, terrain,
    [{ type: 'gps', lat: gps.lat, lon: gps.lon, waypointZone: water.id }]);
  assert.ok(Math.abs(resolved.x - water.x) < 1e-6 && Math.abs(resolved.z - water.z) < 1e-6, 'keep the configured GPS coordinates when already offshore');
});

test('multiple buoys on land retain separate offshore locations and their mission IDs', () => {
  const zones = [1, 2, 3].map(index => ({ id: `land-buoy-${index}`, x: 18500, z: -4500, radius: 40, zoneType: 'nav' }));
  assert.ok(sampleHeightmapElevation(cache, zones[0].x, zones[0].z) > 0);
  const placed = placeMissionBuoysOffshore(zones, terrain, [], departure);
  placed.forEach(assertOffshore);
  for (let i = 0; i < placed.length; i++) {
    assert.equal(placed[i].id, zones[i].id);
    for (let j = 0; j < i; j++) assert.ok(Math.hypot(placed[i].x - placed[j].x, placed[i].z - placed[j].z) >= 1000);
  }
});

test('nearby water buoys move farther out with progressive distances while port and IDs stay consistent', () => {
  const origin = { x: 0, z: 0 };
  const zones = [1, 2, 3, 4].map(index => ({ id: `challenge-buoy-${index}`, x: 200, z: -200, zoneType: 'nav', radius: 40, label: `Buoy ${index}` }));
  const dock = { id: 'return-to-port', x: 0, z: 0, zoneType: 'dock', shape: 'berth' };
  const placed = placeMissionBuoysOffshore([...zones, dock], null, [], origin);
  assert.equal(placed.at(-1), dock);
  for (let index = 0; index < zones.length; index++) {
    const minimum = [3000, 4000, 5000][Math.min(index, 2)];
    assert.ok(distanceToZoneEdge(origin.x, origin.z, placed[index]) >= minimum - 1e-6);
    assert.ok(distanceToZoneEdge(origin.x, origin.z, placed[index]) < minimum + 1500, 'keep the open-water voyage within a practical training distance');
    assert.equal(placed[index].id, zones[index].id);
    assert.equal(placed[index].label, zones[index].label);
    for (let earlier = 0; earlier < index; earlier++) assert.ok(Math.hypot(placed[index].x - placed[earlier].x, placed[index].z - placed[earlier].z) >= 1000);
  }
  assert.deepEqual(placeMissionBuoysOffshore([...zones, dock], null, [], origin), placed, 'reset and radar refresh reuse the same challenge layout');
});

test('buoys clear rotated dock structures in otherwise open water', () => {
  const collider = { centerX: 0, centerZ: 0, halfWidth: 40, halfDepth: 120, rotation: Math.PI / 4 };
  const zone = { id: 'near-pier', x: 20, z: 20, radius: 40, zoneType: 'nav' };
  const check = createBuoyWaterCheck(null, [collider]);
  assert.equal(check(zone.x, zone.z), false);
  const [placed] = placeMissionBuoysOffshore([zone], null, [collider], { x: -100, z: 0 });
  assert.equal(check(placed.x, placed.z), true);
});

test('legacy terrain meshes use their actual transformed surface instead of a whole-island bounding box', () => {
  const legacy = new THREE.Group();
  const land = new THREE.Mesh(new THREE.BoxGeometry(400, 60, 1000), new THREE.MeshBasicMaterial());
  land.position.set(1000, 20, 1000);
  legacy.add(land);
  const check = createBuoyWaterCheck(legacy);
  assert.equal(check(1000, 1000), false);
  assert.equal(check(0, 1000), true);
  const [placed] = placeMissionBuoysOffshore([{ id: 'legacy-buoy', x: 1000, z: 1000, zoneType: 'nav' }], legacy, [], { x: 0, z: 1000 });
  assert.equal(check(placed.x, placed.z), true);
  let queries = 0;
  const raycast = land.raycast;
  land.raycast = function (...args) { queries++; return raycast.apply(this, args); };
  const [refreshed] = placeMissionBuoysOffshore([{ id: 'legacy-buoy', x: 1000, z: 1000, zoneType: 'nav', label: 'Updated buoy label' }], legacy, [], { x: 0, z: 1000 });
  assert.equal(queries, 0, 'repeated HUD/radar lookups must reuse the resolved layout');
  assert.equal(refreshed.label, 'Updated buoy label', 'cached positions must retain current task metadata');
  assert.equal(refreshed.x, placed.x);
  assert.equal(refreshed.z, placed.z);
  land.geometry.dispose();
  land.material.dispose();
});

test('relocated buoys are below the water surface of the rendered terrain backdrop', () => {
  const steps = [45, 90, 135].map((heading, index) => ({ type: 'compass', heading: String(heading), waypointZone: `rendered-buoy-${index}` }));
  const zones = resolveModuleWaypoints('custom-rendered-shore', departure.x, departure.z, terrain, steps);
  const mesh = createTerrainBackdrop(cache, new THREE.MeshBasicMaterial());
  mesh.updateMatrixWorld(true);
  const ray = new THREE.Raycaster();
  for (const zone of zones) {
    ray.set(new THREE.Vector3(zone.x, 5000, zone.z), new THREE.Vector3(0, -1, 0));
    const hits = ray.intersectObject(mesh, true);
    assert.ok(hits.every(hit => hit.point.y < -0.5), `${zone.id} must clear the visible terrain, not just the heightmap pixel`);
  }
  mesh.geometry.dispose();
  mesh.material.dispose();
});
