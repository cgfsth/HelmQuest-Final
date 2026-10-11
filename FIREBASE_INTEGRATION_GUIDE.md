# Firebase REST API Integration - Setup Guide

## Current Status ✅

### What's Been Done:
1. ✅ Created REST API client (`src/api/firebaseApi.js`)
2. ✅ Imported API into App.vue
3. ✅ Updated `saveMissionEditor()` function to save to Firestore
4. ✅ Made API globally available via `window.firebaseApi`

### Changes Made to Code:
- **File**: `src/api/firebaseApi.js` (NEW)
  - Contains all API functions for modules, quizzes, students, etc.
  
- **File**: `src/App.vue`
  - Line ~3616: Added `import * as firebaseApi from './api/firebaseApi.js';`
  - Line ~3785: Made API available globally: `window.firebaseApi = firebaseApi;`
  - Line ~7953: Updated `saveMissionEditor()` to call REST API

---

## Testing the Integration

### Step 1: Start the Backend Server
```bash
cd backend
npm start
```

**Expected output:**
```
Server running on http://localhost:3000
Firebase Admin SDK initialized for project: helmquest-565d6
```

### Step 2: Start the Frontend
```bash
# In the main project directory
npm run dev
```

**Expected output:**
```
VITE v5.2.0  ready in XXX ms
➜  Local:   http://localhost:5174/
```

### Step 3: Test Mission Creation

1. Open http://localhost:5174/ in your browser
2. Click "Instructor Login" → Log in
3. Go to Instructor Panel
4. Click "Create New Mission"
5. Fill in mission details:
   - Title: "Test Mission"
   - Category: "Module 1"
   - Add at least one step with coordinates
6. Click "💾 Save Mission"

**What Should Happen:**
- Console log: `✅ Mission created in Firestore:` (with response data)
- Success message: "✅ Mission created"
- Mission appears in instructor panel
- **MOST IMPORTANT**: Mission saved to Firestore `training_modules` collection

**Check in Firebase Console:**
- Go to https://console.firebase.google.com/
- Select project "helmquest-565d6"
- Navigate to Firestore Database
- Look for your new mission in `training_modules` collection

---

## Troubleshooting

### Problem: "Failed to save to database: Failed to fetch"

**Solution:**
1. Make sure backend server is running (`cd backend && npm start`)
2. Check console for CORS errors
3. Verify backend is accessible at http://localhost:3000

### Problem: Backend server error "GOOGLE_APPLICATION_CREDENTIALS"

**Solution:**
1. Download your Firebase service account key:
   - Go to Firebase Console → Project Settings → Service Accounts
   - Click "Generate New Private Key"
   - Save as `backend/serviceAccountKey.json`
2. The `.env` file should already have: `GOOGLE_APPLICATION_CREDENTIALS=./serviceAccountKey.json`

### Problem: "Cannot read property 'createModule' of undefined"

**Solution:**
- Refresh the page (F5) to reload the Vue app with the new API import
- Check browser console for import errors

---

## Next Steps

### Other Functions to Update:

The same pattern needs to be applied to these functions in `App.vue`:

1. **Quiz Creation** (`saveQuizEditor()` around line 8500)
   - Should call `firebaseApi.createQuiz()` or `firebaseApi.updateQuiz()`

2. **Student Creation** (in instructor panel)
   - Should call `firebaseApi.createStudent()`

3. **Quiz Assignment** (`assignQuiz()` function)
   - Should call `firebaseApi.assignQuiz()`

4. **Mission Attempt Recording** (after mission completion)
   - Should call `firebaseApi.recordAttempt()`

5. **Quiz Submission** (`handlePostDockingQuizSubmit()`)
   - Should call `firebaseApi.submitQuiz()`

### Example Pattern:

```javascript
async function saveQuizEditor() {
  // ... validation code ...
  
  try {
    if (isNew) {
      const response = await window.firebaseApi.createQuiz(quizData);
      console.log('✅ Quiz created:', response);
    } else {
      const response = await window.firebaseApi.updateQuiz(quizId, quizData);
      console.log('✅ Quiz updated:', response);
    }
    
    // ... rest of the code ...
  } catch (error) {
    console.error('❌ Failed to save quiz:', error);
    showAchievement(`⚠️ Failed to save: ${error.message}`);
    return;
  }
}
```

---

## API Reference

### Available Functions:

**Modules (Training Missions):**
- `createModule(moduleData)`
- `updateModule(moduleId, moduleData)`
- `getAllModules()`
- `getModule(moduleId)`
- `deleteModule(moduleId)`

**Quizzes:**
- `createQuiz(quizData)`
- `updateQuiz(quizId, quizData)`
- `getAllQuizzes()`
- `assignQuiz(assignmentData)`
- `submitQuiz(submissionData)`
- `gradeQuiz(submissionId)`
- `getQuizResults(filters)`

**Students:**
- `createStudent(studentData)`
- `updateStudent(studentId, studentData)`
- `getAllStudents()`
- `getStudent(studentId)`

**Mission Attempts:**
- `recordAttempt(attemptData)`
- `getStudentAttempts(studentId)`
- `getMissionAttempts(missionId)`

**Progress:**
- `getStudentProgress(studentId)`
- `updateModuleProgress(progressData)`
- `getCourseSettings()`
- `updateCourseSettings(settings)`

For full API documentation, see: `backend/README.md`

---

## Status Summary

**✅ WORKING NOW:**
- Instructor can create missions
- Missions save to Firestore via REST API
- Missions persist in database

**⏳ TODO:**
- Update quiz creation to use REST API
- Update student creation to use REST API  
- Update mission attempt recording to use REST API
- Update quiz submissions to use REST API
- Load missions from Firestore on app startup
