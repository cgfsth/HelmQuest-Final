# Quiz Score Field Names - Updated to Match Database Schema

## Changes Made
Updated all quiz score saving code to use the EXACT field names from the Firestore database schema.

## Database Schema (quiz_score collection)

Based on the actual Firestore database structure:

```javascript
{
  "Quiz-score-percentage": 0,      // Percentage score (0-100)
  "instructorId": "",               // Instructor ID
  "moduleId": "",                   // Module/Mission ID
  "raw-score": 0,                   // Raw correct answer count
  "studentId": "",                  // Student ID
  "quizId": "",                     // Quiz ID (optional)
  "quizTitle": "",                  // Quiz title (optional)
  "passed": false,                  // Whether student passed (>= 70%)
  "totalQuestions": 0,              // Total number of questions
  "correctAnswers": 0,              // Same as raw-score (backwards compat)
  "completedAt": "ISO timestamp",   // When completed
  "createdAt": Timestamp            // When saved to DB
}
```

## Updated Files

### 1. Backend - quiz_scores.js
**File**: `backend/routes/quiz_scores.js`

**Changes**:
- Changed `score` → `Quiz-score-percentage`
- Changed `quiz_score` → `raw-score`
- Changed `quizId` → Optional (not required)
- Changed `module_id`/`mission_id` → `moduleId` (required)
- Added `instructorId` field
- Updated validation to require: `studentId`, `moduleId`, `Quiz-score-percentage`, `raw-score`

**Key Code**:
```javascript
const quizScoreData = {
  studentId,
  instructorId: instructorId || '',
  moduleId,
  quizId: quizId || '',
  quizTitle: quizTitle || '',
  'Quiz-score-percentage': Number(quizScorePercentage),
  'raw-score': Number(rawScore),
  passed: passed !== undefined ? passed : (quizScorePercentage >= 70),
  totalQuestions: totalQuestions || 0,
  correctAnswers: correctAnswers || 0,
  completedAt: completedAt || new Date(),
  createdAt: new Date()
};
```

### 2. Frontend - submitQuizSession (Main Quiz Modal)
**File**: `src/App.vue` (line ~8672)

**Changes**:
```javascript
const quizScoreData = {
  studentId: studentId,
  instructorId: instructorId,
  moduleId: moduleId,
  quizId: quizId,
  quizTitle: quiz.title || 'Untitled Quiz',
  'Quiz-score-percentage': score,         // ✅ Updated field name
  'raw-score': correctCount,              // ✅ Updated field name
  passed: passed,
  totalQuestions: totalQuestions,
  correctAnswers: correctCount,
  completedAt: new Date().toISOString()
};
```

### 3. Frontend - handlePostDockingQuizSubmit
**File**: `src/App.vue` (line ~9091)

**Changes**:
```javascript
window.firebaseApi.saveQuizScore({
  studentId: studentId,
  instructorId: currentUser.value?.instructorId || '',
  moduleId: moduleId,
  quizId: quiz.id,
  quizTitle: quiz.title || 'Quiz',
  'Quiz-score-percentage': score,       // ✅ Updated field name
  'raw-score': correctCount,            // ✅ Updated field name
  passed: score >= 70,
  totalQuestions: validQuestionCount,
  correctAnswers: correctCount,
  completedAt: new Date().toISOString()
})
```

## Field Name Changes Summary

| Old Field Name | New Field Name | Type | Required |
|---------------|----------------|------|----------|
| `score` | `Quiz-score-percentage` | number | ✅ Yes |
| `quiz_score` | `raw-score` | number | ✅ Yes |
| `module_id` / `mission_id` | `moduleId` | string | ✅ Yes |
| `quizId` | `quizId` | string | ❌ No (optional) |
| N/A | `instructorId` | string | ❌ No (optional) |
| `studentId` | `studentId` | string | ✅ Yes |

## Validation Rules

### Backend Validation
1. **Required fields**: `studentId`, `moduleId`, `Quiz-score-percentage`, `raw-score`
2. **raw-score constraints**:
   - Must be non-negative integer
   - Cannot exceed `totalQuestions`
3. **Quiz-score-percentage**: 0-100 percentage value

### Automatic Fields
- `passed`: Auto-calculated as `Quiz-score-percentage >= 70`
- `createdAt`: Auto-set to current timestamp
- `completedAt`: Defaults to current timestamp if not provided

## Testing

### Success Logs
```
📝 [QUIZ SCORE] Received request body: { studentId: "...", moduleId: "...", ... }
📝 [QUIZ SCORE] Extracted fields: { studentId: "...", quizScorePercentage: 100, rawScore: 5 }
✅ Quiz score saved: Student xxx, Module yyy, Score 100%, Raw 5/5
```

### Expected HTTP Response
```
POST /api/v1/quiz-scores 201
{
  "message": "Quiz score saved",
  "scoreId": "wZjU59Y5tzy8P4FsXpDz",
  "data": { ... }
}
```

## Database Document Example

```javascript
{
  "Quiz-score-percentage": 100,
  "instructorId": "UhrXehShLIZc3PBSj1RH",
  "moduleId": "custom-mission-1790828733706",
  "raw-score": 5,
  "studentId": "kVGWbCTIzca0qGz80M7o",
  "quizId": "WZzfhJSnz9eMwcRNn96Q",
  "quizTitle": "Navigation Basics Quiz",
  "passed": true,
  "totalQuestions": 5,
  "correctAnswers": 5,
  "completedAt": "2026-10-01T12:34:56.789Z",
  "createdAt": Timestamp(2026, 10, 1, 12, 34, 56)
}
```

## Benefits

✅ **Exact Match**: Field names now match database schema perfectly  
✅ **No Conversion**: No field name transformation needed  
✅ **Type Safety**: Proper validation for all fields  
✅ **Instructor Context**: Added instructorId for better tracking  
✅ **Consistent**: Both quiz submission flows use same fields  

## Migration Notes

### Existing Data
Old quiz scores in the database may have different field names:
- `score` (old) vs `Quiz-score-percentage` (new)
- `quiz_score` (old) vs `raw-score` (new)
- `mission_id`/`module_id` (old) vs `moduleId` (new)

If you need to query old data, you'll need to check both field name variations.

### New Data
All new quiz scores will use the new field names consistently.

---
**Date**: 2026-10-01  
**Issue**: Field names didn't match database schema  
**Resolution**: Updated all code to use exact database field names  
**Status**: ✅ COMPLETE
