import { differenceInMinutes, parse } from 'date-fns';

export interface AttendanceRuleConfig {
  jamMasuk: string;          // "07:00" or "13:00"
  jamPulang: string;         // "14:00" or "17:00"
  toleransiMenit: number;    // 15
  abaikanTerlambat: boolean; // from AbsensiKejadianKhusus
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

  // Parse jam masuk target (asumsi tanggal scanMasuk)
  const jamMasukStr = config.jamMasuk && typeof config.jamMasuk === 'string' && config.jamMasuk.trim() ? config.jamMasuk.trim() : '07:00';
  let targetMasuk: Date;
  try {
    targetMasuk = parse(jamMasukStr, 'HH:mm', scanMasuk);
    if (isNaN(targetMasuk.getTime())) {
      targetMasuk = parse('07:00', 'HH:mm', scanMasuk);
    }
  } catch {
    targetMasuk = parse('07:00', 'HH:mm', scanMasuk);
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
