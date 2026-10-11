# Implementation Tasks: Quiz Firestore Integration

## Overview

This implementation adds Firestore persistence for quiz data by updating the `saveQuiz()` and `persistMissionQuiz()` functions in App.vue to call the Firebase REST API. The existing localStorage persistence will be kept as a fallback.

## Tasks

- [x] 1. Update saveQuiz() function to call Firestore API
  - [x] 1.1 Add Firestore API call after localStorage save
    - Import `createQuiz` and `updateQuiz` from firebaseApi at the top of script section
    - After successful localStorage save in `saveQuiz()`, add try-catch block to call Firestore API
    - For new quizzes: call `await window.firebaseApi.createQuiz()` with quiz data including `moduleId`, `createdBy`, `createdAt`
    - For updates: call `await window.firebaseApi.updateQuiz(quiz.id, quizData)` with `updatedAt` timestamp
    - Map localStorage quiz format to Firestore format (ensure `moduleId`, `createdBy`, `createdAt` fields are included)
    - If Firestore call fails, log error but don't fail the operation (localStorage is fallback)
    - Display success message after Firestore save completes
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 2.1, 2.2, 2.3_

- [x] 2. Update persistMissionQuiz() function to call Firestore API
  - [x] 2.1 Add Firestore API call for mission quiz persistence
    - After building the quiz object in `persistMissionQuiz()`, add try-catch block for Firestore API
    - For existing quiz (update): call `await window.firebaseApi.updateQuiz(quizId, quizData)` with `moduleId`, `updatedAt`
    - For new quiz: call `await window.firebaseApi.createQuiz(quizData)` with `moduleId`, `createdBy`, `createdAt`
    - Ensure `moduleId` field is set to the mission's document ID
    - Map internal quiz format to Firestore format with required fields: `title`, `description`, `moduleId`, `questions`, `createdBy`, `createdAt`
    - If Firestore call fails, log warning but continue (localStorage persists regardless)
    - _Requirements: 3.1, 3.2, 3.3, 3.4_

- [x] 3. Test quiz creation from mission editor
  - [x] 3.1 Manual testing of mission quiz creation
    - Open instructor console and create a new mission
    - Enable the quiz toggle in mission editor
    - Add quiz title, description, and at least one question
    - Save the mission
    - Verify quiz document appears in Firestore `quiz` collection with `moduleId` matching mission ID
    - Verify all required fields are present: `title`, `description`, `moduleId`, `questions`, `createdBy`, `createdAt`
    - _Requirements: 3.1, 3.2_

- [x] 4. Test standalone quiz creation from quiz manager
  - [x] 4.1 Manual testing of quiz manager workflow
    - Open quiz manager for a module
    - Create a new quiz with title, description, and questions
    - Save the quiz
    - Verify quiz document appears in Firestore `quiz` collection
    - Verify `moduleId` field links to the correct module
    - Verify `createdBy` and `createdAt` fields are populated
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.6_

- [x] 5. Test quiz update workflow
  - [x] 5.1 Manual testing of quiz editing
    - Edit an existing quiz from quiz manager
    - Modify title, description, or questions
    - Save the changes
    - Verify Firestore document updates with new data
    - Verify `updatedAt` timestamp is added
    - Verify original `createdAt` and `createdBy` fields are preserved
    - _Requirements: 2.1, 2.2, 2.3_

- [x] 6. Test fallback behavior when backend is offline
  - [x] 6.1 Test offline fallback
    - Stop the backend server (Ctrl+C on `npm run dev` in backend folder)
    - Create or edit a quiz from the frontend
    - Verify quiz saves to localStorage successfully
    - Verify error is logged in console but operation completes
    - Restart backend and verify quiz can be manually synced later
    - _Requirements: 1.5, 3.4_

## Notes

- The Firebase REST API functions are already implemented in `src/api/firebaseApi.js`
- The backend routes in `backend/routes/quizzes.js` already use the correct `quiz` collection name
- Keep localStorage as primary storage for now; Firestore is secondary backup
- Use `window.firebaseApi.*` to access API functions from App.vue
- The `moduleId` field is critical for linking quizzes to missions - verify this in testing
- All tasks are non-optional and should be completed for full integration

## Success Criteria

1. Quiz data appears in Firestore `quiz` collection after creation
2. All required fields are present: `title`, `description`, `moduleId`, `questions`, `createdBy`, `createdAt`
3. Quiz updates modify the Firestore document correctly
4. Both mission editor quizzes and standalone quizzes save to Firestore
5. System gracefully falls back to localStorage if backend is offline
