import express from 'express';
import bcrypt from 'bcrypt';
import { verifySession } from '../services/authSession.js';
import { DEMO_USERS } from '../../shared/demoAccounts.js';

export function createAccountRouter({ db, now = Date.now }) {
  const router = express.Router();
  const attempts = new Map();
  const windowMs = 15 * 60 * 1000;
  router.post('/change-password', async (req, res) => {
    res.set('Cache-Control', 'no-store');
    const session = verifySession(req.headers.authorization?.replace(/^Bearer\s+/i, ''));
    if (!session) return res.status(401).json({ message: 'Please sign in again to change your password.' });
    if (!['student', 'instructor'].includes(session.role) || Object.values(DEMO_USERS).some(user => user.id === session.id && user.role === session.role)) {
      return res.status(403).json({ message: 'Shared demo accounts cannot change their password.' });
    }
    const { currentPassword, newPassword } = req.body || {};
    if (typeof currentPassword !== 'string' || !currentPassword || Buffer.byteLength(currentPassword) > 512 ||
        typeof newPassword !== 'string' || newPassword.length < 8 || Buffer.byteLength(newPassword) > 72) {
      return res.status(400).json({ message: 'Enter your current password and a new password of at least 8 characters, up to 72 UTF-8 bytes.' });
    }
    if (newPassword === currentPassword) return res.status(400).json({ message: 'Choose a password different from your current password.' });
    const time = now(), key = `${session.role}:${session.id}`;
    for (const [id, value] of attempts) if (value.expiresAt <= time) attempts.delete(id);
    if (!attempts.has(key) && attempts.size >= 5000) return res.status(503).json({ message: 'Please try again later.' });
    const rate = attempts.get(key) || { count: 0, expiresAt: time + windowMs };
    if (rate.count >= 5) {
      res.set('Retry-After', String(Math.ceil((rate.expiresAt - time) / 1000)));
      return res.status(429).json({ message: 'Too many password attempts. Please try again in 15 minutes.' });
    }
    rate.count++; attempts.set(key, rate);
    try {
      const ref = db.collection(session.role === 'student' ? 'students' : 'instructor').doc(session.id);
      const snapshot = await ref.get();
      const profile = snapshot.exists ? snapshot.data() : null;
      const allowed = value => value && (session.role === 'student' ? value.status === 'active' : !value.status || value.status === 'active') && (!value.role || value.role === session.role);
      if (!allowed(profile)) return res.status(403).json({ message: 'This account cannot change its password. Contact your instructor or administrator.' });
      if (typeof profile.password !== 'string' || !await bcrypt.compare(currentPassword, profile.password)) {
        return res.status(400).json({ message: 'Your current password is incorrect.' });
      }
      // bcrypt ignores input after 72 bytes; compare hashes too, including legacy passwords.
      if (await bcrypt.compare(newPassword, profile.password)) return res.status(400).json({ message: 'Choose a password different from your current password.' });
      const password = await bcrypt.hash(newPassword, 10);
      const changed = await db.runTransaction(async transaction => {
        const latest = await transaction.get(ref);
        if (!latest.exists || !allowed(latest.data()) || latest.data().password !== profile.password) return false;
        transaction.update(ref, { password, passwordChangedAt: new Date(now()) });
        return true;
      });
      if (!changed) return res.status(409).json({ message: 'Your account changed while saving. Check your current password and try again.' });
      attempts.delete(key);
      res.json({ message: 'Password updated. Use your new password the next time you sign in.' });
    } catch {
      res.status(503).json({ message: 'Your password could not be updated. Please try again.' });
    }
  });
  return router;
}
