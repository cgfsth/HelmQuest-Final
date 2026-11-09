import * as THREE from 'three';

/** Buoyancy owns height; propulsion must move only in the horizontal plane. */
export function applyBoatBuoyancy(boat, motion, waterline, bank = 0) {
  const limit = motion.maxTilt;
  boat.position.y = THREE.MathUtils.lerp(boat.position.y, waterline + motion.height, motion.heaveBlend);
  // Hulls face local +X: X is roll and Z is bow/stern pitch.
  boat.rotation.x = THREE.MathUtils.lerp(boat.rotation.x,
    THREE.MathUtils.clamp(motion.rotationX + bank, -limit, limit), motion.blend);
  boat.rotation.z = THREE.MathUtils.lerp(boat.rotation.z,
    THREE.MathUtils.clamp(motion.rotationZ, -limit, limit), motion.blend);
}

/** A rudder builds yaw rate gradually; integrate the response over elapsed time. */
export function advanceBoatSteering(rate, target, delta, length, releaseDamping) {
  const responseTime = releaseDamping === undefined
    ? 0.26 * THREE.MathUtils.clamp(length / 60, 0.65, 2.5)
    : -1 / (60 * Math.log(releaseDamping));
  const decay = Math.exp(-delta / responseTime);
  return {
    rate: target + (rate - target) * decay,
    angle: target * delta + (rate - target) * responseTime * (1 - decay),
  };
}
