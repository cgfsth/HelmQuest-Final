/**
 * Verify Instructor Account Script
 * 
 * This script checks if an instructor exists in Firestore and verifies the password.
 * Use this to debug login issues.
 * 
 * Usage:
 *   node verify-instructor.js
 */

import bcrypt from 'bcrypt';
import { db } from './config/firebase-admin.js';

async function verifyInstructor() {
  try {
    console.log('\n🔍 Checking Instructor Accounts...\n');
    
    // Get all instructors
    const snapshot = await db.collection('instructor').get();
    
    if (snapshot.empty) {
      console.log('❌ No instructors found in database!');
      console.log('   Run: node create-instructor.js to create one\n');
      process.exit(0);
    }
    
    console.log(`✅ Found ${snapshot.size} instructor(s):\n`);
    
    snapshot.docs.forEach((doc, index) => {
      const data = doc.data();
      console.log(`   ${index + 1}. ${data.name}`);
      console.log(`      ID: ${doc.id}`);
      console.log(`      Email: ${data.email}`);
      console.log(`      Status: ${data.status}`);
      console.log(`      Password Hash: ${data.password ? data.password.substring(0, 20) + '...' : 'NOT SET'}`);
      console.log('');
    });
    
    // Test login with provided credentials
    console.log('🧪 Testing Login...\n');
    
    const testEmail = 'jocel@dnsc.edu.ph';  // Change this to test email
    const testPassword = '12345';           // Change this to test password
    
    console.log('   Email:', testEmail);
    console.log('   Password:', testPassword);
    console.log('');
    
    const instructorSnapshot = await db.collection('instructor')
      .where('email', '==', testEmail.toLowerCase())
      .limit(1)
      .get();
    
    if (instructorSnapshot.empty) {
      console.log('❌ No instructor found with email:', testEmail);
      console.log('   Make sure the email matches exactly\n');
      process.exit(0);
    }
    
    const instructorDoc = instructorSnapshot.docs[0];
    const instructorData = instructorDoc.data();
    
    console.log('✓ Instructor found');
    console.log('   Name:', instructorData.name);
    console.log('   Status:', instructorData.status);
    console.log('');
    
    if (instructorData.status !== 'active') {
      console.log('❌ Instructor account is INACTIVE');
      console.log('   Status must be "active" to login\n');
      process.exit(0);
    }
    
    console.log('✓ Account is active');
    console.log('');
    
    // Test password
    const passwordMatch = await bcrypt.compare(testPassword, instructorData.password);
    
    if (passwordMatch) {
      console.log('✅ PASSWORD MATCHES! Login should work.');
      console.log('');
      console.log('📌 Use these credentials to login:');
      console.log('   Email:', testEmail);
      console.log('   Password:', testPassword);
    } else {
      console.log('❌ PASSWORD DOES NOT MATCH!');
      console.log('   The password you entered is incorrect.');
      console.log('   Run: node create-instructor.js to reset the password');
    }
    
    console.log('');
    
  } catch (error) {
    console.error('❌ Error verifying instructor:', error.message);
    console.error(error);
  }
  
  process.exit(0);
}

// Run the script
verifyInstructor();
