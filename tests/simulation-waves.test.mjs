import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import * as THREE from 'three';
import { RAIN_PHYSICS } from '../src/helpers/rainWeather.js';

const source = readFileSync(new URL('../src/App.vue', import.meta.url), 'utf8').replace(/\r\n/g, '\n');
function appFunction(name) {
  const start = source.indexOf(`function ${name}(`);
  assert.ok(start >= 0, `${name} must exist`);
  const end = source.indexOf('\n}', start);
  assert.ok(end > start);
  return source.slice(start, end + 2);
}

function simulation() {
  const surface = {};
  const context = {
    THREE, RAIN_PHYSICS,
    console: { log() {} },
    physics: { value: {} }, stats: { value: { state: 'NORMAL' } },
    selectedBoatType: { value: 'medium' }, activeBoatModelFile: { value: '' },
    activeMission: { value: null }, activeScreen: { value: 'simulation' },
    stormMode: { value: false }, wind: { value: { speed: 0.1 } },
    simulationWeatherPreset: { value: 'day' },
    difficultyLevel: { value: 'Easy' }, trawlNetCapacity: { value: 30 },
    isSinking: false, sinkingTimer: 0, calmWeatherSnapshot: null,
    environmentPreset: 'day',
    ocean: {
      setWaveState(amplitude, frequency) { surface.amplitude = amplitude; surface.frequency = frequency; },
      setWaveDistortion(value) { surface.distortion = value; },
      setPlaybackSpeed(value) { surface.speed = value; },
    },
    persistStudentBoat() {}, startQuickSailWithBoat() {},
    performanceManager: { isActive: false, cancelMission() {} },
    spawnFishPopulationIfNeeded() {}, showWeatherNotice() {}, showAchievement() {},
    applyEnvironmentPreset(preset) {
      context.environmentPreset = preset;
      context.onWaterParamChange();
    },
    rainWeatherSystem: { setActive(active) { context.rainActive = active; } },
    isMenuBackdropScreen() { return false; },
  };
  vm.createContext(context);
  for (const name of ['BOAT_TYPES', 'LEVEL_WEATHER_PROFILES']) {
    const start = source.indexOf(`const ${name} = {`);
    const end = source.indexOf('\n};', start);
    assert.ok(start >= 0 && end > start);
    vm.runInContext(source.slice(start, end + 3), context);
  }
  for (const name of [
    'applyBoatWavePhysics', 'applyBoatTypePhysics', 'chooseBoatAndSail',
    'applyDifficultyEffects', 'applyLevelWeather', 'applySimulationWeather', 'onWaterParamChange', 'toggleStormMode',
  ]) vm.runInContext(appFunction(name), context);
  return { context, waves: () => ({
    amplitude: context.physics.value.waveAmplitude,
    frequency: context.physics.value.waveFrequency,
    phase: context.physics.value.wavePhaseOffset,
    ...surface,
  }) };
}

for (const type of ['small', 'medium', 'large']) {
    test(`${type} mission/review weather progresses from clear to cloudy daylight to rainy night`, () => {
      const { context, waves } = simulation();
      context.chooseBoatAndSail(type);
      const quickSail = waves();
      context.toggleStormMode();
      context.applyBoatTypePhysics(type);
      let previous = null;
      for (const [difficulty, level, preset, rain] of [
        ['Beginner', 'Easy', 'day', false],
        ['Intermediate', 'Normal', 'cloudy', false],
        ['Advanced', 'Hard', 'rain', true],
      ]) {
        context.activeMission.value = { boatType: type, difficulty };
        context.difficultyLevel.value = level;
        context.applyDifficultyEffects();
        // Missions and practice review finish startup through the same weather hook.
        context.applyLevelWeather({ difficulty: 'Beginner' });
        const currentWaves = waves();
        const current = { ...currentWaves, wind: context.wind.value.speed };
        assert.equal(context.environmentPreset, preset);
        assert.equal(context.rainActive, rain);
        if (!previous) assert.deepEqual(waves(), quickSail, 'Beginner retains Set Sail waves');
        else {
          assert.ok(current.amplitude > previous.amplitude, 'waves must get taller with difficulty');
          assert.ok(current.frequency > previous.frequency, 'sea motion must grow with difficulty');
          assert.ok(current.wind > previous.wind, 'wind must get stronger with difficulty');
        }
        context.applyLevelWeather({});
        assert.deepEqual(waves(), currentWaves, 'reapplying the mission profile must be stable');
        context.applyBoatTypePhysics(type);
        context.applySimulationWeather();
        assert.equal(context.environmentPreset, preset, 'weather survives a boat reload');
        assert.equal(waves().amplitude, current.amplitude);
        previous = current;
      }
      context.activeMission.value = { difficulty: 'Beginner' };
      context.applyLevelWeather({});
      assert.deepEqual(waves(), quickSail, 'a new Beginner mission clears previous rough weather');
    });
}

test('difficulty changes preserve manually configured wave settings', () => {
  const { context, waves } = simulation();
  context.chooseBoatAndSail('medium');
  context.physics.value.waveAmplitude = 0.4;
  context.physics.value.waveFrequency = 0.7;
  context.onWaterParamChange();
  const before = waves();
  for (const level of ['Easy', 'Normal', 'Hard']) {
    context.difficultyLevel.value = level;
    context.applyDifficultyEffects();
    assert.deepEqual(waves(), before);
  }
});

test('changing vessel size leaves the same large ocean waves in Advanced weather', () => {
  const { context, waves } = simulation();
  context.applyLevelWeather({ difficulty: 'Advanced' });
  const roughSea = waves();
  assert.ok(roughSea.amplitude >= 3.2);
  for (const type of ['small', 'medium', 'large']) {
    context.applyBoatTypePhysics(type);
    assert.equal(waves().amplitude, roughSea.amplitude, 'vessel stability must not flatten the ocean');
    assert.equal(waves().frequency, roughSea.frequency);
  }
});

test('clearing mission rain restores the selected boat waves and ocean animation', () => {
  const { context, waves } = simulation();
  context.chooseBoatAndSail('large');
  const calm = waves();
  context.activeMission.value = { difficulty: 'Advanced' };
  context.applyLevelWeather({});
  assert.ok(waves().amplitude >= RAIN_PHYSICS.waveAmplitude);
  context.toggleStormMode();
  assert.deepEqual(waves(), calm);
});

test('temporarily enabling rain restores Intermediate clouds, wind and waves when switched off', () => {
  const { context, waves } = simulation();
  context.applyLevelWeather({ difficulty: ' intermediate ' });
  const before = waves();
  const windBefore = context.wind.value.speed;
  context.toggleStormMode();
  assert.equal(context.environmentPreset, 'rain');
  assert.equal(context.rainActive, true);
  context.toggleStormMode();
  assert.equal(context.environmentPreset, 'cloudy');
  assert.equal(context.rainActive, false);
  assert.equal(context.wind.value.speed, windBefore);
  assert.deepEqual(waves(), before);
});

test('Set Sail clears the previous mission difficulty weather', async () => {
  const { context, waves } = simulation();
  context.chooseBoatAndSail('medium');
  const calm = waves();
  context.applyLevelWeather({ difficulty: 'Advanced' });
  Object.assign(context, {
    isQuickSailMode: { value: false }, showCinematicLoading: { value: false }, loadingHint: { value: '' },
    archipelagoLoadPromise: Promise.resolve(), scene: null, boatObject: null,
    goToScreen() {}, async syncWorldForSimulation() { context.applySimulationWeather(); },
  });
  vm.runInContext(appFunction('startQuickSailWithBoat'), context);
  context.startQuickSailWithBoat();
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(context.environmentPreset, 'day');
  assert.equal(context.stormMode.value, false);
  assert.equal(context.rainActive, false);
  assert.equal(context.wind.value.speed, 0.1);
  assert.deepEqual(waves(), calm);
});
