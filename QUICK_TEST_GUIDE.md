# Quick Test Guide - Maritime UI Components

## 🚀 Start the Servers

### Frontend
```bash
# From capstone folder
npm run dev
```
Server will start at: http://localhost:5174/

### Backend
```bash
# From backend folder
cd backend
node server.js
```
Server will start at: http://localhost:3001

---

## ✅ Quick Test Checklist

### Test 1: Mission Briefing (2 minutes)
1. Login as student
2. Click any mission from dashboard
3. **VERIFY:** Mission briefing screen appears
4. **CHECK:**
   - Mission title displayed
   - Difficulty stars show
   - Duration shown
   - Boat type shown
   - Buoy count correct (e.g., "5 Locations")
   - Objectives list shows
5. Click "START MISSION"
6. **VERIFY:** Simulation loads

**Expected:** Professional briefing screen before mission starts

---

### Test 2: Engine Status Indicator (1 minute)
1. Mission starts
2. **VERIFY:** "ENGINE OFF" indicator appears briefly at bottom-center
3. **CHECK:**
   - Red indicator
   - "Press [P] to start engine" text
4. Press P key
5. **VERIFY:** 
   - "STARTING..." appears (yellow, pulsing)
   - Then "ENGINE ON" (green)
6. **CHECK:** Indicator fades after a few seconds

**Expected:** Clear engine status feedback

---

### Test 3: Mission Panel (3 minutes)
1. During mission, look at right side of screen
2. **VERIFY:** Mission panel appears
3. **CHECK:**
   - Mission number (e.g., "MISSION 01")
   - Mission title
   - Progress: "0 / X BUOYS"
   - Progress bar (empty at start)
   - Current objective section shows:
     - Buoy name (e.g., "Buoy 1")
     - Distance in km
     - Bearing in degrees
     - Required action (e.g., "📸 Photograph")
   - Checklist shows:
     - All buoys listed
     - → arrow on first buoy (active)
     - ○ circle on other buoys (pending)
     - Return to Port
     - Stop Engine
     - Drop Anchor
4. Click collapse button (▶ on left edge)
5. **VERIFY:** Panel collapses to save space
6. Click again to expand

**Expected:** Dynamic mission panel with all mission info

---

### Test 4: Buoy Interaction (2 minutes)
1. Navigate boat (WASD keys) toward first buoy
2. **VERIFY:** Distance in mission panel decreases
3. Enter the buoy zone (green circle on radar)
4. **VERIFY:** Interaction modal appears at center
5. **CHECK:**
   - Large animated icon (📸 or 🔍)
   - "BUOY REACHED" title
   - Required action description
   - Large action button
6. Click action button
7. **VERIFY:**
   - Modal closes
   - Buoy completes
   - Checklist updates (✓ appears on Buoy 1)
   - Progress updates (1 / X BUOYS)
   - Next buoy becomes active (→)

**Expected:** Clear interaction flow at each buoy

---

### Test 5: Progress Updates (2 minutes)
1. Complete 2nd buoy
2. **CHECK:**
   - Progress: 2 / X BUOYS
   - Progress bar fills more
   - Checklist shows ✓ on first two buoys
   - → on current buoy
3. Complete all remaining buoys
4. **VERIFY:**
   - Progress bar fills completely (100%)
   - All buoys have ✓
   - "Return to Port" becomes active (→)

**Expected:** Progress updates dynamically

---

### Test 6: Port Arrival & Completion (3 minutes)
1. Navigate back to port (red circle on radar)
2. **VERIFY:** "Return to Port" gets ✓
3. **CHECK:** "Stop Engine" becomes active (→)
4. Press P to stop engine
5. **VERIFY:**
   - Engine status shows "ENGINE OFF"
   - "Stop Engine" gets ✓
   - "Drop Anchor" becomes active (→)
6. Press H to drop anchor
7. **VERIFY:** "Drop Anchor" gets ✓
8. **CHECK:** Mission complete modal appears
9. **VERIFY Modal shows:**
   - ✓ icon with green background
   - "MISSION COMPLETE" title
   - Checklist with all ✓
   - XP reward (if exists)
   - "TAKE ASSESSMENT" button
10. Click "TAKE ASSESSMENT"
11. **VERIFY:** Quiz modal appears

**Expected:** Clear completion flow from port to quiz

---

### Test 7: Dynamic Buoy Support (5 minutes)

**Test with 1 Buoy:**
1. Create/find mission with 1 buoy
2. **VERIFY:**
   - Checklist shows only 1 buoy
   - Progress shows "0 / 1 BUOYS"
   - Complete buoy
   - Progress shows "1 / 1 BUOYS" (100%)

**Test with 3 Buoys:**
1. Find mission with 3 buoys
2. **VERIFY:**
   - Checklist shows 3 buoys
   - Progress shows "0 / 3 BUOYS"
   - Complete all 3
   - Checklist has 3 ✓

**Test with 5+ Buoys:**
1. Find mission with 5+ buoys
2. **VERIFY:**
   - Checklist shows all buoys
   - Can scroll if needed
   - All buoys completable
   - Progress calculates correctly

**Expected:** System works with ANY number of buoys

---

### Test 8: Responsive Elements (2 minutes)
1. During mission, try:
   - Zoom in/out (browser zoom)
   - Resize browser window
2. **VERIFY:**
   - Mission panel stays on right
   - Engine indicator stays bottom-center
   - Modals stay centered
   - Text remains readable
3. Click collapse on mission panel
4. **VERIFY:** More screen space for 3D view

**Expected:** UI adapts to different screen sizes

---

## 🐛 Common Issues & Solutions

### Mission Panel Not Showing
- **Check:** Are you in simulation screen?
- **Check:** Is activeTrainingModule active?
- **Solution:** Start a mission first

### Buoy Interaction Modal Not Appearing
- **Check:** Are you inside the buoy zone? (green circle on radar)
- **Check:** Does step have requireInteraction?
- **Solution:** Get closer to buoy center

### Engine Status Not Showing
- **Check:** Did you wait 5 seconds? (it auto-hides)
- **Solution:** Press P again to see it

### Checklist Not Updating
- **Check:** Did buoy actually complete?
- **Check:** Browser console for errors
- **Solution:** Refresh and retry

### Progress Stuck at 0%
- **Check:** Are buoys completing? (check console logs)
- **Check:** Is trainingRunMetrics updating?
- **Solution:** Check browser console for errors

---

## 🎯 Success Criteria

### ✅ Pass Criteria
- [ ] Mission briefing shows before simulation
- [ ] Engine status appears and updates correctly
- [ ] Mission panel shows on right side
- [ ] Progress updates as buoys complete
- [ ] Checklist shows correct status (✓ → ○)
- [ ] Buoy interaction modal appears in zones
- [ ] Mission complete modal shows after all steps
- [ ] Works with 1, 3, 5+ buoys
- [ ] No console errors
- [ ] UI doesn't cover important 3D view

### 🎨 Visual Quality Check
- [ ] Professional maritime look (navy/cyan colors)
- [ ] Smooth animations (not choppy)
- [ ] Text is readable
- [ ] Icons are clear
- [ ] Progress bar animates smoothly
- [ ] Modals are centered
- [ ] Buttons are clickable

### 🚀 Performance Check
- [ ] No frame rate drops
- [ ] Smooth boat movement
- [ ] Quick modal transitions
- [ ] Responsive button clicks

---

## 📸 What to Look For (Visual Guide)

### Mission Briefing
```
┌────────────────────────────────┐
│         ⚓                      │
│  MARITIME TRAINING MISSION     │
│                                │
│  Coastal Navigation Exercise   │
│                                │
│  ⭐⭐ Intermediate  ⏱️ 15 min   │
│  🚢 Medium Vessel  🎯 5 Buoys  │
│                                │
│  [START MISSION]  [Cancel]     │
└────────────────────────────────┘
```

### Mission Panel (Right Side)
```
┌──────────────────────────────┐
│ MISSION 01                   │
│ Coastal Navigation           │
├──────────────────────────────┤
│ PROGRESS: 3 / 5 BUOYS        │
│ [██████░░░] 60%              │
├──────────────────────────────┤
│ CURRENT OBJECTIVE            │
│ Buoy 4                       │
│ Distance: 2.4 km             │
│ Bearing: 264°                │
│ 📸 Photograph                │
│ [PHOTOGRAPH]                 │
├──────────────────────────────┤
│ CHECKLIST                    │
│ ✓ Buoy 1                     │
│ ✓ Buoy 2                     │
│ ✓ Buoy 3                     │
│ → Buoy 4 (active)            │
│ ○ Buoy 5                     │
│ ○ Return to Port             │
│ ○ Stop Engine                │
│ ○ Drop Anchor                │
└──────────────────────────────┘
```

### Engine Status (Bottom Center)
```
┌────────────────────────┐
│ 🔴                     │
│ ENGINE STATUS          │
│ ENGINE OFF             │
│ Press [P] to start     │
└────────────────────────┘
```

### Buoy Interaction (Center)
```
┌────────────────────────────┐
│        📸                  │
│                            │
│    BUOY REACHED            │
│                            │
│ Required Action:           │
│ Photograph the buoy        │
│                            │
│    [PHOTOGRAPH]            │
│                            │
│    [Close]                 │
└────────────────────────────┘
```

---

## 🎉 Testing Complete!

If all tests pass, the maritime UI integration is successful!

**Next Steps:**
1. Get user feedback from students
2. Adjust colors/sizes if needed
3. Add more polish (optional)
4. Prepare for thesis presentation

**Congratulations! Your maritime training simulator now has a professional, polished UI!** 🚢⚓✅
