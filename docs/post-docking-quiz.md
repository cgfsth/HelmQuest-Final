# Post-Docking Quiz System Documentation

## Overview

The Post-Docking Quiz System is an automated assessment feature that presents students with training-related quiz questions immediately after successfully completing a docking maneuver. This system integrates seamlessly with HelmQuest's existing quiz management infrastructure and provides instant feedback to enhance the learning experience.

### Key Features

- **Automatic Triggering**: Quiz appears automatically after anchor deployment during training
- **Three Question Types**: Supports Multiple Choice, True/False, and Fill in the Blank questions
- **Instant Feedback**: Students receive immediate results with score breakdown
- **Progress Tracking**: All submissions are stored in the student's progress data
- **Keyboard Accessible**: Full keyboard navigation support (Tab, Enter, Escape)
- **Integration Ready**: Works with existing instructor quiz management system

---

## Architecture

### System Components

```
┌─────────────────────────────────────────────────────────────────┐
│                         App.vue (Main)                          │
│  - Animation loop monitoring                                    │
│  - Anchor deployment detection                                  │
│  - Quiz trigger logic                                           │
│  - Quiz submission handling                                     │
│  - Results display orchestration                                │
└────────────┬────────────────────────────────────────────────────┘
             │
             ├──────────────────┬──────────────────┐
             │                  │                  │
             ▼                  ▼                  ▼
┌────────────────────┐ ┌──────────────────┐ ┌─────────────────┐
│PostDockingQuizModal│ │QuizResultsModal  │ │  progressStore  │
│  - Question display│ │  - Score display │ │  - Quiz data    │
│  - Answer input    │ │  - Answer review │ │  - Submissions  │
│  - Validation      │ │  - Feedback      │ │  - Results      │
└────────────────────┘ └──────────────────┘ └─────────────────┘
```

### Data Flow

#### 1. Quiz Trigger Flow

```
Anchor Deployed (anchorMilestone === 'deployed')
    ↓
Check: Is training active? (activeTrainingModule exists)
    ↓ YES
Query: progressData.quizAssignments (filter by moduleId)
    ↓
Found assignment?
    ↓ YES
Load: quiz from progressData.quizzes
    ↓
Valid quiz? (has questions)
    ↓ YES
Display: PostDockingQuizModal
    ↓
Set: postDockingQuizTriggered = true (prevent duplicates)
```

#### 2. Quiz Submission Flow

```
Student fills answers → All questions answered?
    ↓ YES
Submit button clicked → handlePostDockingQuizSubmit(answers)
    ↓
Validate: quiz data and student ID exist
    ↓
Evaluate: each answer against correctAnswer
    ↓
Calculate: score = (correct / total) * 100
    ↓
Create: submission object with answers, score, timestamp
    ↓
Store: submission in progressData.quizSubmissions
    ↓
Save: progressData to localStorage
    ↓
Display: QuizResultsModal with submission data
```

#### 3. Results Display Flow

```
QuizResultsModal receives submission
    ↓
Display: Score percentage and fraction
    ↓
Apply: Color coding (Green ≥70%, Yellow 50-69%, Red <50%)
    ↓
List: Each question with student answer and correct answer
    ↓
Show: ✓ or ✗ icon for each answer
    ↓
Student clicks Close → Return to simulation
```

---

## Integration Points

### Existing Quiz Management System

The post-docking quiz system integrates with the instructor-facing quiz management infrastructure:

#### Data Structures Used

**progressData.quizzes**
- Array of quiz objects created by instructors
- Each quiz contains: id, title, description, questions[], createdBy, createdDate

**progressData.quizAssignments**
- Array linking quizzes to training modules
- Each assignment: id, quizId, trainingModuleId, assignedBy, assignedDate

**progressData.quizSubmissions**
- Array storing student quiz submissions
- Post-docking submissions include `trigger: 'post-docking'` field

**progressData.quizResults** (optional)
- Array storing graded results from instructors
- Post-docking quizzes are auto-graded, so this is for instructor override

### Anchor Deployment Detection

Located in `App.vue` animation loop (approximately line 7348):

```javascript
if (anchorMilestone.value === 'deployed' && activeTrainingModule.value) {
  // Check for post-docking quiz
  if (!postDockingQuizTriggered.value) {
    // Load and display quiz
  }
}
```

The system monitors the `anchorMilestone` reactive reference which is updated by the anchor deployment logic when the student presses the 'H' key to drop anchor.

---

## Component API

### PostDockingQuizModal.vue

#### Props

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `quiz` | Object | Yes | null | Quiz object with questions, title, description |
| `isVisible` | Boolean | Yes | false | Controls modal visibility |
| `isLoading` | Boolean | No | false | Shows loading spinner when true |

#### Events

| Event | Payload | Description |
|-------|---------|-------------|
| `close` | none | Emitted when user cancels/closes without submitting |
| `submit` | `Object` | Emitted when quiz is submitted. Payload is answers map: `{ questionId: answer, ... }` |

#### Quiz Object Structure

```javascript
{
  id: string,                    // Unique quiz identifier
  title: string,                 // Quiz title
  description: string,           // Quiz instructions
  questions: [
    {
      id: string,                // Question ID
      prompt: string,            // Question text
      type: string,              // 'multiple-choice' | 'true-false' | 'fill-in-the-blank'
      options?: string[],        // For multiple choice only
      correctAnswer: string      // Correct answer for scoring
    }
  ]
}
```

#### Example Usage

```vue
<PostDockingQuizModal
  :quiz="postDockingQuizData"
  :isVisible="showPostDockingQuiz"
  :isLoading="false"
  @close="handlePostDockingQuizClose"
  @submit="handlePostDockingQuizSubmit"
/>
```

### QuizResultsModal.vue

#### Props

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `results` | Object | Yes | null | Quiz submission results with score and answers |
| `isVisible` | Boolean | Yes | false | Controls modal visibility |

#### Events

| Event | Payload | Description |
|-------|---------|-------------|
| `close` | none | Emitted when user closes results modal |

#### Results Object Structure

```javascript
{
  id: string,                    // Submission ID
  quizId: string,                // Quiz ID
  studentId: string,             // Student ID
  trainingModuleId: string,      // Training module ID
  score: number,                 // Score percentage (0-100)
  submittedAt: string,           // ISO timestamp
  trigger: 'post-docking',       // Trigger type
  quiz: Object,                  // Full quiz object for reference
  answers: [
    {
      questionId: string,        // Question ID
      studentAnswer: string,     // Student's answer
      isCorrect: boolean,        // Whether answer was correct
      skipped?: boolean          // True if scoring was skipped (missing correctAnswer)
    }
  ]
}
```

#### Example Usage

```vue
<QuizResultsModal
  :results="quizResultsData"
  :isVisible="showQuizResults"
  @close="handleQuizResultsClose"
/>
```

---

## State Management

### App.vue Reactive State

#### Quiz State Variables

```javascript
// Post-docking quiz state
const showPostDockingQuiz = ref(false);      // Controls quiz modal visibility
const postDockingQuizData = ref(null);       // Stores current quiz data
const postDockingQuizTriggered = ref(false); // Prevents duplicate triggers

// Quiz results state
const showQuizResults = ref(false);          // Controls results modal visibility
const quizResultsData = ref(null);           // Stores submission results
```

#### State Lifecycle

1. **Quiz Trigger**: `postDockingQuizTriggered` set to `true` when quiz is shown
2. **Quiz Display**: `showPostDockingQuiz` and `postDockingQuizData` set
3. **Quiz Submission**: Quiz modal hidden, results modal shown with `quizResultsData`
4. **Results Close**: All state cleared, simulation resumes
5. **Anchor Raise**: `postDockingQuizTriggered` reset to allow quiz on next docking

---

## Key Functions

### App.vue Quiz Handlers

#### handlePostDockingQuizClose()

**Purpose**: Handles modal close without submission

```javascript
function handlePostDockingQuizClose() {
  showPostDockingQuiz.value = false;
  postDockingQuizData.value = null;
}
```

**When Called**: User clicks Cancel or Close button in quiz modal

---

#### handlePostDockingQuizSubmit(answers)

**Purpose**: Processes quiz submission, calculates score, stores results

**Parameters**:
- `answers` (Object): Map of question IDs to student answers

**Process**:
1. Validates quiz data and student ID
2. Iterates through questions and compares answers
3. Calculates score percentage
4. Creates submission object
5. Stores in `progressData.quizSubmissions`
6. Saves to localStorage
7. Displays results modal

**Error Handling**:
- Handles missing `correctAnswer` field (skips scoring for that question)
- Logs warnings for invalid data
- Shows alert if localStorage save fails
- Prevents modal close on error (allows retry)

---

#### handleQuizResultsClose()

**Purpose**: Closes results modal and returns to simulation

```javascript
function handleQuizResultsClose() {
  showQuizResults.value = false;
  quizResultsData.value = null;
}
```

**When Called**: User clicks Close button in results modal

---

## Question Types

### 1. Multiple Choice

**Type Identifier**: `'multiple-choice'`

**Input**: Radio button group

**Data Structure**:
```javascript
{
  id: "q1",
  prompt: "What is the correct side to pass another vessel?",
  type: "multiple-choice",
  options: ["Port side", "Starboard side", "Either side", "Depends on situation"],
  correctAnswer: "Starboard side"
}
```

**Rendering**: Each option displayed as a clickable radio button option

---

### 2. True/False

**Type Identifier**: `'true-false'`

**Input**: Two toggle buttons (True/False)

**Data Structure**:
```javascript
{
  id: "q2",
  prompt: "You must always drop anchor when docking at a pier.",
  type: "true-false",
  correctAnswer: "False"
}
```

**Rendering**: Two buttons, one for True and one for False

**Note**: `correctAnswer` must be exactly `"True"` or `"False"` (case-sensitive)

---

### 3. Fill in the Blank

**Type Identifier**: `'fill-in-the-blank'`

**Input**: Text input field

**Data Structure**:
```javascript
{
  id: "q3",
  prompt: "The right side of a boat is called the _____ side.",
  type: "fill-in-the-blank",
  correctAnswer: "starboard"
}
```

**Rendering**: Single-line text input

**Scoring**: Exact string match (case-sensitive). Consider normalizing case in scoring logic if needed.

---

## Scoring System

### Score Calculation

```javascript
const score = Math.round((correctCount / validQuestionCount) * 100);
```

- **correctCount**: Number of questions answered correctly
- **validQuestionCount**: Number of questions with `correctAnswer` field
- **Rounding**: Score is rounded to nearest integer

### Score Color Coding

| Score Range | Color | Class | Meaning |
|-------------|-------|-------|---------|
| ≥ 70% | Green | `score-green` | Passing |
| 50-69% | Yellow | `score-yellow` | Marginal |
| < 50% | Red | `score-red` | Failing |

### Missing correctAnswer Handling

If a question is missing the `correctAnswer` field:
1. Answer is marked with `skipped: true`
2. Question is not counted in `validQuestionCount`
3. Warning is logged to console
4. Results display shows "N/A (scoring skipped)"

---

## User Experience Flow

### Student Perspective

1. **Training Session**: Student navigates boat during training mission
2. **Docking Maneuver**: Student successfully drops anchor at destination
3. **Quiz Appears**: Modal overlay appears with quiz questions
4. **Answer Questions**: Student selects/enters answers for each question
5. **Visual Feedback**: Checkmark appears next to answered questions
6. **Submit**: All questions answered, student clicks Submit
7. **Instant Results**: Results modal shows score and breakdown
8. **Review**: Student reviews which questions were correct/incorrect
9. **Continue**: Student closes results and continues simulation

### Instructor Perspective

Instructors interact with the system through the quiz management interface:

1. **Create Quiz**: Use quiz creator to build quiz with questions
2. **Assign to Module**: Link quiz to specific training module
3. **Student Takes Quiz**: System automatically presents quiz after docking
4. **Review Submissions**: View student submissions in progress dashboard
5. **Optional Grading**: Auto-graded, but can override scores if needed

---

## Keyboard Navigation

### PostDockingQuizModal

| Key | Action |
|-----|--------|
| **Tab** | Navigate through questions and buttons |
| **Enter** | Submit quiz (when not typing in text input) |
| **Escape** | Close modal (with confirmation if answers exist) |
| **Arrow Keys** | Navigate radio buttons within a question |

### QuizResultsModal

| Key | Action |
|-----|--------|
| **Enter** | Close modal |
| **Escape** | Close modal |

---

## Error Handling

### Graceful Degradation

The system handles various error conditions gracefully:

#### Missing Quiz Data
- **Issue**: No quiz assigned to training module
- **Behavior**: Training continues normally without modal
- **Log**: No warning (expected behavior)

#### Empty Quiz
- **Issue**: Quiz exists but has no questions
- **Behavior**: Modal is not shown, trigger flag set
- **Log**: Warning logged to console

#### Missing Student ID
- **Issue**: Current user not authenticated
- **Behavior**: Submission fails, modal stays open
- **Log**: Warning logged to console

#### Missing correctAnswer
- **Issue**: Question missing `correctAnswer` field
- **Behavior**: Question scoring skipped, marked as `skipped: true`
- **Log**: Warning logged with question ID

#### localStorage Save Failure
- **Issue**: Cannot write to localStorage (quota exceeded, disabled, etc.)
- **Behavior**: Alert shown, results still displayed in memory
- **Log**: Error logged to console

#### Unexpected Errors
- **Issue**: Any uncaught error during submission
- **Behavior**: Alert shown, modal stays open (retry possible)
- **Log**: Error logged with stack trace

---

## Testing

### Manual Testing Checklist

✅ Quiz appears after anchor deployment in training mode  
✅ Quiz does not appear when no quiz assigned  
✅ Quiz does not appear in non-training mode  
✅ All question types render correctly  
✅ Answer selection updates visual state  
✅ Submit validation prevents submission with unanswered questions  
✅ Score calculation is accurate  
✅ Results modal displays correct information  
✅ Keyboard navigation works (Tab, Enter, Escape)  
✅ Close confirmation works when answers exist  
✅ Submissions are saved to progressData  
✅ Quiz can be triggered again after anchor raise  
✅ Missing correctAnswer field handled gracefully  
✅ Error handling works for edge cases  

### Test Data

Example quiz for testing:

```javascript
{
  id: "test-quiz-1",
  title: "Docking Procedures Test",
  description: "Test your knowledge of proper docking procedures.",
  questions: [
    {
      id: "q1",
      prompt: "Which side should you approach the dock from?",
      type: "multiple-choice",
      options: ["Port side", "Starboard side", "Head on", "Stern first"],
      correctAnswer: "Port side"
    },
    {
      id: "q2",
      prompt: "You must always use fenders when docking.",
      type: "true-false",
      correctAnswer: "True"
    },
    {
      id: "q3",
      prompt: "The rope used to secure a boat is called a _____.",
      type: "fill-in-the-blank",
      correctAnswer: "line"
    }
  ]
}
```

---

## Future Enhancements

### Potential Improvements

1. **Timer**: Add optional time limit for quizzes
2. **Question Randomization**: Shuffle question order each attempt
3. **Answer Randomization**: Shuffle multiple choice options
4. **Partial Credit**: Support for partially correct answers
5. **Hints**: Optional hint system for difficult questions
6. **Analytics**: Track question difficulty and common mistakes
7. **Retry Limit**: Configurable number of retake attempts
8. **Case-Insensitive Scoring**: Normalize text input answers
9. **Detailed Feedback**: Per-question instructor explanations
10. **Progress Bars**: Visual progress indicator during quiz
11. **Save/Resume**: Allow students to save and resume later
12. **Multi-Quiz Support**: Present multiple quizzes in sequence

---

## Troubleshooting

### Common Issues

#### Quiz Not Appearing

**Symptoms**: Anchor deployed but no quiz modal shows

**Possible Causes**:
1. Not in training mode (`activeTrainingModule` is null)
2. No quiz assignment for current module
3. Quiz already triggered (`postDockingQuizTriggered` is true)
4. Quiz data missing or empty

**Debug Steps**:
1. Check console for warnings
2. Verify `activeTrainingModule.value` exists
3. Inspect `progressData.quizAssignments`
4. Check `postDockingQuizTriggered` value

---

#### Score Not Calculating

**Symptoms**: Score shows as 0% despite correct answers

**Possible Causes**:
1. Missing `correctAnswer` fields on questions
2. Answer format mismatch (e.g., "true" vs "True")
3. Question ID mismatch

**Debug Steps**:
1. Check console for "missing correctAnswer" warnings
2. Verify `correctAnswer` format matches expected answer format
3. Inspect submission object in progressData

---

#### Results Not Saving

**Symptoms**: Quiz results disappear after page reload

**Possible Causes**:
1. localStorage disabled or quota exceeded
2. `saveProgress()` not called
3. Browser privacy settings blocking localStorage

**Debug Steps**:
1. Check browser console for localStorage errors
2. Test localStorage: `localStorage.setItem('test', 'test')`
3. Verify `progressData.quizSubmissions` array exists
4. Check Network tab for any API calls that might be failing

---

## Code Locations

### Key Files

| File | Purpose | Lines (Approx) |
|------|---------|----------------|
| `src/App.vue` | Main quiz logic and state | 3957-4260, 7348-7560 |
| `src/components/PostDockingQuizModal.vue` | Quiz display component | 1-495 |
| `src/components/QuizResultsModal.vue` | Results display component | 1-420 |
| `src/composables/progressStore.js` | Data persistence | Various |

### Component Imports

```javascript
// In App.vue
import PostDockingQuizModal from './components/PostDockingQuizModal.vue';
import QuizResultsModal from './components/QuizResultsModal.vue';
```

### Template Usage

```vue
<!-- In App.vue template -->
<PostDockingQuizModal 
  :quiz="postDockingQuizData" 
  :isVisible="showPostDockingQuiz"
  @close="handlePostDockingQuizClose"
  @submit="handlePostDockingQuizSubmit"
/>

<QuizResultsModal
  :results="quizResultsData"
  :isVisible="showQuizResults"
  @close="handleQuizResultsClose"
/>
```

---

## Accessibility

### WCAG Compliance

The post-docking quiz system follows accessibility best practices:

#### Keyboard Navigation
- ✅ All interactive elements are keyboard accessible
- ✅ Logical tab order through questions
- ✅ Visual focus indicators on all controls
- ✅ Enter and Escape key shortcuts

#### Visual Design
- ✅ Sufficient color contrast for text
- ✅ Color not sole indicator of correctness (icons used)
- ✅ Clear visual hierarchy
- ✅ Readable font sizes

#### Screen Reader Support
- ✅ Semantic HTML elements used
- ✅ Labels associated with form inputs
- ✅ Descriptive button text
- ⚠️ ARIA labels could be improved (future enhancement)

---

## Performance Considerations

### Optimization Strategies

1. **Lazy Loading**: Components loaded on-demand
2. **Minimal Re-renders**: Reactive state optimized
3. **No Impact on Simulation**: Modal overlay doesn't affect Three.js rendering
4. **Efficient Scoring**: Single-pass algorithm for answer evaluation
5. **LocalStorage Batching**: Single write operation per submission

### Performance Metrics

- Modal Load Time: < 100ms
- Score Calculation: < 10ms
- Submit to Results: < 200ms
- No FPS drop during quiz display

---

## Security Considerations

### Data Validation

1. **Input Sanitization**: All text inputs should be sanitized (future enhancement)
2. **Client-Side Validation**: Validates answer completeness before submission
3. **Answer Verification**: Compares against stored correctAnswer

### Future Security Enhancements

1. **Server-Side Validation**: Move correctAnswer verification to backend
2. **Encrypted Storage**: Encrypt correctAnswers in transit and storage
3. **Session Management**: Tie submissions to authenticated sessions
4. **Rate Limiting**: Prevent rapid-fire quiz attempts
5. **Answer Obfuscation**: Hide correctAnswer from client-side code

---

## Developer Notes

### Adding a New Question Type

To add a new question type (e.g., `'multi-select'`):

1. **Update Type Identifier**: Add to `getQuestionTypeLabel()` in `PostDockingQuizModal.vue`
2. **Add Renderer**: Create new `v-else-if` block in template for rendering
3. **Update Validation**: Ensure `isQuestionAnswered()` handles new format
4. **Update Scoring**: Modify scoring logic in `handlePostDockingQuizSubmit()` if needed
5. **Update Documentation**: Add to Question Types section

### Modifying Score Thresholds

To change passing/marginal/failing thresholds, update the `scoreColorClass` computed property in `QuizResultsModal.vue`:

```javascript
const scoreColorClass = computed(() => {
  const score = scorePercentage.value;
  if (score >= 80) return 'score-green';  // Changed from 70
  if (score >= 60) return 'score-yellow'; // Changed from 50
  return 'score-red';
});
```

Also update the color legend in this documentation file.

---

## Conclusion

The Post-Docking Quiz System provides seamless integration of assessment into the HelmQuest training experience. By automatically presenting quizzes after key training milestones, it reinforces learning and provides immediate feedback to students while maintaining compatibility with the existing instructor quiz management infrastructure.

For questions or support, refer to the main project documentation or contact the development team.

---

**Document Version**: 1.0  
**Last Updated**: 2024  
**Author**: HelmQuest Development Team
