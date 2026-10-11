# Requirements: Waypoint Interaction Auto-Complete Fix

## Functional Requirements

### FR-1: Block Auto-Completion for Interactive Waypoints
**Priority**: Critical  
**Description**: Waypoints marked with `requireInteraction` must NOT auto-complete based on proximity (12m travel) or time (4 seconds elapsed). The step should remain incomplete until the user completes the required interaction.

**Acceptance Criteria**:
- Approaching a waypoint with `requireInteraction` keeps the step active
- Distance traveled and time elapsed do NOT trigger completion
- Waypoint buoy remains visible
- "Press Q" prompt continues to display

### FR-2: Require Q Button Press
**Priority**: Critical  
**Description**: User must press Q button when near an interactive waypoint to initiate the interaction sequence.

**Acceptance Criteria**:
- Q button press triggers mini-game interface
- Mini-game type matches waypoint's `requireInteraction` value
- Mini-game UI displays correctly (progress bar, instructions)

### FR-3: Mini-Game Completion Required
**Priority**: Critical  
**Description**: User must successfully complete the mini-game (photograph, verify_id, or remove_debris) before the waypoint step can complete.

**Acceptance Criteria**:
- User must click/hold to fill progress bar to 100%
- For photograph: clicking fills progress
- For verify_id: user must enter correct ID number
- For remove_debris: holding fills progress (with decay)
- Incomplete mini-game does not advance step

### FR-4: Gear Info Popup for Photographs
**Priority**: High  
**Description**: After completing a photograph mini-game, a gear info popup must display showing buoy details and image. This popup is educational and used as basis for post-docking quiz questions.

**Acceptance Criteria**:
- Gear info popup appears after photograph mini-game completion
- Popup shows buoy name, ID, description, and image
- Popup blocks progression until user clicks Continue
- Clicking Continue completes the waypoint step

### FR-5: Interaction State Management
**Priority**: Critical  
**Description**: The system must properly track interaction state to ensure the training step evaluation knows when an interaction has been completed.

**Acceptance Criteria**:
- `activeInteraction` is set when mini-game completes
- `activeInteraction` value matches `step.requireInteraction` value
- Step evaluation checks `activeInteraction` before completing
- Interaction state is cleared after step completes

## Non-Functional Requirements

### NFR-1: Debug Visibility
**Priority**: High  
**Description**: Console logging must be visible during development to diagnose state changes and validation logic.

**Acceptance Criteria**:
- Console logs appear when approaching interactive waypoints
- Logs show when interaction checks are evaluated
- Logs indicate whether auto-complete was blocked
- Logs show activeInteraction state during evaluation

### NFR-2: Cache Handling
**Priority**: High  
**Description**: Code changes must take effect without requiring manual cache clearing by end users.

**Acceptance Criteria**:
- Vite HMR properly updates trainingValidation.js
- Hard refresh loads latest JavaScript
- No stale code execution from cached files

### NFR-3: Code Consistency
**Priority**: Medium  
**Description**: Ensure only one authoritative version of trainingValidation.js exists and is being used.

**Acceptance Criteria**:
- Remove duplicate `helpers/trainingValidation.js` if not needed
- Confirm `src/helpers/trainingValidation.js` is the only import source
- All validation logic comes from single source of truth

## User Experience Requirements

### UX-1: Clear Interaction Prompts
**Priority**: High  
**Description**: User must understand when and how to interact with waypoints.

**Acceptance Criteria**:
- "Press Q to [action]" prompt displays when in range
- Prompt text matches interaction type (photograph, verify ID, remove debris)
- Prompt remains visible until interaction begins

### UX-2: Visual Feedback
**Priority**: High  
**Description**: User must receive clear visual feedback during interaction sequence.

**Acceptance Criteria**:
- Mini-game UI is clearly visible and responsive
- Progress bar fills smoothly
- Gear info popup is readable and well-formatted
- Buoy disappears only after complete interaction sequence

## Technical Requirements

### TR-1: Validation Logic
**Priority**: Critical  
**Description**: `evaluateWaypointStep()` must return false for steps with `requireInteraction` until the interaction is completed.

**Acceptance Criteria**:
```javascript
if (step.requireInteraction) {
  return false; // Block auto-complete in evaluateWaypointStep
}
```

### TR-2: Interaction Matching
**Priority**: Critical  
**Description**: `evaluateTrainingStep()` must verify that `activeInteraction` matches `step.requireInteraction` before completing the step.

**Acceptance Criteria**:
```javascript
if (step.requireInteraction) {
  return context.activeInteraction === step.requireInteraction;
}
```

### TR-3: State Timing
**Priority**: Critical  
**Description**: `activeInteraction` must be set BEFORE calling `checkTrainingStep()` and remain set during evaluation.

**Acceptance Criteria**:
- `completeMiniGame()` sets `activeInteraction.value = type`
- Calls `checkTrainingStep()` while activeInteraction is set
- Clears `activeInteraction.value = null` after evaluation completes

## Testing Requirements

### TEST-1: Manual Verification
**Priority**: Critical  
**Description**: Test the complete interaction flow in the simulation.

**Test Steps**:
1. Start Navigational Aids mission
2. Navigate to Green Buoy #4
3. Verify buoy does NOT disappear automatically
4. Press Q button
5. Verify mini-game appears
6. Complete mini-game
7. Verify gear info popup appears
8. Click Continue
9. Verify waypoint step completes and buoy disappears

**Expected Result**: All steps complete successfully, no auto-completion occurs

### TEST-2: Console Log Verification
**Priority**: High  
**Description**: Verify debug logging appears during interaction flow.

**Test Steps**:
1. Open browser console
2. Navigate to interactive waypoint
3. Check console for debug messages

**Expected Logs**:
- "🔍 Waypoint [ID] requires interaction: [type] - blocking auto-complete"
- "🔍 Step [ID] requireInteraction: [type], activeInteraction: [value], matches: [boolean]"

### TEST-3: Cache Verification
**Priority**: High  
**Description**: Verify latest code is executing after changes.

**Test Steps**:
1. Add unique console.log with timestamp to trainingValidation.js
2. Save file
3. Hard refresh browser (Ctrl + Shift + R)
4. Check console for new log message

**Expected Result**: New log message appears with correct timestamp

## Out of Scope
- Changing interaction types or mini-game mechanics
- Modifying waypoint data or locations
- Adding new interaction types
- Performance optimization of validation logic
- Refactoring training system architecture

## Dependencies
- Existing training validation system
- Mini-game components
- Gear info popup component
- Q button key handler
- Waypoint zone definitions

## Success Metrics
1. **Zero auto-completions**: Interactive waypoints never complete without user interaction
2. **100% interaction visibility**: All mini-games and popups display correctly
3. **Console logs present**: Debug information visible during development
4. **User testing success**: User can complete Navigational Aids mission without encountering auto-complete bug
