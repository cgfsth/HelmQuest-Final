# 🔧 Cache Clearing Quick Guide

## Why Clear Cache?

The waypoint auto-complete bug fix is already in the code, but your browser may be serving **old cached JavaScript files**. Clearing the cache forces your browser to load the updated code.

---

## 🚀 Quick Steps (Choose One Method)

### Method 1: Hard Refresh (Fastest) ⚡

**Windows/Linux:**
```
Press: Ctrl + Shift + R
```

**Mac:**
```
Press: Cmd + Shift + R
```

This reloads the page and bypasses the cache for that specific page.

---

### Method 2: Full Cache Clear (Most Reliable) 🎯

#### Chrome / Edge
1. Press `Ctrl + Shift + Delete` (or `Cmd + Shift + Delete` on Mac)
2. Select **"Cached images and files"**
3. Time range: **"All time"**
4. Click **"Clear data"**

#### Firefox
1. Press `Ctrl + Shift + Delete` (or `Cmd + Shift + Delete` on Mac)
2. Select **"Cached Web Content"**
3. Time range: **"Everything"**
4. Click **"Clear Now"**

#### Safari
1. Go to **Safari → Preferences → Advanced**
2. Check **"Show Develop menu in menu bar"**
3. Go to **Develop → Empty Caches**

---

## ✅ How to Verify Cache is Cleared

After clearing cache:

1. Navigate to HelmQuest: `http://localhost:5174`
2. Open Developer Console: Press **F12**
3. Go to **Console** tab
4. Start the **"Navigational Aids"** mission
5. Look for debug messages with timestamps like:
   ```
   🔍 [BUILD:1735671234567] Waypoint G4 requires interaction...
   ```

**If you see these messages**: ✅ Cache is cleared, new code is running!

**If you DON'T see these messages**: ❌ Try Method 2 (Full Cache Clear) and restart your browser.

---

## 🔄 If Issues Persist

1. **Close and restart your browser completely**
2. **Clear cache again** using Method 2
3. **Verify Vite dev server is running**:
   ```bash
   npm run dev
   ```
4. **Hard refresh again**: `Ctrl + Shift + R`

---

## 📝 What Happens Next?

Once cache is cleared:
- Waypoints with `requireInteraction` (photograph, verify_id, remove_debris) will **NOT auto-complete**
- You must press **Q** and complete the mini-game to advance
- Debug console logs will confirm the blocking logic is working

---

## 🎮 Testing the Fix

See **TESTING_INSTRUCTIONS.md** for the complete testing procedure.

Quick test:
1. Clear cache (above)
2. Approach Green Buoy #4
3. Wait 10+ seconds WITHOUT pressing Q
4. Buoy should remain visible (not disappear)
5. Press Q, complete mini-game
6. Buoy should disappear after completing interaction

---

**Need Help?** Check the detailed **root-cause-diagnosis.md** document for technical details.
