/**
 * Project world XZ positions onto helm MFD screens (chart + radar).
 * Compass convention: 0° = north (-Z), 90° = east (+X).
 */

/** @returns {{ x: number, y: number }} Chart pixel coords (boat at center, bow up). */
export function projectToHelmChart(canvasW, canvasH, boatX, boatZ, headingDeg, targetX, targetZ) {
  const cx = canvasW * 0.5;
  const cy = canvasH * 0.52;
  const metersPerPixel = 2.8;

  const dx = targetX - boatX;
  const dz = targetZ - boatZ;
  const headingRad = (headingDeg * Math.PI) / 180;
  const sin = Math.sin(headingRad);
  const cos = Math.cos(headingRad);

  const forward = dx * sin - dz * cos;
  const right = dx * cos + dz * sin;

  return {
    x: cx + right / metersPerPixel,
    y: cy - forward / metersPerPixel
  };
}

/** @returns {{ x: number, y: number, dist: number, inRange: boolean }} Radar PPI pixel coords. */
export function projectToRadar(canvasW, canvasH, boatX, boatZ, targetX, targetZ, maxRangeM = 480) {
  const cx = canvasW / 2;
  const cy = canvasH / 2;
  const R = Math.min(canvasW, canvasH) * 0.46;

  const dx = targetX - boatX;
  const dz = targetZ - boatZ;
  const dist = Math.hypot(dx, dz);
  const bearing = Math.atan2(dx, -dz);
  const dNorm = Math.min(1, dist / maxRangeM);

  return {
    x: cx + Math.sin(bearing) * dNorm * R,
    y: cy - Math.cos(bearing) * dNorm * R,
    dist,
    inRange: dist <= maxRangeM
  };
}
