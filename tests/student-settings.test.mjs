import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { effectScope, ref } from 'vue';
import { parse, compileScript, compileTemplate } from '@vue/compiler-sfc';
import { DEFAULT_SIMULATION_PREFERENCES as defaults, normalizeSimulationPreferences, useSimulationPreferences } from '../src/composables/useSimulationPreferences.js';

function preferences(saved = new Map(), overrides = {}) {
  const scope = effectScope(), currentUser = ref({ id: 'one' }), isAuthenticated = ref(true), userRole = ref('student');
  const controls = Object.fromEntries(Object.entries(defaults).map(([key, value]) => [key, ref(value)])), storageNotice = ref('');
  const storage = { getItem: key => saved.get(key) ?? null, setItem: (key, value) => saved.set(key, value), ...overrides };
  const result = scope.run(() => useSimulationPreferences({ currentUser, isAuthenticated, userRole, controls, storageNotice, storage: () => storage }));
  return { ...result, controls, currentUser, isAuthenticated, userRole, saved, storageNotice, scope };
}
test('student settings and the full App compile with the profile-card entry point', () => {
  for (const name of ['App', 'components/StudentSettings']) {
    const source = readFileSync(new URL(`../src/${name}.vue`, import.meta.url), 'utf8');
    const { descriptor, errors } = parse(source); assert.deepEqual(errors, []);
    const script = compileScript(descriptor, { id: name });
    const template = compileTemplate({ source: descriptor.template.content, filename: `${name}.vue`, id: name, compilerOptions: { bindingMetadata: script.bindings } });
    assert.deepEqual(template.errors, []);
  }
});
test('preferences survive remounts and never cross student accounts or write credentials', () => {
  const f = preferences();
  f.preferences.value = { ...defaults, soundVolume: 0, menuStartCamera: 'helm', graphicsQuality: 'low', showFPS: true };
  const first = { ...f.preferences.value };
  f.currentUser.value = { id: 'two' }; assert.deepEqual(f.preferences.value, defaults);
  f.controls.waterQuality.value = 'high';
  f.currentUser.value = { id: 'one' }; assert.deepEqual(f.preferences.value, first);
  f.isAuthenticated.value = false; assert.deepEqual(f.preferences.value, defaults);
  f.scope.stop();
  const restored = preferences(f.saved); assert.deepEqual(restored.preferences.value, first);
  assert.deepEqual(Object.keys(JSON.parse(f.saved.get('helmquest:preferences:student:one'))), Object.keys(defaults));
  restored.resetPreferences(); assert.deepEqual(restored.preferences.value, defaults); restored.scope.stop();
});
test('malformed storage, unsupported options, invalid volume and unavailable storage fall back safely', () => {
  assert.deepEqual(normalizeSimulationPreferences({ graphicsQuality: 'bogus', soundVolume: NaN, showFPS: 'false', password: 'secret' }), defaults);
  assert.equal(normalizeSimulationPreferences({ soundVolume: 9 }).soundVolume, 1);
  const f = preferences(new Map([['helmquest:preferences:student:one', '{broken']]));
  assert.deepEqual(f.preferences.value, defaults); assert.ok(f.storageNotice.value); f.scope.stop();
  const denied = preferences(new Map(), { getItem() { throw new Error('Storage blocked'); }, setItem() { throw new Error('Quota exceeded'); } });
  denied.controls.graphicsQuality.value = 'low'; assert.equal(denied.preferences.value.graphicsQuality, 'low'); assert.ok(denied.storageNotice.value);
  denied.scope.stop();
});

test('FPS counts frames from either renderer and updates the simulation counter', () => {
  const source = readFileSync(new URL('../src/App.vue', import.meta.url), 'utf8').replace(/\r\n/g, '\n');
  const start = source.indexOf('function renderFrame('), body = source.slice(start, source.indexOf('\n}', start) + 2);
  for (const effects of [false, true]) {
    let now = 1000, draws = 0;
    const counter = { textContent: '' };
    const context = { renderer: { render() { draws++; } }, scene: {},
      postProcessing: effects ? { setCamera() {}, render() { draws++; } } : null,
      showFPS: { value: true }, activeScreen: { value: 'simulation' },
      fpsSampleStartedAt: 0, fpsSampleFrames: 0, performance: { now: () => now },
      document: { getElementById: () => counter },
    };
    vm.createContext(context); vm.runInContext(body, context);
    for (let frame = 0; frame < 31; frame++) { context.renderFrame({}); now += 1000 / 60; }
    assert.equal(draws, 31); assert.match(counter.textContent, /^6[0-2] FPS$/);
  }
});
