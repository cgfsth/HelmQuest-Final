import { createServer } from 'vite';
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import assert from 'node:assert/strict';
import { headlessBrowser } from './lib/headless-browser.mjs';
const directory = resolve('../.tmp/rendering-prototype'), results = [];
const vite = await createServer({ cacheDir: resolve(directory, 'vite-cache'), server: { host: '127.0.0.1', port: 5291, strictPort: true, hmr: false } });
await vite.listen(); let browser;
try {
  browser = await headlessBrowser({ directory, webgl: true });
  const onlyEngine = process.argv.find(arg => arg.startsWith('--engine='))?.split('=')[1];
  const onlyQuality = process.argv.find(arg => arg.startsWith('--quality='))?.split('=')[1];
  for (const renderer of ['three', 'babylon'].filter(value => !onlyEngine || value === onlyEngine)) for (const { width, quality } of [{ width: 1280, quality: 'low' }, { width: 375, quality: 'low' }, { width: 1280, quality: 'high' }].filter(value => !onlyQuality || value.quality === onlyQuality)) {
    await browser.viewport(width, width < 600 ? 812 : 900);
    await browser.navigate(`http://127.0.0.1:5291/experiments/maritime.html?engine=${renderer}&quality=${quality}`);
    await browser.waitFor('window.helmquestPrototype?.ready || window.helmquestPrototype?.error', 180000);
    const error = await browser.evaluate('window.helmquestPrototype.error'); assert.equal(error, undefined, `${renderer} startup failed`);
    await browser.waitFor('window.helmquestPrototype.metrics.snapshot().frames>=12', 120000);
    assert.deepEqual(await browser.evaluate('window.helmquestPrototype.renderHealth()'), { ready: true, shaderErrors: [] }, 'Actual materials must compile; asset metadata alone cannot prove rendering');
    const before = await browser.evaluate('window.helmquestPrototype.state.x');
    await browser.evaluate('window.helmquestPrototype.state.engineRunning=true;window.helmquestPrototype.keys.KeyW=true');
    await browser.waitFor('window.helmquestPrototype.state.speed>1', 30000);
    assert.ok(await browser.evaluate('window.helmquestPrototype.state.x') > before);
    await browser.evaluate('window.helmquestPrototype.state.anchored=true');
    await browser.waitFor('window.helmquestPrototype.state.speed===0');
    const anchored = await browser.evaluate('window.helmquestPrototype.state.x'); await browser.pause(500);
    assert.equal(await browser.evaluate('window.helmquestPrototype.state.x'), anchored);
    await browser.evaluate('window.helmquestPrototype.keys.KeyW=false;window.helmquestPrototype.state.paused=true');
    await browser.screenshot(`${renderer}-${quality}-${width}`);
    await browser.click('Switch chase / bridge camera'); assert.equal(await browser.evaluate('window.helmquestPrototype.state.bridge'), true);
    await browser.fill('#lighting', 'night'); await browser.pause(300); await browser.screenshot(`${renderer}-${quality}-${width}-bridge-night`);
    assert.deepEqual(await browser.evaluate('window.helmquestPrototype.renderHealth()'), { ready: true, shaderErrors: [] });
    const measured = await browser.evaluate('window.helmquestPrototype.metrics.snapshot()');
    assert.ok(Math.abs(measured.assets.vessel.bounds.x - 18) < .1, 'Vessel normalized length'); assert.ok(measured.assets.harbor.meshes > 0);
    assert.equal(await browser.evaluate('document.documentElement.scrollWidth<=innerWidth'), true, 'Responsive overflow');
    results.push({ ...measured, inputAndAnchorChecks: true, camerasAndNightChecks: true, graphicsBackend: 'Hidden Edge with SwiftShader software WebGL; mobile is an emulated viewport.' });
    writeFileSync(resolve(directory, 'comparison.json'), JSON.stringify({ measuredAt: new Date().toISOString(), results }, null, 2));
    console.log(`PASS ${renderer} ${quality} ${width}px: ${measured.fps?.toFixed(1)} FPS, load ${measured.loadMs?.toFixed(0)} ms`);
    await browser.evaluate('window.helmquestPrototype.dispose()');
  }
  assert.deepEqual(browser.errors, []);
  writeFileSync(resolve(directory, 'comparison.json'), JSON.stringify({ measuredAt: new Date().toISOString(), results, productionMigration: 'Not promoted: the prototype is an asset/renderer comparison, not full gameplay parity or real-mobile hardware validation.' }, null, 2));
  console.log('Measurements and screenshots: ' + directory);
} finally { browser?.close(); await vite.close(); }
