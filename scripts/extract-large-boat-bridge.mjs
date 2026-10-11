// Reuse the project's textured trawler cabin without loading its 100 MB hull.
import { readFileSync, writeFileSync } from 'node:fs';
import * as THREE from 'three';
import { normalizeBoatToScene } from '../src/helpers/normalizeBoatScale.js';

const bytes = readFileSync(new URL('../public/assets/trawler (1).glb', import.meta.url));
const jsonLength = bytes.readUInt32LE(12);
const source = JSON.parse(bytes.subarray(20, 20 + jsonLength));
const binaryStart = 28 + jsonLength;
const names = new Map([
  [1, 'BridgeRoof'], [2, 'BridgeCabinShell'], [3, 'BridgeCabinDoor'],
  [38, 'BridgeDashboard'], [39, 'BridgeCabinFloor'], [40, 'BridgePortCabinLamp'],
  [41, 'BridgeStarboardCabinLamp'], [42, 'BridgePortCabinet'], [43, 'BridgeStarboardCabinet'],
  [45, 'BridgeRadio'], [47, 'BridgeSteeringWheel'], [48, 'BridgeThrottleHandle'],
  [49, 'BridgeThrottleStem'], [50, 'BridgeVent'], [51, 'BridgeVentPort'],
  [52, 'BridgeDoorHandlePort'], [53, 'BridgeDoorHandleStarboard'], [54, 'BridgeDoorTrim'],
  [66, 'BridgeWindowGlass'],
]);

// Reconstruct transforms and normalize against the full original boat's bounds.
const model = new THREE.Group();
const objects = source.nodes.map(node => {
  const object = new THREE.Group();
  if (node.matrix) new THREE.Matrix4().fromArray(node.matrix).decompose(object.position, object.quaternion, object.scale);
  else {
    if (node.translation) object.position.fromArray(node.translation);
    if (node.rotation) object.quaternion.fromArray(node.rotation);
    if (node.scale) object.scale.fromArray(node.scale);
  }
  for (const primitive of source.meshes[node.mesh]?.primitives || []) {
    const accessor = source.accessors[primitive.attributes.POSITION];
    const view = source.bufferViews[accessor.bufferView];
    const positions = new Float32Array(bytes.buffer,
      bytes.byteOffset + binaryStart + (view.byteOffset || 0) + (accessor.byteOffset || 0), accessor.count * 3);
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    object.add(new THREE.Mesh(geometry));
  }
  return object;
});
source.nodes.forEach((node, index) => node.children?.forEach(child => objects[index].add(objects[child])));
source.scenes[source.scene || 0].nodes.forEach(index => model.add(objects[index]));
const { boat } = normalizeBoatToScene(model, {
  targetLength: 60, targetWaterlineY: 0, spawnX: 0, spawnZ: 0, modelPath: '/assets/trawler (1).glb',
});
boat.updateMatrixWorld(true);
// The original helm eye (-2,17,0) maps to the large bridge eye (47,34.5,0).
const placement = new THREE.Matrix4().makeTranslation(48.6, 20.9, 0)
  .multiply(new THREE.Matrix4().makeScale(.8, .8, .8));

const output = {
  asset: { version: '2.0', generator: 'HelmQuest bridge extraction',
    extras: { source: 'trawler (1).glb', mediumEye: [-2, 17, 0], largeEye: [47, 34.5, 0] } },
  scene: 0, scenes: [{ nodes: [] }], nodes: [], meshes: [], materials: [],
  accessors: [], bufferViews: [], textures: [], images: [], samplers: [], buffers: [],
};
const chunks = [];
let binaryLength = 0;
const maps = Object.fromEntries(['bufferViews', 'accessors', 'textures', 'images', 'samplers', 'materials']
  .map(key => [key, new Map()]));
function copyView(index) {
  if (maps.bufferViews.has(index)) return maps.bufferViews.get(index);
  const view = source.bufferViews[index];
  const buffer = bytes.subarray(binaryStart + (view.byteOffset || 0), binaryStart + (view.byteOffset || 0) + view.byteLength);
  const next = output.bufferViews.length;
  output.bufferViews.push({ ...view, buffer: 0, byteOffset: binaryLength });
  chunks.push(buffer, Buffer.alloc((4 - buffer.byteLength % 4) % 4));
  binaryLength += buffer.byteLength + (4 - buffer.byteLength % 4) % 4;
  maps.bufferViews.set(index, next);
  return next;
}
function copyAccessor(index) {
  if (maps.accessors.has(index)) return maps.accessors.get(index);
  const accessor = structuredClone(source.accessors[index]);
  if (accessor.sparse) throw new Error('Sparse accessors require explicit extraction support');
  if (accessor.bufferView != null) {
    const view = source.bufferViews[accessor.bufferView];
    const components = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4, MAT4: 16 }[accessor.type];
    const componentBytes = { 5120: 1, 5121: 1, 5122: 2, 5123: 2, 5125: 4, 5126: 4 }[accessor.componentType];
    const elementBytes = components * componentBytes;
    const packed = Buffer.alloc(accessor.count * elementBytes);
    const start = binaryStart + (view.byteOffset || 0) + (accessor.byteOffset || 0);
    const stride = view.byteStride || elementBytes;
    for (let element = 0; element < accessor.count; element++) {
      bytes.copy(packed, element * elementBytes, start + element * stride, start + element * stride + elementBytes);
    }
    accessor.bufferView = output.bufferViews.push({ buffer: 0, byteOffset: binaryLength,
      byteLength: packed.length, ...(view.target ? { target: view.target } : {}) }) - 1;
    accessor.byteOffset = 0;
    chunks.push(packed, Buffer.alloc((4 - packed.length % 4) % 4));
    binaryLength += packed.length + (4 - packed.length % 4) % 4;
  }
  const next = output.accessors.push(accessor) - 1;
  maps.accessors.set(index, next);
  return next;
}
function copyTexture(index) {
  if (maps.textures.has(index)) return maps.textures.get(index);
  const texture = structuredClone(source.textures[index]);
  if (!maps.images.has(texture.source)) {
    const image = structuredClone(source.images[texture.source]);
    image.bufferView = copyView(image.bufferView);
    maps.images.set(texture.source, output.images.push(image) - 1);
  }
  texture.source = maps.images.get(texture.source);
  if (texture.sampler != null) {
    if (!maps.samplers.has(texture.sampler)) maps.samplers.set(texture.sampler,
      output.samplers.push(structuredClone(source.samplers[texture.sampler])) - 1);
    texture.sampler = maps.samplers.get(texture.sampler);
  }
  const next = output.textures.push(texture) - 1;
  maps.textures.set(index, next);
  return next;
}
function copyMaterial(index) {
  if (maps.materials.has(index)) return maps.materials.get(index);
  const material = structuredClone(source.materials[index]);
  for (const [key, value] of Object.entries(material)) {
    if (key.endsWith('Texture') && value?.index != null) value.index = copyTexture(value.index);
  }
  for (const [key, value] of Object.entries(material.pbrMetallicRoughness || {})) {
    if (key.endsWith('Texture') && value?.index != null) value.index = copyTexture(value.index);
  }
  const next = output.materials.push(material) - 1;
  maps.materials.set(index, next);
  return next;
}
for (let index = 0; index < source.nodes.length; index++) {
  const node = source.nodes[index];
  if (!names.has(node.mesh)) continue;
  const mesh = structuredClone(source.meshes[node.mesh]);
  for (const primitive of mesh.primitives) {
    primitive.attributes = Object.fromEntries(Object.entries(primitive.attributes).map(([key, value]) => [key, copyAccessor(value)]));
    if (primitive.indices != null) primitive.indices = copyAccessor(primitive.indices);
    if (primitive.material != null) primitive.material = copyMaterial(primitive.material);
  }
  const matrix = placement.clone().multiply(objects[index].matrixWorld);
  output.scenes[0].nodes.push(output.nodes.length);
  output.nodes.push({ name: names.get(node.mesh), mesh: output.meshes.push(mesh) - 1, matrix: matrix.toArray() });
  if (node.mesh === 47) {
    const center = new THREE.Box3().setFromObject(objects[index]).getCenter(new THREE.Vector3()).applyMatrix4(placement);
    output.asset.extras.wheelCenter = center.toArray();
  }
}
output.buffers.push({ byteLength: binaryLength });
const json = Buffer.from(JSON.stringify(output));
const jsonPadding = Buffer.alloc((4 - json.byteLength % 4) % 4, 0x20);
const header = Buffer.alloc(20);
header.writeUInt32LE(0x46546c67, 0); header.writeUInt32LE(2, 4);
header.writeUInt32LE(28 + json.length + jsonPadding.length + binaryLength, 8);
header.writeUInt32LE(json.length + jsonPadding.length, 12); header.writeUInt32LE(0x4e4f534a, 16);
const binaryHeader = Buffer.alloc(8);
binaryHeader.writeUInt32LE(binaryLength, 0); binaryHeader.writeUInt32LE(0x004e4942, 4);
const result = Buffer.concat([header, json, jsonPadding, binaryHeader, ...chunks]);
writeFileSync(new URL('../public/assets/helm/large_boat_bridge.glb', import.meta.url), result);
console.log(JSON.stringify({ meshes: output.meshes.length, bytes: result.length, wheelCenter: output.asset.extras.wheelCenter }));
