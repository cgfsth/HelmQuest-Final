import * as THREE from 'three';

// Measured pole caps in seaside_wharf.glb's local coordinates. The scan is one merged mesh.
const WHARF_POLE_CAPS = [
  [0.2164, 0.1629, -0.3725],
  [0.0172, 0.1736, -0.2039],
  [0.2168, 0.1824, 0.0502],
  [0.0209, 0.1024, -0.4637],
];
const LAMP_COLOR = 0xffeed0;

function createLampGlowTexture() {
  const size = 64;
  const pixels = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const radius = Math.hypot((x + 0.5) / size * 2 - 1, (y + 0.5) / size * 2 - 1);
      const i = (y * size + x) * 4;
      pixels[i] = pixels[i + 1] = pixels[i + 2] = 255;
      pixels[i + 3] = Math.round((1 - THREE.MathUtils.smoothstep(radius, 0, 1)) ** 2 * 255);
    }
  }
  const texture = new THREE.DataTexture(pixels, size, size);
  texture.minFilter = texture.magFilter = THREE.LinearFilter;
  texture.needsUpdate = true;
  return texture;
}

/** Mount four steady lamps on the existing scan, without adding more poles. */
export function addWharfPoleLights(model) {
  const existing = model.getObjectByName('WharfPoleLights');
  if (existing) return existing;
  const lamps = new THREE.Group();
  lamps.name = 'WharfPoleLights';
  lamps.visible = false;

  // Size the visible lamp and soft halo in world units despite the dock's 500x scale.
  const scale = model.getWorldScale(new THREE.Vector3()).x || 1;
  const geometry = new THREE.SphereGeometry(1.5 / scale, 12, 8);
  const lensMaterial = new THREE.MeshBasicMaterial({ color: LAMP_COLOR, toneMapped: false });
  const glowTexture = createLampGlowTexture();
  const glowMaterial = new THREE.SpriteMaterial({
    map: glowTexture,
    color: LAMP_COLOR,
    transparent: true,
    opacity: 0.9,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    toneMapped: false,
  });

  WHARF_POLE_CAPS.forEach((position, index) => {
    const fixture = new THREE.Group();
    fixture.name = `WharfPoleLamp-${index + 1}`;
    fixture.position.fromArray(position);
    const lens = new THREE.Mesh(geometry, lensMaterial);
    lens.name = 'WharfLampLens';
    const glow = new THREE.Sprite(glowMaterial);
    glow.name = 'WharfLampGlow';
    glow.scale.set(30 / scale, 30 / scale, 1);
    glow.renderOrder = 3; // Keep the glow above the transparent water with normal depth testing.
    // The tall poles need enough reach and intensity to light the wharf below.
    const light = new THREE.PointLight(LAMP_COLOR, 30000, 260, 2);
    light.name = 'WharfLampLight';
    light.castShadow = false;
    fixture.add(lens, glow, light);
    lamps.add(fixture);
  });
  lamps.userData.glowTexture = glowTexture;
  model.add(lamps);
  return lamps;
}

export function setHarborPoleLightsVisible(dockGroup, isDark) {
  const lamps = dockGroup?.getObjectByName('WharfPoleLights');
  if (lamps) lamps.visible = isDark;
}
