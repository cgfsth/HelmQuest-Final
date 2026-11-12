import { createPrototypeState, stepPrototype, makeMeasurements, PRESETS } from './prototypeState.js';
import './prototype.css';
const params = new URLSearchParams(location.search), name = params.get('engine') === 'three' ? 'three' : 'babylon', quality = PRESETS[params.get('quality')] ? params.get('quality') : 'medium';
const state = createPrototypeState(), keys = {}, metrics = makeMeasurements(name, quality), canvas = document.querySelector('#sea');
const settings = document.querySelector('#settings'); settings.engine.value = name; settings.quality.value = quality;
let adapter, disposed = false, frame, last, lastUi = 0, lastAdaptive = 0, ratio = Math.min(devicePixelRatio || 1, PRESETS[quality].ratio);
const disposals = [];
function listen(target, type, handler, options) { target.addEventListener(type, handler, options); disposals.push(() => target.removeEventListener(type, handler, options)); }
function action(code) { if (code === 'KeyP') state.engineRunning = !state.engineRunning; if (code === 'KeyH') state.anchored = !state.anchored; if (code === 'KeyC') state.bridge = !state.bridge; }
listen(window, 'keydown', event => { if (/INPUT|SELECT|TEXTAREA/.test(event.target.tagName)) return; if (!event.repeat) action(event.code); keys[event.code] = true; if (['KeyW', 'KeyA', 'KeyS', 'KeyD'].includes(event.code)) event.preventDefault(); });
listen(window, 'keyup', event => { keys[event.code] = false; });
listen(window, 'blur', () => { for (const key of Object.keys(keys)) keys[key] = false; });
listen(document, 'visibilitychange', () => { last = null; metrics.resetFrameClock(); if (document.hidden) for (const key of Object.keys(keys)) keys[key] = false; });
for (const button of document.querySelectorAll('[data-key]')) { listen(button, 'pointerdown', event => { event.preventDefault(); keys[button.dataset.key] = true; button.setPointerCapture(event.pointerId); }); for (const event of ['pointerup', 'pointercancel', 'lostpointercapture']) listen(button, event, () => { keys[button.dataset.key] = false; }); }
for (const [id, code] of [['engine', 'KeyP'], ['anchor', 'KeyH'], ['camera', 'KeyC']]) listen(document.getElementById(id), 'click', () => action(code));
listen(document.querySelector('#pause'), 'click', () => { state.paused = !state.paused; });
listen(document.querySelector('#waves'), 'input', event => { state.waves = Number(event.target.value); });
listen(document.querySelector('#lighting'), 'change', event => adapter?.lighting(event.target.value));
listen(settings, 'submit', event => { event.preventDefault(); location.search = new URLSearchParams(new FormData(settings)); });
listen(window, 'resize', () => adapter?.resize());
listen(document.querySelector('#export'), 'click', () => { const url = URL.createObjectURL(new Blob([JSON.stringify(metrics.snapshot(), null, 2)], { type: 'application/json' })); const link = document.createElement('a'); link.href = url; link.download = `helmquest-${name}-${quality}.json`; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); });
function dispose() { if (disposed) return; disposed = true; cancelAnimationFrame(frame); disposals.forEach(fn => fn()); adapter?.dispose(); }
listen(window, 'pagehide', dispose, { once: true });
window.helmquestPrototype = { state, keys, metrics, ready: false, dispose,
  renderHealth() { return adapter?.health(); },
  setMission(mission) { state.mission = mission; adapter?.setMission(mission); } };
async function start() { try {
  const module = name === 'babylon' ? await import('./renderers/babylon.js') : await import('./renderers/three.js');
  adapter = await module.createRenderer({ canvas, preset: PRESETS[quality], metrics, onProgress: text => { document.querySelector('#loading').textContent = text; } });
  if (disposed) adapter.dispose();
  else {
    metrics.loadMs = performance.now() - metrics.startedAt; window.helmquestPrototype.ready = true;
    document.querySelector('#loading').textContent = `${name === 'babylon' ? 'Babylon.js' : 'Three.js'} · assets ready`;
    const animate = now => { if (disposed) return; frame = requestAnimationFrame(animate); if (document.hidden) { last = null; return; } const delta = last == null ? 0 : (now - last) / 1000; last = now; stepPrototype(state, keys, delta, adapter.collision); adapter.render(state); metrics.frame(now);
      if (now - lastUi > 500) { lastUi = now; const m = metrics.snapshot(); document.querySelector('#telemetry').textContent = `${(state.speedKnots || 0).toFixed(1)} kn · heading ${((90 - state.yaw * 180 / Math.PI + 360) % 360).toFixed(0)}°\n${state.engineRunning ? 'Engine on' : 'Engine off'} · ${state.anchored ? 'Anchored' : 'Anchor up'}\n${m.fps?.toFixed(1) || '—'} FPS · p95 ${m.p95FrameMs?.toFixed(1) || '—'} ms\nLoad ${(metrics.loadMs / 1000).toFixed(2)} s · collisions ${state.collisions}`;
        if (m.frames > 120 && now - lastAdaptive > 3000) { lastAdaptive = now; const next = m.fps < 28 ? Math.max(.65, ratio * .85) : m.fps > 55 ? Math.min(Math.min(devicePixelRatio || 1, PRESETS[quality].ratio), ratio + .1) : ratio; if (Math.abs(next - ratio) > .01) { ratio = next; adapter.setResolution(ratio); } }
      }
    }; frame = requestAnimationFrame(animate);
  }
} catch (error) { document.querySelector('#loading').textContent = `Prototype unavailable: ${error.message}. Use the existing simulator from your course.`; window.helmquestPrototype.error = error.message; console.error(error); } }
start();
