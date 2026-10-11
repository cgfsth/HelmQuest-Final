// Quiz Assignments Routes
import express from 'express';
import { db } from '../config/firebase-admin.js';

const router = express.Router();

function getEquivalentModuleIds(moduleId) {
  if (!moduleId || typeof moduleId !== 'string') return [];

  const normalized = moduleId.trim();
  const values = new Set();

  if (normalized) values.add(normalized);
  if (normalized.replace(/^CUSTOM-/i, '')) values.add(normalized.replace(/^CUSTOM-/i, ''));
  values.add(normalized.startsWith('CUSTOM-') ? normalized : `CUSTOM-${normalized}`);

  return [...values].filter(Boolean);
}

// POST /api/v1/quiz-assignments - Create quiz assignment
router.post('/', async (req, res) => {
  try {
    const { quizId, targetId, targetType, createdBy } = req.body;
    
    // Validate required fields
    if (!quizId || !targetId || !targetType) {
      return res.status(400).json({ 
        error: 'Bad Request', 
        message: 'quizId, targetId, and targetType are required' 
      });
    }
    
    // Check if assignment already exists
    const existingSnapshot = await db.collection('quiz_assignments')
      .where('quizId', '==', quizId)
      .where('targetId', '==', targetId)
      .get();
    
    if (!existingSnapshot.empty) {
      // Assignment already exists, return existing
      const existingDoc = existingSnapshot.docs[0];
      return res.json({ 
        message: 'Assignment already exists',
        assignmentId: existingDoc.id,
        assignment: { id: existingDoc.id, ...existingDoc.data() }
      });
    }
    
    // Create new assignment
    const assignmentData = {
      quizId,
      targetId,
      targetType,
      createdBy: createdBy || 'system',
      createdAt: new Date()
    };
    
    const docRef = await db.collection('quiz_assignments').add(assignmentData);
    
    res.status(201).json({ 
      message: 'Quiz assignment created', 
      assignmentId: docRef.id,
      assignment: { id: docRef.id, ...assignmentData }
    });
    
  } catch (error) {
    console.error('[quiz_assignments] POST error:', error);
    res.status(500).json({ error: 'Server Error', message: error.message });
  }
});

// GET /api/v1/quiz-assignments - Get all quiz assignments
router.get('/', async (req, res) => {
  try {
    const { quizId, targetId, targetType } = req.query;
    
    let query = db.collection('quiz_assignments');
    
    if (quizId) query = query.where('quizId', '==', quizId);
    if (targetType) query = query.where('targetType', '==', targetType);

    const snapshot = await query.get();
    let assignments = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    if (targetId) {
      const equivalentIds = getEquivalentModuleIds(String(targetId));
      assignments = assignments.filter((assignment) => {
        const values = Array.isArray(assignment.targetId) ? assignment.targetId : [assignment.targetId];
        return values.some((value) => equivalentIds.includes(value));
      });
    }
    
    res.json({ assignments, count: assignments.length });
    
  } catch (error) {
    console.error('[quiz_assignments] GET error:', error);
    res.status(500).json({ error: 'Server Error', message: error.message });
  }
});

// DELETE /api/v1/quiz-assignments/:id - Delete assignment
router.delete('/:id', async (req, res) => {
  try {
    await db.collection('quiz_assignments').doc(req.params.id).delete();
    res.json({ message: 'Assignment deleted successfully' });
  } catch (error) {
    console.error('[quiz_assignments] DELETE error:', error);
    res.status(500).json({ error: 'Server Error', message: error.message });
  }
});

export default router;
