# 🔥 HelmQuest Firestore Collections - Complete Structure

## Instructions for Creating Collections in Firebase Console

1. Go to https://console.firebase.google.com
2. Select project: **helmquest-565d6**
3. Click "Firestore Database" from left menu
4. Click "Start collection" for each collection below
5. Add the sample documents to understand the structure

---

## Collection 1: `students`
**Purpose:** Student accounts with enrollment status

### Sample Document
```
Document ID: student-001 (auto-generated or custom)

Fields:
- id: "student-001" (string)
- studentId: "STU-2026-001" (string)
- name: "Alex Rivera" (string)
- email: "alex.rivera@student.com" (string)
- password: "$2b$10$hashedpasswordhere" (string) - HASHED, never plain text
- status: "pending" (string) - Values: "pending" | "active" | "inactive" | "rejected"
- xp: 0 (number)
- rank: "Deck Hand" (string)
- completed: 0 (number)
- averageScore: 0 (number)
- bestScore: 0 (number)
- badgesEarned: 0 (number)
- badgesTotal: 0 (number)
- certificates: 0 (number)
- xpProgress: 0 (number)
- xpNextAt: 200 (number)
- boatUsed: "Commercial Trawler" (string)
- approvedBy: null (string) - instructor ID who approved
- approvedAt: null (timestamp) - when approved
- createdAt: July 15, 2026 at 10:30:00 AM UTC+8 (timestamp)
```

**Status Values:**
- `"pending"` - Student signed up, awaiting instructor approval
- `"active"` - Approved by instructor, can access missions
- `"inactive"` - Temporarily disabled
- `"rejected"` - Rejected by instructor

---

## Collection 2: `instructors`
**Purpose:** Instructor accounts

### Sample Document
```
Document ID: instructor-001 (auto-generated or custom)

Fields:
- id: "instructor-001" (string)
- email: "helen@instructor.com" (string)
- password: "$2b$10$hashedpasswordhere" (string) - HASHED
- name: "Helen Smith" (string)
- department: "Maritime Training" (string)
- status: "active" (string) - Values: "active" | "inactive"
- createdAt: July 1, 2026 at 8:00:00 AM UTC+8 (timestamp)
```

---

## Collection 3: `training_module`
**Purpose:** Mission definitions (existing)

### Sample Document
```
Document ID: custom-mission-1785018667575 (auto-generated)

Fields:
- title: "Mission 1: Basic Navigation" (string)
- description: "Learn to navigate using GPS" (string)
- difficulty: "Beginner" (string)
- boatType: "medium" (string)
- objectives: ["Navigate to waypoint", "Return to dock"] (array of strings)
- steps: (array of maps)
  [
    {
      instruction: "Navigate to 7.11°N, 125.74°E" (string)
      waypointZone: "m1-step-1" (string)
      type: "gps" (string)
      lat: "7.1100" (string)
      lon: "125.7400" (string)
      heading: "" (string)
    },
    {
      instruction: "Return to dock" (string)
      waypointZone: "m1-dock" (string)
      type: "dock" (string)
      lat: "" (string)
      lon: "" (string)
      heading: "" (string)
    }
  ]
- completed: false (boolean)
- estimated_duration: "5-10 minutes" (string)
- reward: "+100 XP" (string)
- createdBy: "instructor-001" (string)
- createdAt: July 5, 2026 at 12:00:00 AM UTC+8 (timestamp)
- updatedAt: July 6, 2026 at 12:00:00 AM UTC+8 (timestamp)
```

---

## Collection 4: `quiz`
**Purpose:** Quiz questions linked to missions (existing)

### Sample Document
```
Document ID: quiz-001 (auto-generated)

Fields:
- title: "Navigation Basics Quiz" (string)
- description: "Test your understanding of GPS navigation" (string)
- moduleId: "custom-mission-1785018667575" (string) - Links to training_module ID
- questions: (array of maps)
  [
    {
      prompt: "What does GPS stand for?" (string)
      type: "multiple-choice" (string)
      options: (array of maps)
        [
          { text: "Global Positioning System" (string), isCorrect: true (boolean) },
          { text: "General Position System" (string), isCorrect: false (boolean) }
        ]
      correctAnswer: "Global Positioning System" (string)
    },
    {
      prompt: "A compass always points to the North Pole" (string)
      type: "true-false" (string)
      options: [] (empty array)
      correctAnswer: "False" (string)
    }
  ]
- createdBy: "instructor-001" (string)
- createdAt: July 5, 2026 at 12:00:00 AM UTC+8 (timestamp)
```

---

## Collection 5: `mission_attempts` (FUTURE - not yet implemented)
**Purpose:** Track student mission completion attempts

### Sample Document
```
Document ID: attempt-001 (auto-generated)

Fields:
- studentId: "student-001" (string)
- moduleId: "custom-mission-1785018667575" (string)
- score: 85 (number)
- passed: true (boolean)
- duration: 480 (number) - seconds
- mistakes: 2 (number)
- completedAt: July 16, 2026 at 10:00:00 AM UTC+8 (timestamp)
```

---

## Collection 6: `quiz_submissions` (FUTURE - not yet implemented)
**Purpose:** Track student quiz submissions

### Sample Document
```
Document ID: submission-001 (auto-generated)

Fields:
- studentId: "student-001" (string)
- quizId: "quiz-001" (string)
- moduleId: "custom-mission-1785018667575" (string)
- answers: (array of maps)
  [
    {
      questionId: "question-1" (string)
      studentAnswer: "Global Positioning System" (string)
      isCorrect: true (boolean)
    }
  ]
- score: 90 (number)
- status: "graded" (string) - Values: "pending" | "graded"
- submittedAt: July 16, 2026 at 11:00:00 AM UTC+8 (timestamp)
- gradedBy: "instructor-001" (string)
- gradedAt: July 16, 2026 at 12:00:00 PM UTC+8 (timestamp)
- feedback: "Great work!" (string)
```

---

## Collection 7: `admins` (OPTIONAL)
**Purpose:** Admin accounts

### Sample Document
```
Document ID: admin-001 (auto-generated)

Fields:
- id: "admin-001" (string)
- email: "admin@helmquest.com" (string)
- password: "$2b$10$hashedpasswordhere" (string) - HASHED
- name: "Admin User" (string)
- status: "active" (string)
- createdAt: July 1, 2026 at 8:00:00 AM UTC+8 (timestamp)
```

---

## 🔗 Collection Relationships

```
students (many) → mission_attempts (many)
  └─ studentId links to students.id

instructors (many) → training_module (many)
  └─ createdBy links to instructors.id

training_module (one) → quiz (one)
  └─ quiz.moduleId links to training_module.id

students (many) → quiz_submissions (many)
  └─ studentId links to students.id

quiz (one) → quiz_submissions (many)
  └─ quizId links to quiz.id
```

---

## 🚀 Quick Start: Create Collections Now

1. **`students`** - Start with this! Add 1 test student with status="pending"
2. **`instructors`** - Add 1 test instructor
3. **`training_module`** - Already exists (from mission creation)
4. **`quiz`** - Already exists (from quiz creation)
5. **`mission_attempts`** - Create later when implementing progress tracking
6. **`quiz_submissions`** - Create later when implementing quiz submissions

---

## ✅ Current Status

| Collection | Status | Notes |
|------------|--------|-------|
| `students` | 🟡 TO CREATE | Need to create this collection |
| `instructors` | 🟡 TO CREATE | Need to create this collection |
| `training_module` | ✅ EXISTS | Already created from mission editor |
| `quiz` | ✅ EXISTS | Already created from quiz editor |
| `mission_attempts` | 🔵 FUTURE | Will implement later |
| `quiz_submissions` | 🔵 FUTURE | Will implement later |

---

## 🔐 Security Rules (Firebase Console → Firestore Database → Rules)

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Students collection - only authenticated users can read own data
    match /students/{studentId} {
      allow read: if request.auth != null && request.auth.uid == studentId;
      allow write: if request.auth != null;
    }
    
    // Instructors collection - only authenticated instructors
    match /instructors/{instructorId} {
      allow read, write: if request.auth != null;
    }
    
    // Training modules - students can read, instructors can write
    match /training_module/{moduleId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null; // Add role check later
    }
    
    // Quizzes - students can read, instructors can write
    match /quiz/{quizId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null; // Add role check later
    }
  }
}
```

**Note:** For now, keep rules open during development. Add proper authentication later.

