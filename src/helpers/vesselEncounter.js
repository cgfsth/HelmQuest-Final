import { normalizeEncounter, ENCOUNTER_VESSEL_RADIUS } from '../../shared/vesselEncounter.js';

const radians = degrees => degrees * Math.PI / 180;
const forward = heading => ({ x: Math.sin(radians(heading)), z: -Math.cos(radians(heading)) });
const length = vector => Math.hypot(vector.x, vector.z);
const dot = (a, b) => a.x * b.x + a.z * b.z;
const subtract = (a, b) => ({ x: a.x - b.x, z: a.z - b.z });
const angleDifference = (a, b) => (a - b + 540) % 360 - 180;
const knots = value => value * .514444;

export function closestApproach(relativePosition, relativeVelocity, horizon = 180) {
  const squaredSpeed = dot(relativeVelocity, relativeVelocity);
  const time = squaredSpeed > .0001 ? Math.max(0, Math.min(horizon, -dot(relativePosition, relativeVelocity) / squaredSpeed)) : 0;
  return { time, distance: Math.hypot(relativePosition.x + relativeVelocity.x * time, relativePosition.z + relativeVelocity.z * time) };
}
export function observedSidelight(vessel, observer) {
  const direction = forward(vessel.heading), right = { x: -direction.z, z: direction.x };
  const relative = subtract(observer, vessel);
  const bearing = Math.atan2(dot(relative, right), dot(relative, direction)) * 180 / Math.PI;
  if (Math.abs(bearing) > 112.5) return 'white';
  if (Math.abs(bearing) < 1) return 'both';
  return bearing > 0 ? 'green' : 'red';
}

export function createVesselEncounter(settings, own, target = null) {
  const config = normalizeEncounter(settings);
  if (config.type === 'none') return null;
  const route = target ? subtract(target, own) : forward(own.heading);
  const heading = target && length(route) > 100 ? Math.atan2(route.x, -route.z) * 180 / Math.PI : own.heading;
  const ahead = forward(heading), right = { x: -ahead.z, z: ahead.x };
  const distance = target && length(route) > 400
    ? Math.min(length(route) * .6, config.warningDistance * 1.5)
    : config.warningDistance * 1.5;
  const center = { x: own.x + ahead.x * distance, z: own.z + ahead.z * distance };
  const side = config.type === 'crossing-green' ? -1 : 1;
  const crossing = config.type !== 'anchored';
  const lateral = crossing ? distance : 0;
  const npc = { x: center.x + right.x * lateral * side, z: center.z + right.z * lateral * side,
    heading: crossing ? heading - side * 90 : heading, speed: 0, radius: ENCOUNTER_VESSEL_RADIUS, anchored: !crossing };
  return { config, npc, center, ahead, right, origin: { x: own.x, z: own.z }, initialHeading: heading,
    ownRadius: Math.max(8, (own.length || 60) * .5), previousOwn: { ...own }, previousNpc: { ...npc },
    started: false, approached: false, elapsed: 0, ownTravel: 0, minimumClearance: Infinity,
    initialSpeed: 0, actionTaken: false, yielding: false, resolved: false, successful: false,
    collision: false, accuracy: 0, events: [], recedingTime: 0, standOnDeviationTime: 0, clearance: null, cpa: null };
}

// Continuous relative segment distance prevents a fast vessel tunnelling through
// a stationary or moving hull between frames.
function sweptDistance(previous, current) {
  const movement = subtract(current, previous), squared = dot(movement, movement);
  const t = squared > 0 ? Math.max(0, Math.min(1, -dot(previous, movement) / squared)) : 0;
  return Math.hypot(previous.x + movement.x * t, previous.z + movement.z * t);
}
function event(state, type) {
  if (!state.events.some(value => value.type === type)) state.events.push({ type, elapsed: state.elapsed });
}

export function updateVesselEncounter(state, own, delta) {
  if (!state || !(delta > 0) || ![own.x, own.z, own.heading, own.speed].every(Number.isFinite)) return state;
  if (state.resolved) {
    state.previousOwn = { ...own };
    state.clearance = Math.max(0, length(subtract(state.npc, own)) - state.ownRadius - state.npc.radius);
    return state;
  }
  const dt = Math.min(delta, .1), { config, npc } = state;
  state.elapsed += dt;
  state.ownTravel += length(subtract(own, state.previousOwn));
  const ownVelocity = forward(own.heading);
  ownVelocity.x *= knots(own.speed); ownVelocity.z *= knots(own.speed);
  if (!state.started && own.speed > 1 && state.ownTravel >= 15) {
    state.started = true; state.initialSpeed = Math.max(1, own.speed);
    if (!npc.anchored) npc.speed = Math.max(1, Math.min(60, own.speed));
  }
  // Player boats accelerate well beyond displacement speeds in this simulator.
  // Establish the crossing speed during approach, then hold it once observed.
  // Never slow the NPC to mirror a student's early give-way deceleration.
  if (state.started && !state.approached && !state.yielding && !npc.anchored) {
    npc.speed = Math.max(npc.speed, Math.min(60, own.speed));
    state.initialSpeed = Math.max(state.initialSpeed, own.speed);
  }
  const relative = subtract(npc, own), hulls = state.ownRadius + npc.radius;
  const npcDirection = forward(npc.heading);
  let npcVelocity = { x: npcDirection.x * knots(npc.speed), z: npcDirection.z * knots(npc.speed) };
  const prediction = closestApproach(relative, subtract(npcVelocity, ownVelocity));
  state.cpa = Math.max(0, prediction.distance - hulls);
  const distance = Math.max(0, length(relative) - hulls);
  // Green crossing: the NPC gives way early with a visible, substantial
  // starboard alteration. The student still has a collision-avoidance duty.
  if (state.started && config.type === 'crossing-green' && !state.yielding && distance < config.warningDistance * 1.6 && state.cpa < config.clearance * 1.5) {
    state.yielding = true; npc.heading += 65; npc.speed *= .55;
    const direction = forward(npc.heading);
    npcVelocity = { x: direction.x * knots(npc.speed), z: direction.z * knots(npc.speed) };
  }
  state.previousNpc = { ...npc };
  npc.x += npcVelocity.x * dt; npc.z += npcVelocity.z * dt;
  const currentRelative = subtract(npc, own);
  const previousRelative = subtract(state.previousNpc, state.previousOwn);
  const swept = sweptDistance(previousRelative, currentRelative);
  state.clearance = Math.max(0, length(currentRelative) - hulls);
  if (state.started && distance < config.warningDistance * 1.6) state.approached = true;
  if (state.approached) state.minimumClearance = Math.min(state.minimumClearance, Math.max(0, swept - hulls));
  if (swept <= hulls) { state.collision = true; state.minimumClearance = 0; event(state, 'VESSEL_COLLISION'); }
  if (state.approached && state.clearance < config.clearance && !state.collision) event(state, 'UNSAFE_CLEARANCE');
  const turn = angleDifference(own.heading, state.initialHeading);
  const slowed = own.speed <= state.initialSpeed * .7;
  const nowPrediction = closestApproach(currentRelative, subtract(npcVelocity, ownVelocity));
  const safePrediction = nowPrediction.distance - hulls >= config.clearance;
  if (state.approached) {
    if (config.type === 'crossing-red' && (turn >= 15 || slowed) && safePrediction) state.actionTaken = true;
    if (npc.anchored && (Math.abs(turn) >= 15 || slowed) && safePrediction) state.actionTaken = true;
    if (config.type === 'crossing-green') {
      const emergency = state.clearance < config.clearance * 1.5;
      if ((Math.abs(turn) <= 12 && !slowed && state.yielding) || (emergency && safePrediction)) state.actionTaken = true;
      if (state.yielding && !emergency && safePrediction && (Math.abs(turn) > 12 || slowed)) state.standOnDeviationTime += dt;
      else state.standOnDeviationTime = 0;
      if (state.standOnDeviationTime > 5) event(state, 'INCORRECT_ENCOUNTER_RESPONSE');
    }
  }
  const receding = dot(currentRelative, subtract(npcVelocity, ownVelocity)) > 0;
  if (state.approached && receding && state.clearance > config.clearance * 1.5 && state.ownTravel >= 40) state.recedingTime += dt;
  else state.recedingTime = 0;
  // Waiting without meeting/passing the target cannot complete the exercise.
  if (state.collision || state.recedingTime >= 4) {
    state.resolved = true;
    state.successful = !state.collision && state.minimumClearance >= config.clearance;
    state.accuracy = state.successful ? state.actionTaken && !state.events.some(value => value.type === 'INCORRECT_ENCOUNTER_RESPONSE') ? 100 : 50 : 0;
    if (state.successful && !state.actionTaken) event(state, 'INCORRECT_ENCOUNTER_RESPONSE');
  }
  state.previousOwn = { ...own };
  return state;
}
export function vesselEncounterResult(state) {
  if (!state) return null;
  return { type: state.config.type, resolved: state.resolved, successful: state.successful, collision: state.collision,
    accuracy: state.accuracy, minimumClearance: Number.isFinite(state.minimumClearance) ? state.minimumClearance : 0,
    events: state.events.map(value => ({ ...value })) };
}
export function vesselEncounterGuidance(state) {
  if (!state) return null;
  const { config } = state;
  const light = config.type === 'anchored' ? 'white' : observedSidelight(state.npc, state.previousOwn);
  const emergency = state.clearance != null && state.clearance < config.clearance * 1.5;
  const instruction = config.type === 'anchored'
    ? 'Anchored vessel: plan a clear route around it. Reduce speed and leave room for its hull and anchor swing.'
    : config.type === 'crossing-red'
      ? 'Crossing: you are the give-way vessel. Make an early, substantial maneuver; slow down or pass astern. Avoid crossing ahead.'
      : 'Crossing: you are the stand-on vessel. Maintain course and speed while the other vessel gives way. Keep watching its movement.';
  return { type: config.type, light, distance: state.clearance == null ? null : Math.round(state.clearance),
    bearing: Math.round((Math.atan2(state.npc.x - state.previousOwn.x, state.previousOwn.z - state.npc.z) * 180 / Math.PI + 360) % 360),
    clearance: config.clearance, warningDistance: config.warningDistance, resolved: state.resolved, successful: state.successful,
    status: state.resolved ? state.successful && state.accuracy === 100 ? 'Exercise complete' : 'Exercise finished — review safety and response'
      : emergency ? 'Collision risk — take safe action now' : state.approached
        ? state.clearance > config.warningDistance ? 'Vessel ahead — plan your response' : 'Vessel encounter in progress'
        : 'Approach the training vessel',
    instruction, emergency, yielding: state.yielding,
    tips: ['Keep a lookout and monitor whether the separation is increasing.',
      `Keep at least ${config.clearance} m hull clearance for this exercise. Slow down early.`,
      'Stand-on never means ignore danger: take collision-avoidance action if the other vessel is not keeping clear.'] };
}
