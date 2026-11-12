import { advanceBoatSpeed, metersPerSecondToKnots } from '../helpers/boatPropulsion.js';
import { advanceBoatSteering } from '../helpers/boatMotion.js';
import { oceanWaveState, sampleOceanHeight, sampleBoatWaveMotion } from '../helpers/oceanWaves.js';
import assets from '../helpers/optimizedModelManifest.js';

export const PROTOTYPE_ASSETS = { vessel: assets['/assets/SmallBoat.glb'], harbor: assets['/assets/seaside_wharf.glb'] };
export const PRESETS = { low: { ratio: 1, segments: 32, reflection: 128, shadow: 0 }, medium: { ratio: 1.25, segments: 64, reflection: 256, shadow: 512 }, high: { ratio: 1.5, segments: 96, reflection: 512, shadow: 1024 } };
const profile = { maxSpeedKnots: 60, maxReverseKnots: 3, accelerationTimeTo90: 2, reverseTimeTo90: 1.2, coastTimeConstant: 12, brakingDeceleration: 12.4 };
export function createPrototypeState() {
  return { x: -90, z: 60, yaw: 0, yawRate: 0, speed: 0, engineRunning: false, anchored: false, paused: false, bridge: false, time: 0, waves: .7, collisions: 0, height: 0, rotationX: 0, rotationZ: 0, mission: null };
}
export function stepPrototype(state, keys, delta, collision) {
  if (state.paused) return;
  const dt = Math.min(.1, Math.max(0, delta)); state.time += dt;
  state.speed = state.anchored ? 0 : advanceBoatSpeed(state.speed, { engineRunning: state.engineRunning, forward: keys.KeyW, reverse: keys.KeyS }, dt, profile);
  const steering = (Number(!!keys.KeyA) - Number(!!keys.KeyD)) * 24 * Math.PI / 180 * Math.min(1, Math.abs(state.speed) / 5);
  const turn = advanceBoatSteering(state.yawRate, steering, dt, 18); state.yawRate = turn.rate;
  if (!state.anchored) state.yaw += turn.angle;
  const x = state.x + Math.cos(state.yaw) * state.speed * dt, z = state.z - Math.sin(state.yaw) * state.speed * dt;
  if (collision?.(x, z)) { state.speed *= -.1; state.collisions++; } else { state.x = x; state.z = z; }
  const wave = oceanWaveState(state.waves, 1.2);
  Object.assign(state, sampleBoatWaveMotion(state.x, state.z, state.yaw, 18, (x, z) => sampleOceanHeight(x, z, state.time, wave)));
  state.speedKnots = metersPerSecondToKnots(state.speed);
}
export function makeMeasurements(engine, quality) {
  const frames = []; let last = 0;
  return { engine, quality, startedAt: performance.now(), loadMs: null, assets: {},
    frame(now) { if (last && now > last) { frames.push(now - last); if (frames.length > 600) frames.shift(); } last = now; },
    resetFrameClock() { last = 0; },
    snapshot() { const sorted = [...frames].sort((a, b) => a - b), avg = frames.reduce((a, b) => a + b, 0) / (frames.length || 1); return { engine, quality, loadMs: this.loadMs, frames: frames.length, fps: avg ? 1000 / avg : null, p95FrameMs: sorted[Math.floor(sorted.length * .95)] || null, jsHeapBytes: performance.memory?.usedJSHeapSize ?? null, assets: this.assets, viewport: { width: innerWidth, height: innerHeight, dpr: devicePixelRatio }, rendererScope: 'Equivalent-asset prototype comparison; not a production feature-parity benchmark.' }; } };
}
