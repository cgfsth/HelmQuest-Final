# Instructor Firestore Authentication - Design

## Overview
Enable instructors created through the admin panel to authenticate using Firestore, similar to how student authentication currently works. This maintains consistency across authentication methods and allows newly created instructors to login immediately.

## Current State Analysis

### Authentication Flow
```
Demo Accounts (hardcoded in progressStore.js)
├── instructor@helmquest.local → works
├── instructor-marcus@helmquest.local → works
└── admin@helmquest.local → works

Firestore Authentication
├── Students (@dnsc.edu.ph) → /api/v1/auth/login-student → works
└── Instructors (created via admin panel) → NO AUTH ENDPOINT → fails ❌
```

### Problem
When admins create instructors via the admin panel:
1. Instructor saved to Firestore `instructor` collection with bcrypt password
2. Login system only checks `DEMO_USERS` hardcoded accounts
3. New instructor cannot login → authentication fails

## Proposed Solution

### Backend API Endpoint
Create `/api/v1/auth/instructor-login` endpoint:

**Request:**
```json
POST /api/v1/auth/instructor-login
{
  "email": "newprof@helmquest.edu.ph",
  "password": "securepass123"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "instructor": {
    "id": "abc123",
    "instructorId": "abc123",
    "name": "Professor Smith",
    "email": "newprof@helmquest.edu.ph",
    "role": "instructor",
    "status": "active",
    "StudentCount": 5,
    "totalsessions": 12
  }
}
```

**Error Responses:**
- `401` - Invalid credentials
- `403` - Instructor inactive
- `404` - Email not found
- `500` - Server error

### Frontend Integration

Update `mockAuthenticate()` in `src/App.vue`:

```javascript
function mockAuthenticate() {
  const email = authForm.value.email.trim().toLowerCase();
  const password = authForm.value.password;

  // 1. Check demo accounts first (backward compatibility)
  let user = authenticateUser(email, password);
  if (user) {
    proceedWithAuthentication(user);
    return;
  }

  // 2. Try Firestore student authentication
  if (email.endsWith('@dnsc.edu.ph') && window.firebaseApi) {
    // ... existing student login code ...
    return;
  }

  // 3. NEW: Try Firestore instructor authentication
  if (email.endsWith('@helmquest.edu.ph') && window.firebaseApi) {
    window.firebaseApi.loginInstructor(email, password)
      .then(response => {
        const instructorData = response.instructor;
        
        // Check instructor status
        if (instructorData.status === 'inactive') {
          authError.value = 'Account disabled. Contact system admin.';
          return;
        }
        
        // Status is 'active' - allow login
        const user = {
          id: instructorData.id,
          name: instructorData.name,
          email: instructorData.email,
          role: 'instructor',
          status: instructorData.status
        };
        
        proceedWithAuthentication(user);
      })
      .catch(error => {
        console.error('Instructor login error:', error);
        authError.value = 'Invalid email or password.';
      });
    return;
  }

  // 4. No authentication method succeeded
  authError.value = 'Invalid email or password.';
}
```

### Email Pattern Detection
- **Students**: `@dnsc.edu.ph` → Firestore authentication
- **Instructors**: `@helmquest.edu.ph` OR `@helmquest.local` → Check demo first, then Firestore
- **Demo accounts**: Any email in `DEMO_USERS` → Hardcoded authentication (backward compatible)

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    Login Form (App.vue)                      │
│                   mockAuthenticate()                         │
└────────────────────────────┬────────────────────────────────┘
                             │
                ┌────────────┴────────────┐
                │                         │
        ┌───────▼───────┐       ┌────────▼──────────┐
        │  Demo Check   │       │  Firestore Check  │
        │ DEMO_USERS    │       │   Backend API     │
        └───────┬───────┘       └────────┬──────────┘
                │                        │
                │                        │
         ┌──────▼──────┐         ┌──────▼───────────────┐
         │ instructor@ │         │ instructor@          │
         │ helmquest   │         │ helmquest.edu.ph     │
         │ .local      │         │ (Firestore query)    │
         └─────────────┘         └──────────────────────┘
```

## Database Schema

**Firestore Collection: `instructor`**
```javascript
{
  instructorid: "abc123",           // Document ID
  name: "Professor Smith",
  email: "prof@helmquest.edu.ph",
  password: "$2b$10$...",            // bcrypt hash
  role: "instructor",
  status: "active",                 // "active" | "inactive"
  StudentCount: 0,
  totalsessions: 0,
  userid: "",                       // Legacy field
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

## Security Considerations

1. **Password Security**: Passwords stored as bcrypt hashes (already implemented in admin panel)
2. **Status Validation**: Inactive instructors cannot login
3. **Email Validation**: Email format validated on registration
4. **Rate Limiting**: Consider adding rate limiting to auth endpoints (future enhancement)
5. **Session Management**: Current user stored in component state (existing pattern)

## Backward Compatibility

✅ **Preserved:**
- Demo instructor accounts (`instructor@helmquest.local`) still work
- Student authentication unchanged
- Admin authentication unchanged
- Existing login UI/UX unchanged

❌ **Breaking Changes:**
- None - this is purely additive functionality

## Testing Scenarios

### Scenario 1: New Instructor Login
1. Admin creates instructor via admin panel
2. Instructor visits login page
3. Enters email/password from admin creation
4. System authenticates against Firestore
5. ✅ Login succeeds

### Scenario 2: Demo Instructor Login
1. User enters `instructor@helmquest.local` / `password`
2. System checks demo accounts first
3. ✅ Login succeeds (existing behavior)

### Scenario 3: Inactive Instructor
1. Instructor created and later deactivated by admin
2. Instructor attempts login
3. ❌ Login fails with "Account disabled" message

### Scenario 4: Invalid Credentials
1. User enters wrong email or password
2. ❌ Login fails with "Invalid email or password"

## Implementation Plan

### Phase 1: Backend API
1. Create `backend/routes/auth.js` (or extend existing)
2. Implement `POST /instructor-login` endpoint
3. Add password comparison with bcrypt
4. Add status validation
5. Return instructor data or error

### Phase 2: Frontend Integration
1. Update `window.firebaseApi` to include `loginInstructor()` method
2. Update `mockAuthenticate()` in App.vue
3. Add instructor email pattern detection
4. Handle error states

### Phase 3: Testing
1. Test demo account login (backward compatibility)
2. Test new instructor login from admin panel
3. Test inactive instructor rejection
4. Test invalid credentials
5. Test error messages

## Success Criteria

✅ Instructor created via admin panel can login using email/password
✅ Demo instructor accounts still work
✅ Inactive instructors cannot login
✅ Clear error messages for authentication failures
✅ No breaking changes to existing authentication
✅ Consistent authentication pattern with students
