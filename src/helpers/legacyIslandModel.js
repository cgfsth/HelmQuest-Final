import source from './tropical_island/scene.gltf?raw';
import bufferUrl from './tropical_island/scene.bin?url';
import { prepareLegacyIslandDocument } from './legacyIslandDocument.js';

export function loadLegacyIsland(gltfLoader) {
  // Explicit imports let Vite publish the companion buffer with its hashed URL.
  const model = prepareLegacyIslandDocument(JSON.parse(source), bufferUrl);
  return gltfLoader.parseAsync(JSON.stringify(model), '');
}
