// Automatic Firebase Collection Setup and Data Population
import { loadProgress } from '../helpers/progressStore.js';
import { migrateToFirebase, createSampleData } from './migration.js';
import { db } from './config.js';
import { collection, getDocs } from 'firebase/firestore';

/**
 * Automatic Firebase setup - Creates all collections and populates with data
 * Run this once to initialize your Firebase database
 */
async function autoSetupFirebase() {
  console.log('🚀 Starting Automatic Firebase Setup...');
  console.log('=====================================\n');
  
  try {
    // Step 1: Check if data already exists
    console.log('📊 Step 1: Checking existing data...');
    const usersRef = collection(db, 'users');
    const usersSnap = await getDocs(usersRef);
    
    if (!usersSnap.empty) {
      console.warn('⚠️  Firebase already has data!');
      const confirmOverwrite = confirm('Data already exists in Firebase. Do you want to overwrite it?');
      if (!confirmOverwrite) {
        console.log('❌ Setup cancelled by user.');
        return;
      }
    }
    
    // Step 2: Load current localStorage data
    console.log('\n📦 Step 2: Loading localStorage data...');
    const localData = loadProgress();
    console.log(`✅ Loaded data:
    - Students: ${localData.students?.length || 0}
    - Sessions: ${localData.sessions?.length || 0}
    - Quizzes: ${localData.quizzes?.length || 0}
    - Quiz Assignments: ${localData.quizAssignments?.length || 0}
    - Quiz Submissions: ${localData.quizSubmissions?.length || 0}
    - Quiz Results: ${localData.quizResults?.length || 0}`);
    
    // Step 3: Determine migration strategy
    console.log('\n🔄 Step 3: Migrating data to Firebase...');
    let migrationResults;
    
    if (localData.students?.length > 0 || localData.sessions?.length > 0) {
      // Use existing localStorage data
      console.log('📤 Using existing localStorage data...');
      migrationResults = await migrateToFirebase(localData);
    } else {
      // Create sample data for testing
      console.log('🎯 No existing data found. Creating sample data...');
      migrationResults = await createSampleData();
    }
    
    // Step 4: Display results
    console.log('\n✅ Step 4: Migration completed successfully!');
    console.log('=====================================');
    console.log('📊 Migration Results:');
    console.log(`  - Users: ${migrationResults.users}`);
    console.log(`  - Students: ${migrationResults.students}`);
    console.log(`  - Instructors: ${migrationResults.instructors}`);
    console.log(`  - Mission Attempts: ${migrationResults.sessions}`);
    console.log(`  - Quizzes: ${migrationResults.quizzes}`);
    console.log(`  - Quiz Assignments: ${migrationResults.quizAssignments}`);
    console.log(`  - Quiz Submissions: ${migrationResults.quizSubmissions}`);
    console.log(`  - Quiz Results: ${migrationResults.quizResults}`);
    console.log(`  - Course Settings: ${migrationResults.courseSettings}`);
    
    if (migrationResults.errors?.length > 0) {
      console.error('\n❌ Errors encountered:');
      migrationResults.errors.forEach((error, index) => {
        console.error(`  ${index + 1}. ${error}`);
      });
    }
    
    console.log('\n🎉 Firebase setup completed!');
    console.log('=====================================\n');
    
    // Step 5: Verify collections
    console.log('🔍 Step 5: Verifying collections...');
    await verifyCollections();
    
    console.log('\n✅ All done! Your Firebase database is ready to use.');
    console.log('\n📋 Next steps:');
    console.log('  1. Check Firebase Console to see your data');
    console.log('  2. Test login with: student@helmquest.local / password');
    console.log('  3. Start using Firebase in your app!\n');
    
    return migrationResults;
    
  } catch (error) {
    console.error('\n❌ Firebase setup failed:', error);
    console.error('Error details:', error.message);
    throw error;
  }
}

/**
 * Verify that all collections were created successfully
 */
async function verifyCollections() {
  const collectionsToVerify = [
    'users',
    'students',
    'instructors',
    'missions',
    'course_settings'
  ];
  
  for (const collectionName of collectionsToVerify) {
    try {
      const collectionRef = collection(db, collectionName);
      const snapshot = await getDocs(collectionRef);
      console.log(`  ✅ ${collectionName}: ${snapshot.size} documents`);
    } catch (error) {
      console.error(`  ❌ ${collectionName}: Failed to verify`);
    }
  }
}

/**
 * Quick test - Check if Firebase is connected
 */
export async function testFirebaseConnection() {
  console.log('🔗 Testing Firebase connection...');
  
  try {
    const testRef = collection(db, 'users');
    await getDocs(testRef);
    console.log('✅ Firebase connection successful!');
    return true;
  } catch (error) {
    console.error('❌ Firebase connection failed:', error.message);
    return false;
  }
}

/**
 * Display current Firebase data summary
 */
export async function showFirebaseDataSummary() {
  console.log('📊 Firebase Data Summary');
  console.log('=====================================\n');
  
  const collections = [
    'users',
    'students',
    'instructors',
    'missions',
    'mission_attempts',
    'student_module_progress',
    'quizzes',
    'quiz_assignments',
    'quiz_submissions',
    'quiz_results',
    'instructor_feedback',
    'course_settings'
  ];
  
  for (const collectionName of collections) {
    try {
      const collectionRef = collection(db, collectionName);
      const snapshot = await getDocs(collectionRef);
      console.log(`${collectionName.padEnd(30, ' ')}: ${snapshot.size} documents`);
    } catch (error) {
      console.log(`${collectionName.padEnd(30, ' ')}: Error`);
    }
  }
  
  console.log('\n=====================================\n');
}

// Export the main setup function
export { autoSetupFirebase };

// Auto-run if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  autoSetupFirebase();
}