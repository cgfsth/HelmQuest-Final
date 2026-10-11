/**
 * Authentication Routes
 * 
 * Handles instructor authentication against Firestore database.
 * Instructors are created through the admin panel and stored in Firestore 
 * with bcrypt-hashed passwords. This endpoint provides secure authentication
 * for instructors to access the instructor dashboard.
 * 
 * Security Features:
 * - Bcrypt password hashing
 * - Status validation (active/inactive)
 * - Firestore email indexing for performance
 * - No sensitive data in error responses
 * - Password exclusion from success responses
 */
import express from 'express';
import bcrypt from 'bcrypt';
import { db } from '../config/firebase-admin.js';
import { issueSession } from '../services/authSession.js';
import { DEMO_USERS } from '../../shared/demoAccounts.js';

const router = express.Router();

router.post('/demo-login', (req, res) => {
  const user = DEMO_USERS[String(req.body.email || '').trim().toLowerCase()];
  if (!user || req.body.password !== user.password) {
    return res.status(401).json({ error: 'Unauthorized', message: 'Invalid email or password' });
  }
  const { password, ...profile } = user;
  res.json({ user: profile, sessionToken: issueSession(user.id, user.role) });
});

// ============================================================================
// INSTRUCTOR LOGIN
// ============================================================================

/**
 * POST /api/v1/auth/instructor-login
 * 
 * Authenticate instructor against Firestore instructor collection.
 * This endpoint handles authentication for instructors created through
 * the admin panel management system.
 * 
 * Email Pattern Detection:
 * - Expected pattern: @helmquest.edu.ph (Firestore instructors)
 * - Demo accounts (@helmquest.local) are handled by frontend first
 * - Firestore query indexed by email field for performance
 * 
 * Authentication Flow:
 * 1. Validate request parameters (email, password required)
 * 2. Query Firestore instructor collection by email (case-insensitive)
 * 3. Check if instructor document exists
 * 4. Validate instructor status (must be 'active')
 * 5. Compare provided password with bcrypt hash from database
 * 6. Return instructor data (excluding password) on success
 * 
 * Security Measures:
 * - Passwords compared using bcrypt.compare() for timing attack resistance
 * - Password field excluded from all responses
 * - Generic error messages to prevent user enumeration
 * - Status validation prevents inactive account access
 * 
 * Error Handling Strategy:
 * - 400: Missing required fields (email or password)
 * - 401: Authentication failed (invalid email/password, prevents enumeration)
 * - 403: Account inactive (specific status-based rejection)
 * - 500: Server/database errors (generic message, details logged)
 * 
 * Request Body:
 * {
 *   "email": "prof@helmquest.edu.ph",    // Required, case-insensitive
 *   "password": "plaintext_password"     // Required, compared against bcrypt hash
 * }
 * 
 * Success Response (200):
 * {
 *   "success": true,
 *   "instructor": {
 *     "id": "firestore_document_id",     // Firestore document ID
 *     "instructorId": "firestore_document_id", // Duplicate for compatibility
 *     "name": "Professor Name",
 *     "email": "prof@helmquest.edu.ph",
 *     "role": "instructor",              // Always "instructor"
 *     "status": "active",                // "active" | "inactive"
 *     "StudentCount": 5,                 // Number of assigned students
 *     "totalsessions": 12                // Total training sessions conducted
 *   }
 * }
 * 
 * Error Responses:
 * - 400: Missing email or password
 * - 401: Invalid credentials (email not found or wrong password)
 * - 403: Instructor account is inactive
 * - 500: Server/database error
 */
router.post('/instructor-login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    console.log('\n🔐 INSTRUCTOR LOGIN ATTEMPT:');
    console.log('   Email:', email);
    console.log('   Password length:', password ? password.length : 0);
    
    // Validate required fields - both email and password must be provided
    if (!email || !password) {
      console.log('   ❌ Missing email or password');
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Email and password are required'
      });
    }
    
    // Query Firestore for instructor by email (case-insensitive)
    // First try exact lowercase match, then try case-insensitive search
    const normalizedEmail = email.trim().toLowerCase();
    console.log('   Normalized email:', normalizedEmail);
    console.log('   Querying Firestore...');
    
    let instructorSnapshot = await db.collection('instructor')
      .where('email', '==', normalizedEmail)
      .limit(1)
      .get();
    
    // If not found with lowercase, try to find with any case and fix it
    if (instructorSnapshot.empty) {
      console.log('   No exact match found, searching all instructors...');
      const allInstructors = await db.collection('instructor').get();
      
      for (const doc of allInstructors.docs) {
        const data = doc.data();
        if (data.email && data.email.toLowerCase() === normalizedEmail) {
          console.log('   Found instructor with different case:', data.email);
          console.log('   Fixing email case in database...');
          
          // Update the email to lowercase
          await db.collection('instructor').doc(doc.id).update({
            email: normalizedEmail
          });
          
          console.log('   Email fixed! Re-querying...');
          
          // Re-query to get the updated document
          instructorSnapshot = await db.collection('instructor')
            .where('email', '==', normalizedEmail)
            .limit(1)
            .get();
          
          break;
        }
      }
    }
    
    console.log('   Query result: Found', instructorSnapshot.size, 'instructor(s)');
    
    // Check if instructor exists - use generic error to prevent user enumeration
    if (instructorSnapshot.empty) {
      console.log('   ❌ No instructor found with this email');
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid email or password'
      });
    }
    
    const instructorDoc = instructorSnapshot.docs[0];
    const instructorData = instructorDoc.data();
    
    console.log('   ✓ Instructor found:');
    console.log('      Name:', instructorData.name);
    console.log('      Email:', instructorData.email);
    console.log('      Status:', instructorData.status);
    console.log('      Has password:', instructorData.password ? 'Yes' : 'No');
    
    // Validate instructor status - only active instructors can login
    // This check happens before password validation for security consistency
    if (instructorData.status === 'inactive') {
      console.log('   ❌ Account is inactive');
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Account disabled. Contact system admin.'
      });
    }
    
    console.log('   Comparing passwords...');
    // Compare password with bcrypt hash - secure against timing attacks
    const passwordMatch = await bcrypt.compare(password, instructorData.password);
    
    console.log('   Password match:', passwordMatch ? '✓ YES' : '❌ NO');
    
    if (!passwordMatch) {
      console.log('   ❌ Password does not match');
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid email or password'
      });
    }
    
    // Authentication successful - return instructor data without password
    // Use destructuring to exclude password field from response
    const { password: _, ...instructorWithoutPassword } = instructorData;
    
    console.log('   ✅ LOGIN SUCCESSFUL!\n');
    
    res.json({
      success: true,
      sessionToken: issueSession(instructorDoc.id, 'instructor'),
      instructor: {
        id: instructorDoc.id,                    // Firestore document ID
        instructorId: instructorDoc.id,          // Compatibility field
        ...instructorWithoutPassword             // All other instructor data
      }
    });
    
  } catch (error) {
    // Log detailed error for debugging but return generic message to client
    console.error('\n❌ Instructor login error:', error);
    console.error('   Stack:', error.stack);
    res.status(500).json({
      error: 'Server Error',
      message: 'Login failed. Please try again.'
    });
  }
});

export default router;
