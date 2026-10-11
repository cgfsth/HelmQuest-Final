/**
 * HelmQuest Performance Tracking System
 * Real-time performance monitoring for maritime training missions
 * 
 * This system tracks actual player behavior throughout the mission and calculates
 * dynamic performance scores based on navigation quality, mission execution,
 * docking accuracy, and time efficiency.
 */

import * as THREE from 'three';
import { crossTrackDistance, isFinitePosition } from './navigationMetrics.js';

// ============================================================================
// CONFIGURATION - Adjustable scoring parameters
// ============================================================================

export const PERFORMANCE_CONFIG = {
  // Steering/Navigation Configuration
  steering: {
    idealDeviationTolerance: 5,        // meters - no penalty zone
    minorDeviationThreshold: 15,       // meters - small penalty starts
    majorDeviationThreshold: 30,       // meters - large penalty starts
    extremeDeviationThreshold: 50,     // meters - severe penalty
    
    deviationPenaltyRates: {
      minor: 0.5,      // points per meter
      major: 1.0,      // points per meter
      extreme: 2.0     // points per meter
    },
    
    headingCorrectionThreshold: 15,    // degrees - minimum change to count as correction
    headingCorrectionPenalty: 2,       // points per correction
    maxHeadingCorrections: 20,         // before severe penalties
    
    waypointOvershootPenalty: 10,      // points per overshoot
    waypointMissPenalty: 15,           // points for missing waypoint
    
    sharpTurnThreshold: 30,            // degrees per second
    sharpTurnPenalty: 3,               // points per sharp turn
    
    // Sampling intervals
    deviationSampleInterval: 1000,     // ms between deviation checks
    headingSampleInterval: 500         // ms between heading checks
  },
  
  // Collision Configuration
  collision: {
    minorCollisionPenalty: 5,          // Light touch
    mediumCollisionPenalty: 10,        // Moderate impact
    heavyCollisionPenalty: 20,         // Severe collision
    collisionCooldown: 2000,           // ms before same collision can trigger again
    
    speedThresholds: {
      minor: 3,      // knots - below this is minor
      medium: 7,     // knots - below this is medium
      heavy: 999     // knots - above medium is heavy
    }
  },
  
  // Course/Mission Execution Configuration
  course: {
    waypointCompletionWeight: 30,      // % of course score
    taskCompletionWeight: 35,          // % of course score
    returnToPortWeight: 15,            // % of course score
    anchorWeight: 10,                  // % of course score
    dockingWeight: 10,                 // % of course score
    
    sequenceViolationPenalty: 15,      // points per out-of-order objective
    skippedObjectivePenalty: 25,       // points per skipped objective
    
    waypointCirclingThreshold: 3,      // entries before penalty
    waypointCirclingPenalty: 10        // points for circling behavior
  },
  
  // Docking Configuration
  docking: {
    positionToleranceExcellent: 0.5,   // meters
    positionToleranceGood: 2.0,        // meters
    positionToleranceFair: 5.0,        // meters
    
    rotationToleranceExcellent: 3,     // degrees
    rotationToleranceGood: 10,         // degrees
    rotationToleranceFair: 20,         // degrees
    
    maximumDockingSpeed: 2.0,          // knots - safe docking speed
    excessiveSpeedThreshold: 5.0,      // knots - dangerous speed
    
    weights: {
      position: 30,      // % of docking score
      rotation: 25,      // % of docking score
      alignment: 20,     // % of docking score
      speed: 15,         // % of docking score
      collision: 10      // % of docking score
    },
    
    dockingCollisionPenalty: 20        // additional penalty for dock collision
  },
  
  // Time Efficiency Configuration
  time: {
    targetTimeMultiplier: 1.0,         // expected time = mission estimate * this
    acceptableTimeMultiplier: 1.3,     // acceptable = expected * this
    
    scores: {
      withinTarget: 100,
      withinAcceptable: 95,
      slightlyLate: 85,
      moderatelyLate: 70,
      veryLate: 50,
      extremelyLate: 20
    },
    
    lateThresholds: {
      slight: 1.5,      // multiplier of expected
      moderate: 2.0,
      veryLate: 3.0,
      extreme: 4.0
    }
  },
  
  // Overall Score Weights
  overall: {
    steeringWeight: 0.35,
    courseWeight: 0.35,
    dockingWeight: 0.20,
    timeWeight: 0.10
  },
  
  // Anti-exploit Configuration
  antiExploit: {
    waypointProximityRadius: 50,       // meters - distance to track waypoint entries
    maxWaypointEntries: 5,             // before penalty
    routeManipulationWindow: 10000,    // ms - time window for route checks
    minDistanceForProgress: 10         // meters - minimum movement to count as progress
  }
};

// ============================================================================
// PERFORMANCE STATE - Runtime tracking
// ============================================================================

export class PerformanceState {
  constructor() {
    this.reset();
  }
  
  reset() {
    // Mission metadata
    this.missionId = null;
    this.studentId = null;
    this.missionStartTime = null;
    this.missionEndTime = null;
    
    // Scores (0-100)
    this.steeringScore = 100;
    this.courseScore = 100;
    this.dockingScore = null;  // Only calculated when docking occurs
    this.timeScore = null;     // Only calculated at mission end
    this.overallScore = null;  // Only calculated at mission end
    
    // Navigation tracking
    this.routeDeviations = [];
    this.currentDeviation = 0;
    this.maxDeviation = 0;
    this.averageDeviation = 0;
    this.totalDeviationSamples = 0;
    this.deviationAccumulator = 0;
    
    // Steering tracking
    this.headingHistory = [];
    this.headingCorrections = 0;
    this.sharpTurns = 0;
    this.lastHeading = null;
    this.lastHeadingCheckTime = 0;
    
    // Waypoint tracking
    this.waypointsRequired = 0;
    this.waypointsReached = 0;
    this.waypointOvershoots = 0;
    this.waypointMisses = 0;
    this.waypointEntries = new Map();  // Track entries per waypoint for anti-exploit
    this.lastWaypointProximity = new Map();
    
    // Collision tracking
    this.collisions = [];
    this.minorCollisions = 0;
    this.mediumCollisions = 0;
    this.heavyCollisions = 0;
    this.lastCollisionTime = new Map();
    
    // Mission execution tracking
    this.objectivesCompleted = [];
    this.objectivesSkipped = [];
    this.sequenceViolations = 0;
    this.tasksCompleted = 0;
    this.tasksRequired = 0;
    this.anchorDropped = false;
    this.returnedToPort = false;
    this.dockingCompleted = false;
    
    // Docking tracking
    this.dockingAttempts = 0;
    this.dockingPositionError = null;
    this.dockingRotationError = null;
    this.dockingSpeed = null;
    this.dockingCollisions = 0;
    
    // Event log
    this.events = [];
    this.penalties = [];
    
    // Anti-exploit tracking
    this.routeManipulationDetected = false;
    this.excessiveCirclingDetected = false;
    
    // Timestamps for sampling
    this.lastDeviationCheckTime = 0;
    this.lastHeadingSampleTime = 0;
  }
  
  // Add an event to the log
  logEvent(eventType, data = {}) {
    const event = {
      timestamp: Date.now(),
      elapsedTime: this.getElapsedTime(),
      type: eventType,
      ...data
    };
    this.events.push(event);
    console.log(`[Performance] ${eventType}:`, data);
  }
  
  // Add a penalty
  applyPenalty(type, amount, reason, data = {}) {
    const penalty = {
      timestamp: Date.now(),
      elapsedTime: this.getElapsedTime(),
      type,
      amount,
      reason,
      ...data
    };
    this.penalties.push(penalty);
    this.logEvent('PenaltyApplied', penalty);
  }
  
  // Get elapsed mission time in ms
  getElapsedTime() {
    if (!this.missionStartTime) return 0;
    const endTime = this.missionEndTime || Date.now();
    return endTime - this.missionStartTime;
  }
  
  // Get elapsed time formatted
  getElapsedTimeFormatted() {
    const ms = this.getElapsedTime();
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}m ${secs}s`;
  }
}

// ============================================================================
// PERFORMANCE MANAGER - Main controller
// ============================================================================

export class PerformanceManager {
  constructor() {
    this.state = new PerformanceState();
    this.config = PERFORMANCE_CONFIG;
    this.isActive = false;
    
    // Active tracking
    this.currentObjectiveId = null;
    this.idealRoute = null;
    this.targetWaypoint = null;
    this.expectedObjectiveSequence = [];
    this.nextExpectedObjectiveIndex = 0;
  }
  
  // Start a new mission performance tracking session
  startMission(missionData) {
    this.state.reset();
    this.state.missionId = missionData.id;
    this.state.studentId = missionData.studentId;
    this.state.missionStartTime = Date.now();
    this.isActive = true;
    
    // Initialize mission configuration
    if (missionData.waypoints) {
      this.state.waypointsRequired = missionData.waypoints.length;
    }
    
    if (missionData.tasks) {
      this.state.tasksRequired = missionData.tasks.length;
    }
    
    if (missionData.objectives) {
      this.expectedObjectiveSequence = missionData.objectives.map(obj => obj.id);
    }
    
    this.state.logEvent('MissionStarted', {
      missionId: missionData.id,
      waypointsRequired: this.state.waypointsRequired,
      tasksRequired: this.state.tasksRequired
    });
    
    console.log('[PerformanceManager] Mission tracking started:', missionData.id);
  }
  
  // End mission and finalize scores
  endMission() {
    if (!this.isActive) return;
    
    this.state.missionEndTime = Date.now();
    this.isActive = false;
    
    // Finalize scores
    this.finalizeTimeScore();
    this.finalizeOverallScore();
    
    this.state.logEvent('MissionCompleted', {
      elapsedTime: this.state.getElapsedTimeFormatted(),
      steeringScore: this.state.steeringScore,
      courseScore: this.state.courseScore,
      dockingScore: this.state.dockingScore,
      timeScore: this.state.timeScore,
      overallScore: this.state.overallScore
    });
    
    console.log('[PerformanceManager] Mission completed. Final scores:', {
      steering: this.state.steeringScore,
      course: this.state.courseScore,
      docking: this.state.dockingScore,
      time: this.state.timeScore,
      overall: this.state.overallScore
    });
    
    return this.getPerformanceReport();
  }
  
  // Get current performance state
  getState() {
    return this.state;
  }
  
  // Get comprehensive performance report
  getPerformanceReport() {
    return {
      // Scores
      scores: {
        steering: Math.round(this.state.steeringScore),
        course: Math.round(this.state.courseScore),
        docking: this.state.dockingScore ? Math.round(this.state.dockingScore) : null,
        time: this.state.timeScore ? Math.round(this.state.timeScore) : null,
        overall: this.state.overallScore ? Math.round(this.state.overallScore) : null
      },
      
      // Statistics
      statistics: {
        navigation: {
          averageDeviation: this.state.averageDeviation.toFixed(1),
          maxDeviation: this.state.maxDeviation.toFixed(1),
          headingCorrections: this.state.headingCorrections,
          sharpTurns: this.state.sharpTurns,
          waypointOvershoots: this.state.waypointOvershoots
        },
        
        collisions: {
          total: this.state.collisions.length,
          minor: this.state.minorCollisions,
          medium: this.state.mediumCollisions,
          heavy: this.state.heavyCollisions
        },
        
        mission: {
          waypointsReached: this.state.waypointsReached,
          waypointsRequired: this.state.waypointsRequired,
          objectivesCompleted: this.state.objectivesCompleted.length,
          objectivesSkipped: this.state.objectivesSkipped.length,
          sequenceViolations: this.state.sequenceViolations,
          tasksCompleted: this.state.tasksCompleted,
          tasksRequired: this.state.tasksRequired
        },
        
        docking: this.state.dockingCompleted ? {
          positionError: this.state.dockingPositionError?.toFixed(2),
          rotationError: this.state.dockingRotationError?.toFixed(1),
          speed: this.state.dockingSpeed?.toFixed(1),
          collisions: this.state.dockingCollisions
        } : null,
        
        time: {
          elapsed: this.state.getElapsedTimeFormatted(),
          elapsedMs: this.state.getElapsedTime()
        }
      },
      
      // Penalties
      penalties: this.state.penalties,
      
      // Events
      events: this.state.events,
      
      // Metadata
      metadata: {
        missionId: this.state.missionId,
        studentId: this.state.studentId,
        startTime: this.state.missionStartTime,
        endTime: this.state.missionEndTime
      }
    };
  }
  
  // Calculate final time efficiency score
  finalizeTimeScore() {
    // This will be implemented with mission expected time data
    // For now, placeholder
    this.state.timeScore = 85;
  }
  
  // Calculate final overall performance score
  finalizeOverallScore() {
    const weights = this.config.overall;
    
    let score = 0;
    score += this.state.steeringScore * weights.steeringWeight;
    score += this.state.courseScore * weights.courseWeight;
    
    if (this.state.dockingScore !== null) {
      score += this.state.dockingScore * weights.dockingWeight;
    } else {
      // Redistribute docking weight if no docking occurred
      score += this.state.courseScore * weights.dockingWeight;
    }
    
    if (this.state.timeScore !== null) {
      score += this.state.timeScore * weights.timeWeight;
    } else {
      score += 85 * weights.timeWeight; // Default moderate time score
    }
    
    this.state.overallScore = Math.max(0, Math.min(100, score));
  }
}

export const performanceManager = new PerformanceManager();


// ============================================================================
// STEERING PERFORMANCE TRACKER
// ============================================================================

export class SteeringPerformanceTracker {
  constructor(performanceState, config) {
    this.state = performanceState;
    this.config = config.steering;
  }
  
  /**
   * Update route deviation tracking
   * Should be called periodically during navigation
   */
  updateRouteDeviation(currentPosition, idealRoute, targetWaypoint) {
    const now = Date.now();
    
    // Sample at configured interval
    if (now - this.state.lastDeviationCheckTime < this.config.deviationSampleInterval) {
      return;
    }
    
    this.state.lastDeviationCheckTime = now;
    
    if (![currentPosition, idealRoute, targetWaypoint].every(isFinitePosition)) {
      return;
    }
    
    // Calculate cross-track error (distance from ideal route)
    const deviation = this.calculateCrossTrackError(currentPosition, idealRoute, targetWaypoint);
    
    this.state.currentDeviation = deviation;
    this.state.routeDeviations.push(deviation);
    this.state.maxDeviation = Math.max(this.state.maxDeviation, deviation);
    
    // Update rolling average
    this.state.deviationAccumulator += deviation;
    this.state.totalDeviationSamples++;
    this.state.averageDeviation = this.state.deviationAccumulator / this.state.totalDeviationSamples;
    
    // Apply penalty based on deviation magnitude
    this.applyDeviationPenalty(deviation);
  }
  
  /**
   * Calculate cross-track error from ideal route
   */
  calculateCrossTrackError(currentPosition, routeStart, routeEnd) {
    return crossTrackDistance(currentPosition, routeStart, routeEnd);
  }
  
  /**
   * Apply penalty based on deviation from ideal route
   */
  applyDeviationPenalty(deviation) {
    if (deviation <= this.config.idealDeviationTolerance) {
      // No penalty - within ideal tolerance
      return;
    }
    
    let penalty = 0;
    const penaltyRates = this.config.deviationPenaltyRates;
    
    if (deviation > this.config.extremeDeviationThreshold) {
      // Extreme deviation - severe penalty
      const excessDeviation = deviation - this.config.extremeDeviationThreshold;
      penalty = excessDeviation * penaltyRates.extreme;
    } else if (deviation > this.config.majorDeviationThreshold) {
      // Major deviation - large penalty
      const excessDeviation = deviation - this.config.majorDeviationThreshold;
      penalty = excessDeviation * penaltyRates.major;
    } else if (deviation > this.config.minorDeviationThreshold) {
      // Minor deviation - small penalty
      const excessDeviation = deviation - this.config.minorDeviationThreshold;
      penalty = excessDeviation * penaltyRates.minor;
    }
    
    if (penalty > 0) {
      this.state.steeringScore = Math.max(0, this.state.steeringScore - penalty);
      this.state.applyPenalty('RouteDeviation', penalty, `Deviated ${deviation.toFixed(1)}m from route`, {
        deviation: deviation.toFixed(1),
        steeringScore: this.state.steeringScore.toFixed(1)
      });
    }
  }
  
  /**
   * Track heading changes and detect corrections
   */
  updateHeading(currentHeading, targetHeading = null) {
    const now = Date.now();
    
    // Sample at configured interval
    if (now - this.state.lastHeadingSampleTime < this.config.headingSampleInterval) {
      return;
    }
    
    this.state.lastHeadingSampleTime = now;
    
    // Store heading
    this.state.headingHistory.push({
      time: now,
      heading: currentHeading,
      target: targetHeading
    });
    
    // Detect heading corrections
    if (this.state.lastHeading !== null) {
      const headingChange = this.normalizeHeadingDifference(currentHeading, this.state.lastHeading);
      
      // Check if this is a significant correction
      if (Math.abs(headingChange) > this.config.headingCorrectionThreshold) {
        this.state.headingCorrections++;
        
        // Check if it's a sharp turn
        const timeDelta = (now - this.state.lastHeadingCheckTime) / 1000; // seconds
        const turnRate = Math.abs(headingChange) / timeDelta;
        
        if (turnRate > this.config.sharpTurnThreshold) {
          this.state.sharpTurns++;
          const penalty = this.config.sharpTurnPenalty;
          this.state.steeringScore = Math.max(0, this.state.steeringScore - penalty);
          this.state.applyPenalty('SharpTurn', penalty, `Sharp turn detected: ${headingChange.toFixed(1)}° in ${timeDelta.toFixed(1)}s`, {
            headingChange: headingChange.toFixed(1),
            turnRate: turnRate.toFixed(1),
            steeringScore: this.state.steeringScore.toFixed(1)
          });
        } else {
          // Regular heading correction
          if (this.state.headingCorrections > this.config.maxHeadingCorrections) {
            const penalty = this.config.headingCorrectionPenalty;
            this.state.steeringScore = Math.max(0, this.state.steeringScore - penalty);
            this.state.applyPenalty('ExcessiveCorrections', penalty, `Too many heading corrections`, {
              corrections: this.state.headingCorrections,
              steeringScore: this.state.steeringScore.toFixed(1)
            });
          }
        }
      }
    }
    
    this.state.lastHeading = currentHeading;
    this.state.lastHeadingCheckTime = now;
  }
  
  /**
   * Normalize heading difference to -180 to 180 range
   */
  normalizeHeadingDifference(heading1, heading2) {
    let diff = heading1 - heading2;
    while (diff > 180) diff -= 360;
    while (diff < -180) diff += 360;
    return diff;
  }
  
  /**
   * Track waypoint overshoot
   */
  trackWaypointOvershoot(waypointId, overshootDistance) {
    this.state.waypointOvershoots++;
    const penalty = this.config.waypointOvershootPenalty;
    this.state.steeringScore = Math.max(0, this.state.steeringScore - penalty);
    this.state.applyPenalty('WaypointOvershoot', penalty, `Overshot waypoint by ${overshootDistance.toFixed(1)}m`, {
      waypointId,
      overshootDistance: overshootDistance.toFixed(1),
      steeringScore: this.state.steeringScore.toFixed(1)
    });
  }
  
  /**
   * Track waypoint miss
   */
  trackWaypointMiss(waypointId) {
    this.state.waypointMisses++;
    const penalty = this.config.waypointMissPenalty;
    this.state.steeringScore = Math.max(0, this.state.steeringScore - penalty);
    this.state.applyPenalty('WaypointMiss', penalty, `Failed to reach waypoint`, {
      waypointId,
      steeringScore: this.state.steeringScore.toFixed(1)
    });
  }
}

// ============================================================================
// COLLISION TRACKER
// ============================================================================

export class CollisionTracker {
  constructor(performanceState, config) {
    this.state = performanceState;
    this.config = config.collision;
  }
  
  /**
   * Record a collision event
   */
  recordCollision(collisionData) {
    const { type, object, speed, severity } = collisionData;
    const now = Date.now();
    
    // Check cooldown to prevent duplicate penalties
    const collisionKey = `${type}_${object}`;
    const lastCollisionTime = this.state.lastCollisionTime.get(collisionKey);
    
    if (lastCollisionTime && (now - lastCollisionTime) < this.config.collisionCooldown) {
      // Still in cooldown period, ignore
      return;
    }
    
    this.state.lastCollisionTime.set(collisionKey, now);
    
    // Determine severity if not provided
    let finalSeverity = severity;
    if (!finalSeverity && speed !== undefined) {
      if (speed < this.config.speedThresholds.minor) {
        finalSeverity = 'minor';
      } else if (speed < this.config.speedThresholds.medium) {
        finalSeverity = 'medium';
      } else {
        finalSeverity = 'heavy';
      }
    }
    
    // Get penalty amount
    let penalty = 0;
    if (finalSeverity === 'heavy') {
      penalty = this.config.heavyCollisionPenalty;
      this.state.heavyCollisions++;
    } else if (finalSeverity === 'medium') {
      penalty = this.config.mediumCollisionPenalty;
      this.state.mediumCollisions++;
    } else {
      penalty = this.config.minorCollisionPenalty;
      this.state.minorCollisions++;
    }
    
    // Record collision
    const collision = {
      timestamp: now,
      type,
      object,
      speed: speed?.toFixed(1),
      severity: finalSeverity,
      penalty
    };
    
    this.state.collisions.push(collision);
    
    // Apply penalty to steering score
    this.state.steeringScore = Math.max(0, this.state.steeringScore - penalty);
    
    this.state.applyPenalty('Collision', penalty, `${finalSeverity} collision with ${type}`, {
      ...collision,
      steeringScore: this.state.steeringScore.toFixed(1)
    });
    
    this.state.logEvent('CollisionDetected', collision);
  }
  
  /**
   * Record docking collision
   */
  recordDockingCollision(speed) {
    this.state.dockingCollisions++;
    const penalty = this.config.dockingCollisionPenalty;
    
    this.state.applyPenalty('DockingCollision', penalty, `Collision during docking at ${speed?.toFixed(1)} knots`, {
      speed: speed?.toFixed(1),
      dockingCollisions: this.state.dockingCollisions
    });
  }
}

// ============================================================================
// COURSE PERFORMANCE TRACKER
// ============================================================================

export class CoursePerformanceTracker {
  constructor(performanceState, config) {
    this.state = performanceState;
    this.config = config.course;
    this.expectedSequence = [];
    this.nextExpectedIndex = 0;
  }
  
  /**
   * Set expected objective sequence
   */
  setExpectedSequence(objectives) {
    this.expectedSequence = objectives.map(obj => obj.id || obj);
    this.nextExpectedIndex = 0;
  }
  
  /**
   * Track objective completion
   */
  completeObjective(objectiveId) {
    this.state.objectivesCompleted.push({
      id: objectiveId,
      timestamp: Date.now(),
      sequenceIndex: this.state.objectivesCompleted.length
    });
    
    // Check sequence
    if (this.expectedSequence.length > 0) {
      const expectedId = this.expectedSequence[this.nextExpectedIndex];
      
      if (objectiveId === expectedId) {
        // Correct sequence
        this.nextExpectedIndex++;
        this.state.logEvent('ObjectiveCompleted', { objectiveId, sequence: 'correct' });
      } else {
        // Sequence violation
        this.state.sequenceViolations++;
        const penalty = this.config.sequenceViolationPenalty;
        this.state.courseScore = Math.max(0, this.state.courseScore - penalty);
        this.state.applyPenalty('SequenceViolation', penalty, `Completed ${objectiveId} but expected ${expectedId}`, {
          completed: objectiveId,
          expected: expectedId,
          courseScore: this.state.courseScore.toFixed(1)
        });
        this.state.logEvent('SequenceViolation', { completed: objectiveId, expected: expectedId });
      }
    } else {
      this.state.logEvent('ObjectiveCompleted', { objectiveId });
    }
    
    // Recalculate course score
    this.calculateCourseScore();
  }
  
  /**
   * Track skipped objective
   */
  skipObjective(objectiveId) {
    this.state.objectivesSkipped.push({
      id: objectiveId,
      timestamp: Date.now()
    });
    
    const penalty = this.config.skippedObjectivePenalty;
    this.state.courseScore = Math.max(0, this.state.courseScore - penalty);
    this.state.applyPenalty('SkippedObjective', penalty, `Skipped objective: ${objectiveId}`, {
      objectiveId,
      courseScore: this.state.courseScore.toFixed(1)
    });
    
    this.state.logEvent('ObjectiveSkipped', { objectiveId });
    this.calculateCourseScore();
  }
  
  /**
   * Track waypoint reached
   */
  waypointReached(waypointId, position) {
    this.state.waypointsReached++;
    
    // Track waypoint entries for anti-exploit
    if (!this.state.waypointEntries.has(waypointId)) {
      this.state.waypointEntries.set(waypointId, 0);
    }
    const entries = this.state.waypointEntries.get(waypointId) + 1;
    this.state.waypointEntries.set(waypointId, entries);
    
    // Detect circling behavior
    if (entries > this.config.waypointCirclingThreshold) {
      if (!this.state.excessiveCirclingDetected) {
        this.state.excessiveCirclingDetected = true;
        const penalty = this.config.waypointCirclingPenalty;
        this.state.courseScore = Math.max(0, this.state.courseScore - penalty);
        this.state.applyPenalty('WaypointCircling', penalty, `Excessive circling around waypoint ${waypointId}`, {
          waypointId,
          entries,
          courseScore: this.state.courseScore.toFixed(1)
        });
      }
    }
    
    this.state.logEvent('WaypointReached', { waypointId, entries });
    this.calculateCourseScore();
  }
  
  /**
   * Track task completion
   */
  completeTask(taskId, taskType) {
    this.state.tasksCompleted++;
    this.state.logEvent('TaskCompleted', { taskId, taskType });
    this.calculateCourseScore();
  }
  
  /**
   * Track return to port
   */
  returnToPort() {
    this.state.returnedToPort = true;
    this.state.logEvent('ReturnedToPort');
    this.calculateCourseScore();
  }
  
  /**
   * Track anchor drop
   */
  dropAnchor() {
    this.state.anchorDropped = true;
    this.state.logEvent('AnchorDropped');
    this.calculateCourseScore();
  }
  
  /**
   * Calculate weighted course score
   */
  calculateCourseScore() {
    const weights = this.config;
    let score = 0;
    
    // Waypoint completion component
    if (this.state.waypointsRequired > 0) {
      const waypointRatio = this.state.waypointsReached / this.state.waypointsRequired;
      score += Math.min(100, waypointRatio * 100) * (weights.waypointCompletionWeight / 100);
    }
    
    // Task completion component
    if (this.state.tasksRequired > 0) {
      const taskRatio = this.state.tasksCompleted / this.state.tasksRequired;
      score += Math.min(100, taskRatio * 100) * (weights.taskCompletionWeight / 100);
    }
    
    // Return to port component
    if (this.state.returnedToPort) {
      score += 100 * (weights.returnToPortWeight / 100);
    }
    
    // Anchor component
    if (this.state.anchorDropped) {
      score += 100 * (weights.anchorWeight / 100);
    }
    
    // Docking component (if completed)
    if (this.state.dockingCompleted) {
      score += 100 * (weights.dockingWeight / 100);
    }
    
    // Apply penalties for violations
    const violationPenalty = (this.state.sequenceViolations * weights.sequenceViolationPenalty) +
                            (this.state.objectivesSkipped.length * weights.skippedObjectivePenalty);
    
    score = Math.max(0, score - violationPenalty);
    
    this.state.courseScore = Math.max(0, Math.min(100, score));
  }
}

// ============================================================================
// DOCKING PERFORMANCE CALCULATOR
// ============================================================================

export class DockingPerformanceCalculator {
  constructor(performanceState, config) {
    this.state = performanceState;
    this.config = config.docking;
  }
  
  /**
   * Calculate docking performance
   */
  calculateDockingScore(dockingData) {
    const { 
      targetPosition, 
      targetRotation, 
      currentPosition, 
      currentRotation, 
      speed,
      collisionOccurred 
    } = dockingData;
    
    this.state.dockingAttempts++;
    this.state.dockingCompleted = true;
    this.state.dockingSpeed = speed;
    
    // Calculate position error
    const positionError = this.calculatePositionError(targetPosition, currentPosition);
    this.state.dockingPositionError = positionError;
    
    // Calculate rotation error
    const rotationError = this.calculateRotationError(targetRotation, currentRotation);
    this.state.dockingRotationError = rotationError;
    
    // Calculate component scores
    const positionScore = this.calculatePositionScore(positionError);
    const rotationScore = this.calculateRotationScore(rotationError);
    const alignmentScore = Math.min(positionScore, rotationScore); // Alignment depends on both
    const speedScore = this.calculateSpeedScore(speed);
    const collisionScore = collisionOccurred ? 0 : 100;
    
    // Calculate weighted docking score
    const weights = this.config.weights;
    const dockingScore = 
      (positionScore * weights.position / 100) +
      (rotationScore * weights.rotation / 100) +
      (alignmentScore * weights.alignment / 100) +
      (speedScore * weights.speed / 100) +
      (collisionScore * weights.collision / 100);
    
    this.state.dockingScore = Math.max(0, Math.min(100, dockingScore));
    
    this.state.logEvent('DockingCompleted', {
      positionError: positionError.toFixed(2),
      rotationError: rotationError.toFixed(1),
      speed: speed.toFixed(1),
      dockingScore: this.state.dockingScore.toFixed(1),
      breakdown: {
        position: positionScore.toFixed(1),
        rotation: rotationScore.toFixed(1),
        alignment: alignmentScore.toFixed(1),
        speed: speedScore.toFixed(1),
        collision: collisionScore
      }
    });
    
    return this.state.dockingScore;
  }
  
  /**
   * Calculate position error in meters
   */
  calculatePositionError(target, current) {
    const dx = current.x - target.x;
    const dz = current.z - target.z;
    return Math.sqrt(dx * dx + dz * dz);
  }
  
  /**
   * Calculate rotation error in degrees
   */
  calculateRotationError(target, current) {
    let diff = current - target;
    while (diff > 180) diff -= 360;
    while (diff < -180) diff += 360;
    return Math.abs(diff);
  }
  
  /**
   * Calculate position score from error
   */
  calculatePositionScore(error) {
    if (error <= this.config.positionToleranceExcellent) {
      return 100;
    } else if (error <= this.config.positionToleranceGood) {
      // Linear interpolation between excellent and good
      const range = this.config.positionToleranceGood - this.config.positionToleranceExcellent;
      const excess = error - this.config.positionToleranceExcellent;
      return 100 - (excess / range) * 10; // 100% to 90%
    } else if (error <= this.config.positionToleranceFair) {
      // Linear interpolation between good and fair
      const range = this.config.positionToleranceFair - this.config.positionToleranceGood;
      const excess = error - this.config.positionToleranceGood;
      return 90 - (excess / range) * 30; // 90% to 60%
    } else {
      // Beyond fair tolerance - steep decline
      const excess = error - this.config.positionToleranceFair;
      return Math.max(0, 60 - excess * 5); // Below 60%
    }
  }
  
  /**
   * Calculate rotation score from error
   */
  calculateRotationScore(error) {
    if (error <= this.config.rotationToleranceExcellent) {
      return 100;
    } else if (error <= this.config.rotationToleranceGood) {
      const range = this.config.rotationToleranceGood - this.config.rotationToleranceExcellent;
      const excess = error - this.config.rotationToleranceExcellent;
      return 100 - (excess / range) * 10; // 100% to 90%
    } else if (error <= this.config.rotationToleranceFair) {
      const range = this.config.rotationToleranceFair - this.config.rotationToleranceGood;
      const excess = error - this.config.rotationToleranceGood;
      return 90 - (excess / range) * 30; // 90% to 60%
    } else {
      const excess = error - this.config.rotationToleranceFair;
      return Math.max(0, 60 - excess * 2); // Below 60%
    }
  }
  
  /**
   * Calculate speed score
   */
  calculateSpeedScore(speed) {
    if (speed <= this.config.maximumDockingSpeed) {
      return 100;
    } else if (speed <= this.config.excessiveSpeedThreshold) {
      const range = this.config.excessiveSpeedThreshold - this.config.maximumDockingSpeed;
      const excess = speed - this.config.maximumDockingSpeed;
      return 100 - (excess / range) * 50; // 100% to 50%
    } else {
      const excess = speed - this.config.excessiveSpeedThreshold;
      return Math.max(0, 50 - excess * 10); // Below 50%
    }
  }
}

// ============================================================================
// TIME EFFICIENCY CALCULATOR
// ============================================================================

export class TimeEfficiencyCalculator {
  constructor(performanceState, config) {
    this.state = performanceState;
    this.config = config.time;
  }
  
  /**
   * Calculate time efficiency score
   */
  calculateTimeScore(expectedTimeMs) {
    const elapsedMs = this.state.getElapsedTime();
    const targetTime = expectedTimeMs * this.config.targetTimeMultiplier;
    const acceptableTime = targetTime * this.config.acceptableTimeMultiplier;
    
    const timeRatio = elapsedMs / targetTime;
    
    let score;
    if (elapsedMs <= targetTime) {
      score = this.config.scores.withinTarget;
    } else if (elapsedMs <= acceptableTime) {
      score = this.config.scores.withinAcceptable;
    } else if (timeRatio <= this.config.lateThresholds.slight) {
      score = this.config.scores.slightlyLate;
    } else if (timeRatio <= this.config.lateThresholds.moderate) {
      score = this.config.scores.moderatelyLate;
    } else if (timeRatio <= this.config.lateThresholds.veryLate) {
      score = this.config.scores.veryLate;
    } else {
      score = this.config.scores.extremelyLate;
    }
    
    this.state.timeScore = score;
    
    this.state.logEvent('TimeScoreCalculated', {
      elapsed: this.state.getElapsedTimeFormatted(),
      elapsedMs,
      expectedMs: expectedTimeMs,
      targetMs: targetTime,
      timeRatio: timeRatio.toFixed(2),
      score
    });
    
    return score;
  }
}
