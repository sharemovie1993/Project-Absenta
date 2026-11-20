import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { Preferences } from '@capacitor/preferences';
import { getActiveOtaVersion } from './otaUpdateService';
import { syncStudentAppTelemetryApi } from '@/api/academic/siswa.api';

const DEVICE_UUID_KEY = 'absenta_device_uuid';
const LAST_TELEMETRY_PING_KEY = 'absenta_last_telemetry_ping';
const PING_COOLDOWN_MS = 30 * 60 * 1000; // 30 Menit

/**
 * Parsir cerdas untuk mendeteksi Model HP dan Versi OS dari User-Agent WebView Android
 */
export function parseDeviceModelAndOs(): { model: string; os: string } {
  const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
  let os = 'Android';
  const osMatch = ua.match(/Android\s([0-9.]+)/i);
  if (osMatch) {
    os = `Android ${osMatch[1]}`;
  } else if (/iPhone|iPad|iPod/i.test(ua)) {
    const iosMatch = ua.match(/OS\s([0-9_]+)/i);
    os = iosMatch ? `iOS ${iosMatch[1].replace(/_/g, '.')}` : 'iOS';
  }

  let model = 'Perangkat Mobile';

  // 1. Samsung Galaxy (SM-xxx)
  const samsungMatch = ua.match(/SM-[A-Za-z0-9]+/i);
  if (samsungMatch) {
    return { model: `Samsung (${samsungMatch[0]})`, os };
  }

  // 2. Xiaomi / Redmi / POCO
  const xiaomiMatch = ua.match(/(Redmi[ A-Za-z0-9_-]+|POCO[ A-Za-z0-9_-]+|Mi [A-Za-z0-9_-]+)/i);
  if (xiaomiMatch) {
    return { model: `Xiaomi ${xiaomiMatch[0]}`, os };
  }

  // 3. Oppo (CPH-xxxx)
  const oppoMatch = ua.match(/CPH[0-9]+/i);
  if (oppoMatch) {
    return { model: `Oppo (${oppoMatch[0]})`, os };
  }

  // 4. Realme (RMX-xxxx)
  const realmeMatch = ua.match(/RMX[0-9]+/i);
  if (realmeMatch) {
    return { model: `Realme (${realmeMatch[0]})`, os };
  }

  // 5. Vivo (Vxxxx)
  const vivoMatch = ua.match(/V[0-9]{4}[A-Za-z]?/i);
  if (vivoMatch) {
    return { model: `Vivo (${vivoMatch[0]})`, os };
  }

  // 6. Infinix / Tecno
  const infinixMatch = ua.match(/(Infinix[ A-Za-z0-9_-]+|TECNO[ A-Za-z0-9_-]+|X[0-9]{3,4}[A-Za-z]?)/i);
  if (infinixMatch) {
    return { model: infinixMatch[0], os };
  }

  // 7. Generic Android model identifier before 'Build/'
  const genericMatch = ua.match(/Android [0-9.]+;\s*([^;)]+?)\s*Build/i);
  if (genericMatch && genericMatch[1]) {
    model = genericMatch[1].trim();
    return { model, os };
  }

  return { model, os };
}

/**
 * Ambil atau buat UUID perangkat unik yang persisten
 */
export async function getOrCreateDeviceUuid(): Promise<string> {
  try {
    const { value } = await Preferences.get({ key: DEVICE_UUID_KEY });
    if (value && value.length > 10) return value;
  } catch {}

  const fallback = typeof localStorage !== 'undefined' ? localStorage.getItem(DEVICE_UUID_KEY) : null;
  if (fallback) return fallback;

  const newUuid = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `dev-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  try {
    await Preferences.set({ key: DEVICE_UUID_KEY, value: newUuid });
  } catch {}
  try {
    if (typeof localStorage !== 'undefined') localStorage.setItem(DEVICE_UUID_KEY, newUuid);
  } catch {}

  return newUuid;
}

/**
 * Kirim telemetry status instalasi aplikasi siswa ke Backend Absenta
 * Otomatis berjalan saat siswa login atau membuka aplikasi di platform native (Capacitor/APK)
 */
export async function sendStudentAppTelemetryPing(force = false): Promise<boolean> {
  const isNative = Capacitor.isNativePlatform();
  if (!isNative && !force) {
    // Jika hanya web browser biasa di laptop/PC, tidak perlu melaporkan instalasi APK
    return false;
  }

  // Cek cooldown
  try {
    const lastPingStr = typeof sessionStorage !== 'undefined' ? sessionStorage.getItem(LAST_TELEMETRY_PING_KEY) : null;
    if (lastPingStr && !force) {
      const lastPing = Number(lastPingStr);
      if (Date.now() - lastPing < PING_COOLDOWN_MS) {
        return false; // Skip ping jika baru saja dilaporkan dalam 30 menit
      }
    }
  } catch {}

  try {
    let appVersion = '1.0.3';
    try {
      const info = await App.getInfo();
      if (info && info.version) appVersion = info.version;
    } catch {}

    const otaVersion = await getActiveOtaVersion();
    const { model: deviceModel, os: deviceOs } = parseDeviceModelAndOs();
    const deviceUuid = await getOrCreateDeviceUuid();

    await syncStudentAppTelemetryApi({
      is_installed: isNative,
      platform: Capacitor.getPlatform(),
      app_version: appVersion,
      ota_version: otaVersion,
      device_model: deviceModel,
      device_os: deviceOs,
      device_uuid: deviceUuid,
    });

    try {
      if (typeof sessionStorage !== 'undefined') {
        sessionStorage.setItem(LAST_TELEMETRY_PING_KEY, String(Date.now()));
      }
    } catch {}

    return true;
  } catch (err) {
    console.warn('[Telemetry] Telemetry sync skipped or network unavailable:', err);
    return false;
  }
}
