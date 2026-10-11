# Design Document

## Overview

This design specifies the implementation for fixing the quiz_score field bug and adding mission/module context to quiz score records. The solution involves modifying both the frontend quiz submission logic in `App.vue` and the backend API endpoint in `quiz_scores.js` to properly capture and store raw correct answer counts, mission_id, and module_id values.

The implementation is backwards compatible and requires no database migration. Existing quiz_score documents will continue to function, while new submissions will include the enhanced schema.

## Architecture

### System Components

```
┌─────────────────────────────────────────────────────────────────┐
│                         Frontend (App.vue)                       │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  submitQuizSession()                                       │ │
│  │  • Calculates correctCount (raw correct answers)           │ │
│  │  • Captures mission_id from activeMission.value?.id        │ │
│  │  • Captures module_id from activeTrainingModule.value?.id  │ │
│  │  • Builds quizScoreData payload with quiz_score field      │ │
│  └────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                                │
                                │ POST /api/v1/quiz-scores
                                │ { quiz_score, mission_id, module_id, ... }
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                  Backend (quiz_scores.js)                        │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  POST / endpoint                                           │ │
│  │  • Validates quiz_score field                              │ │
│  │  • Accepts optional mission_id, module_id                  │ │
│  │  • Stores all fields to Firestore                          │ │
│  └────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                                │
                                │ db.collection('quiz_score').add()
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Firestore: quiz_score                         │
│  {                                                               │
│    studentId: string,                                            │
│    quizId: string,                                               │
│    quizTitle: string,                                            │
│    score: number (0-100),           // percentage               │
│    quiz_score: number,               // NEW: raw correct count  │
│    passed: boolean,                                              │
│    totalQuestions: number,                                       │
│    correctAnswers: number,           // kept for compatibility  │
│    mission_id: string | null,        // NEW: mission context    │
│    module_id: string | null,         // NEW: module context     │
│    completedAt: timestamp,                                       │
│    createdAt: timestamp                                          │
│  }                                                               │
└─────────────────────────────────────────────────────────────────┘
```

### Data Flow

1. **Quiz Completion**: Student completes quiz in frontend
2. **Grading**: Frontend calculates `correctCount` (number of correct answers)
3. **Context Capture**: Frontend reads `activeMission.value?.id` and `activeTrainingModule.value?.id`
4. **Payload Construction**: Frontend builds request with `quiz_score` field set to `correctCount`
5. **API Request**: POST to `/api/v1/quiz-scores` with enhanced payload
6. **Validation**: Backend validates `quiz_score` constraints
7. **Storage**: Backend writes to Firestore with all fields
8. **Response**: Backend returns success with document ID

## Component Design

### Frontend Changes (App.vue)

#### Modified Function: submitQuizSession()

**Location**: `c:\Users\kevin\Capstone\capstone\src\App.vue` (around line 7565)

**Changes Required**:

1. **Capture mission_id** from `activeMission.value?.id`
2. **Capture module_id** from `activeTrainingModule.value?.id`
3. **Add quiz_score field** to quizScoreData payload (set to `correctCount`)
4. **Include mission_id and module_id** in payload when available

**Implementation**:

```javascript
async function submitQuizSession() {
  if (!allQuestionsAnswered.value) {
    alert('Please answer all questions before submitting');
    return;
  }
  
  const studentId = currentUser.value.id;
  const studentName = currentUser.value.name;
  const quiz = activeQuizSession.value.quiz;
  const quizId = quiz.id;
  const answers = activeQuizSession.value.answers;
  
  // Auto-grade the quiz
  let correctCount = 0;
  const totalQuestions = quiz.questions.length;
  
  quiz.questions.forEach((question, index) => {
    const studentAnswer = answers[index];
    
    if (question.type === 'multiple-choice') {
      const correctOption = question.options.find(opt => opt.isCorrect);
      if (correctOption && studentAnswer === correctOption.text) {
        correctCount++;
      }
    } else if (question.type === 'true-false') {
      if (studentAnswer === question.correctAnswer) {
        correctCount++;
      }
    } else if (question.type === 'fill-in-the-blank') {
      const correctAnswer = (question.correctAnswer || '').toLowerCase().trim();
      const userAnswer = (studentAnswer || '').toLowerCase().trim();
      if (correctAnswer === userAnswer) {
        correctCount++;
      }
    }
  });
  
  const score = Math.round((correctCount / totalQuestions) * 100);
  const passed = score >= 70;
  
  // [localStorage logic remains unchanged...]
  
  // === CAPTURE MISSION AND MODULE CONTEXT ===
  const missionId = activeMission.value?.id || null;
  const moduleId = activeTrainingModule.value?.id || null;
  
  // Save to Firestore via REST API
  try {
    const quizScoreData = {
      studentId: studentId,
      quizId: quizId,
      quizTitle: quiz.title || 'Untitled Quiz',
      score: score,                          // percentage (0-100)
      quiz_score: correctCount,              // NEW: raw correct answer count
      passed: passed,
      totalQuestions: totalQuestions,
      correctAnswers: correctCount,          // kept for backwards compatibility
      mission_id: missionId,                 // NEW: mission context
      module_id: moduleId,                   // NEW: module context
      completedAt: new Date().toISOString()
    };
    
    console.log('📤 Sending quiz score to Firestore:', quizScoreData);
    
    const response = await fetch('http://localhost:3001/api/v1/quiz-scores', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(quizScoreData)
    });
    
    // [error handling remains unchanged...]
  } catch (error) {
    // [error handling remains unchanged...]
  }
  
  // [quiz results modal logic remains unchanged...]
}
```

**Key Changes**:
- Line added: `const missionId = activeMission.value?.id || null;`
- Line added: `const moduleId = activeTrainingModule.value?.id || null;`
- Field added to payload: `quiz_score: correctCount`
- Field added to payload: `mission_id: missionId`
- Field added to payload: `module_id: moduleId`

### Backend Changes (quiz_scores.js)

#### Modified Endpoint: POST /api/v1/quiz-scores

**Location**: `c:\Users\kevin\Capstone\capstone\backend\routes\quiz_scores.js` (around line 8)

**Changes Required**:

1. **Extract quiz_score** from request body
2. **Extract mission_id and module_id** from request body
3. **Validate quiz_score** constraints (non-negative, not exceeding totalQuestions)
4. **Store quiz_score, mission_id, module_id** to Firestore
5. **Handle missing mission_id/module_id** gracefully (store as null or undefined)

**Implementation**:

```javascript
// POST /api/v1/quiz-scores - Save a quiz score
router.post('/', async (req, res) => {
  try {
    const { 
      studentId, 
      quizId, 
      quizTitle, 
      score, 
      quiz_score,           // NEW: raw correct answer count
      passed, 
      totalQuestions, 
      correctAnswers, 
      mission_id,           // NEW: mission context
      module_id,            // NEW: module context
      completedAt 
    } = req.body;
    
    // Validate required fields
    if (!studentId || !quizId || score === undefined || quiz_score === undefined) {
      return res.status(400).json({ 
        error: 'Bad Request', 
        message: 'studentId, quizId, score, and quiz_score are required' 
      });
    }
    
    // Validate quiz_score constraints
    if (quiz_score < 0 || !Number.isInteger(Number(quiz_score))) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'quiz_score must be a non-negative integer'
      });
    }
    
    if (totalQuestions && Number(quiz_score) > Number(totalQuestions)) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'quiz_score cannot exceed totalQuestions'
      });
    }
    
    const quizScoreData = {
      studentId,
      quizId,
      quizTitle: quizTitle || '',
      score: Number(score),                    // percentage (0-100)
      quiz_score: Number(quiz_score),          // NEW: raw correct count
      passed: passed !== undefined ? passed : (score >= 70),
      totalQuestions: totalQuestions || 0,
      correctAnswers: correctAnswers || 0,     // backwards compatibility
      mission_id: mission_id || null,          // NEW: mission context
      module_id: module_id || null,            // NEW: module context
      completedAt: completedAt || new Date(),
      createdAt: new Date()
    };
    
    const docRef = await db.collection('quiz_score').add(quizScoreData);
    
    console.log(`✅ Quiz score saved: Student ${studentId}, Quiz ${quizId}, Score ${score}%, Raw ${quiz_score}/${totalQuestions}`);
    
    res.status(201).json({ 
      message: 'Quiz score saved', 
      scoreId: docRef.id,
      data: quizScoreData
    });
  } catch (error) {
    console.error('Error saving quiz score:', error);
    res.status(500).json({ error: 'Server Error', message: error.message });
  }
});
```

**Key Changes**:
- Destructure `quiz_score`, `mission_id`, `module_id` from request body
- Add validation for `quiz_score` (non-negative integer, not exceeding totalQuestions)
- Add `quiz_score`, `mission_id`, `module_id` to `quizScoreData` object
- Update required field check to include `quiz_score`
- Update console log to show raw score

#### Modified Endpoint: GET /api/v1/quiz-scores/:studentId

**Changes**: None required. Firestore automatically returns all fields including new ones.

#### Modified Endpoint: GET /api/v1/quiz-scores/student/:studentId/average

**Changes**: None required. The calculation uses the `score` field (percentage), not `quiz_score`.

#### Modified Endpoint: GET /api/v1/quiz-scores/quiz/:quizId/scores

**Changes**: None required. Firestore returns all fields.

#### Modified Endpoint: DELETE /api/v1/quiz-scores/:quizId/scores

**Changes**: None required. Deletion works on entire documents regardless of schema.

## Data Models

### Enhanced Quiz Score Document Schema

```typescript
interface QuizScoreDocument {
  // Existing fields (preserved)
  studentId: string;              // Student's Firestore document ID
  quizId: string;                 // Quiz's Firestore document ID
  quizTitle: string;              // Human-readable quiz title
  score: number;                  // Percentage score (0-100)
  passed: boolean;                // true if score >= 70
  totalQuestions: number;         // Total number of questions in quiz
  correctAnswers: number;         // Raw correct count (kept for backwards compatibility)
  completedAt: Date | string;     // ISO timestamp of completion
  createdAt: Date;                // ISO timestamp of record creation
  
  // NEW fields (added by this feature)
  quiz_score: number;             // Raw correct answer count (primary field for raw score)
  mission_id: string | null;      // Mission ID if quiz was part of mission, else null
  module_id: string | null;       // Training module ID if quiz was part of module, else null
}
```

### Field Relationships

- `quiz_score` = `correctAnswers` (both store raw correct count)
- `score` = `Math.round((quiz_score / totalQuestions) * 100)`
- `passed` = `score >= 70`
- `mission_id` = `activeMission.value?.id` (captured at submission time)
- `module_id` = `activeTrainingModule.value?.id` (captured at submission time)

### Backwards Compatibility

**Legacy Documents** (created before this feature):
```javascript
{
  studentId: "abc123",
  quizId: "quiz456",
  score: 80,
  correctAnswers: 8,
  totalQuestions: 10,
  // mission_id: undefined (field doesn't exist)
  // module_id: undefined (field doesn't exist)
  // quiz_score: undefined (field doesn't exist)
}
```

**New Documents** (created after this feature):
```javascript
{
  studentId: "abc123",
  quizId: "quiz456",
  score: 80,
  quiz_score: 8,              // NEW
  correctAnswers: 8,          // kept for compatibility
  totalQuestions: 10,
  mission_id: "mission789",   // NEW
  module_id: "module101",     // NEW
}
```

**System Behavior**:
- GET requests return fields as-is (legacy docs missing new fields)
- Frontend should handle `mission_id || null` and `module_id || null`
- Statistics calculations should use optional chaining or default values
- No migration script required - old data remains valid

## Error Handling

### Frontend Error Cases

1. **No Active Mission**: `activeMission.value` is null → `mission_id` set to `null`
2. **No Active Module**: `activeTrainingModule.value` is null → `module_id` set to `null`
3. **API Request Failure**: Existing error handling remains (console.error, user not blocked)
4. **Network Timeout**: Existing error handling remains

### Backend Error Cases

1. **Missing quiz_score**: Return 400 Bad Request with message
   ```json
   {
     "error": "Bad Request",
     "message": "studentId, quizId, score, and quiz_score are required"
   }
   ```

2. **Invalid quiz_score** (negative or non-integer): Return 400 Bad Request
   ```json
   {
     "error": "Bad Request",
     "message": "quiz_score must be a non-negative integer"
   }
   ```

3. **quiz_score exceeds totalQuestions**: Return 400 Bad Request
   ```json
   {
     "error": "Bad Request",
     "message": "quiz_score cannot exceed totalQuestions"
   }
   ```

4. **Firestore Write Failure**: Return 500 Server Error
   ```json
   {
     "error": "Server Error",
     "message": "Failed to write to Firestore: ..."
   }
   ```

### Validation Logic

```javascript
// Backend validation sequence:
1. Check required fields exist (studentId, quizId, score, quiz_score)
2. Check quiz_score >= 0
3. Check quiz_score is integer
4. Check quiz_score <= totalQuestions (if totalQuestions provided)
5. Write to Firestore
```

## Testing Strategy

### Unit Tests

**Frontend Tests** (manual/integration):
- Test quiz submission with mission context (mission_id and module_id present)
- Test quiz submission without mission context (mission_id and module_id null)
- Verify payload includes `quiz_score` field with correct value
- Verify payload includes `mission_id` and `module_id` fields

**Backend Tests** (automated):
- Test POST with valid `quiz_score` → 201 success
- Test POST without `quiz_score` → 400 error
- Test POST with negative `quiz_score` → 400 error
- Test POST with `quiz_score` > `totalQuestions` → 400 error
- Test POST with `mission_id` and `module_id` → fields stored
- Test POST without `mission_id` and `module_id` → null stored
- Test GET returns `mission_id` and `module_id` fields

### Integration Tests

- Submit quiz through frontend, verify Firestore document contains `quiz_score`, `mission_id`, `module_id`
- Query quiz scores via GET endpoint, verify response includes new fields
- Submit quiz with 5 correct out of 10 → verify `quiz_score: 5` and `score: 50`
- Submit quiz from mission → verify `mission_id` matches `activeMission.value.id`

### Backwards Compatibility Tests

- Query legacy quiz score document → verify no errors
- Calculate statistics including legacy documents → verify no errors
- Mix legacy and new documents in queries → verify correct aggregation

## Migration Strategy

**No migration required.** This is a backwards-compatible schema enhancement.

**Reasoning**:
1. New fields (`quiz_score`, `mission_id`, `module_id`) are optional in queries
2. Old documents remain valid without these fields
3. Frontend and backend handle missing fields gracefully (null coalescing)
4. Statistics calculations use existing `score` field (not affected)
5. Future analytics can filter for records with `mission_id` present

**Recommendation**: After deployment, monitor Firestore to ensure new submissions include the enhanced fields. If needed, a one-time backfill script could populate `quiz_score` from `correctAnswers` for legacy records, but this is optional.

## Security Considerations

1. **Field Validation**: Backend validates `quiz_score` constraints to prevent malicious input
2. **No Authentication Changes**: Endpoint remains unauthenticated (as per current implementation)
3. **Input Sanitization**: All fields sanitized by Firestore (no SQL injection risk)
4. **No Sensitive Data**: `mission_id` and `module_id` are non-sensitive identifiers

## Performance Considerations

1. **Firestore Write**: No performance impact (same write operation, more fields)
2. **Firestore Read**: No performance impact (field count doesn't affect query speed)
3. **Frontend Payload**: Negligible size increase (~50 bytes per submission)
4. **Backend Processing**: Minimal CPU increase for validation logic

## Deployment Plan

1. **Deploy Backend Changes First**:
   - Update `quiz_scores.js` with new endpoint logic
   - Deploy backend to production
   - Backend now accepts but doesn't require new fields (backwards compatible)

2. **Deploy Frontend Changes**:
   - Update `App.vue` with context capture logic
   - Deploy frontend to production
   - New submissions include enhanced schema

3. **Verify**:
   - Submit test quiz from mission context
   - Query Firestore to confirm `quiz_score`, `mission_id`, `module_id` present
   - Submit test quiz outside mission context
   - Verify `mission_id` and `module_id` are null

4. **Monitor**:
   - Check backend logs for validation errors
   - Verify no 400 errors from legitimate submissions
   - Confirm GET endpoints return new fields

## Rollback Plan

**If deployment fails**:

1. **Rollback Backend**: Revert `quiz_scores.js` to previous version
   - Old backend accepts submissions without `quiz_score` field
   - Frontend submissions will fail validation (expected)

2. **Rollback Frontend**: Revert `App.vue` to previous version
   - Frontend sends old payload format
   - Backend accepts old format (if not yet updated)

3. **Data Integrity**: No data loss
   - Documents created with new schema remain valid
   - Old backend can read new documents (ignores extra fields)

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Quiz score field stores raw correct count

*For any* quiz submission, the `quiz_score` field in Firestore SHALL equal the `correctAnswers` value sent in the API request body.

**Validates: Requirements 1.1, 1.2, 1.3, 1.4**

### Property 2: Score fields independence

*For any* quiz submission, both the `score` field (percentage 0-100) and `quiz_score` field (raw correct count) SHALL exist as independent fields with correct values.

**Validates: Requirements 1.5, 1.6**

### Property 3: Mission context capture

*For any* quiz started from a mission workflow, the submission SHALL include `mission_id` matching `activeMission.value.id` in both the API request payload and the stored Firestore document.

**Validates: Requirements 2.1, 2.2, 2.3**

### Property 4: Module context capture

*For any* quiz started from a mission workflow, the submission SHALL include `module_id` matching `activeTrainingModule.value.id` in both the API request payload and the stored Firestore document.

**Validates: Requirements 3.1, 3.2, 3.3**

### Property 5: Context absence handling

*For any* quiz started without mission or module context, the system SHALL store `mission_id` and `module_id` as null or omit the fields.

**Validates: Requirements 2.4, 3.4**

### Property 6: Context field type constraint

*For any* stored quiz score document with `mission_id` or `module_id` present, these fields SHALL be strings matching the Firestore document ID format.

**Validates: Requirements 2.6, 3.5**

### Property 7: Schema conformance

*For any* quiz score document stored in Firestore, it SHALL contain all required fields with correct types: studentId (string), quizId (string), quizTitle (string), score (number 0-100), quiz_score (number), passed (boolean), totalQuestions (number), correctAnswers (number), mission_id (string or null), module_id (string or null), completedAt (timestamp), createdAt (timestamp).

**Validates: Requirements 4.1, 4.2**

### Property 8: Quiz score validation

*For any* quiz score submission, the `quiz_score` value SHALL be a non-negative integer that does not exceed `totalQuestions`.

**Validates: Requirements 4.3, 4.4**

### Property 9: Schema relationship consistency

*For any* quiz score document, the relationship `score = round((quiz_score / totalQuestions) * 100)` SHALL hold within rounding tolerance.

**Validates: Requirements 1.1, 1.2, 1.5**

### Property 10: Backwards compatibility preservation

*For any* existing quiz score document created before this feature, the system SHALL successfully read and process it without requiring migration or schema changes.

**Validates: Requirements 5.1, 5.2, 5.3, 5.4, 5.5**

### Property 11: API response inclusion

*For any* GET request retrieving quiz scores, the response SHALL include `mission_id` and `module_id` fields when present in the stored document.

**Validates: Requirements 2.5**

### Property 12: Existing field preservation

*For any* new quiz submission, all existing fields (score, correctAnswers, passed, totalQuestions) SHALL be stored in their current format unchanged.

**Validates: Requirements 5.5**

## Implementation Notes

### Code Locations

1. **Frontend Modification**:
   - File: `c:\Users\kevin\Capstone\capstone\src\App.vue`
   - Function: `submitQuizSession()`
   - Lines: ~7565-7700

2. **Backend Modification**:
   - File: `c:\Users\kevin\Capstone\capstone\backend\routes\quiz_scores.js`
   - Endpoint: `POST /` (line ~8)
   - Changes: Add field extraction, validation, and storage

### Dependencies

- No new npm packages required
- No database migration scripts
- No changes to other endpoints or files

### Configuration

- No environment variables needed
- No feature flags required
- No infrastructure changes

## References

- Requirements Document: `.kiro/specs/fix-quiz-score-zero-and-add-mission-id/requirements.md`
- Existing Quiz Scores Endpoint: `backend/routes/quiz_scores.js`
- Frontend Quiz Logic: `src/App.vue` (submitQuizSession function)
- Firestore Collection: `quiz_score`
