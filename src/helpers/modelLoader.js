import { FileLoader, LoaderUtils } from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import optimizedModels from './optimizedModelManifest.js';
import { createModelBufferCache } from './modelBufferCache.js';

const getModelBuffer = createModelBufferCache(url => new FileLoader().setResponseType('arraybuffer').loadAsync(url));

/** Shared decoder and bounded download cache; each load parses an independently owned scene. */
export function createModelLoader() {
  const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
  const originalLoad = loader.load.bind(loader);
  loader.load = (url, onLoad, onProgress, onError) => {
    const optimizedURL = optimizedModels[url];
    if (!optimizedURL) return originalLoad(url, onLoad, onProgress, onError);
    getModelBuffer(optimizedURL)
      .then(buffer => loader.parseAsync(buffer, LoaderUtils.extractUrlBase(optimizedURL)))
      .then(onLoad)
      .catch(error => {
        if (onError) onError(error);
        else console.error('[HelmQuest] Model load failed:', error);
      });
  };
  return loader;
}
