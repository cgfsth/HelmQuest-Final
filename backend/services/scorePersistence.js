import { createHash } from 'node:crypto';
import { db } from '../config/firebase-admin.js';
import { deriveProgression, studentTotalXp, studentProgressionFields } from '../../shared/progression.js';
import { loadRankSettings } from './progression.js';
import { canonicalMissionId, missionIdAliases, readMissionReward, hasMissionCompletion } from './missionRewards.js';

export function scoreDocumentId(...parts) {
  return createHash('sha256').update(JSON.stringify(parts)).digest('hex');
}

function timestamp(value) {
  const time = value?.toMillis?.() ?? new Date(value?.toDate?.() ?? value).getTime();
  return Number.isFinite(time) ? time : 0;
}

function latestDocument(documents, lockPassed = false) {
  return [...documents].sort((a, b) => {
    if (lockPassed) {
      const locked = hasMissionCompletion;
      const difference = Number(locked(b.data())) - Number(locked(a.data()));
      if (difference) return difference;
    }
    return timestamp(b.data().completedAt) - timestamp(a.data().completedAt) || a.id.localeCompare(b.id);
  })[0];
}

// Read the deterministic target even for legacy records. Concurrent first saves
// conflict on this read, so Firestore retries instead of creating two records.
async function existingResult(transaction, collection, keys, id, lockPassed = false) {
  const reference = db.collection(collection).doc(id);
  const canonical = await transaction.get(reference);
  let query = db.collection(collection);
  for (const [key, value] of Object.entries(keys)) query = query.where(key, '==', value);
  const matches = await transaction.get(query);
  const documents = matches.docs.slice();
  if (canonical.exists && !documents.some(doc => doc.id === canonical.id)) documents.push(canonical);
  return { existing: latestDocument(documents, lockPassed), reference };
}

async function missionResult(transaction, studentId, missionId) {
  const reference = db.collection('mission_score').doc(scoreDocumentId('mission', studentId, canonicalMissionId(missionId)));
  const canonical = await transaction.get(reference);
  const matches = await transaction.get(db.collection('mission_score').where('studentId', '==', studentId)
    .where('missionId', 'in', missionIdAliases(missionId)));
  const documents = matches.docs.slice();
  if (canonical.exists && !documents.some(doc => doc.id === canonical.id)) documents.push(canonical);
  return { existing: latestDocument(documents, true), reference };
}

function missionIsLocked(document) {
  return document && hasMissionCompletion(document.data());
}

export async function saveMissionResult(input) {
  const settings = await loadRankSettings();
  return db.runTransaction(async transaction => {
    const { existing, reference } = await missionResult(transaction, input.studentId, input.missionId);
    const studentRef = db.collection('students').doc(input.studentId);
    const studentSnapshot = await transaction.get(studentRef);
    const student = studentSnapshot.exists ? studentSnapshot.data() : {};
    const previousRank = deriveProgression(studentTotalXp(student), settings).rank;
    const response = {
      scoreId: existing?.id ?? reference.id, xpAwarded: 0,
      totalXp: studentTotalXp(student), rank: previousRank.name, rankId: previousRank.id,
      rankChanged: false, previousRank: previousRank.name, isUpdate: !!existing
    };
    if (missionIsLocked(existing)) {
      return { ...response, data: existing.data(), skipped: true, reason: 'mission_already_passed' };
    }
    if (existing && timestamp(input.completedAt) < timestamp(existing.data().completedAt)) {
      return { ...response, data: existing.data(), skipped: true, reason: 'older_result' };
    }

    let xpAwarded = 0;
    let xpProcessed = false;
    if (input.passed && studentSnapshot.exists) {
      const mission = await readMissionReward(ref => transaction.get(ref), db, input.missionId);
      if (mission?.reward !== null && mission?.reward !== undefined) {
        xpAwarded = mission.reward;
        xpProcessed = true;
      }
    }
    const totalXp = studentTotalXp(student) + xpAwarded;
    const rank = deriveProgression(totalXp, settings).rank;
    const now = new Date();
    const data = {
      ...input, createdAt: existing?.data().createdAt ?? now,
      xpAwarded: xpAwarded > 0, xpAmount: xpAwarded, xpProcessed,
      ...(existing ? { updatedAt: now } : {})
    };
    // Result and XP commit together. A failed commit cannot leave XP awarded
    // without a saved completion marker, or vice versa.
    if (studentSnapshot.exists) {
      const fields = studentProgressionFields({ ...student, xp: totalXp }, settings);
      const patch = Object.fromEntries(Object.entries(fields).filter(([key, value]) =>
        JSON.stringify(student[key]) !== JSON.stringify(value)));
      if (xpAwarded) Object.assign(patch, { xp: totalXp, total_xp: totalXp, lastUpdated: now });
      if (Object.keys(patch).length) transaction.update(studentRef, patch);
    }
    transaction.set(existing?.ref ?? reference, data, { merge: true });
    return {
      ...response, data, skipped: false, xpAwarded, totalXp,
      rank: rank.name, rankId: rank.id, rankChanged: rank.id !== previousRank.id
    };
  });
}

export async function saveQuizResult(input) {
  return db.runTransaction(async transaction => {
    // Quiz IDs are stable even when the module/context supplied by a client changes.
    const keys = input.quizId ? { studentId: input.studentId, quizId: input.quizId }
      : { studentId: input.studentId, moduleId: input.moduleId, quizId: '' };
    const { existing, reference } = await existingResult(transaction, 'quiz_score', keys,
      scoreDocumentId('quiz', input.studentId, input.quizId || ['module', input.moduleId]));
    const response = { scoreId: existing?.id ?? reference.id, isUpdate: !!existing };
    if (existing) {
      return { ...response, data: existing.data(), skipped: true, reason: 'quiz_already_completed' };
    }
    if (input.missionId) {
      const mission = await missionResult(transaction, input.studentId, input.missionId);
      if (missionIsLocked(mission.existing)) {
        return { ...response, scoreId: existing?.id ?? null, data: existing?.data() ?? null,
          skipped: true, reason: 'mission_already_passed' };
      }
    } else if (input.moduleId) {
      // Old clients sent moduleId only. Resolve every matching mission, without
      // assuming the moduleId is itself the persisted mission ID.
      const missions = await transaction.get(db.collection('missions').where('moduleId', '==', input.moduleId));
      const candidates = new Set(missions.docs.map(mission => mission.id));
      // Existing synthetic missions use CUSTOM-${moduleId}; old score clients
      // supplied just the training module ID. Preserve their completion guard.
      candidates.add(input.moduleId);
      candidates.add(input.moduleId.startsWith('CUSTOM-') ? input.moduleId : `CUSTOM-${input.moduleId}`);
      for (const missionId of candidates) {
        const result = await missionResult(transaction, input.studentId, missionId);
        if (missionIsLocked(result.existing)) {
          return { ...response, scoreId: existing?.id ?? null, data: existing?.data() ?? null,
            skipped: true, reason: 'mission_already_passed' };
        }
      }
    }
    const now = new Date();
    const data = { ...input, createdAt: existing?.data().createdAt ?? now,
      ...(existing ? { updatedAt: now } : {}) };
    transaction.set(existing?.ref ?? reference, data, { merge: true });
    return { ...response, data, skipped: false };
  });
}

export async function saveQuizGrade(submissionId, data) {
  return db.runTransaction(async transaction => {
    const submissionRef = db.collection('quiz_score').doc(submissionId);
    const submission = await transaction.get(submissionRef);
    if (!submission.exists) throw new Error('Submission not found');
    const { existing, reference } = await existingResult(transaction, 'quiz_results',
      { submissionid: submissionId }, scoreDocumentId('quiz-result', submissionId));
    transaction.set(existing?.ref ?? reference, data, { merge: true });
    transaction.update(submissionRef, { status: 'graded' });
  });
}
