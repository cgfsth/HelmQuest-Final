# 🧪 Mission Editor Testing Guide

## Quick Start

### 1. Start Servers
```bash
# Terminal 1 - Backend
cd backend
npm start

# Terminal 2 - Frontend  
npm run dev
```

### 2. Access Application
- Frontend: http://localhost:5174
- Backend API: http://localhost:3001

---

## ✅ Test Scenarios

### Test 1: Create New Mission ⭐
**Expected Time**: 2 minutes

1. Login as instructor
2. Click **"Create New Mission"** button
3. Fill in details:
   - **Title**: "Test Mission - XP Reward"
   - **Duration**: "10 minutes"
   - **XP Reward**: `150` (type number, no +/XP)
   - **Pass Score**: `80` (see % symbol)
   - **Difficulty**: Select "Beginner"
   - **Boat Type**: Select "Medium Boat"
4. Add at least 1 buoy:
   - Click "+ Add Buoy"
   - Fill in buoy details
5. Click **"💾 Save Mission"**

**Expected Results:**
- ✅ Button changes to "💾 Saving..." and disables
- ✅ Success message: "Mission created successfully!"
- ✅ Modal closes
- ✅ Mission appears in list showing "+150 XP"

**Browser Console Check:**
```
=== saveMissionEditor DEBUG ===
Mission xpReward (numeric): 150 number
Mission passScore (numeric): 80 number
✅ Mission created in Firestore
```

---

### Test 2: Verify Firestore Data Types 🔍
**Expected Time**: 1 minute

1. Open Firebase Console in browser
2. Navigate to **Firestore Database**
3. Find **missions** collection
4. Open the newly created mission document

**Expected Firestore Structure:**
```
missions/{missionId}
  ├─ mission_title: "Test Mission - XP Reward" (string)
  ├─ xp_reward: 150 (number) ← VERIFY THIS IS NUMBER
  ├─ pass_score: 80 (number) ← VERIFY THIS IS NUMBER
  ├─ checkpoints: [array]
  ├─ bouy: [array]
  └─ ...other fields
```

**❌ FAIL if you see:**
- `xp_reward: "150"` (string with quotes)
- `pass_score: "80"` (string with quotes)
- `reward: "+150 XP"` (old format)

---

### Test 3: Edit Existing Mission ✏️
**Expected Time**: 2 minutes

1. Find mission in list
2. Click **edit icon** (pencil)
3. Modal opens with pre-filled data
4. Change values:
   - **XP Reward**: Change to `200`
   - **Pass Score**: Change to `90`
5. Click **"💾 Save Mission"**

**Expected Results:**
- ✅ No errors
- ✅ "Mission updated successfully!" message
- ✅ Mission list shows "+200 XP"
- ✅ Firestore document updated

**Verify in Firestore:**
- `xp_reward: 200` (number)
- `pass_score: 90` (number)

---

### Test 4: Validation Errors 🚨
**Expected Time**: 3 minutes

Test each scenario - should show error message:

#### A. Empty Title
1. Create new mission
2. Leave title **blank**
3. Fill other fields
4. Click Save
- **Expected**: ⚠️ "Mission title is required"

#### B. Empty Duration
1. Create new mission
2. Fill title
3. Leave duration **blank**
4. Click Save
- **Expected**: ⚠️ "Estimated duration is required"

#### C. Negative XP
1. Create new mission
2. Fill required fields
3. Set XP Reward: `-50`
4. Click Save
- **Expected**: ⚠️ "XP Reward must be a valid number (0 or higher)"

#### D. Invalid Pass Score (> 100)
1. Create new mission
2. Fill required fields
3. Set Pass Score: `150`
4. Click Save
- **Expected**: ⚠️ "Mission Pass Score must be between 0 and 100"

#### E. Invalid Pass Score (< 0)
1. Create new mission
2. Fill required fields
3. Set Pass Score: `-10`
4. Click Save
- **Expected**: ⚠️ "Mission Pass Score must be between 0 and 100"

#### F. No Buoys
1. Create new mission
2. Fill all fields
3. Don't add any buoys
4. Click Save
- **Expected**: ⚠️ "Add at least one buoy checkpoint"

---

### Test 5: Double-Click Prevention 🛡️
**Expected Time**: 1 minute

1. Create new mission with valid data
2. **Rapidly double-click** "Save Mission" button
3. Watch button state

**Expected Results:**
- ✅ Button text changes to "💾 Saving..." after first click
- ✅ Button becomes disabled (grayed out)
- ✅ Second click is ignored
- ✅ Console shows: `[SAVE MISSION] Already saving, ignoring duplicate click`
- ✅ Only ONE Firestore document created (not two)

---

### Test 6: Mission Display (Student/Instructor View) 📋
**Expected Time**: 2 minutes

1. Navigate to mission list
2. Find missions you created/edited
3. Check displayed XP values

**Expected Display Format:**
```
Mission Title
Est. 10 minutes    +150 XP    [Start Mission]
```

**Verify:**
- ✅ XP shows as "+150 XP" format
- ✅ Correct numeric value displayed
- ✅ No "undefined" or "NaN"

---

### Test 7: Backward Compatibility 🔄
**Expected Time**: 2 minutes

**Prerequisites:** Need old mission with `reward: "+100 XP"` string format

1. Find old mission (created before update)
2. Click edit
3. Check XP Reward field

**Expected Results:**
- ✅ XP Reward shows: `100` (parsed from "+100 XP")
- ✅ Pass Score shows: `70` (default)
- ✅ No console errors
- ✅ Can save without changing values

**After Save - Verify:**
- ✅ Mission now uses `xp_reward: 100` (number)
- ✅ Mission now uses `pass_score: 70` (number)
- ✅ Old `reward` field may still exist (OK - ignored)

---

### Test 8: Backend Offline Fallback 🌐
**Expected Time**: 2 minutes

1. Stop backend server (Ctrl+C in backend terminal)
2. Try to create a mission
3. Fill all fields correctly
4. Click Save

**Expected Results:**
- ✅ Console shows: `⚠️ Failed to save to Firestore (backend offline)`
- ✅ Console shows: `💾 Falling back to localStorage only`
- ✅ Success message still appears
- ✅ Mission appears in list (from localStorage)
- ❌ Mission NOT in Firestore (backend was offline)

**Recovery Test:**
1. Restart backend server
2. Refresh page
3. Mission is now only in localStorage
- **Note**: Currently NO auto-sync on reconnect (future feature)

---

### Test 9: Mission Completion (Student Flow) 🎮
**Expected Time**: 5 minutes

1. Login as **student** account
2. Start a mission that has:
   - XP Reward: 150
   - Pass Score: 80%
3. Complete mission with 85% score

**Expected Mission Complete Modal:**
```
🎉 Mission Complete!

PASS
Score: 85%
Pass score: 80%

XP Earned: +150 XP
```

**Verify:**
- ✅ Pass score shows correctly
- ✅ Pass/Fail determined by numeric comparison
- ✅ XP reward displayed correctly
- ✅ Student's total XP increased by 150

---

## 🐛 Common Issues

### Issue 1: Backend Not Running
**Symptom:** Console error `Failed to fetch`
**Solution:** Start backend with `cd backend && npm start`

### Issue 2: Port Already in Use
**Symptom:** `EADDRINUSE: address already in use`
**Solution:** 
```bash
# Find process on port 3001
netstat -ano | findstr :3001
# Kill process
taskkill /PID <PID> /F
```

### Issue 3: Mission Not Saving
**Symptom:** No success message after save
**Solution:**
1. Open browser console (F12)
2. Look for error messages
3. Check network tab for failed requests
4. Verify backend is running

### Issue 4: XP Shows as "NaN" or "undefined"
**Symptom:** Mission list shows weird values
**Solution:**
1. Edit the mission
2. Re-enter XP Reward as number
3. Save again
4. Refresh page

---

## 📊 Test Report Template

```markdown
## Mission Editor Test Report

**Date:** _________
**Tester:** _________
**Environment:** Dev / Production

### Test Results

| Test # | Test Name | Status | Notes |
|--------|-----------|--------|-------|
| 1 | Create New Mission | ☐ Pass ☐ Fail | |
| 2 | Verify Firestore Types | ☐ Pass ☐ Fail | |
| 3 | Edit Existing Mission | ☐ Pass ☐ Fail | |
| 4 | Validation Errors | ☐ Pass ☐ Fail | |
| 5 | Double-Click Prevention | ☐ Pass ☐ Fail | |
| 6 | Mission Display | ☐ Pass ☐ Fail | |
| 7 | Backward Compatibility | ☐ Pass ☐ Fail | |
| 8 | Backend Offline | ☐ Pass ☐ Fail | |
| 9 | Student Completion | ☐ Pass ☐ Fail | |

### Issues Found
1. _________
2. _________

### Screenshots
- [ ] Firestore data types
- [ ] Mission editor filled out
- [ ] Mission complete modal
```

---

## 🎯 Success Criteria

All tests must pass:
- ✅ Create mission works
- ✅ Edit mission works
- ✅ Validation catches all errors
- ✅ Firestore stores NUMERIC values
- ✅ Double-click prevention works
- ✅ Display shows correct XP format
- ✅ Student completion uses pass score correctly
- ✅ No console errors during normal operation

---

**Testing Complete? Report results to development team!**

*Last Updated: 2026-09-27*
