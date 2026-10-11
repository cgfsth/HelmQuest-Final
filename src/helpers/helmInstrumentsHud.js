/**
 * Bridge MFD overlays — Salvation-style nav + classic radar (pic 1), drawn on dash screens.
 */

import { projectToHelmChart, projectToRadar } from './trainingNavMap.js';
import { drawHelmTacticalChart, drawTacticalChart } from './tacticalChart.js';

const radarClutter = [];
for (let i = 0; i < 400; i++) {
  radarClutter.push({
    a: Math.random() * Math.PI * 2,
    d: 0.15 + Math.random() * 0.75,
    r: 1 + Math.random() * 3
  });
}

/** Classic PPI: white rings, yellow sweep (reference bridge pic 2). */
function drawRadarDisplay(ctx, w, h, sweepAngle, navOverlay = null) {
  const cx = w / 2;
  const cy = h / 2;
  const R = Math.min(w, h) * 0.46;

  ctx.fillStyle = '#030303';
  ctx.fillRect(0, 0, w, h);

  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, R, 0, Math.PI * 2);
  ctx.clip();

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.55)';
  ctx.lineWidth = 1;
  for (let i = 1; i <= 5; i++) {
    ctx.beginPath();
    ctx.arc(cx, cy, (R * i) / 5, 0, Math.PI * 2);
    ctx.stroke();
  }

  for (const p of radarClutter) {
    const px = cx + Math.cos(p.a) * p.d * R;
    const py = cy + Math.sin(p.a) * p.d * R;
    ctx.fillStyle = `rgba(255, 255, 200, ${0.35 + Math.random() * 0.25})`;
    ctx.beginPath();
    ctx.arc(px, py, p.r, 0, Math.PI * 2);
    ctx.fill();
  }

  const trail = ctx.createConicGradient(sweepAngle - Math.PI / 2, cx, cy);
  trail.addColorStop(0, 'rgba(0, 0, 0, 0.85)');
  trail.addColorStop(0.05, 'rgba(0, 0, 0, 0.4)');
  trail.addColorStop(0.12, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = trail;
  ctx.fillRect(cx - R, cy - R, R * 2, R * 2);

  ctx.strokeStyle = 'rgba(255, 220, 60, 0.95)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(cx + Math.cos(sweepAngle) * R, cy + Math.sin(sweepAngle) * R);
  ctx.stroke();

  if (navOverlay?.targetX != null && navOverlay?.targetZ != null) {
    const blip = projectToRadar(w, h, navOverlay.boatX ?? 0, navOverlay.boatZ ?? 0, navOverlay.targetX, navOverlay.targetZ);
    if (blip.inRange) {
      ctx.fillStyle = 'rgba(250, 204, 21, 0.95)';
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(blip.x, blip.y, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
  }

  ctx.restore();

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(cx, cy, R, 0, Math.PI * 2);
  ctx.stroke();
}

/** Live chart from world positions (islands, docks, boat). */
function drawNavigationChart(ctx, w, h, headingDeg, navOverlay = null, chartSnapshot = null) {
  if (chartSnapshot) {
    drawHelmTacticalChart(ctx, w, h, chartSnapshot, navOverlay);
    return;
  }
  drawTacticalChart(ctx, w, h, null, { showLegend: false, boatUp: true, margin: 14 });
}

function resizeCanvas(canvas, ctx) {
  if (!canvas || !ctx) return;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const rect = canvas.getBoundingClientRect();
  const w = Math.max(1, Math.floor(rect.width * dpr));
  const h = Math.max(1, Math.floor(rect.height * dpr));
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w;
    canvas.height = h;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
  }
}

/**
 * @param {{ radar: HTMLCanvasElement, nav: HTMLCanvasElement, engine?: HTMLCanvasElement | null }} canvases
 */
export function initHelmInstrumentsHud(canvases) {
  const radarCtx = canvases.radar.getContext('2d');
  const navCtx = canvases.nav.getContext('2d');
  const engineCtx = canvases.engine?.getContext('2d') ?? null;

  const resize = () => {
    resizeCanvas(canvases.radar, radarCtx);
    resizeCanvas(canvases.nav, navCtx);
    if (canvases.engine && engineCtx) resizeCanvas(canvases.engine, engineCtx);
  };

  resize();
  const onResize = () => resize();
  window.addEventListener('resize', onResize);

  return { ...canvases, radarCtx, navCtx, engineCtx, onResize };
}

/**
 * @param {ReturnType<typeof initHelmInstrumentsHud>} hud
 * @param {number} time
 * @param {number} headingDeg
 */
export function updateHelmInstrumentsHud(hud, time, headingDeg, navOverlay = null, chartSnapshot = null) {
  if (!hud) return;
  const { radarCtx, navCtx, radar, nav } = hud;

  drawRadarDisplay(radarCtx, radar.width, radar.height, time * 1.4, navOverlay);
  drawNavigationChart(navCtx, nav.width, nav.height, headingDeg, navOverlay, chartSnapshot);
}

/**
 * @param {ReturnType<typeof initHelmInstrumentsHud> | null} hud
 */
export function disposeHelmInstrumentsHud(hud) {
  if (!hud) return;
  window.removeEventListener('resize', hud.onResize);
}
