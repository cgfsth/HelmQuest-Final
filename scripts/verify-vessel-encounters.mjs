// Render the real NPC, guidance and App encounter lifecycle in hidden WebGL.
// This fixture uses open water, deterministic steering and no live database.
import { createServer } from 'vite';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import assert from 'node:assert/strict';
import { headlessBrowser } from './lib/headless-browser.mjs';
const directory = resolve('../.tmp/vessel-encounters'); mkdirSync(directory, { recursive: true });
const source = readFileSync(new URL('../src/App.vue', import.meta.url), 'utf8').replace(/\r\n/g, '\n');
const extract = name => {
  const start = source.indexOf(`function ${name}(`); assert.ok(start >= 0);
  return source.slice(start, source.indexOf('\n}', start) + 2);
};
const modulePath = resolve(directory, 'fixture.mjs');
writeFileSync(modulePath, `import * as THREE from 'three';
import {createApp,h,ref} from 'vue';
import VesselEncounterPanel from '/src/components/VesselEncounterPanel.vue';
import {normalizeEncounter} from '/shared/vesselEncounter.js';
import {createVesselEncounter,updateVesselEncounter,vesselEncounterResult,vesselEncounterGuidance} from '/src/helpers/vesselEncounter.js';
import {createEncounterVesselVisual} from '/src/helpers/encounterVesselVisual.js';
import {createBuoyWaterCheck} from '/src/helpers/missionBuoyPlacement.js';
import {simulationPerformance,simulationScoringInputs} from '/shared/simulationPerformance.js';
import {createTrainingRunMetrics,calculateSafetyCompliance} from '/src/helpers/missionScoring.js';
import {IntegratedPerformanceManager} from '/src/helpers/performanceManager.js';
const scene=new THREE.Scene();scene.background=new THREE.Color(0x8eb9d1);scene.fog=new THREE.Fog(0x8eb9d1,3000,10000);
const renderer=new THREE.WebGLRenderer({antialias:true});renderer.setSize(innerWidth,innerHeight);renderer.setPixelRatio(1);document.querySelector('#scene').appendChild(renderer.domElement);
const shaderErrors=[];renderer.debug.onShaderError=()=>shaderErrors.push('Shader compilation failed');
scene.add(new THREE.HemisphereLight(0xe7f6ff,0x123c54,2));const sun=new THREE.DirectionalLight(0xfff5df,3);sun.position.set(200,400,-100);scene.add(sun);
const water=new THREE.Mesh(new THREE.PlaneGeometry(14000,14000),new THREE.MeshStandardMaterial({color:0x1c647a,roughness:.3,metalness:.35}));water.rotation.x=-Math.PI/2;scene.add(water);
const grid=new THREE.GridHelper(14000,140,0x317d90,0x317d90);grid.position.y=.02;scene.add(grid);
const camera=new THREE.PerspectiveCamera(50,innerWidth/innerHeight,1,12000);
const boatObject=new THREE.Group();boatObject.userData.loaMeters=60;
const hull=new THREE.Mesh(new THREE.BoxGeometry(60,7,15),new THREE.MeshStandardMaterial({color:0x405b77}));hull.position.y=3;boatObject.add(hull);
const cabin=new THREE.Mesh(new THREE.BoxGeometry(18,8,11),new THREE.MeshStandardMaterial({color:0xf5dba7}));cabin.position.y=10;boatObject.add(cabin);scene.add(boatObject);
const islandGroup=new THREE.Group(),getActiveDockColliders=()=>[],getWaterSurfaceY=()=>0;
const resolveTrainingZonesAtSpawn=()=>[{id:'buoy-1',x:0,z:-4000}];
const performanceManager=new IntegratedPerformanceManager();
const stats=ref({rotationDeg:0,speedKnots:8}),trainingRunMetrics=ref(createTrainingRunMetrics()),activeTrainingModule=ref(null),isTrainingReviewMode=ref(false),simulationRunning=ref(true);
const encounterStatus=ref(null),encounterSetupError=ref('');let vesselEncounterState=null,encounterVisual=null,speedVel=4;
const showCollisionWarning=message=>{document.querySelector('#message').textContent=message;};
${['clearVesselEncounter','setupVesselEncounter','updateTrainingEncounter','currentSimulationScores'].map(extract).join('\n')}
const frame=()=>{if(encounterVisual){const npc=vesselEncounterState.npc;const dx=boatObject.position.x-npc.x,dz=boatObject.position.z-npc.z,d=Math.hypot(dx,dz)||1;camera.position.set(npc.x+dx/d*160,55,npc.z+dz/d*160);camera.lookAt(npc.x,5,npc.z);}renderer.render(scene,camera);};
window.fixture={
 start(type){clearVesselEncounter();boatObject.position.set(0,0,0);stats.value.rotationDeg=0;stats.value.speedKnots=8;document.querySelector('#message').textContent='';trainingRunMetrics.value=createTrainingRunMetrics();trainingRunMetrics.value.totalSteps=2;activeTrainingModule.value={id:'fixture',encounter:normalizeEncounter({type})};performanceManager.startMission({id:'fixture',steps:[{id:'one'},{id:'two'}]});this.frames=0;this.turn=null;setupVesselEncounter();if(encounterSetupError.value)throw new Error(encounterSetupError.value);frame();},
 advance(count,avoid=true){for(let i=0;i<count && !vesselEncounterState.resolved;i++){if(avoid && vesselEncounterState.approached && vesselEncounterState.config.type!=='crossing-green' && this.turn==null)this.turn=this.frames;if(this.turn!=null)stats.value.rotationDeg=this.frames-this.turn<900?45:0;const h=stats.value.rotationDeg*Math.PI/180;boatObject.position.x+=Math.sin(h)*stats.value.speedKnots*.514444*.1;boatObject.position.z-=Math.cos(h)*stats.value.speedKnots*.514444*.1;boatObject.rotation.y=Math.PI/2-h;updateTrainingEncounter(.1);this.frames++;}frame();return vesselEncounterResult(vesselEncounterState);},
 get result(){return vesselEncounterResult(vesselEncounterState);},
 get modelReady(){return !!encounterVisual?.group.userData.modelLoaded;},
 finish(){trainingRunMetrics.value.stepsCompleted=2;performanceManager.state.objectivesCompleted=[{id:'one'},{id:'two'}];const scores=currentSimulationScores();const assessment=simulationPerformance(scores);performanceManager.completeMission();return{assessment,overall:performanceManager.state.overallScore,events:trainingRunMetrics.value.safety.violations.map(event=>({...event}))};},
 get health(){return{shaderErrors,ready:renderer.info.render.calls>0,geometries:renderer.info.memory.geometries};},
 dispose(){clearVesselEncounter();renderer.dispose();}
};
createApp({setup:()=>()=>h(VesselEncounterPanel,{status:encounterStatus.value})}).mount('#app');
addEventListener('resize',()=>{renderer.setSize(innerWidth,innerHeight);camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();frame();});window.fixture.start('crossing-red');`);
const vite = await createServer({ cacheDir: resolve(directory, 'vite-cache'),
  server: { host: '127.0.0.1', port: 5295, strictPort: true, hmr: false, fs: { allow: [resolve('..')] } },
  plugins: [{ name: 'vessel-fixture', configureServer(server) { server.middlewares.use((req, res, next) => {
    if (req.url !== '/__vessels') return next(); res.setHeader('Content-Type', 'text/html');
    res.end(`<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0;background:#123047;font-family:Arial,sans-serif}#scene{position:fixed;inset:0}#message{position:fixed;top:18px;left:18px;color:#fff;background:#501d28;padding:10px;border-radius:8px;max-width:300px}#message:empty{display:none}</style></head><body><div id="scene"></div><div id="app"></div><div id="message" role="status"></div><script type="module" src="/@fs/${modulePath.replaceAll('\\','/')}"></script></body></html>`);
  }); } }] });
let browser;
try {
  await vite.listen(); browser = await headlessBrowser({ directory, port: 9261, webgl: true }); await browser.viewport(1365,900);
  await browser.navigate('http://127.0.0.1:5295/__vessels'); await browser.waitFor('window.fixture?.health.ready', 90000);
  for (const type of ['anchored', 'crossing-red', 'crossing-green']) {
    await browser.evaluate(`window.fixture.start(${JSON.stringify(type)})`);
    await browser.waitFor('window.fixture.modelReady', 90000);
    await browser.waitFor('document.querySelector(".encounter-panel summary")');
    const waiting = await browser.evaluate('window.fixture.advance(1500)'); assert.equal(waiting.resolved, false);
    await browser.screenshot(type + '-approach');
    const completed = await browser.evaluate('window.fixture.advance(15000)'); assert.equal(completed.successful,true,JSON.stringify(completed));
    const saved = await browser.evaluate('window.fixture.finish()'); assert.equal(saved.assessment.score,saved.overall); assert.equal(saved.assessment.passed,true);
  }
  await browser.evaluate('window.fixture.start("crossing-red");window.fixture.advance(15000,false)');
  const failed = await browser.evaluate('window.fixture.finish()');
  assert.equal(failed.assessment.passed,false); assert.equal(failed.assessment.performanceMetrics.safetyCompliance,0);
  assert.equal(failed.events.filter(event=>event.type==='VESSEL_COLLISION').length,1);
  await browser.screenshot('collision-feedback');
  for (const [width,height] of [[844,390],[375,812]]) {
    await browser.viewport(width,height); assert.equal(await browser.evaluate('document.documentElement.scrollWidth<=innerWidth'),true);
    assert.equal(await browser.evaluate('(()=>{const r=document.querySelector(".encounter-panel").getBoundingClientRect();return r.x>=0 && r.right<=innerWidth && r.bottom<=innerHeight})()'),true);
    await browser.screenshot('guidance-' + width);
    if (width === 844) {
      await browser.waitFor('!document.querySelector(".encounter-panel details").open');
      await browser.clickExpression('document.querySelector(".encounter-panel summary")');
      assert.equal(await browser.evaluate('document.querySelector(".encounter-panel details").open'),true);
      await browser.screenshot('guidance-844-expanded');
      await browser.clickExpression('document.querySelector(".encounter-panel summary")');
    }
  }
  assert.deepEqual((await browser.evaluate('window.fixture.health')).shaderErrors,[]); assert.deepEqual(browser.errors,[]);
  await browser.evaluate('window.fixture.dispose()');
  console.log('PASS: real NPC WebGL, App lifecycle/physics integration, safe passing, NPC give-way, collision feedback, centralized tracker score parity, and 375/844/1365 guidance layouts.');
  console.log('Screenshots: ' + directory);
} finally { browser?.close(); await vite.close(); }
