// Admin Routes - System Administration
import express from 'express';
import bcrypt from 'bcrypt';
import { db } from '../config/firebase-admin.js';
import { requireAdmin } from '../middleware/requireAdmin.js';
import {
  loadAdminInstructors,
  loadAdminStats,
  loadAdminStudentRecord,
  loadAdminStudents,
  publicInstructor
} from '../services/adminPortal.js';

const router = express.Router();

// Apply admin middleware to all routes
router.use(requireAdmin);

// ============================================================================
// SYSTEM STATISTICS
// ============================================================================

router.get('/stats', async (req, res) => {
  try {
    res.json(await loadAdminStats(db));
  } catch (error) {
    console.error('Stats error:', error);
    res.status(500).json({
      error: 'Server Error',
      message: error.message
    });
  }
});

// ============================================================================
// INSTRUCTOR MANAGEMENT
// ============================================================================

// GET all instructors with student counts
router.get('/instructors', async (req, res) => {
  try {
    const instructors = await loadAdminInstructors(db);
    res.json({ instructors, count: instructors.length });
    
  } catch (error) {
    console.error('Get instructors error:', error);
    res.status(500).json({
      error: 'Server Error',
      message: error.message
    });
  }
});

// POST create new instructor
router.post('/instructors', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    
    // Validate required fields
    if (!name || !email || !password) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'All fields required: name, email, password'
      });
    }
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Invalid email format'
      });
    }
    
    // Check if email already exists
    const existingInstructor = await db.collection('instructor')
      .where('email', '==', email)
      .get();
    
    if (!existingInstructor.empty) {
      return res.status(409).json({
        error: 'Conflict',
        message: 'Email already registered'
      });
    }
    
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Create instructor document (matching existing structure)
    const instructorData = {
      name,
      email,
      password: hashedPassword,
      role: 'instructor',
      status: 'active',
      StudentCount: 0,                    // Match existing field name
      instructorid: '',                   // Will be updated after doc creation
      totalsessions: 0,
      userid: '',                         // Can be set later
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    const docRef = await db.collection('instructor').add(instructorData);
    
    // Update instructorid with the actual document ID
    await docRef.update({
      instructorid: docRef.id
    });
    
    // Return without password
    res.status(201).json({
      message: 'Instructor created successfully',
      instructor: publicInstructor({ id: docRef.id, ...instructorData })
    });
    
  } catch (error) {
    console.error('Create instructor error:', error);
    res.status(500).json({
      error: 'Server Error',
      message: error.message
    });
  }
});

// PUT update instructor
router.put('/instructors/:id', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const instructorRef = db.collection('instructor').doc(req.params.id);
    const instructorDoc = await instructorRef.get();
    
    if (!instructorDoc.exists) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Instructor not found'
      });
    }
    
    // Validate email if provided
    if (email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({
          error: 'Bad Request',
          message: 'Invalid email format'
        });
      }
    }
    
    const updateData = {};
    if (name) updateData.name = name;
    if (email) updateData.email = email;
    
    // Hash password if provided
    if (password && password.trim() !== '') {
      const hashedPassword = await bcrypt.hash(password, 10);
      updateData.password = hashedPassword;
    }
    
    updateData.updatedAt = new Date();
    
    await instructorRef.update(updateData);
    
    const updatedDoc = await instructorRef.get();
    res.json({
      message: 'Instructor updated successfully',
      instructor: publicInstructor({ id: updatedDoc.id, ...updatedDoc.data() })
    });
    
  } catch (error) {
    console.error('Update instructor error:', error);
    res.status(500).json({
      error: 'Server Error',
      message: error.message
    });
  }
});

// PATCH toggle instructor status
router.patch('/instructors/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    
    if (!['active', 'inactive'].includes(status)) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Status must be either "active" or "inactive"'
      });
    }
    
    const instructorRef = db.collection('instructor').doc(req.params.id);
    const instructorDoc = await instructorRef.get();
    
    if (!instructorDoc.exists) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Instructor not found'
      });
    }
    
    await instructorRef.update({
      status,
      updatedAt: new Date()
    });
    
    res.json({
      message: `Instructor ${status === 'active' ? 'activated' : 'deactivated'} successfully`
    });
    
  } catch (error) {
    console.error('Toggle instructor status error:', error);
    res.status(500).json({
      error: 'Server Error',
      message: error.message
    });
  }
});

// DELETE instructor
router.delete('/instructors/:id', async (req, res) => {
  try {
    const { force } = req.query;
    
    // Support both the current and legacy assignment keys so removing an
    // instructor cannot silently orphan an older student document.
    const [currentStudents, legacyStudents] = await Promise.all([
      db.collection('students').where('instructorid', '==', req.params.id).get(),
      db.collection('students').where('instructorId', '==', req.params.id).get()
    ]);
    const assignedStudentCount = new Set([
      ...currentStudents.docs.map(doc => doc.id),
      ...legacyStudents.docs.map(doc => doc.id)
    ]).size;

    if (assignedStudentCount > 0 && force !== 'true') {
      return res.status(400).json({
        error: 'Bad Request',
        message: `Instructor has ${assignedStudentCount} assigned students. Transfer them before removing the instructor.`,
        studentCount: assignedStudentCount
      });
    }
    
    await db.collection('instructor').doc(req.params.id).delete();
    
    res.json({
      message: 'Instructor deleted successfully',
      deletedId: req.params.id
    });
    
  } catch (error) {
    console.error('Delete instructor error:', error);
    res.status(500).json({
      error: 'Server Error',
      message: error.message
    });
  }
});

// ============================================================================
// GLOBAL STUDENT MANAGEMENT
// ============================================================================

// GET all students with filters
router.get('/students', async (req, res) => {
  try {
    const { status, instructorId, search, limit = 25, offset = 0 } = req.query;
    res.json(await loadAdminStudents(db, { status, instructorId, search, limit, offset }));
  } catch (error) {
    console.error('Get students error:', error);
    res.status(500).json({
      error: 'Server Error',
      message: error.message
    });
  }
});

// Fresh, read-only training record using the same XP/rank/result rules as the student and instructor portals.
router.get('/students/:id/training-record', async (req, res) => {
  try {
    const student = await loadAdminStudentRecord(db, req.params.id);
    if (!student) return res.status(404).json({ error: 'Not Found', message: 'Student not found' });
    res.json({ student });
  } catch (error) {
    console.error('Get student training record error:', error);
    res.status(500).json({ error: 'Server Error', message: error.message });
  }
});

// PUT update student
router.put('/students/:id', async (req, res) => {
  try {
    const { name, studentId, status, password } = req.body;
    
    const studentRef = db.collection('students').doc(req.params.id);
    const studentDoc = await studentRef.get();
    
    if (!studentDoc.exists) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Student not found'
      });
    }
    
    const updateData = {};
    if (name) updateData.name = name;
    if (studentId !== undefined) updateData.studentId = studentId; // Allow empty string
    if (status) updateData.status = status;
    
    // Hash password if provided
    if (password && password.trim() !== '') {
      const hashedPassword = await bcrypt.hash(password, 10);
      updateData.password = hashedPassword;
    }
    
    updateData.updatedAt = new Date();
    
    await studentRef.update(updateData);
    const student = await loadAdminStudentRecord(db, req.params.id);
    res.json({
      message: 'Student updated successfully',
      student
    });
    
  } catch (error) {
    console.error('Update student error:', error);
    res.status(500).json({
      error: 'Server Error',
      message: error.message
    });
  }
});

// PUT transfer student to new instructor
router.put('/students/:id/transfer', async (req, res) => {
  try {
    const { newInstructorId } = req.body;
    
    if (!newInstructorId) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'newInstructorId is required'
      });
    }
    
    // Verify new instructor exists and is active
    const instructorDoc = await db.collection('instructor').doc(newInstructorId).get();
    
    if (!instructorDoc.exists) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Instructor not found'
      });
    }
    
    const instructorData = instructorDoc.data();
    if (instructorData.status === 'inactive') {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Cannot transfer to inactive instructor'
      });
    }
    
    // Update student
    const studentRef = db.collection('students').doc(req.params.id);
    const studentDoc = await studentRef.get();
    
    if (!studentDoc.exists) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Student not found'
      });
    }
    
    const oldInstructorId = studentDoc.data().instructorid ?? studentDoc.data().instructorId ?? null;
    
    await studentRef.update({
      instructorid: newInstructorId,
      updatedAt: new Date()
    });
    
    // Log transfer (would add to audit log collection)
    await db.collection('admin_audit_log').add({
      action: 'student_transfer',
      adminId: req.adminUser.id,
      studentId: req.params.id,
      oldInstructorId,
      newInstructorId,
      timestamp: new Date()
    });
    
    const student = await loadAdminStudentRecord(db, req.params.id);
    res.json({
      message: 'Student transferred successfully',
      student
    });
    
  } catch (error) {
    console.error('Transfer student error:', error);
    res.status(500).json({
      error: 'Server Error',
      message: error.message
    });
  }
});

// PATCH bulk update student status
router.patch('/students/bulk-status', async (req, res) => {
  try {
    const { studentIds, status } = req.body;
    
    if (!studentIds || !Array.isArray(studentIds) || studentIds.length === 0) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'studentIds array is required'
      });
    }
    
    if (!['active', 'inactive', 'pending'].includes(status)) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Invalid status'
      });
    }
    
    // Update each student
    const batch = db.batch();
    
    for (const studentId of studentIds) {
      const studentRef = db.collection('students').doc(studentId);
      batch.update(studentRef, {
        status,
        updatedAt: new Date()
      });
    }
    
    await batch.commit();
    
    // Log bulk operation
    await db.collection('admin_audit_log').add({
      action: 'bulk_status_update',
      adminId: req.adminUser.id,
      studentIds,
      newStatus: status,
      count: studentIds.length,
      timestamp: new Date()
    });
    
    res.json({
      message: `Successfully updated ${studentIds.length} students to ${status}`,
      count: studentIds.length
    });
    
  } catch (error) {
    console.error('Bulk status update error:', error);
    res.status(500).json({
      error: 'Server Error',
      message: error.message
    });
  }
});

// GET audit logs
router.get('/audit-logs', async (req, res) => {
  try {
    const { limit = 50, offset = 0 } = req.query;
    
    const snapshot = await db.collection('admin_audit_log')
      .orderBy('timestamp', 'desc')
      .limit(parseInt(limit))
      .offset(parseInt(offset))
      .get();
    
    const logs = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    res.json({ logs, count: logs.length });
    
  } catch (error) {
    console.error('Get audit logs error:', error);
    res.status(500).json({
      error: 'Server Error',
      message: error.message
    });
  }
});

export default router;
