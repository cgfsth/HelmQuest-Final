# Quiz Fetch Fix - Use Direct Firestore Query

## Problem
When clicking "TAKE QUIZ" button, the system showed "No quiz available for this mission" even though quiz exists in the database.

## Root Cause
Two quiz loading functions were using WRONG approaches:
1. `handleTakeQuizClick()` - Used `getQuizForModule()` which only checks **localStorage**
2. `checkForPostDockingQuiz()` - Used `getQuizzesByModule()` from `firestore.js` which queries the wrong collection name

Neither function was using the new **direct Firestore REST API query** that we implemented.

## Solution

### Updated Functions

#### 1. handleTakeQuizClick()
**File**: `src/App.vue` (line ~8841)

**Before** (Broken):
```javascript
async function handleTakeQuizClick() {
  const quiz = getQuizForModule(moduleId);  // ❌ Only checks localStorage
  // ...
}
```

**After** (Fixed):
```javascript
async function handleTakeQuizClick() {
  // Load quiz from Firestore using direct query
  const quiz = await getQuizForModuleFromFirestore(moduleId);  // ✅ Direct Firestore query
  // ...
}
```

#### 2. checkForPostDockingQuiz()
**File**: `src/App.vue` (line ~8885)

**Before** (Broken):
```javascript
async function checkForPostDockingQuiz() {
  const { getQuizzesByModule } = await import('./firebase/firestore.js');
  const quizzes = await getQuizzesByModule(moduleId);  // ❌ Wrong collection
  // ...
}
```

**After** (Fixed):
```javascript
async function checkForPostDockingQuiz() {
  // Use the same direct query approach as handleTakeQuizClick
  const quiz = await getQuizForModuleFromFirestore(moduleId);  // ✅ Direct Firestore query
  // ...
}
```

## How It Works Now

### Quiz Loading Flow
1. Student completes mission and clicks "TAKE QUIZ"
2. `handleTakeQuizClick()` or `checkForPostDockingQuiz()` is called
3. Function calls `getQuizForModuleFromFirestore(moduleId)`
4. That function calls backend: `GET /api/v1/quizzes/by-module/:moduleId`
5. Backend queries Firestore: `WHERE moduleId == moduleId`
6. Quiz returned and displayed to student ✅

### Backend Endpoint
```
GET http://localhost:3001/api/v1/quizzes/by-module/custom-mission-1790828733706
```

### Backend Query
```javascript
const snapshot = await db.collection('quiz')
  .where('moduleId', '==', moduleId)
  .limit(1)
  .get();
```

## Benefits

✅ **Consistent**: Both functions now use the same query approach  
✅ **Direct**: Queries Firestore directly, not localStorage  
✅ **Universal**: Works for ANY moduleId, regardless of format  
✅ **Reliable**: No dependency on localStorage synchronization  
✅ **Fast**: Single database query with index  

## Testing

### Success Logs
Browser console should show:
```
[TAKE QUIZ] Loading quiz for module: custom-mission-1790828733706
[GET QUIZ] 🔍 Direct query for quiz with moduleId: custom-mission-1790828733706
[GET QUIZ] ✅ Found quiz from Firestore: { id: "...", title: "...", questionsCount: 2 }
[TAKE QUIZ] ✅ Quiz found! Showing modal
```

Backend logs should show:
```
🔍 [DIRECT QUERY] Looking for quiz with moduleId: custom-mission-1790828733706
✅ [DIRECT QUERY] Found quiz: { id: '...', title: '...', questionsCount: 2 }
GET /api/v1/quizzes/by-module/custom-mission-1790828733706 200
```

### Failure Logs (No Quiz)
Browser console:
```
[TAKE QUIZ] Loading quiz for module: custom-mission-1790828733706
[GET QUIZ] 🔍 Direct query for quiz with moduleId: custom-mission-1790828733706
[GET QUIZ] ℹ️ No quiz exists for module: custom-mission-1790828733706
[TAKE QUIZ] No quiz found for moduleId: custom-mission-1790828733706
```

Backend logs:
```
🔍 [DIRECT QUERY] Looking for quiz with moduleId: custom-mission-1790828733706
❌ [DIRECT QUERY] No quiz found for moduleId: custom-mission-1790828733706
GET /api/v1/quizzes/by-module/custom-mission-1790828733706 404
```

## Related Fixes

This fix builds on top of:
1. **Quiz Loading Permanent Fix** - Added direct Firestore query endpoint
2. **Dynamic Quiz Button** - Button shows "Create Quiz" vs "Update Quiz"
3. **Quiz Score Save Fix** - Fixed field names for saving quiz results

All quiz-related functionality now uses the **direct Firestore query** approach.

## Functions Updated

| Function | Purpose | Old Approach | New Approach |
|----------|---------|--------------|--------------|
| `handleTakeQuizClick` | Load quiz when clicking "TAKE QUIZ" | localStorage only | Direct Firestore query |
| `checkForPostDockingQuiz` | Auto-check for quiz after docking | `firestore.js` helper | Direct Firestore query |
| `getQuizForModuleFromFirestore` | Core quiz loading function | Assignment lookup | Direct query by moduleId |

---
**Date**: 2026-10-01  
**Issue**: Quiz not loading ("No quiz available")  
**Root Cause**: Using localStorage instead of Firestore query  
**Resolution**: Updated both quiz loading functions to use direct Firestore REST API query  
**Status**: ✅ FIXED
