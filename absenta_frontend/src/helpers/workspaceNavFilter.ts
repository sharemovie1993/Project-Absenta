/**
 * workspaceNavFilter.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * SENTRALISASI LOGIKA PENYARINGAN MENU BERBASIS WORKSPACE & ROLE.
 *
 * Helper ini adalah SATU-SATUNYA sumber kebenaran untuk logika:
 * 1. filterNavByWorkspace()   → Filter daftar menu backend berdasarkan workspace aktif & role
 * 2. splitNavByBlock()        → Membagi hasil filter ke Blok Primer & Blok Cross-Module
 *
 * Digunakan oleh:
 * - src/components/layout/Sidebar.tsx
 * - src/components/dashboard/portal/StaffPortalAppLauncher.tsx
 *
 * PERINGATAN: Jangan duplikasi logika ini di tempat lain.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { ROLE_WORKSPACES, resolveUserWorkspaces } from '../config/navigation.config';

// ── Tipe Data Flat Menu Item (hasil normalisasi dari backend grouped-menu) ──
export interface FlatMenuItem {
  id?: string | number;
  title: string;
  path?: string;
  icon?: string;
  isPremium?: boolean;
  categoryLabel?: string;
}

// ── Hasil akhir setelah penyaringan berbasis workspace ──
export interface WorkspaceFilterResult {
  /** Item Utama Ruang Kerja (Blok Primer) */
  primaryItems: FlatMenuItem[];
  /** Item Lintas Modul (Cross-Module) */
  crossModuleItems: FlatMenuItem[];
  /** Gabungan primaryItems + crossModuleItems (urutan: primer dulu, lintas modul belakang) */
  allAllowedItems: FlatMenuItem[];
}

/**
 * Memeriksa apakah pengguna adalah admin/superadmin.
 */
export const isAdminUser = (user: any): boolean => {
  const roleName = String(user?.role?.name || '').toUpperCase();
  return (
    roleName === 'ADMIN' ||
    roleName === 'SUPERADMIN' ||
    roleName.startsWith('PLATFORM_') ||
    user?.tenant_id === 'system'
  );
};

/**
 * getAllUserCrossModuleItems()
 * ─────────────────────────────────────────────────────────────────────────────
 * MENGAMBIL SEMUA CROSS-MODULE ITEMS DARI SELURUH WORKSPACE YANG DIMILIKI USER (OPSI A).
 * Digunakan oleh StaffPortalAppLauncher (Blok 4) agar daftar informasi lintas modul
 * tetap konsisten dan tidak berubah-ubah saat user berpindah activeWorkspaceId di desktop mode.
 */
export const getAllUserCrossModuleItems = (
  allItems: FlatMenuItem[],
  user: any,
  excludePrimaryPaths: Set<string> = new Set()
): FlatMenuItem[] => {
  if (isAdminUser(user)) return [];

  const userWorkspaces = resolveUserWorkspaces(user);
  const workspacesToScan = userWorkspaces.length > 0 ? userWorkspaces : ROLE_WORKSPACES;

  const allCrossPaths = new Set<string>();
  workspacesToScan.forEach((ws) => {
    (ws.crossModulePaths || []).forEach((p) => {
      allCrossPaths.add(p.toLowerCase());
    });
  });

  const isBkUser =
    Array.isArray(user?.capabilities) && user.capabilities.includes('view_bpbk');

  const noisePathsToExclude = new Set<string>();
  if (!isBkUser) {
    noisePathsToExclude.add('/bpbk/asesmen');
    noisePathsToExclude.add('/bpbk/rujukan');
  }

  const isSiswaUser = String(user?.role?.name || '').toUpperCase() === 'SISWA';
  if (isSiswaUser) {
    noisePathsToExclude.add('/settings');
    noisePathsToExclude.add('/settings/whatsapp');
    noisePathsToExclude.add('/settings/system-update');
    noisePathsToExclude.add('/settings/easy-tunnel');
  }

  const validItems = allItems.filter((item) => {
    const p = (item.path || '').toLowerCase();
    return p && p !== '#' && p !== '/dashboard' && !p.startsWith('menu:');
  });

  return validItems.filter((item) => {
    const p = (item.path || '').toLowerCase();
    return (
      p &&
      !excludePrimaryPaths.has(p) &&
      allCrossPaths.has(p) &&
      !noisePathsToExclude.has(p)
    );
  });
};

/**
 * getPrimaryStructuralWorkspaceItems()
 * ─────────────────────────────────────────────────────────────────────────────
 * MENGAMBIL PRIMARY ITEMS DARI WORKSPACE STRUKTURAL UTAMA PENGGUNA.
 * Digunakan oleh StaffPortalAppLauncher (Blok 3) agar murni terisolasi untuk
 * jabatan struktural pengguna (misal Kurikulum) dalam urutan murni database (canonical order).
 */
export const getPrimaryStructuralWorkspaceItems = (
  allItems: FlatMenuItem[],
  user: any
): FlatMenuItem[] => {
  if (isAdminUser(user)) {
    return allItems.filter((item) => {
      const p = (item.path || '').toLowerCase();
      return p && p !== '#' && p !== '/dashboard' && !p.startsWith('menu:');
    });
  }

  const userWorkspaces = resolveUserWorkspaces(user);
  
  // Ambil HANYA workspace jabatan struktural (bukan TEACHER_WORKSPACE / STUDENT_WORKSPACE)
  const targetWs = userWorkspaces.find(
    (w) => w.id !== 'TEACHER_WORKSPACE' && w.id !== 'STUDENT_WORKSPACE'
  );

  // Jika pengguna tidak memiliki jabatan struktural (misal Guru Biasa), Blok Jabatan harus KOSONG (Auto-Hide)
  if (!targetWs) {
    return [];
  }

  // Filter items khusus untuk workspace struktural utama tersebut
  const { primaryItems } = filterNavByWorkspace(allItems, user, targetWs.id);

  const primaryPathSet = new Set(
    primaryItems.map((i) => (i.path || '').toLowerCase()).filter(Boolean)
  );

  // Kembalikan dalam URUTAN MURNI CANONICAL DATABASE (sesuai allItems)
  return allItems.filter((item) => {
    const p = (item.path || '').toLowerCase();
    return p && primaryPathSet.has(p);
  });
};

/**
 * filterNavByWorkspace()
 * ─────────────────────────────────────────────────────────────────────────────
 * LOGIKA INTI PENYARINGAN MENU berdasarkan `activeWorkspaceId` dan `user.role`.
 *
 * Logika ini identik dengan getFilteredNavigation() di Sidebar.tsx,
 * tetapi bekerja pada array flat FlatMenuItem[] (bukan NavItem[] hierarki).
 *
 * @param allItems   - Array flat semua item menu dari backend (sudah dinormalisasi)
 * @param user       - Objek user aktif (dari authStore)
 * @param activeWorkspaceId - ID workspace aktif (dari navStore)
 * @returns WorkspaceFilterResult
 */
export const filterNavByWorkspace = (
  allItems: FlatMenuItem[],
  user: any,
  activeWorkspaceId: string | null | undefined
): WorkspaceFilterResult => {
  // Admin dapat mengakses semua menu tanpa filter
  if (isAdminUser(user)) {
    return {
      primaryItems: allItems,
      crossModuleItems: [],
      allAllowedItems: allItems,
    };
  }

  const currentWs =
    ROLE_WORKSPACES.find((w) => w.id === activeWorkspaceId) || ROLE_WORKSPACES[0];

  const validItems = allItems.filter((item) => {
    const p = (item.path || '').toLowerCase();
    return p && p !== '#' && p !== '/dashboard' && !p.startsWith('menu:');
  });

  let primaryItems: FlatMenuItem[] = [];

  // 1. Workspace dengan targetGroupKeywords (KURIKULUM, KESISWAAN, SARPRAS, HUBIN, BPBK, TU)
  if (currentWs.targetGroupKeywords && currentWs.targetGroupKeywords.length > 0) {
    primaryItems = validItems.filter((item) => {
      const catName = (item.categoryLabel || '').toUpperCase();
      return currentWs.targetGroupKeywords!.some((kw) => catName.includes(kw.toUpperCase()));
    });
  }
  // 2. Workspace Wali Kelas
  else if (currentWs.id === 'WALIKELAS_WORKSPACE') {
    const walikelasPaths = new Set([
      '/attendance/ops',
      '/attendance/monitoring',
      '/kesiswaan/monitoring',
      '/attendance/rekap',
      '/rapor/dashboard',
      '/rapor/nilai',
      '/rapor/cetak',
      '/rapor/p5',
      '/kesiswaan/pelanggaran'
    ]);
    primaryItems = validItems.filter((item) => {
      const p = (item.path || '').toLowerCase();
      return walikelasPaths.has(p);
    });
  }
  // 3. Workspace Guru
  else if (currentWs.id === 'TEACHER_WORKSPACE') {
    primaryItems = validItems.filter((item) => {
      const p = (item.path || '').toLowerCase();
      return (
        p.includes('riwayat-ajar') ||
        p.includes('my-attendance') ||
        p.includes('/kurikulum/jadwal') ||
        p.includes('/kurikulum/perangkat') ||
        p.includes('/kurikulum/kalender') ||
        p.includes('/rapor/nilai') ||
        p.includes('/rapor/p5')
      );
    });
  }
  // 4. Workspace Kepala Sekolah
  else if (currentWs.id === 'KEPSEK_WORKSPACE') {
    const kepsekPaths = new Set([
      '/kurikulum/dashboard',
      '/attendance/guru-monitoring',
      '/kurikulum/supervisi',
      '/attendance/rekap',
      '/kesiswaan/monitoring',
      '/kurikulum/perangkat',
    ]);
    primaryItems = validItems.filter((item) => {
      const p = (item.path || '').toLowerCase();
      return kepsekPaths.has(p);
    });
  }
  // 5. Workspace TU Keuangan
  else if (currentWs.id === 'TU_KEUANGAN_WORKSPACE') {
    primaryItems = validItems.filter((item) => {
      const p = (item.path || '').toLowerCase();
      return p === '/billing/invoices';
    });
  }
  // 6. Workspace TU Kepegawaian
  else if (currentWs.id === 'TU_KEPEGAWAIAN_WORKSPACE') {
    const tuPaths = new Set([
      '/academic/siswa',
      '/academic/guru',
      '/documents/member-docs',
      '/academic/ppdb-mapping',
      '/academic/struktur-organisasi',
      '/academic/transition',
      '/academic/siswa-cards',
      '/academic/staff-logs',
      '/users',
      '/settings',
      '/academic/tahun-pelajaran',
      '/academic/semester',
      '/academic/jurusan',
      '/academic/kelas',
      '/academic/mapel',
      '/kurikulum/struktur',
      '/kurikulum/guru-mapel',
      '/kurikulum/wali-kelas',
      '/kurikulum/kalender',
      '/kurikulum/jam-kbm',
      '/kurikulum/jadwal',
      '/kurikulum/jadwal-piket',
      '/kurikulum/rekap-kbm',
    ]);
    primaryItems = validItems.filter((item) => {
      const p = (item.path || '').toLowerCase();
      return tuPaths.has(p);
    });
  }
  // 7. Workspace TU Sarpras
  else if (currentWs.id === 'TU_SARPRAS_WORKSPACE') {
    primaryItems = validItems.filter((item) => {
      const p = (item.path || '').toLowerCase();
      return p === '/sarpras/inventory' || p === '/sarpras/loans' || p === '/sarpras/maintenance';
    });
  }
  // 8. Workspace Siswa
  else if (currentWs.id === 'STUDENT_WORKSPACE' || String(user?.role?.name || '').toUpperCase() === 'SISWA') {
    const userCaps = Array.isArray(user?.capabilities) ? user.capabilities : [];
    const userPositions: string[] = Array.isArray(user?.position_codes)
      ? user.position_codes.map((p: any) => String(p).toUpperCase())
      : (Array.isArray(user?.positions) ? user.positions.map((p: any) => String(p?.code || p).toUpperCase()) : []);

    const isPetugasKelas = userPositions.includes('PETUGAS_KELAS') || userCaps.includes('attendance.sessions.update.attendance');

    const studentPaths = new Set([
      '/attendance/my-attendance',
      '/kurikulum/jadwal',
      '/bpbk/konseling',
      '/rapor/nilai',
      '/profile',
      '/hubin/absensi',
    ]);

    if (isPetugasKelas) {
      studentPaths.add('/attendance/ops');
      studentPaths.add('/attendance/sesi');
      studentPaths.add('/attendance/monitoring');
      studentPaths.add('/kesiswaan/monitoring');
    }

    primaryItems = validItems.filter((item) => {
      const p = (item.path || '').toLowerCase();
      return studentPaths.has(p);
    });
  }

  // Fallback: jika tidak ada primary items dan bukan workspace TU/Siswa, tampilkan semua
  if (
    primaryItems.length === 0 &&
    !currentWs.id.startsWith('TU_') &&
    currentWs.id !== 'STUDENT_WORKSPACE' &&
    String(user?.role?.name || '').toUpperCase() !== 'SISWA'
  ) {
    primaryItems = validItems;
  }

  // Kumpulkan Cross-Module items (tidak duplikat dengan primary)
  const primaryPathSet = new Set(primaryItems.map((i) => (i.path || '').toLowerCase()));
  const allowedCrossPaths = new Set(
    (currentWs.crossModulePaths || []).map((p) => p.toLowerCase())
  );

  const isSiswaRole = String(user?.role?.name || '').toUpperCase() === 'SISWA';
  const crossModuleItems = validItems.filter((item) => {
    const p = (item.path || '').toLowerCase();
    if (isSiswaRole && (p === '/settings' || p.startsWith('/settings/'))) return false;
    return p && !primaryPathSet.has(p) && allowedCrossPaths.has(p);
  });

  const allAllowedItems = [...primaryItems, ...crossModuleItems];

  return {
    primaryItems,
    crossModuleItems,
    allAllowedItems,
  };
};

export const TWO_WORD_TITLE_MAP: Record<string, string> = {
  'Live Monitoring KBM Kelas': 'Monitoring Live KBM',
  'Live Monitoring KBM': 'Monitoring Live KBM',
  'Monitoring KBM': 'Monitoring Live KBM',
  'Rekap KBM': 'Audit Realisasi JP',
  'Rekapitulasi KBM': 'Audit Realisasi JP',
  'Laporan & Rekap Presensi': 'Rekap Presensi',
  'Cetak Rapor & Wali': 'Cetak Rapor',
  'Cetak Rapor & Catatan Wali': 'Cetak Rapor',
  'Pengaturan Jam KBM': 'Pengaturan Jam',
  'Jadwal Piket Guru': 'Jadwal Piket',
  'Perangkat Ajar (RPP)': 'Perangkat Ajar',
  'Kasus Pelanggaran (BP/BK)': 'Kasus Pelanggaran',
  'Jadwal Kegiatan Kesiswaan': 'Jadwal Kegiatan',
  'Peminjaman Alat & Ruang': 'Peminjaman Sarpras',
  'Asesmen & Pemetaan BK': 'Asesmen BK',
  'Rujukan Kasus (BP/BK)': 'Rujukan BK',
  'Input Pelanggaran Cepat': 'Input Pelanggaran',
  'Jadwal Mengajar Saya': 'Jadwal Mengajar',
  'Absensi KBM Kelas': 'Absensi Kelas',
  'Rekap Absensi Rombel': 'Rekap Absensi',
  'Input Nilai Rapor': 'Input Nilai',
  'Isi Jurnal KBM': 'Jurnal KBM',
};

export const toTwoWordTitle = (title: string): string => {
  if (!title) return '';
  if (TWO_WORD_TITLE_MAP[title]) return TWO_WORD_TITLE_MAP[title];
  const words = title.trim().split(/\s+/);
  if (words.length > 2) {
    return `${words[0]} ${words[1]}`;
  }
  return title;
};

/**
 * Normalisasi raw backend grouped menu → FlatMenuItem[]
 * Digunakan oleh StaffPortalAppLauncher (useSmartMenu sudah mengembalikan grouped-menu)
 */
export const normalizeFlatMenu = (
  backendGroupedMenu: { label?: string; items?: any[] }[]
): FlatMenuItem[] => {
  if (!backendGroupedMenu || backendGroupedMenu.length === 0) return [];

  const flat: FlatMenuItem[] = [];
  backendGroupedMenu.forEach((group) => {
    if (!group.items || group.items.length === 0) return;
    group.items.forEach((item) => {
      flat.push({
        id: item.id,
        title: toTwoWordTitle(item.name),
        path: item.path,
        icon: item.icon || item.name,
        isPremium: item.premiumInfo?.isPremium || false,
        categoryLabel: group.label,
      });
    });
  });
  return flat;
};
