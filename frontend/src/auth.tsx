import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { Platform } from 'react-native';
import { api, setToken } from './api';

export type User = {
  id: string;
  email: string;
  name: string;
  picture?: string | null;
  coins: number;
  credits?: number;
  gender?: string | null;
  age?: number | null;
  onboarded?: boolean;
};

type AuthCtx = {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  loginWithGoogleSession: (sessionId: string) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
};

const Ctx = createContext<AuthCtx | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const r = await api<{ user: User }>('/auth/me');
      setUser(r.user);
    } catch {
      setUser(null);
      await setToken(null);
    }
  }, []);

  useEffect(() => {
    (async () => {
      // CRITICAL: If returning from OAuth callback (web), skip /me check.
      // The auth callback handler will exchange the session_id first.
      if (Platform.OS === 'web' && typeof window !== 'undefined' && window.location?.hash?.includes('session_id=')) {
        setLoading(false);
        return;
      }
      await refresh();
      setLoading(false);
    })();
  }, [refresh]);

  const login = async (email: string, password: string) => {
    const r = await api<{ token: string; user: User }>('/auth/login', {
      method: 'POST', body: JSON.stringify({ email, password }),
    });
    await setToken(r.token);
    setUser(r.user);
  };
  const register = async (name: string, email: string, password: string) => {
    const r = await api<{ token: string; user: User }>('/auth/register', {
      method: 'POST', body: JSON.stringify({ name, email, password }),
    });
    await setToken(r.token);
    setUser(r.user);
  };
  const loginWithGoogleSession = async (sessionId: string) => {
    const r = await api<{ token: string; user: User }>('/auth/google-session', {
      method: 'POST', body: JSON.stringify({ session_id: sessionId }),
    });
    await setToken(r.token);
    setUser(r.user);
  };
  const logout = async () => {
    await setToken(null);
    setUser(null);
  };

  return (
    <Ctx.Provider value={{ user, loading, login, register, loginWithGoogleSession, logout, refresh }}>
      {children}
    </Ctx.Provider>
  );
}

export function useAuth() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useAuth must be used within AuthProvider');
  return v;
}
