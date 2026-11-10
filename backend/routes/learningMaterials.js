import admin, { db, storage } from '../config/firebase-admin.js';
import { DEMO_USERS } from '../../shared/demoAccounts.js';
import { createMaterialsAccess } from '../middleware/materialsAccess.js';
import { createLearningMaterialsService } from '../services/learningMaterials.js';
import { createLearningMaterialsRouter } from './learningMaterialsRouter.js';
import { createMaterialsBucketProvider } from '../services/supabaseMaterialsStorage.js';

export const learningMaterials = createLearningMaterialsService({ db,
  bucket: createMaterialsBucketProvider({ firebaseBucket: name => storage.bucket(name) }),
  timestamp: () => admin.firestore.FieldValue.serverTimestamp(), demos: Object.values(DEMO_USERS) });
export default createLearningMaterialsRouter({ service: learningMaterials,
  authenticate: createMaterialsAccess({ db, demos: Object.values(DEMO_USERS) }) });
