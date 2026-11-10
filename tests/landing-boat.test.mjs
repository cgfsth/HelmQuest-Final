import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as THREE from 'three';
import { getLandingBoatPresentation } from '../src/helpers/landingBoatPresentation.js';
import { applyBoatBuoyancy } from '../src/helpers/boatMotion.js';
import { sampleBoatWaveMotion, getBoatWaveResponse } from '../src/helpers/oceanWaves.js';

const app = readFileSync(new URL('../src/App.vue', import.meta.url), 'utf8').replace(/\r\n/g, '\n');
const start = app.indexOf('const BOAT_TYPES = {');
const profiles = new Function(`${app.slice(start, app.indexOf('\n};', start) + 3)}; return BOAT_TYPES;`)();
const lengths = { small: 18, medium: 60, large: 180 };
function actualFunction(name) {
  const start = app.indexOf(`function ${name}(`);
  assert.ok(start >= 0);
  return app.slice(start, app.indexOf('\n}', start) + 2);
}
function landing(type, width = 1365, height = 768, sampleHeight = () => .6) {
  const boat = new THREE.Group();
  boat.rotation.order = 'YXZ';
  boat.userData = { modelPath: profiles[type].modelFile, loaMeters: lengths[type], beamMeters: lengths[type] * .18 };
  const dependencies = { boatObject: boat, landingBoatPoseActive: false,
    getLandingBoatPresentation, BOAT_TYPES: profiles, sampleBoatWaveMotion, getBoatWaveResponse, applyBoatBuoyancy,
    baselineWaterlineY: 0, LANDING_BOAT_X: 32, LANDING_BOAT_Z: 50, LANDING_CAMERA_FOV: 42,
    camera: new THREE.PerspectiveCamera(42, width / height), ocean: { sampleHeight },
    landingCinematicTime: 0, window: { innerWidth: width, innerHeight: height }, _landingLookAt: new THREE.Vector3() };
  const code = `${actualFunction('applyLandingBoatPose')}\n${actualFunction('updateLandingCinematic')}; return { updateLandingCinematic, applyLandingBoatPose };`;
  return { ...dependencies, ...new Function(...Object.keys(dependencies), code)(...Object.values(dependencies)) };
}

for (const type of ['small', 'medium', 'large']) {
  test(`${type}: the landing background keeps the loaded hull and uses its own scaled waterline`, () => {
    const view = landing(type), originalBoat = view.boatObject;
    for (let frame = 0; frame < 120; frame++) view.updateLandingCinematic(1 / 60);
    assert.equal(view.boatObject, originalBoat);
    assert.equal(view.boatObject.userData.modelPath, profiles[type].modelFile);
    assert.ok(Math.abs(view.boatObject.position.y - (.6 + profiles[type].waterlineOffset * 1.5)) < 1e-10);
    assert.equal(view.boatObject.scale.x, 1.5);
    assert.ok(view.camera.position.y > .6, 'camera must remain above the sea, independently of hull draft');
    assert.ok(view._landingLookAt.y > .6, 'look at the visible boat rather than its underwater pivot');
    assert.ok(view.camera.position.toArray().every(Number.isFinite));
  });
}

test('changing the selection before its model finishes loading never applies the new boat draft to the old hull', () => {
  const boat = new THREE.Group();
  boat.userData = { modelPath: profiles.small.modelFile, loaMeters: 18 };
  const frame = getLandingBoatPresentation(boat, profiles);
  assert.equal(frame.waterlineOffset, -.35 * 1.5);
  assert.equal(frame.length, 27);
  boat.userData = { modelPath: profiles.medium.modelFile, loaMeters: 60 };
  assert.equal(getLandingBoatPresentation(boat, profiles).waterlineOffset, -8 * 1.5);
});

test('small-boat framing scales down from the trawler and widens for portrait screens', () => {
  const small = landing('small'), medium = landing('medium');
  small.updateLandingCinematic(1 / 60); medium.updateLandingCinematic(1 / 60);
  const smallDistance = small.camera.position.distanceTo(small.boatObject.position);
  const mediumDistance = medium.camera.position.distanceTo(medium.boatObject.position);
  assert.ok(smallDistance < mediumDistance * .4);
  const mobile = landing('small', 390, 844);
  mobile.updateLandingCinematic(1 / 60);
  assert.ok(mobile.camera.position.distanceTo(mobile.boatObject.position) > smallDistance * 2);
});

test('the landing boat follows the sampled ocean at 15, 30, 60 and 144 FPS instead of independent fake bobbing', () => {
  const positions = [];
  for (const fps of [15, 30, 60, 144]) {
    const view = landing('small', 1365, 768, (x, z) => .005 * x + .0075 * z);
    for (let frame = 0; frame < fps * 2; frame++) view.updateLandingCinematic(1 / fps);
    positions.push(view.boatObject.position.y);
    const up = new THREE.Vector3(0, 1, 0).applyQuaternion(view.boatObject.quaternion);
    assert.ok(up.distanceTo(new THREE.Vector3(-.005, 1, -.0075).normalize()) < 1e-5);
  }
  assert.ok(positions.every(value => Math.abs(value - positions[0]) < 1e-10));
});
