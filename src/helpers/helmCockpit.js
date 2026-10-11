import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { buildHelmInterior } from './helmInterior.js';
import {
  BIG_BOAT_BRIDGE_EYE, BIG_BOAT_BRIDGE_LOOK, BIG_BOAT_BRIDGE_WHEEL,
  buildBigBoatBridgeInterior, buildBigBoatBridgeWheel, prepareBigBoatBridgeWindows, disposeBigBoatBridgeWindows,
  BIG_BOAT_BRIDGE_MODEL, installBigBoatBridgeModel, disposeBridgeModel,
} from './bigBoatBridge.js';

export const SHIP_WHEEL_GLB = '/assets/ship_wheel.glb';

/** High bridge POV — showing bow deck and forward view like realistic fishing vessel */
export const HELM_CAMERA_POS = new THREE.Vector3(-2, 17, 0); // Higher elevated bridge position (medium boat)
export const HELM_CAMERA_LOOK = new THREE.Vector3(40, 10, 0); // Look forward with wide horizon view

/** Small boat POV — sits low in the hull, bow/mast visible ahead (boat pivot = hull center at waterline, bow at +X). */
export const HELM_CAMERA_POS_SMALL = new THREE.Vector3(0.5, 3.5, 0);
export const HELM_CAMERA_LOOK_SMALL = new THREE.Vector3(60, 3.1, 0);

/** Eye inside the big boat's bridge, behind the wheel and windshield. */
export const HELM_CAMERA_POS_LARGE = BIG_BOAT_BRIDGE_EYE;
export const HELM_CAMERA_LOOK_LARGE = BIG_BOAT_BRIDGE_LOOK;

/** Wheel hub — projects into center dashboard cutout (below look ray). */
const HELM_WHEEL_POS = new THREE.Vector3(7.22, 4.42, 0);
const HELM_WHEEL_TILT = 0.12;

const _loader = new GLTFLoader();
const _box = new THREE.Box3();
const _size = new THREE.Vector3();
const _center = new THREE.Vector3();

function fitWheelModel(model, diameter = 0.92) {
  model.rotation.y = Math.PI / 2;
  _box.setFromObject(model);
  _box.getSize(_size);
  const maxDim = Math.max(_size.x, _size.y, _size.z, 0.001);
  model.scale.setScalar(diameter / maxDim);
  _box.setFromObject(model);
  _box.getCenter(_center);
  model.position.sub(_center);
}

/**
 * @returns {{ group: THREE.Group, wheelRotor: THREE.Group, wheelAngle: number, wheelVelocity: number }}
 */
export function createHelmCockpit(boat = null) {
  const largeBridge = (boat?.userData.loaMeters || 0) > 100;
  const group = new THREE.Group();
  group.name = 'HelmCockpit';
  group.userData.largeBridge = largeBridge;

  const mount = new THREE.Group();
  mount.name = 'WheelMount';
  mount.position.copy(largeBridge ? BIG_BOAT_BRIDGE_WHEEL : HELM_WHEEL_POS);
  mount.rotation.set(0, Math.PI, HELM_WHEEL_TILT);

  const rotor = new THREE.Group();
  rotor.name = 'WheelRotor';
  mount.add(rotor);

  group.add(mount);
  group.add(largeBridge ? buildBigBoatBridgeInterior() : buildHelmInterior());
  group.visible = false;
  group.traverse((obj) => {
    if (obj.isMesh) {
      obj.renderOrder = 20;
      obj.castShadow = true;
    }
  });

  if (largeBridge) rotor.add(buildBigBoatBridgeWheel());
  else loadShipWheelGLB(rotor, 0.92);

  const cockpit = {
    group,
    wheelRotor: rotor,
    wheelAngle: 0,
    wheelVelocity: 0,
    bridgeWindows: largeBridge ? prepareBigBoatBridgeWindows(boat) : []
  };
  if (largeBridge && typeof document !== 'undefined') {
    _loader.load(BIG_BOAT_BRIDGE_MODEL, gltf => installBigBoatBridgeModel(cockpit, gltf.scene), undefined,
      error => console.warn('[HelmQuest] bridge model failed:', error));
  }
  return cockpit;
}

function loadShipWheelGLB(rotor, diameter) {
  _loader.load(
    SHIP_WHEEL_GLB,
    (gltf) => {
      if (!rotor.parent || rotor.userData.disposed) return;
      const model = gltf.scene;
      model.name = 'WheelMesh';
      fitWheelModel(model, diameter);
      rotor.add(model);
    },
    undefined,
    (err) => console.warn('[HelmQuest] ship_wheel.glb failed:', err)
  );
}

/**
 * @param {{ wheelRotor: THREE.Group, wheelAngle: number, wheelVelocity: number }} cockpit
 * @param {number} speedRot
 * @param {number} delta
 * @param {{ KeyA?: boolean, KeyD?: boolean }} keyStates
 */
export function updateHelmCockpit(cockpit, speedRot, delta, keyStates = {}) {
  if (!cockpit?.wheelRotor) return;

  const steerInput = (keyStates.KeyA ? 1 : 0) + (keyStates.KeyD ? -1 : 0);
  const targetVelocity = steerInput * 3.4 + speedRot * 48;

  cockpit.wheelVelocity = THREE.MathUtils.lerp(
    cockpit.wheelVelocity,
    targetVelocity,
    1 - Math.pow(0.03, delta * 60)
  );

  if (steerInput === 0 && Math.abs(speedRot) < 0.0003) {
    cockpit.wheelVelocity = THREE.MathUtils.lerp(cockpit.wheelVelocity, 0, 0.12);
  }

  cockpit.wheelAngle += cockpit.wheelVelocity * delta;
  const maxDeflection = THREE.MathUtils.degToRad(540);
  cockpit.wheelAngle = THREE.MathUtils.clamp(cockpit.wheelAngle, -maxDeflection, maxDeflection);
  cockpit.wheelRotor.rotation.x = cockpit.wheelAngle;
}

export function disposeHelmCockpit(cockpit) {
  if (!cockpit?.group) return;
  cockpit.wheelRotor.userData.disposed = true;
  disposeBigBoatBridgeWindows(cockpit.bridgeWindows);
  cockpit.group.removeFromParent();
  disposeBridgeModel(cockpit.group);
}

export { syncHelmInteriorVisibility as syncHelmBoatMeshVisibility } from './helmInterior.js';
