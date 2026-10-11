# Admin Login Steps

## Credentials
- **Email**: `admin@helmquest.local`
- **Password**: `password`

## Steps to Login
1. Open browser and go to `http://localhost:5174` (or your dev server URL)
2. Click **"Admin Portal"** button sa landing page
3. Enter ang credentials sa taas
4. Click "Login"

## Expected Behavior
- After successful login, dapat ma-redirect ka to Admin Dashboard
- Dapat makita nimo ang:
  - Header: "🎓 HelmQuest Admin Portal"
  - 3 tabs: 📊 Dashboard, 👨‍🏫 Instructors, 👥 Students
  - System statistics cards

## Troubleshooting

### If you see blank screen:
1. **Open Browser Console** (Press F12)
2. Check for errors sa Console tab
3. Check kung naa ba'y error related to:
   - Component mounting
   - API calls
   - Import errors

### If you see old instructor/student dashboard:
1. **Clear localStorage**:
   ```javascript
   localStorage.clear();
   ```
2. **Hard refresh** (Ctrl + Shift + R sa Windows, Cmd + Shift + R sa Mac)
3. Try login again

### If backend not running:
1. Make sure backend server is running:
   ```bash
   cd backend
   npm start
   ```
2. Should see: "Server running on port 3000"

### If frontend not running:
1. Make sure frontend dev server is running:
   ```bash
   npm run dev
   ```
2. Should see: "Local: http://localhost:5174"

## Quick Debug Commands

Open browser console (F12) and run:

```javascript
// Check current user
console.log(localStorage.getItem('currentUser'));

// Check user role
console.log(localStorage.getItem('userRole'));

// Check active screen (use Vue DevTools if available)
```

## Files Created
- `src/components/admin/AdminDashboard.vue` ✅
- `src/components/admin/SystemOverview.vue` ✅
- `src/components/admin/InstructorManagement.vue` ✅
- `src/components/admin/GlobalStudentView.vue` ✅
- `backend/routes/admin.js` ✅
- `backend/middleware/requireAdmin.js` ✅
