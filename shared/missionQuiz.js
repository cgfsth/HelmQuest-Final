import { canonicalMissionId } from '../backend/services/missionRewards.js';

export const publishedQuiz = quiz => quiz && quiz.published !== false && quiz.active !== false && !['draft', 'inactive', 'deleted', 'unpublished'].includes(quiz.status);
export function selectMissionQuiz({ missionId, instructorId, quizzes, assignments = [], policy = 'inherit', quizId }) {
  if (policy === 'none') return null;
  const matches = value => (Array.isArray(value) ? value : [value]).some(id => id && canonicalMissionId(id) === canonicalMissionId(missionId));
  const assignedIds = new Set(assignments.filter(a => ['module', 'mission'].includes(a.targetType) && publishedQuiz(a) && matches(a.targetId)).map(a => a.quizId));
  return quizzes.filter(q => publishedQuiz(q) && q.questions?.length && (!(q.instructorId || q.instructorid || q.createdBy) || (q.instructorId || q.instructorid || q.createdBy) === instructorId))
    .filter(q => policy === 'assigned' ? q.id === quizId : matches(q.moduleId) || matches(q.missionId) || assignedIds.has(q.id))
    .sort((a, b) => a.id.localeCompare(b.id))[0] || null;
}
export function gradeMissionQuiz(quiz, answers) {
  if (!answers || typeof answers !== 'object' || !quiz.questions?.length) throw new Error('Answer every question before submitting.');
  const normalized = quiz.questions.map((q, index) => answers[q.id ?? index]);
  if (normalized.some(a => typeof a !== 'string' || !a.trim() || a.length > 5000)) throw new Error('Answer every question before submitting.');
  const norm = value => String(value ?? '').trim().toLowerCase();
  const graded = quiz.questions.map((q, index) => {
    const correct = q.type === 'multiple-choice' ? q.options?.find(o => o.isCorrect)?.text : q.correctAnswer;
    return { questionId: q.id ?? String(index), studentAnswer: normalized[index], correctAnswer: correct ?? '', isCorrect: correct != null && norm(normalized[index]) === norm(correct) };
  });
  const correct = graded.filter(a => a.isCorrect).length, total = graded.length, score = Math.round(correct / total * 100);
  return { answers: graded, validation: graded.map(a => a.isCorrect), 'raw-score': correct, correctAnswers: correct, totalQuestions: total,
    score, 'Quiz-score-percentage': score, passed: score >= Number(quiz.passScore ?? quiz.pass_score ?? 70) };
}
