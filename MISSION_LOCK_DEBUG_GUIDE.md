# Mission Lock Debugging Guide

## Problem
Mission showing "Complete the previous level to unlock" pero wala naka-check ang "Unlock levels in order" checkbox.

---

## Debug Logging Added

Gi-add nako ug **detailed console logging** para makita nimo EXACTLY unsa ang nag-lock sa mission!

### How to Use:

#### 1. Open Browser Console (F12)
```
Chrome/Edge: F12 or Ctrl+Shift+I
Firefox: F12 or Ctrl+Shift+K
```

#### 2. Reload Page (Student View)
```
Refresh page and go to Missions tab
```

#### 3. Look for Debug Messages
```javascript
// When mission card loads, you'll see:

[🔍 Mission Lock Debug] {
  moduleId: "CUSTOM-custom-mission-1790755414401",
  studentId: "Dao00334-2026",
  availabilityStatus: {
    status: "available" or "not_open" or "closed",
    message: "..." 
  },
  schedule: {
    openDate: "2024-01-15T08:00" or "",  // ← Check this!
    deadline: "2024-12-31T23:59" or ""   // ← Check this!
  },
  currentTime: "2025-01-08T10:30:00.000Z",
  sequentialUnlock: false,  // ← Should be false
  lockedByInstructor: false // ← Should be false
}
```

---

## Possible Lock Causes

### Cause 1: Date Schedule (Open Date)
```javascript
[🔍 Mission Lock Debug] {
  schedule: {
    openDate: "2025-02-01T08:00",  // ← Future date!
    deadline: ""
  },
  currentTime: "2025-01-08T10:30:00.000Z"
}

[❌ Mission Locked] Reason: Date availability - 🔒 Not yet available
```

**Fix:** Clear openDate in instructor console OR wait until that date

---

### Cause 2: Deadline Passed
```javascript
[🔍 Mission Lock Debug] {
  schedule: {
    openDate: "",
    deadline: "2024-12-31T23:59"  // ← Past deadline!
  },
  currentTime: "2025-01-08T10:30:00.000Z"
}

[❌ Mission Locked] Reason: Date availability - ⏰ Deadline passed
```

**Fix:** Clear deadline in instructor console OR extend deadline

---

### Cause 3: Sequential Unlock (Even if Unchecked!)
```javascript
[🔍 Mission Lock Debug] {
  sequentialUnlock: true,  // ← TRUE even though checkbox unchecked!
  lockedByInstructor: false
}

[🔍 Access Check] {
  access: {
    accessible: false,
    reason: "complete_previous",
    previousModuleId: "m1-mission1"
  }
}

[❌ Mission Locked] Reason: Sequential - must complete m1-mission1
```

**Cause:** Data stored in Firestore has `sequentialUnlock: true`

**Fix:** 
1. Instructor unchecks "Unlock in order"
2. Backend needs to update Firestore data
3. Or manually fix in Firestore console

---

### Cause 4: Manual Lock by Instructor
```javascript
[🔍 Mission Lock Debug] {
  lockedByInstructor: true,  // ← Manually locked!
  sequentialUnlock: false
}

[❌ Mission Locked] Reason: Instructor manual lock
```

**Fix:** Instructor unchecks "🔒 Lock (hide from students)"

---

## How to Fix Each Cause

### Fix 1: Clear Open Date
```
Instructor Console:
1. Go to Missions
2. Find "Test Mission 1"
3. Open Date field → Clear it (make empty)
4. Save
```

### Fix 2: Clear or Extend Deadline
```
Instructor Console:
1. Go to Missions
2. Find "Test Mission 1"  
3. Deadline field → Clear it OR set future date
4. Save
```

### Fix 3: Uncheck Sequential Unlock
```
Instructor Console:
1. Go to Missions
2. Top of page: Uncheck "Unlock levels in order"
3. If still locked, check Firestore data

Firebase Console:
1. Go to Firestore Database
2. Collection: users
3. Document: <instructor-id>
4. Field: progress.courseSettings.sequentialUnlock
5. Change: true → false
6. Save
```

### Fix 4: Uncheck Manual Lock
```
Instructor Console:
1. Go to Missions
2. Find "Test Mission 1"
3. Instructor Controls section
4. Uncheck "🔒 Lock (hide from students)"
5. Save
```

---

## Console Output Examples

### Example 1: Mission Unlocked (Working Correctly)
```javascript
[🔍 Mission Lock Debug] {
  moduleId: "CUSTOM-custom-mission-1790755414401",
  availabilityStatus: { status: "available", message: "" },
  schedule: { openDate: "", deadline: "" },
  sequentialUnlock: false,
  lockedByInstructor: false
}

[🔍 Access Check] {
  access: { accessible: true }
}

// ✅ No lock message - mission accessible!
```

### Example 2: Locked by Open Date
```javascript
[🔍 Mission Lock Debug] {
  schedule: {
    openDate: "2025-02-01T08:00",
    deadline: ""
  },
  currentTime: "2025-01-08T10:30:00.000Z",
  availabilityStatus: {
    status: "not_open",
    message: "🔒 Not yet available"
  }
}

[❌ Mission Locked] Reason: Date availability - 🔒 Not yet available
```

### Example 3: Locked by Sequential (Data Issue)
```javascript
[🔍 Mission Lock Debug] {
  sequentialUnlock: true,  // ← Problem! Should be false
  lockedByInstructor: false
}

[🔍 Access Check] {
  access: {
    accessible: false,
    reason: "complete_previous",
    previousModuleId: "m1-mission1"
  }
}

[❌ Mission Locked] Reason: Sequential - must complete m1-mission1
```

---

## Testing Steps

### Step 1: Check Console Logs
```
1. Open student view
2. Press F12
3. Go to Missions tab
4. Look for "[🔍 Mission Lock Debug]" messages
5. Identify which value is causing lock
```

### Step 2: Verify in Instructor Console
```
1. Switch to instructor view
2. Go to Missions
3. Check mission settings:
   ☐ Unlock levels in order
   ☐ Lock (hide from students)
   📅 Open Date: [empty or past]
   ⏰ Deadline: [empty or future]
```

### Step 3: Clear Problem Setting
```
Based on console logs, clear:
- openDate if status: "not_open"
- deadline if status: "closed"
- Uncheck sequential if reason: "complete_previous"
- Uncheck lock if reason: "locked_by_instructor"
```

### Step 4: Reload & Verify
```
1. Save changes in instructor console
2. Reload student view
3. Check console again
4. Mission should be accessible now!
```

---

## Firebase Data Structure

### Where Settings Are Stored:
```javascript
// Firestore path:
users/<instructorId or studentId>/

// Document structure:
{
  email: "...",
  role: "student" or "instructor",
  progress: {
    courseSettings: {
      sequentialUnlock: false,  // ← Sequential lock toggle
      lockedModuleIds: [],      // ← Manual locks
      autoAwardBadgesAndCerts: true
    },
    moduleSchedule: {
      "CUSTOM-custom-mission-1790755414401": {
        openDate: "",     // ← Open date
        deadline: ""      // ← Deadline
      }
    }
  }
}
```

---

## Quick Diagnosis Table

| Console Output | Cause | Fix |
|---------------|-------|-----|
| `status: "not_open"` | Open date in future | Clear openDate |
| `status: "closed"` | Deadline passed | Clear/extend deadline |
| `reason: "complete_previous"` | Sequential unlock ON | Uncheck sequential |
| `reason: "locked_by_instructor"` | Manual lock | Uncheck lock button |
| `lockedByInstructor: true` | Manual lock | Uncheck lock button |
| `sequentialUnlock: true` | Sequential ON | Uncheck sequential |

---

## Files Modified

### 1. App.vue (Debug Logging Added)
```javascript
// File: capstone/src/App.vue
// Function: getModuleLockReasonForStudent()
// Added: Console.log statements for debugging
```

### 2. courseSettings.js (Default Changed)
```javascript
// File: capstone/src/helpers/courseSettings.js  
// Line 23, 39: sequentialUnlock default = false
```

---

## Next Steps

### 1. Check Console Now
```bash
# Open student view
# Press F12
# Look for debug messages
# Screenshot and send me the console output!
```

### 2. Based on Console, We'll Fix
```
- If date issue → Clear dates
- If sequential issue → Fix Firestore data
- If manual lock → Uncheck lock
```

---

**Reload ang page ug check ang console (F12)! Tan-awa unsay message sa `[🔍 Mission Lock Debug]` - screenshot then send! 📸🔍**
