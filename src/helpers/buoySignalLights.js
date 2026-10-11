import * as THREE from 'three';

const SIGNAL_RED = 0xff2424;
const FLASH_PERIOD_SECONDS = 2;

function createGlowTexture() {
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
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearFilter;
  texture.needsUpdate = true;
  return texture;
}

/** Register an existing topmark sphere, keeping its daytime appearance. */
export function attachBuoySignal(lamp) {
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({
    map: createGlowTexture(),
    color: SIGNAL_RED,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    toneMapped: false,
  }));
  halo.name = 'BuoySignalGlow';
  halo.renderOrder = 3; // Draw above the transparent ocean while retaining normal depth testing.
  const diameter = (lamp.geometry.parameters.radius ?? 0.4) * 7;
  halo.scale.set(diameter, diameter, 1);
  halo.visible = false;
  lamp.add(halo);
  lamp.userData.buoySignal = {
    lamp, halo,
    dayColor: lamp.material.color.clone(),
    dayEmissive: lamp.material.emissive.clone(),
    dayIntensity: lamp.material.emissiveIntensity,
    dayToneMapped: lamp.material.toneMapped,
    phase: 0,
  };
}

/** A short red flash every two seconds; elapsed time keeps the cadence stable at any FPS. */
export function updateBuoySignalLights(group, elapsedSeconds, isNight = false) {
  if (!group) return;
  for (const signal of group.userData.buoySignals ?? []) {
    const { lamp, halo } = signal;
    const toneMapped = isNight ? false : signal.dayToneMapped;
    if (lamp.material.toneMapped !== toneMapped) {
      lamp.material.toneMapped = toneMapped;
      lamp.material.needsUpdate = true;
    }
    if (!isNight) {
      lamp.material.color.copy(signal.dayColor);
      lamp.material.emissive.copy(signal.dayEmissive);
      lamp.material.emissiveIntensity = signal.dayIntensity;
      halo.visible = false;
      halo.material.opacity = 0;
      continue;
    }
    const phase = ((elapsedSeconds + signal.phase) % FLASH_PERIOD_SECONDS + FLASH_PERIOD_SECONDS) % FLASH_PERIOD_SECONDS;
    const pulse = THREE.MathUtils.smoothstep(phase, 0, 0.08) * (1 - THREE.MathUtils.smoothstep(phase, 0.42, 0.6));
    lamp.material.color.setHex(SIGNAL_RED);
    lamp.material.emissive.setHex(SIGNAL_RED);
    lamp.material.emissiveIntensity = 0.025 + pulse * 5;
    halo.material.opacity = pulse * 0.65;
    halo.visible = pulse > 0.001;
  }
}
