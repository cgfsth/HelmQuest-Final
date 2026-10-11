import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { createHelmCockpit, disposeHelmCockpit, updateHelmCockpit } from '../src/helpers/helmCockpit.js';
import { BIG_BOAT_BRIDGE_EYE, BIG_BOAT_BRIDGE_LOOK, BIG_BOAT_BRIDGE_WHEEL, installBigBoatBridgeModel } from '../src/helpers/bigBoatBridge.js';
import { createHelmRadarScreen, updateHelmRadarScreen, disposeHelmRadarScreen } from '../src/helpers/helmRadarScreen.js';

const bytes = readFileSync(new URL('../public/assets/helm/large_boat_bridge.glb', import.meta.url));
const jsonLength = bytes.readUInt32LE(12);
const metadata = JSON.parse(bytes.subarray(20, 20 + jsonLength));

// Parse the shipped geometry/transforms with the real loader; CPU tests omit image decoding.
async function loadBridge() {
  const source = structuredClone(metadata);
  for (const material of source.materials) {
    for (const key of Object.keys(material)) if (key.endsWith('Texture')) delete material[key];
    for (const key of Object.keys(material.pbrMetallicRoughness || {})) {
      if (key.endsWith('Texture')) delete material.pbrMetallicRoughness[key];
    }
  }
  delete source.textures; delete source.images; delete source.samplers;
  const json = Buffer.from(JSON.stringify(source));
  const padding = Buffer.alloc((4 - json.length % 4) % 4, 0x20);
  const binary = bytes.subarray(20 + jsonLength);
  const header = Buffer.from(bytes.subarray(0, 20));
  header.writeUInt32LE(20 + json.length + padding.length + binary.length, 8);
  header.writeUInt32LE(json.length + padding.length, 12);
  const file = Buffer.concat([header, json, padding, binary]);
  return (await new GLTFLoader().parseAsync(file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength), '')).scene;
}
function createBoat() {
  const boat = new THREE.Group();
  boat.userData.loaMeters = 180;
  const cockpit = createHelmCockpit(boat);
  boat.add(cockpit.group);
  cockpit.group.visible = true;
  return { boat, cockpit };
}

test('the shipped bridge contains textured cabin details without the medium boat hull', () => {
  assert.ok(bytes.length < 14 * 1024 * 1024, 'the standalone cabin stays small enough for mobile loading');
  assert.ok(metadata.nodes.some(node => node.name === 'BridgeDashboard'));
  assert.ok(metadata.nodes.some(node => node.name === 'BridgeSteeringWheel'));
  assert.ok(metadata.nodes.some(node => node.name === 'BridgeCabinShell'));
  assert.ok(metadata.nodes.every(node => !/hull|crane|anchor/i.test(node.name)));
  assert.ok(metadata.materials.some(material => material.normalTexture && material.pbrMetallicRoughness?.baseColorTexture));
  assert.ok(BIG_BOAT_BRIDGE_WHEEL.distanceTo(new THREE.Vector3(...metadata.asset.extras.wheelCenter)) < 1e-8);
});

test('loading the textured cabin while underway preserves the radar, wheel position and steering', async () => {
  const { boat, cockpit } = createBoat();
  const canvas = { width: 512, height: 512 };
  const display = createHelmRadarScreen(boat, canvas);
  const radarMount = display.screen.parent;
  const placeholder = cockpit.wheelRotor.getObjectByName('WheelMesh');
  let placeholderDisposals = 0;
  placeholder.children[0].geometry.addEventListener('dispose', () => placeholderDisposals++);
  boat.position.set(1200, 3, -900);
  boat.rotation.set(.06, 1.2, -.04);
  updateHelmCockpit(cockpit, .02, .1, { KeyA: true });
  const steering = cockpit.wheelAngle;
  installBigBoatBridgeModel(cockpit, await loadBridge());
  assert.equal(cockpit.group.userData.texturedBridge, true);
  assert.equal(cockpit.group.getObjectByName('BigBoatBridgeFallback').visible, false);
  assert.equal(placeholder.parent, null);
  assert.equal(placeholderDisposals, 1);
  assert.equal(display.screen.parent, radarMount, 'loading never replaces or disconnects the live radar');
  assert.equal(display.texture.image, canvas);
  assert.equal(cockpit.wheelRotor.rotation.x, steering, 'steering accumulated during loading stays intact');
  const wheel = cockpit.wheelRotor.getObjectByName('WheelMesh');
  assert.equal(wheel.parent, cockpit.wheelRotor);
  const mount = cockpit.group.getObjectByName('WheelMount');
  assert.ok(mount.position.distanceTo(BIG_BOAT_BRIDGE_WHEEL) < 1e-8);
  const before = wheel.getWorldQuaternion(new THREE.Quaternion());
  updateHelmCockpit(cockpit, .02, .1, { KeyA: true });
  assert.ok(before.angleTo(wheel.getWorldQuaternion(new THREE.Quaternion())) > .01);
  const version = display.texture.version;
  updateHelmRadarScreen(display);
  assert.equal(display.texture.version, version + 1);
  disposeHelmRadarScreen(display);
  disposeHelmCockpit(cockpit);
});

test('the live radar is fully visible in the actual modeled cabin on desktop and landscape mobile', async () => {
  const { boat, cockpit } = createBoat();
  installBigBoatBridgeModel(cockpit, await loadBridge());
  const display = createHelmRadarScreen(boat, { width: 512, height: 512 });
  boat.updateMatrixWorld(true);
  const points = display.surface.geometry.attributes.position;
  const corners = Array.from({ length: 4 }, (_, i) =>
    display.surface.localToWorld(new THREE.Vector3().fromBufferAttribute(points, i)));
  for (const aspect of [1200 / 800, 813 / 361]) {
    const camera = new THREE.PerspectiveCamera(62, aspect, .2, 1000);
    camera.position.copy(BIG_BOAT_BRIDGE_EYE);
    camera.lookAt(BIG_BOAT_BRIDGE_LOOK);
    camera.updateMatrixWorld(true);
    for (const corner of corners) {
      const point = corner.clone().project(camera);
      assert.ok(Math.abs(point.x) < 1 && Math.abs(point.y) < 1);
    }
    for (const u of [.03, .5, .97]) for (const v of [.03, .5, .97]) {
      const point = corners[0].clone().lerp(corners[1], u)
        .lerp(corners[2].clone().lerp(corners[3], u), v);
      const ray = new THREE.Raycaster(camera.position, point.sub(camera.position).normalize());
      // Invisible loading meshes must not be considered physical occluders.
      const hits = ray.intersectObject(boat, true).filter(hit => {
        for (let node = hit.object; node; node = node.parent) if (!node.visible) return false;
        return true;
      });
      assert.ok(hits[0]?.object === display.surface, `radar is unobstructed at ${u},${v}`);
    }
  }
  disposeHelmRadarScreen(display);
  disposeHelmCockpit(cockpit);
});

test('disposing during cabin loading releases the late asset and its shared textures once', async () => {
  const { cockpit } = createBoat();
  disposeHelmCockpit(cockpit);
  const model = await loadBridge();
  const material = model.getObjectByName('BridgeDashboard').material;
  const texture = new THREE.Texture();
  material.map = texture;
  material.normalMap = texture;
  let textureDisposals = 0, materialDisposals = 0;
  texture.addEventListener('dispose', () => textureDisposals++);
  material.addEventListener('dispose', () => materialDisposals++);
  const childCount = cockpit.group.children.length;
  installBigBoatBridgeModel(cockpit, model);
  assert.equal(model.parent, null);
  assert.equal(cockpit.group.children.length, childCount);
  assert.equal(textureDisposals, 1);
  assert.equal(materialDisposals, 1);
});
