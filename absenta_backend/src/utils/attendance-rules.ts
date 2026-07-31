import { differenceInMinutes } from 'date-fns';
import { TZ_OFFSET } from './timezone.utils';

export interface AttendanceRuleConfig {
  jamMasuk: string;          // "07:00" or "13:00"
  jamPulang: string;         // "14:00" or "17:00"
  toleransiMenit: number;    // 15
  abaikanTerlambat: boolean; // from AbsensiKejadianKhusus
  timezone?: string;        // 'Asia/Jakarta' | 'Asia/Makassar' | 'Asia/Jayapura'
}

export interface AttendanceStatusResult {
  status: 'HADIR' | 'TERLAMBAT' | 'PULANG_CEPAT' | 'TIDAK_HADIR';
  menitTerlambat: number;
  isLateIgnored: boolean; // true if late was detected but ignored due to special event
}

/**
 * Menghitung status kehadiran berdasarkan waktu scan dan konfigurasi
 */
export function calculateAttendanceStatus(
  scanMasuk: Date | null,
  _scanPulang: Date | null,
  config: AttendanceRuleConfig
): AttendanceStatusResult {
  if (!scanMasuk) {
    return { status: 'TIDAK_HADIR', menitTerlambat: 0, isLateIgnored: false };
  }

  // Resolusi timezone tenant
  const tz = String(config.timezone || 'Asia/Jakarta').trim();
  const offsetHours = TZ_OFFSET[tz] ?? 7;
  const offsetSign = offsetHours >= 0 ? '+' : '-';
  const offsetStr = `${offsetSign}${String(Math.abs(offsetHours)).padStart(2, '0')}:00`;

  // Parse jam masuk target (07:00) pada tanggal lokal tenant
  const jamMasukStr = config.jamMasuk && typeof config.jamMasuk === 'string' && config.jamMasuk.trim() ? config.jamMasuk.trim() : '07:00';
  let targetMasuk: Date;
  try {
    const localDateStr = new Intl.DateTimeFormat('sv-SE', { timeZone: tz }).format(scanMasuk);
    const targetIso = `${localDateStr}T${jamMasukStr}:00.000${offsetStr}`;
    targetMasuk = new Date(targetIso);
    if (isNaN(targetMasuk.getTime())) {
      targetMasuk = new Date(`${localDateStr}T07:00:00.000${offsetStr}`);
    }
  } catch {
    targetMasuk = scanMasuk;
  }
  
  // Hitung selisih menit (scanMasuk - targetMasuk)
  const diffMenit = differenceInMinutes(scanMasuk, targetMasuk);
  
  let status: 'HADIR' | 'TERLAMBAT' | 'PULANG_CEPAT' = 'HADIR';
  let menitTerlambat = 0;
  let isLateIgnored = false;

  // Cek Keterlambatan
  if (diffMenit > (config.toleransiMenit ?? 15)) {
    if (config.abaikanTerlambat) {
      status = 'HADIR';
      isLateIgnored = true;
    } else {
      status = 'TERLAMBAT';
      menitTerlambat = diffMenit;
    }
  }

  return {
    status,
    menitTerlambat,
    isLateIgnored
  };
}

/**
 * Helper untuk resolve konfigurasi final (Hierarchy: SpecialEvent -> Class -> Tenant)
 */
export function resolveAttendanceConfig(
  tenant: { jam_masuk_default?: string | null; jam_pulang_default?: string | null; toleransi_keterlambatan_menit?: number | null } | null,
  kelas: { jam_masuk?: string | null; jam_pulang?: string | null } | null,
  specialEvent: { abaikan_terlambat?: boolean } | null
): AttendanceRuleConfig {
  return {
    jamMasuk: kelas?.jam_masuk || tenant?.jam_masuk_default || '07:00',
    jamPulang: kelas?.jam_pulang || tenant?.jam_pulang_default || '14:00',
    toleransiMenit: tenant?.toleransi_keterlambatan_menit ?? 15,
    abaikanTerlambat: specialEvent?.abaikan_terlambat || false
  };
}
