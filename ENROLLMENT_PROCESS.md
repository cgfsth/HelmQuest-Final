# 📋 Student Enrollment Process

## Overview
Students cannot access missions until approved by their instructor. This ensures controlled access and proper student management.

---

## 🔄 Enrollment Flow

### Option 1: Instructor Adds Student Directly
```
1. Instructor logs in
2. Goes to "Students" tab
3. Clicks "+ Add Student"
4. Enters:
   - Student ID (e.g., STU-2026-005)
   - Full Name
   - Email
   - Initial Status: "active" (approved immediately)
5. Student receives email with login credentials
6. Student can immediately log in and see missions
```

### Option 2: Student Self-Signup → Instructor Approval (RECOMMENDED)
```
1. Student goes to Student Portal
2. Clicks "Sign Up" or "Create Account"
3. Enters:
   - Student ID (provided by instructor beforehand)
   - Full Name
   - Email
   - Password
4. Account created with status: "pending"
5. Student logs in but CANNOT see missions (blocked)
6. Instructor sees student in "Pending Approvals" section
7. Instructor clicks "✓ Approve"
8. Student status changes to "active"
9. Student can NOW see and access missions
```

---

## 📊 Database Structure for Enrollment

### users Collection (with status field)
```javascript
{
  "id": "student-alex",
  "studentId": "STU-2026-001",
  "name": "Kevin Caidic",
  "email": "kevin@helmquest.com",
  "role": "student",
  "status": "pending",              // "pending" | "active" | "inactive"
  "instructorId": "instructor-helen",
  "rank": "Cadet",
  "xp": 0,
  "xpProgress": 0,
  "boatUsed": "Commercial Trawler",
  "badges": [],
  "certificates": [],
  "completedModules": [],
  "createdAt": "2026-01-15T10:30:00Z",
  "approvedAt": null,                // Set when instructor approves
  "approvedBy": null                 // instructor ID who approved
}
```

---

## 🚫 Access Control Rules

### Student with status="pending"
**CAN:**
- ✅ Log in to the system
- ✅ View their profile
- ✅ See "Waiting for instructor approval" message

**CANNOT:**
- ❌ See missions list
- ❌ Start any training
- ❌ Take quizzes
- ❌ Access simulator

### Student with status="active"
**CAN:**
- ✅ Log in
- ✅ View profile
- ✅ See all missions
- ✅ Start training
- ✅ Take quizzes
- ✅ Access simulator

### Student with status="inactive"
**CAN:**
- ✅ Log in (but see "Account inactive" message)

**CANNOT:**
- ❌ See missions
- ❌ Start training
- ❌ Take quizzes

---

## 🔧 Implementation Changes Needed

### 1. Student Dashboard (App.vue)
**Add access check:**
```javascript
// In student dashboard section
<div v-if="currentUser.status === 'pending'" class="pending-approval-notice">
  <div class="notice-card">
    <h2>⏳ Account Pending Approval</h2>
    <p>Your account is waiting for instructor approval.</p>
    <p>You'll be able to access training missions once your instructor approves your account.</p>
    <p>Instructor: {{ currentUser.instructorName }}</p>
  </div>
</div>

<div v-else-if="currentUser.status === 'inactive'" class="inactive-notice">
  <div class="notice-card">
    <h2>🚫 Account Inactive</h2>
    <p>Your account has been deactivated. Contact your instructor for assistance.</p>
  </div>
</div>

<!-- Only show missions if status === 'active' -->
<div v-else-if="currentUser.status === 'active'" class="training-grid">
  <!-- missions here -->
</div>
```

### 2. Instructor Pending Approvals
**Already exists in UI! Just need to add API calls:**

```javascript
// Function: approveStudentSignup()
async function approveStudentSignup(studentId) {
  try {
    // Update in Firestore
    await window.firebaseApi.updateStudent(studentId, {
      status: 'active',
      approvedAt: new Date().toISOString(),
      approvedBy: currentUser.value.id
    });
    
    // Update local storage
    const student = progressData.value.students.find(s => s.id === studentId);
    if (student) {
      student.status = 'active';
      student.approvedAt = new Date().toISOString();
      student.approvedBy = currentUser.value.id;
    }
    
    saveProgress(progressData.value);
    showAchievement(`✅ ${student.name} approved`);
  } catch (error) {
    showAchievement(`❌ Failed to approve: ${error.message}`);
  }
}

// Function: rejectStudentSignup()
async function rejectStudentSignup(studentId) {
  if (!confirm('Remove this student account?')) return;
  
  try {
    // Delete from Firestore
    await window.firebaseApi.deleteStudent(studentId);
    
    // Remove from local storage
    progressData.value.students = progressData.value.students.filter(s => s.id !== studentId);
    progressData.value.registeredUsers = progressData.value.registeredUsers.filter(u => u.id !== studentId);
    
    saveProgress(progressData.value);
    showAchievement(`🗑️ Student account removed`);
  } catch (error) {
    showAchievement(`❌ Failed to remove: ${error.message}`);
  }
}
```

### 3. Student Signup Form
**Add "Student Portal" signup option on landing page:**

```html
<!-- On landing page -->
<div class="landing-nav-buttons">
  <button type="button" class="nav-btn nav-btn-student" @click="goToStudentSignup">
    <span class="btn-icon">📝</span> Student Signup
  </button>
  <button type="button" class="nav-btn nav-btn-student" @click="goToStudentLogin">
    <span class="btn-icon">👤</span> Student Login
  </button>
  <button type="button" class="nav-btn nav-btn-instructor" @click="goToInstructorLogin">
    <span class="btn-icon">👨‍🏫</span> Instructor Login
  </button>
</div>
```

**Signup form:**
```javascript
function submitStudentSignup() {
  const studentData = {
    id: `student-${Date.now().toString(36)}`,
    studentId: signupForm.value.studentId,
    name: signupForm.value.name,
    email: signupForm.value.email,
    role: 'student',
    status: 'pending',              // KEY: Set to pending!
    instructorId: null,              // Will be assigned by instructor
    rank: 'Cadet',
    xp: 0,
    xpProgress: 0,
    boatUsed: 'Commercial Trawler',
    badges: [],
    certificates: [],
    completedModules: [],
    createdAt: new Date().toISOString(),
    approvedAt: null,
    approvedBy: null
  };
  
  // Save to Firestore
  await window.firebaseApi.createStudent(studentData);
  
  showAchievement('✅ Account created! Waiting for instructor approval.');
  goToStudentLogin();
}
```

---

## 📝 Summary

**Key Changes:**
1. ✅ Add `status` field to users: "pending" | "active" | "inactive"
2. ✅ Add `approvedAt` and `approvedBy` fields
3. ✅ Block missions for status="pending" students
4. ✅ Instructor sees pending students in "Pending Approvals"
5. ✅ Instructor can approve/reject
6. ✅ Student signup sets status="pending"

**Benefits:**
- ✅ Instructor has full control over who can access training
- ✅ Students can self-register (reduces instructor workload)
- ✅ Clear approval workflow
- ✅ Audit trail (who approved, when)

Ready to implement! 🚀
