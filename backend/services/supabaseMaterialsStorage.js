// A small server-only adapter for the file operations used by learningMaterials.
// Firestore/auth stay in the existing backend. No public/signed PDF URLs are made.
const storageError = code => Object.assign(new Error('PDF storage request failed.'), { code });
const validPath = path => typeof path === 'string' && /^(syllabi|syllabus_modules)\/[\w-]{1,128}\/[a-f\d-]{36}\.pdf$/.test(path);
const encodedPath = path => path.split('/').map(encodeURIComponent).join('/');

export function createSupabaseMaterialsBucket({ url, secretKey, name = 'learning-materials', fetchImpl = globalThis.fetch, timeoutMs = 60000 }) {
  let origin;
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'https:' || parsed.username || parsed.password || parsed.search || parsed.hash || !['', '/'].includes(parsed.pathname)) throw new Error();
    origin = parsed.origin;
  } catch { throw storageError('storage/not-configured'); }
  if (typeof secretKey !== 'string' || !secretKey.trim() || !/^[\w-]{1,100}$/.test(name)) throw storageError('storage/not-configured');
  const key = secretKey.trim();
  let legacy = false;
  if (!key.startsWith('sb_secret_')) {
    try { legacy = JSON.parse(Buffer.from(key.split('.')[1], 'base64url')).role === 'service_role'; } catch { /* reject publishable/anon keys */ }
    if (!legacy) throw storageError('storage/not-configured');
  }
  const base = `${origin}/storage/v1`;
  const bucketName = encodeURIComponent(name);
  async function request(path, options = {}) {
    const response = await fetchImpl(`${base}${path}`, { ...options, redirect: 'error', signal: AbortSignal.timeout(timeoutMs),
      headers: { apikey: key, ...(legacy ? { Authorization: `Bearer ${key}` } : {}), ...options.headers } });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      const aliases = { NoSuchBucket: 404, NoSuchKey: 404, InvalidJWT: 401, AccessDenied: 403, EntityTooLarge: 413 };
      // Storage sometimes wraps its actual 404/403 in an HTTP 400 response.
      const status = aliases[data.code] || Number(data.statusCode) || response.status;
      throw storageError(status);
    }
    return response;
  }
  async function getMetadata() {
    const data = await (await request(`/bucket/${bucketName}`)).json();
    if (data.public !== false) throw storageError('storage/public-bucket');
    if (data.id !== name && data.name !== name) throw storageError('storage/not-configured');
    return [data];
  }
  function file(path, listedMetadata) {
    if (!validPath(path)) throw storageError('storage/invalid-path');
    const object = `${bucketName}/${encodedPath(path)}`;
    return { name: path,
      async save(bytes, options = {}) {
        await getMetadata(); // Never upload protected PDFs to a public bucket.
        await request(`/object/${object}`, { method: 'POST', body: bytes, headers: {
          'Content-Type': options.metadata?.contentType || 'application/pdf', 'Cache-Control': 'private, no-store', 'x-upsert': 'false',
        } });
      },
      async download({ end = 15 * 1024 * 1024 } = {}) {
        await getMetadata();
        const response = await request(`/object/authenticated/${object}`, { headers: { Range: `bytes=0-${end}`, 'Cache-Control': 'no-store' } });
        const reader = response.body.getReader();
        const chunks = []; let length = 0;
        try {
          while (true) {
            const { value, done } = await reader.read(); if (done) break;
            length += value.byteLength;
            if (length > end + 1) { await reader.cancel(); throw storageError(413); }
            chunks.push(Buffer.from(value));
          }
        } finally { reader.releaseLock(); }
        return [Buffer.concat(chunks)];
      },
      async delete({ ignoreNotFound = false } = {}) {
        try { await request(`/object/${bucketName}`, { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prefixes: [path] }) }); }
        catch (error) { if (!(ignoreNotFound && String(error.code) === '404')) throw error; }
      },
      async getMetadata() {
        const data = listedMetadata || await (await request(`/object/info/${object}`)).json();
        return [{ timeCreated: data.created_at || data.createdAt }];
      },
    };
  }
  return { name, provider: 'supabase', getMetadata, file,
    async getFiles({ prefix, maxResults = 100, pageToken } = {}) {
      if (!['syllabi/', 'syllabus_modules/'].includes(prefix)) throw storageError('storage/invalid-path');
      const data = await (await request(`/object/list-v2/${bucketName}`, { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prefix, limit: Math.min(100, Math.max(1, maxResults)), with_delimiter: false, sortBy: { column: 'name', order: 'asc' }, ...(pageToken ? { cursor: pageToken } : {}) }) })).json();
      if (!Array.isArray(data.objects) || (data.hasNext && (!data.nextCursor || data.nextCursor === pageToken))) throw storageError('storage/invalid-response');
      const files = data.objects.filter(item => typeof item.name === 'string' && item.name.startsWith(prefix) && validPath(item.name)).map(item => file(item.name, item));
      return [files, data.hasNext ? { pageToken: data.nextCursor } : null];
    },
  };
}

export function createMaterialsBucketProvider({ env = process.env, firebaseBucket, fetchImpl } = {}) {
  let supabase;
  return () => {
    const provider = (env.MATERIALS_STORAGE_PROVIDER || (env.SUPABASE_URL ? 'supabase' : 'firebase')).trim().toLowerCase();
    if (provider === 'firebase') return firebaseBucket(env.FIREBASE_STORAGE_BUCKET || 'helmquest-565d6.firebasestorage.app');
    if (provider !== 'supabase') throw storageError('storage/not-configured');
    return supabase ||= createSupabaseMaterialsBucket({ url: env.SUPABASE_URL, secretKey: env.SUPABASE_SECRET_KEY || env.SUPABASE_SERVICE_ROLE_KEY,
      name: env.SUPABASE_STORAGE_BUCKET || 'learning-materials', fetchImpl });
  };
}
