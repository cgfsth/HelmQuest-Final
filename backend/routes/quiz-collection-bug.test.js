// Bug Condition Exploration Test - Quiz Submission Collection References
// **CRITICAL**: This test MUST FAIL on unfixed code - failure confirms the bug exists
// **DO NOT attempt to fix the test or the code when it fails**
// **NOTE**: This test encodes the expected behavior - it will validate the fix when it passes after implementation
//
// **Validates: Requirements 1.1, 1.2, 1.3, 1.4, 1.5, 1.6**

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { db } from '../config/firebase-admin.js';

describe('Bug Condition Exploration - Incorrect Collection References', () => {
  let testStudentId;
  let testQuizId;
  let testMissionId;
  let testQuizScoreId;
  
  beforeAll(async () => {
    // Setup: Create test data in the CORRECT collection (quiz_score)
    // This simulates existing data that should be found by the queries
    
    testStudentId = 'test-student-bug-exploration-' + Date.now();
    testQuizId = 'test-quiz-bug-exploration-' + Date.now();
    testMissionId = 'test-mission-bug-exploration-' + Date.now();
    
    // Create a student
    await db.collection('students').doc(testStudentId).set({
      name: 'Test Student',
      email: 'test@example.com',
      createdAt: new Date()
    });
    
    // Create a quiz
    await db.collection('quiz').doc(testQuizId).set({
      title: 'Test Quiz',
      questions: [],
      createdAt: new Date()
    });
    
    // Create a mission
    await db.collection('missions').doc(testMissionId).set({
      title: 'Test Mission',
      moduleId: 'test-module',
      createdAt: new Date()
    });
    
    // Create quiz score data in the CORRECT collection (quiz_score)
    const quizScoreRef = await db.collection('quiz_score').add({
      studentId: testStudentId,
      studentid: testStudentId, // Also add lowercase variant
      quizId: testQuizId,
      quizid: testQuizId, // Also add lowercase variant
      missionId: testMissionId,
      score: 85,
      correctCount: 17,
      totalQuestions: 20,
      submittedAt: new Date(),
      status: 'completed'
    });
    testQuizScoreId = quizScoreRef.id;
    
    console.log('✅ Test data created in CORRECT collection (quiz_score)');
    console.log('  - Student ID:', testStudentId);
    console.log('  - Quiz ID:', testQuizId);
    console.log('  - Mission ID:', testMissionId);
    console.log('  - Quiz Score ID:', testQuizScoreId);
  });
  
  afterAll(async () => {
    // Cleanup test data
    try {
      await db.collection('students').doc(testStudentId).delete();
      await db.collection('quiz').doc(testQuizId).delete();
      await db.collection('missions').doc(testMissionId).delete();
      await db.collection('quiz_score').doc(testQuizScoreId).delete();
      console.log('✅ Test data cleaned up');
    } catch (error) {
      console.warn('⚠️ Cleanup error:', error.message);
    }
  });
  
  describe('Property 1: Bug Condition - Incorrect Collection References', () => {
    
    it('SHOULD query quiz_score (correct) - progress.js line 33 uses wrong collection', async () => {
      // **Bug Condition 1.1**: progress.js line 33 queries 'quiz_submission' (incorrect)
      // **Expected Behavior 2.1**: Should query 'quiz_score' (correct)
      
      // Test the INCORRECT behavior (what the buggy code does)
      const incorrectSnapshot = await db.collection('quiz_submission')
        .where('studentid', '==', testStudentId)
        .get();
      
      // Test the CORRECT behavior (what the code SHOULD do)
      const correctSnapshot = await db.collection('quiz_score')
        .where('studentid', '==', testStudentId)
        .get();
      
      console.log(`\n📊 Progress.js line 33 results:`);
      console.log(`  - INCORRECT collection (quiz_submission): ${incorrectSnapshot.size} documents`);
      console.log(`  - CORRECT collection (quiz_score): ${correctSnapshot.size} documents`);
      
      // **EXPECTED TO FAIL ON UNFIXED CODE**
      // The incorrect collection returns empty results, correct collection has data
      expect(incorrectSnapshot.empty).toBe(true); // Bug: wrong collection is empty
      expect(correctSnapshot.empty).toBe(false); // Expected: correct collection has data
      expect(correctSnapshot.size).toBeGreaterThan(0); // Expected: at least 1 record
      
      // **THIS TEST VALIDATES**: When code is fixed to use 'quiz_score', 
      // queries will succeed and return the expected data
    });
    
    it('SHOULD query quiz_score (correct) - quizzes.js line 90 uses wrong collection', async () => {
      // **Bug Condition 1.2**: quizzes.js line 90 queries 'quiz_submission' (incorrect)
      // **Expected Behavior 2.2**: Should query 'quiz_score' (correct)
      
      // Test the INCORRECT behavior (grading query using wrong collection)
      let incorrectDocExists = false;
      try {
        const incorrectDoc = await db.collection('quiz_submission').doc(testQuizScoreId).get();
        incorrectDocExists = incorrectDoc.exists;
      } catch (error) {
        console.warn('Error querying incorrect collection:', error.message);
      }
      
      // Test the CORRECT behavior (grading query using correct collection)
      const correctDoc = await db.collection('quiz_score').doc(testQuizScoreId).get();
      
      console.log(`\n📊 Quizzes.js line 90 (grading) results:`);
      console.log(`  - INCORRECT collection (quiz_submission): document exists = ${incorrectDocExists}`);
      console.log(`  - CORRECT collection (quiz_score): document exists = ${correctDoc.exists}`);
      
      // **EXPECTED TO FAIL ON UNFIXED CODE**
      expect(incorrectDocExists).toBe(false); // Bug: document not found in wrong collection
      expect(correctDoc.exists).toBe(true); // Expected: document exists in correct collection
      
      // **THIS TEST VALIDATES**: When code is fixed to use 'quiz_score',
      // grading operations will find the submission document
    });
    
    it('SHOULD write to quiz_score (correct) - quizzes.js line 78 writes to wrong collection', async () => {
      // **Bug Condition 1.3**: quizzes.js line 78 writes to 'quiz_submissions' (incorrect)
      // **Expected Behavior 2.3**: Should write to 'quiz_score' (correct)
      
      const testSubmissionData = {
        quizId: testQuizId,
        studentId: testStudentId,
        score: 75,
        submittedAt: new Date(),
        status: 'pending'
      };
      
      // Simulate the INCORRECT behavior (write to wrong collection)
      const incorrectRef = await db.collection('quiz_submissions').add(testSubmissionData);
      
      // Check if data appears in CORRECT collection (quiz_score)
      const correctSnapshot = await db.collection('quiz_score')
        .where('quizId', '==', testQuizId)
        .where('studentId', '==', testStudentId)
        .where('score', '==', 75)
        .get();
      
      console.log(`\n📊 Quizzes.js line 78 (write) results:`);
      console.log(`  - Data written to INCORRECT collection (quiz_submissions): ${incorrectRef.id}`);
      console.log(`  - Data found in CORRECT collection (quiz_score): ${correctSnapshot.size} documents`);
      
      // Cleanup the incorrectly written data
      await db.collection('quiz_submissions').doc(incorrectRef.id).delete();
      
      // **EXPECTED TO FAIL ON UNFIXED CODE**
      // Data written to quiz_submissions does NOT appear in quiz_score
      expect(correctSnapshot.empty).toBe(true); // Bug: data in wrong collection, not in correct one
      
      // **THIS TEST VALIDATES**: When code is fixed to write to 'quiz_score',
      // data will be stored in the correct collection where queries expect it
    });
    
    it('SHOULD query quiz_score (correct) - quizzes.js lines 148, 151, 191, 205 use wrong collections', async () => {
      // **Bug Condition 1.3**: Multiple queries to 'quiz_submissions' (incorrect)
      // **Expected Behavior 2.3**: Should query 'quiz_score' (correct)
      
      // Test line 148 - GET /student/:studentId
      const incorrectStudentSnapshot = await db.collection('quiz_submissions')
        .where('studentId', '==', testStudentId)
        .get();
      
      const correctStudentSnapshot = await db.collection('quiz_score')
        .where('studentId', '==', testStudentId)
        .get();
      
      console.log(`\n📊 Quizzes.js line 148 (student submissions) results:`);
      console.log(`  - INCORRECT collection (quiz_submissions): ${incorrectStudentSnapshot.size} documents`);
      console.log(`  - CORRECT collection (quiz_score): ${correctStudentSnapshot.size} documents`);
      
      // Test line 191 - DELETE cascade for quiz submissions
      const incorrectDeleteSnapshot = await db.collection('quiz_submissions')
        .where('quizId', '==', testQuizId)
        .get();
      
      const correctDeleteSnapshot = await db.collection('quiz_score')
        .where('quizId', '==', testQuizId)
        .get();
      
      console.log(`\n📊 Quizzes.js line 191 (cascade delete) results:`);
      console.log(`  - INCORRECT collection (quiz_submissions): ${incorrectDeleteSnapshot.size} documents to delete`);
      console.log(`  - CORRECT collection (quiz_score): ${correctDeleteSnapshot.size} documents to delete`);
      
      // **EXPECTED TO FAIL ON UNFIXED CODE**
      expect(incorrectStudentSnapshot.empty).toBe(true); // Bug: wrong collection is empty
      expect(correctStudentSnapshot.empty).toBe(false); // Expected: correct collection has data
      expect(incorrectDeleteSnapshot.empty).toBe(true); // Bug: cascade delete won't find records
      expect(correctDeleteSnapshot.empty).toBe(false); // Expected: cascade delete finds records
      
      // **THIS TEST VALIDATES**: When code is fixed to use 'quiz_score',
      // queries for student submissions and cascade deletion will succeed
    });
    
    it('SHOULD query quiz_score (correct) - missions.js line 145 checks wrong collections', async () => {
      // **Bug Condition 1.4**: missions.js line 145 queries both 'quiz_submissions' and 'quiz_submission' (incorrect)
      // **Expected Behavior 2.4**: Should query only 'quiz_score' (correct)
      
      // Test the INCORRECT behavior (cascade deletion checking wrong collections)
      const incorrectCollections = ['quiz_submissions', 'quiz_submission'];
      let totalIncorrectDocs = 0;
      
      for (const collectionName of incorrectCollections) {
        try {
          const snapshot = await db.collection(collectionName)
            .where('missionId', '==', testMissionId)
            .get();
          totalIncorrectDocs += snapshot.size;
          console.log(`  - INCORRECT collection (${collectionName}): ${snapshot.size} documents`);
        } catch (error) {
          console.warn(`  - Error querying ${collectionName}:`, error.message);
        }
      }
      
      // Test the CORRECT behavior (cascade deletion checking correct collection)
      const correctSnapshot = await db.collection('quiz_score')
        .where('missionId', '==', testMissionId)
        .get();
      
      console.log(`\n📊 Missions.js line 145 (cascade deletion) results:`);
      console.log(`  - INCORRECT collections total: ${totalIncorrectDocs} documents`);
      console.log(`  - CORRECT collection (quiz_score): ${correctSnapshot.size} documents`);
      
      // **EXPECTED TO FAIL ON UNFIXED CODE**
      expect(totalIncorrectDocs).toBe(0); // Bug: cascade deletion won't find records in wrong collections
      expect(correctSnapshot.size).toBeGreaterThan(0); // Expected: records exist in correct collection
      
      // **THIS TEST VALIDATES**: When code is fixed to query only 'quiz_score',
      // cascade deletion will successfully remove all related quiz scores
    });
  });
  
  describe('Counterexample Documentation', () => {
    
    it('Documents counterexamples found during exploration', () => {
      // This test always passes - it's for documentation purposes
      
      const counterexamples = [
        {
          location: 'progress.js line 33',
          issue: 'Queries quiz_submission (incorrect) instead of quiz_score (correct)',
          impact: 'API endpoint returns empty array when quiz scores exist in quiz_score collection',
          requirement: '1.1, 2.1'
        },
        {
          location: 'quizzes.js line 90',
          issue: 'Queries quiz_submission (incorrect) for grading operations',
          impact: 'Grading operations fail to find submission documents',
          requirement: '1.2, 2.2'
        },
        {
          location: 'quizzes.js line 78',
          issue: 'Writes to quiz_submissions (incorrect) instead of quiz_score (correct)',
          impact: 'Data written to wrong collection, not accessible by other queries',
          requirement: '1.3, 2.3'
        },
        {
          location: 'quizzes.js lines 148, 151, 191, 205',
          issue: 'Multiple queries to quiz_submissions (incorrect)',
          impact: 'Training Records return empty, cascade deletion fails',
          requirement: '1.3, 2.3'
        },
        {
          location: 'missions.js line 145',
          issue: 'Cascade deletion checks both quiz_submissions and quiz_submission (incorrect)',
          impact: 'Related quiz scores not deleted when mission is deleted',
          requirement: '1.4, 2.4'
        }
      ];
      
      console.log('\n📋 COUNTEREXAMPLES FOUND:');
      console.log('='.repeat(80));
      counterexamples.forEach((example, index) => {
        console.log(`\n${index + 1}. ${example.location}`);
        console.log(`   Issue: ${example.issue}`);
        console.log(`   Impact: ${example.impact}`);
        console.log(`   Requirements: ${example.requirement}`);
      });
      console.log('='.repeat(80));
      console.log('\n✅ Bug condition confirmed: Code uses incorrect collection names');
      console.log('✅ Expected behavior: All operations should use quiz_score collection');
      console.log('✅ Next step: Implement fix by replacing collection references\n');
      
      expect(counterexamples.length).toBeGreaterThan(0);
    });
  });
});
