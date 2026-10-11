import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import * as THREE from 'three';
import { advanceBoatSpeed, knotsToMetersPerSecond, metersPerSecondToKnots } from '../src/helpers/boatPropulsion.js';
import { getRainPhysicsModifiers } from '../src/helpers/rainWeather.js';

const source = readFileSync(new URL('../src/App.vue', import.meta.url), 'utf8').replace(/\r\n/g, '\n');
function appFunction(name) {
  const start = source.indexOf(`function ${name}(`);
  assert.ok(start >= 0);
  return source.slice(start, source.indexOf('\n}', start) + 2);
}
function simulation(type, mode = 'mission') {
  const context = {
    THREE, advanceBoatSpeed, knotsToMetersPerSecond, metersPerSecondToKnots, getRainPhysicsModifiers,
    console: { log() {} }, simulationRunning: { value: true }, boatObject: new THREE.Group(),
    speedVel: 0, speedRot: 0, angularVelocity: 0, turnRadius: 0, turnTilt: 0,
    isSinking: false, sinkingTimer: 0, isStopping: false, baselineWaterlineY: 0,
    physics: { value: { waveAmplitude: .85, waveFrequency: 1.2, wavePhaseOffset: 0, windForce: .05 } }, stats: { value: { state: 'NORMAL' } }, selectedBoatType: { value: 'medium' },
    activeBoatModelFile: { value: '' }, activeTrainingModule: { value: null }, isTrainingReviewMode: { value: false },
    trainingRunMetrics: { value: {} }, stormMode: { value: false }, wind: { value: { speed: 0, directionAngle: 90 } },
    keyStates: { KeyW: true }, engineRunning: { value: true }, engineStarting: { value: false },
    anchor: { value: {} }, boatAnchorRig: null, isAnchorRigEngaged: () => false,
    trawlNetState: { value: 'STOWED' }, fishingLineActive: { value: false }, anchorWarning: { value: false },
    collisionWarning: { value: '' }, audioPlayer: { value: null }, musicPlaying: { value: false },
    _boatForward: new THREE.Vector3(), _boatRight: new THREE.Vector3(),
    restoreFiniteBoatTransform() {}, checkAndResolveCollisions: () => ({ blocked: false }),
    getBoatWaveMotion: () => ({ maxTilt: .1, rotationX: 0, rotationZ: 0, blend: .08, height: 0, heaveBlend: 1 }),
    syncCompassVisualHeading() {}, updateTrainingRunMetrics() {}, checkTrainingStep() {}, trackSteeringInput() {}, updateFishingTime() {},
    applyBoatWavePhysics() {}, onWaterParamChange() {}, persistStudentBoat() {},
    startQuickSailWithBoat() { context.activeTrainingModule.value = null; }, setTimeout() {},
    syncStatsBoatXZ() { context.stats.value.boatX = context.boatObject.position.x; context.stats.value.boatZ = context.boatObject.position.z; },
  };
  vm.createContext(context);
  const start = source.indexOf('const BOAT_TYPES = {');
  vm.runInContext(source.slice(start, source.indexOf('\n};', start) + 3) + '\nglobalThis.profiles = BOAT_TYPES;', context);
  for (const name of ['applyBoatTypePhysics', 'chooseBoatAndSail', 'boatHeadingDegrees', 'updateBoatPhysics']) vm.runInContext(appFunction(name), context);
  if (mode === 'Set Sail') context.chooseBoatAndSail(type);
  else { context.applyBoatTypePhysics(type); context.activeTrainingModule.value = { steps: [] }; }
  return context;
}
function run(context, seconds, fps = 60) {
  for (let frame = 0; frame < Math.round(seconds * fps); frame++) context.updateBoatPhysics(1 / fps);
  return { speed: context.stats.value.speedKnots, x: context.boatObject.position.x, heading: context.boatObject.rotation.y };
}

test('one knot converts to exactly 1852 metres per hour', () => {
  assert.ok(Math.abs(knotsToMetersPerSecond(1) * 3600 - 1852) < 1e-9);
  assert.equal(metersPerSecondToKnots(knotsToMetersPerSecond(16)), 16);
});

for (const [type, limit] of [['small', 60], ['medium', 50], ['large', 55]]) {
  test(`${type} accelerates gradually to its ${limit}-knot limit in missions and Set Sail at 30, 60 and 144 FPS`, () => {
    const results = [];
    for (const mode of ['mission', 'Set Sail']) {
      for (const fps of [30, 60, 144]) {
        const context = simulation(type, mode), profile = context.profiles[type];
        const at90 = run(context, profile.accelerationTimeTo90, fps);
        assert.ok(Math.abs(at90.speed - limit * .9) < .001, `${mode}/${fps} FPS: ${at90.speed}`);
        results.push(at90);
        const cruise = run(context, profile.accelerationTimeTo90 * 4, fps);
        assert.ok(cruise.speed > limit * .999 && cruise.speed <= limit);
        const previousX = cruise.x;
        run(context, 1, fps);
        assert.ok(Math.abs(context.boatObject.position.x - previousX - knotsToMetersPerSecond(limit)) < .002,
          `actual metres travelled must match the knot readout: ${context.boatObject.position.x - previousX} m, ${context.stats.value.speedKnots} kn, yaw ${context.boatObject.rotation.y}`);
      }
    }
    // Position uses each frame's ending velocity; allow half a frame of travel at the lowest FPS.
    const distanceTolerance = knotsToMetersPerSecond(limit) / 30 / 2;
    for (const result of results) assert.ok(Math.abs(result.x - results[0].x) < distanceTolerance,
      `distance is consistent across FPS and launch modes: ${result.x} vs ${results[0].x}`);
  });

  test(`${type} coasts after releasing throttle or stopping the engine and brakes before reversing`, () => {
    const context = simulation(type), profile = context.profiles[type];
    run(context, profile.accelerationTimeTo90);
    const previousSpeed = context.speedVel, previousX = context.boatObject.position.x;
    context.keyStates.KeyW = false;
    run(context, 1);
    assert.ok(context.speedVel > 0 && context.speedVel < previousSpeed && context.boatObject.position.x > previousX,
      `speed ${previousSpeed} -> ${context.speedVel}, x ${previousX} -> ${context.boatObject.position.x}, yaw ${context.boatObject.rotation.y}`);
    context.engineRunning.value = false;
    const coastingSpeed = context.speedVel;
    run(context, 1);
    assert.ok(context.speedVel > 0 && context.speedVel < coastingSpeed, 'engine-off keeps hull momentum');
    context.engineRunning.value = true;
    context.keyStates.KeyS = true;
    run(context, .1);
    assert.ok(context.speedVel > 0, 'astern command cannot instantly reverse a moving vessel');
    const reverse = run(context, 10 + profile.reverseTimeTo90 * 4);
    assert.ok(reverse.speed < -profile.maxReverseKnots * .99 && reverse.speed >= -profile.maxReverseKnots);
  });
}

test('full-speed boats enter reverse promptly and build astern speed consistently across frame rates and launch modes', () => {
  const reverseOnsets = [];
  for (const [type, latestReverse, latest90] of [['small', 2.6, 3.8], ['medium', 3.1, 4.7], ['large', 4.1, 6.3]]) {
    const results = [];
    for (const mode of ['mission', 'Set Sail']) {
      for (const fps of [30, 60, 144]) {
        const context = simulation(type, mode), profile = context.profiles[type];
        context.speedVel = knotsToMetersPerSecond(profile.maxSpeedKnots);
        context.keyStates.KeyW = false;
        context.keyStates.KeyS = true;
        let onset = null;
        for (let frame = 1; frame <= Math.ceil(latest90 * fps); frame++) {
          context.updateBoatPhysics(1 / fps);
          if (onset === null && context.speedVel < 0) onset = frame / fps;
        }
        assert.ok(onset > 0 && onset <= latestReverse, `${type}/${mode}/${fps} FPS: reverse after ${onset} s`);
        assert.ok(context.stats.value.speedKnots <= -profile.maxReverseKnots * .9,
          `${type}/${mode}/${fps} FPS: astern speed ${context.stats.value.speedKnots} kn after ${latest90} s`);
        assert.ok(context.stats.value.speedKnots >= -profile.maxReverseKnots, 'reverse speed remains capped');
        results.push(onset);
      }
    }
    assert.ok(Math.max(...results) - Math.min(...results) <= 1 / 30, `${type}: reversal timing varies with FPS`);
    reverseOnsets.push(results[0]);
  }
  assert.ok(reverseOnsets[0] < reverseOnsets[1] && reverseOnsets[1] < reverseOnsets[2],
    'larger hulls still take longer to stop before reversing');
});

test('boosted turning works in both directions across frame rates while larger vessels keep more momentum', () => {
  const turns = [], retainedSpeed = [];
  for (const [type, turnRate] of [['small', 24], ['medium', 14], ['large', 8]]) {
    for (const mode of ['mission', 'Set Sail']) {
      for (const fps of [30, 60, 144]) {
        for (const [key, direction] of [['KeyA', 1], ['KeyD', -1]]) {
          const context = simulation(type, mode), profile = context.profiles[type];
          context.speedVel = knotsToMetersPerSecond(profile.maxSpeedKnots);
          context.keyStates[key] = true;
          const actualTurn = THREE.MathUtils.radToDeg(run(context, 10, fps).heading);
          assert.ok(Math.abs(actualTurn - direction * turnRate * 10) < .001,
            `${type}/${mode}/${fps} FPS/${key}: ${actualTurn} degrees`);
        }
      }
    }
    const context = simulation(type), profile = context.profiles[type];
    context.speedVel = knotsToMetersPerSecond(profile.maxSpeedKnots);
    context.keyStates.KeyA = true;
    turns.push(run(context, 10).heading);
    context.keyStates.KeyA = false;
    context.keyStates.KeyW = false;
    retainedSpeed.push(run(context, 10).speed / profile.maxSpeedKnots);
  }
  assert.ok(turns[0] > turns[1] && turns[1] > turns[2]);
  assert.ok(retainedSpeed[0] < retainedSpeed[1] && retainedSpeed[1] < retainedSpeed[2]);
});

test('stormy water reduces reachable cruise speed without letting any hull exceed its limit', () => {
  for (const type of ['small', 'medium', 'large']) {
    const context = simulation(type), profile = context.profiles[type];
    context.stormMode.value = true;
    const result = run(context, profile.accelerationTimeTo90 * 6);
    const weather = getRainPhysicsModifiers(true);
    const expected = profile.maxSpeedKnots * Math.sqrt(weather.thrustScale / weather.dragScale);
    assert.ok(Math.abs(result.speed - expected) < .01);
  }
});

test('anchor and deployed fishing gear hold the hull while engine-off throttle cannot launch it', () => {
  for (const state of ['anchor', 'net', 'line', 'engine']) {
    const context = simulation('large');
    if (state === 'anchor') context.anchor.value.deployed = true;
    if (state === 'net') context.trawlNetState.value = 'ACTIVE';
    if (state === 'line') context.fishingLineActive.value = true;
    if (state === 'engine') context.engineRunning.value = false;
    run(context, 2);
    assert.equal(context.speedVel, 0);
    assert.equal(context.boatObject.position.x, 0);
    assert.equal(context.stats.value.speedKnots, 0);
  }
});
