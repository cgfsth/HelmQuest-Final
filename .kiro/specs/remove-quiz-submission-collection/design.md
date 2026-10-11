# Remove Quiz Submission Collection Bugfix Design

## Overview

The application incorrectly references two non-existent or deprecated collections: `quiz_submission` and `quiz_submissions`. The actual correct collection being used throughout the application is `quiz_score`, which stores quiz scoring data with the structure: `studentId`, `quizId`, `score`, `totalQuestions`, `correctAnswers`, `completedAt`, etc.

This bug causes queries to fail or return empty results, creates confusion in the codebase, and may lead to data inconsistencies. The fix involves replacing all references to `quiz_submission`/`quiz_submissions` with `quiz_score` across backend routes, frontend code, and documentation.

The approach is surgical: replace incorrect collection names with the correct `quiz_score` collection, preserve all existing functionality, and ensure cascade deletions work correctly.

## Glossary

- **Bug_Condition (C)**: The condition where code references `quiz_submission` or `quiz_submissions` collections that are incorrect/non-existent
- **Property (P)**: The desired behavior where all quiz scoring operations use only the correct `quiz_score` collection
- **Preservation**: All existing quiz scoring functionality, API endpoints, and cascade deletion behavior must remain unchanged
- **quiz_score**: The correct Firestore collection name that stores quiz scores with fields: `studentId`, `quizId`, `score`, `passed`, `totalQuestions`, `correctAnswers`, `completedAt`, `createdAt`
- **quiz**: The collection that stores quiz definitions (questions, answers, metadata) - this is NOT affected by this bugfix
- **quiz_submission / quiz_submissions**: The incorrect/deprecated collection names that need to be replaced with `quiz_score`
- **Cascade Deletion**: When a mission or quiz is deleted, all related quiz scores must also be deleted from the correct collection

## Bug Details

### Bug Condition

The bug manifests when backend routes or frontend code reference the incorrect collection names `quiz_submission` or `quiz_submissions` instead of the correct `quiz_score` collection. This causes queries to fail, return empty results, or write to incorrect/non-existent collections.

**Formal Specification:**
```
FUNCTION isBugCondition(codeReference)
  INPUT: codeReference of type CodeReference (collection name string in db queries)
  OUTPUT: boolean
  
  RETURN codeReference.collectionName IN ['quiz_submission', 'quiz_submissions']
         AND codeReference.context IN ['backend_route', 'frontend_code', 'cascade_deletion', 'documentation']
         AND NOT (codeReference.correctCollectionName == 'quiz_score')
END FUNCTION
```

### Examples

- **progress.js line 33**: `db.collection('quiz_submission')` queries incorrect collection - should be `db.collection('quiz_score')`
- **quizzes.js line 78**: `db.collection('quiz_submissions').add()` writes to incorrect collection - should be `db.collection('quiz_score').add()`
- **quizzes.js line 90**: `db.collection('quiz_submission').doc()` reads from incorrect collection - should be `db.collection('quiz_score').doc()`
- **quizzes.js line 148, 151, 191, 205**: Multiple queries to `quiz_submissions` for student submissions and cascade deletion - should query `quiz_score`
- **missions.js line 145**: Cascade deletion checks both `quiz_submissions` and `quiz_submission` - should check only `quiz_score`
- **server.js line 79**: API endpoint `/api/v1/quiz-submissions` registered with deprecated naming - this is actually CORRECT and serves the quiz_scores route, but route implementation uses wrong collection
- **App.vue lines 8045, 8057**: Frontend logs mention `quiz_submissions` collection - should reference `quiz_score`

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**
- The `/api/v1/quiz-scores` endpoint must continue to work exactly as before for saving and retrieving quiz scores
- The `/api/v1/quiz-submissions` endpoint must continue to work for the Training Records feature (it's mapped to quizzesRoutes)
- Queries to the `quiz` collection for quiz definitions must remain unchanged
- Queries to other collections like `mission_score`, `students`, `missions`, `quiz_results` must remain unchanged
- The quiz_scores.js route file functionality must remain completely unchanged (it already uses the correct `quiz_score` collection)
- Frontend quiz submission through valid API endpoints must continue to successfully store quiz scores
- Instructors and admins viewing quiz results must continue to see correct data
- Cascade deletion for missions must continue to delete quiz scores and related records correctly

**Scope:**
All queries that correctly use `quiz_score` collection should be completely unaffected by this fix. This includes:
- All routes in quiz_scores.js (already correct)
- References in admin.js to quiz_score collection
- Any other valid collection queries

## Hypothesized Root Cause

Based on the bug description and code analysis, the most likely issues are:

1. **Legacy Collection Naming**: Early in development, the collection may have been named `quiz_submission` or `quiz_submissions`, but was later standardized to `quiz_score`. Some code was not updated during the migration.

2. **Inconsistent Naming Convention**: Multiple developers or code changes introduced inconsistent collection naming without awareness of the standardized `quiz_score` collection.

3. **Copy-Paste Errors**: Code was copied from other parts of the application and the collection names were not updated to match the actual schema.

4. **Missing Documentation**: The correct collection name (`quiz_score`) was not clearly documented, leading to confusion and incorrect usage in newer code.

5. **Firestore Case Sensitivity Confusion**: Developers may have been unsure whether the collection name was singular (`quiz_submission`) or plural (`quiz_submissions`), leading to both variations appearing in the code.

## Correctness Properties

Property 1: Bug Condition - Quiz Score Operations Use Correct Collection

_For any_ database operation where the code needs to read from or write to quiz scoring data (submissions, scores, results), the fixed code SHALL use the `quiz_score` collection name, causing queries to succeed and data to be stored/retrieved correctly from the actual collection.

**Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.6**

Property 2: Preservation - Non-Quiz-Submission Functionality

_For any_ database operation that does NOT involve quiz submissions/scores (operations on `quiz` definitions, `mission_score`, `students`, `missions`, or other collections), the fixed code SHALL produce exactly the same behavior as the original code, preserving all existing functionality for non-affected collections.

**Validates: Requirements 3.1, 3.3, 3.4, 3.5, 3.6**

## Fix Implementation

### Changes Required

Assuming our root cause analysis is correct, the fix requires replacing all references to `quiz_submission` and `quiz_submissions` with `quiz_score` across multiple files.

**File**: `backend/routes/progress.js`

**Function**: `GET /student/:studentId` route handler

**Specific Changes**:
1. **Line 33 Collection Name**: Change `db.collection('quiz_submission')` to `db.collection('quiz_score')`
   - Update query to use correct collection
   - Field names should remain the same (`studentid` field for querying)

---

**File**: `backend/routes/quizzes.js`

**Function**: Multiple route handlers

**Specific Changes**:
1. **Line 78 - POST /:id/submit route**: Change `db.collection('quiz_submissions').add()` to `db.collection('quiz_score').add()`
   - This writes quiz submission data to correct collection
   - Data structure should align with quiz_score schema (may need field name adjustments)

2. **Line 90 - POST /submissions/:submissionId/grade route**: Change `db.collection('quiz_submission').doc()` to `db.collection('quiz_score').doc()`
   - This reads submission for grading from correct collection

3. **Line 110 - Same route continuation**: Change `db.collection('quiz_submission').doc().update()` to `db.collection('quiz_score').doc().update()`
   - This updates submission status after grading

4. **Line 122 - GET /submissions/all route**: Change `db.collection('quiz_submission')` to `db.collection('quiz_score')`
   - Query initialization for fetching submissions

5. **Line 148 - GET /student/:studentId route**: Change `db.collection('quiz_submissions')` to `db.collection('quiz_score')`
   - This fetches student quiz submissions for Training Records

6. **Line 191 - DELETE /:quizId/submissions route**: Change `db.collection('quiz_submissions')` to `db.collection('quiz_score')`
   - This is the cascade deletion query for quiz submissions when a quiz is deleted
   - Note: Line 205 already queries `quiz_score` as well, so this creates consistency

---

**File**: `backend/routes/missions.js`

**Function**: `deleteMissionCascade` helper function

**Specific Changes**:
1. **Line 145 - Cascade deletion loop**: Change `['quiz_submissions', 'quiz_submission']` to `['quiz_score']`
   - This ensures cascade deletion only checks the correct collection
   - Remove redundant attempts to query non-existent collections
   - Simplify the loop since only one collection name is needed

---

**File**: `src/App.vue`

**Function**: Quiz submission handler in frontend

**Specific Changes**:
1. **Line 8045 - Comment**: Change comment from `// Save to Firestore database - quiz_submissions collection` to `// Save to Firestore database - quiz_score collection`
   - Update documentation comment for accuracy

2. **Line 8057 - Console log**: Change console message from `'✅ Quiz submitted to Firestore (quiz_submissions)'` to `'✅ Quiz submitted to Firestore (quiz_score)'`
   - Update log message to reflect correct collection name

---

**File**: Documentation files (optional, low priority)

**Files affected**: 
- `SIMPLE_DATABASE_STRUCTURE.md`
- `MISSIONS_WITH_QUIZ_COLLECTION.md`
- `INSTRUCTOR_DATABASE_MAPPING.md`
- `FIRESTORE_COLLECTIONS_FINAL.md`
- `FIREBASE_REST_API_COMPLETE.md`
- `FINAL_COLLECTIONS_STRUCTURE.md`
- `FINAL_DATABASE_COLLECTIONS.md`
- `DATABASE_BREAKDOWN.md`

**Specific Changes**:
1. **All documentation files**: Replace references to `quiz_submissions` / `quiz_submission` collection with `quiz_score`
   - Update collection descriptions to use correct naming
   - Update schema examples to reference `quiz_score`
   - Update relationship diagrams to show correct collection name

**Note**: Documentation changes are lower priority than code changes, but should be updated for consistency and to prevent future confusion.

## Testing Strategy

### Validation Approach

The testing strategy follows a two-phase approach: first, demonstrate the bug exists by showing failed queries or empty results from the incorrect collection names, then verify the fix works correctly and preserves existing behavior.

### Exploratory Bug Condition Checking

**Goal**: Surface counterexamples that demonstrate the bug BEFORE implementing the fix. Confirm that queries to `quiz_submission` / `quiz_submissions` fail or return empty results, while queries to `quiz_score` succeed.

**Test Plan**: Write tests or use manual testing to execute the affected API endpoints and observe the behavior on UNFIXED code. Check that queries to incorrect collections fail or return no data, while the correct `quiz_score` collection contains data.

**Test Cases**:
1. **Progress Endpoint Test**: Call `GET /api/v1/progress/student/:studentId` and observe that quiz submissions are missing or empty (will fail on unfixed code)
2. **Quiz Submission Test**: Submit a quiz via `POST /api/v1/quizzes/:id/submit` and check if data is written to `quiz_submissions` vs `quiz_score` (will write to wrong collection on unfixed code)
3. **Training Records Test**: Call `GET /api/v1/quiz-submissions/student/:studentId` and observe empty or incorrect results (will query wrong collection on unfixed code)
4. **Cascade Deletion Test**: Delete a quiz and verify that related quiz scores are not deleted from `quiz_score` collection because cascade deletion queries wrong collections (will fail on unfixed code)

**Expected Counterexamples**:
- API endpoints return empty arrays when quiz scores exist in `quiz_score` collection
- Data is written to `quiz_submissions` collection instead of `quiz_score`
- Cascade deletion fails to remove quiz scores because it queries incorrect collections
- Console logs show incorrect collection names being referenced

### Fix Checking

**Goal**: Verify that for all operations where the bug condition holds (queries to quiz submissions/scores), the fixed code uses the correct `quiz_score` collection and operations succeed.

**Pseudocode:**
```
FOR ALL database_operation WHERE isBugCondition(database_operation.collectionName) DO
  fixed_operation := replaceWithCorrectCollection(database_operation, 'quiz_score')
  result := executeOperation(fixed_operation)
  ASSERT result.success == true
  ASSERT result.collection == 'quiz_score'
  ASSERT result.data IS NOT empty (when data exists)
END FOR
```

**Testing Approach**: 
- Execute all affected API endpoints after the fix
- Verify that queries use `quiz_score` collection
- Verify that data is correctly retrieved and stored
- Verify that cascade deletion removes records from `quiz_score` collection

**Test Cases**:
1. **Progress Endpoint After Fix**: Call `GET /api/v1/progress/student/:studentId` and verify quiz submissions are returned correctly from `quiz_score`
2. **Quiz Submission After Fix**: Submit a quiz and verify data is written to `quiz_score` collection with correct schema
3. **Training Records After Fix**: Call `GET /api/v1/quiz-submissions/student/:studentId` and verify correct quiz scores are returned
4. **Cascade Deletion After Fix**: Delete a quiz and verify all related quiz scores are deleted from `quiz_score` collection
5. **Grading After Fix**: Grade a quiz submission and verify the update occurs in `quiz_score` collection

### Preservation Checking

**Goal**: Verify that for all operations where the bug condition does NOT hold (operations on `quiz` definitions, `mission_score`, and other collections), the fixed code produces the same result as the original code.

**Pseudocode:**
```
FOR ALL database_operation WHERE NOT isBugCondition(database_operation.collectionName) DO
  ASSERT executeBefore(database_operation) == executeAfter(database_operation)
END FOR
```

**Testing Approach**: Verify that non-affected functionality continues to work exactly as before. Test operations on other collections and ensure no regressions.

**Test Cases**:
1. **Quiz Definition Queries**: Verify that `GET /api/v1/quizzes` and other quiz definition endpoints continue to work correctly with `quiz` collection
2. **Mission Score Queries**: Verify that mission scoring endpoints continue to work with `mission_score` collection
3. **Quiz Score Routes Preservation**: Verify that `/api/v1/quiz-scores` endpoints (which already use correct collection) continue to work unchanged
4. **Student and Instructor Queries**: Verify that student and instructor queries continue to work correctly
5. **Quiz Results Collection**: Verify that `quiz_results` collection queries (if any) continue to work correctly

### Unit Tests

- Test each affected route handler to verify collection name changes
- Test progress endpoint returns correct quiz submissions after fix
- Test quiz submission endpoint writes to correct collection
- Test cascade deletion removes records from correct collection
- Mock Firestore calls to verify correct collection names are used

### Property-Based Tests

- Generate random student IDs and verify quiz scores are retrieved from correct collection
- Generate random quiz IDs and verify cascade deletion removes all related scores from correct collection
- Generate random quiz submissions and verify all are stored in `quiz_score` collection
- Test that operations on non-affected collections remain unchanged across many scenarios

### Integration Tests

- Submit a quiz end-to-end and verify data flow through correct collection
- Delete a mission with associated quizzes and verify cascade deletion works correctly
- Fetch student training records and verify quiz scores are retrieved correctly
- Test instructor dashboard displays quiz results correctly after fix
- Verify admin panel can access quiz scores correctly after fix
