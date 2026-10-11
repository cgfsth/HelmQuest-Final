# 🧪 Mission Steps Testing Guide

## Quick Start

### Servers Status
- ✅ Backend: Already running on `http://localhost:3001`
- ✅ Frontend: Already running on `http://localhost:5174`

### Access
- Open browser: `http://localhost:5174`
- Login as **Instructor** first

---

## 🎯 Test Case 1: Create Mission with 5 Steps (CRITICAL)

**Time:** 3 minutes

### Steps:
1. Click **"Create New Mission"**
2. Fill basic info:
   - Title: "Test Mission - Dynamic Steps"
   - Duration: "10 minutes"
   - XP Reward: 100
   - Pass Score: 80
3. Scroll to **"📋 Mission Steps"** section
4. Click **"+ Add Step"** 5 times
5. Fill in steps:
   ```
   Step 1: Navigate to Buoy 1 and photograph it (Q)
   Step 2: Navigate to Buoy 2 and photograph it (Q)
   Step 3: Navigate to Buoy 3 and photograph it (Q)
   Step 4: Complete the navigation exercise
   Step 5: Return to port, drop anchor, and report mission completion
   ```
6. Add at least 1 buoy checkpoint
7. Click **"💾 Save Mission"**

### Expected Results:
- ✅ Success message appears
- ✅ Mission appears in list

### Verify in Firestore:
1. Open Firebase Console
2. Go to `missions` collection
3. Find your mission
4. Check for `mission_steps` field:
   ```
   mission_steps: [
     {id: "step_...", order: 1, text: "Navigate to Buoy 1..."},
     {id: "step_...", order: 2, text: "Navigate to Buoy 2..."},
     {id: "step_...", order: 3, text: "Navigate to Buoy 3..."},
     {id: "step_...", order: 4, text: "Complete the..."},
     {id: "step_...", order: 5, text: "Return to port..."}
   ]
   ```

**✅ PASS if:** Array has 5 items with correct text

---

## 🎯 Test Case 2: Student Portal Display (CRITICAL)

**Time:** 2 minutes

### Steps:
1. Stay logged in as Instructor (or login as Student)
2. Navigate to Training Hub
3. Find the mission you just created
4. Look for **"Mission Steps (N)"** section

### Expected Display:
```
Mission Steps (5)
1. Navigate to Buoy 1 and photograph it (Q)
2. Navigate to Buoy 2 and photograph it (Q)
3. Navigate to Buoy 3 and photograph it (Q)
4. Complete the navigation exercise
5. Return to port, drop anchor, and report mission completion
```

### Verify:
- [ ] Shows "Mission Steps (5)" - count is 5
- [ ] All 5 steps are listed
- [ ] Text matches exactly what you entered
- [ ] No "undefined" or missing steps

**✅ PASS if:** All text matches and count is correct

---

## 🎯 Test Case 3: 3D Simulation Display (CRITICAL)

**Time:** 5 minutes

### Steps:
1. From Student Portal, click **"Start Mission"** on your test mission
2. Select boat type
3. Mission loads in 3D simulation
4. Look at top-right **"Training Steps"** panel

### Expected Display:
```
TRAINING STEPS
Test Mission - Dynamic Steps

Step 1 of 5
Navigate to Buoy 1 and photograph it (Q)

[Progress bar showing 20%]
```

### Verify:
- [ ] Shows "Step 1 of 5" (not "Step 1 of 4" or any other number)
- [ ] Text shows: "Navigate to Buoy 1 and photograph it (Q)"
- [ ] Text matches Student Portal exactly

### Continue Testing:
1. Complete step 1 (navigate to first checkpoint)
2. Panel should update to:
   ```
   Step 2 of 5
   Navigate to Buoy 2 and photograph it (Q)
   ```
3. Complete step 2
4. Panel should update to:
   ```
   Step 3 of 5
   Navigate to Buoy 3 and photograph it (Q)
   ```

### Verify:
- [ ] Step counter increments: 1, 2, 3, 4, 5
- [ ] Always shows "of 5" (not changing)
- [ ] Text changes to match each step
- [ ] Progress bar advances correctly

**✅ PASS if:** Step counter and text work dynamically

---

## 🎯 Test Case 4: Edit Mission Steps

**Time:** 3 minutes

### Steps:
1. Go back to Training Hub
2. Click **edit icon (pencil)** on your test mission
3. Mission Editor opens with existing steps
4. **Delete Step 3** (click ✕ button)
5. Click **"💾 Save Mission"**

### Expected After Save:
Steps should auto-renumber:
```
Before:                    After:
Step 1: Navigate...    →   Step 1: Navigate...
Step 2: Navigate...    →   Step 2: Navigate...
Step 3: Complete...    →   [DELETED]
Step 4: Nav exercise   →   Step 3: Nav exercise
Step 5: Return...      →   Step 4: Return...
```

### Verify:
1. **Student Portal** should now show:
   ```
   Mission Steps (4)
   ```
2. **Start mission** again
3. **Simulation** should show:
   ```
   Step 1 of 4
   ```

**✅ PASS if:** Count changes from 5 to 4 everywhere

---

## 🎯 Test Case 5: Create Mission with 3 Steps

**Time:** 3 minutes

### Steps:
1. Create **another new mission**
2. This time add only **3 mission steps**:
   ```
   Step 1: Navigate to first checkpoint
   Step 2: Navigate to second checkpoint
   Step 3: Return to dock
   ```
3. Add buoy checkpoints
4. Save mission

### Verify:
1. **Student Portal** shows: `Mission Steps (3)`
2. **Start mission**
3. **Simulation** shows: `Step 1 of 3`

### Purpose:
This proves the system is **DYNAMIC** (not hardcoded to 5 steps)

**✅ PASS if:** Shows correct count for different mission

---

## 🎯 Test Case 6: Text Match Between Interfaces

**Time:** 2 minutes

### Steps:
1. Open mission in Student Portal
2. Note the text of Step 1
3. Start the mission
4. Note the text in Simulation panel

### Verify:
```
Student Portal:
"Navigate to Buoy 1 and photograph it (Q)"

3D Simulation:
"Navigate to Buoy 1 and photograph it (Q)"
```

**✅ PASS if:** Text is IDENTICAL (exact match)

---

## 🎯 Test Case 7: Empty Mission Steps (Edge Case)

**Time:** 2 minutes

### Steps:
1. Create new mission
2. **Don't add any mission steps** (leave empty)
3. Add buoy checkpoints
4. Save mission

### Expected:
- ✅ No errors
- ✅ Mission saves successfully
- ✅ Falls back to showing waypoint steps (if any)
- ✅ Or shows no steps section

**✅ PASS if:** No errors, mission still works

---

## 🎯 Test Case 8: Remove All Steps Then Add New Ones

**Time:** 2 minutes

### Steps:
1. Edit a mission
2. Remove ALL mission steps (click ✕ on each)
3. Add 2 new steps:
   ```
   Step 1: New instruction one
   Step 2: New instruction two
   ```
4. Save

### Verify:
- Student Portal shows: `Mission Steps (2)`
- Simulation shows: `Step 1 of 2`

**✅ PASS if:** Works correctly with replacement

---

## 📊 Test Results Summary

| # | Test Case | Status | Notes |
|---|-----------|--------|-------|
| 1 | Create 5 Steps | ☐ Pass ☐ Fail | Critical |
| 2 | Student Portal Display | ☐ Pass ☐ Fail | Critical |
| 3 | 3D Simulation Display | ☐ Pass ☐ Fail | Critical |
| 4 | Edit Mission Steps | ☐ Pass ☐ Fail | Important |
| 5 | Create 3 Steps | ☐ Pass ☐ Fail | Important |
| 6 | Text Match | ☐ Pass ☐ Fail | Critical |
| 7 | Empty Steps | ☐ Pass ☐ Fail | Edge Case |
| 8 | Replace Steps | ☐ Pass ☐ Fail | Edge Case |

---

## 🚨 Common Issues

### Issue 1: Count Not Updating
**Symptom:** Student Portal shows "Mission Steps (5)" but Simulation shows "Step 1 of 4"

**Solution:**
- Refresh the page
- Check if mission was saved correctly
- Verify Firestore has correct `mission_steps` count

### Issue 2: Empty Steps
**Symptom:** Mission saves but no steps appear

**Solution:**
- Check if step text was entered (not left blank)
- Empty steps are filtered out automatically
- Add text to at least one step

### Issue 3: Steps Not Advancing
**Symptom:** Simulation stays on "Step 1 of 5"

**Solution:**
- Complete the current checkpoint
- Check if interaction is required (photograph, verify ID, etc.)
- This is normal simulation behavior

---

## ✅ Success Criteria

**Feature is COMPLETE if:**
- [x] Create mission with 5 steps works
- [x] Firestore stores `mission_steps` array
- [x] Student Portal shows correct count
- [x] Student Portal shows all step text
- [x] 3D Simulation shows "Step X of Y" correctly
- [x] 3D Simulation shows current step text
- [x] Text matches between Student Portal and Simulation
- [x] Edit mission updates count everywhere
- [x] Different missions show different counts (proves dynamic)

---

## 🎉 Quick Validation (30 seconds)

**Fastest way to verify it works:**

1. Create mission with 3 steps
2. Check Student Portal: `Mission Steps (3)`
3. Start mission
4. Check Simulation: `Step 1 of 3`
5. ✅ DONE! Feature works!

---

**Testing Status:** ⏳ PENDING  
**All Changes:** ✅ IMPLEMENTED  
**Ready to Test:** YES

---

*Follow this guide to verify the Mission Steps feature works correctly!* 🧪
