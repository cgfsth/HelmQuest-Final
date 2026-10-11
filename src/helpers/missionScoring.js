// ==================================================
// SCORING CONFIGURATION CONSTANTS - 4-METRIC SYSTEM
// ==================================================
const PASSING_SCORE = 70; // Changed from 80 to 70 as per new requirements

// NEW: 4-Metric Weighted Scoring System
const WEIGHTS = {
  STEPS_COMPLETED: 0.40,    // 40% - Sequential step completion
  WAYPOINTS_REACHED: 0.30,  // 30% - Non-sequential waypoint visits
  QUIZ_SCORE: 0.20,         // 20% - Quiz performance
  TIME_PERFORMANCE: 0.10    // 10% - Time efficiency
};

/**
 * Calculate mission performance score - 4-METRIC SYSTEM
 * Components:
 * 1. Steps (40%) - Sequential, requires interaction
 * 2. Waypoints (30%) - Non-sequential, just reaching
 * 3. Quiz (20%) - Quiz performance
 * 4. Time (10%) - Time efficiency
 * 
 * @param {Object} params - Scoring parameters
 * @param {number} params.stepsCompleted - Number of steps completed (sequential)
 * @param {number} params.totalSteps - Total number of steps in mission
 * @param {number} params.waypointsReached - Number of waypoints reached (non-sequential)
 * @param {number} params.totalWaypoints - Total number of waypoints
 * @param {number} params.quizCorrect - Number of correct quiz answers
 * @param {number} params.quizTotal - Total number of quiz questions
 * @param {number} params.actualTimeMinutes - Actual time taken in minutes
 * @param {number} params.targetTimeMinutes - Target time in minutes
 * @param {Object} mission - Mission configuration
 * @returns {Object} Complete performance result with all 4 metrics
 */
export function calculateMissionScore(params, mission = {}) {
  // Validate inputs
  if (!params || typeof params !== 'object') {
    throw new Error('Invalid scoring parameters');
  }

  const nonnegative = (value, fallback = 0) => {
    const number = Number(value);
    return Number.isFinite(number) && number >= 0 ? number : fallback;
  };
  const totalSteps = nonnegative(params.totalSteps ?? 1);
  const totalWaypoints = nonnegative(params.totalWaypoints ?? 1);
  const quizTotal = nonnegative(params.quizTotal ?? 1);
  const stepsCompleted = Math.min(nonnegative(params.stepsCompleted), totalSteps);
  const waypointsReached = Math.min(nonnegative(params.waypointsReached), totalWaypoints);
  const quizCorrect = Math.min(nonnegative(params.quizCorrect), quizTotal);
  const actualTimeMinutes = nonnegative(params.actualTimeMinutes);
  const targetTimeMinutes = nonnegative(params.targetTimeMinutes ?? 10, 10) || 10;
  const passScore = Math.min(100, nonnegative(mission.passScore ?? PASSING_SCORE, PASSING_SCORE));
  
  // 1. STEPS SCORE (40%) - Sequential completion
  const stepsScore = totalSteps > 0 ? (stepsCompleted / totalSteps) * 100 : 0;
  const stepsContribution = stepsScore * WEIGHTS.STEPS_COMPLETED;
  
  // 2. WAYPOINTS SCORE (30%) - Non-sequential reaching
  // Heading/handling exercises may have no waypoint requirement.
  const waypointsScore = totalWaypoints > 0 ? (waypointsReached / totalWaypoints) * 100 : 100;
  const waypointsContribution = waypointsScore * WEIGHTS.WAYPOINTS_REACHED;
  
  // 3. QUIZ SCORE (20%)
  const quizScore = quizTotal > 0 ? (quizCorrect / quizTotal) * 100 : 0;
  const quizContribution = quizScore * WEIGHTS.QUIZ_SCORE;
  
  // 4. TIME SCORE (10%)
  let timeScore = 100;
  if (actualTimeMinutes > targetTimeMinutes) {
    timeScore = (targetTimeMinutes / actualTimeMinutes) * 100;
  }
  // Cap at 100%
  timeScore = Math.min(timeScore, 100);
  const timeContribution = timeScore * WEIGHTS.TIME_PERFORMANCE;
  
  // Calculate final score
  const finalScore = Math.round(
    stepsContribution + 
    waypointsContribution + 
    quizContribution + 
    timeContribution
  );
  
  console.log('⭐ [4-METRIC SCORE CALCULATION]', {
    steps: `${stepsCompleted}/${totalSteps} = ${stepsScore.toFixed(1)}% → ${stepsContribution.toFixed(1)} points`,
    waypoints: `${waypointsReached}/${totalWaypoints} = ${waypointsScore.toFixed(1)}% → ${waypointsContribution.toFixed(1)} points`,
    quiz: `${quizCorrect}/${quizTotal} = ${quizScore.toFixed(1)}% → ${quizContribution.toFixed(1)} points`,
    time: `${actualTimeMinutes.toFixed(1)}/${targetTimeMinutes} min = ${timeScore.toFixed(1)}% → ${timeContribution.toFixed(1)} points`,
    finalScore: `${finalScore}%`
  });
  
  return {
    score: finalScore,
    passed: finalScore >= passScore,
    passScore,
    // Individual metrics
    stepsScore: Math.round(stepsScore),
    waypointsScore: Math.round(waypointsScore),
    quizScore: Math.round(quizScore),
    timeScore: Math.round(timeScore),
    // Contributions
    stepsContribution: Math.round(stepsContribution),
    waypointsContribution: Math.round(waypointsContribution),
    quizContribution: Math.round(quizContribution),
    timeContribution: Math.round(timeContribution),
    // Counts for display
    stepsCompleted,
    totalSteps,
    waypointsReached,
    totalWaypoints,
    quizCorrect,
    quizTotal,
    actualTimeMinutes: Math.round(actualTimeMinutes * 10) / 10,
    targetTimeMinutes,
    // Breakdown for compatibility
    breakdown: {
      steps: Math.round(stepsScore),
      waypoints: Math.round(waypointsScore),
      quiz: Math.round(quizScore),
      time: Math.round(timeScore)
    }
  };
}

// =======================================================================
// DEPRECATED FUNCTIONS - OLD 2-METRIC SYSTEM (Steering + Course)
// These functions are no longer used in the new 4-metric scoring system
// Kept for reference only
// =======================================================================

/**
 * Calculate Steering Precision from actual heading performance
 * Uses actual heading errors to determine steering quality
 * 
 * @param {Object} telemetry - Must contain steering data
 * @returns {number} Score between 0-100
 * @deprecated Use calculateMissionScore with 4-metric system instead
 */
function calculateSteeringPrecision(telemetry) {
  const { steering = {} } = telemetry;
  const { 
    headingErrors = [], 
    sharpTurns = 0, 
    steeringChanges = 0,
    steeringInputs = 0 
  } = steering;
  
  console.log('🎯 [STEERING PRECISION] Inputs:', {
    headingErrorsCount: headingErrors.length,
    steeringInputs,
    sharpTurns,
    steeringChanges,
    telemetryStepsCompleted: telemetry.stepsCompleted,
    telemetryTotalSteps: telemetry.totalSteps
  });
  
  // If no steering data tracked, base score on step completion
    if (headingErrors.length === 0) {
    const { stepsCompleted = 0, totalSteps = 1 } = telemetry;
      const completionRatio = Math.min(1, Math.max(0, stepsCompleted / totalSteps));
    const score = Math.round(completionRatio * 85);
    console.log('🎯 [STEERING PRECISION] No steering data - using completion ratio:', {
      stepsCompleted,
      totalSteps,
      completionRatio,
      score
    });
    // Return score based on completion: 0 steps = 0%, all steps = 85% (not perfect without data)
    return score;
  }
  
  let score = 100;
  
  // Calculate average heading error if available
  if (headingErrors.length > 0) {
    const totalError = headingErrors.reduce((sum, error) => sum + Math.abs(error), 0);
    const averageError = totalError / headingErrors.length;
    
    // Convert error to score deduction
    // 0° error = no deduction, 30°+ error = significant deduction
    const errorPenalty = Math.min(50, (averageError / 30) * 50);
    score -= errorPenalty;
    console.log('🎯 [STEERING PRECISION] Heading error penalty:', errorPenalty, 'Score after:', score);
  }
  
  // Penalize sharp turns (> 30° in short time)
  if (sharpTurns > 0 && steeringInputs > 0) {
    const sharpTurnRatio = sharpTurns / steeringInputs;
    const sharpTurnPenalty = Math.min(30, sharpTurnRatio * 100);
    score -= sharpTurnPenalty;
    console.log('🎯 [STEERING PRECISION] Sharp turn penalty:', sharpTurnPenalty, 'Score after:', score);
  }
  
  console.log('🎯 [STEERING PRECISION] Final score:', score, 'Clamped:', clampScore(score));
  
  return clampScore(score);
}

/**
 * Calculate Procedural Correctness from actual mission violations
 * Tracks adherence to mission procedures and requirements
 * 
 * @param {Object} telemetry - Must contain procedure violation data
 * @returns {number} Score between 0-100
 */
function calculateProceduralCorrectness(telemetry) {
  const { procedure = {}, waypointsRequired = 0, waypointsReached = 0, stepsCompleted = 0, totalSteps = 0 } = telemetry;
  const { violations = 0, skippedWaypoints = 0, wrongOrder = 0, restrictedAreaEntries = 0 } = procedure;
  
  // Calculate total required actions
  const requiredActions = Math.max(1, waypointsRequired + totalSteps);
  const completedActions = waypointsReached + stepsCompleted;
  
  // Calculate total violations
  const totalViolations = violations + skippedWaypoints + wrongOrder + restrictedAreaEntries;
  
  // Base score from completion
  const completionScore = (completedActions / requiredActions) * 100;
  
  // Deduct for violations (each violation = 10 points)
  const violationPenalty = Math.min(100, totalViolations * 10);
  
  const score = completionScore - violationPenalty;
  
  return clampScore(score);
}

/**
 * Calculate Course Accuracy from completed training steps
 * 
 * @param {Object} telemetry - Must contain waypoint and step completion data
 * @returns {number} Score between 0-100
 */
function calculateCourseAccuracy(telemetry) {
  const { stepsCompleted = 0, totalSteps = 0 } = telemetry;
  
  console.log('📐 [COURSE ACCURACY] Inputs:', {
    stepsCompleted,
    totalSteps
  });
  
  if (totalSteps <= 0) {
    console.log('📐 [COURSE ACCURACY] No mission data - returning 0');
    return 0;
  }

  const completedSteps = Math.min(totalSteps, Math.max(0, stepsCompleted));
  const finalScore = (completedSteps / totalSteps) * 100;
  
  console.log('📐 [COURSE ACCURACY] Final calculation:', {
    completedSteps,
    totalSteps,
    finalScore,
    clamped: clampScore(finalScore)
  });
  
  return clampScore(finalScore);
}

/**
 * Calculate Docking Accuracy from final position and heading
 * Evaluates both position precision and heading alignment
 * 
 * @param {Object} telemetry - Must contain docking data
 * @returns {number} Score between 0-100
 */
function calculateDockingAccuracy(telemetry) {
  const { docking = {} } = telemetry;
  const { 
    finalPosition = null,
    targetPosition = null,
    finalHeading = null,
    positionError = null,
    headingError = null
  } = docking;
  
  // If no docking data, use legacy dockingAccuracy or default to high score
  if (!finalPosition && positionError === null) {
    return telemetry.dockingAccuracy !== undefined 
      ? clampScore(100 - telemetry.dockingAccuracy) 
      : 85; // Default reasonable score if no data
  }
  
  // Calculate position accuracy (60% weight)
  let positionScore = 100;
  if (positionError !== null) {
    // Position error provided directly
    const errorRatio = Math.min(1, positionError / DOCKING_CONFIG.MAX_POSITION_ERROR_METERS);
    positionScore = 100 - (errorRatio * 100);
  } else if (finalPosition && targetPosition) {
    // Calculate from positions
    const dx = finalPosition.x - targetPosition.x;
    const dz = finalPosition.z - targetPosition.z;
    const distance = Math.sqrt(dx * dx + dz * dz);
    const errorRatio = Math.min(1, distance / DOCKING_CONFIG.MAX_POSITION_ERROR_METERS);
    positionScore = 100 - (errorRatio * 100);
  }
  
  // Calculate heading accuracy (40% weight)
  let headingScore = 100;
  if (headingError !== null) {
    // Heading error provided directly (already shortest angle)
    const absError = Math.abs(headingError);
    const errorRatio = Math.min(1, absError / DOCKING_CONFIG.MAX_HEADING_ERROR_DEG);
    headingScore = 100 - (errorRatio * 100);
  } else if (finalHeading !== null) {
    // Calculate from final heading vs required (0° North)
    const angleDiff = normalizeHeadingDifference(finalHeading, DOCKING_CONFIG.REQUIRED_HEADING_DEG);
    const absError = Math.abs(angleDiff);
    const errorRatio = Math.min(1, absError / DOCKING_CONFIG.MAX_HEADING_ERROR_DEG);
    headingScore = 100 - (errorRatio * 100);
  }
  
  // Weighted combination: 60% position + 40% heading
  const finalScore = (positionScore * 0.60) + (headingScore * 0.40);
  
  return clampScore(finalScore);
}

/**
 * Calculate Time Efficiency from mission duration
 * Compares actual time vs estimated/expected time
 * 
 * @param {Object} telemetry - Must contain timing data
 * @returns {number} Score between 0-100
 */
function calculateTimeEfficiency(telemetry) {
  const { 
    startedAt = null,
    endTime = null,
    expectedTime = null,
    actualDuration = null
  } = telemetry;
  
  // Calculate actual duration
  let actualMs = actualDuration;
  if (actualMs === null && startedAt !== null && endTime !== null) {
    actualMs = endTime - startedAt;
  }
  
  // If no timing data available, return neutral score
  if (actualMs === null || expectedTime === null || expectedTime <= 0) {
    return 85; // Neutral score when time tracking unavailable
  }
  
  // If completed within expected time, full score
  if (actualMs <= expectedTime) {
    return 100;
  }
  
  // Calculate overtime percentage
  const overtime = actualMs - expectedTime;
  const overtimePercent = (overtime / expectedTime) * 100;
  
  // Score decreases proportionally to overtime
  // 100% overtime (2x expected time) = 0 score
  const score = 100 - overtimePercent;
  
  return clampScore(score);
}

/**
 * Calculate Safety Compliance from violation tracking
 * CRITICAL: Only confirmed violations reduce score, not warnings
 * 
 * @param {Object} telemetry - Must contain safety violation data
 * @returns {number} Score between 0-100
 */
function calculateSafetyCompliance(telemetry) {
  const { safety = {}, procedure = {} } = telemetry;
  const { 
    violations = [],           // Array of violation objects
    collisions = [],           // Legacy collision array
    unsafeActions = 0          // Legacy unsafe action count
  } = safety;
  
  let score = 100;
  
  // Process structured violations array
  if (Array.isArray(violations)) {
    violations.forEach(violation => {
      const penalty = SAFETY_PENALTIES[violation.type] || SAFETY_PENALTIES.GENERAL_VIOLATION;
      score -= penalty;
    });
  }
  
  // Process legacy collision data
  if (Array.isArray(collisions)) {
    collisions.forEach(collision => {
      let penaltyType = 'GENERAL_VIOLATION';
      if (collision.type) {
        const typeUpper = collision.type.toUpperCase();
        if (typeUpper.includes('BUOY')) penaltyType = 'BUOY_COLLISION';
        else if (typeUpper.includes('PORT') || typeUpper.includes('DOCK')) penaltyType = 'PORT_COLLISION';
        else if (typeUpper.includes('SHORE') || typeUpper.includes('LAND')) penaltyType = 'SHORE_COLLISION';
      }
      const penalty = SAFETY_PENALTIES[penaltyType];
      score -= penalty;
    });
  }
  
  // Process legacy unsafe action count
  if (unsafeActions > 0) {
    score -= unsafeActions * SAFETY_PENALTIES.GENERAL_VIOLATION;
  }
  
  // Also check procedure violations (legacy compatibility)
  if (procedure.safetyConcerns) {
    score -= procedure.safetyConcerns * SAFETY_PENALTIES.GENERAL_VIOLATION;
  }
  
  return clampScore(score);
}

/**
 * Clamp score to valid range [0, 100]
 * Handles NaN, Infinity, and out-of-range values
 * 
 * @param {number} score - Raw score
 * @returns {number} Clamped score
 */
function clampScore(score) {
  if (typeof score !== 'number' || isNaN(score) || !isFinite(score)) {
    return 0;
  }
  return Math.max(0, Math.min(100, Math.round(score)));
}

/**
 * Create telemetry tracking object for a mission run - 5-METRIC SYSTEM
 * Collects deterministic data during mission execution
 * 
 * @returns {Object} Telemetry tracking object with 5-metric support
 */
export function createTrainingRunMetrics() {
  return {
    startedAt: performance.now(),
    endTime: null,
    expectedTime: null,  // NEW: Expected mission duration in ms
    stepsCompleted: 0,
    totalSteps: 0,
    maxSpeedKnots: 0,
    waypointsReached: 0,
    waypointsRequired: 0,
    visitedWaypoints: new Set(),  // NEW: Track waypoints entered (not necessarily completed)
    
    // Steering metrics
    steering: {
      headingErrors: [],        // Array of heading errors in degrees
      steeringInputs: 0,        // Total steering inputs
      steeringChanges: 0,       // Number of steering changes
      sharpTurns: 0,            // Turns > 30° in < 2 seconds
      lastHeading: null,        // Last recorded heading
      lastSteeringTime: null    // Last steering input time
    },
    
    // Course tracking
    course: {
      deviations: []            // Array of deviation distances in meters
    },
    
    // NEW: Docking accuracy metrics
    docking: {
      finalPosition: null,      // { x, z } final boat position
      targetPosition: null,     // { x, z } target docking position
      finalHeading: null,       // Final boat heading in degrees
      positionError: null,      // Distance from target in meters
      headingError: null        // Heading error in degrees (shortest angle)
    },
    
    // NEW: Safety compliance tracking
    safety: {
      violations: [],           // Array of { type, timestamp, severity }
      warnings: [],             // Array of { type, timestamp, corrected }
      collisions: [],           // Legacy collision tracking
      unsafeActions: 0          // Count of confirmed unsafe actions
    },
    
    // Procedural correctness (kept for legacy compatibility)
    procedure: {
      violations: 0,            // General procedural violations
      skippedWaypoints: 0,      // Waypoints skipped
      wrongOrder: 0,            // Waypoints visited in wrong order
      restrictedAreaEntries: 0, // Entered restricted areas
      safetyConcerns: 0         // Safety violations
    },
    
    // Legacy metrics (kept for compatibility)
    fishCaught: 0,
    fishingAttempts: 0,
    totalFishingTime: 0,
    dockingAttempts: 0,
    successfulDockings: 0,
    dockingAccuracy: 0
  };
}

/**
 * Update telemetry with current gameplay data
 * Tracks speed, steering, and course data in real-time
 * 
 * @param {Object} metrics - Telemetry object
 * @param {Object} stats - Current stats with speedKnots, heading, etc.
 */
export function updateTrainingRunMetrics(metrics, stats) {
  metrics.maxSpeedKnots = Math.max(metrics.maxSpeedKnots, Math.abs(stats.speedKnots ?? 0));
  
  // Track steering inputs periodically (every ~500ms)
  const now = performance.now();
  if (!metrics._lastSteeringTrack || (now - metrics._lastSteeringTrack) > 500) {
    if (stats.heading !== undefined) {
      // Track steering without target heading (just inputs for precision calc)
      trackSteeringInput(metrics, stats.heading, null, now - (metrics._lastSteeringTrack || now));
    }
    metrics._lastSteeringTrack = now;
  }
  
  // Update integrated performance manager if available
  if (window.__performanceManager && window.__performanceManager.isActive) {
    window.__performanceManager.update({
      boatPosition: { x: stats.boatX, z: stats.boatZ },
      boatHeading: stats.heading,
      boatSpeed: stats.speedKnots
    });
  }
}

/**
 * Track steering input for precision analysis
 * Records heading errors and detects sharp turns
 * 
 * @param {Object} metrics - Telemetry object
 * @param {number} currentHeading - Current boat heading (0-360)
 * @param {number} targetHeading - Required/target heading (0-360)
 * @param {number} deltaTime - Time since last input (ms)
 */
export function trackSteeringInput(metrics, currentHeading, targetHeading = null, deltaTime = 0) {
  const { steering } = metrics;
  const currentTime = performance.now();
  
  steering.steeringInputs++;
  
  // Track heading error if target heading provided
  if (targetHeading !== null && !isNaN(targetHeading)) {
    const headingError = normalizeHeadingDifference(currentHeading, targetHeading);
    steering.headingErrors.push(headingError);
  }
  
  // Detect steering changes and sharp turns
  if (steering.lastHeading !== null) {
    const headingChange = Math.abs(normalizeHeadingDifference(currentHeading, steering.lastHeading));
    
    if (headingChange > 1) {
      steering.steeringChanges++;
      
      // Detect sharp turns (>30 degrees in <2 seconds)
      const timeSinceLastSteering = steering.lastSteeringTime 
        ? currentTime - steering.lastSteeringTime 
        : deltaTime;
      
      if (headingChange > 30 && timeSinceLastSteering < 2000) {
        steering.sharpTurns++;
      }
    }
  }
  
  steering.lastHeading = currentHeading;
  steering.lastSteeringTime = currentTime;
}

/**
 * Normalize heading difference to handle 0°/360° wraparound
 * Examples: 359° to 1° = 2°, not 358°
 * 
 * @param {number} heading1 - First heading (0-360)
 * @param {number} heading2 - Second heading (0-360)
 * @returns {number} Smallest angle difference (-180 to 180)
 */
function normalizeHeadingDifference(heading1, heading2) {
  let diff = heading1 - heading2;
  
  // Handle wraparound
  if (diff > 180) {
    diff -= 360;
  } else if (diff < -180) {
    diff += 360;
  }
  
  return diff;
}

/**
 * Record docking metrics for accuracy calculation
 * Call this when anchor is deployed/mission completes
 * 
 * @param {Object} metrics - Telemetry object
 * @param {Object} finalPos - Final boat position { x, z }
 * @param {Object} targetPos - Target docking position { x, z }
 * @param {number} finalHeading - Final boat heading (0-360)
 */
export function recordDockingMetrics(metrics, finalPos, targetPos, finalHeading) {
  metrics.docking.finalPosition = finalPos ? { x: finalPos.x, z: finalPos.z } : null;
  metrics.docking.targetPosition = targetPos ? { x: targetPos.x, z: targetPos.z } : null;
  metrics.docking.finalHeading = finalHeading;
  
  // Calculate errors
  if (finalPos && targetPos) {
    const dx = finalPos.x - targetPos.x;
    const dz = finalPos.z - targetPos.z;
    metrics.docking.positionError = Math.sqrt(dx * dx + dz * dz);
  }
  
  if (finalHeading !== null && finalHeading !== undefined) {
    metrics.docking.headingError = normalizeHeadingDifference(finalHeading, DOCKING_CONFIG.REQUIRED_HEADING_DEG);
  }
}

/**
 * Record a safety violation (confirmed, not just warning)
 * Only call this for CONFIRMED violations that warrant penalty
 * 
 * @param {Object} metrics - Telemetry object
 * @param {string} violationType - Type from SAFETY_PENALTIES keys
 * @param {string} severity - 'minor', 'moderate', 'severe'
 */
export function recordSafetyViolation(metrics, violationType, severity = 'moderate') {
  metrics.safety.violations.push({
    type: violationType,
    timestamp: performance.now(),
    severity
  });
  
  metrics.safety.unsafeActions++;
}

/**
 * Record a safety warning (may or may not become violation)
 * Use this when warning is displayed to student
 * 
 * @param {Object} metrics - Telemetry object
 * @param {string} warningType - Type of warning
 * @returns {number} Warning ID for later marking as corrected/violated
 */
export function recordSafetyWarning(metrics, warningType) {
  const warningId = metrics.safety.warnings.length;
  metrics.safety.warnings.push({
    type: warningType,
    timestamp: performance.now(),
    corrected: null  // null = pending, true = corrected, false = violated
  });
  return warningId;
}

/**
 * Mark a safety warning as corrected (no penalty)
 * Call this if student fixes the unsafe behavior
 * 
 * @param {Object} metrics - Telemetry object
 * @param {number} warningId - ID returned from recordSafetyWarning
 */
export function markWarningCorrected(metrics, warningId) {
  if (metrics.safety.warnings[warningId]) {
    metrics.safety.warnings[warningId].corrected = true;
  }
}

/**
 * Mark a safety warning as violated (apply penalty)
 * Call this if student ignores warning and continues unsafe behavior
 * 
 * @param {Object} metrics - Telemetry object
 * @param {number} warningId - ID returned from recordSafetyWarning
 */
export function markWarningViolated(metrics, warningId) {
  const warning = metrics.safety.warnings[warningId];
  if (warning && warning.corrected === null) {
    warning.corrected = false;
    // Convert to confirmed violation
    recordSafetyViolation(metrics, warning.type);
  }
}

/**
 * Record a collision event for safety tracking
 * 
 * @param {Object} metrics - Telemetry object
 * @param {string} collisionType - 'BUOY', 'PORT', 'SHORE', etc.
 * @param {Object} details - Additional collision details
 */
export function recordCollision(metrics, collisionType, details = {}) {
  metrics.safety.collisions.push({
    type: collisionType,
    timestamp: performance.now(),
    ...details
  });
  
  // Collisions are automatic violations
  recordSafetyViolation(metrics, `${collisionType}_COLLISION`, 'severe');
}

/**
 * Set expected mission time for time efficiency calculation
 * 
 * @param {Object} metrics - Telemetry object
 * @param {number} expectedMs - Expected duration in milliseconds
 */
export function setExpectedMissionTime(metrics, expectedMs) {
  metrics.expectedTime = expectedMs;
}

/**
 * Track fishing activity (legacy compatibility)
 */
export function trackFishingActivity(metrics, caught = false) {
  metrics.fishingAttempts++;
  if (caught) {
    metrics.fishCaught++;
  }
}

/**
 * Update fishing time (legacy compatibility)
 */
export function updateFishingTime(metrics, deltaMs) {
  metrics.totalFishingTime += deltaMs;
}

/**
 * Track docking attempts and accuracy (legacy compatibility)
 */
export function trackDockingAttempt(metrics, success, distanceFromCenter = 0) {
  metrics.dockingAttempts++;
  if (success) {
    metrics.successfulDockings++;
  }
  
  const totalAttempts = metrics.dockingAttempts;
  metrics.dockingAccuracy = (metrics.dockingAccuracy * (totalAttempts - 1) + distanceFromCenter) / totalAttempts;
}

/**
 * Track procedure violations
 * 
 * @param {Object} metrics - Telemetry object
 * @param {string} type - Type of violation: 'general', 'safety', 'waypoint', 'order', 'restricted'
 */
export function trackProcedureViolation(metrics, type = 'general') {
  const { procedure } = metrics;
  
  switch (type) {
    case 'waypoint':
    case 'skipped':
      procedure.skippedWaypoints++;
      break;
    case 'order':
    case 'wrong-order':
      procedure.wrongOrder++;
      break;
    case 'restricted':
    case 'restricted-area':
      procedure.restrictedAreaEntries++;
      break;
    case 'safety':
      procedure.safetyConcerns++;
      procedure.violations++;
      break;
    default:
      procedure.violations++;
  }
}

/**
 * Track course deviation from intended route
 * Records actual deviation distance in meters
 * 
 * @param {Object} metrics - Telemetry object
 * @param {number} deviationDistance - Distance off course in meters
 */
export function trackCourseDeviation(metrics, deviationDistance) {
  if (typeof deviationDistance === 'number' && !isNaN(deviationDistance) && isFinite(deviationDistance)) {
    metrics.course.deviations.push(Math.abs(deviationDistance));
  }
}

/**
 * Calculate detailed performance breakdown for display - 5-METRIC SYSTEM
 * This wraps the deterministic scoring functions for UI compatibility
 * 
 * @param {Object} metrics - Telemetry metrics object
 * @returns {Object} Performance breakdown for UI display
 */
export function calculatePerformanceBreakdown(metrics) {
  // Debug logging
  console.log('📊 [CALC BREAKDOWN] Input metrics:', {
    totalSteps: metrics.totalSteps,
    waypointsRequired: metrics.waypointsRequired,
    stepsCompleted: metrics.stepsCompleted,
    waypointsReached: metrics.waypointsReached
  });
  
  // Build telemetry object from metrics
  const telemetry = {
    steering: metrics.steering || {
      headingErrors: [],
      sharpTurns: 0,
      steeringChanges: 0,
      steeringInputs: 0
    },
    course: metrics.course || {
      deviations: []
    },
    docking: metrics.docking || {
      finalPosition: null,
      targetPosition: null,
      finalHeading: null,
      positionError: null,
      headingError: null
    },
    safety: metrics.safety || {
      violations: [],
      warnings: [],
      collisions: [],
      unsafeActions: 0
    },
    procedure: metrics.procedure || {
      violations: 0,
      skippedWaypoints: 0,
      wrongOrder: 0,
      restrictedAreaEntries: 0
    },
    startedAt: metrics.startedAt,
    endTime: metrics.endTime || metrics.endedAt || performance.now(),
    expectedTime: metrics.expectedTime,
    waypointsRequired: metrics.waypointsRequired || 0,
    waypointsReached: metrics.waypointsReached || 0,
    stepsCompleted: metrics.stepsCompleted || 0,
    totalSteps: metrics.totalSteps || 0,
    dockingAccuracy: metrics.dockingAccuracy
  };
  
  // Calculate ONLY the 2 metrics that matter (Steering + Course)
  const steeringPrecision = calculateSteeringPrecision(telemetry);
  const courseAccuracy = calculateCourseAccuracy(telemetry);
  
  return {
    // Only 2 Metrics
    steeringPrecision,
    courseAccuracy,
    
    // Legacy fields removed - no longer needed
    stats: {
      stepsCompleted: telemetry.stepsCompleted || 0,
      totalSteps: telemetry.totalSteps || 0,
      waypointsReached: telemetry.waypointsReached || 0,
      waypointsRequired: telemetry.waypointsRequired || 0
    }
  };
}

/**
 * Main performance calculation function - 5-METRIC SYSTEM
 * This is the entry point for calculating mission performance
 * 
 * @param {Object} telemetry - Complete telemetry data from mission
 * @param {Object} mission - Mission configuration (optional)
 * @returns {Object} Complete performance result with all 5 metrics
 */
export function calculateMissionPerformance(telemetry, mission = {}) {
  // Validate telemetry
  if (!telemetry || typeof telemetry !== 'object') {
    throw new Error('Invalid telemetry data');
  }
  
  // Record end time if not already set
  if (!telemetry.endTime) {
    telemetry.endTime = performance.now();
  }
  
  // Calculate mission score (includes all 5 metrics)
  const scoreResult = calculateMissionScore(telemetry, mission);
  
  // Calculate completion time
  const completionTime = telemetry.endTime - telemetry.startedAt;
  
  // Calculate XP (existing logic if any, or basic calculation)
  const xpEarned = calculateXP(scoreResult.score, telemetry);
  
  // Calculate supporting details
  const avgDeviation = telemetry.course?.deviations?.length > 0
    ? telemetry.course.deviations.reduce((sum, d) => sum + d, 0) / telemetry.course.deviations.length
    : 0;
  
  const totalViolations = (telemetry.safety?.violations?.length || 0) + 
                         (telemetry.safety?.collisions?.length || 0) +
                         (telemetry.safety?.unsafeActions || 0);
  
  // Build complete performance result with 5 metrics
  return {
    // ALL 5 Score components
    steeringPrecision: scoreResult.steeringPrecision,
    courseAccuracy: scoreResult.courseAccuracy,
    dockingAccuracy: scoreResult.dockingAccuracy,
    timeEfficiency: scoreResult.timeEfficiency,
    safetyCompliance: scoreResult.safetyCompliance,
    
    // Overall score and pass/fail
    overallScore: scoreResult.score,
    passed: scoreResult.passed,
    passScore: scoreResult.passScore,
    
    // Mission statistics
    completionTime,
    topSpeed: telemetry.maxSpeedKnots || 0,
    waypointsReached: telemetry.waypointsReached || 0,
    waypointsRequired: telemetry.waypointsRequired || 0,
    stepsCompleted: telemetry.stepsCompleted || 0,
    totalSteps: telemetry.totalSteps || 0,
    
    // Violation details
    violations: {
      total: totalViolations,
      collisions: telemetry.safety?.collisions?.length || 0,
      safetyViolations: telemetry.safety?.violations?.length || 0,
      unsafeActions: telemetry.safety?.unsafeActions || 0
    },
    
    // Course deviation details
    averageDeviation: avgDeviation,
    
    // Docking details
    dockingDetails: {
      positionError: telemetry.docking?.positionError || null,
      headingError: telemetry.docking?.headingError || null
    },
    
    // XP and rewards
    xpEarned,
    
    // Raw telemetry for audit
    telemetry: {
      steering: telemetry.steering,
      course: telemetry.course,
      docking: telemetry.docking,
      safety: telemetry.safety,
      procedure: telemetry.procedure
    }
  };
}

/**
 * Calculate XP earned from mission score
 * Replace this with your existing XP logic if you have one
 * 
 * @param {number} score - Overall mission score (0-100)
 * @param {Object} telemetry - Telemetry data
 * @returns {number} XP earned
 */
function calculateXP(score, telemetry) {
  // Basic XP calculation: base 10 XP, +1 per 10% score
  const baseXP = 10;
  const scoreBonus = Math.floor(score / 10);
  return baseXP + scoreBonus;
}
