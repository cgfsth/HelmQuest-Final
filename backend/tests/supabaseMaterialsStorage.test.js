import { expect, test } from '@jest/globals';
import request from 'supertest';
import { randomUUID } from 'node:crypto';
import { createMaterialsBucketProvider, createSupabaseMaterialsBucket } from '../services/supabaseMaterialsStorage.js';
import { materialsFixture, samplePdf } from './helpers/materialsFixture.js';
import { issueSession } from '../services/authSession.js';

const url = 'https://storage-fixture.supabase.co', secretKey = 'sb_secret_local_test_only';
const path = () => `syllabi/example/${randomUUID()}.pdf`;
const json = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
function fixture() {
  const objects = new Map(), calls = [];
  const state = { public: false, failUpload: false, failDelete: false };
  const fetchImpl = async (address, options = {}) => {
    const endpoint = new URL(address).pathname.replace('/storage/v1', '');
    calls.push({ endpoint, ...options });
    if (endpoint === '/bucket/learning-materials') return json({ id: 'learning-materials', public: state.public });
    if (endpoint === '/object/list-v2/learning-materials') {
      const body = JSON.parse(options.body);
      const keys = [...objects.keys()].filter(key => key.startsWith(body.prefix)).sort();
      const start = body.cursor ? keys.findIndex(key => key > body.cursor) : 0;
      const page = start < 0 ? [] : keys.slice(start, start + body.limit);
      const hasNext = start >= 0 && start + body.limit < keys.length;
      return json({ folders: [], objects: page.map(name => ({ id: name, name, created_at: objects.get(name).created_at })), hasNext, ...(hasNext ? { nextCursor: page.at(-1) } : {}) });
    }
    if (endpoint === '/object/learning-materials' && options.method === 'DELETE') {
      if (state.failDelete) return json({ statusCode: '503' }, 503);
      for (const key of JSON.parse(options.body).prefixes) objects.delete(key);
      return json([]);
    }
    const authenticated = '/object/authenticated/learning-materials/';
    if (endpoint.startsWith(authenticated)) {
      const row = objects.get(endpoint.slice(authenticated.length));
      return row ? new Response(row.bytes, { status: 206 }) : json({ statusCode: '404' }, 400);
    }
    const upload = '/object/learning-materials/';
    if (endpoint.startsWith(upload) && options.method === 'POST') {
      if (state.failUpload) return json({ statusCode: '403', message: 'provider-private-secret' }, 400);
      const key = endpoint.slice(upload.length);
      if (objects.has(key)) return json({ statusCode: '409' }, 409);
      objects.set(key, { bytes: Buffer.from(options.body), created_at: new Date().toISOString() });
      return json({ Key: key });
    }
    throw new Error(`Unexpected test request: ${options.method} ${endpoint}`);
  };
  return { objects, calls, state, fetchImpl, bucket: createSupabaseMaterialsBucket({ url, secretKey, fetchImpl }) };
}

test('server secret keys use only apikey; private uploads use unique paths without upsert or public URLs', async () => {
  const f = fixture(), key = path();
  await f.bucket.file(key).save(samplePdf(), { metadata: { contentType: 'application/pdf' } });
  const [buffer] = await f.bucket.file(key).download();expect(buffer.equals(samplePdf())).toBe(true);
  await expect(f.bucket.file(key).save(samplePdf())).rejects.toMatchObject({ code: 409 });
  await f.bucket.file(key).delete({ ignoreNotFound: true });expect(f.objects.size).toBe(0);
  for (const call of f.calls) { expect(call.headers.apikey).toBe(secretKey);expect(call.headers.Authorization).toBeUndefined();expect(call.redirect).toBe('error');expect(call.signal).toBeInstanceOf(AbortSignal);expect(call.endpoint).not.toMatch(/public|sign/); }
  const upload = f.calls.find(call => call.method === 'POST');
  expect(upload.headers).toMatchObject({ 'Content-Type':'application/pdf', 'Cache-Control':'private, no-store', 'x-upsert':'false' });
  expect(f.calls.find(call => call.endpoint.includes('authenticated')).headers.Range).toBe('bytes=0-15728640');
});

test('legacy service-role JWTs are supported, while publishable/anon keys and invalid URLs are rejected', async () => {
  const calls=[];
  const jwt = `header.${Buffer.from(JSON.stringify({role:'service_role'})).toString('base64url')}.signature`;
  const bucket=createSupabaseMaterialsBucket({url,secretKey:jwt,fetchImpl:async (_url,options)=>{calls.push(options);return json({id:'learning-materials',public:false});}});
  await bucket.getMetadata();expect(calls[0].headers.Authorization).toBe(`Bearer ${jwt}`);
  for(const key of ['', 'sb_publishable_public',`header.${Buffer.from(JSON.stringify({role:'anon'})).toString('base64url')}.signature`])expect(()=>createSupabaseMaterialsBucket({url,secretKey:key})).toThrow();
  for(const invalid of ['http://example.com','https://user:pass@example.com','https://example.com/path','https://example.com?token=secret','postgres://example.com'])expect(()=>createSupabaseMaterialsBucket({url:invalid,secretKey})).toThrow();
});

test('public buckets cannot receive or serve protected material files', async () => {
  const f=fixture();f.state.public=true;
  await expect(f.bucket.file(path()).save(samplePdf())).rejects.toMatchObject({code:'storage/public-bucket'});
  await expect(f.bucket.file(path()).download()).rejects.toMatchObject({code:'storage/public-bucket'});
  expect(f.calls.every(call=>call.endpoint.startsWith('/bucket/'))).toBe(true);
});

test('download memory is bounded even when the provider ignores Range', async () => {
  const bucket=createSupabaseMaterialsBucket({url,secretKey,fetchImpl:async address=>address.includes('/bucket/')?json({id:'learning-materials',public:false}):new Response(Buffer.alloc(100))});
  await expect(bucket.file(path()).download({end:10})).rejects.toMatchObject({code:413});
});

test('cleanup listings paginate with cursors and keep original object creation timestamps', async () => {
  const f=fixture();
  for(let index=0;index<3;index++)f.objects.set(path(),{bytes:samplePdf(),created_at:'2020-01-01T00:00:00Z'});
  const [first,next]=await f.bucket.getFiles({prefix:'syllabi/',maxResults:2});
  const [last,end]=await f.bucket.getFiles({prefix:'syllabi/',maxResults:2,pageToken:next.pageToken});
  expect(first).toHaveLength(2);expect(last).toHaveLength(1);expect(end).toBeNull();
  expect((await first[0].getMetadata())[0].timeCreated).toBe('2020-01-01T00:00:00Z');
  const options=JSON.parse(f.calls.at(-1).body);expect(options.with_delimiter).toBe(false);expect(options.cursor).toBe(next.pageToken);
  await expect(f.bucket.getFiles({prefix:'training_modules/'})).rejects.toThrow();
  expect(()=>f.bucket.file('../secrets')).toThrow();
});

test('malformed pagination cannot loop forever or make cleanup delete arbitrary paths', async () => {
  const bucket=createSupabaseMaterialsBucket({url,secretKey,fetchImpl:async()=>json({objects:[],hasNext:true,nextCursor:'same'})});
  await expect(bucket.getFiles({prefix:'syllabi/',pageToken:'same'})).rejects.toMatchObject({code:'storage/invalid-response'});
});

test('provider selection is lazy so incomplete PDF setup never blocks existing backend startup', () => {
  const missing=createMaterialsBucketProvider({env:{MATERIALS_STORAGE_PROVIDER:'supabase'}});
  expect(typeof missing).toBe('function');expect(()=>missing()).toThrow();
  const legacy={provider:'firebase'};
  expect(createMaterialsBucketProvider({env:{},firebaseBucket:()=>legacy})()).toBe(legacy);
  expect(createMaterialsBucketProvider({env:{SUPABASE_URL:url,SUPABASE_SECRET_KEY:secretKey}})().provider).toBe('supabase');
  expect(()=>createMaterialsBucketProvider({env:{MATERIALS_STORAGE_PROVIDER:'typo'}})()).toThrow();
});

test('the existing role-scoped HTTP API uploads/reads/replaces/deletes through Supabase while metadata stays in Firestore', async () => {
  const storage=fixture(), f=materialsFixture({bucketOverride:storage.bucket});
  const headers=(id='a',role='instructor')=>({Authorization:`Bearer ${issueSession(id,role)}`});
  const base='/learning-materials';
  const created=await request(f.app).post(base+'/syllabi').set(headers()).field('title','Supabase course').attach('file',samplePdf(),'course.pdf').expect(200);
  const id=created.body.id, oldPath=f.records.syllabi[id].storagePath;
  expect(storage.objects.has(oldPath)).toBe(true);expect(f.files.size).toBe(0);
  await request(f.app).get(`${base}/syllabi/${id}/pdf`).set(headers('sb','student')).expect(404);
  const read=await request(f.app).get(`${base}/syllabi/${id}/pdf`).set(headers('sa','student')).expect(200);expect(read.body.equals(samplePdf())).toBe(true);
  await request(f.app).post(base+'/syllabi').set(headers('sa','student')).expect(403);
  storage.state.failUpload=true;
  await request(f.app).put(`${base}/syllabi/${id}`).set(headers()).field('title','Course').field('revision','1').attach('file',samplePdf(),'replacement.pdf').expect(503);
  expect(f.records.syllabi[id].storagePath).toBe(oldPath);expect(storage.objects.size).toBe(1);
  storage.state.failUpload=false;storage.state.failDelete=true;
  await request(f.app).put(`${base}/syllabi/${id}`).set(headers()).field('title','Course').field('revision','1').attach('file',samplePdf(),'replacement.pdf').expect(200);
  expect(storage.objects.size).toBe(2);expect(f.records.syllabi[id].pendingFileDeletes).toContain(oldPath);
  storage.state.failDelete=false;await f.service.cleanup({id:'a',role:'instructor'});expect(storage.objects.size).toBe(1);
  await request(f.app).delete(`${base}/syllabi/${id}`).set(headers()).send({revision:2}).expect(200);
  expect(storage.objects.size).toBe(0);expect(f.records.syllabi[id]).toBeUndefined();
  expect(f.records.training_modules).toEqual({untouched:{title:'Simulation'}});
});
