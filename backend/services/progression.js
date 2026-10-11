import { db } from '../config/firebase-admin.js';
import { getRankConfiguration, studentProgressionFields } from '../../shared/progression.js';

export async function loadRankSettings() {
  const snapshot = await db.collection('course_settings').doc('global').get();
  return { ranks: getRankConfiguration(snapshot.exists ? snapshot.data() : {}) };
}

// Re-read inside a transaction: reconciliation must never replace a concurrent award.
// No XP writes, new awards, achievement flags, or timestamps on page refresh.
export async function synchronizeStudentProgression(studentRef, settings) {
  const rankSettings = settings ?? await loadRankSettings();
  return db.runTransaction(async transaction => {
    const snapshot = await transaction.get(studentRef);
    if (!snapshot.exists) return null;
    const student = snapshot.data();
    const fields = studentProgressionFields(student, rankSettings);
    const patch = Object.fromEntries(Object.entries(fields).filter(([key, value]) =>
      JSON.stringify(student[key]) !== JSON.stringify(value)));
    if (Object.keys(patch).length) transaction.update(studentRef, patch);
    return { id: snapshot.id, ...student, ...fields };
  });
}
