# 🎯 INSTRUCTOR CONSOLE → DATABASE MAPPING
## Exact UI to Database Field Mapping

Based on your actual instructor console UI, here's what data gets saved to Firestore:

---

## 📊 OVERVIEW TAB

### Stats Cards (Top)

**UI Display:**
```
┌─────────────────────┐  ┌─────────────────────┐  ┌─────────────────────┐
│ Total Students      │  │ Enrolled Students   │  │ Average Score       │
│       4             │  │       0             │  │       0%            │
└─────────────────────┘  └─────────────────────┘  └─────────────────────┘
```

**Database Queries:**
```javascript
// Total Students
db.collection('users')
  .where('instructorId', '==', currentInstructorId)
  .where('role', '==', 'student')
  .get()
  .then(snapshot => snapshot.size)

// Enrolled Students (who started at least one mission)
db.collection('mission_attempts')
  .where('studentId', 'in', [array_of_student_ids])
  .get()
  .then(attempts => {
    const uniqueStudents = new Set(attempts.docs.map(doc => doc.data().studentId));
    return uniqueStudents.size;
  })

// Average Score
db.collection('mission_attempts')
  .where('studentId', 'in', [array_of_student_ids])
  .get()
  .then(attempts => {
    const scores = attempts.docs.map(doc => doc.data().score);
    return scores.reduce((a, b) => a + b, 0) / scores.length;
  })
```

**Data Sources:**
- ✅ `users` collection (where role='student', instructorId=current instructor)
- ✅ `mission_attempts` collection (to calculate enrolled count and avg score)

---

### Level Completion Section

**UI Display:**
```
Level Completion
┌──────────────────────────────────┐
│ Level 1                          │
│    3                             │
│ of 4 students completed          │
│ ████████████░░░░░░░░ 75%        │
└──────────────────────────────────┘
```

**Database Query:**
```javascript
// For each level/module
db.collection('mission_attempts')
  .where('missionId', '==', 'm1-mission1')  // Level 1
  .where('completed', '==', true)
  .get()
  .then(attempts => {
    const uniqueStudents = new Set(attempts.docs.map(doc => doc.data().studentId));
    return uniqueStudents.size;  // Count of students who completed this level
  })
```

**Data Sources:**
- ✅ `mission_attempts` collection (completed missions per level)

---

### Students Needing Improvement

**UI Display:**
```
Students Needing Improvement
Students whose average mission score is below 70%.

┌──────────────────────────────────────────┐
│ Alex Rivera                              │
│ 2 sessions · avg 55%             Review →│
└──────────────────────────────────────────┘
```

**Database Query:**
```javascript
db.collection('mission_attempts')
  .where('studentId', '==', 'student-alex')
  .get()
  .then(attempts => {
    const scores = attempts.docs.map(doc => doc.data().score);
    const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
    
    if (avgScore < 70) {
      return {
        studentId: 'student-alex',
        name: 'Alex Rivera',
        sessions: scores.length,
        avgScore: avgScore
      };
    }
  })
```

**Data Sources:**
- ✅ `mission_attempts` collection (calculate avg score per student)
- ✅ `users` collection (get student name)

---

## 🧭 MISSIONS TAB

**UI Display:**
```
Mission Management
[+ Create New Mission]

┌─────────────────────────────────────────┐
│ Level 1  Module 1    Beginner           │
│ Mission 1: Basic Navigation             │
│ Learn to navigate using GPS coordinates │
│ Est. 5-10 minutes      +100 XP          │
│ [🔒 Lock] [Manage Quiz] [Edit] [Delete] │
└─────────────────────────────────────────┘
```

**Database Collection: `training_modules`**
```javascript
{
  "id": "m1-mission1",
  "title": "Mission 1: Basic Navigation",
  "category": "Module 1",
  "description": "Learn to navigate using GPS coordinates",
  "difficulty": "Beginner",
  "duration": "5-10 minutes",
  "reward": "+100 XP",
  "boatType": "medium",
  "objectives": [
    "Navigate to waypoint",
    "Return to dock"
  ],
  "steps": [
    {
      "instruction": "Navigate to 7.11°N, 125.74°E",
      "waypointZone": "m1-step-1",
      "type": "gps",
      "lat": "7.1100",
      "lon": "125.7400",
      "heading": ""
    }
  ],
  "completed": false,
  "disableFishing": true,
  "createdBy": "instructor-helen",
  "createdAt": "2026-01-15T09:00:00Z"
}
```

**Actions:**
- **Create New Mission** → POST to `training_modules`
- **Edit Mission** → PUT to `training_modules/:id`
- **Delete Mission** → DELETE from `training_modules/:id`
- **Manage Quiz** → Links to `quizzes` collection

**Data Source:**
- ✅ `training_modules` collection

---

## 👥 STUDENTS TAB

### Pending Approvals Section

**UI Display:**
```
🕒 Pending Approvals (2)
Review student sign-up requests. Approve to activate the account, or reject to remove it.

┌────────────────────────────────────────────────────┐
│ Kevin Caidic                      [✓ Approve] [✕ Reject] │
│ STU-2026-005 · kevin@example.com · submitted Jan 15│
└────────────────────────────────────────────────────┘
```

**Database Query:**
```javascript
// Get pending students
db.collection('users')
  .where('instructorId', '==', currentInstructorId)
  .where('role', '==', 'student')
  .where('status', '==', 'pending')
  .orderBy('createdAt', 'desc')
  .get()
```

**Database Update (Approve):**
```javascript
db.collection('users').doc(studentId).update({
  status: 'active',
  approvedAt: new Date().toISOString(),
  approvedBy: currentInstructorId
})
```

**Database Delete (Reject):**
```javascript
db.collection('users').doc(studentId).delete()
```

**Data Source:**
- ✅ `users` collection (where status='pending')

---

### Students Table

**UI Display:**
```
Students
[+ Add Student]  [📥 Export CSV]
Manage student accounts and view their full training records

┌────────────────────────────────────────────────────────────────────────────────┐
│ STUDENT ID │ NAME        │ BOAT             │ LEVEL │ HIGHEST │ ATTEMPTS │ ... │
├────────────────────────────────────────────────────────────────────────────────┤
│ STU-2026-001│ Alex Rivera │ ⛵ Commercial   │ Level 1│   0%    │    0     │ ... │
│             │             │    Trawler       │        │         │          │     │
└────────────────────────────────────────────────────────────────────────────────┘
```

**Database Query:**
```javascript
// Get all students for this instructor
const students = await db.collection('users')
  .where('instructorId', '==', currentInstructorId)
  .where('role', '==', 'student')
  .where('status', '==', 'active')
  .get();

// For EACH student, calculate stats
for (const student of students.docs) {
  const studentId = student.id;
  
  // Get attempts
  const attempts = await db.collection('mission_attempts')
    .where('studentId', '==', studentId)
    .get();
  
  // Calculate:
  const highestScore = Math.max(...attempts.docs.map(a => a.data().score));
  const attemptsCount = attempts.size;
  const latestActivity = attempts.docs.length > 0 
    ? Math.max(...attempts.docs.map(a => new Date(a.data().completedAt).getTime()))
    : null;
  
  // Current level = count of completed modules
  const completedModules = student.data().completedModules || [];
  const currentLevel = `Level ${completedModules.length + 1}`;
}
```

**Table Columns → Database Fields:**

| Column | Source | Query |
|--------|--------|-------|
| **Student ID** | `users.studentId` | Direct field |
| **Name** | `users.name` | Direct field |
| **Boat** | `users.boatUsed` | Direct field (default: "Commercial Trawler") |
| **Level** | Calculated | Count of `users.completedModules.length + 1` |
| **Highest** | Calculated | MAX(`mission_attempts.score`) for this student |
| **Attempts** | Calculated | COUNT(`mission_attempts`) for this student |
| **Latest Activity** | Calculated | MAX(`mission_attempts.completedAt`) for this student |
| **Status** | `users.status` | Direct field ("active" or "inactive") |

**Actions:**
- **[✏️ Edit]** → Update `users` collection
- **[🔄 Reset]** → Delete all `mission_attempts` for this student, clear `users.completedModules`
- **[🗑️ Delete]** → Delete from `users` collection

**Data Sources:**
- ✅ `users` collection (student profile)
- ✅ `mission_attempts` collection (performance data)

---

## 📋 SUMMARY: Collections Needed

### 1. `users` Collection
**Used for:**
- Student profiles (name, email, studentId, instructorId)
- Student status (pending/active/inactive)
- Completed modules tracking
- XP, rank, badges, certificates

### 2. `training_modules` Collection
**Used for:**
- Mission details (title, description, steps)
- Created by instructor
- Displayed in Missions tab

### 3. `mission_attempts` Collection
**Used for:**
- Student performance tracking
- Calculate: enrolled students, avg score, highest score, attempts count
- Latest activity timestamp
- Students needing improvement

### 4. `quizzes` Collection
**Used for:**
- Quiz management (linked to missions)
- Created by instructor

### 5. `quiz_submissions` Collection
**Used for:**
- Student quiz results
- Quiz scores

---

## ✅ Data Flow Summary

**Instructor Console → Firestore:**

```
Overview Tab Stats
  ├─ Total Students ← users (count)
  ├─ Enrolled Students ← mission_attempts (unique students)
  ├─ Average Score ← mission_attempts (avg of all scores)
  ├─ Level Completion ← mission_attempts (completed per level)
  └─ Needs Improvement ← mission_attempts (students with avg < 70%)

Missions Tab
  ├─ Mission List ← training_modules
  ├─ Create Mission → training_modules (POST)
  ├─ Edit Mission → training_modules (PUT)
  └─ Delete Mission → training_modules (DELETE)

Students Tab
  ├─ Pending Approvals ← users (where status='pending')
  ├─ Approve Student → users (update status='active')
  ├─ Reject Student → users (delete)
  ├─ Students Table ← users + mission_attempts (joined)
  ├─ Add Student → users (POST)
  ├─ Edit Student → users (PUT)
  └─ Delete Student → users (DELETE)
```

**Everything maps to the 5 collections!** ✅
