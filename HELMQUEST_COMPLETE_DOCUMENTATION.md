# 🚢 HelmQuest Maritime Training System - Complete Documentation

## 📋 Table of Contents

1. [System Overview](#system-overview)
2. [Architecture](#architecture)
3. [Technology Stack](#technology-stack)
4. [Installation & Setup](#installation--setup)
5. [User Roles & Permissions](#user-roles--permissions)
6. [Database Structure](#database-structure)
7. [API Reference](#api-reference)
8. [Frontend Components](#frontend-components)
9. [3D Simulation Features](#3d-simulation-features)
10. [User Flows](#user-flows)
11. [Gamification System](#gamification-system)
12. [Security & Authentication](#security--authentication)
13. [Testing Guide](#testing-guide)
14. [Deployment](#deployment)
15. [Troubleshooting](#troubleshooting)

---

## System Overview

**HelmQuest** is a web-based maritime navigation training simulator designed for fisheries students. It combines real-time 3D ocean simulation with mission-based learning, quizzes, gamification mechanics, and comprehensive instructor management tools.

### Key Features

- 🌊 **3D Ocean Simulation** - Realistic boat navigation using Three.js
- 🎯 **Mission-Based Training** - Structured learning objectives with waypoints
- 📝 **Quiz System** - Multiple choice, true/false, and fill-in-the-blank questions
- 🏆 **Gamification** - XP, ranks, leaderboards, badges, and certificates
- 👨‍🏫 **Instructor Console** - Mission creator, student management, analytics
- 📊 **Performance Tracking** - Detailed metrics on student progress
- 🎓 **Certificate Generation** - Automated completion certificates

### System Specifications

- **Frontend URL:** http://localhost:5174
- **Backend URL:** http://localhost:3001
- **API Prefix:** /api/v1
- **Database:** Firebase Firestore (Cloud NoSQL)
- **Supported Browsers:** Chrome, Firefox, Edge (WebGL 2.0 required)

---

## Architecture

### System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        HELMQUEST SYSTEM                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  CLIENT TIER              APPLICATION TIER        DATA TIER      │
│  ┌──────────────┐        ┌──────────────┐      ┌─────────────┐ │
│  │   Browser    │        │   Node.js    │      │  Firebase   │ │
│  │              │        │   Express    │      │  Firestore  │ │
│  │  Vue.js 3    │◄──────►│   REST API   │◄────►│             │ │
│  │  Three.js    │  HTTP  │   Port 3001  │      │  Cloud DB   │ │
│  │  Port 5174   │        │              │      │             │ │
│  └──────────────┘        └──────────────┘      └─────────────┘ │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

### Technology Flow

```
User Browser
    │
    ├─► Vue.js (UI Layer)
    │   ├─► Components (Dashboard, Modals, Forms)
    │   ├─► Reactive State Management
    │   └─► API Service Layer
    │
    ├─► Three.js (3D Layer)
    │   ├─► Scene Rendering
    │   ├─► Physics Engine (Cannon.js)
    │   ├─► Camera Controls
    │   └─► Performance Tracking
    │
    └─► API Calls
        │
        ▼
    Express.js Backend
        │
        ├─► Authentication Middleware
        ├─► Route Handlers
        ├─► Firebase Admin SDK
        └─► Response Formatting
        │
        ▼
    Firebase Firestore
        │
        └─► Collections:
            ├─ students
            ├─ instructors
            ├─ training_modules
            ├─ mission_scores
            ├─ quizzes
            └─ quiz_scores
```

---

## Technology Stack

### Frontend Technologies

| Technology | Version | Purpose |
|------------|---------|---------|
| **Vue.js** | 3.5.35 | Reactive UI framework |
| **Three.js** | 0.163.0 | 3D WebGL rendering |
| **Cannon.js** | Latest | Physics engine for boat movement |
| **Chart.js** | 4.5.1 | Data visualization (dashboards) |
| **Firebase Client SDK** | 12.16.0 | Client-side database operations |
| **Vite** | 5.2.0 | Build tool and dev server |
| **Tween.js** | 23.1.2 | Animation library |

### Backend Technologies

| Technology | Version | Purpose |
|------------|---------|---------|
| **Node.js** | 18+ | JavaScript runtime |
| **Express.js** | 4.18.2 | Web framework |
| **Firebase Admin SDK** | 12.0.0 | Server-side database access |
| **bcrypt** | 6.0.0 | Password hashing |
| **cors** | 2.8.5 | Cross-origin resource sharing |
| **helmet** | 7.1.0 | Security middleware |
| **morgan** | 1.10.0 | HTTP request logger |
| **dotenv** | 16.3.1 | Environment configuration |

### Database

- **Firebase Firestore** - NoSQL cloud database
- **Real-time synchronization** - Automatic updates across clients
- **Scalable** - Handles concurrent users
- **Secure** - Firebase security rules

---

## Installation & Setup

### Prerequisites

- **Node.js** 18.x or higher
- **npm** 9.x or higher
- **Git** for version control
- **Firebase Project** with Firestore enabled
- **Modern Browser** with WebGL 2.0 support

### Step 1: Clone Repository

```bash
git clone https://github.com/your-repo/helmquest.git
cd helmquest/capstone
```

### Step 2: Install Frontend Dependencies

```bash
npm install
```

### Step 3: Install Backend Dependencies

```bash
cd backend
npm install
```

### Step 4: Firebase Configuration

1. **Create Firebase Project:**
   - Go to https://console.firebase.google.com/
   - Create a new project named "helmquest"
   - Enable Firestore Database

2. **Get Firebase Config:**
   - Go to Project Settings → General
   - Scroll to "Your apps" → Web app
   - Copy the Firebase configuration object

3. **Configure Frontend:**

Create `src/firebase/config.js`:

```javascript
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_AUTH_DOMAIN",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_STORAGE_BUCKET",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
```

4. **Configure Backend:**

Create `backend/.env`:

```env
PORT=3001
API_PREFIX=/api/v1
NODE_ENV=development
ALLOWED_ORIGINS=http://localhost:5174,http://localhost:5175
FIREBASE_PROJECT_ID=your-project-id
```

5. **Download Service Account Key:**
   - Go to Project Settings → Service Accounts
   - Click "Generate new private key"
   - Save as `backend/serviceAccountKey.json`

### Step 5: Initialize Firestore Collections

Run the setup script to create initial collections:

```bash
cd backend
node scripts/initializeDatabase.js
```

### Step 6: Start Development Servers

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
```

**Terminal 2 - Frontend:**
```bash
npm run dev
```

### Step 7: Access Application

- **Frontend:** http://localhost:5174
- **Backend API:** http://localhost:3001/api/v1
- **Health Check:** http://localhost:3001/health

---

## User Roles & Permissions

### Role Hierarchy

```
┌─────────────────────────────────────────┐
│              ADMIN                       │
│  • Full system access                   │
│  • User management                      │
│  • System configuration                 │
└──────────────┬──────────────────────────┘
               │
┌──────────────▼──────────────────────────┐
│          INSTRUCTOR                      │
│  • Dashboard analytics                  │
│  • Mission creation/editing             │
│  • Quiz creation/editing                │
│  • Student management                   │
│  • Student approval/rejection           │
│  • Leaderboard viewing                  │
└──────────────┬──────────────────────────┘
               │
┌──────────────▼──────────────────────────┐
│           STUDENT                        │
│  • Free roam mode                       │
│  • Mission training                     │
│  • Quiz taking                          │
│  • View progress/certificates           │
│  • View leaderboards                    │
└─────────────────────────────────────────┘
```

### Permission Matrix

| Feature | Student | Instructor | Admin |
|---------|---------|------------|-------|
| **Authentication** |
| Register Account | ✅ (Requires approval) | ❌ | ❌ |
| Login | ✅ | ✅ | ✅ |
| **Dashboard** |
| View Own Progress | ✅ | ✅ | ✅ |
| View Analytics | ❌ | ✅ | ✅ |
| **Missions** |
| View Missions | ✅ | ✅ | ✅ |
| Take Missions | ✅ | ❌ | ❌ |
| Create/Edit Missions | ❌ | ✅ | ✅ |
| Delete Missions | ❌ | ✅ | ✅ |
| **Quizzes** |
| Take Quizzes | ✅ | ❌ | ❌ |
| Create/Edit Quizzes | ❌ | ✅ | ✅ |
| Delete Quizzes | ❌ | ✅ | ✅ |
| **Student Management** |
| View All Students | ❌ | ✅ (Own class) | ✅ (All) |
| Approve Students | ❌ | ✅ | ✅ |
| View Student Details | ❌ | ✅ | ✅ |
| **Leaderboards** |
| View Class Rankings | ✅ | ✅ | ✅ |
| View Global Rankings | ✅ | ✅ | ✅ |
| **Reports** |
| Export CSV | ❌ | ✅ | ✅ |
| System Reports | ❌ | ❌ | ✅ |

---

## Database Structure

### Firestore Collections Overview

```
📦 Firestore Database
├── 📁 students (User accounts - student role)
├── 📁 instructors (User accounts - instructor role)
├── 📁 training_modules (Missions created by instructors)
├── 📁 mission_scores (Student mission completion records)
├── 📁 quizzes (Quiz questions and answers)
└── 📁 quiz_scores (Student quiz submission records)
```

### Collection Schemas

#### 1. students Collection

```javascript
{
  // Document ID: auto-generated by Firestore
  id: "auto_generated_id",
  
  // Basic Information
  studentId: "DNSC2026-00334",        // Display ID for UI
  name: "Kevin Caidic",
  email: "kevin@dnsc.edu.ph",         // Must end with @dnsc.edu.ph
  password: "$2b$10$hashed...",        // bcrypt hashed
  
  // Account Status
  status: "active",                    // "pending" | "active" | "rejected"
  instructorid: "instructor_doc_id",   // Reference to instructor
  approvedBy: "instructor_doc_id",
  approvedAt: Timestamp,
  
  // Gamification
  xp: 100,                            // Total experience points
  rank: "Able Seaman",                // Current rank title
  rankId: 2,                          // Rank level number
  
  // Statistics (cached from queries)
  completed: 4,                       // Number of missions completed
  averageScore: 85,                   // Average mission score
  bestScore: 95,                      // Best mission score
  
  // Profile
  boatUsed: "Commercial Trawler",
  badgesEarned: 3,
  badgesTotal: 10,
  certificates: 2,
  
  // Timestamps
  createdAt: Timestamp
}
```

#### 2. instructors Collection

```javascript
{
  id: "auto_generated_id",
  
  // Basic Information
  name: "JOcel Sebial",
  email: "jocel@helmquest.com",       // Must include @helmquest
  password: "$2b$10$hashed...",        // bcrypt hashed
  
  // Status
  status: "active",                    // "active" | "inactive"
  
  // Timestamps
  createdAt: Timestamp
}
```

#### 3. training_modules Collection

```javascript
{
  id: "m1-mission1",                   // or "custom-mission-timestamp"
  
  // Basic Info
  title: "Mission 1: Basic Navigation",
  category: "Module 1",
  description: "Learn GPS navigation and waypoint following",
  
  // Mission Settings
  difficulty: "Beginner",              // "Beginner" | "Intermediate" | "Advanced"
  duration: "5-10 minutes",
  xpReward: 100,
  passScore: 70,                       // Minimum score to pass (percentage)
  
  // Boat Requirements
  boatType: "medium",                  // "small" | "medium" | "large"
  
  // Mission Steps (Waypoints)
  missionSteps: [
    {
      instruction: "Navigate to 7.11°N, 125.74°E",
      waypointZone: "m1-step-1",
      type: "gps",                     // "gps" | "compass" | "dock"
      lat: "7.1100",
      lon: "125.7400",
      heading: ""
    }
  ],
  
  // Buoy Checkpoints (for Q key interaction)
  buoyCheckpoints: [
    {
      id: "buoy-1",
      waypointZone: "custom-mission-buoy-1",
      requireInteraction: "photograph", // "photograph" | "verify_id" | "remove_debris" | "inspect_buoy"
      imageSrc: "data:image/jpeg;base64,...",
      name: "Crab Pot #482",
      description: "Identify this buoy type..."
    }
  ],
  
  // Creator Info
  createdBy: "instructor_doc_id",
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

#### 4. mission_scores Collection

```javascript
{
  id: "auto_generated_id",
  
  // References
  studentId: "student_doc_id",
  missionId: "m1-mission1",
  
  // Performance Metrics
  score: 87,                          // Overall score (0-100)
  passed: true,                       // score >= passScore
  
  // Detailed Breakdown
  steeringPrecision: 92,              // 0-100
  courseAccuracy: 88,                 // 0-100
  collisionCount: 0,
  timeEfficiency: 85,                 // 0-100
  
  // Additional Metrics
  timeSpent: 600,                     // seconds
  violations: [],                     // Array of violation strings
  
  // Timestamp
  completedAt: Timestamp
}
```

#### 5. quizzes Collection

```javascript
{
  id: "auto_generated_id",
  
  // Basic Info
  title: "Navigation Basics Quiz",
  moduleId: "m1-mission1",            // Optional: link to mission
  
  // Questions Array
  questions: [
    {
      id: "q1",
      prompt: "What does GPS stand for?",
      type: "multiple-choice",        // "multiple-choice" | "true-false" | "fill-in-the-blank"
      options: [
        { text: "Global Positioning System", isCorrect: true },
        { text: "General Position System", isCorrect: false },
        { text: "Global Position Signal", isCorrect: false }
      ],
      correctAnswer: "Global Positioning System"
    },
    {
      id: "q2",
      prompt: "A compass always points to the North Pole",
      type: "true-false",
      correctAnswer: "False"
    },
    {
      id: "q3",
      prompt: "The unit of speed used by ships is called a ____",
      type: "fill-in-the-blank",
      correctAnswer: "knot"            // Case-insensitive matching
    }
  ],
  
  // Creator Info
  createdBy: "instructor_doc_id",
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

#### 6. quiz_scores Collection

```javascript
{
  id: "auto_generated_id",
  
  // References
  studentId: "student_doc_id",
  quizId: "quiz_doc_id",
  
  // Results
  score: 85,                          // Percentage (0-100)
  passed: true,                       // score >= 70%
  
  // Submission Details
  answers: [
    "Global Positioning System",
    "False",
    "knot"
  ],
  
  // Timestamp
  submittedAt: Timestamp
}
```

### Database Relationships

```
students
  └─ instructorid → instructors.id
  └─ completed missions → training_modules.id[]

instructors
  └─ created missions → training_modules.id[]

training_modules
  └─ createdBy → instructors.id
  └─ has quiz → quizzes.id

mission_scores
  └─ studentId → students.id
  └─ missionId → training_modules.id

quizzes
  └─ moduleId → training_modules.id
  └─ createdBy → instructors.id

quiz_scores
  └─ studentId → students.id
  └─ quizId → quizzes.id
```

---

## API Reference

### Base URL

```
http://localhost:3001/api/v1
```

### Authentication Endpoints

#### POST /auth/instructor-login

Login for instructors.

**Request:**
```json
{
  "email": "jocel@helmquest.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "message": "Login successful",
  "instructor": {
    "id": "instructor_id",
    "name": "JOcel Sebial",
    "email": "jocel@helmquest.com",
    "status": "active"
  }
}
```

### Student Endpoints

#### POST /students/signup

Student registration (status: pending).

**Request:**
```json
{
  "studentId": "DNSC2026-00334",
  "name": "Kevin Caidic",
  "email": "kevin@dnsc.edu.ph",
  "password": "password123",
  "instructorId": "instructor_doc_id"
}
```

**Response:**
```json
{
  "message": "Account created! Wait for instructor approval.",
  "studentId": "student_doc_id"
}
```

#### POST /students/login

Student login (only if status: active).

**Request:**
```json
{
  "email": "kevin@dnsc.edu.ph",
  "password": "password123"
}
```

**Response:**
```json
{
  "message": "Login successful",
  "student": {
    "id": "student_id",
    "studentId": "DNSC2026-00334",
    "name": "Kevin Caidic",
    "email": "kevin@dnsc.edu.ph",
    "status": "active",
    "xp": 100,
    "rank": "Able Seaman"
  }
}
```

#### GET /students/pending?instructorId={id}

Get pending students for approval.

**Response:**
```json
{
  "students": [
    {
      "id": "student_id",
      "studentId": "DNSC2026-00335",
      "name": "New Student",
      "email": "new@dnsc.edu.ph",
      "status": "pending",
      "createdAt": "2026-09-28T10:00:00Z"
    }
  ],
  "count": 1
}
```

#### PUT /students/:id/approve

Approve a pending student.

**Request:**
```json
{
  "instructorId": "instructor_doc_id"
}
```

**Response:**
```json
{
  "message": "Student approved successfully",
  "student": {
    "id": "student_id",
    "status": "active",
    "approvedBy": "instructor_doc_id",
    "approvedAt": "2026-09-28T10:05:00Z"
  }
}
```

#### GET /students/:id/training-summary

Get student training summary (missions and quizzes).

**Response:**
```json
{
  "studentId": "student_id",
  "missions": {
    "completed": 4,
    "total": 6,
    "avgScore": 84
  },
  "quizzes": {
    "completed": 3,
    "total": 5,
    "avgScore": 80
  },
  "latestActivity": "2026-09-28T09:30:00Z"
}
```

#### GET /students/:id/missions-detail

Get detailed mission list for student.

**Response:**
```json
{
  "missions": [
    {
      "missionId": "m1-mission1",
      "title": "Mission 1: Basic Navigation",
      "score": 92,
      "status": "Completed",
      "completedAt": "2026-09-27T10:00:00Z"
    },
    {
      "missionId": "m1-mission2",
      "title": "Mission 2: Port Approach",
      "score": null,
      "status": "Not Started",
      "completedAt": null
    }
  ]
}
```

### Mission Endpoints

#### GET /missions

Get all missions.

**Response:**
```json
{
  "missions": [
    {
      "id": "m1-mission1",
      "title": "Mission 1: Basic Navigation",
      "category": "Module 1",
      "difficulty": "Beginner",
      "duration": "5-10 minutes",
      "xpReward": 100,
      "passScore": 70,
      "boatType": "medium"
    }
  ],
  "count": 1
}
```

#### POST /missions

Create a new mission (instructor/admin only).

**Request:**
```json
{
  "title": "Mission 5: Advanced Navigation",
  "category": "Module 2",
  "difficulty": "Advanced",
  "duration": "15-20 minutes",
  "xpReward": 200,
  "passScore": 75,
  "boatType": "large",
  "missionSteps": [],
  "buoyCheckpoints": [],
  "createdBy": "instructor_id"
}
```

**Response:**
```json
{
  "message": "Mission created successfully",
  "missionId": "custom-mission-1727518800000"
}
```

#### DELETE /missions/:id

Delete a mission.

**Response:**
```json
{
  "message": "Mission deleted successfully"
}
```

### Mission Score Endpoints

#### POST /mission-scores

Save mission completion score.

**Request:**
```json
{
  "studentId": "student_id",
  "missionId": "m1-mission1",
  "score": 87,
  "passed": true,
  "steeringPrecision": 92,
  "courseAccuracy": 88,
  "collisionCount": 0,
  "timeEfficiency": 85,
  "completedAt": "2026-09-28T10:00:00Z"
}
```

**Response:**
```json
{
  "message": "Mission score saved successfully",
  "scoreId": "score_doc_id"
}
```

### Quiz Endpoints

#### GET /quizzes

Get all quizzes.

**Response:**
```json
{
  "quizzes": [
    {
      "id": "quiz_id",
      "title": "Navigation Basics Quiz",
      "moduleId": "m1-mission1",
      "questions": [
        {
          "id": "q1",
          "prompt": "What does GPS stand for?",
          "type": "multiple-choice",
          "options": [],
          "correctAnswer": "Global Positioning System"
        }
      ]
    }
  ]
}
```

#### POST /quizzes

Create a new quiz.

**Request:**
```json
{
  "title": "Navigation Quiz",
  "moduleId": "m1-mission1",
  "questions": [],
  "createdBy": "instructor_id"
}
```

**Response:**
```json
{
  "message": "Quiz created successfully",
  "quizId": "quiz_doc_id"
}
```

### Quiz Score Endpoints

#### POST /quiz-scores

Submit quiz answers.

**Request:**
```json
{
  "studentId": "student_id",
  "quizId": "quiz_id",
  "score": 85,
  "passed": true,
  "answers": ["Global Positioning System", "False", "knot"],
  "submittedAt": "2026-09-28T10:15:00Z"
}
```

**Response:**
```json
{
  "message": "Quiz score saved successfully",
  "scoreId": "score_doc_id"
}
```

---

## Frontend Components

### Main Application Structure

```
src/
├── App.vue                 # Main application component
├── main.js                 # Application entry point
├── style.css               # Global styles
├── landing.css             # Landing page styles
│
├── components/
│   ├── InventoryModal.vue         # Fishing inventory UI
│   ├── PostDockingQuizModal.vue   # Quiz taking interface
│   └── QuizResultsModal.vue       # Quiz results display
│
├── helpers/
│   ├── missionScoring.js          # Mission score calculation
│   ├── performanceManager.js      # Performance tracking
│   ├── missionWaypoints.js        # Waypoint management
│   ├── navigationTraining.js      # Training logic
│   ├── oceanSimulation.js         # Ocean rendering
│   ├── loadBoatModel.js           # Boat 3D models
│   ├── helmCockpit.js             # Helm view
│   └── harborDocks.js             # Harbor scene
│
└── firebase/
    └── config.js                  # Firebase initialization
```

### Key Vue Components

#### App.vue

Main application component containing:
- Landing page
- Student dashboard (5 tabs: Overview, Training Records, Missions, Leaderboards, Certificates)
- Instructor console (5 tabs: Dashboard, Mission Management, Student Management, Quiz Management, Leaderboards)
- 3D simulation scene
- All modals (mission editor, quiz editor, student detail)

**Key Reactive State:**
```javascript
data() {
  return {
    // Screen Management
    activeScreen: 'landing',      // 'landing' | 'dashboard' | 'simulation'
    
    // User Authentication
    isAuthenticated: false,
    currentUser: null,
    userRole: null,               // 'student' | 'instructor' | 'admin'
    
    // Student Dashboard
    studentDashboardTab: 'overview',
    
    // Instructor Console
    instructorTab: 'overview',
    
    // 3D Scene
    scene: null,
    camera: null,
    renderer: null,
    boat: null,
    
    // Mission State
    activeMission: null,
    missionProgress: 0,
    
    // Collections
    students: [],
    instructors: [],
    missions: [],
    quizzes: []
  }
}
```

#### InventoryModal.vue

Displays fishing inventory with caught fish.

**Props:**
```javascript
props: {
  visible: Boolean,
  items: Array
}
```

#### PostDockingQuizModal.vue

Quiz taking interface with multiple question types.

**Props:**
```javascript
props: {
  quiz: Object,
  isVisible: Boolean
}
```

**Emits:**
```javascript
emits: ['close', 'submit']
```

---

## 3D Simulation Features

### Three.js Scene Setup

```javascript
// helpers/oceanSimulation.js

import * as THREE from 'three';
import { Water } from 'three/examples/jsm/objects/Water.js';
import { Sky } from 'three/examples/jsm/objects/Sky.js';

export function createOceanScene() {
  // Scene
  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x87CEEB, 10, 5000);
  
  // Camera
  const camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    10000
  );
  
  // Renderer
  const renderer = new THREE.WebGLRenderer({ 
    antialias: true,
    logarithmicDepthBuffer: true
  });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  
  // Water
  const waterGeometry = new THREE.PlaneGeometry(100000, 100000);
  const water = new Water(waterGeometry, {
    textureWidth: 512,
    textureHeight: 512,
    waterNormals: new THREE.TextureLoader().load('waternormals.jpg'),
    sunDirection: new THREE.Vector3(),
    sunColor: 0xffffff,
    waterColor: 0x001e0f,
    distortionScale: 3.7,
    fog: scene.fog !== undefined
  });
  water.rotation.x = -Math.PI / 2;
  scene.add(water);
  
  // Sky
  const sky = new Sky();
  sky.scale.setScalar(450000);
  scene.add(sky);
  
  return { scene, camera, renderer, water, sky };
}
```

### Boat Physics (Cannon.js)

```javascript
// helpers/loadBoatModel.js

import * as CANNON from 'cannon';

export function setupBoatPhysics(boat) {
  // Physics world
  const world = new CANNON.World();
  world.gravity.set(0, -9.82, 0);
  
  // Boat body
  const boatShape = new CANNON.Box(new CANNON.Vec3(2, 1, 5));
  const boatBody = new CANNON.Body({
    mass: 5000,
    shape: boatShape,
    linearDamping: 0.5,
    angularDamping: 0.8
  });
  
  // Buoyancy force
  world.addEventListener('postStep', () => {
    if (boatBody.position.y < 0) {
      const buoyancy = -boatBody.position.y * 1000;
      boatBody.applyForce(
        new CANNON.Vec3(0, buoyancy, 0),
        boatBody.position
      );
    }
  });
  
  return { world, boatBody };
}
```

### Controls System

```javascript
// Keyboard controls
const controls = {
  forward: false,   // W
  backward: false,  // S
  left: false,      // A
  right: false,     // D
  interact: false,  // Q (scan buoy)
  anchor: false,    // H
  fishing: false,   // F
  net: false,       // N
  inventory: false, // I
  camera: false,    // C
  lights: false     // L
};

document.addEventListener('keydown', (e) => {
  switch(e.key.toLowerCase()) {
    case 'w': controls.forward = true; break;
    case 's': controls.backward = true; break;
    case 'a': controls.left = true; break;
    case 'd': controls.right = true; break;
    case 'q': controls.interact = true; break;
    case 'h': controls.anchor = !controls.anchor; break;
    case 'f': controls.fishing = !controls.fishing; break;
    case 'n': controls.net = !controls.net; break;
    case 'i': controls.inventory = !controls.inventory; break;
    case 'c': controls.camera = !controls.camera; break;
    case 'l': controls.lights = !controls.lights; break;
  }
});
```

### Performance Tracking

```javascript
// helpers/performanceManager.js

export class PerformanceManager {
  constructor() {
    this.steeringData = [];
    this.courseData = [];
    this.collisions = 0;
    this.startTime = Date.now();
  }
  
  trackSteering(angle) {
    // Track steering smoothness
    this.steeringData.push(Math.abs(angle));
  }
  
  trackCourse(deviation) {
    // Track course accuracy
    this.courseData.push(deviation);
  }
  
  recordCollision() {
    this.collisions++;
  }
  
  generateReport() {
    const steeringPrecision = this.calculateSteeringPrecision();
    const courseAccuracy = this.calculateCourseAccuracy();
    const collisionPenalty = Math.max(0, 100 - (this.collisions * 10));
    const timeEfficiency = this.calculateTimeEfficiency();
    
    const finalScore = (
      steeringPrecision * 0.30 +
      courseAccuracy * 0.30 +
      collisionPenalty * 0.20 +
      timeEfficiency * 0.20
    );
    
    return {
      score: Math.round(finalScore),
      steeringPrecision,
      courseAccuracy,
      collisionCount: this.collisions,
      timeEfficiency
    };
  }
}
```

---

## User Flows

### Student Registration Flow

```
1. Click "Student Portal" on landing page
2. Click "Sign Up" button
3. Fill registration form:
   - Student ID (e.g., DNSC2026-00334)
   - Full Name
   - Email (@dnsc.edu.ph required)
   - Password
   - Select Instructor from dropdown
4. Submit form
5. Account created with status: "pending"
6. Wait for instructor approval
7. Instructor approves in console
8. Status changes to "active"
9. Student can now login
```

### Mission Completion Flow

```
1. Student logs in → Dashboard
2. Navigate to "Missions" tab
3. Click on available mission card
4. Select boat type (Small/Medium/Large)
5. Read mission briefing
6. Click "Start Mission"
7. 3D ocean scene loads
8. Boat spawns at harbor
9. Green waypoint markers appear
10. Navigate using W/A/S/D keys
11. Reach waypoint zone
12. Press Q to scan buoy
13. Waypoint marker disappears
14. Repeat for all waypoints
15. Mission complete modal appears
16. Performance score calculated
17. XP awarded
18. Rank updated if threshold met
19. Quiz button appears (if quiz exists)
20. Take quiz and submit
21. Return to dashboard
```

### Instructor Mission Creation Flow

```
1. Instructor logs in → Console
2. Navigate to "Mission Management" tab
3. Click "+ Create New Mission" button
4. Mission Editor modal opens
5. Fill mission details:
   - Title
   - Difficulty (Beginner/Intermediate/Advanced)
   - Duration estimate
   - XP Reward
   - Pass Score (%)
   - Required Boat Type
6. Add buoy checkpoints:
   - Waypoint ID
   - Interaction type
   - Upload buoy image
   - Name and description
7. Click "Save Mission"
8. Mission saved to Firestore
9. Mission appears in student dashboard
10. (Optional) Click "Create Quiz" for this mission
11. Add questions in Quiz Editor
12. Save quiz
```

---

## Gamification System

### XP and Rank System

```javascript
// Rank thresholds
const RANKS = [
  { id: 0, name: 'Deck Hand', minXP: 0, maxXP: 99 },
  { id: 1, name: 'Ordinary Seaman (OS)', minXP: 100, maxXP: 299 },
  { id: 2, name: 'Able Seaman (AB)', minXP: 300, maxXP: 599 },
  { id: 3, name: 'Bosun', minXP: 600, maxXP: 999 },
  { id: 4, name: 'Third Mate', minXP: 1000, maxXP: 1999 },
  { id: 5, name: 'Second Mate', minXP: 2000, maxXP: 4999 },
  { id: 6, name: 'Chief Mate', minXP: 5000, maxXP: 9999 },
  { id: 7, name: 'Master/Captain', minXP: 10000, maxXP: Infinity }
];

// Calculate rank from XP
function getRankFromXP(xp) {
  for (let rank of RANKS) {
    if (xp >= rank.minXP && xp <= rank.maxXP) {
      return rank;
    }
  }
  return RANKS[RANKS.length - 1]; // Master/Captain
}

// Award XP after mission
async function awardXP(studentId, missionXP) {
  const studentRef = db.collection('students').doc(studentId);
  const student = await studentRef.get();
  const currentXP = student.data().xp || 0;
  const newXP = currentXP + missionXP;
  const newRank = getRankFromXP(newXP);
  
  await studentRef.update({
    xp: newXP,
    rank: newRank.name,
    rankId: newRank.id
  });
  
  return {
    previousXP: currentXP,
    newXP,
    xpGained: missionXP,
    rankUp: newRank.id > getRankFromXP(currentXP).id,
    newRank: newRank.name
  };
}
```

### Leaderboard Sorting

```javascript
// Sort leaderboard by XP (descending), then by avgScore (descending)
function sortLeaderboard(students) {
  return students.sort((a, b) => {
    if (b.xp !== a.xp) {
      return b.xp - a.xp;  // Higher XP first
    }
    return b.avgScore - a.avgScore;  // Higher score as tiebreaker
  });
}

// Filter leaderboard by instructor
function getClassLeaderboard(students, instructorId) {
  return students
    .filter(s => s.instructorid === instructorId && s.status === 'active')
    .sort(sortLeaderboard);
}

// Global leaderboard (all students)
function getGlobalLeaderboard(students) {
  return students
    .filter(s => s.status === 'active')
    .sort(sortLeaderboard);
}
```

---

## Security & Authentication

### Password Hashing

```javascript
// Backend - User registration
import bcrypt from 'bcrypt';

const SALT_ROUNDS = 10;

// Hash password
const hashedPassword = await bcrypt.hash(plainPassword, SALT_ROUNDS);

// Verify password
const isMatch = await bcrypt.compare(plainPassword, hashedPassword);
```

### CORS Configuration

```javascript
// Backend - server.js
const corsOptions = {
  origin: [
    'http://localhost:5174',
    'http://localhost:5175'
  ],
  credentials: true,
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));
```

### Email Validation

```javascript
// Student email must end with @dnsc.edu.ph
if (!email.endsWith('@dnsc.edu.ph')) {
  return res.status(400).json({ 
    error: 'Email must be a valid DNSC email address' 
  });
}

// Instructor email must include @helmquest
if (!email.includes('@helmquest')) {
  return res.status(400).json({ 
    error: 'Invalid instructor email domain' 
  });
}
```

### Session Management

```javascript
// Frontend - localStorage
function loginStudent(studentData) {
  localStorage.setItem('helmquest_user', JSON.stringify({
    id: studentData.id,
    name: studentData.name,
    email: studentData.email,
    role: 'student',
    xp: studentData.xp,
    rank: studentData.rank
  }));
  localStorage.setItem('helmquest_token', studentData.id);
}

function logout() {
  localStorage.removeItem('helmquest_user');
  localStorage.removeItem('helmquest_token');
  window.location.href = '/';
}

function checkAuth() {
  const user = localStorage.getItem('helmquest_user');
  return user ? JSON.parse(user) : null;
}
```

---

## Testing Guide

### Manual Testing Checklist

#### Student Flow Testing
- [ ] Register new student account
- [ ] Verify pending status
- [ ] Instructor approves student
- [ ] Login with approved account
- [ ] View dashboard overview
- [ ] Select and start mission
- [ ] Complete mission successfully
- [ ] Verify score calculation
- [ ] Verify XP awarded
- [ ] Verify rank update (if applicable)
- [ ] Take quiz after mission
- [ ] View training records
- [ ] View leaderboards
- [ ] Check class ranking
- [ ] Check global ranking

#### Instructor Flow Testing
- [ ] Login as instructor
- [ ] View dashboard analytics
- [ ] View pending students
- [ ] Approve/reject student
- [ ] Create new mission
- [ ] Add buoy checkpoints
- [ ] Upload buoy images
- [ ] Save mission
- [ ] Create quiz for mission
- [ ] Add multiple choice questions
- [ ] Add true/false questions
- [ ] Add fill-in-the-blank questions
- [ ] Save quiz
- [ ] View student list
- [ ] Open student detail modal
- [ ] View student mission history
- [ ] View student quiz results
- [ ] Export CSV report
- [ ] Edit existing mission
- [ ] Delete mission
- [ ] View leaderboards

#### 3D Simulation Testing
- [ ] Boat spawns correctly
- [ ] W/A/S/D controls work
- [ ] Boat physics feel realistic
- [ ] Waypoint markers visible
- [ ] Press Q to scan buoy works
- [ ] HUD displays correct data
- [ ] Performance tracking works
- [ ] Camera switching (C key) works
- [ ] Collision detection works
- [ ] Mission completion triggers
- [ ] Free roam mode works

### Backend API Testing

```bash
# Health check
curl http://localhost:3001/health

# Student registration
curl -X POST http://localhost:3001/api/v1/students/signup \
  -H "Content-Type: application/json" \
  -d '{
    "studentId": "TEST-001",
    "name": "Test Student",
    "email": "test@dnsc.edu.ph",
    "password": "password123",
    "instructorId": "instructor_id"
  }'

# Student login
curl -X POST http://localhost:3001/api/v1/students/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@dnsc.edu.ph",
    "password": "password123"
  }'

# Get missions
curl http://localhost:3001/api/v1/missions

# Save mission score
curl -X POST http://localhost:3001/api/v1/mission-scores \
  -H "Content-Type: application/json" \
  -d '{
    "studentId": "student_id",
    "missionId": "m1-mission1",
    "score": 87,
    "passed": true,
    "steeringPrecision": 92,
    "courseAccuracy": 88,
    "collisionCount": 0,
    "timeEfficiency": 85
  }'
```

---

## Deployment

### Production Build

#### Frontend Build

```bash
# Build for production
npm run build

# Output will be in dist/ folder
# Upload dist/ contents to web server or hosting service
```

#### Backend Deployment

```bash
cd backend

# Set production environment
export NODE_ENV=production

# Update .env file with production values
# PORT=3001
# FIREBASE_PROJECT_ID=your-production-project

# Start production server
npm start

# Or use PM2 for process management
npm install -g pm2
pm2 start server.js --name helmquest-api
pm2 save
pm2 startup
```

### Firebase Production Setup

1. **Create Production Firebase Project**
2. **Update Security Rules:**

```javascript
// Firestore Security Rules
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Students can read own data
    match /students/{studentId} {
      allow read: if request.auth != null && request.auth.uid == studentId;
      allow write: if request.auth != null && request.auth.uid == studentId;
    }
    
    // Instructors can read their students
    match /students/{studentId} {
      allow read: if request.auth != null && 
        get(/databases/$(database)/documents/students/$(studentId)).data.instructorid == request.auth.uid;
    }
    
    // Anyone can read missions
    match /training_modules/{missionId} {
      allow read: if true;
      allow write: if request.auth != null;
    }
    
    // Mission scores
    match /mission_scores/{scoreId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null;
    }
    
    // Quizzes
    match /quizzes/{quizId} {
      allow read: if true;
      allow write: if request.auth != null;
    }
    
    // Quiz scores
    match /quiz_scores/{scoreId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null;
    }
  }
}
```

### Environment Variables

**Production .env:**
```env
PORT=3001
API_PREFIX=/api/v1
NODE_ENV=production
ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
FIREBASE_PROJECT_ID=helmquest-prod
```

---

## Troubleshooting

### Common Issues

#### Issue: 3D scene not loading

**Symptoms:**
- Black screen
- Console error: "WebGL not supported"

**Solution:**
```javascript
// Check WebGL support
if (!WEBGL.isWebGLAvailable()) {
  alert('Your browser does not support WebGL. Please use Chrome, Firefox, or Edge.');
}
```

#### Issue: Student cannot login after registration

**Symptoms:**
- "Invalid credentials" error
- Account exists in database

**Solution:**
- Check student status in Firestore (must be "active", not "pending")
- Instructor must approve the student account first

#### Issue: Mission score not saving

**Symptoms:**
- Mission completes but score doesn't appear
- Console error: "Failed to save score"

**Solution:**
```javascript
// Check API connection
console.log('API URL:', import.meta.env.VITE_API_URL);

// Verify Firestore permissions
// Check Firebase console → Firestore → Rules
```

#### Issue: Leaderboard shows incorrect rankings

**Symptoms:**
- Student with lower XP appears higher
- Rankings don't update

**Solution:**
```javascript
// Force leaderboard refresh
async function refreshLeaderboard() {
  const snapshot = await db.collection('students')
    .where('status', '==', 'active')
    .get();
  
  const students = snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));
  
  // Sort by XP descending, then avgScore descending
  students.sort((a, b) => {
    if (b.xp !== a.xp) return b.xp - a.xp;
    return b.avgScore - a.avgScore;
  });
  
  this.leaderboard = students;
}
```

#### Issue: Quiz questions not displaying

**Symptoms:**
- Quiz modal opens but shows no questions
- Console error: "Cannot read property 'questions' of undefined"

**Solution:**
```javascript
// Check quiz data structure
if (!quiz || !quiz.questions || quiz.questions.length === 0) {
  console.error('Invalid quiz data:', quiz);
  alert('This quiz has no questions. Contact your instructor.');
  return;
}
```

### Debug Mode

Enable debug logging:

```javascript
// App.vue - Add to mounted()
mounted() {
  if (import.meta.env.DEV) {
    window.DEBUG = true;
    console.log('Debug mode enabled');
    console.log('API URL:', import.meta.env.VITE_API_URL);
    console.log('Firebase Config:', this.firebaseConfig);
  }
}
```

### Performance Optimization

```javascript
// Reduce ocean polygon count for low-end devices
const waterGeometry = new THREE.PlaneGeometry(
  10000, 10000,
  window.innerWidth < 1920 ? 32 : 64,  // Less polygons on smaller screens
  window.innerWidth < 1920 ? 32 : 64
);

// Disable shadows on low-end devices
if (window.devicePixelRatio < 2) {
  renderer.shadowMap.enabled = false;
}

// Reduce water texture quality
const water = new Water(waterGeometry, {
  textureWidth: window.innerWidth < 1920 ? 256 : 512,
  textureHeight: window.innerWidth < 1920 ? 256 : 512,
  // ... other options
});
```

---

## Support & Contact

For issues, questions, or feature requests:

- **GitHub Issues:** https://github.com/your-repo/helmquest/issues
- **Email:** support@helmquest.com
- **Documentation:** https://docs.helmquest.com

---

## License

Copyright © 2026 HelmQuest Maritime Training System  
All rights reserved.

---

## Changelog

### Version 1.0.0 (2026-09-28)
- ✅ Initial release
- ✅ Student registration and approval system
- ✅ Instructor console with analytics
- ✅ Mission creator with buoy checkpoints
- ✅ Quiz system (multiple choice, true/false, fill-in)
- ✅ 3D ocean simulation with Three.js
- ✅ Performance tracking and scoring
- ✅ XP and rank progression system
- ✅ Leaderboards (class and global)
- ✅ Student management with detailed performance views
- ✅ Certificate generation

---

**End of Documentation** 🚢⚓🌊
