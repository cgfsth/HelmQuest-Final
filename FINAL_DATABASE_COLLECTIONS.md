# 🎯 FINAL FIRESTORE DATABASE COLLECTIONS
## Based on Complete System Analysis (Student, Instructor, Admin)

---

## 📋 Collection Summary: **5 Collections Total**

1. **users** - All users (students, instructors, admins)
2. **training_modules** - Missions created by instructors/admins
3. **mission_attempts** - Student mission results
4. **quizzes** - Quiz questions
5. **quiz_submissions** - Student quiz results

---

# 1️⃣ users Collection

## Student Document
```javascript
{
  // Basic Info
  id: "student-alex",
  studentId: "STU-2026-001",           // Display ID
  name: "Kevin Caidic",
  email: "kevin@helmquest.com",
  role: "student",
  status: "active",
  
  // Student Dashboard Data
  rank: "Cadet",                       // Rank based on XP
  xp: 120,                             // Experience points
  xpProgress: 45,                      // Percentage to next rank (0-100)
  boatUsed: "Commercial Trawler",      // Preferred boat
  
  // Instructor Assignment
  instructorId: "instructor-helen",
  
  // Achievements (shown in Student Profile)
  badges: [
    {
      id: "badge-navigation-expert",
      name: "Navigation Expert",
      icon: "🧭",
      awardedBy: "instructor-helen",
      awardedAt: "2026-01-15T12:00:00Z"
    }
  ],
  certificates: [
    {
      id: "cert-module1",
      name: "Module 1 Completion Certificate",
      score: 85,
      awardedBy: "instructor-helen",
      awardedAt: "2026-01-15T14:00:00Z"
    }
  ],
  
  // Module Progress (which modules completed)
  completedModules: ["m1-mission1", "m1-mission2"],
  
  createdAt: "2026-01-15T10:30:00Z"
}
```

## Instructor Document
```javascript
{
  // Basic Info
  id: "instructor-helen",
  name: "Helen Morgan",
  email: "helen@helmquest.com",
  role: "instructor",
  status: "active",
  
  // Instructor Stats (calculated from queries)
  // - Total students: count users where instructorId = this instructor
  // - Total missions created: count training_modules where createdBy = this instructor
  // - Recent activity: query mission_attempts from their students
  
  createdAt: "2026-01-10T08:00:00Z"
}
```

## Admin Document
```javascript
{
  // Basic Info
  id: "admin-root",
  name: "System Admin",
  email: "admin@helmquest.com",
  role: "admin",
  status: "active",
  
  // Admin has access to everything via queries
  // No special fields needed
  
  createdAt: "2026-01-01T00:00:00Z"
}
```

---

# 2️⃣ training_modules Collection

**What instructor/admin creates**

```javascript
{
  // Basic Info
  id: "m1-mission1",                   // or "custom-mission-1234567890"
  title: "Mission 1: Basic Navigation",
  category: "Module 1",
  description: "Learn GPS navigation basics",
  
  // Difficulty & Rewards
  difficulty: "Beginner",              // "Beginner" | "Intermediate" | "Advanced"
  duration: "5-10 minutes",
  reward: "+100 XP",
  
  // Boat Requirements
  boatType: "medium",                  // "small" | "medium" | "large"
  
  // Learning Objectives
  objectives: [
    "Navigate to waypoint using GPS",
    "Return to harbor safely"
  ],
  
  // Mission Steps (waypoints)
  steps: [
    {
      instruction: "Navigate to 7.11°N, 125.74°E",
      waypointZone: "m1-step-1",
      type: "gps",                     // "gps" | "compass" | "dock"
      lat: "7.1100",
      lon: "125.7400",
      heading: ""
    },
    {
      instruction: "Steer heading 180° to reach Patrol Point 2",
      waypointZone: "m1-step-2",
      type: "compass",
      lat: "",
      lon: "",
      heading: "180"
    },
    {
      instruction: "Return to harbor docks",
      waypointZone: "m1-dock-return",
      type: "dock",
      lat: "",
      lon: "",
      heading: ""
    }
  ],
  
  // Settings
  completed: false,                    // Default
  disableFishing: true,                // Disable fishing during mission
  
  // Creator Info
  createdBy: "instructor-helen",       // or "admin-root"
  createdAt: "2026-01-15T09:00:00Z",
  updatedAt: "2026-01-15T09:30:00Z"
}
```

**Used by:**
- Instructor: Create/Edit missions in "Missions" tab
- Admin: Create missions in "Level Creator"
- Student: View available missions in dashboard

---

# 3️⃣ mission_attempts Collection

**What student generates when completing a mission**

```javascript
{
  // Student Info
  studentId: "student-alex",
  studentName: "Kevin Caidic",
  
  // Mission Info
  missionId: "m1-mission1",
  missionTitle: "Mission 1: Basic Navigation",
  
  // Performance Results
  score: 85,                           // Overall score (0-100)
  timeSpent: 600,                      // seconds
  completed: true,
  passed: true,                        // If score >= passing threshold
  
  // Detailed Performance Metrics
  metrics: {
    steeringAccuracy: 90,              // Percentage
    navigationAccuracy: 85,
    speedControl: 80,
    dockingScore: 75,
    collisionCount: 0,
    violations: [],                    // Array of violation descriptions
    courseDeviations: 2                // Number of times off course
  },
  
  // Timestamps
  startedAt: "2026-01-15T10:00:00Z",
  completedAt: "2026-01-15T10:10:00Z"
}
```

**Used by:**
- Student: View own attempt history
- Instructor: View student performance in "Students" tab → Student details
- Admin: Generate reports in "Reports" tab

---

# 4️⃣ quizzes Collection

**What instructor creates**

```javascript
{
  // Basic Info
  id: "quiz-1234567890",
  title: "Navigation Basics Quiz",
  description: "Test your understanding of GPS navigation",
  
  // Quiz Settings
  buoyCount: 5,                        // Number of buoys to show in simulator (0-20)
  moduleId: "m1-mission1",             // Which mission this quiz belongs to (optional)
  
  // Questions
  questions: [
    // Multiple Choice Question
    {
      id: "q1",
      prompt: "What does GPS stand for?",
      type: "multiple-choice",
      order: 0,
      options: [
        { text: "Global Positioning System", isCorrect: true },
        { text: "General Position System", isCorrect: false },
        { text: "Global Position Signal", isCorrect: false }
      ],
      correctAnswer: "Global Positioning System"
    },
    
    // True/False Question
    {
      id: "q2",
      prompt: "A compass always points to the North Pole",
      type: "true-false",
      order: 1,
      options: [],
      correctAnswer: "False"
    },
    
    // Fill in the Blank Question
    {
      id: "q3",
      prompt: "The unit of speed used by ships is called a ____",
      type: "fill-in-the-blank",
      order: 2,
      options: [],
      correctAnswer: "knot"
    },
    
    // In-Simulator Checkpoint Quiz (optional)
    {
      id: "q4",
      prompt: "What type of buoy is this?",
      type: "multiple-choice",
      order: 3,
      checkpointLat: 7.11,             // Show quiz at this location
      checkpointLng: 125.74,
      options: [
        { text: "Navigation Buoy", isCorrect: true },
        { text: "Mooring Buoy", isCorrect: false }
      ],
      correctAnswer: "Navigation Buoy"
    }
  ],
  
  // Creator Info
  createdBy: "instructor-helen",
  createdAt: "2026-01-15T11:00:00Z",
  updatedAt: "2026-01-15T11:30:00Z"
}
```

**Used by:**
- Instructor: Manage quizzes in mission editor or quiz manager
- Student: Answer quiz after completing mission

---

# 5️⃣ quiz_submissions Collection

**What student generates when submitting a quiz**

```javascript
{
  // Submission Info
  id: "submission-1234567890",
  quizId: "quiz-1234567890",
  moduleId: "m1-mission1",             // Optional: which mission
  
  // Student Info
  studentId: "student-alex",
  studentName: "Kevin Caidic",
  
  // Student Answers (array matches question order)
  answers: [
    "Global Positioning System",       // Question 0 answer
    "False",                           // Question 1 answer
    "knot",                            // Question 2 answer
    "Navigation Buoy"                  // Question 3 answer
  ],
  
  // Grading Results
  score: 75,                           // Percentage (0-100)
  totalQuestions: 4,
  correctAnswers: 3,
  validation: [true, true, false, true], // Which questions were correct
  
  // Status
  status: "graded",                    // "pending" | "graded"
  
  // Optional Feedback
  feedback: "Good work! Review compass magnetic variation.",
  
  // Timestamps
  submittedAt: "2026-01-15T10:15:00Z",
  gradedAt: "2026-01-15T10:20:00Z",
  gradedBy: "instructor-helen"          // Auto-graded or instructor-graded
}
```

**Used by:**
- Student: View quiz results
- Instructor: View student quiz performance, add feedback
- Admin: Generate quiz reports

---

# 📊 What Each Role Does

## 👤 STUDENT
**Reads:**
- users (own profile) → name, XP, badges, certificates, rank
- training_modules (all) → view available missions
- mission_attempts (own) → view past attempts
- quizzes (assigned) → take quizzes
- quiz_submissions (own) → view quiz results

**Writes:**
- mission_attempts → after completing a mission
- quiz_submissions → after taking a quiz

---

## 👨‍🏫 INSTRUCTOR
**Reads:**
- users (where instructorId = self) → view assigned students
- users (where role = 'instructor') → see other instructors
- training_modules (where createdBy = self) → own missions
- mission_attempts (students) → student performance
- quizzes (where createdBy = self) → own quizzes
- quiz_submissions (students) → student quiz results

**Writes:**
- users (students) → create/edit students, award badges/certificates
- training_modules → create/edit missions
- quizzes → create/edit quizzes
- quiz_submissions (feedback field) → add feedback to student submissions

---

## ⚙️ ADMIN
**Reads:**
- users (ALL) → manage all users
- training_modules (ALL) → view all missions
- mission_attempts (ALL) → system-wide reports
- quizzes (ALL) → view all quizzes
- quiz_submissions (ALL) → system-wide quiz reports

**Writes:**
- users (ALL) → create/edit/delete students, instructors, admins
- training_modules → create/edit missions (Level Creator)

---

# 🔗 Key Relationships

```
users (student)
  └─ instructorId → users (instructor).id
  └─ completedModules[] → training_modules[].id
  └─ badges[].awardedBy → users (instructor).id
  └─ certificates[].awardedBy → users (instructor).id

training_modules
  └─ createdBy → users (instructor|admin).id

mission_attempts
  └─ studentId → users (student).id
  └─ missionId → training_modules.id

quizzes
  └─ moduleId → training_modules.id (optional)
  └─ createdBy → users (instructor).id

quiz_submissions
  └─ quizId → quizzes.id
  └─ moduleId → training_modules.id (optional)
  └─ studentId → users (student).id
  └─ gradedBy → users (instructor).id
```

---

# 📝 Sample Queries

## Student Dashboard
```javascript
// Get student profile
db.collection('users').doc('student-alex').get()

// Get available missions
db.collection('training_modules').orderBy('category').get()

// Get student's attempts
db.collection('mission_attempts')
  .where('studentId', '==', 'student-alex')
  .orderBy('completedAt', 'desc')
  .get()
```

## Instructor Console
```javascript
// Get assigned students
db.collection('users')
  .where('instructorId', '==', 'instructor-helen')
  .where('role', '==', 'student')
  .get()

// Get instructor's missions
db.collection('training_modules')
  .where('createdBy', '==', 'instructor-helen')
  .get()

// Get student performance
db.collection('mission_attempts')
  .where('studentId', '==', 'student-alex')
  .orderBy('completedAt', 'desc')
  .limit(10)
  .get()
```

## Admin Dashboard
```javascript
// Get all students
db.collection('users').where('role', '==', 'student').get()

// Get all instructors
db.collection('users').where('role', '==', 'instructor').get()

// System stats
db.collection('mission_attempts').get() // Total attempts
db.collection('training_modules').get() // Total missions
```

---

# ✅ Final Summary

**5 Collections:**
1. **users** - Students, instructors, admins (all in one)
2. **training_modules** - Missions
3. **mission_attempts** - Performance results
4. **quizzes** - Quiz questions
5. **quiz_submissions** - Quiz results

**Benefits:**
- ✅ Simple and clean
- ✅ Role-based access (single users collection)
- ✅ Supports ALL features (student, instructor, admin)
- ✅ Easy to query
- ✅ No redundant data
- ✅ Matches your localStorage structure

Ready for production! 🚀
