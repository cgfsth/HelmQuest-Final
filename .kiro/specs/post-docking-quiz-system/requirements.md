# Requirements: Post-Docking Quiz System

## Functional Requirements

### FR1: Quiz Trigger on Anchor Deployment
**Priority:** High  
**Description:** When a student successfully drops anchor during a training mission (anchorMilestone === 'deployed'), the system shall automatically check for assigned quizzes and display them if available.

**Acceptance Criteria:**
- Quiz modal appears immediately after anchor is deployed in training mode
- System checks progressData.quizAssignments for quizzes linked to current training module
- If no quiz is assigned, training continues normally without modal
- Only triggers once per docking (not on anchor raise/re-deploy)

### FR2: Quiz Modal Display
**Priority:** High  
**Description:** Display all quiz questions in a single modal overlay with a clear, accessible interface.

**Acceptance Criteria:**
- Modal shows quiz title and instructions
- All questions displayed in scrollable container
- Each question shows:
  - Question number and text
  - Question type indicator (Multiple Choice, True/False, Fill in Blank)
  - Answer input appropriate to question type (radio buttons, true/false buttons, text input)
- Submit button visible at bottom
- Close/cancel button available
- Modal prevents interaction with simulation behind it

### FR3: Answer Input Handling
**Priority:** High  
**Description:** Support three question types with appropriate input controls.

**Acceptance Criteria:**
- **Multiple Choice:** Radio button group with all options
- **True/False:** Two button toggle (True/False)
- **Fill in the Blank:** Text input field
- Answers stored in temporary state before submission
- Visual indication of answered vs unanswered questions

### FR4: Quiz Submission and Scoring
**Priority:** High  
**Description:** Evaluate student answers, calculate score, and provide immediate feedback.

**Acceptance Criteria:**
- Validate all questions are answered before allowing submission
- Compare student answers to correct answers from quiz data
- Calculate score as (correct answers / total questions) * 100
- Track which questions were correct/incorrect
- Store submission in progressData.quizSubmissions with:
  - studentId
  - quizId
  - trainingModuleId
  - answers array
  - score
  - timestamp

### FR5: Results Display
**Priority:** High  
**Description:** Show quiz results in a results modal with score breakdown.

**Acceptance Criteria:**
- Display overall score as percentage and fraction (e.g., "80% - 4/5 correct")
- Show color-coded result:
  - Green for passing (≥70%)
  - Yellow for marginal (50-69%)
  - Red for failing (<50%)
- List each question with:
  - Question text
  - Student's answer
  - Correct answer
  - Checkmark (✓) or X (✗) icon
- "Close" button to dismiss and return to simulation

### FR6: Progress Data Integration
**Priority:** Medium  
**Description:** Integrate with existing quiz management infrastructure.

**Acceptance Criteria:**
- Read quiz data from progressData.quizzes
- Read assignments from progressData.quizAssignments filtered by moduleId
- Write submissions to progressData.quizSubmissions
- Update progressData.quizResults if it exists
- Maintain data structure compatibility with instructor quiz management system

## Non-Functional Requirements

### NFR1: Performance
- Quiz modal shall load within 500ms
- No impact on simulation performance when modal is open
- Smooth animations for modal open/close

### NFR2: Usability
- Modal shall be keyboard accessible (Tab navigation, Enter to submit)
- Clear visual hierarchy and readable text
- Responsive to different screen sizes
- Consistent with existing HelmQuest UI styling (blue theme)

### NFR3: Reliability
- Handle missing quiz data gracefully (continue without quiz)
- Prevent duplicate quiz submissions for same docking event
- Persist quiz results even if page is closed before viewing results

## Data Structures

### Quiz Assignment (existing)
```javascript
{
  id: string,
  quizId: string,
  trainingModuleId: string,
  assignedBy: string,
  assignedDate: timestamp
}
```

### Quiz (existing)
```javascript
{
  id: string,
  title: string,
  description: string,
  questions: [
    {
      id: string,
      text: string,
      type: 'multiple-choice' | 'true-false' | 'fill-in-blank',
      options: string[], // for multiple choice
      correctAnswer: string
    }
  ],
  createdBy: string,
  createdDate: timestamp
}
```

### Quiz Submission (existing/enhanced)
```javascript
{
  id: string,
  studentId: string,
  quizId: string,
  trainingModuleId: string,
  answers: [
    {
      questionId: string,
      studentAnswer: string,
      isCorrect: boolean
    }
  ],
  score: number, // 0-100
  submittedAt: timestamp,
  trigger: 'post-docking' // new field
}
```

## Dependencies

- **Existing Systems:**
  - progressStore.js (quiz data storage)
  - App.vue anchor deployment milestone detection (line ~7348)
  - Existing instructor quiz management system

- **UI Dependencies:**
  - Modal component pattern (reference: InventoryModal.vue)
  - HelmQuest blue theme styling
  - Vue 3 reactive state management
