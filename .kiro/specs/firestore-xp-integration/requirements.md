# Requirements Document

## Introduction

The student portal currently displays inconsistent XP (Experience Points) values compared to the leaderboards. The portal shows 184 XP calculated from localStorage, while leaderboards correctly show 100 XP from Firestore. This inconsistency creates confusion and undermines trust in the system's accuracy. These requirements define the integration of Firestore-backed XP calculation into the student portal to establish a single source of truth for XP values across the entire application.

## Glossary

- **Student_Portal**: The main interface displaying student statistics including XP, rank, badges, and certificates
- **Leaderboard**: The ranking interface showing students ordered by XP from Firestore
- **Firestore_API**: The backend REST API endpoint `/api/v1/mission-scores/student/:id/total-xp` that calculates XP from Firestore data
- **LocalStorage**: Browser-based persistent storage containing student badges, certificates, and legacy XP values
- **XP**: Experience Points earned by completing missions
- **Mission_Score**: Firestore collection storing student mission completion records
- **Sync_Function**: The `syncStudentMotivation()` function in App.vue responsible for updating displayed student statistics

## Requirements

### Requirement 1: XP Data Source Migration

**User Story:** As a student, I want to see consistent XP values across all parts of the application, so that I can trust the accuracy of my progress tracking.

#### Acceptance Criteria

1. WHEN the Sync_Function executes, THE Student_Portal SHALL fetch XP data from the Firestore_API endpoint
2. WHEN the Firestore_API returns XP data, THE Student_Portal SHALL display the returned totalXp value
3. WHEN the Firestore_API returns mission completion count, THE Student_Portal SHALL display the returned missionsCompleted value
4. THE Student_Portal SHALL NOT use localStorage for XP calculation after integration
5. THE Leaderboard SHALL continue using the same Firestore_API endpoint for XP values

### Requirement 2: API Integration

**User Story:** As a developer, I want the student portal to call the existing backend API for XP data, so that we maintain a single source of truth.

#### Acceptance Criteria

1. WHEN the Sync_Function executes, THE Sync_Function SHALL make an HTTP GET request to `/api/v1/mission-scores/student/:studentId/total-xp`
2. THE Sync_Function SHALL be modified to async function syntax
3. WHEN the API request is made, THE Sync_Function SHALL use the authenticated student's ID in the URL parameter
4. WHEN the API responds successfully, THE Sync_Function SHALL parse the JSON response containing totalXp and missionsCompleted fields
5. THE Sync_Function SHALL execute the API call before updating the student display data

### Requirement 3: Error Handling and Resilience

**User Story:** As a student, I want the portal to remain functional even when the backend is temporarily unavailable, so that I can continue using the application.

#### Acceptance Criteria

1. WHEN the Firestore_API request fails, THE Sync_Function SHALL catch the error and prevent application crash
2. IF the Firestore_API request fails, THEN THE Sync_Function SHALL log a warning message to the console
3. IF the Firestore_API request fails, THEN THE Sync_Function SHALL use fallback values of totalXp equals 0 and missionsCompleted equals 0
4. WHEN error fallback is triggered, THE Student_Portal SHALL remain functional and display other statistics correctly
5. WHEN the Firestore_API becomes available again, THE Student_Portal SHALL display correct XP values on next sync

### Requirement 4: Backward Compatibility for Other Statistics

**User Story:** As a student, I want my badges, certificates, and scores to continue displaying correctly during the XP integration, so that no functionality is lost.

#### Acceptance Criteria

1. WHEN the Sync_Function executes, THE Sync_Function SHALL continue calling getStudentMotivationSummary for non-XP statistics
2. THE Student_Portal SHALL fetch badges data from LocalStorage through getStudentMotivationSummary
3. THE Student_Portal SHALL fetch certificates data from LocalStorage through getStudentMotivationSummary
4. THE Student_Portal SHALL fetch score statistics from LocalStorage through getStudentMotivationSummary
5. WHEN displaying student rank, THE Student_Portal SHALL calculate rank based on Firestore_API XP value
6. THE getStudentMotivationSummary function SHALL remain unchanged in implementation

### Requirement 5: XP Consistency Verification

**User Story:** As a student, I want the XP displayed in my portal to match the XP shown in leaderboards, so that I know my position is accurate.

#### Acceptance Criteria

1. FOR ALL students, the Student_Portal XP value SHALL equal the Leaderboard XP value for the same student
2. FOR ALL students, both Student_Portal and Leaderboard SHALL fetch XP from the identical Firestore_API endpoint
3. WHEN a student completes a mission, THE Student_Portal SHALL reflect the updated XP value on next sync
4. WHEN XP data is fetched, THE XP value SHALL represent the sum of all passed missions' XP rewards from Firestore

### Requirement 6: Function Signature Updates

**User Story:** As a developer, I want clear async function signatures, so that the codebase is maintainable and follows JavaScript best practices.

#### Acceptance Criteria

1. THE Sync_Function SHALL be declared with async function syntax
2. WHEN the Sync_Function is called from other code, THE calling code SHALL use await keyword
3. IF calling code cannot use await, THEN THE calling code SHALL handle the returned Promise appropriately
4. THE Sync_Function SHALL complete all async operations before updating the student display state

### Requirement 7: Data Model Integrity

**User Story:** As a developer, I want the student display state to accurately reflect Firestore data, so that the UI is trustworthy.

#### Acceptance Criteria

1. WHEN the Sync_Function completes, THE demoStudent reactive state SHALL contain XP from Firestore_API
2. WHEN the Sync_Function completes, THE demoStudent reactive state SHALL contain completed mission count from Firestore_API
3. WHEN the Sync_Function completes, THE demoStudent reactive state SHALL contain badges from LocalStorage
4. WHEN the Sync_Function completes, THE demoStudent reactive state SHALL contain certificates from LocalStorage
5. WHEN the Sync_Function completes, THE demoStudent reactive state SHALL contain rank calculated from Firestore XP

### Requirement 8: No Breaking Changes to Helper Functions

**User Story:** As a developer, I want to minimize code changes, so that the integration is low-risk and focused.

#### Acceptance Criteria

1. THE getStudentMotivationSummary function interface SHALL remain unchanged
2. THE getStudentMotivationSummary function implementation SHALL remain unchanged
3. THE studentMotivation.js module SHALL require no modifications
4. WHEN getStudentMotivationSummary returns data, THE Sync_Function SHALL selectively use only non-XP fields

### Requirement 9: Student Authentication Context

**User Story:** As a student, I want XP fetched only when I'm logged in, so that the system respects authentication boundaries.

#### Acceptance Criteria

1. WHEN the Sync_Function executes, THE Sync_Function SHALL verify currentUser.id is not null before making API request
2. WHEN the Sync_Function executes, THE Sync_Function SHALL verify userRole equals "student" before making API request
3. IF currentUser.id is null, THEN THE Sync_Function SHALL return early without making API request
4. IF userRole is not "student", THEN THE Sync_Function SHALL return early without making API request

### Requirement 10: Performance and User Experience

**User Story:** As a student, I want the portal to load quickly and smoothly, so that the integration doesn't slow down my experience.

#### Acceptance Criteria

1. WHEN the Sync_Function makes API request, THE request SHALL not block other UI operations
2. THE Sync_Function SHALL use async/await pattern to maintain non-blocking execution
3. WHEN the API responds, THE Student_Portal SHALL update the displayed XP value
4. THE Firestore_API endpoint SHALL respond within 500 milliseconds for typical student queries
5. WHEN multiple sync operations occur, THE Sync_Function SHALL handle them without race conditions
