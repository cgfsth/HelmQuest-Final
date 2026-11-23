<template>
  <section class="buoy-editor" aria-labelledby="buoy-content-title">
    <header class="section-heading">
      <div><span class="eyebrow">LESSON REFERENCES</span><h3 id="buoy-content-title">Buoy learning material</h3></div>
      <button type="button" class="primary" :disabled="busy" @click="emit('add')">+ Add buoy</button>
    </header>
    <p class="intro">Choose the learning outcome, then add a picture and an explanation students can read at the buoy. Questions appear in the final quiz after docking.</p>

    <section v-if="aligned && outcomes.length" class="coverage" aria-label="Lesson outcome material checklist">
      <div class="coverage-heading"><strong>Lesson outcome coverage</strong><span aria-live="polite">{{ readyCount }}/{{ outcomes.length }} with complete material</span></div>
      <ul>
        <li v-for="(outcome,index) in outcomes" :key="outcome">
          <div><span class="outcome-number">{{ index+1 }}</span><p>{{ outcome }}</p></div>
          <span v-if="readyFor(outcome)" class="status ready">Material complete</span>
          <button v-else-if="!assignedTo(outcome)" type="button" class="subtle" :disabled="busy" @click="emit('add',outcome)">+ Add supporting buoy</button>
          <span v-else class="status pending">Finish buoy material</span>
        </li>
      </ul>
      <small>This checklist checks the required fields. Review the picture and explanation for accuracy before publishing.</small>
    </section>

    <div v-if="!model.buoys.length" class="empty"><strong>Build the lesson one reference at a time</strong><p>Add a buoy for each outcome you want to explain. Its picture and explanation will appear together in the simulation.</p></div>

    <article v-for="(buoy,index) in model.buoys" :key="buoy.id" class="buoy-card">
      <header class="card-heading"><div><span class="buoy-number">{{ String(index+1).padStart(2,'0') }}</span><strong>{{ buoy.name || 'Untitled buoy' }}</strong></div><button type="button" class="remove" :disabled="busy" :aria-label="'Remove buoy '+(index+1)" @click="emit('remove',index)">Remove</button></header>
      <label v-if="aligned" class="field outcome-field"><span>1. Learning outcome <small>Required</small></span><select v-model="buoy.learningOutcome" :disabled="busy" :aria-label="'Learning outcome for buoy '+(index+1)"><option value="" disabled>Choose a lesson learning outcome</option><option v-for="outcome in outcomes" :key="outcome" :value="outcome">{{ outcome }}</option></select></label>
      <p v-if="aligned && outcomes.includes(buoy.learningOutcome)" class="selected-outcome">{{ buoy.learningOutcome }}</p>
      <p v-if="aligned && buoy.learningOutcome && !outcomes.includes(buoy.learningOutcome)" class="missing" role="alert">This outcome changed. Choose one of the current lesson outcomes.</p>
      <div v-if="aligned && outcomes.includes(buoy.learningOutcome)" class="assessment-note"><span>ASSESSMENT CONNECTION</span><strong>{{ assessmentFor(buoy.learningOutcome).label }}</strong><p>{{ assessmentFor(buoy.learningOutcome).guidance }}</p></div>

      <div class="material-fields">
        <div class="image-field"><label class="field"><span>{{ aligned?'2. Supporting picture':'Supporting picture' }} <small>Required</small></span><input type="file" accept="image/*" :disabled="busy" :aria-label="'Supporting picture for buoy '+(index+1)" @change="event=>emit('image',{event,buoy})" /></label><div class="image-preview"><img v-if="buoy.imageSrc" :src="buoy.imageSrc" :alt="buoy.name || 'Buoy reference picture'" /><span v-else>Upload the diagram, chart or vessel picture students should study.</span></div></div>
        <div class="copy-fields"><label class="field"><span>Checkpoint title</span><input v-model="buoy.name" :disabled="busy" :aria-label="'Title for buoy '+(index+1)" placeholder="e.g., Navigation branches" /></label><label class="field"><span>{{ aligned?'3. Picture explanation':'Picture explanation' }} <small>Required</small></span><textarea v-model="buoy.description" rows="6" :disabled="busy" :aria-label="'Picture explanation for buoy '+(index+1)" :placeholder="explanationPlaceholder(buoy.learningOutcome)" /></label></div>
      </div>

      <label class="field"><span>{{ aligned?'4. Student action at this buoy':'Student action at this buoy' }}</span><select v-model="buoy.requireInteraction" :disabled="busy" :aria-label="'Student action for buoy '+(index+1)"><option v-if="!aligned" value="">Navigate to checkpoint</option><option value="inspect_buoy">Inspect — open picture and explanation</option><option value="photograph">Photograph — take picture and read explanation</option><option v-if="!aligned" value="verify_id">Verify ID — enter buoy ID</option><option v-if="!aligned" value="remove_debris">Clean debris</option></select><small v-if="aligned">Both actions show the lesson material. Practical scoring follows the lesson's assessment plan.</small></label>
      <label v-if="!aligned" class="field"><span>Checkpoint / waypoint ID</span><input v-model="buoy.waypointZone" :disabled="busy" /></label>
      <div v-if="aligned" class="material-status" aria-live="polite"><span :class="complete(buoy)?'ready':'pending'">{{ complete(buoy)?'Material complete':missing(buoy).join(' · ') }}</span></div>
      <details class="student-preview"><summary>Student preview</summary><div class="preview-card"><small>SHOWN AT THIS BUOY</small><h4>{{ buoy.name || 'Checkpoint title' }}</h4><p v-if="buoy.learningOutcome" class="preview-outcome">{{ buoy.learningOutcome }}</p><img v-if="buoy.imageSrc" :src="buoy.imageSrc" :alt="buoy.name || 'Lesson picture'" /><div v-else class="preview-placeholder">Your picture will appear here</div><p class="preview-description">{{ buoy.description || 'Your explanation will appear below the picture.' }}</p></div></details>
    </article>
  </section>
</template>

<script setup>
import {computed} from 'vue';
import {lessonOutcomes} from '../../shared/lessonAlignment.js';
import {focusedLessonOutcomes} from '../../shared/lessonScoring.js';
const props=defineProps({model:{type:Object,required:true},savedOutcomes:[String,Array],busy:Boolean});
const emit=defineEmits(['add','remove','image']);
const aligned=computed(()=>!!props.model.outcomeAlignmentVersion);
const outcomes=computed(()=>lessonOutcomes(props.savedOutcomes || props.model.lessonOutcomes));
const assignedTo=outcome=>props.model.buoys.some(b=>b.learningOutcome===outcome);
function missing(buoy){return [!outcomes.value.includes(buoy.learningOutcome)?'Choose an outcome':'',!String(buoy.name || '').trim()?'Add a title':'',!buoy.imageSrc?'Add a picture':'',!String(buoy.description || '').trim()?'Add an explanation':''].filter(Boolean);}
const complete=buoy=>missing(buoy).length===0;
const readyFor=outcome=>props.model.buoys.some(b=>b.learningOutcome===outcome && complete(b));
const readyCount=computed(()=>outcomes.value.filter(readyFor).length);
function assessmentFor(outcome){
  const key=focusedLessonOutcomes([outcome])[0]?.key;
  if(key==='chart')return {label:'Chart workspace + final quiz',guidance:'Use a chart or coordinate diagram here. Students apply coordinate reading, route plotting and projection in the chart workspace.'};
  if(key==='giveWay')return {label:'Vessel encounter + final quiz',guidance:'Use a clear crossing-vessel picture. Explain the give-way and stand-on roles; the simulation records the actual vessel response.'};
  if(key==='lighting')return {label:'Safety compliance + final quiz',guidance:'Show the vessel lights and operating condition. Students apply the lights using the simulation controls; lighting errors are included in Safety compliance.'};
  if(key==='lightKnowledge')return {label:'Final quiz after docking',guidance:'Use vessel-light references that cover the three vessel types in your lesson. Link the final-quiz questions to this outcome.'};
  if(key==='branches' || key==='terms')return {label:'Final quiz after docking',guidance:'Use a labelled navigation reference and explain its terms or branches. Link the final-quiz questions to this outcome.'};
  return {label:'Knowledge check in the final quiz',guidance:'Explain how the picture supports this outcome. Outcomes that require a discussion or explanation also need instructor review.'};
}
function explanationPlaceholder(outcome){return outcome?'Explain what this picture shows and how it supports the selected learning outcome. Include the features or terms students should notice.':'Choose an outcome, then explain what students should learn from the picture.';}
</script>

<style scoped>
.field select{white-space:nowrap!important;text-overflow:ellipsis}.selected-outcome{font-size:12px;line-height:1.6;color:#c5dce9;margin:-5px 0 14px;white-space:normal}
.buoy-editor{color:#dce9f4;font:14px/1.55 Arial,sans-serif;margin:22px 0}.section-heading,.card-heading,.coverage-heading{display:flex;align-items:center;justify-content:space-between;gap:14px}.eyebrow{font-size:10px;font-weight:700;letter-spacing:.15em;color:#71d6fb}h3{font-size:19px;margin:4px 0}.intro{color:#b0c6d8;margin:12px 0 18px}.buoy-editor button{font:inherit;cursor:pointer;border-radius:8px;padding:9px 12px;white-space:normal}.primary{background:#30bef1;color:#071b2c;border:1px solid #68dcff;font-weight:700}.subtle{background:#142d42;color:#7bddff;border:1px solid #365f78;font-size:12px!important}.remove{background:transparent;color:#ffb6bd;border:1px solid #65404e;font-size:12px!important}.buoy-editor button:disabled{opacity:.55;cursor:default}.coverage{border:1px solid #2e5069;background:#0a1d2d;border-radius:12px;padding:15px}.coverage-heading{flex-wrap:wrap}.coverage-heading>span{color:#9fd8ee;font-size:12px}.coverage ul{list-style:none;margin:12px 0;padding:0}.coverage li{padding:12px 0;border-top:1px solid #233d52;display:flex;align-items:flex-start;justify-content:space-between;gap:12px}.coverage li>div{display:flex;gap:10px;min-width:0}.coverage p{margin:0;font-size:13px}.outcome-number{color:#76d8fa;font-size:12px;padding-top:2px}.status{flex-shrink:0;font-size:11px;padding:4px 7px;border-radius:5px;max-width:130px}.status.ready{background:#0f362f}.status.pending{background:#332b1b}.ready{color:#91e8c1}.pending{color:#f2d698}.coverage>small{color:#9cb6c8;font-size:11px}.empty{margin:16px 0;border:1px dashed #385a71;border-radius:12px;padding:24px;text-align:center;color:#b4cada}.empty p{margin-bottom:0}.buoy-card{margin-top:18px;padding:20px;border:1px solid #35566f;border-radius:13px;background:#12283b;overflow-wrap:anywhere}.card-heading{padding-bottom:15px;border-bottom:1px solid #2d4a61;margin-bottom:18px}.card-heading>div{display:flex;align-items:center;gap:12px;min-width:0}.buoy-number{background:#1d455d;border:1px solid #397693;border-radius:8px;padding:5px 9px;color:#83e2ff;font-size:13px}.field{display:block;margin:15px 0}.field>span{display:flex;align-items:center;gap:9px;margin-bottom:7px;font-weight:700;font-size:12px}.field small{font-size:11px;color:#a5bfd0;font-weight:400}.field>small{display:block;margin-top:7px}.field input,.field select,.field textarea{display:block;width:100%;box-sizing:border-box;border:1px solid #3b5970;border-radius:8px;background:#091a2b;color:#e4f1fa;padding:11px;font:inherit;font-size:13px;min-width:0}.field select{white-space:normal;min-height:45px}.field textarea{resize:vertical;min-height:145px;line-height:1.6}.field input[type=file]{font-size:11px;padding:9px}.field input::file-selector-button{padding:6px 8px;border:1px solid #45718e;border-radius:5px;background:#1e4058;color:#dff3ff;margin-right:7px}.field input::placeholder,.field textarea::placeholder{color:#8da7bc}.field input:focus,.field select:focus,.field textarea:focus{outline:2px solid #47c7f6;outline-offset:2px}.assessment-note{border-left:3px solid #44c8f4;background:#0a1e30;padding:12px 14px;border-radius:0 8px 8px 0}.assessment-note>span{display:block;font-size:9px;letter-spacing:.12em;color:#86bed6}.assessment-note strong{display:block;font-size:13px;margin-top:4px;color:#9de3fc}.assessment-note p{font-size:12px;color:#bdd1df;margin:6px 0 0}.material-fields{display:grid;grid-template-columns:minmax(0,.85fr) minmax(0,1.15fr);gap:18px}.image-preview{min-height:150px;display:flex;align-items:center;justify-content:center;border:1px dashed #3b5f78;border-radius:8px;background:#0a1c2c;text-align:center;overflow:hidden}.image-preview>span{padding:20px;color:#90adbf;font-size:12px}.image-preview img{display:block;width:100%;max-height:240px;object-fit:contain}.material-status{border-top:1px solid #2a475d;padding:12px 0 0;font-size:12px}.student-preview{margin-top:12px}.student-preview summary{color:#83dafb;cursor:pointer;padding:5px 0;font-size:12px}.preview-card{margin-top:12px;background:#0a1b2c;border:1px solid #34566d;border-radius:10px;padding:16px}.preview-card>small{font-size:9px;letter-spacing:.12em;color:#91b2c9}.preview-card h4{font-size:17px;margin:7px 0}.preview-outcome{color:#8edcfa;font-size:12px}.preview-card img{display:block;max-width:100%;max-height:240px;object-fit:contain;margin:14px auto}.preview-placeholder{border:1px dashed #33536a;padding:30px;text-align:center;color:#85a4bb;font-size:12px}.preview-description{white-space:pre-wrap;font-size:13px}.missing{color:#ffb9ba;font-size:12px}@media(max-width:700px){.material-fields{grid-template-columns:1fr;gap:0}.coverage li{flex-direction:column;gap:8px}.status{margin-left:17px;max-width:none}.buoy-card{padding:14px}.section-heading{align-items:flex-start}.primary{max-width:130px}.card-heading>div{gap:8px}.field select{font-size:12px}.coverage{padding:12px}.buoy-editor{font-size:13px}}
</style>
