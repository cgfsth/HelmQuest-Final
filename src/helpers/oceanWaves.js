import * as THREE from 'three';

// Crossed swells with curved, locally varying crests instead of parallel sine-wave rows.
// The CPU sampler and water shader share the same phases and modulation.
const SWELLS = [
  { x: 0.8, z: 0.6, length: 24.7, weight: 0.26, phase: 0.37 },
  { x: -0.28, z: 0.96, length: 37.9, weight: 0.23, phase: 1.93 },
  { x: 0.6, z: -0.8, length: 53.3, weight: 0.2, phase: 4.61 },
  { x: -0.8, z: 0.6, length: 71.8, weight: 0.18, phase: 2.71 },
  { x: 0.96, z: 0.28, length: 94.5, weight: 0.13, phase: 5.29 },
];
const FADE_NEAR = 450;
const FADE_FAR = 1000;

export function oceanWaveState(amplitude = 0.85, frequency = 1.2) {
  return {
    amplitude: Number.isFinite(amplitude) ? THREE.MathUtils.clamp(amplitude, 0, 4) : 0,
    frequency: Number.isFinite(frequency) ? THREE.MathUtils.clamp(frequency, 0, 5) / 1.2 : 1,
  };
}

export function sampleOceanHeight(x, z, time, state, center = { x: 0, z: 0 }) {
  const distance = Math.hypot(x - center.x, z - center.z);
  const fade = 1 - THREE.MathUtils.smoothstep(distance, FADE_NEAR, FADE_FAR);
  if (fade === 0 || state.amplitude === 0) return 0;
  let height = 0;
  const waveTime = time * state.frequency;
  for (const swell of SWELLS) {
    const k = 2 * Math.PI / swell.length;
    const omega = Math.sqrt(9.81 * k);
    const cross = -swell.z * x + swell.x * z;
    const warp = k / 2.4 * cross - omega * 0.19 * waveTime + swell.phase * 0.73;
    const patch = k / 3.7 * (swell.x * x + swell.z * z) - omega * 0.11 * waveTime + swell.phase * 2.1;
    const phase = k * (swell.x * x + swell.z * z) - omega * waveTime + swell.phase + 1.3 * Math.sin(warp);
    height += Math.sin(phase) * swell.weight * (0.85 + 0.15 * Math.sin(patch));
  }
  return height * state.amplitude * fade;
}

/** Keep dense vertices around the camera, with a sparse outer ocean to the horizon. */
export function createOceanGeometry(halfExtent, segments = 320) {
  const geometry = new THREE.PlaneGeometry(2, 2, segments, segments);
  const positions = geometry.attributes.position;
  const spread = value => {
    const distance = Math.abs(value);
    if (distance <= 0.8) return value * 750;
    const outer = (distance - 0.8) / 0.2;
    return Math.sign(value) * (600 + 256 * outer + (halfExtent - 856) * outer ** 3);
  };
  for (let i = 0; i < positions.count; i++) {
    positions.setXY(i, spread(positions.getX(i)), spread(positions.getY(i)));
  }
  positions.needsUpdate = true;
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  return geometry;
}

/** Sample along the boat's actual heading: local X is the hull's long axis. */
export function sampleBoatWaveMotion(x, z, yaw, length, sampleHeight) {
  if (length >= 120) {
    // A long hull spans several crests; its buoyancy follows the average water level.
    const forwardX = Math.cos(yaw), forwardZ = -Math.sin(yaw);
    const sideX = Math.sin(yaw), sideZ = Math.cos(yaw);
    const halfBeam = length * 0.08;
    let portSum = 0, starboardSum = 0, centerSum = 0;
    let sternHeight = 0, bowHeight = 0;
    for (let i = 0; i < 7; i++) {
      const distance = (i - 3) * length * 0.14;
      const px = x + forwardX * distance, pz = z + forwardZ * distance;
      const port = sampleHeight(px - sideX * halfBeam, pz - sideZ * halfBeam);
      const center = sampleHeight(px, pz);
      const starboard = sampleHeight(px + sideX * halfBeam, pz + sideZ * halfBeam);
      portSum += port;
      centerSum += center;
      starboardSum += starboard;
      if (i === 0) sternHeight = (port + center + starboard) / 3;
      if (i === 6) bowHeight = (port + center + starboard) / 3;
    }
    return {
      height: (portSum + centerSum + starboardSum) / 21,
      rotationX: -Math.atan((starboardSum - portSum) / (7 * 2 * halfBeam)),
      rotationZ: Math.atan((bowHeight - sternHeight) / (length * 0.84)),
    };
  }
  const along = Math.max(2, length * 0.15);
  const across = Math.max(1, length * 0.045);
  const forwardX = Math.cos(yaw), forwardZ = -Math.sin(yaw);
  const sideX = Math.sin(yaw), sideZ = Math.cos(yaw);
  const alongSlope = (sampleHeight(x + forwardX * along, z + forwardZ * along)
    - sampleHeight(x - forwardX * along, z - forwardZ * along)) / (2 * along);
  const acrossSlope = (sampleHeight(x + sideX * across, z + sideZ * across)
    - sampleHeight(x - sideX * across, z - sideZ * across)) / (2 * across);
  return { height: sampleHeight(x, z), rotationX: -Math.atan(acrossSlope), rotationZ: Math.atan(alongSlope) };
}

export function getBoatWaveResponse(length) {
  const large = length >= 120;
  return {
    maxTilt: THREE.MathUtils.degToRad(large ? 1 : 3.5),
    blend: 0.08 / THREE.MathUtils.clamp(length / 60, 0.65, 3),
    heaveBlend: large ? 0.04 : 1,
  };
}

const glsl = value => Number(value).toFixed(9);
export const OCEAN_WAVE_GLSL = `
uniform float oceanWaveTime;
uniform float oceanWaveAmplitude;
uniform float oceanWaveFrequency;
uniform vec2 oceanWaveCenter;
vec3 oceanSwell(vec2 point) {
  float distanceToCenter = length(point - oceanWaveCenter);
  float fade = 1.0 - smoothstep(${glsl(FADE_NEAR)}, ${glsl(FADE_FAR)}, distanceToCenter);
  if (fade == 0.0 || oceanWaveAmplitude == 0.0) return vec3(0.0);
  vec3 swell = vec3(0.0);
  ${SWELLS.map(wave => {
    const k = 2 * Math.PI / wave.length;
    return `{
      vec2 direction = vec2(${glsl(wave.x)}, ${glsl(wave.z)});
      vec2 crossDirection = vec2(-direction.y, direction.x);
      float waveTime = oceanWaveTime * oceanWaveFrequency;
      float warp = ${glsl(k / 2.4)} * dot(crossDirection, point) - ${glsl(Math.sqrt(9.81 * k) * 0.19)} * waveTime + ${glsl(wave.phase * 0.73)};
      float envelopePhase = ${glsl(k / 3.7)} * dot(direction, point) - ${glsl(Math.sqrt(9.81 * k) * 0.11)} * waveTime + ${glsl(wave.phase * 2.1)};
      float phase = ${glsl(k)} * dot(direction, point) - ${glsl(Math.sqrt(9.81 * k))} * waveTime + ${glsl(wave.phase)} + 1.3 * sin(warp);
      float envelope = 0.85 + 0.15 * sin(envelopePhase);
      vec2 phaseGradient = ${glsl(k)} * direction + ${glsl(1.3 * k / 2.4)} * cos(warp) * crossDirection;
      vec2 envelopeGradient = ${glsl(0.15 * k / 3.7)} * cos(envelopePhase) * direction;
      swell.x += ${glsl(wave.weight)} * envelope * sin(phase);
      swell.yz += ${glsl(wave.weight)} * (envelope * cos(phase) * phaseGradient + sin(phase) * envelopeGradient);
    }`;
  }).join('\n')}
  return swell * oceanWaveAmplitude * fade;
}
`;
