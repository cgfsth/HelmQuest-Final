// Authentication Routes Tests
import { describe, it, expect, beforeEach, afterEach } from 'jest';
import request from 'supertest';
import bcrypt from 'bcrypt';
import app from '../server.js';
import { db } from '../config/firebase-admin.js';

describe('POST /api/v1/auth/instructor-login', () => {
  let testInstructorId;
  const testEmail = 'test-instructor@helmquest.edu.ph';
  const testPassword = 'test123456';

  beforeEach(async () => {
    // Create test instructor
    const hashedPassword = await bcrypt.hash(testPassword, 10);
    const instructorData = {
      name: 'Test Instructor',
      email: testEmail,
      password: hashedPassword,
      role: 'instructor',
      status: 'active',
      StudentCount: 0,
      instructorid: '',
      totalsessions: 0,
      userid: '',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const docRef = await db.collection('instructor').add(instructorData);
    testInstructorId = docRef.id;
    
    // Update instructorid with document ID
    await docRef.update({ instructorid: testInstructorId });
  });

  afterEach(async () => {
    // Clean up test data
    if (testInstructorId) {
      await db.collection('instructor').doc(testInstructorId).delete();
    }
  });

  it('should authenticate valid instructor credentials', async () => {
    const response = await request(app)
      .post('/api/v1/auth/instructor-login')
      .send({
        email: testEmail,
        password: testPassword
      })
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.instructor).toBeDefined();
    expect(response.body.instructor.email).toBe(testEmail);
    expect(response.body.instructor.role).toBe('instructor');
    expect(response.body.instructor.password).toBeUndefined(); // Password should not be returned
  });

  it('should reject invalid email', async () => {
    const response = await request(app)
      .post('/api/v1/auth/instructor-login')
      .send({
        email: 'nonexistent@helmquest.edu.ph',
        password: testPassword
      })
      .expect(401);

    expect(response.body.error).toBe('Unauthorized');
    expect(response.body.message).toBe('Invalid email or password');
  });

  it('should reject invalid password', async () => {
    const response = await request(app)
      .post('/api/v1/auth/instructor-login')
      .send({
        email: testEmail,
        password: 'wrongpassword'
      })
      .expect(401);

    expect(response.body.error).toBe('Unauthorized');
    expect(response.body.message).toBe('Invalid email or password');
  });

  it('should reject inactive instructor', async () => {
    // Deactivate the instructor
    await db.collection('instructor').doc(testInstructorId).update({
      status: 'inactive'
    });

    const response = await request(app)
      .post('/api/v1/auth/instructor-login')
      .send({
        email: testEmail,
        password: testPassword
      })
      .expect(403);

    expect(response.body.error).toBe('Forbidden');
    expect(response.body.message).toBe('Account disabled. Contact system admin.');
  });

  it('should reject missing email', async () => {
    const response = await request(app)
      .post('/api/v1/auth/instructor-login')
      .send({
        password: testPassword
      })
      .expect(400);

    expect(response.body.error).toBe('Bad Request');
    expect(response.body.message).toBe('Email and password are required');
  });

  it('should reject missing password', async () => {
    const response = await request(app)
      .post('/api/v1/auth/instructor-login')
      .send({
        email: testEmail
      })
      .expect(400);

    expect(response.body.error).toBe('Bad Request');
    expect(response.body.message).toBe('Email and password are required');
  });

  it('should handle case-insensitive email matching', async () => {
    const response = await request(app)
      .post('/api/v1/auth/instructor-login')
      .send({
        email: testEmail.toUpperCase(),
        password: testPassword
      })
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.instructor.email).toBe(testEmail);
  });
});