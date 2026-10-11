/**
 * Fix Quiz ModuleId Mismatch
 * 
 * Problem: Quiz has moduleId "custom-mission-1790755414401"
 *          but mission ID is "CUSTOM-custom-mission-1790755414401"
 * 
 * Solution: Add "CUSTOM-" prefix to quiz moduleId
 */

import admin from 'firebase-admin';
import { readFile } from 'fs/promises';

// Load service account
const serviceAccount = JSON.parse(
  await readFile(new URL('./serviceAccountKey.json', import.meta.url))
);

// Initialize Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: 'https://helmquest-565d6.firebaseio.com'
  });
}

const db = admin.firestore();

async function fixQuizModuleId() {
  try {
    console.log('🔍 Searching for quiz with wrong moduleId...\n');
    
    // Get all quizzes
    const quizzesSnapshot = await db.collection('quiz').get();
    
    console.log(`📊 Total quizzes found: ${quizzesSnapshot.size}\n`);
    
    let fixedCount = 0;
    
    for (const doc of quizzesSnapshot.docs) {
      const quiz = doc.data();
      const quizId = doc.id;
      const currentModuleId = quiz.moduleId;
      
      // Check if moduleId exists and is for a custom mission
      if (currentModuleId && currentModuleId.includes('custom-mission-')) {
        
        // Create both versions
        let moduleId1, moduleId2;
        
        if (currentModuleId.startsWith('CUSTOM-')) {
          // Already has prefix, create non-prefix version
          moduleId1 = currentModuleId; // "CUSTOM-custom-mission-..."
          moduleId2 = currentModuleId.replace(/^CUSTOM-/, ''); // "custom-mission-..."
        } else {
          // No prefix, create prefixed version
          moduleId1 = currentModuleId; // "custom-mission-..."
          moduleId2 = 'CUSTOM-' + currentModuleId; // "CUSTOM-custom-mission-..."
        }
        
        // Check if already has both versions
        if (Array.isArray(quiz.moduleId) && quiz.moduleId.length === 2) {
          console.log(`✅ Quiz ${quizId} already has both moduleIds, skipping...\n`);
          continue;
        }
        
        console.log(`🔧 Fixing quiz: ${quizId}`);
        console.log(`   OLD moduleId: "${currentModuleId}" (string)`);
        console.log(`   NEW moduleId: ["${moduleId1}", "${moduleId2}"] (array)`);
        
        // Update to array with both versions
        await db.collection('quiz').doc(quizId).update({
          moduleId: [moduleId1, moduleId2]
        });
        
        console.log(`   ✅ Updated!\n`);
        fixedCount++;
      }
    }
    
    if (fixedCount === 0) {
      console.log('✅ No quizzes needed fixing. All moduleIds are correct!\n');
    } else {
      console.log(`\n🎉 Successfully fixed ${fixedCount} quiz(zes)!\n`);
    }
    
    // Verify the fix
    console.log('🔍 Verifying fix...\n');
    const verifySnapshot = await db.collection('quiz').get();
    
    console.log('📋 All quizzes after fix:\n');
    verifySnapshot.forEach(doc => {
      const quiz = doc.data();
      const moduleIds = Array.isArray(quiz.moduleId) ? quiz.moduleId : [quiz.moduleId];
      
      console.log(`   Quiz ID: ${doc.id}`);
      console.log(`   Module IDs: ${JSON.stringify(moduleIds)}`);
      console.log(`   Title: ${quiz.title || 'Untitled'}`);
      console.log(`   Questions: ${quiz.questions?.length || 0}\n`);
    });
    
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Error fixing quiz moduleId:', error);
    process.exit(1);
  }
}

// Run the fix
console.log('═══════════════════════════════════════════════════');
console.log('🔧 Quiz ModuleId Fixer');
console.log('═══════════════════════════════════════════════════\n');

fixQuizModuleId();
