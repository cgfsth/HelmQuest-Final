// Quiz Scores Routes
import express from 'express';
import { db } from '../config/firebase-admin.js';
import { saveQuizResult } from '../services/scorePersistence.js';

const router = express.Router();

// POST /api/v1/quiz-scores - Save a quiz score
router.post('/', async (req, res) => {
  try {
    console.log('📝 [QUIZ SCORE] Received request body:', JSON.stringify(req.body, null, 2));
    
    const { 
      studentId, 
      instructorId,
      moduleId,
      missionId,
      quizId,
      quizTitle,
      'Quiz-score-percentage': quizScorePercentage,
      'raw-score': rawScore,
      passed, 
      totalQuestions, 
      correctAnswers, 
      completedAt 
    } = req.body;
    
    console.log('📝 [QUIZ SCORE] Extracted fields:', {
      studentId,
      quizId,
      quizScorePercentage,
      rawScore,
      scoreType: typeof quizScorePercentage,
      rawScoreType: typeof rawScore
    });
    
    // Validate required fields (allow 0 as valid value)
    if (!studentId || !moduleId || quizScorePercentage === undefined || quizScorePercentage === null || rawScore === undefined || rawScore === null) {
      console.error('❌ [QUIZ SCORE] Validation failed:', {
        hasStudentId: !!studentId,
        hasModuleId: !!moduleId,
        hasQuizScorePercentage: quizScorePercentage !== undefined && quizScorePercentage !== null,
        hasRawScore: rawScore !== undefined && rawScore !== null
      });
      return res.status(400).json({ 
        error: 'Bad Request', 
        message: 'studentId, moduleId, Quiz-score-percentage, and raw-score are required' 
      });
    }
    
    // Validate raw-score constraints
    if (rawScore < 0 || !Number.isInteger(Number(rawScore))) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'raw-score must be a non-negative integer'
      });
    }
    
    if (totalQuestions && Number(rawScore) > Number(totalQuestions)) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'raw-score cannot exceed totalQuestions'
      });
    }
    
    const quizScoreData = {
      studentId,
      instructorId: instructorId || '',
      moduleId,
      quizId: quizId || '',
      ...(missionId ? { missionId } : {}),
      quizTitle: quizTitle || '',
      'Quiz-score-percentage': Number(quizScorePercentage),  // Percentage (0-100)
      'raw-score': Number(rawScore),                          // Raw correct count
      passed: passed !== undefined ? passed : (quizScorePercentage >= 70),
      totalQuestions: totalQuestions || 0,
      correctAnswers: correctAnswers || 0,     // backwards compatibility
      completedAt: completedAt || new Date()
    };
    
    const result = await saveQuizResult(quizScoreData);
    res.status(result.isUpdate || result.skipped ? 200 : 201).json({
      message: result.skipped ? 'Saved quiz result preserved' : 'Quiz score saved',
      ...result
    });
  } catch (error) {
    console.error('Error saving quiz score:', error);
    res.status(500).json({ error: 'Server Error', message: error.message });
  }
});

// GET /api/v1/quiz-scores/:studentId - Get all quiz scores for a student
router.get('/:studentId', async (req, res) => {
  try {
    const { studentId } = req.params;
    
    const snapshot = await db.collection('quiz_score')
      .where('studentId', '==', studentId)
      .get();
    
    // Sort after reading: a compound Firestore index must not hide saved results,
    // and older submissions may have submittedAt/createdAt instead of completedAt.
    const toIsoDate = value => {
      if (value === undefined || value === null || value === '') return null;
      const date = value?.toDate ? value.toDate() : new Date(value);
      return Number.isNaN(date.getTime()) ? null : date.toISOString();
    };
    const scores = snapshot.docs.map(doc => {
      const data = doc.data();
      const submittedAt = toIsoDate(data.submittedAt) || toIsoDate(data.completedAt) || toIsoDate(data.createdAt);
      return { ...data, id: doc.id, submittedAt, completedAt: toIsoDate(data.completedAt) || submittedAt };
    });
    scores.sort((a, b) => (Date.parse(b.submittedAt) || 0) - (Date.parse(a.submittedAt) || 0));
    
    res.json({ scores, count: scores.length });
  } catch (error) {
    console.error('Error fetching quiz scores:', error);
    res.status(500).json({ error: 'Server Error', message: error.message });
  }
});

// GET /api/v1/quiz-scores/student/:studentId/average - Get average score for a student
router.get('/student/:studentId/average', async (req, res) => {
  try {
    const { studentId } = req.params;
    
    const snapshot = await db.collection('quiz_score')
      .where('studentId', '==', studentId)
      .get();
    
    if (snapshot.empty) {
      return res.json({ averageScore: 0, completed: 0, bestScore: 0, totalAttempts: 0 });
    }
    
    const scores = snapshot.docs.map(doc => doc.data());
    const scoreValues = scores.map(s => s.score || 0);
    const passedCount = scores.filter(s => s.passed).length;
    
    const averageScore = scoreValues.reduce((sum, val) => sum + val, 0) / scoreValues.length;
    const bestScore = Math.max(...scoreValues);
    
    res.json({ 
      averageScore: Math.round(averageScore * 100) / 100,
      completed: scores.length,
      passed: passedCount,
      bestScore,
      totalAttempts: scores.length
    });
  } catch (error) {
    console.error('Error calculating quiz average:', error);
    res.status(500).json({ error: 'Server Error', message: error.message });
  }
});

// GET /api/v1/quiz-scores/quiz/:quizId/scores - Get all scores for a specific quiz
router.get('/quiz/:quizId/scores', async (req, res) => {
  try {
    const { quizId } = req.params;
    
    const snapshot = await db.collection('quiz_score')
      .where('quizId', '==', quizId)
      .orderBy('completedAt', 'desc')
      .get();
    
    const scores = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    res.json({ scores, count: scores.length });
  } catch (error) {
    console.error('Error fetching quiz scores:', error);
    res.status(500).json({ error: 'Server Error', message: error.message });
  }
});

// DELETE /api/v1/quiz-scores/:quizId/scores - Delete all scores for a quiz
router.delete('/:quizId/scores', async (req, res) => {
  try {
    const quizId = req.params.quizId;
    console.log('🗑️ Deleting quiz scores for quizId:', quizId);
    
    const batch = db.batch();
    let totalDeleted = 0;
    
    // Query all quiz scores for this quiz
    const scoresSnapshot = await db.collection('quiz_score')
      .where('quizId', '==', quizId)
      .get();
    
    // Add each document to batch deletion
    scoresSnapshot.docs.forEach(doc => {
      batch.delete(doc.ref);
      totalDeleted++;
    });
    
    console.log(`  ✓ Found ${scoresSnapshot.size} quiz score documents`);
    
    // Commit batch deletion atomically
    await batch.commit();
    console.log(`✅ Deleted ${totalDeleted} quiz score documents`);
    
    res.status(200).json({ 
      message: 'Quiz scores deleted successfully', 
      deletedCount: totalDeleted 
    });
  } catch (error) {
    console.error('❌ Error deleting quiz scores:', error);
    res.status(500).json({ error: 'Server Error', message: error.message });
  }
});

export default router;
