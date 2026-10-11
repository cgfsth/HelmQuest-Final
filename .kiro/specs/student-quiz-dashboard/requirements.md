# Requirements Document: Student Quiz Dashboard

## Functional Requirements

### FR1: Quiz Score Data Retrieval
**Priority**: High  
**Description**: The system shall fetch and display all completed quiz scores for the authenticated student from the Firebase Firestore backend.

**Acceptance Criteria**:
- AC1.1: On page load, the system fetches quiz scores by calling the backend API endpoint `/api/v1/quiz-scores/:studentId` with the authenticated student's user ID
- AC1.2: The system displays a loading indicator while fetching quiz score data
- AC1.3: The system stores fetched quiz scores in component state for rendering and filtering
- AC1.4: Each quiz score record includes: quiz ID, quiz title, score percentage, pass/fail status, total questions, correct answers, and completion timestamp
- AC1.5: Quiz scores are sorted by completion date in descending order (most recent first)

### FR2: Statistics Panel Display
**Priority**: High  
**Description**: The system shall display an aggregate statistics panel showing total quizzes completed, number of quizzes passed, and number of quizzes failed.

**Acceptance Criteria**:
- AC2.1: The statistics panel displays "Total Quizzes Completed" count with an icon
- AC2.2: The statistics panel displays "Quizzes Passed" count with a checkmark icon
- AC2.3: The statistics panel displays "Quizzes Failed" count with an X icon
- AC2.4: Statistics are computed from the loaded quiz scores array
- AC2.5: Statistics update automatically when quiz data is loaded or filtered
- AC2.6: The sum of passed and failed quizzes equals the total completed count

### FR3: Quiz List Display
**Priority**: High  
**Description**: The system shall display a list of quiz cards, each showing information about a completed quiz.

**Acceptance Criteria**:
- AC3.1: Each quiz card displays the module icon (📚) and module name/title
- AC3.2: Each quiz card displays the quiz topic or subtitle
- AC3.3: Each quiz card displays the completion timestamp in human-readable format (e.g., "2 hours ago", "Jan 15, 2026")
- AC3.4: Each quiz card displays the score as a fraction (e.g., "8 / 10") and percentage bar showing visual progress (e.g., 80% filled bar)
- AC3.5: Each quiz card displays a status badge: green "PASSED" if passed, red "FAILED" if failed
- AC3.6: Each quiz card includes a "View Details" button
- AC3.7: Quiz cards are displayed in a scrollable list (if list exceeds viewport height)

### FR4: Filter Functionality
**Priority**: High  
**Description**: The system shall provide filter buttons allowing students to view all quizzes, only passed quizzes, or only failed quizzes.

**Acceptance Criteria**:
- AC4.1: The system displays three filter buttons: "All", "Passed", "Failed"
- AC4.2: Clicking "All" button displays all completed quizzes (default state)
- AC4.3: Clicking "Passed" button displays only quizzes where passed = true
- AC4.4: Clicking "Failed" button displays only quizzes where passed = false
- AC4.5: The active filter button is visually highlighted (e.g., different background color, border)
- AC4.6: Filter operations do not mutate the original quiz scores array
- AC4.7: Statistics panel continues to show totals for all quizzes (not filtered subset)
- AC4.8: Empty state message is displayed if no quizzes match the active filter

### FR5: View Quiz Details
**Priority**: High  
**Description**: The system shall allow students to view detailed quiz results including question-by-question breakdown when clicking "View Details" button.

**Acceptance Criteria**:
- AC5.1: Clicking "View Details" button fetches full quiz data (questions, correct answers) from backend
- AC5.2: The system fetches student's submission answers for the selected quiz attempt
- AC5.3: The QuizResultsModal component is displayed with the quiz results
- AC5.4: The modal shows overall score percentage with color coding (green ≥70%, yellow 50-69%, red <50%)
- AC5.5: The modal shows correct vs incorrect count (e.g., "8/10 correct")
- AC5.6: The modal displays each question with student's answer and correct answer
- AC5.7: Each question in the modal is marked with a checkmark (✓) if correct or X (✗) if incorrect
- AC5.8: Closing the modal returns the user to the quiz dashboard without navigation

### FR6: Navigation Integration
**Priority**: High  
**Description**: The system shall integrate a "Quizzes" navigation item in the student dashboard sidebar.

**Acceptance Criteria**:
- AC6.1: A "Quizzes" menu item is added to the navigation sidebar
- AC6.2: Clicking "Quizzes" menu item navigates to `/quizzes` route
- AC6.3: The "Quizzes" menu item is highlighted/active when on the quizzes page
- AC6.4: Navigation sidebar includes icons for: Overview, Quizzes, Missions, Leaderboards
- AC6.5: Navigation is consistent with existing HelmQuest Training UI patterns

### FR7: Student Profile Section
**Priority**: Medium  
**Description**: The quizzes page shall display the student's profile information including level and XP.

**Acceptance Criteria**:
- AC7.1: The page header or sidebar displays student's current level (e.g., "Scarlet Level")
- AC7.2: The page displays student's current XP points
- AC7.3: Profile section styling matches existing student dashboard patterns

### FR8: Empty State Handling
**Priority**: Medium  
**Description**: The system shall display appropriate empty state messages when no quiz data is available.

**Acceptance Criteria**:
- AC8.1: If student has no completed quizzes, display message: "No quizzes completed yet. Complete your first mission quiz to see results here!"
- AC8.2: If active filter produces no results, display message: "No [passed/failed] quizzes found. Try a different filter."
- AC8.3: Empty state includes an icon or illustration consistent with nautical theme
- AC8.4: Statistics panel shows 0/0/0 when no quizzes are completed

### FR9: Error Handling and Recovery
**Priority**: High  
**Description**: The system shall gracefully handle errors when fetching quiz data and provide recovery options.

**Acceptance Criteria**:
- AC9.1: If API fetch fails, display error message: "Failed to load quiz data. Please try again."
- AC9.2: Error message includes a "Retry" button to re-attempt data fetch
- AC9.3: Network timeout errors display specific message: "Request timed out. Please check your connection."
- AC9.4: Authentication errors (401) redirect user to login page with message: "Session expired. Please log in again."
- AC9.5: If quiz details fetch fails, display alert: "Failed to load quiz details. Please try again." without showing modal
- AC9.6: All errors are logged to console for debugging purposes

### FR10: Loading States
**Priority**: Medium  
**Description**: The system shall display loading indicators during asynchronous operations.

**Acceptance Criteria**:
- AC10.1: A loading spinner is displayed while fetching quiz scores on initial page load
- AC10.2: Loading indicator includes text: "Loading quiz data..."
- AC10.3: While loading, the quiz list area is empty or shows skeleton loaders
- AC10.4: When fetching quiz details for modal, a loading spinner is shown in the modal area
- AC10.5: Loading indicators are automatically hidden once data is loaded or error occurs

## Non-Functional Requirements

### NFR1: Performance
**Priority**: High  
**Description**: The quiz dashboard shall load and display data efficiently to provide a responsive user experience.

**Acceptance Criteria**:
- AC11.1: Initial page load (from navigation click to visible quiz list) completes within 2 seconds on standard broadband connection
- AC11.2: API request to fetch quiz scores completes within 500ms (backend target)
- AC11.3: Filter operations (client-side) complete instantly (<50ms) for up to 1000 quiz records
- AC11.4: Quiz details modal opens within 1 second of clicking "View Details" button
- AC11.5: The component handles arrays of up to 1000 quiz scores without performance degradation

### NFR2: Security
**Priority**: High  
**Description**: The quiz dashboard shall protect student data and ensure students can only access their own quiz scores.

**Acceptance Criteria**:
- AC12.1: All API requests include the authenticated user's Firebase Auth token
- AC12.2: Backend API validates that studentId in request matches the authenticated user's UID
- AC12.3: Students cannot access quiz scores of other students (enforced by backend and Firestore security rules)
- AC12.4: All API communication uses HTTPS protocol
- AC12.5: Quiz correct answers are not exposed in quiz score records (only fetched when viewing details)
- AC12.6: XSS prevention: All quiz titles and content are sanitized before rendering

### NFR3: Accessibility
**Priority**: Medium  
**Description**: The quiz dashboard shall be accessible to users with disabilities.

**Acceptance Criteria**:
- AC13.1: All interactive elements (buttons, cards) are keyboard accessible (Tab navigation)
- AC13.2: Filter buttons have clear focus indicators when selected via keyboard
- AC13.3: Status badges use color AND text (not color alone) to convey pass/fail status
- AC13.4: Screen readers can announce all key information (scores, status, filter state)
- AC13.5: Images and icons have appropriate alt text or aria-labels
- AC13.6: Color contrast ratios meet WCAG 2.1 Level AA standards (4.5:1 for text, 3:1 for UI components)

### NFR4: Responsive Design
**Priority**: Medium  
**Description**: The quiz dashboard shall adapt to different screen sizes and devices.

**Acceptance Criteria**:
- AC14.1: The dashboard is fully functional on desktop screens (≥1024px width)
- AC14.2: The dashboard adapts gracefully to tablet screens (768px - 1023px width)
- AC14.3: The dashboard is usable on mobile screens (≤767px width)
- AC14.4: Statistics panel items stack vertically on mobile devices
- AC14.5: Quiz cards use single-column layout on mobile devices
- AC14.6: Navigation sidebar collapses to hamburger menu on mobile devices (if not already implemented)

### NFR5: Maintainability
**Priority**: Medium  
**Description**: The quiz dashboard code shall be maintainable and follow established project conventions.

**Acceptance Criteria**:
- AC15.1: Component uses Vue 3 Composition API with TypeScript (if project uses TypeScript)
- AC15.2: Code follows existing project style guide and naming conventions
- AC15.3: Functions include JSDoc comments describing parameters, return types, and purpose
- AC15.4: Component state and computed properties are clearly named and documented
- AC15.5: CSS classes follow BEM naming convention or project's established pattern
- AC15.6: Component is modular and reusable (e.g., QuizCard could be extracted as separate component if needed)

### NFR6: Scalability
**Priority**: Low  
**Description**: The quiz dashboard architecture shall accommodate future growth in quiz data volume.

**Acceptance Criteria**:
- AC16.1: Current implementation handles up to 1000 quiz scores per student without performance issues
- AC16.2: Architecture allows easy addition of pagination if needed (commented guidance in code)
- AC16.3: Backend API supports query limits and offsets for future pagination implementation
- AC16.4: Firestore queries use appropriate indexes for efficient data retrieval
- AC16.5: Component state management allows for easy integration of caching strategies

### NFR7: Usability
**Priority**: High  
**Description**: The quiz dashboard shall provide an intuitive and user-friendly interface.

**Acceptance Criteria**:
- AC17.1: Dashboard layout is consistent with existing HelmQuest Training UI patterns
- AC17.2: Visual hierarchy clearly distinguishes statistics panel, filters, and quiz list
- AC17.3: Status badges use intuitive colors (green for pass, red for fail)
- AC17.4: Score visualization (percentage bar) provides quick visual feedback
- AC17.5: "View Details" button is clearly visible and clickable
- AC17.6: Error messages are clear, specific, and actionable
- AC17.7: Empty states provide helpful guidance to users

### NFR8: Compatibility
**Priority**: Medium  
**Description**: The quiz dashboard shall work across supported browsers and devices.

**Acceptance Criteria**:
- AC18.1: Dashboard functions correctly in Chrome (latest 2 versions)
- AC18.2: Dashboard functions correctly in Firefox (latest 2 versions)
- AC18.3: Dashboard functions correctly in Safari (latest 2 versions)
- AC18.4: Dashboard functions correctly in Edge (latest 2 versions)
- AC18.5: No critical browser-specific bugs or layout issues

### NFR9: Testability
**Priority**: Medium  
**Description**: The quiz dashboard shall be designed for comprehensive testing.

**Acceptance Criteria**:
- AC19.1: All key functions (fetchQuizScores, applyFilter, viewQuizDetails) are unit testable
- AC19.2: Component accepts test props or exposes test hooks for integration testing
- AC19.3: API calls are mockable for testing without live backend
- AC19.4: Component achieves minimum 80% code coverage in unit tests
- AC19.5: All user interaction flows are covered by integration or E2E tests

### NFR10: Theme Consistency
**Priority**: High  
**Description**: The quiz dashboard shall follow the HelmQuest Training nautical theme consistently.

**Acceptance Criteria**:
- AC20.1: Background uses blue ocean gradient pattern consistent with other pages
- AC20.2: Card components use glass morphism styling with backdrop blur
- AC20.3: Typography follows established font families and sizes
- AC20.4: Color palette uses theme colors: primary blue (#3b82f6), success green (#22c55e), danger red (#ef4444)
- AC20.5: Icons and visual elements align with nautical/maritime theme
- AC20.6: Animations and transitions match the smoothness and timing of existing components

## Constraints

### Technical Constraints
- TC1: Must use Vue 3 with Composition API (project standard)
- TC2: Must integrate with existing Firebase Firestore backend
- TC3: Must use existing QuizResultsModal component (no modifications allowed to modal interface)
- TC4: Must work with existing authentication system (Firebase Auth)
- TC5: Must follow existing Vue Router configuration patterns

### Business Constraints
- BC1: Must be completed as part of student dashboard feature set
- BC2: Must align with existing HelmQuest Training branding and theme
- BC3: Must not introduce new external dependencies (use existing libraries only)

### Data Constraints
- DC1: Quiz scores are stored in Firestore `quiz_score` collection with predefined schema
- DC2: Student can only access their own quiz scores (enforced by Firestore security rules)
- DC3: Quiz data (questions, correct answers) stored in separate `quizzes` collection
- DC4: Submission answers stored in `quiz_submissions` collection (if applicable)

### Time Constraints
- T1: Development timeline aligns with overall project sprint schedule
- T2: Testing must be completed before integration with production environment

## Assumptions

### Technical Assumptions
- A1: Backend API endpoints `/api/v1/quiz-scores/:studentId` and `/api/v1/quizzes/:quizId` are available and functional
- A2: Firebase Firestore security rules properly restrict access to student's own data
- A3: Existing authentication system provides `currentUser` with `uid` property
- A4: QuizResultsModal component is fully functional and tested
- A5: Backend returns quiz scores sorted by `completedAt` in descending order

### User Assumptions
- U1: Students have completed at least one quiz before accessing the dashboard (or expect to see empty state)
- U2: Students understand pass/fail threshold (typically 70% score)
- U3: Students are familiar with the HelmQuest Training navigation patterns
- U4: Students have stable internet connection for API requests

### Data Assumptions
- D1: Each quiz score record has a unique Firestore document ID
- D2: Quiz titles are stored in quiz score records for display (cached from quiz data)
- D3: All quiz scores have valid `passed` boolean field
- D4: Completion timestamps are valid Date or Firestore Timestamp objects
- D5: Score percentages are integers between 0-100

### Environment Assumptions
- E1: Application runs in modern browsers with ES6+ support
- E2: Users have JavaScript enabled in their browsers
- E3: Firebase SDK is properly configured and authenticated
- E4: Backend API is accessible and has uptime >99%

## Dependencies

### External Dependencies
- Vue 3 (already installed): Core framework for component development
- Firebase SDK (already installed): Firestore database and Authentication
- Vue Router (already installed): Client-side routing for /quizzes page

### Internal Dependencies
- QuizResultsModal.vue: Existing modal component for detailed quiz results
- Backend API: `/api/v1/quiz-scores/:studentId` endpoint (already exists)
- Backend API: `/api/v1/quizzes/:quizId` endpoint (may need to be created)
- Backend API: `/api/v1/quiz-submissions/:submissionId` endpoint (may need to be created)
- Authentication composable: For accessing current user ID (e.g., `useAuth()`)
- Navigation sidebar component: For adding "Quizzes" menu item

### Data Dependencies
- Firestore `quiz_score` collection: Must contain student quiz score records
- Firestore `quizzes` collection: Must contain full quiz data with questions
- Firestore `quiz_submissions` collection: Must contain student answer submissions
- Firebase Auth: Must provide authenticated user context

### Styling Dependencies
- Existing HelmQuest theme CSS variables and classes
- Glass card component styling patterns
- Nautical theme assets (colors, gradients, icons)

## Glossary

- **Quiz Score**: A record of a student's performance on a completed quiz, including score percentage, pass/fail status, and timestamp
- **Pass Threshold**: The minimum score percentage required to pass a quiz (typically 70%)
- **Filter**: A client-side operation to show a subset of quiz scores based on pass/fail status
- **Statistics Panel**: UI component displaying aggregate counts of completed, passed, and failed quizzes
- **Quiz Card**: UI component displaying summary information for a single quiz score
- **QuizResultsModal**: Existing modal component that shows detailed question-by-question breakdown of quiz results
- **Firestore**: Google's NoSQL cloud database used for storing quiz scores and related data
- **Firebase Auth**: Google's authentication service providing user identity and token management
- **Composition API**: Vue 3's modern API for organizing component logic using reactive refs and computed properties
- **Glass Morphism**: Design style using translucent backgrounds with blur effects, used in HelmQuest theme
- **Nautical Theme**: Maritime-inspired visual design including ocean gradients, ship icons, and sailing terminology
