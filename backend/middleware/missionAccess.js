import { db } from '../config/firebase-admin.js';
import { verifySession } from '../services/authSession.js';
import { canViewMission, canManageMission } from '../../shared/missionAccess.js';
import { DEMO_USERS } from '../../shared/demoAccounts.js';

export async function requireMissionUser(req, res, next) {
  const session = verifySession(req.headers.authorization?.replace(/^Bearer\s+/i, ''));
  if (!session) return res.status(401).json({ error: 'Unauthorized', message: 'Please sign in to access missions.' });
  try {
    const collection = session.role === 'student' ? 'students' : 'instructor';
    const doc = await db.collection(collection).doc(session.id).get();
    const demo = Object.values(DEMO_USERS).find(user => user.id === session.id && user.role === session.role);
    const profile = doc.exists ? doc.data() : demo;
    if (!profile || (profile.status && profile.status !== 'active') ||
        (session.role === 'admin' && !demo && profile.role !== 'admin')) {
      return res.status(403).json({ error: 'Forbidden', message: 'This account cannot access missions.' });
    }
    req.missionUser = { ...profile, id: session.id, role: session.role };
    next();
  } catch (error) {
    res.status(500).json({ error: 'Server Error', message: 'Unable to verify mission access.' });
  }
}

export function requireMissionInstructor(req, res, next) {
  if (req.missionUser?.role !== 'instructor') {
    return res.status(403).json({ error: 'Forbidden', message: 'Only instructors can manage missions.' });
  }
  next();
}

export function requireOwnClass(req, res, next) {
  const user = req.missionUser;
  if (user.role === 'admin' || (user.role === 'instructor' && user.id === req.params.id)) return next();
  res.status(404).json({ error: 'Not Found', message: 'Class not found.' });
}

export async function requireStudentTrainingAccess(req, res, next) {
  try {
    const doc = await db.collection('students').doc(req.params.id).get();
    const user = req.missionUser;
    const student = doc.exists ? doc.data() : null;
    const owner = student?.instructorid || student?.instructorId;
    if (student && (user.role === 'admin' || (user.role === 'student' && user.id === doc.id) ||
        (user.role === 'instructor' && owner === user.id))) return next();
    res.status(404).json({ error: 'Not Found', message: 'Student not found.' });
  } catch (error) {
    res.status(500).json({ error: 'Server Error', message: 'Unable to verify training access.' });
  }
}

export async function requireMissionRecord(req, res, next) {
  try {
    const id = req.params.id || req.params.missionId;
    const doc = await db.collection('missions').doc(id).get();
    const allowed = doc.exists && (req.method === 'GET'
      ? canViewMission(doc.data(), req.missionUser)
      : canManageMission(doc.data(), req.missionUser));
    if (!allowed) return res.status(404).json({ error: 'Not Found', message: 'Mission not found.' });
    req.missionRecord = doc;
    next();
  } catch (error) {
    res.status(500).json({ error: 'Server Error', message: 'Unable to verify mission access.' });
  }
}

// Ownership never comes from a request body and cannot change through editing.
export function ownedMissionData(body, user, existing = null) {
  const { id, instructorId, instructorid, createdBy, createdAt, updatedAt, ...data } = body;
  return { ...data, instructorId: user.id, instructorid: user.id,
    createdBy: existing?.createdBy || user.id,
    createdAt: existing?.createdAt || new Date(), updatedAt: new Date() };
}
