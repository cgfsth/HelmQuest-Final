<template>
  <section class="lm-reader" aria-label="PDF reader">
    <header class="lm-reader-heading"><button type="button" @click="$emit('back')"><ArrowLeft :size="18" /> Back</button><div><span class="lm-eyebrow">DOCUMENT READER</span><h2>{{ document.title }}</h2></div></header>
    <p v-if="loading" class="lm-empty" role="status">Opening PDF document…</p>
    <div v-else-if="error" class="lm-alert lm-error" role="alert"><p>{{ error }}</p><button type="button" @click="load">Try again</button></div>
    <template v-else-if="pdf">
      <div class="lm-reader-controls" aria-label="PDF controls">
        <div class="lm-actions"><button type="button" :disabled="page <= 1" aria-label="Previous page" @click="jump(page - 1)"><ChevronLeft :size="18" /></button><label>Page <input v-model.number="pageInput" type="number" min="1" :max="pdf.numPages" aria-label="Page number" @keydown.enter.prevent="jump(pageInput)" @change="jump(pageInput)" /> of {{ pdf.numPages }}</label><button type="button" :disabled="page >= pdf.numPages" aria-label="Next page" @click="jump(page + 1)"><ChevronRight :size="18" /></button></div>
        <div class="lm-actions"><button type="button" :disabled="zoom <= .5" aria-label="Zoom out" @click="zoom = Math.max(.5, zoom - .25)"><Minus :size="18" /></button><output aria-live="polite">{{ Math.round(zoom * 100) }}%</output><button type="button" :disabled="zoom >= 2" aria-label="Zoom in" @click="zoom = Math.min(2, zoom + .25)"><Plus :size="18" /></button><button type="button" @click="zoom = 1"><ScanLine :size="17" /> Fit width</button></div>
      </div>
      <p class="lm-reader-hint">Scroll to read all pages. Select text to copy or use your screen reader.</p>
      <div ref="scrollArea" class="lm-reader-pages" tabindex="0" aria-label="Scrollable PDF pages" @scroll.passive="trackPage">
        <PdfPage v-for="number in pdf.numPages" :key="number" :pdf="pdf" :number="number" :width="width" :zoom="zoom" :scroll-root="scrollArea" />
      </div>
    </template>
  </section>
</template>
<script setup>
import { nextTick, onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue';
import { ArrowLeft, ChevronLeft, ChevronRight, Minus, Plus, ScanLine } from '@lucide/vue';
import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { getLearningPdf } from '../../api/firebaseApi.js';
import PdfPage from './PdfPage.vue';
GlobalWorkerOptions.workerSrc = workerUrl;
const props = defineProps({ document: { type: Object, required: true } });
defineEmits(['back']);
const pdf = shallowRef(null), scrollArea = ref(null), loading = ref(true), error = ref('');
const page = ref(1), pageInput = ref(1), zoom = ref(1), width = ref(600);
let controller, task, resize, alive = true, frame;
async function load() {
  controller?.abort(); controller = new AbortController(); const signal = controller.signal;
  task?.destroy(); task = null; pdf.value = null; loading.value = true; error.value = '';
  try {
    const bytes = await getLearningPdf(props.document.kind, props.document.id, { signal });
    if (!alive || signal.aborted) return;
    const assets = `${import.meta.env.BASE_URL}pdfjs-assets/`;
    const loadingTask = task = getDocument({ data: bytes, cMapUrl: `${assets}cmaps/`, standardFontDataUrl: `${assets}standard_fonts/`, wasmUrl: `${assets}wasm/`, iccUrl: `${assets}iccs/`, enableXfa: false, maxImageSize: 16777216, canvasMaxAreaInBytes: 33554432 });
    loadingTask.onPassword = () => { error.value = 'This PDF is password protected. Ask your instructor for an accessible copy.'; loading.value = false; loadingTask.destroy(); };
    const result = await loadingTask.promise;
    if (!alive || signal.aborted) { await result.destroy(); return; }
    pdf.value = result; page.value = pageInput.value = 1;
  } catch (err) { if (alive && !signal.aborted && !error.value) error.value = err.message || 'Unable to read this PDF. Try again or contact your instructor.'; }
  finally { if (alive && !signal.aborted) loading.value = false; }
}
function jump(number) {
  const value = Number(number);
  if (!Number.isInteger(value) || value < 1 || value > pdf.value.numPages) { pageInput.value = page.value; return; }
  const target = scrollArea.value?.querySelector(`[data-pdf-page="${value}"]`);
  if (target) { scrollArea.value.scrollTop += target.getBoundingClientRect().top - scrollArea.value.getBoundingClientRect().top - 16; page.value = pageInput.value = value; }
}
function trackPage() {
  if (frame) return;
  frame = requestAnimationFrame(() => {
    frame = null; if (!scrollArea.value) return;
    const top = scrollArea.value.getBoundingClientRect().top;
    let closest = 1, distance = Infinity;
    for (const item of scrollArea.value.querySelectorAll('[data-pdf-page]')) { const value = Math.abs(item.getBoundingClientRect().top - top); if (value < distance) { closest = Number(item.dataset.pdfPage); distance = value; } }
    page.value = pageInput.value = closest;
  });
}
watch(scrollArea, async area => {
  resize?.disconnect();
  if (area) { await nextTick(); resize = new ResizeObserver(() => { width.value = Math.max(180, area.clientWidth - 40); }); resize.observe(area); width.value = Math.max(180, area.clientWidth - 40); }
});
onMounted(load);
onBeforeUnmount(() => { alive = false; controller?.abort(); resize?.disconnect(); if (frame) cancelAnimationFrame(frame); task?.destroy(); });
</script>
<style>
.lm-reader { min-width:0; }
.lm-reader-heading { display:flex; align-items:flex-start; gap:18px; margin-bottom:20px; }
.lm-reader-heading h2 { margin-top:5px; }
.lm-reader-controls { display:flex; justify-content:space-between; gap:12px; flex-wrap:wrap; padding:12px; background:#12253a; border:1px solid var(--lm-border); border-radius:12px 12px 0 0; }
.lm-reader-controls label { display:flex; align-items:center; gap:7px; font-size:.84rem; }
.lm-reader-controls input { width:60px; padding:10px 6px; text-align:center; }
.lm-reader-controls .lm-actions { gap:7px; }
.lm-reader-controls output { min-width:45px; text-align:center; font-size:.85rem; }
.lm-reader-hint { padding:10px 12px; background:#0e1e30; font-size:.76rem; }
.lm-reader-pages { position:relative; background:#080f1c; border:1px solid var(--lm-border); border-radius:0 0 12px 12px; height:72dvh; min-height:300px; max-height:1000px; overflow:auto; overscroll-behavior:contain; padding:20px; }
@media(max-width:600px) { .lm-reader-heading { flex-direction:column; gap:12px; } .lm-reader-controls { padding:10px; } .lm-reader-controls .lm-actions { gap:5px; } .lm-reader-controls button { padding:9px; } .lm-reader-pages { height:68dvh; } }
</style>
