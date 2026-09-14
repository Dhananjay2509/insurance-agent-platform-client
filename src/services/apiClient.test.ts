import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError, api, setUnauthorizedHandler } from './apiClient';
import { getStoredToken, setStoredToken } from './authToken';

function mockJson(status: number, payload: unknown) {
  return vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    headers: new Headers({ 'content-type': 'application/json' }),
    json: () => Promise.resolve(payload),
  } as unknown as Response);
}

const lastRequest = () => (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0];

describe('authToken', () => {
  afterEach(() => setStoredToken(null));

  it('round-trips a token', () => {
    setStoredToken('abc.def.ghi');
    expect(getStoredToken()).toBe('abc.def.ghi');
    setStoredToken(null);
    expect(getStoredToken()).toBeNull();
  });

  it('never throws when storage is unavailable', () => {
    const spy = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('SecurityError: storage blocked');
    });
    // Private-mode Safari and blocked site data both throw here; an auth check
    // must degrade to "signed out", not crash the app.
    expect(() => getStoredToken()).not.toThrow();
    expect(getStoredToken()).toBeNull();
    spy.mockRestore();
  });
});

describe('apiClient authentication', () => {
  beforeEach(() => {
    globalThis.fetch = mockJson(200, { success: true, data: { ok: true } });
  });

  afterEach(() => {
    setStoredToken(null);
    setUnauthorizedHandler(null);
    vi.unstubAllGlobals();
  });

  /**
   * The client and API are deployed separately, so every request is cross-site.
   * `SameSite=Lax` cookies are not sent cross-site, which is why the JWT must
   * also travel as a Bearer token.
   */
  it('sends the stored token as a Bearer header', async () => {
    setStoredToken('a-real-token');
    await api.get('/products');

    const [, init] = lastRequest();
    expect(init.headers.Authorization).toBe('Bearer a-real-token');
  });

  it('sends no Authorization header when signed out', async () => {
    await api.get('/products');

    const [, init] = lastRequest();
    expect(init?.headers?.Authorization).toBeUndefined();
  });

  it('still sends credentials, so a same-origin cookie deployment keeps working', async () => {
    await api.get('/products');

    const [, init] = lastRequest();
    expect(init.credentials).toBe('include');
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
