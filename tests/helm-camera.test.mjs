import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import * as THREE from 'three';
import {
  HELM_CAMERA_POS, HELM_CAMERA_LOOK, HELM_CAMERA_POS_SMALL, HELM_CAMERA_LOOK_SMALL,
  HELM_CAMERA_POS_LARGE, HELM_CAMERA_LOOK_LARGE, syncHelmBoatMeshVisibility,
  createHelmCockpit, updateHelmCockpit, disposeHelmCockpit,
} from '../src/helpers/helmCockpit.js';
import { syncHelmDeckRailsVisibility } from '../src/helpers/helmDeckRails.js';
import { normalizeBoatToScene } from '../src/helpers/normalizeBoatScale.js';
import { addBigBoatLights, disposeBigBoatLights, syncBigBoatBridgeLightVisibility } from '../src/helpers/bigBoatLights.js';
import {
  prepareBigBoatBridgeWindows, syncBigBoatBridgeWindows, disposeBigBoatBridgeWindows, buildBigBoatBridgeInterior,
} from '../src/helpers/bigBoatBridge.js';

const source = readFileSync(new URL('../src/App.vue', import.meta.url), 'utf8').replace(/\r\n/g, '\n');
function appFunction(name) {
  const start = source.indexOf(`function ${name}(`);
  assert.ok(start >= 0);
  return source.slice(start, source.indexOf('\n}', start) + 2);
}

function realBigBoat() {
  const bytes = readFileSync(new URL('../public/assets/BigBoat.glb', import.meta.url));
  const jsonLength = bytes.readUInt32LE(12);
  const asset = JSON.parse(bytes.subarray(20, 20 + jsonLength));
  const bufferStart = 28 + jsonLength;
  const attribute = index => {
    const accessor = asset.accessors[index], view = asset.bufferViews[accessor.bufferView];
    const offset = bytes.byteOffset + bufferStart + (view.byteOffset || 0) + (accessor.byteOffset || 0);
    const ArrayType = accessor.componentType === 5126 ? Float32Array : Uint16Array;
    return new THREE.BufferAttribute(new ArrayType(bytes.buffer, offset, accessor.count * (accessor.type === 'VEC3' ? 3 : 1)),
      accessor.type === 'VEC3' ? 3 : 1);
  };
  const primitive = asset.meshes[0].primitives[0];
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', attribute(primitive.attributes.POSITION));
  geometry.setIndex(attribute(primitive.indices));
  const mesh = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({ side: THREE.DoubleSide }));
  const model = new THREE.Group();
  model.add(mesh);
  const { boat } = normalizeBoatToScene(model, {
    targetLength: 180, targetWaterlineY: 0, spawnX: 0, spawnZ: 0, modelPath: '/assets/BigBoat.glb',
  });
  boat.userData.loaMeters = 180;
  boat.updateMatrixWorld(true);
  return { boat, mesh };
}

test('the actual camera selects each boat profile and keeps the large helm eye inside the moving bridge', () => {
  const context = {
    THREE, HELM_CAMERA_POS, HELM_CAMERA_LOOK, HELM_CAMERA_POS_SMALL, HELM_CAMERA_LOOK_SMALL,
    HELM_CAMERA_POS_LARGE, HELM_CAMERA_LOOK_LARGE,
    boatObject: new THREE.Group(), camera: new THREE.PerspectiveCamera(), camera2: new THREE.PerspectiveCamera(),
    activeCamera: { value: 'helm' }, selectedBoatType: { value: 'large' },
    _helmPosScratch: new THREE.Vector3(), _helmLookScratch: new THREE.Vector3(),
    applyCameraLookOffset: (_position, target) => target,
  };
  vm.createContext(context);
  vm.runInContext(appFunction('updateCameras'), context);
  for (const [type, position, target] of [
    ['small', HELM_CAMERA_POS_SMALL, HELM_CAMERA_LOOK_SMALL],
    ['medium', HELM_CAMERA_POS, HELM_CAMERA_LOOK],
    ['large', HELM_CAMERA_POS_LARGE, HELM_CAMERA_LOOK_LARGE],
  ]) {
    context.selectedBoatType.value = type;
    for (const yaw of [0, Math.PI / 2, Math.PI, -Math.PI / 2]) {
      context.boatObject.position.set(350, 2, -720);
      context.boatObject.rotation.set(.08, yaw, -.06);
      context.updateCameras();
      const rotation = type === 'large' ? context.boatObject.quaternion
        : new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), yaw);
      const expected = position.clone().applyQuaternion(rotation).add(context.boatObject.position);
      const forward = target.clone().sub(position).applyQuaternion(rotation).normalize();
      assert.ok(context.camera2.position.distanceTo(expected) < 1e-8, `${type}: correct bridge position`);
      assert.ok(context.camera2.getWorldDirection(new THREE.Vector3()).distanceTo(forward) < 1e-8,
        `${type}: look direction follows its camera profile`);
    }
  }
});

test('the helm camera sits inside the real bridge and its window opening preserves the bow and original exterior', () => {
  const { boat, mesh } = realBigBoat();
  const original = mesh.geometry;
  const cutouts = prepareBigBoatBridgeWindows(boat);
  assert.equal(cutouts.length, 1);
  assert.equal(mesh.geometry, original, 'preparing the bridge must not change the exterior');
  assert.ok(cutouts[0].interior.index.count < original.index.count);
  assert.equal(cutouts[0].interior.attributes.position, original.attributes.position);
  syncBigBoatBridgeWindows(cutouts, true);
  assert.ok(HELM_CAMERA_POS_LARGE.x < 50 && HELM_CAMERA_POS_LARGE.y > 30, 'eye is behind the windshield inside the cabin');
  const camera = new THREE.PerspectiveCamera(62, 1100 / 750, .2, 1000);
  camera.position.copy(HELM_CAMERA_POS_LARGE);
  camera.lookAt(HELM_CAMERA_LOOK_LARGE);
  camera.updateMatrixWorld(true);
  const ray = new THREE.Raycaster();
  for (const x of [-.8, -.4, 0, .4, .8]) {
    for (const y of [.18, .3, .5]) {
      ray.setFromCamera(new THREE.Vector2(x, y), camera);
      const hits = ray.intersectObject(boat, true);
      assert.equal(hits.length, 0, `windshield must not block the horizon at ${x},${y}`);
    }
  }
  ray.setFromCamera(new THREE.Vector2(0, -.7), camera);
  const bow = ray.intersectObject(boat, true)[0];
  assert.ok(bow && bow.point.x > HELM_CAMERA_POS_LARGE.x + 5, 'the bow remains visible below the horizon');
  assert.ok(bow.distance > 5, 'the near plane must not cut through a cabin wall');
  syncBigBoatBridgeWindows(cutouts, false);
  assert.equal(mesh.geometry, original, 'chase/orbit retain the exact original geometry');
  ray.setFromCamera(new THREE.Vector2(0, 0), camera);
  assert.ok(ray.intersectObject(boat, true)[0]?.distance < 10, 'the original front wall remains intact outside helm view');
  let originalDisposals = 0, interiorDisposals = 0;
  original.addEventListener('dispose', () => originalDisposals++);
  cutouts[0].interior.addEventListener('dispose', () => interiorDisposals++);
  disposeBigBoatBridgeWindows(cutouts);
  assert.equal(originalDisposals, 0);
  assert.equal(interiorDisposals, 1);
  assert.equal(mesh.userData.bridgeWindowCutout, undefined);
  const interior = buildBigBoatBridgeInterior();
  assert.ok(interior.getObjectByName('BridgeDashboard'));
  assert.ok(interior.getObjectByName('WindshieldHeader'));
  const floor = interior.getObjectByName('BridgeFloor').position.y;
  const ceiling = interior.getObjectByName('BridgeCeiling').position.y;
  assert.ok(HELM_CAMERA_POS_LARGE.y > floor && HELM_CAMERA_POS_LARGE.y < ceiling);
});

test('camera switches preserve the big boat and its lights while smaller boat visibility rules still work', () => {
  const { boat, mesh } = realBigBoat();
  const lamps = addBigBoatLights(boat);
  const cockpit = new THREE.Group();
  cockpit.name = 'HelmCockpit';
  cockpit.userData.largeBridge = true;
  boat.add(cockpit);
  const bridgeWindows = prepareBigBoatBridgeWindows(boat);
  const original = mesh.geometry;
  const context = {
    boatObject: boat, helmCockpit: { group: cockpit, bridgeWindows }, helmRadarDisplay: null,
    activeScreen: { value: 'simulation' }, activeCamera: { value: 'helm' }, selectedBoatType: { value: 'large' },
    syncHelmDeckRailsVisibility, syncHelmBoatMeshVisibility, syncBigBoatBridgeWindows, syncBigBoatBridgeLightVisibility,
  };
  vm.createContext(context);
  vm.runInContext(appFunction('syncHelmRailingsVisibility'), context);
  for (const camera of ['helm', 'chase', 'orbit', 'helm']) {
    context.activeCamera.value = camera;
    context.syncHelmRailingsVisibility();
    assert.equal(mesh.visible, true, 'the merged big boat must stay visible across camera switches');
    assert.equal(cockpit.visible, camera === 'helm', 'the large interior appears only in helm view');
    assert.equal(mesh.geometry, camera === 'helm' ? bridgeWindows[0].interior : original);
    assert.equal(lamps.getObjectByName('FrontLightBeam').visible, camera !== 'helm');
    assert.equal(lamps.getObjectByName('BowRoofLamp').getObjectByName('LampGlow').visible, camera !== 'helm');
    assert.equal(lamps.getObjectByName('BowRoofLamp').getObjectByName('LampLight').intensity, 120000,
      'bridge glare control must retain the actual forward illumination');
  }
  context.selectedBoatType.value = 'small';
  cockpit.userData.largeBridge = false;
  context.syncHelmRailingsVisibility();
  assert.equal(mesh.visible, true);
  assert.equal(cockpit.visible, false);
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshBasicMaterial());
  cabin.name = 'cabine';
  boat.add(cabin);
  context.selectedBoatType.value = 'medium';
  context.syncHelmRailingsVisibility();
  assert.equal(cabin.visible, true);
  assert.equal(cockpit.visible, true);
  assert.equal(mesh.visible, false, 'medium hull filtering remains unchanged');
  disposeBigBoatLights(lamps);
  disposeBigBoatBridgeWindows(bridgeWindows);
});

test('the large cockpit fits its cabin and steering wheel and restores the original asset when disposed', () => {
  const { boat, mesh } = realBigBoat();
  const original = mesh.geometry;
  const cockpit = createHelmCockpit(boat);
  boat.add(cockpit.group);
  assert.equal(cockpit.group.userData.largeBridge, true);
  assert.ok(cockpit.group.getObjectByName('BridgeDashboard'));
  const mount = cockpit.group.getObjectByName('WheelMount');
  assert.ok(mount.position.x > HELM_CAMERA_POS_LARGE.x && mount.position.x < 51.5);
  assert.ok(mount.position.y < HELM_CAMERA_POS_LARGE.y);
  const wheel = cockpit.wheelRotor.getObjectByName('WheelMesh');
  const size = new THREE.Box3().setFromObject(wheel).getSize(new THREE.Vector3());
  assert.ok(Math.abs(Math.max(size.x, size.y, size.z) - 1.3) < 1e-5,
    'the compact wheel leaves the windshield and radar visible');
  updateHelmCockpit(cockpit, .1, .1, { KeyA: true });
  assert.ok(cockpit.wheelAngle > 0, 'the bridge wheel responds to steering input');
  syncBigBoatBridgeWindows(cockpit.bridgeWindows, true);
  let materialDisposals = 0;
  cockpit.group.getObjectByName('WindshieldHeader').material.addEventListener('dispose', () => materialDisposals++);
  disposeHelmCockpit(cockpit);
  assert.equal(mesh.geometry, original);
  assert.equal(cockpit.group.parent, null);
  assert.equal(cockpit.wheelRotor.userData.disposed, true);
  assert.equal(materialDisposals, 1, 'shared cabin materials are released once');
});
