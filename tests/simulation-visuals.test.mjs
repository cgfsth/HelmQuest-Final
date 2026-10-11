import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createBoatWake, createBowSpray } from '../src/helpers/boatWake.js';
import { attachBuoySignal, updateBuoySignalLights } from '../src/helpers/buoySignalLights.js';
import { createRainWeatherSystem } from '../src/helpers/rainWeather.js';

const visible = system => system.group.children.filter(mesh => mesh.visible);
const makeBoat = length => {
  const boat = new THREE.Group();
  boat.userData.loaMeters = length;
  return boat;
};

test('mission rain renders transparent streaks and only falls while rainy weather is active', () => {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera();
  camera.position.set(12, 15, -8);
  const rain = createRainWeatherSystem(scene, { getCamera: () => camera });
  const drops = rain.group.children[0];
  const positions = drops.geometry.attributes.position;
  const before = Array.from(positions.array);
  rain.update(0.1);
  assert.deepEqual(Array.from(positions.array), before, 'clear and cloudy missions must have no falling rain');
  const { data, width, height } = drops.material.map.image;
  assert.equal(data[3], 0, 'the sprite corners must be transparent');
  const opaque = (x, y) => data[(y * width + x) * 4 + 3] > 30;
  let across = 0, along = 0;
  for (let x = 0; x < width; x++) if (opaque(x, height / 2)) across++;
  for (let y = 0; y < height; y++) if (opaque(width / 2, y)) along++;
  assert.ok(along / height > across / width * 3, 'rain must look like narrow streaks');
  rain.setActive(true);
  rain.update(0.1);
  assert.ok(rain.group.position.equals(camera.position));
  assert.notDeepEqual(Array.from(positions.array), before, 'rain particles must move');
  rain.dispose();
  assert.equal(scene.children.length, 0);
});

test('buoy topmark flashes red at night and restores its original daylight appearance', () => {
  const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.38), new THREE.MeshStandardMaterial({
    color: 0xfbbf24, emissive: 0xfbbf24, emissiveIntensity: 0.8,
  }));
  lamp.position.set(1, 4, 2);
  attachBuoySignal(lamp);
  const signal = lamp.userData.buoySignal;
  const group = new THREE.Group();
  group.userData.buoySignals = [signal];
  group.add(lamp);
  const geometry = lamp.geometry;
  const position = lamp.position.clone();
  const intensities = [];
  for (let i = 0; i < 120; i++) {
    updateBuoySignalLights(group, i / 30, true);
    intensities.push(lamp.material.emissiveIntensity);
    assert.ok(lamp.material.emissive.r > lamp.material.emissive.g * 4);
    assert.equal(lamp.material.toneMapped, false, 'night red must retain its color under the scene tone mapping');
  }
  assert.ok(Math.max(...intensities) > 3, 'night flash must visibly glow');
  assert.ok(Math.min(...intensities) < 0.1, 'night signal must go dim between flashes');
  for (let i = 0; i < 60; i++) assert.ok(Math.abs(intensities[i] - intensities[i + 60]) < 1e-8, 'flash cadence repeats');
  updateBuoySignalLights(group, 0.25, true);
  assert.equal(signal.halo.visible, true);
  updateBuoySignalLights(group, 0.25, false);
  assert.equal(lamp.material.color.getHex(), 0xfbbf24);
  assert.equal(lamp.material.emissive.getHex(), 0xfbbf24);
  assert.equal(lamp.material.emissiveIntensity, 0.8);
  assert.equal(lamp.material.toneMapped, true);
  assert.equal(signal.halo.visible, false);
  assert.equal(lamp.geometry, geometry);
  assert.ok(lamp.position.equals(position), 'flashing must not move the buoy or its topmark');
  signal.halo.material.map.dispose();
  signal.halo.material.dispose();
  lamp.material.dispose();
  geometry.dispose();
});

for (const [name, create] of [['stern wake', createBoatWake], ['bow foam', createBowSpray]]) {
  test(`${name} scales with the 18m, 60m and 180m boats and stays on the water`, () => {
    const lengths = [];
    const widths = [];
    for (const loa of [18, 60, 180]) {
      const scene = new THREE.Scene();
      const system = create(scene);
      const boat = makeBoat(loa);
      system.update(boat, 10, 0.1);
      boat.position.x = 10;
      system.update(boat, 10, 0.1);
      system.update(boat, 0, 0.4);
      const particles = visible(system);
      assert.ok(particles.length > 0);
      lengths.push(Math.max(...particles.map(mesh => mesh.scale.x)));
      widths.push(Math.max(...particles.map(mesh => mesh.scale.z)));
      for (const mesh of particles) {
        assert.ok(mesh.position.y > 0 && mesh.position.y < 0.1, 'foam should hug the surface');
        assert.ok(mesh.material.opacity > 0 && mesh.material.opacity < 0.5);
        assert.equal(mesh.material.blending, THREE.NormalBlending);
        const pixels = mesh.material.map.image.data;
        assert.equal(pixels[3], 0, 'foam edges must be transparent');
        assert.ok(pixels.some((value, index) => index % 4 === 3 && value > 0));
      }
      system.dispose();
      assert.equal(scene.children.length, 0);
    }
    assert.ok(lengths[0] < lengths[1] && lengths[1] < lengths[2], `foam lengths ${lengths}`);
    assert.ok(widths[0] < widths[1] && widths[1] < widths[2], `foam widths ${widths}`);
  });

  test(`${name} stops spawning while stationary, fades away and clears on boat changes`, () => {
    const scene = new THREE.Scene();
    const system = create(scene);
    const boat = makeBoat(18);
    for (let i = 0; i < 40; i++) system.update(boat, 10, 0.1);
    assert.equal(visible(system).length, 0, 'reported speed alone must not produce foam');
    boat.position.x = 4;
    system.update(boat, 10, 0.1);
    assert.ok(visible(system).length > 0);
    const count = visible(system).length;
    system.update(boat, 10, 0.1);
    assert.equal(visible(system).length, count, 'a stationary hull must not keep emitting');
    system.update(boat, 0, 10);
    assert.equal(visible(system).length, 0, 'old foam must finish fading');
    boat.position.x += 4;
    system.update(boat, 10, 0.1);
    assert.ok(visible(system).length > 0);
    system.update(makeBoat(180), 10, 0.1);
    assert.equal(visible(system).length, 0, 'a different boat must clear stale foam');
    system.dispose();
  });
}

test('stern wash follows a turned boat and clears when the boat teleports', () => {
  const system = createBoatWake(new THREE.Scene());
  const boat = makeBoat(18);
  boat.rotation.y = Math.PI / 2;
  system.update(boat, 10, 0.1);
  boat.position.z = -4;
  system.update(boat, 10, 0.1);
  const particles = visible(system);
  assert.ok(particles.length > 0);
  assert.ok(particles.every(mesh => mesh.position.z > boat.position.z), 'wake must remain behind the rotated stern');
  boat.position.set(1000, 0, 1000);
  system.update(boat, 10, 0.1);
  assert.equal(visible(system).length, 0);
  system.dispose();
});

test('foam fading and growth depend on elapsed time at both 30 and 60 FPS', () => {
  const snapshots = [30, 60].map(fps => {
    const system = createBoatWake(new THREE.Scene());
    const boat = makeBoat(60);
    system.update(boat, 10, 0.1);
    boat.position.x = 4;
    system.update(boat, 10, 0.1);
    const particle = visible(system)[0];
    const initialLength = particle.scale.x;
    for (let i = 0; i < fps; i++) system.update(boat, 0, 1 / fps);
    const snapshot = { opacity: particle.material.opacity, growth: particle.scale.x / initialLength };
    system.dispose();
    return snapshot;
  });
  assert.ok(Math.abs(snapshots[0].opacity - snapshots[1].opacity) < 1e-8);
  assert.ok(Math.abs(snapshots[0].growth - snapshots[1].growth) < 1e-8);
});
