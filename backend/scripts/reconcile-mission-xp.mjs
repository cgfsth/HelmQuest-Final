// Dry run by default. --apply atomically credits verified missing mission XP.
import { db } from '../config/firebase-admin.js';
import { loadRankSettings } from '../services/progression.js';
import { reconcileStudentMissionXp } from '../services/reconcileMissionXp.js';

const apply = process.argv.includes('--apply');
const settings = await loadRankSettings();
const studentArgument = process.argv.indexOf('--student');
const ids = studentArgument >= 0 ? [process.argv[studentArgument + 1]]
  : (await db.collection('students').get()).docs.map(document => document.id);
if (ids.some(id => !id || id.startsWith('--'))) throw new Error('--student requires a student document ID');
const students = [];
for (const id of ids) students.push(await reconcileStudentMissionXp(id, { apply, settings }));
console.log(JSON.stringify({ mode: apply ? 'apply' : 'dry-run', students }, null, 2));
process.exit(0);
