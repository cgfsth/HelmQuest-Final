import { Engine } from '@babylonjs/core/Engines/engine.js';
import { Scene } from '@babylonjs/core/scene.js';
import { Vector2, Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import { Color3, Color4 } from '@babylonjs/core/Maths/math.color.js';
import { FreeCamera } from '@babylonjs/core/Cameras/freeCamera.js';
import { HemisphericLight } from '@babylonjs/core/Lights/hemisphericLight.js';
import { DirectionalLight } from '@babylonjs/core/Lights/directionalLight.js';
import { Mesh } from '@babylonjs/core/Meshes/mesh.js';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder.js';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode.js';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial.js';
import { Texture } from '@babylonjs/core/Materials/Textures/texture.js';
import { VertexBuffer } from '@babylonjs/core/Buffers/buffer.js';
import { ShadowGenerator } from '@babylonjs/core/Lights/Shadows/shadowGenerator.js';
import { ImportMeshAsync } from '@babylonjs/core/Loading/sceneLoader.js';
import '@babylonjs/loaders/glTF';
// Eager local registration avoids the PBR fallback requesting a .fx URL that
// an SPA host can answer with index.html while modular GLTF imports initialize.
import '@babylonjs/core/Shaders/pbr.vertex.js';
import '@babylonjs/core/Shaders/pbr.fragment.js';
import { WaterMaterial } from '@babylonjs/materials/water';
import { SkyMaterial } from '@babylonjs/materials/sky';
import { MeshoptCompression } from '@babylonjs/core/Meshes/Compression/meshoptCompression';
import { MeshoptDecoder } from 'meshoptimizer/decoder';
import { PROTOTYPE_ASSETS } from '../prototypeState.js';
import { oceanWaveState, sampleOceanHeight } from '../../helpers/oceanWaves.js';

globalThis.MeshoptDecoder = MeshoptDecoder;
MeshoptCompression.Configuration = { decoder: { url: new URL('../meshopt-ready.js', import.meta.url).href } };
function bounds(meshes) {
  let min = new Vector3(Infinity, Infinity, Infinity), max = new Vector3(-Infinity, -Infinity, -Infinity);
  for (const mesh of meshes.filter(m => m.getTotalVertices() > 0)) { mesh.computeWorldMatrix(true); const b = mesh.getBoundingInfo().boundingBox; min = Vector3.Minimize(min, b.minimumWorld); max = Vector3.Maximize(max, b.maximumWorld); }
  return { min, max, size: max.subtract(min), center: min.add(max).scale(.5) };
}
export async function createRenderer({ canvas, preset, metrics, onProgress }) {
  const engine = new Engine(canvas, true, { preserveDrawingBuffer: true, stencil: true, adaptToDeviceRatio: false });
  engine.setHardwareScalingLevel(1 / Math.min(devicePixelRatio || 1, preset.ratio)); engine.resize();
  const scene = new Scene(engine); scene.useRightHandedSystem = true;
  scene.clearColor = new Color4(.46, .7, .83, 1); scene.fogMode = Scene.FOGMODE_EXP2; scene.fogDensity = .0004; scene.fogColor = new Color3(.46, .7, .83);
  const camera = new FreeCamera('chase-and-bridge', new Vector3(-118, 18, 60), scene); camera.fov = Math.PI / 3; camera.minZ = .1; camera.maxZ = 15000; scene.activeCamera = camera;
  const ambient = new HemisphericLight('sky-light', new Vector3(0, 1, 0), scene); ambient.intensity = .8; ambient.groundColor = new Color3(.09, .17, .2);
  const sun = new DirectionalLight('sun', new Vector3(-.5, -1, .4), scene); sun.position = new Vector3(80, 220, -120); sun.intensity = 2;
  const shadows = preset.shadow ? new ShadowGenerator(preset.shadow, sun) : null;
  if (shadows) { shadows.useBlurExponentialShadowMap = true; shadows.blurKernel = 8; }
  const sky = MeshBuilder.CreateSphere('sky', { diameter: 10000, segments: 16, sideOrientation: Mesh.BACKSIDE }, scene);
  const skyMaterial = new SkyMaterial('atmosphere', scene); skyMaterial.backFaceCulling = false; skyMaterial.useSunPosition = true; skyMaterial.sunPosition = new Vector3(80, 220, -120); skyMaterial.turbidity = 6; sky.material = skyMaterial; sky.isPickable = false;
  const far = MeshBuilder.CreateGround('distant-ocean', { width: 40000, height: 40000 }, scene); far.position.y = -2;
  const farMaterial = new StandardMaterial('distant-water', scene); farMaterial.diffuseColor = new Color3(.015, .19, .25); farMaterial.specularColor = new Color3(.2, .35, .4); far.material = farMaterial;
  const water = MeshBuilder.CreateGround('animated-ocean', { width: 1200, height: 1200, subdivisions: preset.segments, updatable: true }, scene);
  const waterMaterial = new WaterMaterial('ocean-reflections', scene, new Vector2(preset.reflection, preset.reflection));
  waterMaterial.bumpTexture = new Texture('/helpers/waternormals.jpg', scene); waterMaterial.windForce = 3; waterMaterial.waveHeight = 0; waterMaterial.bumpHeight = .15;
  waterMaterial.waterColor = new Color3(.015, .22, .31); waterMaterial.colorBlendFactor = .3; waterMaterial.addToRenderList(sky); water.material = waterMaterial; water.alwaysSelectAsActiveMesh = true;
  const waterPositions = water.getVerticesData(VertexBuffer.PositionKind), markers = [];
  async function asset(name, url, length, location) {
    const at = performance.now(); onProgress(`Loading ${name}…`);
    const result = await ImportMeshAsync(url, scene, { onProgress: progress => onProgress(`Loading ${name}: ${(progress.loaded / 1048576).toFixed(1)} MB`) });
    const root = new TransformNode(`${name}-normalized`, scene);
    const imported = new Set([...result.meshes, ...(result.transformNodes || [])]);
    for (const node of imported) if (!node.parent || !imported.has(node.parent)) node.parent = root;
    let box = bounds(result.meshes);
    if (name === 'vessel' && box.size.z > box.size.x) root.rotation.y = -Math.PI / 2;
    box = bounds(result.meshes); const scale = length / Math.max(box.size.x, box.size.z); root.scaling.setAll(scale);
    box = bounds(result.meshes); root.position.set(location.x - box.center.x, -box.min.y - (name === 'vessel' ? .35 : 2), location.z - box.center.z);
    box = bounds(result.meshes); result.meshes.forEach(mesh => { mesh.receiveShadows = true; shadows?.addShadowCaster(mesh); if (mesh.getTotalVertices()) waterMaterial.addToRenderList(mesh); });
    metrics.assets[name] = { url, loadMs: performance.now() - at, meshes: result.meshes.filter(m => m.getTotalVertices()).length, materials: new Set(result.meshes.map(m => m.material).filter(Boolean)).size, animationGroups: result.animationGroups.length,
      bounds: { x: box.size.x, y: box.size.y, z: box.size.z } };
    const display = new TransformNode(`${name}-world`, scene); display.position.set(location.x, 0, location.z); root.position.x -= location.x; root.position.z -= location.z; root.parent = display;
    return { root: display, offsetY: 0, box };
  }
  let vessel, harbor;
  try {
    [vessel, harbor] = await Promise.all([asset('vessel', PROTOTYPE_ASSETS.vessel, 18, { x: -90, z: 60 }), asset('harbor', PROTOTYPE_ASSETS.harbor, 320, { x: 80, z: -180 })]);
    await Promise.all(scene.meshes.filter(mesh => mesh.getTotalVertices() && mesh.material).map(mesh => mesh.material.forceCompilationAsync(mesh)));
  }
  catch (error) { scene.dispose(); engine.dispose(); throw error; }
  let lastWater = -1, night = false, last = performance.now();
  const collision = (x, z) => x > harbor.box.min.x - 9 && x < harbor.box.max.x + 9 && z > harbor.box.min.z - 3 && z < harbor.box.max.z + 3;
  return { collision,
    health() { return { ready: scene.meshes.filter(mesh => mesh.getTotalVertices()).every(mesh => mesh.isReady(true)), shaderErrors: scene.meshes.flatMap(mesh => mesh.subMeshes || []).map(sub => sub.effect?.getCompilationError()).filter(Boolean) }; },
    lighting(value) { night = value === 'night'; sun.intensity = night ? .07 : 2; ambient.intensity = night ? .18 : .8; skyMaterial.luminance = night ? .08 : 1; scene.fogColor = night ? new Color3(.025, .05, .09) : new Color3(.46, .7, .83); scene.clearColor = new Color4(scene.fogColor.r, scene.fogColor.g, scene.fogColor.b, 1); },
    resize() { engine.resize(); },
    setResolution(ratio) { engine.setHardwareScalingLevel(1 / ratio); engine.resize(); },
    setMission(mission) { markers.splice(0).forEach(mesh => mesh.dispose()); for (const waypoint of mission?.waypoints || []) { if (!Number.isFinite(waypoint.x) || !Number.isFinite(waypoint.z)) continue; const marker = MeshBuilder.CreateSphere('mission-waypoint', { diameter: 3 }, scene); marker.position.set(waypoint.x, 2, waypoint.z); const material = new StandardMaterial('waypoint-light', scene); material.emissiveColor = new Color3(1, .55, .1); marker.material = material; markers.push(marker); } },
    render(state) {
      engine.beginFrame(); const now = performance.now(), dt = Math.min(.1, (now - last) / 1000); last = now;
      vessel.root.position.set(state.x, vessel.offsetY + state.height, state.z); vessel.root.rotation.set(state.rotationX, state.yaw, state.rotationZ);
      const forward = new Vector3(Math.cos(state.yaw), 0, -Math.sin(state.yaw));
      const eye = new Vector3(state.x, state.height, state.z).add(forward.scale(state.bridge ? -3 : -27)).add(new Vector3(0, state.bridge ? 4 : 16, 0));
      camera.position.copyFrom(Vector3.Lerp(camera.position, eye, 1 - Math.exp(-dt / .16)));
      camera.setTarget(new Vector3(state.x, state.height + (state.bridge ? 4 : 2), state.z).add(forward.scale(state.bridge ? 70 : 12)));
      if (state.time - lastWater >= 1 / 30 || lastWater < 0) { lastWater = state.time; const waves = oceanWaveState(state.waves); for (let i = 0; i < waterPositions.length; i += 3) waterPositions[i + 1] = sampleOceanHeight(waterPositions[i], waterPositions[i + 2], state.time, waves); water.updateVerticesData(VertexBuffer.PositionKind, waterPositions); }
      scene.render(); engine.endFrame();
    },
    dispose() { markers.forEach(mesh => mesh.dispose()); scene.dispose(); engine.dispose(); MeshoptDecoder.useWorkers?.(0); }
  };
}
