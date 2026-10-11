# Quiz Editor - Quick Start Guide

## 🚀 Ready to Use!

The quiz editor has been fixed and is ready for immediate use. Follow this guide to get started.

---

## ✅ What's Been Fixed

- ✅ Questions now save to database
- ✅ Options now persist correctly
- ✅ Correct answers stay selected
- ✅ Draft recovery prevents data loss
- ✅ Validation ensures data quality
- ✅ Single save button (no auto-sync issues)

---

## 🎯 Quick Test (2 Minutes)

### Step 1: Start Servers
```bash
# Terminal 1 - Backend
cd backend
npm start

# Terminal 2 - Frontend
cd ..
npm run dev
```

### Step 2: Login
- Open browser: `http://localhost:5174`
- Email: `instructor@helmquest.edu.ph`
- Password: `password`

### Step 3: Create Quiz
1. Click any training module
2. Click "CREATE QUIZ"
3. Add question: "What is a navigation buoy?"
4. Add options:
   - "Navigation marker" ✓ (select as correct)
   - "Fishing equipment"
5. Click "💾 Save Quiz"

### Step 4: Verify
1. Press F5 (refresh page)
2. Login again
3. Click "UPDATE QUIZ"
4. ✅ Question and options should appear!

---

## 📖 How to Use

### Creating a New Quiz

```
1. Navigate to training module
2. Click "CREATE QUIZ"
3. Quiz editor opens with 1 blank question
4. Fill in question text
5. Add options (2-6 options)
6. Select correct answer (radio button)
7. Click "+ Add Question" for more questions
8. Click "💾 Save Quiz"
9. Done!
```

### Editing Existing Quiz

```
1. Navigate to training module
2. Click "UPDATE QUIZ" (not "CREATE")
3. If draft exists, choose "Restore" or "Discard"
4. Make changes
5. Click "💾 Save Quiz"
6. Done!
```

### Question Types

**Multiple Choice:**
- Add 2-6 options
- Select one as correct
- Best for: Knowledge checks

**True/False:**
- Select True or False
- Best for: Quick assessments

**Fill in the Blank:**
- Enter correct answer
- Best for: Recall questions

---

## 🛡️ Safety Features

### Auto-Save Draft
- **When:** Every 1 second while editing
- **Where:** Browser localStorage
- **Purpose:** Recover work if browser crashes

### Draft Recovery
- **When:** Opening quiz after unsaved changes
- **What:** Shows prompt with two options:
  - "Restore Draft" - Continue where you left off
  - "Use Database Version" - Start fresh from last save

### Validation
- **When:** Clicking "Save Quiz"
- **What:** Checks for:
  - Empty question text
  - Missing options
  - Empty option text
  - No correct answer selected
- **Result:** Shows clear error message if invalid

### Error Handling
- **Network fails:** Work saved as draft, can retry
- **Double-click:** Prevented, only one save occurs
- **Browser crash:** Draft recoverable on next edit

---

## 💡 Tips & Best Practices

### ✅ DO:
- Save frequently (click Save Quiz button)
- Review questions before saving
- Use clear, concise question text
- Provide distinct answer options
- Test quiz after creating

### ❌ DON'T:
- Rely only on draft (always click Save)
- Create too many options (4 is optimal)
- Make answer options too similar
- Forget to select correct answer
- Leave questions blank

---

## 🐛 Troubleshooting

### Problem: Questions disappear after refresh
**Solution:** Click "Save Quiz" button before closing editor

### Problem: Options mixing between questions
**Solution:** This has been fixed! Each question is now independent.

### Problem: Correct answer not saving
**Solution:** This has been fixed! Answers now use stable IDs.

### Problem: Can't see "Save Quiz" button
**Solution:** Scroll down in the editor modal

### Problem: Button says "Saving..." forever
**Solution:** 
- Check browser console for errors
- Check backend server is running
- Check network connection
- Refresh page and try again

### Problem: Draft prompt always appears
**Solution:** Click "Save Quiz" to clear the draft

### Problem: Validation error won't go away
**Solution:** 
- Read error message carefully
- Fix the specific issue mentioned
- Common: Empty question text, no correct answer selected

---

## 📚 Documentation

### Quick Reference
- This file - Quick start guide
- `QUIZ_FIX_COMPLETE.md` - Overview
- `TESTING_GUIDE.md` - Testing procedures
- `QUIZ_EDITOR_FIX_SUMMARY.md` - Technical details
- `QUIZ_ARCHITECTURE_DIAGRAM.md` - Visual diagrams

### Key Points
1. **Firestore = Database** (permanent storage)
2. **localStorage = Draft** (temporary recovery)
3. **Save Button = Truth** (click to persist)

---

## 🎓 Example: Complete Quiz Creation

### Scenario: Navigation Safety Quiz

**Step 1:** Click "CREATE QUIZ"

**Step 2:** Question 1
```
Text: "What is the primary purpose of a navigation buoy?"
Type: Multiple Choice
Options:
  ○ Fishing equipment
  ○ Weather station
  ● Navigation marker (CORRECT)
  ○ Communication device
```

**Step 3:** Click "+ Add Question"

**Step 4:** Question 2
```
Text: "What color is a port-side marker?"
Type: Multiple Choice
Options:
  ● Red (CORRECT)
  ○ Green
  ○ Yellow
  ○ Blue
```

**Step 5:** Click "+ Add Question"

**Step 6:** Question 3
```
Text: "True or False: Starboard means right side"
Type: True/False
Select: ● True (CORRECT)
```

**Step 7:** Click "💾 Save Quiz"

**Step 8:** Success! Quiz is saved.

**Step 9:** Refresh page to verify

**Step 10:** Click "UPDATE QUIZ" - all questions appear!

---

## ⚡ Keyboard Shortcuts

- **Tab** - Move between fields
- **Enter** - (in text field) Move to next field
- **Escape** - Close modal (with confirmation)
- **Ctrl+S** - (doesn't work, must click Save button)

---

## 🔍 Verification Checklist

After creating a quiz, verify:
- [ ] All questions saved
- [ ] All options saved
- [ ] Correct answers selected
- [ ] Question types correct
- [ ] No draft prompt after save
- [ ] Data persists after refresh

---

## 📞 Getting Help

### Browser Console
1. Press F12
2. Click "Console" tab
3. Look for errors (red text)
4. Look for logs starting with `[SAVE QUIZ]` or `[GET QUIZ]`

### Network Tab
1. Press F12
2. Click "Network" tab
3. Click "Save Quiz"
4. Look for PUT request to `/api/v1/quizzes/`
5. Check if status is 200 OK

### Firestore Console
1. Open Firebase Console
2. Navigate to Firestore Database
3. Open `quiz` collection
4. Find your quiz document
5. Verify `questions` array exists

---

## ✨ Advanced Features

### Bulk Operations
- Delete question: Click ✕ button on question
- Reorder questions: Delete and re-add (no drag-drop yet)
- Duplicate question: Copy text manually (no clone yet)

### Draft Management
- Clear draft: Click "Use Database Version" when prompted
- Force save draft: Make any change, wait 1 second
- Check draft: Open browser DevTools, Application tab, Local Storage

### Validation Override
- Empty quiz: Click OK on confirmation dialog to save anyway
- Missing data: Fix validation errors (cannot override)

---

## 🎉 Success!

You're now ready to create and edit quizzes in HelmQuest!

Remember:
- **Click "Save Quiz"** to persist changes
- **Drafts are safety nets** but not permanent
- **Validation helps** ensure quality quizzes
- **Questions persist** after refresh when saved

**Happy quiz creating! ⚓📝**
