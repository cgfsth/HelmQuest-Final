import * as THREE from 'three';

// Inner display corners of the trawler's existing tablet, in its mesh coordinates.
// Keep the original bezel and tilt; the viewer's right is the model's negative X.
const TABLET_CORNERS = [
  [0.19168496, -0.00952256, 0.06158804],
  [-0.19080019, -0.00952256, 0.06158804],
  [0.19878837, 0.08935400, -0.25868893],
  [-0.19790357, 0.08935400, -0.25868893],
];

/** Mount the shared live radar canvas in the medium tablet or large bridge console. */
export function createHelmRadarScreen(boat, sourceCanvas) {
  if (!boat || !sourceCanvas) return null;
  const tablet = boat.getObjectByName('screen002_misc_0')
    ?? boat.getObjectByName('screen.002_misc_0')
    ?? boat.getObjectByName('BigBoatRadarMount');
  if (!tablet?.isMesh) return null;

  const corners = (tablet.userData.helmRadarCorners ?? TABLET_CORNERS).map(point => new THREE.Vector3(...point));
  const normal = new THREE.Vector3()
    .subVectors(corners[2], corners[0])
    .cross(new THREE.Vector3().subVectors(corners[1], corners[0]))
    .normalize();
  const width = (corners[0].distanceTo(corners[1]) + corners[2].distanceTo(corners[3])) / 2;
  const height = corners[0].distanceTo(corners[2]);
  const aspect = width / height;
  const inset = (1 - 1 / aspect) / 2;
  const radarCorners = [
    corners[0].clone().lerp(corners[1], inset),
    corners[1].clone().lerp(corners[0], inset),
    corners[2].clone().lerp(corners[3], inset),
    corners[3].clone().lerp(corners[2], inset),
  ];
  const makeGeometry = (points, offset) => {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(
      points.flatMap(point => point.clone().addScaledVector(normal, offset).toArray()), 3
    ));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute([
      0, 1, 1, 1, 0, 0, 1, 0,
    ], 2));
    geometry.setIndex([0, 2, 1, 1, 2, 3]);
    geometry.computeVertexNormals();
    return geometry;
  };

  // A black backing covers the old static image. Center the square radar inside it
  // so the display retains its circle without stretching texture edge pixels.
  const screen = new THREE.Mesh(makeGeometry(corners, 0.0005),
    new THREE.MeshBasicMaterial({ color: 0x020617, toneMapped: false }));
  screen.name = 'HelmRadarScreen';
  screen.userData.helmInterior = true;
  screen.castShadow = false;
  screen.receiveShadow = false;

  const texture = new THREE.CanvasTexture(sourceCanvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = false;
  const material = new THREE.MeshBasicMaterial({ map: texture, toneMapped: false });
  const surface = new THREE.Mesh(makeGeometry(radarCorners, 0.0008), material);
  surface.name = 'HelmRadarCanvas';
  surface.userData.helmInterior = true;
  screen.add(surface);
  tablet.add(screen);

  return { screen, surface, texture, sourceCanvas };
}

/** Upload only after the shared radar canvas has been redrawn. */
export function updateHelmRadarScreen(display) {
  if (display) display.texture.needsUpdate = true;
}

export function disposeHelmRadarScreen(display) {
  if (!display) return;
  display.screen.removeFromParent();
  display.surface.geometry.dispose();
  display.surface.material.dispose();
  display.screen.geometry.dispose();
  display.screen.material.dispose();
  display.texture.dispose();
}
