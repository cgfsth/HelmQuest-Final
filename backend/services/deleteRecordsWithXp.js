import { canonicalMissionId } from './missionRewards.js';
import { studentTotalXp, studentProgressionFields } from '../../shared/progression.js';

function recordedCredits(documents, excluded = new Set()) {
  const missions = new Map();
  for (const document of documents) {
    if (excluded.has(document.ref.path)) continue;
    const result = document.data(), amount = Number(result.xpAmount);
    if (!Number.isFinite(amount) || amount <= 0) continue;
    const missionId = canonicalMissionId(result.missionId || result.missionid || result.mission_id) || document.id;
    // A mission awards XP once. Legacy duplicate/alias rows are the same credit.
    missions.set(missionId, Math.max(missions.get(missionId) || 0, amount));
  }
  return [...missions.values()].reduce((total, amount) => total + amount, 0);
}

// Delete scores and reverse their credited XP in the same transaction. Retrying
// a committed batch sees missing scores and cannot deduct the award twice.
export async function deleteRecordsWithXp(db, operations) {
  await db.runTransaction(async tx => {
    const scores = await Promise.all(operations.filter(operation => operation.collection === 'mission_score').map(operation => tx.get(operation.ref)));
    const studentIds = [...new Set(scores.filter(score => score.exists).map(score => score.data().studentId)
      .filter(id => typeof id === 'string' && /^[\w-]{1,128}$/.test(id)))];
    const excluded = new Set(operations.filter(operation => operation.collection === 'mission_score').map(operation => operation.ref.path));
    const changes = [];
    const settings = studentIds.length ? await tx.get(db.collection('course_settings').doc('global')) : null;
    for (const studentId of studentIds) {
      const studentRef = db.collection('students').doc(studentId);
      const student = await tx.get(studentRef);
      if (!student.exists) continue;
      const results = await tx.get(db.collection('mission_score').where('studentId', '==', studentId));
      const deduction = recordedCredits(results.docs) - recordedCredits(results.docs, excluded);
      if (deduction <= 0) continue;
      const data = student.data(), xp = Math.max(0, studentTotalXp(data) - deduction);
      changes.push({ ref: studentRef, patch: { xp, total_xp: xp,
        ...studentProgressionFields({ ...data, xp }, settings?.exists ? settings.data() : {}), lastUpdated: new Date() } });
    }
    // All reads precede writes. Student reads serialize concurrent XP awards.
    for (const { ref, patch } of changes) tx.update(ref, patch);
    for (const { ref, patch } of operations) { if (patch) tx.update(ref, patch); else tx.delete(ref); }
  });
}
