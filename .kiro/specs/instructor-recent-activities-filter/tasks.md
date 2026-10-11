# Tasks: Instructor Recent Activities Filter

## 1. Backend API Implementation

### 1.1 Create batchArray Utility Function
- [ ] 1.1.1 Create utility function `batchArray(array, batchSize)` in `backend/routes/mission_scores.js`
- [ ] 1.1.2 Implement logic to split array into batches of specified size
- [ ] 1.1.3 Add unit tests for batchArray with arrays of sizes: 0, 5, 10, 15, 25 elements
- [ ] 1.1.4 Verify no elements are lost or duplicated during batching

**Validates:** Requirements 1.12

### 1.2 Implement fetchInstructorRecentActivities Backend Function
- [ ] 1.2.1 Create async function `fetchInstructorRecentActivities(instructorId, limit)` in `backend/routes/mission_scores.js`
- [ ] 1.2.2 Implement Step 1: Query students collection filtered by instructorid and status='approved'
- [ ] 1.2.3 Handle empty students result by returning empty array
- [ ] 1.2.4 Implement Step 2: Extract student IDs and create studentNamesMap
- [ ] 1.2.5 Implement Step 3: Batch student IDs into groups of 10
- [ ] 1.2.6 Implement Step 3: Query mission_score collection for each batch using 'in' operator
- [ ] 1.2.7 Implement Step 3: Merge results from all batches
- [ ] 1.2.8 Implement Step 4: Sort allActivities by completedAt descending
- [ ] 1.2.9 Implement Step 5: Limit results to requested number
- [ ] 1.2.10 Handle case where studentId not found in studentNamesMap (use "Unknown Student")
- [ ] 1.2.11 Add error handling for Firestore query failures

**Validates:** Requirements 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 1.9, 6.1, 6.2, 6.3

### 1.3 Create GET /instructor/:instructorId/recent Endpoint
- [ ] 1.3.1 Add GET route `/instructor/:instructorId/recent` in `backend/routes/mission_scores.js`
- [ ] 1.3.2 Extract instructorId from req.params
- [ ] 1.3.3 Extract limit from req.query (default: 10)
- [ ] 1.3.4 Validate instructorId is non-empty string
- [ ] 1.3.5 Validate limit is positive integer between 1 and 100
- [ ] 1.3.6 Call fetchInstructorRecentActivities(instructorId, limit)
- [ ] 1.3.7 Return JSON response with activities array and count
- [ ] 1.3.8 Add try-catch error handling
- [ ] 1.3.9 Return 400 Bad Request for invalid parameters
- [ ] 1.3.10 Return 500 Internal Server Error for Firestore failures
- [ ] 1.3.11 Log errors to console with descriptive messages

**Validates:** Requirements 1.1, 1.2, 1.10, 1.11, 5.2, 6.4, 8.4

### 1.4 Test Backend API Endpoint
- [ ] 1.4.1 Write unit test for fetchInstructorRecentActivities with mock Firestore data
- [ ] 1.4.2 Write unit test for instructor with no students (expect empty array)
- [ ] 1.4.3 Write unit test for instructor with 15 students (verify batching)
- [ ] 1.4.4 Write unit test for sorting by completedAt
- [ ] 1.4.5 Write unit test for limit constraint (test limits: 0, 1, 5, 10, 100)
- [ ] 1.4.6 Write unit test for missing student name in lookup
- [ ] 1.4.7 Write integration test for end-to-end flow with real Firestore
- [ ] 1.4.8 Write integration test for instructor data isolation
- [ ] 1.4.9 Write integration test for performance with 50 students and 200 activities
- [ ] 1.4.10 Run all tests and verify 90%+ code coverage

**Validates:** Requirements 9.1, 9.3

## 2. Firestore Index Creation

### 2.1 Create Composite Index for mission_score Collection
- [ ] 2.1.1 Open Firebase Console and navigate to Firestore
- [ ] 2.1.2 Create composite index on mission_score: (studentId ASC, completedAt DESC)
- [ ] 2.1.3 Wait for index status to change to "Enabled"
- [ ] 2.1.4 Verify index is used by running a test query
- [ ] 2.1.5 Document index creation in deployment notes

**Validates:** Requirements 7.2, 10.2

## 3. Frontend Data Fetcher Implementation

### 3.1 Initialize instructorRecentActivities Ref
- [ ] 3.1.1 Add `const instructorRecentActivities = ref([])` in App.vue setup section (around line 4797)
- [ ] 3.1.2 Verify ref is reactive and accessible throughout component
- [ ] 3.1.3 Remove or comment out existing empty ref if it already exists

**Validates:** Requirements 4.3

### 3.2 Implement fetchInstructorRecentActivities Frontend Function
- [ ] 3.2.1 Create async function `fetchInstructorRecentActivities()` in App.vue
- [ ] 3.2.2 Add validation: check currentUser.value is not null
- [ ] 3.2.3 Add validation: check currentUser.value.role === 'instructor'
- [ ] 3.2.4 Extract instructorId from currentUser.value.instructorid
- [ ] 3.2.5 Add validation: check instructorId is not null or empty string
- [ ] 3.2.6 Build URL: `http://localhost:3001/api/v1/mission-scores/instructor/${instructorId}/recent?limit=10`
- [ ] 3.2.7 Make fetch request using await fetch(url)
- [ ] 3.2.8 Check response.ok status
- [ ] 3.2.9 Parse JSON from response body
- [ ] 3.2.10 Update instructorRecentActivities.value with data.activities
- [ ] 3.2.11 Log success message to console
- [ ] 3.2.12 Add try-catch block for error handling
- [ ] 3.2.13 On error: log to console and set instructorRecentActivities.value = []
- [ ] 3.2.14 On validation failure: log error and return early

**Validates:** Requirements 2.1, 2.2, 2.3, 2.4, 2.5, 2.6

### 3.3 Call Fetch Function on Instructor Login
- [ ] 3.3.1 Locate instructor login success handler in App.vue
- [ ] 3.3.2 Add call to fetchInstructorRecentActivities() after successful login
- [ ] 3.3.3 Ensure call is asynchronous (don't block login flow)
- [ ] 3.3.4 Test login flow with instructor account

**Validates:** Requirements 4.1

### 3.4 Call Fetch Function on Overview Tab Selection
- [ ] 3.4.1 Locate instructorTab watcher or tab selection handler in App.vue
- [ ] 3.4.2 Add condition: if instructorTab === 'overview', call fetchInstructorRecentActivities()
- [ ] 3.4.3 Ensure call refreshes data on each tab switch
- [ ] 3.4.4 Test tab switching behavior

**Validates:** Requirements 4.2

### 3.5 Test Frontend Data Fetcher
- [ ] 3.5.1 Write unit test for fetchInstructorRecentActivities with mocked fetch
- [ ] 3.5.2 Write unit test for validation: currentUser is null
- [ ] 3.5.3 Write unit test for validation: user role is not 'instructor'
- [ ] 3.5.4 Write unit test for validation: instructorId is null
- [ ] 3.5.5 Write unit test for network error handling
- [ ] 3.5.6 Write unit test for HTTP error response (404, 500)
- [ ] 3.5.7 Write unit test for empty response data
- [ ] 3.5.8 Run all tests and verify 90%+ code coverage

**Validates:** Requirements 9.2

## 4. Frontend UI Update

### 4.1 Update Vue Template to Use New Ref
- [ ] 4.1.1 Locate Recent Activities section in App.vue (lines 1315-1340)
- [ ] 4.1.2 Replace `instructorRecentSessions` with `instructorRecentActivities` in v-if condition
- [ ] 4.1.3 Replace `instructorRecentSessions` with `instructorRecentActivities` in v-for loop
- [ ] 4.1.4 Update v-for iteration variable from `session` to `activity`
- [ ] 4.1.5 Update :key binding from `session.id` to `activity.id`
- [ ] 4.1.6 Update student name display from `session.studentName` to `activity.studentName`
- [ ] 4.1.7 Update mission display from `session.mission` to `activity.missionTitle`
- [ ] 4.1.8 Update score display from `session.score` to `activity.score`
- [ ] 4.1.9 Update passed check from `session.passed` to `activity.passed`
- [ ] 4.1.10 Verify empty state message "No student activity yet." is unchanged

**Validates:** Requirements 3.1, 3.2, 3.3, 3.4, 3.5

### 4.2 Test UI Display
- [ ] 4.2.1 Test UI with empty activities array (verify empty state message)
- [ ] 4.2.2 Test UI with 1 activity (verify single item displays correctly)
- [ ] 4.2.3 Test UI with 10 activities (verify all display correctly)
- [ ] 4.2.4 Test UI with passed activity (verify green/pass styling)
- [ ] 4.2.5 Test UI with failed activity (verify red/fail styling)
- [ ] 4.2.6 Test UI rendering performance (verify < 50ms for 10 activities)
- [ ] 4.2.7 Verify chronological order (most recent first)

**Validates:** Requirements 9.2

## 5. Data Validation Implementation

### 5.1 Add Frontend Data Validation
- [ ] 5.1.1 Add validation helper function `validateRecentActivity(activity)` in App.vue
- [ ] 5.1.2 Check activity.id is non-empty string
- [ ] 5.1.3 Check activity.studentId is non-empty string
- [ ] 5.1.4 Check activity.studentName is non-empty string
- [ ] 5.1.5 Check activity.missionId matches pattern /^M\d+-\d+$/
- [ ] 5.1.6 Check activity.missionTitle is non-empty string
- [ ] 5.1.7 Check activity.score is number between 0 and 100
- [ ] 5.1.8 Check activity.passed is boolean
- [ ] 5.1.9 Check activity.completedAt is valid Date or parseable timestamp
- [ ] 5.1.10 Call validation in fetchInstructorRecentActivities after receiving data
- [ ] 5.1.11 Filter out invalid activities and log warnings

**Validates:** Requirements 5.1

### 5.2 Add Backend Parameter Validation
- [ ] 5.2.1 Add validation for instructorId: check non-empty string
- [ ] 5.2.2 Add validation for instructorId: check alphanumeric + hyphens only
- [ ] 5.2.3 Add validation for limit: parse as integer
- [ ] 5.2.4 Add validation for limit: check between 1 and 100
- [ ] 5.2.5 Add validation for limit: default to 10 if invalid
- [ ] 5.2.6 Return 400 Bad Request with error message for invalid instructorId
- [ ] 5.2.7 Test validation with various invalid inputs

**Validates:** Requirements 5.2, 6.4, 8.4

## 6. Property-Based Testing

### 6.1 Setup Property-Based Testing
- [ ] 6.1.1 Install fast-check library: `npm install --save-dev fast-check`
- [ ] 6.1.2 Create test file: `backend/tests/mission_scores.properties.test.js`
- [ ] 6.1.3 Import fast-check and test utilities

**Validates:** Requirements 9.4

### 6.2 Write Property Test: Instructor Isolation
- [ ] 6.2.1 Create property test for Instructor Isolation
- [ ] 6.2.2 Generate random instructorId, studentIds, and otherStudentIds
- [ ] 6.2.3 Setup: Create students for instructor and other instructors
- [ ] 6.2.4 Setup: Create mission scores for both groups
- [ ] 6.2.5 Call fetchInstructorRecentActivities(instructorId, 10)
- [ ] 6.2.6 Assert: Every activity's studentId is in instructor's student list
- [ ] 6.2.7 Run test with 100+ random inputs
- [ ] 6.2.8 Cleanup: Delete test data

**Validates:** Requirements 9.4, Property 1 (Instructor Isolation)

### 6.3 Write Property Test: Chronological Ordering
- [ ] 6.3.1 Create property test for Chronological Ordering
- [ ] 6.3.2 Generate random instructorId and array of activities with timestamps
- [ ] 6.3.3 Setup: Create mission scores with generated timestamps
- [ ] 6.3.4 Call fetchInstructorRecentActivities(instructorId, 20)
- [ ] 6.3.5 Assert: For all i < j, result[i].completedAt >= result[j].completedAt
- [ ] 6.3.6 Run test with 100+ random inputs
- [ ] 6.3.7 Cleanup: Delete test data

**Validates:** Requirements 9.4, Property 2 (Chronological Ordering)

### 6.4 Write Property Test: Limit Constraint
- [ ] 6.4.1 Create property test for Limit Constraint
- [ ] 6.4.2 Generate random instructorId, limit (0-50), and activityCount (0-100)
- [ ] 6.4.3 Setup: Create activityCount mission scores
- [ ] 6.4.4 Call fetchInstructorRecentActivities(instructorId, limit)
- [ ] 6.4.5 Assert: result.length <= limit
- [ ] 6.4.6 Run test with 100+ random inputs
- [ ] 6.4.7 Cleanup: Delete test data

**Validates:** Requirements 9.4, Property 3 (Limit Constraint)

## 7. Legacy Code Cleanup

### 7.1 Remove localStorage Dependencies
- [ ] 7.1.1 Locate `buildInstructorRecentSessions` function in `src/helpers/progressStore.js`
- [ ] 7.1.2 Add deprecation comment or remove function entirely
- [ ] 7.1.3 Search codebase for remaining references to `buildInstructorRecentSessions`
- [ ] 7.1.4 Remove or update all references
- [ ] 7.1.5 Remove `instructorRecentSessions` computed property from App.vue
- [ ] 7.1.6 Verify no errors after removal

**Validates:** Requirements 10.3

### 7.2 Update Documentation
- [ ] 7.2.1 Add API documentation for new endpoint in README or API docs
- [ ] 7.2.2 Document endpoint path, parameters, response format
- [ ] 7.2.3 Add example request and response
- [ ] 7.2.4 Document Firestore index requirement
- [ ] 7.2.5 Update deployment checklist

**Validates:** Requirements 10.1

## 8. End-to-End Testing

### 8.1 Manual Testing Checklist
- [ ] 8.1.1 Test: Instructor with 0 students sees "No student activity yet"
- [ ] 8.1.2 Test: Instructor with 5 students sees only their students' activities
- [ ] 8.1.3 Test: Instructor A cannot see Instructor B's students' activities
- [ ] 8.1.4 Test: Activities are sorted with most recent first
- [ ] 8.1.5 Test: Only 10 activities are displayed (when more exist)
- [ ] 8.1.6 Test: Pass/fail styling is applied correctly
- [ ] 8.1.7 Test: Tab switching refreshes data
- [ ] 8.1.8 Test: Login triggers data load
- [ ] 8.1.9 Test: Performance with instructor having 50 students
- [ ] 8.1.10 Test: Error handling when backend is down

**Validates:** Requirements 8.1, 9.3

### 8.2 Cross-Browser Testing
- [ ] 8.2.1 Test in Chrome
- [ ] 8.2.2 Test in Firefox
- [ ] 8.2.3 Test in Safari (if available)
- [ ] 8.2.4 Test in Edge
- [ ] 8.2.5 Verify consistent behavior across browsers

## 9. Performance Optimization

### 9.1 Verify Performance Requirements
- [ ] 9.1.1 Measure query time for instructor with 10 students (expect < 500ms)
- [ ] 9.1.2 Measure query time for instructor with 50 students (expect < 2s)
- [ ] 9.1.3 Measure network payload size for 10 activities (expect 1-5 KB)
- [ ] 9.1.4 Measure UI render time for 10 activities (expect < 50ms)
- [ ] 9.1.5 Verify Firestore index is being used (check query execution plan)
- [ ] 9.1.6 Optimize if any metrics exceed targets

**Validates:** Requirements 7.1

### 9.2 Implement Caching (Optional Enhancement)
- [ ] 9.2.1 Add caching logic to avoid re-fetching on rapid tab switches
- [ ] 9.2.2 Implement 5-minute cache expiration
- [ ] 9.2.3 Add manual refresh capability
- [ ] 9.2.4 Test cache behavior

**Validates:** Requirements 7.2 (Performance Considerations)

## 10. Security Review

### 10.1 Verify Security Requirements
- [ ] 10.1.1 Verify instructor data isolation (test with multiple instructors)
- [ ] 10.1.2 Verify no sensitive student data in response (check network tab)
- [ ] 10.1.3 Verify only approved students are included
- [ ] 10.1.4 Verify input sanitization prevents injection attacks
- [ ] 10.1.5 Test with malicious inputs (SQL-like strings, script tags, etc.)
- [ ] 10.1.6 Review error messages for information leakage

**Validates:** Requirements 8.1, 8.2, 8.3, 8.4

### 10.2 Add Authentication (Future Enhancement)
- [ ] 10.2.1 Design JWT token verification for endpoint
- [ ] 10.2.2 Implement middleware to verify instructor role
- [ ] 10.2.3 Match instructorId from token with requested instructorId
- [ ] 10.2.4 Return 401 Unauthorized for invalid tokens
- [ ] 10.2.5 Return 403 Forbidden for role mismatch

**Validates:** Requirements 8.1 (Security Considerations - Future)

## 11. Deployment

### 11.1 Pre-Deployment Checklist
- [ ] 11.1.1 All tests passing (unit, integration, property-based)
- [ ] 11.1.2 Code coverage meets 90%+ target
- [ ] 11.1.3 Firestore index created and enabled
- [ ] 11.1.4 Manual testing completed successfully
- [ ] 11.1.5 Performance benchmarks meet requirements
- [ ] 11.1.6 Security review completed
- [ ] 11.1.7 Documentation updated

**Validates:** Requirements 10.1, 10.2

### 11.2 Deploy to Development Environment
- [ ] 11.2.1 Deploy backend changes to development server
- [ ] 11.2.2 Deploy frontend changes to development environment
- [ ] 11.2.3 Verify Firestore index exists in development
- [ ] 11.2.4 Run smoke tests in development
- [ ] 11.2.5 Monitor logs for errors

**Validates:** Requirements 10.1

### 11.3 Deploy to Production
- [ ] 11.3.1 Create production Firestore index (if not auto-created)
- [ ] 11.3.2 Deploy backend to production
- [ ] 11.3.3 Deploy frontend to production
- [ ] 11.3.4 Run smoke tests in production
- [ ] 11.3.5 Monitor performance metrics
- [ ] 11.3.6 Monitor error logs
- [ ] 11.3.7 Notify team of deployment completion

**Validates:** Requirements 10.2

## 12. Post-Deployment Monitoring

### 12.1 Monitor System Health
- [ ] 12.1.1 Monitor API endpoint response times (should be < 500ms average)
- [ ] 12.1.2 Monitor Firestore read operations (check quotas)
- [ ] 12.1.3 Monitor error rates (should be < 1%)
- [ ] 12.1.4 Check logs for unexpected errors
- [ ] 12.1.5 Verify user feedback is positive

### 12.2 Gather Performance Data
- [ ] 12.2.1 Collect query time metrics for different instructor sizes
- [ ] 12.2.2 Collect network payload size data
- [ ] 12.2.3 Collect UI render time data
- [ ] 12.2.4 Compare against performance requirements
- [ ] 12.2.5 Identify optimization opportunities

### 12.3 User Acceptance Testing
- [ ] 12.3.1 Have instructors test the new feature in production
- [ ] 12.3.2 Collect feedback on functionality
- [ ] 12.3.3 Collect feedback on performance
- [ ] 12.3.4 Address any issues or concerns
- [ ] 12.3.5 Document lessons learned
