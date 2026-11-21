import React, { useState, useEffect } from 'react';
import { Capacitor, CapacitorHttp } from '@capacitor/core';
import { App } from '@capacitor/app';
import { Preferences } from '@capacitor/preferences';
import { CapacitorUpdater } from '@capgo/capacitor-updater';
import toast from 'react-hot-toast';

const OTA_MANIFEST_URL = 'https://ota.absenta.id/version.json';
const OTA_TRACK_URL = 'https://ota.absenta.id/api/track';
const CURRENT_OTA_VERSION_KEY = 'absenta_current_ota_version';
const LAST_OTA_CHECK_KEY = 'absenta_last_ota_check_time';
const DEVICE_UUID_KEY = 'absenta_ota_device_uuid';

let cachedDeviceUuid: string | null = null;

/** Menghasilkan atau mengambil ID unik permanen perangkat untuk telemetri OTA */
export const getOrCreateOtaDeviceId = async (): Promise<string> => {
  if (cachedDeviceUuid) return cachedDeviceUuid;

  try {
    const { value } = await Preferences.get({ key: DEVICE_UUID_KEY });
    if (value && value.trim().length >= 8) {
      cachedDeviceUuid = value.trim();
      return cachedDeviceUuid;
    }
  } catch {}

  try {
    const localVal = localStorage.getItem(DEVICE_UUID_KEY);
    if (localVal && localVal.trim().length >= 8) {
      cachedDeviceUuid = localVal.trim();
      await Preferences.set({ key: DEVICE_UUID_KEY, value: cachedDeviceUuid }).catch(() => {});
      return cachedDeviceUuid;
    }
  } catch {}

  const randomUuid =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : 'dev-' + Math.random().toString(36).substring(2, 10) + '-' + Date.now().toString(36);

  cachedDeviceUuid = randomUuid;
  try {
    localStorage.setItem(DEVICE_UUID_KEY, randomUuid);
  } catch {}
  try {
    await Preferences.set({ key: DEVICE_UUID_KEY, value: randomUuid });
  } catch {}

  return randomUuid;
};

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
async function fetchRemoteManifest(currentVersion: string = '1.0.3'): Promise<OtaManifest> {
  const deviceId = await getOrCreateOtaDeviceId();
  const urlWithCacheBuster = `${OTA_MANIFEST_URL}?_t=${Date.now()}&did=${encodeURIComponent(deviceId)}&v=${encodeURIComponent(currentVersion)}`;

  // 1. Coba via CapacitorHttp (native Android stack - kebal CORS & WebView limits)
  if (isMobileNative()) {
    try {
      const response = await CapacitorHttp.get({
        url: urlWithCacheBuster,
        headers: {
          'Accept': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'X-Absenta-Device-Id': deviceId,
          'X-Absenta-App-Version': currentVersion,
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
 * Jika terdeteksi versi baru, OTA engine secara otomatis mengunduh bundle
 * di background secara senyap (seamless) tanpa memunculkan dialog skip/tawaran.
 *
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
    const manifest = await fetchRemoteManifest(currentVersion);
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
      // Jangan buka modal dialog tawar-menawar!
      // Modal hanya terbuka ketika unduhan SELESAI (isReadyToReload: true)
      isModalOpen: state.isReadyToReload ? true : false,
      lastCheckedAt: now,
      error: null,
    });

    if (!isNewer && showNotificationIfNoUpdate) {
      toast.success(`Aplikasi sudah menggunakan versi terbaru (v${currentVersion}).`, {
        id: 'ota-up-to-date',
      });
    }

    // 🚀 SEAMLESS BACKGROUND AUTO-DOWNLOAD:
    // Jika ada update baru dan belum sedang mendownload/ready, langsung unduh senyap di latar belakang!
    if (isNewer && !state.isDownloading && !state.isReadyToReload) {
      console.log(`[OTA] Versi baru terdeteksi (v${manifest.version}). Memulai unduhan seamless di background...`);
      startOtaDownload();
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
 * Mengunduh dan memasang bundle pembaruan OTA secara otomatis (seamless).
 * Setelah terunduh:
 * 1. Bundle langsung di-set sebagai aktif (siap pakai di startup berikutnya).
 * 2. Menampilkan dialog konfirmasi ramah jika ingin restart sekarang.
 */
export const startOtaDownload = async (): Promise<boolean> => {
  if (!state.manifest || !isMobileNative()) return false;
  if (state.isDownloading) return false;

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

    console.log('[OTA] [Seamless] Memulai unduhan bundle:', state.manifest.bundle_url);
    const downloaded = await CapacitorUpdater.download({
      url: state.manifest.bundle_url,
      version: state.manifest.version,
      checksum: state.manifest.checksum_sha256,
    });

    if (downloaded && downloaded.id) {
      // 1. Pasang bundle sebagai next aktif
      // (Artinya: ketika aplikasi dibuka kembali di sesi berikutnya, otomatis langsung jalan di versi baru)
      await CapacitorUpdater.set({ id: downloaded.id });
      await Preferences.set({ key: CURRENT_OTA_VERSION_KEY, value: state.manifest.version });
      console.log('[OTA] ✅ Bundle baru berhasil disimpan dan siap diterapkan!');

      // 2. Kirim telemetri sukses instalasi bundle OTA
      getOrCreateOtaDeviceId()
        .then((deviceId) => {
          fetch(OTA_TRACK_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'ota_installed',
              device_id: deviceId,
              app_version: state.manifest?.version || '',
              ua: typeof navigator !== 'undefined' ? navigator.userAgent : '',
            }),
          }).catch(() => {});
        })
        .catch(() => {});

      // 3. Update status: Siap muat ulang & tampilkan popup opsi restart
      setState({
        isDownloading: false,
        downloadProgress: 100,
        isReadyToReload: true,
        isModalOpen: true, // Tampilkan popup ramah untuk restart sekarang / lanjut
      });

      return true;
    } else {
      throw new Error('Hasil unduhan bundle tidak valid.');
    }
  } catch (err: any) {
    console.error('[OTA] Gagal mengunduh bundle OTA di background:', err);
    setState({
      isDownloading: false,
      error: err?.message || 'Gagal mengunduh pembaruan OTA.',
    });
    return false;
  } finally {
    if (progressHandle && typeof progressHandle.remove === 'function') {
      try {
        await progressHandle.remove();
      } catch {}
    }
  }
};

/** Alias fungsi untuk kompatibilitas penuh dengan pemanggil manual */
export const downloadAndApplyOtaUpdate = async (manifest?: OtaManifest | null): Promise<boolean> => {
  if (manifest) {
    setState({ manifest, remoteVersion: manifest.version, hasUpdate: true });
  }
  return await startOtaDownload();
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

/**
 * Membersihkan bundle-bundle versi lama agar tidak memakan memori/storage di HP pengguna (Zero Garbage Accumulation).
 * Hanya menyisakan bundle yang sedang aktif.
 */
export const pruneOldOtaBundles = async (): Promise<void> => {
  if (!isMobileNative()) return;
  try {
    const current = await CapacitorUpdater.current();
    const currentId = current?.bundle?.id;
    const { bundles } = await CapacitorUpdater.list();
    if (bundles && bundles.length > 0) {
      for (const b of bundles) {
        if (b.id && b.id !== currentId && b.id !== 'builtin') {
          console.log(`[OTA] 🧹 Membersihkan berkas versi lama: ${b.id} (v${b.version || 'unknown'})`);
          await CapacitorUpdater.delete({ id: b.id }).catch(() => {});
        }
      }
    }
  } catch (err) {
    console.warn('[OTA] Pembersihan bundle lama dilewati:', err);
  }
};

/** Inisialisasi lifecycle OTA saat aplikasi mulai berjalan */
export const initOtaUpdateLifecycle = () => {
  if (!isMobileNative()) return;

  // 1. Konfirmasi ke plugin bahwa aplikasi berjalan baik (anti-rollback) & bersihkan versi lama
  CapacitorUpdater.notifyAppReady()
    .then(() => {
      // Bersihkan bundle-bundle lama secara otomatis begitu versi baru berjalan lancar
      pruneOldOtaBundles();
    })
    .catch(() => {});

  // 2. Jalankan pengecekan otomatis setelah 2 detik
  setTimeout(() => {
    checkOtaUpdate(false);
  }, 2000);

  // 3. Pasang listener saat aplikasi dibuka kembali dari background / multitasking
  try {
    App.addListener('appStateChange', (appState) => {
      if (appState.isActive) {
        checkOtaUpdate(false);
      }
    });
  } catch {}
};
