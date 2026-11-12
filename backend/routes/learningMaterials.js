import admin, { db, storage } from '../config/firebase-admin.js';
import { DEMO_USERS } from '../../shared/demoAccounts.js';
import { createMaterialsAccess } from '../middleware/materialsAccess.js';
import { createLearningMaterialsService } from '../services/learningMaterials.js';
import { createLearningMaterialsRouter } from './learningMaterialsRouter.js';
import { createMaterialsBucketProvider } from '../services/supabaseMaterialsStorage.js';
import { createCourseActivitiesService } from '../services/courseActivities.js';
import { saveQuizResult } from '../services/scorePersistence.js';

const bucket = createMaterialsBucketProvider({ firebaseBucket: name => storage.bucket(name) });
const timestamp = () => admin.firestore.FieldValue.serverTimestamp();
export const learningMaterials = createLearningMaterialsService({ db,
  bucket,
  timestamp: () => admin.firestore.FieldValue.serverTimestamp(), demos: Object.values(DEMO_USERS) });
export const courseActivities = createCourseActivitiesService({ db, bucket, timestamp, materials: learningMaterials, saveQuizResult });
export default createLearningMaterialsRouter({ service: learningMaterials,
  course: courseActivities,
  authenticate: createMaterialsAccess({ db, demos: Object.values(DEMO_USERS) }) });
