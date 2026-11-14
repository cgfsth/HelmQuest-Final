import test from 'node:test';
import assert from 'node:assert/strict';
import { createMissionCompletionFlow } from '../src/helpers/missionCompletionFlow.js';
import { simulationPerformance, SIMULATION_WEIGHTS } from '../shared/simulationPerformance.js';
import { OFFICIAL_SYLLABUS } from '../shared/officialSyllabus.js';
import { selectMissionQuiz } from '../shared/missionQuiz.js';
import { createTrainingRunMetrics, recordCollision, calculateSafetyCompliance } from '../src/helpers/missionScoring.js';
const evidence = { objectivesComplete: true, completedSteps: 3, totalSteps: 3, anchored: true, engineStopped: true, inPort: true, speedKnots: 0 };
function setup(overrides = {}) {
  const events = [], results = [], quizzes = [], states = [];
  const flow = createMissionCompletionFlow({ saveSimulation: async () => { events.push('save'); return { data: { score: 85 } }; },
    findQuiz: async () => { events.push('lookup'); return { quiz: null, saved: null }; }, saveQuiz: async () => ({ data: { score: 100 } }),
    onQuiz: quiz => quizzes.push(quiz), onResults: result => results.push(result), onState: state => states.push(state), ...overrides });
  return { flow, events, results, quizzes, states };
}
test('official sections retain exact prescribed order, weeks, CLOs and grading information', () => {
  assert.deepEqual(OFFICIAL_SYLLABUS.sections.map(s => s.id), ['lesson-1', 'lesson-2', 'lesson-3', 'lesson-4', 'midterm', 'lesson-5', 'lesson-6', 'final']);
  assert.deepEqual(OFFICIAL_SYLLABUS.sections.map(s => s.weeks), ['Week 2', 'Week 3', 'Weeks 4–6', 'Weeks 7–8', 'Week 9', 'Weeks 10–14', 'Weeks 15–17', 'Week 18']);
  assert.equal(OFFICIAL_SYLLABUS.outcomes.length, 5); assert.equal(OFFICIAL_SYLLABUS.grading.summativeAssessments, 60); assert.equal(OFFICIAL_SYLLABUS.grading.performanceTasksWrittenOutputs, 40);
  assert.match(OFFICIAL_SYLLABUS.sections[2].outcomes[0], /terrestrial coordinate system/);
  for (const section of [OFFICIAL_SYLLABUS.general, ...OFFICIAL_SYLLABUS.sections]) for (const key of ['content', 'outcomes', 'teachingActivities', 'assessmentTasks', 'submissionModes', 'resources']) assert.ok(section[key].length, `${section.id} ${key}`);
});
test('incomplete objectives, approaching the dock, moving boats and engines left on never save or open quizzes', async () => {
  for (const patch of [{ objectivesComplete: false }, { completedSteps: 2 }, { inPort: false }, { anchored: false }, { engineStopped: false }, { speedKnots: 4 }]) {
    const f = setup(); await f.flow.finish({ ...evidence, ...patch }); assert.equal(f.flow.snapshot().state, 'DOCKING_VALIDATION'); assert.deepEqual(f.events, []);
  }
});
test('no assigned quiz saves simulation first and transitions directly to results without a zero quiz score', async () => {
  const f = setup(); await f.flow.finish(evidence); assert.deepEqual(f.events, ['save', 'lookup']); assert.equal(f.flow.snapshot().state, 'RESULTS');
  assert.equal(f.results[0].quiz, null); assert.equal(f.results[0].quizResult, null); assert.equal(f.results[0].simulation.data.score, 85);
  assert.equal(f.states.some(s => s.state === 'QUIZ_PENDING'), false);
});
test('an assigned quiz appears only after persistence and leaves the simulation score separate', async () => {
  const f = setup({ findQuiz: async () => ({ quiz: { id: 'quiz' }, saved: null }) });
  await f.flow.finish(evidence); assert.equal(f.events[0], 'save'); assert.equal(f.flow.snapshot().state, 'QUIZ_IN_PROGRESS'); assert.equal(f.quizzes.length, 1); assert.equal(f.results.length, 0);
  await f.flow.submit({ q: 'answer' }); assert.equal(f.results[0].simulation.data.score, 85); assert.equal(f.results[0].quizResult.score, 100);
});
test('quiz lookup failure preserves saved performance and retries the lookup without saving or awarding twice', async () => {
  let calls = 0;
  const f = setup({ findQuiz: async () => { calls++; if (calls === 1) throw new Error('Network unavailable'); return { quiz: null }; } });
  await f.flow.finish(evidence); assert.equal(f.flow.snapshot().state, 'QUIZ_LOOKUP_FAILED'); assert.match(f.flow.snapshot().error, /Network/); assert.ok(f.flow.snapshot().simulation);
  await f.flow.finish(evidence); assert.deepEqual(f.events, ['save']); assert.equal(calls, 2); assert.equal(f.flow.snapshot().state, 'RESULTS');
});
test('failed simulation saving never checks a quiz and remains retryable', async () => {
  let saves = 0, lookups = 0;
  const f = setup({ saveSimulation: async () => { if (++saves === 1) throw new Error('Save failed'); return { data: { score: 90 } }; }, findQuiz: async () => { lookups++; return { quiz: null }; } });
  await f.flow.finish(evidence); assert.equal(f.flow.snapshot().state, 'SAVE_FAILED'); assert.equal(lookups, 0);
  await f.flow.finish(evidence); assert.equal(saves, 2); assert.equal(lookups, 1); assert.equal(f.results[0].simulation.data.score, 90);
});
test('repeated docking events coalesce into one save and one quiz opening', async () => {
  let release, saves = 0;
  const f = setup({ saveSimulation: () => { saves++; return new Promise(resolve => { release = resolve; }); }, findQuiz: async () => ({ quiz: { id: 'quiz' } }) });
  const pending = f.flow.finish(evidence); f.flow.finish(evidence); f.flow.finish(evidence); assert.equal(saves, 1); release({ data: { score: 82 } }); await pending;
  await f.flow.finish(evidence); assert.equal(f.quizzes.length, 1); assert.equal(saves, 1);
});
test('failed quiz submission keeps the quiz open and double submit cannot duplicate persistence', async () => {
  let release, saves = 0;
  const f = setup({ findQuiz: async () => ({ quiz: { id: 'quiz' } }), saveQuiz: async () => { saves++; if (saves === 1) throw new Error('Offline'); return new Promise(resolve => { release = resolve; }); } });
  await f.flow.finish(evidence); await f.flow.submit({ q: 'a' }); assert.equal(f.flow.snapshot().state, 'QUIZ_IN_PROGRESS'); assert.match(f.flow.snapshot().error, /Offline/);
  const pending = f.flow.submit({ q: 'a' }); f.flow.submit({ q: 'a' }); assert.equal(saves, 2); release({ data: { score: 50 } }); await pending; assert.equal(f.results[0].quizResult.score, 50);
});
test('leaving the scene or changing accounts invalidates late completion callbacks', async () => {
  let release;
  const f = setup({ findQuiz: () => new Promise(resolve => { release = resolve; }) }); const pending = f.flow.finish(evidence);
  await Promise.resolve(); f.flow.dispose(); release({ quiz: { id: 'quiz' } }); await pending; assert.equal(f.quizzes.length, 0); assert.equal(f.results.length, 0);
});
test('only published instructor-linked quizzes are selected, including existing assignment aliases', () => {
  const q = { id: 'q', questions: [{}], moduleId: ['CUSTOM-mission'], instructorId: 'teacher' };
  const select = extra => selectMissionQuiz({ missionId: 'mission', instructorId: 'teacher', quizzes: [q], ...extra });
  assert.equal(select({}).id, 'q'); assert.equal(select({ quizzes: [{ ...q, published: false }] }), null); assert.equal(select({ quizzes: [{ ...q, status: 'draft' }] }), null);
  assert.equal(select({ quizzes: [{ ...q, instructorId: 'other' }] }), null); assert.equal(select({ policy: 'none' }), null);
  assert.equal(select({ quizzes: [{ ...q, moduleId: null }], assignments: [{ quizId: 'q', targetType: 'mission', targetId: 'CUSTOM-mission' }] }).id, 'q');
});
test('simulation score uses the shared 40/40/20 practical rubric and never includes quiz performance', () => {
  assert.deepEqual(SIMULATION_WEIGHTS, { completion: .4, accuracy: .4, safety: .2 });
  const scores = { completion: 100, accuracy: 80, steering: 90, course: 80, docking: 70, time: 100, safety: 95 };
  assert.equal(simulationPerformance(scores).score, 91); assert.equal(simulationPerformance({ ...scores, quiz: 0 }).score, simulationPerformance({ ...scores, quiz: 100 }).score);
  assert.throws(() => simulationPerformance({ ...scores, steering: NaN }), /Invalid/);
});

test('the documented safety collision diagnostic never double-charges the two legacy event arrays', () => {
  const metrics = createTrainingRunMetrics(); assert.equal(calculateSafetyCompliance(metrics), 100);
  recordCollision(metrics, 'BUOY'); assert.equal(calculateSafetyCompliance(metrics), 90);
  recordCollision(metrics, 'PORT'); assert.equal(calculateSafetyCompliance(metrics), 75);
  metrics.safety.violations.push({ type: 'UNCONFIGURED_POLICY' }); assert.equal(calculateSafetyCompliance(metrics), null);
});
