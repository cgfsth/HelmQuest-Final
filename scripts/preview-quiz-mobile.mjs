// Render the real quiz template/styles in isolation for browser viewport checks.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import * as Vue from 'vue';
import { compile } from '@vue/compiler-dom';
import { parse } from '@vue/compiler-sfc';
import { renderToString } from '@vue/server-renderer';

const { descriptor } = parse(readFileSync(new URL('../src/components/PostDockingQuizModal.vue', import.meta.url), 'utf8'));
const render = new Function('Vue', compile(descriptor.template.content, { mode: 'function', prefixIdentifiers: true }).code)(Vue);
const question = { id: 'question', type: 'multiple-choice', prompt: 'Which action should you take before reporting your mission after returning safely to port?',
  options: ['Stop the engine and deploy the anchor.', 'Keep moving.', 'Leave the engine running.', 'Report before docking.',
    'Check your surroundings and confirm that the boat is safely secured before submitting the report.'] };
const bindings = {
  isVisible: true, isLoading: false, isSubmitting: false,
  quiz: { title: 'Test Mission 2', description: 'Complete the following questions.', questions: [question] },
  currentQuestion: question, currentQuestionIndex: 0, totalQuestions: 1, progressPercentage: 100,
  answers: { question: question.options[0] }, getQuestionTypeLabel: () => 'Multiple Choice', getOptionText: value => value,
  handleClose() {}, selectAnswer() {}, nextQuestion() {}, previousQuestion() {}, handleSubmit() {}
};
const html = await renderToString(Vue.createSSRApp({ render, setup: () => bindings }));
const output = resolve('dist/quiz-mobile-check');
mkdirSync(output, { recursive: true });
writeFileSync(resolve(output, 'index.html'), `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>
html,body{margin:0;background:#0b1925;font-family:Arial,sans-serif}button,input{font:inherit}
${descriptor.styles.map(style => style.content).join('\n')}
</style></head><body>${html}<script>
const modal = document.querySelector('.quiz-modal');
const question = document.querySelector('.question-container');
const footer = document.querySelector('.quiz-navigation');
const box = element => { const { x, y, width, height, bottom, right } = element.getBoundingClientRect(); return { x, y, width, height, bottom, right }; };
const result = { viewport: { width: innerWidth, height: innerHeight }, modal: box(modal), footer: box(footer),
  scrollable: question.scrollHeight > question.clientHeight, footerVisible: box(footer).bottom <= innerHeight,
  fitsWidth: document.documentElement.scrollWidth <= innerWidth };
document.body.dataset.validation = JSON.stringify(result);
</script></body></html>`);
console.log(resolve(output, 'index.html'));
