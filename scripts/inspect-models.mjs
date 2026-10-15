import { readFileSync } from 'node:fs';

for (const path of process.argv.slice(2)) {
  const bytes = readFileSync(path);
  const json = JSON.parse(bytes.subarray(20, 20 + bytes.readUInt32LE(12)));
  const imageBytes = (json.images || []).reduce((sum, image) => sum + (json.bufferViews[image.bufferView]?.byteLength || 0), 0);
  console.log(JSON.stringify({ path, bytes: bytes.length, imageBytes, meshes: json.meshes?.length,
    nodes: json.nodes?.length, images: json.images?.length, extensions: json.extensionsUsed }));
}
