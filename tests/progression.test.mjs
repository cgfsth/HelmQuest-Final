import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_RANKS, deriveProgression, getRankConfiguration, studentTotalXp, studentProgressionFields, synchronizeRankBadges } from '../shared/progression.js';
import { getStudentBadges, getStudentDisplayBadges, getStudentMotivationSummary, processMissionRewards, xpForMissionResult, instructorAwardBadge, instructorRevokeBadge } from '../src/helpers/studentMotivation.js';

function progress(xp = 0, badges = []) {
  return { studentProfiles: { student: { xp, badges, certificates: [] } }, sessions: [], courseSettings: {} };
}

test('a configured zero mission reward awards zero locally while absent rewards retain the existing fallback', () => {
  const data = progress(25);
  const zero = processMissionRewards('student', data, { passed: true, score: 80, missionXpReward: 0 });
  assert.equal(zero.xpEarned, 0);
  assert.equal(zero.totalXp, 25);
  const fallback = processMissionRewards('student', data, { passed: true, score: 80 });
  assert.equal(fallback.xpEarned, xpForMissionResult(80, true));
});

test('new student earns Welcome Aboard at 0 XP without missions or manual flags', () => {
  const result = deriveProgression(0);
  assert.equal(result.rank.id, 'deck_cadet');
  assert.deepEqual(result.xpProgress, { current: 0, nextAt: 500, percent: 0 });
  const badges = getStudentBadges('student', progress());
  assert.equal(badges.find(badge => badge.id === 'welcome-aboard').earned, true);
  assert.equal(badges.filter(badge => badge.earned).length, 1);
});

for (let index = 1; index < DEFAULT_RANKS.length; index++) {
  const rank = DEFAULT_RANKS[index];
  test(`${rank.name}: locked below threshold, promoted at ${rank.minXp} XP, earlier achievements retained`, () => {
    const below = deriveProgression(rank.minXp - 1);
    assert.equal(below.rank.id, DEFAULT_RANKS[index - 1].id);
    assert.equal(below.achievements[index].earned, false);
    assert.equal(below.xpProgress.nextAt, rank.minXp);
    const at = deriveProgression(rank.minXp);
    assert.equal(at.rank.id, rank.id);
    assert.equal(at.achievements.filter(badge => badge.earned).length, index + 1);
    assert.equal(at.achievements[0].earned, true);
    const badges = getStudentBadges('student', progress(rank.minXp));
    for (const achievement of at.achievements) {
      assert.equal(badges.find(badge => badge.id === achievement.id).earned, achievement.earned);
    }
  });
}

test('one XP award crosses multiple thresholds without changing existing award amounts', () => {
  const data = progress(450);
  const reward = processMissionRewards('student', data, { passed: true, score: 85, missionXpReward: 6800 });
  assert.equal(reward.xpEarned, 6800);
  assert.equal(reward.totalXp, 7250);
  assert.equal(reward.rank, 'Chief Officer (C/O)');
  assert.equal(getStudentBadges('student', data).filter(badge => badge.requiredRankId && badge.earned).length, 7);
});

test('failed mission adds no XP, promotion, or achievements even with an XP reward', () => {
  const data = progress(499);
  const before = getStudentBadges('student', data);
  const reward = processMissionRewards('student', data, { passed: false, score: 69, missionXpReward: 10000 });
  assert.equal(reward.xpEarned, 0);
  assert.equal(reward.totalXp, 499);
  assert.equal(reward.rank, 'Deck Cadet');
  assert.deepEqual(getStudentBadges('student', data), before);
  assert.equal(xpForMissionResult(69, false), 0);
  assert.equal(xpForMissionResult(80, true), 92);
});

test('authoritative student XP overrides stale local profiles, ranks and manual rank flags', () => {
  const local = progress(10000, [{ id: 'rank-master_captain', earned: true }, { id: 'welcome-aboard', locked: true }]);
  const student = { xp: 0, rank: 'Master / Captain', badges: ['Welcome Aboard', 'welcome-aboard'] };
  const badges = getStudentBadges('student', local, student);
  const summary = getStudentMotivationSummary('student', local, 8, student);
  assert.equal(summary.rank, 'Deck Cadet');
  assert.equal(summary.xp, 0);
  assert.equal(summary.xpNextAt, 500);
  assert.equal(summary.badgesEarned, 1);
  assert.equal(badges.find(badge => badge.id === 'welcome-aboard').earned, true);
  assert.equal(badges.find(badge => badge.id === 'rank-master_captain').earned, false);
});

test('synchronization preserves unrelated data and badge metadata, deduplicates, and is idempotent', () => {
  const original = {
    xp: 2000, total_xp: 2000, rank: 'Deck Hand', name: 'Preserved',
    certificates: [{ id: 'certificate' }], completed: 2,
    badges: [{ id: 'first-pass', earnedAt: '2026-01-01' }, { id: 'first-pass' },
      { id: 'welcome-aboard', earnedAt: '2026-02-01' }, { id: 'rank-master_captain' }]
  };
  const repaired = { ...original, ...studentProgressionFields(original) };
  assert.equal(repaired.xp, original.xp);
  assert.equal(repaired.total_xp, original.total_xp);
  assert.equal(repaired.name, original.name);
  assert.deepEqual(repaired.certificates, original.certificates);
  assert.equal(repaired.completed, original.completed);
  assert.equal(repaired.rankId, 'bosun');
  assert.equal(repaired.badges.find(badge => badge.id === 'welcome-aboard').earnedAt, '2026-02-01');
  assert.equal(repaired.badges.filter(badge => badge.id === 'first-pass').length, 1);
  assert.equal(repaired.badges.some(badge => badge.id === 'rank-master_captain'), false);
  assert.deepEqual(studentProgressionFields(repaired), studentProgressionFields(original));
  const reloaded = JSON.parse(JSON.stringify(repaired));
  assert.deepEqual(studentProgressionFields(reloaded), studentProgressionFields(original));
});

test('valid XP compatibility: numeric strings, total_xp fallback, and zero wins over stale aliases', () => {
  assert.equal(studentTotalXp({ xp: 0, total_xp: 10000 }), 0);
  assert.equal(studentTotalXp({ xp: '500' }), 500);
  assert.equal(studentTotalXp({ total_xp: 1000 }), 1000);
  for (const xp of [null, '', -1, Infinity, NaN, 'invalid', false]) {
    assert.equal(studentTotalXp({ xp, total_xp: 2000 }), 2000);
  }
  assert.equal(studentTotalXp({ xp: -1 }), 0);
});

test('configured ranks use identical thresholds for rank, progress, cards and badges', () => {
  const settings = { ranks: DEFAULT_RANKS.map((rank, index) => ({ id: rank.id, requiredXP: index * 100 })) };
  const result = deriveProgression(350, settings);
  assert.equal(result.rank.id, 'bosun');
  assert.equal(result.xpProgress.nextAt, 400);
  assert.equal(result.xpProgress.percent, 50);
  assert.equal(result.rankCards[4].requiredXP, 400);
  assert.equal(result.achievements[4].requiredXP, 400);
  assert.equal(result.achievements[4].requiredRankId, 'third_officer');
  assert.equal(getRankConfiguration({ ranks: [{ id: 'deck_cadet', minXp: 0 }] }), DEFAULT_RANKS);
});

test('highest rank has complete progress, with all rank achievements earned', () => {
  const result = deriveProgression(20000);
  assert.equal(result.rank.id, 'master_captain');
  assert.equal(result.nextRank, null);
  assert.equal(result.xpProgress.percent, 100);
  assert.ok(result.achievements.every(badge => badge.earned));
});

test('rank badges cannot be manually awarded or revoked', () => {
  const data = progress();
  assert.equal(instructorAwardBadge(data, { studentId: 'student', badgeId: 'welcome-aboard' }).ok, false);
  assert.equal(instructorRevokeBadge(data, 'student', 'welcome-aboard'), false);
  assert.equal(getStudentBadges('student', data).find(badge => badge.id === 'welcome-aboard').earned, true);
  assert.deepEqual(synchronizeRankBadges([], 0), [{ id: 'welcome-aboard' }]);
});

test('rank milestones remain earned in progression while the badge collection shows only original badges', () => {
  const data = progress(10000, [{ id: 'first-pass' }]);
  const milestones = getStudentBadges('student', data).filter(badge => badge.requiredRankId);
  assert.equal(milestones.filter(badge => badge.earned).length, 8);
  const badges = getStudentDisplayBadges('student', data);
  assert.equal(badges.length, 8);
  assert.ok(badges.every(badge => !badge.id.startsWith('rank-')));
  assert.equal(badges.find(badge => badge.id === 'welcome-aboard').earned, true);
  assert.equal(badges.find(badge => badge.id === 'first-pass').earned, true);
  const summary = getStudentMotivationSummary('student', data);
  assert.equal(summary.badgesEarned, 2);
  assert.equal(summary.badgesTotal, 8);
});

test('persisted badge counts exclude rank milestones without removing earned rank records', () => {
  const fields = studentProgressionFields({ xp: 10000, badges: [{ id: 'first-pass' }] });
  assert.equal(fields.badges.length, 9);
  assert.equal(fields.badgesEarned, 2);
  assert.equal(fields.rankId, 'master_captain');
});
