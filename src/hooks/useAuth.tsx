import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { authApi } from '../services';
import { setUnauthorizedHandler } from '../services/apiClient';
import { getStoredToken, setStoredToken } from '../services/authToken';
import type { Agent } from '../types/api';

interface AuthContextValue {
  agent: Agent | null;
  /** `true` only while the initial session probe is in flight. */
  initialising: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (input: { name: string; email: string; password: string; phone: string }) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/**
 * Session state.
 *
 * The server issues the JWT twice: as an httpOnly cookie (used when the SPA and
 * API share an origin) and in the response body (kept here and sent as a Bearer
 * token when they do not). Either way the client cannot tell whether a session
 * is still valid without asking, so on mount the provider calls `/auth/me`
 * once; a 401 simply means "signed out".
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [agent, setAgent] = useState<Agent | null>(null);
  const [initialising, setInitialising] = useState(true);

  useEffect(() => {
    const controller = new AbortController();

    authApi
      .me(controller.signal)
      .then((data) => setAgent(data.agent))
      .catch(() => {
        setAgent(null);
        // A stored token the server no longer accepts is dead weight.
        if (getStoredToken()) setStoredToken(null);
      })
      .finally(() => {
        if (!controller.signal.aborted) setInitialising(false);
      });

    return () => controller.abort();
  }, []);

  // A 401 from any request means the cookie expired or was revoked. Clearing
  // state here sends the user to /login from one place rather than each caller.
  useEffect(() => {
    setUnauthorizedHandler(() => {
      setAgent(null);
      setStoredToken(null);
    });
    return () => setUnauthorizedHandler(null);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const data = await authApi.login({ email, password });
    setStoredToken(data.token);
    setAgent(data.agent);
  }, []);

  const register = useCallback(
    async (input: { name: string; email: string; password: string; phone: string }) => {
      const data = await authApi.register(input);
      setStoredToken(data.token);
      setAgent(data.agent);
    },
    [],
  );

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } finally {
      // Clear locally even if the request failed — the user asked to sign out.
      setStoredToken(null);
      setAgent(null);
    }
  }, []);

  const value = useMemo(
    () => ({ agent, initialising, login, register, logout }),
    [agent, initialising, login, register, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside an AuthProvider.');
  return context;
}
