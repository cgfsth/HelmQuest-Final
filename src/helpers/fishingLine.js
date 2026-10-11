import * as THREE from 'three';
import { getFishingSpotAt, isInFishingSpot } from './fishingSpots.js';
import { FISH_DATA } from './fishData.js';
import { createDriftNetVisual, createFishingTowRope, getFishingNetDimensions, updateFishingTowRope } from './fishingNetVisuals.js';

export const FishingState = {
  IDLE: 0,
  DEPLOYING: 1,
  FISHING: 2,
  RETRIEVING: 3,
};

const DEPLOY_DURATION = 1.4;
const RETRIEVE_DURATION = 1.0;
const CATCH_INTERVAL_S = 5; // faster spawn for demo
const CATCH_CHANCE = 0.3;

const _forward = new THREE.Vector3();
const _right = new THREE.Vector3();
const _aft = new THREE.Vector3();
const _up = new THREE.Vector3(0, 1, 0);
const _stern = new THREE.Vector3();
const _center = new THREE.Vector3();
const _corner = new THREE.Vector3();
const _target = new THREE.Vector3();
const _basis = new THREE.Matrix4();
const _waterPoint = new THREE.Vector3();

/**
 * Deploy / retrieve a drift net astern — hangs in the water column, float line on the surface.
 */
export function createFishingLineSystem(scene, options = {}) {
  const {
    getBoat,
    getWaterSurfaceY = () => 0,
    onFishCaught,
    onStateChange,
    onDeployBlocked,
    onLeaveFishingSpot,
  } = options;

  let fishingState = FishingState.IDLE;
  let lastCaughtFish = null; // stores the most recent fish caught
  let fishTimer = 0;
  let deployProgress = 0;
  let inventory = { fish: 0 };
  let sessionCatch = []; // array to store caught fish during a deployment
  const group = new THREE.Group();
  group.name = 'FishingNetRig';
  group.frustumCulled = false;
  scene.add(group);

  const visual = createDriftNetVisual();
  const net = visual.rig;
  net.visible = false;
  group.add(net);

  const towPort = createFishingTowRope();
  const towStarboard = createFishingTowRope();
  towPort.visible = false;
  towStarboard.visible = false;
  group.add(towPort, towStarboard);

  const splashPool = [];
  const splashGeo = new THREE.PlaneGeometry(1.6, 1.6);
  for (let i = 0; i < 24; i++) {
    const mat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.65,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const drop = new THREE.Mesh(splashGeo, mat);
    drop.rotation.x = -Math.PI / 2;
    drop.visible = false;
    drop.renderOrder = 16;
    group.add(drop);
    splashPool.push({ mesh: drop, life: 0, vx: 0, vz: 0 });
  }

  function setState(next) {
    fishingState = next;
    onStateChange?.(fishingState);
  }

  const getNetMetrics = getFishingNetDimensions;

  function getBoatForward(boat) {
    _forward.set(1, 0, 0).applyQuaternion(boat.quaternion);
    _forward.y = 0;
    _forward.normalize();
    return _forward;
  }

  function getBoatRight(boat) {
    getBoatForward(boat);
    _right.crossVectors(_forward, _up);
    _right.normalize();
    return _right;
  }

  function getSternPoint(boat, out) {
    const { sternBack, loa } = getNetMetrics(boat);
    getBoatForward(boat);
    out.copy(boat.position);
    out.addScaledVector(_forward, -sternBack);
    out.y = getWaterSurfaceY(out.x, out.z) + THREE.MathUtils.clamp(loa * .018, .3, 2.5);
    return out;
  }

  /** Net center XZ astern of the boat (water surface). */
  function getNetCenterXZ(boat, out) {
    const { behind } = getNetMetrics(boat);
    getBoatForward(boat);
    out.set(
      boat.position.x - _forward.x * behind,
      0,
      boat.position.z - _forward.z * behind
    );
    return out;
  }

  /**
   * Local X spans the beam, negative Y hangs underwater, and positive Z trails astern.
   * Chase camera behind the boat sees the net face-on, not edge-on.
   */
  function orientNet(boat) {
    getBoatForward(boat);
    getBoatRight(boat);
    _aft.copy(_forward).negate();
    _basis.makeBasis(_right, _up, _aft);
    net.quaternion.setFromRotationMatrix(_basis);
  }

  function updateTowRopes(boat) {
    if (!net.visible) return;
    const { loa } = getNetMetrics(boat);
    const beam = boat.userData?.beamMeters;
    const attachmentOffset = Number.isFinite(beam) && beam > 0 ? Math.min(beam * .25, loa * .1) : loa * .07;
    getBoatRight(boat);
    net.updateMatrixWorld(true);
    for (const [rope, corner, side] of [[towPort, visual.portCorner, -1], [towStarboard, visual.starboardCorner, 1]]) {
      getSternPoint(boat, _stern);
      _stern.addScaledVector(_right, attachmentOffset * side);
      _corner.copy(corner);
      net.localToWorld(_corner);
      updateFishingTowRope(rope, _stern, _corner, Math.min(loa * .015, .6));
    }
  }

  function spawnSplash(cx, cz, boat) {
    const { width } = getNetMetrics(boat);
    const baseY = getWaterSurfaceY(cx, cz) + 0.25;
    for (let i = 0; i < splashPool.length; i++) {
      const p = splashPool[i];
      const angle = (i / splashPool.length) * Math.PI * 2 + Math.random() * 0.5;
      const radius = (Math.random() * 0.5 + 0.2) * width * 0.4;
      const speed = 1.5 + Math.random() * 3;
      p.mesh.position.set(cx + Math.cos(angle) * radius, baseY, cz + Math.sin(angle) * radius);
      p.mesh.scale.setScalar(0.7 + Math.random() * 1.4);
      p.mesh.material.opacity = 0.75;
      p.mesh.visible = true;
      p.life = 0;
      p.vx = Math.cos(angle) * speed;
      p.vz = Math.sin(angle) * speed;
    }
  }

  function updateSplash(dt) {
    for (const p of splashPool) {
      if (!p.mesh.visible) continue;
      p.life += dt;
      p.mesh.position.x += p.vx * dt;
      p.mesh.position.z += p.vz * dt;
      p.mesh.material.opacity -= dt * 0.95;
      p.mesh.scale.multiplyScalar(1 + dt * 1.8);
      if (p.life > 0.65 || p.mesh.material.opacity <= 0) p.mesh.visible = false;
    }
  }

  function placeNet(boat, centerXZ, widthScale, waterY, bob, elapsed) {
    const visible = widthScale > 0.04;
    net.visible = visible;
    towPort.visible = visible;
    towStarboard.visible = visible;

    net.position.set(centerXZ.x, waterY + bob, centerXZ.z);
    orientNet(boat);
    net.updateMatrixWorld(true);
    visual.update(getNetMetrics(boat), widthScale, elapsed, (x, z) => {
      _waterPoint.set(x, 0, z);
      net.localToWorld(_waterPoint);
      return getWaterSurfaceY(_waterPoint.x, _waterPoint.z) - net.position.y;
    });
  }

  function canFishHere(boat) {
    return isInFishingSpot(boat.position.x, boat.position.z);
  }

  function deployFishingGear() {
    const boat = getBoat();
    if (!boat || fishingState !== FishingState.IDLE) return false;

    if (!canFishHere(boat)) {
      onDeployBlocked?.();
      return false;
    }

    setState(FishingState.DEPLOYING);
    deployProgress = 0;
    fishTimer = 0;
    // Reset session catch for new deployment
    sessionCatch = [];

    getNetCenterXZ(boat, _center);
    spawnSplash(_center.x, _center.z, boat);
    return true;
  }

  function retrieveFishingGear() {
    if (fishingState !== FishingState.FISHING && fishingState !== FishingState.DEPLOYING) {
      return false;
    }
    setState(FishingState.RETRIEVING);
    deployProgress = 0;
    fishTimer = 0;
    return true;
  }

  function toggleFishingGear() {
    if (fishingState === FishingState.IDLE) return deployFishingGear();
    if (fishingState === FishingState.FISHING || fishingState === FishingState.DEPLOYING) {
      return retrieveFishingGear();
    }
    return false;
  }

  function finishRetrieve() {
    net.visible = false;
    towPort.visible = false;
    towStarboard.visible = false;
    setState(FishingState.IDLE);
  }

  function update(dt, elapsed) {
    const boat = getBoat();
    if (!boat) return;

    updateSplash(dt);
    if (fishingState === FishingState.IDLE) return;

    getNetCenterXZ(boat, _target);
    const waterY = getWaterSurfaceY(_target.x, _target.z);
    const bob = Math.sin(elapsed * 2.4) * 0.18;

    if (
      (fishingState === FishingState.DEPLOYING || fishingState === FishingState.FISHING) &&
      !canFishHere(boat)
    ) {
      if (fishingState === FishingState.FISHING) onLeaveFishingSpot?.();
      retrieveFishingGear();
    }

    if (fishingState === FishingState.DEPLOYING) {
      deployProgress += dt / DEPLOY_DURATION;
      const t = THREE.MathUtils.smoothstep(deployProgress, 0, 1);

      // Slide along the water surface astern, then unfurl width
      getSternPoint(boat, _stern);
      _waterPoint.set(_stern.x, 0, _stern.z);
      _center.lerpVectors(_waterPoint, _target, t);
      placeNet(boat, _center, THREE.MathUtils.lerp(0.06, 1, t), waterY, bob, elapsed);

      if (deployProgress >= 1) {
        setState(FishingState.FISHING);
        fishTimer = 0;
      }
    } else if (fishingState === FishingState.FISHING) {
      placeNet(boat, _target, 1, waterY, bob, elapsed);

      fishTimer += dt;
      if (fishTimer >= CATCH_INTERVAL_S) {
        fishTimer = 0;
        if (Math.random() < CATCH_CHANCE) {
          inventory.fish += 1;
          // Randomly select a fish for the popup
          const randomIdx = Math.floor(Math.random() * FISH_DATA.length);
          const caughtFish = FISH_DATA[randomIdx];
          lastCaughtFish = caughtFish;
          // Record caught fish in session array
          sessionCatch.push(caughtFish);
          // Let the app add this catch to the reactive inventory shown in the modal.
          onFishCaught?.(inventory.fish, caughtFish);
        }
      }
    } else if (fishingState === FishingState.RETRIEVING) {
      deployProgress += dt / RETRIEVE_DURATION;
      const t = THREE.MathUtils.smoothstep(deployProgress, 0, 1);

      getSternPoint(boat, _stern);
      _waterPoint.set(_stern.x, 0, _stern.z);
      _center.lerpVectors(_target, _waterPoint, t);
      placeNet(boat, _center, THREE.MathUtils.lerp(1, 0.04, t), waterY, bob * (1 - t), elapsed);

      if (deployProgress >= 1) {
          finishRetrieve();
          // Trigger catch popup after net is retrieved, passing all caught fish
          if (window.triggerCatchPopup && sessionCatch.length > 0) {
            window.triggerCatchPopup({ fishList: sessionCatch, total: inventory.fish });
          }
        }
    }

    updateTowRopes(boat);
  }

  function dispose() {
    scene.remove(group);
    const geometries = new Set();
    const materials = new Set();
    net.traverse((obj) => {
      if (obj.geometry) geometries.add(obj.geometry);
      if (obj.material) {
        if (Array.isArray(obj.material)) obj.material.forEach(m => materials.add(m));
        else materials.add(obj.material);
      }
    });
    geometries.forEach(geometry => geometry.dispose());
    materials.forEach(material => material.dispose());
    towPort.geometry.dispose();
    towPort.material.dispose();
    towStarboard.geometry.dispose();
    towStarboard.material.dispose();
    splashGeo.dispose();
    splashPool.forEach((p) => p.mesh.material.dispose());
  }

  return {
    group,
    net,
    toggleFishingGear,
    deployFishingGear,
    retrieveFishingGear,
    update,
    dispose,
    getState: () => fishingState,
    getInventory: () => inventory,
    getActiveSpot: (boat) => {
      const b = boat ?? getBoat();
      if (!b) return null;
      return getFishingSpotAt(b.position.x, b.position.z);
    },
    FishingState,
  };
}
