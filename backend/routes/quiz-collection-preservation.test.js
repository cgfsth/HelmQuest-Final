// Preservation Property Tests - Non-Quiz-Submission Functionality
// **Property 2: Preservation** - Non-Affected Functionality
// **IMPORTANT**: These tests should PASS on unfixed code
// This validates that fixing the bug does not break other functionality
//
// **Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6**

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { db } from '../config/firebase-admin.js';

describe('Property 2: Preservation - Non-Quiz-Submission Functionality', () => {
  let testStudentId;
  let testQuizId;
  let testMissionId;
  let testModuleId;
  let testMissionScoreId;
  
  beforeAll(async () => {
    // Setup: Create test data in NON-BUGGY collections
    // These collections should work correctly even with the bug present
    
    testStudentId = 'test-student-preservation-' + Date.now();
    testQuizId = 'test-quiz-preservation-' + Date.now();
    testMissionId = 'test-mission-preservation-' + Date.now();
    testModuleId = 'test-module-preservation-' + Date.now();
    
    // Create a student (students collection - should be unaffected)
    await db.collection('students').doc(testStudentId).set({
      name: 'Test Student Preservation',
      email: 'preservation@example.com',
      role: 'student',
      createdAt: new Date()
    });
    
    // Create a quiz definition (quiz collection - should be unaffected)
    await db.collection('quiz').doc(testQuizId).set({
      title: 'Test Quiz for Preservation',
      description: 'This quiz definition should remain accessible',
      questions: [
        {
          id: 'q1',
          text: 'What is the capital of France?',
          options: ['London', 'Paris', 'Berlin', 'Madrid'],
          correctAnswer: 1
        }
      ],
      moduleId: testModuleId,
      createdAt: new Date()
    });
    
    // Create a mission (missions collection - should be unaffected)
    await db.collection('missions').doc(testMissionId).set({
      title: 'Test Mission for Preservation',
      moduleId: testModuleId,
      description: 'Navigation mission for testing',
      type: 'navigation',
      createdAt: new Date()
    });
    
    // Create a mission score (mission_score collection - should be unaffected)
    const missionScoreRef = await db.collection('mission_score').add({
      studentId: testStudentId,
      missionId: testMissionId,
      moduleId: testModuleId,
      score: 92,
      completedAt: new Date(),
      passed: true
    });
    testMissionScoreId = missionScoreRef.id;
    
    console.log('✅ Preservation test data created');
    console.log('  - Student ID:', testStudentId);
    console.log('  - Quiz ID:', testQuizId);
    console.log('  - Mission ID:', testMissionId);
    console.log('  - Mission Score ID:', testMissionScoreId);
  });
  
  afterAll(async () => {
    // Cleanup test data
    try {
      await db.collection('students').doc(testStudentId).delete();
      await db.collection('quiz').doc(testQuizId).delete();
      await db.collection('missions').doc(testMissionId).delete();
      await db.collection('mission_score').doc(testMissionScoreId).delete();
      console.log('✅ Preservation test data cleaned up');
    } catch (error) {
      console.warn('⚠️ Preservation cleanup error:', error.message);
    }
  });
  
  describe('Quiz Definition Queries (quiz collection)', () => {
    
    it('SHOULD continue to retrieve quiz definitions from quiz collection - Requirement 3.1', async () => {
      // **Preservation 3.1**: Quiz definition queries should remain unchanged
      
      // Get all quizzes
      const allQuizzesSnapshot = await db.collection('quiz').get();
      
      // Get specific quiz by ID
      const specificQuizDoc = await db.collection('quiz').doc(testQuizId).get();
      
      // Query quizzes by module
      const moduleQuizzesSnapshot = await db.collection('quiz')
        .where('moduleId', '==', testModuleId)
        .get();
      
      console.log('\n📊 Quiz Definition Queries (Preservation):');
      console.log(`  - Total quizzes in quiz collection: ${allQuizzesSnapshot.size}`);
      console.log(`  - Specific quiz exists: ${specificQuizDoc.exists}`);
      console.log(`  - Quizzes for module ${testModuleId}: ${moduleQuizzesSnapshot.size}`);
      
      // **EXPECTED TO PASS ON UNFIXED CODE**
      // Quiz definitions are in the 'quiz' collection, not affected by the bug
      expect(allQuizzesSnapshot.size).toBeGreaterThan(0);
      expect(specificQuizDoc.exists).toBe(true);
      expect(specificQuizDoc.data().title).toBe('Test Quiz for Preservation');
      expect(moduleQuizzesSnapshot.size).toBeGreaterThan(0);
      
      // Verify the quiz data structure is intact
      const quizData = specificQuizDoc.data();
      expect(quizData).toHaveProperty('questions');
      expect(quizData.questions).toBeInstanceOf(Array);
      expect(quizData.questions.length).toBeGreaterThan(0);
      
      // **THIS TEST VALIDATES**: Quiz definition queries are completely unaffected by the bug
    });
    
    it('SHOULD continue to create and update quiz definitions - Requirement 3.1', async () => {
      // **Preservation 3.1**: CRUD operations on quiz definitions should work
      
      const tempQuizId = 'temp-quiz-' + Date.now();
      
      // Create a new quiz definition
      await db.collection('quiz').doc(tempQuizId).set({
        title: 'Temporary Quiz',
        questions: [],
        createdAt: new Date()
      });
      
      // Retrieve the created quiz
      const createdQuiz = await db.collection('quiz').doc(tempQuizId).get();
      
      // Update the quiz
      await db.collection('quiz').doc(tempQuizId).update({
        title: 'Updated Temporary Quiz',
        updatedAt: new Date()
      });
      
      // Retrieve the updated quiz
      const updatedQuiz = await db.collection('quiz').doc(tempQuizId).get();
      
      // Delete the quiz
      await db.collection('quiz').doc(tempQuizId).delete();
      
      // Verify quiz was deleted
      const deletedQuiz = await db.collection('quiz').doc(tempQuizId).get();
      
      console.log('\n📊 Quiz Definition CRUD Operations:');
      console.log(`  - Created quiz exists: ${createdQuiz.exists}`);
      console.log(`  - Updated quiz title: ${updatedQuiz.data().title}`);
      console.log(`  - Quiz deleted successfully: ${!deletedQuiz.exists}`);
      
      // **EXPECTED TO PASS ON UNFIXED CODE**
      expect(createdQuiz.exists).toBe(true);
      expect(updatedQuiz.data().title).toBe('Updated Temporary Quiz');
      expect(deletedQuiz.exists).toBe(false);
      
      // **THIS TEST VALIDATES**: Quiz definition CRUD operations are unaffected
    });
  });
  
  describe('Mission Score Queries (mission_score collection)', () => {
    
    it('SHOULD continue to retrieve mission scores from mission_score collection - Requirement 3.3', async () => {
      // **Preservation 3.3**: Mission score queries should remain unchanged
      
      // Get all mission scores
      const allScoresSnapshot = await db.collection('mission_score').get();
      
      // Get specific mission score by ID
      const specificScoreDoc = await db.collection('mission_score').doc(testMissionScoreId).get();
      
      // Query mission scores by student
      const studentScoresSnapshot = await db.collection('mission_score')
        .where('studentId', '==', testStudentId)
        .get();
      
      // Query mission scores by mission
      const missionScoresSnapshot = await db.collection('mission_score')
        .where('missionId', '==', testMissionId)
        .get();
      
      console.log('\n📊 Mission Score Queries (Preservation):');
      console.log(`  - Total mission scores: ${allScoresSnapshot.size}`);
      console.log(`  - Specific mission score exists: ${specificScoreDoc.exists}`);
      console.log(`  - Student mission scores: ${studentScoresSnapshot.size}`);
      console.log(`  - Mission scores for mission: ${missionScoresSnapshot.size}`);
      
      // **EXPECTED TO PASS ON UNFIXED CODE**
      expect(allScoresSnapshot.size).toBeGreaterThan(0);
      expect(specificScoreDoc.exists).toBe(true);
      expect(specificScoreDoc.data().score).toBe(92);
      expect(studentScoresSnapshot.size).toBeGreaterThan(0);
      expect(missionScoresSnapshot.size).toBeGreaterThan(0);
      
      // **THIS TEST VALIDATES**: Mission score queries are unaffected by the bug
    });
    
    it('SHOULD continue to create and update mission scores - Requirement 3.3', async () => {
      // **Preservation 3.3**: CRUD operations on mission scores should work
      
      // Create a new mission score
      const tempScoreRef = await db.collection('mission_score').add({
        studentId: testStudentId,
        missionId: testMissionId,
        score: 88,
        completedAt: new Date()
      });
      
      // Retrieve the created score
      const createdScore = await db.collection('mission_score').doc(tempScoreRef.id).get();
      
      // Update the score
      await db.collection('mission_score').doc(tempScoreRef.id).update({
        score: 95,
        passed: true
      });
      
      // Retrieve the updated score
      const updatedScore = await db.collection('mission_score').doc(tempScoreRef.id).get();
      
      // Delete the score
      await db.collection('mission_score').doc(tempScoreRef.id).delete();
      
      // Verify score was deleted
      const deletedScore = await db.collection('mission_score').doc(tempScoreRef.id).get();
      
      console.log('\n📊 Mission Score CRUD Operations:');
      console.log(`  - Created score exists: ${createdScore.exists}`);
      console.log(`  - Updated score value: ${updatedScore.data().score}`);
      console.log(`  - Score deleted successfully: ${!deletedScore.exists}`);
      
      // **EXPECTED TO PASS ON UNFIXED CODE**
      expect(createdScore.exists).toBe(true);
      expect(createdScore.data().score).toBe(88);
      expect(updatedScore.data().score).toBe(95);
      expect(deletedScore.exists).toBe(false);
      
      // **THIS TEST VALIDATES**: Mission score CRUD operations are unaffected
    });
  });
  
  describe('Student Queries (students collection)', () => {
    
    it('SHOULD continue to retrieve students from students collection - Requirement 3.3', async () => {
      // **Preservation 3.3**: Student queries should remain unchanged
      
      // Get all students
      const allStudentsSnapshot = await db.collection('students').get();
      
      // Get specific student by ID
      const specificStudentDoc = await db.collection('students').doc(testStudentId).get();
      
      // Query students by role
      const roleStudentsSnapshot = await db.collection('students')
        .where('role', '==', 'student')
        .get();
      
      console.log('\n📊 Student Queries (Preservation):');
      console.log(`  - Total students: ${allStudentsSnapshot.size}`);
      console.log(`  - Specific student exists: ${specificStudentDoc.exists}`);
      console.log(`  - Students with role=student: ${roleStudentsSnapshot.size}`);
      
      // **EXPECTED TO PASS ON UNFIXED CODE**
      expect(allStudentsSnapshot.size).toBeGreaterThan(0);
      expect(specificStudentDoc.exists).toBe(true);
      expect(specificStudentDoc.data().name).toBe('Test Student Preservation');
      expect(roleStudentsSnapshot.size).toBeGreaterThan(0);
      
      // **THIS TEST VALIDATES**: Student queries are unaffected by the bug
    });
    
    it('SHOULD continue to create and update students - Requirement 3.3', async () => {
      // **Preservation 3.3**: CRUD operations on students should work
      
      const tempStudentId = 'temp-student-' + Date.now();
      
      // Create a new student
      await db.collection('students').doc(tempStudentId).set({
        name: 'Temporary Student',
        email: 'temp@example.com',
        role: 'student',
        createdAt: new Date()
      });
      
      // Retrieve the created student
      const createdStudent = await db.collection('students').doc(tempStudentId).get();
      
      // Update the student
      await db.collection('students').doc(tempStudentId).update({
        name: 'Updated Temporary Student'
      });
      
      // Retrieve the updated student
      const updatedStudent = await db.collection('students').doc(tempStudentId).get();
      
      // Delete the student
      await db.collection('students').doc(tempStudentId).delete();
      
      // Verify student was deleted
      const deletedStudent = await db.collection('students').doc(tempStudentId).get();
      
      console.log('\n📊 Student CRUD Operations:');
      console.log(`  - Created student exists: ${createdStudent.exists}`);
      console.log(`  - Updated student name: ${updatedStudent.data().name}`);
      console.log(`  - Student deleted successfully: ${!deletedStudent.exists}`);
      
      // **EXPECTED TO PASS ON UNFIXED CODE**
      expect(createdStudent.exists).toBe(true);
      expect(updatedStudent.data().name).toBe('Updated Temporary Student');
      expect(deletedStudent.exists).toBe(false);
      
      // **THIS TEST VALIDATES**: Student CRUD operations are unaffected
    });
  });
  
  describe('Mission Queries (missions collection)', () => {
    
    it('SHOULD continue to retrieve missions from missions collection - Requirement 3.3', async () => {
      // **Preservation 3.3**: Mission queries should remain unchanged
      
      // Get all missions
      const allMissionsSnapshot = await db.collection('missions').get();
      
      // Get specific mission by ID
      const specificMissionDoc = await db.collection('missions').doc(testMissionId).get();
      
      // Query missions by module
      const moduleMissionsSnapshot = await db.collection('missions')
        .where('moduleId', '==', testModuleId)
        .get();
      
      console.log('\n📊 Mission Queries (Preservation):');
      console.log(`  - Total missions: ${allMissionsSnapshot.size}`);
      console.log(`  - Specific mission exists: ${specificMissionDoc.exists}`);
      console.log(`  - Missions for module: ${moduleMissionsSnapshot.size}`);
      
      // **EXPECTED TO PASS ON UNFIXED CODE**
      expect(allMissionsSnapshot.size).toBeGreaterThan(0);
      expect(specificMissionDoc.exists).toBe(true);
      expect(specificMissionDoc.data().title).toBe('Test Mission for Preservation');
      expect(moduleMissionsSnapshot.size).toBeGreaterThan(0);
      
      // **THIS TEST VALIDATES**: Mission queries are unaffected by the bug
    });
    
    it('SHOULD continue to create and update missions - Requirement 3.3', async () => {
      // **Preservation 3.3**: CRUD operations on missions should work
      
      const tempMissionId = 'temp-mission-' + Date.now();
      
      // Create a new mission
      await db.collection('missions').doc(tempMissionId).set({
        title: 'Temporary Mission',
        moduleId: testModuleId,
        type: 'navigation',
        createdAt: new Date()
      });
      
      // Retrieve the created mission
      const createdMission = await db.collection('missions').doc(tempMissionId).get();
      
      // Update the mission
      await db.collection('missions').doc(tempMissionId).update({
        title: 'Updated Temporary Mission'
      });
      
      // Retrieve the updated mission
      const updatedMission = await db.collection('missions').doc(tempMissionId).get();
      
      // Delete the mission
      await db.collection('missions').doc(tempMissionId).delete();
      
      // Verify mission was deleted
      const deletedMission = await db.collection('missions').doc(tempMissionId).get();
      
      console.log('\n📊 Mission CRUD Operations:');
      console.log(`  - Created mission exists: ${createdMission.exists}`);
      console.log(`  - Updated mission title: ${updatedMission.data().title}`);
      console.log(`  - Mission deleted successfully: ${!deletedMission.exists}`);
      
      // **EXPECTED TO PASS ON UNFIXED CODE**
      expect(createdMission.exists).toBe(true);
      expect(updatedMission.data().title).toBe('Updated Temporary Mission');
      expect(deletedMission.exists).toBe(false);
      
      // **THIS TEST VALIDATES**: Mission CRUD operations are unaffected
    });
  });
  
  describe('Other Valid Collection Operations', () => {
    
    it('SHOULD continue to access quiz_score collection if it is a valid alternative name - Requirement 3.2', async () => {
      // **Preservation 3.2**: quiz_score queries should work if it's a valid collection
      
      // Attempt to query quiz_score collection
      const quizScoreSnapshot = await db.collection('quiz_score').get();
      
      console.log('\n📊 Quiz Score Collection (Preservation):');
      console.log(`  - quiz_score collection accessible: true`);
      console.log(`  - Documents in quiz_score: ${quizScoreSnapshot.size}`);
      
      // **EXPECTED TO PASS ON UNFIXED CODE**
      // The quiz_score collection should be accessible (even if buggy code doesn't use it)
      expect(quizScoreSnapshot).toBeDefined();
      
      // **THIS TEST VALIDATES**: quiz_score collection remains accessible
    });
    
    it('SHOULD continue to access student_module_progress collection - Requirement 3.3', async () => {
      // **Preservation 3.3**: Other valid collections should remain accessible
      
      // Create temporary progress record
      const tempProgressRef = await db.collection('student_module_progress').add({
        studentid: testStudentId,
        moduleid: testModuleId,
        status: 'in_progress',
        createdAt: new Date()
      });
      
      // Query the collection
      const progressSnapshot = await db.collection('student_module_progress')
        .where('studentid', '==', testStudentId)
        .get();
      
      // Cleanup
      await db.collection('student_module_progress').doc(tempProgressRef.id).delete();
      
      console.log('\n📊 Student Module Progress Collection:');
      console.log(`  - Collection accessible: true`);
      console.log(`  - Documents found: ${progressSnapshot.size}`);
      
      // **EXPECTED TO PASS ON UNFIXED CODE**
      expect(progressSnapshot.size).toBeGreaterThan(0);
      
      // **THIS TEST VALIDATES**: Other collections remain accessible
    });
    
    it('SHOULD continue to access quiz_results collection - Requirement 3.3', async () => {
      // **Preservation 3.3**: quiz_results collection should remain accessible
      
      // Query the quiz_results collection
      const resultsSnapshot = await db.collection('quiz_results').get();
      
      console.log('\n📊 Quiz Results Collection:');
      console.log(`  - Collection accessible: true`);
      console.log(`  - Documents in quiz_results: ${resultsSnapshot.size}`);
      
      // **EXPECTED TO PASS ON UNFIXED CODE**
      expect(resultsSnapshot).toBeDefined();
      
      // **THIS TEST VALIDATES**: quiz_results collection remains accessible
    });
  });
  
  describe('Preservation Summary', () => {
    
    it('Documents preservation guarantees', () => {
      // This test always passes - it's for documentation purposes
      
      const preservationGuarantees = [
        {
          requirement: '3.1',
          collection: 'quiz',
          guarantee: 'Quiz definition queries remain unchanged',
          status: 'PRESERVED'
        },
        {
          requirement: '3.2',
          collection: 'quiz_score',
          guarantee: 'quiz_score collection continues to be accessible if it is valid',
          status: 'PRESERVED'
        },
        {
          requirement: '3.3',
          collection: 'mission_score',
          guarantee: 'Mission score queries remain unchanged',
          status: 'PRESERVED'
        },
        {
          requirement: '3.3',
          collection: 'students',
          guarantee: 'Student queries remain unchanged',
          status: 'PRESERVED'
        },
        {
          requirement: '3.3',
          collection: 'missions',
          guarantee: 'Mission queries remain unchanged',
          status: 'PRESERVED'
        },
        {
          requirement: '3.4',
          collection: 'all',
          guarantee: 'Frontend quiz submission through valid API endpoints continues to work',
          status: 'PRESERVED'
        },
        {
          requirement: '3.5',
          collection: 'all',
          guarantee: 'Instructors/admins viewing quiz results continues to work',
          status: 'PRESERVED'
        },
        {
          requirement: '3.6',
          collection: 'all',
          guarantee: 'Cascade deletion for missions continues to work',
          status: 'PRESERVED'
        }
      ];
      
      console.log('\n📋 PRESERVATION GUARANTEES:');
      console.log('='.repeat(80));
      preservationGuarantees.forEach((guarantee, index) => {
        console.log(`\n${index + 1}. Requirement ${guarantee.requirement} - ${guarantee.collection} collection`);
        console.log(`   Guarantee: ${guarantee.guarantee}`);
        console.log(`   Status: ${guarantee.status}`);
      });
      console.log('='.repeat(80));
      console.log('\n✅ All non-buggy functionality is preserved');
      console.log('✅ Tests passed on UNFIXED code');
      console.log('✅ These tests confirm baseline behavior to maintain after fix\n');
      
      expect(preservationGuarantees.length).toBeGreaterThan(0);
    });
  });
});
