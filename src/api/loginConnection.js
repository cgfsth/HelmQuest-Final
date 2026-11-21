export const API_BASE_URL = (import.meta.env?.VITE_API_BASE_URL || 'http://localhost:3001/api/v1')
  .trim().replace(/\/+$/, '');

export function createLoginConnection({ baseUrl = API_BASE_URL, fetchImpl = (...args) => fetch(...args), now = Date.now } = {}) {
  const api = new URL(baseUrl);
  const hostedOnRender = api.hostname.endsWith('.onrender.com');
  let pending = null;
  let readyAt = null;

  function warmLoginService() {
    if (!hostedOnRender) return Promise.resolve(false);
    if (pending) return pending;
    if (readyAt !== null && now() - readyAt < 60000) return Promise.resolve(true);
    // Wake the host before credentials are submitted. This never blocks login
    // and uses no credentials, database query, or recurring keep-alive timer.
    pending = Promise.resolve().then(() => fetchImpl(new URL('/health', api).href, {
      method: 'GET', cache: 'no-store', credentials: 'omit', signal: AbortSignal.timeout(90000),
    })).then(response => {
      if (response.ok) readyAt = now();
      return response.ok;
    }).catch(() => false).finally(() => { pending = null; });
    return pending;
  }

  return { warmLoginService, loginTimeoutMs: hostedOnRender ? 90000 : 20000 };
}

export const { warmLoginService, loginTimeoutMs } = createLoginConnection();
