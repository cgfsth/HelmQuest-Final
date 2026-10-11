# Task 1.3 Manual Test Plan: Authentication Guards

## Objective
Verify that the `syncStudentMotivation()` function properly guards against unauthorized API calls by testing different authentication scenarios.

## Prerequisites
- Frontend running at http://localhost:8080
- Backend running at http://localhost:3001
- Access to browser developer tools (Console & Network tabs)

## Test Scenarios

### Test 1: Unauthenticated User (No Login)
**Expected Behavior:** No API call to `/api/v1/mission-scores/student/:id/total-xp`

**Steps:**
1. Open browser with developer tools (F12)
2. Navigate to http://localhost:8080
3. Stay on landing screen (don't log in)
4. Open Network tab in developer tools
5. Open Console tab in developer tools
6. Observe that NO API calls to `mission-scores` endpoint are made

**Expected Results:**
- ✅ No network request to `/api/v1/mission-scores/student/*/total-xp`
- ✅ No console errors related to API calls
- ✅ Function returns early due to `!studentId` check

**Verification:**
```javascript
// In browser console, check current user state:
console.log(currentUser.value);  // Should be null or undefined
console.log(userRole.value);     // Should be null or undefined
```

---

### Test 2: Authenticated Non-Student User (Instructor/Admin)
**Expected Behavior:** No API call to student XP endpoint even when logged in

**Steps:**
1. Open browser with developer tools (F12)
2. Navigate to http://localhost:8080
3. Click "Instructor Login" or "Admin Portal"
4. Log in with instructor/admin credentials
5. Open Network tab and filter for "mission-scores"
6. Observe that NO API calls to student XP endpoint are made

**Expected Results:**
- ✅ No network request to `/api/v1/mission-scores/student/*/total-xp`
- ✅ Instructor/Admin dashboard loads normally
- ✅ Function returns early due to `userRole !== 'student'` check

**Verification:**
```javascript
// In browser console, check current user state:
console.log(currentUser.value);  // Should have user object
console.log(userRole.value);     // Should be "instructor" or "admin"
```

---

### Test 3: Authenticated Student User
**Expected Behavior:** API call IS made to fetch student XP data

**Steps:**
1. Open browser with developer tools (F12)
2. Navigate to http://localhost:8080
3. Click "Student Portal"
4. Log in with student credentials
5. Open Network tab and filter for "mission-scores"
6. Observe the API call to student XP endpoint

**Expected Results:**
- ✅ Network request to `/api/v1/mission-scores/student/:studentId/total-xp` IS made
- ✅ Request contains valid student ID in URL
- ✅ Response contains `{ totalXp: number, missionsCompleted: number, xpBreakdown: [...] }`
- ✅ Student portal displays XP value from API response

**Verification:**
```javascript
// In browser console, check current user state:
console.log(currentUser.value);  // Should have student user object
console.log(userRole.value);     // Should be "student"
```

**Network Request Verification:**
- Request URL: `http://localhost:3001/api/v1/mission-scores/student/:studentId/total-xp`
- Request Method: GET
- Status Code: 200 OK
- Response Body: JSON with `totalXp` and `missionsCompleted`

---

## Code Location
**File:** `src/App.vue`  
**Function:** `syncStudentMotivation()` (lines 8245-8280)

**Authentication Guards (lines 8247-8248):**
```javascript
const studentId = currentUser.value?.id;
if (!studentId || userRole.value !== 'student') return;
```

## Guard Logic Flow

```
┌─────────────────────────────────┐
│ syncStudentMotivation() called  │
└───────────┬─────────────────────┘
            │
            ▼
┌─────────────────────────────────┐
│ Extract studentId               │
│ const studentId = currentUser   │
│   .value?.id;                   │
└───────────┬─────────────────────┘
            │
            ▼
┌─────────────────────────────────┐
│ Authentication Guard Check      │
│ if (!studentId ||               │
│     userRole !== 'student')     │
└───────────┬─────────────────────┘
            │
       ┌────┴────┐
       │         │
   ❌ TRUE    FALSE ✅
       │         │
       ▼         ▼
   ┌───────┐  ┌────────────────┐
   │RETURN │  │ CONTINUE       │
   │(Early)│  │ Make API call  │
   └───────┘  └────────────────┘
       │         │
       ▼         ▼
   No API    API executes
   call      successfully
```

## Success Criteria

✅ **Test 1 Pass:** Unauthenticated users don't trigger API calls  
✅ **Test 2 Pass:** Instructors/Admins don't trigger student XP API calls  
✅ **Test 3 Pass:** Authenticated students trigger API calls with correct student ID  

## Notes

- The authentication guards use **early return** pattern for security
- Guards are positioned **BEFORE** the API call (critical for security)
- The `?.` optional chaining prevents errors when `currentUser.value` is null
- Both conditions (`!studentId` OR `userRole !== 'student'`) must fail for API call to proceed

## Conclusion

If all three test scenarios pass, Task 1.3 is successfully implemented and verified:
- ✅ Early return checks for `!studentId` preserved
- ✅ Early return checks for `userRole !== 'student'` preserved
- ✅ No API call made when user is not authenticated
- ✅ No API call made when user is not a student
