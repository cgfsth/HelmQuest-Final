import { canonicalMissionId, hasMissionCompletion } from '../backend/services/missionRewards.js';

// Accept both SDK timestamps and their JSON representation from older APIs.
export function trainingRecordDate(value) {
  if (value === undefined || value === null || value === '') return null;
  try {
    let date;
    if (typeof value.toDate === 'function') date = value.toDate();
    else if (typeof value.toMillis === 'function') date = new Date(value.toMillis());
    else if (typeof value === 'object' && Number.isFinite(value.seconds ?? value._seconds)) {
      date = new Date((value.seconds ?? value._seconds) * 1000 + (value.nanoseconds ?? value._nanoseconds ?? 0) / 1e6);
    } else date = new Date(value);
    return Number.isFinite(date.getTime()) ? date.toISOString() : null;
  } catch { return null; }
}

export function uniqueTrainingRecords(records, kind = 'mission') {
  const selected = new Map();
  const time = record => Date.parse(kind === 'quiz' ? record.submittedAt : record.completedAt) || 0;
  const compare = (a, b) => (kind === 'mission' ? Number(hasMissionCompletion(b)) - Number(hasMissionCompletion(a)) : 0)
    || time(b) - time(a) || String(a.id || '').localeCompare(String(b.id || ''));
  records.forEach((record, index) => {
    const completedAt = trainingRecordDate(record.completedAt) || trainingRecordDate(record.submittedAt)
      || trainingRecordDate(record.updatedAt) || trainingRecordDate(record.createdAt);
    const normalized = { ...record, completedAt,
      ...(kind === 'quiz' ? { submittedAt: trainingRecordDate(record.submittedAt) || completedAt } : {}) };
    const identity = kind === 'mission' ? canonicalMissionId(record.missionId)
      : record.quizId || (record.moduleId ? ['module', record.moduleId] : null);
    // Titles are not identities: different activities can have the same name.
    const key = identity ? JSON.stringify([record.studentId || '', identity]) : JSON.stringify(['record', index]);
    const previous = selected.get(key);
    if (!previous || compare(normalized, previous) < 0) selected.set(key, normalized);
  });
  return [...selected.values()].sort((a, b) => time(b) - time(a) || String(a.id || '').localeCompare(String(b.id || '')));
}
