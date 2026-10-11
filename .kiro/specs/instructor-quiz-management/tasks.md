# Implementation Plan: Instructor Quiz Management System

## Overview

This implementation plan converts the Instructor Quiz Management System design into actionable coding tasks. The system extends HelmQuest's existing Vue.js instructor console and student training hub with comprehensive quiz/assessment capabilities, including quiz authoring, assignment, student submission, and instructor grading with automated validation.

The implementation follows 8 phases as outlined in the design document, building incrementally from data models through to final polish and testing.

## Tasks

- [x] 1. Phase 1: Data Models and Storage (Foundation)
  - [x] 1.1 Implement quiz data initialization in App.vue
    - Add `ensureQuizData()` function to initialize `quizzes`, `quizAssignments`, `quizSubmissions`, and `quizResults` arrays in progressData if missing
    - Call `ensureQuizData()` in existing `loadProgress()` workflow after progressData is loaded
    - Add TypeScript-style JSDoc comments for Quiz, Question, QuizAssignment, QuizSubmission, and QuizResult interfaces
    - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5, 11.6_
  
  - [ ]* 1.2 Write unit tests for data initialization
    - Test `ensureQuizData()` initializes missing fields without overwriting existing data
    - Test localStorage persistence roundtrip (save/load)
    - Test that existing progressData fields are preserved
    - _Requirements: 11.6_

- [x] 2. Phase 2: Instructor Quiz Management (CRUD)
  - [x] 2.1 Create reactive state for quiz management UI
    - Add `quizEditorModal` ref for quiz creation/editing modal state
    - Add computed property `quizzes` to access `progressData.value.quizzes`
    - _Requirements: 1.1, 2.1_
  
  - [x] 2.2 Implement quiz CRUD functions
    - Write `createNewQuiz()` to initialize new quiz object with unique ID and open editor modal
    - Write `saveQuiz()` to persist quiz to progressData and close modal
    - Write `editQuiz(quiz)` to load quiz into editor modal for editing
    - Write `deleteQuiz(quiz)` with confirmation dialog, removing quiz and assignments
    - Write `addQuestion()` to append new question to quiz with proper order indexing
    - Write `deleteQuestion(index)` to remove question and re-index remaining questions
    - Write `resetAnswers(question)` to reset answer options when question type changes
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 1.9, 1.10, 1.11, 1.12, 1.14, 1.15, 1.16, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 2.9, 2.10, 2.11, 2.12, 2.13, 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_
  
  - [x] 2.3 Build quiz management panel UI in instructor console
    - Add quiz management section to instructor console (after existing panels)
    - Display list of all quizzes with title, description, and question count
    - Add "Create Quiz", "Edit", "Delete", and "Assign" buttons for each quiz
    - Follow existing `.instructor-panel` and `.instructor-stat-card` CSS patterns
    - _Requirements: 1.1, 2.1, 3.1, 12.1_
  
  - [x] 2.4 Build quiz editor modal UI
    - Create overlay modal with glass-card styling (similar to existing modals)
    - Add form fields for quiz title and description
    - Add questions section with dynamic list of question editors
    - Implement question type selector (multiple-choice, true-false, fill-in-the-blank)
    - Implement dynamic answer options editor based on question type
    - Add "Add Question" and "Remove Question" buttons
    - Add "Save" and "Cancel" buttons with proper event handlers
    - _Requirements: 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 1.9, 1.10, 1.11, 1.13, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 2.9, 2.10, 2.11_
  
  - [ ]* 2.5 Write unit tests for quiz CRUD operations
    - Test quiz creation with valid data creates correct structure with ID and timestamps
    - Test editing quiz preserves ID and updates `updatedAt` timestamp
    - Test deleting quiz removes quiz and assignments but preserves submissions
    - Test adding question increments order correctly
    - Test removing question re-indexes remaining questions
    - Test `resetAnswers()` clears options correctly based on question type
    - _Requirements: 1.1, 1.15, 1.16, 2.12, 2.13, 3.3, 3.4_

- [x] 3. Checkpoint - Verify quiz management functionality
  - Ensure all tests pass, manually test quiz creation/editing/deletion flows, ask the user if questions arise.

- [x] 4. Phase 3: Quiz Assignment System
  - [-] 4.1 Create reactive state for quiz assignment UI
    - Add `quizAssignmentModal` ref for assignment modal state
    - Add computed property `availableTargets` to list modules/missions based on selected target type
    - Add computed property `currentAssignments` to display existing assignments for selected quiz
    - _Requirements: 4.1, 4.2_
  
  - [ ] 4.2 Implement quiz assignment functions
    - Write `openQuizAssignments(quiz)` to open assignment modal and load current assignments
    - Write `createAssignment()` to create quiz-to-module/mission link with duplicate detection
    - Write `removeAssignment(assignmentId)` to remove assignment and refresh list
    - Write `loadCurrentAssignments()` to fetch and enrich assignments with target titles
    - Write `getAssignedQuizzes(targetId)` to filter quizzes for a specific module/mission
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7_
  
  - [~] 4.3 Build quiz assignment modal UI
    - Create overlay modal with target type selector (module/mission)
    - Add target ID dropdown populated from `availableTargets`
    - Display current assignments list with remove buttons
    - Add "Assign" button to create new assignment
    - Add "Close" button to dismiss modal
    - _Requirements: 4.1, 4.2, 4.5, 4.6_
  
  - [~] 4.4 Integrate assigned quizzes into student training hub
    - Add quiz display section to each training module card
    - Display quiz title, status badge, and action buttons ("Take Quiz" or "View Results")
    - Use `getAssignedQuizzes(module.id)` to retrieve quizzes for each module
    - Style quiz badges following existing card patterns
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.8, 12.2_
  
  - [ ]* 4.5 Write unit tests for quiz assignment logic
    - Test creating assignment links quiz to module/mission with correct IDs
    - Test duplicate assignment detection prevents duplicate records
    - Test removing assignment cleans up without affecting other assignments
    - Test `getAssignedQuizzes()` filters by targetId correctly
    - _Requirements: 4.1, 4.2, 4.7_

- [ ] 5. Phase 4: Student Quiz Taking
  - [~] 5.1 Create reactive state for quiz-taking UI
    - Add `activeQuizSession` ref to track current quiz attempt, answers array, and start time
    - Add computed property `allQuestionsAnswered` to check if all answers are filled
    - _Requirements: 6.6, 6.8_
  
  - [~] 5.2 Implement quiz status and access functions
    - Write `getQuizStatusLabel(quizId)` to return "Not Started", "Pending Review", or "Graded: X%"
    - Write `getQuizStatusClass(quizId)` to return CSS class for status badge styling
    - Write `canTakeQuiz(quizId)` to check if student can start or retake quiz
    - Write `isQuizGraded(quizId)` to check if result exists for student's submission
    - Write `startQuiz(quiz)` to initialize `activeQuizSession` with empty answers array
    - _Requirements: 5.4, 5.5, 5.6, 5.7, 5.8_
  
  - [~] 5.3 Implement quiz submission functions
    - Write `submitQuiz()` to create or update submission record, set status to "pending", persist to progressData
    - Write `cancelQuiz()` with confirmation dialog to close quiz without saving
    - Handle retake scenario: update existing submission and remove old result
    - _Requirements: 6.9, 6.10, 6.11, 6.12, 6.13_
  
  - [~] 5.4 Build quiz-taking interface UI
    - Create full-screen overlay with quiz title and description header
    - Render all questions with proper input controls based on question type:
      - Multiple-choice: radio buttons for options
      - True-false: radio buttons for True/False
      - Fill-in-the-blank: text input field
    - Disable submit button until `allQuestionsAnswered` is true
    - Add "Submit Quiz" and "Cancel" buttons
    - Display confirmation message after successful submission
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 6.8, 6.9, 6.12, 6.13_
  
  - [ ]* 5.5 Write unit tests for submission logic
    - Test submitting quiz creates submission record with all required fields
    - Test incomplete quiz detection works (empty answers array)
    - Test retake scenario updates existing submission and removes old result
    - Test quiz status calculation returns correct labels
    - _Requirements: 6.9, 6.10, 6.11_

- [~] 6. Checkpoint - Verify student quiz flow
  - Ensure all tests pass, manually test quiz assignment and student quiz-taking workflow, ask the user if questions arise.

- [ ] 7. Phase 5: Instructor Grading System
  - [~] 7.1 Create reactive state for submission review and grading
    - Add `submissionFilter` ref with fields for status, student, and quiz filters
    - Add computed property `filteredSubmissions` to filter submissions based on active filters
    - Add `gradingModal` ref to track submission being graded, validation array, and feedback
    - _Requirements: 7.3, 7.4, 7.5_
  
  - [~] 7.2 Implement automatic validation logic
    - Write `validateAnswer(question, studentAnswer)` function:
      - Multiple-choice: compare studentAnswer to `isCorrect` option text
      - True-false: compare to `correctAnswer` field
      - Fill-in-the-blank: case-insensitive trim and compare to `correctAnswer`
    - Write `calculateScore()` to compute percentage: `(correct / total) * 100`
    - _Requirements: 8.2, 8.3, 8.4, 8.5, 8.6, 8.7_
  
  - [~] 7.3 Implement grading workflow functions
    - Write `reviewSubmission(submission)` to open grading modal and pre-populate automatic validation
    - Write `submitGrading()` to create QuizResult record, update submission status to "graded", persist to progressData
    - Write `closeGrading()` to dismiss modal without saving
    - _Requirements: 7.6, 7.7, 7.8, 7.9, 8.1, 8.5, 8.8, 8.9, 8.10, 8.11, 8.12, 8.13_
  
  - [~] 7.4 Build submission review panel UI in instructor console
    - Add quiz submissions section to instructor console
    - Display list of submissions with student name, quiz title, submission date, and status
    - Add filter dropdowns for status, student, and quiz
    - Add "Review" button for each submission to open grading modal
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 12.1_
  
  - [~] 7.5 Build submission grading modal UI
    - Create overlay modal displaying submission metadata (student, quiz, timestamp)
    - Render all questions with student answers and correct answers side-by-side
    - Add checkbox for each question to mark as correct/incorrect (pre-checked based on automatic validation)
    - Display calculated score percentage that updates when validation checkboxes change
    - Add textarea for instructor feedback
    - Add "Save & Grade" and "Cancel" buttons
    - _Requirements: 7.6, 7.7, 7.8, 7.9, 8.1, 8.5, 8.6, 8.8, 8.13_
  
  - [ ]* 7.6 Write unit tests for validation and grading logic
    - Test multiple-choice validation compares student answer to `isCorrect` option
    - Test true-false validation compares to `correctAnswer` field
    - Test fill-in-the-blank validation with case-insensitive matching
    - Test score calculation formula: `(correct / total) * 100` rounds correctly
    - Test instructor override: manual validation flag overrides automatic result
    - _Requirements: 8.2, 8.3, 8.4, 8.5, 8.6, 8.7_

- [ ] 8. Phase 6: Results Display
  - [~] 8.1 Create reactive state for results display
    - Add `quizResultsModal` ref to track quiz results, validation breakdown, score, and feedback
    - Add computed property `canRetakeQuiz` to check if student can retake (always true for graded quizzes)
    - _Requirements: 9.1, 9.5, 9.6_
  
  - [~] 8.2 Implement results access functions
    - Write `viewQuizResults(quiz)` to load submission and result, populate `quizResultsModal`
    - Write `closeResults()` to dismiss results modal
    - Write `retakeQuiz()` to close results modal and call `startQuiz(quiz)`
    - _Requirements: 9.1, 9.5, 9.6, 9.8, 5.7_
  
  - [~] 8.3 Build quiz results modal UI for students
    - Create overlay modal with quiz title header
    - Display score percentage with pass/fail styling (70% threshold)
    - Display graded date and instructor feedback (if provided)
    - Render question breakdown: question prompt, student answer with correct/incorrect icon, correct answer reveal for incorrect answers
    - Add "Close" and "Retake Quiz" buttons
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 9.7, 9.8_
  
  - [ ]* 8.4 Write integration tests for results access
    - Test student sees results with correct score after instructor grades
    - Test correct/incorrect indicators display correctly
    - Test retake button creates new submission
    - _Requirements: 9.1, 9.6, 9.7_

- [ ] 9. Phase 7: Statistics and Reporting
  - [~] 9.1 Implement statistics calculation functions
    - Write computed property `quizzesWithStats` to calculate average score, submission count, and pending count for each quiz
    - Write `calculateQuestionStats(quiz)` to compute per-question correct percentage
    - Write `calculateStudentQuizAverages()` to compute average score and completed quiz count per student
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6_
  
  - [~] 9.2 Build quiz statistics panel UI in instructor console
    - Add quiz statistics section to instructor console
    - Display grid of quiz stat cards showing average score, submission count, and pending review count
    - Add "View Details" button to show per-question statistics
    - _Requirements: 10.1, 10.2, 10.3, 10.7_
  
  - [~] 9.3 Build per-question statistics display
    - Create modal or expandable section to show question-level breakdown
    - Display each question with correct percentage, correct count, and total attempts
    - _Requirements: 10.6, 10.7_
  
  - [~] 9.4 Build student average statistics display
    - Add section to instructor console showing student performance summary
    - Display student name, average quiz score, and completed quiz count
    - _Requirements: 10.4, 10.5, 10.7_
  
  - [ ]* 9.5 Write unit tests for statistics calculations
    - Test quiz average score calculation across all results
    - Test per-question statistics: percentage of students answering correctly
    - Test student average score across all quizzes
    - Test submission counts (total, pending, graded) are accurate
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6_

- [ ] 10. Phase 8: Polish and Testing
  - [~] 10.1 Add error handling and validation
    - Add validation for empty quiz title (display inline error, prevent save)
    - Add validation for multiple-choice questions with no correct answer (display error, prevent save)
    - Add validation for fill-in-the-blank with empty correct answer (display error, prevent save)
    - Add duplicate assignment detection with alert message
    - Add graceful handling for missing quiz/submission records
    - Add localStorage error handling with user-friendly messages
    - _Requirements: 1.2, 1.8, 1.11, 1.15, 4.7_
  
  - [~] 10.2 Add confirmation dialogs and user feedback
    - Add confirmation dialog for quiz deletion
    - Add confirmation dialog for quiz cancellation (student side)
    - Add success notifications for quiz save, assignment, submission, and grading
    - Add loading states for async operations (if applicable)
    - _Requirements: 1.16, 3.2, 6.12, 8.13_
  
  - [~] 10.3 Style and polish UI components
    - Ensure all quiz UI follows existing glass-card and panel styling
    - Add responsive design adjustments for mobile/tablet views
    - Add hover states and transitions for buttons and cards
    - Ensure accessibility: proper ARIA labels, keyboard navigation, focus indicators
    - _Requirements: 12.1, 12.2, 12.7_
  
  - [~] 10.4 Add question reordering functionality
    - Implement drag-and-drop or up/down arrow buttons to reorder questions
    - Update question `order` field when reordering
    - _Requirements: 1.14_
  
  - [ ]* 10.5 Write integration tests for end-to-end workflows
    - Test full lifecycle: instructor creates quiz → assigns to module → student sees in training hub
    - Test submission flow: student takes quiz → submits answers → submission appears in instructor console
    - Test grading flow: instructor grades submission → student sees results with correct score
    - Test retake flow: student retakes quiz → new submission created, old result removed
    - Test localStorage persistence: quiz data survives page reload
    - Test role-based access: instructor sees management panels, student sees quiz-taking UI
    - _Requirements: 5.1, 5.2, 5.3, 6.9, 6.13, 7.1, 8.12, 9.1, 9.2, 11.5, 12.3, 12.4, 12.5_
  
  - [ ]* 10.6 Perform comprehensive manual testing
    - Test all instructor workflows: create, edit, delete, assign quizzes
    - Test all student workflows: view, take, submit, view results, retake quizzes
    - Test edge cases: 20+ questions, special characters, whitespace, case sensitivity
    - Test error scenarios: empty fields, duplicate assignments, deleted quizzes with submissions
    - Test cross-browser compatibility (Chrome, Firefox, Edge, Safari)
    - Test responsive design on desktop, laptop, tablet, and mobile
    - _Requirements: All requirements_

- [~] 11. Final checkpoint - Verify complete system functionality
  - Ensure all tests pass, perform end-to-end manual testing of all workflows, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional test tasks and can be skipped for faster MVP
- Each task references specific requirements for traceability using requirement numbers from requirements.md
- Checkpoints ensure incremental validation and provide opportunities for user feedback
- The implementation uses JavaScript/Vue.js with Composition API as shown in the design document
- All quiz data is persisted to localStorage via the existing `progressData` mechanism
- UI components follow existing HelmQuest design patterns (glass-card, instructor-panel, etc.)
- No property-based testing tasks are included because this is a UI-centric CRUD feature without universal algorithmic properties
- Unit and integration tests focus on isolated function behavior and end-to-end data flows

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["1.2", "2.1"] },
    { "id": 2, "tasks": ["2.2", "2.3"] },
    { "id": 3, "tasks": ["2.4", "2.5"] },
    { "id": 4, "tasks": ["4.1", "4.2"] },
    { "id": 5, "tasks": ["4.3", "4.4", "4.5"] },
    { "id": 6, "tasks": ["5.1", "5.2"] },
    { "id": 7, "tasks": ["5.3", "5.4", "5.5"] },
    { "id": 8, "tasks": ["7.1", "7.2"] },
    { "id": 9, "tasks": ["7.3", "7.4"] },
    { "id": 10, "tasks": ["7.5", "7.6"] },
    { "id": 11, "tasks": ["8.1", "8.2"] },
    { "id": 12, "tasks": ["8.3", "8.4"] },
    { "id": 13, "tasks": ["9.1"] },
    { "id": 14, "tasks": ["9.2", "9.3", "9.4", "9.5"] },
    { "id": 15, "tasks": ["10.1", "10.2", "10.3", "10.4"] },
    { "id": 16, "tasks": ["10.5", "10.6"] }
  ]
}
```
