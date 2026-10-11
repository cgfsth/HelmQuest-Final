// Mission Scores Routes
import express from 'express';
import { db } from '../config/firebase-admin.js';
import { saveMissionResult } from '../services/scorePersistence.js';
import { canonicalMissionId, readMissionReward } from '../services/missionRewards.js';
import { loadRankSettings, synchronizeStudentProgression } from '../services/progression.js';

const router = express.Router();

// POST /api/v1/mission-scores - Save the latest failed attempt or the first pass.
router.post('/', async (req, res) => {
  try {
    const { studentId, missionId, score, passed, completedAt, missionTitle } = req.body;
    if (!studentId || !missionId || score === undefined || !Number.isFinite(Number(score))) {
      return res.status(400).json({
        error: 'Bad Request', message: 'studentId, missionId, and a valid score are required'
      });
    }
    const result = await saveMissionResult({
      studentId, missionId, missionTitle: missionTitle || '', score: Number(score),
      passed: passed !== undefined ? passed : (score >= 80),
      completedAt: completedAt || new Date()
    });
    res.status(result.isUpdate || result.skipped ? 200 : 201).json({
      message: result.skipped ? 'Saved mission result preserved' : 'Mission score saved',
      ...result
    });
  } catch (error) {
    console.error('Error saving mission score:', error);
    res.status(500).json({ error: 'Server Error', message: error.message });
  }
});
// GET /api/v1/mission-scores/:studentId - Get all mission scores for a student
router.get('/:studentId', async (req, res) => {
  try {
    const { studentId } = req.params;
    
    const snapshot = await db.collection('mission_score')
      .where('studentId', '==', studentId)
      .get();
    
    const scores = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    scores.sort((a, b) => {
      const getTime = (value) => {
        if (value?.toMillis) return value.toMillis();
        if (value?.toDate) return value.toDate().getTime();
        const time = new Date(value).getTime();
        return Number.isNaN(time) ? 0 : time;
      };

      return getTime(b.completedAt) - getTime(a.completedAt);
    });
    
    res.json({ scores, count: scores.length });
  } catch (error) {
    console.error('Error fetching mission scores:', error);
    res.status(500).json({ error: 'Server Error', message: error.message });
  }
});

// GET /api/v1/mission-scores/student/:studentId/average - Get average score for a student
router.get('/student/:studentId/average', async (req, res) => {
  try {
    const { studentId } = req.params;
    
    const snapshot = await db.collection('mission_score')
      .where('studentId', '==', studentId)
      .get();
    
    if (snapshot.empty) {
      return res.json({ averageScore: 0, completed: 0, bestScore: 0, totalAttempts: 0 });
    }
    
    const scores = snapshot.docs.map(doc => doc.data());
    const scoreValues = scores.map(s => s.score || 0);
    const passedCount = scores.filter(s => s.passed).length;
    
    const averageScore = Math.round(scoreValues.reduce((sum, score) => sum + score, 0) / scoreValues.length);
    const bestScore = Math.max(...scoreValues);
    
    res.json({ 
      averageScore,
      completed: passedCount,
      bestScore,
      totalAttempts: scores.length
    });
  } catch (error) {
    console.error('Error calculating average score:', error);
    res.status(500).json({ error: 'Server Error', message: error.message });
  }
});

// GET /api/v1/mission-scores/student/:studentId/total-xp - Calculate total XP from completed missions
router.get('/student/:studentId/total-xp', async (req, res) => {
  try {
    const { studentId } = req.params;
    
    console.log(`📊 Calculating total XP for student: ${studentId}`);
    
    // Step 1: Get all PASSED missions for this student
    const scoresSnapshot = await db.collection('mission_score')
      .where('studentId', '==', studentId)
      .where('passed', '==', true)
      .get();
    
    if (scoresSnapshot.empty) {
      console.log(`⚠️ No passed missions found for student ${studentId}`);
      return res.json({ totalXp: 0, missionsCompleted: 0, xpBreakdown: [] });
    }
    
    // Step 2: Get unique mission IDs (in case student passed same mission multiple times, count once)
    const uniqueMissionIds = [...new Set(scoresSnapshot.docs.map(doc => canonicalMissionId(doc.data().missionId)))];
    console.log(`✅ Found ${uniqueMissionIds.length} unique completed missions:`, uniqueMissionIds);
    
    // Step 3: Fetch mission data to get xp_reward for each mission
    const xpBreakdown = [];
    let totalXp = 0;
    
    for (const missionId of uniqueMissionIds) {
      const mission = await readMissionReward(ref => ref.get(), db, missionId);
      if (!mission || mission.reward === null) continue;
      totalXp += mission.reward;
      xpBreakdown.push({
        missionId: mission.missionId,
        missionTitle: mission.data.mission_title || mission.data.title || mission.missionId,
        xpReward: mission.reward
      });
    }
    res.json({ 
      totalXp,
      missionsCompleted: uniqueMissionIds.length,
      xpBreakdown
    });
  } catch (error) {
    console.error('Error calculating total XP:', error);
    res.status(500).json({ error: 'Server Error', message: error.message });
  }
});

// GET /api/v1/mission-scores/instructor/:instructorId/recent - Get recent activities for instructor's students
router.get('/instructor/:instructorId/recent', async (req, res) => {
  try {
    const { instructorId } = req.params;
    const limit = parseInt(req.query.limit) || 10;
    
    console.log(`📊 Fetching recent activities for instructor: ${instructorId}`);
    
    // Step 1: Get all students under this instructor
    const studentsSnapshot = await db.collection('students')
      .where('instructorid', '==', instructorId)
      .where('status', '==', 'active')
      .get();
    
    if (studentsSnapshot.empty) {
      console.log(`⚠️ No active students found for instructor ${instructorId}`);
      return res.json({ activities: [], count: 0 });
    }
    
    const studentIds = studentsSnapshot.docs.map(doc => doc.id);
    const studentsMap = new Map(studentsSnapshot.docs.map(doc => [doc.id, doc.data()]));
    
    console.log(`👥 Found ${studentIds.length} students under instructor ${instructorId}`);
    
    // Step 2: Get mission scores for these students WITHOUT ordering by completedAt
    // (to avoid the composite index requirement)
    const allActivities = [];
    
    // Firestore 'in' query limit is 10, so batch if needed
    const batchSize = 10;
    for (let i = 0; i < studentIds.length; i += batchSize) {
      const batch = studentIds.slice(i, i + batchSize);
      
      const scoresSnapshot = await db.collection('mission_score')
        .where('studentId', 'in', batch)
        .get();
      
      scoresSnapshot.docs.forEach(doc => {
        const scoreData = doc.data();
        const student = studentsMap.get(scoreData.studentId);
        
        if (student) {
          allActivities.push({
            id: doc.id,
            studentId: scoreData.studentId,
            studentName: student.name,
            missionId: scoreData.missionId,
            missionTitle: scoreData.missionTitle || scoreData.missionId,
            score: scoreData.score,
            passed: scoreData.passed,
            completedAt: scoreData.completedAt
          });
        }
      });
    }
    
    // Step 3: Sort by completedAt in JavaScript (not in Firestore query)
    allActivities.sort((a, b) => {
      const dateA = a.completedAt?.toDate?.() || new Date(a.completedAt);
      const dateB = b.completedAt?.toDate?.() || new Date(b.completedAt);
      return dateB - dateA;
    });
    
    const recentActivities = allActivities.slice(0, limit);
    
    console.log(`✅ Returning ${recentActivities.length} recent activities for instructor ${instructorId}`);
    
    res.json({ 
      activities: recentActivities, 
      count: recentActivities.length,
      totalStudents: studentIds.length
    });
  } catch (error) {
    console.error('Error fetching instructor recent activities:', error);
    res.status(500).json({ error: 'Server Error', message: error.message });
  }
});

export default router;
