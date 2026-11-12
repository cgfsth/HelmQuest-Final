// The existing PerformanceManager overall weights, shared without an engine dependency.
export const SIMULATION_WEIGHTS = Object.freeze({ steeringWeight: .35, courseWeight: .35, dockingWeight: .20, timeWeight: .10 });
export function simulationPerformance(scores, passScore = 70) {
  const number = (value, nullable = false) => {
    if (nullable && value == null) return null;
    if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > 100) throw new Error('Invalid simulation performance metric.');
    return value;
  };
  const steering = number(scores.steering), course = number(scores.course), docking = number(scores.docking, true), time = number(scores.time, true), safety = number(scores.safety, true);
  const w = SIMULATION_WEIGHTS;
  const score = Math.round(steering * w.steeringWeight + course * w.courseWeight + (docking ?? course) * w.dockingWeight + (time ?? 85) * w.timeWeight);
  return { score, passed: score >= passScore, passScore, scoringVersion: 'simulation-v1',
    performanceMetrics: { steeringPrecision: steering, courseAccuracy: course, dockingAccuracy: docking, timeEfficiency: time, safetyCompliance: safety } };
}
export function validDockingCompletion(evidence) {
  return !!evidence && evidence.objectivesComplete === true && evidence.totalSteps > 0 && evidence.completedSteps >= evidence.totalSteps
    && evidence.anchored === true && evidence.engineStopped === true && evidence.inPort === true
    && Number.isFinite(evidence.speedKnots) && Math.abs(evidence.speedKnots) <= 2;
}
