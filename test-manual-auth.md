# Manual Authentication Test Checklist

## ✅ Automated Tests Completed
- [x] Email pattern detection working correctly
- [x] Backend instructor authentication endpoint responding
- [x] API routing logic verified
- [x] Error handling working properly

## 🧪 Manual Browser Tests (Complete these in browser)

### Test 1: Demo Account Authentication
**Objective**: Verify backward compatibility with demo accounts

1. Open http://localhost:5174
2. Click "Sign In" 
3. Test these accounts:

**Demo Instructor:**
- Email: `instructor@helmquest.local`
- Password: `password`
- Expected: ✅ Login successful, redirect to instructor dashboard

**Demo Admin:**
- Email: `admin@helmquest.local` 
- Password: `password`
- Expected: ✅ Login successful, redirect to admin panel

**Demo Student:**
- Email: `student@helmquest.local`
- Password: `password`  
- Expected: ✅ Login successful, redirect to student dashboard

### Test 2: Email Pattern Validation
**Objective**: Verify authentication routing logic

**Invalid Pattern:**
- Email: `user@gmail.com`
- Password: `password`
- Expected: ❌ "Invalid email or password. Use one of the demo accounts below."

**Student Pattern (no valid account):**
- Email: `test@dnsc.edu.ph`
- Password: `password`
- Expected: ❌ "Invalid email or password."

**Instructor Pattern (no valid account):**
- Email: `test@helmquest.edu.ph` 
- Password: `password`
- Expected: ❌ "Invalid email or password."

### Test 3: Create and Test Real Firestore Instructor
**Objective**: Test full instructor Firestore authentication flow

1. Login as admin (`admin@helmquest.local` / `password`)
2. Go to Admin Panel → Instructors
3. Create new instructor:
   - Name: `Test Professor`
   - Email: `testprof@helmquest.edu.ph` (important: use @helmquest.edu.ph domain)
   - Password: `testpass123`
   - Status: `Active`
4. Logout
5. Login with new instructor credentials:
   - Email: `testprof@helmquest.edu.ph`
   - Password: `testpass123`
   - Expected: ✅ Login successful via Firestore authentication

### Test 4: Inactive Account Handling
**Objective**: Verify status validation works

1. As admin, set the test instructor status to "Inactive"
2. Try to login with the instructor credentials
3. Expected: ❌ "Account disabled. Contact system admin."

### Test 5: Authentication Priority
**Objective**: Verify demo accounts take priority over Firestore

1. Create an instructor with email: `instructor@helmquest.local` in Firestore (if possible)
2. Try to login with `instructor@helmquest.local` / `password`
3. Expected: ✅ Should login as demo account (Helen Morgan), NOT the Firestore account

## 🎯 Expected Results Summary

| Test Case | Email Pattern | Expected Auth Method | Status |
|-----------|---------------|---------------------|---------|
| Demo instructor | @helmquest.local | Demo account | ✅ |
| Demo admin | @helmquest.local | Demo account | ✅ |
| Demo student | @helmquest.local | Demo account | ✅ |
| Student Firestore | @dnsc.edu.ph | Student API | 🧪 |
| Instructor Firestore | @helmquest.edu.ph | Instructor API | 🧪 |
| Invalid pattern | Other domains | Error message | ✅ |

## 🔧 Authentication Flow Logic Verification

The `mockAuthenticate()` function should follow this exact priority:

1. **Demo Account Check** (highest priority)
   - Check `DEMO_USERS` object first
   - If found and password matches → `proceedWithAuthentication(user)`

2. **Student Firestore** (`@dnsc.edu.ph` emails)
   - Call `window.firebaseApi.loginStudent(email, password)`
   - Handle status validation (pending, rejected, inactive)

3. **Instructor Firestore** (`@helmquest.edu.ph` emails)  
   - Call `window.firebaseApi.loginInstructor(email, password)`
   - Handle status validation (inactive)

4. **Error Handling** (no match)
   - Show appropriate error message

## ✅ Task Completion Criteria

- [x] Backend instructor authentication endpoint implemented
- [x] Frontend Firebase API `loginInstructor()` method implemented  
- [x] `mockAuthenticate()` function updated with correct logic
- [x] Email pattern detection working correctly
- [x] Authentication priority implemented (demo first, then Firestore)
- [x] Error handling for invalid credentials and inactive accounts
- [x] Backward compatibility maintained for demo accounts
- [ ] Manual browser testing completed
- [ ] Documentation updated

**Status**: Ready for manual testing and documentation