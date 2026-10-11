/**
 * Fix Instructor Login - Complete Diagnostic and Fix Script
 * 
 * This script will:
 * 1. Check if instructor collection exists
 * 2. List all instructors
 * 3. Create/update an instructor account with your credentials
 * 4. Test the login
 * 
 * Usage:
 *   node fix-instructor-login.js
 */

import bcrypt from 'bcrypt';
import { db } from './config/firebase-admin.js';

const SALT_ROUNDS = 10;

// ============================================
// CHANGE THESE TO YOUR DESIRED CREDENTIALS
// ============================================
const YOUR_INSTRUCTOR = {
  name: 'Scarlet Sebial',
  email: 'scarlet@dnsc.edu.ph',
  password: '12345'
};
// ============================================

async function fixInstructorLogin() {
  try {
    console.log('\n╔════════════════════════════════════════════════╗');
    console.log('║   INSTRUCTOR LOGIN FIX & DIAGNOSTIC TOOL      ║');
    console.log('╚════════════════════════════════════════════════╝\n');
    
    // STEP 1: Check collections
    console.log('📦 Step 1: Checking Firestore Collections...\n');
    
    const collections = await db.listCollections();
    const collectionNames = collections.map(col => col.id);
    
    console.log('   Found collections:', collectionNames.join(', '));
    console.log('');
    
    const hasInstructorCollection = collectionNames.includes('instructor');
    const hasInstructorsCollection = collectionNames.includes('instructors');
    
    if (!hasInstructorCollection && !hasInstructorsCollection) {
      console.log('⚠️  WARNING: No instructor collection found!');
      console.log('   Will create "instructor" collection\n');
    }
    
    // STEP 2: Check existing instructors
    console.log('👥 Step 2: Checking Existing Instructors...\n');
    
    let instructorCollection = 'instructor';
    let snapshot = await db.collection('instructor').get();
    
    // Try alternate collection name
    if (snapshot.empty && hasInstructorsCollection) {
      console.log('   Checking "instructors" collection...');
      instructorCollection = 'instructors';
      snapshot = await db.collection('instructors').get();
    }
    
    if (snapshot.empty) {
      console.log('   ❌ No instructors found in database\n');
    } else {
      console.log(`   ✓ Found ${snapshot.size} instructor(s):\n`);
      snapshot.docs.forEach((doc, index) => {
        const data = doc.data();
        console.log(`      ${index + 1}. ${data.name || 'Unnamed'}`);
        console.log(`         Email: ${data.email || 'No email'}`);
        console.log(`         Status: ${data.status || 'No status'}`);
        console.log(`         Has Password: ${data.password ? 'Yes' : 'No'}`);
        console.log('');
      });
    }
    
    // STEP 3: Create/Update Instructor
    console.log('🔧 Step 3: Creating/Updating Your Instructor Account...\n');
    console.log('   Your credentials:');
    console.log('   Name:', YOUR_INSTRUCTOR.name);
    console.log('   Email:', YOUR_INSTRUCTOR.email);
    console.log('   Password:', YOUR_INSTRUCTOR.password);
    console.log('');
    
    // Check if instructor exists
    const existingSnapshot = await db.collection(instructorCollection)
      .where('email', '==', YOUR_INSTRUCTOR.email.toLowerCase())
      .get();
    
    let instructorDocId;
    
    if (existingSnapshot.empty) {
      console.log('   Creating NEW instructor...');
      
      // Hash password
      const hashedPassword = await bcrypt.hash(YOUR_INSTRUCTOR.password, SALT_ROUNDS);
      
      // Create instructor
      const docRef = await db.collection(instructorCollection).add({
        name: YOUR_INSTRUCTOR.name,
        email: YOUR_INSTRUCTOR.email.toLowerCase(),
        password: hashedPassword,
        status: 'active',
        StudentCount: 0,
        totalsessions: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      
      instructorDocId = docRef.id;
      console.log('   ✅ Instructor created successfully!');
      console.log('   Document ID:', instructorDocId);
      
    } else {
      console.log('   Instructor already exists, UPDATING password...');
      
      instructorDocId = existingSnapshot.docs[0].id;
      
      // Hash new password
      const hashedPassword = await bcrypt.hash(YOUR_INSTRUCTOR.password, SALT_ROUNDS);
      
      // Update instructor
      await db.collection(instructorCollection).doc(instructorDocId).update({
        name: YOUR_INSTRUCTOR.name,
        password: hashedPassword,
        status: 'active',
        updatedAt: new Date()
      });
      
      console.log('   ✅ Instructor updated successfully!');
      console.log('   Document ID:', instructorDocId);
    }
    
    console.log('');
    
    // STEP 4: Verify the login
    console.log('🧪 Step 4: Testing Login...\n');
    
    const verifySnapshot = await db.collection(instructorCollection)
      .where('email', '==', YOUR_INSTRUCTOR.email.toLowerCase())
      .limit(1)
      .get();
    
    if (verifySnapshot.empty) {
      console.log('   ❌ ERROR: Could not find instructor after creation!');
      console.log('   This should not happen. Check Firestore console.\n');
      process.exit(1);
    }
    
    const verifyDoc = verifySnapshot.docs[0];
    const verifyData = verifyDoc.data();
    
    console.log('   ✓ Instructor found in database');
    console.log('   ✓ Status:', verifyData.status);
    
    // Test password
    const passwordMatch = await bcrypt.compare(YOUR_INSTRUCTOR.password, verifyData.password);
    
    if (passwordMatch) {
      console.log('   ✅ Password verification: SUCCESS\n');
    } else {
      console.log('   ❌ Password verification: FAILED\n');
      console.log('   This should not happen. Try running the script again.\n');
      process.exit(1);
    }
    
    // STEP 5: Success Message
    console.log('╔════════════════════════════════════════════════╗');
    console.log('║              ✅ ALL CHECKS PASSED!             ║');
    console.log('╚════════════════════════════════════════════════╝\n');
    
    console.log('📌 LOGIN CREDENTIALS:\n');
    console.log('   Collection:', instructorCollection);
    console.log('   Email:', YOUR_INSTRUCTOR.email);
    console.log('   Password:', YOUR_INSTRUCTOR.password);
    console.log('');
    console.log('🎯 NEXT STEPS:\n');
    console.log('   1. Make sure backend server is running:');
    console.log('      cd backend && npm run dev');
    console.log('');
    console.log('   2. Open frontend in browser:');
    console.log('      http://localhost:5174');
    console.log('');
    console.log('   3. Click "Instructor Login"');
    console.log('');
    console.log('   4. Enter these exact credentials:');
    console.log(`      Email: ${YOUR_INSTRUCTOR.email}`);
    console.log(`      Password: ${YOUR_INSTRUCTOR.password}`);
    console.log('');
    console.log('✨ Login should work now!\n');
    
  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    console.error(error);
    console.log('\n💡 TROUBLESHOOTING:\n');
    console.log('   - Make sure Firebase credentials are correct');
    console.log('   - Check backend/.env file');
    console.log('   - Verify serviceAccountKey.json exists');
    console.log('   - Ensure Firestore database is enabled in Firebase console\n');
  }
  
  process.exit(0);
}

// Run the script
fixInstructorLogin();
