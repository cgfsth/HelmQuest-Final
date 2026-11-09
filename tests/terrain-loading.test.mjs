import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { NodeIO } from '@gltf-transform/core';
import { KHRMaterialsUnlit } from '@gltf-transform/extensions';
import { prepareLegacyIslandDocument } from '../src/helpers/legacyIslandDocument.js';

test('fallback island parses with its real geometry and no unavailable texture dependencies', async () => {
  const source = JSON.parse(readFileSync(new URL('../src/helpers/tropical_island/scene.gltf', import.meta.url)));
  const bytes = new Uint8Array(readFileSync(new URL('../src/helpers/tropical_island/scene.bin', import.meta.url)));
  const uri = '/assets/scene-test.bin';
  const model = prepareLegacyIslandDocument(source, uri);
  assert.equal(model.buffers[0].byteLength, bytes.byteLength);
  assert.equal(model.images, undefined);
  assert.equal(model.textures, undefined);
  assert.equal(source.buffers[0].uri, 'scene.bin', 'source model stays intact');
  assert.deepEqual(model.meshes, source.meshes, 'render geometry and collision meshes stay intact');
  assert.deepEqual(model.nodes, source.nodes, 'scene hierarchy stays intact');
  const document = await new NodeIO().registerExtensions([KHRMaterialsUnlit])
    .readJSON({ json: model, resources: { [uri]: bytes } });
  assert.equal(document.getRoot().listMeshes().length, source.meshes.length);
  assert.equal(document.getRoot().listTextures().length, 0);
});

const app = readFileSync(new URL('../src/App.vue', import.meta.url), 'utf8').replace(/\r\n/g, '\n');
function appFunction(name) {
  const start = app.indexOf(`function ${name}(`);
  assert.ok(start >= 0);
  return app.slice(start, app.indexOf('\n}', start) + 2);
}

for (const name of ['startQuickSail', 'startQuickSailWithBoat']) {
  test(`${name} keeps the user out of simulation when both terrain sources fail`, async () => {
    let enters = 0;
    const context = {
      Promise, console: { error() {} },
      archipelagoLoadPromise: Promise.reject(new Error('terrain offline')),
      isQuickSailMode: { value: false }, showCinematicLoading: { value: false }, loadingHint: { value: '' },
      fatalError: { value: null }, simulationWeatherPreset: { value: '' }, stormMode: { value: false },
      calmWeatherSnapshot: null, wind: { value: { speed: 0 } }, selectedBoatType: { value: 'medium' },
      performanceManager: { cancelMission() {} }, applyBoatWavePhysics() {}, onWaterParamChange() {},
      goToScreen() { enters++; }, syncWorldForSimulation() { enters++; },
    };
    vm.createContext(context);
    vm.runInContext(appFunction('handleTerrainLoadFailure') + '\n' + appFunction(name), context);
    context[name]();
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(enters, 0);
    assert.equal(context.showCinematicLoading.value, false);
    assert.match(context.fatalError.value, /terrain offline/);
  });
}

test('Retry reloads failed terrain instead of dismissing the failure into a broken scene', () => {
  let reloads = 0;
  const context = {
    islandGroup: null, sceneGltfLoader: {}, fatalError: { value: 'terrain failed' },
    window: { location: { reload() { reloads++; } } },
  };
  vm.createContext(context);
  vm.runInContext(appFunction('clearError'), context);
  context.clearError();
  assert.equal(reloads, 1);
  context.islandGroup = {};
  context.clearError();
  assert.equal(context.fatalError.value, null);
  assert.equal(reloads, 1);
});
