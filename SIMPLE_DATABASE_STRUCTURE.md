# 🗂️ HelmQuest Firestore Database Structure (Simple & Based on Your System)

## Collection Summary
Based sa imong actual code, here are the **6 essential collections**:

1. **users** - ALL users (students, instructors, admin) with role field
2. **training_modules** - Missions created by instructors
3. **mission_attempts** - Student's mission results/sessions
4. **quizzes** - Quiz questions
5. **quiz_submissions** - Student's quiz answers and scores
6. **course_settings** - System-wide settings (optional)

---

## 1️⃣ **users** Collection (Replaces students + instructors)

**Document ID:** userId (e.g., "student-alex", "instructor-helen", "admin-root")

```javascript
// STUDENT USER
{
  id: "student-alex",
  studentId: "STU-2026-001",             // Only for role="student"
  name: "Kevin Caidic",
  email: "kevin@helmquest.com",
  role: "student",                       // "student" | "instructor" | "admin"
  status: "active",                      // "active" | "inactive"
  
  // Student-specific fields
  boatUsed: "Commercial Trawler",
  instructorId: "instructor-helen",
  xp: 120,
  
  // Badges and Certificates (awarded by instructor)
  badges: [
    {
      id: "badge-navigation-expert",
      name: "Navigation Expert",
      awardedBy: "instructor-helen",
      awardedAt: "2026-01-15T12:00:00Z"
    }
  ],
  certificates: [
    {
      id: "cert-module1",
      name: "Module 1 Completion",
      score: 85,
      awardedBy: "instructor-helen", 
      awardedAt: "2026-01-15T14:00:00Z"
    }
  ],
  
  createdAt: "2026-01-15T10:30:00Z"
}

// INSTRUCTOR USER
{
  id: "instructor-helen",
  name: "Helen Morgan",
  email: "helen@helmquest.com",
  role: "instructor",
  status: "active",
  createdAt: "2026-01-10T08:00:00Z"
}

// ADMIN USER
{
  id: "admin-root",
  name: "System Admin",
  email: "admin@helmquest.com",
  role: "admin",
  status: "active",
  createdAt: "2026-01-01T00:00:00Z"
}
```

**What it stores:** ALL users (students, instructors, admins) - simple role-based access

---

## 2️⃣ **training_modules** Collection

**Document ID:** moduleId (e.g., "m1-mission1" or "custom-mission-1234567890")

```javascript
{
  id: "m1-mission1",
  title: "Mission 1: Basic Navigation",
  category: "Module 1",
  description: "Learn GPS navigation basics",
  difficulty: "Beginner",                // "Beginner" | "Intermediate" | "Advanced"
  duration: "5-10 minutes",
  reward: "+100 XP",
  boatType: "medium",                    // "small" | "medium" | "large"
  objectives: [
    "Navigate to waypoint",
    "Return to dock"
  ],
  steps: [
    {
      instruction: "Navigate to 7.11°N, 125.74°E",
      waypointZone: "m1-step-1",
      type: "gps",                       // "gps" | "compass" | "dock"
      lat: "7.1100",
      lon: "125.7400",
      heading: ""                        // Only for type="compass"
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
  completed: false,                      // Default value
  disableFishing: true,                  // Disable fishing during mission
  createdBy: "instructor-helen",         // Who created it
  createdAt: "2026-01-15T09:00:00Z"
}
```

**What it stores:** Mission details, waypoints, steps

---

## 3️⃣ **mission_attempts** Collection

**Document ID:** Auto-generated

```javascript
{
  studentId: "student-alex",
  studentName: "Kevin Caidic",
  missionId: "m1-mission1",
  missionTitle: "Mission 1: Basic Navigation",
  
  // Performance Metrics
  score: 85,
  timeSpent: 600,                        // seconds
  completed: true,
  passed: true,
  
  // Detailed Metrics (from your missionScoring.js)
  metrics: {
    steeringAccuracy: 90,
    navigationAccuracy: 85,
    speedControl: 80,
    dockingScore: 75,
    collisionCount: 0,
    violations: [],
    courseDeviations: 2
  },
  
  // Timestamps
  startedAt: "2026-01-15T10:00:00Z",
  completedAt: "2026-01-15T10:10:00Z"
}
```

**What it stores:** Student's mission attempt results, scores, metrics

---

## 4️⃣ **quizzes** Collection

**Document ID:** quizId (e.g., "quiz-1234567890")

```javascript
{
  id: "quiz-1234567890",
  title: "Navigation Basics Quiz",
  description: "Test your understanding of GPS navigation",
  buoyCount: 5,                          // Number of buoys to show (0-20)
  
  questions: [
    {
      id: "q1",
      prompt: "What does GPS stand for?",
      type: "multiple-choice",           // "multiple-choice" | "true-false" | "fill-in-the-blank"
      order: 0,
      
      // For multiple-choice only
      options: [
        { text: "Global Positioning System", isCorrect: true },
        { text: "General Position System", isCorrect: false },
        { text: "Global Position Signal", isCorrect: false }
      ],
      
      // For true-false and fill-in-the-blank
      correctAnswer: "Global Positioning System",
      
      // Optional: for in-simulator checkpoint quizzes
      checkpointLat: 7.11,
      checkpointLng: 125.74
    }
  ],
  
  createdBy: "instructor-helen",
  createdAt: "2026-01-15T11:00:00Z",
  updatedAt: "2026-01-15T11:30:00Z"
}
```

**What it stores:** Quiz questions, answer options, correct answers

**Note:** Quiz assignment is simple - just check which module/mission the quiz belongs to using targetId

---

## 5️⃣ **quiz_submissions** Collection

**Document ID:** Auto-generated (e.g., "submission-1234567890")

```javascript
{
  id: "submission-1234567890",
  quizId: "quiz-1234567890",
  moduleId: "m1-mission1",               // Optional: which mission this quiz was for
  
  // Student Info
  studentId: "student-alex",
  studentName: "Kevin Caidic",
  
  // Answers
  answers: [
    "Global Positioning System",         // Answer to question 0
    "True",                              // Answer to question 1
    "Compass"                            // Answer to question 2
  ],
  
  // Results
  score: 80,                             // Percentage (0-100)
  totalQuestions: 5,
  correctAnswers: 4,
  
  // Validation array (matches question order)
  validation: [true, true, false, true, true],
  
  // Status
  status: "graded",                      // "pending" | "graded"
  
  // Optional instructor feedback
  feedback: "Good job! Review compass directions.",
  
  // Timestamps
  submittedAt: "2026-01-15T10:15:00Z",
  gradedAt: "2026-01-15T10:20:00Z",
  gradedBy: "instructor-helen"
}
```

**What it stores:** Student's quiz answers, scores, grading results

---

## 📊 Summary: 5 Collections Only!

1. **users** - ALL users (students, instructors, admins) with role field
2. **training_modules** - Missions with waypoints and steps
3. **mission_attempts** - Mission results and performance metrics
4. **quizzes** - Quiz questions and answers
5. **quiz_submissions** - Student quiz submissions and scores

**EVEN SIMPLER!** One collection for all users (role-based).

---

## 🔗 How Collections Connect (Simple References)

```
users (where role="student") ↔ users (where role="instructor") via instructorId
mission_attempts.studentId → users.id (where role="student")
mission_attempts.missionId → training_modules.id
quiz_submissions.studentId → users.id (where role="student")
quiz_submissions.quizId → quizzes.id
quiz_submissions.moduleId → training_modules.id (optional)
```

---

## 🔐 Role-Based Access Control

**Query by role:**
```javascript
// Get all students
db.collection('users').where('role', '==', 'student').get()

// Get all instructors
db.collection('users').where('role', '==', 'instructor').get()

// Get all admins
db.collection('users').where('role', '==', 'admin').get()

// Get students assigned to an instructor
db.collection('users')
  .where('role', '==', 'student')
  .where('instructorId', '==', 'instructor-helen')
  .get()
```

---

## 📝 Sample Queries You'll Use:

```javascript
// Get all missions created by an instructor
db.collection('training_modules')
  .where('createdBy', '==', 'instructor-helen')
  .get()

// Get student's mission attempts
db.collection('mission_attempts')
  .where('studentId', '==', 'student-alex')
  .orderBy('completedAt', 'desc')
  .get()

// Get quiz submissions for a student
db.collection('quiz_submissions')
  .where('studentId', '==', 'student-alex')
  .where('quizId', '==', 'quiz-123')
  .get()
```

---

## ✅ This Structure is:
- ✅ **SIMPLEST POSSIBLE** - 5 collections only
- ✅ **One users collection** for students, instructors, AND admins
- ✅ Based on your actual code structure
- ✅ Easy to query with role-based filtering
- ✅ Matches your localStorage data format
- ✅ Supports all your current features
- ✅ Admin can manage everything through the single users collection

Ready to use! 🚀
