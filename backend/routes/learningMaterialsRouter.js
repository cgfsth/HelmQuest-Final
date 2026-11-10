import express from 'express';
import multer from 'multer';
import { MaterialsError, PDF_LIMIT } from '../services/learningMaterials.js';

export function createLearningMaterialsRouter({ service, authenticate }) {
  const router = express.Router();
  const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: PDF_LIMIT, files: 1, fields: 6, fieldSize: 12000, parts: 7 } }).single('file');
  const active = new Map();
  let total = 0;
  const bounded = (req, res, next) => {
    const id = req.materialsUser.id;
    if ((active.get(id) || 0) >= 2 || total >= 8) return res.status(429).json({ message: 'Another document is being processed. Please try again shortly.' });
    active.set(id, (active.get(id) || 0) + 1); total++;
    let released = false;
    const release = () => { if (!released) { released = true; total--; active.set(id, Math.max(0, active.get(id) - 1)); if (!active.get(id)) active.delete(id); } };
    // Keep the reservation until the actual operation completes, including aborted uploads.
    req.releaseMaterialsSlot = release;
    next();
  };
  const action = fn => async (req, res, next) => {
    try { const data = await fn(req, res); if (!res.headersSent) res.json(data); }
    catch (error) { next(error); }
    finally { req.releaseMaterialsSlot?.(); }
  };
  const manager = (req, res, next) => ['admin', 'instructor'].includes(req.materialsUser.role) ? next() : res.status(403).json({ message: 'Students have read-only access.' });
  router.use(authenticate);
  router.get('/instructors', manager, action(req => service.instructors(req.materialsUser)));
  router.get('/syllabi', action(req => service.list(req.materialsUser, req.query)));
  router.get('/syllabi/:id', action(req => service.detail(req.materialsUser, req.params.id)));
  for (const [endpoint, collection] of [['syllabi', 'syllabi'], ['modules', 'syllabus_modules']]) {
    router.get(`/${endpoint}/:id/pdf`, bounded, action(async (req, res) => {
      const { buffer, fileName } = await service.pdf(req.materialsUser, collection, req.params.id);
      res.set({ 'Content-Type': 'application/pdf', 'Content-Disposition': `inline; filename="document.pdf"; filename*=UTF-8''${encodeURIComponent(fileName)}`,
        'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' });
      res.send(buffer);
    }));
    router.put(`/${endpoint}/:id`, manager, bounded, upload, action(req => service.save(req.materialsUser, collection, req.params.id, req.body, req.file)));
    router.delete(`/${endpoint}/:id`, manager, action(req => service.remove(req.materialsUser, collection, req.params.id, req.body.revision)));
  }
  router.post('/syllabi', manager, bounded, upload, action(req => service.save(req.materialsUser, 'syllabi', null, req.body, req.file)));
  router.post('/syllabi/:id/modules', manager, bounded, upload, action(req => service.save(req.materialsUser, 'syllabus_modules', null, req.body, req.file, req.params.id)));
  router.post('/syllabi/:id/reorder', manager, action(req => service.reorder(req.materialsUser, req.params.id, req.body)));
  router.post('/cleanup', manager, action(req => service.cleanup(req.materialsUser)));
  router.use((error, req, res, next) => {
    req.releaseMaterialsSlot?.();
    if (res.headersSent) return next(error);
    if (error instanceof multer.MulterError) return res.status(400).json({ message: error.code === 'LIMIT_FILE_SIZE' ? 'PDF documents must be 15 MB or smaller.' : 'Upload one PDF with the required document information.' });
    if (error instanceof MaterialsError) return res.status(error.status).json({ message: error.message });
    console.error('Learning materials operation failed:', error.code || error.name);
    res.status(503).json({ message: 'Unable to complete the document operation. Please refresh and try again.' });
  });
  return router;
}
