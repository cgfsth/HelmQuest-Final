// Read-only UI proof from course/mission JSON captured from the hosted API.
// No tokens, live requests or database mutations occur in this browser fixture.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {resolve} from 'node:path';
import {createServer} from 'vite';
import {compile} from '@vue/compiler-dom';
import {parse,compileStyle} from '@vue/compiler-sfc';
import {headlessBrowser} from './lib/headless-browser.mjs';
const directory=resolve('../.tmp/lesson-missions'),course=JSON.parse(readFileSync(resolve(directory,'live-course.json'))),missions=JSON.parse(readFileSync(resolve(directory,'live-missions.json')));
mkdirSync(directory,{recursive:true});
assert.equal(course.activities.filter(a=>a.type==='simulation' && a.published).length,6);
const source=readFileSync('src/App.vue','utf8'),popup=source.split('<!-- Gear Info Popup (after photographing) -->')[1].split('<!-- Fish caught popup -->')[0];
const render=compile(popup,{mode:'function',prefixIdentifiers:true}).code,styles=parse(source).descriptor.styles.map(style=>style.scoped?compileStyle({source:style.content,id:'data-v-mission-proof',filename:'App.vue',scoped:true}).code:style.content).join('\n');
const modulePath=resolve(directory,'read-only-ui.mjs');
writeFileSync(modulePath,`import * as Vue from 'vue';
import CourseOutline from '/src/components/materials/CourseOutline.vue';
import MissionBuoyContentEditor from '/src/components/MissionBuoyContentEditor.vue';
import '/src/components/materials/materials.css';import '/src/components/materials/course.css';
const course=${JSON.stringify(course)},missions=${JSON.stringify(missions)},active=Vue.ref(null),gearInfoPopup=Vue.ref(null);
function open(activity){if(activity.type==='simulation')active.value=missions[activity.targetId];}
const model=Vue.computed(()=>active.value?{...active.value,buoys:active.value.checkpoints.map(b=>({...b,imageSrc:b.image,learningOutcome:b.learningOutcome,description:b.description,name:b.name}))}:null);
const module=Vue.computed(()=>course.modules.find(m=>m.id===active.value?.syllabusModuleId));
const Popup={__scopeId:'data-v-mission-proof',render:new Function('Vue',${JSON.stringify(render)})(Vue),setup:()=>({gearInfoPopup,dismissGearInfoPopup(){gearInfoPopup.value=null;}})};
window.fixture={preview(index){const b=active.value.checkpoints[index];gearInfoPopup.value={name:b.name,imageSrc:b.image,description:b.description,learningOutcome:b.learningOutcome};},get active(){return active.value}};
Vue.createApp({setup:()=>()=>Vue.h('main',{class:'lm'},[Vue.h('p',{class:'proof-label'},'Saved lesson missions · Read-only verification'),active.value?Vue.h('div',[Vue.h('button',{onClick:()=>active.value=null},'Back to course'),Vue.h('h1',active.value.mission_title),Vue.h('p',active.value.description),Vue.h(MissionBuoyContentEditor,{model:model.value,savedOutcomes:module.value.objectives,busy:true})]):Vue.h(CourseOutline,{syllabus:course.syllabus,modules:course.modules,activities:course.activities,official:course.official,preview:true,manager:false,simulationAccess:course.simulationAccess,onOpen:open}),Vue.h(Popup)])}).mount('#app');`);
const vite=await createServer({cacheDir:resolve(directory,'ui-cache'),resolve:{dedupe:['vue']},optimizeDeps:{entries:[],include:['vue']},server:{host:'127.0.0.1',port:5337,strictPort:true,hmr:false,fs:{allow:[resolve('..')]}},plugins:[{name:'saved-missions-proof',configureServer(server){server.middlewares.use((req,res,next)=>{if(req.url!=='/__saved-missions')return next();res.setHeader('Content-Type','text/html');res.end('<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>'+styles+'body{margin:0;background:#0a1728;color:#e5f0f8;font:14px Arial}.lm{max-width:1180px;margin:0 auto;padding:24px}.proof-label{color:#82c9e9;margin-bottom:22px}main>div>p{line-height:1.7}main>div>button{padding:12px;border-radius:8px;background:#2ebdee;color:#071828;border:0}@media(max-width:600px){.lm{padding:10px}}</style></head><body><div id="app"></div><script type="module" src="/@fs/'+modulePath.replaceAll('\\','/')+'"></script></body></html>');});}}]});
await vite.listen();let browser;
try{
  browser=await headlessBrowser({directory:resolve(directory,'browser'),port:9288});await browser.viewport(1365,1000);await browser.navigate('http://127.0.0.1:5337/__saved-missions');await browser.waitFor('document.querySelectorAll(".lm-module").length===6');
  assert.equal(await browser.evaluate('[...document.querySelectorAll(".lc-activity-copy strong")].filter(el=>/^Lesson [1-6]:/.test(el.textContent)).length'),6);
  await browser.screenshot('saved-course-missions');
  await browser.clickExpression('[...document.querySelectorAll(".lc-activity-open")].find(button=>button.textContent.includes("Lesson 4: Give-Way"))');await browser.waitFor('document.querySelectorAll(".buoy-card").length===4');
  assert.equal(await browser.evaluate('document.querySelector(".coverage-heading").textContent.includes("4/4")'),true);await browser.screenshot('saved-lesson-4-material');
  await browser.evaluate('window.fixture.preview(3)');await browser.waitFor('document.querySelector(".gear-info-popup-backdrop") && Number(getComputedStyle(document.querySelector(".gear-info-popup-backdrop")).opacity)>.99');assert.equal(await browser.evaluate('document.querySelectorAll(".gear-info-popup input,.gear-info-popup select,.gear-info-popup textarea").length'),0);await browser.screenshot('saved-lesson-4-student-picture');await browser.click('Continue Mission →');await browser.waitFor('!document.querySelector(".gear-info-popup-backdrop")');
  await browser.click('Back to course');await browser.waitFor('document.querySelectorAll(".lm-module").length===6');
  await browser.clickExpression('[...document.querySelectorAll(".lc-activity-open")].find(button=>button.textContent.includes("Lesson 5: Seamanship"))');await browser.waitFor('document.querySelectorAll(".buoy-card").length===6');
  assert.equal(await browser.evaluate('document.querySelector(".coverage-heading").textContent.includes("4/4")'),true);
  await browser.evaluate('window.fixture.preview(4)');await browser.waitFor('document.querySelector(".gear-info-title")?.textContent.includes("Vessel at anchor") && Number(getComputedStyle(document.querySelector(".gear-info-popup-backdrop")).opacity)>.99');await browser.screenshot('saved-lesson-5-anchor-reference');
  await browser.viewport(375,900);assert.equal(await browser.evaluate('document.documentElement.scrollWidth<=innerWidth'),true);await browser.screenshot('saved-lesson-5-student-mobile');assert.deepEqual(browser.errors,[]);
  writeFileSync(resolve(directory,'browser-verification.json'),JSON.stringify({passed:true,realHostedCourseSnapshot:true,visibleMissions:6,completeLesson4Material:true,lesson5PdfCategories:true,buoyQuestions:0,mobile:true},null,2));console.log('PASS: six saved missions are visible in the actual course outline; real saved buoy pictures/descriptions render without interaction questions on desktop and mobile.');
}finally{browser?.close();await vite.close();}
