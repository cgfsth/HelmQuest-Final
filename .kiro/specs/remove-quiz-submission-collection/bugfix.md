# Bugfix Requirements Document

## Introduction

The application has an incorrect database collection called `quiz_submission` (and `quiz_submissions`) with associated API endpoints and functionality. However, the actual correct collection being used is `Quizzes-Score` with the structure:
- mission_id: string
- quiz_id: string  
- quiz_score: number
- student_id: string
- total_items: number

This bugfix removes all references to the incorrect `quiz_submission`/`quiz_submissions` collection and ensures all quiz scoring functionality uses only the `Quizzes-Score` collection.

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN the backend routes reference `quiz_submission` collection (in progress.js line 33) THEN the system queries an incorrect/non-existent database collection

1.2 WHEN the backend routes reference `quiz_submission` collection (in quizzes.js line 90) THEN the system queries an incorrect/non-existent database collection for grading operations

1.3 WHEN the backend routes reference `quiz_submissions` collection (in quizzes.js line 78, 151, 205) THEN the system writes to and queries an incorrect database collection

1.4 WHEN the backend routes reference both `quiz_submissions` and `quiz_submission` (in missions.js line 145) THEN the system attempts cascade deletion on incorrect collections

1.5 WHEN the server.js registers the `/api/v1/quiz-submissions` endpoint (line 79) THEN the system exposes an API route using incorrect naming convention

1.6 WHEN the frontend App.vue references `quiz_submissions` collection (line 8045, 8057) THEN the system logs messages about writing to an incorrect collection

1.7 WHEN documentation files reference `quiz_submission`/`quiz_submissions` collections THEN the system specifications describe incorrect database structure

### Expected Behavior (Correct)

2.1 WHEN backend routes need to access quiz score data THEN the system SHALL query only the `Quizzes-Score` collection

2.2 WHEN backend routes perform grading operations THEN the system SHALL read from and write to only the `Quizzes-Score` collection

2.3 WHEN backend routes perform quiz submission operations THEN the system SHALL write to and query only the `Quizzes-Score` collection

2.4 WHEN backend routes perform cascade deletion for missions THEN the system SHALL delete records only from the `Quizzes-Score` collection (not `quiz_submissions` or `quiz_submission`)

2.5 WHEN the server registers quiz-related API endpoints THEN the system SHALL use naming conventions that match the actual `Quizzes-Score` collection or remove deprecated endpoints

2.6 WHEN frontend code submits quiz data THEN the system SHALL reference only the `Quizzes-Score` collection in logging and operations

2.7 WHEN documentation describes quiz scoring THEN the system SHALL reference only the `Quizzes-Score` collection structure

### Unchanged Behavior (Regression Prevention)

3.1 WHEN backend routes query the `quiz` collection for quiz definitions THEN the system SHALL CONTINUE TO use the `quiz` collection for quiz questions and metadata

3.2 WHEN backend routes query the `quiz_score` collection THEN the system SHALL CONTINUE TO use `quiz_score` if it is a valid alternative name for `Quizzes-Score`

3.3 WHEN backend routes query other valid collections like `mission_score`, `students`, `missions` THEN the system SHALL CONTINUE TO query these collections unchanged

3.4 WHEN the frontend submits quiz scores through valid API endpoints THEN the system SHALL CONTINUE TO successfully store quiz scores

3.5 WHEN instructors or admins view quiz results THEN the system SHALL CONTINUE TO display quiz scores correctly from the `Quizzes-Score` collection

3.6 WHEN the system performs cascade deletion for missions THEN the system SHALL CONTINUE TO delete related quiz assignments, scores, and results from correct collections
