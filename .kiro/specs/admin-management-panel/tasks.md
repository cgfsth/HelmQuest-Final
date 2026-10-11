# Implementation Tasks: Admin Management Panel

## Overview

This implementation creates a comprehensive admin panel for HelmQuest with instructor management, system statistics dashboard, and global student management capabilities.

## Tasks

- [x] 1. Backend Infrastructure - Admin Routes and Middleware
  - [x] 1.1 Create admin authentication middleware
    - Create `backend/middleware/requireAdmin.js` file
    - Implement middleware function that extracts user from request
    - Query Firestore `users` collection to verify `role === 'admin'`
    - Return 401 Unauthorized if no user authenticated
    - Return 403 Forbidden if user role is not admin
    - Call next() if admin verified
    - _Requirements: NFR-1 (Security), REQ-1.1 to REQ-3.6_
  
  - [x] 1.2 Create admin routes file
    - Create `backend/routes/admin.js` file
    - Import express and requireAdmin middleware
    - Create router instance
    - Add route stubs for all endpoints (stats, instructors, students)
    - Export router
    - _Requirements: NFR-1, REQ-2.1 to REQ-3.6_
  
  - [x] 1.3 Register admin routes in server
    - Open `backend/server.js`
    - Import admin routes: `import adminRoutes from './routes/admin.js'`
    - Register routes: `app.use('${API_PREFIX}/admin', adminRoutes)`
    - Verify routes are accessible at `/api/v1/admin/*`
    - _Requirements: NFR-1_

**Dependencies:** None

---

- [x] 2. Backend API - System Statistics Endpoint
  - [x] 2.1 Implement GET /api/v1/admin/stats endpoint
    - Open `backend/routes/admin.js`
    - Add `GET /stats` route with requireAdmin middleware
    - Query `users` collection where `role === 'student'`, count by status (active/pending/inactive)
    - Query `users` collection where `role === 'instructor'`, count by status (active/inactive)
    - Query `training_modules` collection for total count
    - Query `quizzes` collection for total count
    - Query `mission_attempts` collection ordered by completedAt desc, limit 20 for recent activity
    - Return JSON with structure: `{ students: { total, active, pending, inactive }, instructors: { total, active, inactive }, missions: { total }, quizzes: { total }, recentActivity: [] }`
    - _Requirements: REQ-2.1, REQ-2.2, REQ-2.3, REQ-2.4, REQ-2.5, REQ-2.6_
  
  - [x] 2.2 Add response caching for stats endpoint
    - Implement simple in-memory cache with 5-minute TTL
    - Check cache before querying database
    - Store result in cache after successful query
    - Return cached data if available and not expired
    - _Requirements: NFR-2 (Performance)_

**Dependencies:** Task 1

---

- [x] 3. Backend API - Instructor Management Endpoints
  - [x] 3.1 Implement GET /api/v1/admin/instructors
    - Add `GET /instructors` route in `backend/routes/admin.js`
    - Apply requireAdmin middleware
    - Query `users` collection where `role === 'instructor'`
    - For each instructor, count students where `instructorId === instructor.id`
    - Return array of instructors with studentCount field
    - _Requirements: REQ-1.1, REQ-1.5_
  
  - [x] 3.2 Implement POST /api/v1/admin/instructors
    - Add `POST /instructors` route
    - Validate request body: name, email, department, password required
    - Validate email format (prefer @dnsc.edu.ph domain)
    - Hash password with bcrypt (10 salt rounds)
    - Create document in `users` collection with `role: 'instructor'`, `status: 'active'`
    - Return created instructor (exclude password)
    - _Requirements: REQ-1.2_
  
  - [x] 3.3 Implement PUT /api/v1/admin/instructors/:id
    - Add `PUT /instructors/:id` route
    - Validate instructor exists
    - Update name, email, department fields only
    - Validate email format if email is being updated
    - Return updated instructor
    - _Requirements: REQ-1.3_
  
  - [x] 3.4 Implement PATCH /api/v1/admin/instructors/:id/status
    - Add `PATCH /instructors/:id/status` route
    - Accept `status` in request body ('active' or 'inactive')
    - Update instructor status field
    - Return success message
    - _Requirements: REQ-1.4_
  
  - [x] 3.5 Implement DELETE /api/v1/admin/instructors/:id
    - Add `DELETE /instructors/:id` route
    - Check if instructor has assigned students (query `users` where `instructorId === id`)
    - If students exist and no `force` parameter, return 400 with warning
    - If `force=true` or no students, delete instructor document
    - Log deletion in audit log (admin ID, timestamp, deleted instructor ID)
    - Return success message
    - _Requirements: REQ-1.6_

**Dependencies:** Task 1

---

- [x] 4. Backend API - Global Student Management Endpoints
  - [x] 4.1 Implement GET /api/v1/admin/students with filters
    - Add `GET /students` route in `backend/routes/admin.js`
    - Accept query parameters: status, instructorId, search, limit, offset
    - Query `users` collection where `role === 'student'`
    - Apply filters: status filter, instructorId filter, search (name or email contains)
    - Implement pagination with limit and offset
    - Join with instructors to include instructorName
    - Return students array with count
    - _Requirements: REQ-3.1, REQ-3.2, REQ-3.3_
  
  - [x] 4.2 Implement PUT /api/v1/admin/students/:id/transfer
    - Add `PUT /students/:id/transfer` route
    - Accept `newInstructorId` in request body
    - Validate new instructor exists and is active
    - Update student's `instructorId` field
    - Log transfer in audit log (admin ID, student ID, old instructor, new instructor, timestamp)
    - Return success message with updated student
    - _Requirements: REQ-3.4_
  
  - [x] 4.3 Implement PATCH /api/v1/admin/students/bulk-status
    - Add `PATCH /students/bulk-status` route
    - Accept `studentIds` array and `status` in request body
    - Validate all student IDs exist
    - Update status for all students in array
    - Log bulk operation in audit log
    - Return success message with count of updated students
    - _Requirements: REQ-3.6_

**Dependencies:** Task 1

---

- [x] 5. Frontend - Admin Dashboard Component Structure
  - [x] 5.1 Create AdminDashboard.vue main container
    - Create `src/components/admin/AdminDashboard.vue` file
    - Add template with header "HelmQuest Admin Portal"
    - Add tab navigation: Dashboard, Instructors, Students
    - Add router-view or component switching logic for tabs
    - Use ref for activeTab state
    - _Requirements: All REQ sections_
  
  - [x] 5.2 Create child component files
    - Create `src/components/admin/SystemOverview.vue` (empty for now)
    - Create `src/components/admin/InstructorManagement.vue` (empty for now)
    - Create `src/components/admin/GlobalStudentView.vue` (empty for now)
    - Import all three components in AdminDashboard.vue
    - _Requirements: REQ-1, REQ-2, REQ-3_
  
  - [x] 5.3 Add Vue Router configuration
    - Open `src/router/index.js` (or create if doesn't exist)
    - Add route: `{ path: '/admin', component: AdminDashboard, meta: { requiresRole: 'admin' } }`
    - Add beforeEach guard to check user role
    - If role !== 'admin', redirect to /unauthorized
    - _Requirements: NFR-1 (Security)_

**Dependencies:** None

---

- [x] 6. Frontend - System Overview Dashboard UI
  - [x] 6.1 Build statistics cards
    - Open `src/components/admin/SystemOverview.vue`
    - Add onMounted hook to fetch stats from `GET /api/v1/admin/stats`
    - Create reactive state for stats data
    - Create stat card for Students with breakdown (active 🟢, pending 🟡, inactive ⚫)
    - Create stat card for Instructors with breakdown
    - Create stat card for Missions count
    - Create stat card for Quizzes count
    - Style cards with grid layout, icons, and color coding
    - _Requirements: REQ-2.1, REQ-2.2, REQ-2.3, REQ-2.4, REQ-2.6_
  
  - [x] 6.2 Build recent activity feed
    - Display recentActivity array from stats API
    - Show activity type, message, and timestamp
    - Format timestamps as "X mins ago" or "X hours ago"
    - Limit to 10-20 most recent items
    - Add auto-refresh every 30 seconds using setInterval
    - Clear interval on component unmount
    - _Requirements: REQ-2.5_
  
  - [x] 6.3 Add loading and error states
    - Add loading spinner during initial data fetch
    - Add error message display if API fails
    - Add retry button on error
    - _Requirements: NFR-3 (Usability)_

**Dependencies:** Task 2, Task 5

---

- [x] 7. Frontend - Instructor Management UI
  - [x] 7.1 Build instructor table
    - Open `src/components/admin/InstructorManagement.vue`
    - Add onMounted hook to fetch instructors from `GET /api/v1/admin/instructors`
    - Create table with columns: Name, Email, Department, Status, Student Count, Actions
    - Display status with color coding (green for active, gray for inactive)
    - Make student count clickable (emits event to switch to students tab with filter)
    - _Requirements: REQ-1.1, REQ-1.5_
  
  - [x] 7.2 Add search functionality
    - Add search input field above table
    - Filter instructors client-side by name or email as user types
    - Use computed property for filtered instructors list
    - _Requirements: REQ-1.1_
  
  - [x] 7.3 Create Add Instructor modal
    - Add "Add Instructor" button above table
    - Create modal dialog with form fields: name, email, department, password
    - Add form validation (all fields required, email format)
    - On submit, call `POST /api/v1/admin/instructors`
    - On success, close modal, refresh instructor list, show toast notification
    - On error, display error message in modal
    - _Requirements: REQ-1.2_
  
  - [x] 7.4 Create Edit Instructor modal
    - Add edit button (✏️) in Actions column
    - Create modal with pre-filled form (name, email, department)
    - Do not allow editing instructor ID or password
    - On submit, call `PUT /api/v1/admin/instructors/:id`
    - On success, update local data, show toast notification
    - _Requirements: REQ-1.3_
  
  - [x] 7.5 Add status toggle functionality
    - Add toggle switch or button in Actions column
    - On click, call `PATCH /api/v1/admin/instructors/:id/status`
    - Toggle between 'active' and 'inactive'
    - Update UI immediately with new status
    - Show toast notification
    - _Requirements: REQ-1.4_
  
  - [x] 7.6 Add delete functionality with confirmation
    - Add delete button (❌) in Actions column
    - On click, show confirmation dialog
    - If instructor has students, show warning message
    - Add "Force Delete" checkbox in confirmation
    - On confirm, call `DELETE /api/v1/admin/instructors/:id` with force parameter if checked
    - On success, remove from list, show toast notification
    - _Requirements: REQ-1.6_

**Dependencies:** Task 3, Task 5

---

- [ ] 8. Frontend - Global Student View UI
  - [x] 8.1 Build student table with all students
    - Open `src/components/admin/GlobalStudentView.vue`
    - Add onMounted hook to fetch students from `GET /api/v1/admin/students`
    - Create table with columns: Checkbox, Name, Email, Instructor, Status, XP, Rank, Actions
    - Display instructor name from joined data
    - Show "Unassigned" if no instructor
    - _Requirements: REQ-3.1, REQ-3.3_
  
  - [ ] 8.2 Add search and filter controls
    - Add search input (filters by name or email)
    - Add status dropdown filter (All, Active, Pending, Inactive)
    - Add instructor dropdown filter (All, then list of instructors)
    - Add "Clear Filters" button
    - Apply filters and re-fetch from API with query parameters
    - _Requirements: REQ-3.2_
  
  - [ ] 8.3 Add pagination controls
    - Display "Previous" and "Next" buttons
    - Show current page and total pages
    - Fetch data with limit=25 and offset calculated from page
    - Disable Previous on page 1, disable Next on last page
    - _Requirements: NFR-2 (Performance), REQ-3.1_
  
  - [ ] 8.4 Add checkbox selection for bulk operations
    - Add checkbox in first column for each student
    - Add "Select All" checkbox in header (selects all visible students)
    - Track selected student IDs in reactive state
    - Show count of selected students
    - _Requirements: REQ-3.6_
  
  - [ ] 8.5 Create Transfer Student modal
    - Add transfer button (↔️) in Actions column
    - Create modal with dropdown of active instructors
    - On submit, call `PUT /api/v1/admin/students/:id/transfer`
    - On success, update instructor name in table, show toast notification
    - _Requirements: REQ-3.4_
  
  - [ ] 8.6 Add View Details functionality
    - Add "View" button in Actions column
    - Create detail modal or navigate to detail page
    - Display: XP, rank, completed missions, quiz scores, badges, certificates
    - Fetch additional data if needed from student detail endpoint
    - _Requirements: REQ-3.5_
  
  - [ ] 8.7 Implement bulk operations
    - Add "Bulk Actions" dropdown above table
    - Options: Activate Selected, Deactivate Selected
    - Show confirmation dialog with count of selected students
    - On confirm, call `PATCH /api/v1/admin/students/bulk-status` with studentIds array
    - On success, update UI, clear selection, show toast notification
    - _Requirements: REQ-3.6_

**Dependencies:** Task 4, Task 5

---

- [ ] 9. Frontend - Reusable UI Components
  - [ ] 9.1 Create ConfirmDialog component
    - Create `src/components/admin/components/ConfirmDialog.vue`
    - Accept props: title, message, confirmText, cancelText
    - Emit 'confirm' and 'cancel' events
    - Add keyboard support (Enter to confirm, Esc to cancel)
    - Style consistently with HelmQuest design
    - _Requirements: NFR-3, NFR-5_
  
  - [ ] 9.2 Create StatCard component
    - Create `src/components/admin/components/StatCard.vue`
    - Accept props: title, value, icon, breakdown (array of { label, value, color })
    - Display card with icon, main value, and breakdown list
    - Responsive grid layout
    - _Requirements: REQ-2.6_
  
  - [ ] 9.3 Create ToastNotification system
    - Create `src/components/admin/components/ToastNotification.vue`
    - Accept props: message, type (success, error, info, warning)
    - Auto-dismiss after 3 seconds
    - Allow manual dismissal
    - Use composable or global state for toast queue
    - _Requirements: NFR-3 (Usability)_

**Dependencies:** Task 5

---

- [ ] 10. Frontend - Admin Authentication and Access Control
  - [ ] 10.1 Create or extend admin login
    - Check if login page exists in App.vue or separate component
    - Add admin login option or extend existing login
    - On login, call backend to verify credentials
    - Store user role in localStorage or Vuex/Pinia state
    - If role === 'admin', allow access to /admin routes
    - _Requirements: NFR-1 (Security)_
  
  - [ ] 10.2 Add admin navigation link
    - In main app navigation (if logged in as admin), show "Admin Panel" link
    - Link should navigate to /admin
    - Hide link if user role !== 'admin'
    - _Requirements: NFR-1_
  
  - [ ] 10.3 Create Unauthorized page
    - Create `src/components/Unauthorized.vue`
    - Display message: "You do not have permission to access this page"
    - Add "Go Back" button
    - _Requirements: NFR-1_

**Dependencies:** Task 5

---

- [ ] 11. Backend - Audit Logging System
  - [ ] 11.1 Create audit log collection and helper
    - Create `backend/utils/auditLog.js` helper file
    - Export function `logAuditEvent(adminId, action, entityType, entityId, metadata)`
    - Function adds document to `admin_audit_log` Firestore collection
    - Include: timestamp, adminId, action, entityType, entityId, metadata (before/after values)
    - _Requirements: NFR-1 (Security)_
  
  - [ ] 11.2 Add audit logging to instructor endpoints
    - In admin.js routes, import auditLog helper
    - Log instructor create, update, delete, status change operations
    - Include relevant metadata (old vs new values)
    - _Requirements: NFR-1_
  
  - [ ] 11.3 Add audit logging to student transfer and bulk operations
    - Log student transfer with old and new instructorId
    - Log bulk status changes with array of affected student IDs
    - _Requirements: NFR-1_
  
  - [ ] 11.4 Create audit log viewing endpoint
    - Add `GET /api/v1/admin/audit-logs` route
    - Accept query parameters: startDate, endDate, action, limit, offset
    - Return paginated audit log entries
    - Admin-only access
    - _Requirements: NFR-1_

**Dependencies:** Task 1, Task 3, Task 4

---

- [ ] 12. Testing - End-to-End Manual Testing
  - [ ] 12.1 Test admin login and access control
    - Try to access /admin without logging in → should redirect or show unauthorized
    - Log in as non-admin user, try to access /admin → should show unauthorized
    - Log in as admin user, access /admin → should load dashboard
    - _Requirements: NFR-1_
  
  - [ ] 12.2 Test System Overview Dashboard
    - Verify all stat cards display correct counts
    - Check color coding (green, yellow, gray)
    - Verify recent activity feed shows entries
    - Wait 30 seconds, verify auto-refresh works
    - _Requirements: REQ-2.1 to REQ-2.6_
  
  - [ ] 12.3 Test Instructor Management
    - Add new instructor → verify appears in list with correct data
    - Edit instructor → verify updates reflect immediately
    - Toggle status active/inactive → verify UI and database update
    - Delete instructor without students → verify deletion
    - Try to delete instructor with students → verify warning appears
    - Search instructors by name → verify filtering works
    - Click student count → verify navigates to filtered student view
    - _Requirements: REQ-1.1 to REQ-1.6_
  
  - [ ] 12.4 Test Global Student View
    - Verify table shows all students across all instructors
    - Search by name → verify filtering works
    - Filter by status → verify only matching students show
    - Filter by instructor → verify only their students show
    - Combine filters → verify all filters apply
    - Clear filters → verify all students show again
    - Test pagination → verify Previous/Next buttons work
    - _Requirements: REQ-3.1, REQ-3.2_
  
  - [ ] 12.5 Test Student Transfer
    - Click transfer button on a student
    - Select new instructor from dropdown
    - Confirm transfer
    - Verify student's instructor name updates in table
    - Verify in Firestore that instructorId changed
    - Verify transfer is logged in audit_log collection
    - _Requirements: REQ-3.4_
  
  - [ ] 12.6 Test Bulk Operations
    - Select 3 students using checkboxes
    - Select "Deactivate Selected" from bulk actions
    - Confirm operation
    - Verify all 3 students status changed to inactive
    - Verify bulk operation logged in audit_log
    - Select same 3 students, activate them
    - Verify status changed back to active
    - _Requirements: REQ-3.6_
  
  - [ ] 12.7 Test error handling and edge cases
    - Try to create instructor with invalid email → should show error
    - Try to transfer student to non-existent instructor → should show error
    - Simulate network error → should show retry option
    - Test with empty data (no instructors, no students) → should not crash
    - _Requirements: NFR-3, NFR-4_

**Dependencies:** All previous tasks

---

## Notes

- Current system uses separate `instructor` and `students` collections, not unified `users` collection
- Backend routes should query the correct collections based on actual database structure
- Admin middleware should check against whatever collection stores admin user data
- Audit logging is important for security compliance
- All forms need proper validation both frontend and backend
- Toast notifications improve user experience for all operations

## Success Criteria

✅ Admin can log in and access admin panel
✅ System Overview Dashboard displays accurate real-time statistics
✅ Admin can perform full CRUD operations on instructors
✅ Admin can view all students across all instructors
✅ Admin can transfer students between instructors
✅ Admin can perform bulk status updates on students
✅ All admin operations are logged for audit trail
✅ UI is consistent with HelmQuest design system
✅ Performance meets requirements (< 1s for dashboard, pagination works smoothly)

