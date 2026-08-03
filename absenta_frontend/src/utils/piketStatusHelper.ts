import type { IzinKeluarSiswa } from '../api/piket.api';

export type PermitGateStage = 'PENDING_GATE' | 'OUTSIDE' | 'RETURNED' | 'EARLY_DISMISSAL';

export interface PermitBadgeConfig {
  label: string;
  badgeClass: string;
  variantClass: string;
}

export interface PiketAnalyticsSummary {
  totalPermitsToday: number;
  countSedangDiLuar: number;
  countPulangAwal: number;
  countSudahKembali: number;
  countMenungguGerbang: number;
}

/**
 * Determine the canonical gate stage of an exit permit
 */
export function getPermitGateStage(
  permit: IzinKeluarSiswa,
  exitedGateIds: string[] = []
): PermitGateStage {
  const isReturned = permit.status === 'KEMBALI' || Boolean(permit.jam_kembali);
  const isPulangAwal = permit.tipe_izin === 'PULANG_AWAL';

  if (isReturned) {
    return isPulangAwal ? 'EARLY_DISMISSAL' : 'RETURNED';
  }

  if (exitedGateIds.includes(permit.id) && !isPulangAwal) {
    return 'OUTSIDE';
  }

  return 'PENDING_GATE';
}

/**
 * Get unified status badge configuration for UI components
 */
export function getPermitStatusBadge(stage: PermitGateStage): PermitBadgeConfig {
  switch (stage) {
    case 'EARLY_DISMISSAL':
      return {
        label: 'Pulang Awal',
        badgeClass: 'text-purple-600 bg-purple-50 dark:bg-purple-950/40',
        variantClass: 'bg-purple-600 text-white',
      };
    case 'RETURNED':
      return {
        label: 'Sudah Kembali',
        badgeClass: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40',
        variantClass: 'bg-emerald-600 text-white',
      };
    case 'OUTSIDE':
      return {
        label: 'Di Luar Sekolah',
        badgeClass: 'text-rose-600 bg-rose-50 dark:bg-rose-950/40',
        variantClass: 'bg-rose-500 text-white',
      };
    case 'PENDING_GATE':
    default:
      return {
        label: 'Menunggu Gerbang',
        badgeClass: 'text-amber-600 bg-amber-50 dark:bg-amber-950/40',
        variantClass: 'bg-amber-500 text-white',
      };
  }
}

/**
 * Calculate canonical analytics metrics for piket monitoring without manual inline filtering
 */
export function calculatePiketAnalytics(
  dailyPermits: IzinKeluarSiswa[] = [],
  exitedGateIds: string[] = []
): PiketAnalyticsSummary {
  let countSedangDiLuar = 0;
  let countPulangAwal = 0;
  let countSudahKembali = 0;
  let countMenungguGerbang = 0;

  for (const permit of dailyPermits) {
    const stage = getPermitGateStage(permit, exitedGateIds);
    switch (stage) {
      case 'OUTSIDE':
        countSedangDiLuar++;
        break;
      case 'EARLY_DISMISSAL':
        countPulangAwal++;
        break;
      case 'RETURNED':
        countSudahKembali++;
        break;
      case 'PENDING_GATE':
        countMenungguGerbang++;
        break;
    }
  }

  return {
    totalPermitsToday: dailyPermits.length,
    countSedangDiLuar,
    countPulangAwal,
    countSudahKembali,
    countMenungguGerbang,
  };
}

/**
 * Quick reason options presets for permit issuance form
 */
export const QUICK_REASONS_IZIN_KELUAR = [
  'Keperluan Mengambil Barang / Buku / Peralatan Tertinggal',
  'Ke Urusan Administrasi / Bank / Fotokopi Berkas',
  'Mewakili Sekolah / Lomba / Kegiatan Lintas Sekolah',
  'Keperluan Praktek Luar / Pembelian Alat Tulis / Bahan Praktik',
  'Keperluan Dinas / Tugas Luar Kesiswaan',
  'Lainnya (Ketik Manual)',
];

export const QUICK_REASONS_PULANG_AWAL = [
  'Sakit / Kondisi Fisik Kurang Fit',
  'Dipanggil / Dijemput Orang Tua / Wali Siswa',
  'Musibah / Keperluan Urgen Keluarga',
  'Izin Berobat / Kontrol Dokter / Rumah Sakit',
  'Lainnya (Ketik Manual)',
];

export const QUICK_REASONS_JURUSAN = [
  'Keperluan Pembelian Bahan Praktik / Komponen Luar Bengkel',
  'Tugas Lapangan / Survey Lokasi Project Jurusan',
  'Peminjaman Alat Praktik / Peralatan Lab Lintas Program',
  'Izin Berobat / Kondisi Fisik Kurang Fit dari Area Lab/Bengkel',
  'Keperluan Administrasi / Prakerin Jurusan',
  'Lainnya (Ketik Manual)'
];

export type PiketPersonaMode = 'UTAMA' | 'JURUSAN' | 'SATPAM';

/**
 * Get unified badge config for tipe_izin across all piket UI components
 */
export function getTipeIzinBadgeConfig(tipeIzin: string): {
  label: string;
  badgeClass: string;
  icon: string;
} {
  switch (tipeIzin) {
    case 'PULANG_AWAL':
      return {
        label: 'Pulang Awal',
        badgeClass: 'bg-purple-100 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300',
        icon: '🏠',
      };
    case 'IZIN_JURUSAN':
      return {
        label: 'Izin Jurusan',
        badgeClass: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300',
        icon: '🛠️',
      };
    case 'IZIN_KELUAR':
    default:
      return {
        label: 'Izin Keluar',
        badgeClass: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300',
        icon: '🌐',
      };
  }
}

export interface PersonaConfig {
  mode: PiketPersonaMode;
  badgeLabel: string;
  badgeClass: string;
  title: string;
  subtitle: string;
  accentColor: string;
  reasons: string[];
}

export function getPiketPersonaConfig(mode: PiketPersonaMode, namaJurusan?: string): PersonaConfig {
  if (mode === 'JURUSAN') {
    const jurusanLabel = namaJurusan ? `Jurusan ${namaJurusan}` : 'Program Keahlian';
    return {
      mode: 'JURUSAN',
      badgeLabel: `🛠️ Piket ${jurusanLabel}`,
      badgeClass: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30',
      title: `Meja Piket & Layanan Praktik ${jurusanLabel}`,
      subtitle: `Pantauan operasional perizinan siswa, alat lab, dan izin praktik di area ${jurusanLabel}.`,
      accentColor: 'emerald',
      reasons: QUICK_REASONS_JURUSAN,
    };
  }

  return {
    mode: 'UTAMA',
    badgeLabel: '🌐 Piket Utama Sekolah',
    badgeClass: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30',
    title: 'Meja Piket Utama & Kedisiplinan Kesiswaan',
    subtitle: 'Layanan terpadu penerbitan izin keluar sementara & izin pulang awal siswa.',
    accentColor: 'indigo',
    reasons: QUICK_REASONS_IZIN_KELUAR,
  };
}
