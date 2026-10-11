// Navigation Missions Routes
import express from 'express';
import { db } from '../config/firebase-admin.js';
import { canViewMission } from '../../shared/missionAccess.js';
import { requireMissionUser, requireMissionInstructor, requireMissionRecord, ownedMissionData } from '../middleware/missionAccess.js';

const router = express.Router();
router.use(requireMissionUser);

// GET /api/v1/missions - Get all missions
function getEquivalentModuleIds(moduleId) {
  if (!moduleId || typeof moduleId !== 'string') return [];

  const normalized = moduleId.trim();
  const values = new Set();

  if (normalized) values.add(normalized);
  if (normalized.replace(/^CUSTOM-/i, '')) values.add(normalized.replace(/^CUSTOM-/i, ''));
  values.add(normalized.startsWith('CUSTOM-') ? normalized : `CUSTOM-${normalized}`);

  return [...values].filter(Boolean);
}

router.get('/', async (req, res) => {
  try {
    const { moduleId } = req.query;
    let query = db.collection('missions');

    const snapshot = await query.get();
    let missions = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }))
      .filter(mission => canViewMission(mission, req.missionUser));

    if (moduleId) {
      const equivalentIds = getEquivalentModuleIds(String(moduleId));
      missions = missions.filter((mission) => {
        const values = Array.isArray(mission.moduleId) ? mission.moduleId : [mission.moduleId];
        return values.some((value) => equivalentIds.includes(value));
      });
    }

    res.json({ missions, count: missions.length });
  } catch (error) {
    res.status(500).json({ error: 'Server Error', message: error.message });
  }
});

// GET /api/v1/missions/:id - Get mission by ID
router.get('/:id', requireMissionRecord, async (req, res) => {
  try {
    const doc = req.missionRecord;
    if (!doc.exists) return res.status(404).json({ error: 'Not Found', message: 'Mission not found' });
    res.json({ mission: { ...doc.data(), id: doc.id } });
  } catch (error) {
    res.status(500).json({ error: 'Server Error', message: error.message });
  }
});

// POST /api/v1/missions - Create new mission
router.post('/', requireMissionInstructor, async (req, res) => {
  try {
    const { id, ...body } = req.body;
    const missionData = ownedMissionData(body, req.missionUser);
    const docRef = id
      ? db.collection('missions').doc(id)
      : db.collection('missions').doc();
    await docRef.create(missionData);
    res.status(201).json({ message: 'Mission created', missionId: docRef.id });
  } catch (error) {
    if (error.code === 6 || error.code === 'already-exists') return res.status(409).json({ error: 'Conflict', message: 'Mission ID already exists.' });
    res.status(500).json({ error: 'Server Error', message: error.message });
  }
});

// PUT /api/v1/missions/:id - Update mission
router.put('/:id', requireMissionInstructor, requireMissionRecord, async (req, res) => {
  try {
    await req.missionRecord.ref.update(ownedMissionData(req.body, req.missionUser, req.missionRecord.data()));
    res.json({ message: 'Mission updated successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Server Error', message: error.message });
  }
});

async function findRefsByFields(collectionName, fieldNames, values) {
  const refs = new Map();
  const valueList = Array.isArray(values) ? values : [values];

  for (const fieldName of fieldNames) {
    for (const value of valueList) {
      try {
        const snapshot = await db.collection(collectionName).where(fieldName, '==', value).get();
        snapshot.docs.forEach((doc) => refs.set(doc.ref.path, doc.ref));
      } catch (error) {
        console.warn(`Could not query ${collectionName}.${fieldName}:`, error.message);
      }
    }
  }

  return [...refs.values()];
}

async function deleteRefs(refs) {
  let deletedCount = 0;

  for (let index = 0; index < refs.length; index += 450) {
    const batch = db.batch();
    const chunk = refs.slice(index, index + 450);
    chunk.forEach((ref) => batch.delete(ref));
    await batch.commit();
    deletedCount += chunk.length;
  }

  return deletedCount;
}

async function deleteMissionCascade(missionId) {
  const refsToDelete = new Map();
  const addRefs = (refs) => refs.forEach((ref) => refsToDelete.set(ref.path, ref));
  const quizIds = new Set();
  const missionIds = [...new Set([
    missionId,
    missionId.replace(/^CUSTOM-/i, ''),
    missionId.startsWith('CUSTOM-') ? missionId : `CUSTOM-${missionId}`
  ])];

  const missionScoreRefs = await findRefsByFields(
    'mission_score',
    ['missionId', 'missionid', 'mission_id'],
    missionIds
  );
  addRefs(missionScoreRefs);

  for (const collectionName of ['quiz_assignments', 'quizAssignments']) {
    const assignmentRefs = await findRefsByFields(
      collectionName,
      ['targetId', 'moduleId', 'missionId'],
      missionIds
    );
    assignmentRefs.forEach((ref) => refsToDelete.set(ref.path, ref));
    for (const ref of assignmentRefs) {
      const assignment = (await ref.get()).data() || {};
      if (assignment.quizId) quizIds.add(assignment.quizId);
    }
  }

  for (const collectionName of ['quiz', 'quizzes']) {
    const quizRefs = await findRefsByFields(
      collectionName,
      ['missionId', 'missionid', 'moduleId', 'targetId'],
      missionIds
    );
    addRefs(quizRefs);
    for (const ref of quizRefs) quizIds.add(ref.id);
  }

  for (const collectionName of ['quiz_score', 'quiz_scores']) {
    addRefs(await findRefsByFields(
      collectionName,
      ['missionId', 'missionid', 'moduleId'],
      missionIds
    ));
    for (const quizId of quizIds) {
      addRefs(await findRefsByFields(collectionName, ['quizId', 'quizid'], quizId));
    }
  }

  const submissionRefs = [];
  for (const collectionName of ['quiz_score']) {
    const refs = await findRefsByFields(
      collectionName,
      ['missionId', 'missionid', 'moduleId'],
      missionIds
    );
    submissionRefs.push(...refs);
    addRefs(refs);
    for (const quizId of quizIds) {
      const quizSubmissionRefs = await findRefsByFields(collectionName, ['quizId', 'quizid'], quizId);
      submissionRefs.push(...quizSubmissionRefs);
      addRefs(quizSubmissionRefs);
    }
  }

  for (const collectionName of ['quiz_results', 'quiz_result']) {
    addRefs(await findRefsByFields(collectionName, ['missionId', 'missionid', 'moduleId'], missionIds));
    for (const quizId of quizIds) {
      addRefs(await findRefsByFields(collectionName, ['quizId', 'quizid'], quizId));
    }
    for (const ref of submissionRefs) {
      addRefs(await findRefsByFields(collectionName, ['submissionId', 'submissionid'], ref.id));
    }
  }

  const deletedRelatedCount = await deleteRefs([...refsToDelete.values()]);
  await db.collection('missions').doc(missionId).delete();

  return {
    deletedRelatedCount,
    deletedMissionCount: 1
  };
}

// DELETE /api/v1/missions/:id - Delete mission and all related records
router.delete('/:id', requireMissionInstructor, requireMissionRecord, async (req, res) => {
  try {
    const counts = await deleteMissionCascade(req.params.id);
    res.json({ message: 'Mission and related records deleted successfully', ...counts });
  } catch (error) {
    console.error('Error deleting mission cascade:', error);
    res.status(500).json({ error: 'Server Error', message: error.message });
  }
});

export { deleteMissionCascade };

// DELETE /api/v1/missions/:missionId/scores - Delete all scores for a mission
router.delete('/:missionId/scores', requireMissionInstructor, requireMissionRecord, async (req, res) => {
  try {
    const missionId = req.params.missionId;
    console.log('🗑️ Deleting mission scores for missionId:', missionId);
    
    const batch = db.batch();
    let totalDeleted = 0;
    
    // Strategy 1: Delete by exact missionId match
    try {
      const scoresSnapshot = await db.collection('mission_score')
        .where('missionId', '==', missionId)
        .get();
      
      scoresSnapshot.docs.forEach(doc => {
        console.log('  → Found document to delete:', doc.id, doc.data());
        batch.delete(doc.ref);
        totalDeleted++;
      });
      console.log(`  ✓ Found ${scoresSnapshot.size} documents with missionId field`);
    } catch (error) {
      console.warn('  ⚠️ Error querying mission_score by missionId:', error.message);
    }
    
    // Strategy 2: Delete by lowercase missionid
    try {
      const scoresSnapshot2 = await db.collection('mission_score')
        .where('missionid', '==', missionId)
        .get();
      
      scoresSnapshot2.docs.forEach(doc => {
        console.log('  → Found document to delete (lowercase):', doc.id, doc.data());
        batch.delete(doc.ref);
        totalDeleted++;
      });
      console.log(`  ✓ Found ${scoresSnapshot2.size} documents with missionid field (lowercase)`);
    } catch (error) {
      console.warn('  ⚠️ Error querying mission_score with lowercase missionid:', error.message);
    }
    
    // Strategy 3: Fetch ALL mission_score documents and filter manually
    // This is a fallback in case field indexing is the issue
    if (totalDeleted === 0) {
      console.log('  ⚠️ No documents found via query, trying manual filter...');
      try {
        const allScores = await db.collection('mission_score').get();
        console.log(`  → Total mission_score documents: ${allScores.size}`);
        
        allScores.docs.forEach(doc => {
          const data = doc.data();
          console.log(`  → Checking document ${doc.id}:`, data);
          
          // Check if missionId matches (case-insensitive comparison)
          if (data.missionId === missionId || 
              data.missionid === missionId ||
              data.mission_id === missionId ||
              data.MISSIONID === missionId) {
            console.log(`  ✓ MATCH! Deleting ${doc.id}`);
            batch.delete(doc.ref);
            totalDeleted++;
          }
        });
        console.log(`  ✓ Manual filter found ${totalDeleted} matching documents`);
      } catch (error) {
        console.error('  ❌ Error in manual filter:', error.message);
      }
    }
    
    // Commit the batch delete
    if (totalDeleted > 0) {
      await batch.commit();
      console.log(`✅ Successfully deleted ${totalDeleted} mission score documents`);
    } else {
      console.warn(`⚠️ No mission scores found to delete for missionId: ${missionId}`);
    }
    
    res.json({ 
      message: totalDeleted > 0 ? 'Mission scores deleted successfully' : 'No mission scores found',
      deletedCount: totalDeleted
    });
  } catch (error) {
    console.error('❌ Error deleting mission scores:', error);
    res.status(500).json({ error: 'Server Error', message: error.message });
  }
});

export default router;
