# Implementation Plan: Post-Docking Quiz System

## Overview

This implementation plan creates a post-docking quiz system that automatically presents students with training-related quiz questions after successfully anchoring the boat during training missions. The system integrates with the existing quiz management infrastructure and provides immediate feedback with score breakdown.

## Tasks

- [x] 1. Create PostDockingQuizModal Component
  - [x] 1.1 Create component file and basic structure
    - Create `src/components/PostDockingQuizModal.vue` file
    - Add modal wrapper with overlay backdrop
    - Implement quiz header (title, instructions)
    - Create scrollable questions container
    - Add submit button and close button
    - Style component to match HelmQuest blue theme
    - Add props: `quiz` (quiz object), `isVisible` (boolean)
    - Emit events: `close`, `submit` with answers payload
  
  - [x] 1.2 Implement question type rendering
    - Create question component wrapper with number and text display
    - Implement Multiple Choice renderer with radio button group
    - Implement True/False renderer with toggle buttons
    - Implement Fill in Blank renderer with text input
    - Add visual indication for answered/unanswered questions
    - Store selected answers in component reactive state

- [x] 2. Add Quiz Trigger Logic to Anchor Deployment
  - [x] 2.1 Integrate quiz trigger in animation loop
    - Locate anchor deployment milestone check in App.vue (line ~7348)
    - Add check for training mode (`activeTrainingModule` not null)
    - Query `progressData.quizAssignments` for quizzes assigned to current module
    - If quiz found, set `showPostDockingQuiz = true` and store quiz data in reactive ref
    - Add flag to prevent duplicate triggers for same docking event
    - Reset flag when anchor is raised or mission ends

- [x] 3. Implement Quiz Submission and Scoring
  - [x] 3.1 Create quiz submission handler
    - Create `handleQuizSubmit(answers)` method in App.vue
    - Validate all questions have answers
    - Compare student answers to correct answers from quiz data
    - Calculate score: (correct / total) * 100
    - Build submission object with studentId, quizId, moduleId, answers, score, timestamp
    - Add submission to `progressData.quizSubmissions` array
    - Store submission in progressStore
    - Trigger results modal display

- [x] 4. Create Quiz Results Modal
  - [x] 4.1 Build results modal component
    - Create `src/components/QuizResultsModal.vue` file
    - Display score as percentage and fraction (e.g., "4/5 - 80%")
    - Add color-coded score indicator (green ≥70%, yellow 50-69%, red <50%)
    - List all questions with student answer, correct answer, and ✓/✗ icon
    - Add "Close" button that dismisses modal and returns to simulation
    - Style to match HelmQuest theme
    - Add props: `results` (submission object with score breakdown), `isVisible` (boolean)
    - Emit event: `close`
  
  - [x] 4.2 Integrate results modal in App.vue
    - Import QuizResultsModal component in App.vue
    - Add reactive ref for `showQuizResults` and `quizResultsData`
    - After quiz submission, set `showQuizResults = true` with results data
    - Hide quiz modal when showing results
    - Handle results modal close event to return to simulation
    - Allow simulation to resume after closing results

- [x] 5. Add Keyboard Navigation and Accessibility
  - [x] 5.1 Implement keyboard controls
    - Add Tab navigation through questions and buttons
    - Add Enter key to submit quiz when focused on submit button
    - Add Escape key to close modal (with confirmation if quiz not submitted)
    - Ensure radio buttons and text inputs are keyboard accessible
    - Add focus styling for interactive elements

- [x] 6. Test and Handle Edge Cases
  - [x] 6.1 Manual testing of quiz flow
    - Test: Drop anchor in training mode → quiz modal appears
    - Test: Drop anchor when no quiz assigned → no modal, training continues
    - Test: Answer all questions → submit button enabled
    - Test: Leave question unanswered → validation prevents submission
    - Test: Submit quiz → results modal shows correct score
    - Test: Multiple choice, true/false, fill-in-blank scoring
    - Test: View results → all questions, answers, and icons displayed
    - Test: Close results modal → return to simulation successfully
    - Test: Check progressData.quizSubmissions → submission stored
    - Test: Re-docking → quiz appears again (if configured)
  
  - [x] 6.2 Add error handling
    - Handle missing quiz data gracefully (log warning, continue without quiz)
    - Handle missing question correctAnswer field (skip scoring for that question)
    - Handle empty quiz (no questions) → don't show modal
    - Add try-catch around progressStore write operations
    - Add loading state while quiz data is being fetched
    - Handle case where student closes browser before viewing results

- [x] 7. Documentation
  - [x] 7.1 Add code documentation
    - Add JSDoc comments to quiz-related methods in App.vue
    - Add component prop and event documentation in PostDockingQuizModal.vue
    - Add component prop and event documentation in QuizResultsModal.vue
    - Update README.md or create docs/post-docking-quiz.md with feature overview
    - Document data flow and integration points with existing quiz management system
