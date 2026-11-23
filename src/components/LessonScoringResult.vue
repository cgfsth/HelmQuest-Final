<template>
  <section class="lesson-scoring-result" aria-label="Lesson learning outcome results">
    <div class="score-heading"><strong>{{ report.mode==='knowledge'?'SIMULATION PRACTICE':report.passed?'PASS':'FAIL' }}</strong><span>{{ report.score==null?'Final quiz assesses these outcomes':report.score+'%' }}</span></div>
    <p v-if="report.mode==='knowledge'">Navigation practice is recorded separately. Buoy visits and docking do not prove knowledge of the lesson. Review the final-quiz evidence below.</p>
    <p v-else>Lesson {{ report.lesson }} practical score · Pass score {{ passScore }}%. The criteria below use the recorded practical task, not a generic navigation percentage.</p>
    <p v-if="report.status==='not-attempted'" class="failure">A required practical task was not recorded. Complete the instrument task and vessel exercise before passing.</p>
    <p v-if="report.lesson===3">This training-chart exercise samples coordinate, projection and plotting skills. Broader chart interpretation still needs instructor assessment.</p>
    <dl v-if="report.rubric.length"><div v-for="criterion in report.rubric" :key="criterion.key"><dt>{{ criterion.label }} · {{ Math.round(criterion.weight*10000)/100 }}%</dt><dd>{{ criterion.attempted?criterion.score+'%':'Not attempted · 0%' }}</dd></div></dl>
    <p v-if="criticalSafetyFailure" class="failure">Vessel collision: safety requirement not met.</p>
    <details v-if="report.safety" open class="safety-breakdown"><summary>Safety compliance · {{ report.safety.score }}%</summary><p>Starts at 100. Navigation lights, anchoring, engine use, nets and collisions are included here.</p><ul v-if="report.safety.deductions.length"><li v-for="(event,index) in report.safety.deductions" :key="index">{{ event.label }}: −{{ event.points }} safety points</li></ul><p v-else>No recorded safety violations.</p></details>
    <article v-for="outcome in outcomes" :key="outcome.key">
      <h3>{{ outcome.text }}</h3>
      <p>{{ outcome.method==='quiz'?'Final quiz':outcome.key==='lighting'?'Configuration evidence · included in Safety compliance':'Simulation practical' }} · {{ outcome.score==null?'Not assessed':outcome.score+'%' }}</p>
      <small v-if="outcome.evidence">{{ outcome.evidence }}</small>
      <small v-if="outcome.reviewRequired">The quiz checks terminology knowledge. A full discussion/explanation still needs instructor review.</small>
    </article>
    <details><summary>Navigation practice score</summary><p>{{ report.practiceScore }}% · Completion, handling and safety practice. This score does not replace the lesson-outcome rubric.</p></details>
  </section>
</template>
<script setup>
import { computed } from 'vue';
import { outcomeQuizScores } from '../../shared/lessonScoring.js';
const props=defineProps({report:{type:Object,required:true},quizResult:Object,passScore:Number,criticalSafetyFailure:Boolean});
const outcomes=computed(()=>outcomeQuizScores(props.report,props.quizResult));
</script>
<style scoped>
.lesson-scoring-result{color:#cfe1ec;font:14px/1.5 Arial,sans-serif;margin:12px 0;text-align:left}.score-heading{text-align:center;padding:18px;background:#12364b;border:1px solid #42748c;border-radius:12px}.score-heading strong{display:block;color:#63d1ff;font-size:13px;letter-spacing:.1em}.score-heading span{display:block;font-size:25px;margin-top:8px;font-weight:700}dl{margin:12px 0}dl>div{display:flex;gap:15px;justify-content:space-between;background:#0d1b2e;border:1px solid #2c465c;border-radius:7px;margin:7px 0;padding:9px}dd{margin:0;white-space:nowrap}article{padding:12px;background:#0c2031;border-radius:8px;margin:10px 0}h3{font-size:14px;margin:0}article p{margin:7px 0}small{display:block;color:#9fc4d8}summary{cursor:pointer;color:#71d3fa}.failure{color:#ffaaaa;font-weight:700}
</style>
