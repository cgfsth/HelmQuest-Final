# 🧭 MISSIONS COLLECTION (WITH QUIZ)
## Training Modules with Post-Docking Quiz

---

## Collection Name: `training_modules`

---

## 📄 Complete Mission Document (WITH Quiz)

```json
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
  
  // POST-DOCKING QUIZ (shown after student completes mission)
  "quiz": {
    "enabled": true,
    "id": "quiz-m1-mission1",
    "title": "Mission 1 Assessment",
    "description": "Test your understanding of basic navigation",
    "questions": [
      {
        "prompt": "What does GPS stand for?",
        "type": "multiple-choice",
        "options": [
          { "text": "Global Positioning System", "isCorrect": true },
          { "text": "General Position System", "isCorrect": false },
          { "text": "Global Position Signal", "isCorrect": false }
        ],
        "correctAnswer": "Global Positioning System"
      },
      {
        "prompt": "When returning to dock, you should reduce speed",
        "type": "true-false",
        "options": [],
        "correctAnswer": "True"
      },
      {
        "prompt": "The unit of speed used by ships is called a ____",
        "type": "fill-in-the-blank",
        "options": [],
        "correctAnswer": "knot"
      }
    ]
  },
  
  "completed": false,
  "disableFishing": true,
  "createdBy": "instructor-helen",
  "createdAt": "2026-01-15T09:00:00Z",
  "updatedAt": "2026-01-15T09:00:00Z"
}
```

---

## 📋 Quiz Field Breakdown

### Quiz Object Structure:
```json
"quiz": {
  "enabled": true,              // true = show quiz after mission, false = no quiz
  "id": "quiz-m1-mission1",     // Unique quiz ID
  "title": "Mission 1 Assessment",
  "description": "Test your understanding",
  "questions": [ /* array of questions */ ]
}
```

### Question Types:

#### 1. Multiple Choice
```json
{
  "prompt": "What does GPS stand for?",
  "type": "multiple-choice",
  "options": [
    { "text": "Global Positioning System", "isCorrect": true },
    { "text": "General Position System", "isCorrect": false },
    { "text": "Global Position Signal", "isCorrect": false }
  ],
  "correctAnswer": "Global Positioning System"
}
```

#### 2. True/False
```json
{
  "prompt": "A compass always points to the North Pole",
  "type": "true-false",
  "options": [],
  "correctAnswer": "False"
}
```

#### 3. Fill in the Blank
```json
{
  "prompt": "The unit of speed used by ships is called a ____",
  "type": "fill-in-the-blank",
  "options": [],
  "correctAnswer": "knot"
}
```

---

## 🎯 Mission WITHOUT Quiz

If instructor doesn't want a quiz, set `enabled: false`:

```json
{
  "id": "m1-mission2",
  "title": "Mission 2: Free Navigation Practice",
  "category": "Module 1",
  // ... other fields ...
  
  "quiz": {
    "enabled": false,           // No quiz!
    "id": null,
    "title": "",
    "description": "",
    "questions": []
  },
  
  "createdBy": "instructor-helen"
}
```

---

## 📊 Complete Field Reference

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | ✅ | Mission ID |
| `title` | string | ✅ | Mission name |
| `category` | string | ✅ | Module grouping |
| `description` | string | ✅ | What student learns |
| `difficulty` | string | ✅ | Beginner/Intermediate/Advanced |
| `duration` | string | ✅ | Estimated time |
| `reward` | string | ✅ | XP points earned |
| `boatType` | string | ✅ | small/medium/large |
| `objectives` | array | ✅ | Learning goals |
| `steps` | array | ✅ | Waypoints |
| **`quiz`** | **object** | ✅ | **Post-docking quiz** |
| `quiz.enabled` | boolean | ✅ | Show quiz or not |
| `quiz.id` | string | ⚪ | Quiz identifier |
| `quiz.title` | string | ⚪ | Quiz title |
| `quiz.description` | string | ⚪ | Quiz description |
| `quiz.questions` | array | ⚪ | Quiz questions |
| `completed` | boolean | ✅ | Mission status |
| `disableFishing` | boolean | ✅ | Disable fishing during mission |
| `createdBy` | string | ✅ | Instructor ID |
| `createdAt` | string | ✅ | Creation timestamp |
| `updatedAt` | string | ⚪ | Last update timestamp |

---

## 🔄 When Instructor Creates Mission with Quiz

**UI Flow:**
1. Instructor fills mission details
2. Instructor enables "Post-Docking Quiz"
3. Instructor adds questions (multiple choice, true/false, fill-in)
4. Instructor saves mission

**Database Operation:**
```javascript
POST /api/v1/modules

Body includes complete mission object with quiz
```

**What happens after student completes mission:**
1. Student docks at harbor
2. Quiz modal appears automatically
3. Student answers questions
4. Results saved to `quiz_submissions` collection
5. Student sees score

---

## ✅ Summary

**Mission document includes:**
- ✅ Mission details (title, steps, objectives)
- ✅ Quiz object (embedded in mission)
- ✅ Quiz questions (all types supported)

**Benefits of embedded quiz:**
- Simpler structure (no separate quiz collection needed)
- Quiz is tied to specific mission
- Easy to manage in mission editor

Ready to use! 🚀
