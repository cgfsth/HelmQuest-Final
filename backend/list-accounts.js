// List all accounts in Firestore
import { db } from './config/firebase-admin.js';

async function listAccounts() {
  try {
    console.log('\n📋 Checking Firestore for existing accounts...\n');
    
    // Check instructors collection
    console.log('👨‍🏫 INSTRUCTORS:');
    const instructorsSnapshot = await db.collection('instructors').get();
    if (instructorsSnapshot.empty) {
      console.log('   No instructors found');
    } else {
      instructorsSnapshot.forEach(doc => {
        const data = doc.data();
        console.log(`   - ID: ${doc.id}`);
        console.log(`     Email: ${data.email}`);
        console.log(`     Name: ${data.name || 'N/A'}`);
        console.log(`     Has password: ${data.password ? 'Yes (hashed)' : 'No'}`);
        console.log('');
      });
    }
    
    // Check students collection
    console.log('\n👨‍🎓 STUDENTS:');
    const studentsSnapshot = await db.collection('students').get();
    if (studentsSnapshot.empty) {
      console.log('   No students found');
    } else {
      studentsSnapshot.forEach(doc => {
        const data = doc.data();
        console.log(`   - ID: ${doc.id}`);
        console.log(`     Email: ${data.email}`);
        console.log(`     Name: ${data.name || 'N/A'}`);
        console.log(`     Has password: ${data.password ? 'Yes (hashed)' : 'No'}`);
        console.log('');
      });
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error listing accounts:', error);
    process.exit(1);
  }
}

listAccounts();
