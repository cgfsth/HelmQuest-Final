# Waypoint Interaction Auto-Complete Fix - Tasks

## Overview
Fix the bug where waypoints marked with `requireInteraction` (photograph, verify_id, remove_debris) auto-complete when the boat approaches, without requiring Q button press and mini-game completion.

## Tasks

- [x] 1. Write bug condition exploration test
- [x] 2. Diagnose root cause
- [x] 3. Implement fix based on root cause
- [x] 4. Verify fix with manual testing
- [x] 5. Clean up debug logging
- [~] 6. Documentation and handoff

## Implementation Plan

### Task 1: Write bug condition exploration test
Create a manual test procedure to confirm the bug exists and document the exact conditions under which auto-complete occurs.

**Actions:**
- Create test procedure document with step-by-step instructions
- Include expected vs actual behavior checkpoints
- Document browser console output (or lack thereof)
- Test with multiple waypoints (G4, R2, debris marker)
- Record time-to-auto-complete and distance-to-auto-complete
- Capture observations of mini-game not appearing

**Acceptance Criteria:**
- Test procedure clearly demonstrates the bug
- Test can be executed by following written steps
- Test results are documented
- Test identifies which hypothesis is correct (cache, state, or logic)

**Files:**
- Create test results document

---

### Task 2: Diagnose root cause
Use exploration test results to identify the exact root cause of the auto-complete bug.

**Actions:**
- Check browser cache - hard refresh and retest
- Add comprehensive debug logging to all evaluation paths
- Verify which trainingValidation.js file is being executed
- Check if `activeInteraction` state is being set correctly
- Trace code execution through completeMiniGame → checkTrainingStep → evaluateTrainingStep
- Identify if bypass logic exists in step completion

**Acceptance Criteria:**
- Root cause is definitively identified
- Debug logs appear in console
- State values are confirmed at each step
- Alternative completion paths (if any) are documented

**Files:**
- `capstone/src/helpers/trainingValidation.js`
- `capstone/src/App.vue`

---

### Task 3: Implement fix based on root cause
Apply the appropriate fix based on the diagnosed root cause.

**Possible Fix Scenarios:**

**If Root Cause = Browser Cache:**
- Force hard browser refresh
- Restart Vite with --force flag
- Verify debug logs appear

**If Root Cause = Interaction State Timing:**
- Refactor `completeMiniGame()` to ensure synchronous state check
- Hold activeInteraction until after evaluation
- Add timing verification logs

**If Root Cause = Missing/Duplicate Logic:**
- Remove duplicate helpers/trainingValidation.js if exists
- Ensure evaluateWaypointStep has requireInteraction check
- Verify imports point to correct file

**If Root Cause = Alternative Completion Path:**
- Search for all step advancement locations
- Add requireInteraction guards to each path
- Centralize validation logic

**Acceptance Criteria:**
- Specific fix is applied based on diagnosed cause
- Code changes are minimal and focused
- Fix addresses root cause, not symptoms
- Debug logging confirms fix is executing

**Files:**
- `capstone/src/helpers/trainingValidation.js`
- `capstone/helpers/trainingValidation.js` (may need deletion)
- `capstone/src/App.vue`

---

### Task 4: Verify fix with manual testing
Run the original bug exploration test to verify the fix resolves the issue.

**Actions:**
- Clear browser cache completely
- Restart dev server
- Execute original test procedure from Task 1
- Verify waypoint does NOT auto-complete on proximity
- Verify Q button press triggers mini-game
- Verify mini-game completion triggers gear info popup
- Verify popup Continue button completes the step
- Test with multiple waypoints (G4, R2, debris)
- Check console logs for expected debug output

**Acceptance Criteria:**
- Waypoints with requireInteraction no longer auto-complete
- Mini-game interface appears on Q press
- Gear info popup displays (for photograph interactions)
- Full interaction sequence works end-to-end
- Console debug logs confirm validation logic is executing
- User can complete Navigational Aids mission normally

**Files:**
- N/A (manual testing)

---

### Task 5: Clean up debug logging
Remove or reduce debug console.log statements added during diagnosis, keeping only essential logging.

**Actions:**
- Review all console.log statements in trainingValidation.js
- Keep critical validation logs (interaction blocking)
- Remove verbose diagnostic logs
- Consider converting remaining logs to dev-only
- Add JSDoc comments explaining requireInteraction logic

**Acceptance Criteria:**
- Production-appropriate logging level
- No excessive console output during normal operation
- Important state transitions still logged
- Code is well-documented

**Files:**
- `capstone/src/helpers/trainingValidation.js`
- `capstone/src/App.vue`

---

### Task 6: Documentation and handoff
Document the bug, root cause, fix, and testing procedure for future reference.

**Actions:**
- Update bug-condition.md with confirmed root cause
- Document the fix applied
- Add comments to critical code sections
- Create troubleshooting guide for similar issues
- Note any remaining edge cases

**Acceptance Criteria:**
- Bug documentation is complete and accurate
- Fix is explained clearly
- Code comments improve future maintainability
- Troubleshooting guide helps with future debugging

**Files:**
- `capstone/.kiro/specs/waypoint-interaction-auto-complete-fix/bug-condition.md`
- `capstone/src/helpers/trainingValidation.js`
- `capstone/src/App.vue`
