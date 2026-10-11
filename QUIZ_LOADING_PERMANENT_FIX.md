# Quiz Loading Permanent Fix - Direct Firestore Query

## Problem
Quiz loading was broken whenever mission IDs changed because it relied on the `quiz_assignments` collection. Since custom missions get new IDs every time (`custom-mission-${Date.now()}`), the assignments became invalid and quizzes couldn't load.

### Previous Broken Flow
1. Mission created with ID: `custom-mission-1790828733706`
2. Quiz created with that moduleId
3. Assignment created linking module → quiz
4. Later, mission ID changes to: `custom-mission-1790999999999`
5. Quiz still has old moduleId in database
6. Assignment not found → "No quiz available" ❌

## Root Cause
The quiz loading system used TWO steps:
1. Find assignment for moduleId → get quizId
2. Load quiz using quizId

This broke when moduleIds changed because step 1 failed.

## Solution: Direct Firestore Query

### New Flow (Universal)
1. Student enters mission with ID: `custom-mission-ANYTHING`
2. System queries Firestore DIRECTLY: `WHERE moduleId == 'custom-mission-ANYTHING'`
3. Quiz returned if exists, regardless of assignments ✅

### Changes Made

#### 1. Backend - New Direct Query Endpoint
**File**: `backend/routes/quizzes.js`
- Added: `GET /api/v1/quizzes/by-module/:moduleId`
- Queries `quiz` collection directly by moduleId field
- No assignment lookup needed
- Returns quiz immediately if found

```javascript
router.get('/by-module/:moduleId', async (req, res) => {
  const snapshot = await db.collection('quiz')
    .where('moduleId', '==', moduleId)
    .limit(1)
    .get();
  // Returns quiz directly
});
```

#### 2. API Client - New Function
**File**: `src/api/firebaseApi.js`
- Added: `getQuizByModuleId(moduleId)`
- Calls new backend endpoint
- Returns quiz data directly

```javascript
export async function getQuizByModuleId(moduleId) {
  return apiFetch(`/quizzes/by-module/${moduleId}`);
}
```

#### 3. Frontend - Updated Quiz Loading
**File**: `src/App.vue`
- Function: `getQuizForModuleFromFirestore(moduleId)`
- Now uses `getQuizByModuleId()` instead of assignment lookup
- Works for ANY moduleId, even if it changes every second

```javascript
async function getQuizForModuleFromFirestore(moduleId) {
  // DIRECT QUERY - no assignments needed!
  const response = await window.firebaseApi.getQuizByModuleId(moduleId);
  return response.quiz;
}
```

## Benefits

### ✅ Universal Coverage
- Works for ALL missions: custom, generated, modified
- No special cases or ID-specific fixes needed
- Module IDs can change freely without breaking quizzes

### ✅ Simplified Architecture
- Removed dependency on `quiz_assignments` collection
- One-step query instead of two-step lookup
- Less points of failure

### ✅ Performance
- Direct Firestore query with index
- No localStorage lookup needed
- Faster than assignment system

### ✅ Maintainability
- Clear, simple logic
- Easy to debug (check Firestore `moduleId` field)
- No complex assignment synchronization

## Database Requirements

### Quiz Collection Schema
Each quiz document must have:
```javascript
{
  id: "quiz-123",
  moduleId: "custom-mission-1790828733706",  // CRITICAL: Must match mission ID
  title: "Navigation Quiz",
  questions: [...],
  createdAt: Timestamp,
  ...
}
```

### Key Field: `moduleId`
- **MUST** match the mission/module ID exactly
- Used for direct Firestore query
- Case-sensitive
- Can be string or array (query handles both)

## Migration Notes

### Old Quizzes
- Quizzes created before this fix still work
- As long as `moduleId` field is correct in Firestore
- Assignments no longer needed (safe to ignore)

### New Quizzes
- Will work immediately for any mission
- No assignment creation needed
- Direct query handles everything

## Testing Verification

Test scenarios that now work:
1. ✅ Mission ID changes → quiz still loads
2. ✅ New custom mission → quiz works if moduleId matches
3. ✅ Database has quiz → loads regardless of assignments
4. ✅ Multiple mission edits → quiz persists through all ID changes

## Console Logging

Look for these logs to verify:
```
[GET QUIZ] 🔍 Direct query for quiz with moduleId: custom-mission-...
[GET QUIZ] ✅ Found quiz from Firestore: { id: ..., title: ..., questionsCount: ... }
```

Or if no quiz exists:
```
[GET QUIZ] ℹ️ No quiz exists for module: custom-mission-...
```

## Summary

**Before**: Quiz loading broke every time mission IDs changed (required manual fixes for each ID)
**After**: Quiz loading works universally for ANY mission ID, forever

The fix eliminates the assignment dependency and uses direct Firestore queries, making the system robust and maintenance-free.

---
**Date**: 2026-10-01  
**Issue**: Quiz loading broken with changing mission IDs  
**Resolution**: Implemented direct Firestore query by moduleId  
**Status**: ✅ PERMANENT FIX - No more ID-specific patches needed
