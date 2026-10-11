import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import * as THREE from 'three';
import { getDefaultSimHeading } from '../src/helpers/worldIslands.js';
import { SIMULATION_SPAWN, updateSimulationSpawn, applySpawnAtBerth, getBoatDepartureSpawn } from '../src/helpers/sceneEnvironment.js';
import {
  normalizeBoatToScene, resolveTargetBoatLength,
  CHASE_CAM_BEHIND_LOA, CHASE_CAM_LOOK_AHEAD_LOA, CHASE_CAM_HEIGHT_LOA,
} from '../src/helpers/normalizeBoatScale.js';

const source = readFileSync(new URL('../src/App.vue', import.meta.url), 'utf8').replace(/\r\n/g, '\n');
function appFunction(name) {
  const start = source.indexOf(`function ${name}(`);
  assert.ok(start >= 0, `${name} must exist`);
  const end = source.indexOf('\n}', start) + 2;
  return source.slice(start, end);
}

function makeModel() {
  const model = new THREE.Group();
  model.add(new THREE.Mesh(new THREE.BoxGeometry(16, 4, 5), new THREE.MeshBasicMaterial()));
  return model;
}

function makeSimulation(type) {
  Object.assign(SIMULATION_SPAWN, { x: -7649.75, z: -5173.5 });
  const context = {
    THREE, Math, Number, Promise,
    console: { log() {}, error() {}, warn() {} },
    normalizeBoatToScene, resolveTargetBoatLength, getDefaultSimHeading,
    CHASE_CAM_BEHIND_LOA, CHASE_CAM_LOOK_AHEAD_LOA, CHASE_CAM_HEIGHT_LOA,
    SIMULATION_SPAWN, updateSimulationSpawn, applySpawnAtBerth, getBoatDepartureSpawn,
    getActiveHarborDockBerth() { return context.berth ?? null; },
    SCENE_WATERLINE_Y: 0,
    boatObject: makeModel(),
    scene: new THREE.Scene(), islandGroup: null,
    camera: new THREE.PerspectiveCamera(),
    orbitControls: { target: new THREE.Vector3(), update() {}, minDistance: 0 },
    _chaseOffsetBehind: new THREE.Vector3(), _chaseOffsetLook: new THREE.Vector3(),
    physics: { value: { waterlineOffset: 0 } },
    stats: { value: { rotationDeg: 90, rollDeg: 12, pitchDeg: -3, speedKnots: 0 } },
    anchor: { value: { deployed: false, deploying: false, retracting: false, chainLength: 0 } },
    activeCamera: { value: 'chase' },
    baselineWaterlineY: 0, landingBoatPoseActive: true,
    activeBoatModelFile: { value: '' }, activeScreen: { value: 'landing' },
    isQuickSailMode: { value: false }, showCinematicLoading: { value: false }, loadingHint: { value: '' },
    simulationWeatherPreset: { value: 'day' }, stormMode: { value: false }, calmWeatherSnapshot: null,
    wind: { value: { speed: 0.1 } }, selectedBoatType: { value: type },
    applyBoatWavePhysics() {}, onWaterParamChange() {},
    performanceManager: { isActive: false, cancelMission() {} },
    archipelagoLoadPromise: Promise.resolve(),
    boatAnchorRig: null, anchorMesh: null,
    speedVel: 0, speedRot: 0, angularVelocity: 0, turnRadius: 0, isStopping: false,
    trainingHeadingHold: { value: {} }, engineRunning: { value: true }, engineStarting: { value: false },
    collisionWarning: { value: '' }, islandWarningTimerId: null, initComplete: { value: false },
    environmentPreset: 'day', LANDING_CAMERA_FOV: 40,
    tagHelmDeckRailMeshes() {}, tagHelmInteriorMeshes() {},
    setupBoatAnchorRig() { return null; }, applyAnchorPose() {}, resetBoatAnchorRig() {},
    attachHelmCockpitToBoat() {}, addBoatHeadlights() {}, syncOrbitControlsEnabled() {}, syncHelmRailingsVisibility() {},
    applyEnvironmentPreset() {}, applySimulationWeather() {},
    isMenuBackdropScreen() { return context.activeScreen.value === 'landing'; },
    syncCompassVisualHeading(heading) { context.compassHeading = heading; },
    goToScreen(screen) { context.activeScreen.value = screen; },
    async rebuildHarborDocks() {},
    async swapBoatModel(path) {
      context.boatObject = makeModel();
      context.finalizeSpawnedBoat(path);
    },
  };
  vm.createContext(context);
  const boatStart = source.indexOf('const BOAT_TYPES = {');
  const boatEnd = source.indexOf('\n};', boatStart) + 3;
  vm.runInContext(source.slice(boatStart, boatEnd) + '\nglobalThis.boatProfiles = BOAT_TYPES;', context);
  context.activeBoatModelFile.value = context.boatProfiles[type].modelFile;
  context.physics.value.waterlineOffset = context.boatProfiles[type].waterlineOffset;
  for (const name of [
    'boatHeadingDegrees', 'boatRotationToCompassHeading', 'restoreFiniteBoatTransform',
    'syncStatsBoatXZ', 'snapChaseCamera', 'placeOrbitCameraBehindBoat',
    'applyChaseCameraScale', 'restoreBoatSimPose', 'resetTrainingRunState',
    'finalizeSpawnedBoat', 'startQuickSailWithBoat',
  ]) vm.runInContext(appFunction(name), context);
  vm.runInContext('async ' + appFunction('syncWorldForSimulation'), context);
  return context;
}

function addMissionWorld(context, type) {
  const berth = { x: 11073, z: -4300, length: 500, width: 10, berthHeadingDeg: 270 };
  const module = {
    id: 'custom-port-spawn', duration: '5 minutes',
    buoys: [{ waypointZone: 'buoy-1', name: 'Buoy 1' }],
    steps: [
      { type: 'compass', heading: '45', waypointZone: 'buoy-1' },
      { type: 'dock', waypointZone: 'return-to-port' },
    ],
  };
  const island = new THREE.Group();
  island.add(new THREE.Mesh(new THREE.BoxGeometry(600, 50, 800), new THREE.MeshBasicMaterial()));
  island.position.set(8200, 0, -4200);
  Object.assign(context, {
    islandGroup: island, harborDockGroup: null, berth: null,
    isAuthenticated: { value: true }, currentUser: { value: null },
    trainingModules: { value: [module] }, activeMission: { value: null },
    activeTrainingModule: { value: null }, isTrainingReviewMode: { value: false },
    currentTrainingStep: { value: 0 }, interactionReadyStep: { value: null },
    trainingRunMetrics: { value: {} }, trainingStepSuccess: { value: false },
    trainingRunFinished: { value: false }, trainingStepError: { value: false },
    trainingFeedback: { value: '' }, trainingWaypoints: { value: [] }, waypointMarkerGroup: null,
    waypointOrigins: [], dockLoads: 0,
    performance: { now() { return 0; } }, setTimeout() {},
    wind: { value: {} },
    performanceManager: { isActive: false, cancelMission() {} },
    ensureMissionBuoySteps() {}, randomizeBuoyTasks() {},
    createTrainingRunMetrics() { return {}; },
    applyBoatTypePhysics() {}, captureTrainingStepBaseline() {}, applyLevelWeather() {},
    showEngineStatus: { value: false },
    setHarborPoleLightsVisible() {}, disposeWaypointMarkerGroup() {},
    disposeHarborDockGroup() { context.berth = null; },
    async loadHarborDocks() {
      await new Promise(resolve => setImmediate(resolve));
      context.berth = berth;
      context.dockLoads++;
      return new THREE.Group();
    },
    resolveModuleWaypoints(moduleId, x, z) {
      context.waypointOrigins.push({ x, z });
      return [{ id: 'buoy-1', x: x + 100, z: z - 100 }];
    },
    findWaypoint(zones, id) { return zones.find(zone => zone.id === id); },
    createWaypointMarkerGroup() { return new THREE.Group(); },
    updateBuoySignalLights() {},
  });
  for (const name of ['countWaypointSteps', 'resolveTrainingZonesAtSpawn', 'refreshTrainingWaypointZones', 'clearWaypointMarkers', 'syncTrainingWaypointMarkers', 'startTrainingModule']) {
    vm.runInContext(appFunction(name), context);
  }
  vm.runInContext('async ' + appFunction('rebuildHarborDocks'), context);
  return { berth, module, mission: { id: 'mission-port-spawn', moduleId: module.id, boatType: type } };
}

const pose = context => ({
  position: context.boatObject.position.toArray(),
  rotation: context.boatObject.rotation.toArray(),
  scale: context.boatObject.scale.toArray(),
  camera: context.camera.position.toArray(),
  target: context.orbitControls.target.toArray(),
  hudHeading: context.stats.value.rotationDeg,
  compassHeading: context.compassHeading,
  boatX: context.stats.value.boatX,
  boatZ: context.stats.value.boatZ,
});

for (const type of ['small', 'medium', 'large']) {
  test(`Set Sail and mission start use the same spawn pose after loading the ${type} boat`, async () => {
    const context = makeSimulation(type);
    context.startQuickSailWithBoat();
    await new Promise(resolve => setImmediate(resolve));
    const quickSail = pose(context);
    assert.equal(context.initComplete.value, true, 'the model must finish loading before checking spawn');
    assert.equal(context.activeScreen.value, 'simulation');
    assert.equal(quickSail.hudHeading, 0);
    assert.equal(quickSail.compassHeading, 0);
    assert.deepEqual(quickSail.position, [context.SIMULATION_SPAWN.x, context.physics.value.waterlineOffset, context.SIMULATION_SPAWN.z]);
    assert.ok(Math.abs(quickSail.rotation[1] - Math.PI / 2) < 1e-8);
    assert.ok(quickSail.camera[2] > quickSail.position[2], 'the chase camera must start behind the north-facing boat');

    // A mission starts from a freshly loaded model too, then resets its run state.
    context.boatObject = makeModel();
    context.finalizeSpawnedBoat(context.activeBoatModelFile.value);
    context.resetTrainingRunState();
    assert.deepEqual(pose(context), quickSail, 'mission and Quick Sail must match in position, yaw, scale, camera and HUD');

    context.boatObject.position.set(900, 3, 1200);
    context.boatObject.rotation.set(0.1, 0.4, -0.2);
    context.boatObject.scale.setScalar(1.5);
    context.restoreBoatSimPose();
    assert.deepEqual(pose(context), quickSail, 'returning from the landing pose or sailing must use the same departure pose');
  });
}

for (const [type, review] of [['small', true], ['medium', false], ['large', false]]) {
  test(`${review ? 'practice review' : 'mission'} stays at the loaded port through buoy refresh and boat swap (${type} boat)`, async () => {
    const context = makeSimulation(type);
    const { berth, module, mission } = addMissionWorld(context, type);
    context.startTrainingModule(module.id, { mission, review });
    for (let i = 0; i < 20 && !context.showEngineStatus.value; i++) await new Promise(resolve => setImmediate(resolve));
    assert.equal(context.showEngineStatus.value, true, 'mission initialization must finish');
    assert.equal(context.dockLoads, 1);
    assert.ok(context.waypointOrigins.length >= 2, 'exercise buoy refresh during dock loading and mission reset');
    assert.ok(context.waypointOrigins.every(origin => origin.x === berth.x && origin.z === berth.z), 'buoys must use the departure at the loaded port');
    const departure = getBoatDepartureSpawn(berth, context.boatObject.userData.loaMeters,
      getDefaultSimHeading(), context.boatObject.userData.beamMeters);
    assert.deepEqual(context.boatObject.position.toArray(), [departure.x, context.physics.value.waterlineOffset, departure.z], 'mission boat must use its departure clearance at the loaded port');
    if (type === 'large') assert.ok(departure.x <= berth.x - 50, 'large boat must start farther into the water');
    assert.equal(context.engineRunning.value, false);
    const missionPose = pose(context);
    context.syncTrainingWaypointMarkers();
    context.resetTrainingRunState();
    assert.deepEqual(pose(context), missionPose, 'refreshing mission steps must not change the restart position');
    context.activeTrainingModule.value = null;
    context.startQuickSailWithBoat();
    await new Promise(resolve => setImmediate(resolve));
    await new Promise(resolve => setImmediate(resolve));
    assert.deepEqual(pose(context), missionPose, 'Quick Sail and mission must depart from the same loaded port');
  });
}

test('large boat departure clears its full hull on different pier orientations without moving the port origin', () => {
  for (const [seawardX, seawardZ] of [[-1, 0], [0, 1], [Math.SQRT1_2, Math.SQRT1_2]]) {
    const berth = { x: 11073, z: -4300, seawardX, seawardZ };
    applySpawnAtBerth(berth);
    const heading = Math.PI / 2;
    const spawn = getBoatDepartureSpawn(berth, 180, heading, 36);
    const centerDistance = (spawn.x - berth.x) * seawardX + (spawn.z - berth.z) * seawardZ;
    const hullExtent = 90 * Math.abs(seawardZ) + 18 * Math.abs(seawardX);
    assert.ok(centerDistance - hullExtent >= 19.999, 'nearest hull edge must clear the berth by at least 20m');
    assert.deepEqual({ ...SIMULATION_SPAWN }, { x: berth.x, z: berth.z }, 'return-to-port waypoint stays at the actual port');
    assert.deepEqual(getBoatDepartureSpawn(berth, 180, heading, 36), spawn, 'restarts must not accumulate offsets');
    for (const length of [18, 60]) assert.deepEqual(getBoatDepartureSpawn(berth, length, heading), { x: berth.x, z: berth.z });
  }
});
