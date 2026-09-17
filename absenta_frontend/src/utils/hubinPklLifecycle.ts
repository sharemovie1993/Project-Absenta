export const HubinPklStatus = {
  AKTIF: 'AKTIF',
  SELESAI: 'SELESAI',
  BATAL: 'BATAL',
  MENUNGGU_PENEMPATAN: 'MENUNGGU_PENEMPATAN'
} as const;
export type HubinPklStatus = typeof HubinPklStatus[keyof typeof HubinPklStatus];

export const HubinPklPhase = {
  IN_SEASON_ACTIVE: 'IN_SEASON_ACTIVE',
  ROLLING_MIXED: 'ROLLING_MIXED',
  POST_SEASON_EVALUATION: 'POST_SEASON_EVALUATION',
  OFF_SEASON_PREPARATION: 'OFF_SEASON_PREPARATION'
} as const;
export type HubinPklPhase = typeof HubinPklPhase[keyof typeof HubinPklPhase];

export interface PklDisplayStatusInfo {
  status: string;
  label: string;
  variant: 'success' | 'warning' | 'info' | 'danger' | 'secondary';
  isOverdue: boolean;
}

export interface PklLifecyclePhaseInfo {
  phase: HubinPklPhase;
  title: string;
  subtitle: string;
  badgeText: string;
  badgeVariant: 'emerald' | 'amber' | 'blue' | 'purple';
}

/**
 * SSOT Helper: Menghitung tanggal target selesai PKL dari tanggal mulai + durasi bulan (3, 4, 6 bulan, dll)
 * Menggunakan kalkulasi kalender murni agar tidak terpengaruh timezone skew.
 */
export function addPklMonths(startDate: string | Date, months: number): string {
  if (!startDate) return '';
  const d = typeof startDate === 'string' ? new Date(startDate) : new Date(startDate.getTime());
  if (isNaN(d.getTime())) return '';

  const day = d.getDate();
  d.setMonth(d.getMonth() + months);

  // Tangani overflow akhir bulan (misal 31 Januari + 1 bulan = 28/29 Februari)
  if (d.getDate() !== day) {
    d.setDate(0);
  }

  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

/**
 * SSOT Helper: Menentukan status visual siswa di tabel penempatan
 * Mendeteksi jika siswa masih berstatus AKTIF namun estimasi tanggal selesai sudah terlewati.
 */
export function getPklDisplayStatus(
  row: { status?: string; tanggal_selesai?: string | Date | null },
  referenceDate: Date = new Date()
): PklDisplayStatusInfo {
  const rawStatus = (row?.status || HubinPklStatus.AKTIF).toUpperCase();

  if (rawStatus === HubinPklStatus.AKTIF) {
    if (row?.tanggal_selesai) {
      const finishDate = new Date(row.tanggal_selesai);
      // Strip hours to compare dates cleanly
      finishDate.setHours(23, 59, 59, 999);
      if (finishDate < referenceDate) {
        return {
          status: 'PERIODE_BERAKHIR',
          label: 'Periode Berakhir',
          variant: 'warning',
          isOverdue: true,
        };
      }
    }
    return {
      status: 'AKTIF',
      label: 'Aktif Praktik',
      variant: 'success',
      isOverdue: false,
    };
  }

  if (rawStatus === HubinPklStatus.SELESAI) {
    return {
      status: 'SELESAI',
      label: 'Selesai Praktik',
      variant: 'info',
      isOverdue: false,
    };
  }

  if (rawStatus === HubinPklStatus.BATAL) {
    return {
      status: 'BATAL',
      label: 'Dibatalkan',
      variant: 'danger',
      isOverdue: false,
    };
  }

  return {
    status: rawStatus,
    label: rawStatus,
    variant: 'secondary',
    isOverdue: false,
  };
}

/**
 * SSOT Helper: Mengevaluasi kondisi 4 fase siklus PKL untuk Dashboard HUBIN
 * Mengakomodasi kondisi gelombang campuran (sebagian selesai, sebagian aktif).
 */
export function resolvePklLifecyclePhase(stats: any): PklLifecyclePhaseInfo {
  const pklAktif = Number(stats?.pklAktif || 0);
  const pklOverdue = Number(stats?.pklOverdue || 0);
  const pklSelesai = Number(
    stats?.pklSelesai ?? 
    stats?.penilaianStats?.selesaiPraktikCount ?? 
    Math.max(0, Number(stats?.totalSiswaPkl || 0) - pklAktif)
  );
  const totalOut = pklSelesai + pklOverdue;
  const belumDinilai = Number(stats?.penilaianStats?.belumDinilai || 0);

  // 1. Fase Campuran / Rolling Phase (Sebagian aktif di DUDI, sebagian sudah selesai / siap ditarik)
  if (stats?.fasePkl === HubinPklPhase.ROLLING_MIXED || (pklAktif > 0 && totalOut > 0)) {
    return {
      phase: HubinPklPhase.ROLLING_MIXED,
      title: 'Pelaksanaan Campuran (Multi-Cohort / Rolling Phase)',
      subtitle: `${pklAktif} siswa sedang aktif di DUDI • ${pklSelesai} siswa telah selesai praktik${pklOverdue > 0 ? ` (${pklOverdue} siap ditarik)` : ''}`,
      badgeText: `Fase: Pelaksanaan Campuran (${pklAktif} Aktif • ${totalOut} Selesai)`,
      badgeVariant: 'purple',
    };
  }

  // 2. Fase Pelaksanaan Penuh (In-Season)
  if (pklAktif > 0) {
    return {
      phase: HubinPklPhase.IN_SEASON_ACTIVE,
      title: 'Pelaksanaan Aktif di DUDI (In-Season)',
      subtitle: `${pklAktif} siswa sedang melaksanakan praktik kerja lapangan`,
      badgeText: `Fase: Pelaksanaan Aktif (${pklAktif} Siswa di DUDI)`,
      badgeVariant: 'emerald',
    };
  }

  // 3. Fase Evaluasi Pasca PKL (Semua siswa telah ditarik, menunggu kelengkapan nilai)
  if (pklAktif === 0 && belumDinilai > 0) {
    return {
      phase: HubinPklPhase.POST_SEASON_EVALUATION,
      title: 'Evaluasi Pasca-PKL & Penyelesaian Nilai',
      subtitle: `Semua siswa telah ditarik. Menunggu kelengkapan ${belumDinilai} nilai rapor & sertifikat`,
      badgeText: 'Fase: Evaluasi Akhir & Penyelesaian Nilai',
      badgeVariant: 'amber',
    };
  }

  // 4. Fase Persiapan / Off-Season
  return {
    phase: HubinPklPhase.OFF_SEASON_PREPARATION,
    title: 'Persiapan & Plotting Mitra Baru (Off-Season)',
    subtitle: 'Administrasi periode aktif tuntas. Siap untuk pemetaan DUDI dan plotting periode baru',
    badgeText: 'Fase: Persiapan & Plotting DUDI',
    badgeVariant: 'blue',
  };
}
