# Requirements: Student Enrollment System with Firestore

## Problem Statement

Currently, students can sign up but their accounts are not properly validated or stored in Firestore. We need to implement a complete enrollment workflow where:
1. Students self-signup and are stored in Firestore `students` collection with `status: "pending"`
2. Instructors approve/reject pending students
3. Only approved students (status: "active") can access missions
4. Authentication checks Firestore instead of localStorage

## Database Collections

### `students` Collection Structure
```json
{
  "id": "student-001",
  "studentId": "STU-2026-001",
  "name": "Alex Rivera",
  "email": "alex.rivera@student.com",
  "password": "hashed_password",
  "status": "pending",
  "xp": 0,
  "rank": "Deck Hand",
  "completed": 0,
  "averageScore": 0,
  "bestScore": 0,
  "badgesEarned": 0,
  "badgesTotal": 0,
  "certificates": 0,
  "xpProgress": 0,
  "xpNextAt": 200,
  "boatUsed": "Commercial Trawler",
  "approvedBy": null,
  "approvedAt": null,
  "createdAt": "2026-01-15T10:30:00Z"
}
```

### `instructors` Collection Structure
```json
{
  "id": "instructor-001",
  "email": "helen@instructor.com",
  "password": "hashed_password",
  "name": "Helen Smith",
  "department": "Maritime Training",
  "status": "active",
  "createdAt": "2026-01-01T08:00:00Z"
}
```

## Requirements

### Requirement 1: Student Self-Signup with Firestore

**User Story:** As a student, I want to create an account that is saved to Firestore with pending status.

**Acceptance Criteria:**
1. WHEN a student submits the signup form, the system SHALL validate required fields (studentId, name, email, password)
2. The system SHALL hash the password before storing
3. The system SHALL save the student to Firestore `students` collection with `status: "pending"`
4. The system SHALL set default values: xp=0, rank="Deck Hand", badges=0, certificates=0
5. The system SHALL display message: "Account created! Wait for instructor approval."
6. The student SHALL NOT be able to access missions until approved

### Requirement 2: Student Login with Status Check

**User Story:** As a student, when I log in, the system should check my approval status from Firestore.

**Acceptance Criteria:**
1. WHEN a student enters email + password, the system SHALL query Firestore `students` collection
2. The system SHALL verify the password hash matches
3. IF status === "pending", the system SHALL display: "Your account is pending instructor approval" and block access to missions
4. IF status === "active", the system SHALL allow full access to student console and missions
5. IF status === "inactive" or "rejected", the system SHALL display: "Account disabled. Contact your instructor."

### Requirement 3: Instructor Approval Workflow

**User Story:** As an instructor, I want to see pending student signups and approve/reject them.

**Acceptance Criteria:**
1. The instructor console SHALL display a "Pending Approvals" section
2. The system SHALL fetch students with `status: "pending"` from Firestore
3. Each pending student SHALL show: name, studentId, email, signup date
4. The instructor SHALL have "Approve" and "Reject" buttons for each student
5. WHEN instructor clicks "Approve":
   - Update Firestore: set `status: "active"`, `approvedBy: instructorId`, `approvedAt: timestamp`
   - Display success message
   - Remove from pending list
6. WHEN instructor clicks "Reject":
   - Update Firestore: set `status: "rejected"` OR delete the document
   - Display confirmation message
   - Remove from pending list
7. The instructor SHALL be able to change active student status to "inactive" via dropdown
   - Dropdown shows ACTIVE (green) and INACTIVE (red) options
   - Changing to INACTIVE disables student login access
8. The "Total Students" count SHALL show only students with `status: "active"`

### Requirement 4: Instructor Login with Firestore

**User Story:** As an instructor, I want to log in using credentials stored in Firestore `instructors` collection.

**Acceptance Criteria:**
1. WHEN an instructor enters email + password, the system SHALL query Firestore `instructors` collection
2. The system SHALL verify the password hash matches
3. IF found and status === "active", the system SHALL log in the instructor to instructor console
4. IF not found in `instructors`, the system SHALL check `students` collection (to prevent wrong role access)

### Requirement 5: Mission Access Control

**User Story:** As a student with pending status, I should see a message instead of missions.

**Acceptance Criteria:**
1. WHEN a student with `status: "pending"` logs in and accesses student console, missions SHALL be hidden
2. The system SHALL display a message: "⏳ Your enrollment is pending instructor approval. You'll receive access once approved."
3. WHEN a student with `status: "active"` accesses student console, all missions SHALL be visible and accessible
4. The system SHALL check status from Firestore on each login

### Requirement 6: Inactive Student Login Block

**User Story:** As an instructor, when I set a student status to "inactive", that student should not be able to log in.

**Acceptance Criteria:**
1. WHEN a student with `status: "inactive"` tries to log in, the system SHALL block login
2. The system SHALL display: "Your account has been disabled. Contact your instructor."
3. Inactive students SHALL be treated the same as pending students (no access)
4. WHEN instructor changes status back to "active", the student SHALL be able to log in again

## API Endpoints Needed

### Student Routes (backend/routes/students.js)
- `POST /api/v1/students/signup` - Create student with status="pending"
- `POST /api/v1/students/login` - Authenticate student
- `GET /api/v1/students/pending` - Get all pending students (for instructor)
- `PUT /api/v1/students/:id/approve` - Approve student (set status="active")
- `PUT /api/v1/students/:id/reject` - Reject student (set status="rejected")

### Instructor Routes (backend/routes/instructors.js)
- `POST /api/v1/instructors/login` - Authenticate instructor

## Success Criteria

- ✅ Students can self-signup and data saves to Firestore `students` collection with status="pending"
- ✅ Students with pending status cannot access missions
- ✅ Instructors can see pending signups and approve/reject them
- ✅ Approved students (status="active") can access missions
- ✅ Login authentication checks Firestore instead of localStorage
- ✅ Password hashing is implemented for security
