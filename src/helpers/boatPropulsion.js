// Scene distances are metres; velocity is metres/second and the HUD uses knots.
const METRES_PER_SECOND_PER_KNOT = 1852 / 3600;
export const knotsToMetersPerSecond = knots => knots * METRES_PER_SECOND_PER_KNOT;
export const metersPerSecondToKnots = speed => speed / METRES_PER_SECOND_PER_KNOT;

/** Time-based throttle response with hull inertia, coasting and astern braking. */
export function advanceBoatSpeed(speed, input, delta, profile, weather = {}, loadScale = 1) {
  if (!Number.isFinite(speed)) speed = 0;
  if (!Number.isFinite(delta) || delta <= 0) return speed;
  const dt = Math.min(delta, .25);
  const forwardLimit = knotsToMetersPerSecond(profile.maxSpeedKnots);
  const reverseLimit = knotsToMetersPerSecond(profile.maxReverseKnots);
  const throttle = input.engineRunning ? Number(Boolean(input.forward)) - Number(Boolean(input.reverse)) : 0;
  if (!throttle) {
    const drag = weather.dragScale ?? 1;
    const coast = speed * Math.exp(-dt * drag / profile.coastTimeConstant);
    return Math.abs(coast) < .005 ? 0 : coast;
  }

  const weatherSpeedScale = Math.min(1, Math.sqrt((weather.thrustScale ?? 1) / (weather.dragScale ?? 1)));
  const target = throttle > 0 ? forwardLimit * weatherSpeedScale : -reverseLimit * weatherSpeedScale;
  const inertia = Math.max(.25, Math.min(2, loadScale));
  let remainingTime = dt;
  if (speed * throttle < 0) {
    // Opposite throttle first removes momentum before the propeller drives astern/ahead.
    const deceleration = profile.brakingDeceleration * inertia * (weather.thrustScale ?? 1);
    const timeToStop = Math.abs(speed) / deceleration;
    if (timeToStop >= dt) return speed - Math.sign(speed) * deceleration * dt;
    speed = 0;
    remainingTime -= timeToStop;
  }
  const responseTime = throttle > 0 ? profile.accelerationTimeTo90 : profile.reverseTimeTo90;
  const rate = Math.log(10) * inertia * (weather.thrustScale ?? 1) / responseTime;
  const next = target + (speed - target) * Math.exp(-rate * remainingTime);
  return Math.max(-reverseLimit, Math.min(forwardLimit, next));
}
