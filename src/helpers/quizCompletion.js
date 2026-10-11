// A submitted quiz stays completed even when its score or the mission score fails.
export function findCompletedQuizSubmission(submissions, { studentId, moduleId, missionId, quizId } = {}) {
  if (!studentId) return null;
  return (submissions || []).find(entry => {
    if (entry.studentId !== studentId) return false;
    if (quizId && entry.quizId) return entry.quizId === quizId;
    return (missionId && entry.missionId === missionId)
      || (moduleId && (entry.trainingModuleId || entry.moduleId) === moduleId);
  }) || null;
}

export function quizScoreCounts(submission) {
  if (!submission) return { correct: 0, total: 0 };
  return {
    correct: Number(submission['raw-score'] ?? submission.correctAnswers
      ?? submission.answers?.filter(answer => answer.isCorrect).length ?? 0),
    total: Number(submission.totalQuestions ?? submission.quiz?.questions?.length ?? 0)
  };
}

export function restoreQuizSubmissions(localSubmissions, scores, studentId) {
  const submissions = [...(localSubmissions || [])];
  for (const score of scores) {
    if (score.studentId !== studentId) continue;
    const index = submissions.findIndex(entry => entry.studentId === studentId
      && (score.quizId ? entry.quizId === score.quizId
        : !entry.quizId && (entry.trainingModuleId || entry.moduleId) === score.moduleId));
    const restored = {
      ...(index >= 0 ? submissions[index] : {}), ...score,
      trainingModuleId: score.moduleId || score.trainingModuleId,
      score: score['Quiz-score-percentage'] ?? score.score ?? 0,
      submittedAt: score.submittedAt || score.completedAt,
      status: 'graded'
    };
    if (index >= 0) submissions.splice(index, 1, restored);
    else submissions.push(restored);
  }
  return submissions;
}
