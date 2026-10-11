# Requirements Document: Instructor Recent Activities Filter

## 1. Backend API Endpoint Requirements

### 1.1 Create Recent Activities Endpoint
The system SHALL provide a GET endpoint at `/api/v1/mission-scores/instructor/:instructorId/recent` that returns recent mission completions for students assigned to the specified instructor.

**Acceptance Criteria:**
- The endpoint path is `/api/v1/mission-scores/instructor/:instructorId/recent`
- The endpoint accepts GET requests
- The endpoint accepts an `instructorId` path parameter
- The endpoint accepts an optional `limit` query parameter (default: 10)
- The endpoint returns a JSON response with `activities` array and `count` number

### 1.2 Validate Instructor ID Parameter
The backend endpoint SHALL validate that the `instructorId` parameter is a non-empty string.

**Acceptance Criteria:**
- When `instructorId` is missing, return 400 Bad Request
- When `instructorId` is an empty string, return 400 Bad Request
- When `instructorId` is null or undefined, return 400 Bad Request
- Valid `instructorId` values are accepted and processed

### 1.3 Query Students by Instructor
The backend SHALL query the Firestore `students` collection to retrieve all approved students assigned to the specified instructor.

**Acceptance Criteria:**
- Query filters by `instructorid` field matching the provided `instructorId`
- Query filters by `status` field equal to 'approved'
- Query returns all matching student documents
- When no students match, return empty activities array

### 1.4 Extract Student IDs
The backend SHALL extract student document IDs and create a name lookup map from the students query results.

**Acceptance Criteria:**
- All student document IDs are collected in an array
- A Map is created with student ID keys and student name values
- No duplicate student IDs exist in the collection
- Map lookup is O(1) time complexity

### 1.5 Query Mission Scores by Student IDs
The backend SHALL query the Firestore `mission_score` collection to retrieve mission completions for the extracted student IDs.

**Acceptance Criteria:**
- Query filters by `studentId` field using 'in' operator with student IDs
- Query orders results by `completedAt` field in descending order
- When student count exceeds 10, queries are batched (Firestore 'in' limit)
- All mission scores for the specified students are retrieved

### 1.6 Batch Query for Large Student Lists
The backend SHALL split student IDs into batches of 10 and execute multiple Firestore queries when an instructor has more than 10 students.

**Acceptance Criteria:**
- Student IDs are split into arrays of maximum 10 elements each
- A separate Firestore query is executed for each batch
- Results from all batches are merged into a single array
- No student IDs are lost or duplicated during batching
- The final result maintains chronological order

### 1.7 Join Student Names with Mission Scores
The backend SHALL join student names from the students collection with mission score data.

**Acceptance Criteria:**
- Each mission score record is enhanced with the student's name
- Names are looked up from the studentNamesMap using studentId
- When a studentId is not found in the map, use placeholder "Unknown Student"
- All activities include a non-null studentName field

### 1.8 Sort Activities by Completion Time
The backend SHALL sort all retrieved activities by `completedAt` timestamp in descending order (most recent first).

**Acceptance Criteria:**
- Activities are sorted with most recent completedAt first
- When multiple activities have the same completedAt, order is stable
- Sorting is applied after merging all batched query results
- For any indices i < j, activities[i].completedAt >= activities[j].completedAt

### 1.9 Limit Results to Requested Number
The backend SHALL limit the returned activities array to the number specified in the `limit` query parameter.

**Acceptance Criteria:**
- Default limit is 10 when not specified
- Limit parameter is parsed as an integer
- When limit is 0, return empty array
- When limit exceeds available activities, return all available activities
- Returned array length is never greater than the requested limit

### 1.10 Return Formatted JSON Response
The backend SHALL return a JSON response containing an `activities` array and a `count` number.

**Acceptance Criteria:**
- Response has `activities` field with array of RecentActivity objects
- Response has `count` field with the number of activities returned
- Each activity has: id, studentId, studentName, missionId, missionTitle, score, passed, completedAt
- Response content-type is 'application/json'
- HTTP status is 200 OK on success

### 1.11 Handle Firestore Query Errors
The backend SHALL handle Firestore query failures and return appropriate error responses.

**Acceptance Criteria:**
- Firestore connection errors are caught
- Query timeout errors are caught
- Errors are logged to console with descriptive messages
- 500 Internal Server Error is returned on Firestore failures
- Error response includes `error` and `message` fields

### 1.12 Implement Batch Array Utility
The backend SHALL provide a `batchArray` utility function that splits an array into batches of a specified size.

**Acceptance Criteria:**
- Function accepts an array and batchSize parameter
- Returns array of arrays (batches)
- Each batch (except possibly last) has exactly batchSize elements
- Last batch may have fewer than batchSize elements
- Concatenating all batches recreates the original array in order
- No elements are lost or duplicated

## 2. Frontend Data Fetcher Requirements

### 2.1 Create Fetch Function
The frontend SHALL provide a `fetchInstructorRecentActivities` function that retrieves filtered activities from the backend.

**Acceptance Criteria:**
- Function is async and returns Promise<void>
- Function is callable from Vue component methods and lifecycle hooks
- Function updates the `instructorRecentActivities` ref with fetched data
- Function handles all error cases gracefully

### 2.2 Validate Current User Role
The frontend fetch function SHALL validate that the current user is an instructor before making API requests.

**Acceptance Criteria:**
- Function checks that `currentUser.value` is not null
- Function checks that `currentUser.value.role` equals 'instructor'
- When user is not an instructor, function returns early without making API call
- Error is logged when validation fails

### 2.3 Extract Instructor ID from Current User
The frontend SHALL extract the `instructorid` from the `currentUser.value` object.

**Acceptance Criteria:**
- Instructor ID is read from `currentUser.value.instructorid`
- When `instructorid` is null, set `instructorRecentActivities` to empty array
- When `instructorid` is empty string, set `instructorRecentActivities` to empty array
- Error is logged when instructor ID is invalid

### 2.4 Make HTTP GET Request to Backend
The frontend SHALL make an HTTP GET request to the backend recent activities endpoint.

**Acceptance Criteria:**
- Request URL is `http://localhost:3001/api/v1/mission-scores/instructor/${instructorId}/recent?limit=10`
- Request method is GET
- Request uses the native fetch API
- Request includes the instructorId from current user

### 2.5 Handle HTTP Response
The frontend SHALL parse the JSON response from the backend and update the reactive state.

**Acceptance Criteria:**
- Response is checked for `response.ok` status
- JSON is parsed from response body
- `instructorRecentActivities.value` is updated with `data.activities`
- Success message is logged to console

### 2.6 Handle Network Errors
The frontend SHALL handle network failures and API errors gracefully.

**Acceptance Criteria:**
- Network errors are caught in try-catch block
- HTTP error statuses (4xx, 5xx) are handled
- Errors are logged to console with descriptive messages
- On error, `instructorRecentActivities` is set to empty array
- UI displays "No student activity yet" message when array is empty

## 3. Frontend UI Display Requirements

### 3.1 Use Reactive Ref for Activities
The frontend UI SHALL use the `instructorRecentActivities` ref instead of the `instructorRecentSessions` computed property.

**Acceptance Criteria:**
- Vue template references `instructorRecentActivities` instead of `instructorRecentSessions`
- Ref is reactive and updates trigger UI re-render
- No dependency on localStorage data
- No dependency on `buildInstructorRecentSessions` function

### 3.2 Display Empty State Message
The UI SHALL display "No student activity yet" when the activities array is empty.

**Acceptance Criteria:**
- Message is shown when `instructorRecentActivities.length` is 0
- Message has class `instructor-review-empty`
- Message is hidden when activities array has items
- Message text is "No student activity yet."

### 3.3 Render Activities List
The UI SHALL render each activity in the activities array with student name, mission title, score, and pass/fail status.

**Acceptance Criteria:**
- Activities are rendered in a `ul` element with class `instructor-recent-list`
- Each activity is an `li` element with class `instructor-recent-item`
- Student name and mission title are displayed in format: "{studentName} · {missionTitle}"
- Score and pass/fail status are displayed in format: "{score}% PASS" or "{score}% FAIL"
- Each list item has unique `:key` attribute using `activity.id`

### 3.4 Apply Pass/Fail Styling
The UI SHALL apply different CSS classes for passed and failed activities.

**Acceptance Criteria:**
- Passed activities have class `instructor-recent-score--pass`
- Failed activities have class `instructor-recent-score--fail`
- Class is applied to the score span element
- Pass/fail determination is based on `activity.passed` boolean

### 3.5 Display Activities in Chronological Order
The UI SHALL display activities in the order received from the backend (most recent first).

**Acceptance Criteria:**
- No additional sorting is applied in the UI
- Activities maintain the descending `completedAt` order from backend
- First activity in list is the most recent completion
- Last activity in list is the oldest completion (within the limit)

## 4. Data Flow Integration Requirements

### 4.1 Call Fetch Function on Instructor Login
The frontend SHALL call `fetchInstructorRecentActivities` when an instructor logs in successfully.

**Acceptance Criteria:**
- Function is called after successful instructor authentication
- Function is called with the authenticated user's instructorId
- Activities are loaded before the Overview tab is displayed
- Loading happens asynchronously without blocking UI

### 4.2 Call Fetch Function on Overview Tab Selection
The frontend SHALL call `fetchInstructorRecentActivities` when the instructor selects the Overview tab.

**Acceptance Criteria:**
- Function is called when `instructorTab` is set to 'overview'
- Function refreshes activities data on tab switch
- Previous activities data is replaced with fresh data
- Loading is visible to user (future enhancement: loading spinner)

### 4.3 Initialize Recent Activities Ref
The frontend SHALL initialize the `instructorRecentActivities` ref as an empty array on component mount.

**Acceptance Criteria:**
- Ref is declared using Vue's `ref([])` at component setup
- Initial value is empty array
- Ref is available throughout component lifecycle
- Ref is reactive and triggers updates when modified

## 5. Data Validation Requirements

### 5.1 Validate RecentActivity Data Structure
The frontend SHALL validate that each activity object received from the backend has all required fields.

**Acceptance Criteria:**
- Each activity has `id` field (non-empty string)
- Each activity has `studentId` field (non-empty string)
- Each activity has `studentName` field (non-empty string)
- Each activity has `missionId` field (matches pattern /^M\d+-\d+$/)
- Each activity has `missionTitle` field (non-empty string)
- Each activity has `score` field (number between 0 and 100)
- Each activity has `passed` field (boolean)
- Each activity has `completedAt` field (Date or parseable timestamp)

### 5.2 Validate Backend Limit Parameter
The backend SHALL validate that the `limit` query parameter is a valid positive integer.

**Acceptance Criteria:**
- Limit is parsed as an integer
- Non-numeric limit values default to 10
- Negative limit values default to 10
- Zero limit is allowed and returns empty array
- Limit values greater than 100 are capped at 100

## 6. Error Handling Requirements

### 6.1 Handle No Students for Instructor
The system SHALL handle the case where an instructor has no approved students.

**Acceptance Criteria:**
- Backend returns empty activities array with count 0
- Frontend displays "No student activity yet" message
- No errors are logged for this valid state
- UI provides clear feedback to instructor

### 6.2 Handle No Activities for Students
The system SHALL handle the case where an instructor's students have not completed any missions.

**Acceptance Criteria:**
- Backend returns empty activities array with count 0
- Frontend displays "No student activity yet" message
- No errors are logged for this valid state
- UI provides clear feedback to instructor

### 6.3 Handle Missing Student in Lookup
The system SHALL handle the case where a mission_score references a studentId that doesn't exist in the students collection.

**Acceptance Criteria:**
- Activity is included with studentName set to "Unknown Student"
- Warning is logged to console
- Activity is not excluded from results
- Score and other data are still displayed

### 6.4 Handle Invalid Instructor ID Format
The backend SHALL validate the instructorId format and return appropriate errors.

**Acceptance Criteria:**
- Empty string returns 400 Bad Request
- Null value returns 400 Bad Request
- Undefined returns 400 Bad Request
- Special characters that could cause injection are rejected
- Valid alphanumeric IDs with hyphens are accepted

## 7. Performance Requirements

### 7.1 Query Performance
The backend SHALL complete queries and return results within acceptable time limits.

**Acceptance Criteria:**
- Queries for instructors with < 50 students complete in < 500ms
- Queries for instructors with > 50 students complete in < 2 seconds
- Network payload for 10 activities is approximately 1-5 KB
- UI render time for 10 activities is < 50ms

### 7.2 Database Index Requirements
The system SHALL have appropriate Firestore indexes for efficient queries.

**Acceptance Criteria:**
- Composite index exists on mission_score: (studentId ASC, completedAt DESC)
- Index is created before deployment
- Queries use the index (verified in Firestore console)
- Query performance meets requirements defined in 7.1

## 8. Security Requirements

### 8.1 Instructor Data Isolation
The system SHALL ensure instructors can only access activities for their own students.

**Acceptance Criteria:**
- Backend filters students by instructorid field
- No cross-instructor data leakage occurs
- Each instructor sees only their assigned students' activities
- Attempting to access another instructor's data returns empty results (not error)

### 8.2 Exclude Sensitive Student Data
The system SHALL exclude sensitive student information from the response.

**Acceptance Criteria:**
- Response does not include student email addresses
- Response does not include student passwords or hashes
- Response does not include student personal details beyond name
- Only activity-related data is included

### 8.3 Student Status Filtering
The system SHALL include only approved students in the results.

**Acceptance Criteria:**
- Students with status 'pending' are excluded
- Students with status 'rejected' are excluded
- Only students with status 'approved' are included
- Status filter is applied at the database query level

### 8.4 Input Sanitization
The backend SHALL sanitize and validate all input parameters to prevent injection attacks.

**Acceptance Criteria:**
- instructorId is validated as alphanumeric with hyphens only
- limit parameter is parsed as integer with bounds checking
- No SQL/NoSQL injection is possible (Firestore SDK handles this)
- Malformed inputs return 400 Bad Request with safe error messages

## 9. Testing Requirements

### 9.1 Backend Unit Tests
The system SHALL include comprehensive unit tests for backend functions.

**Acceptance Criteria:**
- Test `fetchInstructorRecentActivities` with mock Firestore data
- Test `batchArray` with arrays of sizes: 0, 5, 10, 15, 25 elements
- Test student name lookup with missing student IDs
- Test sorting with various timestamp combinations
- Test limit constraint with values: 0, 1, 5, 10, 100
- Test empty results when instructor has no students
- Achieve 90%+ code coverage for new functions

### 9.2 Frontend Unit Tests
The system SHALL include comprehensive unit tests for frontend functions.

**Acceptance Criteria:**
- Test `fetchInstructorRecentActivities` with mocked fetch responses
- Test error handling for network failures
- Test handling of empty response data
- Test validation of currentUser role and instructorId
- Test UI rendering with empty and populated activities arrays
- Achieve 90%+ code coverage for new functions

### 9.3 Integration Tests
The system SHALL include integration tests for end-to-end data flow.

**Acceptance Criteria:**
- Test complete flow: create instructor, students, activities, fetch results
- Test that instructor A cannot see instructor B's students' activities
- Test activities are sorted correctly in end-to-end flow
- Test performance with 50 students and 200 activities
- Test batch querying with > 10 students
- All test data is cleaned up after tests complete

### 9.4 Property-Based Tests
The system SHALL include property-based tests for critical correctness properties.

**Acceptance Criteria:**
- Test Property 1: Instructor Isolation (all activities belong to instructor's students)
- Test Property 2: Chronological Ordering (activities sorted by completedAt DESC)
- Test Property 3: Limit Constraint (result length ≤ limit)
- Tests use fast-check library for property generation
- Tests run with at least 100 random inputs each
- All properties pass consistently

## 10. Deployment Requirements

### 10.1 Backend Route Registration
The backend SHALL register the new route in the mission_scores router.

**Acceptance Criteria:**
- Route is added to `backend/routes/mission_scores.js`
- Route is registered with the Express app
- Route is accessible at the documented path
- Route is included in API documentation

### 10.2 Firestore Index Creation
The deployment process SHALL create the required Firestore composite index.

**Acceptance Criteria:**
- Index definition is added to firestore.indexes.json (if using config file)
- Index is created in Firestore console before deployment
- Index status is "Enabled" in Firestore console
- Queries successfully use the index

### 10.3 Remove Legacy Code
The codebase SHALL remove or deprecate the old localStorage-based implementation.

**Acceptance Criteria:**
- `buildInstructorRecentSessions` function is removed or marked deprecated
- `instructorRecentSessions` computed property is removed
- localStorage dependencies for instructor activities are removed
- All references in App.vue are updated to use new implementation
