# ✅ Mission Editor Testing Checklist

## 🎯 QUICK STATUS CHECK

**Date Started:** __________  
**Tester:** __________

---

## ⚡ Pre-Testing Setup

- [x] ✅ Backend server running (already started!)
- [x] ✅ Frontend server running (already started!)
- [ ] Browser open at `http://localhost:5174`
- [ ] Logged in as instructor
- [ ] Firebase Console open
- [ ] Developer Tools (F12) open

---

## 🧪 TEST 1: Create New Mission ⭐⭐⭐ (CRITICAL)

**Time:** 2 minutes

### Steps:
1. [ ] Click "Create New Mission"
2. [ ] Fill Title: "Test Mission XP"
3. [ ] Fill Duration: "10 minutes"
4. [ ] Set XP Reward: `150`
5. [ ] Set Pass Score: `80`
6. [ ] Select Difficulty: "Beginner"
7. [ ] Click "+ Add Buoy" and fill details
8. [ ] Click "💾 Save Mission"

### Expected Results:
- [ ] Button changes to "💾 Saving..."
- [ ] Button becomes disabled
- [ ] Success message appears
- [ ] Modal closes
- [ ] Mission appears in list showing "+150 XP"

### Browser Console Check:
- [ ] No red errors
- [ ] See: `Mission xpReward (numeric): 150 number`
- [ ] See: `Mission passScore (numeric): 80 number`
- [ ] See: `✅ Mission created in Firestore`

**Status:** ☐ PASS ☐ FAIL  
**Notes:** ___________________________________

---

## 🔍 TEST 2: Verify Firestore Types ⭐⭐⭐ (CRITICAL)

**Time:** 1 minute

### Steps:
1. [ ] Open Firebase Console
2. [ ] Go to Firestore Database
3. [ ] Find `missions` collection
4. [ ] Open the test mission document

### Check These Fields:
```
✅ xp_reward: 150 (number - NO QUOTES)
✅ pass_score: 80 (number - NO QUOTES)
✅ checkpoints: [...] (array)
```

### ❌ FAIL IF YOU SEE:
```
❌ xp_reward: "150" (has quotes = string)
❌ pass_score: "80" (has quotes = string)
```

**Status:** ☐ PASS ☐ FAIL  
**Screenshot Taken:** ☐ YES  
**Notes:** ___________________________________

---

## ✏️ TEST 3: Edit Existing Mission

**Time:** 2 minutes

### Steps:
1. [ ] Find mission in list
2. [ ] Click edit icon (pencil)
3. [ ] Change XP Reward to: `200`
4. [ ] Change Pass Score to: `90`
5. [ ] Click "💾 Save Mission"

### Expected Results:
- [ ] No errors
- [ ] "Mission updated successfully!"
- [ ] Mission list shows "+200 XP"
- [ ] Firestore updated with numbers

**Status:** ☐ PASS ☐ FAIL  
**Notes:** ___________________________________

---

## 🚨 TEST 4: Validation Errors

**Time:** 5 minutes (test all scenarios)

### A. Empty Title
- [ ] Try to save with blank title
- [ ] See error: "⚠️ Mission title is required"
- **Status:** ☐ PASS ☐ FAIL

### B. Empty Duration
- [ ] Try to save with blank duration
- [ ] See error: "⚠️ Estimated duration is required"
- **Status:** ☐ PASS ☐ FAIL

### C. Negative XP
- [ ] Set XP to `-50`
- [ ] See error: "⚠️ XP Reward must be a valid number"
- **Status:** ☐ PASS ☐ FAIL

### D. Pass Score > 100
- [ ] Set Pass Score to `150`
- [ ] See error: "⚠️ Mission Pass Score must be between 0 and 100"
- **Status:** ☐ PASS ☐ FAIL

### E. Pass Score < 0
- [ ] Set Pass Score to `-10`
- [ ] See error: "⚠️ Mission Pass Score must be between 0 and 100"
- **Status:** ☐ PASS ☐ FAIL

### F. No Buoys
- [ ] Fill all fields but add NO buoys
- [ ] See error: "⚠️ Add at least one buoy checkpoint"
- **Status:** ☐ PASS ☐ FAIL

**Overall Status:** ☐ PASS ☐ FAIL  
**Notes:** ___________________________________

---

## 🛡️ TEST 5: Double-Click Prevention

**Time:** 1 minute

### Steps:
1. [ ] Fill mission form with valid data
2. [ ] Rapidly double-click "Save Mission" button
3. [ ] Observe button behavior

### Expected Results:
- [ ] Button text: "💾 Saving..."
- [ ] Button becomes disabled (gray)
- [ ] Console: `[SAVE MISSION] Already saving, ignoring duplicate click`
- [ ] Only ONE document created in Firestore (not two)

**Status:** ☐ PASS ☐ FAIL  
**Notes:** ___________________________________

---

## 📋 TEST 6: Mission Display

**Time:** 1 minute

### Steps:
1. [ ] View mission list
2. [ ] Check XP display format

### Expected Display:
```
Mission Title
Est. 10 minutes    +150 XP    [Start Mission]
```

### Check:
- [ ] XP shows as "+150 XP" format
- [ ] Correct numeric value
- [ ] No "undefined" or "NaN"

**Status:** ☐ PASS ☐ FAIL  
**Notes:** ___________________________________

---

## 🔄 TEST 7: Backward Compatibility (Optional)

**Time:** 2 minutes  
**Note:** Only if you have old missions with string rewards

### Steps:
1. [ ] Find old mission (reward: "+100 XP" format)
2. [ ] Click edit
3. [ ] Check XP Reward field shows: `100`
4. [ ] Check Pass Score field shows: `70`
5. [ ] Save without changes

### Expected:
- [ ] No errors
- [ ] Values parsed correctly
- [ ] After save, Firestore has numeric values

**Status:** ☐ PASS ☐ FAIL ☐ SKIP  
**Notes:** ___________________________________

---

## 🌐 TEST 8: Backend Offline (Optional)

**Time:** 2 minutes

### Steps:
1. [ ] Stop backend (Ctrl+C in backend terminal)
2. [ ] Try to create mission
3. [ ] Click save

### Expected:
- [ ] Console: `⚠️ Failed to save to Firestore (backend offline)`
- [ ] Console: `💾 Falling back to localStorage only`
- [ ] Success message still appears
- [ ] Mission in list (from localStorage)
- [ ] NOT in Firestore

### Cleanup:
- [ ] Restart backend: `cd backend && npm start`

**Status:** ☐ PASS ☐ FAIL ☐ SKIP  
**Notes:** ___________________________________

---

## 🎮 TEST 9: Student Mission Completion (Optional)

**Time:** 5 minutes

### Steps:
1. [ ] Logout from instructor
2. [ ] Login as student
3. [ ] Start mission (XP: 150, Pass: 80%)
4. [ ] Complete with 85% score

### Expected Mission Complete Modal:
```
🎉 Mission Complete!
PASS
Score: 85%
Pass score: 80%
XP Earned: +150 XP
```

### Check:
- [ ] Pass score shows correctly (80%)
- [ ] Pass/Fail logic works
- [ ] XP reward correct (150)
- [ ] Student XP increased by 150

**Status:** ☐ PASS ☐ FAIL ☐ SKIP  
**Notes:** ___________________________________

---

## 📊 FINAL RESULTS

### Test Summary

| # | Test Name | Status | Priority |
|---|-----------|--------|----------|
| 1 | Create New Mission | ☐ Pass ☐ Fail | ⭐⭐⭐ |
| 2 | Verify Firestore Types | ☐ Pass ☐ Fail | ⭐⭐⭐ |
| 3 | Edit Existing Mission | ☐ Pass ☐ Fail | ⭐⭐ |
| 4 | Validation Errors | ☐ Pass ☐ Fail | ⭐⭐ |
| 5 | Double-Click Prevention | ☐ Pass ☐ Fail | ⭐ |
| 6 | Mission Display | ☐ Pass ☐ Fail | ⭐⭐ |
| 7 | Backward Compatibility | ☐ Pass ☐ Fail ☐ Skip | ⭐ |
| 8 | Backend Offline | ☐ Pass ☐ Fail ☐ Skip | ⭐ |
| 9 | Student Completion | ☐ Pass ☐ Fail ☐ Skip | ⭐ |

### Overall Result
- **Total Tests Run:** _____ / 9
- **Passed:** _____
- **Failed:** _____
- **Skipped:** _____

### Critical Tests (Must Pass)
- [ ] Test 1: Create Mission
- [ ] Test 2: Firestore Types

**DEPLOYMENT READY?** ☐ YES ☐ NO

---

## 🐛 Issues Found

### Issue #1
**Test:** _________  
**Description:** _________  
**Severity:** ☐ Critical ☐ High ☐ Medium ☐ Low  
**Screenshot:** ☐ Attached

### Issue #2
**Test:** _________  
**Description:** _________  
**Severity:** ☐ Critical ☐ High ☐ Medium ☐ Low  
**Screenshot:** ☐ Attached

### Issue #3
**Test:** _________  
**Description:** _________  
**Severity:** ☐ Critical ☐ High ☐ Medium ☐ Low  
**Screenshot:** ☐ Attached

---

## 📝 Additional Notes

_____________________________________________
_____________________________________________
_____________________________________________

---

## ✅ Sign-Off

**Tested By:** ___________________  
**Date:** ___________________  
**Time Spent:** ___________________  
**Recommendation:** ☐ Deploy ☐ Fix Issues First

---

**Need Help?**
- Check browser console (F12)
- Check backend console logs
- Review: `MISSION_EDITOR_TEST_GUIDE.md`
- Review: `MISSION_EDITOR_IMPLEMENTATION_REPORT.md`

---

*Print this checklist and mark as you test! 📋✅*
