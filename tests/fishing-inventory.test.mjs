import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { ref, computed } from 'vue';
import * as THREE from 'three';
import { createFishingLineSystem, FishingState } from '../src/helpers/fishingLine.js';
import { FISHING_SPOTS } from '../src/helpers/fishingSpots.js';
import { FISH_DATA } from '../src/helpers/fishData.js';

const appSource = readFileSync(new URL('../src/App.vue', import.meta.url), 'utf8').replace(/\r\n/g, '\n');
const modalSource = readFileSync(new URL('../src/components/InventoryModal.vue', import.meta.url), 'utf8');

function appFunction(name) {
  const start = appSource.indexOf(`function ${name}(`);
  assert.ok(start >= 0);
  return appSource.slice(start, appSource.indexOf('\n}', start) + 2);
}

function fishingSession(t, training = false) {
  const previousWindow = globalThis.window;
  globalThis.window = {}; // No database, global inventory, or persistence helpers.
  t.after(() => {
    if (previousWindow === undefined) delete globalThis.window;
    else globalThis.window = previousWindow;
  });
  t.mock.method(Math, 'random', () => 0);

  const boat = new THREE.Group();
  boat.position.set(FISHING_SPOTS[0].x, 0, FISHING_SPOTS[0].z);
  boat.userData.loaMeters = 18;
  const provided = new Map();
  const notifications = [], trainingEvents = [];
  const context = {
    ref, createFishingLineSystem, FishingState, window: globalThis.window,
    scene: new THREE.Scene(), boatObject: boat, fishingLineSystem: null,
    fishingSpotMarkers: new THREE.Group(), getWaterSurfaceY: () => 0,
    fishingLineActive: ref(false), fishingFishCount: ref(0),
    activeTrainingModule: ref(training ? { id: 'fishing-training' } : null),
    trainingRunMetrics: ref({}), stats: ref({ boatX: boat.position.x, boatZ: boat.position.z }),
    provide: (key, value) => provided.set(key, value),
    showFishingToast: message => notifications.push(message),
    trackFishingActivity: (metrics, successful) => trainingEvents.push(successful),
    getNearestFishingSpot: () => null,
  };
  vm.createContext(context);
  const stateStart = appSource.indexOf('// Fish Inventory State');
  vm.runInContext(appSource.slice(stateStart, appSource.indexOf('// Map overlay state', stateStart)), context);
  const provideStart = appSource.indexOf("provide('inventoryVisible', inventoryVisible);");
  vm.runInContext(appSource.slice(provideStart, appSource.indexOf('\n\n', provideStart)), context);
  for (const name of ['syncFishingUiState', 'initFishingLineSystem']) {
    vm.runInContext(appFunction(name), context);
  }
  context.initFishingLineSystem();
  t.after(() => context.fishingLineSystem.dispose());

  const modalContext = { ref, computed, inject: key => provided.get(key), window: globalThis.window };
  vm.createContext(modalContext);
  const modalScript = modalSource.split('<script setup>')[1].split('</script>')[0].replace(/^import .*;\r?\n/gm, '');
  vm.runInContext(modalScript, modalContext);
  const modal = vm.runInContext('({ totalFish, uniqueSpecies, sortedGroups })', modalContext);
  const inventory = provided.get('inventoryItems');
  const system = context.fishingLineSystem;
  return { context, system, modal, inventory, trainingEvents, notifications };
}

test('caught fish immediately appear in the visible inventory and are not duplicated on retrieval', t => {
  const { context, system, modal, inventory } = fishingSession(t);
  assert.equal(modal.totalFish.value, 0);
  assert.equal(modal.uniqueSpecies.value, 0);
  assert.equal(system.deployFishingGear(), true);
  system.update(1.4, 1.4);
  assert.equal(system.getState(), FishingState.FISHING);

  system.update(5, 6.4);
  assert.equal(context.fishingFishCount.value, 1);
  assert.equal(modal.totalFish.value, 1, 'inventory updates before retrieving the net');
  assert.equal(modal.sortedGroups.value[0].name, FISH_DATA[0].name);
  assert.equal(modal.sortedGroups.value[0].image, FISH_DATA[0].image);
  assert.equal(modal.sortedGroups.value[0].scientific, FISH_DATA[0].scientific);
  assert.equal(inventory.value[0].source, 'net');
  assert.ok(inventory.value[0].caughtAt > 0);

  system.update(5, 11.4);
  assert.equal(modal.totalFish.value, 2);
  assert.equal(modal.uniqueSpecies.value, 1);
  assert.equal(modal.sortedGroups.value[0].count, 2);

  let calls = 0;
  t.mock.method(Math, 'random', () => calls++ % 2 === 0 ? 0 : 1.1 / FISH_DATA.length);
  system.update(5, 16.4);
  assert.equal(modal.totalFish.value, 3);
  assert.equal(modal.uniqueSpecies.value, 2);
  assert.equal(modal.sortedGroups.value[1].name, FISH_DATA[1].name);
  assert.equal(system.retrieveFishingGear(), true);
  system.update(1, 17.4);
  assert.equal(system.getState(), FishingState.IDLE);
  assert.equal(modal.totalFish.value, 3, 'retrieval keeps each fish exactly once');
  assert.equal(system.deployFishingGear(), true);
  assert.equal(modal.totalFish.value, 3, 'a new deployment keeps previous catches');
});

test('failed catch attempts and blocked deployment leave the inventory empty', t => {
  const { context, system, modal } = fishingSession(t);
  context.boatObject.position.set(0, 0, 0);
  assert.equal(system.deployFishingGear(), false);
  assert.equal(modal.totalFish.value, 0);
  context.boatObject.position.set(FISHING_SPOTS[0].x, 0, FISHING_SPOTS[0].z);
  assert.equal(system.deployFishingGear(), true);
  system.update(1.4, 1.4);
  t.mock.method(Math, 'random', () => .99);
  system.update(5, 6.4);
  assert.equal(context.fishingFishCount.value, 0);
  assert.equal(modal.totalFish.value, 0);
});

test('training catches also populate inventory while tracking fishing activity', t => {
  const { system, modal, trainingEvents } = fishingSession(t, true);
  system.deployFishingGear();
  system.update(1.4, 1.4);
  system.update(5, 6.4);
  assert.equal(modal.totalFish.value, 1);
  assert.deepEqual(trainingEvents, [true]);
});
