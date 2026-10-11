# Requirements Document

## Introduction

This document specifies requirements for fixing a bug in the quiz score recording system and enhancing the quiz_score collection schema to include mission context. The system currently incorrectly stores a percentage value (0-100) in the quiz_score field instead of the raw correct answer count. Additionally, the system needs to capture mission_id context when quizzes are started from missions to enable proper mission-quiz linkage and cascade deletion operations.

## Glossary

- **Quiz_Score_System**: The backend and frontend components responsible for recording, storing, and retrieving quiz completion data in Firestore
- **Quiz_Score_Field**: The numeric field in the quiz_score Firestore collection that represents the raw count of correct answers
- **Score_Percentage**: The calculated percentage value (0-100) derived from (correctAnswers / totalQuestions) * 100
- **Mission_Context**: The mission_id and related metadata available when a quiz is initiated from within a mission workflow
- **Frontend**: The Vue.js application (App.vue) that submits quiz scores via REST API
- **Backend**: The Express.js REST API (quiz_scores.js) that receives quiz score submissions and writes to Firestore
- **Quiz_Score_Collection**: The Firestore collection named "quiz_score" that stores all quiz completion records

## Requirements

### Requirement 1: Correct Quiz Score Field Storage

**User Story:** As a data analyst, I want the quiz_score field to store the raw correct answer count, so that I can perform accurate aggregate calculations and analytics on student quiz performance.

#### Acceptance Criteria

1.1 WHEN THE Frontend submits a quiz score, THE Quiz_Score_System SHALL send correctAnswers as the quiz_score field value in the API request body

1.2 WHEN THE Backend receives a quiz score POST request, THE Quiz_Score_System SHALL store the correctAnswers value in the quiz_score field in the Quiz_Score_Collection

1.3 WHEN a student answers 5 out of 10 questions correctly, THE Quiz_Score_System SHALL store quiz_score: 5 in Firestore

1.4 WHEN a student answers 8 out of 12 questions correctly, THE Quiz_Score_System SHALL store quiz_score: 8 in Firestore

1.5 THE Quiz_Score_System SHALL continue to store the Score_Percentage in the score field as a separate value

1.6 THE Quiz_Score_System SHALL maintain the correctAnswers field as an independent field for backwards compatibility

### Requirement 2: Mission ID Context Capture

**User Story:** As a system administrator, I want quiz scores to include mission_id when the quiz is started from a mission, so that quiz records can be properly cleaned up when missions are deleted.

#### Acceptance Criteria

2.1 WHEN a quiz is started from a mission workflow, THE Frontend SHALL capture and store the mission_id from activeTrainingModule

2.2 WHEN a quiz is started from a mission workflow, THE Frontend SHALL pass mission_id in the quiz score submission payload

2.3 WHEN THE Backend receives a quiz score with mission_id, THE Quiz_Score_System SHALL store the mission_id field in the Quiz_Score_Collection

2.4 WHEN a quiz is started outside of a mission context, THE Quiz_Score_System SHALL store mission_id as null or omit the field

2.5 WHEN retrieving quiz scores, THE Backend SHALL include the mission_id field in the response data

2.6 THE Quiz_Score_System SHALL store mission_id as a string field matching the Firestore document ID format

### Requirement 3: Module ID Context Capture

**User Story:** As a curriculum designer, I want quiz scores to include module_id, so that I can track which training modules have associated quiz completions.

#### Acceptance Criteria

3.1 WHEN a quiz is started from a mission workflow, THE Frontend SHALL capture and store the module_id from activeTrainingModule

3.2 WHEN THE Frontend submits a quiz score, THE Quiz_Score_System SHALL include module_id in the submission payload when available

3.3 WHEN THE Backend receives a quiz score with module_id, THE Quiz_Score_System SHALL store the module_id field in the Quiz_Score_Collection

3.4 WHEN a quiz is started without module context, THE Quiz_Score_System SHALL store module_id as null or omit the field

3.5 THE Quiz_Score_System SHALL store module_id as a string field matching the Firestore document ID format

### Requirement 4: Schema Alignment and Data Consistency

**User Story:** As a backend developer, I want the quiz_score schema to align with the frontend data structure, so that data flows consistently through the entire system.

#### Acceptance Criteria

4.1 THE Quiz_Score_Collection SHALL store documents with the following field structure: studentId (string), quizId (string), quizTitle (string), score (number 0-100), quiz_score (number representing raw correct count), passed (boolean), totalQuestions (number), correctAnswers (number), mission_id (string or null), module_id (string or null), completedAt (timestamp), createdAt (timestamp)

4.2 WHEN THE Backend writes to the Quiz_Score_Collection, THE Quiz_Score_System SHALL use camelCase field naming convention for all fields

4.3 THE Backend SHALL validate that quiz_score is a non-negative integer

4.4 THE Backend SHALL validate that quiz_score does not exceed totalQuestions

4.5 WHEN quiz_score exceeds totalQuestions, THE Backend SHALL return a 400 Bad Request error with message "quiz_score cannot exceed totalQuestions"

4.6 THE Backend SHALL accept quiz_score as a required field in the POST request body

### Requirement 5: Backwards Compatibility

**User Story:** As a system maintainer, I want existing quiz score records to remain valid, so that historical data is not corrupted by the schema changes.

#### Acceptance Criteria

5.1 THE Quiz_Score_System SHALL continue to support reading quiz score records that do not have mission_id or module_id fields

5.2 WHEN retrieving quiz scores without mission_id, THE Backend SHALL return mission_id as null or omit the field from the response

5.3 THE Quiz_Score_System SHALL NOT require migration of existing quiz_score documents

5.4 WHEN calculating statistics, THE Backend SHALL handle quiz score records with and without mission_id fields

5.5 THE Quiz_Score_System SHALL preserve all existing fields (score, correctAnswers, passed, totalQuestions) in their current format

## Validation Criteria

- All acceptance criteria can be verified through automated API integration tests
- Quiz score field values can be validated by querying Firestore directly
- Mission context capture can be verified by inspecting quiz_score documents created during mission workflows
- Schema alignment can be validated by comparing API request/response payloads with Firestore document structure
