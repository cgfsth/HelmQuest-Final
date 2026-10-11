// Read-only verification of the running API; never logs identities or credentials.
import assert from 'node:assert/strict';
import { db } from '../config/firebase-admin.js';

const instructors = await db.collection('instructor').get();
if (process.argv.includes('--inspect-missions')) {
  const [missions, scores, students] = await Promise.all([db.collection('missions').get(), db.collection('mission_score').get(), db.collection('students').get()]);
  const canonicalIds = new Set(students.docs.map(doc => doc.id));
  const legacyIds = new Set(students.docs.flatMap(doc => [doc.data().id, doc.data().studentId, doc.data().studentid, doc.data().uid]).filter(Boolean));
  console.log(JSON.stringify({
    missions: missions.docs.map(doc => ({ documentId: doc.id, moduleId: doc.data().moduleId, storedId: doc.data().id })),
    resultMissionIds: [...new Set(scores.docs.map(doc => doc.data().missionId))],
    studentReferenceMatches: { canonical: scores.docs.filter(doc => canonicalIds.has(doc.data().studentId)).length,
      legacy: scores.docs.filter(doc => legacyIds.has(doc.data().studentId)).length,
      unmatched: scores.docs.filter(doc => !canonicalIds.has(doc.data().studentId) && !legacyIds.has(doc.data().studentId)).length }
  }));
}
let index = 0;
for (const instructor of instructors.docs) {
  const url = `http://localhost:3001/api/v1/instructors/${encodeURIComponent(instructor.id)}/overview`;
  const response = await fetch(url);
  assert.equal(response.status, 200);
  const overview = await response.json();
  assert.equal(overview.completed, overview.missionProgress.reduce((sum, mission) => sum + mission.passed, 0));
  assert.equal(overview.totalPossibleCompletions, overview.totalStudents * overview.missionProgress.length);
  assert.equal(overview.completionRate, overview.totalPossibleCompletions ? Math.round(100 * overview.completed / overview.totalPossibleCompletions) : 0);
  assert.ok(overview.missionProgress.every(mission => mission.passed <= mission.total && mission.percentage >= 0 && mission.percentage <= 100));
  const refreshed = await fetch(url);
  assert.equal(refreshed.status, 200);
  assert.deepEqual(await refreshed.json(), overview);
  console.log(JSON.stringify({
    instructor: ++index, totalStudents: overview.totalStudents, studentsPassed: overview.studentsPassed,
    studentsNeedingRetry: overview.studentsNeedingRetry, completed: overview.completed,
    totalPossibleCompletions: overview.totalPossibleCompletions, completionRate: overview.completionRate,
    missions: overview.missionProgress.map(mission => ({ passed: mission.passed, total: mission.total, percentage: mission.percentage })),
    attention: overview.attentionTotal, recentResults: overview.recentResults.length, refreshConsistent: true
  }));
}
console.log(`Verified ${index} instructor overview(s).`);
process.exit(0);
