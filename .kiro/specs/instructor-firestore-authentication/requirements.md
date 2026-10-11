# Instructor Firestore Authentication - Requirements

## Functional Requirements

### FR-1: Instructor Authentication Endpoint
**Priority:** HIGH  
**Description:** Backend API endpoint for authenticating instructors against Firestore

**Acceptance Criteria:**
- Endpoint accepts email and password
- Queries Firestore `instructor` collection by email
- Compares password using bcrypt
- Returns instructor data on success
- Returns appropriate error on failure
- Validates instructor status (active/inactive)

### FR-2: Frontend Authentication Integration
**Priority:** HIGH  
**Description:** Update frontend login to support Firestore instructor authentication

**Acceptance Criteria:**
- Detects instructor email patterns
- Calls backend API for Firestore authentication
- Falls back to demo accounts for backward compatibility
- Handles authentication errors gracefully
- Displays clear error messages

### FR-3: Backward Compatibility
**Priority:** HIGH  
**Description:** Maintain existing authentication for demo accounts

**Acceptance Criteria:**
- Demo instructor accounts still work (e.g., `instructor@helmquest.local`)
- Demo student accounts still work
- Admin account still works
- No breaking changes to existing login flow

### FR-4: Status Validation
**Priority:** MEDIUM  
**Description:** Prevent inactive instructors from logging in

**Acceptance Criteria:**
- Active instructors can login
- Inactive instructors receive "Account disabled" error
- Status check happens before authentication succeeds

### FR-5: Error Handling
**Priority:** MEDIUM  
**Description:** Provide clear error messages for authentication failures

**Acceptance Criteria:**
- Invalid email: "Invalid email or password"
- Invalid password: "Invalid email or password"
- Inactive account: "Account disabled. Contact system admin."
- Server error: "Login failed. Please try again."

## Non-Functional Requirements

### NFR-1: Performance
**Priority:** MEDIUM  
**Description:** Authentication should complete quickly

**Acceptance Criteria:**
- API response time < 2 seconds
- No noticeable delay in login process
- Efficient Firestore query (indexed by email)

### NFR-2: Security
**Priority:** HIGH  
**Description:** Maintain secure authentication practices

**Acceptance Criteria:**
- Passwords stored as bcrypt hashes
- No passwords in client logs
- HTTPS for API communication (production)
- No sensitive data in error messages

### NFR-3: Maintainability
**Priority:** MEDIUM  
**Description:** Code should follow existing patterns

**Acceptance Criteria:**
- Follows same pattern as student authentication
- Uses existing firebaseApi interface
- Clear code comments
- Consistent error handling

### NFR-4: Reliability
**Priority:** HIGH  
**Description:** Authentication should be reliable

**Acceptance Criteria:**
- Handles network errors gracefully
- Handles Firestore unavailability
- Provides fallback to demo accounts
- No crashes on invalid input

## Technical Requirements

### TR-1: Backend API Specification
**Endpoint:** `POST /api/v1/auth/instructor-login`

**Request Body:**
```json
{
  "email": "string (required)",
  "password": "string (required)"
}
```

**Response (200):**
```json
{
  "success": true,
  "instructor": {
    "id": "string",
    "instructorId": "string",
    "name": "string",
    "email": "string",
    "role": "instructor",
    "status": "active",
    "StudentCount": "number",
    "totalsessions": "number"
  }
}
```

**Errors:**
- 400: Missing required fields
- 401: Invalid credentials
- 403: Account inactive
- 404: Email not found
- 500: Server error

### TR-2: Frontend API Integration
**Method:** `window.firebaseApi.loginInstructor(email, password)`

**Returns:** Promise resolving to instructor data

**Error Handling:** Rejects with error object

### TR-3: Email Pattern Detection
**Student Emails:** `@dnsc.edu.ph`  
**Instructor Emails:** `@helmquest.edu.ph` or `@helmquest.local`  
**Demo Accounts:** Checked first via `DEMO_USERS`

### TR-4: Database Query
**Collection:** `instructor`  
**Query:** `where('email', '==', emailInput)`  
**Limit:** 1 document  
**Index:** Email field should be indexed

## User Stories

### US-1: Admin Creates Instructor
**As an** admin  
**I want to** create a new instructor account  
**So that** the instructor can login immediately

**Acceptance Criteria:**
- Admin fills out instructor form
- System creates instructor in Firestore
- Instructor receives email with credentials
- Instructor can login using those credentials

### US-2: Instructor Login
**As an** instructor created via admin panel  
**I want to** login with my email and password  
**So that** I can access the instructor dashboard

**Acceptance Criteria:**
- Instructor enters email and password
- System validates against Firestore
- Login succeeds if credentials valid and status active
- Dashboard loads with instructor data

### US-3: Demo Instructor Login
**As a** demo user  
**I want to** login with demo instructor credentials  
**So that** I can test the system without database setup

**Acceptance Criteria:**
- Demo credentials still work
- No change to existing demo login behavior
- Demo accounts bypass Firestore check

### US-4: Inactive Instructor Prevention
**As an** admin  
**I want** inactive instructors to be blocked from login  
**So that** I can control system access

**Acceptance Criteria:**
- Admin deactivates instructor
- Instructor cannot login
- Clear error message shown
- Reactivation allows login again

## Dependencies

### Internal Dependencies
- `backend/routes/admin.js` - Instructor CRUD operations
- `backend/config/firebase-admin.js` - Firestore connection
- `src/helpers/progressStore.js` - Demo user authentication
- `src/App.vue` - Login form and authentication

### External Dependencies
- Firebase Admin SDK - Firestore queries
- bcrypt - Password comparison
- Express.js - API routing

## Constraints

1. Must maintain backward compatibility with demo accounts
2. Cannot modify Firebase Authentication structure (not used for instructors)
3. Must follow existing authentication patterns
4. Cannot change Firestore collection structure
5. Must work with existing frontend firebaseApi interface

## Out of Scope

- Email verification system
- Password reset functionality
- Two-factor authentication
- Session token management (JWT)
- Rate limiting (future enhancement)
- Account lockout after failed attempts
- Password strength requirements (enforced at creation)
- Audit logging of login attempts

## Testing Requirements

### Unit Tests
- Backend endpoint with valid credentials
- Backend endpoint with invalid credentials
- Backend endpoint with inactive instructor
- Password comparison logic
- Email pattern detection

### Integration Tests
- End-to-end login flow
- Demo account fallback
- Error state handling
- Frontend-backend communication

### Manual Testing Checklist
- [ ] Admin creates new instructor
- [ ] New instructor logs in successfully
- [ ] Demo instructor logs in successfully
- [ ] Student login still works
- [ ] Admin login still works
- [ ] Inactive instructor blocked
- [ ] Invalid credentials rejected
- [ ] Clear error messages displayed
- [ ] Network errors handled gracefully
