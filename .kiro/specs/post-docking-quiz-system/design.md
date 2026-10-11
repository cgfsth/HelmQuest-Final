# Design Document: Post-Docking Quiz System

## Overview

The Post-Docking Quiz System automatically presents students with training-related quiz questions after successfully anchoring the boat during training missions. When a student deploys the anchor (via H key) and completes the docking milestone, a modal overlay appears with quiz questions specific to the training module they just completed. The system supports multiple question types (Multiple Choice, True/False, Fill in the Blank), provides immediate feedback with score and correct/incorrect breakdown, and stores results in the existing progressData structure. This feature integrates seamlessly with the existing instructor quiz management system where instructors can create and assign quizzes to specific training modules.

The system leverages the existing anchor deployment milestone detection in the animation loop (line 7348 in App.vue where `anchorMilestone === 'deployed'` is checked during training), and extends the current quiz infrastructure (progressData.quizzes, progressData.quizAssignments, progressData.quizSubmissions, progressData.quizResults) to support post-docking triggers.

## Architecture

```mermaid
graph TD
    A[Animation Loop] --> B{Anchor Deployed?}
    B -->|Yes| C{In Training?}
    C -->|Yes| D[Get Assigned Quizzes]
    D --> E{Quizzes Available?}
    E -->|Yes| F[Show Quiz Modal]
    E -->|No| G[Continue Training]
    F --> H[Student Answers]
    H --> I[Submit Quiz]
    I --> J[Calculate Score]
    J --> K[Store Submission]
    K --> L[Show Results Modal]
    L --> M[Student Closes Results]
    M --> N[Continue Training]
    
    style F fill:#4a9eff
    style L fill:#51cf66
    style J fill:#ffd43b
```

## Sequence Diagrams

### Main Flow: Anchor Deployment to Quiz Display

```mermaid
sequenceDiagram
    participant AL as Animation Loop
    participant AH as Anchor Handler
    participant TM as Training Manager
    participant QM as Quiz Manager
    participant UI as Quiz UI
    participant PD as Progress Data

    AL->>AH: updateBoatAnchorRig(delta)
    AH-->>AL: anchorMilestone='deployed'
    AL->>TM: checkIfInTraining()
    TM-->>AL: activeTrainingModule
    AL->>QM: getPostDockingQuizzes(moduleId)
    QM->>PD: query quizAssignments
    PD-->>QM: assigned quizzes
    QM-->>AL: quizzes[]
    
    alt Has quizzes
        AL->>UI: showQuizModal(quizzes[0])
        UI-->>AL: modal displayed
    else No quizzes
        AL->>TM: continueTraining()
    end
```

### Quiz Submission and Results Flow

```mermaid
sequenceDiagram
    participant ST as Student
    participant UI as Quiz UI
    participant QE as Quiz Evaluator
    participant PD as Progress Data
    participant RM as Results Modal

    ST->>UI: answerQuestion(questionId, answer)
    UI->>UI: storeAnswer(questionId, answer)
    ST->>UI: submitQuiz()
    UI->>QE: evaluateQuiz(answers, quiz)
    QE->>QE: checkAnswers()
