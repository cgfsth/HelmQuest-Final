# Requirements Document: Mission Deletion Quiz Score Cleanup

## Introduction

This bugfix addresses a data integrity issue where quiz scores remain in Firestore after an instructor deletes a mission. When a mission is deleted, its associated quiz and quiz submissions are properly removed, but quiz scores in the `quiz_score` collection are left orphaned. This creates referential integrity problems and data pollution in the database.

The fix adds a new backend endpoint to delete quiz scores by quizId and integrates this deletion into the existing mission deletion workflow in the frontend.

## Glossary

- **Mission**: A training module or lesson that students complete, which may have an associated quiz
- **Quiz**: An assessment associated with a mission, containing multiple-choice questions
- **Quiz_Submission**: A collection storing student answers to quiz questions
- **Quiz_Score**: A collection storing the calculated score and pass/fail status after a quiz is graded
- **Mission_Score**: A collection storing completion scores for missions
- **Orphaned_Quiz**: A quiz that was assigned to a deleted mission
- **Backend_API**: Express.js server running on port 3001
- **Frontend_API**: JavaScript API client in `firebaseApi.js`
- **Firestore**: NoSQL document database storing all application data
- **Batch_Operation**: Firestore operation that executes multiple writes atomically

## Requirements

### Requirement 1: Delete Quiz Scores by Quiz ID

**User Story:** As a system, I want to delete all quiz scores for a specific quiz when requested, so that orphaned quiz score records do not remain in the database after quiz deletion.

#### Acceptance Criteria

1. WHEN a DELETE request is sent to `/api/v1/quizzes/:quizId/scores`, THE Backend_API SHALL query the `quiz_score` collection for all documents where `quizId` matches the parameter
2. WHEN quiz score documents are found for a quizId, THE Backend_API SHALL delete all matching documents using a Firestore batch operation
3. WHEN the batch deletion completes successfully, THE Backend_API SHALL return a JSON response with status 200 containing a success message and the count of deleted documents
4. IF an error occurs during quiz score deletion, THEN THE Backend_API SHALL return a JSON response with status 500 containing an error message
5. WHEN the batch deletion completes, THE Backend_API SHALL log the count of deleted quiz score documents to the console

### Requirement 2: Integrate Quiz Score Deletion into Mission Deletion Flow

**User Story:** As an instructor, I want quiz scores to be automatically deleted when I delete a mission, so that no orphaned quiz score data remains in the database.

#### Acceptance Criteria

1. WHEN an instructor confirms mission deletion, THE Frontend_API SHALL identify all orphaned quizzes associated with the mission
2. WHEN orphaned quizzes are identified, THE Frontend_API SHALL call `deleteQuizScores(quizId)` for each orphaned quiz after deleting submissions and before deleting the quiz document
3. WHEN `deleteQuizScores` is called, THE Frontend_API SHALL send a DELETE request to `/api/v1/quizzes/:quizId/scores`
4. WHEN quiz score deletion succeeds, THE Frontend_API SHALL log a success message to the console with the quiz ID
5. IF quiz score deletion fails for any quiz, THEN THE Frontend_API SHALL log a warning but continue processing remaining quizzes

### Requirement 3: Error Handling and Logging

**User Story:** As a developer, I want comprehensive error handling and logging during quiz score deletion, so that I can diagnose issues and ensure data integrity.

#### Acceptance Criteria

1. IF quiz score deletion fails for one orphaned quiz, THEN THE Frontend_API SHALL catch the error, log a warning, and continue deleting scores for remaining orphaned quizzes
2. WHEN quiz scores are deleted successfully, THE Backend_API SHALL log the operation with emoji indicators (🗑️ for start, ✅ for success)
3. WHEN quiz scores are deleted successfully, THE Frontend_API SHALL log success with emoji indicators (✅) including the quiz ID
4. IF quiz score deletion fails, THEN THE Backend_API SHALL log the full error to the console with emoji indicator (❌)
5. IF quiz score deletion fails, THEN THE Frontend_API SHALL log a warning with emoji indicator (⚠️) but not throw an error that halts mission deletion

### Requirement 4: API Client Function for Quiz Score Deletion

**User Story:** As a frontend developer, I want a dedicated API function to delete quiz scores, so that I can easily integrate quiz score deletion into the mission deletion workflow.

#### Acceptance Criteria

1. THE Frontend_API SHALL provide an exported function `deleteQuizScores(quizId)` in `firebaseApi.js`
2. WHEN `deleteQuizScores` is called with a quizId, THE Frontend_API SHALL use the `apiFetch` wrapper to send a DELETE request to `/api/v1/quizzes/:quizId/scores`
3. WHEN the DELETE request succeeds, THE Frontend_API SHALL return a Promise that resolves to the parsed JSON response
4. IF the DELETE request fails, THEN THE Frontend_API SHALL throw an error with the failure message
5. THE Frontend_API SHALL include `deleteQuizScores` in the firebaseApi module exports so it is accessible via `window.firebaseApi`

### Requirement 5: Deletion Order and Data Integrity

**User Story:** As a system administrator, I want quiz-related data to be deleted in the correct order during mission deletion, so that referential integrity is maintained throughout the deletion process.

#### Acceptance Criteria

1. WHEN an orphaned quiz is being cleaned up, THE Frontend_API SHALL delete quiz submissions first using `deleteQuizSubmissions(quizId)`
2. WHEN quiz submissions are deleted successfully, THE Frontend_API SHALL delete quiz scores using `deleteQuizScores(quizId)`
3. WHEN quiz scores are deleted successfully, THE Frontend_API SHALL delete the quiz document using `deleteQuiz(quizId)`
4. WHEN all orphaned quizzes are processed, THE Frontend_API SHALL delete mission scores using `deleteMissionScores(missionId)`
5. WHEN mission scores are deleted successfully, THE Frontend_API SHALL delete the mission document using `deleteMission(missionId)`
