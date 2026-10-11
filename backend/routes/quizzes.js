// Quizzes Routes
import express from 'express';
import { db } from '../config/firebase-admin.js';
import { saveQuizResult, saveQuizGrade } from '../services/scorePersistence.js';

const router = express.Router();

// GET /api/v1/quizzes - Get all quizzes
router.get('/', async (req, res) => {
  try {
    const snapshot = await db.collection('quiz').get();
    const quizzes = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json({ quizzes, count: quizzes.length });
  } catch (error) {
    res.status(500).json({ error: 'Server Error', message: error.message });
  }
});

// GET /api/v1/quizzes/by-module/:moduleId - Get quiz by moduleId (DIRECT QUERY - No assignment needed)
router.get('/by-module/:moduleId', async (req, res) => {
  try {
    const moduleId = req.params.moduleId;
    console.log('🔍 [DIRECT QUERY] Looking for quiz with moduleId:', moduleId);
    
    // Query quizzes where moduleId field matches (handles both string and array formats)
    const snapshot = await db.collection('quiz')
      .where('moduleId', '==', moduleId)
      .limit(1)
      .get();
    
    if (snapshot.empty) {
      console.log('❌ [DIRECT QUERY] No quiz found for moduleId:', moduleId);
      return res.status(404).json({ 
        error: 'Not Found', 
        message: `No quiz found for module ${moduleId}` 
      });
    }
    
    const doc = snapshot.docs[0];
    const quiz = { id: doc.id, ...doc.data() };
    console.log('✅ [DIRECT QUERY] Found quiz:', { 
      id: quiz.id, 
      title: quiz.title,
      questionsCount: quiz.questions?.length 
    });
    
    res.json({ quiz });
  } catch (error) {
    console.error('❌ [DIRECT QUERY] Error:', error);
    res.status(500).json({ error: 'Server Error', message: error.message });
  }
});

// GET /api/v1/quizzes/:id - Get quiz by ID
router.get('/:id', async (req, res) => {
  try {
    const doc = await db.collection('quiz').doc(req.params.id).get();
    if (!doc.exists) return res.status(404).json({ error: 'Not Found', message: 'Quiz not found' });
    res.json({ quiz: { id: doc.id, ...doc.data() } });
  } catch (error) {
    res.status(500).json({ error: 'Server Error', message: error.message });
  }
});

// POST /api/v1/quizzes - Create quiz
router.post('/', async (req, res) => {
  try {
    const quizData = { ...req.body, createdAt: new Date() };
    const docRef = await db.collection('quiz').add(quizData);
    res.status(201).json({ message: 'Quiz created', quizId: docRef.id });
  } catch (error) {
    res.status(500).json({ error: 'Server Error', message: error.message });
  }
});

// PUT /api/v1/quizzes/:id - Update quiz
router.put('/:id', async (req, res) => {
  try {
    await db.collection('quiz').doc(req.params.id).update({ ...req.body, updatedAt: new Date() });
    res.json({ message: 'Quiz updated successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Server Error', message: error.message });
  }
});

// DELETE /api/v1/quizzes/:id - Delete quiz
router.delete('/:id', async (req, res) => {
  try {
    await db.collection('quiz').doc(req.params.id).delete();
    res.json({ message: 'Quiz deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Server Error', message: error.message });
  }
});

// POST /api/v1/quizzes/:id/submit - Submit quiz answers
router.post('/:id/submit', async (req, res) => {
  try {
    const { studentId, studentName, answers, moduleId, missionId, score, correctCount, totalQuestions } = req.body;
    if (!studentId || !moduleId) {
      return res.status(400).json({ error: 'Bad Request', message: 'studentId and moduleId are required' });
    }
    const submissionData = {
      quizId: req.params.id,
      studentId: studentId,
      studentName: studentName,
      answers,
      moduleId: moduleId,
      ...(missionId ? { missionId } : {}),
      score: score || 0,  // Score percentage (0-100)
      'Quiz-score-percentage': score || 0,
      'raw-score': correctCount || 0,
      correctAnswers: correctCount || 0,  // Number of correct answers (aligned with quiz_score schema)
      totalQuestions: totalQuestions || 0,  // Total number of questions
      completedAt: new Date(),  // Aligned with quiz_score schema
      createdAt: new Date(),  // Aligned with quiz_score schema
      passed: (score || 0) >= 70,  // Aligned with quiz_score schema
      status: 'pending',
      attemptNumber: 1
    };
    
    const result = await saveQuizResult(submissionData);
    res.status(result.isUpdate || result.skipped ? 200 : 201).json({
      message: result.skipped ? 'Saved quiz result preserved' : 'Quiz submitted',
      ...result, submissionId: result.scoreId
    });
  } catch (error) {
    res.status(500).json({ error: 'Server Error', message: error.message });
  }
});

// POST /api/v1/quizzes/submissions/:submissionId/grade - Grade submission
router.post('/submissions/:submissionId/grade', async (req, res) => {
  try {
    const { score, validation, feedback, gradedBy } = req.body;
    
    const submissionDoc = await db.collection('quiz_score').doc(req.params.submissionId).get();
    if (!submissionDoc.exists) {
      return res.status(404).json({ error: 'Not Found', message: 'Submission not found' });
    }
    
    const submission = submissionDoc.data();
    
    const resultData = {
      submissionid: req.params.submissionId,
      quizid: submission.quizId ?? submission.quizid,
      studentid: submission.studentId ?? submission.studentid,
      score,
      validation,
      feedback: feedback || '',
      gradedat: new Date(),
      gradedby: gradedBy,
      passed: score >= 70
    };
    
    await saveQuizGrade(req.params.submissionId, resultData);
    
    res.json({ message: 'Quiz graded successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Server Error', message: error.message });
  }
});

// GET /api/v1/quizzes/submissions - Get quiz submissions
router.get('/submissions/all', async (req, res) => {
  try {
    const { status, studentId, quizId } = req.query;
    let query = db.collection('quiz_score');
    
    if (status) query = query.where('status', '==', status);
    if (studentId) query = query.where('studentid', '==', studentId);
    if (quizId) query = query.where('quizid', '==', quizId);
    
    const snapshot = await query.orderBy('submittedat', 'desc').get();
    const submissions = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json({ submissions, count: submissions.length });
  } catch (error) {
    res.status(500).json({ error: 'Server Error', message: error.message });
  }
});

// GET /api/v1/quiz-submissions/student/:studentId - Get quiz submissions for a student (Training Records)
router.get('/student/:studentId', async (req, res) => {
  try {
    const { studentId } = req.params;
    
    if (!studentId) {
      return res.status(400).json({ 
        error: 'Bad Request', 
        message: 'studentId parameter is required' 
      });
    }
    
    // Query WITHOUT orderBy to avoid index requirement
    const snapshot = await db.collection('quiz_score')
      .where('studentId', '==', studentId)
      .get();
    
    // Sort in memory instead
    const submissions = snapshot.docs
      .map(doc => ({ 
        id: doc.id, 
        ...doc.data(),
        // Convert Firestore timestamp to ISO string for frontend
        submittedAt: doc.data().submittedAt?.toDate?.()?.toISOString() || doc.data().submittedAt || doc.data().completedAt?.toDate?.()?.toISOString() || doc.data().completedAt || doc.data().createdAt?.toDate?.()?.toISOString() || doc.data().createdAt
      }))
      .sort((a, b) => {
        // Sort by submittedAt descending (newest first)
        const timeA = new Date(a.submittedAt).getTime();
        const timeB = new Date(b.submittedAt).getTime();
        return timeB - timeA;
      });
    
    res.json({ submissions, count: submissions.length });
  } catch (error) {
    console.error('❌ Error fetching quiz submissions:', error);
    res.status(500).json({ error: 'Server Error', message: error.message });
  }
});

// GET /api/v1/quizzes/results/:submissionId - Get quiz result
router.get('/results/:submissionId', async (req, res) => {
  try {
    const snapshot = await db.collection('quiz_results').where('submissionid', '==', req.params.submissionId).get();
    if (snapshot.empty) return res.status(404).json({ error: 'Not Found', message: 'Result not found' });
    
    const result = { id: snapshot.docs[0].id, ...snapshot.docs[0].data() };
    res.json({ result });
  } catch (error) {
    res.status(500).json({ error: 'Server Error', message: error.message });
  }
});

// DELETE /api/v1/quizzes/:quizId/submissions - Delete all submissions for a quiz
router.delete('/:quizId/submissions', async (req, res) => {
  try {
    const quizId = req.params.quizId;
    console.log('🗑️ Deleting quiz submissions for quizId:', quizId);
    
    const batch = db.batch();
    let totalDeleted = 0;
    
    // Delete from quiz_submissions collection (where quizId = ...)
    try {
      const submissionsSnapshot = await db.collection('quiz_score')
        .where('quizId', '==', quizId)
        .get();
      
      submissionsSnapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
        totalDeleted++;
      });
      console.log(`  ✓ Found ${submissionsSnapshot.size} documents in quiz_submissions`);
    } catch (error) {
      console.warn('  ⚠️ Error querying quiz_submissions:', error.message);
    }
    
    // Delete from quiz_score collection (where quizId = ...)
    try {
      const scoresSnapshot = await db.collection('quiz_score')
        .where('quizId', '==', quizId)
        .get();
      
      scoresSnapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
        totalDeleted++;
      });
      console.log(`  ✓ Found ${scoresSnapshot.size} documents in quiz_score`);
    } catch (error) {
      console.warn('  ⚠️ Error querying quiz_score:', error.message);
    }
    
    // Also try with quizid (lowercase) in case of field name variations
    try {
      const scoresSnapshot2 = await db.collection('quiz_score')
        .where('quizid', '==', quizId)
        .get();
      
      scoresSnapshot2.docs.forEach(doc => {
        batch.delete(doc.ref);
        totalDeleted++;
      });
      console.log(`  ✓ Found ${scoresSnapshot2.size} documents in quiz_score (lowercase quizid)`);
    } catch (error) {
      console.warn('  ⚠️ Error querying quiz_score with lowercase quizid:', error.message);
    }
    
    await batch.commit();
    console.log(`✅ Deleted ${totalDeleted} quiz submission documents`);
    
    res.json({ 
      message: 'Quiz submissions deleted successfully',
      deletedCount: totalDeleted
    });
  } catch (error) {
    console.error('❌ Error deleting quiz submissions:', error);
    res.status(500).json({ error: 'Server Error', message: error.message });
  }
});

export default router;
