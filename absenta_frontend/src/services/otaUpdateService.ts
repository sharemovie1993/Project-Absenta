import React, { useState, useEffect } from 'react';
import { Capacitor, CapacitorHttp } from '@capacitor/core';
import { App } from '@capacitor/app';
import { Preferences } from '@capacitor/preferences';
import { CapacitorUpdater } from '@capgo/capacitor-updater';
import toast from 'react-hot-toast';

const OTA_MANIFEST_URL = 'https://ota.absenta.id/version.json';
const CURRENT_OTA_VERSION_KEY = 'absenta_current_ota_version';
const LAST_OTA_CHECK_KEY = 'absenta_last_ota_check_time';

export interface OtaManifest {
  app_id: string;
  version: string;
  base_version: string;
  build_number: number;
  min_required_version: string;
  bundle_url: string;
  checksum_sha256?: string;
  bundle_size_bytes?: number;
  release_notes?: string;
  released_at?: string;
}

export interface OtaState {
  isChecking: boolean;
  hasUpdate: boolean;
  isDownloading: boolean;
  downloadProgress: number; // 0 - 100
  isReadyToReload: boolean;
  manifest: OtaManifest | null;
  currentVersion: string;
  remoteVersion: string;
  error: string | null;
  isModalOpen: boolean;
  lastCheckedAt: number | null;
}

// ── Global Reactive State Store ─────────────────────────────────────────────
type Listener = (state: OtaState) => void;
const listeners = new Set<Listener>();

let state: OtaState = {
  isChecking: false,
  hasUpdate: false,
  isDownloading: false,
  downloadProgress: 0,
  isReadyToReload: false,
  manifest: null,
  currentVersion: '1.0.3',
  remoteVersion: '',
  error: null,
  isModalOpen: false,
  lastCheckedAt: null,
};

function setState(partial: Partial<OtaState>) {
  state = { ...state, ...partial };
  listeners.forEach((l) => l(state));
}

/** Hook React untuk membaca status OTA terkini secara reaktif */
export function useOtaState(): OtaState {
  const [current, setCurrent] = useState<OtaState>(state);
  useEffect(() => {
    const l: Listener = (s) => setCurrent(s);
    listeners.add(l);
    return () => {
      listeners.delete(l);
    };
  }, []);
  return current;
}

/** Cek apakah platform adalah native mobile (Android / iOS) */
export const isMobileNative = (): boolean => {
  return Capacitor.isNativePlatform();
};

/** Mengambil versi bundle OTA yang saat ini aktif di perangkat */
export const getActiveOtaVersion = async (): Promise<string> => {
  if (!isMobileNative()) return '1.0.3';
  try {
    const current = await CapacitorUpdater.current();
    if (current && current.bundle && current.bundle.version && current.bundle.version !== 'builtin') {
      return current.bundle.version;
    }
    if (current && current.native) {
      return current.native;
    }
  } catch {
    // Abaikan jika plugin belum inisialisasi
  }

  try {
    const { value } = await Preferences.get({ key: CURRENT_OTA_VERSION_KEY });
    if (value) return value;
  } catch {}

  return '1.0.3';
};

/** Fetch manifest OTA dari server dengan fallback multi-layer (CapacitorHttp -> fetch) */
async function fetchRemoteManifest(): Promise<OtaManifest> {
  const urlWithCacheBuster = `${OTA_MANIFEST_URL}?_t=${Date.now()}`;

  // 1. Coba via CapacitorHttp (native Android stack - kebal CORS & WebView limits)
  if (isMobileNative()) {
    try {
      const response = await CapacitorHttp.get({
        url: urlWithCacheBuster,
        headers: {
          'Accept': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
        },
        connectTimeout: 8000,
        readTimeout: 8000,
      });

      if (response && response.status === 200 && response.data) {
        if (typeof response.data === 'object') {
          return response.data as OtaManifest;
        }
        if (typeof response.data === 'string') {
          const cleanText = response.data.replace(/^\uFEFF/, '').trim();
          return JSON.parse(cleanText) as OtaManifest;
        }
      }
    } catch (httpErr) {
      console.warn('[OTA] CapacitorHttp fallback ke native fetch:', httpErr);
    }
  }

  // 2. Fallback via browser fetch API
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 9000);

  try {
    const res = await fetch(urlWithCacheBuster, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
      },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!res.ok) {
      throw new Error(`Server OTA mengembalikan HTTP ${res.status}`);
    }

    const text = await res.text();
    const cleanText = text.replace(/^\uFEFF/, '').trim();
    return JSON.parse(cleanText) as OtaManifest;
  } catch (err) {
    clearTimeout(timeoutId);
    throw err;
  }
}

/**
 * Memeriksa ketersediaan pembaruan OTA ke VPS Dedicated
 * @param forceCheck Jika true, lewati throttling dan paksa cek
 * @param showNotificationIfNoUpdate Jika true, tampilkan toast jika sudah versi terbaru (untuk cek manual)
 */
export const checkOtaUpdate = async (
  forceCheck: boolean = false,
  showNotificationIfNoUpdate: boolean = false
): Promise<OtaState> => {
  if (!isMobileNative()) {
    const curr = 'web';
    setState({ isChecking: false, currentVersion: curr });
    if (showNotificationIfNoUpdate) {
      toast.success('Aplikasi berjalan di browser web, OTA tidak diperlukan.');
    }
    return state;
  }

  const currentVersion = await getActiveOtaVersion();
  setState({ isChecking: true, error: null, currentVersion });

  try {
    const manifest = await fetchRemoteManifest();
    const now = Date.now();
    await Preferences.set({ key: LAST_OTA_CHECK_KEY, value: now.toString() });

    if (!manifest.version || !manifest.bundle_url) {
      throw new Error('Format manifest OTA tidak valid.');
    }

    const isNewer = manifest.version !== currentVersion;

    setState({
      isChecking: false,
      hasUpdate: isNewer,
      manifest,
      remoteVersion: manifest.version,
      isModalOpen: isNewer ? true : state.isModalOpen,
      lastCheckedAt: now,
      error: null,
    });

    if (!isNewer && showNotificationIfNoUpdate) {
      toast.success(`Aplikasi sudah menggunakan versi terbaru (v${currentVersion}).`, {
        id: 'ota-up-to-date',
      });
    }

    return state;
  } catch (err: any) {
    const errMsg = err?.name === 'AbortError' ? 'Koneksi ke server OTA timeout.' : err?.message || 'Gagal memeriksa pembaruan OTA.';
    console.warn('[OTA] Pengecekan pembaruan gagal:', errMsg);
    setState({
      isChecking: false,
      error: errMsg,
    });

    if (showNotificationIfNoUpdate) {
      toast.error(errMsg, { id: 'ota-error' });
    }

    return state;
  }
};

/**
 * Mengunduh dan memasang bundle pembaruan OTA
 */
export const startOtaDownload = async (): Promise<boolean> => {
  if (!state.manifest || !isMobileNative()) return false;

  setState({ isDownloading: true, downloadProgress: 0, error: null });

  let progressHandle: any = null;
  try {
    // Pasang progress listener
    try {
      progressHandle = await CapacitorUpdater.addListener('download', (event: any) => {
        const percent = Math.min(100, Math.max(0, Math.round(event.percent || 0)));
        setState({ downloadProgress: percent });
      });
    } catch {}

    console.log('[OTA] Memulai unduhan bundle:', state.manifest.bundle_url);
    const downloaded = await CapacitorUpdater.download({
      url: state.manifest.bundle_url,
      version: state.manifest.version,
      checksum: state.manifest.checksum_sha256,
    });

    if (downloaded && downloaded.id) {
      // Pasang bundle sebagai next aktif
      await CapacitorUpdater.set({ id: downloaded.id });
      await Preferences.set({ key: CURRENT_OTA_VERSION_KEY, value: state.manifest.version });
      console.log('[OTA] ✅ Bundle baru berhasil disimpan dan siap diterapkan!');

      setState({
        isDownloading: false,
        downloadProgress: 100,
        isReadyToReload: true,
      });

      return true;
    } else {
      throw new Error('Hasil unduhan bundle tidak valid.');
    }
  } catch (err: any) {
    console.error('[OTA] Gagal mengunduh bundle OTA:', err);
    setState({
      isDownloading: false,
      error: err?.message || 'Gagal mengunduh pembaruan OTA.',
    });
    toast.error('Gagal mengunduh berkas pembaruan. Silakan coba lagi.', { id: 'ota-download-fail' });
    return false;
  } finally {
    if (progressHandle && typeof progressHandle.remove === 'function') {
      try {
        await progressHandle.remove();
      } catch {}
    }
  }
};

/** Muat ulang WebView seketika untuk menerapkan bundle yang telah diunduh */
export const applyOtaReload = async (): Promise<void> => {
  if (!isMobileNative()) return;
  try {
    await CapacitorUpdater.reload();
  } catch {
    window.location.reload();
  }
};

/** Buka / tutup modal OTA secara global */
export const openOtaModal = () => setState({ isModalOpen: true });
export const dismissOtaModal = () => setState({ isModalOpen: false });

/** Inisialisasi lifecycle OTA saat aplikasi mulai berjalan */
export const initOtaUpdateLifecycle = () => {
  if (!isMobileNative()) return;

  // 1. Konfirmasi ke plugin bahwa aplikasi berjalan baik (anti-rollback)
  CapacitorUpdater.notifyAppReady().catch(() => {});

  // 2. Jalankan pengecekan otomatis setelah 1.5 detik
  setTimeout(() => {
    checkOtaUpdate(false);
  }, 1500);

  // 3. Pasang listener saat aplikasi dibuka kembali dari background
  try {
    App.addListener('appStateChange', (appState) => {
      if (appState.isActive) {
        checkOtaUpdate(false);
      }
    });
  } catch {}
};
