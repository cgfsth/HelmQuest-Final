// Dry run by default. --apply writes only derived rank/progress/badge fields.
import { db } from '../config/firebase-admin.js';
import { studentProgressionFields, studentTotalXp } from '../../shared/progression.js';
import { loadRankSettings, synchronizeStudentProgression } from '../services/progression.js';

const settings = await loadRankSettings();
const snapshot = await db.collection('students').get();
const apply = process.argv.includes('--apply');
const report = [];
for (const document of snapshot.docs) {
  const before = document.data();
  const fields = studentProgressionFields(before, settings);
  const changedFields = Object.keys(fields).filter(key => JSON.stringify(before[key]) !== JSON.stringify(fields[key]));
  const after = apply && changedFields.length
    ? await synchronizeStudentProgression(document.ref, settings) : before;
  report.push({
    id: document.id, xp: studentTotalXp(before), xpAfter: studentTotalXp(after),
    rank: fields.rank, changedFields,
    badgeIds: fields.badges.map(badge => badge.id)
  });
}
console.log(JSON.stringify({ mode: apply ? 'apply' : 'dry-run', ranks: settings.ranks, students: report }, null, 2));
process.exit(0);
