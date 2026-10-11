export function isFinitePosition(position) {
  return Number.isFinite(position?.x) && Number.isFinite(position?.z);
}

// Perpendicular distance to the intended course, rather than distance to its destination.
export function crossTrackDistance(position, routeStart, routeEnd) {
  if (![position, routeStart, routeEnd].every(isFinitePosition)) return 0;
  const dx = routeEnd.x - routeStart.x;
  const dz = routeEnd.z - routeStart.z;
  const length = Math.hypot(dx, dz);
  if (!length) return 0;
  return Math.abs(dx * (position.z - routeStart.z) - dz * (position.x - routeStart.x)) / length;
}
