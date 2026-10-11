# Student Management Redesign Implementation Plan

## Phase 1: Data Layer (Backend API Endpoints Needed)

### New Endpoints to Create:
1. `GET /api/v1/students/:studentId/training-summary`
   - Returns: missions completed/total, quizzes completed/total, avg scores
   
2. `GET /api/v1/students/:studentId/missions`
   - Returns: List of unique missions with best scores
   
3. `GET /api/v1/students/:studentId/quizzes`
   - Returns: List of unique quizzes with best scores

4. `GET /api/v1/students/:studentId/activity`
   - Returns: Recent training activity timeline

## Phase 2: Frontend Computed Properties

### New Computed Properties:
1. `enhancedStudentRecords` - Main table data with missions/quizzes summary
2. `selectedStudentDetails` - Detailed view data for Review modal
3. `studentMissionsDetail` - For Missions tab
4. `studentQuizzesDetail` - For Quizzes tab
5. `studentActivityLog` - For Activity tab

## Phase 3: UI Components

### Main Table (Already Exists - Update):
- Add Missions column (X/Y format)
- Add Quizzes column (X/Y format)
- Update Mission Score (summary %)
- Update Quiz Score (summary %)
- Keep Latest Activity
- Keep Review button

### Student Detail Modal (New):
- Student Profile Header
- Summary Cards
- Tabs: Overview, Missions, Quizzes, Activity
- Each tab with appropriate data display

## Implementation Strategy:
Since this is a large change, I'll implement it incrementally to avoid breaking existing functionality.
