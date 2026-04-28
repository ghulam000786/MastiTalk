import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { api, setToken } from './api';

export type User = {
  id: string;
  email: string;
  name: string;
  coins: number;
};

type AuthCtx = {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
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
      await refresh();
      setLoading(false);
    })();
  }, [refresh]);

  const login = async (email: string, password: string) => {
    const r = await api<{ token: string; user: User }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    await setToken(r.token);
    setUser(r.user);
  };

  const register = async (name: string, email: string, password: string) => {
    const r = await api<{ token: string; user: User }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password }),
    });
    await setToken(r.token);
    setUser(r.user);
  };

  const logout = async () => {
    await setToken(null);
    setUser(null);
  };

  return (
    <Ctx.Provider value={{ user, loading, login, register, logout, refresh }}>
      {children}
    </Ctx.Provider>
  );
}

export function useAuth() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useAuth must be used within AuthProvider');
  return v;
}
