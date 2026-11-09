import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { getRenderQuality, getShadowMapSize, shouldRenderScene } from '../src/helpers/renderQuality.js';
import { TerrainTileManager } from '../src/helpers/terrainGenerator.js';

test('graphics settings bound render work on high DPI screens and keep optional effects selectable', () => {
  assert.equal(getRenderQuality('medium', 3).pixelRatio, 1.25);
  assert.equal(getRenderQuality('ultra', 3).pixelRatio, 2);
  assert.equal(getRenderQuality('high', 1).pixelRatio, 1);
  assert.equal(getRenderQuality('medium').bloom, false);
  assert.equal(getRenderQuality('ultra').bloom, true);
  assert.equal(getRenderQuality('low').smaa, false);
  assert.equal(getRenderQuality('invalid', NaN).pixelRatio, 1);
  assert.equal(getShadowMapSize('low'), 512);
  assert.equal(getShadowMapSize('off'), 0);
});

test('opaque screens and background tabs skip 3D while the simulation keeps every frame', () => {
  for (const screen of ['dashboard', 'auth', 'boat-selection']) {
    assert.equal(shouldRenderScene(screen, false, 100, 90), false);
  }
  assert.equal(shouldRenderScene('simulation', true, 100, 90), false);
  assert.equal(shouldRenderScene('simulation', false, 100, 99), true);
  assert.equal(shouldRenderScene('landing', false, 100, 90), false);
  assert.equal(shouldRenderScene('landing', false, 134, 100), true);
  assert.equal(shouldRenderScene('play-options', false, 1, 0), true);
});

test('terrain bounds are refreshed after streaming changes and reused on idle frames', () => {
  const manager = new TerrainTileManager();
  manager.root = new THREE.Group();
  manager.sharedMaterial = new THREE.MeshBasicMaterial();
  manager.cache = { width: 2, height: 2, data: new Uint8ClampedArray(16) };
  for (let i = 0; i < 6; i++) manager.update(0, 0);
  assert.ok(manager.tiles.size > 0);
  const bounds = manager.root.userData.boundingBox;
  const mesh = manager.tiles.values().next().value;
  const tileBounds = mesh.userData.boundingBox;
  for (let i = 0; i < 120; i++) manager.update(0, 0);
  assert.equal(manager.root.userData.boundingBox, bounds, 'stationary terrain must not recompute scene bounds every frame');
  assert.equal(mesh.userData.boundingBox, tileBounds);
  manager.forceUpdate(8000, 0);
  for (let i = 0; i < 6; i++) manager.update(8000, 0);
  assert.notEqual(manager.root.userData.boundingBox, bounds, 'streaming new tiles invalidates the bounds');
  assert.ok(!manager.root.userData.boundingBox.isEmpty());
  manager.dispose();
});
