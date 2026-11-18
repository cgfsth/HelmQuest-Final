// A passed result stays authoritative; otherwise show the most recent attempt.
export function simulationAttempt(results = [], allowRetakes = true, started = false) {
  const time = value => {
    if (value?.toMillis) return value.toMillis();
    if (value?.toDate) return value.toDate().getTime();
    if (value && typeof value === 'object' && Number.isFinite(value.seconds ?? value._seconds)) return (value.seconds ?? value._seconds) * 1000;
    const parsed = Date.parse(value || '');
    return Number.isFinite(parsed) ? parsed : 0;
  };
  const passedResult = result => result.passed === true || (result.xpAwarded === true && Number(result.xpAmount) > 0);
  const ordered = [...results].sort((a, b) => Number(passedResult(b)) - Number(passedResult(a))
    || time(b.completedAt || b.updatedAt || b.createdAt) - time(a.completedAt || a.updatedAt || a.createdAt)
    || String(a.id || '').localeCompare(String(b.id || '')));
  const result = ordered[0] || null, passed = !!result && passedResult(result), attempted = !!result || started;
  const score = result?.score != null && Number.isFinite(Number(result.score)) ? Number(result.score) : null;
  return { result, attempted, score, passed, canRetry: attempted && !passed && allowRetakes !== false };
}

export function simulationResultsForActivity(scores, activity) {
  const canonical = id => String(id || '').replace(/^CUSTOM-/, '');
  return scores.filter(result => (result.missionId && canonical(result.missionId) === canonical(activity.targetId))
    || (activity.id && result.activityId === activity.id));
}
