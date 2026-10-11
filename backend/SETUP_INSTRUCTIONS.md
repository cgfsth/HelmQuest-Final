# 🚀 HelmQuest Backend - Setup Instructions

## Step-by-Step Setup Guide

### ✅ Step 1: Install Node.js Dependencies

```bash
cd backend
npm install
```

Expected output:
```
added 150+ packages in 30s
```

---

### ✅ Step 2: Get Firebase Service Account Key

**IMPORTANT:** This step is required for the backend to connect to Firestore!

1. **Open Firebase Console:**
   https://console.firebase.google.com/project/helmquest-565d6/settings/serviceaccounts/adminsdk

2. **Click "Generate New Private Key"**

3. **Save the file as `serviceAccountKey.json`** in the `backend` folder

File structure should look like:
```
backend/
├── serviceAccountKey.json  ← PUT FILE HERE
├── server.js
├── package.json
└── ...
```

---

### ✅ Step 3: Verify Environment File

The `.env` file is already created with correct settings:
```env
PORT=3000
FIREBASE_PROJECT_ID=helmquest-565d6
ALLOWED_ORIGINS=http://localhost:5174
```

**No changes needed unless you want to customize the port!**

---

### ✅ Step 4: Start the Backend Server

```bash
npm run dev
```

Expected output:
```
════════════════════════════════════════════════════════
🚀 HelmQuest REST API Server
════════════════════════════════════════════════════════
📡 Server running on: http://localhost:3000
🔗 API endpoint: http://localhost:3000/api/v1
🏥 Health check: http://localhost:3000/health
🌍 Environment: development
🔥 Firebase Project: helmquest-565d6
════════════════════════════════════════════════════════
```

---

### ✅ Step 5: Test the API

Open your browser and go to:
```
http://localhost:3000/health
```

You should see:
```json
{
  "status": "OK",
  "message": "HelmQuest API is running",
  "timestamp": "2026-07-05T12:00:00.000Z",
  "environment": "development"
}
```

---

### ✅ Step 6: Test with Real Data

Get all students:
```
http://localhost:3000/api/v1/students
```

Get all quizzes:
```
http://localhost:3000/api/v1/quizzes
```

Get all training modules:
```
http://localhost:3000/api/v1/modules
```

---

## 🎯 Quick Troubleshooting

### Problem: "Failed to initialize Firebase Admin SDK"
**Solution:** Make sure `serviceAccountKey.json` is in the `backend` folder

### Problem: "Port 3000 already in use"
**Solution:** Edit `.env` file and change `PORT=3000` to `PORT=3001`

### Problem: "Cannot find module 'express'"
**Solution:** Run `npm install` in the backend folder

---

## 📚 What's Next?

Now your backend is ready! You can:

1. **Use the API from your Vue.js frontend**
2. **Test all endpoints** (see README.md for examples)
3. **Deploy to production** (Heroku, Railway, etc.)

---

## 🔥 Available Endpoints

- `/api/v1/students` - Student management
- `/api/v1/instructors` - Instructor management
- `/api/v1/modules` - Training modules
- `/api/v1/missions` - Navigation missions
- `/api/v1/attempts` - Mission attempts
- `/api/v1/quizzes` - Quiz management
- `/api/v1/progress` - Progress tracking

See `README.md` for complete API documentation!
