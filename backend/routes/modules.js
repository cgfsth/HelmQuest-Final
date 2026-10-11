// Training Modules Routes
import express from 'express';
import { db } from '../config/firebase-admin.js';
import { deleteMissionCascade } from './missions.js';
import { canViewMission } from '../../shared/missionAccess.js';
import { requireMissionUser, requireMissionInstructor, requireMissionRecord, ownedMissionData } from '../middleware/missionAccess.js';

const router = express.Router();
router.use(requireMissionUser);

// Compatibility API: module endpoints now use the missions collection.
router.get('/', async (req, res) => {
  try {
    const snapshot = await db.collection('missions').get();
    const modules = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }))
      .filter(mission => canViewMission(mission, req.missionUser));
    res.json({ modules, count: modules.length });
  } catch (error) {
    res.status(500).json({ error: 'Server Error', message: error.message });
  }
});

// GET /api/v1/modules/:id - Get module by ID
router.get('/:id', requireMissionRecord, async (req, res) => {
  try {
    const doc = req.missionRecord;
    if (!doc.exists) return res.status(404).json({ error: 'Not Found', message: 'Module not found' });
    res.json({ module: { ...doc.data(), id: doc.id } });
  } catch (error) {
    res.status(500).json({ error: 'Server Error', message: error.message });
  }
});

// POST /api/v1/modules - Create new module
router.post('/', requireMissionInstructor, async (req, res) => {
  try {
    const moduleData = ownedMissionData(req.body, req.missionUser);
    const docRef = await db.collection('missions').add(moduleData);
    res.status(201).json({ message: 'Module created', moduleId: docRef.id });
  } catch (error) {
    res.status(500).json({ error: 'Server Error', message: error.message });
  }
});

// PUT /api/v1/modules/:id - Update module
router.put('/:id', requireMissionInstructor, requireMissionRecord, async (req, res) => {
  try {
    await req.missionRecord.ref.update(ownedMissionData(req.body, req.missionUser, req.missionRecord.data()));
    res.json({ message: 'Module updated successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Server Error', message: error.message });
  }
});

// DELETE /api/v1/modules/:id - Delete module
router.delete('/:id', requireMissionInstructor, requireMissionRecord, async (req, res) => {
  try {
    const counts = await deleteMissionCascade(req.params.id);
    res.json({ message: 'Module and related records deleted successfully', ...counts });
  } catch (error) {
    console.error('Error deleting module cascade:', error);
    res.status(500).json({ error: 'Server Error', message: error.message });
  }
});

export default router;
