# Implementation Plan: Dynamic Quiz Button

## Overview

This implementation converts the static "Create Quiz" button in the instructor mission interface into a dynamic button that displays either "CREATE QUIZ" or "UPDATE QUIZ" based on quiz existence. The system verifies quiz state through both local progressData and database records, implements debouncing to prevent accidental double-clicks, and routes to appropriate actions (quiz creation or quiz manager modal) based on current state.

## Tasks

- [ ] 1. Implement debounce utility function
  - Create a leading-edge debounce function that executes the first call immediately and blocks subsequent calls for 300ms
  - Function should track execution state to prevent rapid repeated calls
  - Include timeout cleanup logic
  - _Requirements: 2.1, 2.2, 2.4_

- [ ] 2. Implement quiz verification and caching system
  - [ ] 2.1 Create verifiedQuizStates reactive reference
    - Initialize as a Map to store verification results per module
    - Structure: `Map<moduleId, { hasQuiz: boolean, timestamp: number, source: string }>`
    - _Requirements: 3.1, 3.2, 6.1_
  
  - [ ] 2.2 Implement verifyQuizExistence async function
    - Check cache for fresh results (< 5 minutes old)
    - Query database via `firebaseApi.getAllQuizzes()` if cache miss or stale
    - Filter results to find quizzes for specific module
    - Update verifiedQuizStates Map with result and timestamp
    - Log data inconsistencies when progressData and database disagree
    - Handle network errors by falling back to progressData state
    - Return boolean indicating quiz existence
    - _Requirements: 3.2, 3.3, 3.4, 3.5, 3.6, 6.1, 6.2, 6.3, 6.4_
  
  - [ ]* 2.3 Write unit tests for verifyQuizExistence
    - Test successful database query and cache update
    - Test cache hit behavior (should not query database)
    - Test cache expiration (should re-query after 5 minutes)
    - Test network error fallback to progressData
    - Test null/undefined progressData handling
    - _Requirements: 3.2, 3.6, 6.2, 6.4, 6.5_

- [ ] 3. Implement computed property for dynamic button text
  - [ ] 3.1 Create quizButtonText computed property
    - Return a function that accepts moduleId as parameter
    - Check verifiedQuizStates Map for cached verification result
    - If no cached result, check progressData via getQuizzesForModule()
    - Return "UPDATE QUIZ" if quizzes exist, "CREATE QUIZ" otherwise
    - Handle null/undefined progressData gracefully
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 6.5_
  
  - [ ]* 3.2 Write unit tests for quizButtonText
    - Test "CREATE QUIZ" returned for modules without quizzes
    - Test "UPDATE QUIZ" returned for modules with verified quizzes
    - Test fallback to "CREATE QUIZ" when verification shows no database record
    - Test null/undefined progressData handling
    - _Requirements: 1.1, 1.2, 1.5_

- [ ] 4. Implement quiz button click handler
  - [ ] 4.1 Create openQuizManager function
    - Accept moduleId and moduleTitle as parameters
    - Set quizManagerModal.value with module information
    - Close any other open modals before opening quiz manager
    - _Requirements: 5.1, 5.2_
  
  - [ ] 4.2 Implement handleQuizButtonClick debounced function
    - Wrap with debounce utility (300ms delay)
    - Accept moduleId and moduleTitle as parameters
    - Check verifiedQuizStates for quiz existence
    - If no cached state, call verifyQuizExistence and wait for result
    - Route to startCreatingQuiz if no quiz exists
    - Route to openQuizManager if quiz exists
    - Pass moduleId and moduleTitle to both functions
    - Close any open modals before routing to actions
    - _Requirements: 2.1, 2.2, 2.4, 4.1, 4.2, 4.3, 4.4, 5.1, 5.2_
  
  - [ ]* 4.3 Write unit tests for handleQuizButtonClick
    - Test routing to startCreatingQuiz for modules without quizzes
    - Test routing to openQuizManager for modules with quizzes
    - Test correct parameter passing (moduleId and moduleTitle)
    - Test debounce behavior (only first click executes)
    - _Requirements: 2.1, 2.4, 4.1, 4.2, 4.3, 5.1, 5.2_

- [ ] 5. Add progressData watcher for cache invalidation
  - Create watcher on progressData.quizzes changes
  - Clear verifiedQuizStates Map when quiz data changes
  - Use deep watch option to detect nested changes
  - _Requirements: 3.2, 6.1_

- [ ] 6. Checkpoint - Verify core functionality
  - Ensure all tests pass, ask the user if questions arise

- [ ] 7. Update template to use dynamic button
  - [ ] 7.1 Update button click handler binding
    - Change `@click="startCreatingQuiz(module.id, module.title)"` to `@click="handleQuizButtonClick(module.id, module.title)"`
    - _Requirements: 2.1, 4.1, 5.1_
  
  - [ ] 7.2 Update button text to use computed property
    - Change hardcoded `"📝 Create Quiz"` to dynamic `"📝 {{ quizButtonText(module.id) }}"`
    - Ensure emoji and spacing are preserved
    - _Requirements: 1.1, 1.2, 1.3_

- [ ] 8. Trigger initial quiz verification on component mount
  - [ ] 8.1 Create initialization function for quiz verification
    - Iterate through all modules in trainingModules
    - Check progressData for each module via getQuizzesForModule()
    - If quizzes found, trigger verifyQuizExistence for that module
    - Run verification asynchronously (don't block rendering)
    - _Requirements: 1.3, 1.4, 3.2_
  
  - [ ] 8.2 Call initialization function after progressData loads
    - Add call in appropriate lifecycle hook or after data fetch
    - Ensure progressData is loaded before verification
    - _Requirements: 1.3, 3.1_

- [ ]* 9. Write integration tests for full click flow
  - Test complete flow: click button without quiz → quiz creation opens
  - Test complete flow: click button with quiz → quiz manager opens
  - Test rapid clicking → verify only one action occurs
  - Test data inconsistency scenarios (progressData vs database mismatch)
  - _Requirements: 1.5, 2.1, 2.4, 3.5, 4.1, 5.1, 6.1_

- [ ] 10. Final checkpoint - End-to-end validation
  - Ensure all tests pass
  - Manually test button behavior with various quiz states
  - Verify debouncing prevents double-clicks
  - Confirm database verification logs appear correctly
  - Ask the user if questions arise

## Notes

- Tasks marked with `*` are optional test tasks and can be skipped for faster MVP
- Each task references specific requirements for traceability
- The debounce utility uses leading-edge execution (first click is immediate)
- Cache TTL is set to 5 minutes to balance freshness with API call reduction
- Database is always the source of truth when verification completes
- All error scenarios fall back gracefully to progressData state
- Verification is triggered proactively on component mount to pre-populate cache
- The template changes are minimal (two small modifications to existing button)

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["2.1", "5.1"] },
    { "id": 2, "tasks": ["2.2", "3.1", "4.1"] },
    { "id": 3, "tasks": ["2.3", "3.2", "4.2"] },
    { "id": 4, "tasks": ["4.3", "7.1", "7.2", "8.1"] },
    { "id": 5, "tasks": ["8.2", "9.1"] }
  ]
}
```
