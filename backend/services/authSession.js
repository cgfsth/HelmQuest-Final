import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

// Without a configured secret, a server restart invalidates existing sessions.
const sessionSecret = process.env.AUTH_SESSION_SECRET || randomBytes(32).toString('hex');
const sign = payload => createHmac('sha256', sessionSecret).update(payload).digest('base64url');

export function issueSession(id, role) {
  const payload = Buffer.from(JSON.stringify({ id, role, expiresAt: Date.now() + 12 * 60 * 60 * 1000 })).toString('base64url');
  return `${payload}.${sign(payload)}`;
}

export function verifySession(token) {
  if (typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [payload, signature] = parts;
  const expected = Buffer.from(sign(payload));
  const actual = Buffer.from(signature);
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return null;
  try {
    const session = JSON.parse(Buffer.from(payload, 'base64url').toString());
    return session.id && ['instructor', 'student', 'admin'].includes(session.role) && session.expiresAt > Date.now() ? session : null;
  } catch {
    return null;
  }
}
