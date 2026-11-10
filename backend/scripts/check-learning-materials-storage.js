import admin, { storage } from '../config/firebase-admin.js';
import { createMaterialsBucketProvider } from '../services/supabaseMaterialsStorage.js';

// Read-only: never creates a bucket, changes billing/IAM or uploads any files.
const getBucket = createMaterialsBucketProvider({ firebaseBucket: name => storage.bucket(name) });
const required = ['storage.objects.create', 'storage.objects.get', 'storage.objects.delete', 'storage.objects.list'];
try {
  const bucket = getBucket();
  const [metadata] = await bucket.getMetadata();
  if (bucket.provider === 'supabase') {
    await bucket.getFiles({ prefix: 'syllabi/', maxResults: 1 });
    console.log(JSON.stringify({ provider: 'supabase', bucket: bucket.name, exists: true, private: metadata.public === false, readable: true,
      note: 'Read-only check. Upload and delete permissions still require an end-to-end upload test.' }));
  } else {
    const [permissions] = await bucket.iam.testPermissions(required);
    const missingPermissions = required.filter(permission => !permissions[permission]);
    console.log(JSON.stringify({ provider: 'firebase', bucket: bucket.name, exists: true, location: metadata.location, missingPermissions, ready: !missingPermissions.length }));
    if (missingPermissions.length) process.exitCode = 1;
  }
} catch (error) {
  const code = String(error.code || 'unknown');
  console.error(JSON.stringify({ ready: false, code,
    message: code === 'storage/not-configured' ? 'Set the backend storage provider, project URL, private bucket name and server secret key.'
      : code === 'storage/public-bucket' ? 'The configured bucket is public. Turn Public bucket OFF before uploading protected documents.'
      : code === '404' ? 'Storage bucket does not exist. Verify the selected provider and bucket name.'
      : ['401', '403'].includes(code) ? 'The backend service account cannot inspect this bucket. Check the bucket name and service-account permissions.'
      : 'Unable to check storage. Verify backend credentials and network access.' }));
  process.exitCode = 1;
} finally { await admin.app().delete(); }
