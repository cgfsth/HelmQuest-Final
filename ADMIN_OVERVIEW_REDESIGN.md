# Admin Overview Redesign Implementation Plan

## Summary

This document outlines the complete redesign of the Admin Portal Overview page to function as a SYSTEM-WIDE ADMIN DASHBOARD with real-time statistics from Firestore.

## Key Requirements Implemented

### 1. Top Summary Cards (4 Cards)
- **Card 1: Total Students** - Active, Pending, Inactive counts
- **Card 2: Total Instructors** - Total and Active counts
- **Card 3: Total Missions** - Total missions and completions
- **Card 4: Total Quizzes** - Total quizzes and submissions

### 2. Student Status Summary
- Visual breakdown of student statuses
- No approval buttons (belongs to instructors)

### 3. Mission Performance
- Total completions, passed, failed
- Pass rate and average score
- Only counts actual completed records

### 4. Quiz Performance
- Total submissions, passed, failed
- Pass rate and average score
- Uses actual quiz records

### 5. Mission Completion Trend (7-Day Chart)
- Line chart showing daily completions
- Based on actual `completedAt` timestamps
- No fake/hardcoded data

### 6. Student Rank Distribution
- Counts students at each rank level:
  - Ordinary Seaman (OS)
  - Able Seaman (AB)
  - Third Officer
  - Second Officer
  - Chief Officer
  - Master / Captain
- Uses current rank calculated from XP

### 7. XP Progress Summary
- Total XP earned system-wide
- Average XP per student
- Highest XP and corresponding rank

### 8. Recent System Activity Feed
- Latest 10 system events:
  - Student registered
  - Student approved
  - Mission completed/passed/failed
  - Quiz completed
  - Instructor created mission/quiz
  - Rank changes
- Real timestamps and relative time

### 9. Top Performing Students (Optional Compact)
- Top 5 students by XP
- Shows name, XP, rank
- Links to full leaderboard

## Data Fetching Strategy

All data will be fetched from Firestore collections:
- `students` collection
- `instructor` collection
- `training_modules` collection (missions)
- `mission_scores` collection
- `quizzes` collection
- `quiz_scores` collection

## Rank Calculation

Using existing `rankForXp()` function from `studentMotivation.js`:
```javascript
import { rankForXp } from '@/helpers/studentMotivation.js';

const RANK_THRESHOLDS = [
  { minXp: 3500, title: 'Master / Captain' },
  { minXp: 3000, title: 'Chief Officer' },
  { minXp: 2500, title: 'Second Officer' },
  { minXp: 2000, title: 'Third Officer' },
  { minXp: 500, title: 'Able Seaman (AB)' },
  { minXp: 0, title: 'Ordinary Seaman (OS)' }
];
```

## Implementation Status

✅ Plan created
⏳ Implementation in progress
- Need to update SystemOverview.vue component
- Need to create API endpoint or direct Firestore queries
- Need to preserve existing UI theme

## Next Steps

1. Create comprehensive data fetching function
2. Update SystemOverview.vue template with all sections
3. Add Chart.js for Mission Completion Trend
4. Test with real Firestore data
5. Verify no breaking changes to Instructor/Student portals
