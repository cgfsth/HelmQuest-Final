# Performance Scoring - Quick Reference

## 📊 Score Calculation Formula

```
Overall Score = (Steering × 30%) + (Procedural × 40%) + (Course × 30%)

Pass/Fail = Score ≥ 80% ? PASS : FAIL
```

---

## 🎯 The Three Metrics

### 1. Steering Precision (30%)
- **What:** How well you maintain heading
- **Perfect:** 100%
- **Tracked:** Heading errors, sharp turns
- **Penalty:** -2 points per degree of error, -30 points max for sharp turns

### 2. Procedural Correctness (40%)
- **What:** Following mission requirements
- **Perfect:** 100%
- **Tracked:** Violations, skipped waypoints, wrong order
- **Penalty:** -10 points per violation

### 3. Course Accuracy (30%)
- **What:** Staying on intended route
- **Perfect:** 100%
- **Tracked:** Distance from route (meters)
- **Penalty:** 0m = 100%, 20m+ = 0%

---

## 🔢 Example Scores

| Scenario | Steering | Procedural | Course | Overall | Result |
|----------|----------|------------|--------|---------|--------|
| Perfect | 100% | 100% | 100% | 100% | PASS ✅ |
| Good | 92% | 100% | 75% | 90% | PASS ✅ |
| Fair | 80% | 90% | 70% | 80% | PASS ✅ |
| Poor | 65% | 80% | 50% | 64% | FAIL ❌ |

---

## 📍 What Gets Tracked

### Automatically Tracked:
- ✅ Every heading change
- ✅ Sharp turns (>30° in <2s)
- ✅ Distance from waypoints
- ✅ Course deviations
- ✅ Waypoint completion
- ✅ Mission violations

### Not Tracked:
- ❌ Subjective performance
- ❌ Random values
- ❌ AI judgments

---

## 💾 Where Data is Saved

**Firestore Collection:** `mission_scores`

**Includes:**
- Overall score
- Pass/fail status
- All three metric scores
- Detailed violation breakdown
- Steering statistics
- Course deviation statistics

**Purpose:** Instructors can audit student performance

---

## ⚙️ Configuration (Advanced)

**File:** `src/helpers/missionScoring.js`

```javascript
// Adjust these constants to change scoring behavior:

const PASSING_SCORE = 80;                    // Pass threshold
const MAX_ACCEPTABLE_DEVIATION_METERS = 20;  // Course tolerance

const WEIGHTS = {
  STEERING_PRECISION: 0.30,      // 30%
  PROCEDURAL_CORRECTNESS: 0.40,  // 40%
  COURSE_ACCURACY: 0.30          // 30%
};
```

---

## 🚨 Common Issues

### Score seems too low?
- Check course accuracy - staying on route is important
- Check for sharp turns - smooth steering helps
- Check for violations - each costs 10 points

### Score seems too high?
- System is fair - if you execute well, you score well
- 100% is achievable with perfect execution

### Scoring inconsistent?
- It shouldn't be - system is deterministic
- Same performance = same score every time

---

## 🎓 Tips for Students

1. **Steering:** Maintain smooth, gradual course changes
2. **Procedures:** Follow all waypoints in order
3. **Course:** Stay close to direct route between waypoints
4. **Practice:** Scores are consistent - practice makes perfect

---

## 👨‍🏫 For Instructors

### Viewing Performance:
All student scores saved in Firestore with detailed breakdown.

### Analyzing Students:
- Low steering? → Practice heading hold
- Low procedural? → Review mission requirements
- Low course? → Practice route planning

### Adjusting Difficulty:
Edit `PASSING_SCORE` or `WEIGHTS` in `missionScoring.js`

---

## ✅ Key Points

- **100% deterministic** - no randomness
- **Transparent** - clear formulas
- **Fair** - based on actual performance
- **Auditable** - all data saved
- **NO AI** - pure JavaScript calculations
