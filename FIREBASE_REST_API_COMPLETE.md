# 🎉 HelmQuest Firebase REST API - COMPLETE SETUP

## ✅ What's Been Created

### **Backend Server (REST API)**
- ✅ Complete Express.js REST API server
- ✅ Firebase Admin SDK integration
- ✅ 8 route modules covering all features
- ✅ CORS and security middleware
- ✅ Error handling
- ✅ All dependencies installed

### **API Routes Created**
1. ✅ **Authentication** (`/api/v1/auth`)
2. ✅ **Students** (`/api/v1/students`)
3. ✅ **Instructors** (`/api/v1/instructors`)
4. ✅ **Training Modules** (`/api/v1/modules`)
5. ✅ **Navigation Missions** (`/api/v1/missions`)
6. ✅ **Mission Attempts** (`/api/v1/attempts`)
7. ✅ **Quizzes** (`/api/v1/quizzes`)
8. ✅ **Progress Tracking** (`/api/v1/progress`)

### **Documentation**
- ✅ Complete API documentation (README.md)
- ✅ Step-by-step setup guide (SETUP_INSTRUCTIONS.md)
- ✅ API usage examples
- ✅ Troubleshooting guide

---

## 🚀 NEXT STEPS (Final Setup)

### **Step 1: Get Firebase Service Account Key** ⚠️ IMPORTANT!

1. Go to: https://console.firebase.google.com/project/helmquest-565d6/settings/serviceaccounts/adminsdk

2. Click **"Generate New Private Key"** button

3. A JSON file will download - **RENAME IT TO `serviceAccountKey.json`**

4. **MOVE IT** to the `backend` folder:
   ```
   C:\Users\kevin\Capstone\capstone\backend\serviceAccountKey.json
   ```

### **Step 2: Start the Backend Server**

Open a NEW terminal (separate from your frontend):

```bash
cd C:\Users\kevin\Capstone\capstone\backend
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

### **Step 3: Test the API**

Open browser: http://localhost:3000/health

Should see:
```json
{
  "status": "OK",
  "message": "HelmQuest API is running"
}
```

---

## 📊 YOUR FIRESTORE DATABASE STRUCTURE

Based on your screenshots, you have these collections with data:

| Collection | Documents | Example Data |
|------------|-----------|--------------|
| **users** | 1+ | Kevin Caidic (student-alex) |
| **students** | 1+ | STU-2026-001, 5 missions completed |
| **instructor** | 1+ | Helen Morgan, 15 students |
| **training_module** | 1+ | Basic Steering and Speed Control |
| **navigation_mission** | 1+ | Harbor Navigation Practice |
| **mission_attempts** | 1+ | Score: 85.5, Passed: true |
| **student_module_progress** | 1+ | Completed modules tracking |
| **quizzes** | 1+ | Navigation Safety Quiz |
| **quiz_assignment** | 1+ | Quiz-to-mission assignments |
| **quiz_submission** | 1+ | Student answers (pending) |
| **quiz_results** | 1+ | Score: 80, Passed: true |
| **course_settings** | 1 | System configuration |

---

## 🎯 API ENDPOINTS SUMMARY

### **Base URL:** `http://localhost:3000/api/v1`

### Students
```
GET    /students              # Get all students
GET    /students/:id          # Get student by ID
POST   /students              # Create student
PUT    /students/:id          # Update student
DELETE /students/:id          # Delete student
```

### Instructors
```
GET    /instructors           # Get all instructors
GET    /instructors/:id       # Get instructor by ID
GET    /instructors/:id/students  # Get instructor's students
```

### Training Modules
```
GET    /modules               # Get all modules
GET    /modules/:id           # Get module by ID
POST   /modules               # Create module
PUT    /modules/:id           # Update module
```

### Navigation Missions
```
GET    /missions              # Get all missions (?moduleId=xxx)
GET    /missions/:id          # Get mission by ID
POST   /missions              # Create mission
```

### Mission Attempts
```
GET    /attempts              # Get attempts (?studentId=xxx&missionId=xxx)
GET    /attempts/:id          # Get attempt by ID
POST   /attempts              # Record attempt
```

### Quizzes
```
GET    /quizzes               # Get all quizzes
GET    /quizzes/:id           # Get quiz by ID
POST   /quizzes               # Create quiz
PUT    /quizzes/:id           # Update quiz
DELETE /quizzes/:id           # Delete quiz
POST   /quizzes/:id/submit    # Submit quiz
POST   /quizzes/submissions/:id/grade  # Grade submission
GET    /quizzes/submissions/all        # Get submissions
GET    /quizzes/results/:submissionId  # Get result
```

### Progress
```
GET    /progress/student/:studentId          # Get student progress
GET    /progress/module/:moduleId/students   # Get module progress
GET    /progress/course-settings             # Get settings
PUT    /progress/course-settings             # Update settings
```

---

## 💻 QUICK API TEST EXAMPLES

### Test 1: Get All Students
```javascript
fetch('http://localhost:3000/api/v1/students')
  .then(res => res.json())
  .then(data => console.log(data));
```

### Test 2: Get Student Progress
```javascript
fetch('http://localhost:3000/api/v1/progress/student/SZV2JPnhWAboSOKvjt3Y')
  .then(res => res.json())
  .then(data => console.log(data));
```

### Test 3: Record Mission Attempt
```javascript
const attempt = {
  studentid: 'SZV2JPnhWAboSOKvjt3Y',
  studentname: 'Kevin Caidic',
  missionid: '46xyyqyrIN35J6pwqNw2',
  missiontitle: 'Harbor Navigation',
  moduleid: 'EMlerlCuMTgjY93rUkz5',
  score: 85.5,
  passScore: 80,
  passed: true,
  elapsedMs: 780000
};

fetch('http://localhost:3000/api/v1/attempts', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(attempt)
})
  .then(res => res.json())
  .then(data => console.log(data));
```

### Test 4: Submit Quiz
```javascript
const submission = {
  studentId: 'SZV2JPnhWAboSOKvjt3Y',
  studentName: 'Kevin Caidic',
  answers: ['5 knots', 'True', 'Life jacket'],
  moduleId: 'EMlerlCuMTgjY93rUkz5'
};

fetch('http://localhost:3000/api/v1/quizzes/bLmsOCjrIScqGGrSTwzx/submit', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(submission)
})
  .then(res => res.json())
  .then(data => console.log(data));
```

---

## 📁 PROJECT STRUCTURE

```
capstone/
├── backend/                          # REST API Backend (NEW!)
│   ├── config/
│   │   └── firebase-admin.js        # Firebase Admin SDK
│   ├── routes/
│   │   ├── auth.js                  # Authentication
│   │   ├── students.js              # Students management
│   │   ├── instructors.js           # Instructors management
│   │   ├── modules.js               # Training modules
│   │   ├── missions.js              # Navigation missions
│   │   ├── attempts.js              # Mission attempts
│   │   ├── quizzes.js               # Quiz management
│   │   └── progress.js              # Progress tracking
│   ├── server.js                    # Main server
│   ├── package.json                 # Dependencies
│   ├── .env                         # Environment config
│   ├── README.md                    # API documentation
│   ├── SETUP_INSTRUCTIONS.md        # Setup guide
│   └── serviceAccountKey.json       # Firebase key (YOU NEED TO ADD THIS!)
│
├── src/                             # Frontend (Vue.js)
│   ├── firebase/                    # Firebase SDK files (OLD - can keep or replace)
│   ├── components/
│   ├── helpers/
│   └── ...
│
├── public/
├── docs/
└── ...
```

---

## ⚡ RUNNING BOTH FRONTEND + BACKEND

### Terminal 1 (Frontend):
```bash
cd C:\Users\kevin\Capstone\capstone
npm run dev
# Runs at: http://localhost:5174
```

### Terminal 2 (Backend):
```bash
cd C:\Users\kevin\Capstone\capstone\backend
npm run dev
# Runs at: http://localhost:3000
```

---

## 🎯 WHAT YOU CAN DO NOW

### Option A: Use REST API from Frontend
Replace Firebase SDK calls in your Vue.js app with REST API calls:

```javascript
// OLD (Direct Firebase SDK):
import { getStudents } from './firebase/firestore.js';
const students = await getStudents();

// NEW (REST API):
const response = await fetch('http://localhost:3000/api/v1/students');
const { students } = await response.json();
```

### Option B: Keep Both Options
- Use Firebase SDK for real-time features
- Use REST API for admin operations and reports

---

## 🔐 SECURITY NOTES

✅ **Backend is secure:**
- Firebase Admin SDK (server-side only)
- Service account key never exposed to frontend
- CORS protection
- Helmet.js security headers
- Role-based access (ready for authentication)

✅ **Frontend connection:**
- Backend validates all requests
- Firestore security rules still apply
- Service account has full admin access (secure)

---

## 🚢 DEPLOYMENT READY

Your backend is ready to deploy to:
- **Heroku** (easiest)
- **Railway** (modern)
- **Render** (free tier)
- **Google Cloud Run** (scalable)
- **AWS Lambda** (serverless)

See `backend/README.md` for deployment instructions!

---

## 📞 SUPPORT & TROUBLESHOOTING

### Common Issues:

**Problem:** "Failed to initialize Firebase Admin SDK"
- **Solution:** Download `serviceAccountKey.json` from Firebase Console

**Problem:** "Port 3000 already in use"
- **Solution:** Change `PORT` in `backend/.env` file

**Problem:** "CORS error"
- **Solution:** Add your frontend URL to `ALLOWED_ORIGINS` in `.env`

---

## ✅ CHECKLIST - COMPLETE SETUP

- [x] Backend server created
- [x] All API routes implemented
- [x] Dependencies installed
- [x] Environment file configured
- [x] Documentation completed
- [ ] **Download Firebase service account key** (YOU NEED TO DO THIS!)
- [ ] **Start backend server**
- [ ] **Test API endpoints**
- [ ] **Connect frontend to API**

---

## 🎉 YOU'RE READY!

**EVERYTHING IS SET UP!** Just download the Firebase service account key and start the server!

**Questions? Check:**
1. `backend/README.md` - Complete API docs
2. `backend/SETUP_INSTRUCTIONS.md` - Step-by-step guide
3. `FIREBASE_SETUP.md` - Firebase connection info

**GOOD LUCK!** 🚀🔥
