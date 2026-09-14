/**
 * Session token storage.
 *
 * When the SPA and the API share an origin, the httpOnly session cookie the
 * server sets is enough and nothing here is needed. Deployed separately they
 * are cross-site, where that cookie is not sent: `SameSite=Lax` blocks it, and
 * `SameSite=None` is blocked anyway by Safari's ITP and Chrome's third-party
 * cookie restrictions. So the client also keeps the JWT and sends it as a
 * Bearer token, which the API already accepts.
 *
 * TRADE-OFF: a token readable by JavaScript is exfiltratable by an XSS bug,
 * which the httpOnly cookie was specifically chosen to prevent. That is the
 * price of splitting the deployments — see docs/technical-decisions.md.
 *
 * Every access is wrapped: storage throws in private-mode Safari and when a
 * browser blocks site data, and an auth check must not crash the app.
 */
const STORAGE_KEY = 'iap_session_token';

export function getStoredToken(): string | null {
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

export function setStoredToken(token: string | null): void {
  try {
    if (token) window.localStorage.setItem(STORAGE_KEY, token);
    else window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Storage unavailable: the session simply does not survive a reload.
  }
}
