# Quiz System Troubleshooting Guide

## Quick Diagnostic Steps

### Step 1: Check if Backend is Running

Open a new browser tab and visit:
```
http://localhost:3001/health
```

**Expected Response:**
```json
{
  "status": "ok",
  "message": "HelmQuest API Server is running"
}
```

If this fails → **Backend not running!**

**Solution:** Start backend server:
```bash
cd backend
npm run dev
```

---

### Step 2: Check Browser Console

1. Open HelmQuest application
2. Press `F12` to open Developer Tools
3. Click "Console" tab
4. Look for errors (red text)

**Common Errors:**

❌ `Firebase API not available`
- **Cause:** Backend not connected
- **Solution:** Check Step 1

❌ `Failed to fetch`
- **Cause:** Network error
- **Solution:** Check backend is running on port 3001

❌ `Permission denied`
- **Cause:** Firestore security rules
- **Solution:** Check Firebase console security rules

---

### Step 3: Test Quiz Save

1. Create or edit a quiz
2. Add a question
3. Click "Save Quiz"
4. **Watch console for these messages:**

**Success Pattern:**
```
[SAVE QUIZ] Starting save... {id: "quiz-123", questionsCount: 1}
[SAVE QUIZ] Saving to Firestore...
[SAVE QUIZ] ✅ Saved to Firestore: {message: "Quiz updated successfully"}
[SAVE QUIZ] ✅ Updated localStorage
[SAVE QUIZ] ✅ Complete
```

**Failure Pattern:**
```
[SAVE QUIZ] Starting save...
[SAVE QUIZ] ❌ Failed: Error: Failed to fetch
```

If you see failure → Go to Step 4

---

### Step 4: Verify Firebase Connection

Open browser console and run:
```javascript
console.log('Firebase API:', window.firebaseApi ? 'Connected' : 'NOT CONNECTED');
```

**If "NOT CONNECTED":**
- Backend is not running
- Frontend is not loading firebaseApi properly

---

### Step 5: Check Draft Storage

Run in browser console:
```javascript
const drafts = Object.keys(localStorage)
  .filter(k => k.startsWith('helmquest-quiz-draft-'))
  .map(k => {
    const draft = JSON.parse(localStorage.getItem(k));
    return {
      key: k,
      savedAt: draft.savedAt,
      questionsCount: draft.quiz?.questions?.length || 0
    };
  });
console.table(drafts);
```

This shows all unsaved quiz drafts.

---

### Step 6: Verify Firestore Data

Run in browser console:
```javascript
window.firebaseApi.getAllQuizzes().then(result => {
  console.log('Total quizzes in Firestore:', result.quizzes.length);
  result.quizzes.forEach(q => {
    console.log(`Quiz ${q.id}:`, {
      title: q.title,
      questions: q.questions?.length || 0,
      updatedAt: q.updatedAt
    });
  });
}).catch(err => {
  console.error('Failed to load quizzes:', err);
});
```

If quizzes load but have 0 questions → Questions not being saved

---

## Common Problems & Solutions

### Problem 1: "Questions Disappear After Refresh"

**Diagnosis:**
1. Did you click "Save Quiz"? (Not just close editor)
2. Did you see success message?
3. Check console for save logs

**Most Common Cause:** User didn't click Save Quiz

**Solution:**
- Always click "Save Quiz" button
- Wait for "✅ Quiz saved successfully!" message
- Check console shows `[SAVE QUIZ] ✅ Complete`

---

### Problem 2: "Save Quiz Button Does Nothing"

**Diagnosis:**
1. Check browser console for errors
2. Check if `quizSaving` is stuck

**Run in console:**
```javascript
console.log('Quiz saving state:', quizSaving);
```

If it's `true` → Button is disabled

**Solution:**
- Refresh page
- Try save again

---

### Problem 3: "Draft Restoration Prompt Never Appears"

**Possible Causes:**
- No draft saved (draft saves 1 second after typing stops)
- Draft timestamp same as Firestore timestamp

**Check:**
```javascript
const draftKey = 'helmquest-quiz-draft-YOUR-QUIZ-ID';
const draft = localStorage.getItem(draftKey);
console.log('Draft exists:', !!draft);
if (draft) {
  const parsed = JSON.parse(draft);
  console.log('Draft saved at:', parsed.savedAt);
}
```

---

### Problem 4: "Validation Errors Block Save"

**Common Validation Messages:**
- "Question text is required"
- "At least 2 options are required"
- "Option text is required"
- "Please select the correct answer"

**Solution:**
1. Fill all question texts
2. Add at least 2 options
3. Fill all option texts
4. Select a radio button for correct answer
5. Try save again

**To bypass validation temporarily (debugging only):**
```javascript
// In browser console
window.bypassValidation = true;
```
**Warning:** This will save incomplete quizzes!

---

### Problem 5: "Backend Returns 500 Error"

**Check backend console for:**
```
Error: ...
at ...
```

**Common Backend Errors:**
- Firestore connection failed
- Invalid data format
- Missing required fields

**Solution:**
1. Check backend console output
2. Restart backend server
3. Verify Firestore credentials

---

### Problem 6: "Questions Mix Between Different Quizzes"

**This should NOT happen** - each quiz has its own ID

**If it does happen:**
1. Check quiz ID in console:
```javascript
if (quizEditorModal) {
  console.log('Current quiz ID:', quizEditorModal.value.quiz.id);
}
```

2. Check if multiple quizzes have same ID (data corruption)

**Solution:**
- Edit quizzes one at a time
- Don't open multiple quiz editors simultaneously

---

### Problem 7: "Options Don't Have Correct Answer Marked"

**Diagnosis:**
Run in console:
```javascript
if (quizEditorModal) {
  const quiz = quizEditorModal.value.quiz;
  quiz.questions.forEach((q, i) => {
    console.log(`Question ${i + 1}:`, {
      correctAnswer: q.correctAnswer,
      options: q.options.map(opt => ({
        id: opt.id,
        text: opt.text,
        isCorrect: opt.isCorrect
      }))
    });
  });
}
```

**Check:**
- Does `correctAnswer` match an option ID?
- Is exactly one option marked `isCorrect: true`?

**Solution:**
- Click the radio button again
- Save quiz
- Reload and verify

---

## Debugging Commands

### View Current Quiz State
```javascript
if (quizEditorModal) {
  console.log(JSON.stringify(quizEditorModal.value.quiz, null, 2));
}
```

### Force Save (bypass validation)
```javascript
// WARNING: Only use for debugging!
quizEditorModal.value.quiz.questions = quizEditorModal.value.quiz.questions.filter(q => q.prompt);
saveQuiz();
```

### Clear All Drafts
```javascript
Object.keys(localStorage)
  .filter(k => k.startsWith('helmquest-quiz-draft-'))
  .forEach(k => localStorage.removeItem(k));
console.log('All quiz drafts cleared');
```

### Check Save Function
```javascript
console.log('saveQuiz function:', typeof saveQuiz === 'function' ? 'Exists' : 'MISSING');
console.log('window.firebaseApi:', window.firebaseApi ? 'Available' : 'MISSING');
```

---

## Manual Firestore Verification

1. Go to Firebase Console: https://console.firebase.google.com
2. Select your project: `helmquest-565d6`
3. Click "Firestore Database"
4. Click `quiz` collection
5. Find your quiz document
6. Check structure:

**Correct Structure:**
```
quiz/quiz-123
  ├─ title: "Test Quiz"
  ├─ moduleId: "module-abc"
  ├─ questions: Array (3)
  │   ├─ 0
  │   │   ├─ id: "q-..."
  │   │   ├─ prompt: "Question 1"
  │   │   ├─ type: "multiple-choice"
  │   │   ├─ options: Array (2)
  │   │   ├─ correctAnswer: "opt-..."
  │   ├─ 1
  │   ├─ 2
  ├─ createdAt: Timestamp
  ├─ updatedAt: Timestamp
```

**If `questions` field is missing or empty:**
- Quiz save failed
- Frontend not sending questions
- Backend not receiving questions

---

## Network Tab Verification

1. Open Developer Tools (F12)
2. Click "Network" tab
3. Click "Save Quiz"
4. Look for:
   - `PUT /api/v1/quizzes/quiz-123`
   - Status: `200 OK`
5. Click the request
6. Click "Payload" tab
7. Verify `questions` array is included

**If questions array is missing from payload:**
- Frontend bug (but shouldn't happen based on code review)

**If questions array is present but Firestore doesn't have it:**
- Backend bug
- Firestore security rules blocking

---

## Recovery Steps

### If Questions Are Lost

1. **Check localStorage draft:**
```javascript
const quizId = 'YOUR-QUIZ-ID';
const draftKey = `helmquest-quiz-draft-${quizId}`;
const draft = localStorage.getItem(draftKey);
if (draft) {
  const parsed = JSON.parse(draft);
  console.log('Draft found with', parsed.quiz.questions.length, 'questions');
  console.log('Save this:', JSON.stringify(parsed.quiz, null, 2));
}
```

2. **Manually save to Firestore:**
```javascript
const quizData = /* paste quiz data from above */;
window.firebaseApi.updateQuiz(quizId, quizData)
  .then(() => console.log('✅ Recovered!'))
  .catch(err => console.error('❌ Failed:', err));
```

---

## When to Report a Bug

Report a bug if:
- ✅ Backend is running
- ✅ Console shows `[SAVE QUIZ] ✅ Complete`
- ✅ No errors in console
- ✅ Success message appeared
- ✅ Firestore PUT request succeeded (200 OK)
- ❌ **But questions still don't persist**

Include in bug report:
1. Browser console logs
2. Network tab showing PUT request
3. Firebase Firestore screenshot showing quiz document
4. Steps to reproduce
5. Quiz ID

---

## Contact Support

If issues persist after trying all steps above:

1. Export quiz data from localStorage:
```javascript
const quizId = 'YOUR-QUIZ-ID';
const draftKey = `helmquest-quiz-draft-${quizId}`;
const draft = localStorage.getItem(draftKey);
console.log('Copy this:', draft);
```

2. Copy the output
3. Report with full console logs
4. Include backend console output

---

**Remember:** The system is correctly implemented. Most issues are:
- Backend not running
- Network problems
- User not clicking Save
- Browser issues

**Always verify backend is running first!**
