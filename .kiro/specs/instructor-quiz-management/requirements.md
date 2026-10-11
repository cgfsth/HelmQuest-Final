# Requirements Document

## Introduction

The Instructor Quiz Management System enables instructors to create, manage, and validate quizzes/assessments for maritime training within the HelmQuest simulator. Currently, HelmQuest supports instructor-managed navigation training missions with completion tracking, but lacks a formal quiz/assessment system where instructors can create question-based evaluations and validate student responses. This system will integrate into the existing instructor console and student training hub, allowing instructors to author quiz questions, assign them to training modules or missions, and review student submissions.

## Glossary

- **Quiz_Manager**: The subsystem responsible for quiz CRUD operations, persistence, and retrieval
- **Quiz**: A collection of questions assigned to a training module or mission
- **Question**: An individual assessment item with a question prompt, question type, and correct answer(s)
- **Question_Type**: The format of a question (multiple-choice, true-false, fill-in-the-blank)
- **Student_Submission**: A student's answers to a quiz instance
- **Quiz_Result**: The graded outcome of a student submission, including score and validation status
- **Instructor_Console**: The instructor dashboard interface (activeScreen === 'dashboard' && userRole === 'instructor')
- **Student_Training_Hub**: The student mission/module navigation interface (activeScreen === 'dashboard' && userRole === 'student')
- **Training_Module**: An existing HelmQuest training module containing missions (e.g., m1-mission1)
- **Training_Mission**: An existing HelmQuest navigation mission within a module (e.g., M1-1)
- **Quiz_Assignment**: The association between a quiz and a specific training module or mission
- **Validation**: The instructor's review and approval of a student's quiz submission

## Requirements

### Requirement 1: Quiz Creation

**User Story:** As an instructor, I want to create quizzes with multiple questions, so that I can assess student knowledge and comprehension of maritime training concepts.

#### Acceptance Criteria

1. WHEN an instructor selects "Create Quiz" from the Instructor_Console, THE Quiz_Manager SHALL create a new empty Quiz with a unique identifier
2. THE Quiz_Manager SHALL allow the instructor to set a quiz title
3. THE Quiz_Manager SHALL allow the instructor to set a quiz description
4. WHEN an instructor adds a question, THE Quiz_Manager SHALL create a Question with a unique identifier within the Quiz
5. THE Quiz_Manager SHALL allow the instructor to set the question prompt text for each Question
6. THE Quiz_Manager SHALL support three Question_Type values: multiple-choice, true-false, and fill-in-the-blank
7. WHEN the Question_Type is multiple-choice, THE Quiz_Manager SHALL allow the instructor to define at least two and at most six answer options
8. WHEN the Question_Type is multiple-choice, THE Quiz_Manager SHALL allow the instructor to mark exactly one answer option as correct
9. WHEN the Question_Type is true-false, THE Quiz_Manager SHALL present exactly two answer options: "True" and "False"
10. WHEN the Question_Type is true-false, THE Quiz_Manager SHALL allow the instructor to mark one option as correct
11. WHEN the Question_Type is fill-in-the-blank, THE Quiz_Manager SHALL allow the instructor to define the correct text answer
12. WHEN the Question_Type is fill-in-the-blank, THE Quiz_Manager SHALL support case-insensitive answer matching
13. THE Quiz_Manager SHALL allow the instructor to add multiple questions to a single Quiz
14. THE Quiz_Manager SHALL allow the instructor to reorder questions within a Quiz
15. THE Quiz_Manager SHALL persist all Quiz data to the progress storage system
16. WHEN a Quiz is saved, THE Quiz_Manager SHALL return a success confirmation

### Requirement 2: Quiz Editing

**User Story:** As an instructor, I want to edit existing quizzes and questions, so that I can correct errors, update content, and improve assessments over time.

#### Acceptance Criteria

1. THE Quiz_Manager SHALL display a list of all created quizzes in the Instructor_Console
2. WHEN an instructor selects a Quiz from the list, THE Quiz_Manager SHALL load the complete Quiz data including all questions
3. THE Quiz_Manager SHALL allow the instructor to modify the quiz title
4. THE Quiz_Manager SHALL allow the instructor to modify the quiz description
5. THE Quiz_Manager SHALL allow the instructor to modify any Question prompt text
6. THE Quiz_Manager SHALL allow the instructor to change the Question_Type of any Question
7. WHEN the Question_Type changes, THE Quiz_Manager SHALL reset the answer options to default values for the new type
8. THE Quiz_Manager SHALL allow the instructor to modify answer options for multiple-choice questions
9. THE Quiz_Manager SHALL allow the instructor to change which answer option is marked correct
10. THE Quiz_Manager SHALL allow the instructor to modify the correct answer for fill-in-the-blank questions
11. THE Quiz_Manager SHALL allow the instructor to delete individual questions from a Quiz
12. WHEN the instructor saves changes, THE Quiz_Manager SHALL persist the updated Quiz data
13. WHEN the instructor saves changes, THE Quiz_Manager SHALL return a success confirmation

### Requirement 3: Quiz Deletion

**User Story:** As an instructor, I want to delete quizzes that are no longer needed, so that I can maintain a clean and organized quiz library.

#### Acceptance Criteria

1. THE Quiz_Manager SHALL provide a delete action for each Quiz in the quiz list
2. WHEN an instructor initiates quiz deletion, THE Quiz_Manager SHALL display a confirmation prompt
3. WHEN the instructor confirms deletion, THE Quiz_Manager SHALL remove the Quiz from persistent storage
4. WHEN a Quiz is deleted, THE Quiz_Manager SHALL remove all associated Quiz_Assignment records
5. WHEN a Quiz is deleted, THE Quiz_Manager SHALL preserve existing Student_Submission records for historical tracking
6. THE Quiz_Manager SHALL return a success confirmation after deletion

### Requirement 4: Quiz Assignment to Training Modules and Missions

**User Story:** As an instructor, I want to assign quizzes to specific training modules or missions, so that students receive relevant assessments at appropriate points in their training.

#### Acceptance Criteria

1. THE Quiz_Manager SHALL allow the instructor to create a Quiz_Assignment linking a Quiz to a Training_Module
2. THE Quiz_Manager SHALL allow the instructor to create a Quiz_Assignment linking a Quiz to a Training_Mission
3. THE Quiz_Manager SHALL allow a single Quiz to be assigned to multiple Training_Modules or Training_Missions
4. THE Quiz_Manager SHALL allow multiple Quizzes to be assigned to a single Training_Module or Training_Mission
5. THE Quiz_Manager SHALL display all Quiz_Assignment relationships in the Instructor_Console
6. THE Quiz_Manager SHALL allow the instructor to remove a Quiz_Assignment
7. WHEN a Quiz_Assignment is created or removed, THE Quiz_Manager SHALL persist the change

### Requirement 5: Student Quiz Access

**User Story:** As a student, I want to access assigned quizzes from my training hub, so that I can complete assessments for my training modules and missions.

#### Acceptance Criteria

1. WHEN a student views a Training_Module in the Student_Training_Hub, THE Quiz_Manager SHALL display all assigned Quizzes for that module
2. WHEN a student views a Training_Mission in the Student_Training_Hub, THE Quiz_Manager SHALL display all assigned Quizzes for that mission
3. THE Quiz_Manager SHALL display a "Take Quiz" action for each assigned Quiz
4. WHEN a student has not started a Quiz, THE Quiz_Manager SHALL display the quiz status as "Not Started"
5. WHEN a student has submitted a Quiz but it is not yet validated, THE Quiz_Manager SHALL display the quiz status as "Pending Review"
6. WHEN a Quiz has been validated by an instructor, THE Quiz_Manager SHALL display the quiz status as "Graded" with the score
7. THE Quiz_Manager SHALL allow students to retake a Quiz after instructor validation
8. WHEN a student selects "Take Quiz", THE Quiz_Manager SHALL load the Quiz interface with all questions

### Requirement 6: Student Quiz Taking

**User Story:** As a student, I want to answer quiz questions and submit my responses, so that my instructor can evaluate my understanding of training material.

#### Acceptance Criteria

1. THE Quiz_Manager SHALL display the quiz title and description at the start of the quiz
2. THE Quiz_Manager SHALL display all questions in the order defined by the instructor
3. WHEN a Question is multiple-choice, THE Quiz_Manager SHALL display all answer options as selectable choices
4. WHEN a Question is true-false, THE Quiz_Manager SHALL display "True" and "False" as selectable choices
5. WHEN a Question is fill-in-the-blank, THE Quiz_Manager SHALL display a text input field
6. THE Quiz_Manager SHALL allow the student to select or enter an answer for each Question
7. THE Quiz_Manager SHALL allow the student to change answers before submission
8. THE Quiz_Manager SHALL require the student to answer all questions before enabling submission
9. WHEN all questions are answered and the student submits, THE Quiz_Manager SHALL create a Student_Submission record
10. THE Student_Submission SHALL include the student identifier, quiz identifier, timestamp, and all answers
11. THE Quiz_Manager SHALL persist the Student_Submission
12. WHEN submission is complete, THE Quiz_Manager SHALL display a confirmation message
13. THE Quiz_Manager SHALL return the student to the Student_Training_Hub after submission

### Requirement 7: Instructor Submission Review

**User Story:** As an instructor, I want to view student quiz submissions, so that I can review their answers and assess their understanding.

#### Acceptance Criteria

1. THE Quiz_Manager SHALL display a list of all Student_Submissions in the Instructor_Console
2. THE Quiz_Manager SHALL display submission metadata: student name, quiz title, submission timestamp, and validation status
3. THE Quiz_Manager SHALL allow filtering submissions by validation status (pending, graded)
4. THE Quiz_Manager SHALL allow filtering submissions by student
5. THE Quiz_Manager SHALL allow filtering submissions by quiz
6. WHEN an instructor selects a Student_Submission, THE Quiz_Manager SHALL display the complete submission details
7. THE submission details SHALL include the quiz title, student name, submission timestamp, and all questions with student answers
8. THE Quiz_Manager SHALL display the correct answer alongside each student answer
9. THE Quiz_Manager SHALL visually distinguish correct answers from incorrect answers

### Requirement 8: Instructor Validation and Grading

**User Story:** As an instructor, I want to validate and grade student quiz submissions, so that students receive feedback and scores for their assessments.

#### Acceptance Criteria

1. WHEN viewing a Student_Submission, THE Quiz_Manager SHALL allow the instructor to mark each answer as correct or incorrect
2. THE Quiz_Manager SHALL provide automatic answer validation for multiple-choice questions by comparing the student answer to the correct answer
3. THE Quiz_Manager SHALL provide automatic answer validation for true-false questions by comparing the student answer to the correct answer
4. THE Quiz_Manager SHALL provide automatic answer validation for fill-in-the-blank questions using case-insensitive text matching
5. THE Quiz_Manager SHALL allow the instructor to override automatic validation for any answer
6. WHEN the instructor marks an answer as correct or incorrect, THE Quiz_Manager SHALL calculate the total score as a percentage
7. THE score calculation SHALL be: (number of correct answers / total number of questions) × 100
8. THE Quiz_Manager SHALL allow the instructor to add written feedback to the Student_Submission
9. WHEN the instructor completes validation, THE Quiz_Manager SHALL create a Quiz_Result record
10. THE Quiz_Result SHALL include the student identifier, quiz identifier, score percentage, validation timestamp, and instructor feedback
11. THE Quiz_Manager SHALL persist the Quiz_Result
12. WHEN a Quiz_Result is saved, THE Quiz_Manager SHALL update the Student_Submission status to "graded"
13. THE Quiz_Manager SHALL display a success confirmation after validation

### Requirement 9: Student Results Access

**User Story:** As a student, I want to view my graded quiz results and instructor feedback, so that I can understand my performance and learn from my mistakes.

#### Acceptance Criteria

1. WHEN a Quiz_Result exists for a student's submission, THE Quiz_Manager SHALL display the result in the Student_Training_Hub
2. THE Quiz_Manager SHALL display the score percentage
3. THE Quiz_Manager SHALL display the validation timestamp
4. THE Quiz_Manager SHALL display the instructor feedback if provided
5. THE Quiz_Manager SHALL allow the student to view the detailed results including all questions and answers
6. WHEN viewing detailed results, THE Quiz_Manager SHALL display each question with the student's answer and the correct answer
7. THE Quiz_Manager SHALL visually indicate which answers were correct and which were incorrect
8. THE Quiz_Manager SHALL allow the student to close the results view and return to the Student_Training_Hub

### Requirement 10: Quiz Statistics and Reporting

**User Story:** As an instructor, I want to view quiz statistics and student performance summaries, so that I can identify knowledge gaps and improve training effectiveness.

#### Acceptance Criteria

1. THE Quiz_Manager SHALL calculate and display the average score for each Quiz across all Student_Submissions
2. THE Quiz_Manager SHALL calculate and display the number of submissions per Quiz
3. THE Quiz_Manager SHALL calculate and display the number of pending submissions per Quiz
4. THE Quiz_Manager SHALL calculate and display the average score per student across all quizzes
5. THE Quiz_Manager SHALL calculate and display the number of completed quizzes per student
6. WHEN viewing a specific Quiz, THE Quiz_Manager SHALL display per-question statistics showing the percentage of students who answered each question correctly
7. THE Quiz_Manager SHALL display these statistics in the Instructor_Console

### Requirement 11: Quiz Data Persistence

**User Story:** As an instructor, I want all quiz data to be automatically saved and synchronized, so that no quiz content or student submissions are lost.

#### Acceptance Criteria

1. THE Quiz_Manager SHALL persist all Quiz data using the existing progressData storage mechanism
2. THE Quiz_Manager SHALL persist all Student_Submission records using the existing progressData storage mechanism
3. THE Quiz_Manager SHALL persist all Quiz_Result records using the existing progressData storage mechanism
4. THE Quiz_Manager SHALL persist all Quiz_Assignment records using the existing progressData storage mechanism
5. WHEN the application loads, THE Quiz_Manager SHALL load all quiz-related data from persistent storage
6. THE Quiz_Manager SHALL ensure data consistency between in-memory state and persistent storage

### Requirement 12: Integration with Existing Training System

**User Story:** As an instructor, I want the quiz system to integrate seamlessly with existing training modules and missions, so that I can use it without disrupting the current training workflow.

#### Acceptance Criteria

1. THE Quiz_Manager SHALL render quiz management UI within the existing Instructor_Console interface
2. THE Quiz_Manager SHALL render student quiz UI within the existing Student_Training_Hub interface
3. THE Quiz_Manager SHALL use the existing authentication system to identify students and instructors
4. THE Quiz_Manager SHALL use the existing userRole state variable to determine user permissions
5. THE Quiz_Manager SHALL reference Training_Module and Training_Mission identifiers from the existing trainingModules and navigationMissions data structures
6. THE Quiz_Manager SHALL not modify or interfere with existing mission simulation, scoring, or completion tracking
7. THE Quiz_Manager SHALL follow the existing UI design patterns and styling conventions used in the Instructor_Console and Student_Training_Hub


### Requirement 13: Instructor Level/Module Creation

**User Story:** As an instructor, I want to create custom training levels/modules with missions and quizzes, so that I can design complete learning pathways for students.

#### Acceptance Criteria

1. THE Quiz_Manager SHALL provide a "Create Level" action in the Instructor_Console
2. WHEN an instructor selects "Create Level", THE Quiz_Manager SHALL display a level creator interface
3. THE Quiz_Manager SHALL allow the instructor to set a level title
4. THE Quiz_Manager SHALL allow the instructor to set a level category (e.g., "Module 1", "Module 2")
5. THE Quiz_Manager SHALL allow the instructor to set a difficulty level (Beginner, Intermediate, Advanced)
6. THE Quiz_Manager SHALL allow the instructor to set an XP reward value
7. THE Quiz_Manager SHALL allow the instructor to add a level description
8. THE Quiz_Manager SHALL allow the instructor to add multiple mission steps to the level
9. WHEN adding a mission step, THE Quiz_Manager SHALL allow the instructor to define the step instruction text
10. WHEN adding a mission step, THE Quiz_Manager SHALL allow the instructor to define waypoint coordinates or compass headings
11. THE Quiz_Manager SHALL allow the instructor to add multiple objectives to the level
12. THE Quiz_Manager SHALL allow the instructor to assign quizzes to the level
13. THE Quiz_Manager SHALL allow the instructor to preview the level before publishing
14. WHEN the instructor publishes the level, THE Quiz_Manager SHALL persist the level to the training modules system
15. THE Quiz_Manager SHALL return a success confirmation after level creation

### Requirement 14: Level Lock/Unlock Control

**User Story:** As an instructor, I want to manually lock or unlock training levels, so that I can control when students can access specific content.

#### Acceptance Criteria

1. THE Quiz_Manager SHALL display a "Locked" toggle for each training level in the Instructor_Console
2. WHEN an instructor toggles a level to "Locked", THE Quiz_Manager SHALL prevent student access to that level
3. WHEN a level is locked, THE Student_Training_Hub SHALL display a "Locked" badge on the level card
4. WHEN a level is locked, THE Student_Training_Hub SHALL disable the "Start Mission" action for that level
5. WHEN an instructor toggles a level to "Unlocked", THE Quiz_Manager SHALL allow student access to that level
6. WHEN a level is unlocked, THE Student_Training_Hub SHALL display the level as accessible
7. THE Quiz_Manager SHALL persist the lock state with the level data
8. THE Quiz_Manager SHALL allow the instructor to lock/unlock multiple levels independently

### Requirement 15: Level Date-Based Access Control

**User Story:** As an instructor, I want to set open and close dates for training levels, so that levels automatically become available or locked based on a schedule.

#### Acceptance Criteria

1. THE Quiz_Manager SHALL allow the instructor to set an "Open Date" for each training level
2. THE Quiz_Manager SHALL allow the instructor to set a "Close Date" (deadline) for each training level
3. THE "Open Date" and "Close Date" fields SHALL accept date and time input
4. WHEN the current date/time is before the "Open Date", THE Quiz_Manager SHALL automatically lock the level
5. WHEN the current date/time reaches the "Open Date", THE Quiz_Manager SHALL automatically unlock the level
6. WHEN the current date/time reaches the "Close Date", THE Quiz_Manager SHALL automatically lock the level
7. THE automatic locking/unlocking SHALL override manual lock settings when date-based access is configured
8. THE Quiz_Manager SHALL check date-based access rules when a student loads the Student_Training_Hub
9. THE Student_Training_Hub SHALL display the open date for locked levels that have not yet opened
10. THE Student_Training_Hub SHALL display the deadline for accessible levels that will close
11. THE Student_Training_Hub SHALL display a "Closed" status for levels past their deadline
12. THE Quiz_Manager SHALL allow the instructor to clear or modify open/close dates at any time
13. THE Quiz_Manager SHALL display all date-based access settings in the Instructor_Console

### Requirement 16: Level Access Status Display

**User Story:** As a student, I want to see clear status indicators for training levels, so that I understand which levels are available and when locked levels will open.

#### Acceptance Criteria

1. WHEN a level is locked manually, THE Student_Training_Hub SHALL display "🔒 Locked by Instructor"
2. WHEN a level is locked due to an open date in the future, THE Student_Training_Hub SHALL display "🔒 Opens on [date]"
3. WHEN a level is locked due to a passed deadline, THE Student_Training_Hub SHALL display "🔒 Closed (Deadline Passed)"
4. WHEN a level is unlocked and accessible, THE Student_Training_Hub SHALL display "✓ Available"
5. WHEN a level is accessible but has an upcoming deadline, THE Student_Training_Hub SHALL display "⚠️ Due: [date]"
6. THE Student_Training_Hub SHALL use visual color coding for status indicators (green = available, yellow = warning, red = locked)
7. THE Student_Training_Hub SHALL display the status prominently on each level card

### Requirement 17: Level Editing and Management

**User Story:** As an instructor, I want to edit existing training levels and manage their settings, so that I can update content and access rules as needed.

#### Acceptance Criteria

1. THE Quiz_Manager SHALL display a list of all created levels in the Instructor_Console
2. WHEN an instructor selects a level, THE Quiz_Manager SHALL display the level editor interface
3. THE Quiz_Manager SHALL allow the instructor to modify all level fields (title, description, objectives, missions)
4. THE Quiz_Manager SHALL allow the instructor to modify lock status and date-based access settings
5. THE Quiz_Manager SHALL allow the instructor to modify assigned quizzes
6. THE Quiz_Manager SHALL allow the instructor to delete a level with confirmation
7. WHEN a level is deleted, THE Quiz_Manager SHALL preserve student completion records for historical tracking
8. THE Quiz_Manager SHALL persist all changes when the instructor saves
9. THE Quiz_Manager SHALL return a success confirmation after saving changes

### Requirement 18: Automatic Date-Based Lock Processing

**User Story:** As a system, I want to automatically process date-based lock rules in real-time, so that level access changes immediately when open/close dates are reached.

#### Acceptance Criteria

1. THE Quiz_Manager SHALL evaluate date-based access rules when the application loads
2. THE Quiz_Manager SHALL evaluate date-based access rules when a student navigates to the Student_Training_Hub
3. THE Quiz_Manager SHALL evaluate date-based access rules when an instructor modifies date settings
4. WHEN a level's open date is reached, THE Quiz_Manager SHALL update the level's accessible state immediately
5. WHEN a level's close date is reached, THE Quiz_Manager SHALL update the level's accessible state immediately
6. THE Quiz_Manager SHALL use the system clock for date/time comparisons
7. THE Quiz_Manager SHALL handle timezone considerations using ISO timestamp format
8. THE automatic lock processing SHALL not require page refresh to take effect

### Requirement 19: In-Simulator Quiz Integration

**User Story:** As a student, I want to complete quizzes inside the 3D simulator by navigating to checkpoints and answering questions, so that assessments are integrated with the immersive training experience.

#### Acceptance Criteria

1. WHEN a student starts a quiz mission, THE Quiz_Manager SHALL load the quiz data into the active simulation
2. THE Quiz_Manager SHALL spawn checkpoint markers in the 3D simulator, one for each question in the quiz
3. EACH checkpoint marker SHALL be positioned at coordinates defined by the instructor during quiz creation
4. THE checkpoint markers SHALL be visually distinct and identifiable (yellow/orange cylindrical markers)
5. THE Quiz_Manager SHALL track which checkpoints have been visited and which questions have been answered
6. WHEN the student's boat enters a checkpoint zone, THE Quiz_Manager SHALL detect proximity
7. WHEN the student is within a checkpoint zone and presses the Q key, THE Quiz_Manager SHALL display the question popup overlay
8. THE question popup SHALL display the question prompt and answer options in a HUD-style overlay
9. THE Quiz_Manager SHALL allow the student to select/enter an answer in the popup
10. WHEN the student submits an answer, THE Quiz_Manager SHALL store the answer and close the popup
11. WHEN an answer is submitted, THE Quiz_Manager SHALL mark the checkpoint as completed and reveal the next checkpoint
12. THE Quiz_Manager SHALL hide unanswered checkpoints until the previous checkpoint is completed (sequential progression)
13. WHEN all checkpoints are completed, THE Quiz_Manager SHALL submit the quiz and return the student to the training hub
14. THE Quiz_Manager SHALL display checkpoint progress (e.g., "Question 3/5") in the HUD
15. THE Quiz_Manager SHALL allow the student to cancel the quiz mission and return to the training hub

### Requirement 20: Instructor Buoy Configuration

**User Story:** As an instructor, I want to configure how many buoys appear in the quiz simulation, so that I can control the visual environment and complexity of the assessment.

#### Acceptance Criteria

1. WHEN creating or editing a quiz, THE Quiz_Manager SHALL allow the instructor to set a buoy count (0-20)
2. THE buoy count field SHALL be clearly labeled (e.g., "Number of Buoys in Simulator")
3. WHEN a student starts a quiz mission, THE Quiz_Manager SHALL read the buoy count from the quiz data
4. THE Quiz_Manager SHALL spawn the specified number of buoy objects in the 3D simulator
5. THE buoys SHALL be positioned randomly or in a predefined pattern within the simulation area
6. THE buoys SHALL use existing buoy models/assets from the HelmQuest simulator
7. THE buoys SHALL be visible and rendered throughout the quiz mission
8. THE buoys SHALL be removed when the quiz mission ends
9. THE Quiz_Manager SHALL validate that buoy count is between 0 and 20 before saving a quiz
10. THE buoy configuration SHALL be stored with the quiz data and persisted to localStorage

### Requirement 21: Quiz Checkpoint Coordinate Definition

**User Story:** As an instructor, I want to define checkpoint locations for each quiz question, so that I can control the navigation path and spatial distribution of questions in the simulator.

#### Acceptance Criteria

1. WHEN adding a question to a quiz, THE Quiz_Manager SHALL allow the instructor to set a checkpoint latitude coordinate
2. WHEN adding a question to a quiz, THE Quiz_Manager SHALL allow the instructor to set a checkpoint longitude coordinate
3. THE Quiz_Manager SHALL provide a default/auto-generated coordinate for each question if not manually set
4. THE default coordinates SHALL be distributed within the Davao Gulf simulation area (near 7.073°N, 125.648°E)
5. THE Quiz_Manager SHALL validate that coordinates are within valid latitude (-90 to 90) and longitude (-180 to 180) ranges
6. THE Quiz_Manager SHALL persist checkpoint coordinates with each question
7. THE Quiz_Manager SHALL display checkpoint coordinates in the quiz editor for instructor review
8. THE Quiz_Manager SHALL allow the instructor to modify checkpoint coordinates after creation
9. THE checkpoint coordinates SHALL be used to position checkpoint markers in the 3D simulator

### Requirement 22: Quiz Mission Start Flow

**User Story:** As a student, I want to start quiz missions from the training hub, so that I can enter the simulator and complete quiz assessments.

#### Acceptance Criteria

1. WHEN a student views assigned quizzes in the Student_Training_Hub, THE Quiz_Manager SHALL display a "Start Quiz Mission" button for available quizzes
2. WHEN the student clicks "Start Quiz Mission", THE Quiz_Manager SHALL transition the application to simulation mode
3. THE Quiz_Manager SHALL load the quiz data (questions, checkpoints, buoy count) into the simulation state
4. THE Quiz_Manager SHALL initialize the boat at a starting position near the first checkpoint
5. THE Quiz_Manager SHALL display a mission briefing overlay with quiz title, description, and instructions (e.g., "Navigate to checkpoints and press Q to answer questions")
6. WHEN the student dismisses the briefing, THE Quiz_Manager SHALL start the simulation with active controls
7. THE Quiz_Manager SHALL spawn all buoys and the first checkpoint marker
8. THE simulation state SHALL be set to "quiz-mission" mode to distinguish it from regular navigation missions
9. THE Quiz_Manager SHALL hide regular mission UI elements (e.g., mission steps panel) and show quiz-specific UI (e.g., checkpoint progress)

### Requirement 23: Quiz Checkpoint Detection

**User Story:** As a student, I want the simulator to detect when I reach a checkpoint, so that I can interact with it to answer the question.

#### Acceptance Criteria

1. THE Quiz_Manager SHALL continuously check the distance between the boat position and active checkpoint positions during simulation
2. THE Quiz_Manager SHALL define a checkpoint detection radius (e.g., 50 meters)
3. WHEN the boat enters the detection radius of a checkpoint, THE Quiz_Manager SHALL mark the checkpoint as "reachable"
4. WHEN a checkpoint is reachable, THE Quiz_Manager SHALL display a visual indicator (e.g., "Press Q to answer question" text near checkpoint)
5. THE Quiz_Manager SHALL listen for Q key presses during simulation
6. WHEN the Q key is pressed and no checkpoint is reachable, THE Quiz_Manager SHALL ignore the input
7. WHEN the Q key is pressed and a checkpoint is reachable, THE Quiz_Manager SHALL open the question popup for that checkpoint
8. THE Quiz_Manager SHALL pause the simulation (freeze boat controls) while the question popup is open
9. THE Quiz_Manager SHALL resume the simulation when the popup is closed

### Requirement 24: Quiz Question Popup (In-Simulator)

**User Story:** As a student, I want to see and answer quiz questions in an overlay within the simulator, so that I can complete assessments without leaving the 3D environment.

#### Acceptance Criteria

1. THE question popup SHALL be rendered as a HUD-style overlay on top of the 3D simulation
2. THE popup SHALL display the question prompt text prominently
3. THE popup SHALL display the question number and total question count (e.g., "Question 3 of 5")
4. WHEN the question is multiple-choice, THE popup SHALL display all answer options as selectable buttons or radio inputs
5. WHEN the question is true-false, THE popup SHALL display "True" and "False" as selectable buttons
6. WHEN the question is fill-in-the-blank, THE popup SHALL display a text input field
7. THE popup SHALL include a "Submit Answer" button
8. THE popup SHALL include a "Cancel" button to close without answering
9. THE popup SHALL disable the "Submit Answer" button until an answer is selected/entered
10. WHEN the student submits an answer, THE Quiz_Manager SHALL store the answer, close the popup, mark the checkpoint as completed, and reveal the next checkpoint
11. THE popup SHALL have a semi-transparent dark background overlay to improve readability
12. THE popup SHALL use clear, readable fonts and contrast for accessibility

### Requirement 25: Quiz Progress Tracking (In-Simulator)

**User Story:** As a student, I want to see my progress through the quiz checkpoints, so that I know how many questions remain and can navigate efficiently.

#### Acceptance Criteria

1. THE Quiz_Manager SHALL display a quiz progress indicator in the simulator HUD
2. THE progress indicator SHALL show the current question number and total questions (e.g., "Checkpoint 3/5")
3. THE progress indicator SHALL update immediately when a checkpoint is completed
4. THE Quiz_Manager SHALL display a list of completed checkpoints with visual checkmarks or completion icons
5. THE Quiz_Manager SHALL highlight the current active checkpoint in the UI
6. THE Quiz_Manager SHALL hide future checkpoints from the UI until they become active
7. THE progress indicator SHALL be positioned in a non-intrusive location (e.g., top-right corner of screen)
8. THE progress indicator SHALL remain visible throughout the quiz mission

### Requirement 26: Quiz Mission Completion and Submission (In-Simulator)

**User Story:** As a student, I want to automatically submit my quiz when all checkpoints are completed, so that my answers are recorded and I can return to the training hub.

#### Acceptance Criteria

1. WHEN the student answers the question at the final checkpoint, THE Quiz_Manager SHALL detect that all questions have been answered
2. THE Quiz_Manager SHALL display a "Quiz Complete" overlay with a summary (e.g., "All questions answered!")
3. THE overlay SHALL include a "Submit Quiz" button and a "Review Answers" option (optional for MVP)
4. WHEN the student clicks "Submit Quiz", THE Quiz_Manager SHALL create a Student_Submission record with all answers
5. THE Quiz_Manager SHALL persist the submission to progressData and localStorage
6. THE Quiz_Manager SHALL display a confirmation message (e.g., "Quiz submitted successfully! Awaiting instructor review.")
7. THE Quiz_Manager SHALL exit simulation mode and return the student to the Student_Training_Hub
8. THE quiz status in the training hub SHALL update to "Pending Review"
9. THE Quiz_Manager SHALL remove all checkpoints and buoys from the simulation
10. THE Quiz_Manager SHALL reset quiz mission state

### Requirement 27: Quiz Mission Cancellation

**User Story:** As a student, I want to cancel a quiz mission and return to the training hub without submitting, so that I can retry later if needed.

#### Acceptance Criteria

1. THE Quiz_Manager SHALL display a "Cancel Quiz Mission" button in the simulator HUD during quiz missions
2. WHEN the student clicks "Cancel Quiz Mission", THE Quiz_Manager SHALL display a confirmation dialog
3. THE confirmation dialog SHALL warn that progress will not be saved
4. WHEN the student confirms cancellation, THE Quiz_Manager SHALL exit simulation mode without creating a submission
5. THE Quiz_Manager SHALL return the student to the Student_Training_Hub
6. THE quiz status SHALL remain "Not Started" or the previous status
7. THE Quiz_Manager SHALL remove all checkpoints and buoys from the simulation
8. THE Quiz_Manager SHALL reset quiz mission state
9. THE ESC key SHALL trigger the cancellation flow as an alternative to the button

