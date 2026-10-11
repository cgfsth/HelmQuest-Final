// Students Routes
import express from 'express';
import bcrypt from 'bcrypt';
import { db } from '../config/firebase-admin.js';
import { studentProgressionFields } from '../../shared/progression.js';
import { loadRankSettings, synchronizeStudentProgression } from '../services/progression.js';
import { loadStudentTrainingRecord } from '../services/studentTrainingRecords.js';
import { issueSession } from '../services/authSession.js';
import { requireMissionUser, requireStudentTrainingAccess } from '../middleware/missionAccess.js';

const router = express.Router();

// POST /api/v1/students/signup - Student signup with pending status
router.post('/signup', async (req, res) => {
  try {
    const { studentId, name, email, password, instructorId } = req.body;

    // Validate required fields
    if (!studentId || !name || !email || !password || !instructorId) {
      return res.status(400).json({ 
        error: 'Bad Request', 
        message: 'All fields are required: studentId, name, email, password, instructorId' 
      });
    }

    // Validate email domain must be @dnsc.edu.ph
    if (!email.endsWith('@dnsc.edu.ph')) {
      return res.status(400).json({ 
        error: 'Bad Request', 
        message: 'Email must be a valid DNSC email address (@dnsc.edu.ph)' 
      });
    }

    // Check if email already exists
    const existingStudent = await db.collection('students')
      .where('email', '==', email)
      .get();
    
    if (!existingStudent.empty) {
      return res.status(409).json({ 
        error: 'Conflict', 
        message: 'Email already registered' 
      });
    }

    // Hash password with bcrypt (10 salt rounds)
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create student document with pending status
    const studentData = {
      studentId,
      name,
      email,
      password: hashedPassword,
      instructorid: instructorId, // Store the assigned instructor ID
      status: 'pending',
      xp: 0,
      completed: 0,
      averageScore: 0,
      bestScore: 0,
      certificates: 0,
      boatUsed: 'Commercial Trawler',
      approvedBy: null,
      approvedAt: null,
      createdAt: new Date()
    };

    Object.assign(studentData, studentProgressionFields(studentData, await loadRankSettings()));
    const docRef = await db.collection('students').add(studentData);

    res.status(201).json({ 
      message: 'Account created! Wait for instructor approval.', 
      studentId: docRef.id 
    });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ 
      error: 'Server Error', 
      message: error.message 
    });
  }
});

// GET /api/v1/students/pending - Get pending students for specific instructor
router.get('/pending', async (req, res) => {
  try {
    const { instructorId } = req.query;
    
    let query = db.collection('students')
      .where('status', '==', 'pending');
    
    // Filter by instructor if provided (instructors should only see students assigned to them)
    if (instructorId) {
      query = query.where('instructorid', '==', instructorId);
    }
    
    const snapshot = await query.get();
    const rankSettings = await loadRankSettings();
    const students = await Promise.all(snapshot.docs.map(doc => synchronizeStudentProgression(doc.ref, rankSettings)));
    
    console.log(`GET /students/pending - instructorId: ${instructorId}, count: ${students.length}`);
    
    res.json({ students, count: students.length });
  } catch (error) {
    console.error('Error fetching pending students:', error);
    res.status(500).json({ error: 'Server Error', message: error.message });
  }
});

// PUT /api/v1/students/:id/approve - Approve a pending student
router.put('/:id/approve', async (req, res) => {
  try {
    const { instructorId } = req.body;
    
    const studentRef = db.collection('students').doc(req.params.id);
    const studentDoc = await studentRef.get();
    
    if (!studentDoc.exists) {
      return res.status(404).json({ error: 'Not Found', message: 'Student not found' });
    }
    
    const studentData = studentDoc.data();
    
    console.log(`🟢 APPROVING STUDENT:`);
    console.log(`   Student ID: ${req.params.id}`);
    console.log(`   Student Name: ${studentData.name}`);
    console.log(`   Original instructorid: ${studentData.instructorid}`);
    console.log(`   Approving Instructor ID: ${instructorId}`);
    console.log(`   Status change: ${studentData.status} → active`);
    
    await studentRef.update({
      status: 'active',
      instructorid: instructorId || 'instructor', // Set the instructor who approved them
      approvedBy: instructorId || 'instructor',
      approvedAt: new Date()
    });
    
    const updatedDoc = await studentRef.get();
    
    console.log(`✅ Student approved successfully - Status: ${updatedDoc.data().status}, InstructorID: ${updatedDoc.data().instructorid}`);
    
    res.json({ 
      message: 'Student approved successfully', 
      student: { id: updatedDoc.id, ...updatedDoc.data() }
    });
  } catch (error) {
    console.error('Error approving student:', error);
    res.status(500).json({ error: 'Server Error', message: error.message });
  }
});

// PUT /api/v1/students/:id/reject - Reject a pending student
router.put('/:id/reject', async (req, res) => {
  try {
    const studentRef = db.collection('students').doc(req.params.id);
    const studentDoc = await studentRef.get();
    
    if (!studentDoc.exists) {
      return res.status(404).json({ error: 'Not Found', message: 'Student not found' });
    }
    
    await studentRef.update({
      status: 'rejected'
    });
    
    res.json({ message: 'Student rejected successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Server Error', message: error.message });
  }
});

// GET /api/v1/students - Get all students (with optional instructor filter)
router.get('/', async (req, res) => {
  try {
    const { instructorId } = req.query;
    
    let query = db.collection('students');
    
    // Filter by instructor if provided (instructors should only see their own students)
    if (instructorId) {
      query = query.where('instructorid', '==', instructorId);
      // For instructors, only show active students (not pending/rejected/inactive)
      query = query.where('status', '==', 'active');
    }
    
    const snapshot = await query.get();
    const students = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    const rankSettings = await loadRankSettings();
    const normalizedStudents = students.map(student => ({ ...student, ...studentProgressionFields(student, rankSettings) }));
    
    console.log(`GET /students - instructorId: ${instructorId}, count: ${students.length}`);
    
    res.json({ students: normalizedStudents, count: students.length, rankSettings });
  } catch (error) {
    console.error('Error fetching students:', error);
    res.status(500).json({ error: 'Server Error', message: error.message });
  }
});

// GET /api/v1/students/:id - Get student by ID
router.get('/:id', async (req, res) => {
  try {
    const settings = await loadRankSettings();
    const student = await synchronizeStudentProgression(db.collection('students').doc(req.params.id), settings);
    if (!student) return res.status(404).json({ error: 'Not Found', message: 'Student not found' });
    res.json({ student, rankSettings: settings });
  } catch (error) {
    res.status(500).json({ error: 'Server Error', message: error.message });
  }
});

// POST /api/v1/students - Create new student
router.post('/', async (req, res) => {
  try {
    const studentData = { 
      ...req.body, 
      status: req.body.status || 'active',
      createdAt: new Date()
    };
    Object.assign(studentData, studentProgressionFields(studentData, await loadRankSettings()));
    const docRef = await db.collection('students').add(studentData);
    res.status(201).json({ message: 'Student created', studentId: docRef.id });
  } catch (error) {
    res.status(500).json({ error: 'Server Error', message: error.message });
  }
});

// PUT /api/v1/students/:id - Update student
router.put('/:id', async (req, res) => {
  try {
    await db.collection('students').doc(req.params.id).update({ ...req.body });
    await synchronizeStudentProgression(db.collection('students').doc(req.params.id));
    res.json({ message: 'Student updated successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Server Error', message: error.message });
  }
});

// PUT /api/v1/students/:id/scores - Update student mission scores
router.put('/:id/scores', async (req, res) => {
  try {
    const { averageScore, completed, bestScore } = req.body;
    
    const updateData = {};
    if (averageScore !== undefined) updateData.averageScore = averageScore;
    if (completed !== undefined) updateData.completed = completed;
    if (bestScore !== undefined) updateData.bestScore = bestScore;
    
    await db.collection('students').doc(req.params.id).update(updateData);
    
    console.log(`✅ Updated scores for student ${req.params.id}:`, updateData);
    
    res.json({ 
      message: 'Student scores updated successfully',
      scores: updateData
    });
  } catch (error) {
    console.error('Error updating student scores:', error);
    res.status(500).json({ error: 'Server Error', message: error.message });
  }
});

// DELETE /api/v1/students/:id - Delete student
router.delete('/:id', async (req, res) => {
  try {
    await db.collection('students').doc(req.params.id).delete();
    res.json({ message: 'Student deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Server Error', message: error.message });
  }
});

// POST /api/v1/students/login - Student login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ 
        error: 'Bad Request', 
        message: 'Email and password are required' 
      });
    }

    // Find student by email
    const snapshot = await db.collection('students')
      .where('email', '==', email.toLowerCase())
      .get();
    
    if (snapshot.empty) {
      return res.status(401).json({ 
        error: 'Unauthorized', 
        message: 'Invalid email or password' 
      });
    }

    const studentDoc = snapshot.docs[0];
    const studentData = studentDoc.data();

    // Verify password
    const passwordMatch = await bcrypt.compare(password, studentData.password);
    
    if (!passwordMatch) {
      return res.status(401).json({ 
        error: 'Unauthorized', 
        message: 'Invalid email or password' 
      });
    }

    // Return student data WITHOUT password
    const settings = await loadRankSettings();
    const synchronized = await synchronizeStudentProgression(studentDoc.ref, settings);
    const { password: _, ...studentWithoutPassword } = synchronized;
    
    res.json({ 
      message: 'Login successful', 
      ...(studentData.status === 'active' ? { sessionToken: issueSession(studentDoc.id, 'student') } : {}),
      student: { id: studentDoc.id, ...studentWithoutPassword },
      rankSettings: settings
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ 
      error: 'Server Error', 
      message: error.message 
    });
  }
});

// Compatibility endpoints use the same saved records as instructor Student Management.
router.get('/:id/training-summary', requireMissionUser, requireStudentTrainingAccess, async (req, res) => {
  try {
    const record = await loadStudentTrainingRecord(db, req.params.id);
    if (!record) return res.status(404).json({ error: 'Not Found', message: 'Student not found' });
    res.json({ studentId: record.id,
      missions: { completed: record.missionsCompleted, total: record.missionsTotal, avgScore: record.missionScore },
      quizzes: { completed: record.quizzesCompleted, total: record.quizzesTotal, avgScore: record.quizScore },
      latestActivity: record.latestActivity });
  } catch (error) { res.status(500).json({ error: 'Server Error', message: error.message }); }
});
router.get('/:id/missions-detail', requireMissionUser, requireStudentTrainingAccess, async (req, res) => {
  try {
    const record = await loadStudentTrainingRecord(db, req.params.id);
    if (!record) return res.status(404).json({ error: 'Not Found', message: 'Student not found' });
    res.json({ missions: record.missionsDetail });
  } catch (error) { res.status(500).json({ error: 'Server Error', message: error.message }); }
});
router.get('/:id/quizzes-detail', requireMissionUser, requireStudentTrainingAccess, async (req, res) => {
  try {
    const record = await loadStudentTrainingRecord(db, req.params.id);
    if (!record) return res.status(404).json({ error: 'Not Found', message: 'Student not found' });
    res.json({ quizzes: record.quizzesDetail });
  } catch (error) { res.status(500).json({ error: 'Server Error', message: error.message }); }
});
export default router;
