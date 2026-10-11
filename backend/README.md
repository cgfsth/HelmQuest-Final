# HelmQuest REST API Backend

Complete REST API backend for HelmQuest maritime training simulation system using Express.js and Firebase Admin SDK.

---

## 🚀 Quick Start

### 1. Install Dependencies
```bash
cd backend
npm install
```

### 2. Download Firebase Service Account Key

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: **helmquest-565d6**
3. Click **⚙️ Project Settings** (gear icon)
4. Go to **Service Accounts** tab
5. Click **Generate New Private Key**
6. Save the downloaded JSON file as `serviceAccountKey.json` in the `backend` folder

### 3. Create Environment File
```bash
cp .env.example .env
```

Edit `.env` file:
```env
PORT=3000
NODE_ENV=development
FIREBASE_SERVICE_ACCOUNT_PATH=./serviceAccountKey.json
FIREBASE_PROJECT_ID=helmquest-565d6
ALLOWED_ORIGINS=http://localhost:5174
API_PREFIX=/api/v1
```

### 4. Start the Server
```bash
npm run dev     # Development mode with nodemon
# OR
npm start       # Production mode
```

Server runs at: **http://localhost:3000**

---

## 📚 API Endpoints

### Base URL: `http://localhost:3000/api/v1`

### **Authentication**
- `POST /auth/register` - Register new user
- `POST /auth/verify-token` - Verify Firebase ID token
- `GET /auth/user/:uid` - Get user by UID

### **Students**
- `GET /students` - Get all students
- `GET /students/:id` - Get student by ID
- `POST /students` - Create new student
- `PUT /students/:id` - Update student
- `DELETE /students/:id` - Delete student

### **Instructors**
- `GET /instructors` - Get all instructors
- `GET /instructors/:id` - Get instructor by ID
- `GET /instructors/:id/students` - Get instructor's students

### **Training Modules**
- `GET /modules` - Get all training modules
- `GET /modules/:id` - Get module by ID
- `POST /modules` - Create new module
- `PUT /modules/:id` - Update module

### **Navigation Missions**
- `GET /missions` - Get all missions (filter: `?moduleId=xxx`)
- `GET /missions/:id` - Get mission by ID
- `POST /missions` - Create new mission

### **Mission Attempts**
- `GET /attempts` - Get attempts (filters: `?studentId=xxx&missionId=xxx`)
- `GET /attempts/:id` - Get attempt by ID
- `POST /attempts` - Record mission attempt

### **Quizzes**
- `GET /quizzes` - Get all active quizzes
- `GET /quizzes/:id` - Get quiz by ID
- `POST /quizzes` - Create new quiz
- `PUT /quizzes/:id` - Update quiz
- `DELETE /quizzes/:id` - Soft delete quiz
- `POST /quizzes/:id/submit` - Submit quiz answers
- `POST /quizzes/submissions/:submissionId/grade` - Grade submission
- `GET /quizzes/submissions/all` - Get submissions (filters: `?status=xxx&studentId=xxx&quizId=xxx`)
- `GET /quizzes/results/:submissionId` - Get quiz result

### **Progress**
- `GET /progress/student/:studentId` - Get student complete progress
- `GET /progress/module/:moduleId/students` - Get module progress for all students
- `GET /progress/course-settings` - Get course settings
- `PUT /progress/course-settings` - Update course settings

### **Health Check**
- `GET /health` - Server health check

---

## 📝 API Usage Examples

### Example 1: Get All Students
```javascript
fetch('http://localhost:3000/api/v1/students')
  .then(res => res.json())
  .then(data => console.log(data.students));
```

### Example 2: Create Mission Attempt
```javascript
const attemptData = {
  studentid: 'SZV2JPnhWAboSOKvjt3Y',
  studentname: 'Alex Rivera',
  missionid: '46xyyqyrIN35J6pwqNw2',
  missiontitle: 'Harbor Navigation Practice',
  moduleid: 'EMlerlCuMTgjY93rUkz5',
  score: 85.5,
  passScore: 80,
  passed: true,
  elapsedMs: 780000,
  performanceMetrics: {
    waypointsReached: 5,
    collisions: 0
  }
};

fetch('http://localhost:3000/api/v1/attempts', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(attemptData)
})
  .then(res => res.json())
  .then(data => console.log(data));
```

### Example 3: Submit Quiz
```javascript
const submission = {
  studentId: 'SZV2JPnhWAboSOKvjt3Y',
  studentName: 'Alex Rivera',
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

### Example 4: Grade Quiz Submission
```javascript
const grading = {
  score: 80,
  validation: [true, true, false, true, true],
  feedback: 'Good job! Review question 3.',
  gradedBy: 'ZiLxCnxBWIfkAygmUlu3'
};

fetch('http://localhost:3000/api/v1/quizzes/submissions/IRaTpCNsWVUWlPSz4PSa/grade', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(grading)
})
  .then(res => res.json())
  .then(data => console.log(data));
```

### Example 5: Get Student Progress
```javascript
fetch('http://localhost:3000/api/v1/progress/student/SZV2JPnhWAboSOKvjt3Y')
  .then(res => res.json())
  .then(data => {
    console.log('Student:', data.student);
    console.log('Completed Modules:', data.completedModules);
    console.log('Attempts:', data.attempts);
    console.log('Quiz Submissions:', data.submissions);
  });
```

---

## 🔐 Security

- CORS enabled for specified origins
- Helmet.js for HTTP security headers
- Firebase Admin SDK for secure database access
- Request body parsing limits
- Error handling with proper status codes

---

## 🐛 Troubleshooting

### Error: "Failed to initialize Firebase Admin SDK"
**Solution:** Make sure `serviceAccountKey.json` exists in the backend folder

### Error: "CORS policy error"
**Solution:** Add your frontend URL to `ALLOWED_ORIGINS` in `.env` file

### Error: "Port 3000 already in use"
**Solution:** Change `PORT` in `.env` file to another port (e.g., 3001)

---

## 📦 Project Structure

```
backend/
├── config/
│   └── firebase-admin.js     # Firebase Admin SDK setup
├── routes/
│   ├── auth.js               # Authentication routes
│   ├── students.js           # Student management
│   ├── instructors.js        # Instructor management
│   ├── modules.js            # Training modules
│   ├── missions.js           # Navigation missions
│   ├── attempts.js           # Mission attempts
│   ├── quizzes.js            # Quiz management
│   └── progress.js           # Progress tracking
├── server.js                 # Main server file
├── package.json              # Dependencies
├── .env                      # Environment variables
├── .env.example              # Environment template
└── serviceAccountKey.json    # Firebase service account (not in git)
```

---

## 🚢 Deploy to Production

### Using Heroku
```bash
heroku create helmquest-api
heroku config:set NODE_ENV=production
heroku config:set FIREBASE_PROJECT_ID=helmquest-565d6
# Add Firebase service account as config var
git push heroku main
```

### Using Railway
```bash
railway login
railway init
railway up
# Add environment variables in Railway dashboard
```

---

## 📄 License
MIT License - HelmQuest Maritime Training System
