# 🎯 FINAL FIRESTORE COLLECTIONS
## Based sa Actual Firebase Console Screenshots

---

## Collection 1: `training_module`
**Para sa Mission details ug steps**

### Document Structure:
```json
{
  "boatType": "medium",
  "completed": false,
  "createdAt": "July 5, 2026 at 12:00:00 AM UTC+8",
  "createdBy": "",
  "description": "Learn to navigate using GPS",
  "difficulty": "Beginner",
  "estimated_duration": "5-10 minutes",
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
    },
    {
      "instruction": "Steer heading 180°",
      "waypointZone": "m1-step-2",
      "type": "compass",
      "lat": "",
      "lon": "",
      "heading": "180"
    },
    {
      "instruction": "Return to dock",
      "waypointZone": "m1-dock",
      "type": "dock",
      "lat": "",
      "lon": "",
      "heading": ""
    }
  ],
  "title": "Mission 1: Basic Navigation",
  "updatedAt": "July 6, 2026 at 12:00:00 AM UTC+8"
}
```

---

## Collection 2: `quiz`
**Para sa Quiz questions (separate from mission)**

### Document Structure:
```json
{
  "title": "Navigation Basics Quiz",
  "description": "Test your understanding of GPS navigation",
  "moduleId": "IYZy5HL4BwSURY5QdvjC",
  "questions": [
    {
      "prompt": "What does GPS stand for?",
      "type": "multiple-choice",
      "options": [
        {
          "text": "Global Positioning System",
          "isCorrect": true
        },
        {
          "text": "General Position System",
          "isCorrect": false
        },
        {
          "text": "Global Position Signal",
          "isCorrect": false
        }
      ],
      "correctAnswer": "Global Positioning System"
    },
    {
      "prompt": "A compass always points to the North Pole",
      "type": "true-false",
      "options": [],
      "correctAnswer": "False"
    },
    {
      "prompt": "The unit of speed used by ships is called a ____",
      "type": "fill-in-the-blank",
      "options": [],
      "correctAnswer": "knot"
    }
  ],
  "createdBy": "instructor-helen",
  "createdAt": "July 5, 2026 at 12:00:00 AM UTC+8"
}
```

---

## 🔗 How They Connect:

```
training_module (Mission)
    ↓
quiz.moduleId → training_module.id (document ID)
```

**Example:**
- Mission ID: `IYZy5HL4BwSURY5QdvjC`
- Quiz document has: `"moduleId": "IYZy5HL4BwSURY5QdvjC"`

---

## 📊 Complete Collections List:

### 1. `training_module`
- Mission details
- Steps/waypoints
- Objectives
- Boat type, difficulty, duration

### 2. `quiz`
- Quiz title & description
- Questions array
- Links to mission via `moduleId`

### 3. `users`
- Students, instructors, admins
- Student profiles with XP, badges, certificates

### 4. `quiz_submissions` (future)
- Student quiz answers
- Scores

### 5. `mission_attempts` (future)
- Student mission results
- Performance metrics

---

## ✅ Summary

**Instructor creates mission:**
- Saves to `training_module` collection
- Mission details + steps

**Instructor creates quiz for that mission:**
- Saves to `quiz` collection
- Quiz links to mission via `moduleId` field

**Benefit:** Quiz is optional - not all missions need quizzes!
