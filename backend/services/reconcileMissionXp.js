import { db } from '../config/firebase-admin.js';
import { studentTotalXp, studentProgressionFields } from '../../shared/progression.js';
import { loadRankSettings } from './progression.js';
import { canonicalMissionId, readMissionReward } from './missionRewards.js';

// Repair only missing awards for already-passed missions. Positive recorded
// awards and intentionally processed zero-XP missions are never awarded again.
// Result scores, pass/fail, dates, quiz data, and unrelated student fields stay intact.
export async function reconcileStudentMissionXp(studentId, { apply = false, settings } = {}) {
  const rankSettings = settings ?? await loadRankSettings();
  return db.runTransaction(async transaction => {
    const studentRef = db.collection('students').doc(studentId);
    const studentSnapshot = await transaction.get(studentRef);
    if (!studentSnapshot.exists) return null;
    const student = studentSnapshot.data();
    const snapshot = await transaction.get(db.collection('mission_score').where('studentId', '==', studentId));
    const groups = new Map();
    for (const document of snapshot.docs) {
      const id = canonicalMissionId(document.data().missionId);
      if (!id) continue;
      if (!groups.has(id)) groups.set(id, []);
      groups.get(id).push(document);
    }
    const credits = [];
    const missingMissions = [];
    for (const [id, documents] of groups) {
      const passed = documents.filter(document => document.data().passed === true);
      if (!passed.length) continue;
      if (documents.some(document => Number(document.data().xpAmount) > 0 || document.data().xpProcessed === true)) continue;
      const mission = await readMissionReward(ref => transaction.get(ref), db, id);
      if (!mission || mission.reward === null) { missingMissions.push(id); continue; }
      const target = passed.sort((a, b) => {
        const time = document => {
          const date = document.data().completedAt;
          return (date?.toMillis?.() ?? new Date(date?.toDate?.() ?? date).getTime()) || 0;
        };
        return time(b) - time(a) || a.id.localeCompare(b.id);
      })[0];
      credits.push({ reference: target.ref, scoreId: target.id, missionId: mission.missionId,
        title: mission.data.mission_title || mission.data.title || id, xp: mission.reward });
    }
    const xpBefore = studentTotalXp(student);
    const xpAdded = credits.reduce((total, credit) => total + credit.xp, 0);
    const xpAfter = xpBefore + xpAdded;
    if (apply && credits.length) {
      const now = new Date();
      for (const credit of credits) transaction.update(credit.reference, {
        xpAmount: credit.xp, xpAwarded: credit.xp > 0, xpProcessed: true, xpReconciledAt: now
      });
      if (xpAdded) transaction.update(studentRef, {
        xp: xpAfter, total_xp: xpAfter,
        ...studentProgressionFields({ ...student, xp: xpAfter }, rankSettings), lastUpdated: now
      });
    }
    return { studentId, xpBefore, xpAdded, xpAfter,
      credits: credits.map(({ reference, ...credit }) => credit), missingMissions, applied: apply };
  });
}
