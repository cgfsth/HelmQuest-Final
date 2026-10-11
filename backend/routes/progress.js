// Progress Routes
import express from 'express';
import { db } from '../config/firebase-admin.js';
import { loadRankSettings, synchronizeStudentProgression } from '../services/progression.js';

const router = express.Router();

// GET /api/v1/progress/student/:studentId - Get student progress
router.get('/student/:studentId', async (req, res) => {
  try {
    const { studentId } = req.params;
    
    // Get student data
    const rankSettings = await loadRankSettings();
    const student = await synchronizeStudentProgression(db.collection('students').doc(studentId), rankSettings);
    if (!student) {
      return res.status(404).json({ error: 'Not Found', message: 'Student not found' });
    }
    
    // Get completed modules
    const progressSnapshot = await db.collection('student_module_progress')
      .where('studentid', '==', studentId)
      .where('status', '==', 'completed')
      .get();
    const completedModules = progressSnapshot.docs.map(doc => doc.data().moduleid);
    
    // Get mission attempts
    const attemptsSnapshot = await db.collection('mission_attempts')
      .where('studentid', '==', studentId)
      .orderBy('completedat', 'desc')
      .get();
    const attempts = attemptsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    // Get quiz submissions
    const submissionsSnapshot = await db.collection('quiz_score')
      .where('studentid', '==', studentId)
      .get();
    const submissions = submissionsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    res.json({
      student,
      rankSettings,
      completedModules,
      attempts,
      submissions
    });
  } catch (error) {
    res.status(500).json({ error: 'Server Error', message: error.message });
  }
});

// GET /api/v1/progress/module/:moduleId/students - Get module progress for all students
router.get('/module/:moduleId/students', async (req, res) => {
  try {
    const { moduleId } = req.params;
    
    const snapshot = await db.collection('student_module_progress')
      .where('moduleid', '==', moduleId)
      .get();
    
    const progress = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json({ progress, count: progress.length });
  } catch (error) {
    res.status(500).json({ error: 'Server Error', message: error.message });
  }
});

// GET /api/v1/progress/course-settings - Get course settings
router.get('/course-settings', async (req, res) => {
  try {
    const doc = await db.collection('course_settings').doc('global').get();
    
    if (!doc.exists) {
      return res.json({
        settings: {
          sequentialUnlock: true,
          autoAwardBadgesAndCerts: true,
          lockedModuleIds: [],
          moduleOrder: [],
          passingThreshold: 70,
          maxRetakes: -1
        }
      });
    }
    
    res.json({ settings: doc.data() });
  } catch (error) {
    res.status(500).json({ error: 'Server Error', message: error.message });
  }
});

// PUT /api/v1/progress/course-settings - Update course settings
router.put('/course-settings', async (req, res) => {
  try {
    await db.collection('course_settings').doc('global').set({
      ...req.body,
      updatedAt: new Date(),
      updatedBy: req.body.updatedBy || 'admin'
    }, { merge: true });
    
    res.json({ message: 'Course settings updated successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Server Error', message: error.message });
  }
});

export default router;
