// The archived island has geometry, but its original image files are absent.
// Keep its geometry/colliders and use solid materials for this emergency fallback.
export function prepareLegacyIslandDocument(document, bufferUrl) {
  const model = structuredClone(document);
  model.buffers[0].uri = bufferUrl;
  delete model.images;
  delete model.textures;
  for (const material of model.materials ?? []) {
    const name = material.name ?? '';
    const color = /beach|sand/i.test(name) ? [0.65, 0.5, 0.28, 1]
      : /rock/i.test(name) ? [0.3, 0.27, 0.22, 1]
      : /root|treibholz/i.test(name) ? [0.22, 0.12, 0.05, 1]
      : [0.08, 0.25, 0.04, 1];
    delete material.normalTexture;
    delete material.occlusionTexture;
    delete material.emissiveTexture;
    material.pbrMetallicRoughness = {
      baseColorFactor: color, metallicFactor: 0, roughnessFactor: 0.95,
    };
  }
  return model;
}
