import { learningMaterials } from '../routes/learningMaterials.js';
import admin from '../config/firebase-admin.js';

// Run as a scheduled server task with the same private service account as the API.
try {
  const result = await learningMaterials.cleanup({ id: 'scheduled-cleanup', role: 'admin' });
  const removed = await learningMaterials.sweepOrphans();
  console.log(JSON.stringify({ ...result, unreferencedFilesRemoved: removed }));
  if (result.cleanupPending) process.exitCode = 1;
} catch (error) {
  console.error('Learning material cleanup failed:', error.code || error.name);
  process.exitCode = 1;
} finally {
  await admin.app().delete();
}
