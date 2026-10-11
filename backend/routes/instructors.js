// Instructors Routes
import express from 'express';
import { db } from '../config/firebase-admin.js';
import { loadInstructorOverview } from '../services/instructorOverview.js';
import { loadInstructorStudentManagement, loadStudentTrainingRecord } from '../services/studentTrainingRecords.js';
import { requireMissionUser, requireOwnClass } from '../middleware/missionAccess.js';

const router = express.Router();

router.get('/:id/student-management', requireMissionUser, requireOwnClass, async (req, res) => {
  try {
    const data = await loadInstructorStudentManagement(db, req.params.id);
    if (!data) return res.status(404).json({ error: 'Not Found', message: 'Instructor not found' });
    res.json(data);
  } catch (error) { res.status(500).json({ error: 'Server Error', message: error.message }); }
});
router.get('/:id/students/:studentId/training-record', requireMissionUser, requireOwnClass, async (req, res) => {
  try {
    const student = await loadStudentTrainingRecord(db, req.params.studentId, req.params.id);
    if (!student) return res.status(404).json({ error: 'Not Found', message: 'Student not found in this class' });
    res.json({ student });
  } catch (error) { res.status(500).json({ error: 'Server Error', message: error.message }); }
});

// Read-only class summary from saved mission/quiz results.
router.get('/:id/overview', requireMissionUser, requireOwnClass, async (req, res) => {
  try {
    const overview = await loadInstructorOverview(db, req.params.id);
    if (!overview) return res.status(404).json({ error: 'Not Found', message: 'Instructor not found' });
    res.json(overview);
  } catch (error) {
    res.status(500).json({ error: 'Server Error', message: error.message });
  }
});

// GET /api/v1/instructors - Get all instructors
router.get('/', async (req, res) => {
  try {
    const snapshot = await db.collection('instructor').get();
    const instructors = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json({ instructors, count: instructors.length });
  } catch (error) {
    res.status(500).json({ error: 'Server Error', message: error.message });
  }
});

// GET /api/v1/instructors/:id - Get instructor by ID
router.get('/:id', async (req, res) => {
  try {
    const doc = await db.collection('instructor').doc(req.params.id).get();
    if (!doc.exists) return res.status(404).json({ error: 'Not Found', message: 'Instructor not found' });
    res.json({ instructor: { id: doc.id, ...doc.data() } });
  } catch (error) {
    res.status(500).json({ error: 'Server Error', message: error.message });
  }
});

// GET /api/v1/instructors/:id/students - Get instructor's students
router.get('/:id/students', async (req, res) => {
  try {
    const snapshot = await db.collection('students').where('instructorid', '==', req.params.id).get();
    const students = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json({ students, count: students.length });
  } catch (error) {
    res.status(500).json({ error: 'Server Error', message: error.message });
  }
});

export default router;
