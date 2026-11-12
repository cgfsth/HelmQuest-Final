import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { parse, compileScript, compileTemplate } from '@vue/compiler-sfc';

const apiSource = readFileSync(new URL('../src/api/firebaseApi.js', import.meta.url), 'utf8');
const loadApi = () => import(`data:text/javascript;base64,${Buffer.from(apiSource + `\n// ${Math.random()}`).toString('base64')}`);
test('materials API keeps server authorization in headers for JSON and PDF requests', async () => {
  const original = globalThis.fetch, requests = [];
  globalThis.fetch = async (url, options) => {
    requests.push({ url, options });
    if (url.endsWith('/auth/demo-login')) return { ok: true, json: async () => ({ sessionToken: 'signed-session' }) };
    if (url.endsWith('/pdf')) return { ok: true, arrayBuffer: async () => Uint8Array.from([37,80,68,70]).buffer };
    return { ok: true, json: async () => ({ syllabi: [] }) };
  };
  try {
    const api = await loadApi();
    await api.ensureLearningMaterialsSession('admin@helmquest.local','password');
    await api.ensureLearningMaterialsSession('admin@helmquest.local','password');
    await api.listLearningSyllabi({ search: 'Navigation & steering', instructorId:'a' });
    const bytes = await api.getLearningPdf('module','id/escape');
    assert.deepEqual([...bytes],[37,80,68,70]); assert.equal(requests.filter(req => req.url.endsWith('/auth/demo-login')).length,1);
    for (const req of requests.slice(1)) { assert.equal(req.options.headers.Authorization,'Bearer signed-session'); assert.ok(!req.url.includes('signed-session')); }
    assert.match(requests.at(-1).url,/modules\/id%2Fescape\/pdf$/); assert.equal(requests.at(-1).options.cache,'no-store');
    assert.match(requests[1].url,/search=Navigation\+%26\+steering/);
    api.clearSession(); await api.listLearningSyllabi(); assert.equal(requests.at(-1).options.headers.Authorization,undefined);
    await assert.rejects(api.ensureLearningMaterialsSession('', ''), /sign in again/);
  } finally { globalThis.fetch = original; }
});

test('multipart upload sends PDF bytes, progress, revision and Bearer header without forcing Content-Type', async () => {
  const originalFetch = globalThis.fetch, originalXhr = globalThis.XMLHttpRequest;
  let xhr;
  class FakeXhr {
    constructor() { xhr = this; this.upload = {}; this.headers = {}; }
    open(method,url) { this.method = method; this.url = url; }
    setRequestHeader(key,value) { this.headers[key] = value; }
    send(data) { this.data = data; }
    abort() { this.onabort(); }
  }
  globalThis.XMLHttpRequest = FakeXhr;
  globalThis.fetch = async () => ({ ok:true,json:async () => ({ sessionToken:'real-session' }) });
  try {
    const api = await loadApi(); await api.loginDemo('admin@helmquest.local','password');
    const progress = [], controller = new AbortController();
    const file = new File(['%PDF-1.4\n%%EOF'],'module.pdf',{type:'application/pdf'});
    const promise = api.saveLearningMaterial({ kind:'module',id:'m1',fields:{title:'Steering',moduleNumber:2,revision:4},file,onProgress:value => progress.push(value),signal:controller.signal });
    assert.equal(xhr.method,'PUT'); assert.match(xhr.url,/modules\/m1$/); assert.equal(xhr.headers.Authorization,'Bearer real-session'); assert.equal(xhr.headers['Content-Type'],undefined);
    assert.equal(xhr.data.get('revision'),'4'); assert.equal(xhr.data.get('file').name,'module.pdf');
    xhr.upload.onprogress({lengthComputable:true,loaded:50,total:100}); xhr.upload.onprogress({lengthComputable:true,loaded:100,total:100});
    let settled = false; promise.then(() => { settled=true; }); await Promise.resolve(); assert.equal(settled,false);
    xhr.status=200; xhr.responseText='{"id":"m1"}'; xhr.onload(); assert.equal((await promise).id,'m1'); assert.deepEqual(progress,[50,100]);
    const failed = api.saveLearningMaterial({kind:'syllabus',fields:{title:'x'}}); xhr.status=409; xhr.responseText='{"message":"Refresh first"}'; xhr.onload(); await assert.rejects(failed,/Refresh first/);
    const cancel = new AbortController(); const aborted = api.saveLearningMaterial({kind:'syllabus',fields:{},signal:cancel.signal}); cancel.abort(); await assert.rejects(aborted,{name:'AbortError'});
    const already = new AbortController(); already.abort(); await assert.rejects(api.saveLearningMaterial({kind:'syllabus',fields:{},signal:already.signal}),{name:'AbortError'});
  } finally { globalThis.fetch=originalFetch; globalThis.XMLHttpRequest=originalXhr; }
});

test('a delayed materials admin session cannot overwrite a newly signed-in student session', async () => {
  const original = globalThis.fetch, requests = []; let release;
  globalThis.fetch = async (url, options) => {
    requests.push({url,options});
    if (url.endsWith('/auth/demo-login')) {
      if (JSON.parse(options.body).email.startsWith('admin')) return new Promise(resolve=>{release=()=>resolve({ok:true,json:async()=>({sessionToken:'old-admin'})});});
      return {ok:true,json:async()=>({sessionToken:'new-student'})};
    }
    return {ok:true,json:async()=>({syllabi:[]})};
  };
  try {
    const api = await loadApi();
    const pending = api.ensureLearningMaterialsSession('admin@test','password');
    await api.loginDemo('student@test','password');release();
    await assert.rejects(pending,{name:'AbortError'});await api.listLearningSyllabi();
    assert.equal(requests.at(-1).options.headers.Authorization,'Bearer new-student');
  } finally { globalThis.fetch=original; }
});

test('new Vue screens compile and all three portals mount the scoped shared library', () => {
  for (const name of ['LearningMaterials','PdfDocumentViewer','PdfPage']) {
    const source = readFileSync(new URL(`../src/components/materials/${name}.vue`,import.meta.url),'utf8');
    const { descriptor, errors } = parse(source); assert.deepEqual(errors,[]);
    const compiled = compileScript(descriptor,{id:name});
    const result = compileTemplate({source:descriptor.template.content,filename:name+'.vue',id:name,compilerOptions:{bindingMetadata:compiled.bindings}});
    assert.deepEqual(result.errors,[]);
  }
  const app = readFileSync(new URL('../src/App.vue',import.meta.url),'utf8');
  const admin = readFileSync(new URL('../src/components/admin/AdminDashboard.vue',import.meta.url),'utf8');
  assert.match(app,/<BookOpen[^>]+aria-hidden="true" \/> Syllabus &amp; Lessons/);
  assert.match(app,/<LearningMaterials[^>]+instructorTab === 'materials'[^>]+role="instructor"/);
  assert.match(app,/<LearningMaterials[^>]+hubTab === 'materials' && !isStudentPending[^>]+role="student"/);
  assert.match(admin,/<LearningMaterials[^>]+role="admin"/);
});
