import test from 'node:test';
import assert from 'node:assert/strict';
import { drawCircularTacticalChart } from '../src/helpers/tacticalChart.js';

// Record the real renderer's labels and pins without loading a WebGL scene.
function renderRadar(headingDeg, target) {
  const labels = new Map();
  const translations = [];
  const context = new Proxy({
    createRadialGradient: () => ({ addColorStop() {} }),
    fillText: (label, x, y) => labels.set(label, { x, y }),
    translate: (x, y) => translations.push({ x, y }),
  }, {
    get: (object, key) => object[key] ?? (() => {}),
  });
  drawCircularTacticalChart(context, 200, 200, {
    boat: { x: 0, z: 0, headingDeg },
    islands: [],
    docks: [],
    waypoints: target ? [{ ...target, active: true }] : [],
    navTarget: target ?? null,
  });
  // The first translation is the bow-up field-of-view wedge; the rest are pins.
  return { labels, pins: translations.slice(1) };
}

function close(actual, expected, description) {
  assert.ok(Math.abs(actual - expected) < 1e-8, `${description}: ${actual} != ${expected}`);
}

const directions = [
  { label: 'N', bearing: 0, x: 0, z: -1000 },
  { label: 'NE', bearing: 45, x: 1000, z: -1000 },
  { label: 'E', bearing: 90, x: 1000, z: 0 },
  { label: 'SE', bearing: 135, x: 1000, z: 1000 },
  { label: 'S', bearing: 180, x: 0, z: 1000 },
  { label: 'SW', bearing: 225, x: -1000, z: 1000 },
  { label: 'W', bearing: 270, x: -1000, z: 0 },
  { label: 'NW', bearing: 315, x: -1000, z: -1000 },
];

for (const heading of [0, 90, 180, 270, 306, 359, 360, 361]) {
  test(`radar labels and waypoint pins share the compass orientation at ${heading} degrees`, () => {
    for (const direction of directions) {
      const { labels, pins } = renderRadar(heading, direction);
      const relativeAngle = (direction.bearing - heading) * Math.PI / 180;
      const expectedX = Math.sin(relativeAngle);
      const expectedY = -Math.cos(relativeAngle);
      const label = labels.get(direction.label);
      const labelRadius = Math.hypot(label.x - 100, label.y - 100);
      close((label.x - 100) / labelRadius, expectedX, `${direction.label} label x`);
      close((label.y - 100) / labelRadius, expectedY, `${direction.label} label y`);
      assert.equal(pins.length, 2, 'both the navigation target and active waypoint are drawn');
      for (const pin of pins) {
        const pinRadius = Math.hypot(pin.x - 100, pin.y - 100);
        close((pin.x - 100) / pinRadius, expectedX, `${direction.label} waypoint x`);
        close((pin.y - 100) / pinRadius, expectedY, `${direction.label} waypoint y`);
      }
    }
  });
}

test('a waypoint straight ahead is at the top of the radar, never behind the vessel', () => {
  const { pins } = renderRadar(0, { x: 0, z: -1000 });
  for (const pin of pins) {
    close(pin.x, 100, 'straight-ahead pin stays centered');
    assert.ok(pin.y < 100, 'straight-ahead pin is above the vessel');
  }
});

test('compass labels move continuously across north', () => {
  const before = renderRadar(359).labels.get('N');
  const atNorth = renderRadar(0).labels.get('N');
  const after = renderRadar(1).labels.get('N');
  assert.ok(before.x > 100 && after.x < 100);
  close(atNorth.x, 100, 'north is centered at 0 degrees');
  assert.ok(Math.hypot(before.x - after.x, before.y - after.y) < 2);
});
