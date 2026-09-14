import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError, api, setUnauthorizedHandler } from './apiClient';

function mockJson(status: number, payload: unknown) {
  return vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    headers: new Headers({ 'content-type': 'application/json' }),
    json: () => Promise.resolve(payload),
  } as unknown as Response);
}

const lastRequest = () => (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];

describe('apiClient authentication', () => {
  beforeEach(() => {
    globalThis.fetch = mockJson(200, { success: true, data: { ok: true } });
  });

  afterEach(() => {
    setUnauthorizedHandler(null);
    vi.unstubAllGlobals();
  });

  /**
   * The session is an httpOnly cookie set by the server. `credentials:
   * 'include'` is what makes the browser attach it — cross-origin requests omit
   * cookies by default, and without this every authenticated call 401s.
   */
  it('sends credentials on every request so the session cookie travels', async () => {
    await api.get('/products');
    expect(lastRequest()[1].credentials).toBe('include');

    vi.mocked(globalThis.fetch).mockClear();
    await api.post('/customers', { firstName: 'Ananya' });
    expect(lastRequest()[1].credentials).toBe('include');
  });

  /**
   * The regression guard for this change: the client must hold no token at all.
   * An Authorization header could only come from a token the client had stored,
   * which is exactly the XSS exposure the httpOnly cookie removes.
   */
  it('never sends an Authorization header', async () => {
    await api.get('/products');
    expect(lastRequest()[1]?.headers?.Authorization).toBeUndefined();
  });

  it('stores nothing in the browser', async () => {
    const setItem = vi.spyOn(Storage.prototype, 'setItem');
    await api.get('/products');
    expect(setItem).not.toHaveBeenCalled();
    setItem.mockRestore();
  });

  it('sets the JSON content type only when there is a body', async () => {
    await api.post('/customers', { firstName: 'Ananya' });
    expect(lastRequest()[1].headers['Content-Type']).toBe('application/json');

    vi.mocked(globalThis.fetch).mockClear();
    await api.get('/customers');
    expect(lastRequest()[1]?.headers?.['Content-Type']).toBeUndefined();
  });

  it('notifies the unauthorized handler on a 401 so the session is cleared once, centrally', async () => {
    globalThis.fetch = mockJson(401, {
      success: false,
      error: { code: 'UNAUTHENTICATED', message: 'Authentication required.' },
    });

    const onUnauthorized = vi.fn();
    setUnauthorizedHandler(onUnauthorized);

    await expect(api.get('/customers')).rejects.toBeInstanceOf(ApiError);
    expect(onUnauthorized).toHaveBeenCalledTimes(1);
  });

  it('normalises a network failure rather than leaking a raw TypeError', async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'));

    await expect(api.get('/products')).rejects.toMatchObject({
      name: 'ApiError',
      code: 'NETWORK_ERROR',
    });
  });

  it('exposes server field errors keyed by field name', async () => {
    globalThis.fetch = mockJson(400, {
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Request validation failed.',
        details: [{ field: 'email', message: 'Must be a valid email address.' }],
      },
    });

    await api.post('/customers', {}).catch((error: ApiError) => {
      expect(error.fieldErrors).toEqual({ email: 'Must be a valid email address.' });
    });
    expect.assertions(1);
  });
});

describe('apiClient base URL', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it('defaults to a same-origin /api path', async () => {
    // Stubbed rather than left unset: Vitest loads the developer's own .env, so
    // relying on the variable being absent makes this test machine-dependent.
    // An empty value must behave exactly like an unset one.
    vi.stubEnv('VITE_API_URL', '');
    vi.resetModules();
    globalThis.fetch = mockJson(200, { success: true, data: {} });
    const { api: freshApi } = await import('./apiClient');

    await freshApi.get('/products');
    expect(lastRequest()[0]).toBe('/api/products');
  });

  /** Set when the API is deployed on its own domain. Vite inlines it at build
   *  time, so this is read once at module load — hence the module reset. */
  it('uses VITE_API_URL when the API is deployed separately', async () => {
    vi.stubEnv('VITE_API_URL', 'https://api.example.com/api');
    vi.resetModules();
    globalThis.fetch = mockJson(200, { success: true, data: {} });
    const { api: freshApi } = await import('./apiClient');

    await freshApi.get('/products');
    expect(lastRequest()[0]).toBe('https://api.example.com/api/products');
  });

  it('tolerates a trailing slash in VITE_API_URL', async () => {
    vi.stubEnv('VITE_API_URL', 'https://api.example.com/api/');
    vi.resetModules();
    globalThis.fetch = mockJson(200, { success: true, data: {} });
    const { api: freshApi } = await import('./apiClient');

    await freshApi.get('/products');
    expect(lastRequest()[0]).toBe('https://api.example.com/api/products');
  });
});
