// Mission Attempts Routes
import express from 'express';
import { db } from '../config/firebase-admin.js';

const router = express.Router();

// GET /api/v1/attempts - Get mission attempts
router.get('/', async (req, res) => {
  try {
    const { studentId, missionId } = req.query;
    let query = db.collection('mission_attempts');
    
    if (studentId) query = query.where('studentid', '==', studentId);
    if (missionId) query = query.where('missionid', '==', missionId);
    
    const snapshot = await query.orderBy('completedat', 'desc').get();
    const attempts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json({ attempts, count: attempts.length });
  } catch (error) {
    res.status(500).json({ error: 'Server Error', message: error.message });
  }
});

// GET /api/v1/attempts/:id - Get attempt by ID
router.get('/:id', async (req, res) => {
  try {
    const doc = await db.collection('mission_attempts').doc(req.params.id).get();
    if (!doc.exists) return res.status(404).json({ error: 'Not Found', message: 'Attempt not found' });
    res.json({ attempt: { id: doc.id, ...doc.data() } });
  } catch (error) {
    res.status(500).json({ error: 'Server Error', message: error.message });
  }
});

// POST /api/v1/attempts - Create mission attempt
router.post('/', async (req, res) => {
  try {
    const attemptData = { ...req.body, completedat: new Date() };
    const docRef = await db.collection('mission_attempts').add(attemptData);
    
    // Update student module progress
    if (attemptData.passed && attemptData.moduleid) {
      const progressId = `${attemptData.studentid}_${attemptData.moduleid}`;
      await db.collection('student_module_progress').doc(progressId).set({
        studentid: attemptData.studentid,
        moduleid: attemptData.moduleid,
        status: 'completed',
        highestScore: attemptData.score,
        completedat: new Date()
      }, { merge: true });
    }
    
    res.status(201).json({ message: 'Attempt recorded', attemptId: docRef.id });
  } catch (error) {
    res.status(500).json({ error: 'Server Error', message: error.message });
  }
});

export default router;