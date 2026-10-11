# Instructor Firestore Authentication - Tasks

## Overview
Enable instructors created through the admin panel to authenticate using Firestore by implementing a backend API endpoint and updating the frontend authentication logic.

## Tasks

- [x] 1. Create backend instructor login endpoint
- [x] 2. Extend frontend Firebase API with loginInstructor method
- [x] 3. Update frontend authentication logic
- [x] 4. Test authentication flow
- [x] 5. Documentation and code cleanup

## Implementation Plan

### Task 1: Create backend instructor login endpoint
Create backend API endpoint `/api/v1/auth/instructor-login` for authenticating instructors against Firestore.

**Actions:**
- Create or extend `backend/routes/auth.js` file
- Implement POST endpoint handler that queries Firestore `instructor` collection by email
- Compare password using bcrypt
- Validate instructor status (active/inactive)
- Return instructor data or appropriate error codes (401, 403, 404, 500)
- Register auth routes in `backend/server.js`

**Acceptance Criteria:**
- Endpoint returns 200 with instructor data on successful auth
- Returns 401 for invalid credentials
- Returns 403 for inactive instructors
- Passwords compared using bcrypt
- No passwords in response or logs

**Files:**
- `backend/routes/auth.js` (create or extend)
- `backend/server.js`

---

### Task 2: Extend frontend Firebase API with loginInstructor method
Add `loginInstructor()` method to frontend Firebase API interface.

**Actions:**
- Locate `window.firebaseApi` definition in codebase
- Add `loginInstructor(email, password)` method
- Make POST request to `/api/v1/auth/instructor-login`
- Handle response and errors appropriately
- Return Promise with instructor data

**Acceptance Criteria:**
- Method makes HTTP POST to backend endpoint
- Returns Promise resolving to instructor object on success
- Rejects Promise with error message on failure
- Handles network errors gracefully

**Files:**
- Location where `window.firebaseApi` is defined (likely in `src/App.vue`)

---

### Task 3: Update frontend authentication logic
Update `mockAuthenticate()` function to support Firestore instructor login while maintaining backward compatibility.

**Actions:**
- Add email pattern detection for instructors (`@helmquest.edu.ph`)
- Add conditional branch for instructor Firestore authentication
- Call `window.firebaseApi.loginInstructor()` for Firestore instructors
- Handle success case by calling `proceedWithAuthentication`
- Handle error cases with clear messages
- Validate instructor status before authentication
- Ensure demo account fallback still works

**Acceptance Criteria:**
- Demo accounts checked first (`instructor@helmquest.local`)
- Firestore authentication for `@helmquest.edu.ph` emails
- Inactive instructors blocked with clear message
- No breaking changes to existing auth flow
- Error messages displayed appropriately

**Files:**
- `src/App.vue` (function `mockAuthenticate()` around line 9591)

---

### Task 4: Test authentication flow
Comprehensive testing of all authentication scenarios.

**Test Cases:**
- Create instructor via admin panel and verify login
- Test demo instructor login (backward compatibility)
- Test student login (unchanged)
- Test admin login (unchanged)
- Test invalid credentials error handling
- Test inactive instructor blocking
- Test error messages display correctly
- Test network error handling
- Verify no passwords in console logs

**Acceptance Criteria:**
- All authentication scenarios work as expected
- Demo accounts still functional
- Clear error messages displayed
- No sensitive data in console
- Backward compatibility maintained

---

### Task 5: Documentation and code cleanup
Document the authentication flow and clean up code.

**Actions:**
- Add code comments to backend endpoint explaining logic
- Add code comments to frontend auth logic
- Document email pattern detection rules in code
- Clean up console.log statements
- Ensure consistent error handling and messaging

**Acceptance Criteria:**
- Clear comments in backend and frontend code
- Email patterns documented
- No unnecessary console logs
- Consistent error message format

**Files:**
- `backend/routes/auth.js`
- `src/App.vue`



## Task Dependency Graph

```
Task 1 (Backend API endpoint)
  ↓
Task 2 (Frontend API method)
  ↓
Task 3 (Authentication logic)
  ↓
Task 4 (Testing)
  ↓
Task 5 (Documentation)
```

## Notes

### Email Pattern Rules
- **Students:** `@dnsc.edu.ph` → Firestore auth
- **Instructors (Firestore):** `@helmquest.edu.ph` → Firestore auth
- **Instructors (Demo):** `@helmquest.local` → Demo account check first
- **Admin:** Any email in `DEMO_USERS` → Demo account

### Backward Compatibility
All existing authentication must continue to work:
- Demo accounts (instructor@helmquest.local, admin@helmquest.local)
- Student Firestore authentication
- Admin demo authentication

### Error Messages
- Invalid credentials: "Invalid email or password."
- Inactive account: "Account disabled. Contact system admin."
- Server error: "Login failed. Please try again."
- Network error: "Connection error. Please check your internet."

