// Admin Authorization Middleware
import { db } from '../config/firebase-admin.js';

// Demo admin accounts that don't require Firestore lookup
const DEMO_ADMINS = ['admin-root'];

/**
 * Middleware to verify user has admin role
 * Checks Firestore for user document with role === 'admin'
 * Also allows demo admin accounts
 */
export const requireAdmin = async (req, res, next) => {
  try {
    // Get user ID from request (assuming it's set by auth middleware or passed in header)
    const userId = req.headers['x-user-id'] || req.user?.uid;
    
    if (!userId) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Authentication required. Please provide user ID.'
      });
    }
    
    // Allow demo admin accounts without Firestore lookup
    if (DEMO_ADMINS.includes(userId)) {
      req.adminUser = {
        id: userId,
        role: 'admin',
        name: 'System Admin'
      };
      return next();
    }
    
    // Query Firestore to verify user role
    // Check both 'users' collection (unified) and 'instructor' collection (current structure)
    let userDoc = await db.collection('users').doc(userId).get();
    
    // If not found in users collection, check instructor collection
    if (!userDoc.exists) {
      userDoc = await db.collection('instructor').doc(userId).get();
    }
    
    if (!userDoc.exists) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'User not found in system'
      });
    }
    
    const userData = userDoc.data();
    
    // Verify user has admin role
    if (userData.role !== 'admin') {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Admin access required. Your role: ' + (userData.role || 'none')
      });
    }
    
    // Attach user data to request for use in routes
    req.adminUser = {
      id: userId,
      ...userData
    };
    
    next();
    
  } catch (error) {
    console.error('Admin middleware error:', error);
    return res.status(500).json({
      error: 'Server Error',
      message: 'Failed to verify admin access: ' + error.message
    });
  }
};

export default requireAdmin;
