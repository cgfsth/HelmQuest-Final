import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import * as THREE from 'three';
import { createHelmRadarScreen, updateHelmRadarScreen, disposeHelmRadarScreen } from '../src/helpers/helmRadarScreen.js';
import { buildTacticalChartSnapshot, drawCircularTacticalChart } from '../src/helpers/tacticalChart.js';
import { findWaypoint, isBoatInZone, distanceToZoneEdge } from '../src/helpers/missionWaypoints.js';
import { createHelmCockpit, HELM_CAMERA_POS_LARGE, HELM_CAMERA_LOOK_LARGE, disposeHelmCockpit } from '../src/helpers/helmCockpit.js';

const source = readFileSync(new URL('../src/App.vue', import.meta.url), 'utf8').replace(/\r\n/g, '\n');
function appFunction(name) {
  const start = source.indexOf(`function ${name}(`);
  return source.slice(start, source.indexOf('\n}', start) + 2);
}
function makeBoat() {
  const boat = new THREE.Group();
  const tablet = new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshBasicMaterial());
  tablet.name = 'screen002_misc_0';
  boat.add(tablet);
  return { boat, tablet };
}
function makeLargeBoat() {
  const boat = new THREE.Group();
  boat.userData.loaMeters = 180;
  const cockpit = createHelmCockpit(boat);
  boat.add(cockpit.group);
  cockpit.group.visible = true;
  return { boat, tablet: boat.getObjectByName('BigBoatRadarMount'), cockpit };
}
function makeCanvas() {
  const labels = new Map();
  const context = new Proxy({
    createRadialGradient: () => ({ addColorStop() {} }),
    fillText: (label, x, y) => labels.set(label, { x, y }),
  }, { get: (object, key) => object[key] ?? (() => {}) });
  return { width: 208, height: 208, getContext: () => context, labels };
}

test('the tablet retains its bezel and receives the same live radar canvas', () => {
  const { boat, tablet } = makeBoat();
  const originalMaterial = tablet.material;
  const canvas = makeCanvas();
  const display = createHelmRadarScreen(boat, canvas);
  assert.equal(display.screen.parent, tablet);
  assert.equal(tablet.material, originalMaterial, 'the original tablet and texture atlas stay intact');
  assert.equal(display.texture.image, canvas, 'the screen uses the shared canvas, without a second radar model');
  assert.equal(display.screen.material.toneMapped, false, 'the display stays readable under day/night exposure changes');
  assert.equal(display.texture.colorSpace, THREE.SRGBColorSpace);
  const uv = display.surface.geometry.attributes.uv;
  assert.equal(uv.getX(0), 0);
  assert.equal(uv.getX(1), 1);
  const points = display.surface.geometry.attributes.position;
  const topWidth = new THREE.Vector3().fromBufferAttribute(points, 0)
    .distanceTo(new THREE.Vector3().fromBufferAttribute(points, 1));
  const bottomWidth = new THREE.Vector3().fromBufferAttribute(points, 2)
    .distanceTo(new THREE.Vector3().fromBufferAttribute(points, 3));
  const height = new THREE.Vector3().fromBufferAttribute(points, 0)
    .distanceTo(new THREE.Vector3().fromBufferAttribute(points, 2));
  assert.ok(Math.abs((topWidth + bottomWidth) / 2 / height - 1) < 0.001,
    'the tablet letterboxes the radar on a square surface without repeating edge pixels');
  const normal = display.screen.geometry.attributes.normal;
  assert.ok(normal.getY(0) > 0.9 && normal.getZ(0) > 0.2, 'the display follows the tilted tablet face');
  const version = display.texture.version;
  updateHelmRadarScreen(display);
  assert.equal(display.texture.version, version + 1);
  const disposed = [];
  for (const [name, asset] of [['geometry', display.screen.geometry], ['material', display.screen.material], ['texture', display.texture]]) {
    asset.addEventListener('dispose', () => disposed.push(name));
  }
  disposeHelmRadarScreen(display);
  assert.equal(display.screen.parent, null);
  assert.deepEqual(disposed, ['geometry', 'material', 'texture']);
});

for (const [type, factory] of [['medium', makeBoat], ['large', makeLargeBoat]]) {
test(`the ${type} boat minimap keeps heading, movement and screen pixels together across camera changes`, () => {
  const { boat, tablet, cockpit } = factory();
  const canvas = makeCanvas();
  const context = {
    Math, boatObject: boat, tacticalChartCanvas: { value: canvas },
    tacticalChartCanvasEl: null, tacticalChartCtx: null,
    helmRadarDisplay: null, helmRadarBoat: null, helmRadarSourceCanvas: null,
    helmRadarReady: { value: false },
    activeScreen: { value: 'simulation' }, activeCamera: { value: 'helm' },
    createHelmRadarScreen, updateHelmRadarScreen, disposeHelmRadarScreen, drawCircularTacticalChart,
    snapshot: { boat: { x: 0, z: 0, headingDeg: 0 }, islands: [], docks: [], waypoints: [] },
    getTacticalChartSnapshot() { return context.snapshot; },
    resizeTacticalCanvas() { canvas.width = 96; canvas.height = 96; return { w: 96, h: 96 }; },
  };
  vm.createContext(context);
  for (const name of ['disposeHelmRadarDisplay', 'ensureHelmRadarDisplay', 'ensureTacticalChartCtx', 'updateTacticalMinimap']) {
    vm.runInContext(appFunction(name), context);
  }
  context.updateTacticalMinimap();
  const display = context.helmRadarDisplay;
  assert.ok(context.helmRadarReady.value);
  assert.equal(display.texture.image, canvas);
  assert.equal(canvas.width, 512, 'the hidden HUD remains a full-resolution tablet texture on phones');
  assert.equal(canvas.labels.get('N').x, 104);
  assert.ok(canvas.labels.get('N').y < 104);
  const firstVersion = display.texture.version;
  context.snapshot.boat.headingDeg = 90;
  context.snapshot.boat.x = 100;
  context.snapshot.boat.z = -200;
  context.updateTacticalMinimap();
  assert.equal(context.helmRadarDisplay, display, 'frame updates reuse the texture and material');
  assert.ok(canvas.labels.get('N').x < 104);
  assert.ok(display.texture.version > firstVersion);
  assert.equal(tablet.children.filter(child => child.name === 'HelmRadarScreen').length, 1,
    'updates never accumulate screen meshes');
  context.activeCamera.value = 'chase';
  context.updateTacticalMinimap();
  assert.equal(canvas.width, 96, 'the ordinary HUD radar returns at its mobile size');
  context.activeCamera.value = 'helm';
  context.updateTacticalMinimap();
  assert.equal(canvas.width, 512);
  assert.equal(context.helmRadarDisplay, display);
  const replacement = makeCanvas();
  context.tacticalChartCanvas.value = replacement;
  context.ensureHelmRadarDisplay();
  assert.equal(display.screen.parent, null, 're-entering simulation releases the old canvas texture');
  assert.equal(context.helmRadarDisplay.texture.image, replacement);
  context.disposeHelmRadarDisplay();
  assert.equal(context.helmRadarReady.value, false);
  assert.equal(tablet.children.filter(child => child.name === 'HelmRadarScreen').length, 0);
  if (cockpit) disposeHelmCockpit(cockpit);
});
}

test('the large bridge radar faces the helm eye and is visible beside the wheel on desktop and mobile', () => {
  const { boat, tablet, cockpit } = makeLargeBoat();
  const originalMaterial = tablet.material;
  const display = createHelmRadarScreen(boat, makeCanvas());
  assert.equal(display.screen.parent, tablet);
  assert.equal(tablet.material, originalMaterial);
  assert.equal(display.surface.material.toneMapped, false);
  assert.ok(display.surface.geometry.attributes.normal.getX(0) < -.99,
    'the radar surface faces the camera behind the console');
  boat.updateMatrixWorld(true);
  const points = display.surface.geometry.attributes.position;
  const corners = Array.from({ length: points.count }, (_, i) =>
    display.surface.localToWorld(new THREE.Vector3().fromBufferAttribute(points, i)));
  for (const aspect of [1200 / 800, 813 / 361]) {
    const camera = new THREE.PerspectiveCamera(62, aspect, .2, 1000);
    camera.position.copy(HELM_CAMERA_POS_LARGE);
    camera.lookAt(HELM_CAMERA_LOOK_LARGE);
    camera.updateMatrixWorld(true);
    for (let i = 0; i < points.count; i++) {
      const point = display.surface.localToWorld(new THREE.Vector3().fromBufferAttribute(points, i)).project(camera);
      assert.ok(Math.abs(point.x) < 1 && Math.abs(point.y) < 1 && point.z < 1,
        `the complete radar fits the viewport at aspect ${aspect}`);
    }
    for (const u of [.03, .5, .97]) {
      for (const v of [.03, .5, .97]) {
        const top = corners[0].clone().lerp(corners[1], u);
        const bottom = corners[2].clone().lerp(corners[3], u);
        const target = top.lerp(bottom, v);
        const ray = new THREE.Raycaster(camera.position, target.sub(camera.position).normalize());
        const hit = ray.intersectObject(boat, true)[0]?.object;
        assert.ok(hit === display.surface,
          `the radar at ${u},${v} must be unobstructed; hit ${hit?.name || hit?.type}`);
      }
    }
  }
  disposeHelmRadarScreen(display);
  disposeHelmCockpit(cockpit);
});

test('boats without this tablet keep the HUD radar available', () => {
  assert.equal(createHelmRadarScreen(new THREE.Group(), makeCanvas()), null);
  assert.equal(createHelmRadarScreen(null, makeCanvas()), null);
  updateHelmRadarScreen(null);
  disposeHelmRadarScreen(null);
});

for (const [type, factory] of [['medium', makeBoat], ['large', makeLargeBoat]]) {
for (const review of [false, true]) {
  test(`${type} ${review ? 'practice review' : 'mission'} radar tracks the current buoy and return-to-port target`, () => {
    const { boat, tablet, cockpit } = factory();
    const canvas = makeCanvas();
    const zones = [
      { id: 'buoy-1', x: 3000, z: -3000, radius: 40, label: 'Buoy 1' },
      { id: 'buoy-2', x: 4000, z: -4000, radius: 40, label: 'Buoy 2' },
      { id: 'port', x: 0, z: 0, radius: 40, label: 'Return to port' },
    ];
    const context = {
      Math, boatObject: boat, tacticalChartCanvas: { value: canvas },
      tacticalChartCanvasEl: null, tacticalChartCtx: null,
      helmRadarDisplay: null, helmRadarBoat: null, helmRadarSourceCanvas: null,
      helmRadarReady: { value: false },
      activeScreen: { value: 'simulation' }, activeCamera: { value: 'helm' },
      isTrainingReviewMode: { value: review },
      activeTrainingModule: { value: {
        id: 'mission-radar', steps: zones.map(zone => ({ waypointZone: zone.id })),
      } },
      currentTrainingStep: { value: 0 },
      stats: { value: { boatX: 0, boatZ: 0, rotationDeg: 0 } },
      islandGroup: null, harborDockGroup: null, SIMULATION_SPAWN: { x: 0, z: 0 },
      getActiveHarborDockBerth: () => null,
      getFishingSpotChartWaypoints: () => [],
      resolveTrainingZonesAtSpawn: () => zones,
      findWaypoint, isBoatInZone, distanceToZoneEdge, formatDistanceMeters: String,
      createHelmRadarScreen, updateHelmRadarScreen, disposeHelmRadarScreen,
      buildTacticalChartSnapshot, drawCircularTacticalChart,
    };
    vm.createContext(context);
    for (const name of [
      'disposeHelmRadarDisplay', 'ensureHelmRadarDisplay', 'ensureTacticalChartCtx',
      'getTrainingNavOverlay', 'getTacticalChartSnapshot', 'updateTacticalMinimap',
    ]) vm.runInContext(appFunction(name), context);

    context.updateTacticalMinimap();
    const display = context.helmRadarDisplay;
    assert.ok(display && context.helmRadarReady.value);
    const initialVersion = display.texture.version;
    for (let step = 0; step < zones.length; step++) {
      context.currentTrainingStep.value = step;
      context.stats.value.rotationDeg = step * 90;
      context.stats.value.boatX = step * 100;
      context.stats.value.boatZ = -step * 200;
      context.updateTacticalMinimap();
      const snapshot = context.getTacticalChartSnapshot();
      assert.equal(snapshot.navTarget.label, zones[step].label);
      assert.equal(snapshot.navTarget.x, zones[step].x);
      assert.equal(snapshot.navTarget.z, zones[step].z);
      assert.equal(snapshot.waypoints.filter(waypoint => waypoint.active).length, 1);
      assert.equal(snapshot.waypoints.find(waypoint => waypoint.active).label, zones[step].label);
      assert.equal(snapshot.boat.headingDeg, step * 90);
      assert.equal(snapshot.boat.x, context.stats.value.boatX);
      assert.equal(snapshot.boat.z, context.stats.value.boatZ);
      assert.equal(context.helmRadarDisplay, display);
      assert.equal(display.texture.image, canvas);
      assert.ok(display.texture.version > initialVersion);
      assert.equal(tablet.children.filter(child => child.name === 'HelmRadarScreen').length, 1);
    }
    context.disposeHelmRadarDisplay();
    if (cockpit) disposeHelmCockpit(cockpit);
  });
}
}
