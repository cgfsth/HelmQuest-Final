import * as THREE from 'three';
import { collectIslandChartFootprints } from './worldIslands.js';
import { getActiveHarborDockBerth } from './harborDocks.js';
import { SIMULATION_SPAWN } from './sceneEnvironment.js';
import {
  FISHING_CHART_FILL,
  FISHING_CHART_FILL_ACTIVE,
  FISHING_CHART_STROKE,
  FISHING_CHART_STROKE_ACTIVE,
  FISHING_CHART_LABEL,
} from './fishingSpots.js';
import { LANDMARKS } from './landmarks.js';
import { projectToHelmChart } from './trainingNavMap.js';

/**
 * @typedef {Object} ChartRect
 * @property {number} minX
 * @property {number} maxX
 * @property {number} minZ
 * @property {number} maxZ
 * @property {string} [label]
 */

/**
 * @typedef {Object} TacticalChartSnapshot
 * @property {{ minX: number, maxX: number, minZ: number, maxZ: number }} bounds
 * @property {{ x: number, z: number, headingDeg: number }} boat
 * @property {ChartRect[]} islands
 * @property {ChartRect[]} docks
 * @property {{ x: number, z: number, label?: string, radius?: number, color?: number, active?: boolean }[]} waypoints
 * @property {{ x: number, z: number, label?: string }} [spawn]
 * @property {{ x: number, z: number, label?: string } | null} [navTarget]
 */

function expandBounds(bounds, x, z, pad = 0) {
  bounds.minX = Math.min(bounds.minX, x - pad);
  bounds.maxX = Math.max(bounds.maxX, x + pad);
  bounds.minZ = Math.min(bounds.minZ, z - pad);
  bounds.maxZ = Math.max(bounds.maxZ, z + pad);
}

function expandBoundsRect(bounds, rect, pad = 0) {
  expandBounds(bounds, rect.minX, rect.minZ, pad);
  expandBounds(bounds, rect.maxX, rect.maxZ, pad);
}

/**
 * @param {Object} params
 * @returns {TacticalChartSnapshot}
 */
export function buildTacticalChartSnapshot({
  boatX = 0,
  boatZ = 0,
  boatHeadingDeg = 0,
  islandGroup = null,
  harborDockGroup = null,
  berth = null,
  spawn = null,
  waypoints = [],
  navTarget = null
}) {
  const bounds = {
    minX: boatX,
    maxX: boatX,
    minZ: boatZ,
    maxZ: boatZ
  };

  const islands = collectIslandChartFootprints(islandGroup);
  for (const island of islands) expandBoundsRect(bounds, island, 40);

  const docks = [];
  if (harborDockGroup) {
    harborDockGroup.updateMatrixWorld(true);
    const dockBox = new THREE.Box3().setFromObject(harborDockGroup);
    if (!dockBox.isEmpty()) {
      docks.push({
        label: 'Harbor docks',
        minX: dockBox.min.x,
        maxX: dockBox.max.x,
        minZ: dockBox.min.z,
        maxZ: dockBox.max.z
      });
      expandBoundsRect(bounds, docks[0], 30);
    }
  }

  const activeBerth = berth ?? getActiveHarborDockBerth();
  if (activeBerth?.x != null) {
    const halfL = (activeBerth.length ?? 22) * 0.5;
    const halfW = (activeBerth.width ?? 10) * 0.5;
    const berthRect = {
      label: 'Berth',
      minX: activeBerth.x - halfW,
      maxX: activeBerth.x + halfW,
      minZ: activeBerth.z - halfL,
      maxZ: activeBerth.z + halfL
    };
    docks.push(berthRect);
    expandBoundsRect(bounds, berthRect, 20);
  }

  const spawnPt = spawn ?? { x: SIMULATION_SPAWN.x, z: SIMULATION_SPAWN.z, label: 'Spawn' };
  expandBounds(bounds, spawnPt.x, spawnPt.z, 50);

  for (const wp of waypoints) {
    if (wp.x == null || wp.z == null) continue;
    expandBounds(bounds, wp.x, wp.z, (wp.radius ?? 28) + 20);
  }

  if (navTarget?.x != null) {
    expandBounds(bounds, navTarget.x, navTarget.z, 60);
  }

  // Add landmarks to chart
  const landmarks = LANDMARKS.map(lm => ({
    ...lm,
    kind: 'landmark'
  }));

  const spanX = bounds.maxX - bounds.minX;
  const spanZ = bounds.maxZ - bounds.minZ;
  const minSpan = 2000; // Increased for Davao Gulf scale (was 280)
  if (spanX < minSpan) {
    const cx = (bounds.minX + bounds.maxX) * 0.5;
    bounds.minX = cx - minSpan * 0.5;
    bounds.maxX = cx + minSpan * 0.5;
  }
  if (spanZ < minSpan) {
    const cz = (bounds.minZ + bounds.maxZ) * 0.5;
    bounds.minZ = cz - minSpan * 0.5;
    bounds.maxZ = cz + minSpan * 0.5;
  }

  return {
    bounds,
    boat: { x: boatX, z: boatZ, headingDeg: boatHeadingDeg },
    islands,
    docks,
    waypoints,
    landmarks,
    spawn: spawnPt,
    navTarget: navTarget?.x != null ? navTarget : null
  };
}

function computeTransform(bounds, w, h, margin = 18) {
  const spanX = bounds.maxX - bounds.minX || 1;
  const spanZ = bounds.maxZ - bounds.minZ || 1;
  const scale = Math.min((w - margin * 2) / spanX, (h - margin * 2) / spanZ);
  return { scale, margin, spanX, spanZ };
}

/** North-up: +Z toward top of screen. */
export function worldToChartNorthUp(x, z, bounds, w, h, margin = 18) {
  const { scale } = computeTransform(bounds, w, h, margin);
  return {
    x: margin + (x - bounds.minX) * scale,
    y: h - margin - (z - bounds.minZ) * scale
  };
}

function drawRoundedRect(ctx, x, y, w, h, r) {
  const radius = Math.min(r, w * 0.5, h * 0.5);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + w - radius, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
  ctx.lineTo(x + w, y + h - radius);
  ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
  ctx.lineTo(x + radius, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

function drawGrid(ctx, w, h, bounds, margin) {
  const { scale } = computeTransform(bounds, w, h, margin);
  const stepM = scale > 1.2 ? 50 : scale > 0.6 ? 100 : 200;
  const startX = Math.floor(bounds.minX / stepM) * stepM;
  const startZ = Math.floor(bounds.minZ / stepM) * stepM;

  ctx.strokeStyle = 'rgba(148, 163, 184, 0.14)';
  ctx.lineWidth = 1;
  ctx.fillStyle = 'rgba(148, 163, 184, 0.35)';
  ctx.font = '9px system-ui, sans-serif';
  ctx.textAlign = 'center';

  for (let x = startX; x <= bounds.maxX; x += stepM) {
    const p1 = worldToChartNorthUp(x, bounds.minZ, bounds, w, h, margin);
    const p2 = worldToChartNorthUp(x, bounds.maxZ, bounds, w, h, margin);
    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y);
    ctx.lineTo(p2.x, p2.y);
    ctx.stroke();
  }

  for (let z = startZ; z <= bounds.maxZ; z += stepM) {
    const p1 = worldToChartNorthUp(bounds.minX, z, bounds, w, h, margin);
    const p2 = worldToChartNorthUp(bounds.maxX, z, bounds, w, h, margin);
    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y);
    ctx.lineTo(p2.x, p2.y);
    ctx.stroke();
  }

  ctx.fillText('N', w * 0.5, margin - 4);
  ctx.beginPath();
  ctx.moveTo(w * 0.5, margin);
  ctx.lineTo(w * 0.5, margin + 8);
  ctx.strokeStyle = 'rgba(248, 250, 252, 0.7)';
  ctx.stroke();
}

function hexColor(num) {
  return `#${num.toString(16).padStart(6, '0')}`;
}

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} w
 * @param {number} h
 * @param {TacticalChartSnapshot | null} snapshot
 * @param {{ margin?: number, showLegend?: boolean, boatUp?: boolean }} [options]
 */
export function drawTacticalChart(ctx, w, h, snapshot, options = {}) {
  const margin = options.margin ?? 18;
  const showLegend = options.showLegend !== false;

  ctx.fillStyle = '#1e4d72';
  ctx.fillRect(0, 0, w, h);

  if (!snapshot) {
    ctx.fillStyle = 'rgba(248, 250, 252, 0.5)';
    ctx.font = '12px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Chart loading…', w / 2, h / 2);
    return;
  }

  const { bounds } = snapshot;
  drawGrid(ctx, w, h, bounds, margin);

  for (const island of snapshot.islands) {
    const tl = worldToChartNorthUp(island.minX, island.maxZ, bounds, w, h, margin);
    const br = worldToChartNorthUp(island.maxX, island.minZ, bounds, w, h, margin);
    const rw = br.x - tl.x;
    const rh = br.y - tl.y;
    ctx.fillStyle = 'rgba(217, 196, 106, 0.92)';
    ctx.strokeStyle = 'rgba(120, 90, 40, 0.85)';
    ctx.lineWidth = 1.5;
    drawRoundedRect(ctx, tl.x, tl.y, rw, rh, 6);
    ctx.fill();
    ctx.stroke();

    if (island.label && rw > 36) {
      ctx.fillStyle = 'rgba(30, 41, 59, 0.75)';
      ctx.font = 'bold 10px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(island.label, tl.x + rw * 0.5, tl.y + rh * 0.5 + 4);
    }
  }

  for (const dock of snapshot.docks) {
    const tl = worldToChartNorthUp(dock.minX, dock.maxZ, bounds, w, h, margin);
    const br = worldToChartNorthUp(dock.maxX, dock.minZ, bounds, w, h, margin);
    ctx.fillStyle = 'rgba(92, 64, 48, 0.88)';
    ctx.strokeStyle = 'rgba(251, 191, 36, 0.9)';
    ctx.lineWidth = 2;
    drawRoundedRect(ctx, tl.x, tl.y, br.x - tl.x, br.y - tl.y, 4);
    ctx.fill();
    ctx.stroke();
  }

  if (snapshot.spawn) {
    const p = worldToChartNorthUp(snapshot.spawn.x, snapshot.spawn.z, bounds, w, h, margin);
    ctx.strokeStyle = 'rgba(74, 222, 128, 0.9)';
    ctx.fillStyle = 'rgba(74, 222, 128, 0.35)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }

  for (const wp of snapshot.waypoints) {
    const p = worldToChartNorthUp(wp.x, wp.z, bounds, w, h, margin);
    const scale = computeTransform(bounds, w, h, margin).scale;
    if (wp.kind === 'fishing') {
      const r = Math.max(6, (wp.radius ?? 45) * scale);
      ctx.fillStyle = wp.active ? FISHING_CHART_FILL_ACTIVE : FISHING_CHART_FILL;
      ctx.strokeStyle = wp.active ? FISHING_CHART_STROKE_ACTIVE : FISHING_CHART_STROKE;
      ctx.lineWidth = wp.active ? 2 : 1.25;
      ctx.beginPath();
      ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      if (wp.label) {
        ctx.fillStyle = FISHING_CHART_LABEL;
        ctx.font = 'bold 9px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Fish', p.x, p.y);
      }
      continue;
    }
    if (wp.kind === 'gear') {
      // Highlighted gear zone — bright orange with zone radius ring
      const worldR = wp.radius ?? 80;
      const zoneR = Math.max(8, Math.min(worldR * scale, 60));
      const dotR = wp.active ? 9 : 6;
      // Zone radius ring
      ctx.beginPath();
      ctx.arc(p.x, p.y, zoneR, 0, Math.PI * 2);
      ctx.strokeStyle = wp.active ? 'rgba(251,191,36,0.85)' : 'rgba(251,146,60,0.55)';
      ctx.lineWidth = wp.active ? 2 : 1.5;
      ctx.setLineDash([4, 3]);
      ctx.stroke();
      ctx.setLineDash([]);
      // Glow fill
      ctx.beginPath();
      ctx.arc(p.x, p.y, zoneR, 0, Math.PI * 2);
      ctx.fillStyle = wp.active ? 'rgba(251,191,36,0.15)' : 'rgba(251,146,60,0.1)';
      ctx.fill();
      // Center dot
      ctx.beginPath();
      ctx.arc(p.x, p.y, dotR, 0, Math.PI * 2);
      ctx.fillStyle = wp.active ? '#fbbf24' : '#fb923c';
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 1.5;
      ctx.fill();
      ctx.stroke();
      // Gear icon label
      ctx.fillStyle = '#0f172a';
      ctx.font = `bold ${wp.active ? 9 : 7}px system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('⚙', p.x, p.y);
      ctx.textBaseline = 'alphabetic';
      if (wp.label) {
        ctx.fillStyle = wp.active ? '#fef08a' : '#fed7aa';
        ctx.font = `bold ${wp.active ? 9 : 8}px system-ui, sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText(wp.label.split(' ')[0], p.x, p.y - dotR - 5);
      }
      continue;
    }
    const r = Math.max(4, Math.min(10, (wp.radius ?? 24) * scale * 0.08));
    const color = wp.color != null ? hexColor(wp.color) : '#a78bfa';
    ctx.strokeStyle = wp.active ? '#fef08a' : color;
    ctx.fillStyle = wp.active ? 'rgba(254, 240, 138, 0.35)' : 'rgba(167, 139, 250, 0.25)';
    ctx.lineWidth = wp.active ? 2.5 : 1.5;
    ctx.beginPath();
    ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    if (wp.label && wp.active) {
      ctx.fillStyle = '#fef9c3';
      ctx.font = 'bold 8px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(wp.label.split(' ')[0], p.x, p.y - r - 4);
    }
  }

  // Draw landmarks (Samal Island, Sasa Port, etc.)
  if (snapshot.landmarks) {
    for (const landmark of snapshot.landmarks) {
      if (landmark.x == null || landmark.z == null) continue;
      const p = worldToChartNorthUp(landmark.x, landmark.z, bounds, w, h, margin);
      
      // Different colors for islands vs ports
      const isPort = landmark.type === 'port';
      const fillColor = isPort ? 'rgba(96, 165, 250, 0.4)' : 'rgba(74, 222, 128, 0.4)';
      const strokeColor = isPort ? 'rgba(96, 165, 250, 0.9)' : 'rgba(74, 222, 128, 0.9)';
      
      // Draw landmark marker (diamond shape)
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(Math.PI / 4); // 45 degree rotation for diamond
      ctx.fillStyle = fillColor;
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.rect(-6, -6, 12, 12);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
      
      // Draw icon in center
      ctx.font = 'bold 10px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(landmark.icon || '📍', p.x, p.y);
      
      // Draw label below
      if (landmark.label) {
        ctx.fillStyle = isPort ? 'rgba(191, 219, 254, 0.95)' : 'rgba(134, 239, 172, 0.95)';
        ctx.font = 'bold 8px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillText(landmark.label, p.x, p.y + 10);
      }
    }
  }

  if (snapshot.navTarget) {
    const p = worldToChartNorthUp(snapshot.navTarget.x, snapshot.navTarget.z, bounds, w, h, margin);
    ctx.strokeStyle = 'rgba(250, 204, 21, 0.95)';
    ctx.fillStyle = 'rgba(250, 204, 21, 0.4)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(p.x, p.y - 10);
    ctx.lineTo(p.x + 7, p.y + 6);
    ctx.lineTo(p.x - 7, p.y + 6);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }

  const boatPt = worldToChartNorthUp(snapshot.boat.x, snapshot.boat.z, bounds, w, h, margin);
  const heading = snapshot.boat.headingDeg ?? 0;

  ctx.save();
  ctx.translate(boatPt.x, boatPt.y);
  if (options.boatUp) {
    ctx.rotate((heading * Math.PI) / 180);
  } else {
    ctx.rotate(0);
  }

  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = '#0f172a';
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.moveTo(0, -11);
  ctx.lineTo(7, 8);
  ctx.lineTo(0, 4);
  ctx.lineTo(-7, 8);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#38bdf8';
  ctx.beginPath();
  ctx.arc(0, 2, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  if (showLegend) {
    const lx = margin;
    const ly = h - margin - 52;
    ctx.fillStyle = 'rgba(15, 23, 42, 0.82)';
    drawRoundedRect(ctx, lx, ly, 108, 48, 6);
    ctx.fill();
    ctx.font = '9px system-ui, sans-serif';
    ctx.textAlign = 'left';
    const items = [
      ['■', '#d9c46a', 'Island'],
      ['■', '#5c4030', 'Docks'],
      ['▲', '#ffffff', 'Your vessel']
    ];
    items.forEach((row, i) => {
      ctx.fillStyle = row[1];
      ctx.fillText(row[0], lx + 8, ly + 14 + i * 14);
      ctx.fillStyle = '#e2e8f0';
      ctx.fillText(row[2], lx + 22, ly + 14 + i * 14);
    });
  }
}

/** Boat-up chart for helm MFD (heading rotates with vessel). */
export function drawHelmTacticalChart(ctx, w, h, snapshot, navOverlay = null) {
  drawTacticalChart(ctx, w, h, snapshot, { showLegend: false, boatUp: true, margin: 14 });

  if (navOverlay?.targetX != null && navOverlay?.targetZ != null && snapshot) {
    const pt = projectToHelmChart(
      w,
      h,
      snapshot.boat.x,
      snapshot.boat.z,
      snapshot.boat.headingDeg,
      navOverlay.targetX,
      navOverlay.targetZ
    );

    ctx.strokeStyle = 'rgba(250, 204, 21, 0.95)';
    ctx.fillStyle = 'rgba(250, 204, 21, 0.95)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(pt.x, pt.y - 14);
    ctx.bezierCurveTo(pt.x + 8, pt.y - 6, pt.x + 8, pt.y + 4, pt.x, pt.y + 10);
    ctx.bezierCurveTo(pt.x - 8, pt.y + 4, pt.x - 8, pt.y - 6, pt.x, pt.y - 14);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    const distLabel = navOverlay.distanceLabel ?? '';
    if (distLabel) {
      ctx.fillStyle = 'rgba(30, 41, 59, 0.92)';
      ctx.font = 'bold 10px system-ui, sans-serif';
      const tw = ctx.measureText(distLabel).width + 12;
      ctx.fillRect(pt.x - tw / 2, pt.y - 36, tw, 16);
      ctx.fillStyle = '#f8fafc';
      ctx.textAlign = 'center';
      ctx.fillText(distLabel, pt.x, pt.y - 26);
    }
  }
}

export function resizeTacticalCanvas(canvas, ctx) {
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
  return { w, h };
}

/** Boat-up circular radar chart (reference: compass ring + center vessel). */
export function drawCircularTacticalChart(ctx, w, h, snapshot, options = {}) {
  const cx = w / 2;
  const cy = h / 2;
  const bezel = options.bezel ?? Math.max(10, w * 0.06);
  const R = Math.min(w, h) / 2 - bezel;
  const maxRangeM = options.maxRangeM ?? 13000;
  const metersPerPx = maxRangeM / R;

  ctx.clearRect(0, 0, w, h);

  // Metallic outer ring
  ctx.beginPath();
  ctx.arc(cx, cy, R + bezel * 0.92, 0, Math.PI * 2);
  const ringGrad = ctx.createRadialGradient(cx, cy, R * 0.92, cx, cy, R + bezel);
  ringGrad.addColorStop(0, '#334155');
  ringGrad.addColorStop(0.55, '#1e293b');
  ringGrad.addColorStop(1, '#0b1220');
  ctx.fillStyle = ringGrad;
  ctx.fill();
  ctx.strokeStyle = 'rgba(148, 163, 184, 0.35)';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, R, 0, Math.PI * 2);
  ctx.clip();

  const oceanGrad = ctx.createRadialGradient(cx, cy, R * 0.1, cx, cy, R);
  oceanGrad.addColorStop(0, '#1e4976');
  oceanGrad.addColorStop(1, '#0c2340');
  ctx.fillStyle = oceanGrad;
  ctx.fillRect(cx - R, cy - R, R * 2, R * 2);

  if (!snapshot) {
    ctx.fillStyle = 'rgba(248, 250, 252, 0.55)';
    ctx.font = '12px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Chart…', cx, cy);
    ctx.restore();
    drawCompassRingOverlay(ctx, cx, cy, R);
    drawCenterVessel(ctx, cx, cy);
    return;
  }

  const boatX = snapshot.boat.x;
  const boatZ = snapshot.boat.z;
  const headingRad = ((snapshot.boat.headingDeg ?? 0) * Math.PI) / 180;

  /** @param {number} x @param {number} z */
  function worldToCircular(x, z) {
    const dx = x - boatX;
    const dz = z - boatZ;
    const sin = Math.sin(headingRad);
    const cos = Math.cos(headingRad);
    const forward = dx * sin - dz * cos;
    const right = dx * cos + dz * sin;
    return {
      x: cx + right / metersPerPx,
      y: cy - forward / metersPerPx,
      dist: Math.hypot(dx, dz)
    };
  }

  // Field-of-view wedge (bow up)
  const fovHalf = (48 * Math.PI) / 180;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.arc(0, 0, R * 0.95, -Math.PI / 2 - fovHalf, -Math.PI / 2 + fovHalf);
  ctx.closePath();
  ctx.fillStyle = 'rgba(56, 189, 248, 0.16)';
  ctx.fill();
  ctx.restore();

  function drawFootprint(rect, fill, glow, stroke) {
    const corners = [
      worldToCircular(rect.minX, rect.minZ),
      worldToCircular(rect.maxX, rect.minZ),
      worldToCircular(rect.maxX, rect.maxZ),
      worldToCircular(rect.minX, rect.maxZ)
    ];
    if (corners.every((p) => isOutsideDisc(p, cx, cy, R * 1.15))) return;

    ctx.beginPath();
    corners.forEach((p, i) => {
      if (i === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    });
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
    if (glow) {
      ctx.strokeStyle = glow;
      ctx.lineWidth = 3.5;
      ctx.stroke();
    }
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    if (rect.label) {
      const mid = corners.reduce(
        (acc, p) => ({ x: acc.x + p.x / 4, y: acc.y + p.y / 4 }),
        { x: 0, y: 0 }
      );
      if (Math.hypot(mid.x - cx, mid.y - cy) < R * 0.82) {
        ctx.fillStyle = 'rgba(248, 250, 252, 0.92)';
        ctx.font = 'bold 11px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(rect.label.charAt(0).toUpperCase(), mid.x, mid.y);
      }
    }
  }

  for (const island of snapshot.islands) {
    drawFootprint(island, 'rgba(186, 180, 204, 0.92)', 'rgba(56, 189, 248, 0.85)', 'rgba(148, 163, 184, 0.5)');
  }

  for (const dock of snapshot.docks) {
    drawFootprint(dock, 'rgba(92, 64, 48, 0.9)', 'rgba(251, 191, 36, 0.75)', 'rgba(251, 191, 36, 0.55)');
  }

  for (const wp of snapshot.waypoints) {
    const p = worldToCircular(wp.x, wp.z);
    if (wp.kind === 'fishing') {
      const worldRadius = wp.radius ?? 45;
      if (p.dist - worldRadius > maxRangeM) continue;
      const trueR = worldRadius / metersPerPx;
      const spotR = Math.max(10, Math.min(trueR, R * 0.38));
      ctx.fillStyle = wp.active ? FISHING_CHART_FILL_ACTIVE : FISHING_CHART_FILL;
      ctx.strokeStyle = wp.active ? FISHING_CHART_STROKE_ACTIVE : FISHING_CHART_STROKE;
      ctx.lineWidth = wp.active ? 2 : 1.25;
      ctx.beginPath();
      ctx.arc(p.x, p.y, spotR, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      if (wp.label) {
        ctx.fillStyle = FISHING_CHART_LABEL;
        ctx.font = 'bold 8px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(spotR >= 14 ? 'Fish' : '●', p.x, p.y);
      }
      continue;
    }
    if (wp.kind === 'gear') {
      // Highlighted gear zone on radar — orange glow
      const worldRadius = wp.radius ?? 80;
      if (p.dist - worldRadius > maxRangeM) continue;
      const trueR = worldRadius / metersPerPx;
      const zoneR = Math.max(8, Math.min(trueR, R * 0.35));
      const dotR = wp.active ? 8 : 5;
      // Zone dashed ring
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.arc(p.x, p.y, zoneR, 0, Math.PI * 2);
      ctx.strokeStyle = wp.active ? 'rgba(251,191,36,0.9)' : 'rgba(251,146,60,0.6)';
      ctx.lineWidth = wp.active ? 2 : 1.5;
      ctx.stroke();
      ctx.setLineDash([]);
      // Zone fill
      ctx.beginPath();
      ctx.arc(p.x, p.y, zoneR, 0, Math.PI * 2);
      ctx.fillStyle = wp.active ? 'rgba(251,191,36,0.12)' : 'rgba(251,146,60,0.08)';
      ctx.fill();
      // Outer pulse ring when active
      if (wp.active) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, zoneR + 4, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(254,240,138,0.45)';
        ctx.lineWidth = 1;
        ctx.stroke();
      }
      // Center dot
      ctx.beginPath();
      ctx.arc(p.x, p.y, dotR, 0, Math.PI * 2);
      ctx.fillStyle = wp.active ? '#fbbf24' : '#fb923c';
      ctx.strokeStyle = 'rgba(15,23,42,0.8)';
      ctx.lineWidth = 1.5;
      ctx.fill();
      ctx.stroke();
      // Gear icon
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#0f172a';
      ctx.font = `bold ${wp.active ? 8 : 6}px system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText('⚙', p.x, p.y);
      ctx.textBaseline = 'alphabetic';
      continue;
    }
    if (isOutsideDisc(p, cx, cy, R)) continue;
    const color = wp.color != null ? hexColor(wp.color) : '#a78bfa';
    ctx.strokeStyle = wp.active ? '#fef08a' : color;
    ctx.fillStyle = wp.active ? 'rgba(254, 240, 138, 0.45)' : 'rgba(167, 139, 250, 0.35)';
    ctx.lineWidth = wp.active ? 2.5 : 1.5;
    ctx.beginPath();
    ctx.arc(p.x, p.y, wp.active ? 6 : 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }

  // Draw landmarks on circular radar
  if (snapshot.landmarks) {
    for (const landmark of snapshot.landmarks) {
      if (landmark.x == null || landmark.z == null) continue;
      const p = worldToCircular(landmark.x, landmark.z);
      if (isOutsideDisc(p, cx, cy, R)) continue;
      
      // Different colors for islands vs ports
      const isPort = landmark.type === 'port';
      const fillColor = isPort ? 'rgba(96, 165, 250, 0.5)' : 'rgba(74, 222, 128, 0.5)';
      const strokeColor = isPort ? 'rgba(96, 165, 250, 0.95)' : 'rgba(74, 222, 128, 0.95)';
      
      // Draw landmark marker (diamond)
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(Math.PI / 4);
      ctx.fillStyle = fillColor;
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.rect(-5, -5, 10, 10);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
      
      // Draw icon
      ctx.font = 'bold 9px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(landmark.icon || '📍', p.x, p.y);
      ctx.textBaseline = 'alphabetic';
    }
  }

  if (snapshot.navTarget) {
    const p = worldToCircular(snapshot.navTarget.x, snapshot.navTarget.z);
    if (!isOutsideDisc(p, cx, cy, R * 0.98)) {
      ctx.fillStyle = 'rgba(250, 204, 21, 0.95)';
      ctx.strokeStyle = '#fef08a';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(p.x, p.y - 8);
      ctx.lineTo(p.x + 6, p.y + 5);
      ctx.lineTo(p.x - 6, p.y + 5);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
  }

  ctx.restore();

  drawCompassRingOverlay(ctx, cx, cy, R, headingRad);

  if (snapshot.navTarget) {
    drawEdgeWaypointPin(ctx, cx, cy, R + bezel * 0.35, boatX, boatZ, snapshot.navTarget, headingRad);
  }

  const activeWp = snapshot.waypoints.find(w => w.active);
  if (activeWp) {
    drawEdgeWaypointPin(ctx, cx, cy, R + bezel * 0.35, boatX, boatZ, activeWp, headingRad);
  }

  drawCenterVessel(ctx, cx, cy);
}

function isOutsideDisc(p, cx, cy, r) {
  return Math.hypot(p.x - cx, p.y - cy) > r;
}

function drawCompassRingOverlay(ctx, cx, cy, R, headingRad = 0) {
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.18)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(cx, cy, R * 0.9, 0, Math.PI * 2);
  ctx.stroke();

  for (let deg = 0; deg < 360; deg += 10) {
    const rad = ((deg - 90) * Math.PI) / 180 - headingRad;
    const major = deg % 45 === 0;
    const inner = R * (major ? 0.68 : 0.74);
    const outer = R * 0.98;
    ctx.strokeStyle = major ? 'rgba(255,255,255,0.55)' : 'rgba(255,255,255,0.22)';
    ctx.lineWidth = major ? 1.5 : 1;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(rad) * inner, cy + Math.sin(rad) * inner);
    ctx.lineTo(cx + Math.cos(rad) * outer, cy + Math.sin(rad) * outer);
    ctx.stroke();
  }

  const labels = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  labels.forEach((label, i) => {
    // This radar is bow-up: rotate world directions opposite to the boat heading,
    // matching the small compass face and the heading strip.
    const rad = ((i * 45 - 90) * Math.PI) / 180 - headingRad;
    const lr = R * 0.58;
    ctx.fillStyle = label === 'N' ? '#f8fafc' : 'rgba(248, 250, 252, 0.88)';
    ctx.font = `${label.length > 1 ? '600 9px' : '700 11px'} system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, cx + Math.cos(rad) * lr, cy + Math.sin(rad) * lr);
  });

  // Outer rim cardinal chevrons
  for (let i = 0; i < 8; i++) {
    const rad = ((i * 45 - 90) * Math.PI) / 180 - headingRad;
    const pr = R + 3;
    const px = cx + Math.cos(rad) * pr;
    const py = cy + Math.sin(rad) * pr;
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.beginPath();
    ctx.moveTo(px + Math.cos(rad) * 5, py + Math.sin(rad) * 5);
    ctx.lineTo(px + Math.cos(rad + 2.4) * 2, py + Math.sin(rad + 2.4) * 2);
    ctx.lineTo(px + Math.cos(rad - 2.4) * 2, py + Math.sin(rad - 2.4) * 2);
    ctx.closePath();
    ctx.fill();
  }
}

function drawCenterVessel(ctx, cx, cy) {
  ctx.fillStyle = '#ef4444';
  ctx.beginPath();
  ctx.arc(cx, cy, 3.5, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = 'rgba(15, 23, 42, 0.85)';
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(cx, cy - 12);
  ctx.lineTo(cx + 7, cy + 7);
  ctx.lineTo(cx, cy + 3);
  ctx.lineTo(cx - 7, cy + 7);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
}

function drawEdgeWaypointPin(ctx, cx, cy, ringR, boatX, boatZ, target, headingRad = 0) {
  const dx = target.x - boatX;
  const dz = target.z - boatZ;
  if (Math.hypot(dx, dz) < 8) return;

  const sin = Math.sin(headingRad);
  const cos = Math.cos(headingRad);
  const forward = dx * sin - dz * cos;
  const right = dx * cos + dz * sin;
  
  // Positive forward is ahead of the vessel (the top of the radar).
  const relBearing = Math.atan2(right, forward);

  const px = cx + Math.sin(relBearing) * ringR;
  const py = cy - Math.cos(relBearing) * ringR;

  ctx.save();
  ctx.translate(px, py);
  ctx.rotate(relBearing);

  ctx.fillStyle = '#facc15';
  ctx.strokeStyle = '#fef08a';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(0, -10);
  ctx.bezierCurveTo(7, -2, 7, 8, 0, 14);
  ctx.bezierCurveTo(-7, 8, -7, -2, 0, -10);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = 'rgba(30, 41, 59, 0.9)';
  ctx.beginPath();
  ctx.arc(0, 5, 3.5, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}
