import * as THREE from 'three';

/**
 * Elevation + slope blended terrain shader.
 * 0–10 m sand, 10–200 m grass, 200–600 m forest, 600+ rock, 1200+ mountain peaks.
 */
export function createTerrainMaterial(textures, options = {}) {
  const {
    detailNormal = null,
    waterLevel = 0,
    uvScale = 0.00035,
  } = options;

  const uniforms = {
    tSand: { value: textures.sand.map },
    tGrass: { value: textures.grass.map },
    tForest: { value: textures.forest.map },
    tRock: { value: textures.rock.map },
    tMountain: { value: textures.mountain.map },
    nSand: { value: textures.sand.normalMap },
    nGrass: { value: textures.grass.normalMap },
    nForest: { value: textures.forest.normalMap },
    nRock: { value: textures.rock.normalMap },
    nMountain: { value: textures.mountain.normalMap },
    tDetailNormal: { value: detailNormal },
    useDetailNormal: { value: detailNormal ? 1.0 : 0.0 },
    uvScale: { value: uvScale },
    waterLevel: { value: waterLevel },
    sunDirection: { value: new THREE.Vector3(0.4, 0.85, 0.2).normalize() },
    fogColor: { value: new THREE.Color(0xbfd4e6) },
    fogNear: { value: 5000 },
    fogFar: { value: 35000 },
  };

  const material = new THREE.ShaderMaterial({
    uniforms,
    vertexShader: /* glsl */ `
      uniform float uvScale;
      attribute float elevation;
      varying vec3 vWorldPos;
      varying vec3 vNormal;
      varying float vElevation;
      varying vec2 vUv;

      void main() {
        vElevation = elevation;
        vUv = position.xy * uvScale;
        vec4 world = modelMatrix * vec4(position, 1.0);
        vWorldPos = world.xyz;
        vNormal = normalize(mat3(modelMatrix) * normal);
        gl_Position = projectionMatrix * viewMatrix * world;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform sampler2D tSand, tGrass, tForest, tRock, tMountain;
      uniform sampler2D nSand, nGrass, nForest, nRock, nMountain;
      uniform sampler2D tDetailNormal;
      uniform float useDetailNormal;
      uniform float uvScale;
      uniform float waterLevel;
      uniform vec3 sunDirection;
      uniform vec3 fogColor;
      uniform float fogNear;
      uniform float fogFar;

      varying vec3 vWorldPos;
      varying vec3 vNormal;
      varying float vElevation;
      varying vec2 vUv;

      vec3 sampleLayer(sampler2D map, sampler2D nmap, vec2 uv) {
        return texture2D(map, uv).rgb;
      }

      vec3 sampleNormal(sampler2D nmap, vec2 uv, vec3 baseNormal) {
        vec3 tn = texture2D(nmap, uv).xyz * 2.0 - 1.0;
        vec3 up = abs(baseNormal.y) > 0.99 ? vec3(1.0, 0.0, 0.0) : vec3(0.0, 1.0, 0.0);
        vec3 tangent = normalize(cross(up, baseNormal));
        vec3 bitangent = cross(baseNormal, tangent);
        mat3 tbn = mat3(tangent, bitangent, baseNormal);
        return normalize(tbn * tn);
      }

      float smoothBand(float e, float low, float high) {
        float a = smoothstep(low - 8.0, low + 8.0, e);
        float b = 1.0 - smoothstep(high - 12.0, high + 12.0, e);
        return a * b;
      }

      void main() {
        if (vElevation < waterLevel - 0.5) discard;

        vec2 uv = vWorldPos.xz * uvScale;
        float slope = 1.0 - clamp(vNormal.y, 0.0, 1.0);

        float wSand = smoothBand(vElevation, 0.0, 10.0);
        float wGrass = smoothBand(vElevation, 10.0, 200.0);
        float wForest = smoothBand(vElevation, 200.0, 600.0);
        float wRock = smoothstep(580.0, 720.0, vElevation);
        float wMountain = smoothstep(1100.0, 1400.0, vElevation);
        float wSlopeRock = smoothstep(0.35, 0.65, slope);

        vec3 cSand = sampleLayer(tSand, nSand, uv);
        vec3 cGrass = sampleLayer(tGrass, nGrass, uv);
        vec3 cForest = sampleLayer(tForest, nForest, uv);
        vec3 cRock = sampleLayer(tRock, nRock, uv);
        vec3 cMountain = sampleLayer(tMountain, nMountain, uv);

        vec3 color = vec3(0.0);
        color += cSand * wSand;
        color += cGrass * wGrass;
        color += cForest * wForest;
        color += cRock * max(wRock, wSlopeRock * 0.85);
        color += cMountain * wMountain;

        float totalW = wSand + wGrass + wForest + max(wRock, wSlopeRock * 0.85) + wMountain;
        if (totalW < 0.01) color = cGrass;
        else color /= max(totalW, 0.001);

        // Wet sand / shoreline (0–3 m above water)
        float shore = 1.0 - smoothstep(waterLevel, waterLevel + 3.0, vElevation);
        color = mix(color, cSand * vec3(0.72, 0.68, 0.58), shore * 0.55);

        vec3 n = normalize(vNormal);
        n = sampleNormal(nSand, uv, n);
        if (useDetailNormal > 0.5) {
          vec3 detail = texture2D(tDetailNormal, vWorldPos.xz * 0.00008 + 0.5).xyz * 2.0 - 1.0;
          n = normalize(n + detail * 0.35);
        }

        vec3 lightDir = normalize(sunDirection);
        float ndl = max(dot(n, lightDir), 0.0);
        vec3 ambient = color * 0.38;
        vec3 diffuse = color * ndl * 0.62;
        vec3 viewDir = normalize(cameraPosition - vWorldPos);
        vec3 halfDir = normalize(lightDir + viewDir);
        float spec = pow(max(dot(n, halfDir), 0.0), 32.0) * 0.04;
        vec3 lit = ambient + diffuse + vec3(spec);

        float dist = length(vWorldPos - cameraPosition);
        float fogFactor = smoothstep(fogNear, fogFar, dist);
        lit = mix(lit, fogColor, fogFactor);

        gl_FragColor = vec4(lit, 1.0);
      }
    `,
    lights: false,
    fog: false,
    side: THREE.FrontSide,
  });

  return material;
}

export function updateTerrainSun(material, sunDirection) {
  if (material?.uniforms?.sunDirection && sunDirection) {
    material.uniforms.sunDirection.value.copy(sunDirection).normalize();
  }
}

export function updateTerrainFog(material, scene) {
  if (!material?.uniforms || !scene?.fog) return;
  material.uniforms.fogColor.value.copy(scene.fog.color);
  if (scene.fog.isFog) {
    material.uniforms.fogNear.value = scene.fog.near;
    material.uniforms.fogFar.value = scene.fog.far;
  } else if (scene.fog.isFogExp2) {
    material.uniforms.fogNear.value = 2000;
    material.uniforms.fogFar.value = 40000;
  }
}
