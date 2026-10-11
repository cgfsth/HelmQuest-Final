import * as THREE from 'three';
import { Water } from 'three/examples/jsm/objects/Water.js';
import { OCEAN_MAP_HALF_EXTENT } from './worldIslands.js';
import { createWaterNormalTexture } from './proceduralTextures.js';

import { VISUAL_CONFIG } from './environmentVisuals.js';
import { createOceanGeometry, oceanWaveState, sampleOceanHeight, OCEAN_WAVE_GLSL } from './oceanWaves.js';

const WATER_NORMALS = '/helpers/waternormals.jpg';

/** Displace the water and shade its swell normals while preserving ocean reflections. */
function tuneWaterSurface(material, waveUniforms) {
  const spec = (2.0 * VISUAL_CONFIG.waterSunSpecScale).toFixed(2);
  const shiny = (100.0 * VISUAL_CONFIG.waterSunShinyScale).toFixed(1);
  const previous = material.onBeforeCompile;
  material.uniforms.waveNormalStrength = { value: 0.65 };
  material.onBeforeCompile = (shader, ...rest) => {
    previous?.(shader, ...rest);
    Object.assign(shader.uniforms, waveUniforms);
    shader.uniforms.waveNormalStrength = material.uniforms.waveNormalStrength;
    shader.vertexShader = OCEAN_WAVE_GLSL + shader.vertexShader.replace(
      'mirrorCoord = modelMatrix * vec4( position, 1.0 );',
      `vec3 displacedPosition = position;
       vec2 surfacePoint = (modelMatrix * vec4(position, 1.0)).xz;
       displacedPosition.z += oceanSwell(surfacePoint).x;
       mirrorCoord = modelMatrix * vec4(displacedPosition, 1.0);`
    ).replace('modelViewMatrix * vec4( position, 1.0 )', 'modelViewMatrix * vec4(displacedPosition, 1.0)');
    shader.fragmentShader = OCEAN_WAVE_GLSL + shader.fragmentShader;
    shader.fragmentShader = shader.fragmentShader.replace(
      'sunLight( surfaceNormal, eyeDirection, 100.0, 2.0, 0.5,',
      `sunLight( surfaceNormal, eyeDirection, ${shiny}, ${spec}, 0.5,`
    ).replace(
      'uniform float size;',
      'uniform float size;\n uniform float waveNormalStrength;'
    ).replace(
      'vec4 noise = getNoise( worldPosition.xz * size );',
      `vec2 ripplePoint = worldPosition.xz;
       ripplePoint += vec2(
         sin(dot(worldPosition.xz, vec2(0.017, 0.009)) + time * 0.11),
         cos(dot(worldPosition.xz, vec2(-0.012, 0.015)) - time * 0.09)
       ) * 7.0;
       vec4 noise = getNoise(ripplePoint * size);`
    ).replace(
      'vec2 uv1 = uv / 107.0',
      'vec2 uv1 = mat2(0.8, -0.6, 0.6, 0.8) * uv / 79.0'
    ).replace(
      'vec3 surfaceNormal = normalize( noise.xzy * vec3( 1.5, 1.0, 1.5 ) );',
      `vec3 swell = oceanSwell(worldPosition.xz);
       float slope = waveNormalStrength * mix(0.32, 0.15, smoothstep(150.0, 2500.0, length(eye - worldPosition.xyz)));
       vec3 surfaceNormal = normalize(vec3(-swell.y + noise.x * slope, 1.0, -swell.z + noise.y * slope));`
    ).replace('vec3 outgoingLight = albedo;',
      `float crest = swell.x / max(oceanWaveAmplitude, 0.001);
       albedo *= 0.95 + 0.1 * crest;
       albedo = mix(albedo, vec3(0.65, 0.82, 0.85), smoothstep(0.65, 0.95, crest) * 0.035);
       vec3 outgoingLight = albedo;`).replace('float rf0 = 0.3;', 'float rf0 = 0.12;');
  };
  material.needsUpdate = true;
}

/**
 * Enhanced ocean: reflections, Fresnel (via Water shader), sun glitter, shore tint hook.
 * @param {THREE.Scene | null} scene
 * @param {{ renderer?: THREE.WebGLRenderer, fog?: boolean }} [options]
 */
export function loadOceanSimulation(scene, { renderer, fog = true } = {}) {
  return new Promise((resolve) => {
    const sunDirection = new THREE.Vector3(0.4, 0.85, -0.2).normalize();
    let waveDistortion = 1.7;
    let playbackSpeed = 0.45;
    let opacityScale = 1.0;
    let elapsed = 0;
    let seaState = oceanWaveState();
    const waveCenter = { x: 0, z: 0 };
    const waveUniforms = {
      oceanWaveTime: { value: 0 },
      oceanWaveAmplitude: { value: seaState.amplitude },
      oceanWaveFrequency: { value: seaState.frequency },
      oceanWaveCenter: { value: new THREE.Vector2() },
    };

    const geometry = createOceanGeometry(OCEAN_MAP_HALF_EXTENT);
    
    // Validate geometry positions to prevent NaN errors
    const positions = geometry.attributes.position;
    if (positions) {
      for (let i = 0; i < positions.count; i++) {
        const x = positions.getX(i);
        const y = positions.getY(i);
        const z = positions.getZ(i);
        
        if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(z)) {
          positions.setXYZ(i, 0, 0, 0);
        }
      }
      positions.needsUpdate = true;
    }

    const loader = new THREE.TextureLoader();
    loader.load(
      WATER_NORMALS,
      (texture) => {
        configureWaterNormals(texture);
        buildWater(texture);
      },
      undefined,
      () => {
        console.warn('[ocean] waternormals.jpg missing — using procedural normals');
        buildWater(createWaterNormalTexture(512));
      }
    );

    function configureWaterNormals(normals) {
      if (!normals) return;
      normals.wrapS = normals.wrapT = THREE.RepeatWrapping;
      // Water's shader controls the world-space tiling through its size uniform.
      normals.repeat.set(1, 1);
      normals.minFilter = THREE.LinearMipmapLinearFilter;
      normals.magFilter = THREE.LinearFilter;
      normals.generateMipmaps = true;
      normals.anisotropy = Math.min(8, renderer?.capabilities?.getMaxAnisotropy?.() ?? 4);
    }

    function buildWater(normals) {
      configureWaterNormals(normals);

      const water = new Water(geometry, {
        textureWidth: 2048,
        textureHeight: 2048,
        waterNormals: normals,
        sunDirection,
        sunColor: 0xffe8cc,
        waterColor: 0x0a3a58,
        distortionScale: waveDistortion,
        fog,
      });
      tuneWaterSurface(water.material, waveUniforms);
      Object.assign(water.material.uniforms, waveUniforms);
      water.material.transparent = true;
      water.material.depthWrite = false;
      water.material.uniforms.size.value = 2.4;
      water.rotation.x = -Math.PI / 2;
      water.name = 'OceanWater';
      water.receiveShadow = true;
      water.frustumCulled = false;

      if (scene?.fog) {
        water.material.fog = true;
      }

      const api = {
        root: water,
        update(delta, viewPosition) {
          if (viewPosition && Number.isFinite(viewPosition.x) && Number.isFinite(viewPosition.z)) {
            waveCenter.x = Math.round(viewPosition.x / 2) * 2;
            waveCenter.z = Math.round(viewPosition.z / 2) * 2;
            water.position.x = waveCenter.x;
            water.position.z = waveCenter.z;
            waveUniforms.oceanWaveCenter.value.set(waveCenter.x, waveCenter.z);
          }
          elapsed += Number.isFinite(delta) ? Math.max(0, delta) : 0;
          waveUniforms.oceanWaveTime.value = elapsed;
          const uniforms = water.material.uniforms;
          uniforms.time.value += delta * playbackSpeed;
          uniforms.distortionScale.value = waveDistortion * opacityScale;
          uniforms.waveNormalStrength.value = THREE.MathUtils.clamp(0.42 + waveDistortion * 0.13, 0.55, 0.95);
        },
        setWaveState(amplitude, frequency) {
          seaState = oceanWaveState(amplitude, frequency);
          waveUniforms.oceanWaveAmplitude.value = seaState.amplitude;
          waveUniforms.oceanWaveFrequency.value = seaState.frequency;
        },
        sampleHeight(x, z) {
          return sampleOceanHeight(x, z, elapsed, seaState, waveCenter);
        },
        setSunDirection(sun) {
          sunDirection.copy(sun).normalize();
          water.material.uniforms.sunDirection.value.copy(sunDirection);
        },
        setWaterColor(hex) {
          water.material.uniforms.waterColor.value.setHex(hex);
        },
        setSunColor(hex) {
          water.material.uniforms.sunColor.value.setHex(hex);
        },
        setWaveDistortion(v) {
          waveDistortion = v;
        },
        setPlaybackSpeed(v) {
          playbackSpeed = v;
        },
        setOpacityScale(v) {
          opacityScale = v;
        },
        setShallowTint(_shallowHex, deepHex) {
          water.material.uniforms.waterColor.value.setHex(deepHex ?? 0x0a3a58);
        },
        dispose() {
          geometry.dispose();
          water.material.dispose();
          normals?.dispose?.();
        },
      };

      resolve(api);
    }
  });
}
