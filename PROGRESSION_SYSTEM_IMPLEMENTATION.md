# HelmQuest Student Progression System Implementation

## Overview
Implemented a comprehensive student progression system that syncs XP and rank between localStorage (cache) and Firestore (persistent storage).

## Architecture

### Data Flow
```
MISSION COMPLETION
    ↓
SIMULATION RESULT
    ↓
SAVE TO mission_score (Firestore)
    ↓
CALCULATE & AWARD XP (if passed & not duplicate)
    ↓
UPDATE students.xp (Firestore)
    ↓
CALCULATE NEW RANK
    ↓
UPDATE students.rank (Firestore)
    ↓
NOTIFY USER (XP earned / Rank up)
    ↓
REFRESH STUDENT DATA
    ↓
UPDATE UI (Student Portal displays new XP/Rank)
```

## Implementation Details

### 1. Backend Changes (`backend/routes/mission_scores.js`)

#### Rank Configuration (Single Source of Truth)
```javascript
const RANKS = [
  { id: 'master_captain', name: 'Master / Captain', requiredXP: 10000 },
  { id: 'chief_officer', name: 'Chief Officer (C/O)', requiredXP: 7000 },
  { id: 'second_officer', name: 'Second Officer (2/O)', requiredXP: 5000 },
  { id: 'third_officer', name: 'Third Officer (3/O)', requiredXP: 3500 },
  { id: 'bosun', name: 'Bosun', requiredXP: 2000 },
  { id: 'able_seaman', name: 'Able Seaman (AB)', requiredXP: 1000 },
  { id: 'ordinary_seaman', name: 'Ordinary Seaman (OS)', requiredXP: 500 },
  { id: 'deck_cadet', name: 'Deck Cadet', requiredXP: 0 }
];
```

#### XP Award Idempotency
- Added `hasXPBeenAwarded()` function to prevent duplicate XP awards
- Uses time window (5 seconds) to detect duplicate submissions
- Checks `xpAwarded` flag in mission_score documents

#### Mission Score Saving
- Saves mission result to `mission_score` collection
- Calculates XP from mission's `xp_reward` field (handles both string and numeric formats)
- Awards XP only if:
  - Mission passed
  - Not a duplicate submission
- Updates `students` collection:
  - `xp` field (total accumulated XP)
  - `total_xp` field (maintained for compatibility)
  - `rank` field (current rank name)
  - `rankId` field (rank identifier)
  - `lastUpdated` timestamp
- Detects rank changes and includes in response

#### Response Format
```json
{
  "message": "Mission score saved",
  "scoreId": "doc_id",
  "data": { /* mission_score data */ },
  "xpAwarded": 100,
  "totalXp": 985,
  "rank": "Ordinary Seaman (OS)",
  "rankId": "ordinary_seaman",
  "rankChanged": false,
  "previousRank": "Deck Cadet"
}
```

### 2. Frontend Changes (`src/App.vue`)

#### User Data Loading on Login
- Modified `tryStudentAuthenticationFallback()` to load `xp` and `rank` from Firestore
- Modified `proceedWithAuthentication()` to preserve XP and rank in `currentUser` object

#### XP Display
- Updated `totalXP` computed property to prioritize Firestore data over localStorage
- Updated `currentRank` computed property to use Firestore rank data
- Added `rankBadges` computed property to calculate badge states (locked/current/earned)

#### Student Portal Enhancements

**MY RANK Card:**
- Displays current rank name
- Shows total XP
- Progress bar to next rank
- Percentage and XP needed for next rank

**Rank Badges Section:**
- Dynamic badge list using `v-for`
- Three states:
  - **Locked** 🔒 - Not yet earned (grayed out, shows XP required)
  - **Current** ⭐ - Current active rank (highlighted in blue)
  - **Earned** ✓ - Previously achieved ranks (green highlight)

#### Notifications
- Updated `saveMissionScoreToFirestore()` to show:
  - Regular XP notification: "🎯 +100 XP earned! Total: 985 XP"
  - Rank up notification: "🎉 RANK UP! Deck Cadet → Ordinary Seaman (OS)! +100 XP (Total: 500 XP)"
- Added `refreshCurrentUser()` function to reload student data from Firestore after XP award

#### CSS Styling
Added styles for:
- `.student-profile-rank-xp` - XP display in MY RANK card
- `.student-profile-rank-progress` - Progress bar container
- `.student-profile-rank-progress-bar` - Progress bar track
- `.student-profile-rank-progress-fill` - Progress bar fill (animated)
- `.student-profile-rank-progress-text` - Progress text
- `.rank-card--locked` - Locked rank state
- `.rank-card--earned` - Earned rank state
- `.rank-xp-required` - XP requirement badge
- `.rank-status-badge` - Status badge (CURRENT RANK / ✓ EARNED)

### 3. Mission Steps Display (3D Simulation)

Added complete mission steps list to Training Steps panel:
- Shows all mission steps at once
- Visual indicators:
  - **Completed steps**: Grayed out with strikethrough
  - **Current step**: Highlighted in yellow with left border
  - **Upcoming steps**: Normal appearance

CSS classes:
- `.training-all-steps-mini` - Container
- `.training-all-steps-heading` - "All Steps (X)" heading
- `.training-all-steps-list` - Ordered list
- `.step-completed` - Completed step styling
- `.step-current` - Current active step styling

## Key Features

### 1. XP Idempotency
- Prevents duplicate XP awards
- Safe for page refreshes and retries
- Time-based duplicate detection

### 2. Rank Calculation
- Deterministic rank from total XP
- No manual rank updates needed
- Automatic rank progression

### 3. Firestore as Source of Truth
- `students.xp` = current total XP
- `students.rank` = current rank
- `mission_score` = mission history/performance
- No duplicate XP storage

### 4. Progressive Disclosure
- Locked ranks show XP requirements
- Current rank highlighted
- Earned ranks marked with checkmark
- Clear visual hierarchy

### 5. Real-time Sync
- Frontend refreshes user data after XP award
- Leaderboard updates automatically
- Student Portal reflects current state

## Testing Checklist

- [ ] Complete a mission → XP awarded correctly
- [ ] Refresh result page → No duplicate XP
- [ ] Retry mission → Only final success awards XP
- [ ] Check Student Portal → Rank displayed correctly
- [ ] Complete mission near rank threshold → Rank up notification shows
- [ ] View rank badges → Locked/Current/Earned states correct
- [ ] View mission steps in simulation → All steps visible
- [ ] Complete step → Visual feedback correct
- [ ] Check MY RANK card → XP and progress bar correct
- [ ] Multiple missions → Total XP accumulates correctly

## Migration Notes

### Existing Students
- Existing `rank` field in Firestore will be read and used
- If `xp` or `total_xp` is 0, rank defaults to "Deck Cadet"
- No manual migration required

### Backward Compatibility
- localStorage progression still works
- Firestore data takes precedence when available
- Demo accounts unaffected

## Files Modified

1. **Backend:**
   - `backend/routes/mission_scores.js` - XP calculation and rank update logic

2. **Frontend:**
   - `src/App.vue` - UI updates, computed properties, mission steps display

## XP Thresholds

| Rank | Required XP |
|------|-------------|
| Deck Cadet | 0 XP |
| Ordinary Seaman (OS) | 500 XP |
| Able Seaman (AB) | 1,000 XP |
| Bosun | 2,000 XP |
| Third Officer (3/O) | 3,500 XP |
| Second Officer (2/O) | 5,000 XP |
| Chief Officer (C/O) | 7,000 XP |
| Master / Captain | 10,000 XP |

## Future Enhancements

1. **Quiz Integration**
   - Add quiz score contribution to final XP
   - Implement "awaiting_quiz" status
   - Combined mission + quiz finalization

2. **XP Multipliers**
   - Difficulty multipliers
   - Bonus XP for perfect scores
   - Streak bonuses

3. **Rank Badges UI**
   - Animated rank-up sequences
   - Badge unlock animations
   - Rank certificate generation

4. **Analytics**
   - XP earned over time chart
   - Rank progression timeline
   - Peer comparison

## Notes

- Achievement badges remain separate from rank badges
- Instructor portal functionality preserved
- Mission creation system unchanged
- 3D simulation experience unchanged
- All buoy markers visible at mission start (previous fix maintained)
