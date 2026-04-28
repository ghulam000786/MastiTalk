import Constants from 'expo-constants';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const BASE = process.env.EXPO_PUBLIC_BACKEND_URL || '';

async function getToken(): Promise<string | null> {
  if (Platform.OS === 'web') {
    try { return typeof window !== 'undefined' ? window.localStorage.getItem('cc_token') : null; } catch { return null; }
  }
  return await SecureStore.getItemAsync('cc_token');
}

export async function setToken(token: string | null) {
  if (Platform.OS === 'web') {
    try {
      if (token) window.localStorage.setItem('cc_token', token);
      else window.localStorage.removeItem('cc_token');
    } catch {}
    return;
  }
  if (token) await SecureStore.setItemAsync('cc_token', token);
  else await SecureStore.deleteItemAsync('cc_token');
}

export async function api<T = any>(path: string, options: RequestInit = {}): Promise<T> {
  const token = await getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${BASE}/api${path}`, { ...options, headers });
  const ct = res.headers.get('content-type') || '';
  const data = ct.includes('application/json') ? await res.json() : await res.text();
  if (!res.ok) {
    const msg = (data && (data as any).detail) || `HTTP ${res.status}`;
    throw new Error(typeof msg === 'string' ? msg : JSON.stringify(msg));
  }
  return data as T;
}

export const BACKEND_URL = BASE;
export { Constants };
