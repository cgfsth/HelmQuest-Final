// Read-only score audit. Excludes names, credentials, answers, and student identifiers.
import { db } from '../config/firebase-admin.js';

for (const [collection, fields] of [
  ['mission_score', ['studentId', 'missionId']],
  ['quiz_score', ['studentId', 'quizId']],
  ['quiz_submissions', ['studentId', 'quizId']],
  ['quiz_results', ['submissionid']]
]) {
  const snapshot = await db.collection(collection).get();
  const groups = new Map();
  let incompleteKeys = 0;
  for (const doc of snapshot.docs) {
    const data = doc.data();
    const keyParts = fields.map(field => data[field] ?? data[field.toLowerCase()]);
    if (keyParts.some(value => !value)) { incompleteKeys++; continue; }
    const key = JSON.stringify(keyParts);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push({
      documentId: doc.id, missionId: data.missionId, moduleId: data.moduleId,
      quizId: data.quizId ?? data.quizid, score: data.score ?? data['Quiz-score-percentage'],
      rawScore: data['raw-score'], passed: data.passed, xpAwarded: data.xpAwarded,
      completedAt: data.completedAt?.toDate?.()?.toISOString() ?? data.completedAt
    });
  }
  console.log(JSON.stringify({
    collection, documents: snapshot.size, uniqueKeys: groups.size, incompleteKeys,
    duplicateGroups: [...groups.values()].filter(group => group.length > 1),
    schemaFields: [...new Set(snapshot.docs.flatMap(doc => Object.keys(doc.data())))].sort()
  }));
}
process.exit(0);
