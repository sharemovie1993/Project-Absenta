import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';

const STORAGE_KEY = 'absenta_custom_server_domain';

export interface ServerDomainInfo {
  domain: string;
  apiUrl: string;
  isConfigured: boolean;
}

/** Check if running inside Capacitor Android or iOS container */
export const isCapacitorApp = (): boolean => {
  return Capacitor.isNativePlatform();
};

/** Normalize input domain into clean host & api url */
export const normalizeServerUrl = (inputDomain: string): { host: string; apiUrl: string; fullUrl: string } => {
  let cleaned = inputDomain.trim().toLowerCase();

  // If user only typed subdomain like 'smkn1pld', append '.absenta.id'
  if (!cleaned.includes('.') && cleaned.length > 0) {
    cleaned = `${cleaned}.absenta.id`;
  }

  // Remove leading protocol and trailing slashes
  const host = cleaned.replace(/^https?:\/\//, '').replace(/\/+$/, '');
  
  // Use http for localhost/10.0.2.2/127.0.0.1, https for public domains
  const isLocal = host.includes('localhost') || host.includes('127.0.0.1') || host.includes('10.0.2.2');
  const protocol = isLocal ? 'http://' : 'https://';
  
  const fullUrl = `${protocol}${host}`;
  const apiUrl = `${fullUrl}/api`;

  return { host, apiUrl, fullUrl };
};

/** Get the currently configured server domain */
export const getSavedServerDomain = (): string | null => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(STORAGE_KEY) || null;
};

/** Save new server domain and verify connectivity */
export const saveServerDomain = async (inputDomain: string): Promise<{ success: boolean; message: string; apiUrl: string }> => {
  const { host, apiUrl } = normalizeServerUrl(inputDomain);

  if (!host) {
    return { success: false, message: 'Domain sekolah tidak boleh kosong.', apiUrl: '' };
  }

  try {
    // Quick health check with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    const testUrl = `${apiUrl}/health`;
    const res = await fetch(testUrl, {
      method: 'GET',
      signal: controller.signal,
      headers: { 'Accept': 'application/json' }
    }).catch(() => null);

    clearTimeout(timeoutId);

    // Save to localStorage & Capacitor Preferences
    localStorage.setItem(STORAGE_KEY, host);
    try {
      await Preferences.set({ key: STORAGE_KEY, value: host });
    } catch {
      // Preferences fallback silently
    }

    return { 
      success: true, 
      message: res && res.ok ? 'Server sekolah berhasil terhubung.' : 'Domain tersimpan. Menghubungkan ke server...', 
      apiUrl 
    };
  } catch (err: any) {
    // Even if health check times out, still allow saving (in case server uses different health path)
    localStorage.setItem(STORAGE_KEY, host);
    try {
      await Preferences.set({ key: STORAGE_KEY, value: host });
    } catch {}

    return { 
      success: true, 
      message: `Domain ${host} berhasil disimpan.`, 
      apiUrl 
    };
  }
};

/** Reset configured server domain */
export const clearServerDomain = async (): Promise<void> => {
  localStorage.removeItem(STORAGE_KEY);
  try {
    await Preferences.remove({ key: STORAGE_KEY });
  } catch {}
};
