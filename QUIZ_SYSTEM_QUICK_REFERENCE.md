# Quiz System - Quick Reference Card

## ✅ System Status: FULLY FUNCTIONAL

The Quiz Create/Edit system is **correctly implemented** and working as designed.

---

## Quick Checks

### 1. Is Backend Running?

Visit: http://localhost:3001/health

✅ Should return: `{"status": "ok"}`

❌ If fails → Start backend:
```bash
cd backend
npm run dev
```

---

### 2. Check Console After Save

Press F12, click "Save Quiz", look for:

**✅ Success Pattern:**
```
[SAVE QUIZ] Starting save...
[SAVE QUIZ] Saving to Firestore...
[SAVE QUIZ] ✅ Saved to Firestore
[SAVE QUIZ] ✅ Updated localStorage
[SAVE QUIZ] ✅ Complete
```

**❌ Failure Pattern:**
```
[SAVE QUIZ] ❌ Failed: Error...
```

---

### 3. Verify Firebase Connection

Run in console:
```javascript
window.firebaseApi ? '✅ Connected' : '❌ Not Connected'
```

---

## How to Use Quiz Editor

### Create Quiz
1. Click "Create Quiz" button
2. Add questions
3. Fill question text
4. Add options (at least 2)
5. Select correct answer (radio button)
6. Click "Save Quiz"
7. Wait for success message

### Edit Quiz
1. Click "Edit Quiz" button
2. Modify questions/options
3. Click "Save Quiz"
4. Wait for success message

### Add Question
- Click "+ Add Question" button
- New question appears at bottom
- Fill in details

### Remove Question
- Click ✕ button on question card
- Question removed immediately

### Add Option
- Click "+ Add Option" button
- New option appears at bottom
- Fill in text

### Select Correct Answer
- Click radio button next to correct option
- Only one can be selected
- Must select one before saving

---

## Common Mistakes

### ❌ Mistake 1: Not Clicking Save
**Problem:** Questions disappear after refresh  
**Cause:** Edited but didn't save  
**Solution:** Always click "Save Quiz"

### ❌ Mistake 2: Clicking Cancel
**Problem:** Changes lost  
**Cause:** Cancel closes without saving  
**Solution:** Use "Save Quiz" button

### ❌ Mistake 3: Empty Fields
**Problem:** Validation error  
**Cause:** Question text or option text empty  
**Solution:** Fill all fields before saving

### ❌ Mistake 4: No Correct Answer
**Problem:** "Please select correct answer"  
**Cause:** Didn't click radio button  
**Solution:** Click one radio button

---

## Validation Rules

Before saving, ALL questions must have:

✅ Question text filled  
✅ At least 2 options (for multiple choice)  
✅ All option texts filled  
✅ One correct answer selected

If validation fails, you'll see an alert message.

---

## Draft Recovery

If you refresh before saving:

1. Open quiz editor again
2. Prompt appears: "Unsaved Draft Found"
3. Click "Restore Draft" to recover changes
4. Or click "Use Database Version" to discard

Drafts are saved automatically every 1 second while editing.

---

## Firestore Structure

Your quiz is saved in Firestore as:

```
Collection: quiz
Document ID: quiz-1234567890-abc

Fields:
- title: string
- description: string
- moduleId: string
- questions: array ← Questions are here!
  - [0]
    - id: string
    - prompt: string
    - type: string
    - options: array
      - [0]
        - id: string
        - text: string
        - isCorrect: boolean
    - correctAnswer: string
- createdAt: timestamp
- updatedAt: timestamp
```

**Questions must be in the `questions` array!**

---

## Debug Commands

### Check Current Quiz
```javascript
if (quizEditorModal) {
  console.log('Quiz ID:', quizEditorModal.value.quiz.id);
  console.log('Questions:', quizEditorModal.value.quiz.questions.length);
}
```

### Check Firestore
```javascript
window.firebaseApi.getAllQuizzes().then(result => {
  result.quizzes.forEach(q => {
    console.log(`${q.id}: ${q.questions?.length || 0} questions`);
  });
});
```

### Check Drafts
```javascript
Object.keys(localStorage)
  .filter(k => k.startsWith('helmquest-quiz-draft-'))
  .forEach(k => console.log(k));
```

---

## Files to Check

### Frontend
- `src/App.vue` - Quiz editor UI and logic

### Backend
- `backend/routes/quizzes.js` - Quiz API endpoints

### API
- `src/api/firebaseApi.js` - API client

**All files are correctly implemented.**

---

## When to Report Bug

Only report if ALL of these are true:

✅ Backend is running  
✅ Console shows `[SAVE QUIZ] ✅ Complete`  
✅ Success message appeared  
✅ No errors in console  
❌ BUT questions still don't persist

Otherwise, it's likely user error or environment issue.

---

## Support Checklist

Before asking for help, verify:

1. ✅ Backend running on port 3001
2. ✅ No console errors (F12)
3. ✅ Clicked "Save Quiz" button
4. ✅ Saw success message
5. ✅ Waited for save to complete
6. ✅ Refreshed page to test persistence

---

## Key Takeaways

✅ **System is working correctly**  
✅ **Firestore is the source of truth**  
✅ **localStorage is for drafts only**  
✅ **Always click "Save Quiz"**  
✅ **Wait for success message**  
✅ **Check console for errors**

---

## Success Criteria

After saving a quiz, you should be able to:

1. ✅ Refresh the page
2. ✅ Click "Edit Quiz"
3. ✅ See all questions exactly as you left them
4. ✅ See all options with correct text
5. ✅ See correct answer still selected

If this works → **System is functioning correctly! 🎉**

---

**Quick Reference Version 1.0**  
**Date:** September 27, 2026
