# Student Management Testing Guide

## 🧪 How to Test the New Features

### Step 1: Access Instructor Console
1. Go to `http://localhost:5174`
2. Click "Instructor Login"
3. Login with your instructor credentials

### Step 2: Navigate to Students Tab
1. In the instructor sidebar, click "Students"
2. You should now see the enhanced student table with new columns

### Step 3: Verify Enhanced Table

**Check for these columns:**
- ✅ Student ID
- ✅ Name
- ✅ Missions (X/Y format) ← NEW
- ✅ Quizzes (X/Y format) ← NEW
- ✅ Mission Score (percentage)
- ✅ Quiz Score (percentage)
- ✅ Latest Activity (date)
- ✅ Action (Review button)

**What you should see:**
```
Student ID        Name     Missions   Quizzes   Mission Score   Quiz Score   Latest Activity   Action
DNSC2026-00334    Kevin    4/6        3/5       84%             80%          Sep 27, 2026      Review
DNSC2026-00335    Kath     2/6        1/5       76%             72%          Sep 26, 2026      Review
```

**What you should NOT see:**
- ❌ Attempt counts
- ❌ "2 attempts", "3 attempts", etc.
- ❌ Multiple rows per student

### Step 4: Test Student Detail Modal

1. Click the "Review" button on any student
2. A modal should open showing:

**Header Section:**
- "← Back to Students" button
- "Student Training Record" title
- Close button (✕)

**Profile Section:**
- Student name
- Student ID
- Status badge

**Summary Cards (4 cards horizontally):**
- Missions: X / Y
- Quizzes: X / Y
- Mission Score: XX%
- Quiz Score: XX%

**Tab Navigation:**
- Overview
- Missions
- Quizzes

### Step 5: Test Overview Tab

**Should display:**
- Mission Performance section (average score)
- Quiz Performance section (average score)
- Completion Status section with progress bars

**Verify:**
- ✅ Progress bars show correct percentage
- ✅ Numbers match the summary cards
- ✅ Clean, readable layout

### Step 6: Test Missions Tab

**Should display:**
- Table with columns: Mission | Score | Status
- One row per unique mission
- Status badges (color-coded):
  - Green: Completed
  - Yellow: In Progress
  - Gray: Not Started

**Verify:**
- ✅ ALL missions are listed (even not started ones)
- ✅ Only ONE row per mission (no duplicates)
- ✅ Best score is displayed
- ✅ NO attempt count column
- ✅ NO "2 attempts" text anywhere

**Example data:**
```
Mission                  Score    Status
Basic Navigation         92%      Completed
Port Approach            78%      Completed
Emergency Navigation     —        Not Started
```

### Step 7: Test Quizzes Tab

**Should display:**
- Table with columns: Quiz | Score | Status
- One row per unique quiz
- Status badges (color-coded):
  - Green: Passed
  - Red: Failed
  - Gray: Not Started

**Verify:**
- ✅ ALL quizzes are listed
- ✅ Only ONE row per quiz
- ✅ Best score is displayed
- ✅ NO attempt count

**Example data:**
```
Quiz                      Score    Status
Navigation Safety         90%      Passed
COLREGS Fundamentals      85%      Passed
Bridge Procedures         —        Not Started
```

### Step 8: Test Modal Navigation

1. Switch between tabs (Overview, Missions, Quizzes)
2. Verify tab highlighting works
3. Verify content changes correctly

**Test closing:**
- Click "← Back to Students" button
- Click the ✕ button
- Click outside the modal (on dark overlay)

All should close the modal and return to the student table.

### Step 9: Test Edge Cases

**Student with no missions:**
- Should show: 0/X
- Mission Score: —
- Detail view Missions tab: "No mission data available" or all "Not Started"

**Student with no quizzes:**
- Should show: 0/X
- Quiz Score: —
- Detail view Quizzes tab: "No quiz data available"

**Student with no activity:**
- Latest Activity: —

### Step 10: Test Data Accuracy

**Verify missions count:**
1. Count unique missions a student has completed
2. Check if the number matches the table
3. If student completed Mission A three times, it should still count as 1

**Verify quiz count:**
1. Count unique quizzes a student has submitted
2. Check if the number matches the table
3. If student submitted Quiz A twice, it should count as 1

**Verify scores:**
1. Check if Mission Score shows average or best (based on system logic)
2. Check if individual mission scores are correct
3. Verify scores are NOT showing all attempts

## 🐛 Common Issues and Fixes

### Issue: Table shows old data
**Fix:** Hard refresh the page (Ctrl+Shift+R)

### Issue: Missions/Quizzes show 0/0
**Fix:** 
- Check if backend is running on port 3001
- Check browser console for API errors
- Verify Firestore has training_modules and quizzes collections

### Issue: Detail modal doesn't open
**Fix:**
- Check browser console for errors
- Verify `openStudentDetail()` function exists
- Check if `showStudentDetailModal` state works

### Issue: Scores showing as "—"
**Possible reasons:**
- Student has no completed missions/quizzes (this is correct behavior)
- API endpoint returning null (check backend logs)
- Firestore data missing

### Issue: Wrong completion counts
**Debug:**
1. Open browser DevTools → Network tab
2. Click Review button
3. Check API responses for `/training-summary`
4. Verify backend is counting unique mission/quiz IDs

## ✅ Acceptance Criteria

The implementation is successful if:

- [x] Student table has Missions and Quizzes columns
- [x] Completion shown in X/Y format
- [x] NO attempt counts visible
- [x] Review button opens detail modal
- [x] Modal has 3 tabs that work
- [x] Missions tab shows one row per mission
- [x] Quizzes tab shows one row per quiz
- [x] Multiple submissions of same mission/quiz only count as 1
- [x] Scores are summarized (not per-attempt)
- [x] UI matches existing HelmQuest style
- [x] Modal closes properly
- [x] No errors in console
- [x] Existing functionality still works

## 📸 Visual Verification

### Student Table Should Look Like:
```
┌──────────────┬────────┬──────────┬─────────┬──────────────┬────────────┬─────────────────┬────────┐
│ Student ID   │ Name   │ Missions │ Quizzes │ Mission Score│ Quiz Score │ Latest Activity │ Action │
├──────────────┼────────┼──────────┼─────────┼──────────────┼────────────┼─────────────────┼────────┤
│ DNSC2026-334 │ Kevin  │   4/6    │   3/5   │     84%      │    80%     │  Sep 27, 2026   │ Review │
│ DNSC2026-335 │ Kath   │   2/6    │   1/5   │     76%      │    72%     │  Sep 26, 2026   │ Review │
└──────────────┴────────┴──────────┴─────────┴──────────────┴────────────┴─────────────────┴────────┘
```

### Detail Modal Should Look Like:
```
┌─────────────────────────────────────────────────────────────┐
│  ← Back to Students                                       ✕ │
│  Student Training Record                                     │
├─────────────────────────────────────────────────────────────┤
│  Kevin Caidic                                                │
│  Student ID: DNSC2026-00334                                  │
│  Status: Active                                              │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────┬──────────┬──────────────┬────────────┐       │
│  │ Missions │ Quizzes  │ Mission Score│ Quiz Score │       │
│  │   4/6    │   3/5    │     84%      │    80%     │       │
│  └──────────┴──────────┴──────────────┴────────────┘       │
├─────────────────────────────────────────────────────────────┤
│  [ Overview ]  [ Missions ]  [ Quizzes ]                     │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  [Tab Content Area]                                          │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

## 🎉 Success!

If all tests pass, the Student Management redesign is working correctly!

**Key Achievement:**
- Clean, professional instructor interface
- No confusing attempt counts
- Easy to understand student progress
- Detailed training records on demand
- Scalable for many missions/quizzes
