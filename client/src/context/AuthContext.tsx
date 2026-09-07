import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import type { SafeUser } from '@nirikshan/shared';
import * as authApi from '@/api/auth';
import { clearToken, getToken, setToken } from '@/api/client';

interface AuthContextValue {
  user: SafeUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (payload: authApi.RegisterPayload) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SafeUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      setIsLoading(false);
      return;
    }
    authApi
      .fetchMe()
      .then(setUser)
      .catch(() => {
        clearToken();
        setUser(null);
      })
      .finally(() => setIsLoading(false));
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const { token, user: loggedInUser } = await authApi.login(email, password);
    setToken(token);
    setUser(loggedInUser);
  }, []);

  const register = useCallback(async (payload: authApi.RegisterPayload) => {
    const { token, user: registeredUser } = await authApi.register(payload);
    setToken(token);
    setUser(registeredUser);
  }, []);

  const logout = useCallback(() => {
    clearToken();
    setUser(null);
    authApi.logout().catch(() => {
      // Token is discarded client-side regardless of network state.
    });
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ user, isLoading, isAuthenticated: Boolean(user), login, register, logout }),
    [user, isLoading, login, register, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
