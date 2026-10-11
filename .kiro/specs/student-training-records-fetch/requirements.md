# Requirements Document

## Introduction

The Student Training Records Fetch feature enables students to view their complete training history from Firestore. Currently, the Training Records tab displays "No completed missions yet" even when data exists in Firestore. This feature will fetch mission scores and quiz submissions from Firestore and display them in the student dashboard, providing students with visibility into their training progress and performance.

## Glossary

- **Training_Records_Display**: The UI section in the student dashboard that shows completed missions and quiz results
- **Mission_Score**: A record in the `mission_score` Firestore collection containing a student's performance on a navigation mission
- **Quiz_Submission**: A record in the `quiz_submissions` Firestore collection containing a student's quiz attempt and answers
- **Backend_API**: The Express.js backend server that handles HTTP requests and communicates with Firestore
- **Frontend_API**: The firebaseApi.js module that sends HTTP requests to the Backend_API
- **Student_Dashboard**: The main interface students see after logging in, containing the Training Records tab
- **Security_Filter**: The mechanism that ensures students can only access their own training records

## Requirements

### Requirement 1: Fetch Mission Scores from Firestore

**User Story:** As a student, I want to view my completed missions, so that I can review my navigation training history and performance scores.

#### Acceptance Criteria

1. WHEN the Student_Dashboard loads, THE Frontend_API SHALL call getMissionScores with the student's ID
2. THE Frontend_API SHALL send an HTTP GET request to `/api/v1/mission-scores/:studentId`
3. THE Backend_API SHALL query the `mission_score` collection filtered by studentId
4. THE Backend_API SHALL return mission scores ordered by completion date (most recent first)
5. WHEN mission scores are successfully fetched, THE Training_Records_Display SHALL store the results in firestoreMissionScores
6. IF the fetch fails, THE Frontend_API SHALL log the error and set firestoreMissionScores to an empty array
7. WHILE fetching data, THE Training_Records_Display SHALL display a loading indicator

### Requirement 2: Fetch Quiz Submissions from Firestore

**User Story:** As a student, I want to view my quiz results, so that I can review my quiz performance and identify areas for improvement.

#### Acceptance Criteria

1. WHEN the Student_Dashboard loads, THE Frontend_API SHALL call getQuizSubmissions with the student's ID
2. THE Frontend_API SHALL send an HTTP GET request to `/api/v1/quiz-submissions/student/:studentId`
3. THE Backend_API SHALL query the `quiz_submissions` collection filtered by studentId
4. THE Backend_API SHALL return quiz submissions ordered by submission date (most recent first)
5. WHEN quiz submissions are successfully fetched, THE Training_Records_Display SHALL store the results in firestoreQuizSubmissions
6. IF the fetch fails OR if storing results in firestoreQuizSubmissions fails, THE Frontend_API SHALL log the error and set firestoreQuizSubmissions to an empty array, and THE Training_Records_Display SHALL show an error message or empty state

### Requirement 3: Display Mission Training Records

**User Story:** As a student, I want to see detailed information about my completed missions, so that I can track my navigation training progress.

#### Acceptance Criteria

1. WHEN firestoreMissionScores contains mission records, THE Training_Records_Display SHALL render a mission list
2. FOR EACH mission record, THE Training_Records_Display SHALL display the mission title
3. FOR EACH mission record, THE Training_Records_Display SHALL display the score as a percentage
4. FOR EACH mission record, THE Training_Records_Display SHALL display the completion date in a readable format
5. FOR EACH mission record WHERE instructor information exists, THE Training_Records_Display SHALL display the instructor name
6. WHEN firestoreMissionScores is empty, THE Training_Records_Display SHALL show "No completed missions yet"

### Requirement 4: Display Quiz Training Records

**User Story:** As a student, I want to see detailed information about my quiz attempts, so that I can review my quiz performance history.

#### Acceptance Criteria

1. WHEN firestoreQuizSubmissions contains quiz records, THE Training_Records_Display SHALL render a quiz results list
2. FOR EACH quiz submission, THE Training_Records_Display SHALL display the quiz title
3. FOR EACH quiz submission, THE Training_Records_Display SHALL display the score as correct answers over total questions
4. FOR EACH quiz submission, THE Training_Records_Display SHALL display the submission date in a readable format
5. FOR EACH quiz submission WHERE module information exists, THE Training_Records_Display SHALL display the module name
6. WHEN firestoreQuizSubmissions is empty, THE Training_Records_Display SHALL show "No quiz results yet"

### Requirement 5: Implement Loading State

**User Story:** As a student, I want to see a loading indicator while my training records are being fetched, so that I know the system is working.

#### Acceptance Criteria

1. WHEN fetchStudentTrainingRecords is called, THE Training_Records_Display SHALL set loadingTrainingRecords to true
2. WHILE loadingTrainingRecords is true, THE Training_Records_Display SHALL display a loading indicator
3. WHEN both mission scores and quiz submissions have been fetched (regardless of success or failure), THE Training_Records_Display SHALL set loadingTrainingRecords to false
4. IF either fetch operation fails, THE Training_Records_Display SHALL still set loadingTrainingRecords to false only after both operations complete

### Requirement 6: Enforce Student Data Security

**User Story:** As a student, I want to ensure that I can only see my own training records, so that my privacy is protected.

#### Acceptance Criteria

1. THE Backend_API SHALL filter mission_score queries by the studentId parameter from the URL
2. THE Backend_API SHALL filter quiz_submissions queries by the studentId parameter from the URL
3. THE Frontend_API SHALL pass the current student's ID from currentUser.value.id
4. THE Backend_API SHALL NOT allow students to query records for other studentIds
5. WHEN a studentId is not provided, THE Backend_API SHALL return a 400 Bad Request validation error response
6. THE Security_Filter SHALL prevent students from accessing training records that do not belong to them

### Requirement 7: Create Backend Endpoint for Quiz Submissions

**User Story:** As a developer, I want a backend endpoint to fetch quiz submissions by student, so that the frontend can retrieve quiz training records.

#### Acceptance Criteria

1. THE Backend_API SHALL implement GET `/api/v1/quiz-submissions/student/:studentId`
2. WHEN the endpoint receives a request, THE Backend_API SHALL extract studentId from the URL parameters
3. THE Backend_API SHALL query the `quiz_submissions` collection where studentId matches the parameter
4. THE Backend_API SHALL order results by submittedAt or completedAt timestamp in descending order
5. WHEN quiz submissions are found, THE Backend_API SHALL return a 200 status with JSON response `{ submissions: [...], count: number }`, and WHEN no submissions match the studentId, THE Backend_API SHALL return a 200 status with `{ submissions: [], count: 0 }`
6. IF the query fails, THE Backend_API SHALL return a 500 status code with an error message
7. THE Backend_API SHALL register the quiz submissions route in server.js

### Requirement 8: Trigger Fetch on Dashboard Load

**User Story:** As a student, I want my training records to load automatically when I open my dashboard, so that I can immediately see my progress.

#### Acceptance Criteria

1. WHEN activeScreen changes to the student dashboard, THE Student_Dashboard SHALL call fetchStudentTrainingRecords
2. THE Student_Dashboard SHALL only call fetchStudentTrainingRecords when userRole is 'student'
3. WHEN currentUser.value.id is not available, THE Student_Dashboard SHALL not call fetchStudentTrainingRecords
4. THE Student_Dashboard SHALL call fetchStudentTrainingRecords exactly once per dashboard load, and fetch_call_count SHALL always equal 1 after any dashboard load regardless of prior state

### Requirement 9: Handle Empty States Gracefully

**User Story:** As a student who has not completed any training yet, I want to see helpful messages instead of empty lists, so that I understand what the sections are for.

#### Acceptance Criteria

1. WHEN firestoreMissionScores is an empty array, THE Training_Records_Display SHALL show "No completed missions yet. Start your training to build your record!"
2. WHEN firestoreQuizSubmissions is an empty array, THE Training_Records_Display SHALL show "No quiz results yet. Complete a quiz to see your results here!"
3. THE Training_Records_Display SHALL display empty state messages in a visually distinct style
4. THE Training_Records_Display SHALL not show loading indicators when displaying empty states

### Requirement 10: Add Frontend API Functions

**User Story:** As a developer, I want frontend API functions to fetch training records, so that the application can communicate with the backend consistently.

#### Acceptance Criteria

1. THE Frontend_API SHALL implement getMissionScores(studentId) function
2. THE Frontend_API SHALL implement getQuizSubmissions(studentId) function
3. WHEN getMissionScores is called, THE Frontend_API SHALL use apiFetch to send GET `/api/v1/mission-scores/:studentId`
4. WHEN getQuizSubmissions is called, THE Frontend_API SHALL use apiFetch to send GET `/api/v1/quiz-submissions/student/:studentId`
5. WHEN either function receives a successful response, THE Frontend_API SHALL return the parsed JSON data
6. IF either function encounters an error, THE Frontend_API SHALL log the error and re-throw it for the caller to handle
