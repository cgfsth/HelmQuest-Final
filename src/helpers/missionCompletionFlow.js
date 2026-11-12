import { validDockingCompletion } from '../../shared/simulationPerformance.js';

// No rendering objects: the same HTML quiz/results flow can sit above either engine.
export function createMissionCompletionFlow({ saveSimulation, findQuiz, saveQuiz, onQuiz, onResults, onState = () => {} }) {
  let state = 'IN_PROGRESS', simulation = null, quiz = null, quizResult = null, pending = null, disposed = false, error = '';
  const set = (next, message = '') => { if (!disposed) { state = next; error = message; onState({ state, error, simulation }); } };
  const results = () => { set('RESULTS'); if (!disposed) onResults({ simulation, quiz, quizResult }); };
  async function finish(evidence) {
    if (disposed || pending || state === 'RESULTS' || state === 'QUIZ_IN_PROGRESS') return pending;
    if (!validDockingCompletion(evidence)) { set('DOCKING_VALIDATION', 'Complete the objectives and validated docking requirements first.'); return; }
    pending = (async () => {
      try {
        if (!simulation) { set('SAVING_SIMULATION'); const saved = await saveSimulation(evidence); if (disposed) return; simulation = saved; set('MISSION_COMPLETED'); }
        set('QUIZ_CHECKING');
        const assigned = await findQuiz(); if (disposed) return;
        quiz = assigned.quiz; quizResult = assigned.saved;
        if (!quiz || quizResult) { results(); return; }
        set('QUIZ_PENDING'); set('QUIZ_IN_PROGRESS'); onQuiz(quiz);
      } catch (err) { set(simulation ? 'QUIZ_LOOKUP_FAILED' : 'SAVE_FAILED', err.message || 'Unable to save this stage. Try again.'); }
      finally { pending = null; }
    })();
    return pending;
  }
  async function submit(answers) {
    if (disposed || pending || state !== 'QUIZ_IN_PROGRESS') return pending;
    pending = (async () => {
      try { set('QUIZ_IN_PROGRESS'); const saved = await saveQuiz(quiz, answers); if (disposed) return; quizResult = saved.data || saved; results(); }
      catch (err) { set('QUIZ_IN_PROGRESS', err.message || 'Quiz answers were not saved. Try again.'); }
      finally { pending = null; }
    })();
    return pending;
  }
  return { finish, submit, dispose() { disposed = true; }, snapshot: () => ({ state, error, simulation, quiz, quizResult, busy: !!pending }) };
}
