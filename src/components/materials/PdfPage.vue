<template>
  <article ref="root" class="lm-pdf-page" :data-pdf-page="number" :style="{ width: pageWidth + 'px', minHeight: pageHeight + 'px', '--total-scale-factor': scale }" :aria-label="'Page ' + number">
    <div v-if="error" class="lm-pdf-error" role="alert">Page {{ number }} could not be rendered. <button type="button" @click="render">Retry</button></div>
    <template v-else><canvas ref="canvas" aria-hidden="true" /><div ref="text" class="lm-pdf-text" /></template>
    <span v-if="!rendered && !error" class="lm-pdf-placeholder">Page {{ number }}</span>
  </article>
</template>
<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { TextLayer } from 'pdfjs-dist';
const props = defineProps({ pdf: { type: Object, required: true }, number: { type: Number, required: true }, width: { type: Number, required: true }, zoom: { type: Number, required: true }, scrollRoot: { type: Object, default: null } });
const emit = defineEmits(['rendered']);
const root = ref(null), canvas = ref(null), text = ref(null), ratio = ref(1.4142), nativeWidth = ref(595), rendered = ref(false), error = ref('');
const pageWidth = computed(() => props.width * props.zoom), pageHeight = computed(() => pageWidth.value * ratio.value), scale = computed(() => pageWidth.value / nativeWidth.value);
let observer, visible = false, renderTask, textTask, version = 0, alive = true;
async function render() {
  if (!visible || !alive) return;
  const ticket = ++version; renderTask?.cancel(); textTask?.cancel();
  rendered.value = false; error.value = '';
  try {
    const page = await props.pdf.getPage(props.number);
    if (!alive || ticket !== version) return;
    const base = page.getViewport({ scale: 1 }); nativeWidth.value = base.width; ratio.value = base.height / base.width;
    const viewport = page.getViewport({ scale: pageWidth.value / base.width });
    await nextTick(); if (!canvas.value || ticket !== version) return;
    // Bound each backing canvas; offscreen pages release their bitmap entirely.
    const outputScale = Math.min(window.devicePixelRatio || 1, 2, 4096 / viewport.width, 4096 / viewport.height, Math.sqrt(8000000 / (viewport.width * viewport.height)));
    canvas.value.width = Math.ceil(viewport.width * outputScale); canvas.value.height = Math.ceil(viewport.height * outputScale);
    canvas.value.style.width = viewport.width + 'px'; canvas.value.style.height = viewport.height + 'px';
    const task = renderTask = page.render({ canvasContext: canvas.value.getContext('2d'), viewport, transform: [outputScale, 0, 0, outputScale, 0, 0] });
    await task.promise;
    if (!alive || ticket !== version) return;
    const content = await page.getTextContent();
    if (!alive || ticket !== version) return;
    text.value.replaceChildren(); textTask = new TextLayer({ textContentSource: content, container: text.value, viewport });
    await textTask.render();
    if (ticket === version) { rendered.value = true; emit('rendered', props.number); }
  } catch (err) { if (alive && ticket === version && err.name !== 'RenderingCancelledException' && err.name !== 'AbortException') error.value = 'Rendering failed'; }
}
function release() { version++; renderTask?.cancel(); textTask?.cancel(); if (canvas.value) { canvas.value.width = 0; canvas.value.height = 0; } text.value?.replaceChildren(); rendered.value = false; }
watch(() => [props.width, props.zoom], render);
onMounted(() => {
  observer = new IntersectionObserver(entries => {
    for (const entry of entries) { visible = entry.isIntersecting; if (visible) render(); else release(); }
  }, { root: props.scrollRoot, rootMargin: '400px' }); observer.observe(root.value);
});
onBeforeUnmount(() => { alive = false; observer?.disconnect(); release(); });
</script>
<style>
.lm-pdf-page { position:relative; background:#fff; color:#111; margin:0 auto 20px; box-shadow:0 4px 20px #0007; overflow:hidden; }
.lm-pdf-page canvas { display:block; }
.lm-pdf-placeholder { position:absolute; inset:20px auto auto 20px; color:#666; font-size:.85rem; pointer-events:none; }
.lm-pdf-error { padding:24px; color:#742135; }
.lm-pdf-text { position:absolute; inset:0; text-align:initial; line-height:1; letter-spacing:normal; word-spacing:normal; text-size-adjust:none; transform-origin:0 0; --min-font-size:1; --text-scale-factor:calc(var(--total-scale-factor) * var(--min-font-size)); --min-font-size-inv:calc(1 / var(--min-font-size)); }
.lm-pdf-text :is(span,br) { color:transparent; position:absolute; white-space:pre; cursor:text; transform-origin:0 0; user-select:text; }
.lm-pdf-text>:not(.markedContent),.lm-pdf-text .markedContent span:not(.markedContent) { --font-height:0; font-size:calc(var(--text-scale-factor) * var(--font-height)); --scale-x:1; --rotate:0deg; transform:rotate(var(--rotate)) scaleX(var(--scale-x)) scale(var(--min-font-size-inv)); }
.lm-pdf-text .markedContent { display:contents; }
.lm-pdf-text ::selection { background:#2563eb55; }
</style>
