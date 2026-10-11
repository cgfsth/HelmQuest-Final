// Read-only inspection; intentionally excludes credentials and personal information.
import { db } from '../config/firebase-admin.js';

const settings = await db.collection('course_settings').doc('global').get();
console.log(JSON.stringify({ courseSettings: settings.exists ? settings.data() : null }));
const students = await db.collection('students').get();
console.log(JSON.stringify(students.docs.map(doc => {
  const student = doc.data();
  return {
    id: doc.id, xp: student.xp, total_xp: student.total_xp,
    rank: student.rank, rankId: student.rankId,
    badges: student.badges, achievements: student.achievements,
    badgesEarned: student.badgesEarned
  };
})));
process.exit(0);
