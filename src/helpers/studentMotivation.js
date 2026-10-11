/** Rank badges derive from XP; other badges/certificates retain instructor awards. */
import { deriveProgression, getRankAchievements, studentTotalXp, synchronizeRankBadges } from '../../shared/progression.js';

export const BADGE_CATALOG = [
  {
    id: 'welcome-aboard',
    title: 'Welcome Aboard',
    description: 'Official enrollment in HelmQuest training.',
    icon: '⚓'
  },
  {
    id: 'first-pass',
    title: 'First Pass',
    description: 'Passed a navigation mission.',
    icon: '🎯'
  },
  {
    id: 'high-helm',
    title: 'High Helm',
    description: 'Scored 90% or higher on a passed mission.',
    icon: '⭐'
  },
  {
    id: 'dedicated-sailor',
    title: 'Dedicated Sailor',
    description: 'Passed three or more missions.',
    icon: '🌊'
  },
  {
    id: 'fleet-ready',
    title: 'Fleet Ready',
    description: 'Passed every mission in the catalog.',
    icon: '🏆'
  },
  {
    id: 'module-m1-mission1',
    title: 'Compass Master',
    description: 'Module: Mission 1: Follow the Buoys.',
    icon: '🧭'
  },
  {
    id: 'module-m1-mission2',
    title: 'Coordinate Finder',
    description: 'Module: Mission 2: Missing Net Marker.',
    icon: '📍'
  },
  {
    id: 'module-m1-mission3',
    title: 'GPS Navigator',
    description: 'Module: Mission 3: Weather Station Check.',
    icon: '📡'
  }
];

const MODULE_BADGE_IDS = {
  'm1-mission1': 'module-m1-mission1',
  'm1-mission2': 'module-m1-mission2',
  'm1-mission3': 'module-m1-mission3'
};

export const MODULE_CERTIFICATE_TITLES = {
  'm1-mission1': 'Mission 1: Follow the Buoys',
  'm1-mission2': 'Mission 2: Missing Net Marker',
  'm1-mission3': 'Mission 3: Weather Station Check'
};

export function getBadgeDefinition(badgeId) {
  return BADGE_CATALOG.find((entry) => entry.id === badgeId) ?? null;
}

export function ensureStudentProfile(progress, studentId) {
  if (!progress.studentProfiles) progress.studentProfiles = {};
  if (!progress.studentProfiles[studentId]) {
    progress.studentProfiles[studentId] = {
      xp: 0,
      badges: [],
      certificates: []
    };
  }
  const profile = progress.studentProfiles[studentId];
  if (!Array.isArray(profile.badges)) profile.badges = [];
  if (!Array.isArray(profile.certificates)) profile.certificates = [];
  profile.xp = studentTotalXp(profile);
  return profile;
}

export function hasBadge(profile, badgeId) {
  return profile.badges.some((entry) => entry.id === badgeId);
}

export function hasCertificate(profile, certificateId) {
  return profile.certificates.some((entry) => entry.id === certificateId);
}

function countPassedMissions(studentId, progress) {
  const seen = new Set();
  let count = 0;
  for (const session of progress.sessions ?? []) {
    if (session.studentId !== studentId || !session.passed) continue;
    if (seen.has(session.missionId)) continue;
    seen.add(session.missionId);
    count += 1;
  }
  return count;
}

export function isModuleFullyPassed(studentId, moduleId, progress, getMissionsForModule) {
  const missions = getMissionsForModule(moduleId);
  if (!missions.length) return false;
  return missions.every((mission) => {
    const latest = progress.sessions
      .filter((s) => s.studentId === studentId && s.missionId === mission.id)
      .sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt))[0];
    return Boolean(latest?.passed);
  });
}

export function bestModulePassScore(studentId, moduleId, progress, getMissionsForModule) {
  const missions = getMissionsForModule(moduleId);
  let best = 0;
  for (const mission of missions) {
    const latest = progress.sessions
      .filter((s) => s.studentId === studentId && s.missionId === mission.id && s.passed)
      .sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt))[0];
    if (latest?.score > best) best = latest.score;
  }
  return best;
}

function checkBadgeEligibility(badgeId, studentId, progress, { getMissionsForModule, totalMissionCount }) {
  const passedCount = countPassedMissions(studentId, progress);
  const highScore = (progress.sessions ?? []).some(
    (s) => s.studentId === studentId && s.passed && s.score >= 90
  );

  switch (badgeId) {
    case 'welcome-aboard':
      return { eligible: true, reason: 'May be awarded when the student joins your class.' };
    case 'first-pass':
      return passedCount >= 1
        ? { eligible: true, reason: 'Student has at least one passed mission.' }
        : { eligible: false, reason: 'Requires at least one passed mission.' };
    case 'high-helm':
      return highScore
        ? { eligible: true, reason: 'Student scored 90%+ on a passed mission.' }
        : { eligible: false, reason: 'Requires a passed mission at 90% or higher.' };
    case 'dedicated-sailor':
      return passedCount >= 3
        ? { eligible: true, reason: `Student passed ${passedCount} missions.` }
        : { eligible: false, reason: 'Requires 3 passed missions.' };
    case 'fleet-ready':
      return passedCount >= totalMissionCount
        ? { eligible: true, reason: 'Student passed all catalog missions.' }
        : {
            eligible: false,
            reason: `Requires all ${totalMissionCount} missions passed (${passedCount} so far).`
          };
    default: {
      const moduleId = Object.entries(MODULE_BADGE_IDS).find(([, id]) => id === badgeId)?.[0];
      if (!moduleId) return { eligible: false, reason: '' };
      const ok = isModuleFullyPassed(studentId, moduleId, progress, getMissionsForModule);
      return ok
        ? { eligible: true, reason: 'All missions in this module are passed.' }
        : { eligible: false, reason: 'Student must pass every mission in this module.' };
    }
  }
}

export function getInstructorBadgeOptions(studentId, progress, context) {
  const profile = ensureStudentProfile(progress, studentId);
  const student = (progress.students ?? []).find(entry => entry.id === studentId) ?? profile;
  return getStudentDisplayBadges(studentId, progress, student).map((def) => {
    const { eligible, reason } = def.requiredRankId
      ? { eligible: false, reason: def.description }
      : checkBadgeEligibility(def.id, studentId, progress, context);
    return {
      ...def,
      eligible,
      eligibilityReason: reason
    };
  });
}

export function getInstructorCertificateOptions(studentId, progress, context) {
  const profile = ensureStudentProfile(progress, studentId);
  return Object.entries(MODULE_CERTIFICATE_TITLES).map(([moduleId, title]) => {
    const id = `cert-${moduleId}`;
    const record = profile.certificates.find((c) => c.id === id);
    const modulePassed = isModuleFullyPassed(studentId, moduleId, progress, context.getMissionsForModule);
    return {
      id,
      moduleId,
      title,
      score: bestModulePassScore(studentId, moduleId, progress, context.getMissionsForModule),
      earned: Boolean(record),
      earnedAt: record?.earnedAt ?? null,
      awardedByName: record?.awardedByName ?? null,
      eligible: modulePassed,
      eligibilityReason: modulePassed
        ? 'All missions in this module are passed.'
        : 'Student must pass every mission in this module first.'
    };
  });
}

export function instructorAwardBadge(progress, { studentId, badgeId, instructorId, instructorName, note }) {
  if (getRankAchievements(progress.courseSettings).some(badge => badge.id === badgeId)) {
    return { ok: false, error: 'rank_badge_is_automatic' };
  }
  const profile = ensureStudentProfile(progress, studentId);
  if (hasBadge(profile, badgeId)) return { ok: false, error: 'already_awarded' };

  const def = getBadgeDefinition(badgeId);
  if (!def) return { ok: false, error: 'unknown_badge' };

  const entry = {
    id: badgeId,
    earnedAt: new Date().toISOString(),
    awardedBy: instructorId,
    awardedByName: instructorName,
    note: note?.trim() || ''
  };
  profile.badges.push(entry);
  return { ok: true, badge: { ...def, ...entry } };
}

export function instructorRevokeBadge(progress, studentId, badgeId) {
  if (getRankAchievements(progress.courseSettings).some(badge => badge.id === badgeId)) return false;
  const profile = ensureStudentProfile(progress, studentId);
  const before = profile.badges.length;
  profile.badges = profile.badges.filter((b) => b.id !== badgeId);
  return profile.badges.length < before;
}

export function instructorAwardCertificate(
  progress,
  { studentId, certificateId, instructorId, instructorName, note }
) {
  const profile = ensureStudentProfile(progress, studentId);
  if (hasCertificate(profile, certificateId)) return { ok: false, error: 'already_awarded' };

  const moduleId = certificateId.replace(/^cert-/, '');
  const title = MODULE_CERTIFICATE_TITLES[moduleId];
  if (!title) return { ok: false, error: 'unknown_certificate' };

  const entry = {
    id: certificateId,
    moduleId,
    title,
    score: 0,
    earnedAt: new Date().toISOString(),
    awardedBy: instructorId,
    awardedByName: instructorName,
    note: note?.trim() || ''
  };
  profile.certificates.push(entry);
  return { ok: true, certificate: entry };
}

export function instructorAwardCertificateWithScore(
  progress,
  payload
) {
  const result = instructorAwardCertificate(progress, payload);
  if (!result.ok) return result;
  const profile = ensureStudentProfile(progress, payload.studentId);
  const cert = profile.certificates.find((c) => c.id === payload.certificateId);
  if (cert && payload.score != null) cert.score = payload.score;
  return result;
}

export function instructorRevokeCertificate(progress, studentId, certificateId) {
  const profile = ensureStudentProfile(progress, studentId);
  const before = profile.certificates.length;
  profile.certificates = profile.certificates.filter((c) => c.id !== certificateId);
  return profile.certificates.length < before;
}

export function xpForMissionResult(score, passed) {
  const base = Math.round(Number(score) || 0);
  if (passed) return Math.max(25, Math.round(base * 1.15));
  // NO XP for failed missions - student must pass to earn XP
  return 0;
}

export function rankForXp(xp, settings) {
  return deriveProgression(xp, settings).rank;
}

export function xpProgressToNextRank(xp, settings) {
  return deriveProgression(xp, settings).xpProgress;
}

const AUTO_AWARDER = {
  id: 'helmquest-auto',
  name: 'HelmQuest (automatic)'
};

/**
 * When a student completes every mission in a module, award module badge/certificate
 * and any newly eligible milestone badges (if auto-award is enabled in course settings).
 *
 * @param {string} studentId
 * @param {object} progress
 * @param {string} moduleId
 * @param {{ getMissionsForModule: Function, totalMissionCount: number }} context
 * @returns {{ badges: object[], certificates: object[], moduleComplete: boolean }}
 */
export function autoAwardOnModuleComplete(studentId, progress, moduleId, context) {
  const settings = progress.courseSettings;
  const empty = { badges: [], certificates: [], moduleComplete: false };

  if (!settings?.autoAwardBadgesAndCerts) return empty;
  if (!isModuleFullyPassed(studentId, moduleId, progress, context.getMissionsForModule)) {
    return empty;
  }

  const awarded = { badges: [], certificates: [], moduleComplete: true };
  const profile = ensureStudentProfile(progress, studentId);

  const moduleBadgeId = MODULE_BADGE_IDS[moduleId];
  if (moduleBadgeId && !hasBadge(profile, moduleBadgeId)) {
    const result = instructorAwardBadge(progress, {
      studentId,
      badgeId: moduleBadgeId,
      instructorId: AUTO_AWARDER.id,
      instructorName: AUTO_AWARDER.name,
      note: 'Automatically awarded when all missions in this level were passed.'
    });
    if (result.ok) awarded.badges.push(result.badge);
  }

  const certificateId = `cert-${moduleId}`;
  if (!hasCertificate(profile, certificateId)) {
    const score = bestModulePassScore(studentId, moduleId, progress, context.getMissionsForModule);
    const result = instructorAwardCertificateWithScore(progress, {
      studentId,
      certificateId,
      instructorId: AUTO_AWARDER.id,
      instructorName: AUTO_AWARDER.name,
      score,
      note: 'Automatically issued when all missions in this level were passed.'
    });
    if (result.ok) awarded.certificates.push(result.certificate);
  }

  const milestoneIds = ['first-pass', 'high-helm', 'dedicated-sailor', 'fleet-ready'];
  for (const badgeId of milestoneIds) {
    if (hasBadge(profile, badgeId)) continue;
    const { eligible } = checkBadgeEligibility(badgeId, studentId, progress, context);
    if (!eligible) continue;

    const result = instructorAwardBadge(progress, {
      studentId,
      badgeId,
      instructorId: AUTO_AWARDER.id,
      instructorName: AUTO_AWARDER.name,
      note: 'Automatically awarded based on mission performance.'
    });
    if (result.ok) awarded.badges.push(result.badge);
  }

  return awarded;
}

/** Mission complete: XP only (badges & certificates use auto-award or instructor). */
export function processMissionRewards(studentId, progress, { score, passed, missionXpReward }) {
  const profile = ensureStudentProfile(progress, studentId);
  
  // Calculate XP earned - ONLY if passed
  let xpEarned = 0;
  if (passed) {
    // Use mission's XP reward if provided, otherwise fall back to score-based calculation
    const configuredReward = Number(missionXpReward);
    const hasConfiguredReward = missionXpReward !== undefined && missionXpReward !== null && missionXpReward !== '' &&
      Number.isFinite(configuredReward) && configuredReward >= 0;
    xpEarned = hasConfiguredReward
      ? configuredReward
      : xpForMissionResult(score, passed);
  }
  // If FAILED, xpEarned stays 0 - no XP awarded for failed missions
  
  profile.xp += xpEarned;
  
  return {
    xpEarned,
    totalXp: profile.xp,
    rank: rankForXp(profile.xp, progress.courseSettings).title
  };
}

export function getStudentBadges(studentId, progress, student) {
  const profile = ensureStudentProfile(progress, studentId);
  const xp = studentTotalXp(student ?? profile);
  const settings = progress.courseSettings;
  const rankAchievements = deriveProgression(xp, settings).achievements;
  const records = synchronizeRankBadges([...profile.badges, ...(Array.isArray(student?.badges) ? student.badges : [])], xp, settings);
  const earnedMap = new Map(records.map(badge => [badge.id, badge]));
  const catalog = [...rankAchievements, ...BADGE_CATALOG.filter(badge => badge.id !== 'welcome-aboard')];
  return catalog.map((def) => {
    const record = earnedMap.get(def.id);
    return {
      ...def,
      earned: Boolean(record),
      earnedAt: record?.earnedAt ?? null,
      awardedByName: record?.awardedByName ?? null,
      note: record?.note ?? ''
    };
  });
}

// Rank milestones are shown in the Rank section; Welcome Aboard stays a badge.
export function getStudentDisplayBadges(studentId, progress, student) {
  return getStudentBadges(studentId, progress, student)
    .filter(badge => !badge.requiredRankId || badge.id === 'welcome-aboard');
}

export function getStudentCertificates(studentId, progress) {
  const profile = ensureStudentProfile(progress, studentId);
  return [...profile.certificates].sort(
    (a, b) => new Date(b.earnedAt).getTime() - new Date(a.earnedAt).getTime()
  );
}

export function getStudentScoreStats(studentId, progress) {
  const sessions = (progress.sessions ?? []).filter((s) => s.studentId === studentId);
  const byMission = new Map();
  for (const session of sessions) {
    const prev = byMission.get(session.missionId);
    if (!prev || new Date(session.completedAt) > new Date(prev.completedAt)) {
      byMission.set(session.missionId, session);
    }
  }
  const latest = [...byMission.values()];
  if (!latest.length) {
    return { attempts: 0, passed: 0, averageScore: 0, bestScore: 0 };
  }
  const scores = latest.map((s) => s.score);
  const passed = latest.filter((s) => s.passed).length;
  const sum = scores.reduce((a, b) => a + b, 0);
  return {
    attempts: latest.length,
    passed,
    averageScore: Number((sum / scores.length).toFixed(1)),
    bestScore: Number(Math.max(...scores).toFixed(1))
  };
}

export function getStudentMotivationSummary(studentId, progress, totalMissionCount = 8, student) {
  const profile = ensureStudentProfile(progress, studentId);
  const xp = studentTotalXp(student ?? profile);
  const rank = rankForXp(xp, progress.courseSettings);
  const xpProgress = xpProgressToNextRank(xp, progress.courseSettings);
  const badges = getStudentDisplayBadges(studentId, progress, student);
  const scoreStats = getStudentScoreStats(studentId, progress);
  const passedMissions = countPassedMissions(studentId, progress);

  return {
    xp,
    rank: rank.title,
    xpProgress: xpProgress.percent,
    xpNextAt: xpProgress.nextAt,
    badgesEarned: badges.filter(badge => badge.earned).length,
    badgesTotal: badges.length,
    certificates: profile.certificates.length,
    completedMissions: passedMissions,
    totalMissions: totalMissionCount,
    ...scoreStats
  };
}

export function clearStudentMotivation(studentId, progress) {
  if (progress.studentProfiles?.[studentId]) {
    progress.studentProfiles[studentId] = { xp: 0, badges: [], certificates: [] };
  }
}
