/**
 * Integrated Performance Manager
 * Coordinates all performance tracking subsystems
 */

import {
  PerformanceState,
  PerformanceManager,
  SteeringPerformanceTracker,
  CollisionTracker,
  CoursePerformanceTracker,
  DockingPerformanceCalculator,
  TimeEfficiencyCalculator,
  PERFORMANCE_CONFIG
} from './performanceTracking.js';
import { isFinitePosition } from './navigationMetrics.js';

/**
 * Singleton Performance Manager Instance
 * This is the main interface for the application to interact with performance tracking
 */
class IntegratedPerformanceManager extends PerformanceManager {
  constructor() {
    super();
    
    // Initialize subsystems
    this.steeringTracker = new SteeringPerformanceTracker(this.state, this.config);
    this.collisionTracker = new CollisionTracker(this.state, this.config);
    this.courseTracker = new CoursePerformanceTracker(this.state, this.config);
    this.dockingCalculator = new DockingPerformanceCalculator(this.state, this.config);
    this.timeCalculator = new TimeEfficiencyCalculator(this.state, this.config);
    
    // Tracking state
    this.currentWaypoint = null;
    this.idealRouteStart = null;
    this.idealRouteEnd = null;
  }
  
  // ========================================================================
  // MISSION LIFECYCLE
  // ========================================================================
  
  /**
   * Start mission with full configuration
   */
  startMission(missionConfig) {
    this.cancelMission();
    const steps = missionConfig.steps?.map((step, index) => ({ ...step, id: step.id || `step-${index}` }));
    super.startMission({
      id: missionConfig.id,
      studentId: missionConfig.studentId,
      waypoints: missionConfig.waypoints || missionConfig.steps?.filter(s => s.waypointZone),
      tasks: missionConfig.tasks || missionConfig.steps?.filter(s => s.requireInteraction),
      objectives: steps || missionConfig.objectives
    });
    
    // Set expected objective sequence
    this.courseTracker.setExpectedSequence(steps || missionConfig.objectives || []);
    
    // Store expected time
    this.expectedMissionTimeMs = this.parseExpectedTime(missionConfig.duration);
    
    console.log('[IntegratedPM] Mission started with config:', {
      waypoints: this.state.waypointsRequired,
      tasks: this.state.tasksRequired,
      expectedTime: this.expectedMissionTimeMs
    });
  }
  
  cancelMission() {
    this.isActive = false;
    this.currentWaypoint = null;
    this.idealRouteStart = null;
    this.idealRouteEnd = null;
    this.expectedObjectiveSequence = [];
    this.nextExpectedObjectiveIndex = 0;
    this.courseTracker.setExpectedSequence([]);
    this.state.reset();
  }
  
  /**
   * Parse expected mission time from duration string
   * Supports formats: "5-10 minutes", "10 minutes", "5", or plain numbers
   * Plain numbers default to minutes
   */
  parseExpectedTime(durationString) {
    if (!durationString) return 600000; // Default 10 minutes
    
    // Convert to string if number
    const durationStr = String(durationString).trim();
    
    // Parse formats like "5-10 minutes", "10 minutes", etc.
    const match = durationStr.match(/(\d+)(?:-(\d+))?\s*min/i);
    if (match) {
      const min1 = parseInt(match[1]);
      const min2 = match[2] ? parseInt(match[2]) : min1;
      const avgMinutes = (min1 + min2) / 2;
      return avgMinutes * 60 * 1000; // Convert to ms
    }
    
    // NEW: Parse plain numbers (assume minutes)
    // Examples: "1", "5", "10" → treated as minutes
    const plainNumber = parseInt(durationStr);
    if (!isNaN(plainNumber) && plainNumber > 0) {
      console.log(`[Performance] Parsed duration "${durationStr}" as ${plainNumber} minutes`);
      return plainNumber * 60 * 1000; // Convert to ms
    }
    
    return 600000; // Default 10 minutes
  }
  
  /**
   * Complete mission and generate final report
   */
  completeMission() {
    // Calculate final time score
    if (this.expectedMissionTimeMs) {
      this.timeCalculator.calculateTimeScore(this.expectedMissionTimeMs);
    }
    
    // Finalize overall score
    this.finalizeOverallScore();
    
    const report = super.endMission();
    
    console.log('[IntegratedPM] Mission completed. Final report:', report);
    
    return report;
  }
  
  // ========================================================================
  // REAL-TIME TRACKING UPDATES (called from game loop)
  // ========================================================================
  
  /**
   * Update all tracking systems - call this every frame or on interval
   */
  update(gameState) {
    if (!this.isActive) return;
    
    const { boatPosition, boatHeading, boatSpeed, targetWaypoint } = gameState;
    
    // Update steering/navigation tracking
    if (this.currentWaypoint && boatPosition) {
      this.steeringTracker.updateRouteDeviation(
        boatPosition,
        this.idealRouteStart || boatPosition,
        this.currentWaypoint
      );
    }
    
    // Update heading tracking
    if (Number.isFinite(boatHeading)) {
      this.steeringTracker.updateHeading(boatHeading);
    }
  }
  
  // ========================================================================
  // NAVIGATION EVENTS
  // ========================================================================
  
  /**
   * Set active waypoint target
   */
  setActiveWaypoint(waypoint, routeStart = null) {
    this.currentWaypoint = isFinitePosition(waypoint) ? waypoint : null;
    this.idealRouteStart = isFinitePosition(routeStart) ? { ...routeStart } : null;
    if (!this.currentWaypoint) return;
    this.state.logEvent('WaypointActivated', {
      waypointId: waypoint.id || waypoint.label,
      position: { x: waypoint.x, z: waypoint.z }
    });
  }
  
  /**
   * Waypoint reached successfully
   */
  onWaypointReached(waypointId, position) {
    this.courseTracker.waypointReached(waypointId, position);
    this.state.logEvent('WaypointReached', { waypointId });
  }
  
  /**
   * Waypoint overshot
   */
  onWaypointOvershoot(waypointId, overshootDistance) {
    this.steeringTracker.trackWaypointOvershoot(waypointId, overshootDistance);
  }
  
  /**
   * Waypoint missed completely
   */
  onWaypointMiss(waypointId) {
    this.steeringTracker.trackWaypointMiss(waypointId);
  }
  
  // ========================================================================
  // COLLISION EVENTS
  // ========================================================================
  
  /**
   * Record collision with object
   */
  onCollision(collisionType, objectName, speed, severity = null) {
    this.collisionTracker.recordCollision({
      type: collisionType,
      object: objectName,
      speed,
      severity
    });
  }
  
  /**
   * Record docking collision
   */
  onDockingCollision(speed) {
    this.collisionTracker.recordDockingCollision(speed);
  }
  
  // ========================================================================
  // MISSION OBJECTIVE EVENTS
  // ========================================================================
  
  /**
   * Objective completed
   */
  onObjectiveCompleted(objectiveId, objectiveType) {
    this.courseTracker.completeObjective(objectiveId);
    
    // Track specific objective types
    if (objectiveType === 'task') {
      this.courseTracker.completeTask(objectiveId, objectiveType);
    }
  }
  
  /**
   * Objective skipped
   */
  onObjectiveSkipped(objectiveId) {
    this.courseTracker.skipObjective(objectiveId);
  }
  
  /**
   * Return to port
   */
  onReturnToPort() {
    this.courseTracker.returnToPort();
  }
  
  /**
   * Anchor dropped
   */
  onAnchorDropped() {
    this.courseTracker.dropAnchor();
  }
  
  // ========================================================================
  // DOCKING EVENTS
  // ========================================================================
  
  /**
   * Calculate and record docking performance
   */
  onDockingCompleted(dockingData) {
    const score = this.dockingCalculator.calculateDockingScore(dockingData);
    this.courseTracker.calculateCourseScore(); // Recalculate course score with docking
    return score;
  }
  
  // ========================================================================
  // SCORE QUERIES
  // ========================================================================
  
  /**
   * Get current scores (real-time)
   */
  getCurrentScores() {
    return {
      steering: Math.round(this.state.steeringScore),
      course: Math.round(this.state.courseScore),
      docking: this.state.dockingScore ? Math.round(this.state.dockingScore) : null,
      time: this.state.timeScore ? Math.round(this.state.timeScore) : null,
      overall: this.state.overallScore ? Math.round(this.state.overallScore) : null
    };
  }
  
  /**
   * Get current statistics
   */
  getCurrentStatistics() {
    return {
      navigation: {
        currentDeviation: this.state.currentDeviation?.toFixed(1),
        averageDeviation: this.state.averageDeviation?.toFixed(1),
        maxDeviation: this.state.maxDeviation?.toFixed(1),
        headingCorrections: this.state.headingCorrections,
        sharpTurns: this.state.sharpTurns
      },
      collisions: {
        total: this.state.collisions.length,
        minor: this.state.minorCollisions,
        medium: this.state.mediumCollisions,
        heavy: this.state.heavyCollisions
      },
      mission: {
        waypointsReached: `${this.state.waypointsReached}/${this.state.waypointsRequired}`,
        objectivesCompleted: this.state.objectivesCompleted.length,
        sequenceViolations: this.state.sequenceViolations,
        tasksCompleted: `${this.state.tasksCompleted}/${this.state.tasksRequired}`
      },
      time: {
        elapsed: this.state.getElapsedTimeFormatted()
      }
    };
  }
  
  /**
   * Get performance descriptions
   */
  getPerformanceDescriptions() {
    const scores = this.getCurrentScores();
    
    return {
      steering: this.getScoreDescription(scores.steering, 'steering'),
      course: this.getScoreDescription(scores.course, 'course'),
      docking: scores.docking ? this.getScoreDescription(scores.docking, 'docking') : null,
      time: scores.time ? this.getScoreDescription(scores.time, 'time') : null,
      overall: scores.overall ? this.getScoreDescription(scores.overall, 'overall') : null
    };
  }
  
  /**
   * Generate score description
   */
  getScoreDescription(score, category) {
    const descriptions = {
      steering: {
        excellent: 'Excellent navigation control with smooth steering and minimal route deviation.',
        good: 'Good steering precision with minor corrections and deviations.',
        acceptable: 'Acceptable navigation with noticeable route deviations and corrections.',
        belowExpected: 'Below expected performance with frequent steering issues.',
        poor: 'Significant navigation problems detected. Additional training recommended.'
      },
      course: {
        excellent: 'All mission objectives completed correctly in proper sequence.',
        good: 'Mission objectives completed with minor sequence variations.',
        acceptable: 'Acceptable mission execution with some missed objectives or sequence errors.',
        belowExpected: 'Multiple objectives incomplete or completed out of sequence.',
        poor: 'Significant mission execution issues. Review procedures required.'
      },
      docking: {
        excellent: 'Perfect docking with precise position and alignment.',
        good: 'Good docking performance within acceptable tolerances.',
        acceptable: 'Acceptable docking with some position or alignment issues.',
        belowExpected: 'Below expected docking accuracy. Practice recommended.',
        poor: 'Significant docking issues detected. Additional docking training required.'
      },
      time: {
        excellent: 'Mission completed efficiently within target time.',
        good: 'Good time management with completion near expected duration.',
        acceptable: 'Acceptable timing but slower than expected.',
        belowExpected: 'Mission took significantly longer than expected.',
        poor: 'Excessive mission duration. Review navigation efficiency.'
      },
      overall: {
        excellent: 'Outstanding maritime performance across all metrics.',
        good: 'Strong overall performance with minor areas for improvement.',
        acceptable: 'Acceptable training performance. Continue practicing key skills.',
        belowExpected: 'Below expected training standards. Additional practice needed.',
        poor: 'Significant performance issues. Comprehensive training review required.'
      }
    };
    
    let level;
    if (score >= 90) level = 'excellent';
    else if (score >= 80) level = 'good';
    else if (score >= 70) level = 'acceptable';
    else if (score >= 60) level = 'belowExpected';
    else level = 'poor';
    
    return descriptions[category][level];
  }
}

// Export singleton instance
export const performanceManager = new IntegratedPerformanceManager();

// Export configuration for external modification if needed
export { PERFORMANCE_CONFIG };

// Export class for testing/debugging
export { IntegratedPerformanceManager };
