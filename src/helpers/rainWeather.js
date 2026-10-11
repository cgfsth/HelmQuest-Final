import * as THREE from 'three';

const RAIN_COUNT = 10000;
const RAIN_SPAN = 220;
const RAIN_HEIGHT = 100;
const FALL_SPEED = 110;

function createRainStreakTexture() {
  const width = 32, height = 64;
  const pixels = new Uint8Array(width * height * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const dx = (x - (width - 1) / 2) / 2.2;
      const dy = Math.abs((y + 0.5) / height - 0.5) / 0.46;
      const i = (y * width + x) * 4;
      pixels[i] = pixels[i + 1] = pixels[i + 2] = 255;
      pixels[i + 3] = Math.round(Math.exp(-dx * dx) * Math.max(0, 1 - dy) * 255);
    }
  }
  const texture = new THREE.DataTexture(pixels, width, height, THREE.RGBAFormat);
  texture.magFilter = texture.minFilter = THREE.LinearFilter;
  texture.needsUpdate = true;
  return texture;
}

/**
 * Rain volume centered on the active camera so streaks are always visible.
 * @param {THREE.Scene} scene
 * @param {{ getCamera: () => THREE.Camera | null, getWind?: () => { speed: number, directionAngle: number } }} options
 */
export function createRainWeatherSystem(scene, options = {}) {
  const { getCamera, getWind = () => ({ speed: 0.6, directionAngle: 220 }) } = options;

  const group = new THREE.Group();
  group.name = 'RainWeather';
  group.frustumCulled = false;
  group.visible = false;
  group.renderOrder = 50;
  scene.add(group);

  const positions = new Float32Array(RAIN_COUNT * 3);
  const speeds = new Float32Array(RAIN_COUNT);

  for (let i = 0; i < RAIN_COUNT; i++) {
    positions[i * 3] = (Math.random() - 0.5) * RAIN_SPAN;
    positions[i * 3 + 1] = Math.random() * RAIN_HEIGHT;
    positions[i * 3 + 2] = (Math.random() - 0.5) * RAIN_SPAN;
    speeds[i] = 0.85 + Math.random() * 0.35;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const streakTexture = createRainStreakTexture();

  const rain = new THREE.Points(
    geometry,
    new THREE.PointsMaterial({
      color: 0xc8d6e4,
      map: streakTexture,
      alphaTest: 0.01,
      size: 1.8,
      transparent: true,
      opacity: 0.42,
      depthWrite: false,
      sizeAttenuation: true,
    })
  );
  rain.frustumCulled = false;
  rain.renderOrder = 51;
  group.add(rain);

  const mistPositions = new Float32Array(RAIN_COUNT * 0.4 * 3);
  const mistSpeeds = new Float32Array(mistPositions.length / 3);
  for (let i = 0; i < mistSpeeds.length; i++) {
    mistPositions[i * 3] = (Math.random() - 0.5) * RAIN_SPAN * 1.15;
    mistPositions[i * 3 + 1] = Math.random() * RAIN_HEIGHT;
    mistPositions[i * 3 + 2] = (Math.random() - 0.5) * RAIN_SPAN * 1.15;
    mistSpeeds[i] = 0.55 + Math.random() * 0.25;
  }
  const mistGeo = new THREE.BufferGeometry();
  mistGeo.setAttribute('position', new THREE.BufferAttribute(mistPositions, 3));
  const mist = new THREE.Points(
    mistGeo,
    new THREE.PointsMaterial({
      color: 0x8a9aaa,
      map: streakTexture,
      alphaTest: 0.01,
      size: 1.5,
      transparent: true,
      opacity: 0.07,
      depthWrite: false,
      sizeAttenuation: true,
    })
  );
  mist.frustumCulled = false;
  mist.renderOrder = 50;
  group.add(mist);

  function respawnDrop(arr, i) {
    arr[i * 3] = (Math.random() - 0.5) * RAIN_SPAN;
    arr[i * 3 + 1] = RAIN_HEIGHT * (0.55 + Math.random() * 0.45);
    arr[i * 3 + 2] = (Math.random() - 0.5) * RAIN_SPAN;
  }

  function updateLayer(geo, speedArr, dt, windX, windZ, floorY) {
    const arr = geo.attributes.position.array;
    const half = RAIN_SPAN * 0.52;

    for (let i = 0; i < speedArr.length; i++) {
      const fall = FALL_SPEED * speedArr[i] * dt;
      arr[i * 3] += windX * dt;
      arr[i * 3 + 1] -= fall;
      arr[i * 3 + 2] += windZ * dt;

      if (
        arr[i * 3 + 1] < floorY ||
        Math.abs(arr[i * 3]) > half ||
        Math.abs(arr[i * 3 + 2]) > half
      ) {
        respawnDrop(arr, i);
      }
    }
    geo.attributes.position.needsUpdate = true;
  }

  return {
    group,
    setActive(active) {
      group.visible = active;
    },
    update(dt) {
      if (!group.visible) return;
      const cam = getCamera();
      if (!cam) return;

      group.position.copy(cam.position);

      const wind = getWind();
      const windRad = THREE.MathUtils.degToRad(wind.directionAngle ?? 220);
      const windX = Math.cos(windRad) * (wind.speed ?? 0.5) * 16;
      const windZ = Math.sin(windRad) * (wind.speed ?? 0.5) * 16;
      const floorY = -RAIN_HEIGHT * 0.42;

      updateLayer(geometry, speeds, dt, windX, windZ, floorY);
      updateLayer(mistGeo, mistSpeeds, dt, windX * 0.75, windZ * 0.75, floorY);
    },
    dispose() {
      scene.remove(group);
      geometry.dispose();
      rain.material.dispose();
      mistGeo.dispose();
      mist.material.dispose();
      streakTexture.dispose();
    },
  };
}

/** Control & sea-state modifiers while raining. */
export const RAIN_PHYSICS = {
  thrustScale: 0.8,
  dragScale: 1.42,
  steerScale: 0.68,
  turnDamping: 0.74,
  waterReaction: 0.017,
  waveAmplitude: 3.2,
  waveFrequency: 2.0,
  windSpeed: 0.85,
};

export function getRainPhysicsModifiers(active) {
  if (!active) {
    return {
      thrustScale: 1,
      dragScale: 1,
      steerScale: 1,
      turnDamping: 0.85,
      waterReaction: null,
    };
  }
  return {
    thrustScale: RAIN_PHYSICS.thrustScale,
    dragScale: RAIN_PHYSICS.dragScale,
    steerScale: RAIN_PHYSICS.steerScale,
    turnDamping: RAIN_PHYSICS.turnDamping,
    waterReaction: RAIN_PHYSICS.waterReaction,
  };
}
