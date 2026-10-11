// Firebase Admin SDK Configuration
import admin from 'firebase-admin';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Initialize Firebase Admin SDK
let serviceAccount;

try {
  // Try to load service account key from file
  const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH || 
                             join(__dirname, '..', 'serviceAccountKey.json');
  
  serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf8'));
  
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: process.env.FIREBASE_DATABASE_URL
  });
  
  console.log('✅ Firebase Admin SDK initialized successfully');
  
} catch (error) {
  console.error('❌ Failed to initialize Firebase Admin SDK');
  console.error('Error:', error.message);
  console.error('\n📋 Setup Instructions:');
  console.error('1. Go to Firebase Console > Project Settings > Service Accounts');
  console.error('2. Click "Generate New Private Key"');
  console.error('3. Save the file as "serviceAccountKey.json" in the backend folder');
  console.error('4. Restart the server\n');
  
  process.exit(1);
}

// Export Firestore instance
export const db = admin.firestore();
export const auth = admin.auth();
export const storage = admin.storage();

export default admin;