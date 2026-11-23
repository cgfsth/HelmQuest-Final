import { lessonOutcomes } from './lessonAlignment.js';
import { gradeSimulationSafety } from './simulationSafety.js';

export const LESSON_SCORING_VERSION = 'lesson-score-v1';
export const INTEGRATED_SIMULATION_VERSIONS = ['simulation-v1','simulation-v2','simulation-v3','simulation-v4'];
export const LIGHT_KEYS = ['port','starboard','masthead','aftMasthead','stern','anchor'];
export const SCORING_SOURCES = {
  projection:'https://proj.org/en/stable/operations/projections/merc.html',
  lights:'https://www.navcen.uscg.gov/sites/default/files/pdf/navRules/Handbook/Nav%20Rules%20Handbook_Corrected_08-12-2024.pdf'
};
const normalized = text => String(text).toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
const mean = values => values.reduce((a,b)=>a+b,0)/values.length;
const clamp = value => Math.max(0,Math.min(100,value));
const round = value => Math.round(value*10)/10;
export function focusedLessonOutcomes(value) {
  return lessonOutcomes(value).flatMap(text=>{
    const key=normalized(text);
    if(key.includes('different branches of navigation'))return [{text,key:'branches',lesson:2,method:'quiz',label:'Branches of navigation'}];
    if(key.includes('discuss different terms used in navigation'))return [{text,key:'terms',lesson:2,method:'quiz',label:'Navigation terminology',reviewRequired:true}];
    if(key.includes('terrestrial coordinate') && key.includes('chart interpretation'))return [{text,key:'chart',lesson:3,method:'simulation',label:'Coordinates, projection and chart work'}];
    if(key.includes('obligated vessel') && key.includes('yield'))return [{text,key:'giveWay',lesson:4,method:'simulation',label:'Recognize and respond to the give-way vessel'}];
    if(key.includes('implement') && key.includes('lighting configuration'))return [{text,key:'lighting',lesson:4,method:'simulation',label:'Apply the navigation-light configuration'}];
    if(key.includes('knowledge') && key.includes('navigation lights') && key.includes('three types'))return [{text,key:'lightKnowledge',lesson:5,method:'quiz',label:'Navigation lights for three vessel types'}];
    return [];
  });
}
export function defaultChartExercise() {
  return {projection:'mercator',bounds:{south:6.98,north:7.16,west:125.66,east:125.9},reference:{lat:7.08,lon:125.76},
    targets:[{id:'A',lat:7.02,lon:125.72},{id:'B',lat:7.12,lon:125.84}],coordinateTolerance:100,plotTolerance:300};
}
export function lessonScoringDefinition(outcomes, mission = {}) {
  const focused=focusedLessonOutcomes(outcomes);
  if(!focused.length)return null;
  const lessons=new Set(focused.map(o=>o.lesson));
  if(lessons.size!==1)throw new Error('Create a separate mission for each lesson’s learning outcomes.');
  const lesson=focused[0].lesson, criteria=[];
  if(lesson===3)criteria.push({key:'coordinates',label:'Coordinate reading',weight:.8/3,outcome:'chart'},
    {key:'plotting',label:'Chart route plotting',weight:.8/3,outcome:'chart'}, {key:'projection',label:'Map projection',weight:.8/3,outcome:'chart'});
  if(lesson===4 && focused.some(o=>o.key==='giveWay'))criteria.push({key:'giveWay',label:'Give-way / stand-on response',weight:.8,outcome:'giveWay'});
  if(lesson===3 || lesson===4)criteria.push({key:'safety',label:'Safety compliance',weight:criteria.length ? .2 : 1,outcome:'safety'});
  const definition={version:LESSON_SCORING_VERSION,lesson,mode:criteria.length?'practical':'knowledge',outcomes:focused,criteria};
  if(lesson===3)definition.chart=validateChartExercise(mission.chartExercise || defaultChartExercise());
  if(lesson===4)definition.lighting={vesselType:'power-driven',condition:'underway-reduced-visibility',length:{small:18,medium:60,large:180}[mission.required_boat || mission.boatType] || 60};
  return definition;
}
function point(value) {
  if(!value || typeof value.lat!=='number' || typeof value.lon!=='number' || !Number.isFinite(value.lat) || !Number.isFinite(value.lon) || Math.abs(value.lat)>=85 || Math.abs(value.lon)>180)throw new Error('Enter valid decimal latitude and longitude.');
  return {lat:value.lat,lon:value.lon};
}
function validateChartExercise(value) {
  const {bounds}=value;
  if(!bounds || ![bounds.south,bounds.north,bounds.west,bounds.east].every(Number.isFinite) || bounds.south>=bounds.north || bounds.west>=bounds.east || bounds.north>=85 || bounds.south<=-85 || bounds.west< -180 || bounds.east>180)throw new Error('Choose valid training-chart bounds.');
  const within=p=>{const q=point(p);if(q.lat<bounds.south || q.lat>bounds.north || q.lon<bounds.west || q.lon>bounds.east)throw new Error('Keep chart exercise points inside the chart.');return q;};
  if(!['mercator','equirectangular'].includes(value.projection) || !Array.isArray(value.targets) || value.targets.length<2 || value.targets.length>5)throw new Error('A chart exercise needs a projection and 2–5 route points.');
  for(const key of ['coordinateTolerance','plotTolerance'])if(!Number.isFinite(value[key]) || value[key]<20 || value[key]>2000)throw new Error('Chart tolerances must be 20–2000 metres.');
  return {...value,bounds:{...bounds},reference:within(value.reference),targets:value.targets.map((p,i)=>({...within(p),id:String(i+1)}))};
}
// Spherical Mercator forward/inverse, in a normalized chart viewport.
export function chartProject(location,bounds,projection='mercator') {
  const y=lat=>projection==='mercator'?Math.log(Math.tan(Math.PI/4+lat*Math.PI/360)):lat;
  return {x:(location.lon-bounds.west)/(bounds.east-bounds.west),y:(y(bounds.north)-y(location.lat))/(y(bounds.north)-y(bounds.south))};
}
export function chartUnproject(position,bounds,projection='mercator') {
  const y=lat=>projection==='mercator'?Math.log(Math.tan(Math.PI/4+lat*Math.PI/360)):lat;
  const n=y(bounds.north)-position.y*(y(bounds.north)-y(bounds.south));
  return {lon:bounds.west+position.x*(bounds.east-bounds.west),lat:projection==='mercator'?(2*Math.atan(Math.exp(n))-Math.PI/2)*180/Math.PI:n};
}
export function distanceMetres(a,b) {
  const r=Math.PI/180,dlat=(a.lat-b.lat)*r,dlon=(a.lon-b.lon)*r;
  const h=Math.sin(dlat/2)**2+Math.cos(a.lat*r)*Math.cos(b.lat*r)*Math.sin(dlon/2)**2;
  return 6371000*2*Math.asin(Math.sqrt(Math.min(1,h)));
}
export function gradeChartTask(definition,body) {
  const exercise=definition.chart;
  if(!exercise || !body || !['mercator','equirectangular'].includes(body.projection) || !Array.isArray(body.plots) || body.plots.length!==exercise.targets.length)throw new Error('Finish the coordinate reading, projection and all route plots before applying the chart plan.');
  const reading=point(body.reading),plots=body.plots.map(point);
  const readingError=distanceMetres(reading,exercise.reference),plotErrors=plots.map((p,i)=>distanceMetres(p,exercise.targets[i]));
  const accuracy=(error,tolerance)=>clamp(100-Math.max(0,error-tolerance)/tolerance*100);
  return {type:'chart',scores:{coordinates:round(accuracy(readingError,exercise.coordinateTolerance)),plotting:round(mean(plotErrors.map(error=>accuracy(error,exercise.plotTolerance)))),projection:body.projection===exercise.projection?100:0},
    evidence:{reading,plots,projection:body.projection,readingErrorMetres:round(readingError),plotErrorsMetres:plotErrors.map(round)}};
}
export function gradeLightingTask(definition,body) {
  if(!definition.lighting || !body?.lights || LIGHT_KEYS.some(key=>typeof body.lights[key]!=='boolean'))throw new Error('Apply a complete navigation-light configuration.');
  const required=['port','starboard','masthead','stern',...(definition.lighting.length>=50?['aftMasthead']:[])];
  const errors=required.filter(key=>!body.lights[key]);
  if(body.lights.anchor)errors.push('anchor');
  // A second masthead light is permitted on a power-driven vessel under 50 m.
  const score=errors.length===0?100:0;
  return {type:'lighting',scores:{lighting:score},evidence:{lights:Object.fromEntries(LIGHT_KEYS.map(key=>[key,body.lights[key]])),errors}};
}
export function scoreLessonSimulation(definition,task,encounter,practice,passScore,safetyEvents) {
  const values={...task?.scores};
  const practical=definition.mode==='practical';
  const lightingRequired=definition.outcomes.some(o=>o.key==='lighting');
  const safety=gradeSimulationSafety(safetyEvents,{lightingRequired,lightingTask:task,encounter});
  values.safety=safety.score;
  if(definition.criteria.some(c=>c.key==='giveWay') && encounter && ['crossing-red','crossing-green'].includes(encounter.type) && encounter.resolved)values.giveWay=encounter.accuracy;
  const rubric=definition.criteria.map(c=>({...c,score:values[c.key] ?? 0,attempted:values[c.key]!=null}));
  const score=practical?Math.round(rubric.reduce((sum,c)=>sum+c.score*c.weight,0)):null;
  const assessmentComplete=practical && rubric.every(c=>c.attempted) && (!lightingRequired || task?.type==='lighting');
  const passed=assessmentComplete && score>=passScore && !safety.critical;
  return {score,passed,passScore,scoringVersion:'simulation-v4',assessmentComplete,criticalSafetyFailure:safety.critical,
    requiredExerciseFailed:practice.requiredExerciseFailed===true,performanceMetrics:{...practice.performanceMetrics,safetyCompliance:safety.score},
    lessonScoring:{...definition,score,passed,status:practical?(assessmentComplete?'assessed':'not-attempted'):'practice-completed',rubric,practiceScore:practice.score,
      safety,taskEvidence:task?.evidence || null,outcomes:definition.outcomes.map(o=>({...o,score:o.key==='lighting'?(task?.scores.lighting ?? 0):o.method==='simulation'?round(mean(rubric.filter(c=>c.outcome===o.key).map(c=>c.score))):null}))}};
}
export function outcomeQuizScores(report,quizResult) {
  return (report?.outcomes || []).map(outcome=>{
    if(outcome.method!=='quiz')return outcome;
    const answers=(quizResult?.answers || []).filter(a=>typeof a==='object' && normalized(a.learningOutcome)===normalized(outcome.text));
    return {...outcome,score:answers.length?Math.round(answers.filter(a=>a.isCorrect).length/answers.length*100):null,
      evidence:answers.length?`${answers.filter(a=>a.isCorrect).length}/${answers.length} final-quiz responses`:'Awaiting the final quiz'};
  });
}
