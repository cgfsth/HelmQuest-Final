# Requirements: Quiz Firestore Integration

## Problem Statement

Quiz data is currently only saving to localStorage but NOT to the Firestore `quiz` collection. Missions save correctly to `training_module` collection, but quizzes need to also save as separate documents in the `quiz` collection with proper fields matching the database structure.

## Expected Database Structure

Based on `FINAL_COLLECTIONS_STRUCTURE.md`, the `quiz` collection should have:

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
        }
      ],
      "correctAnswer": "Global Positioning System"
    }
  ],
  "createdBy": "instructor-helen",
  "createdAt": "July 5, 2026 at 12:00:00 AM UTC+8"
}
```

## Requirements

### Requirement 1: Quiz Creation with Firestore

**User Story:** As an instructor, when I create a quiz from the mission editor or quiz manager, the quiz data should save to the Firestore `quiz` collection with all required fields.

**Acceptance Criteria:**
1. WHEN an instructor creates a new quiz, the system SHALL save it to Firestore `quiz` collection
2. The quiz document SHALL include `title`, `description`, `moduleId`, `questions`, `createdBy`, and `createdAt` fields
3. The `moduleId` field SHALL link to the `training_module` document ID
4. The system SHALL use `window.firebaseApi.createQuiz()` for new quizzes
5. IF the Firestore save fails, the system SHALL fall back to localStorage only
6. The system SHALL display a success confirmation after saving

### Requirement 2: Quiz Update with Firestore

**User Story:** As an instructor, when I edit an existing quiz, the changes should update the Firestore document.

**Acceptance Criteria:**
1. WHEN an instructor edits a quiz, the system SHALL update the Firestore document using `window.firebaseApi.updateQuiz()`
2. The update SHALL preserve the original `id`, `createdAt`, and `createdBy` fields
3. The system SHALL add an `updatedAt` timestamp
4. IF the Firestore update fails, the system SHALL fall back to localStorage only

### Requirement 3: Mission Quiz Integration

**User Story:** As an instructor, when I enable a quiz in the mission editor, the quiz should save to both localStorage and Firestore.

**Acceptance Criteria:**
1. WHEN an instructor saves a mission with an enabled quiz, the `persistMissionQuiz()` function SHALL call the Firestore API
2. The quiz SHALL save to the `quiz` collection with `moduleId` matching the mission ID
3. The system SHALL handle both create and update scenarios
4. The system SHALL maintain localStorage as backup/fallback storage

## API Endpoints (Already Implemented)

- `POST /api/v1/quizzes` - Create new quiz (handled by `window.firebaseApi.createQuiz()`)
- `PUT /api/v1/quizzes/:quizId` - Update quiz (handled by `window.firebaseApi.updateQuiz()`)

## Files to Modify

1. `src/App.vue`:
   - `saveQuiz()` function (~line 6638)
   - `persistMissionQuiz()` function (~line 7986)

## Success Criteria

- ✅ Quiz data appears in Firestore `quiz` collection with all required fields
- ✅ `moduleId` field correctly links to mission ID
- ✅ Both standalone quizzes (from quiz manager) and mission quizzes save to Firestore
- ✅ Fallback to localStorage works when backend is offline
