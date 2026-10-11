// HelmQuest REST API Server
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Import routes
import authRoutes from './routes/auth.js';
import studentsRoutes from './routes/students.js';
import instructorsRoutes from './routes/instructors.js';
import modulesRoutes from './routes/modules.js';
import missionsRoutes from './routes/missions.js';
import attemptsRoutes from './routes/attempts.js';
import quizzesRoutes from './routes/quizzes.js';
import quizAssignmentsRoutes from './routes/quiz_assignments.js';
import progressRoutes from './routes/progress.js';
import adminRoutes from './routes/admin.js';
import missionScoresRoutes from './routes/mission_scores.js';
import quizScoresRoutes from './routes/quiz_scores.js';

// Import Firebase Admin initialization
import './config/firebase-admin.js';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3001;
const API_PREFIX = process.env.API_PREFIX || '/api/v1';

// ============================================================================
// MIDDLEWARE
// ============================================================================

// Security middleware
app.use(helmet());

// CORS configuration
const corsOptions = {
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:5174', 'http://localhost:5175'],
  credentials: true,
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));

// Body parsing middleware
// Mission buoy images are sent as compressed data URLs in the JSON payload.
app.use(express.json({ limit: '8mb' }));
app.use(express.urlencoded({ extended: true }));

// Logging middleware
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// ============================================================================
// ROUTES
// ============================================================================

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    message: 'HelmQuest API is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// API routes
app.use(`${API_PREFIX}/auth`, authRoutes);
app.use(`${API_PREFIX}/students`, studentsRoutes);
app.use(`${API_PREFIX}/instructors`, instructorsRoutes);
app.use(`${API_PREFIX}/modules`, modulesRoutes);
app.use(`${API_PREFIX}/missions`, missionsRoutes);
app.use(`${API_PREFIX}/attempts`, attemptsRoutes);
app.use(`${API_PREFIX}/quizzes`, quizzesRoutes);
app.use(`${API_PREFIX}/quiz-assignments`, quizAssignmentsRoutes); // Quiz assignment linking
app.use(`${API_PREFIX}/quiz-submissions`, quizzesRoutes); // Training Records - Quiz submissions by student
app.use(`${API_PREFIX}/progress`, progressRoutes);
app.use(`${API_PREFIX}/admin`, adminRoutes);
app.use(`${API_PREFIX}/mission-scores`, missionScoresRoutes);
app.use(`${API_PREFIX}/quiz-scores`, quizScoresRoutes);

// API documentation endpoint
app.get(`${API_PREFIX}`, (req, res) => {
  res.json({
    message: 'HelmQuest REST API',
    version: '1.0.0',
    endpoints: {
      auth: `${API_PREFIX}/auth`,
      students: `${API_PREFIX}/students`,
      instructors: `${API_PREFIX}/instructors`,
      modules: `${API_PREFIX}/modules`,
      missions: `${API_PREFIX}/missions`,
      attempts: `${API_PREFIX}/attempts`,
      quizzes: `${API_PREFIX}/quizzes`,
      progress: `${API_PREFIX}/progress`,
      missionScores: `${API_PREFIX}/mission-scores`
    },
    documentation: 'https://github.com/your-repo/helmquest-api'
  });
});

// ============================================================================
// ERROR HANDLING
// ============================================================================

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.method} ${req.url} not found`,
    timestamp: new Date().toISOString()
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';
  
  res.status(statusCode).json({
    error: err.name || 'Error',
    message: message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    timestamp: new Date().toISOString()
  });
});

// ============================================================================
// START SERVER
// ============================================================================

app.listen(PORT, () => {
  console.log('════════════════════════════════════════════════════════');
  console.log('🚀 HelmQuest REST API Server');
  console.log('════════════════════════════════════════════════════════');
  console.log(`📡 Server running on: http://localhost:${PORT}`);
  console.log(`🔗 API endpoint: http://localhost:${PORT}${API_PREFIX}`);
  console.log(`🏥 Health check: http://localhost:${PORT}/health`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔥 Firebase Project: ${process.env.FIREBASE_PROJECT_ID}`);
  console.log('════════════════════════════════════════════════════════');
});

export default app;