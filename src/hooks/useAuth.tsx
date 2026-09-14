import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { authApi } from '../services';
import { setUnauthorizedHandler } from '../services/apiClient';
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
 * The session lives entirely in an httpOnly cookie the server sets. This client
 * never sees the token, so the only way to know whether a session exists is to
 * ask the server: on mount the provider calls `/auth/me` once, and a 401 simply
 * means "signed out".
 *
 * Nothing is persisted here. Sign-out is whatever the server says it is.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [agent, setAgent] = useState<Agent | null>(null);
  const [initialising, setInitialising] = useState(true);

  useEffect(() => {
    const controller = new AbortController();

    authApi
      .me(controller.signal)
      .then((data) => setAgent(data.agent))
      .catch(() => setAgent(null))
      .finally(() => {
        if (!controller.signal.aborted) setInitialising(false);
      });

    return () => controller.abort();
  }, []);

  // A 401 from any request means the cookie expired or was revoked. Clearing
  // state here sends the user to /login from one place rather than each caller.
  useEffect(() => {
    setUnauthorizedHandler(() => setAgent(null));
    return () => setUnauthorizedHandler(null);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    // The server sets the session cookie on this response; nothing to store.
    const data = await authApi.login({ email, password });
    setAgent(data.agent);
  }, []);

  const register = useCallback(
    async (input: { name: string; email: string; password: string; phone: string }) => {
      const data = await authApi.register(input);
      setAgent(data.agent);
    },
    [],
  );

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } finally {
      // Clear locally even if the request failed — the user asked to sign out.
      // The cookie itself is cleared by the server on /auth/logout.
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
