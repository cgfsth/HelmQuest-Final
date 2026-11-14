import { documentVersion } from '../../services/learningMaterials.js';
import { samplePdf } from './materialsFixture.js';

export const coursePdf = () => ({ originalname: 'module-lesson.pdf', mimetype: 'application/pdf', buffer: samplePdf() });
export async function attachModulePdf(fixture, owner, moduleId) {
  const module = fixture.records.syllabus_modules[moduleId];
  return fixture.service.save(owner, 'syllabus_modules', moduleId, { title: module.title, moduleNumber: module.moduleNumber, revision: module.revision }, coursePdf());
}
export async function viewModulePdf(fixture, student, moduleId) {
  return fixture.course.record(student, moduleId, { kind: 'module', event: 'viewed', documentVersion: documentVersion(fixture.records.syllabus_modules[moduleId]) });
}
