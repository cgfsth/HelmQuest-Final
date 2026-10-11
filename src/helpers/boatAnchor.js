import * as THREE from 'three';

// GLTFLoader replaces spaces with underscores and strips dots from duplicate
// suffixes (the shipped medium vessel uses main_body_anchor002, for example).
const ANCHOR_BODY_PATTERN = /^main[ _]body[ _]anchor(?:\.?\d+)?$/i;
const CHAIN_PATTERN = /^anchor[ _]chain(?:\.?\d+)?$/i;
const WINDLASS_PATTERN = /^enroul[ _]ancre(?:\.?\d+)?$/i;
const CHAIN_PULLEY_PATTERN = /^chaine_poulie(?:\.?\d+)?$/i;

/**
 * @param {THREE.Object3D} root
 * @param {RegExp} pattern
 * @returns {THREE.Object3D | null}
 */
function findNamedNode(root, pattern) {
  let match = null;
  root.traverse((node) => {
    if (match || !node.name) return;
    if (pattern.test(node.name)) match = node;
  });
  return match;
}

/**
 * @param {THREE.Object3D} node
 */
function captureTransform(node) {
  return {
    position: node.position.clone(),
    rotation: node.rotation.clone(),
    scale: node.scale.clone()
  };
}

/**
 * @param {THREE.Object3D} node
 * @param {{ position: THREE.Vector3, rotation: THREE.Euler, scale: THREE.Vector3 }} transform
 */
function applyTransform(node, transform) {
  node.position.copy(transform.position);
  node.rotation.copy(transform.rotation);
  node.scale.copy(transform.scale);
}

/**
 * @param {THREE.Object3D} boatRoot
 */
export function setupBoatAnchorRig(boatRoot) {
  const anchorBody = findNamedNode(boatRoot, ANCHOR_BODY_PATTERN);
  if (!anchorBody) return null;

  const chain = findNamedNode(boatRoot, CHAIN_PATTERN);
  const windlass = findNamedNode(boatRoot, WINDLASS_PATTERN);
  const chainPulley = findNamedNode(boatRoot, CHAIN_PULLEY_PATTERN);

  const stowedBody = captureTransform(anchorBody);
  const stowedChain = chain ? captureTransform(chain) : null;
  const stowedWindlass = windlass ? captureTransform(windlass) : null;

  return {
    anchorBody,
    chain,
    windlass,
    chainPulley,
    stowedBody,
    stowedChain,
    stowedWindlass,
    progress: 0,
    state: 'stowed',
    duration: 2.4
  };
}

/**
 * @param {ReturnType<typeof setupBoatAnchorRig>} rig
 * @param {number} t 0 = stowed on bow, 1 = set in water
 */
export function applyAnchorPose(rig, t) {
  if (!rig?.anchorBody) return;

  const eased = THREE.MathUtils.smoothstep(t, 0, 1);
  const body = rig.anchorBody;

  applyTransform(body, rig.stowedBody);
  body.rotation.x += THREE.MathUtils.degToRad(78) * eased;
  body.rotation.z -= THREE.MathUtils.degToRad(12) * eased;
  body.position.y -= 2.8 * eased;
  body.position.z += 1.6 * eased;

  if (rig.chain && rig.stowedChain) {
    applyTransform(rig.chain, rig.stowedChain);
    rig.chain.position.y -= 3.4 * eased;
    rig.chain.scale.y = rig.stowedChain.scale.y * (1 + 0.85 * eased);
  }

  if (rig.windlass && rig.stowedWindlass) {
    applyTransform(rig.windlass, rig.stowedWindlass);
    rig.windlass.rotation.x -= THREE.MathUtils.degToRad(540) * eased;
  }

  if (rig.chainPulley) {
    rig.chainPulley.rotation.x = -THREE.MathUtils.degToRad(180) * eased;
  }
}

/**
 * @param {ReturnType<typeof setupBoatAnchorRig>} rig
 */
export function beginAnchorDeploy(rig) {
  if (!rig || rig.state === 'deploying' || rig.state === 'deployed') return false;
  rig.state = 'deploying';
  return true;
}

/**
 * @param {ReturnType<typeof setupBoatAnchorRig>} rig
 */
export function beginAnchorRetract(rig) {
  if (!rig || rig.state === 'retracting' || rig.state === 'stowed') return false;
  rig.state = 'retracting';
  return true;
}

/**
 * @param {ReturnType<typeof setupBoatAnchorRig>} rig
 * @param {number} delta
 * @returns {'deployed' | 'stowed' | null}
 */
export function updateBoatAnchorRig(rig, delta) {
  if (!rig) return null;

  if (rig.state === 'deploying') {
    rig.progress = Math.min(1, rig.progress + delta / rig.duration);
    applyAnchorPose(rig, rig.progress);
    if (rig.progress >= 1) {
      rig.state = 'deployed';
      return 'deployed';
    }
    return null;
  }

  if (rig.state === 'retracting') {
    rig.progress = Math.max(0, rig.progress - delta / rig.duration);
    applyAnchorPose(rig, rig.progress);
    if (rig.progress <= 0) {
      rig.state = 'stowed';
      return 'stowed';
    }
    return null;
  }

  if (rig.state === 'deployed') {
    applyAnchorPose(rig, 1);
  } else {
    applyAnchorPose(rig, 0);
  }

  return null;
}

/**
 * @param {ReturnType<typeof setupBoatAnchorRig>} rig
 */
export function resetBoatAnchorRig(rig) {
  if (!rig) return;
  rig.progress = 0;
  rig.state = 'stowed';
  applyAnchorPose(rig, 0);
}

export function isAnchorRigEngaged(rig) {
  if (!rig) return false;
  return rig.state !== 'stowed' || rig.progress > 0.001;
}

export function isAnchorFullyDeployed(rig) {
  return rig?.state === 'deployed' && rig.progress >= 0.999;
}
