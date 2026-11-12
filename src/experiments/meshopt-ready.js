// Babylon's script hook resolves to a local asset; the decoder itself is already
// imported from the installed meshoptimizer package before the GLTF load begins.
globalThis.__helmquestMeshoptReady = true;
