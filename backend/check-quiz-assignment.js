/**
 * Check Quiz Assignment for Mission
 * 
 * Root Cause Analysis: Why quiz not loading?
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

async function checkQuizAssignment() {
  try {
    const targetModuleId = 'custom-mission-1790755414401';
    const targetModuleIdWithPrefix = 'CUSTOM-custom-mission-1790755414401';
    
    console.log('═══════════════════════════════════════════════════');
    console.log('🔍 Quiz Assignment Checker');
    console.log('═══════════════════════════════════════════════════\n');
    
    console.log('Target Module IDs:');
    console.log(`  1. ${targetModuleId}`);
    console.log(`  2. ${targetModuleIdWithPrefix}\n`);
    
    // Check 1: Find quiz with this moduleId
    console.log('📊 Step 1: Check quiz collection...\n');
    const quizSnapshot = await db.collection('quiz').get();
    console.log(`Total quizzes: ${quizSnapshot.size}\n`);
    
    let foundQuiz = null;
    quizSnapshot.forEach(doc => {
      const quiz = doc.data();
      const moduleIds = Array.isArray(quiz.moduleId) ? quiz.moduleId : [quiz.moduleId];
      
      console.log(`Quiz ID: ${doc.id}`);
      console.log(`  moduleId: ${JSON.stringify(quiz.moduleId)}`);
      console.log(`  title: ${quiz.title || 'Untitled'}`);
      
      // Check if matches any of our target IDs
      const matches = moduleIds.some(id => 
        id === targetModuleId || id === targetModuleIdWithPrefix
      );
      
      if (matches) {
        console.log(`  ✅ MATCHES target module!`);
        foundQuiz = { id: doc.id, ...quiz };
      } else {
        console.log(`  ❌ Does not match`);
      }
      console.log();
    });
    
    if (!foundQuiz) {
      console.log('❌ No quiz found with matching moduleId!\n');
      return;
    }
    
    console.log(`✅ Found quiz: ${foundQuiz.id}\n`);
    
    // Check 2: Find quiz_assignments
    console.log('📊 Step 2: Check quiz_assignments collection...\n');
    const assignmentsSnapshot = await db.collection('quiz_assignments').get();
    console.log(`Total assignments: ${assignmentsSnapshot.size}\n`);
    
    let foundAssignment = null;
    assignmentsSnapshot.forEach(doc => {
      const assignment = doc.data();
      console.log(`Assignment ID: ${doc.id}`);
      console.log(`  quizId: ${assignment.quizId}`);
      console.log(`  targetId: ${assignment.targetId}`);
      console.log(`  targetType: ${assignment.targetType}`);
      
      // Check if this assignment points to our quiz AND our module
      if (assignment.quizId === foundQuiz.id) {
        console.log(`  ✅ Points to our quiz!`);
        if (assignment.targetId === targetModuleId || assignment.targetId === targetModuleIdWithPrefix) {
          console.log(`  ✅ Points to our module!`);
          foundAssignment = { id: doc.id, ...assignment };
        } else {
          console.log(`  ❌ Points to different module: ${assignment.targetId}`);
        }
      } else {
        console.log(`  ❌ Points to different quiz`);
      }
      console.log();
    });
    
    if (!foundAssignment) {
      console.log('❌ NO QUIZ ASSIGNMENT FOUND!\n');
      console.log('🔧 ROOT CAUSE: Quiz exists but no assignment links it to the module!\n');
      console.log('💡 SOLUTION: Create quiz_assignment document\n');
      
      // Create the missing assignment
      console.log('Creating quiz_assignment...\n');
      const assignmentData = {
        quizId: foundQuiz.id,
        targetId: targetModuleId,
        targetType: 'module',
        createdAt: new Date(),
        createdBy: foundQuiz.createdBy || 'system'
      };
      
      const assignmentRef = await db.collection('quiz_assignments').add(assignmentData);
      console.log(`✅ Created assignment: ${assignmentRef.id}\n`);
      console.log('Assignment data:', JSON.stringify(assignmentData, null, 2), '\n');
      
      console.log('✅ FIX APPLIED! Quiz should load now!\n');
    } else {
      console.log(`✅ Assignment found: ${foundAssignment.id}\n`);
      console.log('Assignment data:', JSON.stringify(foundAssignment, null, 2), '\n');
      console.log('✅ Everything looks correct!\n');
    }
    
    // Check 3: Verify in instructor's progress data
    console.log('📊 Step 3: Check instructor progress data...\n');
    const usersSnapshot = await db.collection('users')
      .where('role', '==', 'instructor')
      .get();
    
    console.log(`Total instructors: ${usersSnapshot.size}\n`);
    
    usersSnapshot.forEach(doc => {
      const user = doc.data();
      console.log(`Instructor: ${user.email}`);
      
      if (user.progress?.quizzes) {
        const hasQuiz = user.progress.quizzes.some(q => q.id === foundQuiz.id);
        console.log(`  Has quiz in progress.quizzes: ${hasQuiz ? '✅' : '❌'}`);
      } else {
        console.log(`  progress.quizzes: ❌ Not found`);
      }
      
      if (user.progress?.quizAssignments) {
        const hasAssignment = user.progress.quizAssignments.some(a => 
          a.quizId === foundQuiz.id && 
          (a.targetId === targetModuleId || a.targetId === targetModuleIdWithPrefix)
        );
        console.log(`  Has assignment in progress.quizAssignments: ${hasAssignment ? '✅' : '❌'}`);
      } else {
        console.log(`  progress.quizAssignments: ❌ Not found`);
      }
      console.log();
    });
    
    console.log('═══════════════════════════════════════════════════');
    console.log('✅ Analysis Complete!');
    console.log('═══════════════════════════════════════════════════\n');
    
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkQuizAssignment();
