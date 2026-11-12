import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';

// A successful Rollup compile must still leave executable HTML for both routes.
// In particular, relative multi-page input paths can lose injection on Windows.
const output = resolve('dist');
for (const entry of ['index.html', 'experiments/maritime.html']) {
  const path = resolve(output, entry), html = readFileSync(path, 'utf8');
  const scripts = [...html.matchAll(/<script\b[^>]*type="module"[^>]*src="([^"]+)"[^>]*>/g)].map(match => match[1]);
  const styles = [...html.matchAll(/<link\b[^>]*rel="stylesheet"[^>]*href="([^"]+)"[^>]*>/g)].map(match => match[1]);
  assert.ok(scripts.length, `${entry} must load its compiled module`);
  assert.ok(styles.some(url => !url.startsWith('http')), `${entry} must load its compiled CSS`);
  for (const url of [...scripts, ...styles].filter(url => !url.startsWith('http'))) {
    assert.ok(existsSync(url.startsWith('/') ? resolve(output, url.slice(1)) : resolve(dirname(path), url)), `${entry}: missing ${url}`);
  }
  console.log(`PASS ${entry}: compiled JS/CSS links exist`);
}
