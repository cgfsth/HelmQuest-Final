// Common practical rubric, aligned to lesson outcomes; not academic grade weights.
export const SIMULATION_WEIGHTS = Object.freeze({ completion: .40, accuracy: .40, safety: .20 });
export const SIMULATION_SCORING_VERSION = 'simulation-v2';
const mean = values => values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
const encounterPassed = encounter => encounter?.successful === true && encounter.accuracy === 100;
export function simulationScoringInputs(state, run = null, encounter = null) {
  const required = run?.totalSteps ?? state.objectivesRequired ?? 0;
  const completed = run?.stepsCompleted ?? state.objectivesCompleted?.length ?? 0;
  const accuracy = [];
  if (state.totalDeviationSamples > 0 || state.headingHistory?.length > 1) accuracy.push(state.steeringScore);
  if (state.objectivesCompleted?.length) {
    // Completion has its own criterion. Assess execution using recorded order/
    // omission errors, not the old fixed waypoint/anchor/dock completion weights.
    const executionPenalties = (state.penalties || []).filter(event =>
      ['SequenceViolation', 'SkippedObjective', 'WaypointCircling'].includes(event.type) && Number.isFinite(event.amount));
    accuracy.push(Math.max(0, 100 - executionPenalties.reduce((sum, event) => sum + event.amount, 0)));
  }
  if (state.dockingScore != null) accuracy.push(state.dockingScore);
  if (encounter?.resolved) accuracy.push(encounter.accuracy);
  const total = required + (encounter ? 1 : 0);
  return {
    completion: total > 0 ? Math.max(0, Math.min(100, (completed + (encounterPassed(encounter) ? 1 : 0)) / total * 100)) : null,
    accuracy: mean(accuracy.filter(Number.isFinite)), safety: state.safetyScore ?? null,
    criticalSafetyFailure: !!encounter?.collision,
    requiredExerciseFailed: !!encounter?.resolved && !encounterPassed(encounter),
    steering: state.totalDeviationSamples > 0 || state.headingHistory?.length > 1 ? state.steeringScore : null,
    course: state.objectivesCompleted?.length ? state.courseScore : null,
    docking: state.dockingScore, time: state.timeScore,
  };
}
export function simulationPerformance(scores, passScore = 70) {
  if (!scores || !Number.isFinite(passScore) || passScore < 0 || passScore > 100) throw new Error('Invalid simulation scoring parameters.');
  const number = value => {
    if (value == null) return null;
    if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > 100) throw new Error('Invalid simulation performance metric.');
    return value;
  };
  const steering = number(scores.steering), course = number(scores.course), docking = number(scores.docking), time = number(scores.time);
  const criteria = { completion: number(scores.completion), accuracy: number(Object.hasOwn(scores, 'accuracy') ? scores.accuracy : mean([steering, course, docking].filter(value => value != null))), safety: number(scores.safety) };
  const applicable = Object.keys(criteria).filter(key => criteria[key] != null);
  const weight = applicable.reduce((sum, key) => sum + SIMULATION_WEIGHTS[key], 0);
  if (!weight) throw new Error('No simulation assessment data was recorded.');
  const score = Math.round(applicable.reduce((sum, key) => sum + criteria[key] * SIMULATION_WEIGHTS[key], 0) / weight);
  const assessmentComplete = criteria.completion != null && criteria.accuracy != null && criteria.safety != null;
  return { score, passed: assessmentComplete && score >= passScore && scores.criticalSafetyFailure !== true && scores.requiredExerciseFailed !== true, passScore,
    scoringVersion: SIMULATION_SCORING_VERSION, assessmentComplete, criticalSafetyFailure: scores.criticalSafetyFailure === true,
    requiredExerciseFailed: scores.requiredExerciseFailed === true,
    rubric: Object.fromEntries(Object.keys(criteria).map(key => [key, { score: criteria[key], weight: SIMULATION_WEIGHTS[key], assessed: criteria[key] != null }])),
    performanceMetrics: { objectiveCompletion: criteria.completion, taskAccuracy: criteria.accuracy, safetyCompliance: criteria.safety,
      steeringPrecision: steering, courseAccuracy: course, dockingAccuracy: docking, timeEfficiency: time } };
}
export function validDockingCompletion(evidence) {
  return !!evidence && evidence.objectivesComplete === true && Number.isInteger(evidence.totalSteps) && evidence.totalSteps > 0
    && Number.isInteger(evidence.completedSteps) && evidence.completedSteps >= evidence.totalSteps
    && evidence.anchored === true && evidence.engineStopped === true && evidence.inPort === true
    && Number.isFinite(evidence.speedKnots) && Math.abs(evidence.speedKnots) <= 2;
}

// The backend derives objective completion from counts instead of accepting a
// separately supplied completion percentage. The caller validates the exercise.
export function completedSimulationScores(scores, completion, encounter = null) {
  const total = completion.totalSteps + (encounter ? 1 : 0);
  return { ...scores, completion: Math.min(100, (completion.completedSteps + (encounterPassed(encounter) ? 1 : 0)) / total * 100),
    safety: encounter?.collision ? 0 : encounter && !encounter.successful && scores.safety != null ? Math.min(scores.safety, 80) : scores.safety,
    requiredExerciseFailed: !!encounter && !encounterPassed(encounter),
    criticalSafetyFailure: scores.criticalSafetyFailure === true || encounter?.collision === true };
}
