# 🗂️ FIRESTORE DATABASE BREAKDOWN
## 5 Collections - Simple Guide

---

# Collection 1: **users**
## Para sa tanan: Students, Instructors, Admins

### Student Example:
```json
{
  "id": "student-alex",
  "studentId": "STU-2026-001",
  "name": "Kevin Caidic",
  "email": "kevin@helmquest.com",
  "role": "student",
  "status": "active",
  "rank": "Cadet",
  "xp": 120,
  "xpProgress": 45,
  "boatUsed": "Commercial Trawler",
  "instructorId": "instructor-helen",
  "badges": [
    {
      "id": "badge-nav",
      "name": "Navigation Expert",
      "awardedBy": "instructor-helen",
      "awardedAt": "2026-01-15T12:00:00Z"
    }
  ],
  "certificates": [],
  "completedModules": ["m1-mission1"],
  "createdAt": "2026-01-15T10:30:00Z"
}
```

### Instructor Example:
```json
{
  "id": "instructor-helen",
  "name": "Helen Morgan",
  "email": "helen@helmquest.com",
  "role": "instructor",
  "status": "active",
  "createdAt": "2026-01-10T08:00:00Z"
}
```

### Admin Example:
```json
{
  "id": "admin-root",
  "name": "System Admin",
  "email": "admin@helmquest.com",
  "role": "admin",
  "status": "active",
  "createdAt": "2026-01-01T00:00:00Z"
}
```

**Unsa ang gi-store:**
- Student profiles with XP, badges, certificates
- Instructor profiles
- Admin profiles

**Kinsa ang mag-access:**
- Student: basaha own profile
- Instructor: basaha assigned students
- Admin: basaha ug edit tanan users

---

# Collection 2: **training_modules**
## Para sa missions (gi-create sa instructor/admin)

### Example:
```json
{
  "id": "m1-mission1",
  "title": "Mission 1: Basic Navigation",
  "category": "Module 1",
  "description": "Learn GPS navigation basics",
  "difficulty": "Beginner",
  "duration": "5-10 minutes",
  "reward": "+100 XP",
  "boatType": "medium",
  "objectives": [
    "Navigate to waypoint using GPS",
    "Return to harbor safely"
  ],
  "steps": [
    {
      "instruction": "Navigate to 7.11°N, 125.74°E",
      "waypointZone": "m1-step-1",
      "type": "gps",
      "lat": "7.1100",
      "lon": "125.7400",
      "heading": ""
    },
    {
      "instruction": "Return to harbor docks",
      "waypointZone": "m1-dock-return",
      "type": "dock",
      "lat": "",
      "lon": "",
      "heading": ""
    }
  ],
  "completed": false,
  "disableFishing": true,
  "createdBy": "instructor-helen",
  "createdAt": "2026-01-15T09:00:00Z"
}
```

**Unsa ang gi-store:**
- Mission title, description, difficulty
- Waypoint steps (GPS coordinates, compass headings)
- Boat type, rewards, objectives

**Kinsa ang mag-access:**
- Student: basaha available missions
- Instructor: create/edit missions
- Admin: create/edit missions

---

# Collection 3: **mission_attempts**
## Para sa student performance results

### Example:
```json
{
  "studentId": "student-alex",
  "studentName": "Kevin Caidic",
  "missionId": "m1-mission1",
  "missionTitle": "Mission 1: Basic Navigation",
  "score": 85,
  "timeSpent": 600,
  "completed": true,
  "passed": true,
  "metrics": {
    "steeringAccuracy": 90,
    "navigationAccuracy": 85,
    "speedControl": 80,
    "dockingScore": 75,
    "collisionCount": 0,
    "violations": [],
    "courseDeviations": 2
  },
  "startedAt": "2026-01-15T10:00:00Z",
  "completedAt": "2026-01-15T10:10:00Z"
}
```

**Unsa ang gi-store:**
- Student performance scores
- Time spent on mission
- Detailed metrics (steering, navigation, docking)

**Kinsa ang mag-access:**
- Student: basaha own attempts
- Instructor: basaha student attempts
- Admin: basaha all attempts for reports

---

# Collection 4: **quizzes**
## Para sa quiz questions (gi-create sa instructor)

### Example:
```json
{
  "id": "quiz-1234567890",
  "title": "Navigation Basics Quiz",
  "description": "Test your understanding of GPS navigation",
  "buoyCount": 5,
  "moduleId": "m1-mission1",
  "questions": [
    {
      "id": "q1",
      "prompt": "What does GPS stand for?",
      "type": "multiple-choice",
      "order": 0,
      "options": [
        {
          "text": "Global Positioning System",
          "isCorrect": true
        },
        {
          "text": "General Position System",
          "isCorrect": false
        }
      ],
      "correctAnswer": "Global Positioning System"
    },
    {
      "id": "q2",
      "prompt": "A compass always points to the North Pole",
      "type": "true-false",
      "order": 1,
      "options": [],
      "correctAnswer": "False"
    },
    {
      "id": "q3",
      "prompt": "The unit of speed used by ships is called a ____",
      "type": "fill-in-the-blank",
      "order": 2,
      "options": [],
      "correctAnswer": "knot"
    }
  ],
  "createdBy": "instructor-helen",
  "createdAt": "2026-01-15T11:00:00Z"
}
```

**Unsa ang gi-store:**
- Quiz title, description
- Questions with answer options
- Correct answers

**Kinsa ang mag-access:**
- Student: basaha quiz to answer
- Instructor: create/edit quizzes
- Admin: basaha all quizzes

---

# Collection 5: **quiz_submissions**
## Para sa student quiz answers and scores

### Example:
```json
{
  "id": "submission-1234567890",
  "quizId": "quiz-1234567890",
  "moduleId": "m1-mission1",
  "studentId": "student-alex",
  "studentName": "Kevin Caidic",
  "answers": [
    "Global Positioning System",
    "False",
    "knot"
  ],
  "score": 66,
  "totalQuestions": 3,
  "correctAnswers": 2,
  "validation": [true, true, false],
  "status": "graded",
  "feedback": "Good work! Review ship speed units.",
  "submittedAt": "2026-01-15T10:15:00Z",
  "gradedAt": "2026-01-15T10:20:00Z",
  "gradedBy": "instructor-helen"
}
```

**Unsa ang gi-store:**
- Student's answers
- Score (percentage)
- Which questions are correct/wrong
- Instructor feedback

**Kinsa ang mag-access:**
- Student: basaha own submissions
- Instructor: basaha student submissions, add feedback
- Admin: basaha all submissions for reports

---

# 📊 Summary Table

| Collection | Gi-store | Kinsa mag-create | Kinsa mag-read |
|------------|----------|------------------|----------------|
| **users** | Student/Instructor/Admin profiles | Admin/Instructor | Self, Instructor, Admin |
| **training_modules** | Missions | Instructor, Admin | All |
| **mission_attempts** | Performance results | Auto (after mission) | Student (self), Instructor, Admin |
| **quizzes** | Quiz questions | Instructor | All |
| **quiz_submissions** | Quiz answers & scores | Auto (after quiz) | Student (self), Instructor, Admin |

---

# 🔗 How They Connect

```
users (student)
  ↓
mission_attempts (student attempts mission)
  ↓
training_modules (which mission)

users (student)
  ↓
quiz_submissions (student answers quiz)
  ↓
quizzes (which quiz)
  ↓
training_modules (quiz para sa which mission)
```

---

# ✅ Checklist for Setup

Para ma-setup ang database:

1. **Create users collection**
   - Add sample student
   - Add sample instructor
   - Add admin account

2. **Create training_modules collection**
   - Add Mission 1
   - Add Mission 2

3. **Create mission_attempts collection**
   - (Empty for now - mag-populate after students complete missions)

4. **Create quizzes collection**
   - Add sample quiz for Mission 1

5. **Create quiz_submissions collection**
   - (Empty for now - mag-populate after students take quizzes)

---

Ready to create! 🚀
