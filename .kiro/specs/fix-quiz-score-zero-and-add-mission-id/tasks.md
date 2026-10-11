# Implementation Plan: Fix Quiz Score Field and Add Mission Context

## Overview

This plan implements the fix for the quiz_score field bug (storing percentage instead of raw correct count) and adds mission/module context capture. The implementation modifies both frontend (App.vue) and backend (quiz_scores.js) to properly capture and store raw correct answer counts along with mission_id and module_id fields.

## Tasks

- [x] 1. Update backend quiz_scores.js POST endpoint
  - [x] 1.1 Add quiz_score field extraction and validation in POST endpoint
    - Extract quiz_score, mission_id, module_id from request body
    - Add validation: quiz_score must be non-negative integer
    - Add validation: quiz_score must not exceed totalQuestions
    - Update required field check to include quiz_score
    - Store quiz_score, mission_id, module_id in Firestore document
    - _Requirements: 1.2, 1.3, 1.4, 2.3, 3.3, 4.1, 4.2, 4.3, 4.4, 4.6_
  
  - [x] 1.2 Update error handling for quiz_score validation
    - Return 400 Bad Request if quiz_score is missing
    - Return 400 Bad Request if quiz_score is negative or non-integer
    - Return 400 Bad Request if quiz_score exceeds totalQuestions with descriptive messages
    - _Requirements: 4.3, 4.4, 4.5, 4.6_
  
  - [x] 1.3 Update console logging to show raw score
    - Modify success log to include raw score: "Raw ${quiz_score}/${totalQuestions}"
    - _Requirements: 1.2_

- [x] 2. Update frontend App.vue submitQuizSession function
  - [x] 2.1 Add mission and module context capture
    - Capture mission_id from activeMission.value?.id before API call
    - Capture module_id from activeTrainingModule.value?.id before API call
    - Set to null if not available using optional chaining
    - _Requirements: 2.1, 2.2, 3.1, 3.2_
  
  - [x] 2.2 Add quiz_score field to API payload
    - Add quiz_score field to quizScoreData object with value of correctCount
    - Add mission_id field to quizScoreData object
    - Add module_id field to quizScoreData object
    - Ensure score field continues to store percentage (0-100)
    - Ensure correctAnswers field is preserved for backwards compatibility
    - _Requirements: 1.1, 1.5, 1.6, 2.2, 3.2, 4.1, 5.5_

- [x] 3. Checkpoint - Verify basic functionality
  - Test quiz submission with valid quiz_score field
  - Verify Firestore document contains correct quiz_score value
  - Ensure all tests pass, ask the user if questions arise

- [ ]* 4. Write integration tests for backend validation
  - [ ]* 4.1 Test POST with valid quiz_score
    - Send POST request with quiz_score: 8, totalQuestions: 10
    - Verify 201 response with correct data
    - _Requirements: 1.2, 4.3, 4.4_
  
  - [ ]* 4.2 Test POST without quiz_score field
    - Send POST request missing quiz_score field
    - Verify 400 Bad Request response
    - _Requirements: 4.6_
  
  - [ ]* 4.3 Test POST with negative quiz_score
    - Send POST request with quiz_score: -5
    - Verify 400 Bad Request with message "quiz_score must be a non-negative integer"
    - _Requirements: 4.3_
  
  - [ ]* 4.4 Test POST with quiz_score exceeding totalQuestions
    - Send POST request with quiz_score: 15, totalQuestions: 10
    - Verify 400 Bad Request with message "quiz_score cannot exceed totalQuestions"
    - _Requirements: 4.4, 4.5_
  
  - [ ]* 4.5 Test POST with mission_id and module_id
    - Send POST request with mission_id and module_id present
    - Verify fields stored in Firestore document
    - _Requirements: 2.3, 3.3, 4.1_
  
  - [ ]* 4.6 Test POST without mission_id and module_id
    - Send POST request with mission_id and module_id null or omitted
    - Verify null values stored or fields omitted
    - _Requirements: 2.4, 3.4_

- [ ]* 5. Write integration tests for backwards compatibility
  - [ ]* 5.1 Test GET request returns mission_id and module_id fields
    - Query quiz scores with new schema via GET endpoint
    - Verify response includes mission_id and module_id fields
    - _Requirements: 2.5_
  
  - [ ]* 5.2 Test legacy document retrieval
    - Query quiz score document without mission_id/module_id fields
    - Verify no errors and graceful handling
    - _Requirements: 5.1, 5.2_
  
  - [ ]* 5.3 Test mixed legacy and new documents
    - Query collection containing both legacy and new schema documents
    - Verify all documents retrieved without errors
    - _Requirements: 5.3, 5.4_

- [ ] 6. Final checkpoint - End-to-end verification
  - Submit quiz through frontend from mission context
  - Verify Firestore document contains quiz_score, mission_id, module_id
  - Submit quiz outside mission context
  - Verify mission_id and module_id are null
  - Calculate quiz statistics including both legacy and new documents
  - Ensure all tests pass, ask the user if questions arise

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- The quiz_score field stores raw correct answer count (e.g., 5 out of 10)
- The score field continues to store percentage (e.g., 50 for 50%)
- No database migration required - this is backwards compatible
- Backend validation prevents invalid quiz_score values
- Frontend uses optional chaining to handle missing mission/module context
- All existing fields (score, correctAnswers, passed, totalQuestions) preserved

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2", "1.3"] },
    { "id": 1, "tasks": ["2.1", "2.2"] },
    { "id": 2, "tasks": ["4.1", "4.2", "4.3", "4.4", "4.5", "4.6"] },
    { "id": 3, "tasks": ["5.1", "5.2", "5.3"] }
  ]
}
```
