import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';

export const BIG_BOAT_BRIDGE_EYE = new THREE.Vector3(47, 34.5, 0);
export const BIG_BOAT_BRIDGE_LOOK = new THREE.Vector3(200, 18, 0);
export const BIG_BOAT_BRIDGE_WHEEL = new THREE.Vector3(50.3687152593689, 33.11432401209651, -.07072187061978506);
export const BIG_BOAT_BRIDGE_MODEL = '/assets/helm/large_boat_bridge.glb';

/** Release owned textures too, including normal/roughness maps from the cabin asset. */
export function disposeBridgeModel(model) {
  const geometries = new Set(), materials = new Set(), textures = new Set();
  model.traverse(object => {
    if (object.geometry) geometries.add(object.geometry);
    const owned = object.material ? (Array.isArray(object.material) ? object.material : [object.material]) : [];
    for (const material of owned) {
      materials.add(material);
      for (const value of Object.values(material)) if (value?.isTexture) textures.add(value);
    }
  });
  textures.forEach(texture => texture.dispose());
  geometries.forEach(geometry => geometry.dispose());
  materials.forEach(material => material.dispose());
}

/** Replace the loading interior with the project's textured, modeled wheelhouse. */
export function installBigBoatBridgeModel(cockpit, model) {
  if (cockpit.wheelRotor.userData.disposed) { disposeBridgeModel(model); return; }
  const interior = cockpit.group.getObjectByName('BigBoatBridgeInterior');
  const wheel = model.getObjectByName('BridgeSteeringWheel');
  if (!interior || !wheel) { disposeBridgeModel(model); return; }
  model.name = 'TexturedBigBoatBridge';
  model.traverse(object => {
    if (!object.isMesh) return;
    object.castShadow = true;
    object.receiveShadow = true;
    object.userData.helmInterior = true;
    const materials = Array.isArray(object.material) ? object.material : [object.material];
    for (const material of materials) {
      // Restrained worn paint and wood retain the source normal/roughness detail.
      if (material.name === 'cabine') material.color.setHex(0xd6d8d4);
      if (material.name === 'cabin_ext') material.color.setHex(0xc7cece);
      if (material.name === 'glass') { material.opacity = .15; material.depthWrite = false; }
      for (const value of Object.values(material)) if (value?.isTexture) value.anisotropy = 4;
    }
  });
  interior.add(model);
  const placeholder = cockpit.wheelRotor.getObjectByName('WheelMesh');
  if (placeholder) { placeholder.removeFromParent(); disposeBridgeModel(placeholder); }
  const mount = cockpit.group.getObjectByName('WheelMount');
  mount.rotation.set(0, 0, 0);
  // Attach in the current boat transform, so loading while underway keeps the wheel in place.
  cockpit.group.updateWorldMatrix(true, true);
  const angle = cockpit.wheelRotor.rotation.x;
  cockpit.wheelRotor.rotation.x = 0;
  cockpit.wheelRotor.updateWorldMatrix(true, true);
  cockpit.wheelRotor.attach(wheel);
  wheel.name = 'WheelMesh';
  cockpit.wheelRotor.rotation.x = angle;
  interior.getObjectByName('BigBoatBridgeFallback').visible = false;
  cockpit.group.userData.texturedBridge = true;
}

/** Compact three-spoke helm wheel matching the medium trawler's controls. */
export function buildBigBoatBridgeWheel() {
  const wheel = new THREE.Group();
  wheel.name = 'WheelMesh';
  const rimMaterial = new THREE.MeshStandardMaterial({ color: 0x302019, roughness: .56 });
  const spokeMaterial = new THREE.MeshStandardMaterial({ color: 0x172028, roughness: .4, metalness: .5 });
  const hubMaterial = new THREE.MeshStandardMaterial({ color: 0xc6ccd0, roughness: .3, metalness: .65 });
  const rim = new THREE.Mesh(new THREE.TorusGeometry(.56, .055, 12, 64), rimMaterial);
  rim.rotation.y = Math.PI / 2;
  wheel.add(rim);
  const spokeGeometry = new THREE.BoxGeometry(.07, .48, .075);
  for (let index = 0; index < 3; index++) {
    const angle = index / 3 * Math.PI * 2 + Math.PI;
    const spoke = new THREE.Mesh(spokeGeometry, spokeMaterial);
    spoke.position.set(0, Math.cos(angle) * .29, Math.sin(angle) * .29);
    spoke.rotation.x = angle;
    wheel.add(spoke);
  }
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(.12, .12, .12, 24), hubMaterial);
  hub.rotation.z = Math.PI / 2;
  wheel.add(hub);
  wheel.scale.setScalar(1.3 / 1.23);
  return wheel;
}

function roundedRectangle(path, width, height, radius) {
  const x = -width / 2, y = -height / 2;
  path.moveTo(x + radius, y);
  path.lineTo(x + width - radius, y);
  path.quadraticCurveTo(x + width, y, x + width, y + radius);
  path.lineTo(x + width, y + height - radius);
  path.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  path.lineTo(x + radius, y + height);
  path.quadraticCurveTo(x, y + height, x, y + height - radius);
  path.lineTo(x, y + radius);
  path.quadraticCurveTo(x, y, x + radius, y);
  return path;
}

/** Open the opaque window band of the merged asset using a separate index buffer.
 * Original vertices, UVs, materials and exterior geometry remain intact.
 */
export function prepareBigBoatBridgeWindows(boat) {
  if (!boat) return [];
  boat.updateWorldMatrix(true, true);
  const inverse = boat.matrixWorld.clone().invert();
  const transform = new THREE.Matrix4();
  const vertex = new THREE.Vector3();
  const triangleMin = new THREE.Vector3(), triangleMax = new THREE.Vector3();
  const cutouts = [];
  const scale = (boat.userData.loaMeters || 180) / 180;
  boat.traverse(mesh => {
    const original = mesh.geometry;
    if (!mesh.isMesh || !original?.index || original.attributes.position.count < 10000) return;
    if (mesh.userData.bridgeWindowCutout) {
      cutouts.push(mesh.userData.bridgeWindowCutout);
      return;
    }
    transform.multiplyMatrices(inverse, mesh.matrixWorld);
    const positions = original.attributes.position;
    const indices = original.index;
    const kept = [];
    for (let index = 0; index < indices.count; index += 3) {
      triangleMin.set(Infinity, Infinity, Infinity);
      triangleMax.set(-Infinity, -Infinity, -Infinity);
      for (let corner = 0; corner < 3; corner++) {
        vertex.fromBufferAttribute(positions, indices.getX(index + corner)).applyMatrix4(transform).divideScalar(scale);
        triangleMin.min(vertex);
        triangleMax.max(vertex);
      }
      // Remove crossing triangles too, so roof/wall fragments cannot hang across an open window.
      const window = triangleMax.x > 31 && triangleMin.x < 56 && triangleMax.y > 30.8 && triangleMin.y < 37
        && triangleMax.z > -17.5 && triangleMin.z < 17.5;
      if (!window) kept.push(indices.getX(index), indices.getX(index + 1), indices.getX(index + 2));
    }
    if (kept.length === indices.count) return;
    const interior = new THREE.BufferGeometry();
    for (const [name, attribute] of Object.entries(original.attributes)) interior.setAttribute(name, attribute);
    interior.setIndex(kept);
    interior.computeBoundingBox();
    interior.computeBoundingSphere();
    const cutout = { mesh, original, interior };
    mesh.userData.bridgeWindowCutout = cutout;
    cutouts.push(cutout);
  });
  return cutouts;
}

export function syncBigBoatBridgeWindows(cutouts, insideBridge) {
  for (const cutout of cutouts || []) cutout.mesh.geometry = insideBridge ? cutout.interior : cutout.original;
}

export function disposeBigBoatBridgeWindows(cutouts) {
  for (const cutout of cutouts || []) {
    cutout.mesh.geometry = cutout.original;
    delete cutout.mesh.userData.bridgeWindowCutout;
    cutout.interior.dispose();
  }
}

/** A bridge fitted inside the real cabin, with open front/side windows. */
export function buildBigBoatBridgeInterior() {
  const interior = new THREE.Group();
  interior.name = 'BigBoatBridgeInterior';
  const fallback = new THREE.Group();
  fallback.name = 'BigBoatBridgeFallback';
  interior.add(fallback);
  const wall = new THREE.MeshStandardMaterial({ color: 0x554334, roughness: .9 });
  const ceilingMaterial = new THREE.MeshStandardMaterial({ color: 0x787562, roughness: .94 });
  const floor = new THREE.MeshStandardMaterial({ color: 0x566166, roughness: .92 });
  const frameMaterial = new THREE.MeshStandardMaterial({ color: 0xc2ccd2, roughness: .68, metalness: .08 });
  const trim = new THREE.MeshStandardMaterial({ color: 0x121d27, roughness: .5, metalness: .3 });
  const console = new THREE.MeshStandardMaterial({ color: 0xb8b8a2, roughness: .88, metalness: .03 });
  const box = (name, size, position, material) => {
    const mesh = new THREE.Mesh(new RoundedBoxGeometry(...size, 3, Math.min(...size) * .18), material);
    mesh.name = name;
    mesh.position.set(...position);
    mesh.receiveShadow = true;
    fallback.add(mesh);
    return mesh;
  };
  box('BridgeFloor', [18, .18, 28], [43, 30.4, 0], floor);
  box('BridgeCeiling', [18.5, .18, 28], [43.25, 36.75, 0], ceilingMaterial);
  box('BridgeBackWall', [.18, 6.7, 28], [34.1, 33.75, 0], wall);
  box('WindshieldHeader', [.25, .2, 28.5], [52.1, 36.65, 0], frameMaterial);
  box('WindshieldSill', [.25, .2, 28.5], [52.1, 32.15, 0], frameMaterial);
  box('WindshieldLowerPanel', [.2, 1.7, 28], [52.1, 31.2, 0], wall);
  const windowShape = roundedRectangle(new THREE.Shape(), 2.6, 4.5, .23);
  windowShape.holes.push(roundedRectangle(new THREE.Path(), 2.36, 4.23, .15));
  const windowGeometry = new THREE.ExtrudeGeometry(windowShape, {
    depth: .12, bevelEnabled: true, bevelSize: .035, bevelThickness: .03, bevelSegments: 2, curveSegments: 6,
  });
  for (const z of [-13, -10.4, -7.8, -5.2, -2.6, 0, 2.6, 5.2, 7.8, 10.4, 13]) {
    const frame = new THREE.Mesh(windowGeometry, frameMaterial);
    frame.name = 'BridgeWindowFrame';
    frame.rotation.y = Math.PI / 2;
    frame.position.set(52.1, 34.4, z);
    fallback.add(frame);
  }
  for (const z of [-13.9, 13.9]) {
    box('BridgeSidePanel', [17.5, 1.9, .18], [43, 31.4, z], wall);
    box('SideWindowHeader', [18, .25, .18], [43.2, 36.65, z], frameMaterial);
    for (const x of [35, 40.5, 46, 52.1]) box('SideWindowPillar', [.15, 4.4, .18], [x, 34.4, z], frameMaterial);
  }
  box('BridgeDashboard', [2.4, 2.1, 24], [50, 31.95, 0], console);
  box('BridgeDashboardTop', [2.6, .16, 24.3], [50, 33.08, 0], console);
  const helmPanel = box('WheelPedestal', [.65, 1.0, 1.55], [49.75, 33.0, 0], console);
  helmPanel.rotation.z = -.14;
  const throttlePanel = box('BridgeThrottlePanel', [.95, .12, .7], [50, 33.24, .83], console);
  throttlePanel.rotation.z = -.12;
  const leverMaterial = new THREE.MeshStandardMaterial({ color: 0x452d22, roughness: .55 });
  for (const z of [.7, .96]) {
    const lever = new THREE.Mesh(new THREE.CylinderGeometry(.035, .035, .38, 10), trim);
    lever.position.set(49.95, 33.47, z);
    fallback.add(lever);
    box('BridgeThrottleHandle', [.14, .12, .2], [49.95, 33.7, z], leverMaterial);
  }
  const faceMaterial = new THREE.MeshBasicMaterial({ color: 0x09151d, toneMapped: false });
  const needleMaterial = new THREE.MeshBasicMaterial({ color: 0xb3eee7, toneMapped: false });
  const instrumentPanel = box('BridgeInstrumentPanel', [.18, .8, 1.8], [50.55, 33.65, -1.9], trim);
  instrumentPanel.rotation.z = -.15;
  for (const z of [-2.35, -1.9, -1.45]) {
    const gauge = new THREE.Mesh(new THREE.CircleGeometry(.28, 24), faceMaterial);
    gauge.name = 'BridgeGauge';
    gauge.rotation.y = -Math.PI / 2;
    gauge.position.set(50.44, 33.67, z);
    const needle = new THREE.Mesh(new THREE.PlaneGeometry(.025, .34), needleMaterial);
    needle.rotation.z = .5;
    needle.position.z = .015;
    gauge.add(needle);
    fallback.add(gauge);
  }
  const radar = new THREE.Group();
  radar.name = 'BridgeRadarConsole';
  radar.position.set(51.1, 34.35, 1.75);
  radar.rotation.z = -.12;
  const radarMaterial = new THREE.MeshStandardMaterial({ color: 0x202a30, roughness: .64, metalness: .15 });
  const radarMount = new THREE.Mesh(new RoundedBoxGeometry(.18, 1.68, 1.56, 5, .07), radarMaterial);
  radarMount.name = 'BigBoatRadarMount';
  radarMount.userData.helmInterior = true;
  radarMount.userData.helmRadarCorners = [
    [-.091, .7, -.65], [-.091, .7, .65], [-.091, -.6, -.65], [-.091, -.6, .65],
  ];
  radar.add(radarMount);
  const stand = new THREE.Mesh(new RoundedBoxGeometry(.22, .36, .5, 3, .035), radarMaterial);
  stand.position.set(.12, -.87, 0);
  radar.add(stand);
  const knobMaterial = new THREE.MeshStandardMaterial({ color: 0x66737b, roughness: .42, metalness: .5 });
  const knob = new THREE.Mesh(new THREE.CylinderGeometry(.06, .064, .055, 24), knobMaterial);
  knob.name = 'RadarControlDial';
  knob.rotation.z = Math.PI / 2;
  knob.position.set(-.112, -.73, .53);
  radarMount.add(knob);
  const buttonGeometry = new RoundedBoxGeometry(.016, .037, .10, 3, .01);
  for (const z of [-.4, -.18, .04]) {
    const button = new THREE.Mesh(buttonGeometry, knobMaterial);
    button.position.set(-.097, -.73, z);
    radarMount.add(button);
  }
  const indicator = new THREE.Mesh(new THREE.CircleGeometry(.012, 12),
    new THREE.MeshBasicMaterial({ color: 0x9dd4bb, toneMapped: false }));
  indicator.rotation.y = -Math.PI / 2;
  indicator.position.set(-.097, -.73, -.6);
  radarMount.add(indicator);
  interior.add(radar);
  const light = new THREE.PointLight(0xffe9ca, 45, 30, 2);
  light.name = 'BridgeCabinLight';
  light.intensity = 18;
  light.position.set(46, 35.65, 0);
  interior.add(light);
  return interior;
}
