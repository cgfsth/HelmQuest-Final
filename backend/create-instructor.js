/**
 * Create Instructor Account Script
 * 
 * This script creates a new instructor account in Firestore with a properly hashed password.
 * Run this script to create instructor accounts since only admins can create them.
 * 
 * Usage:
 *   node create-instructor.js
 */

import bcrypt from 'bcrypt';
import { db } from './config/firebase-admin.js';

const SALT_ROUNDS = 10;

async function createInstructor() {
  try {
    console.log('\n🚀 Creating Instructor Account...\n');
    
    // Instructor details - CHANGE THESE VALUES
    const instructorData = {
      name: 'JOcel Sebial',
      email: 'jocel@dnsc.edu.ph',        // Change this to your email
      password: '12345',                 // Change this to your desired password
      status: 'active'
    };
    
    console.log('📋 Instructor Details:');
    console.log('   Name:', instructorData.name);
    console.log('   Email:', instructorData.email);
    console.log('   Password:', instructorData.password);
    console.log('   Status:', instructorData.status);
    console.log('');
    
    // Check if instructor already exists
    const existingInstructor = await db.collection('instructor')
      .where('email', '==', instructorData.email.toLowerCase())
      .get();
    
    if (!existingInstructor.empty) {
      console.log('⚠️  Instructor with this email already exists!');
      console.log('   Updating password instead...\n');
      
      // Update existing instructor password
      const docId = existingInstructor.docs[0].id;
      const hashedPassword = await bcrypt.hash(instructorData.password, SALT_ROUNDS);
      
      await db.collection('instructor').doc(docId).update({
        password: hashedPassword,
        status: 'active',
        updatedAt: new Date()
      });
      
      console.log('✅ Instructor password updated successfully!');
      console.log('   Document ID:', docId);
    } else {
      // Create new instructor
      console.log('🔐 Hashing password...');
      const hashedPassword = await bcrypt.hash(instructorData.password, SALT_ROUNDS);
      console.log('✓ Password hashed\n');
      
      console.log('💾 Saving to Firestore...');
      const docRef = await db.collection('instructor').add({
        name: instructorData.name,
        email: instructorData.email.toLowerCase(),
        password: hashedPassword,
        status: 'active',
        StudentCount: 0,
        totalsessions: 0,
        createdAt: new Date()
      });
      
      console.log('✅ Instructor account created successfully!');
      console.log('   Document ID:', docRef.id);
    }
    
    console.log('\n📌 Login Credentials:');
    console.log('   Email:', instructorData.email);
    console.log('   Password:', instructorData.password);
    console.log('\n✨ You can now log in to the Instructor Console!\n');
    
  } catch (error) {
    console.error('❌ Error creating instructor:', error.message);
    console.error(error);
  }
  
  process.exit(0);
}

// Run the script
createInstructor();
