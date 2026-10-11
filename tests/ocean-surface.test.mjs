import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { loadOceanSimulation } from '../src/helpers/oceanSimulation.js';
import { createOceanGeometry, oceanWaveState, sampleOceanHeight, sampleBoatWaveMotion, getBoatWaveResponse } from '../src/helpers/oceanWaves.js';
import { updateBuoyFloating } from '../src/helpers/missionWaypoints.js';
import { createBoatWake } from '../src/helpers/boatWake.js';

test('the ocean has visible travelling crests and troughs instead of a flat plane', () => {
  const state = oceanWaveState(0.85, 1.2);
  // A region contains wave patches rather than identical crests along every scanline.
  const heights = Array.from({ length: 441 }, (_, i) => sampleOceanHeight((i % 21) * 10, Math.floor(i / 21) * 10, 2, state));
  assert.ok(Math.max(...heights) - Math.min(...heights) > 0.8);
  assert.notEqual(sampleOceanHeight(12, 8, 0, state), sampleOceanHeight(12, 8, 2, state));
  assert.notEqual(sampleOceanHeight(12, 8, 2, state), sampleOceanHeight(20, 8, 2, state));
  assert.equal(sampleOceanHeight(12, 8, 2, oceanWaveState(0, 1.2)), 0);
  assert.equal(sampleOceanHeight(12, 8, 0, oceanWaveState(0.85, 0)), sampleOceanHeight(12, 8, 9, oceanWaveState(0.85, 0)));
  assert.equal(sampleOceanHeight(12, 8, 2, oceanWaveState(0.4, 1.2)), 2 * sampleOceanHeight(12, 8, 2, oceanWaveState(0.2, 1.2)));
});

test('the camera patch resolves nearby swell without tessellating the whole 60km ocean', () => {
  const geometry = createOceanGeometry(30000);
  const positions = geometry.attributes.position;
  assert.ok(positions.count < 110000);
  const axis = Array.from({ length: 321 }, (_, i) => positions.getX(i));
  assert.equal(axis[0], -30000);
  assert.equal(axis.at(-1), 30000);
  for (let i = 1; i < axis.length; i++) {
    assert.ok(axis[i] > axis[i - 1]);
    if (Math.abs(axis[i]) < 550 && Math.abs(axis[i - 1]) < 550) assert.ok(axis[i] - axis[i - 1] < 5);
  }
  geometry.dispose();
});

test('boat height and tilt follow the water at its position and rotated heading', () => {
  const surface = (x, z) => 0.03 * x + 0.02 * z;
  const east = sampleBoatWaveMotion(10, 20, 0, 60, surface);
  const north = sampleBoatWaveMotion(10, 20, Math.PI / 2, 60, surface);
  assert.equal(east.height, surface(10, 20));
  assert.ok(Math.abs(east.rotationZ - Math.atan(0.03)) < 1e-10);
  assert.ok(Math.abs(east.rotationX + Math.atan(0.02)) < 1e-10);
  assert.ok(Math.abs(north.rotationZ + Math.atan(0.02)) < 1e-10);
  assert.ok(Math.abs(north.rotationX + Math.atan(0.03)) < 1e-10);
});

test('a large hull averages rough water and responds more slowly than a small boat', () => {
  const state = oceanWaveState(3.2, 2);
  const samples = { small: [], large: [] };
  let smallY = 0, largeY = 0, largeRoll = 0, largePitch = 0;
  const largeResponse = getBoatWaveResponse(180);
  assert.ok(largeResponse.blend < getBoatWaveResponse(60).blend);
  assert.ok(largeResponse.heaveBlend < getBoatWaveResponse(60).heaveBlend);
  for (let frame = 0; frame < 1200; frame++) {
    const height = (x, z) => sampleOceanHeight(x, z, frame / 60, state);
    const small = sampleBoatWaveMotion(0, 0, Math.PI / 2, 18, height);
    const large = sampleBoatWaveMotion(0, 0, Math.PI / 2, 180, height);
    smallY = small.height;
    largeY = THREE.MathUtils.lerp(largeY, large.height, largeResponse.heaveBlend);
    largeRoll = THREE.MathUtils.lerp(largeRoll, THREE.MathUtils.clamp(large.rotationZ,
      -largeResponse.maxTilt, largeResponse.maxTilt), largeResponse.blend);
    largePitch = THREE.MathUtils.lerp(largePitch, THREE.MathUtils.clamp(large.rotationX,
      -largeResponse.maxTilt, largeResponse.maxTilt), largeResponse.blend);
    samples.small.push(smallY);
    samples.large.push(largeY);
    assert.ok(Math.abs(largeRoll) <= THREE.MathUtils.degToRad(1));
    assert.ok(Math.abs(largePitch) <= THREE.MathUtils.degToRad(1));
  }
  const range = values => Math.max(...values) - Math.min(...values);
  assert.ok(range(samples.small) > 1.5, 'the shared sea must retain large waves');
  assert.ok(range(samples.large) < range(samples.small) * 0.4, 'large vessel heave must remain substantially steadier');
});

test('water rendering and floating objects share one wave clock and sea state', async () => {
  const originalLoad = THREE.TextureLoader.prototype.load;
  THREE.TextureLoader.prototype.load = (_url, onLoad) => onLoad(new THREE.DataTexture(new Uint8Array([128, 128, 255, 255]), 1, 1));
  let ocean;
  try { ocean = await loadOceanSimulation(null, { fog: false }); }
  finally { THREE.TextureLoader.prototype.load = originalLoad; }
  try {
    ocean.setWaveState(0.85, 1.2);
    ocean.update(2, new THREE.Vector3(11072, 10, -4300));
    const uniforms = ocean.root.material.uniforms;
    const expected = sampleOceanHeight(11070, -4310, uniforms.oceanWaveTime.value,
      { amplitude: uniforms.oceanWaveAmplitude.value, frequency: uniforms.oceanWaveFrequency.value },
      { x: ocean.root.position.x, z: ocean.root.position.z });
    assert.equal(ocean.sampleHeight(11070, -4310), expected);
    const shader = { uniforms: {}, vertexShader: ocean.root.material.vertexShader, fragmentShader: ocean.root.material.fragmentShader };
    ocean.root.material.onBeforeCompile(shader);
    assert.ok(shader.vertexShader.includes('displacedPosition.z += oceanSwell(surfacePoint).x'));
    assert.ok(shader.vertexShader.includes('modelViewMatrix * vec4(displacedPosition, 1.0)'));
    assert.ok(shader.fragmentShader.includes('vec3 swell = oceanSwell(worldPosition.xz)'));
    assert.equal(shader.uniforms.oceanWaveTime, uniforms.oceanWaveTime);
    const before = ocean.sampleHeight(11070, -4310);
    ocean.update(1 / 60, new THREE.Vector3(11074, 10, -4300));
    assert.notEqual(ocean.sampleHeight(11070, -4310), before);
    ocean.setWaveState(0, 1.2);
    assert.equal(ocean.sampleHeight(11070, -4310), 0);
  } finally { ocean.dispose(); }
});

test('buoys and wake foam ride the supplied ocean surface', () => {
  const group = new THREE.Group();
  const buoy = new THREE.Group();
  buoy.position.set(10, 2, 20);
  buoy.userData.baseY = 2;
  group.add(buoy);
  updateBuoyFloating(group, 1, 0.18, 1.2, (x, z) => x * 0.01 + z * 0.02);
  assert.equal(buoy.position.y, 2.5);
  const wake = createBoatWake(new THREE.Scene(), { sampleHeight: () => 0.7 });
  const boat = new THREE.Group();
  boat.userData.loaMeters = 18;
  wake.update(boat, 10, 0.1);
  boat.position.x = 4;
  wake.update(boat, 10, 0.1);
  const foam = wake.group.children.filter(mesh => mesh.visible);
  assert.ok(foam.length > 0);
  assert.ok(foam.every(mesh => mesh.position.y > 0.75 && mesh.position.y < 0.8));
  wake.dispose();
});
