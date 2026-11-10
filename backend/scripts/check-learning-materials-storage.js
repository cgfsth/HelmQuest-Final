import admin, { storage } from '../config/firebase-admin.js';

// Read-only: never creates a bucket, changes billing/IAM or uploads any files.
const name = process.env.FIREBASE_STORAGE_BUCKET || 'helmquest-565d6.firebasestorage.app';
const required = ['storage.objects.create', 'storage.objects.get', 'storage.objects.delete', 'storage.objects.list'];
try {
  const bucket = storage.bucket(name);
  const [metadata] = await bucket.getMetadata();
  const [permissions] = await bucket.iam.testPermissions(required);
  const missingPermissions = required.filter(permission => !permissions[permission]);
  console.log(JSON.stringify({ bucket: name, exists: true, location: metadata.location, missingPermissions, ready: !missingPermissions.length }));
  if (missingPermissions.length) process.exitCode = 1;
} catch (error) {
  const code = String(error.code || 'unknown');
  console.error(JSON.stringify({ bucket: name, ready: false, code,
    message: code === '404' ? 'Storage bucket does not exist. Create it in Firebase Console > Storage and verify FIREBASE_STORAGE_BUCKET.'
      : ['401', '403'].includes(code) ? 'The backend service account cannot inspect this bucket. Check the bucket name and service-account permissions.'
      : 'Unable to check storage. Verify backend credentials and network access.' }));
  process.exitCode = 1;
} finally { await admin.app().delete(); }
