// Shared by the browser and trusted backend. Keep rank thresholds here only.
export const DEFAULT_RANKS = [
  { id: 'deck_cadet', name: 'Deck Cadet', minXp: 0, subtitle: 'Trainee/Student', icon: '🎓' },
  { id: 'ordinary_seaman', name: 'Ordinary Seaman (OS)', minXp: 500, subtitle: 'Entry-level Crew', icon: '⛵' },
  { id: 'able_seaman', name: 'Able Seaman (AB)', minXp: 1000, subtitle: 'Experienced Deck Crew', icon: '🚢' },
  { id: 'bosun', name: 'Bosun', minXp: 2000, subtitle: 'Senior Rating', icon: '👷' },
  { id: 'third_officer', name: 'Third Officer (3/O)', minXp: 3500, subtitle: 'Junior Officer', icon: '🧭' },
  { id: 'second_officer', name: 'Second Officer (2/O)', minXp: 5000, subtitle: 'Navigation Officer', icon: '🗺️' },
  { id: 'chief_officer', name: 'Chief Officer (C/O)', minXp: 7000, subtitle: 'Second-in-Command', icon: '🎖️' },
  { id: 'master_captain', name: 'Master / Captain', minXp: 10000, subtitle: 'Overall In Charge', icon: '👑' }
];

function validXp(value) {
  if (typeof value !== 'number' && typeof value !== 'string') return null;
  if (typeof value === 'string' && !value.trim()) return null;
  const xp = Number(value);
  return Number.isFinite(xp) && xp >= 0 ? xp : null;
}

// xp is the primary persisted field; zero is valid, not a reason to use total_xp.
export function studentTotalXp(student = {}) {
  return validXp(student.xp) ?? validXp(student.total_xp) ?? 0;
}

// Optional course_settings.global.ranks overrides use stable IDs and minXp/requiredXP.
// Invalid/partial tables fall back as a whole, preventing ambiguous rank ordering.
export function getRankConfiguration(settings = {}) {
  const configured = settings?.ranks;
  if (!Array.isArray(configured) || configured.length !== DEFAULT_RANKS.length) return DEFAULT_RANKS;
  const ranks = DEFAULT_RANKS.map(def => {
    const entry = configured.find(rank => rank?.id === def.id);
    const minXp = entry && validXp(entry.minXp ?? entry.requiredXP);
    return minXp == null ? null : { ...def, minXp };
  });
  if (ranks.some(rank => !rank) || ranks[0].minXp !== 0 ||
      ranks.some((rank, index) => index > 0 && rank.minXp <= ranks[index - 1].minXp)) {
    return DEFAULT_RANKS;
  }
  return ranks;
}

export function getRankAchievements(settings = {}) {
  return getRankConfiguration(settings).map(rank => ({
    id: rank.id === 'deck_cadet' ? 'welcome-aboard' : `rank-${rank.id}`,
    requiredRankId: rank.id,
    requiredRank: rank.name,
    requiredXP: rank.minXp,
    title: rank.id === 'deck_cadet' ? 'Welcome Aboard' : rank.name,
    description: `Reach ${rank.name} (${rank.minXp} XP).`,
    icon: rank.id === 'deck_cadet' ? '⚓' : rank.icon
  }));
}

export function deriveProgression(totalXp, settings = {}) {
  const xp = validXp(totalXp) ?? 0;
  const ranks = getRankConfiguration(settings);
  let currentIndex = 0;
  ranks.forEach((rank, index) => { if (xp >= rank.minXp) currentIndex = index; });
  const rank = ranks[currentIndex];
  const nextRank = ranks[currentIndex + 1] ?? null;
  const percent = nextRank
    ? Math.min(100, Math.max(0, Math.round((xp - rank.minXp) / (nextRank.minXp - rank.minXp) * 100)))
    : 100;
  const achievements = getRankAchievements(settings).map((achievement, index) => ({
    ...achievement, earned: index <= currentIndex
  }));
  return {
    xp, rank: { ...rank, title: rank.name, requiredXP: rank.minXp }, nextRank,
    xpProgress: { current: xp, nextAt: nextRank?.minXp ?? rank.minXp, percent },
    rankCards: ranks.map((entry, index) => ({
      ...entry, requiredXP: entry.minXp,
      state: index === currentIndex ? 'current' : index < currentIndex ? 'earned' : 'locked'
    })),
    achievements
  };
}

// Preserve unrelated badges and earned metadata. Rank records are always derived.
// Accept legacy string IDs/titles only at this schema compatibility boundary.
export function synchronizeRankBadges(badges, totalXp, settings = {}) {
  const achievements = deriveProgression(totalXp, settings).achievements;
  const records = new Map();
  for (const entry of Array.isArray(badges) ? badges : []) {
    const key = typeof entry === 'string' ? entry : entry?.id;
    if (!key) continue;
    const achievement = achievements.find(item => item.id === key || item.title === key);
    const id = achievement?.id ?? key;
    if (!records.has(id)) records.set(id, typeof entry === 'string' ? { id } : { ...entry, id });
  }
  for (const achievement of achievements) {
    if (achievement.earned) {
      const record = { ...records.get(achievement.id), id: achievement.id };
      // Legacy flags must not contradict the shared derivation.
      delete record.earned;
      delete record.unlocked;
      delete record.locked;
      records.set(achievement.id, record);
    } else records.delete(achievement.id);
  }
  return [...records.values()];
}

export function studentProgressionFields(student = {}, settings = {}) {
  const progression = deriveProgression(studentTotalXp(student), settings);
  const badges = synchronizeRankBadges(student.badges, progression.xp, settings);
  const rankMilestoneIds = new Set(progression.achievements
    .filter(achievement => achievement.id !== 'welcome-aboard').map(achievement => achievement.id));
  return {
    rank: progression.rank.name, rankId: progression.rank.id,
    xpProgress: progression.xpProgress.percent, xpNextAt: progression.xpProgress.nextAt,
    badges, badgesEarned: badges.filter(badge => !rankMilestoneIds.has(badge.id)).length
  };
}
