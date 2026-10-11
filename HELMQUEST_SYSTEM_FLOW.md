# HelmQuest Maritime Training System - Complete System Flow

## 📋 System Overview

**HelmQuest** is a web-based maritime navigation training simulator for fisheries students, featuring mission-based learning, quizzes, gamification, and instructor management tools.

---

## 👥 User Roles & Access Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    HELMQUEST LANDING PAGE                    │
│                    http://localhost:5174                     │
└─────────────────────────────────────────────────────────────┘
                              │
                ┌─────────────┴─────────────┐
                │                           │
         ┌──────▼──────┐           ┌───────▼────────┐
         │   STUDENT   │           │   INSTRUCTOR   │
         │    LOGIN    │           │     LOGIN      │
         └──────┬──────┘           └───────┬────────┘
                │                           │
                │                           │
    ┌───────────▼───────────┐   ┌──────────▼──────────┐
    │  STUDENT DASHBOARD    │   │ INSTRUCTOR CONSOLE  │
    │  - Free Roam          │   │  - Overview         │
    │  - My Training        │   │  - Missions         │
    │  - Missions           │   │  - Students         │
    │  - Leaderboards       │   │  - Quizzes          │
    │  - Certificates       │   │  - Leaderboards     │
    └───────────────────────┘   └─────────────────────┘
```

---

## 🔐 Authentication Flow

### Student Registration & Login

```
START: Student wants to join
    │
    ▼
┌─────────────────────────┐
│  Click "Student Login"  │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│  Sign Up (if new)       │
│  - Student ID           │
│  - Name                 │
│  - Email (@dnsc.edu.ph) │
│  - Password             │
│  - Select Instructor    │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│  Account Created        │
│  Status: PENDING        │
│  (Wait for approval)    │
└───────────┬─────────────┘
            │
            ▼
    Instructor Approves
            │
            ▼
┌─────────────────────────┐
│  Status: ACTIVE         │
│  Can now login          │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│  Login with credentials │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│  Student Dashboard      │
└─────────────────────────┘
```

### Instructor Login

```
START: Instructor wants to login
    │
    ▼
┌──────────────────────────┐
│ Click "Instructor Login" │
└───────────┬──────────────┘
            │
            ▼
┌──────────────────────────┐
│ Enter credentials:       │
│ - Email (@helmquest)     │
│ - Password               │
└───────────┬──────────────┘
            │
            ▼
┌──────────────────────────┐
│ System validates role    │
└───────────┬──────────────┘
            │
            ▼
┌──────────────────────────┐
│ Instructor Console       │
└──────────────────────────┘
```

---

## 🎮 Student Training Flow

### Main Training Journey

```
┌─────────────────────────────────────────────────────────────┐
│                    STUDENT DASHBOARD                         │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  1. FREE ROAM MODE (Practice)                                │
│     - Navigate freely in 3D ocean                            │
│     - Learn controls                                         │
│     - No scoring                                             │
│                                                               │
│  2. MY TRAINING (Mission Hub)                                │
│     - View available missions                                │
│     - Check progress                                         │
│     - See XP and rank                                        │
│                                                               │
│  3. START MISSION                                            │
│     │                                                         │
│     ▼                                                         │
│  ┌──────────────────────┐                                    │
│  │  Mission Briefing    │                                    │
│  │  - Objectives        │                                    │
│  │  - Checkpoints       │                                    │
│  │  - Requirements      │                                    │
│  └──────────┬───────────┘                                    │
│             │                                                 │
│             ▼                                                 │
│  ┌──────────────────────┐                                    │
│  │  3D Navigation       │                                    │
│  │  - Sail boat         │                                    │
│  │  - Follow waypoints  │                                    │
│  │  - Press Q to scan   │                                    │
│  │  - Avoid obstacles   │                                    │
│  └──────────┬───────────┘                                    │
│             │                                                 │
│             ▼                                                 │
│  ┌──────────────────────┐                                    │
│  │  Performance Tracked │                                    │
│  │  - Steering Precision│                                    │
│  │  - Course Accuracy   │                                    │
│  │  - Collision Count   │                                    │
│  │  - Time Efficiency   │                                    │
│  └──────────┬───────────┘                                    │
│             │                                                 │
│             ▼                                                 │
│  ┌──────────────────────┐                                    │
│  │  Mission Complete    │                                    │
│  │  - Score calculated  │                                    │
│  │  - XP awarded        │                                    │
│  │  - Rank updated      │                                    │
│  └──────────┬───────────┘                                    │
│             │                                                 │
│             ▼                                                 │
│  ┌──────────────────────┐                                    │
│  │  Take Quiz           │ (if available)                     │
│  │  - Multiple choice   │                                    │
│  │  - Score saved       │                                    │
│  └──────────────────────┘                                    │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

### Mission Execution Details

```
START MISSION
    │
    ▼
┌─────────────────────────┐
│  Load 3D Environment    │
│  - Ocean scene          │
│  - Boat model           │
│  - Waypoint markers     │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│  Display HUD            │
│  - Speed (knots)        │
│  - Heading (degrees)    │
│  - Mission steps        │
│  - Timer                │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│  Navigate to Waypoint 1 │
│  - Green marker visible │
│  - Distance shown       │
└───────────┬─────────────┘
            │
            ▼
    Enter waypoint zone
            │
            ▼
┌─────────────────────────┐
│  Press Q to interact    │
│  - Buoy scanned         │
│  - Marker disappears    │
│  - Step completed ✓     │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│  Navigate to Waypoint 2 │
│  (Repeat for all)       │
└───────────┬─────────────┘
            │
            ▼
    All waypoints done
            │
            ▼
┌─────────────────────────┐
│  Calculate Final Score  │
│  - Steering: 92%        │
│  - Course: 88%          │
│  - Collisions: 0        │
│  - Time: Good           │
│  TOTAL: 87%             │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│  Award XP & Update Rank │
│  +100 XP earned         │
│  Rank: Deck Hand        │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│  Save to Firestore      │
│  - mission_scores       │
│  - students (update XP) │
└─────────────────────────┘
```

---

## 📝 Quiz Flow

### Student Taking Quiz

```
Mission Completed
    │
    ▼
┌─────────────────────────┐
│  "Take Quiz" button     │
│  appears (if available) │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│  Click "Take Quiz"      │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│  Load Quiz from DB      │
│  - Quiz title           │
│  - Questions[]          │
│  - Options[]            │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│  Display Questions      │
│  - Radio buttons        │
│  - One at a time        │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│  Student answers all    │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│  Submit Quiz            │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│  Calculate Score        │
│  - Compare with correct │
│  - Percentage computed  │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│  Save to Firestore      │
│  - quiz_scores          │
│  - studentId            │
│  - quizId               │
│  - score                │
│  - passed (≥70%)        │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│  Show Results           │
│  "Score: 85% - Passed!" │
└─────────────────────────┘
```

---

## 👨‍🏫 Instructor Management Flow

### Overview Tab

```
Instructor logs in
    │
    ▼
┌─────────────────────────────────────┐
│  DASHBOARD OVERVIEW                 │
│                                     │
│  ┌───────────────────────────────┐ │
│  │  Statistics Cards             │ │
│  │  - Total Students: 25         │ │
│  │  - Active Students: 18        │ │
│  │  - Missions Completed: 89     │ │
│  │  - Average Class Score: 82%   │ │
│  └───────────────────────────────┘ │
│                                     │
│  ┌───────────────────────────────┐ │
│  │  Mission Completion Progress  │ │
│  │  - Overall progress bar       │ │
│  │  - Per-mission breakdown      │ │
│  └───────────────────────────────┘ │
│                                     │
│  ┌───────────────────────────────┐ │
│  │  Top Performing Students      │ │
│  │  - Leaderboard (top 5)        │ │
│  └───────────────────────────────┘ │
└─────────────────────────────────────┘
```

### Mission Management

```
Click "Missions" tab
    │
    ▼
┌─────────────────────────────────────┐
│  MISSION MANAGEMENT                 │
│                                     │
│  [+ Create New Mission]             │
│                                     │
│  Global Settings:                   │
│  ☑ Unlock levels in order           │
│  ☑ Auto-award badges                │
│                                     │
│  Mission Cards:                     │
│  ┌─────────────────────────────┐   │
│  │  Mission 1: Basic Nav       │   │
│  │  Category: Module 1         │   │
│  │  Difficulty: Beginner       │   │
│  │  Duration: 15 mins          │   │
│  │  XP Reward: +100            │   │
│  │                             │   │
│  │  ⚙️ Instructor Controls:    │   │
│  │  ☐ Lock (hide from students)│   │
│  │  ☑ Allow retakes            │   │
│  │  Open Date: [date picker]   │   │
│  │  Deadline: [date picker]    │   │
│  │                             │   │
│  │  [✏️ Edit] [📝 Create Quiz] │   │
│  │  [🗑️ Delete]                │   │
│  └─────────────────────────────┘   │
└─────────────────────────────────────┘
```

### Student Management (NEW Enhanced)

```
Click "Students" tab
    │
    ▼
┌──────────────────────────────────────────────────────────────┐
│  STUDENT MANAGEMENT                           [📥 Export CSV] │
├──────────────────────────────────────────────────────────────┤
│                                                               │
│  TABLE VIEW:                                                  │
│  ┌──────┬──────┬─────────┬─────────┬──────┬──────┬────────┐ │
│  │ ID   │ Name │ Missions│ Quizzes │ M%   │ Q%   │ Action │ │
│  ├──────┼──────┼─────────┼─────────┼──────┼──────┼────────┤ │
│  │ 0334 │ Kevin│  4/6    │  3/5    │ 84%  │ 80%  │Review  │ │
│  │ 0335 │ Kath │  2/6    │  1/5    │ 76%  │ 72%  │Review  │ │
│  └──────┴──────┴─────────┴─────────┴──────┴──────┴────────┘ │
│                                                               │
│  KEY FEATURES:                                                │
│  ✓ X/Y format (completed/total)                              │
│  ✓ NO attempt counts                                         │
│  ✓ Summary scores only                                       │
│  ✓ Click Review for details                                  │
└──────────────────────────────────────────────────────────────┘
```

### Student Detail Modal (NEW)

```
Click "Review" button
    │
    ▼
┌──────────────────────────────────────────────────────────────┐
│  ← Back to Students                                        ✕ │
│  STUDENT TRAINING RECORD                                      │
├──────────────────────────────────────────────────────────────┤
│  Kevin Caidic                                                 │
│  Student ID: DNSC2026-00334                                   │
│  Status: Active                                               │
├──────────────────────────────────────────────────────────────┤
│  ┌──────────┬──────────┬──────────────┬────────────┐        │
│  │ Missions │ Quizzes  │ Mission Score│ Quiz Score │        │
│  │   4/6    │   3/5    │     84%      │    80%     │        │
│  └──────────┴──────────┴──────────────┴────────────┘        │
├──────────────────────────────────────────────────────────────┤
│  [ Overview ]  [ Missions ]  [ Quizzes ]                      │
├──────────────────────────────────────────────────────────────┤
│                                                               │
│  OVERVIEW TAB:                                                │
│  - Mission Performance: 84%                                   │
│  - Quiz Performance: 80%                                      │
│  - Progress bars                                              │
│                                                               │
│  MISSIONS TAB:                                                │
│  ┌────────────────┬───────┬───────────┐                      │
│  │ Mission        │ Score │ Status    │                      │
│  ├────────────────┼───────┼───────────┤                      │
│  │ Basic Nav      │  92%  │ Completed │                      │
│  │ Port Approach  │  78%  │ Completed │                      │
│  │ Emergency Nav  │   —   │ Not Start │                      │
│  └────────────────┴───────┴───────────┘                      │
│                                                               │
│  QUIZZES TAB:                                                 │
│  ┌────────────────┬───────┬────────┐                         │
│  │ Quiz           │ Score │ Status │                         │
│  ├────────────────┼───────┼────────┤                         │
│  │ Nav Safety     │  90%  │ Passed │                         │
│  │ COLREGS        │  85%  │ Passed │                         │
│  │ Ship Handling  │   —   │ Not St │                         │
│  └────────────────┴───────┴────────┘                         │
└──────────────────────────────────────────────────────────────┘
```

### Quiz Creation Flow

```
Click "Create Quiz" on a mission
    │
    ▼
┌─────────────────────────┐
│  Quiz Editor Modal      │
│                         │
│  Quiz Title: [____]     │
│  Module: [selected]     │
│                         │
│  Questions:             │
│  ┌───────────────────┐ │
│  │ Q1: [text]        │ │
│  │ A: [option]       │ │
│  │ B: [option] ✓     │ │
│  │ C: [option]       │ │
│  │ [+ Add Option]    │ │
│  │ [Remove Q]        │ │
│  └───────────────────┘ │
│                         │
│  [+ Add Question]       │
│  [💾 Save Quiz]         │
└─────────────────────────┘
            │
            ▼
┌─────────────────────────┐
│  Save to Firestore      │
│  - quizzes collection   │
│  - questions array      │
│  - correctAnswers array │
└─────────────────────────┘
```

---

## 🎖️ Gamification & Progression Flow

### XP & Ranking System

```
Student completes mission
    │
    ▼
┌─────────────────────────┐
│  Award XP                │
│  - Based on mission XP   │
│  - Mission 1: +100 XP    │
│  - Mission 2: +150 XP    │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│  Calculate Total XP      │
│  - Sum all earned XP     │
│  - Current: 250 XP       │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│  Determine Rank          │
│  XP Thresholds:          │
│  0-99: Deck Hand         │
│  100-299: Able Seaman    │
│  300-599: Bosun          │
│  600-999: Third Mate     │
│  1000-1999: Second Mate  │
│  2000-4999: Chief Mate   │
│  5000-9999: Captain      │
│  10000+: Master/Captain  │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│  Update Student Record   │
│  - students.xp = 250     │
│  - students.rank = "..."│
│  - students.rankId = 2   │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│  Notify if rank up       │
│  "Promoted to Bosun!"    │
└─────────────────────────┘
```

### Leaderboard Updates

```
Any XP change
    │
    ▼
┌─────────────────────────┐
│  Recalculate Rankings   │
│  - Sort by XP (desc)    │
│  - Tiebreaker: avgScore │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│  Update Leaderboards    │
│  - My Class (filtered)  │
│  - Global (all students)│
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│  Display Rankings       │
│  1. 🥇 Top student      │
│  2. 🥈 Second            │
│  3. 🥉 Third             │
│  4. [User position]      │
└─────────────────────────┘
```

---

## 💾 Database Architecture Flow

### Firestore Collections

```
┌──────────────────────────────────────────────────────────┐
│                    FIRESTORE DATABASE                     │
├──────────────────────────────────────────────────────────┤
│                                                           │
│  📦 students                                              │
│    - id (auto)                                            │
│    - studentId (DNSC2026-00334)                           │
│    - name                                                 │
│    - email                                                │
│    - password (hashed)                                    │
│    - instructorid                                         │
│    - status (pending/active/rejected)                     │
│    - xp                                                   │
│    - rank                                                 │
│    - rankId                                               │
│                                                           │
│  📦 instructors                                           │
│    - id (auto)                                            │
│    - name                                                 │
│    - email                                                │
│    - password (hashed)                                    │
│    - status (active/inactive)                             │
│                                                           │
│  📦 training_modules (missions)                           │
│    - id (m1-mission1)                                     │
│    - title                                                │
│    - category                                             │
│    - difficulty                                           │
│    - duration                                             │
│    - xpReward                                             │
│    - missionSteps[]                                       │
│    - buoyCheckpoints[]                                    │
│                                                           │
│  📦 mission_scores                                        │
│    - id (auto)                                            │
│    - studentId                                            │
│    - missionId                                            │
│    - score                                                │
│    - passed (boolean)                                     │
│    - steeringPrecision                                    │
│    - courseAccuracy                                       │
│    - collisionCount                                       │
│    - timeEfficiency                                       │
│    - completedAt                                          │
│                                                           │
│  📦 quizzes                                               │
│    - id (auto)                                            │
│    - title                                                │
│    - moduleId                                             │
│    - questions[]                                          │
│      - question                                           │
│      - options[]                                          │
│      - correctAnswer                                      │
│                                                           │
│  📦 quiz_scores                                           │
│    - id (auto)                                            │
│    - studentId                                            │
│    - quizId                                               │
│    - score                                                │
│    - passed (≥70%)                                        │
│    - submittedAt                                          │
│                                                           │
└──────────────────────────────────────────────────────────┘
```

### Data Flow Example: Mission Completion

```
1. STUDENT COMPLETES MISSION
   Frontend (App.vue)
   └─► openMissionCompleteModal()
       └─► Collect performance data

2. CALCULATE SCORES
   performanceManager.js
   └─► Generate performance report
       - Steering: 92%
       - Course: 88%
       - Collisions: 0
       - Time: Good
       └─► Final Score: 87%

3. SAVE TO DATABASE
   POST /api/v1/mission-scores
   └─► Backend (mission_scores.js)
       └─► Save to Firestore
           └─► mission_scores collection
               {
                 studentId: "student123",
                 missionId: "m1-mission1",
                 score: 87,
                 passed: true,
                 completedAt: "2026-09-27T08:43:00Z"
               }

4. AWARD XP & UPDATE RANK
   Backend checks if XP already awarded
   └─► If not, award XP
       └─► Calculate new total XP
           └─► Determine new rank
               └─► Update students collection
                   {
                     xp: 250,
                     rank: "Able Seaman",
                     rankId: 2
                   }

5. UPDATE FRONTEND
   Response sent back
   └─► Show mission complete modal
       └─► Display:
           - Score: 87%
           - XP Earned: +100
           - New Rank (if promoted)
       └─► Refresh student data
           └─► Update leaderboards
```

---

## 🔄 Real-time Updates Flow

### Student Progress Sync

```
┌─────────────────────────────────────────────────────────┐
│  STUDENT ACTION                                          │
└───────────────┬─────────────────────────────────────────┘
                │
                ▼
┌─────────────────────────────────────────────────────────┐
│  Frontend State Update                                   │
│  - Local state changes                                   │
│  - UI updates immediately                                │
└───────────────┬─────────────────────────────────────────┘
                │
                ▼
┌─────────────────────────────────────────────────────────┐
│  API Call to Backend                                     │
│  POST /api/v1/mission-scores                             │
│  POST /api/v1/quiz-scores                                │
└───────────────┬─────────────────────────────────────────┘
                │
                ▼
┌─────────────────────────────────────────────────────────┐
│  Firestore Write                                         │
│  - Save to collection                                    │
│  - Trigger any cloud functions                           │
└───────────────┬─────────────────────────────────────────┘
                │
                ▼
┌─────────────────────────────────────────────────────────┐
│  Response to Frontend                                    │
│  - Success confirmation                                  │
│  - Updated data                                          │
└───────────────┬─────────────────────────────────────────┘
                │
                ▼
┌─────────────────────────────────────────────────────────┐
│  Frontend Sync                                           │
│  - Update cached data                                    │
│  - Refresh leaderboards                                  │
│  - Update progress indicators                            │
└─────────────────────────────────────────────────────────┘
```

---

## 📊 Performance Tracking Flow

### Mission Performance Metrics

```
Mission Start
    │
    ▼
┌─────────────────────────┐
│  Initialize Tracking    │
│  - performanceManager   │
│  - Start timers         │
│  - Reset counters       │
└───────────┬─────────────┘
            │
            ▼
    (Every frame @ 60fps)
┌─────────────────────────┐
│  Update Metrics         │
│  - Steering angle       │
│  - Heading deviation    │
│  - Speed variance       │
│  - Position tracking    │
└───────────┬─────────────┘
            │
            ▼
    (On events)
┌─────────────────────────┐
│  Track Events           │
│  - Waypoint reached     │
│  - Collision detected   │
│  - Objective completed  │
└───────────┬─────────────┘
            │
            ▼
    Mission Complete
┌─────────────────────────┐
│  Calculate Final Scores │
│                         │
│  Steering Precision:    │
│  - Smooth = high score  │
│  - Jerky = low score    │
│                         │
│  Course Accuracy:       │
│  - On path = high       │
│  - Off path = low       │
│                         │
│  Collision Penalty:     │
│  - 0 collisions = 100%  │
│  - Each -10%            │
│                         │
│  Time Efficiency:       │
│  - Under target = bonus │
│  - Over target = penalty│
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│  Weighted Average       │
│  Total Score = Combined │
└─────────────────────────┘
```

---

## 🚀 Complete User Journey Examples

### Example 1: New Student Journey

```
Day 1: Registration
├─► Sign up with @dnsc.edu.ph email
├─► Account created (status: pending)
└─► Wait for instructor approval

Day 2: Account Approved
├─► Instructor approves account
├─► Status changed to: active
├─► Login now works
└─► Access Student Dashboard

Day 3: First Training
├─► Try Free Roam mode
├─► Learn boat controls
├─► Practice navigation
└─► Exit to dashboard

Day 4: First Mission
├─► Start "Mission 1: Basic Navigation"
├─► Complete all waypoints
├─► Score: 73%
├─► Earn: +100 XP
├─► Rank: Deck Hand
└─► Take quiz: 85% (Passed)

Day 5-10: Continue Training
├─► Complete more missions
├─► Earn more XP
├─► Rank up to Able Seaman
├─► See progress on leaderboard
└─► Certificate earned for Module 1
```

### Example 2: Instructor Daily Flow

```
Morning: Check Dashboard
├─► Login to Instructor Console
├─► Review Overview tab
│   ├─► See 3 pending approvals
│   ├─► Check class average: 82%
│   └─► Top students performing well
├─► Approve pending students
└─► Export progress report (CSV)

Afternoon: Mission Management
├─► Navigate to Missions tab
├─► Create new mission
│   ├─► Set title and description
│   ├─► Add buoy checkpoints
│   ├─► Set XP reward: +150
│   └─► Save mission
├─► Create quiz for new mission
│   ├─► Add 10 questions
│   ├─► Set correct answers
│   └─► Save quiz
└─► Set mission deadline

Evening: Student Review
├─► Navigate to Students tab
├─► Click "Review" on struggling student
│   ├─► Check Overview tab
│   ├─► See mission scores
│   ├─► Review quiz results
│   └─► Identify areas for improvement
├─► Check Leaderboards
└─► Sign out
```

---

## 🔧 Technical Architecture Flow

```
┌─────────────────────────────────────────────────────────┐
│                     FRONTEND                             │
│                 Vue.js + Three.js                        │
│                                                           │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │   App.vue    │  │ Components   │  │   Helpers    │  │
│  │              │  │              │  │              │  │
│  │ - Auth       │  │ - Admin      │  │ - Performance│  │
│  │ - Dashboard  │  │   Dashboard  │  │   Tracking   │  │
│  │ - 3D Scene   │  │              │  │ - Scoring    │  │
│  │ - Missions   │  │              │  │ - Ocean      │  │
│  │ - UI/UX      │  │              │  │ - Boat       │  │
│  └──────┬───────┘  └──────────────┘  └──────────────┘  │
│         │                                                │
└─────────┼────────────────────────────────────────────────┘
          │
          │ HTTP/REST API
          │
┌─────────▼────────────────────────────────────────────────┐
│                     BACKEND                               │
│                   Node.js + Express                       │
│                                                           │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │   Routes     │  │  Middleware  │  │   Config     │  │
│  │              │  │              │  │              │  │
│  │ - students   │  │ - Auth       │  │ - Firebase   │  │
│  │ - instructors│  │ - Admin      │  │   Admin SDK  │  │
│  │ - missions   │  │              │  │              │  │
│  │ - quizzes    │  │              │  │              │  │
│  │ - scores     │  │              │  │              │  │
│  └──────┬───────┘  └──────────────┘  └──────────────┘  │
│         │                                                │
└─────────┼────────────────────────────────────────────────┘
          │
          │ Firebase Admin SDK
          │
┌─────────▼────────────────────────────────────────────────┐
│                     DATABASE                              │
│                  Firestore (NoSQL)                        │
│                                                           │
│  Collections:                                             │
│  - students                                               │
│  - instructors                                            │
│  - training_modules                                       │
│  - mission_scores                                         │
│  - quizzes                                                │
│  - quiz_scores                                            │
└───────────────────────────────────────────────────────────┘
```

---

## 📱 Screens Summary

### Student Portal
1. **Landing Page** - Login/Signup
2. **Dashboard** - Hub with navigation
3. **Free Roam** - 3D practice mode
4. **My Training** - Mission browser
5. **Mission Active** - 3D gameplay
6. **Mission Complete** - Results modal
7. **Quiz Taking** - Multiple choice UI
8. **Leaderboards** - Rankings view
9. **Certificates** - Achievements

### Instructor Console
1. **Overview** - Analytics dashboard
2. **Mission Management** - CRUD missions
3. **Student Management** - Student table + detail modal
4. **Quiz Management** - Create/edit quizzes
5. **Leaderboards** - Class rankings
6. **Pending Approvals** - Approve students

---

## ✅ Success Criteria Per Flow

### Student Can Successfully:
- ✅ Register and get approved
- ✅ Login and access dashboard
- ✅ Complete missions and earn XP
- ✅ Take quizzes and see scores
- ✅ View progress and rankings
- ✅ Track rank progression

### Instructor Can Successfully:
- ✅ Login and access console
- ✅ View analytics and reports
- ✅ Create and manage missions
- ✅ Create and assign quizzes
- ✅ Approve student signups
- ✅ Review student training records
- ✅ Export data to CSV

### System Can Successfully:
- ✅ Track performance accurately
- ✅ Calculate scores correctly
- ✅ Award XP without duplicates
- ✅ Update ranks automatically
- ✅ Sync data to Firestore
- ✅ Display real-time leaderboards

---

**END OF SYSTEM FLOW DOCUMENTATION**
