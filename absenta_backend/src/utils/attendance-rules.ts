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
  const targetMasuk = parse(config.jamMasuk, 'HH:mm', scanMasuk);
  
  // Hitung selisih menit (scanMasuk - targetMasuk)
  const diffMenit = differenceInMinutes(scanMasuk, targetMasuk);
  
  let status: 'HADIR' | 'TERLAMBAT' | 'PULANG_CEPAT' = 'HADIR';
  let menitTerlambat = 0;
  let isLateIgnored = false;

  // Cek Keterlambatan
  if (diffMenit > config.toleransiMenit) {
    if (config.abaikanTerlambat) {
      status = 'HADIR';
      isLateIgnored = true;
    } else {
      status = 'TERLAMBAT';
      menitTerlambat = diffMenit;
    }
  }

  // TODO: Implementasi Pulang Cepat logic if needed (scanPulang < jamPulang)
  // Saat ini fokus ke Masuk dulu sesuai request user

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
  tenant: { jam_masuk_default: string; jam_pulang_default: string; toleransi_keterlambatan_menit: number },
  kelas: { jam_masuk: string | null; jam_pulang: string | null } | null,
  specialEvent: { abaikan_terlambat: boolean } | null
): AttendanceRuleConfig {
  return {
    jamMasuk: kelas?.jam_masuk || tenant.jam_masuk_default,
    jamPulang: kelas?.jam_pulang || tenant.jam_pulang_default,
    toleransiMenit: tenant.toleransi_keterlambatan_menit,
    abaikanTerlambat: specialEvent?.abaikan_terlambat || false
  };
}
