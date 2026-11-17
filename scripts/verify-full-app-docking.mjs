// Full Vue app + real mission API handlers, using an isolated in-memory database.
// No live accounts, quiz submissions or mission results are read or written.
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createServer } from 'vite';
import { headlessBrowser } from './lib/headless-browser.mjs';
import { materialsFixture, samplePdf } from '../backend/tests/helpers/materialsFixture.js';
import { attachModulePdf, viewModulePdf } from '../backend/tests/helpers/coursePdf.js';
import { issueSession } from '../backend/services/authSession.js';
import { OFFICIAL_SYLLABUS, OFFICIAL_SYLLABUS_KEY } from '../shared/officialSyllabus.js';

const directory = resolve('../.tmp/full-app-docking');
mkdirSync(directory, { recursive: true });
const owner = { id: 'a', role: 'instructor' }, student = { id: 'sa', role: 'student', instructorid: 'a' };
const sample = { id: 'sample-docking', instructorId: 'a', title: 'Sample mission', required_boat: 'medium',
  steps: [{ instruction: 'Navigate to Buoy 1 and photograph it (Q)', waypointZone: 'sample-buoy', type: 'compass', heading: '45', requireInteraction: 'inspect_buoy' },
    { instruction: 'Return to port, drop anchor, and report mission completion', waypointZone: 'harbor-berth', type: 'dock' }],
  encounter: { type: 'crossing-red', clearance: 100, warningDistance: 600 },
  bouy: [{ checkpoint_id: 'sample-buoy', bouy_description: 'Sample buoy' }] };
let missionSaves = 0, quizSaves = 0;
const fixture = materialsFixture({
  saveMissionResult: async data => {
    missionSaves++;
    fixture.records.mission_score = { saved: data };
    return { data, scoreId: 'saved', xpAwarded: 0, totalXp: 0 };
  },
  saveQuizResult: async data => {
    quizSaves++;
    fixture.records.quiz_score = { saved: data };
    return { data, scoreId: 'saved-quiz' };
  }
});
const { id: syllabusId } = await fixture.service.save(owner, 'syllabi', null,
  { title: OFFICIAL_SYLLABUS.title, officialSyllabusKey: OFFICIAL_SYLLABUS_KEY },
  { originalname: 'syllabus.pdf', mimetype: 'application/pdf', buffer: samplePdf() });
const moduleId = `${syllabusId}--lesson-3`;
await attachModulePdf(fixture, owner, moduleId);
await viewModulePdf(fixture, student, moduleId);
fixture.records.missions = { [sample.id]: sample };
fixture.records.quiz = { q: { title: 'Sample mission quiz', instructorId: 'a', moduleId: sample.id, published: true,
  questions: [{ id: 'one', type: 'true-false', prompt: 'Anchor at the port before reporting.', correctAnswer: 'True' }] } };
const { id: activityId } = await fixture.course.save(owner, syllabusId, moduleId, null,
  { title: 'Sample mission', type: 'simulation', targetId: sample.id, published: true }, null);
fixture.app.get('/missions', (_req, res) => res.json({ missions: [sample] }));
fixture.app.get('/mission-scores/:id', (_req, res) => res.json({ scores: Object.values(fixture.records.mission_score || {}) }));
fixture.app.get('/quiz-scores/:id', (_req, res) => res.json({ scores: Object.values(fixture.records.quiz_score || {}) }));
fixture.app.get('/quizzes', (_req, res) => res.json({ quizzes: Object.entries(fixture.records.quiz).map(([id, q]) => ({ id, ...q })) }));
fixture.app.use((_req, res) => res.json({}));
const session = issueSession(student.id, 'student');
const server = await createServer({ cacheDir: resolve(directory, 'vite-cache'),
  server: { host: '127.0.0.1', port: 5297, strictPort: true, hmr: false },
  plugins: [{ name: 'full-app-fixture-api', configureServer(vite) {
    vite.middlewares.use((req, res, next) => {
      if (!req.url.startsWith('/__fixture-api/')) return next();
      req.url = req.url.slice('/__fixture-api'.length);
      req.headers.authorization = `Bearer ${session}`;
      fixture.app(req, res, next);
    });
  } }]
});
let browser;
try {
  await server.listen();
  browser = await headlessBrowser({ directory, port: 9263, webgl: true });
  await browser.viewport(1000, 650);
  await browser.send('Network.enable');
  await browser.send('Network.setBlockedURLs', { urls: ['*firestore.googleapis.com*', '*identitytoolkit.googleapis.com*'] });
  await browser.send('Page.addScriptToEvaluateOnNewDocument', { source: `
    const originalFetch=fetch.bind(window);window.fixtureRequests=[];
    window.fetch=(input,init={})=>{const url=String(input?.url||input);if(!url.includes('/api/v1/'))return originalFetch(input,init);
      const path=new URL(url).pathname.replace('/api/v1','');window.fixtureRequests.push({path,method:init.method||'GET',body:init.body?JSON.parse(init.body):null});
      return originalFetch('/__fixture-api'+path,init);};` });
  await browser.navigate('http://127.0.0.1:5297');
  await browser.waitFor('!!document.querySelector("#app")?.__vue_app__?._instance?.setupState', 90000);
  await browser.evaluate(`(async()=>{window.s=document.querySelector('#app').__vue_app__._instance.setupState;
    s.currentUser={id:'sa',name:'Fixture Student',status:'active',instructorid:'a',instructorId:'a'};s.userRole='student';s.isAuthenticated=true;
    s.tutorialCompleted=true;s.tutorialOpen=false;s.graphicsQuality='low';s.applyGraphicsSettings();
    // Keep the complete app lifecycle; suppress GPU draws to exercise anchoring without rendering.
    s.renderer.render=()=>{};s.postProcessing=null;
    await new Promise(r=>setTimeout(r,0));await s.loadMissionDatesFromFirestore();})()`);
  await browser.waitFor('!!(s.initComplete && s.islandGroup && s.boatObject)', 120000);
  const results = [];
  for (const [steps, hasQuiz] of [[0, true], [1, true], [0, false], [2, false]]) {
    console.log('CASE', steps, hasQuiz);
    missionSaves = 0; quizSaves = 0;
    fixture.records.mission_score = {}; fixture.records.quiz_score = {};
    fixture.records.quiz.q.published = hasQuiz;
    await browser.evaluate(`(async()=>{if(s.activeScreen==='simulation')s.dismissMissionCompleteModal();
      window.fixtureRequests=[];s.trainingStepBaseline=null;
      await s.launchCourseSimulation({target:{id:${JSON.stringify(sample.id)}},activityId:${JSON.stringify(activityId)},
        syllabusId:${JSON.stringify(syllabusId)},lessonId:${JSON.stringify(moduleId)},fail:e=>{throw e;}});})()`);
    await browser.waitFor('!!(s.activeScreen==="simulation" && s.trainingStepBaseline && !s.showCinematicLoading && s.boatObject)', 90000);
    await browser.evaluate(`(()=>{s.encounterSetupError='';Object.assign(s.vesselEncounterState,{resolved:true,successful:true,accuracy:100,minimumClearance:200,collision:false});
      s.trainingRunMetrics.stepsCompleted=${steps};s.trainingRunMetrics.totalSteps=2;s.currentTrainingStep=${steps === 0 ? 0 : 1};s.trainingRunFinished=${steps === 2};
      s.boatObject.position.x=(125.8544-125.7)*Math.PI/180*6371000;s.boatObject.position.z=(7.0611-7.1)*Math.PI/180*6371000;s.syncStatsBoatXZ();
      s.engineRunning=false;s.engineStarting=false;s.simulationRunning=false;})()`);
    assert.equal(await browser.evaluate('s.isBoatInPortZone'), true);
    // Real HUD click. No animation frames advance the anchor while paused.
    await browser.waitFor(`(()=>{const e=document.querySelector('button[aria-label="Deploy anchor (H)"]');if(!e)return false;
      const r=e.getBoundingClientRect();return e.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2));})()`, 30000);
    await browser.clickExpression('document.querySelector("button[aria-label=\\"Deploy anchor (H)\\"]")');
    await browser.waitFor('s.anchor.deployed || !!s.courseCompletionError', 30000);
    await browser.waitFor('!!(s.showPostDockingQuiz || s.missionCompleteModal || s.courseCompletionError)', 30000);
    const completionError = await browser.evaluate('s.courseCompletionError');
    if (completionError) console.log('COMPLETION FAILURE', JSON.stringify({ steps, hasQuiz,
      requests: await browser.evaluate('window.fixtureRequests'), mission: fixture.records.missions[sample.id] }));
    assert.equal(completionError, '');
    assert.equal(await browser.evaluate('s.anchor.deploying'), false);
    assert.equal(await browser.evaluate('s.showPostDockingQuiz'), hasQuiz);
    assert.equal(missionSaves, 1);
    assert.equal(fixture.records.mission_score.saved.completion.completedSteps, steps);
    if (hasQuiz) {
      await browser.waitFor('Number(getComputedStyle(document.querySelector(".quiz-wrapper")).opacity) >= .99');
      if (steps === 0) await browser.screenshot('full-app-zero-steps-quiz');
      await browser.click('True'); await browser.click('Submit Quiz');
      await browser.waitFor('!!s.missionCompleteModal && !s.showPostDockingQuiz', 30000);
      assert.equal(quizSaves, 1);
      assert.equal(fixture.records.quiz_score.saved.score, 100);
    } else assert.equal(quizSaves, 0);
    assert.equal(await browser.evaluate('s.missionCompleteModal.stepsLabel'), `${steps}/2`);
    if (!hasQuiz && steps === 0) await browser.screenshot('full-app-zero-steps-results');
    results.push({ steps, hasQuiz, missionSaves, quizSaves, score: fixture.records.mission_score.saved.score,
      state: await browser.evaluate('s.courseCompletionState') });
  }
  writeFileSync(resolve(directory, 'verification.json'), JSON.stringify({ results, browserErrors: browser.errors }, null, 2));
  assert.deepEqual(browser.errors, []);
  console.log('PASS full app: actual anchor clicks with no animation frames, real API persistence, assigned quiz submission and direct results with unfinished steps.');
} catch (error) {
  if (browser) {
    const diagnostic = await browser.evaluate(`JSON.parse(JSON.stringify({screen:window.s?.activeScreen,loading:window.s?.showCinematicLoading,
      anchor:window.s?.anchor,course:window.s?.activeCoursePractical,state:window.s?.courseCompletionState,error:window.s?.courseCompletionError,
      encounter:window.s?.vesselEncounterResult(window.s?.vesselEncounterState),requests:window.fixtureRequests,
      text:document.body.innerText.slice(-2500)}))`);
    console.log('FAILURE STATE', JSON.stringify(diagnostic));
    await browser.screenshot('full-app-failure');
  }
  throw error;
} finally { browser?.close(); await server.close(); }
