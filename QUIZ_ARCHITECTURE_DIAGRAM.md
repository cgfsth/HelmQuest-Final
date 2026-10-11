# Quiz Editor Architecture Diagram

## Complete Data Flow Visualization

```
┌──────────────────────────────────────────────────────────────────────────┐
│                           USER ACTIONS                                    │
└──────────────────────────────────────────────────────────────────────────┘
         │                          │                          │
         │ Create Quiz              │ Edit Quiz               │ Save Quiz
         ↓                          ↓                          ↓
┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐
│ Click "CREATE"  │       │ Click "UPDATE"  │       │ Click "SAVE"    │
└────────┬────────┘       └────────┬────────┘       └────────┬────────┘
         │                          │                          │
         ↓                          ↓                          ↓
┌────────────────────────────────────────────────────────────────────────┐
│                        FIRESTORE OPERATIONS                             │
├────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  CREATE:                LOAD:                  SAVE:                   │
│  POST /quizzes          GET /quizzes/:id       PUT /quizzes/:id        │
│  ↓                      ↓                      ↓                        │
│  Returns quizId         Returns quiz+questions  Updates complete quiz  │
│                         ↓                      ↓                        │
│                         Check for draft        Validate first          │
│                         ↓                      ↓                        │
│                         Compare timestamps     Write to Firestore      │
│                         ↓                      ↓                        │
│                         Show prompt if newer   Update localStorage     │
│                                                ↓                        │
│                                                Clear draft              │
└────────────────────────────────────────────────────────────────────────┘
         │                          │                          │
         ↓                          ↓                          ↓
┌────────────────────────────────────────────────────────────────────────┐
│                          FRONTEND STATE                                 │
├────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  quizEditorModal = {                                                   │
│    isNew: boolean,                                                     │
│    moduleId: string,                                                   │
│    quiz: {                                                             │
│      id: string,                                                       │
│      title: string,                                                    │
│      questions: [                                                      │
│        {                                                               │
│          id: "q-123",           ← Unique ID                           │
│          prompt: "Question?",                                          │
│          type: "multiple-choice",                                      │
│          correctAnswer: "opt-456", ← References option ID             │
│          options: [                                                    │
│            {                                                           │
│              id: "opt-456",     ← Unique ID                           │
│              text: "Answer",                                           │
│              isCorrect: true    ← UI state                            │
│            }                                                           │
│          ]                                                             │
│        }                                                               │
│      ]                                                                 │
│    }                                                                   │
│  }                                                                     │
│                                                                         │
└────────────────────────────────────────────────────────────────────────┘
         │                          │                          │
         │ User types               │ Adds question            │ Changes answer
         ↓                          ↓                          ↓
┌────────────────────────────────────────────────────────────────────────┐
│                      AUTO-SAVE TO DRAFT                                 │
├────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  debouncedSaveDraft()                                                  │
│  ↓                                                                     │
│  Wait 1 second after user stops typing                                │
│  ↓                                                                     │
│  localStorage.setItem(                                                 │
│    `helmquest-quiz-draft-${quizId}`,                                  │
│    JSON.stringify({                                                    │
│      quiz: currentQuizState,                                           │
│      savedAt: new Date().toISOString()                                 │
│    })                                                                  │
│  )                                                                     │
│                                                                         │
│  Purpose: Recovery only, NOT permanent storage                        │
│                                                                         │
└────────────────────────────────────────────────────────────────────────┘
```

## Edit Flow Detailed

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    INSTRUCTOR CLICKS "UPDATE QUIZ"                       │
└──────────────────────────┬──────────────────────────────────────────────┘
                           ↓
                  ┌────────────────────┐
                  │ getQuizForModule() │
                  └────────┬───────────┘
                           ↓
              ┌────────────────────────────┐
              │ Load from Firestore        │
              │ GET /api/v1/quizzes/:id    │
              └────────┬───────────────────┘
                       ↓
              ┌────────────────────────────┐
              │ normalizeQuizData()        │
              │ - Add missing IDs          │
              │ - Fix references           │
              │ - Ensure structure         │
              └────────┬───────────────────┘
                       ↓
              ┌────────────────────────────┐
              │ Check for draft in         │
              │ localStorage               │
              └────────┬───────────────────┘
                       ↓
                       ├─────────── No draft found
                       │             ↓
                       │      ┌──────────────────┐
                       │      │ openQuizEditor() │
                       │      │ with Firestore   │
                       │      │ data             │
                       │      └──────────────────┘
                       │
                       └─────────── Draft found
                                    ↓
                         ┌──────────────────────────┐
                         │ Compare timestamps       │
                         │ draftTime vs firestoreTime│
                         └──────────┬───────────────┘
                                    ↓
                                    ├───── draftTime > firestoreTime
                                    │      ↓
                                    │   ┌──────────────────────┐
                                    │   │ Show restoration     │
                                    │   │ prompt modal         │
                                    │   └──────┬───────────────┘
                                    │          ↓
                                    │   ┌──────────────────────┐
                                    │   │ User chooses:        │
                                    │   │ [Restore] [Discard]  │
                                    │   └──────┬───────────────┘
                                    │          │
                                    │          ├─ Restore
                                    │          │  ↓
                                    │          │  Open with draft
                                    │          │
                                    │          └─ Discard
                                    │             ↓
                                    │             Clear draft
                                    │             Open with Firestore
                                    │
                                    └───── draftTime <= firestoreTime
                                           ↓
                                        Open with Firestore data
```

## Save Flow Detailed

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    INSTRUCTOR CLICKS "SAVE QUIZ"                         │
└──────────────────────────┬──────────────────────────────────────────────┘
                           ↓
                  ┌────────────────────┐
                  │ Check quizSaving   │
                  │ flag               │
                  └────────┬───────────┘
                           ↓
                    Already saving?
                    ↓                ↓
                   YES              NO
                    ↓                ↓
                  Return      Set quizSaving = true
                               ↓
                        ┌──────────────────┐
                        │ VALIDATION       │
                        ├──────────────────┤
                        │ ✓ Question text  │
                        │ ✓ Options count  │
                        │ ✓ Options text   │
                        │ ✓ Correct answer │
                        └────────┬─────────┘
                                 ↓
                          Validation failed?
                          ↓                ↓
                         YES              NO
                          ↓                ↓
                    Show alert      Continue to save
                    Reset flag      ↓
                    Return          ┌──────────────────────────┐
                                    │ Update quiz.updatedAt    │
                                    └────────┬─────────────────┘
                                             ↓
                                    ┌──────────────────────────┐
                                    │ SAVE TO FIRESTORE        │
                                    │ PUT /api/v1/quizzes/:id  │
                                    │                          │
                                    │ Payload:                 │
                                    │ {                        │
                                    │   title,                 │
                                    │   description,           │
                                    │   moduleId,              │
                                    │   questions: [...],      │
                                    │   updatedAt,             │
                                    │   createdBy,             │
                                    │   createdAt              │
                                    │ }                        │
                                    └────────┬─────────────────┘
                                             ↓
                                      Save successful?
                                      ↓                ↓
                                     YES              NO
                                      ↓                ↓
                          ┌──────────────────┐   ┌──────────────────┐
                          │ Update localStorage│   │ Show error alert │
                          │ cache              │   │ Keep draft       │
                          └────────┬───────────┘   │ Reset flag       │
                                   ↓                │ Return           │
                          ┌──────────────────┐   └──────────────────┘
                          │ Clear draft from  │
                          │ localStorage      │
                          └────────┬───────────┘
                                   ↓
                          ┌──────────────────┐
                          │ Close modal      │
                          └────────┬───────────┘
                                   ↓
                          ┌──────────────────┐
                          │ Show success     │
                          │ achievement      │
                          └────────┬───────────┘
                                   ↓
                          ┌──────────────────┐
                          │ Reset flag       │
                          └──────────────────┘
```

## Question Management Flow

```
┌──────────────────────────────────────────────────────────────────────────┐
│                         ADD QUESTION                                      │
└──────────────────────────┬───────────────────────────────────────────────┘
                           ↓
                  ┌────────────────────┐
                  │ createBlankQuestion()│
                  │ - Generate unique ID │
                  │ - Set default type   │
                  │ - Add 2 empty options│
                  └────────┬───────────┘
                           ↓
                  ┌────────────────────┐
                  │ Push to questions  │
                  │ array              │
                  └────────┬───────────┘
                           ↓
                  ┌────────────────────┐
                  │ Save draft to      │
                  │ localStorage       │
                  └────────────────────┘

┌──────────────────────────────────────────────────────────────────────────┐
│                         REMOVE QUESTION                                   │
└──────────────────────────┬───────────────────────────────────────────────┘
                           ↓
                  ┌────────────────────┐
                  │ Splice from array  │
                  └────────┬───────────┘
                           ↓
                  ┌────────────────────┐
                  │ Re-index remaining │
                  │ questions (order)  │
                  └────────┬───────────┘
                           ↓
                  ┌────────────────────┐
                  │ Save draft to      │
                  │ localStorage       │
                  └────────────────────┘

┌──────────────────────────────────────────────────────────────────────────┐
│                         ADD OPTION                                        │
└──────────────────────────┬───────────────────────────────────────────────┘
                           ↓
                  ┌────────────────────┐
                  │ Generate unique ID │
                  └────────┬───────────┘
                           ↓
                  ┌────────────────────┐
                  │ Create option:     │
                  │ {                  │
                  │   id: "opt-...",   │
                  │   text: "",        │
                  │   isCorrect: false │
                  │ }                  │
                  └────────┬───────────┘
                           ↓
                  ┌────────────────────┐
                  │ Push to question   │
                  │ options array      │
                  └────────┬───────────┘
                           ↓
                  ┌────────────────────┐
                  │ Save draft to      │
                  │ localStorage       │
                  └────────────────────┘

┌──────────────────────────────────────────────────────────────────────────┐
│                    SET CORRECT ANSWER                                     │
└──────────────────────────┬───────────────────────────────────────────────┘
                           ↓
                  ┌────────────────────┐
                  │ Loop through all   │
                  │ options            │
                  └────────┬───────────┘
                           ↓
                  ┌────────────────────┐
                  │ Set isCorrect:     │
                  │ - true for selected│
                  │ - false for others │
                  └────────┬───────────┘
                           ↓
                  ┌────────────────────┐
                  │ Set correctAnswer  │
                  │ to option.id       │
                  └────────┬───────────┘
                           ↓
                  ┌────────────────────┐
                  │ Save draft to      │
                  │ localStorage       │
                  └────────────────────┘
```

## Data Structure Relationships

```
┌──────────────────────────────────────────────────────────────────────────┐
│                            QUIZ DOCUMENT                                  │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│  {                                                                        │
│    id: "quiz-abc123" ←────────────────────┐                             │
│    title: "Navigation Quiz"               │                             │
│    moduleId: "m1-mission1"                │                             │
│    questions: [...] ──────┐               │                             │
│  }                         │               │                             │
└────────────────────────────┼───────────────┼─────────────────────────────┘
                             │               │
                             ↓               │
┌──────────────────────────────────────────────────────────────────────────┐
│                            QUESTIONS ARRAY                                │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│  [                                                                        │
│    {                                                                      │
│      id: "q-123" ←────────────────────┐                                 │
│      prompt: "What is a buoy?"         │                                 │
│      type: "multiple-choice"           │                                 │
│      correctAnswer: "opt-456" ─────┐   │                                 │
│      options: [...] ───────┐       │   │                                 │
│    }                        │       │   │                                 │
│  ]                          │       │   │                                 │
└─────────────────────────────┼───────┼───┼─────────────────────────────────┘
                              │       │   │
                              ↓       │   │
┌──────────────────────────────────────────────────────────────────────────┐
│                            OPTIONS ARRAY                                  │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│  [                                                                        │
│    {                                                                      │
│      id: "opt-456" ←──────────────────────┘                             │
│      text: "Navigation marker"                                           │
│      isCorrect: true                                                     │
│    },                                                                     │
│    {                                                                      │
│      id: "opt-789"                                                       │
│      text: "Fishing equipment"                                           │
│      isCorrect: false                                                    │
│    }                                                                      │
│  ]                                                                        │
│                                                                           │
└──────────────────────────────────────────────────────────────────────────┘
                              │
                              │ Referenced by correctAnswer
                              ↓
                  ┌──────────────────────────┐
                  │ Ensures stable reference │
                  │ Even if option text      │
                  │ changes, ID stays same   │
                  └──────────────────────────┘
```

## localStorage Structure

```
┌──────────────────────────────────────────────────────────────────────────┐
│              localStorage.getItem('helmquest-progress-v3')               │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│  {                                                                        │
│    quizzes: [                      ← Cache of Firestore data            │
│      {                                                                    │
│        id: "quiz-abc123",                                                │
│        title: "...",                                                     │
│        questions: [...]                                                  │
│      }                                                                    │
│    ],                                                                     │
│    quizAssignments: [              ← Links quiz to module               │
│      {                                                                    │
│        id: "assignment-xyz",                                             │
│        quizId: "quiz-abc123",                                            │
│        targetType: "module",                                             │
│        targetId: "m1-mission1"                                           │
│      }                                                                    │
│    ]                                                                      │
│  }                                                                        │
│                                                                           │
└──────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────┐
│       localStorage.getItem('helmquest-quiz-draft-quiz-abc123')          │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│  {                                                                        │
│    quiz: {                         ← Current editing state              │
│      id: "quiz-abc123",                                                  │
│      title: "...",                                                       │
│      questions: [...]              ← May have unsaved changes           │
│    },                                                                     │
│    savedAt: "2026-09-26T11:50:00Z" ← Timestamp for comparison          │
│  }                                                                        │
│                                                                           │
│  Purpose: Recovery only                                                  │
│  Cleared: After successful save                                          │
│  Used: When draft is newer than Firestore                               │
│                                                                           │
└──────────────────────────────────────────────────────────────────────────┘
```

## Key Concepts

### **1. Unique IDs Prevent Issues**
```
❌ Without IDs:
question.options[0]    ← Index-based, unstable
                          if options reorder, breaks

✅ With IDs:
question.options.find(opt => opt.id === "opt-456")
                       ↑ Stable, survives reordering
```

### **2. Draft vs Permanent**
```
Draft (localStorage):
  - Auto-saved every 1 second
  - Temporary
  - Can be discarded
  - For recovery only

Permanent (Firestore):
  - Saved on button click
  - Persists forever
  - Source of truth
  - Validated before save
```

### **3. Save Flow Benefits**
```
Single Button Save:
  ✓ User control
  ✓ Clear intent
  ✓ Validation point
  ✓ Error handling
  ✓ Success feedback

vs Auto-Save:
  ✗ Race conditions
  ✗ Too many writes
  ✗ Unclear state
  ✗ Network issues
```

---

**This architecture ensures:**
- Data integrity
- User control
- Clear data flow
- Efficient operations
- Recovery mechanisms
- Stable references
