<template>
  <section v-if="plan" class="lesson-scoring-setup">
    <h3>Scoring for the selected lesson outcomes</h3>
    <p v-for="outcome in plan.outcomes" :key="outcome.key">{{ outcome.text }}</p>
    <p v-if="plan.mode==='knowledge'">The simulation provides learning practice. The final quiz records knowledge evidence for these outcomes; navigation completion does not award an outcome score.</p>
    <template v-else>
      <p v-for="criterion in plan.criteria" :key="criterion.key">{{ criterion.label }}: {{ Math.round(criterion.weight*10000)/100 }}%</p>
      <p>These criteria replace the generic 40/40/20 rubric for this mission. Missing practical tasks receive zero; quiz scores remain separate.</p>
      <p>Safety compliance includes navigation-light configuration, unsafe anchoring, engine running when anchoring at the dock, propulsion with the anchor or nets down, and collisions with the port, land, buoys, nets or another vessel. Each deduction appears in the result.</p>
    </template>
    <template v-if="plan.chart && model.chartExercise">
      <h4>Training chart exercise</h4>
      <label>Required projection<select v-model="model.chartExercise.projection"><option value="mercator">Mercator</option><option value="equirectangular">Equirectangular</option></select></label>
      <div class="coordinate-pair"><label>Reference M latitude<input v-model.number="model.chartExercise.reference.lat" type="number" step="0.00001" /></label><label>Reference M longitude<input v-model.number="model.chartExercise.reference.lon" type="number" step="0.00001" /></label></div>
      <div v-for="(point,index) in model.chartExercise.targets" :key="index" class="coordinate-pair"><label>Route point {{ index+1 }} latitude<input v-model.number="point.lat" type="number" step="0.00001" /></label><label>Route point {{ index+1 }} longitude<input v-model.number="point.lon" type="number" step="0.00001" /></label></div>
      <div class="coordinate-pair"><label>Coordinate tolerance (m)<input v-model.number="model.chartExercise.coordinateTolerance" type="number" min="20" max="2000" /></label><label>Route plot tolerance (m)<input v-model.number="model.chartExercise.plotTolerance" type="number" min="20" max="2000" /></label></div>
      <small>Keep points inside the training chart: {{ model.chartExercise.bounds.south }}–{{ model.chartExercise.bounds.north }}° latitude, {{ model.chartExercise.bounds.west }}–{{ model.chartExercise.bounds.east }}° longitude. This exercise samples chart skills; it is not an operational chart or certification of expert competence.</small>
    </template>
    <p v-if="plan.lighting">Students configure the navigation lights of their {{ plan.lighting.length }} m power-driven vessel, underway in reduced visibility. Choose a crossing-vessel exercise for the give-way outcome.</p>
  </section>
</template>
<script setup>
import { computed } from 'vue';
import { lessonScoringDefinition } from '../../shared/lessonScoring.js';
const props=defineProps({outcomes:[String,Array],model:{type:Object,required:true}});
const plan=computed(()=>lessonScoringDefinition(props.outcomes,{boatType:props.model.boatType}));
</script>
<style scoped>
.lesson-scoring-setup{border:1px solid #3c7994;background:#10263a;border-radius:10px;padding:16px;color:#cee6f3;margin:18px 0;font-size:.88rem;line-height:1.6}h3{color:#72d8ff;margin-top:0}label{display:block;margin:10px 0}input,select{display:block;width:100%;box-sizing:border-box;padding:9px;border:1px solid #3f6077;background:#09182a;color:#e1f1fa;border-radius:6px;font:inherit}.coordinate-pair{display:grid;grid-template-columns:1fr 1fr;gap:12px}small{color:#a2c4d7}@media(max-width:550px){.coordinate-pair{grid-template-columns:1fr}}
</style>
