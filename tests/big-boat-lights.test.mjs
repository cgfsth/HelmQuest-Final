import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import * as THREE from 'three';
import { addBigBoatLights, disposeBigBoatLights, updateBigBoatLightPools, BIG_BOAT_LAMPS } from '../src/helpers/bigBoatLights.js';
import { normalizeBoatToScene } from '../src/helpers/normalizeBoatScale.js';

function realBigBoat() {
  const bytes = readFileSync(new URL('../public/assets/BigBoat.glb', import.meta.url));
  const jsonLength = bytes.readUInt32LE(12);
  const asset = JSON.parse(bytes.subarray(20, 20 + jsonLength));
  const bufferStart = 28 + jsonLength;
  const attribute = index => {
    const accessor = asset.accessors[index], view = asset.bufferViews[accessor.bufferView];
    const offset = bytes.byteOffset + bufferStart + (view.byteOffset || 0) + (accessor.byteOffset || 0);
    const components = { VEC3: 3, SCALAR: 1 }[accessor.type];
    const ArrayType = accessor.componentType === 5126 ? Float32Array : Uint16Array;
    return new THREE.BufferAttribute(new ArrayType(bytes.buffer, offset, accessor.count * components), components);
  };
  const primitive = asset.meshes[0].primitives[0];
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', attribute(primitive.attributes.POSITION));
  geometry.setIndex(attribute(primitive.indices));
  const model = new THREE.Group();
  model.add(new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({ side: THREE.DoubleSide })));
  const { boat } = normalizeBoatToScene(model, {
    targetLength: 180, targetWaterlineY: 0, spawnX: 0, spawnZ: 0, modelPath: '/assets/BigBoat.glb'
  });
  boat.userData.loaMeters = 180;
  boat.updateMatrixWorld(true);
  return { boat, model };
}

test('all lamp positions sit on the actual BigBoat mesh rather than floating over the bow', () => {
  const { model } = realBigBoat();
  for (const lamp of BIG_BOAT_LAMPS) {
    const position = new THREE.Vector3().fromArray(lamp.position);
    const normal = new THREE.Vector3().fromArray(lamp.normal).normalize();
    const ray = new THREE.Raycaster(position.clone().addScaledVector(normal, 2), normal.negate(), 0, 4);
    const hit = ray.intersectObject(model, true)[0];
    assert.ok(hit, `${lamp.name} must be mounted on the model`);
    assert.ok(hit.point.distanceTo(position) < 0.02, `${lamp.name} must coincide with its measured lens surface`);
  }
});

test('visible lamp lenses and glows illuminate the roof/deck and follow the boat transform', () => {
  const { boat } = realBigBoat();
  const lamps = addBigBoatLights(boat);
  assert.equal(lamps.children.filter(node => node.getObjectByName('LampLens')).length, 10);
  assert.ok(lamps.getObjectByName('PortFrontRoofLamp').getObjectByName('LampLight').isSpotLight);
  assert.ok(lamps.getObjectByName('PortRearRoofLamp').getObjectByName('LampLight').isSpotLight);
  const frontLamps = BIG_BOAT_LAMPS.filter(definition => definition.role === 'front');
  assert.equal(frontLamps.length, 3, 'front lighting must cover the centre and both sides');
  for (const definition of BIG_BOAT_LAMPS) {
    const fixture = lamps.getObjectByName(definition.name);
    assert.equal(fixture.getObjectByName('LampLens').material.toneMapped, false);
    assert.equal(fixture.getObjectByName('LampGlow').material.depthWrite, false);
    if (definition.target) {
      const light = fixture.getObjectByName('LampLight');
      assert.ok(light.isSpotLight && light.intensity > 0);
      assert.equal(light.castShadow, false);
      assert.ok(light.target.parent === lamps);
      if (definition.role === 'front') {
        assert.ok(light.intensity >= 100000 && light.distance >= 800, 'front lights must illuminate well beyond the bow');
        assert.ok(light.target.position.x > 180 && Math.abs(light.target.position.z) <= 55);
        const beam = fixture.getObjectByName('FrontLightBeam');
        const direction = new THREE.Vector3(0, -1, 0).applyQuaternion(beam.quaternion);
        const expected = light.target.position.clone().sub(fixture.position).normalize();
        assert.ok(direction.distanceTo(expected) < 1e-8, 'visible beams must match the spotlights');
        assert.equal(beam.material.depthWrite, false);
      }
    }
  }
  boat.position.set(12, 2, -30);
  boat.rotation.set(0.1, Math.PI / 2, 0.03);
  boat.updateMatrixWorld(true);
  const fixture = lamps.getObjectByName('FrontRoofLamp');
  const expected = fixture.position.clone().applyMatrix4(boat.matrixWorld);
  assert.ok(fixture.getWorldPosition(new THREE.Vector3()).distanceTo(expected) < 1e-8);
  updateBigBoatLightPools(boat, (x, z) => 2 + x * .001 + z * .002);
  assert.equal(lamps.userData.waterPools.length, 3);
  for (const pool of lamps.userData.waterPools) {
    const position = pool.getWorldPosition(new THREE.Vector3());
    const target = pool.userData.target.getWorldPosition(new THREE.Vector3());
    assert.ok(Math.abs(position.x - target.x) < 1e-8 && Math.abs(position.z - target.z) < 1e-8);
    assert.ok(Math.abs(position.y - (2 + position.x * .001 + position.z * .002 + .15)) < 1e-8,
      'water footprints must follow the water height instead of hull heave');
    const normal = new THREE.Vector3(0, 0, 1).transformDirection(pool.matrixWorld);
    assert.ok(normal.distanceTo(new THREE.Vector3(0, 1, 0)) < 1e-8, 'footprints stay flat while the boat rolls');
    assert.equal(pool.material.depthWrite, false);
    assert.equal(pool.material.depthTest, true, 'the hull must occlude projected light');
  }
  assert.equal(addBigBoatLights(boat), lamps, 'reinitializing must not add duplicate lights');
});

test('disposing the fixtures releases shared resources once and preserves the boat mesh', () => {
  const { boat, model } = realBigBoat();
  const lamps = addBigBoatLights(boat);
  const lensGeometry = lamps.getObjectByName('BowRoofLamp').getObjectByName('LampLens').geometry;
  const poolGeometry = lamps.userData.waterPools[0].geometry;
  const poolMaterial = lamps.userData.waterPools[0].material;
  let geometryDisposals = 0, textureDisposals = 0, poolGeometryDisposals = 0, poolMaterialDisposals = 0;
  lensGeometry.addEventListener('dispose', () => geometryDisposals++);
  lamps.userData.glowTexture.addEventListener('dispose', () => textureDisposals++);
  poolGeometry.addEventListener('dispose', () => poolGeometryDisposals++);
  poolMaterial.addEventListener('dispose', () => poolMaterialDisposals++);
  disposeBigBoatLights(lamps);
  assert.equal(geometryDisposals, 1);
  assert.equal(textureDisposals, 1);
  assert.equal(poolGeometryDisposals, 1);
  assert.equal(poolMaterialDisposals, 1);
  assert.equal(boat.getObjectByName('BigBoatLights'), undefined);
  assert.equal(model.parent, boat);
});

test('actual App lighting flow turns BigBoat lamps on in daylight and respects the L toggle across weather and swaps', () => {
  const source = readFileSync(new URL('../src/App.vue', import.meta.url), 'utf8').replace(/\r\n/g, '\n');
  const context = { THREE, addBigBoatLights, disposeBigBoatLights, boatHeadlights: [],
    environmentPreset: 'day', headlightsManuallyToggled: false, headlightsManualState: true,
    console: { log() {}, warn() {} } };
  vm.createContext(context);
  for (const name of ['setBoatHeadlightsVisibility', 'syncBoatHeadlights', 'toggleBoatHeadlights', 'addBoatHeadlights']) {
    const start = source.indexOf(`function ${name}(`);
    vm.runInContext(source.slice(start, source.indexOf('\n}', start) + 2), context);
  }
  const first = realBigBoat().boat;
  context.addBoatHeadlights(first, 180);
  const lamps = first.getObjectByName('BigBoatLights');
  assert.equal(lamps.visible, true);
  context.toggleBoatHeadlights();
  assert.equal(lamps.visible, false);
  context.environmentPreset = 'sunset';
  context.syncBoatHeadlights();
  assert.equal(lamps.visible, false, 'weather changes must respect the manual switch');
  context.toggleBoatHeadlights();
  assert.equal(lamps.visible, true);
  const second = realBigBoat().boat;
  context.addBoatHeadlights(second, 180);
  assert.equal(first.getObjectByName('BigBoatLights'), undefined);
  assert.equal(second.getObjectByName('BigBoatLights').visible, true);
});
