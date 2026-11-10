import admin, { db, storage } from '../config/firebase-admin.js';
import { DEMO_USERS } from '../../shared/demoAccounts.js';
import { createMaterialsAccess } from '../middleware/materialsAccess.js';
import { createLearningMaterialsService } from '../services/learningMaterials.js';
import { createLearningMaterialsRouter } from './learningMaterialsRouter.js';

export const learningMaterials = createLearningMaterialsService({ db,
  bucket: () => storage.bucket(process.env.FIREBASE_STORAGE_BUCKET || 'helmquest-565d6.firebasestorage.app'),
  timestamp: () => admin.firestore.FieldValue.serverTimestamp(), demos: Object.values(DEMO_USERS) });
export default createLearningMaterialsRouter({ service: learningMaterials,
  authenticate: createMaterialsAccess({ db, demos: Object.values(DEMO_USERS) }) });
