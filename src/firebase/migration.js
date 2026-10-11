// Firebase migration utility - Transfer localStorage data to Firestore
import { collection, doc, getDoc, setDoc, writeBatch, Timestamp } from 'firebase/firestore';
import { db } from './config.js';
import { studentProgressionFields } from '../../shared/progression.js';

/**
 * Migrate all localStorage data to Firebase Firestore
 * @param {Object} progressData - Current localStorage progress data
 * @returns {Promise<Object>} Migration results
 */
export async function migrateToFirebase(progressData) {
  console.log('🚀 Starting Firebase migration...');
  
  const migrationResults = {
    users: 0,
    students: 0,
    instructors: 0,
    sessions: 0,
    quizzes: 0,
    quizAssignments: 0,
    quizSubmissions: 0,
    quizResults: 0,
    courseSettings: 0,
    errors: []
  };

  try {
    // Migrate users (from demo users)
    await migrateUsers(migrationResults);
    
    // Migrate students
    if (progressData.students) {
      await migrateStudents(progressData.students, migrationResults);
    }
    
    // Migrate instructors (from demo users)
    await migrateInstructors(migrationResults);
    
    // Migrate training modules
    await migrateTrainingModules(migrationResults);
    
    // Migrate mission attempts (sessions)
    if (progressData.sessions) {
      await migrateMissionAttempts(progressData.sessions, migrationResults);
    }
    
    // Migrate student module progress
    if (progressData.completedModules) {
      await migrateModuleProgress(progressData.completedModules, migrationResults);
    }
    
    // Migrate quizzes
    if (progressData.quizzes) {
      await migrateQuizzes(progressData.quizzes, migrationResults);
    }
    
    // Migrate quiz assignments
    if (progressData.quizAssignments) {
      await migrateQuizAssignments(progressData.quizAssignments, migrationResults);
    }
    
    // Migrate quiz submissions
    if (progressData.quizSubmissions) {
      await migrateQuizSubmissions(progressData.quizSubmissions, migrationResults);
    }
    
    // Migrate quiz results
    if (progressData.quizResults) {
      await migrateQuizResults(progressData.quizResults, migrationResults);
    }
    
    // Migrate course settings
    if (progressData.courseSettings) {
      await migrateCourseSettings(progressData.courseSettings, migrationResults);
    }
    
    console.log('✅ Firebase migration completed successfully!');
    return migrationResults;
    
  } catch (error) {
    console.error('❌ Firebase migration failed:', error);
    migrationResults.errors.push(error.message);
    throw error;
  }
}

/**
 * Migrate demo users to Firebase Auth and Firestore
 */
async function migrateUsers(results) {
  const DEMO_USERS = {
    'student@helmquest.local': {
      password: 'password',
      role: 'student',
      id: 'student-alex',
      name: 'Alex Rivera'
    },
    'student-jordan@helmquest.local': {
      password: 'password',
      role: 'student',
      id: 'student-jordan',
      name: 'Jordan Lee'
    },
    'student-sarah@helmquest.local': {
      password: 'password',
      role: 'student',
      id: 'student-sarah',
      name: 'Sarah Chen'
    },
    'student-taylor@helmquest.local': {
      password: 'password',
      role: 'student',
      id: 'student-taylor',
      name: 'Taylor Wong'
    },
    'instructor@helmquest.local': {
      password: 'password',
      role: 'instructor',
      id: 'instructor-helen',
      name: 'Helen Morgan'
    },
    'instructor-marcus@helmquest.local': {
      password: 'password',
      role: 'instructor',
      id: 'instructor-marcus',
      name: 'Marcus Vance'
    },
    'admin@helmquest.local': {
      password: 'password',
      role: 'admin',
      id: 'admin-root',
      name: 'System Admin'
    }
  };

  const batch = writeBatch(db);
  
  for (const [email, user] of Object.entries(DEMO_USERS)) {
    const userRef = doc(db, 'users', user.id);
    batch.set(userRef, {
      userId: user.id,
      name: user.name,
      email: email,
      role: user.role,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
      status: 'active'
    });
    results.users++;
  }
  
  await batch.commit();
  console.log(`✅ Migrated ${results.users} users`);
}

/**
 * Migrate students to Firestore
 */
async function migrateStudents(students, results) {
  const batch = writeBatch(db);
  const settings = await getDoc(doc(db, 'course_settings', 'global'));
  
  for (const student of students) {
    const studentRef = doc(db, 'students', student.id);
    batch.set(studentRef, {
      studentId: student.studentId || `STU-2026-${String(results.students + 1).padStart(3, '0')}`,
      userId: student.id,
      name: student.name,
      email: student.email,
      xp: student.xp || 0,
      missionsCompleted: student.missionsCompleted || 0,
      boatUsed: student.boatUsed || 'Commercial Trawler',
      instructorId: student.instructorId || 'instructor-helen',
      badges: student.badges || [],
      ...studentProgressionFields(student, settings.exists() ? settings.data() : {}),
      certificates: student.certificates || [],
      status: student.status || 'active',
      enrolledAt: Timestamp.now(),
      lastActiveAt: Timestamp.now()
    });
    results.students++;
  }
  
  await batch.commit();
  console.log(`✅ Migrated ${results.students} students`);
}

/**
 * Migrate instructors to Firestore
 */
async function migrateInstructors(results) {
  const instructors = [
    {
      instructorId: 'instructor-helen',
      userId: 'instructor-helen',
      name: 'Helen Morgan',
      email: 'instructor@helmquest.local',
      specialization: 'Navigation',
      studentsCount: 2,
      totalSessions: 50,
      rating: 4.8,
      joinedAt: Timestamp.now()
    },
    {
      instructorId: 'instructor-marcus',
      userId: 'instructor-marcus',
      name: 'Marcus Vance',
      email: 'instructor-marcus@helmquest.local',
      specialization: 'Maritime Safety',
      studentsCount: 2,
      totalSessions: 35,
      rating: 4.7,
      joinedAt: Timestamp.now()
    }
  ];

  const batch = writeBatch(db);
  
  for (const instructor of instructors) {
    const instructorRef = doc(db, 'instructors', instructor.instructorId);
    batch.set(instructorRef, instructor);
    results.instructors++;
  }
  
  await batch.commit();
  console.log(`✅ Migrated ${results.instructors} instructors`);
}

/**
 * Migrate training modules to Firestore
 */
async function migrateTrainingModules(results) {
  const modules = [
    {
      moduleId: 'm1-mission1',
      title: 'Basic Steering and Speed Control',
      category: 'Navigation Basics',
      description: 'Learn fundamental boat steering and speed control techniques in calm waters.',
      duration: '15 minutes',
      difficulty: 'Beginner',
      reward: 50,
      prerequisites: [],
      order: 1,
      isLocked: false,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    },
    {
      moduleId: 'm1-mission2',
      title: 'Harbor Navigation',
      category: 'Navigation Basics',
      description: 'Navigate safely through harbor environments with multiple obstacles.',
      duration: '20 minutes',
      difficulty: 'Beginner',
      reward: 75,
      prerequisites: ['m1-mission1'],
      order: 2,
      isLocked: false,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    },
    {
      moduleId: 'm1-mission3',
      title: 'Docking and Anchoring',
      category: 'Navigation Basics',
      description: 'Master the art of precise docking and anchoring procedures.',
      duration: '25 minutes',
      difficulty: 'Intermediate',
      reward: 100,
      prerequisites: ['m1-mission2'],
      order: 3,
      isLocked: false,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    }
  ];

  const batch = writeBatch(db);
  
  for (const module of modules) {
    const moduleRef = doc(db, 'missions', module.moduleId);
    batch.set(moduleRef, module);
  }
  
  await batch.commit();
  console.log(`✅ Migrated ${modules.length} training modules`);
}

/**
 * Migrate mission attempts (sessions) to Firestore
 */
async function migrateMissionAttempts(sessions, results) {
  const batch = writeBatch(db);
  
  for (const session of sessions) {
    const attemptRef = doc(collection(db, 'mission_attempts'));
    batch.set(attemptRef, {
      attemptId: session.id,
      studentId: session.studentId,
      studentName: session.studentName,
      missionId: session.missionId,
      missionTitle: session.mission,
      moduleId: session.moduleId,
      score: session.score,
      passScore: session.passScore,
      maxScore: 100,
      passed: session.passed,
      elapsedMs: session.elapsedMs || null,
      performanceMetrics: session.performanceMetrics || null,
      completedAt: session.completedAt ? new Date(session.completedAt) : Timestamp.now(),
      attemptNumber: 1
    });
    results.sessions++;
  }
  
  await batch.commit();
  console.log(`✅ Migrated ${results.sessions} mission attempts`);
}

/**
 * Migrate student module progress to Firestore
 */
async function migrateModuleProgress(completedModules, results) {
  const batch = writeBatch(db);
  
  for (const [studentId, modules] of Object.entries(completedModules)) {
    for (const moduleId of modules) {
      const progressId = `${studentId}_${moduleId}`;
      const progressRef = doc(db, 'student_module_progress', progressId);
      batch.set(progressRef, {
        progressId,
        studentId,
        moduleId,
        status: 'completed',
        highestScore: 100, // Default since we don't have this data
        attemptsCount: 1,
        firstAttemptAt: Timestamp.now(),
        completedAt: Timestamp.now(),
        certificateIssued: false
      });
    }
  }
  
  await batch.commit();
  console.log(`✅ Migrated module progress for ${Object.keys(completedModules).length} students`);
}

/**
 * Migrate quizzes to Firestore
 */
async function migrateQuizzes(quizzes, results) {
  const batch = writeBatch(db);
  
  for (const quiz of quizzes) {
    const quizRef = doc(db, 'quizzes', quiz.id);
    batch.set(quizRef, {
      quizId: quiz.id,
      title: quiz.title,
      description: quiz.description,
      questions: quiz.questions,
      buoyCount: quiz.buoyCount || 0,
      createdAt: quiz.createdAt ? new Date(quiz.createdAt) : Timestamp.now(),
      createdBy: quiz.createdBy || 'system',
      updatedAt: quiz.updatedAt ? new Date(quiz.updatedAt) : Timestamp.now(),
      isActive: true
    });
    results.quizzes++;
  }
  
  await batch.commit();
  console.log(`✅ Migrated ${results.quizzes} quizzes`);
}

/**
 * Migrate quiz assignments to Firestore
 */
async function migrateQuizAssignments(assignments, results) {
  const batch = writeBatch(db);
  
  for (const assignment of assignments) {
    const assignmentRef = doc(db, 'quiz_assignments', assignment.id);
    batch.set(assignmentRef, {
      assignmentId: assignment.id,
      quizId: assignment.quizId,
      targetType: assignment.targetType,
      targetId: assignment.targetId,
      createdAt: assignment.createdAt ? new Date(assignment.createdAt) : Timestamp.now(),
      createdBy: assignment.createdBy || 'system',
      isActive: true
    });
    results.quizAssignments++;
  }
  
  await batch.commit();
  console.log(`✅ Migrated ${results.quizAssignments} quiz assignments`);
}

/**
 * Migrate quiz submissions to Firestore
 */
async function migrateQuizSubmissions(submissions, results) {
  const batch = writeBatch(db);
  
  for (const submission of submissions) {
    const submissionRef = doc(db, 'quiz_submissions', submission.id);
    batch.set(submissionRef, {
      submissionId: submission.id,
      quizId: submission.quizId,
      quizTitle: submission.quizTitle || 'Unknown Quiz',
      studentId: submission.studentId,
      studentName: submission.studentName,
      moduleId: submission.moduleId || null,
      answers: submission.answers,
      submittedAt: submission.submittedAt ? new Date(submission.submittedAt) : Timestamp.now(),
      status: submission.status || 'pending',
      attemptNumber: submission.attemptNumber || 1
    });
    results.quizSubmissions++;
  }
  
  await batch.commit();
  console.log(`✅ Migrated ${results.quizSubmissions} quiz submissions`);
}

/**
 * Migrate quiz results to Firestore
 */
async function migrateQuizResults(results_data, results) {
  const batch = writeBatch(db);
  
  for (const result of results_data) {
    const resultRef = doc(db, 'quiz_results', result.id);
    batch.set(resultRef, {
      resultId: result.id,
      submissionId: result.submissionId,
      quizId: result.quizId,
      studentId: result.studentId,
      score: result.score,
      correctCount: result.validation ? result.validation.filter(v => v).length : 0,
      totalQuestions: result.validation ? result.validation.length : 0,
      validation: result.validation,
      feedback: result.feedback || null,
      gradedAt: result.gradedAt ? new Date(result.gradedAt) : Timestamp.now(),
      gradedBy: result.gradedBy || 'system',
      passed: result.score >= 70
    });
    results.quizResults++;
  }
  
  await batch.commit();
  console.log(`✅ Migrated ${results.quizResults} quiz results`);
}

/**
 * Migrate course settings to Firestore
 */
async function migrateCourseSettings(courseSettings, results) {
  const settingsRef = doc(db, 'course_settings', 'global');
  await setDoc(settingsRef, {
    ...courseSettings,
    updatedAt: Timestamp.now(),
    updatedBy: 'migration'
  });
  results.courseSettings = 1;
  console.log(`✅ Migrated course settings`);
}

/**
 * Check if migration has already been completed
 * @returns {Promise<boolean>} True if migration completed
 */
export async function isMigrationCompleted() {
  try {
    const settingsRef = doc(db, 'course_settings', 'global');
    const settingsSnap = await getDoc(settingsRef);
    return settingsSnap.exists();
  } catch (error) {
    return false;
  }
}

/**
 * Create sample data for testing (if no localStorage data exists)
 * @returns {Promise<Object>} Sample data creation results
 */
export async function createSampleData() {
  console.log('🎯 Creating sample data for testing...');
  
  const sampleProgress = {
    students: [
      {
        id: 'student-alex',
        studentId: 'STU-2026-001',
        name: 'Alex Rivera',
        email: 'student@helmquest.local',
        status: 'active',
        boatUsed: 'Commercial Trawler',
        instructorId: 'instructor-helen'
      }
    ],
    sessions: [
      {
        id: 'session-sample-001',
        studentId: 'student-alex',
        studentName: 'Alex Rivera',
        missionId: 'HQ-M01',
        mission: 'Basic Navigation',
        moduleId: 'm1-mission1',
        score: 85,
        passScore: 70,
        passed: true,
        completedAt: new Date().toISOString()
      }
    ],
    completedModules: {
      'student-alex': ['m1-mission1']
    },
    quizzes: [
      {
        id: 'quiz-sample-001',
        title: 'Basic Navigation Quiz',
        description: 'Test your knowledge of basic navigation principles',
        questions: [
          {
            id: 'q1',
            prompt: 'What is the maximum safe speed in harbor areas?',
            type: 'multiple-choice',
            options: [
              { text: '5 knots', isCorrect: true },
              { text: '10 knots', isCorrect: false },
              { text: '15 knots', isCorrect: false }
            ],
            correctAnswer: '5 knots',
            order: 0
          }
        ],
        createdAt: new Date().toISOString(),
        createdBy: 'instructor-helen'
      }
    ],
    courseSettings: {
      sequentialUnlock: true,
      autoAwardBadgesAndCerts: true,
      lockedModuleIds: [],
      moduleOrder: ['m1-mission1', 'm1-mission2', 'm1-mission3']
    }
  };
  
  return await migrateToFirebase(sampleProgress);
}
