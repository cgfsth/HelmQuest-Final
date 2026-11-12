import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { Water } from 'three/examples/jsm/objects/Water.js';
import { Sky } from 'three/examples/jsm/objects/Sky.js';
import { MeshoptDecoder } from 'meshoptimizer/decoder';
import { PROTOTYPE_ASSETS } from '../prototypeState.js';
import { oceanWaveState, sampleOceanHeight } from '../../helpers/oceanWaves.js';
export async function createRenderer({ canvas, preset, metrics, onProgress }) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true }); renderer.setPixelRatio(Math.min(devicePixelRatio || 1, preset.ratio)); renderer.setSize(innerWidth, innerHeight); renderer.shadowMap.enabled = !!preset.shadow; renderer.toneMapping = THREE.ACESFilmicToneMapping;
  const scene = new THREE.Scene(); scene.background = new THREE.Color(.46, .7, .83); scene.fog = new THREE.FogExp2(scene.background, .0004);
  const camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, .1, 15000); camera.position.set(-118, 18, 60);
  const ambient = new THREE.HemisphereLight(0xc9e8ff, 0x22343b, 1.6); scene.add(ambient);
  const sun = new THREE.DirectionalLight(0xfff4dc, 2); sun.position.set(80, 220, -120); sun.castShadow = !!preset.shadow; if (preset.shadow) { sun.shadow.mapSize.setScalar(preset.shadow); sun.shadow.camera.left = -300; sun.shadow.camera.right = 300; sun.shadow.camera.top = 300; sun.shadow.camera.bottom = -300; sun.shadow.camera.far = 1000; } scene.add(sun);
  const sky = new Sky(); sky.scale.setScalar(10000); sky.material.uniforms.sunPosition.value.copy(sun.position); scene.add(sky);
  const geometry = new THREE.PlaneGeometry(1200, 1200, preset.segments, preset.segments).rotateX(-Math.PI / 2);
  const normal = new THREE.TextureLoader().load('/helpers/waternormals.jpg', texture => { texture.wrapS = texture.wrapT = THREE.RepeatWrapping; });
  const water = new Water(geometry, { textureWidth: preset.reflection, textureHeight: preset.reflection, waterNormals: normal, sunDirection: sun.position.clone().normalize(), sunColor: 0xfff4dc, waterColor: 0x064451, distortionScale: 2, fog: true }); water.frustumCulled = false; scene.add(water);
  const far = new THREE.Mesh(new THREE.PlaneGeometry(40000, 40000).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0x063341, roughness: .4 })); far.position.y = -2; scene.add(far);
  const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder), markers = [];
  async function asset(name, url, length, location) {
    const at = performance.now(); onProgress(`Loading ${name}…`); const gltf = await loader.loadAsync(url, progress => onProgress(`Loading ${name}: ${(progress.loaded / 1048576).toFixed(1)} MB`));
    const root = new THREE.Group(); root.add(gltf.scene); scene.add(root); let box = new THREE.Box3().setFromObject(root), size = box.getSize(new THREE.Vector3());
    if (name === 'vessel' && size.z > size.x) gltf.scene.rotation.y = -Math.PI / 2;
    box.setFromObject(root); size = box.getSize(new THREE.Vector3()); gltf.scene.scale.setScalar(length / Math.max(size.x, size.z)); box.setFromObject(root);
    const center = box.getCenter(new THREE.Vector3()); gltf.scene.position.set(-center.x, -box.min.y - (name === 'vessel' ? .35 : 2), -center.z); root.position.set(location.x, 0, location.z); box.setFromObject(root); size = box.getSize(new THREE.Vector3());
    let meshes = 0; const materials = new Set(); root.traverse(node => { if (node.isMesh) { meshes++; node.castShadow = true; node.receiveShadow = true; (Array.isArray(node.material) ? node.material : [node.material]).forEach(m => materials.add(m)); } });
    metrics.assets[name] = { url, loadMs: performance.now() - at, meshes, materials: materials.size, animationGroups: gltf.animations.length, bounds: { x: size.x, y: size.y, z: size.z } };
    return { root, box };
  }
  let vessel, harbor;
  const dispose = () => { const geometries = new Set(), materials = new Set(), textures = new Set(); scene.traverse(node => { if (node.geometry) geometries.add(node.geometry); for (const material of (Array.isArray(node.material) ? node.material : [node.material]).filter(Boolean)) { materials.add(material); for (const value of Object.values(material)) if (value?.isTexture) textures.add(value); } }); textures.forEach(t => t.dispose()); materials.forEach(m => m.dispose()); geometries.forEach(g => g.dispose()); water.material.uniforms.mirrorSampler.value?.dispose(); renderer.dispose(); };
  try { [vessel, harbor] = await Promise.all([asset('vessel', PROTOTYPE_ASSETS.vessel, 18, { x: -90, z: 60 }), asset('harbor', PROTOTYPE_ASSETS.harbor, 320, { x: 80, z: -180 })]); }
  catch (error) { dispose(); throw error; }
  let last = performance.now(), lastWater = -1;
  return { collision: (x, z) => x > harbor.box.min.x - 9 && x < harbor.box.max.x + 9 && z > harbor.box.min.z - 3 && z < harbor.box.max.z + 3,
    health() { return { ready: renderer.info.programs?.every(program => program.diagnostics?.runnable !== false) ?? false, shaderErrors: renderer.info.programs?.filter(program => program.diagnostics?.runnable === false).map(program => program.diagnostics.programLog) || [] }; },
    resize() { renderer.setSize(innerWidth, innerHeight); camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); },
    setResolution(ratio) { renderer.setPixelRatio(ratio); renderer.setSize(innerWidth, innerHeight); },
    lighting(value) { const night = value === 'night'; sun.intensity = night ? .07 : 2; ambient.intensity = night ? .18 : 1.6; scene.background.set(night ? 0x071421 : 0x80b8d3); scene.fog.color.copy(scene.background); sky.material.uniforms.sunPosition.value.set(80, night ? -100 : 220, -120); },
    setMission(mission) { for (const mesh of markers.splice(0)) { scene.remove(mesh); mesh.geometry.dispose(); mesh.material.dispose(); } for (const point of mission?.waypoints || []) { if (!Number.isFinite(point.x) || !Number.isFinite(point.z)) continue; const marker = new THREE.Mesh(new THREE.SphereGeometry(1.5, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffa122 })); marker.position.set(point.x, 2, point.z); scene.add(marker); markers.push(marker); } },
    render(state) { const now = performance.now(), dt = Math.min(.1, (now - last) / 1000); last = now; vessel.root.position.set(state.x, state.height, state.z); vessel.root.rotation.set(state.rotationX, state.yaw, state.rotationZ);
      const forward = new THREE.Vector3(Math.cos(state.yaw), 0, -Math.sin(state.yaw)), eye = new THREE.Vector3(state.x, state.height, state.z).addScaledVector(forward, state.bridge ? -3 : -27).add(new THREE.Vector3(0, state.bridge ? 4 : 16, 0)); camera.position.lerp(eye, 1 - Math.exp(-dt / .16)); camera.lookAt(new THREE.Vector3(state.x, state.height + (state.bridge ? 4 : 2), state.z).addScaledVector(forward, state.bridge ? 70 : 12));
      water.material.uniforms.time.value = state.time;
      if (state.time - lastWater >= 1 / 30 || lastWater < 0) { lastWater = state.time; const p = geometry.attributes.position, waves = oceanWaveState(state.waves); for (let i = 0; i < p.count; i++) p.setY(i, sampleOceanHeight(p.getX(i), p.getZ(i), state.time, waves)); p.needsUpdate = true; }
      renderer.render(scene, camera);
    }, dispose
  };
}
