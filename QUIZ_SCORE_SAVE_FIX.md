# Quiz Score Database Save Fix

## Problem
Quiz results were not being saved to the Firestore database. The backend was returning `400 Bad Request` error.

### Error in Logs
```
POST /api/v1/quiz-scores 400 5.166 ms - 89
```

## Root Cause
The `handlePostDockingQuizSubmit` function was sending quiz scores with **incorrect field names** that didn't match what the backend API expected.

### Field Name Mismatch

**What was being sent** (WRONG):
```javascript
{
  student_id: studentId,      // ❌ Wrong field name
  quiz_id: quiz.id,            // ❌ Wrong field name
  mission_id: moduleId,
  quiz_score: score,           // ❌ Wrong - this is percentage, not raw count
  total_items: validQuestionCount,   // ❌ Wrong field name
  correct_items: correctCount         // ❌ Wrong field name
}
```

**What backend expects** (CORRECT):
```javascript
{
  studentId: studentId,        // ✅ Correct
  quizId: quiz.id,              // ✅ Correct
  quizTitle: string,
  score: score,                 // ✅ Percentage (0-100)
  quiz_score: correctCount,     // ✅ Raw correct answer count
  passed: boolean,
  totalQuestions: number,       // ✅ Correct
  correctAnswers: number,       // ✅ Correct
  mission_id: moduleId,
  module_id: moduleId,
  completedAt: ISO string
}
```

## Solution

### Fixed Code
**File**: `src/App.vue` (line ~9091)

**Before** (Broken):
```javascript
window.firebaseApi.saveQuizScore({
  student_id: studentId,
  quiz_id: quiz.id,
  mission_id: moduleId,
  quiz_score: score,  // Wrong - sending percentage as quiz_score
  total_items: validQuestionCount,
  correct_items: correctCount
})
```

**After** (Fixed):
```javascript
window.firebaseApi.saveQuizScore({
  studentId: studentId,          // ✅ Fixed field name
  quizId: quiz.id,                // ✅ Fixed field name
  quizTitle: quiz.title || 'Quiz',
  score: score,                   // ✅ Percentage (0-100)
  quiz_score: correctCount,       // ✅ Fixed - raw count
  passed: score >= 70,
  totalQuestions: validQuestionCount,  // ✅ Fixed field name
  correctAnswers: correctCount,        // ✅ Fixed field name
  mission_id: moduleId,
  module_id: moduleId,
  completedAt: new Date().toISOString()
})
```

### Backend Logging Enhancement
**File**: `backend/routes/quiz_scores.js`

Added debug logging to help diagnose field issues:
```javascript
console.log('📝 [QUIZ SCORE] Received request body:', JSON.stringify(req.body, null, 2));
console.log('📝 [QUIZ SCORE] Extracted fields:', {
  studentId,
  quizId,
  score,
  quiz_score,
  scoreType: typeof score,
  quizScoreType: typeof quiz_score
});
```

## Field Definitions

### Required Fields
- `studentId` (string) - Student's unique ID
- `quizId` (string) - Quiz unique ID
- `score` (number) - Percentage score 0-100
- `quiz_score` (number) - Raw number of correct answers

### Optional Fields
- `quizTitle` (string) - Title of the quiz
- `passed` (boolean) - Whether student passed (score >= 70%)
- `totalQuestions` (number) - Total number of questions
- `correctAnswers` (number) - Same as quiz_score (backwards compatibility)
- `mission_id` (string) - Mission context
- `module_id` (string) - Module context
- `completedAt` (ISO string) - Completion timestamp

## Testing

### Success Indicators
Console should show:
```
📝 [QUIZ SCORE] Received request body: { ... }
📝 [QUIZ SCORE] Extracted fields: { studentId: '...', quizId: '...', score: 100, quiz_score: 5 }
✅ Quiz score saved: Student xxx, Quiz yyy, Score 100%, Raw 5/5
```

HTTP Response:
```
POST /api/v1/quiz-scores 201 - (success)
```

### Failure Indicators (Before Fix)
```
❌ [QUIZ SCORE] Validation failed: { hasStudentId: false, hasQuizId: false, ... }
POST /api/v1/quiz-scores 400 - (bad request)
```

## Impact

### Before Fix
- ❌ Quiz scores not saved to database
- ❌ Instructor dashboard shows no quiz results
- ❌ Training records incomplete
- ❌ Backend validation fails

### After Fix
- ✅ Quiz scores saved successfully
- ✅ Instructor can see student quiz results
- ✅ Training records complete
- ✅ Database contains all quiz attempt data

## Related Code Paths

### Two Quiz Submission Flows

1. **Main Quiz Modal** (line ~8686 in App.vue)
   - Function: `submitQuizSession()`
   - Uses fetch to `http://localhost:3001/api/v1/quiz-scores`
   - ✅ Already had correct field names

2. **Post-Docking Quiz** (line ~9091 in App.vue)
   - Function: `handlePostDockingQuizSubmit()`
   - Uses `window.firebaseApi.saveQuizScore()`
   - ❌ Had wrong field names (NOW FIXED)

Both now use the same correct field names.

## Database Schema

### Firestore Collection: `quiz_score`
```javascript
{
  id: "auto-generated",
  studentId: "kVGWbCTIzca0qGz80M7o",
  quizId: "WZzfhJSnz9eMwcRNn96Q",
  quizTitle: "Navigation Quiz",
  score: 100,                    // Percentage
  quiz_score: 5,                 // Raw correct count
  passed: true,
  totalQuestions: 5,
  correctAnswers: 5,
  mission_id: "custom-mission-1790828733706",
  module_id: "custom-mission-1790828733706",
  completedAt: "2026-10-01T12:34:56.789Z",
  createdAt: Timestamp
}
```

---
**Date**: 2026-10-01  
**Issue**: Quiz results not saving to database  
**Root Cause**: Field name mismatch between frontend and backend  
**Resolution**: Fixed field names in handlePostDockingQuizSubmit  
**Status**: ✅ FIXED
