import { isModuleFullyPassed } from './studentMotivation.js';

/** Recommended progression order for navigation training levels. */
export const DEFAULT_MODULE_ORDER = [
  'm1-mission1',
  'm1-mission2',
  'm1-mission3'
];

export const MODULE_DISPLAY_NAMES = {
  'm1-mission1': 'Follow the Buoys',
  'm1-mission2': 'Missing Net Marker',
  'm1-mission3': 'Weather Station Check'
};

/**
 * @param {import('./progressStore.js').defaultProgress extends Function ? never : any} progress
 */
export function ensureCourseSettings(progress) {
  if (!progress.courseSettings) {
    progress.courseSettings = {
      sequentialUnlock: false,  // CHANGED: Default FALSE - don't auto-lock missions!
      autoAwardBadgesAndCerts: true,
      lockedModuleIds: [],
      moduleOrder: [...DEFAULT_MODULE_ORDER]
    };
  }

  const settings = progress.courseSettings;
  if (!Array.isArray(settings.lockedModuleIds)) settings.lockedModuleIds = [];
  if (!Array.isArray(settings.moduleOrder) || !settings.moduleOrder.length) {
    settings.moduleOrder = [...DEFAULT_MODULE_ORDER];
  }
  if (typeof settings.sequentialUnlock !== 'boolean') settings.sequentialUnlock = false;  // CHANGED: Default FALSE
  if (typeof settings.autoAwardBadgesAndCerts !== 'boolean') {
    settings.autoAwardBadgesAndCerts = true;
  }

  return settings;
}

export function getCourseSettings(progress) {
  return ensureCourseSettings(progress);
}

export function getModuleOrder(progress) {
  return getCourseSettings(progress).moduleOrder;
}

export function getModuleLevelIndex(moduleId, progress) {
  const order = getModuleOrder(progress);
  const idx = order.indexOf(moduleId);
  return idx >= 0 ? idx + 1 : null;
}

export function getModuleLevelLabel(moduleId, progress) {
  const level = getModuleLevelIndex(moduleId, progress);
  if (!level) return 'Training module';
  return `Level ${level}`;
}

export function setModuleLocked(progress, moduleId, locked) {
  const settings = ensureCourseSettings(progress);
  const set = new Set(settings.lockedModuleIds);
  if (locked) set.add(moduleId);
  else set.delete(moduleId);
  settings.lockedModuleIds = [...set];
}

export function isModuleLockedByInstructor(progress, moduleId) {
  return ensureCourseSettings(progress).lockedModuleIds.includes(moduleId);
}

export function setSequentialUnlock(progress, enabled) {
  ensureCourseSettings(progress).sequentialUnlock = Boolean(enabled);
}

export function setAutoAwardEnabled(progress, enabled) {
  ensureCourseSettings(progress).autoAwardBadgesAndCerts = Boolean(enabled);
}

/**
 * @param {string} studentId
 * @param {string} moduleId
 * @param {object} progress
 * @param {(moduleId: string) => Array<{ id: string }>} getMissionsForModule
 * @returns {{ accessible: boolean, reason?: string, previousModuleId?: string, levelLabel?: string }}
 */
export function getModuleAccess(studentId, moduleId, progress, getMissionsForModule) {
  const settings = ensureCourseSettings(progress);
  const levelLabel = getModuleLevelLabel(moduleId, progress);

  if (settings.lockedModuleIds.includes(moduleId)) {
    return { accessible: false, reason: 'locked_by_instructor', levelLabel };
  }

  if (!settings.sequentialUnlock) {
    return { accessible: true, levelLabel };
  }

  const order = settings.moduleOrder;
  const index = order.indexOf(moduleId);
  if (index <= 0) {
    return { accessible: true, levelLabel };
  }

  for (let i = 0; i < index; i += 1) {
    const previousModuleId = order[i];
    if (!isModuleFullyPassed(studentId, previousModuleId, progress, getMissionsForModule)) {
      return {
        accessible: false,
        reason: 'complete_previous',
        previousModuleId,
        levelLabel
      };
    }
  }

  return { accessible: true, levelLabel };
}

export function buildInstructorLevelSettings(progress, trainingModules = []) {
  const settings = ensureCourseSettings(progress);
  const moduleById = new Map(trainingModules.map((module) => [module.id, module]));
  
  // Ensure module schedule exists
  if (!progress.moduleSchedule) {
    progress.moduleSchedule = {};
  }

  return settings.moduleOrder.map((moduleId, index) => {
    const module = moduleById.get(moduleId);
    const schedule = progress.moduleSchedule[moduleId] || {};
    
    return {
      moduleId,
      level: index + 1,
      label: `Level ${index + 1}`,
      title: module?.title ?? MODULE_DISPLAY_NAMES[moduleId] ?? moduleId,
      category: module?.category ?? '',
      locked: settings.lockedModuleIds.includes(moduleId),
      openDate: schedule.openDate || '',
      deadline: schedule.deadline || ''
    };
  });
}
