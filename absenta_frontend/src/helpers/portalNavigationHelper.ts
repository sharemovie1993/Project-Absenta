export interface UserDashboardTarget {
  label: string;
  tab: string;
  path?: string;
  badge?: string;
}

export interface StructuralPositionAction {
  id: string;
  code: string;
  label: string;
  path?: string;
  tab?: string;
  iconName: string;
  colorClass: string;
}

/**
 * Normalisasi position_codes dari data user
 */
export function getUserPositionCodes(user: any): string[] {
  if (!user) return [];
  const rawList: string[] = [];

  if (Array.isArray(user.position_codes)) {
    user.position_codes.forEach((p: any) => {
      if (p) rawList.push(String(p).toUpperCase().trim());
    });
  }

  // Fallback dari jabatan string jika ada
  if (typeof user.jabatan === 'string' && user.jabatan) {
    rawList.push(user.jabatan.toUpperCase().trim());
  }

  return Array.from(new Set(rawList));
}

/**
 * Normalisasi capabilities dari data user
 */
export function getUserCapabilities(user: any): string[] {
  if (!user) return [];
  if (Array.isArray(user.capabilities)) {
    return user.capabilities.map((c: any) => String(c).trim());
  }
  if (typeof user.capabilities === 'string') {
    try {
      const parsed = JSON.parse(user.capabilities);
      if (Array.isArray(parsed)) return parsed.map((c: any) => String(c).trim());
    } catch {
      return user.capabilities.split(',').map((c: string) => c.trim()).filter(Boolean);
    }
  }
  return [];
}

/**
 * Dapatkan daftar tombol aksi fungsional jabatan struktural yang diemban pengguna
 * Khususnya bagi Guru/Staf yang memegang SK STRUKTUR_CODES (Kurikulum, Kesiswaan, Sarpras, Hubin, BK, Wali Kelas, dll)
 */
export function getUserStructuralActions(user: any): StructuralPositionAction[] {
  if (!user) return [];

  const positionCodes = getUserPositionCodes(user);
  const actions: StructuralPositionAction[] = [];
  const added = new Set<string>();

  const addAction = (action: StructuralPositionAction) => {
    if (!added.has(action.id)) {
      added.add(action.id);
      actions.push(action);
    }
  };

  // 1. Kurikulum
  if (positionCodes.includes('KURIKULUM')) {
    addAction({
      id: 'kurikulum',
      code: 'KURIKULUM',
      label: 'Dashboard Kurikulum',
      path: '/kurikulum/dashboard',
      iconName: 'BookOpen',
      colorClass: 'bg-teal-50 hover:bg-teal-100 dark:bg-teal-950/40 dark:hover:bg-teal-900/50 text-teal-700 dark:text-teal-300 border-teal-200/80 dark:border-teal-800',
    });
  }

  // 2. Kesiswaan
  if (positionCodes.includes('KESISWAAN')) {
    addAction({
      id: 'kesiswaan',
      code: 'KESISWAAN',
      label: 'Dashboard Kesiswaan',
      path: '/kesiswaan/monitoring',
      iconName: 'Shield',
      colorClass: 'bg-pink-50 hover:bg-pink-100 dark:bg-pink-950/40 dark:hover:bg-pink-900/50 text-pink-700 dark:text-pink-300 border-pink-200/80 dark:border-pink-800',
    });
  }

  // 3. Sarana Prasarana
  if (positionCodes.includes('SARPRAS') || positionCodes.includes('TU_SARPRAS')) {
    addAction({
      id: 'sarpras',
      code: 'SARPRAS',
      label: 'Dashboard Sarpras',
      path: '/sarpras/dashboard',
      iconName: 'Building2',
      colorClass: 'bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:hover:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 border-indigo-200/80 dark:border-indigo-800',
    });
  }

  // 4. Hubungan Industri (Hubin & PKL)
  if (positionCodes.includes('HUBIN')) {
    addAction({
      id: 'hubin',
      code: 'HUBIN',
      label: 'Dashboard Hubin',
      path: '/hubin',
      iconName: 'Globe',
      colorClass: 'bg-purple-50 hover:bg-purple-100 dark:bg-purple-950/40 dark:hover:bg-purple-900/50 text-purple-700 dark:text-purple-300 border-purple-200/80 dark:border-purple-800',
    });
  }

  // 5. Bimbingan Konseling (BP/BK)
  if (positionCodes.includes('BPBK')) {
    addAction({
      id: 'bpbk',
      code: 'BPBK',
      label: 'Dashboard Konseling',
      path: '/bpbk/dashboard',
      iconName: 'HeartHandshake',
      colorClass: 'bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/50 text-rose-700 dark:text-rose-300 border-rose-200/80 dark:border-rose-800',
    });
  }

  // 6. Wali Kelas
  if (positionCodes.includes('WALIKELAS') || user?.guru_profile?.wali_kelas_di?.id) {
    addAction({
      id: 'walikelas',
      code: 'WALIKELAS',
      label: 'Ruang Wali Kelas',
      tab: 'binaan',
      iconName: 'Users',
      colorClass: 'bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/40 dark:hover:bg-blue-900/50 text-blue-700 dark:text-blue-300 border-blue-200/80 dark:border-blue-800',
    });
  }

  // 7. Kepala Bengkel
  if (positionCodes.includes('KABENG')) {
    addAction({
      id: 'kabeng',
      code: 'KABENG',
      label: 'Dashboard Bengkel',
      path: '/sarpras/dashboard',
      iconName: 'Activity',
      colorClass: 'bg-orange-50 hover:bg-orange-100 dark:bg-orange-950/40 dark:hover:bg-orange-900/50 text-orange-700 dark:text-orange-300 border-orange-200/80 dark:border-orange-800',
    });
  }

  // 8. Toolman (Teknisi Lab/Bengkel)
  if (positionCodes.includes('TOOLMAN')) {
    addAction({
      id: 'toolman',
      code: 'TOOLMAN',
      label: 'Toolroom & Lab',
      path: '/sarpras/dashboard',
      iconName: 'Wrench',
      colorClass: 'bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 dark:hover:bg-amber-900/50 text-amber-700 dark:text-amber-300 border-amber-200/80 dark:border-amber-800',
    });
  }

  // 9. Ketua Program Keahlian (Kaprog)
  if (positionCodes.includes('KAPROG')) {
    addAction({
      id: 'kaprog',
      code: 'KAPROG',
      label: 'Monitoring Kaprog',
      path: '/hubin',
      iconName: 'Award',
      colorClass: 'bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:hover:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 border-indigo-200/80 dark:border-indigo-800',
    });
  }

  // 10. Bursa Kerja Khusus (BKK)
  if (positionCodes.includes('BKK')) {
    addAction({
      id: 'bkk',
      code: 'BKK',
      label: 'Dashboard BKK',
      path: '/hubin',
      iconName: 'Briefcase',
      colorClass: 'bg-sky-50 hover:bg-sky-100 dark:bg-sky-950/40 dark:hover:bg-sky-900/50 text-sky-700 dark:text-sky-300 border-sky-200/80 dark:border-sky-800',
    });
  }

  // 11. Petugas Gerbang / Scanner (Satpam)
  if (positionCodes.includes('GERBANG')) {
    addAction({
      id: 'gerbang',
      code: 'GERBANG',
      label: 'Pos Keamanan',
      path: '/attendance/ops',
      iconName: 'ShieldCheck',
      colorClass: 'bg-red-50 hover:bg-red-100 dark:bg-red-950/40 dark:hover:bg-red-900/50 text-red-700 dark:text-red-300 border-red-200/80 dark:border-red-800',
    });
  }

  // 12. Koordinator / Kepala Tata Usaha (TU_KEPALA)
  if (positionCodes.includes('TU_KEPALA') || positionCodes.includes('TU')) {
    addAction({
      id: 'tu_kepala',
      code: 'TU_KEPALA',
      label: 'Dashboard Tata Usaha',
      tab: 'kepegawaian',
      iconName: 'FileText',
      colorClass: 'bg-violet-50 hover:bg-violet-100 dark:bg-violet-950/40 dark:hover:bg-violet-900/50 text-violet-700 dark:text-violet-300 border-violet-200/80 dark:border-violet-800',
    });
  }

  // 13. TU Persuratan & Arsip Digital
  if (positionCodes.includes('TU_PERSURATAN')) {
    addAction({
      id: 'tu_persuratan',
      code: 'TU_PERSURATAN',
      label: 'TU Persuratan',
      path: '/correspondence/dashboard',
      iconName: 'Mail',
      colorClass: 'bg-cyan-50 hover:bg-cyan-100 dark:bg-cyan-950/40 dark:hover:bg-cyan-900/50 text-cyan-700 dark:text-cyan-300 border-cyan-200/80 dark:border-cyan-800',
    });
  }

  // 14. TU Keuangan & SPP
  if (positionCodes.includes('TU_KEUANGAN')) {
    addAction({
      id: 'tu_keuangan',
      code: 'TU_KEUANGAN',
      label: 'TU Keuangan & SPP',
      tab: 'kepegawaian',
      iconName: 'Wallet',
      colorClass: 'bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 border-emerald-200/80 dark:border-emerald-800',
    });
  }

  // 15. TU Kepegawaian & Dapodik
  if (positionCodes.includes('TU_KEPEGAWAIAN')) {
    addAction({
      id: 'tu_kepegawaian',
      code: 'TU_KEPEGAWAIAN',
      label: 'TU Kepegawaian',
      tab: 'kepegawaian',
      iconName: 'Users',
      colorClass: 'bg-violet-50 hover:bg-violet-100 dark:bg-violet-950/40 dark:hover:bg-violet-900/50 text-violet-700 dark:text-violet-300 border-violet-200/80 dark:border-violet-800',
    });
  }

  // 16. Pengurus & Pengelola Koperasi
  const isKoperasiLeader = positionCodes.some(p => [
    'KETUA_KOPERASI', 'BENDAHARA_KOPERASI', 'SEKRETARIS_KOPERASI', 'MANAJER_TOKO_KOPERASI', 'PENGAWAS_KOPERASI'
  ].includes(p));
  if (isKoperasiLeader) {
    addAction({
      id: 'koperasi',
      code: 'KOPERASI',
      label: 'Dashboard Koperasi',
      path: '/cooperative/dashboard',
      iconName: 'ShoppingCart',
      colorClass: 'bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 dark:hover:bg-amber-900/50 text-amber-700 dark:text-amber-300 border-amber-200/80 dark:border-amber-800',
    });
  }

  // 17. Kepala Sekolah (Pimpinan Eksekutif)
  if (positionCodes.includes('KEPALA_SEKOLAH')) {
    addAction({
      id: 'kepsek',
      code: 'KEPALA_SEKOLAH',
      label: 'Overview Eksekutif',
      tab: 'ringkasan',
      iconName: 'Award',
      colorClass: 'bg-purple-50 hover:bg-purple-100 dark:bg-purple-950/40 dark:hover:bg-purple-900/50 text-purple-700 dark:text-purple-300 border-purple-200/80 dark:border-purple-800',
    });
  }

  // 18. Tim Ketarunaan
  if (positionCodes.includes('KETUA_PEMBINA_TARUNA')) {
    addAction({
      id: 'ketarunaan',
      code: 'KETUA_PEMBINA_TARUNA',
      label: 'Tim Ketarunaan',
      path: '/kesiswaan/program-ketarunaan',
      iconName: 'Shield',
      colorClass: 'bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 dark:hover:bg-amber-900/50 text-amber-700 dark:text-amber-300 border-amber-200/80 dark:border-amber-800',
    });
  }

  return actions;
}

/**
 * Resolusi Dashboard dan label kontekstual berdasarkan Base Role & STRUKTUR_CODES (Position Capabilities)
 */
export function resolveUserDashboardTarget(user: any): UserDashboardTarget {
  if (!user) {
    return { label: 'Beranda Utama', tab: 'ringkasan' };
  }

  const roleRaw = typeof user.role === 'string' ? user.role : user.role?.name || (user as any).roleName || '';
  const roleName = roleRaw.toUpperCase().trim();
  const positionCodes = getUserPositionCodes(user);
  const capabilities = getUserCapabilities(user);

  const hasPos = (...codes: string[]) => positionCodes.some(p => codes.includes(p));
  const hasCap = (...caps: string[]) => capabilities.some(c => caps.some(prefix => c.startsWith(prefix) || c === prefix));

  // 1. Superadmin / Platform Admin
  if (roleName === 'SUPERADMIN' || roleName.startsWith('PLATFORM_')) {
    return { label: 'Dashboard Platform', tab: 'admin', path: '/superadmin' };
  }

  // 2. Admin Sekolah murni (Tenant Admin)
  if (roleName === 'ADMIN') {
    return { label: 'Dashboard Admin', tab: 'admin', badge: 'ADMIN' };
  }

  // 3. Siswa / Peserta Didik
  if (roleName === 'SISWA' || roleName === 'STUDENT') {
    return { label: 'Dashboard Siswa', tab: 'ringkasan', path: '/dashboard', badge: 'SISWA' };
  }

  // 4. Anggota Koperasi Eksternal
  if (roleName === 'ANGGOTA_KOPERASI_EXTERNAL') {
    return { label: 'Dashboard Koperasi', tab: 'koperasi', path: '/cooperative/dashboard', badge: 'KOPERASI' };
  }

  // 5. Kepala Sekolah (Level 5 Eksekutif)
  if (hasPos('KEPALA_SEKOLAH') || roleName === 'KEPALA_SEKOLAH' || roleName === 'KEPSEK') {
    return { label: 'Overview Eksekutif', tab: 'ringkasan', badge: 'KEPSEK' };
  }

  // 6. Petugas Gerbang / Keamanan (Satpam Murni)
  const isSecurity = hasPos('GERBANG') || roleName === 'GERBANG' || hasCap('attendance.gate.scan');
  const isPendidik = roleName === 'GURU' || (user as any)?.guru_profile?.jenis_ptk === 'PENDIDIK';
  if (isSecurity && !isPendidik) {
    return { label: 'Pos Keamanan', tab: 'ringkasan', badge: 'SCAN' };
  }

  // 7. Staf Tata Usaha Fungsional Murni (tanpa mengajar)
  const isTu = hasPos('TU_KEPALA', 'TU', 'TU_KEPEGAWAIAN', 'TU_PERSURATAN', 'TU_KEUANGAN', 'TU_SARPRAS') ||
    (user as any)?.guru_profile?.jenis_ptk === 'TENAGA_KEPENDIDIKAN';
  if (isTu && !isPendidik) {
    if (hasPos('TU_KEPALA', 'TU')) return { label: 'Dashboard Tata Usaha', tab: 'kepegawaian', badge: 'KOR TU' };
    if (hasPos('TU_KEPEGAWAIAN')) return { label: 'TU Kepegawaian', tab: 'kepegawaian', badge: 'DAPODIK' };
    if (hasPos('TU_PERSURATAN')) return { label: 'TU Persuratan', tab: 'kepegawaian', badge: 'SURAT' };
    if (hasPos('TU_KEUANGAN')) return { label: 'TU Keuangan & SPP', tab: 'kepegawaian', badge: 'SPP' };
    if (hasPos('TU_SARPRAS')) return { label: 'TU Sarpras & KIB', tab: 'kepegawaian', badge: 'KIB' };
    return { label: 'Tata Usaha', tab: 'kepegawaian', badge: 'TU' };
  }

  // 8. Pengelola Usaha Koperasi Murni
  if (hasPos('MANAJER_TOKO_KOPERASI', 'BENDAHARA_KOPERASI', 'KETUA_KOPERASI', 'SEKRETARIS_KOPERASI', 'PENGAWAS_KOPERASI') && !isPendidik) {
    return { label: 'Dashboard Koperasi', tab: 'ringkasan', path: '/cooperative/dashboard', badge: 'KOPERASI' };
  }

  // 9. Default untuk Guru / Pendidik
  return { label: 'Beranda Guru', tab: 'ringkasan', badge: 'GURU' };
}
