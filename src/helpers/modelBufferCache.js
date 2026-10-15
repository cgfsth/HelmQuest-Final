/** Cache compressed bytes, never live Three.js objects: callers own and dispose their scenes. */
export function createModelBufferCache(fetchBuffer, maxBytes = 32 * 1024 * 1024) {
  const pending = new Map();
  const cached = new Map();
  let size = 0;
  return async function getBuffer(url) {
    if (cached.has(url)) {
      const buffer = cached.get(url);
      cached.delete(url);
      cached.set(url, buffer);
      return buffer;
    }
    if (pending.has(url)) return pending.get(url);
    const request = Promise.resolve().then(() => fetchBuffer(url)).then(buffer => {
      if (buffer.byteLength <= maxBytes) {
        while (size + buffer.byteLength > maxBytes && cached.size) {
          const key = cached.keys().next().value;
          size -= cached.get(key).byteLength;
          cached.delete(key);
        }
        cached.set(url, buffer);
        size += buffer.byteLength;
      }
      return buffer;
    }).finally(() => pending.delete(url));
    pending.set(url, request);
    return request;
  };
}
