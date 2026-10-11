import * as THREE from 'three';

export const CHASE_CAM_BEHIND_LOA = 0.9;
export const CHASE_CAM_LOOK_AHEAD_LOA = 0.38;
/** Camera height as fraction of LOA — raised for a view above the hull. */
export const CHASE_CAM_HEIGHT_LOA = 0.48;

/** Large commercial trawler LOA (~289 ft). */
export const BOAT_LOA_METERS = 88;
const DEFAULT_LOA = BOAT_LOA_METERS;

/** Per-model target lengths in metres. */
const MODEL_TARGET_LENGTHS = {
  'trawler': 60,    // medium trawler - reduced size
  'SmallBoat': 18,  // small nimble boat (outrigger style)
  'BigBoat': 180,   // LARGE cargo/passenger vessel (3x the medium!)
};

/** Extra Y rotation (rad) after auto-align — trawler GLB is Z-forward in most DCC exports. */
const MODEL_YAW_CORRECTION = {
  trawler: Math.PI,
  SmallBoat: 0,
  BigBoat: 0,
};

const _box = new THREE.Box3();
const _size = new THREE.Vector3();
const _center = new THREE.Vector3();
const _vertex = new THREE.Vector3();

/**
 * @param {string | null} modelPath
 * @returns {number}
 */
export function resolveTargetBoatLength(modelPath) {
  if (!modelPath) return DEFAULT_LOA;
  const key = Object.keys(MODEL_TARGET_LENGTHS).find((k) =>
    modelPath.includes(k)
  );
  return key ? MODEL_TARGET_LENGTHS[key] : DEFAULT_LOA;
}

function modelYawCorrection(modelPath) {
  if (!modelPath) return 0;
  const key = Object.keys(MODEL_YAW_CORRECTION).find((k) =>
    modelPath.toLowerCase().includes(k)
  );
  return key ? MODEL_YAW_CORRECTION[key] : 0;
}

/**
 * Rotate so hull length lies on +X (game forward). Most GLBs are longer on Z.
 * @param {THREE.Object3D} root
 */
function alignLengthToPositiveX(root) {
  root.rotation.set(0, 0, 0);
  root.updateMatrixWorld(true);
  _box.setFromObject(root);
  _box.getSize(_size);

  if (_size.z > _size.x * 1.08) {
    root.rotation.y = -Math.PI / 2;
  } else if (_size.x > _size.z * 1.08) {
    root.rotation.y = 0;
  } else if (_size.z >= _size.x) {
    root.rotation.y = -Math.PI / 2;
  }

  root.updateMatrixWorld(true);
}

/**
 * Bow should be the narrower end along +X; flip 180° if geometry suggests otherwise.
 * @param {THREE.Object3D} root
 */
function alignBowToPositiveX(root) {
  _box.setFromObject(root);
  const length = _box.max.x - _box.min.x;
  if (length < 0.001) return;

  const bowMinX = _box.max.x - length * 0.34;
  const sternMaxX = _box.min.x + length * 0.34;
  let bowSpread = 0;
  let bowCount = 0;
  let sternSpread = 0;
  let sternCount = 0;

  root.updateMatrixWorld(true);
  root.traverse((node) => {
    if (!node.isMesh?.geometry?.attributes?.position) return;
    const attr = node.geometry.attributes.position;
    const step = Math.max(1, Math.floor(attr.count / 700));

    for (let i = 0; i < attr.count; i += step) {
      _vertex.fromBufferAttribute(attr, i);
      _vertex.applyMatrix4(node.matrixWorld);
      root.worldToLocal(_vertex);

      const beam = Math.hypot(_vertex.y, _vertex.z);
      if (_vertex.x >= bowMinX) {
        bowSpread += beam;
        bowCount += 1;
      } else if (_vertex.x <= sternMaxX) {
        sternSpread += beam;
        sternCount += 1;
      }
    }
  });

  if (!bowCount || !sternCount) return;

  const bowAvg = bowSpread / bowCount;
  const sternAvg = sternSpread / sternCount;
  if (bowAvg > sternAvg * 1.06) {
    root.rotation.y += Math.PI;
  }
}

/**
 * Scale boat to target LOA (bow +X), pivot at hull center on waterline.
 * @param {THREE.Object3D} meshRoot
 * @param {{ targetLength: number, targetWaterlineY: number, spawnX: number, spawnZ: number, waterlineOffset?: number, modelPath?: string | null }} opts
 */
export function normalizeBoatToScene(meshRoot, opts) {
  const {
    targetLength,
    targetWaterlineY,
    spawnX,
    spawnZ,
    waterlineOffset = 0,
    modelPath = null
  } = opts;

  const pivot = new THREE.Group();
  pivot.name = 'BoatPivot';

  meshRoot.position.set(0, 0, 0);
  meshRoot.rotation.set(0, 0, 0);
  meshRoot.scale.set(1, 1, 1);
  pivot.add(meshRoot);

  alignLengthToPositiveX(meshRoot);
  alignBowToPositiveX(meshRoot);
  meshRoot.rotation.y += modelYawCorrection(modelPath);
  meshRoot.updateMatrixWorld(true);

  _box.setFromObject(meshRoot);
  if (_box.isEmpty() || !_box.min.toArray().every(Number.isFinite) || !_box.max.toArray().every(Number.isFinite)) {
    throw new Error('Boat model has invalid or non-finite bounds');
  }
  _box.getSize(_size);
  const currentLength = Math.max(_size.x, _size.y, _size.z, 0.001);
  if (!Number.isFinite(currentLength)) {
    throw new Error('Boat model has an invalid length');
  }
  meshRoot.scale.setScalar(targetLength / currentLength);
  meshRoot.updateMatrixWorld(true);

  _box.setFromObject(meshRoot);
  if (_box.isEmpty() || !_box.min.toArray().every(Number.isFinite) || !_box.max.toArray().every(Number.isFinite)) {
    throw new Error('Boat model bounds became non-finite during normalization');
  }
  _box.getCenter(_center);
  _box.getSize(_size);
  pivot.userData.beamMeters = _size.z;
  meshRoot.position.set(-_center.x, -_box.min.y, -_center.z);

  const waterlineY = targetWaterlineY + waterlineOffset;
  if (![targetLength, targetWaterlineY, waterlineOffset, spawnX, spawnZ, waterlineY].every(Number.isFinite)) {
    throw new Error('Boat spawn contains a non-finite value');
  }
  pivot.position.set(spawnX, waterlineY, spawnZ);

  return { boat: pivot, waterlineY, lengthMeters: targetLength };
}
