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

console.log('🔧 Creating quiz_assignments for ALL quizzes...\n');

// Get all quizzes
const quizzesSnapshot = await db.collection('quiz').get();
console.log(`Found ${quizzesSnapshot.size} quizzes\n`);

for (const quizDoc of quizzesSnapshot.docs) {
  const quiz = quizDoc.data();
  const quizId = quizDoc.id;
  const moduleIds = Array.isArray(quiz.moduleId) ? quiz.moduleId : [quiz.moduleId];
  
  console.log(`Quiz: ${quizId}`);
  console.log(`  Title: ${quiz.title}`);
  console.log(`  ModuleIds: ${JSON.stringify(moduleIds)}`);
  
  // Create assignment for EACH moduleId variant
  for (const moduleId of moduleIds) {
    if (!moduleId) continue;
    
    // Check if assignment already exists
    const existingSnapshot = await db.collection('quiz_assignments')
      .where('quizId', '==', quizId)
      .where('targetId', '==', moduleId)
      .get();
    
    if (!existingSnapshot.empty) {
      console.log(`  ✅ Assignment already exists for ${moduleId}`);
      continue;
    }
    
    // Create new assignment
    const assignmentData = {
      quizId,
      targetId: moduleId,
      targetType: 'module',
      createdAt: new Date(),
      createdBy: quiz.createdBy || 'system'
    };
    
    const docRef = await db.collection('quiz_assignments').add(assignmentData);
    console.log(`  ✅ Created assignment ${docRef.id} for ${moduleId}`);
  }
  
  console.log();
}

console.log('✅ Done! All quizzes now have assignments!\n');

process.exit(0);
