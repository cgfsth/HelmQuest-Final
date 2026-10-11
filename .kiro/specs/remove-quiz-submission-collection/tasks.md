# Implementation Plan

- [x] 1. Write bug condition exploration test
  - **Property 1: Bug Condition** - Incorrect Collection References
  - **CRITICAL**: This test MUST FAIL on unfixed code - failure confirms the bug exists
  - **DO NOT attempt to fix the test or the code when it fails**
  - **NOTE**: This test encodes the expected behavior - it will validate the fix when it passes after implementation
  - **GOAL**: Surface counterexamples that demonstrate queries to `quiz_submission`/`quiz_submissions` fail or return empty results
  - **Scoped PBT Approach**: For deterministic bugs, scope the property to the concrete failing cases - queries using incorrect collection names
  - Test that code references `quiz_submission` or `quiz_submissions` collections in:
    - progress.js line 33: `db.collection('quiz_submission')`
    - quizzes.js line 78: `db.collection('quiz_submissions').add()`
    - quizzes.js line 90: `db.collection('quiz_submission').doc()`
    - quizzes.js lines 148, 151, 191, 205: queries to `quiz_submissions`
    - missions.js line 145: cascade deletion checks both `quiz_submissions` and `quiz_submission`
  - The test assertions should verify that:
    - Queries to incorrect collections fail or return empty results
    - Data written to `quiz_submissions` does not appear in `quiz_score` (correct collection)
    - Cascade deletion does not remove records from `quiz_score` when querying wrong collections
  - Run test on UNFIXED code
  - **EXPECTED OUTCOME**: Test FAILS (this is correct - it proves the bug exists)
  - Document counterexamples found:
    - API endpoints returning empty arrays when data exists in `quiz_score`
    - Data being written to wrong collection
    - Cascade deletion failing to remove records from correct collection
  - Mark task complete when test is written, run, and failure is documented
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6_

- [x] 2. Write preservation property tests (BEFORE implementing fix)
  - **Property 2: Preservation** - Non-Quiz-Submission Functionality
  - **IMPORTANT**: Follow observation-first methodology
  - Observe behavior on UNFIXED code for non-buggy collections:
    - `quiz` collection queries for quiz definitions
    - `mission_score` collection queries  
    - `students` collection queries
    - `missions` collection queries
    - Any other valid collection operations not involving quiz submissions
  - Write property-based tests capturing observed behavior patterns:
    - Quiz definition queries to `quiz` collection return correct quiz data
    - Mission score queries to `mission_score` collection return correct scores
    - Student and instructor queries continue to work unchanged
    - Other collection queries remain unaffected by collection name changes
  - Property-based testing generates many test cases for stronger guarantees
  - Run tests on UNFIXED code
  - **EXPECTED OUTCOME**: Tests PASS (this confirms baseline behavior to preserve)
  - Mark task complete when tests are written, run, and passing on unfixed code
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_

- [x] 3. Fix incorrect quiz submission collection references

  - [x] 3.1 Update backend/routes/progress.js
    - Change line 33 from `db.collection('quiz_submission')` to `db.collection('quiz_score')`
    - Verify field names remain the same (`studentid` field for querying)
    - _Bug_Condition: codeReference.collectionName IN ['quiz_submission', 'quiz_submissions'] AND context == 'backend_route'_
    - _Expected_Behavior: All quiz scoring operations use `quiz_score` collection causing queries to succeed_
    - _Preservation: Non-quiz-submission queries to other collections remain unchanged_
    - _Requirements: 1.1, 2.1_

  - [x] 3.2 Update backend/routes/quizzes.js - POST /:id/submit route
    - Change line 78 from `db.collection('quiz_submissions').add()` to `db.collection('quiz_score').add()`
    - Ensure data structure aligns with quiz_score schema
    - Verify writes go to correct collection
    - _Bug_Condition: codeReference.collectionName == 'quiz_submissions' AND context == 'quiz_submission_write'_
    - _Expected_Behavior: Quiz submissions are written to `quiz_score` collection_
    - _Preservation: Quiz definition queries to `quiz` collection remain unchanged_
    - _Requirements: 1.3, 2.3_

  - [x] 3.3 Update backend/routes/quizzes.js - grading operations
    - Change line 90 from `db.collection('quiz_submission').doc()` to `db.collection('quiz_score').doc()`
    - Change line 110 from `db.collection('quiz_submission').doc().update()` to `db.collection('quiz_score').doc().update()`
    - Verify grading operations read from and write to correct collection
    - _Bug_Condition: codeReference.collectionName == 'quiz_submission' AND context == 'grading_operations'_
    - _Expected_Behavior: Grading operations use `quiz_score` collection_
    - _Preservation: Other grading-related queries remain unchanged_
    - _Requirements: 1.2, 2.2_

  - [x] 3.4 Update backend/routes/quizzes.js - query and deletion operations
    - Change line 122 from `db.collection('quiz_submission')` to `db.collection('quiz_score')`
    - Change line 148 from `db.collection('quiz_submissions')` to `db.collection('quiz_score')`
    - Change line 191 from `db.collection('quiz_submissions')` to `db.collection('quiz_score')`
    - Verify all query and deletion operations use correct collection
    - Note: Line 205 already queries `quiz_score`, creating consistency
    - _Bug_Condition: codeReference.collectionName IN ['quiz_submission', 'quiz_submissions'] AND context == 'query_operations'_
    - _Expected_Behavior: All queries use `quiz_score` collection_
    - _Preservation: Non-affected queries remain unchanged_
    - _Requirements: 1.3, 2.3_

  - [x] 3.5 Update backend/routes/missions.js - cascade deletion
    - Change line 145 from `['quiz_submissions', 'quiz_submission']` to `['quiz_score']`
    - Remove redundant attempts to query non-existent collections
    - Simplify loop since only one collection name is needed
    - Verify cascade deletion removes records from correct collection
    - _Bug_Condition: codeReference.collectionName IN ['quiz_submissions', 'quiz_submission'] AND context == 'cascade_deletion'_
    - _Expected_Behavior: Cascade deletion queries only `quiz_score` collection_
    - _Preservation: Other cascade deletion operations remain unchanged_
    - _Requirements: 1.4, 2.4_

  - [x] 3.6 Update frontend src/App.vue - comments and logs
    - Change line 8045 comment from `// Save to Firestore database - quiz_submissions collection` to `// Save to Firestore database - quiz_score collection`
    - Change line 8057 console log from `'✅ Quiz submitted to Firestore (quiz_submissions)'` to `'✅ Quiz submitted to Firestore (quiz_score)'`
    - Update documentation comments for accuracy
    - _Bug_Condition: codeReference.collectionName == 'quiz_submissions' AND context == 'frontend_code'_
    - _Expected_Behavior: Frontend logs reference correct `quiz_score` collection_
    - _Preservation: Actual quiz submission functionality remains unchanged_
    - _Requirements: 1.6, 2.6_

  - [x] 3.7 Verify bug condition exploration test now passes
    - **Property 1: Expected Behavior** - Correct Collection Usage
    - **IMPORTANT**: Re-run the SAME test from task 1 - do NOT write a new test
    - The test from task 1 encodes the expected behavior
    - When this test passes, it confirms the expected behavior is satisfied
    - Run bug condition exploration test from step 1
    - Verify that:
      - Queries to `quiz_score` succeed and return correct data
      - Data written to `quiz_score` is stored correctly
      - Cascade deletion removes records from `quiz_score` collection
    - **EXPECTED OUTCOME**: Test PASSES (confirms bug is fixed)
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.6_

  - [x] 3.8 Verify preservation tests still pass
    - **Property 2: Preservation** - Non-Affected Functionality
    - **IMPORTANT**: Re-run the SAME tests from task 2 - do NOT write new tests
    - Run preservation property tests from step 2
    - Verify that:
      - Quiz definition queries still work correctly
      - Mission score queries still work correctly
      - Student and instructor queries still work correctly
      - Other collection queries remain unaffected
    - **EXPECTED OUTCOME**: Tests PASS (confirms no regressions)
    - Confirm all tests still pass after fix (no regressions)
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_

- [x] 4. Checkpoint - Ensure all tests pass
  - Run all bug condition and preservation tests
  - Verify all tests pass
  - Test the following scenarios end-to-end:
    - Submit a quiz and verify data is written to `quiz_score` collection
    - Fetch student quiz scores and verify correct data is returned
    - Delete a quiz and verify cascade deletion removes records from `quiz_score`
    - Verify instructor dashboard displays quiz results correctly
  - Ask the user if questions arise

## Optional: Documentation Updates (Lower Priority)

- [~] 5. Update documentation files (optional)
  - Update references in the following documentation files to use `quiz_score` instead of `quiz_submission`/`quiz_submissions`:
    - SIMPLE_DATABASE_STRUCTURE.md
    - MISSIONS_WITH_QUIZ_COLLECTION.md
    - INSTRUCTOR_DATABASE_MAPPING.md
    - FIRESTORE_COLLECTIONS_FINAL.md
    - FIREBASE_REST_API_COMPLETE.md
    - FINAL_COLLECTIONS_STRUCTURE.md
    - FINAL_DATABASE_COLLECTIONS.md
    - DATABASE_BREAKDOWN.md
  - Update collection descriptions and schema examples
  - Update relationship diagrams
  - _Requirements: 2.7_
