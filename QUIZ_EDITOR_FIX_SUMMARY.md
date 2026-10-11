# Quiz Editor Fix - Implementation Summary

## Overview
Fixed the quiz creation/editing functionality to properly save questions and options to Firestore database while maintaining a clean architecture with localStorage as a draft/recovery mechanism only.

## Problem
- Questions and options were not being properly saved to Firestore
- Auto-sync was writing on every keystroke (inefficient)
- No draft recovery mechanism
- Options lacked unique IDs causing UI issues
- Questions would disappear after page reload

## Solution Architecture

### Data Flow
```
Firestore (Source of Truth)
    ↓
Load existing quiz
    ↓
Frontend state (quiz editor)
    ↓
User edits quiz
    ↓
Frontend state updates
    ↓
localStorage draft (autosave, recovery only)
    ↓
User clicks "Save Quiz"
    ↓
Validate quiz
    ↓
Save to Firestore (permanent)
    ↓
Update localStorage (cache)
    ↓
Clear draft
    ↓
Show success message
```

## Files Modified

### 1. `src/App.vue`

#### Added State Variables:
- `quizSaving` - Prevents double-click saves
- `quizLoadError` - Tracks loading errors
- `quizDraftRestorePrompt` - Controls draft restoration UI

#### Added Functions:

**ID Generation:**
- `generateQuestionId()` - Creates unique question IDs
- `generateOptionId()` - Creates unique option IDs

**Draft Management:**
- `getDraftKey(quizId)` - Returns localStorage key for quiz draft
- `saveDraftToLocalStorage(quizId, quizData)` - Saves editing state to localStorage
- `loadDraftFromLocalStorage(quizId)` - Loads draft from localStorage
- `clearDraftFromLocalStorage(quizId)` - Removes draft after successful save
- `debouncedSaveDraft()` - Debounced draft save (1 second delay)

**Quiz Loading:**
- `normalizeQuizData(quiz)` - Ensures all questions/options have IDs and required fields
  - Handles legacy data formats
  - Adds missing IDs to questions and options
  - Fixes correctAnswer references
  - Validates data structure

**Quiz Operations:**
- `openQuizEditor(quiz, moduleId, isNew)` - Opens editor with deep cloned quiz
- `restoreDraft()` - Restores unsaved draft
- `discardDraft()` - Discards draft and uses Firestore data

#### Modified Functions:

**`startCreatingQuiz()`:**
- Now checks for unsaved drafts
- Compares draft timestamp vs Firestore timestamp
- Shows restoration prompt if draft is newer
- Uses `openQuizEditor()` for consistent behavior

**`addQuestion()`:**
- Creates question with unique ID
- Saves draft to localStorage
- NO Firestore write

**`removeQuestion()`:**
- Removes question from array
- Re-indexes remaining questions
- Saves draft to localStorage
- NO Firestore write

**`resetAnswerOptions()`:**
- Creates options with unique IDs
- Saves draft to localStorage

**`setCorrectOption()`:**
- Marks selected option as correct
- Stores option ID (not text) as correctAnswer
- Saves draft to localStorage

**`addOption()`:**
- Creates option with unique ID
- Saves draft to localStorage

**`removeOption()`:**
- Clears correctAnswer if removing correct option
- Saves draft to localStorage

**`saveQuiz()` - Complete Rewrite:**
```javascript
async function saveQuiz() {
  // 1. Prevent double-click with quizSaving flag
  // 2. Validate all questions
  //    - Question text required
  //    - At least 2 options for multiple-choice
  //    - All options must have text
  //    - Correct answer must be selected
  // 3. Save to Firestore (PRIMARY)
  // 4. Update localStorage (CACHE)
  // 5. Clear draft (success only)
  // 6. Close editor
  // 7. Show success message
  // 8. Handle errors without losing work
}
```

**`cancelQuizEditor()`:**
- Warns about unsaved changes
- Mentions draft is saved

#### Removed Functions:
- `syncQuizToDatabase()` - Removed automatic sync
- `debouncedSyncQuiz()` - Removed keystroke sync
- Vue watcher for quiz changes - Removed automatic Firestore writes

#### Updated HTML Template:

**Quiz Editor Modal:**
- Changed `@input="debouncedSyncQuiz"` to `@input="debouncedSaveDraft"`
- Changed radio button `:name="'correct-' + qIdx"` to `:name="'correct-' + question.id"` (uses unique ID)
- Changed `v-for="(option, optIdx) in question.options" :key="optIdx"` to `:key="option.id"`
- Added `:disabled="quizSaving"` to buttons
- Dynamic button text: "Saving..." during save
- Changed option keys from index to `option.id`

**Draft Restoration UI:**
- New modal that appears when unsaved draft is found
- Shows draft timestamp vs database timestamp
- "Restore Draft" button
- "Use Database Version" button

## Firestore Structure

### Collection: `quiz`
```javascript
{
  id: "auto-generated-by-firestore",
  title: "Navigation Safety Quiz",
  description: "Basic navigation assessment",
  moduleId: "m1-mission1",
  createdBy: "instructor-id",
  createdAt: "2026-09-26T10:30:00.000Z",
  updatedAt: "2026-09-26T11:45:00.000Z",
  questions: [
    {
      id: "q-1727362819-abc123",
      prompt: "What is the purpose of a navigation buoy?",
      type: "multiple-choice",
      order: 0,
      correctAnswer: "opt-1727362819-001",
      options: [
        {
          id: "opt-1727362819-001",
          text: "Navigation marker",
          isCorrect: true
        },
        {
          id: "opt-1727362819-002",
          text: "Fishing equipment",
          isCorrect: false
        },
        {
          id: "opt-1727362819-003",
          text: "Communication device",
          isCorrect: false
        }
      ],
      checkpointLat: 7.073,
      checkpointLon: 125.648
    }
  ]
}
```

### Key Points:
- Questions stored as array inside quiz document
- Each question has unique `id` field
- Each option has unique `id` field
- `correctAnswer` stores option ID (not text)
- `isCorrect` boolean on each option for UI state
- Timestamps preserved (createdAt never changes)

## localStorage Structure

### Cache: `helmquest-progress-v3`
```javascript
{
  quizzes: [/* same as Firestore */],
  quizAssignments: [
    {
      id: "assignment-123",
      quizId: "quiz-firestore-id",
      targetType: "module",
      targetId: "m1-mission1"
    }
  ]
}
```

### Draft: `helmquest-quiz-draft-{quizId}`
```javascript
{
  quiz: {/* complete quiz object */},
  savedAt: "2026-09-26T11:50:00.000Z"
}
```

## Save Operation Flow

### 1. User Clicks "Save Quiz"
```
Check if already saving → prevent double-click
```

### 2. Validation
```
For each question:
  ✓ Question text not empty
  ✓ Multiple choice has >= 2 options
  ✓ All options have text
  ✓ Correct answer is selected
  ✓ True/False has answer
  ✓ Fill-in-blank has answer
```

### 3. Firestore Save
```javascript
POST /api/v1/quizzes/{quizId}
{
  title,
  description,
  moduleId,
  questions: [...],  // Complete array
  updatedAt,
  createdBy,
  createdAt
}
```

### 4. localStorage Update
```javascript
progressData.value.quizzes[idx] = quiz
saveProgress(progressData.value)
```

### 5. Clear Draft
```javascript
localStorage.removeItem(`helmquest-quiz-draft-${quizId}`)
```

### 6. Success
```
Close modal
Show achievement: "✅ Quiz saved successfully!"
```

## Draft Recovery Flow

### On Opening Existing Quiz:
1. Load quiz from Firestore
2. Check if draft exists in localStorage
3. Compare timestamps:
   - `draftTime > firestoreTime` → Show restoration prompt
   - `draftTime <= firestoreTime` → Use Firestore data
4. User chooses:
   - "Restore Draft" → Load draft into editor
   - "Use Database Version" → Delete draft, use Firestore

### During Editing:
- Every text input triggers `debouncedSaveDraft()` (1 second delay)
- Every button action (add/remove) triggers immediate draft save
- Draft contains complete quiz state
- Draft timestamp updated on each save

### On Successful Save:
- Draft is deleted from localStorage
- Only Firestore and localStorage cache remain

### On Save Failure:
- Draft is NOT deleted
- User sees error message
- Work is recoverable on next edit

## Validation Rules

### Question-Level:
- ✅ Question text required
- ✅ Question type required (multiple-choice, true-false, fill-in-blank)

### Multiple Choice:
- ✅ At least 2 options
- ✅ At most 6 options
- ✅ All options must have text
- ✅ Exactly one correct answer selected

### True/False:
- ✅ Answer must be "True" or "False"

### Fill-in-the-Blank:
- ✅ Correct answer required

### User-Friendly Messages:
```
"Question 1: Question text is required"
"Question 2: At least 2 options are required"
"Question 3: Option 1 text is required"
"Question 4: Please select the correct answer"
"Question 5: Correct answer is required"
```

## Key Improvements

### 1. **No More Auto-Sync**
- Removed Vue watcher
- Removed debounced Firestore sync
- Removed per-keystroke database writes
- **Result:** Cleaner code, fewer API calls, better performance

### 2. **Proper Save Button**
- Single Firestore write on button click
- Validation before save
- Loading state during save
- Disabled button prevents double-click
- Success/error feedback

### 3. **Draft Recovery**
- Automatic draft save on changes
- Smart recovery prompt (only if draft is newer)
- User choice preserved
- No accidental data loss

### 4. **Unique IDs**
- Every question has unique ID
- Every option has unique ID
- Radio buttons work correctly
- Vue reactivity works correctly
- Re-rendering doesn't break state

### 5. **Data Normalization**
- Handles old quiz formats
- Adds missing IDs automatically
- Fixes correctAnswer references
- Ensures data integrity

### 6. **Better UX**
- "Saving..." button state
- Disabled buttons during save
- Clear validation messages
- Draft recovery prompt
- Success achievement notification

## Testing Checklist

### ✅ Test 1: Create New Quiz
1. Click "Create Quiz"
2. Add question
3. Add options
4. Select correct answer
5. Click "Save Quiz"
6. Refresh page
7. **Expected:** Questions persist

### ✅ Test 2: Edit Existing Quiz
1. Open existing quiz
2. Edit question text
3. Add new option
4. Change correct answer
5. Click "Save Quiz"
6. Refresh page
7. **Expected:** Changes persist

### ✅ Test 3: Multiple Questions
1. Create quiz with 3 questions
2. Each with different options
3. Each with different correct answers
4. Save
5. Refresh
6. **Expected:** All questions independent and persisted

### ✅ Test 4: Draft Recovery
1. Edit quiz
2. Make changes
3. DON'T click save
4. Refresh page
5. **Expected:** Draft recovery prompt appears
6. Click "Restore Draft"
7. **Expected:** Changes are restored

### ✅ Test 5: Validation
1. Try to save empty question
2. **Expected:** Error message
3. Try to save with no correct answer
4. **Expected:** Error message
5. Fix errors and save
6. **Expected:** Success

### ✅ Test 6: Double-Click Prevention
1. Click "Save Quiz" rapidly
2. **Expected:** Only one save operation
3. Button shows "Saving..."
4. Button disabled during save

### ✅ Test 7: Save Failure
1. Disconnect network
2. Edit quiz
3. Click save
4. **Expected:** Error message
5. Draft still exists
6. Reconnect and retry
7. **Expected:** Save succeeds

### ✅ Test 8: Option Management
1. Add option → Save → Refresh
2. **Expected:** Option persists
3. Remove option → Save → Refresh
4. **Expected:** Option removed
5. Change option text → Save → Refresh
6. **Expected:** Text updated

### ✅ Test 9: Question Types
1. Create True/False question
2. Save and refresh
3. **Expected:** Type and answer persist
4. Create Fill-in-Blank
5. Save and refresh
6. **Expected:** Type and answer persist

### ✅ Test 10: Legacy Data
1. Load quiz with old format (no IDs)
2. **Expected:** Normalized automatically
3. Edit and save
4. **Expected:** New format persisted

## Known Limitations

1. **Single instructor editing** - No real-time collaboration. If two instructors edit the same quiz simultaneously, last save wins.
2. **Draft per browser** - Drafts are localStorage-based, not synced across devices.
3. **No version history** - Previous versions not saved (could be added later).
4. **Manual refresh** - Need to manually open quiz editor to see changes from other instructors.

## Future Enhancements

### Possible Additions:
- Real-time collaborative editing (Firestore listeners)
- Version history / audit log
- Auto-save to Firestore (every 30 seconds)
- Cloud-based draft sync
- Undo/redo functionality
- Question bank / template library
- Bulk import/export
- Question difficulty ratings
- Analytics on quiz performance

## Architecture Benefits

### Why This Approach:
1. **Firestore = Source of Truth** - Clear ownership, no confusion
2. **localStorage = Recovery Only** - Clear purpose, not a "second database"
3. **Single Save Button** - User control, clear intent
4. **Validation Before Save** - Data integrity guaranteed
5. **Draft as Safety Net** - User never loses work
6. **Unique IDs** - Stable references, proper reactivity
7. **Normalization** - Backward compatibility maintained

### Why NOT Auto-Sync:
- ❌ Too many API calls
- ❌ Race conditions
- ❌ Unclear save state
- ❌ Network issues cause problems
- ❌ No validation opportunity
- ❌ Harder to debug

### Why YES Save Button:
- ✅ Clear user intent
- ✅ Single validation point
- ✅ Single API call
- ✅ Clear success/failure
- ✅ User control
- ✅ Easier to debug

## Conclusion

The quiz editor now follows a clean, predictable architecture:
- **Firestore** is the permanent database
- **localStorage** is for drafts and recovery only
- **Save button** is the single source of database writes
- **Validation** ensures data quality
- **IDs** ensure stability and reactivity
- **Normalization** ensures compatibility

This matches the recommended architecture from your requirements exactly.
