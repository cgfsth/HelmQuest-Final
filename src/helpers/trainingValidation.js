import { isBoatInZone } from './missionWaypoints.js';

export const TRAINING_STEP_MIN_MS = 1200;
export const TRAINING_PLACEHOLDER_MIN_MS = 4000;
export const WAYPOINT_MIN_TRAVEL_M = 12;

export function normalizeHeadingDeg(deg) {
  return ((deg % 360) + 360) % 360;
}

export function headingDelta(fromDeg, toDeg) {
  const from = normalizeHeadingDeg(fromDeg);
  const to = normalizeHeadingDeg(toDeg);
  let delta = Math.abs(to - from);
  if (delta > 180) delta = 360 - delta;
  return delta;
}

export function captureStepBaseline(stats, anchor, boatPosition) {
  return {
    speedKnots: stats.speedKnots,
    rotationDeg: normalizeHeadingDeg(stats.rotationDeg),
    anchorDeployed: anchor.deployed,
    boatX: boatPosition?.x ?? 0,
    boatZ: boatPosition?.z ?? 0
  };
}

function boatTravelDistance(baseline, boatPosition) {
  if (!baseline || !boatPosition) return 0;
  return Math.hypot(boatPosition.x - baseline.boatX, boatPosition.z - baseline.boatZ);
}

function evaluateWaypointStep(step, context) {
  const { baseline, startedAt, now, stats, boatPosition, waypoints } = context;
  const zone = waypoints?.find((entry) => entry.id === step.waypointZone);
  if (!zone || zone.visualOnly || !boatPosition) return false;

  const elapsed = now - startedAt;
  if (elapsed < TRAINING_STEP_MIN_MS) return false;

  const inZone = isBoatInZone(boatPosition.x, boatPosition.z, zone);
  if (!inZone && !context.interactionReady) return false;

  const speedLimit = step.maxSpeedKnots ?? zone.maxSpeedKnots;
  if (speedLimit != null && Math.abs(stats.speedKnots) > speedLimit) {
    return false;
  }

  const requiredHeading = step.requireHeadingDeg ?? zone.requireHeadingDeg ?? zone.berthHeadingDeg;
  const headingTolerance = step.headingTolerance ?? zone.headingTolerance ?? 25;
  if (requiredHeading != null) {
    const heading = normalizeHeadingDeg(stats.rotationDeg);
    if (headingDelta(heading, requiredHeading) > headingTolerance) {
      return false;
    }
  }

  const traveled = boatTravelDistance(baseline, boatPosition);
  if (step.requireReturn) {
    return traveled >= WAYPOINT_MIN_TRAVEL_M;
  }

  /**
   * If step requires interaction (Q button), don't auto-complete based on proximity or time.
   * The interaction must be completed first through the mini-game system.
   */
  if (step.requireInteraction) {
    // The caller verifies activeInteraction after the waypoint is reached.
    // Returning true here arms the interaction without auto-completing it.
    return true;
  }

  return traveled >= WAYPOINT_MIN_TRAVEL_M || elapsed >= TRAINING_PLACEHOLDER_MIN_MS;
}

export function evaluateTrainingStep(step, context) {
  const { baseline, startedAt, now, stats, anchor } = context;
  if (!baseline) return false;

  if (step.anchorAction === 'deploy') {
    return !baseline.anchorDeployed && anchor.deployed &&
      (!step.waypointZone || evaluateWaypointStep(step, { ...context, interactionReady: false }));
  }

  if (step.anchorAction === 'retract') {
    return baseline.anchorDeployed && !anchor.deployed &&
      (!step.waypointZone || evaluateWaypointStep(step, { ...context, interactionReady: false }));
  }

  if (step.requireHeadingDeg != null && !step.waypointZone) {
    return evaluateCompassHeadingStep(step, context);
  }

  if (step.waypointZone) {
    const waypointOk = evaluateWaypointStep(step, context);
    if (!waypointOk) return false;
    
    /**
     * For waypoints requiring interaction, verify the interaction was completed.
     * The activeInteraction state is set by completeMiniGame() after successful interaction.
     */
    if (step.requireInteraction) {
      const interactionMatches = context.activeInteraction === step.requireInteraction;
      if (interactionMatches) {
        console.log(`✅ Interaction ${step.requireInteraction} completed for waypoint ${step.waypointZone}`);
      } else {
        console.log(`⏸️ Waiting for interaction: ${step.requireInteraction} (waypoint ${step.waypointZone})`);
      }
      return interactionMatches;
    }

    if (!step.check && !step.requiresTurn && step.requireHeadingDeg == null) return true;

    const elapsed = now - startedAt;
    if (elapsed < TRAINING_STEP_MIN_MS) return false;

    if (step.allowIdle) {
      return step.check?.(stats) ?? true;
    }

    if (step.check && !step.check(stats)) return false;

    if (step.requiresTurn) {
      const zone = context.waypoints?.find((entry) => entry.id === step.waypointZone);
      const requiredHeading =
        step.requireHeadingDeg ?? zone?.requireHeadingDeg ?? zone?.berthHeadingDeg;
      // Waypoint marks with a target heading already prove the turn — baseline delta
      // fails when the player begins turning before the step timer starts.
      if (requiredHeading != null) return true;

      const headingChange = headingDelta(
        baseline.rotationDeg,
        normalizeHeadingDeg(stats.rotationDeg)
      );
      return headingChange >= (step.minTurn ?? 12);
    }

    return true;
  }

  if (step.alignHeadingFromZone) {
    const elapsed = now - startedAt;
    if (elapsed < TRAINING_STEP_MIN_MS) return false;

    const zone = context.waypoints?.find((entry) => entry.id === step.alignHeadingFromZone);
    const requiredHeading = zone?.berthHeadingDeg ?? zone?.requireHeadingDeg;
    if (requiredHeading == null) return false;
    const heading = normalizeHeadingDeg(stats.rotationDeg);
    const headingChange = headingDelta(baseline.rotationDeg, heading);
    const tolerance = step.headingTolerance ?? zone?.headingTolerance ?? 20;
    if (headingDelta(heading, requiredHeading) > tolerance) return false;
    if (step.requiresTurn) return headingChange >= (step.minTurn ?? 12);
    return true;
  }

  const elapsed = now - startedAt;
  if (elapsed < TRAINING_STEP_MIN_MS) return false;

  const speed = stats.speedKnots;
  const heading = normalizeHeadingDeg(stats.rotationDeg);
  const speedDelta = Math.abs(speed - baseline.speedKnots);
  const headingChange = headingDelta(baseline.rotationDeg, heading);
  const userMoved = speedDelta >= 0.35 || headingChange >= 10;

  if (step.allowIdle) {
    return step.check?.(stats) ?? false;
  }

  if (step.placeholder) {
    return elapsed >= TRAINING_PLACEHOLDER_MIN_MS && userMoved;
  }

  if (!step.check?.(stats)) return false;

  if (step.requiresTurn) {
    return headingChange >= (step.minTurn ?? 12);
  }

  return userMoved;
}

/**
 * Compass / cardinal heading steps (no geofence).
 * Uses requireHeadingDeg, optional holdHeadingMs, optional requiresTurn.
 */
export function evaluateCompassHeadingStep(step, context) {
  const { baseline, startedAt, now, stats } = context;
  if (!baseline) return false;

  const elapsed = now - startedAt;
  if (elapsed < TRAINING_STEP_MIN_MS) return false;

  const target = normalizeHeadingDeg(step.requireHeadingDeg);
  const heading = normalizeHeadingDeg(stats.rotationDeg);
  const tolerance = step.headingTolerance ?? 12;

  if (headingDelta(heading, target) > tolerance) return false;

  if (step.maxSpeedKnots != null && Math.abs(stats.speedKnots) > step.maxSpeedKnots) {
    return false;
  }

  const hold = context.headingHold;
  if (step.holdHeadingMs) {
    if (!hold?.startedAt) return false;
    if (now - hold.startedAt < step.holdHeadingMs) return false;
  }

  if (step.requiresTurn) {
    const headingChange = headingDelta(baseline.rotationDeg, heading);
    const startedOnTarget = headingDelta(baseline.rotationDeg, target) <= tolerance;
    if (!startedOnTarget && headingChange < (step.minTurn ?? 12)) {
      return false;
    }
  }

  if (step.check && !step.check(stats)) return false;

  return true;
}
