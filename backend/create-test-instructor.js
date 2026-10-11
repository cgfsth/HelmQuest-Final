// Create Test Instructor Account in Firestore
import { db } from './config/firebase-admin.js';
import bcrypt from 'bcrypt';

async function createTestInstructor() {
  try {
    const email = 'instructor@helmquest.edu.ph';
    const password = 'instructor123';
    const hashedPassword = await bcrypt.hash(password, 10);

    const instructorData = {
      email: email,
      password: hashedPassword,
      name: 'Test Instructor',
      department: 'Maritime Training',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await db.collection('instructors').doc('test-instructor-1').set(instructorData);

    console.log('✅ Test instructor created successfully!');
    console.log('📧 Email:', email);
    console.log('🔑 Password:', password);
    console.log('\nYou can now login with these credentials.');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating test instructor:', error);
    process.exit(1);
  }
}

createTestInstructor();
