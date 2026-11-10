import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { posix } from 'node:path';

// npm install on one platform can drop optional packages' required peers.
// CI validates the full graph even when development packages are omitted.
function unresolvedDependencies(lock) {
  const missing = [];
  function resolves(from, name) {
    let directory = from;
    while (directory && directory !== '.') {
      if (lock.packages[`${directory}/node_modules/${name}`]) return true;
      directory = posix.dirname(directory);
    }
    return !!lock.packages[`node_modules/${name}`];
  }
  for (const [path, entry] of Object.entries(lock.packages)) {
    const required = new Set([
      ...Object.keys(entry.dependencies || {}).filter(name => !Object.hasOwn(entry.optionalDependencies || {}, name)),
      ...Object.keys(entry.peerDependencies || {}).filter(name => !entry.peerDependenciesMeta?.[name]?.optional),
    ]);
    for (const name of required) if (!resolves(path, name)) missing.push(`${path || '(root)'} -> ${name}`);
  }
  return missing;
}

for (const folder of ['', 'backend/']) {
  test(`${folder || 'frontend/'} lockfile includes every required dependency and peer`, () => {
    const manifest = JSON.parse(readFileSync(new URL(`../${folder}package.json`, import.meta.url), 'utf8'));
    const lock = JSON.parse(readFileSync(new URL(`../${folder}package-lock.json`, import.meta.url), 'utf8'));
    for (const key of ['dependencies', 'devDependencies', 'optionalDependencies']) assert.deepEqual(lock.packages[''][key], manifest[key]);
    assert.deepEqual(unresolvedDependencies(lock), []);
  });
}

test('missing optional-platform peers are detected even when no native packages are installed', () => {
  const lock = JSON.parse(readFileSync(new URL('../backend/package-lock.json', import.meta.url), 'utf8'));
  delete lock.packages['node_modules/@emnapi/core'];
  delete lock.packages['node_modules/@emnapi/runtime'];
  const missing = unresolvedDependencies(lock);
  assert.ok(missing.includes('node_modules/@napi-rs/wasm-runtime -> @emnapi/core'));
  assert.ok(missing.includes('node_modules/@napi-rs/wasm-runtime -> @emnapi/runtime'));
});
