import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import * as THREE from 'three';
import sharp from 'sharp';
import { createModelBufferCache } from '../src/helpers/modelBufferCache.js';
import { createModelLoader } from '../src/helpers/modelLoader.js';
import manifest from '../src/helpers/optimizedModelManifest.js';

test('model downloads coalesce, reuse bytes and retry after failure', async () => {
  let calls = 0;
  const get = createModelBufferCache(async () => {
    if (++calls === 1) throw new Error('Offline');
    return new ArrayBuffer(4);
  });
  await assert.rejects(get('boat'), /Offline/);
  const [first, second] = await Promise.all([get('boat'), get('boat')]);
  assert.equal(first, second);
  assert.equal(await get('boat'), first);
  assert.equal(calls, 2);
});

test('model byte cache evicts least recently used assets and never retains oversized assets', async () => {
  const calls = [];
  const get = createModelBufferCache(async url => {
    calls.push(url);
    return new ArrayBuffer(url === 'huge' ? 20 : 4);
  }, 8);
  await get('a'); await get('b'); await get('a'); await get('c'); await get('b');
  assert.deepEqual(calls, ['a', 'b', 'c', 'b']);
  await get('huge'); await get('huge');
  assert.equal(calls.filter(url => url === 'huge').length, 2);
});

// Exercise the app's actual Three.js decoder. Node has no native ImageBitmap;
// Sharp checks embedded texture metadata while the real GLTF parser handles geometry.
globalThis.self = globalThis;
globalThis.Image = class {
  set src(url) {
    fetch(url).then(response => response.arrayBuffer()).then(bytes => sharp(Buffer.from(bytes)).metadata())
      .then(({ width, height }) => { this.width = width; this.height = height; this.onload?.(); })
      .catch(error => this.onerror?.(error));
  }
};
globalThis.createImageBitmap = async blob => {
  const { width, height } = await sharp(Buffer.from(await blob.arrayBuffer())).metadata();
  assert.ok(width > 0 && height > 0);
  return { width, height, close() {} };
};
const loader = createModelLoader();
async function parse(bytes) {
  return (await loader.parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '')).scene;
}
function json(bytes) {
  return JSON.parse(bytes.subarray(20, 20 + bytes.readUInt32LE(12)));
}
function triangles(root) {
  let count = 0;
  root.traverse(node => {
    if (node.isMesh) count += (node.geometry.index?.count ?? node.geometry.attributes.position.count) / 3;
  });
  return count;
}

for (const [originalURL, optimizedURL] of Object.entries(manifest)) {
  test(`optimized ${originalURL} decodes, preserves named parts and hull bounds`, async () => {
    const original = await readFile(new URL(`../public${originalURL}`, import.meta.url));
    const optimized = await readFile(new URL(`../public${optimizedURL}`, import.meta.url));
    assert.ok(optimized.byteLength < original.byteLength * 0.6, 'download must shrink by at least 40%');
    const originalJson = json(original), optimizedJson = json(optimized);
    const names = new Set(optimizedJson.nodes.map(node => node.name));
    for (const node of originalJson.nodes) {
      if (node.name) assert.ok(names.has(node.name), `Missing animated/model part: ${node.name}`);
    }
    const before = await parse(original), after = await parse(optimized);
    const simplified = originalURL === '/assets/trawler (1).glb' || originalURL === '/assets/seaside_wharf.glb';
    if (simplified) {
      assert.ok(triangles(after) < triangles(before) * 0.5, 'the two high-poly models must shed at least half their triangles');
    } else {
      assert.equal(triangles(after), triangles(before), 'other models retain every triangle');
    }
    const sourceMeshes = new Map();
    before.updateMatrixWorld(true);
    after.updateMatrixWorld(true);
    before.traverse(node => { if (node.isMesh) sourceMeshes.set(node.name, node); });
    after.traverse(node => {
      if (!node.isMesh) return;
      const source = sourceMeshes.get(node.name);
      assert.ok(source, `Mesh hierarchy changed: ${node.name}`);
      if (originalURL !== '/assets/seaside_wharf.glb' && !/^rope1_high/i.test(node.name)) {
        assert.equal(triangles(node), triangles(source), `Functional geometry changed: ${node.name}`);
      }
      // Meshopt rebases local mesh transforms during quantization. Compare the
      // world-space part, which is what the helm, anchor and collision code use.
      const originalBounds = new THREE.Box3().setFromObject(source);
      const optimizedBounds = new THREE.Box3().setFromObject(node);
      const partTolerance = originalBounds.getSize(new THREE.Vector3()).length() * 0.0002 + 1e-6;
      assert.ok(originalBounds.min.distanceTo(optimizedBounds.min) < partTolerance, `Part minimum bounds changed: ${node.name}`);
      assert.ok(originalBounds.max.distanceTo(optimizedBounds.max) < partTolerance, `Part maximum bounds changed: ${node.name}`);
    });
    const beforeBox = new THREE.Box3().setFromObject(before);
    const afterBox = new THREE.Box3().setFromObject(after);
    const tolerance = beforeBox.getSize(new THREE.Vector3()).length() * 0.0001;
    assert.ok(beforeBox.min.distanceTo(afterBox.min) < tolerance, 'minimum bounds changed');
    assert.ok(beforeBox.max.distanceTo(afterBox.max) < tolerance, 'maximum bounds changed');
    after.traverse(node => {
      for (const material of (Array.isArray(node.material) ? node.material : [node.material])) {
        for (const value of Object.values(material || {})) {
          if (value?.isTexture) assert.ok(value.image?.width > 0 && value.image?.height > 0, 'texture failed to decode');
        }
      }
    });
  });
}
