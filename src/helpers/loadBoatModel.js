import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js';
import { MTLLoader } from 'three/examples/jsm/loaders/MTLLoader.js';

const gltfLoader = new GLTFLoader();
const objLoader = new OBJLoader();
const stlLoader = new STLLoader();
const mtlLoader = new MTLLoader();

function getResourcePath(filePath) {
  const normalized = filePath.replace(/\\/g, '/');
  const idx = normalized.lastIndexOf('/');
  return idx >= 0 ? normalized.slice(0, idx + 1) : '/';
}

function getFileName(filePath) {
  const normalized = filePath.replace(/\\/g, '/');
  const idx = normalized.lastIndexOf('/');
  return idx >= 0 ? normalized.slice(idx + 1) : normalized;
}

const _liftColor = new THREE.Color();
const _white = new THREE.Color(0xffffff);
const _hullBlue = new THREE.Color(0x3a7ec8);

function colorLuminance(color) {
  return color.r * 0.2126 + color.g * 0.7152 + color.b * 0.0722;
}

function upgradeMaterial(mat) {
  if (!mat) return mat;
  if (mat.isMeshPhongMaterial || mat.isMeshLambertMaterial) {
    const next = new THREE.MeshStandardMaterial({
      color: mat.color,
      map: mat.map,
      normalMap: mat.normalMap,
      roughness: 0.55,
      metalness: 0.08,
      transparent: mat.transparent,
      opacity: mat.opacity,
      side: mat.side
    });
    if (next.map) next.map.colorSpace = THREE.SRGBColorSpace;
    mat.dispose?.();
    return next;
  }
  return mat;
}

/** Lift dark GLB hull/cabin materials so the trawler reads clearly at sunset. */
function brightenBoatMaterial(mat) {
  if (!mat) return mat;

  let m = upgradeMaterial(mat);

  if (
    !m.isMeshStandardMaterial &&
    !m.isMeshPhysicalMaterial &&
    !m.isMeshPhongMaterial &&
    !m.isMeshLambertMaterial
  ) {
    return m;
  }

  if (m.map) {
    m.color.set(0xffffff);
  }

  const lum = colorLuminance(m.color);
  _liftColor.copy(m.color);

  if (lum < 0.2) {
    _liftColor.lerp(_hullBlue, 0.5).lerp(_white, 0.22);
  } else if (lum < 0.38) {
    _liftColor.lerp(_white, 0.28);
  } else if (lum < 0.55) {
    _liftColor.lerp(_white, 0.12);
  }

  m.color.copy(_liftColor);

  if (m.emissive) {
    m.emissive.copy(m.color).multiplyScalar(lum < 0.25 ? 0.1 : 0.05);
    m.emissiveIntensity = Math.max(m.emissiveIntensity ?? 0, lum < 0.25 ? 0.14 : 0.08);
  }

  if (typeof m.metalness === 'number' && lum < 0.35) {
    m.metalness = Math.min(m.metalness, 0.22);
  }
  if (typeof m.roughness === 'number') {
    m.roughness = Math.min(0.82, m.roughness + 0.06);
  }
  if (typeof m.envMapIntensity === 'number') {
    m.envMapIntensity = Math.max(m.envMapIntensity, 1.15);
  }

  m.needsUpdate = true;
  return m;
}

function countMeshes(root) {
  let count = 0;
  root.traverse((node) => {
    if (node.isMesh) count += 1;
  });
  return count;
}

function isGeometryValid(geometry) {
  if (!geometry || !geometry.attributes?.position) return false;
  const position = geometry.attributes.position;
  if (position.count === 0) return false;

  const posArray = position.array;
  for (let i = 0, len = posArray.length; i < len; i += 1) {
    if (!Number.isFinite(posArray[i])) return false;
  }
  return true;
}

function repairGeometryAttributes(geometry) {
  if (!isGeometryValid(geometry)) return false;

  const vertexCount = geometry.attributes.position.count;
  for (const key of ['normal', 'uv', 'color', 'tangent']) {
    const attr = geometry.attributes[key];
    if (attr && attr.count !== vertexCount) {
      geometry.deleteAttribute(key);
    }
  }

  if (!geometry.attributes.normal) {
    geometry.computeVertexNormals();
  }

  try {
    geometry.computeBoundingBox();
    geometry.computeBoundingSphere();
  } catch (err) {
    return false;
  }

  if (!geometry.boundingBox || !geometry.boundingSphere) return false;

  const { min, max } = geometry.boundingBox;
  if (!Number.isFinite(min.x) || !Number.isFinite(min.y) || !Number.isFinite(min.z) ||
      !Number.isFinite(max.x) || !Number.isFinite(max.y) || !Number.isFinite(max.z)) {
    return false;
  }

  return true;
}

/** Remove curve lines and fix Blender OBJ groups with mismatched attribute counts. */
function sanitizeBoatRoot(root) {
  const toRemove = [];

  root.traverse((node) => {
    if (node.isLine || node.isLineSegments) {
      toRemove.push(node);
      return;
    }

    if (!node.isMesh || !node.geometry) return;

    const ok = repairGeometryAttributes(node.geometry);
    if (!ok) {
      console.warn('[loadBoatModel] Removing invalid mesh due to bad geometry:', node.name || node.type);
      toRemove.push(node);
    }
  });

  for (const node of toRemove) {
    node.parent?.remove(node);
    if (node.geometry) node.geometry.dispose();
    if (node.material) {
      const mats = Array.isArray(node.material) ? node.material : [node.material];
      mats.forEach((mat) => mat?.dispose?.());
    }
  }

  if (countMeshes(root) === 0) {
    throw new Error('Boat model contains no valid meshes after sanitization');
  }
}

function prepareBoatMeshes(root, { preserveMaterials = false } = {}) {
  const fallbackMat = brightenBoatMaterial(new THREE.MeshStandardMaterial({
    color: 0x3a7ec8,
    roughness: 0.48,
    metalness: 0.1
  }));

  root.traverse((node) => {
    if (!node.isMesh) return;
    node.castShadow = true;
    node.receiveShadow = true;

    if (!preserveMaterials) {
      if (Array.isArray(node.material)) {
        node.material = node.material.map((m) => m || fallbackMat);
      } else if (!node.material) {
        node.material = fallbackMat;
      }
    }

    let mats = Array.isArray(node.material) ? node.material : [node.material];
    mats = mats.map((mat) => brightenBoatMaterial(mat || fallbackMat));
    node.material = Array.isArray(node.material) ? mats : mats[0];

    mats.forEach((mat) => {
      if (!mat) return;
      mat.side = THREE.FrontSide;  // Changed from DoubleSide to FrontSide to prevent rendering issues
      if (mat.map) mat.map.colorSpace = THREE.SRGBColorSpace;
      // Ensure material doesn't have extreme properties that could affect scene rendering
      if (mat.transparent === undefined) mat.transparent = false;
      if (mat.opacity === undefined) mat.opacity = 1.0;
      mat.needsUpdate = true;
    });
  });

  if (countMeshes(root) === 0) {
    throw new Error('Boat model loaded but contains no meshes');
  }
}

function finalizeBoatRoot(root, { preserveMaterials = false } = {}) {
  sanitizeBoatRoot(root);
  prepareBoatMeshes(root, { preserveMaterials });
  
  // Safety check: ensure boat model doesn't contain scene-level objects
  root.traverse((node) => {
    // Remove any fog, lights, or cameras that might be embedded in the model
    if (node.isFog || node.isLight || node.isCamera) {
      console.warn('[loadBoatModel] Removing embedded scene object from boat model:', node.type);
      node.parent?.remove(node);
    }
    // Remove any meshes with names suggesting they are environment objects
    if (node.isMesh && (node.name.toLowerCase().includes('sky') || 
                        node.name.toLowerCase().includes('ocean') || 
                        node.name.toLowerCase().includes('water') ||
                        node.name.toLowerCase().includes('background'))) {
      console.warn('[loadBoatModel] Removing environment mesh from boat model:', node.name);
      node.parent?.remove(node);
    }
  });
  
  return root;
}

function loadGltf(path) {
  return new Promise((resolve, reject) => {
    gltfLoader.load(
      path,
      (gltf) => {
        console.log('[loadBoatModel] Loaded GLTF from:', path);
        console.log('[loadBoatModel] Scene object:', gltf.scene);
        console.log('[loadBoatModel] Scene children count:', gltf.scene.children.length);
        
        // Log all top-level objects in the GLB
        gltf.scene.traverse((node) => {
          if (node.isMesh) {
            console.log('[loadBoatModel] Mesh:', node.name, 'Material:', node.material?.type);
            if (node.material) {
              console.log('  - color:', node.material.color?.getHexString?.());
              console.log('  - transparent:', node.material.transparent);
              console.log('  - opacity:', node.material.opacity);
            }
          }
        });
        
        resolve(finalizeBoatRoot(gltf.scene));
      },
      undefined,
      reject
    );
  });
}

function loadObj(path) {
  const resourcePath = getResourcePath(path);
  const objFile = getFileName(path);
  const mtlFile = objFile.replace(/\.obj$/i, '.mtl');

  mtlLoader.setPath(resourcePath);
  mtlLoader.setResourcePath(resourcePath);
  objLoader.setPath(resourcePath);

  return new Promise((resolve, reject) => {
    mtlLoader.load(
      mtlFile,
      (materials) => {
        materials.preload();
        objLoader.setMaterials(materials);
        objLoader.load(
          objFile,
          (obj) => resolve(finalizeBoatRoot(obj, { preserveMaterials: true })),
          undefined,
          reject
        );
      },
      undefined,
      () => {
        objLoader.load(
          objFile,
          (obj) => resolve(finalizeBoatRoot(obj)),
          undefined,
          reject
        );
      }
    );
  });
}

function loadStl(path) {
  return new Promise((resolve, reject) => {
    stlLoader.load(
      path,
      (geometry) => {
        geometry.computeVertexNormals();
        const mesh = new THREE.Mesh(
          geometry,
          new THREE.MeshStandardMaterial({
            color: 0x1a4f8c,
            roughness: 0.48,
            metalness: 0.12
          })
        );
        const root = new THREE.Group();
        root.name = 'ImportedSTLBoat';
        root.add(mesh);
        resolve(finalizeBoatRoot(root));
      },
      undefined,
      reject
    );
  });
}

/**
 * Load a boat from .gltf, .glb, .obj (+ optional .mtl), or .stl
 * @param {string} path - URL path, e.g. /17-marlow66/Marlow66/Marlow66.obj
 */
export function loadBoatModel(path) {
  const ext = path.split('.').pop()?.toLowerCase();

  switch (ext) {
    case 'gltf':
    case 'glb':
      return loadGltf(path);
    case 'obj':
      return loadObj(path);
    case 'stl':
      return loadStl(path);
    default:
      return Promise.reject(new Error(`Unsupported boat model format: .${ext}`));
  }
}

// Imported models own their geometry, materials and surface textures. The scene's
// environment map is shared with the ocean/terrain and must outlive a boat swap.
export function disposeBoatModel(model) {
  if (!model) return;
  model.removeFromParent();
  const geometries = new Set(), materials = new Set(), textures = new Set();
  model.traverse(object => {
    if (object.geometry) geometries.add(object.geometry);
    for (const material of (Array.isArray(object.material) ? object.material : [object.material])) {
      if (!material) continue;
      materials.add(material);
      for (const [key, value] of Object.entries(material)) {
        if (value?.isTexture && key !== 'envMap') textures.add(value);
      }
    }
  });
  textures.forEach(texture => texture.dispose());
  geometries.forEach(geometry => geometry.dispose());
  materials.forEach(material => material.dispose());
}
