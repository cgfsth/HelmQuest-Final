import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

export const SHIP_WHEEL_GLB = '/assets/ship_wheel.glb';

const _loader = new GLTFLoader();
const _box = new THREE.Box3();
const _size = new THREE.Vector3();
const _center = new THREE.Vector3();

const matTeak = new THREE.MeshStandardMaterial({
  color: 0x4a3020,
  roughness: 0.52,
  metalness: 0.06
});
const matBrass = new THREE.MeshStandardMaterial({
  color: 0xd4aa44,
  roughness: 0.22,
  metalness: 0.88,
  emissive: 0x4a3808,
  emissiveIntensity: 0.22
});
const matBrassDark = new THREE.MeshStandardMaterial({
  color: 0x9a7830,
  roughness: 0.3,
  metalness: 0.82
});
const matHub = new THREE.MeshStandardMaterial({
  color: 0x141414,
  roughness: 0.28,
  metalness: 0.72
});

function buildSteeringWheelMesh() {
  const mesh = new THREE.Group();
  mesh.name = 'WheelMesh';

  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.52, 0.055, 32, 96), matTeak);
  mesh.add(ring);

  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const knob = new THREE.Mesh(new THREE.SphereGeometry(0.042, 16, 16), matBrass);
    knob.position.set(Math.cos(a) * 0.52, Math.sin(a) * 0.52, 0.022);
    mesh.add(knob);
  }

  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const spoke = new THREE.Mesh(new THREE.BoxGeometry(0.88, 0.055, 0.048), matBrass);
    spoke.position.set(Math.cos(a) * 0.42, Math.sin(a) * 0.42, 0);
    spoke.rotation.z = a;
    mesh.add(spoke);
  }

  const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.13, 0.07, 24), matHub);
  hub.rotation.x = Math.PI / 2;
  mesh.add(hub);

  const hubRing = new THREE.Mesh(new THREE.TorusGeometry(0.13, 0.016, 12, 48), matBrassDark);
  mesh.add(hubRing);

  return mesh;
}

function stripRailMeshes(root) {
  const toRemove = [];
  root.traverse((obj) => {
    const n = (obj.name || '').toLowerCase();
    if (/rail|stand|pedestal|post|base|column|mount/.test(n) && obj !== root) {
      toRemove.push(obj);
    }
  });
  toRemove.forEach((obj) => {
    if (obj.parent) obj.parent.remove(obj);
  });
}

function fitWheelModel(model) {
  stripRailMeshes(model);

  _box.setFromObject(model);
  _box.getSize(_size);
  const maxDim = Math.max(_size.x, _size.y, _size.z, 0.001);
  model.scale.setScalar(1.15 / maxDim);

  _box.setFromObject(model);
  _box.getCenter(_center);
  model.position.sub(_center);
  model.position.y += 0.04;
}

function attachWheelMesh(viewport, model) {
  const old = viewport.wheelRotor.children.find((c) => c.name === 'WheelMesh');
  if (old) viewport.wheelRotor.remove(old);

  model.name = 'WheelMesh';
  fitWheelModel(model);
  viewport.wheelRotor.add(model);
  viewport.usingGLB = model.userData.fromGLB === true;
}

function loadProceduralFallback(viewport) {
  if (viewport.disposed || viewport.wheelRotor.children.some((c) => c.name === 'WheelMesh')) return;
  const mesh = buildSteeringWheelMesh();
  mesh.userData.fromGLB = false;
  attachWheelMesh(viewport, mesh);
}

function loadShipWheelGLB(viewport) {
  _loader.load(
    SHIP_WHEEL_GLB,
    (gltf) => {
      if (viewport.disposed || !viewport.wheelRotor) return;
      const model = gltf.scene.clone(true);
      model.userData.fromGLB = true;
      attachWheelMesh(viewport, model);
    },
    undefined,
    (err) => {
      console.warn('[HelmQuest] ship_wheel.glb failed, using procedural wheel:', err);
      loadProceduralFallback(viewport);
    }
  );
}

/**
 * @param {HTMLCanvasElement} canvas
 */
export function createHelmWheelViewport(canvas) {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    alpha: true,
    antialias: true,
    powerPreference: 'high-performance'
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;

  const scene = new THREE.Scene();

  const camera = new THREE.PerspectiveCamera(36, 1, 0.05, 10);
  camera.position.set(0, -0.02, 1.22);
  camera.lookAt(0, 0.06, 0);

  scene.add(new THREE.AmbientLight(0xffeedd, 0.55));
  const key = new THREE.DirectionalLight(0xfff4e8, 1.25);
  key.position.set(0.3, 1.1, 1.6);
  scene.add(key);
  const fill = new THREE.DirectionalLight(0x8899bb, 0.45);
  fill.position.set(-1.2, 0.1, 0.9);
  scene.add(fill);
  const rim = new THREE.DirectionalLight(0xffcc88, 0.4);
  rim.position.set(0.5, 0.3, -1.1);
  scene.add(rim);

  const root = new THREE.Group();
  root.rotation.x = -0.06;

  const pivot = new THREE.Group();
  pivot.name = 'WheelRotor';
  root.add(pivot);
  scene.add(root);

  const viewport = {
    renderer,
    scene,
    camera,
    wheelRotor: pivot,
    wheelAngle: 0,
    wheelVelocity: 0,
    usingGLB: false,
    disposed: false
  };

  resizeHelmWheelViewport(viewport, canvas.clientWidth || 180, canvas.clientHeight || 200);
  loadShipWheelGLB(viewport);

  return viewport;
}

export function resizeHelmWheelViewport(viewport, width, height) {
  if (!viewport?.renderer || viewport.disposed) return;
  const w = Math.max(1, Math.floor(width));
  const h = Math.max(1, Math.floor(height));
  viewport.renderer.setSize(w, h, false);
  viewport.camera.aspect = w / h;
  viewport.camera.updateProjectionMatrix();
}

/**
 * @param {ReturnType<typeof createHelmWheelViewport>} viewport
 * @param {number} speedRot
 * @param {number} delta
 * @param {{ KeyA?: boolean, KeyD?: boolean }} keyStates
 */
export function updateHelmWheelViewport(viewport, speedRot, delta, keyStates = {}) {
  if (!viewport?.wheelRotor || viewport.disposed) return;

  const steerInput = (keyStates.KeyA ? 1 : 0) + (keyStates.KeyD ? -1 : 0);
  const boatTurnRate = speedRot * 48;
  const inputRate = steerInput * 3.4;
  const targetVelocity = inputRate + boatTurnRate;

  viewport.wheelVelocity = THREE.MathUtils.lerp(
    viewport.wheelVelocity,
    targetVelocity,
    1 - Math.pow(0.03, delta * 60)
  );

  if (steerInput === 0 && Math.abs(speedRot) < 0.0003) {
    viewport.wheelVelocity = THREE.MathUtils.lerp(viewport.wheelVelocity, 0, 0.12);
  }

  viewport.wheelAngle += viewport.wheelVelocity * delta;
  const maxDeflection = THREE.MathUtils.degToRad(540);
  viewport.wheelAngle = THREE.MathUtils.clamp(viewport.wheelAngle, -maxDeflection, maxDeflection);
  viewport.wheelRotor.rotation.z = viewport.wheelAngle;

  viewport.renderer.render(viewport.scene, viewport.camera);
}

export function disposeHelmWheelViewport(viewport) {
  if (!viewport || viewport.disposed) return;
  viewport.disposed = true;
  viewport.scene.traverse((obj) => {
    if (obj.geometry) obj.geometry.dispose();
    if (obj.material) {
      const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
      mats.forEach((m) => m.dispose?.());
    }
  });
  viewport.renderer.dispose();
}

export { buildSteeringWheelMesh as buildSteeringWheelRotor };
