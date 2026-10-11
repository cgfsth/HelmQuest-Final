import * as THREE from 'three';

/** @type {Promise<THREE.Texture> | null} */
let heightmapLoadPromise = null;

export async function loadHeightmapTexture() {
  if (heightmapLoadPromise) return heightmapLoadPromise;

  heightmapLoadPromise = new Promise((resolve, reject) => {
    const textureLoader = new THREE.TextureLoader();
    textureLoader.setCrossOrigin('anonymous');
    textureLoader.load(
      '/davao-heightmap.png',
      (texture) => {
        texture.colorSpace = THREE.NoColorSpace;
        texture.flipY = false;
        texture.wrapS = THREE.ClampToEdgeWrapping;
        texture.wrapT = THREE.ClampToEdgeWrapping;
        texture.needsUpdate = true;
        resolve(texture);
      },
      undefined,
      (error) => {
        heightmapLoadPromise = null;
        reject(error);
      }
    );
  });

  return heightmapLoadPromise;
}
