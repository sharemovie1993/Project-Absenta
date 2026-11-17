import React from 'react';
import { Capacitor } from '@capacitor/core';
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

export interface OtaCheckResult {
  hasUpdate: boolean;
  currentVersion: string;
  remoteVersion?: string;
  manifest?: OtaManifest;
  message: string;
}

/** Mengecek apakah aplikasi berjalan di perangkat native (Android / iOS) */
export const isMobileNative = (): boolean => {
  return Capacitor.isNativePlatform();
};

/** Mengambil versi bundle aktif di perangkat */
export const getActiveOtaVersion = async (): Promise<string> => {
  if (!isMobileNative()) return '1.0.3';
  try {
    const current = await CapacitorUpdater.current();
    if (current && current.bundle && current.bundle.version) {
      return current.bundle.version;
    }
  } catch (err) {
    // Fallback ke Preferences
  }

  try {
    const { value } = await Preferences.get({ key: CURRENT_OTA_VERSION_KEY });
    return value || '1.0.3';
  } catch {
    return '1.0.3';
  }
};

/**
 * Memeriksa ketersediaan pembaruan OTA ke VPS Dedicated
 * Menggunakan throttling (maksimal 1 pengecekan per 3 menit untuk menghemat baterai & kuota)
 */
export const checkOtaUpdate = async (forceCheck: boolean = false): Promise<OtaCheckResult> => {
  if (!isMobileNative()) {
    return {
      hasUpdate: false,
      currentVersion: 'web',
      message: 'Aplikasi berjalan di browser desktop, OTA dilewati.',
    };
  }

  const currentVersion = await getActiveOtaVersion();

  try {
    // Throttle check interval jika bukan force check
    if (!forceCheck) {
      const { value: lastCheckStr } = await Preferences.get({ key: LAST_OTA_CHECK_KEY });
      if (lastCheckStr) {
        const lastCheck = parseInt(lastCheckStr, 10);
        const elapsedMinutes = (Date.now() - lastCheck) / (1000 * 60);
        if (elapsedMinutes < 3) {
          return {
            hasUpdate: false,
            currentVersion,
            message: 'Pengecekan OTA baru saja dilakukan, throttling aktif.',
          };
        }
      }
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    const res = await fetch(`${OTA_MANIFEST_URL}?_t=${Date.now()}`, {
      method: 'GET',
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        Pragma: 'no-cache',
      },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!res.ok) {
      return {
        hasUpdate: false,
        currentVersion,
        message: `Gagal menghubungi server OTA (HTTP ${res.status}).`,
      };
    }

    const manifest: OtaManifest = await res.json();
    await Preferences.set({ key: LAST_OTA_CHECK_KEY, value: Date.now().toString() });

    if (!manifest.version || !manifest.bundle_url) {
      return {
        hasUpdate: false,
        currentVersion,
        message: 'Format manifest OTA tidak valid.',
      };
    }

    // Cek apakah versi remote berbeda dengan versi saat ini
    const isNewer = manifest.version !== currentVersion;

    return {
      hasUpdate: isNewer,
      currentVersion,
      remoteVersion: manifest.version,
      manifest,
      message: isNewer
        ? `Tersedia pembaruan versi ${manifest.version}`
        : 'Aplikasi sudah menggunakan versi terbaru.',
    };
  } catch (err: any) {
    return {
      hasUpdate: false,
      currentVersion,
      message: err.name === 'AbortError' ? 'Koneksi ke server OTA timeout.' : err.message || 'Gagal mengecek OTA.',
    };
  }
};

/**
 * Download & Pasang Update di Latar Belakang (Silent Background Download)
 * Memanfaatkan @capgo/capacitor-updater
 */
export const downloadAndApplyOtaUpdate = async (manifest: OtaManifest): Promise<boolean> => {
  if (!isMobileNative()) return false;

  try {
    console.log('[OTA] Memulai unduhan silent bundle dari:', manifest.bundle_url);
    const downloaded = await CapacitorUpdater.download({
      url: manifest.bundle_url,
      version: manifest.version,
      checksum: manifest.checksum_sha256,
    });

    if (downloaded && downloaded.id) {
      // Set bundle ini agar aktif pada restart / cold-start berikutnya
      await CapacitorUpdater.set({ id: downloaded.id });
      await Preferences.set({ key: CURRENT_OTA_VERSION_KEY, value: manifest.version });
      console.log('[OTA] ✅ Bundle baru berhasil disimpan dan siap diterapkan saat restart aplikasi!');

      // Tampilkan toast interaktif ke user agar bisa muat ulang seketika tanpa tutup app
      try {
        toast(
          (t) =>
            React.createElement(
              'div',
              { className: 'flex items-center gap-3 py-1' },
              React.createElement(
                'div',
                { className: 'flex-1 text-left' },
                React.createElement('p', { className: 'text-xs font-bold text-slate-800 dark:text-slate-100' }, '🚀 Update Aplikasi Siap!'),
                React.createElement('p', { className: 'text-[11px] text-slate-500 dark:text-slate-400' }, `Versi ${manifest.version} telah diunduh.`)
              ),
              React.createElement(
                'button',
                {
                  type: 'button',
                  onClick: () => {
                    toast.dismiss(t.id);
                    CapacitorUpdater.reload();
                  },
                  className: 'px-3 py-1.5 text-xs font-bold bg-blue-600 text-white rounded-xl shadow-md hover:bg-blue-700 active:scale-95 transition-all cursor-pointer'
                },
                'Muat Ulang'
              )
            ),
          {
            duration: 15000,
            position: 'top-center',
            id: 'ota-update-toast',
          }
        );
      } catch {}

      return true;
    }
  } catch (err) {
    console.error('[OTA] Gagal mengunduh atau memasang update OTA:', err);
  }

  return false;
};

/**
 * Muat ulang WebView untuk langsung menerapkan bundle OTA yang sudah terunduh
 */
export const applyPendingOtaUpdate = async (): Promise<void> => {
  if (!isMobileNative()) return;
  try {
    await CapacitorUpdater.reload();
  } catch {
    window.location.reload();
  }
};

/**
 * Helper terpadu: Inisialisasi OTA saat aplikasi startup & listener saat app resume
 */
export const initOtaUpdateLifecycle = () => {
  if (!isMobileNative()) return;

  // 1. Beri tahu plugin bahwa bundle yang sedang aktif berhasil dimuat tanpa crash (anti-rollback)
  CapacitorUpdater.notifyAppReady().catch(() => {});

  const runSilentOtaCheck = async () => {
    try {
      const result = await checkOtaUpdate(false);
      if (result.hasUpdate && result.manifest) {
        console.log(`[OTA] Menemukan rilis baru (${result.remoteVersion}), mengunduh di background...`);
        await downloadAndApplyOtaUpdate(result.manifest);
      }
    } catch (err) {
      console.warn('[OTA] Pengecekan background update terlewati:', err);
    }
  };

  // 2. Jalankan pengecekan 3 detik setelah aplikasi terbuka (agar tidak mengganggu render awal login/dashboard)
  setTimeout(() => {
    runSilentOtaCheck();
  }, 3000);

  // 3. Pasang listener saat aplikasi dibuka kembali dari background (App Resume)
  try {
    App.addListener('appStateChange', (state) => {
      if (state.isActive) {
        runSilentOtaCheck();
      }
    });
  } catch (err) {
    // App listener fallback
  }
};
