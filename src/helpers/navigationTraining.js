import { headingDelta, normalizeHeadingDeg } from './trainingValidation.js';

export const CARDINAL_NAMES = {
  0: 'North (N)',
  45: 'Northeast (NE)',
  90: 'East (E)',
  135: 'Southeast (SE)',
  180: 'South (S)',
  225: 'Southwest (SW)',
  270: 'West (W)',
  315: 'Northwest (NW)'
};

export function cardinalLabelForHeading(deg) {
  const n = normalizeHeadingDeg(deg);
  if (n in CARDINAL_NAMES) return CARDINAL_NAMES[n];
  if (n < 22.5 || n >= 337.5) return CARDINAL_NAMES[0];
  if (n < 67.5) return CARDINAL_NAMES[45];
  if (n < 112.5) return CARDINAL_NAMES[90];
  if (n < 157.5) return CARDINAL_NAMES[135];
  if (n < 202.5) return CARDINAL_NAMES[180];
  if (n < 247.5) return CARDINAL_NAMES[225];
  if (n < 292.5) return CARDINAL_NAMES[270];
  return CARDINAL_NAMES[315];
}

export function compassBearingToTarget(boatX, boatZ, targetX, targetZ) {
  const dx = targetX - boatX;
  const dz = targetZ - boatZ;
  return normalizeHeadingDeg((Math.atan2(dx, -dz) * 180) / Math.PI);
}

export function formatHeadingStepHint(step, stats, headingHold = null) {
  if (step?.requireHeadingDeg == null || !stats) return '';

  const target = normalizeHeadingDeg(step.requireHeadingDeg);
  const current = normalizeHeadingDeg(stats.rotationDeg);
  const off = Math.round(headingDelta(current, target));
  const tol = step.headingTolerance ?? 12;
  const label = step.compassLabel ?? cardinalLabelForHeading(target);

  if (off > tol) {
    const turn = ((target - current + 540) % 360) - 180;
    const dir = turn > 0 ? 'starboard (right)' : 'port (left)';
    return `Turn ${dir} to ${Math.round(target)}° (${label}). Now ${Math.round(current)}° (${off}° off).`;
  }

  if (step.holdHeadingMs && headingHold?.startedAt == null) {
    return `On heading ${Math.round(target)}° (${label}). Hold steady.`;
  }

  if (step.holdHeadingMs && headingHold?.startedAt != null) {
    const remain = Math.max(0, Math.ceil((step.holdHeadingMs - (performance.now() - headingHold.startedAt)) / 1000));
    if (remain > 0) {
      return `Good. Hold ${Math.round(target)}° for ${remain}s.`;
    }
  }

  if (step.requiresTurn && step.minTurn) {
    return `Heading OK — complete a deliberate turn of at least ${step.minTurn}° from where you started this step.`;
  }

  return `Heading ${Math.round(current)}° matches ${label}. Hold steady.`;
}

export function updateHeadingHoldState(step, stats, headingHold, now = performance.now()) {
  if (!headingHold || step?.requireHeadingDeg == null) {
    if (headingHold) headingHold.startedAt = null;
    return;
  }

  const target = normalizeHeadingDeg(step.requireHeadingDeg);
  const current = normalizeHeadingDeg(stats.rotationDeg);
  const tol = step.headingTolerance ?? 12;

  if (headingDelta(current, target) > tol) {
    headingHold.startedAt = null;
    return;
  }

  if (step.maxSpeedKnots != null && Math.abs(stats.speedKnots) > step.maxSpeedKnots) {
    headingHold.startedAt = null;
    return;
  }

  if (!step.holdHeadingMs) return;

  if (headingHold.startedAt == null) {
    headingHold.startedAt = now;
  }
}
