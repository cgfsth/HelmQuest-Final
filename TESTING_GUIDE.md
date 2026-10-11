# HelmQuest Progression System - Testing Guide

## Prerequisites

1. **Backend server running:**
   ```bash
   cd backend
   npm start
   ```
   Server should be running on `http://localhost:3001`

2. **Frontend server running:**
   ```bash
   npm run dev
   ```
   Frontend should be running on `http://localhost:5174`

3. **Test student account:**
   - Email: `student@dnsc.edu.ph`
   - Password: (as configured in your system)
   - OR create a new student account through signup

## Test Scenarios

### Test 1: Basic XP Award

**Objective:** Verify that completing a mission awards XP correctly

**Steps:**
1. Login as a student
2. Note current XP in Student Portal (MY RANK card)
3. Go to Missions and start any mission
4. Complete the 3D simulation successfully:
   - Navigate to all buoys
   - Complete all mission steps
   - Return to port
   - Drop anchor
5. If quiz appears, complete it
6. Click "REPORT MISSION" button
7. Wait for mission complete modal

**Expected Results:**
- ✅ Notification shows: "🎯 +[X] XP earned! Total: [Y] XP"
- ✅ Mission complete modal shows XP earned
- ✅ Student Portal MY RANK card updates with new XP total
- ✅ Progress bar reflects new progress toward next rank
- ✅ Console logs show: `✅ Mission score saved to Firestore`
- ✅ Backend logs show: `🎯 XP awarded: +[X] XP | Total: [Y] XP`

### Test 2: XP Idempotency (No Duplicate Awards)

**Objective:** Verify that refreshing the page doesn't award XP twice

**Steps:**
1. Complete a mission (follow Test 1)
2. Note the total XP after completion
3. Refresh the browser page (F5 or Ctrl+R)
4. Check the XP in Student Portal

**Expected Results:**
- ✅ Total XP remains the same (no duplicate award)
- ✅ Backend logs show: `⚠️ Skipping XP award - duplicate submission detected`
- ✅ Student Portal shows correct XP amount

### Test 3: Rank Progression

**Objective:** Verify that rank changes when XP threshold is reached

**Preparation:**
You may need to manually set a student's XP close to a rank threshold using Firebase Console or backend script.

**Rank Thresholds:**
- Deck Cadet: 0 XP
- Ordinary Seaman (OS): 500 XP
- Able Seaman (AB): 1,000 XP
- Bosun: 2,000 XP
- Third Officer (3/O): 3,500 XP
- Second Officer (2/O): 5,000 XP
- Chief Officer (C/O): 7,000 XP
- Master / Captain: 10,000 XP

**Steps:**
1. Set student XP to 450 (just below Ordinary Seaman threshold)
2. Login as that student
3. Verify MY RANK shows "Deck Cadet"
4. Complete a mission worth 100+ XP
5. Watch for notification

**Expected Results:**
- ✅ Notification shows: "🎉 RANK UP! Deck Cadet → Ordinary Seaman (OS)! +100 XP (Total: 550 XP)"
- ✅ MY RANK card updates to show "Ordinary Seaman (OS)"
- ✅ Rank badges section shows:
  - Deck Cadet: "✓ EARNED"
  - Ordinary Seaman (OS): "CURRENT RANK" (highlighted in blue)
  - Able Seaman (AB): "1000 XP Required" (locked/grayed)
- ✅ Progress bar shows progress toward Able Seaman

### Test 4: Rank Badge Display

**Objective:** Verify rank badges display correct states

**Steps:**
1. Login as a student with some XP (e.g., 750 XP = Ordinary Seaman)
2. Go to Student Portal
3. Scroll to "Rank" section
4. Observe all rank badges

**Expected Results:**
For a student with 750 XP:
- ✅ Deck Cadet: Green highlight, "✓ EARNED"
- ✅ Ordinary Seaman (OS): Blue highlight, "CURRENT RANK"
- ✅ Able Seaman (AB): Grayed out, "1000 XP Required"
- ✅ Bosun: Grayed out, "2000 XP Required"
- ✅ All higher ranks: Grayed out with XP requirements

### Test 5: Mission Steps Display in Simulation

**Objective:** Verify all mission steps are visible in Training Steps panel

**Steps:**
1. Login as student
2. Start any mission with multiple steps
3. In 3D simulation, look at Training Steps panel (left side)
4. Check "All Steps" section

**Expected Results:**
- ✅ All mission steps listed in order
- ✅ Completed steps: Grayed out with strikethrough
- ✅ Current step: Highlighted in yellow with left border
- ✅ Upcoming steps: Normal white text
- ✅ Step counter shows: "Step X of Y"

### Test 6: Quiz Integration

**Objective:** Verify quiz completion before XP award

**Steps:**
1. Login as student
2. Start a mission that has a quiz assigned
3. Complete the simulation
4. Observe the quiz modal appears
5. Complete the quiz
6. Click "REPORT MISSION"

**Expected Results:**
- ✅ Quiz appears before mission can be reported
- ✅ "REPORT MISSION" button only appears after quiz completion
- ✅ Quiz score is saved to Firestore
- ✅ Mission XP is awarded after quiz completion
- ✅ Mission complete modal shows both simulation and quiz scores

### Test 7: Mission Retry

**Objective:** Verify that retrying a mission doesn't duplicate XP

**Steps:**
1. Login as student
2. Complete a mission successfully (note XP earned)
3. From Student Portal, find the same mission
4. Click "Retry" button
5. Complete the mission again
6. Report mission

**Expected Results:**
- ✅ First completion: XP awarded normally
- ✅ Second completion: Check if XP should be awarded for retries (depends on your business logic)
- ✅ No accidental duplicate awards for same attempt
- ✅ mission_score collection has separate records for each attempt

### Test 8: Failed Mission (No XP)

**Objective:** Verify that failing a mission doesn't award XP

**Steps:**
1. Login as student
2. Start a mission
3. Intentionally fail by:
   - Skipping waypoints
   - Not completing steps
   - Getting a score below pass threshold
4. Report mission

**Expected Results:**
- ✅ Mission marked as failed
- ✅ No XP awarded (XP should be 0 in response)
- ✅ No XP notification shown
- ✅ Student's total XP remains unchanged
- ✅ mission_score has `passed: false`

### Test 9: Student Portal XP Display

**Objective:** Verify XP is displayed correctly throughout Student Portal

**Steps:**
1. Login as student
2. Check MY RANK card
3. Check rank badges section
4. Complete a mission
5. Return to Student Portal (without refreshing)

**Expected Results:**
- ✅ MY RANK card shows: Current rank name
- ✅ MY RANK card shows: Total XP (e.g., "885 XP")
- ✅ Progress bar shows percentage to next rank
- ✅ Progress text shows: "X% to next rank (Y XP)"
- ✅ After mission completion, all values update automatically
- ✅ No need to refresh page to see updated XP

### Test 10: Multiple Students (Leaderboard)

**Objective:** Verify XP is tracked separately per student

**Steps:**
1. Create/use two different student accounts
2. Student A: Complete missions, earn XP
3. Login as Student B
4. Check Student B's XP (should be independent)
5. Student B: Complete missions
6. Check leaderboard (if available)

**Expected Results:**
- ✅ Each student has independent XP total
- ✅ Ranks are calculated per student
- ✅ Leaderboard shows correct XP for each student
- ✅ No XP bleed between accounts

## Database Verification

### Check Firestore Directly

1. **Open Firebase Console**
2. **Go to Firestore Database**
3. **Check `students` collection:**
   - Find your test student document
   - Verify fields:
     - `xp`: Should match displayed total
     - `rank`: Should match current rank name
     - `rankId`: Should match rank identifier
     - `lastUpdated`: Should have recent timestamp

4. **Check `mission_score` collection:**
   - Find records for your student
   - Verify fields:
     - `studentId`: Matches student
     - `missionId`: Matches completed mission
     - `score`: Mission score percentage
     - `passed`: true/false
     - `xpAwarded`: true (if XP was given)
     - `xpAmount`: Amount of XP awarded
     - `completedAt`: Timestamp

### Backend Logs to Watch

When completing a mission, backend should log:
```
✅ Mission score saved: Student [ID], Mission [ID], Score [X]%
🎯 XP awarded: +[X] XP | Total: [Y] XP | Rank: [Rank Name]
or
🎉 XP awarded: +[X] XP | Total: [Y] XP | Rank: [Rank Name] (RANK UP! 🎉)
```

When duplicate detected:
```
⚠️ Duplicate XP award detected for student [ID], mission [ID]
⚠️ Skipping XP award - duplicate submission detected
```

## Common Issues & Troubleshooting

### Issue 1: No XP Awarded
**Symptoms:** Mission completed but XP stays at 0

**Check:**
- Backend server running?
- Browser console errors?
- Mission has `xp_reward` field set?
- Mission passed (score >= pass threshold)?
- Backend logs show any errors?

**Fix:**
- Verify mission configuration in Firestore
- Check mission `xp_reward` is a number (not string)
- Ensure student status is "active"

### Issue 2: Rank Not Updating
**Symptoms:** XP increases but rank doesn't change

**Check:**
- XP threshold reached?
- Firestore `students.rank` field updated?
- Browser console shows any errors?

**Fix:**
- Verify rank thresholds in backend code
- Check `getRankFromXP()` function logic
- Clear browser cache and reload

### Issue 3: Duplicate XP Awards
**Symptoms:** Refreshing page awards XP again

**Check:**
- Idempotency check working?
- `xpAwarded` flag being set?
- Time window check functioning?

**Fix:**
- Check backend `hasXPBeenAwarded()` function
- Verify `mission_score` documents have `xpAwarded` field
- Check for server-side errors

### Issue 4: Rank Badges Not Showing Correctly
**Symptoms:** All badges locked or all badges unlocked

**Check:**
- `totalXP` computed property returning correct value?
- `rankBadges` computed property logic correct?
- Student XP loaded from Firestore?

**Fix:**
- Check browser console for computed property errors
- Verify `currentUser.xp` has value
- Reload user data from Firestore

## Success Criteria

✅ **All tests pass**
✅ **No duplicate XP awards**
✅ **Ranks update automatically**
✅ **UI reflects current state**
✅ **Database consistent**
✅ **No console errors**
✅ **Mission steps visible in simulation**
✅ **Rank badges show correct states**

## Reporting Issues

When reporting issues, include:
1. Test scenario being executed
2. Expected vs actual results
3. Browser console logs
4. Backend server logs
5. Screenshot of issue
6. Firestore data snapshot (if relevant)
7. Student account used for testing
