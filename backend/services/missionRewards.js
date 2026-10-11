// Only uppercase CUSTOM- is the simulation wrapper. The lowercase
// custom-mission-* prefix is part of the actual Firestore document ID.
export const canonicalMissionId = id => String(id || '').replace(/^CUSTOM-/, '');
export const missionIdAliases = id => {
  const canonical = canonicalMissionId(id);
  return [...new Set([canonical, `CUSTOM-${canonical}`])];
};
export const hasMissionCompletion = result => result.passed === true ||
  (result.xpAwarded === true && Number(result.xpAmount) > 0);

export function missionXpReward(mission) {
  const raw = mission.xp_reward ?? mission.xpReward ?? mission.reward;
  if (raw === undefined || raw === null || raw === '') return null;
  const reward = typeof raw === 'string' ? parseInt(raw.replace(/[^0-9]/g, ''), 10) : Number(raw);
  return Number.isFinite(reward) && reward >= 0 ? reward : null;
}

export async function readMissionReward(read, db, missionId) {
  // Try the exact document first, then its established simulation alias.
  const ids = [...new Set([missionId, ...missionIdAliases(missionId)])];
  for (const id of ids) {
    const snapshot = await read(db.collection('missions').doc(id));
    if (snapshot.exists) return { missionId: snapshot.id, reward: missionXpReward(snapshot.data()), data: snapshot.data() };
  }
  return null;
}
