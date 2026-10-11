import admin from 'firebase-admin';
import { readFile } from 'fs/promises';

const serviceAccount = JSON.parse(
  await readFile(new URL('./serviceAccountKey.json', import.meta.url))
);

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

// Just fix the current quiz - simple and direct
const quizId = 'qMPRCW0iGKrOIQztQUyP';
const moduleId = 'custom-mission-1790824690643';

console.log('Creating quiz_assignment...');

const assignmentData = {
  quizId,
  targetId: moduleId,
  targetType: 'module',
  createdAt: new Date(),
  createdBy: 'UhrXehShLIZc3PBSj1RH'
};

const docRef = await db.collection('quiz_assignments').add(assignmentData);

console.log('✅ Created assignment:', docRef.id);
console.log('Quiz should load now!');

process.exit(0);
