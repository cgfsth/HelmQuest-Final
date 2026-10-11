# Implementation Tasks: Student Enrollment System

## Overview

This implementation creates a complete student enrollment workflow with Firestore integration, including self-signup, instructor approval, and role-based authentication.

## Tasks

- [x] 1. Backend API - Student Signup and Authentication
  - [x] 1.1 Update backend students route with signup endpoint
    - Add `POST /api/v1/students/signup` endpoint in `backend/routes/students.js`
    - Accept studentId, name, email, password from request body
    - Hash password using bcrypt before storing
    - Create student document in Firestore `students` collection with status="pending"
    - Set default values: xp=0, rank="Deck Hand", completed=0, badges=0, certificates=0
    - Return success response with student ID
    - _Requirements: 1.1, 1.2, 1.3, 1.4_
  
  - [x] 1.2 Create student login endpoint
    - Add `POST /api/v1/students/login` endpoint in `backend/routes/students.js`
    - Accept email and password from request body
    - Query Firestore `students` collection by email
    - Verify password hash using bcrypt
    - Return student data (excluding password) and status
    - Return error if credentials invalid
    - _Requirements: 2.1, 2.2_

- [x] 2. Backend API - Instructor Approval Endpoints
  - [x] 2.1 Create endpoints for pending students and approval
    - Add `GET /api/v1/students/pending` endpoint to fetch students with status="pending"
    - Add `PUT /api/v1/students/:id/approve` endpoint to update status to "active", set approvedBy and approvedAt
    - Add `PUT /api/v1/students/:id/reject` endpoint to update status to "rejected"
    - Return updated student data after approval/rejection
    - _Requirements: 3.1, 3.2, 3.5, 3.6_

- [x] 3. Backend API - Instructor Authentication
  - [x] 3.1 Create instructor login endpoint
    - Add `POST /api/v1/instructors/login` endpoint in `backend/routes/instructors.js`
    - Accept email and password from request body
    - Query Firestore `instructors` collection by email
    - Verify password hash using bcrypt
    - Return instructor data (excluding password)
    - _Requirements: 4.1, 4.2, 4.3_

- [x] 4. Frontend - Update Student Signup to use Firestore
  - [x] 4.1 Update handleSignup function in App.vue
    - Find `handleSignup()` function (search for signupForm)
    - Replace localStorage logic with API call to `POST /api/v1/students/signup`
    - Send studentId, name, email, password to backend
    - On success: show message "Account created! Wait for instructor approval."
    - On error: display error message
    - Set signupSuccess flag to true
    - _Requirements: 1.1, 1.5_

- [x] 5. Frontend - Update Student Login to check Firestore status
  - [x] 5.1 Update student login function in App.vue
    - Find student login function (search for "signin" or authentication logic)
    - Replace localStorage check with API call to `POST /api/v1/students/login`
    - Store returned student data in `currentUser.value`
    - Check `status` field from response:
      - If "pending": show alert "Your account is pending instructor approval" and stay on login screen
      - If "active": set `isAuthenticated.value = true`, `userRole.value = 'student'`, navigate to dashboard
      - If "inactive" or "rejected": show alert "Account disabled. Contact your instructor."
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

- [x] 6. Frontend - Add Mission Access Control for Pending Students
  - [x] 6.1 Add pending status check in student dashboard
    - In the student dashboard section (v-if="activeScreen === 'dashboard' && userRole === 'student'")
    - Add computed property `isStudentPending` that checks `currentUser.value.status === 'pending'`
    - If pending, display message instead of missions: "⏳ Your enrollment is pending instructor approval. You'll receive access once approved."
    - Hide mission list and navigation when pending
    - Show only profile card and pending message
    - _Requirements: 5.1, 5.2, 5.3_

- [x] 7. Frontend - Update Instructor Pending Approvals Section
  - [x] 7.1 Connect pending approvals to Firestore API
    - Find the "Pending Approvals" section in instructor console (line ~1181)
    - Add function `loadPendingStudents()` that calls `GET /api/v1/students/pending`
    - Store results in `pendingStudentSignups.value`
    - Call `loadPendingStudents()` when instructor console opens
    - _Requirements: 3.1, 3.2_
  
  - [x] 7.2 Implement approve and reject functions
    - Find or create `approveStudentSignup(student)` function
    - Call `PUT /api/v1/students/${student.id}/approve` with instructorId
    - On success: remove from pending list, show success message
    - Find or create `rejectStudentSignup(student)` function
    - Call `PUT /api/v1/students/${student.id}/reject`
    - On success: remove from pending list, show confirmation
    - _Requirements: 3.3, 3.4, 3.5, 3.6_

- [ ] 8. Frontend - Update Instructor Login to use Firestore
  - [x] 8.1 Update instructor login function
    - Find instructor login logic in App.vue
    - Replace localStorage check with API call to `POST /api/v1/instructors/login`
    - Store returned instructor data in `currentUser.value`
    - Set `isAuthenticated.value = true`, `userRole.value = 'instructor'`
    - Navigate to instructor console
    - On error: display "Invalid credentials"
    - _Requirements: 4.1, 4.2, 4.3_

- [ ] 9. Frontend - Student Status Management UI
  - [ ] 9.1 Fix status dropdown CSS styling
    - Locate status dropdown in App.vue (line ~1264-1275)
    - Verify CSS classes are applied: `.student-status-dropdown`, `.student-status-dropdown--active`, `.student-status-dropdown--inactive`
    - Check if CSS is in scoped or global section (line ~21530-21585)
    - If CSS not visible, move outside `<style scoped>` or add `/deep/` selector
    - Test in browser: dropdown should show green for ACTIVE, red for INACTIVE
    - Verify dropdown arrow SVG appears correctly
    - _Requirements: 3.7_
  
  - [ ] 9.2 Update Total Students count to show only ACTIVE students
    - Find `instructorDashboardStats` computed property (line ~5097-5127)
    - Update `totalStudents` calculation to filter by `status === 'active'`
    - Change from: `totalStudents: students.length`
    - Change to: `totalStudents: students.filter(s => s.status === 'active').length`
    - Verify count displays only active students in instructor dashboard
    - Update references at lines 968, 993, 998
    - _Requirements: 3.8_

- [ ] 10. Frontend - Block INACTIVE Students from Login
  - [ ] 10.1 Update student login to check INACTIVE status
    - Find student login function in App.vue (search for `loginStudent` or `mockAuthenticate`)
    - Update status check logic:
      - If status === "pending": show "Your account is pending instructor approval"
      - If status === "inactive": show "Your account has been disabled. Contact your instructor."
      - If status === "active": allow login and access
      - If status === "rejected": show "Your account has been disabled. Contact your instructor."
    - Block INACTIVE students from accessing student dashboard
    - _Requirements: 2.5, 6.1_

- [ ] 11. Testing - Manual End-to-End Testing
  - [ ] 11.1 Test student signup flow
    - Open application and click "Sign Up"
    - Fill in studentId, name, email, password
    - Submit form
    - Verify student document created in Firestore `students` collection with status="pending"
    - Verify message displayed: "Account created! Wait for instructor approval."
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_
  
  - [ ] 11.2 Test pending student login
    - Try to log in with pending student credentials
    - Verify alert shows: "Your account is pending instructor approval"
    - Verify student cannot access missions
    - _Requirements: 2.3, 5.1, 5.2_
  
  - [ ] 11.3 Test instructor approval workflow
    - Log in as instructor
    - Verify pending student appears in "Pending Approvals" section
    - Click "Approve" button
    - Verify Firestore document updates: status="active", approvedBy set, approvedAt set
    - Verify student removed from pending list
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_
  
  - [ ] 11.4 Test approved student login
    - Log in with approved student credentials
    - Verify login successful
    - Verify student can see and access missions
    - _Requirements: 2.4, 5.3_
  
  - [ ] 11.5 Test inactive student login (NEW)
    - Log in as instructor
    - Change a student's status from ACTIVE to INACTIVE using dropdown
    - Verify Firestore updates: status="inactive"
    - Log out and try to log in as that student
    - Verify alert shows: "Your account has been disabled. Contact your instructor."
    - Verify student cannot access dashboard
    - _Requirements: 2.5, 6.1_
  
  - [ ] 11.6 Test status dropdown functionality (NEW)
    - Log in as instructor, go to Students tab
    - Verify dropdown shows current status (ACTIVE/INACTIVE)
    - Change student status from ACTIVE to INACTIVE
    - Verify confirmation dialog appears
    - Confirm change
    - Verify dropdown updates to red (INACTIVE) immediately
    - Verify Firestore document updated
    - Change back to ACTIVE
    - Verify dropdown updates to green (ACTIVE)
    - _Requirements: 3.7_
  
  - [ ] 11.7 Test Total Students count (NEW)
    - Log in as instructor
    - Check "Total Students" count in dashboard overview
    - Verify it shows only ACTIVE students
    - Change a student to INACTIVE
    - Reload or refresh dashboard
    - Verify Total Students count decreased by 1
    - _Requirements: 3.8_

## Notes

- Use bcrypt for password hashing in backend
- Store password hash, never plain text
- Backend routes already exist in `backend/routes/students.js` and `backend/routes/instructors.js` - update them
- Frontend firebaseApi already has helper functions - create new ones for login/signup
- The pending approvals UI already exists in App.vue (line ~1181) - just connect it to API
- Mission access control check should be added to student dashboard rendering logic

## Success Criteria

1. Students can self-signup and data saves to Firestore with status="pending"
2. Pending students see approval message instead of missions
3. Instructors can approve/reject pending students from console
4. Approved students can log in and access missions
5. All authentication uses Firestore instead of localStorage
