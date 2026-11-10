import { verifySession } from '../services/authSession.js';

export function createMaterialsAccess({ db, demos = [] }) {
  return async (req, res, next) => {
    const session = verifySession(req.headers.authorization?.replace(/^Bearer\s+/i, ''));
    if (!session) return res.status(401).json({ message: 'Please sign in to access learning materials.' });
    try {
      const doc = await db.collection(session.role === 'student' ? 'students' : 'instructor').doc(session.id).get();
      const demo = demos.find(user => user.id === session.id && user.role === session.role);
      const profile = doc.exists ? doc.data() : demo;
      if (!profile || (profile.status && profile.status !== 'active') || (doc.exists && session.role === 'student' && profile.status !== 'active') ||
          (session.role === 'admin' && !demo && profile.role !== 'admin') ||
          (session.role !== 'admin' && profile.role && profile.role !== session.role)) {
        return res.status(403).json({ message: 'Your account is not approved to access learning materials.' });
      }
      req.materialsUser = { ...profile, id: session.id, role: session.role };
      next();
    } catch { res.status(503).json({ message: 'Unable to verify access. Please try again.' }); }
  };
}
