<template>
  <section v-if="section" class="lc-official-matrix" aria-label="Official syllabus information">
    <div class="lc-official-heading"><span class="lc-label">OFFICIAL SYLLABUS · {{ section.weeks }}</span><small>Source: page{{ section.sourcePages.length > 1 ? 's' : '' }} {{ section.sourcePages.join(', ') }}</small></div>
    <div v-for="field in fields" :key="field.key" class="lc-matrix-field"><h4>{{ field.label }}</h4><ul><li v-for="(text, index) in section[field.key]" :key="index">{{ text }}</li></ul></div>
    <p class="lc-matrix-note">Official syllabus wording is preserved. Instructor-created notes and uploaded resources are shown separately.</p>
    <template v-if="course">
      <h4>Official course description</h4><p>{{ course.description }}</p><p>{{ course.credits }} · {{ course.contactHours }} · Pre-requisite: {{ course.prerequisite }}</p>
      <h4>Course learning outcomes</h4><ul><li v-for="outcome in course.outcomes" :key="outcome.id"><strong>{{ outcome.id }}.</strong> {{ outcome.text }}</li></ul>
      <div class="lc-grading"><h4>Official grading structure</h4><p>Summative Assessments: <b>60%</b> · Performance Tasks/Written Outputs: <b>40%</b></p><p>Passing score: {{ course.grading.passingScore }}</p><p>Simulation scores and XP are training results. They are not automatically converted into final academic grades.</p></div>
    </template>
  </section>
</template>
<script setup>
defineProps({ section: Object, course: Object });
const fields = [{ key: 'content', label: 'Course Content' }, { key: 'outcomes', label: 'Desired Learning Outcomes' }, { key: 'teachingActivities', label: 'Teaching and Learning Activities (TLAs)' }, { key: 'assessmentTasks', label: 'Assessment Tasks (ATs)' }, { key: 'submissionModes', label: 'Mode of Submission' }, { key: 'resources', label: 'Resource Materials' }];
</script>
