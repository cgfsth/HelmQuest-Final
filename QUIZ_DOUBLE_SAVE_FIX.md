# Quiz Double Save Fix - Remove Duplicate API Call

## Problem
Quiz scores were being saved TWICE to different collections with different structures:
1. **First save** - `Quizzes-Score` collection (correct structure) ✅
2. **Second save** - `quiz_score` collection (wrong structure with `answers` array) ❌

This created duplicate data and database bloat.

## Root Cause
The `handlePostDockingQuizSubmit` function was making TWO separate API calls:

### Call 1: submitQuiz() - WRONG ❌
```javascript
window.firebaseApi.submitQuiz({
  quizId: quiz.id,
  studentId: studentId,
  studentName: currentUser.value?.name || 'Unknown',
  moduleId: moduleId,
  answers: answersArray,          // Full answers array
  score: score,
  correctCount: correctCount,
  totalQuestions: validQuestionCount
})
```
**Result**: Saved to `quiz_score` collection with wrong structure including full `answers` array

### Call 2: saveQuizScore() - CORRECT ✅
```javascript
window.firebaseApi.saveQuizScore({
  studentId: studentId,
  instructorId: instructorId,
  moduleId: moduleId,
  quizId: quiz.id,
  quizTitle: quiz.title,
  'Quiz-score-percentage': score,
  'raw-score': correctCount,
  passed: score >= 70,
  totalQuestions: validQuestionCount,
  correctAnswers: correctCount,
  completedAt: new Date().toISOString()
})
```
**Result**: Saved to `Quizzes-Score` collection with correct structure (matches database schema)

## Solution

### Removed Duplicate Call
**File**: `src/App.vue` (line ~9061)

**Before** (Double save):
```javascript
// Save to Firestore database - quiz_submissions collection
if (window.firebaseApi) {
  window.firebaseApi.submitQuiz({...});  // ❌ REMOVED THIS
  
  // Also save to quiz_score collection for instructor dashboard
  window.firebaseApi.saveQuizScore({...});  // ✅ KEEP THIS
}
```

**After** (Single save):
```javascript
// Save quiz score to Firestore database - Quizzes-Score collection
if (window.firebaseApi) {
  window.firebaseApi.saveQuizScore({
    studentId: studentId,
    instructorId: currentUser.value?.instructorId || '',
    moduleId: moduleId,
    quizId: quiz.id,
    quizTitle: quiz.title || 'Quiz',
    'Quiz-score-percentage': score,
    'raw-score': correctCount,
    passed: score >= 70,
    totalQuestions: validQuestionCount,
    correctAnswers: correctCount,
    completedAt: new Date().toISOString()
  }).then(() => {
    console.log('✅ Quiz score saved to Quizzes-Score collection');
  }).catch(error => {
    console.error('⚠️ Failed to save quiz score:', error);
  });
}
```

## Database Structure Comparison

### WRONG Structure (quiz_score - removed)
```javascript
{
  answers: [                          // ❌ Full answer details (bloat)
    {
      questionId: "q-...",
      studentAnswer: "True",
      isCorrect: true
    }
  ],
  attemptNumber: 1,
  completedAt: Timestamp,
  correctAnswers: 1,
  createdAt: Timestamp,
  moduleId: "custom-mission-...",
  passed: true,
  quizId: "BHmnbFLrLFjC2lKAAhxQ",
  // Missing instructorId, Quiz-score-percentage, raw-score
}
```

### CORRECT Structure (Quizzes-Score - kept)
```javascript
{
  "Quiz-score-percentage": 100,     // ✅ Correct field name
  instructorId: "...",                // ✅ Instructor tracking
  moduleId: "custom-mission-...",
  "raw-score": 1,                     // ✅ Raw correct count
  studentId: "kVGWbCTIzca0qGz80M7o",
  quizId: "BHmnbFLrLFjC2lKAAhxQ",
  quizTitle: "Test Mission 1",
  passed: true,
  totalQuestions: 1,
  correctAnswers: 1,
  completedAt: "2026-10-01T12:00:04.614Z",
  createdAt: Timestamp
}
```

## Benefits

✅ **No Duplication**: Only ONE save per quiz submission  
✅ **Correct Structure**: Uses proper field names matching database schema  
✅ **Less Bloat**: Doesn't save full `answers` array (only score data)  
✅ **Faster**: Single API call instead of two  
✅ **Cleaner Database**: No duplicate documents with different structures  

## What Collections Are Used Now?

### Quizzes-Score Collection (Active)
- **Purpose**: Store quiz scores for instructor dashboard
- **API**: `POST /api/v1/quiz-scores`
- **Structure**: Matches database schema from screenshot
- **Fields**: `Quiz-score-percentage`, `raw-score`, `instructorId`, etc.

### quiz_score Collection (Deprecated)
- **Status**: ❌ No longer written to
- **Old Usage**: Was receiving duplicate saves from `submitQuiz()`
- **Migration**: Old records may still exist, but new saves go to `Quizzes-Score`

## Testing

### Success Logs
Browser console should show **ONLY**:
```
✅ Quiz score saved to Quizzes-Score collection
```

Should **NOT** show:
```
✅ Quiz submitted to Firestore (quiz_submissions)  // ❌ This is gone now
```

### Database Check
After quiz submission, check Firestore:
- ✅ **ONE** new document in `Quizzes-Score` collection
- ❌ **NO** new document in `quiz_score` collection

## Migration Note

### Existing Duplicate Data
If you have duplicate quiz scores from before this fix, you can:
1. **Keep them**: They won't cause issues, just extra storage
2. **Delete duplicates**: Manually delete from `quiz_score` collection
3. **Ignore**: Focus on `Quizzes-Score` collection only

### Going Forward
All new quiz submissions will ONLY save to `Quizzes-Score` collection with correct structure.

---
**Date**: 2026-10-01  
**Issue**: Quiz scores saving twice to different collections  
**Root Cause**: Two API calls - submitQuiz() and saveQuizScore()  
**Resolution**: Removed submitQuiz() call, kept only saveQuizScore()  
**Status**: ✅ FIXED
