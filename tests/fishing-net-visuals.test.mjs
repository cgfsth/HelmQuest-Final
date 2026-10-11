import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createFishingLineSystem, FishingState } from '../src/helpers/fishingLine.js';
import { FISHING_SPOTS } from '../src/helpers/fishingSpots.js';
import { createTrawlNetMesh, updateTrawlNetPosition } from '../src/helpers/trawlNetSystem.js';

function boatAtGrounds(length, yaw = 0) {
  const boat = new THREE.Group();
  boat.userData.loaMeters = length;
  boat.userData.beamMeters = length * .2;
  boat.position.set(FISHING_SPOTS[0].x, -6, FISHING_SPOTS[0].z);
  boat.rotation.set(.08, yaw, .05);
  return boat;
}

function deployedNet(t, length, yaw = 0) {
  const boat = boatAtGrounds(length, yaw);
  const system = createFishingLineSystem(new THREE.Scene(), { getBoat: () => boat, getWaterSurfaceY: () => 1 });
  t.after(() => system.dispose());
  assert.equal(system.deployFishingGear(), true);
  system.update(1.4, 0);
  assert.equal(system.getState(), FishingState.FISHING);
  system.net.updateMatrixWorld(true);
  return { boat, system };
}

test('nets grow with the loaded 18m, 60m and 180m boats while corks stay realistically sized', t => {
  const widths = [], depths = [];
  for (const length of [18, 60, 180]) {
    const { system } = deployedNet(t, length);
    const grid = system.net.getObjectByName('NetGrid');
    grid.geometry.computeBoundingBox();
    const size = grid.geometry.boundingBox.getSize(new THREE.Vector3());
    widths.push(size.x);
    depths.push(size.y);
    assert.ok(size.x < length, 'net must fit the scale of its hull');
    assert.ok(grid.material.opacity > .1 && grid.material.opacity < .6, 'mesh stays visible and translucent');
    assert.equal(system.net.getObjectByName('SurfaceStrip'), undefined, 'no solid orange slab');
    const corks = system.net.children.filter(mesh => ['NetCork', 'FloatMarker'].includes(mesh.name));
    assert.ok(corks.length > 8, 'individual floats hold up the header rope');
    for (const cork of corks) {
      const world = cork.getWorldPosition(new THREE.Vector3());
      assert.ok(Math.abs(world.y - 1) < .3, 'floats sit on water despite the boat pivot being submerged');
      assert.ok(cork.scale.x < 1, 'commercial hulls must not turn corks into giant buoys');
    }
    const weights = system.net.children.filter(mesh => mesh.name === 'NetWeight');
    assert.ok(weights.every(weight => weight.getWorldPosition(new THREE.Vector3()).y < 0), 'weighted bottom hangs underwater');
  }
  assert.ok(widths[0] < widths[1] && widths[1] < widths[2], `net widths ${widths}`);
  assert.ok(depths[0] < depths[1] && depths[1] < depths[2], `net depths ${depths}`);
});

test('net hangs downward, stays behind the stern, and aligns across the beam at different headings', t => {
  for (const yaw of [0, Math.PI / 2, Math.PI, -Math.PI / 2]) {
    const { boat, system } = deployedNet(t, 18, yaw);
    const localDown = new THREE.Vector3(0, -1, 0).applyQuaternion(system.net.quaternion);
    assert.ok(localDown.y < -.999, 'mesh must hang down rather than invert above the sea');
    const forward = new THREE.Vector3(1, 0, 0).applyQuaternion(boat.quaternion).setY(0).normalize();
    assert.ok(system.net.position.clone().sub(boat.position).dot(forward) < -18 * .5, 'net clears the stern');
    const span = new THREE.Vector3(1, 0, 0).applyQuaternion(system.net.quaternion);
    assert.ok(Math.abs(span.dot(forward)) < 1e-6, 'float line runs across the beam');
    const ropes = system.group.children.filter(mesh => mesh.isLine);
    for (const rope of ropes) {
      const points = rope.geometry.attributes.position;
      assert.ok(points.count > 2, 'tow ropes have a curved, segmented profile');
      assert.ok(points.getY(0) > 1, 'rope attaches above water rather than below the hull');
      const end = new THREE.Vector3().fromBufferAttribute(points, points.count - 1);
      const markers = system.net.children.filter(mesh => mesh.name === 'FloatMarker');
      assert.ok(markers.some(marker => marker.getWorldPosition(new THREE.Vector3()).distanceTo(end) < .2), 'tow ropes reach the actual net corners');
    }
  }
});

test('mesh and corks sway over time without replacing geometry buffers', t => {
  const { system } = deployedNet(t, 60);
  const grid = system.net.getObjectByName('NetGrid');
  const buffer = grid.geometry.attributes.position;
  const before = buffer.array.slice();
  system.update(.1, 1);
  assert.equal(grid.geometry.attributes.position, buffer);
  assert.notDeepEqual(buffer.array, before, 'the net softly deforms with the current');
  assert.ok(Array.from(buffer.array).every(Number.isFinite));
});

test('individual floats follow varying water height along the net', t => {
  const boat = boatAtGrounds(60);
  const waterHeight = (x, z) => 1 + Math.sin(x * .12) * .4 + Math.cos(z * .09) * .3;
  const system = createFishingLineSystem(new THREE.Scene(), { getBoat: () => boat, getWaterSurfaceY: waterHeight });
  t.after(() => system.dispose());
  system.deployFishingGear();
  system.update(1.4, 2);
  system.net.updateMatrixWorld(true);
  for (const cork of system.net.children.filter(mesh => ['NetCork', 'FloatMarker'].includes(mesh.name))) {
    const position = cork.getWorldPosition(new THREE.Vector3());
    assert.ok(Math.abs(position.y - waterHeight(position.x, position.z)) < .25,
      'each float follows the water underneath it instead of one flat height');
  }
});

test('trawl nets scale with every hull, stay astern, and keep their floats on the surface', () => {
  const widths = [];
  for (const length of [18, 60, 180]) {
    for (const yaw of [0, Math.PI / 2]) {
      const boat = boatAtGrounds(length, yaw);
      const net = createTrawlNetMesh();
      updateTrawlNetPosition(net, boat, 1, 1, 1);
      net.updateMatrixWorld(true);
      const mesh = net.getObjectByName('TrawlNet');
      const bounds = new THREE.Box3().setFromObject(mesh);
      if (yaw === 0) widths.push(bounds.getSize(new THREE.Vector3()).z);
      assert.ok(bounds.min.y < 0 && bounds.max.y <= 1.01, 'bag opens at water level and hangs below it');
      const forward = new THREE.Vector3(1, 0, 0).applyQuaternion(boat.quaternion).setY(0).normalize();
      assert.ok(net.position.clone().sub(boat.position).dot(forward) < -length * .5);
      for (const cork of net.getObjectByName('NetFloats').children) {
        assert.ok(Math.abs(cork.getWorldPosition(new THREE.Vector3()).y - 1) < .1);
      }
      const geometries = new Set(), materials = new Set();
      net.traverse(obj => { if (obj.geometry) geometries.add(obj.geometry); if (obj.material) materials.add(obj.material); });
      geometries.forEach(geometry => geometry.dispose());
      materials.forEach(material => material.dispose());
    }
  }
  assert.ok(widths[0] < widths[1] && widths[1] < widths[2], `trawl widths ${widths}`);
});
