import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { parse, compileScript, compileTemplate } from '@vue/compiler-sfc';
import { createMissionCompletionFlow } from '../src/helpers/missionCompletionFlow.js';
import { simulationPerformance, simulationScoringInputs, validDockingCompletion } from '../shared/simulationPerformance.js';
import { vesselEncounterResult } from '../src/helpers/vesselEncounter.js';
import { createTrainingRunMetrics, calculateSafetyCompliance } from '../src/helpers/missionScoring.js';
import { IntegratedPerformanceManager } from '../src/helpers/performanceManager.js';

const app = readFileSync(new URL('../src/App.vue', import.meta.url), 'utf8').replace(/\r\n/g, '\n');
const ref = value => ({ value });
function appFunction(name, context) {
  let start = app.indexOf(`function ${name}(`);
  assert.ok(start >= 0, name);
  if (app.slice(start - 6, start) === 'async ') start -= 6;
  vm.createContext(context);
  vm.runInContext(app.slice(start, app.indexOf('\n}', start) + 2), context);
  return context[name];
}

test('course sections, activity rows and the updated authoring/viewer screens compile', () => {
  for (const name of ['CourseOutline', 'CourseActivityRow', 'LearningMaterials', 'OfficialSyllabusMatrix', 'PdfDocumentViewer', 'PdfPage']) {
    const source = readFileSync(new URL(`../src/components/materials/${name}.vue`, import.meta.url), 'utf8');
    const { descriptor, errors } = parse(source); assert.deepEqual(errors, []);
    const script = compileScript(descriptor, { id: name });
    const template = compileTemplate({ source: descriptor.template.content, filename: `${name}.vue`, id: name, compilerOptions: { bindingMetadata: script.bindings } });
    assert.deepEqual(template.errors, []);
  }
});

test('Back to Lesson restores the originating course and lesson without crossing student accounts', () => {
  const route = { studentId: 'student', syllabusId: 'syllabus', lessonId: 'lesson-3', activityId: 'practical' }, exits = [];
  const context = { activeCoursePractical: ref(route), currentUser: ref({ id: 'student' }), courseNavigation: ref({}), hubTab: ref('overview'), missionCompleteModal: ref({ score: 80 }), exitTraining: () => exits.push(true) };
  const back = appFunction('backToOriginLesson', context); back(); assert.equal(context.hubTab.value, 'materials'); assert.equal(context.courseNavigation.value.lessonId, 'lesson-3'); assert.equal(context.courseNavigation.value.syllabusId, 'syllabus'); assert.equal(context.missionCompleteModal.value, null); assert.equal(exits.length, 1);
  context.currentUser.value = { id: 'other' }; context.courseNavigation.value = { syllabusId: 'other-course' }; back(); assert.equal(context.courseNavigation.value.syllabusId, 'other-course');
});

test('course simulation launches the exact linked existing mission through the established launcher', async () => {
  const launches = [], mission = { id: 'CUSTOM-harbor', moduleId: 'harbor' };
  const context = { currentUser: ref({ id: 'student' }), userRole: ref('student'), trainingModules: ref([{ id: 'harbor' }]),
    loadMissionDatesFromFirestore: async () => {}, findMissionForModule: id => id === 'harbor' ? mission : null,
    isMissionLocked: () => false, startMissionSimulation: async item => launches.push(item), activeCoursePractical: ref(null), courseCompletionFlow: null, courseCompletionState: ref('NOT_STARTED'), courseCompletionError: ref('') };
  const start = appFunction('launchCourseSimulation', context), errors = [];
  await start({ target: { id: 'harbor' }, fail: e => errors.push(e) });
  assert.deepEqual(launches, [mission]); assert.equal(errors.length, 0);
  await start({ target: { id: 'missing' }, fail: e => errors.push(e) });
  assert.equal(launches.length, 1); assert.match(errors[0].message, /unavailable/);
  context.isMissionLocked = () => true; context.getMissionAvailabilityStatus = () => ({ message: 'Not open yet' });
  await start({ target: { id: 'harbor' }, fail: e => errors.push(e) });
  assert.equal(launches.length, 2, 'Server-authorized syllabus launches ignore legacy standalone mission locks');
  assert.equal(errors.length, 1);
});

test('switching student accounts while refreshing mission data cannot launch the previous activity', async () => {
  let release, launched = false;
  const context = { currentUser: ref({ id: 'a' }), userRole: ref('student'), loadMissionDatesFromFirestore: () => new Promise(resolve => { release = resolve; }),
    startMissionSimulation: () => { launched = true; } };
  const start = appFunction('launchCourseSimulation', context);
  const pending = start({ target: { id: 'harbor' }, fail: error => { throw error; } });
  context.currentUser.value = { id: 'b' }; release(); await pending; assert.equal(launched, false);
});

test('App completes its actual performance tracker before saving, retains raw metrics on retry, and renders separate quiz results', async () => {
  const tracker = new IntegratedPerformanceManager(); tracker.startMission({ id: 'navigation', duration: '10 minutes', steps: [{ id: 'dock' }] });
  Object.assign(tracker.state, { steeringScore: 81.234, courseScore: 87.654, dockingScore: 0 });
  tracker.state.headingHistory = [{ heading: 0 }, { heading: 1 }];
  tracker.state.objectivesCompleted = [{ id: 'dock' }];
  const run = createTrainingRunMetrics(); run.totalSteps = 1; run.stepsCompleted = 1;
  const evidence = { objectivesComplete: true, totalSteps: 1, completedSteps: 1, anchored: true, engineStopped: true, inPort: true, speedKnots: 0 };
  const module = { id: 'navigation', title: 'Navigation' }, quiz = { id: 'q', questions: [{ id: 'one', type: 'true-false' }] };
  let saves = 0, lookups = 0, rewards = 0;
  const context = { performance, console, createMissionCompletionFlow, simulationPerformance, simulationScoringInputs, vesselEncounterResult, vesselEncounterState: null, encounterSetupError: ref(''), validDockingCompletion, calculateSafetyCompliance,
    currentUser: ref({ id: 'student', name: 'Student' }), userRole: ref('student'), activeTrainingModule: ref(module), activeMission: ref({ id: 'CUSTOM-navigation' }),
    trainingRunMetrics: ref(run), activeCoursePractical: ref({ studentId: 'student', activityId: 'practical', syllabusId: 'course', lessonId: 'lesson' }),
    isTrainingReviewMode: ref(false), courseCompletionFlow: null, courseCompletionState: ref('IN_PROGRESS'), courseCompletionError: ref(''),
    courseDockingEvidence: () => evidence, performanceManager: tracker, progressData: ref({ quizSubmissions: [] }),
    firebaseApi: { completeLearningSimulation: async (id, body) => { saves++; assert.equal(id, 'practical'); assert.equal(tracker.isActive, false); assert.equal(body.scores.steering, 81.234); assert.equal(body.scores.docking, 0); if (saves === 1) throw new Error('Offline'); return { data: { ...simulationPerformance(body.scores), studentId: 'student' }, totalXp: 0, xpAwarded: 0 }; },
      getLearningMissionQuiz: async () => { lookups++; return { quiz }; }, submitLearningMissionQuiz: async () => ({ data: { quizId: 'q', studentId: 'student', score: 50, 'raw-score': 1, totalQuestions: 2, passed: false } }) },
    recordMissionSession: () => {}, processMissionRewards: () => { rewards++; }, saveProgress: () => {}, restoreQuizSubmissions: (local, saved) => [...local, ...saved],
    normalizeQuizData: value => value, postDockingQuizData: ref(null), showPostDockingQuiz: ref(false), postDockingQuizTriggered: ref(false), missionCompleteModal: ref(null),
    formatElapsedDuration: () => '00:10', syncUiCursor: () => {}, isPostDockingQuizSubmitting: ref(false) };
  appFunction('currentSimulationScores', context);
  const finish = appFunction('continueCourseCompletion', context);
  await finish(); assert.equal(context.courseCompletionState.value, 'SAVE_FAILED'); assert.equal(lookups, 0); assert.equal(rewards, 0);
  await finish(); assert.equal(saves, 2); assert.equal(lookups, 1); assert.equal(rewards, 1); assert.equal(context.showPostDockingQuiz.value, true);
  context.isTrainingReviewMode.value = true; await appFunction('handlePostDockingQuizSubmit', context)({ one: 'True' });
  assert.equal(context.showPostDockingQuiz.value, false); assert.equal(context.courseCompletionState.value, 'RESULTS');
  assert.equal(context.missionCompleteModal.value.score, run.integratedSaved.data.score); assert.equal(context.missionCompleteModal.value.quizScore, 50);
  assert.equal(context.missionCompleteModal.value.performanceMetrics.dockingAccuracy, 0); assert.equal(context.missionCompleteModal.value.fromLesson, true);
});

test('saved quiz results open the existing results overlay; failed history lookups never start another attempt', async () => {
  const quiz = { id: 'q', questions: [{}] }, saved = { quizId: 'q', score: 75 }, results = [], starts = [], errors = [];
  const context = { currentUser: ref({ id: 'student' }), userRole: ref('student'), firebaseApi: { getQuizScores: async () => ({ scores: [saved] }) },
    showCourseQuizResult: (q, result) => results.push([q, result]), startQuizSession: q => starts.push(q), courseQuizError: ref(''),
    progressData: ref({ quizSubmissions: [{ studentId: 'student', quizId: 'q' }, { studentId: 'other', quizId: 'q' }] }) };
  const launch = appFunction('launchCourseQuiz', context);
  await launch({ target: quiz, activityId: 'activity', fail: e => errors.push(e) });
  assert.deepEqual(results, [[quiz, saved]]); assert.equal(starts.length, 0);
  context.firebaseApi.getQuizScores = async () => { throw new Error('Offline'); };
  await launch({ target: quiz, activityId: 'activity', fail: e => errors.push(e) });
  assert.equal(starts.length, 0); assert.match(errors[0].message, /Offline/);
  context.firebaseApi.getQuizScores = async () => ({ scores: [] });
  await launch({ target: quiz, activityId: 'activity', fail: e => errors.push(e) });
  assert.equal(starts[0].courseActivityId, 'activity'); assert.equal(context.progressData.value.quizSubmissions.length, 1);
  assert.equal(context.progressData.value.quizSubmissions[0].studentId, 'other');
});

test('course quiz save failure preserves answers; double submit saves once and commits only the server result', async () => {
  const session = { quiz: { id: 'q', courseActivityId: 'activity' }, answers: ['True'] };
  let release, saves = 0, committed = 0, results = [];
  const context = { activeQuizSession: ref(session), currentUser: ref({ id: 'student' }), allQuestionsAnswered: ref(true), courseQuizSaving: ref(false), courseQuizError: ref(''),
    progressData: ref({ quizSubmissions: [] }), firebaseApi: { submitLearningQuiz: async () => { throw new Error('Storage unavailable'); } },
    restoreQuizSubmissions: (local, scores) => [...local, ...scores], saveProgress: () => { committed++; }, showCourseQuizResult: (q, result) => results.push(result) };
  const submit = appFunction('submitCourseQuizSession', context);
  await submit(); assert.equal(context.activeQuizSession.value, session); assert.equal(committed, 0); assert.match(context.courseQuizError.value, /Storage unavailable/);
  context.firebaseApi.submitLearningQuiz = async (id, answers) => { saves++; assert.equal(id, 'activity'); assert.deepEqual(Array.from(answers), ['True']); return new Promise(resolve => { release = resolve; }); };
  const pending = submit(); await submit(); assert.equal(saves, 1);
  const saved = { quizId: 'q', studentId: 'student', score: 100, passed: true };
  release({ data: saved, scoreId: 'saved-result' }); await pending;
  assert.equal(context.activeQuizSession.value, null); assert.equal(committed, 1); assert.equal(results[0], saved);
});

test('course quiz results arriving after an account switch cannot update the new student', async () => {
  let release;
  const context = { activeQuizSession: ref({ quiz: { courseActivityId: 'activity' }, answers: ['True'] }), currentUser: ref({ id: 'a' }),
    allQuestionsAnswered: ref(true), courseQuizSaving: ref(false), courseQuizError: ref(''), firebaseApi: { submitLearningQuiz: () => new Promise(resolve => { release = resolve; }) } };
  const submit = appFunction('submitCourseQuizSession', context), pending = submit();
  context.currentUser.value = { id: 'b' }; release({ data: { score: 100 } }); await pending;
  assert.equal(context.courseQuizError.value, ''); assert.equal(context.courseQuizSaving.value, false);
});
