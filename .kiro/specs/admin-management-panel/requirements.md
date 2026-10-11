# Requirements: Admin Management Panel

## Overview
The Admin Management Panel enables system administrators to manage instructors, monitor platform-wide statistics, and oversee all students across the HelmQuest platform through a centralized web interface.

## Priority 1: Instructor Management 👨‍🏫

### REQ-1.1: View All Instructors
**Must Have**
- Display a searchable list of all instructors
- Show instructor name, email, department, and status (active/inactive)
- Display student count for each instructor
- Support real-time search/filter by name or email
- Show creation date for each instructor

**Acceptance Criteria:**
- Admin can see all instructors in a table format
- Search filters results as admin types
- Student count is accurate and dynamically calculated
- Table shows active/inactive status clearly

### REQ-1.2: Add New Instructor Account
**Must Have**
- Provide a form to create new instructor accounts
- Require: name, email, department, initial password
- Validate email format (@dnsc.edu.ph domain preferred)
- Hash password before storing
- Set default status as "active"
- Auto-generate instructor ID

**Acceptance Criteria:**
- Form validates all required fields
- Email validation prevents invalid addresses
- Password is hashed using bcrypt (10 salt rounds)
- New instructor appears immediately in the list
- Success message confirms creation

### REQ-1.3: Edit Instructor Details
**Must Have**
- Allow editing of instructor name, email, and department
- Prevent editing of instructor ID
- Validate updated email format
- Show current values in edit form
- Confirm before saving changes

**Acceptance Criteria:**
- Edit form pre-populates with current values
- Changes are validated before submission
- Updated instructor data reflects immediately
- Email uniqueness is maintained

### REQ-1.4: Activate/Deactivate Instructor Accounts
**Must Have**
- Provide toggle to activate or deactivate instructor accounts
- Inactive instructors cannot log in
- Inactive instructors' students remain assigned but see warning
- Show status visually (green for active, gray for inactive)

**Acceptance Criteria:**
- Status toggle works immediately
- Inactive instructors cannot access the system
- Status change is logged with timestamp
- Students of inactive instructors can still access their accounts

### REQ-1.5: View Each Instructor's Student Count
**Must Have**
- Display real-time count of students assigned to each instructor
- Count should include only active and pending students
- Make student count clickable to view student list

**Acceptance Criteria:**
- Count updates when students are transferred
- Clicking count navigates to filtered student view
- Count excludes deleted/rejected students

### REQ-1.6: Delete Instructor
**Must Have**
- Provide delete button for each instructor
- Show confirmation dialog before deletion
- Warn if instructor has assigned students
- Require reassignment or confirmation to proceed
- Log deletion with admin user and timestamp

**Acceptance Criteria:**
- Confirmation dialog prevents accidental deletion
- Cannot delete instructor with assigned students without explicit confirmation
- Deletion removes instructor from database
- Audit log records who deleted and when

---

## Priority 2: System Overview Dashboard 📊

### REQ-2.1: Total Students Display
**Must Have**
- Show total count of all students
- Break down by status: active, pending, inactive
- Display as visual cards with icons
- Update in real-time when student status changes

**Acceptance Criteria:**
- Total student count is accurate
- Status breakdown adds up to total
- Cards use clear color coding (green=active, yellow=pending, gray=inactive)

### REQ-2.2: Total Instructors Display
**Must Have**
- Show total count of all instructors
- Break down by status: active, inactive
- Display as visual card with icon

**Acceptance Criteria:**
- Total instructor count is accurate
- Status breakdown adds up to total
- Card uses clear color coding

### REQ-2.3: Total Missions Created
**Must Have**
- Display total count of training missions in the system
- Include missions created by all instructors and admins

**Acceptance Criteria:**
- Count includes all missions in `training_modules` collection
- Updates when new missions are created

### REQ-2.4: Total Quizzes Created
**Must Have**
- Display total count of quizzes in the system
- Include quizzes created by all instructors

**Acceptance Criteria:**
- Count includes all quizzes in `quizzes` collection
- Updates when new quizzes are created

### REQ-2.5: Recent Activity Feed
**Must Have**
- Display chronological list of recent platform activities
- Include: student enrollments, mission completions, instructor additions
- Show timestamp for each activity (e.g., "2 mins ago", "1 hour ago")
- Limit to most recent 10-20 activities
- Auto-refresh every 30 seconds

**Acceptance Criteria:**
- Activity feed shows latest events first
- Timestamps are human-readable
- Feed updates automatically
- Activities link to relevant details when clicked

### REQ-2.6: Quick Stats Cards
**Must Have**
- Display all statistics in visually distinct cards
- Use icons for each stat type
- Use color coding for status breakdowns
- Cards should be responsive and grid-based

**Acceptance Criteria:**
- Cards are visually consistent
- Layout adapts to screen size
- Icons enhance readability
- Cards update without page refresh

---

## Priority 3: Global Student View 👥

### REQ-3.1: View All Students
**Must Have**
- Display a list of ALL students across all instructors
- Show: student name, email, status, assigned instructor, XP, rank
- Support pagination for large lists
- Load student data efficiently

**Acceptance Criteria:**
- Table displays all students regardless of instructor
- Student data includes current progress metrics
- Pagination works smoothly
- Performance remains good with 100+ students

### REQ-3.2: Search/Filter Students
**Must Have**
- Search by student name or email (real-time)
- Filter by status (active, pending, inactive)
- Filter by assigned instructor
- Combine multiple filters
- Clear all filters button

**Acceptance Criteria:**
- Search returns results instantly
- Filters can be applied simultaneously
- "Clear filters" resets all filters
- URL preserves filter state for bookmarking

### REQ-3.3: See Assigned Instructor
**Must Have**
- Display instructor name for each student
- Handle students with no assigned instructor (show "Unassigned")
- Make instructor name clickable to filter by that instructor

**Acceptance Criteria:**
- Instructor name is clearly visible
- Unassigned students are identifiable
- Clicking instructor name filters to show their students

### REQ-3.4: Transfer Student to Different Instructor
**Must Have**
- Provide "Transfer" button/icon for each student
- Show modal with dropdown of all active instructors
- Confirm before transferring
- Update student's `instructorId` field
- Log transfer with timestamp and admin user

**Acceptance Criteria:**
- Transfer modal lists only active instructors
- Confirmation prevents accidental transfers
- Transfer updates immediately in UI
- Student sees new instructor on next login
- Transfer is logged for audit

### REQ-3.5: View Student Progress/Scores
**Must Have**
- Show XP, rank, and completion stats in table
- Provide "View Details" button for detailed progress
- Details include: completed missions, quiz scores, badges
- Display average score and best score

**Acceptance Criteria:**
- Progress metrics are accurate
- Detail view loads student-specific data
- Metrics match student's own dashboard view

### REQ-3.6: Bulk Actions
**Must Have**
- Checkbox selection for multiple students
- "Select All" checkbox
- Bulk activate selected students
- Bulk deactivate selected students
- Confirmation dialog for bulk operations
- Show count of selected students

**Acceptance Criteria:**
- Checkboxes work correctly for multi-select
- Select all includes only visible/filtered students
- Bulk operations update all selected students
- Confirmation shows number of affected students
- Success message confirms operation

---

## Non-Functional Requirements

### NFR-1: Security
- All admin endpoints require authentication
- Only users with `role: 'admin'` can access admin panel
- API endpoints validate admin role on server side
- Passwords must be hashed with bcrypt before storage
- Audit log records all admin actions (create, update, delete, transfer)

### NFR-2: Performance
- Dashboard stats should load within 1 second
- Student/instructor lists should support pagination (25-50 per page)
- Search results should appear within 300ms (debounced)
- Bulk operations should provide progress feedback for >10 students

### NFR-3: Usability
- UI should match existing HelmQuest design system
- All actions should provide clear success/error feedback
- Confirmation dialogs required for destructive actions
- Forms should show validation errors inline
- Loading states should be visible during API calls

### NFR-4: Data Integrity
- Cannot delete instructor with assigned students without confirmation
- Student transfers must maintain data consistency
- All database operations must be atomic
- Failed operations must not leave partial data

### NFR-5: Accessibility
- All interactive elements must be keyboard accessible
- Use semantic HTML elements
- Provide ARIA labels for screen readers
- Color coding must not be the only indicator of status

---

## Out of Scope

The following are explicitly NOT included in this spec:
- Admin user management (creating/editing other admins)
- Detailed analytics and reporting dashboards
- Email notifications for admin actions
- Mission/quiz content editing from admin panel
- Student performance detailed analytics
- Export data to CSV/PDF
- Multi-language support
- Mobile app version

---

## Acceptance Criteria Summary

✅ Admin can view, add, edit, activate/deactivate, and delete instructors
✅ Admin can see system-wide statistics on the dashboard
✅ Admin can view all students across all instructors
✅ Admin can search/filter students by multiple criteria
✅ Admin can transfer students between instructors
✅ Admin can perform bulk status updates on students
✅ All actions require admin role authentication
✅ All destructive actions require confirmation
✅ UI is consistent with existing HelmQuest design
✅ Performance meets specified benchmarks
