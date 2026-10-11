import * as THREE from 'three';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js';

export const VISUAL_CONFIG = {
  fogColor: 0xbfd4e6,
  fogNear: 5000,
  fogFar: 42000,
  fogExpDensity: 0.00003,
  toneMappingExposure: 1.05,
  /** Sky Mie — lower = softer sun disc (not scene exposure). */
  sunMieCoefficientDay: 0.0018,
  sunMieDirectionalGDay: 0.62,
  sunMieCoefficientSunset: 0.011,
  sunMieDirectionalGSunset: 0.88,
  /** Water sun specular scale (Water.js defaults: shiny 100, spec 2.0). */
  waterSunSpecScale: 0.55,
  waterSunShinyScale: 0.82,
  hdriUrl: 'https://threejs.org/examples/textures/equirectangular/venice_sunset_1k.hdr',
  hdriDayUrl: 'https://threejs.org/examples/textures/equirectangular/quarry_01_1k.hdr',
  rainFogColor: 0x3d4654,
  rainExposure: 0.52,
};

/** Linear atmospheric fog tuned for a 60 km map. */
export function applySceneFog(scene, options = {}) {
  const {
    color = VISUAL_CONFIG.fogColor,
    near = VISUAL_CONFIG.fogNear,
    far = VISUAL_CONFIG.fogFar,
    mode = 'linear',
    density = VISUAL_CONFIG.fogExpDensity,
  } = options;

  if (mode === 'exp2') {
    scene.fog = new THREE.FogExp2(color, density);
  } else {
    scene.fog = new THREE.Fog(color, near, far);
  }
}

/** @type {Map<string, THREE.Texture>} */
const hdriEnvCache = new Map();
/** @type {Map<string, Promise<THREE.Texture | null>>} */
const hdriInflight = new Map();

/** Load HDRI environment for reflections and image-based lighting (cached per URL). */
export async function loadHdriEnvironment(renderer, scene, url = VISUAL_CONFIG.hdriUrl) {
  if (!renderer || !scene) return null;

  const active = scene.environment;
  if (active?.userData?.hdriUrl === url) return active;

  if (hdriEnvCache.has(url)) {
    scene.environment = hdriEnvCache.get(url);
    return scene.environment;
  }

  if (hdriInflight.has(url)) {
    const envMap = await hdriInflight.get(url);
    if (envMap) scene.environment = envMap;
    return envMap;
  }

  const loadPromise = (async () => {
    const pmrem = new THREE.PMREMGenerator(renderer);
    pmrem.compileEquirectangularShader();

    try {
      const hdr = await new RGBELoader().loadAsync(url);
      hdr.mapping = THREE.EquirectangularReflectionMapping;
      const envMap = pmrem.fromEquirectangular(hdr).texture;
      envMap.userData = { hdriUrl: url };
      hdr.dispose();
      pmrem.dispose();
      hdriEnvCache.set(url, envMap);
      return envMap;
    } catch (err) {
      console.warn('[environment] HDRI load failed, using sky PMREM fallback:', err);
      pmrem.dispose();
      return null;
    }
  })();

  hdriInflight.set(url, loadPromise);

  try {
    const envMap = await loadPromise;
    if (envMap) scene.environment = envMap;
    return envMap;
  } finally {
    hdriInflight.delete(url);
  }
}

/** Rebuild scene.environment from the Sky object (fallback). */
export function applySkyEnvironment(renderer, scene, sky) {
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(sky).texture;
  pmrem.dispose();
}

export function applyRendererToneMapping(renderer, exposure = VISUAL_CONFIG.toneMappingExposure) {
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = exposure;
}

// Procedural cloud cover stays on the Sky dome and also appears in water reflections.
function installSkyClouds(material) {
  if (material.uniforms.cloudCover) return;
  Object.assign(material.uniforms, {
    cloudCover: { value: 0 },
    cloudTime: { value: 0 },
    cloudShadow: { value: new THREE.Color() },
    cloudHighlight: { value: new THREE.Color() },
  });
  material.fragmentShader = material.fragmentShader.replace('void main() {', `
    uniform float cloudCover;
    uniform float cloudTime;
    uniform vec3 cloudShadow;
    uniform vec3 cloudHighlight;
    float cloudHash(vec2 p) {
      return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
    }
    float cloudNoise(vec2 p) {
      vec2 i = floor(p), f = fract(p);
      vec2 u = f * f * (3.0 - 2.0 * f);
      return mix(mix(cloudHash(i), cloudHash(i + vec2(1.0, 0.0)), u.x),
        mix(cloudHash(i + vec2(0.0, 1.0)), cloudHash(i + vec2(1.0)), u.x), u.y);
    }
    float cloudLayers(vec2 p) {
      float result = 0.0, weight = 0.5;
      mat2 rotation = mat2(0.8, -0.6, 0.6, 0.8);
      for (int i = 0; i < 4; i++) {
        result += weight * cloudNoise(p);
        p = rotation * p * 2.03 + vec2(17.1, 9.2);
        weight *= 0.5;
      }
      return result;
    }
    void main() {
  `).replace('gl_FragColor = vec4( retColor, 1.0 );', `
    if (cloudCover > 0.0) {
      vec2 cloudUV = direction.xz / max(direction.y + 0.25, 0.12) * 1.8;
      cloudUV += vec2(cloudTime * 0.012, cloudTime * 0.005);
      float broad = cloudLayers(cloudUV);
      float detail = cloudLayers(cloudUV * 2.6 + broad * 2.0);
      float shade = smoothstep(0.15, 0.8, broad * 0.75 + detail * 0.25);
      vec3 clouds = mix(cloudShadow, cloudHighlight, shade);
      // Full overcast hides the sun while the horizon retains diffuse daylight.
      retColor = mix(retColor, clouds, cloudCover);
    }
    gl_FragColor = vec4(retColor, 1.0);
  `);
  material.needsUpdate = true;
}

export function updateSkyClouds(sky, delta, windSpeed = 0.1) {
  const u = sky?.material?.uniforms;
  if (u?.cloudCover?.value > 0) {
    u.cloudTime.value += Math.max(0, delta) * (0.5 + windSpeed * 2);
  }
}

/** Tune Three.js Sky uniforms for time-of-day preset (sun vector must already be set). */
export function applySkyPreset(sky, preset) {
  if (!sky?.material?.uniforms) return;

  installSkyClouds(sky.material);
  const u = sky.material.uniforms;
  u.cloudCover.value = preset === 'cloudy' ? 1 : preset === 'rain' ? 0.98 : 0;
  if (preset === 'rain') {
    u.cloudShadow.value.setRGB(0.015, 0.024, 0.04);
    u.cloudHighlight.value.setRGB(0.07, 0.09, 0.13);
  } else {
    u.cloudShadow.value.setRGB(0.22, 0.25, 0.29);
    u.cloudHighlight.value.setRGB(0.65, 0.7, 0.76);
  }
  if (preset === 'sunset') {
    u.turbidity.value = 18;
    u.rayleigh.value = 3.8;
    u.mieCoefficient.value = VISUAL_CONFIG.sunMieCoefficientSunset;
    u.mieDirectionalG.value = VISUAL_CONFIG.sunMieDirectionalGSunset;
  } else if (preset === 'cloudy') {
    u.turbidity.value = 12;
    u.rayleigh.value = 0.8;
    u.mieCoefficient.value = 0.006;
    u.mieDirectionalG.value = 0.35;
  } else if (preset === 'rain') {
    u.turbidity.value = 20;
    u.rayleigh.value = 0.45;
    u.mieCoefficient.value = 0.001;
    u.mieDirectionalG.value = 0.2;
  } else if (preset === 'night') {
    u.turbidity.value = 8;
    u.rayleigh.value = 0.18;
    u.mieCoefficient.value = 0.0005;
    u.mieDirectionalG.value = 0.08;
  } else {
    u.turbidity.value = 5;
    u.rayleigh.value = 1.45;
    u.mieCoefficient.value = VISUAL_CONFIG.sunMieCoefficientDay;
    u.mieDirectionalG.value = VISUAL_CONFIG.sunMieDirectionalGDay;
  }
}

export function applySunPosition(sun, elevationDeg, azimuthDeg) {
  const phi = THREE.MathUtils.degToRad(90 - elevationDeg);
  const theta = THREE.MathUtils.degToRad(azimuthDeg);
  sun.setFromSphericalCoords(1, phi, theta);
}

/** Interpolate sun between sunrise → noon → sunset (0–24 h). */
export function applyTimeOfDay(sky, sun, hour) {
  const h = ((hour % 24) + 24) % 24;
  let elevation;
  let azimuth;
  let preset;

  if (h < 6) {
    elevation = THREE.MathUtils.lerp(-2, 4, h / 6);
    azimuth = THREE.MathUtils.lerp(90, 110, h / 6);
    preset = 'sunset';
  } else if (h < 12) {
    elevation = THREE.MathUtils.lerp(4, 55, (h - 6) / 6);
    azimuth = THREE.MathUtils.lerp(110, 180, (h - 6) / 6);
    preset = 'day';
  } else if (h < 18) {
    elevation = THREE.MathUtils.lerp(55, 8, (h - 12) / 6);
    azimuth = THREE.MathUtils.lerp(180, 250, (h - 12) / 6);
    preset = 'day';
  } else {
    elevation = THREE.MathUtils.lerp(8, -2, (h - 18) / 6);
    azimuth = THREE.MathUtils.lerp(250, 290, (h - 18) / 6);
    preset = 'sunset';
  }

  applySunPosition(sun, elevation, azimuth);
  sky.material.uniforms.sunPosition.value.copy(sun);
  applySkyPreset(sky, preset);
  return preset;
}

export function configureSceneLights(preset, ambientLight, mainLight) {
  if (preset === 'sunset') {
    ambientLight?.color.setHex(0xffb88a);
    ambientLight.intensity = 0.28;
    mainLight?.color.setHex(0xff9f5a);
    mainLight.intensity = 1.1;
    mainLight.position.set(-140, 55, -60);
  } else if (preset === 'cloudy') {
    ambientLight?.color.setHex(0xb0bfce);
    ambientLight.intensity = 0.48;
    mainLight?.color.setHex(0xd1d9e3);
    mainLight.intensity = 0.55;
    mainLight.position.set(100, 280, -150);
  } else if (preset === 'rain') {
    ambientLight?.color.setHex(0x5c6675);
    ambientLight.intensity = 0.12;
    mainLight?.color.setHex(0x707a88);
    mainLight.intensity = 0.08;
    mainLight.position.set(40, 180, -90);
  } else if (preset === 'night') {
    ambientLight?.color.setHex(0x26364f);
    ambientLight.intensity = 0.2;
    mainLight?.color.setHex(0x59749c);
    mainLight.intensity = 0.22;
    mainLight.position.set(-80, 120, 60);
  } else {
    ambientLight?.color.setHex(0xdbeafe);
    ambientLight.intensity = 0.52;
    mainLight?.color.setHex(0xfff0dc);
    mainLight.intensity = 1.25;
    mainLight.position.set(100, 300, -200);
  }
}

/** Sun elevation / azimuth per environment preset. */
export function getSunAnglesForPreset(preset) {
  if (preset === 'sunset') return { elevation: 2.2, azimuth: 238 };
  if (preset === 'cloudy') return { elevation: 38, azimuth: 175 };
  if (preset === 'rain') return { elevation: -28, azimuth: 210 };
  if (preset === 'night') return { elevation: -18, azimuth: 260 };
  return { elevation: 8, azimuth: 175 };
}
