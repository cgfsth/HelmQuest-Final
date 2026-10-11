import test from 'node:test';
import assert from 'node:assert/strict';
import { createSimulationTouchInput } from '../src/helpers/simulationTouchInput.js';

function controls() {
  const events = [], states = [];
  const input = createSimulationTouchInput({ press: code => events.push(['down', code]),
    release: code => events.push(['up', code]), changed: codes => states.push(codes) });
  return { input, events, states };
}

test('two fingers can throttle and steer independently without stuck controls', () => {
  const { input, events, states } = controls();
  input.press(1, 'KeyW');
  input.press(2, 'KeyA');
  input.release(1);
  assert.deepEqual(states.at(-1), ['KeyA']);
  input.release(2);
  assert.deepEqual(events, [['down', 'KeyW'], ['down', 'KeyA'], ['up', 'KeyW'], ['up', 'KeyA']]);
  assert.deepEqual(states.at(-1), []);
});

test('duplicate capture/release events and two fingers on the same control produce only one key pair', () => {
  const { input, events } = controls();
  input.press(1, 'KeyW');
  input.press(1, 'KeyW');
  input.press(2, 'KeyW');
  input.release(1);
  input.release(1);
  assert.deepEqual(events, [['down', 'KeyW']]);
  input.release(2);
  input.release(2);
  assert.deepEqual(events, [['down', 'KeyW'], ['up', 'KeyW']]);
});

test('rotation, a modal, backgrounding or leaving the simulation releases every held control', () => {
  const { input, events, states } = controls();
  input.press(1, 'KeyW');
  input.press(2, 'KeyD');
  input.reset();
  input.reset();
  input.release(1);
  assert.deepEqual(events, [['down', 'KeyW'], ['down', 'KeyD'], ['up', 'KeyW'], ['up', 'KeyD']]);
  assert.deepEqual(states.at(-1), []);
  input.press(3, 'KeyS');
  input.release(3);
  assert.deepEqual(events.slice(-2), [['down', 'KeyS'], ['up', 'KeyS']]);
});
