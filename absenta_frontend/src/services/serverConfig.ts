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

/** Get active server origin protocol + domain (e.g. https://smkn1pld.absenta.id or https://absen.smkn2pwk.sch.id) */
export const getActiveServerOrigin = (): string => {
  if (typeof window === 'undefined') return 'https://smkn1pld.absenta.id';

  // Jika sedang berjalan di browser dev mode (localhost/127.0.0.1), utamakan window.location.origin
  // agar memanfaatkan proxy Vite ke backend lokal (port 3004) dan tidak salah tembak ke dev.absenta.id
  if (!isCapacitorApp() && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
    return window.location.origin;
  }

  const saved = localStorage.getItem(STORAGE_KEY) || localStorage.getItem('tenant_domain');
  if (saved && saved.trim()) {
    let clean = saved.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/+$/, '');
    // Di web browser dev, tenant 'dev' diarahkan ke proxy localhost
    if (!isCapacitorApp() && (clean === 'dev' || clean === 'dev.absenta.id')) {
      return window.location.origin;
    }
    if (!clean.includes('.') && clean.length > 0) clean = `${clean}.absenta.id`;
    const isLocal = clean.includes('localhost') || clean.includes('127.0.0.1') || clean.includes('10.0.2.2');
    const protocol = isLocal ? 'http://' : 'https://';
    return `${protocol}${clean}`;
  }

  // If running in browser (not native mobile webview), use browser's current origin
  if (!isCapacitorApp() && window.location.origin && !window.location.origin.includes('localhost')) {
    return window.location.origin;
  }

  // Default fallback for initial native app launch before user configuration
  return 'https://smkn1pld.absenta.id';
};

/** Get the currently configured server domain */
export const getSavedServerDomain = (): string | null => {
  if (typeof window === 'undefined') return null;
  const saved = localStorage.getItem(STORAGE_KEY) || localStorage.getItem('tenant_domain');
  if (saved && saved.trim()) {
    let clean = saved.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/+$/, '');
    // Di web browser dev, tenant 'dev' adalah localhost
    if (!isCapacitorApp() && (clean === 'dev' || clean === 'dev.absenta.id')) {
      return 'localhost';
    }
    if (!clean.includes('.') && clean.length > 0) clean = `${clean}.absenta.id`;
    return clean;
  }
  // In browser, default to current origin hostname
  if (!isCapacitorApp() && window.location.hostname && window.location.hostname !== 'localhost') {
    return window.location.hostname;
  }
  // Default fallback untuk aplikasi mobile Android/iOS
  if (isCapacitorApp()) {
    return 'smkn1pld.absenta.id';
  }
  return null;
};

// Immediate sync from Capacitor Preferences on native mobile startup
if (typeof window !== 'undefined' && isCapacitorApp()) {
  Preferences.get({ key: STORAGE_KEY }).then((res: { value: string | null }) => {
    if (res?.value && !localStorage.getItem(STORAGE_KEY)) {
      localStorage.setItem(STORAGE_KEY, res.value);
    }
  }).catch(() => {});
}

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
