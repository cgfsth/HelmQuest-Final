<template>
  <div class="lesson-assessment">
  <aside v-if="definition" class="lesson-tools" aria-label="Lesson outcome and scoring tasks">
    <strong>Lesson {{ definition.lesson }} · Outcome tasks</strong>
    <p v-for="outcome in definition.outcomes" :key="outcome.key">{{ outcome.text }}</p>
    <template v-if="definition.mode==='knowledge'">
      <small>Knowledge is assessed in the final quiz after docking. Buoy visits are learning practice.</small>
      <details v-if="definition.lesson===2"><summary>Navigation reference</summary><p>Terrestrial navigation uses charts, landmarks and coordinates. Celestial navigation uses observations of celestial bodies. Electronic navigation uses instruments such as GNSS and radar.</p><p>Heading is the direction the bow points; a bearing is a direction to another position. Latitude and longitude locate a position on Earth.</p></details>
      <details v-if="definition.lesson===5"><summary>Three vessel light references</summary>
        <p><b>Power-driven, underway:</b> red port, green starboard, white masthead and stern; vessels 50 m or longer also show a second masthead light.</p>
        <p><b>Sailing, underway:</b> red/green sidelights and a white sternlight. A sailing vessel using propulsion follows the power-driven configuration.</p>
        <p><b>Trawling:</b> green over white all-round lights; vessels 50 m or longer also show a masthead light abaft and higher. When making way, also sidelights and a sternlight. Other fishing operations have different configurations.</p>
      </details>
    </template>
    <template v-else>
      <small v-for="criterion in definition.criteria" :key="criterion.key">{{ criterion.label }} · {{ Math.round(criterion.weight*10000)/100 }}%</small>
      <details><summary>Safety rules and deductions</summary><p>Safety starts at 100. Navigation lights are included in Safety compliance.</p><p v-for="(rule,key) in safetyRules" :key="key">{{ rule.label }}: −{{ rule.points }} safety points</p></details>
      <button v-if="definition.chart" type="button" @click="opened=true">Chart workspace</button>
      <button v-if="definition.lighting" type="button" @click="opened=true">Navigation-light controls</button>
      <span v-if="saved" class="saved">Practical configuration recorded</span>
      <small v-else>Apply the practical configuration before returning to port.</small>
    </template>
  </aside>
  <div v-if="opened" class="lesson-task-backdrop" @keydown.stop="trapKeys">
    <section ref="dialog" class="lesson-task-dialog" role="dialog" aria-modal="true" aria-labelledby="lesson-task-title" tabindex="-1">
      <header><h2 id="lesson-task-title">{{ definition.chart?'Chart workspace':'Navigation-light controls' }}</h2><button type="button" @click="opened=false" aria-label="Close lesson task">×</button></header>
      <p>First applied configuration is recorded for this attempt. Results appear after the mission. This is a practical instrument task, not a buoy quiz.</p>
      <template v-if="definition.chart">
        <p>Read reference mark M from the grid. Plot the supplied route in order using the required {{ chart.projection }} projection.</p>
        <label>Projection<select v-model="projection" :disabled="saved"><option value="equirectangular">Equirectangular</option><option value="mercator">Mercator</option></select></label>
        <svg ref="chartElement" class="training-chart" viewBox="0 0 660 430" role="img" aria-label="Training chart with latitude and longitude grid; click to plot route points" @click="plot">
          <rect x="55" y="25" width="550" height="350" fill="#d4edf1" stroke="#29475b" />
          <g v-for="tick in ticks" :key="tick">
            <line :x1="55+tick*550" y1="25" :x2="55+tick*550" y2="375" stroke="#8aafb7" />
            <text :x="55+tick*550" y="398" text-anchor="middle">{{ (chart.bounds.west+tick*(chart.bounds.east-chart.bounds.west)).toFixed(3) }}°E</text>
            <line x1="55" :y1="25+tick*350" x2="605" :y2="25+tick*350" stroke="#8aafb7" />
            <text x="50" :y="30+tick*350" text-anchor="end">{{ chartUnproject({x:0,y:tick},chart.bounds,projection).lat.toFixed(3) }}°N</text>
          </g>
          <text x="610" y="40">N ↑</text>
          <circle :cx="55+reference.x*550" :cy="25+reference.y*350" r="5" fill="#bd3b3b" /><text :x="64+reference.x*550" :y="20+reference.y*350">M</text>
          <polyline :points="plotLine" fill="none" stroke="#116699" stroke-width="3" />
          <g v-for="(position,index) in plotted" :key="index"><circle :cx="55+position.x*550" :cy="25+position.y*350" r="6" fill="#116699" /><text :x="65+position.x*550" :y="25+position.y*350">{{ index+1 }}</text></g>
        </svg>
        <small>Training chart for coordinate and projection exercises; not an operational nautical chart.</small>
        <div class="coordinate-inputs"><label>Mark M latitude<input v-model="readingLat" type="number" step="0.00001" :disabled="saved" /></label><label>Mark M longitude<input v-model="readingLon" type="number" step="0.00001" :disabled="saved" /></label></div>
        <ol><li v-for="(target,index) in chart.targets" :key="target.id">Plot {{ index+1 }}: {{ target.lat.toFixed(5) }}°N, {{ target.lon.toFixed(5) }}°E</li></ol>
        <p>{{ plots.length }}/{{ chart.targets.length }} route points plotted. Coordinate tolerance: {{ chart.coordinateTolerance }} m; plot tolerance: {{ chart.plotTolerance }} m.</p>
        <button v-if="!saved" type="button" @click="plots=[]">Clear route plots</button>
      </template>
      <template v-if="definition.lighting">
        <p><strong>Operating condition:</strong> Power-driven vessel, {{ definition.lighting.length }} m, underway in reduced visibility.</p>
        <p>Apply the lights to the vessel. Use the camera controls to inspect their appearance. During this exercise, these switches control the vessel's lights.</p>
        <svg viewBox="0 0 440 180" class="light-diagram" role="img" aria-label="Applied vessel navigation lights">
          <path d="M30 95 L330 95 L410 130 L330 165 L30 165 Z" fill="#244257" stroke="#b0d4e4" />
          <g v-for="lamp in diagram" :key="lamp.key"><circle :cx="lamp.x" :cy="lamp.y" r="9" :fill="lights[lamp.key]?lamp.color:'#526171'" /><text :x="lamp.x" :y="lamp.y-14" text-anchor="middle">{{ lamp.label }}</text></g>
        </svg>
        <div class="light-toggles"><label v-for="lamp in lightLabels" :key="lamp.key"><input v-model="lights[lamp.key]" type="checkbox" :disabled="saved" @change="emitLights" />{{ lamp.label }}</label></div>
      </template>
      <p v-if="error" role="alert" class="error">{{ error }}</p>
      <p v-if="saved" role="status">Configuration recorded. Continue the mission and dock to see the result.</p>
      <footer><button v-if="!saved" type="button" :disabled="saving || !runId" @click="apply">{{ saving?'Recording…':definition.chart?'Apply chart plan':'Apply navigation lights' }}</button><button type="button" @click="opened=false">Return to simulation</button></footer>
    </section>
  </div>
  </div>
</template>
<script setup>
import { ref,computed,watch,nextTick,onBeforeUnmount } from 'vue';
import { chartProject,chartUnproject,LIGHT_KEYS } from '../../shared/lessonScoring.js';
import { SAFETY_RULES } from '../../shared/simulationSafety.js';
import { submitLearningLessonTask } from '../api/firebaseApi.js';
const props=defineProps({definition:Object,activityId:String,runId:String,review:Boolean});
const emit=defineEmits(['lights-change','panel-change']);
const safetyRules=computed(()=>Object.fromEntries(Object.entries(SAFETY_RULES).filter(([key])=>!['INCORRECT_LIGHTS','LIGHTS_NOT_APPLIED'].includes(key) || props.definition.outcomes.some(o=>o.key==='lighting'))));
const opened=ref(false),saved=ref(false),saving=ref(false),error=ref(''),projection=ref('equirectangular'),readingLat=ref(''),readingLon=ref(''),plots=ref([]),chartElement=ref(null),dialog=ref(null);
const lights=ref(Object.fromEntries(LIGHT_KEYS.map(key=>[key,false]))),controller=new AbortController();
const chart=computed(()=>props.definition?.chart),reference=computed(()=>chartProject(chart.value.reference,chart.value.bounds,projection.value));
const plotted=computed(()=>plots.value.map(p=>chartProject(p,chart.value.bounds,projection.value))),plotLine=computed(()=>plotted.value.map(p=>`${55+p.x*550},${25+p.y*350}`).join(' '));
const ticks=[0,.2,.4,.6,.8,1];
const lightLabels=[{key:'port',label:'Port sidelight · red'},{key:'starboard',label:'Starboard sidelight · green'},{key:'masthead',label:'Forward masthead · white'},{key:'aftMasthead',label:'Aft masthead · white'},{key:'stern',label:'Sternlight · white'},{key:'anchor',label:'Anchor light · white'}];
const diagram=[{key:'port',label:'Port',x:300,y:75,color:'#ff3535'},{key:'starboard',label:'Starboard',x:300,y:175,color:'#26ff6c'},{key:'masthead',label:'Forward masthead',x:250,y:50,color:'white'},{key:'aftMasthead',label:'Aft masthead',x:110,y:35,color:'white'},{key:'stern',label:'Stern',x:30,y:130,color:'white'},{key:'anchor',label:'Anchor',x:170,y:80,color:'white'}];
let priorFocus;
watch(opened,async value=>{emit('panel-change',value);if(value){priorFocus=document.activeElement;await nextTick();dialog.value?.focus();}else if(priorFocus?.isConnected)priorFocus.focus();});
onBeforeUnmount(()=>{controller.abort();emit('panel-change',false);});
function trapKeys(event){if(event.key==='Escape'){opened.value=false;return;}if(event.key!=='Tab')return;const controls=[...dialog.value.querySelectorAll('button:not(:disabled),input:not(:disabled),select:not(:disabled)')];const first=controls[0],last=controls.at(-1);if(event.shiftKey && (document.activeElement===first || document.activeElement===dialog.value)){event.preventDefault();last?.focus();}else if(!event.shiftKey && (document.activeElement===last || document.activeElement===dialog.value)){event.preventDefault();first?.focus();}}
function plot(event){if(saved.value || !chart.value || plots.value.length>=chart.value.targets.length)return;const matrix=chartElement.value.getScreenCTM();if(!matrix)return;const p=new DOMPoint(event.clientX,event.clientY).matrixTransform(matrix.inverse());const normalized={x:(p.x-55)/550,y:(p.y-25)/350};if(normalized.x<0 || normalized.x>1 || normalized.y<0 || normalized.y>1)return;plots.value.push(chartUnproject(normalized,chart.value.bounds,projection.value));}
function emitLights(){emit('lights-change',{...lights.value});}
async function apply(){if(saving.value || saved.value || !props.runId || props.review)return;saving.value=true;error.value='';try{const fields=chart.value?{projection:projection.value,reading:{lat:readingLat.value===''?null:Number(readingLat.value),lon:readingLon.value===''?null:Number(readingLon.value)},plots:plots.value}:{lights:lights.value};await submitLearningLessonTask(props.activityId,{...fields,lessonRunId:props.runId},{signal:controller.signal});saved.value=true;}catch(err){if(!controller.signal.aborted)error.value=err.message;}finally{saving.value=false;}}
</script>
<style scoped>
.lesson-assessment{display:contents}
.lesson-tools{position:fixed;left:12px;top:245px;z-index:120;width:270px;max-height:45vh;overflow:auto;background:#0b1d30ed;border:1px solid #427089;border-radius:12px;padding:12px;box-sizing:border-box;color:#dcebf4;font:12px/1.5 Arial,sans-serif;pointer-events:auto}.lesson-tools p{margin:8px 0}.lesson-tools small{display:block;color:#afcedd;margin:5px 0}.lesson-tools strong{color:#6ed8ff}.saved{color:#7ee8b4;display:block;margin-top:8px}.lesson-tools button{padding:9px}.lesson-task-backdrop{position:fixed;inset:0;z-index:2400;background:#020914d9;display:flex;align-items:center;justify-content:center;padding:12px;box-sizing:border-box;pointer-events:auto;cursor:auto}.lesson-task-dialog{width:min(780px,100%);max-height:94vh;overflow:auto;border:1px solid #42647b;border-radius:14px;background:#10273d;color:#dcebf4;padding:20px;font:14px/1.5 Arial,sans-serif;box-sizing:border-box}.lesson-task-dialog header{display:flex;align-items:center;justify-content:space-between;gap:15px}h2{font-size:21px}label{display:block;margin:10px 0}input[type=number],select{display:block;width:100%;box-sizing:border-box;background:#07182a;color:#e5f4ff;border:1px solid #4c718a;border-radius:7px;padding:9px}button{border:1px solid #3f82a5;background:#31bff0;color:#061422;border-radius:7px;padding:10px 13px;font:inherit;cursor:pointer;margin:5px 8px 5px 0}button:disabled{opacity:.5;cursor:default}.training-chart{width:100%;background:#e9f8f8;border-radius:8px;cursor:crosshair;touch-action:manipulation}.training-chart text{fill:#173a4a;font:11px Arial,sans-serif;pointer-events:none}.coordinate-inputs{display:grid;grid-template-columns:1fr 1fr;gap:14px}.light-diagram{width:100%;max-height:220px}.light-diagram text{fill:#dfedf5;font:10px Arial,sans-serif}.light-toggles{display:grid;grid-template-columns:1fr 1fr;gap:8px}.light-toggles label{padding:8px;background:#0a1b2c;border-radius:7px}.error{color:#ffaaaa}footer{margin-top:14px}@media(max-width:700px){.lesson-tools{top:auto;bottom:112px;left:8px;width:210px;max-height:24vh;font-size:11px;padding:8px}.coordinate-inputs,.light-toggles{grid-template-columns:1fr}.lesson-task-dialog{padding:14px}h2{font-size:18px}}
</style>
