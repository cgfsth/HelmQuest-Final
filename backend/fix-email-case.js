/**
 * Fix Email Case in Firestore
 * This fixes the email case mismatch issue
 */

import { db } from './config/firebase-admin.js';

async function fixEmailCase() {
  try {
    console.log('\n🔧 Fixing instructor email case...\n');
    
    // Get the instructor with the capitalized email
    const snapshot = await db.collection('instructor')
      .where('email', '==', 'Scarlet@dnsc.edu.ph')
      .get();
    
    if (snapshot.empty) {
      console.log('❌ Instructor not found with email: Scarlet@dnsc.edu.ph');
      console.log('\nTrying to find any instructors...');
      
      const allInstructors = await db.collection('instructor').get();
      console.log(`Found ${allInstructors.size} instructor(s):`);
      
      allInstructors.docs.forEach(doc => {
        const data = doc.data();
        console.log(`  - ${data.name}: ${data.email}`);
      });
      
      process.exit(0);
    }
    
    const doc = snapshot.docs[0];
    const data = doc.data();
    
    console.log('✓ Found instructor:');
    console.log('  Name:', data.name);
    console.log('  Email (current):', data.email);
    console.log('  Status:', data.status);
    console.log('');
    
    // Update email to lowercase
    const lowercaseEmail = data.email.toLowerCase();
    
    console.log('Updating email to:', lowercaseEmail);
    
    await db.collection('instructor').doc(doc.id).update({
      email: lowercaseEmail
    });
    
    console.log('✅ Email updated successfully!');
    console.log('');
    console.log('📌 Now you can login with:');
    console.log('  Email:', lowercaseEmail);
    console.log('  Password: (your password)');
    console.log('');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
  
  process.exit(0);
}

fixEmailCase();
