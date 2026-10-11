import * as THREE from 'three';
import { OCEAN_MAP_HALF_EXTENT } from './worldIslands.js';

/**
 * Shore foam + shallow-water tint overlay sampled from the terrain heightmap.
 */
export function createShorelineSystem(options = {}) {
  const {
    heightmapTexture,
    terrainWidth = 46000,
    terrainHeight = 60000,
    minElevation = -37,
    maxElevation = 2941,
    waterLevel = 0,
  } = options;

  const extent = OCEAN_MAP_HALF_EXTENT * 2;
  const geometry = new THREE.PlaneGeometry(extent, extent, 1, 1);
  geometry.rotateX(-Math.PI / 2);

  const uniforms = {
    tHeightmap: { value: heightmapTexture },
    time: { value: 0 },
    waterLevel: { value: waterLevel },
    minElevation: { value: minElevation },
    maxElevation: { value: maxElevation },
    terrainSize: { value: new THREE.Vector2(terrainWidth, terrainHeight) },
    shallowColor: { value: new THREE.Color(0x1a6a82) },
    deepColor: { value: new THREE.Color(0x0a3d5c) },
    foamColor: { value: new THREE.Color(0xe8f4ff) },
  };

  const material = new THREE.ShaderMaterial({
    uniforms,
    transparent: true,
    depthWrite: false,
    blending: THREE.NormalBlending,
    vertexShader: /* glsl */ `
      varying vec2 vWorldXZ;
      void main() {
        vec4 world = modelMatrix * vec4(position, 1.0);
        vWorldXZ = world.xz;
        gl_Position = projectionMatrix * viewMatrix * world;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform sampler2D tHeightmap;
      uniform float time;
      uniform float waterLevel;
      uniform float minElevation;
      uniform float maxElevation;
      uniform vec2 terrainSize;
      uniform vec3 shallowColor;
      uniform vec3 deepColor;
      uniform vec3 foamColor;

      varying vec2 vWorldXZ;

      float sampleElevation(vec2 xz) {
        vec2 uv = xz / terrainSize + 0.5;
        uv.y = 1.0 - uv.y;
        if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) return -100.0;
        float h = texture2D(tHeightmap, uv).r;
        return minElevation + h * (maxElevation - minElevation);
      }

      void main() {
        float elev = sampleElevation(vWorldXZ);
        if (elev > waterLevel + 2.0) discard;

        float depth = clamp(waterLevel - elev, 0.0, 12.0);
        float shallow = 1.0 - smoothstep(0.0, 8.0, depth);
        vec3 waterTint = mix(deepColor, shallowColor, shallow * 0.65);

        float shoreDist = clamp(elev - (waterLevel - 0.5), 0.0, 3.0);
        float foamMask = (1.0 - smoothstep(0.0, 3.0, shoreDist)) * step(elev, waterLevel + 1.5);

        float wave = sin(vWorldXZ.x * 0.08 + time * 1.6) * sin(vWorldXZ.y * 0.07 - time * 1.3);
        foamMask *= 0.55 + 0.45 * (wave * 0.5 + 0.5);

        vec3 color = mix(waterTint, foamColor, foamMask * 0.85);
        float alpha = shallow * 0.35 + foamMask * 0.75;
        if (alpha < 0.02) discard;
        gl_FragColor = vec4(color, alpha);
      }
    `,
  });

  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = 'ShorelineFoam';
  mesh.position.y = waterLevel + 0.35;
  mesh.renderOrder = 2;

  return {
    root: mesh,
    uniforms,
    update(delta) {
      uniforms.time.value += delta;
    },
    dispose() {
      geometry.dispose();
      material.dispose();
    },
  };
}
