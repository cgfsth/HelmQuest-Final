// Exercise margins, not statutory safe distances. Crossing exercises use two
// ordinary power-driven vessels in sight, outside channels and fishing activity.
export const ENCOUNTER_TYPES = Object.freeze(['none', 'anchored', 'crossing-red', 'crossing-green']);
export const DEFAULT_ENCOUNTER = Object.freeze({ type: 'none', clearance: 100, warningDistance: 600 });
export const ENCOUNTER_VESSEL_RADIUS = 25;
export const ENCOUNTER_RULES_SOURCE = 'https://www.navcen.uscg.gov/sites/default/files/pdf/navRules/navrules.pdf';
export function normalizeEncounter(value = {}) {
  const type = value?.type ?? 'none';
  const clearance = Number(value?.clearance ?? 100), warningDistance = Number(value?.warningDistance ?? 600);
  if (!ENCOUNTER_TYPES.includes(type) || !Number.isFinite(clearance) || clearance < 30 || clearance > 500 ||
      !Number.isFinite(warningDistance) || warningDistance < clearance * 3 || warningDistance > 3000) {
    throw new Error('Choose a valid vessel exercise: clearance 30–500 m and warning distance at least three times clearance, up to 3000 m.');
  }
  return { type, clearance, warningDistance };
}
export function validEncounterResult(config, result) {
  if (config.type === 'none') return result == null;
  if (!result || result.type !== config.type || typeof result.resolved !== 'boolean' || typeof result.collision !== 'boolean'
    || typeof result.successful !== 'boolean' || !Number.isFinite(result.accuracy) || result.accuracy < 0 || result.accuracy > 100) return false;
  const clearance = Number.isFinite(result.minimumClearance) && result.minimumClearance >= 0;
  if (!result.resolved) return !result.successful && !result.collision && result.accuracy === 0 && (clearance || result.minimumClearance === null);
  return clearance &&
    result.successful === (!result.collision && result.minimumClearance >= config.clearance) &&
    (!result.collision || result.accuracy === 0);
}

export function normalizeEncounterAttempt(config, result) {
  if (config.type !== 'none' && result == null) {
    return { type: config.type, resolved: false, successful: false, collision: false, accuracy: 0, minimumClearance: null, events: [] };
  }
  if (!validEncounterResult(config, result)) throw new Error('Invalid vessel exercise result.');
  return result;
}

export function encounterSafetyScore(baseSafety, result) {
  if (!result) return baseSafety;
  const exerciseScore = result.resolved && result.successful && !result.collision ? result.accuracy : 0;
  if (baseSafety == null) return 0;
  // Preserve invalid inputs for the rubric validator instead of coercing them.
  return Number.isFinite(baseSafety) && baseSafety >= 0 && baseSafety <= 100 ? Math.min(baseSafety, exerciseScore) : baseSafety;
}
