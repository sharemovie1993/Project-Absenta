import { useMemo } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import { 
  Award, 
  Users, 
  FileText, 
  BookOpen, 
  ShieldAlert, 
  Briefcase, 
  HeartHandshake, 
  GraduationCap, 
  Building2, 
  Wrench, 
  Compass, 
  PiggyBank, 
  ShieldCheck, 
  ScanLine 
} from 'lucide-react';
import { useAuth } from './useAuth';
import { useCapabilities } from './useCapabilities';
import { useMyPengujiSidang } from './useMyPengujiSidang';
import { 
  type MobileBottomSubItem, 
  type EcosystemType,
} from '@/config/bottomNavEcosystems.config';

export interface UserRoleDashboardItem extends MobileBottomSubItem {
  code: string;
  category: 'kontrol' | 'akademik' | 'kesiswaan';
  description?: string;
  tabKey: string;
}

/**
 * 🏛️ Single Source of Truth: Daftar Jabatan & Ekosistem Peran Pengguna
 * 
 * Mengonsolidasikan seluruh evaluasi hak akses jabatan struktural guru & staf
 * agar konsisten di semua perangkat (BottomNav, Drawer HP, Divisi Switcher, Desktop).
 */
export function useUserRoleDashboards() {
  const { user, isAdmin } = useAuth();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  const {
    isKaprog,
    kaprogJurusan,
    isWaliKelas: isWaliKelasFromCaps,
    isTU,
    isTUKepala,
    isTUKepegawaian,
    isTUPersuratan,
    isTUKeuangan,
    isTUSarpras,
    isKurikulum,
    isKesiswaan,
    isHubin,
    isBpbk,
    isBkk,
    isSarpras,
    isToolman,
    isKabeng,
    isPembinaEskul,
    isKoperasi,
    isGerbang,
    isPiketGuru,
    isKepsek,
    can,
  } = useCapabilities();

  const { isPengujiSidang } = useMyPengujiSidang();

  const guruProfile = user?.guru_profile;
  const rawRole = typeof user?.role === 'string' ? user.role : (user?.role as any)?.name;
  const roleName = String(rawRole || '').toUpperCase();
  const isAdminRole = isAdmin || roleName === 'ADMIN' || roleName === 'SUPERADMIN';
  const jenisPtk = (guruProfile?.jenis_ptk || (user?.guru_profile as any)?.jenis_ptk || (user as any)?.jenis_ptk || '').toUpperCase();
  const isTuStaff = isTU || roleName === 'TU' || jenisPtk === 'TENAGA_KEPENDIDIKAN' || (guruProfile?.is_tu ?? false);
  const isPendidik = !isTuStaff && !isKepsek && (jenisPtk === 'PENDIDIK' || (!jenisPtk && (roleName === 'GURU' || Boolean((user as any)?.isTeacher) || Boolean(guruProfile) || isWaliKelasFromCaps)));

  const isPembimbingPkl = !isHubin && !isKepsek && Boolean(
    (guruProfile as any)?.is_pembimbing_pkl || 
    ((guruProfile as any)?.active_pkl_count && (guruProfile as any).active_pkl_count > 0) ||
    ((user?.guru_profile as any)?.is_pembimbing_pkl) ||
    ((user?.guru_profile as any)?.active_pkl_count > 0)
  );

  const isPureGerbangStaff = roleName === 'GERBANG' || roleName === 'PETUGAS_GERBANG' || (isGerbang && !isPendidik && !isAdminRole && !isKepsek && !isKurikulum);
  const hasGerbangDuty = isGerbang || isPureGerbangStaff || (
    !isAdminRole && !isKurikulum && !isKepsek && (
      can('attendance.gate.scan') ||
      can('attendance.gate.tap.entry') ||
      can('dashboard.view.gerbang')
    )
  );

  const isWaliKelas = isWaliKelasFromCaps || !!guruProfile?.wali_kelas_di?.id || !!(user?.guru_profile as any)?.wali_kelas_di?.id;
  const waliKelasNama = guruProfile?.wali_kelas_di?.nama_kelas || (user?.guru_profile as any)?.wali_kelas_di?.nama_kelas || '';

  // Dynamic TU Tab Label & Badge
  const tuTabMeta = useMemo(() => {
    if (isTUKepala) return { label: 'Tata Usaha', shortLabel: 'TU', badge: 'KOR TU' };
    if (isTUKepegawaian) return { label: 'TU Kepegawaian', shortLabel: 'Kepegawaian', badge: 'DAPODIK' };
    if (isTUPersuratan) return { label: 'TU Persuratan', shortLabel: 'Persuratan', badge: 'SURAT' };
    if (isTUKeuangan) return { label: 'TU Keuangan', shortLabel: 'Keuangan', badge: 'SPP' };
    if (isTUSarpras) return { label: 'TU Sarpras & Logistik', shortLabel: 'Logistik', badge: 'KIB' };
    return { label: 'Tata Usaha', shortLabel: 'TU', badge: 'TU' };
  }, [isTUKepala, isTUKepegawaian, isTUPersuratan, isTUKeuangan, isTUSarpras]);

  // Evaluasi Tunggal Daftar Jabatan Pengguna (Single Source of Truth)
  const roleDashboards = useMemo<UserRoleDashboardItem[]>(() => {
    const list: UserRoleDashboardItem[] = [];

    // 1. Kepala Sekolah
    if (isAdminRole && !isKepsek) {
      list.push({
        id: 'dash-kepsek',
        code: 'KEPSEK',
        tabKey: 'kepsek',
        label: 'Dashboard Kepala Sekolah',
        shortLabel: 'Kepsek',
        description: 'Monitoring Eksekutif & 6 Pilar Sekolah',
        icon: Award,
        targetPath: '/dashboard?tab=kepsek',
        color: 'bg-emerald-50 dark:bg-emerald-950/70 text-emerald-600 dark:text-emerald-400',
        roleEcosystem: 'kepsek',
        category: 'kontrol',
      });
    }

    // 2. Ketua Program Keahlian / Jurusan
    if (isKaprog || isAdminRole) {
      const jurNama = kaprogJurusan?.nama || kaprogJurusan?.kode || '';
      list.push({
        id: 'dash-kaprog',
        code: 'KAPROG',
        tabKey: 'kaprog',
        label: jurNama ? `Dashboard Jurusan ${jurNama}` : 'Dashboard Jurusan',
        shortLabel: jurNama || 'Jurusan',
        description: 'Manajemen Kejuruan, UKK & Portofolio',
        icon: Award,
        targetPath: '/dashboard?tab=kaprog&subtab=beranda',
        color: 'bg-amber-50 dark:bg-amber-950/70 text-amber-600 dark:text-amber-400',
        roleEcosystem: 'kaprog',
        category: 'akademik',
      });
    }

    // 3. Wali Kelas
    if (isWaliKelas || isAdminRole) {
      list.push({
        id: 'dash-walas',
        code: 'WALAS',
        tabKey: 'binaan',
        label: waliKelasNama ? `Dashboard Walas ${waliKelasNama}` : 'Dashboard Walas',
        shortLabel: waliKelasNama || 'Walas',
        description: 'Presensi, Rekap Nilai & Cetak Rapor',
        icon: Users,
        targetPath: '/dashboard?tab=binaan&subtab=ringkasan',
        color: 'bg-blue-50 dark:bg-blue-950/70 text-blue-600 dark:text-blue-400',
        roleEcosystem: 'walas',
        category: 'akademik',
      });
    }

    // 4. Tata Usaha
    if (isTuStaff || isTU || isAdminRole) {
      list.push({
        id: 'dash-tu',
        code: 'TU',
        tabKey: 'kepegawaian',
        label: 'Dashboard TU',
        shortLabel: tuTabMeta.shortLabel || 'TU',
        description: 'Kepegawaian, Persuratan & Rekapitulasi',
        icon: FileText,
        targetPath: '/dashboard?tab=kepegawaian&subtab=beranda',
        color: 'bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400',
        badge: tuTabMeta.badge || 'TU',
        roleEcosystem: 'tu',
        category: 'kontrol',
      });
    }

    // 5. Kurikulum
    if (isKurikulum || isAdminRole || can('curriculum.view') || can('curriculum.manage')) {
      list.push({
        id: 'dash-kurikulum',
        code: 'KURIKULUM',
        tabKey: 'kurikulum',
        label: 'Dashboard Kurikulum',
        shortLabel: 'Kurikulum',
        description: 'Jadwal Mengajar, Delegasi KBM & Bank Soal',
        icon: BookOpen,
        targetPath: '/dashboard?tab=kurikulum',
        color: 'bg-emerald-50 dark:bg-emerald-950/70 text-emerald-600 dark:text-emerald-400',
        roleEcosystem: 'kurikulum',
        category: 'akademik',
      });
    }

    // 6. Kesiswaan
    if (isKesiswaan || isAdminRole || can('kesiswaan.view') || can('kesiswaan.manage')) {
      list.push({
        id: 'dash-kesiswaan',
        code: 'KESISWAAN',
        tabKey: 'kesiswaan',
        label: 'Dashboard Kesiswaan',
        shortLabel: 'Kesiswaan',
        description: 'Kedisiplinan, Poin Pelanggaran & Rekap Presensi',
        icon: ShieldAlert,
        targetPath: '/dashboard?tab=kesiswaan',
        color: 'bg-rose-50 dark:bg-rose-950/70 text-rose-600 dark:text-rose-400',
        roleEcosystem: 'kesiswaan',
        category: 'kesiswaan',
      });
    }

    // 7. Hubin & Kemitraan DUDI
    if (isHubin || isPembimbingPkl || isAdminRole || can('hubin.view') || can('hubin.manage')) {
      list.push({
        id: 'dash-hubin',
        code: 'HUBIN',
        tabKey: 'hubin',
        label: 'Dashboard Hubin',
        shortLabel: 'Hubin',
        description: 'Kemitraan Industri, MoU & Monitoring PKL',
        icon: Briefcase,
        targetPath: '/dashboard?tab=hubin',
        color: 'bg-amber-50 dark:bg-amber-950/70 text-amber-600 dark:text-amber-400',
        roleEcosystem: 'hubin',
        category: 'akademik',
      });
    }

    // 8. Bimbingan Konseling (BPBK)
    if (isBpbk || isAdminRole || can('bpbk.view') || can('bpbk.manage')) {
      list.push({
        id: 'dash-bk',
        code: 'BPBK',
        tabKey: 'bpbk',
        label: 'Dashboard BK',
        shortLabel: 'BK',
        description: 'Konseling Siswa, EWS & Home Visit',
        icon: HeartHandshake,
        targetPath: '/dashboard?tab=bpbk',
        color: 'bg-purple-50 dark:bg-purple-950/70 text-purple-600 dark:text-purple-400',
        roleEcosystem: 'bpbk',
        category: 'kesiswaan',
      });
    }

    // 9. Bursa Kerja Khusus (BKK)
    if (isBkk || isHubin || isAdminRole || can('bkk.view') || can('bkk.manage')) {
      list.push({
        id: 'dash-bkk',
        code: 'BKK',
        tabKey: 'bkk',
        label: 'Dashboard BKK',
        shortLabel: 'BKK',
        description: 'Tracer Study Alumni & Lowongan Kerja',
        icon: GraduationCap,
        targetPath: '/dashboard?tab=bkk',
        color: 'bg-cyan-50 dark:bg-cyan-950/70 text-cyan-600 dark:text-cyan-400',
        roleEcosystem: 'bkk',
        category: 'kesiswaan',
      });
    }

    // 10. Sarana Prasarana
    if (isSarpras || isKabeng || isToolman || isAdminRole || can('sarpras.view') || can('sarpras.manage')) {
      list.push({
        id: 'dash-sarpras',
        code: 'SARPRAS',
        tabKey: 'sarpras',
        label: 'Dashboard Sarpras',
        shortLabel: 'Sarpras',
        description: 'Inventarisasi Aset, Ruangan & Logistik',
        icon: Building2,
        targetPath: '/dashboard?tab=sarpras',
        color: 'bg-teal-50 dark:bg-teal-950/70 text-teal-600 dark:text-teal-400',
        roleEcosystem: 'sarpras',
        category: 'kontrol',
      });
    }

    // 11. Toolman / Teknisi Bengkel
    if ((isToolman || isKabeng || isAdminRole || can('sarpras.view') || can('sarpras.manage')) && !isKepsek) {
      list.push({
        id: 'dash-toolman',
        code: 'TOOLMAN',
        tabKey: 'toolman',
        label: 'Dashboard Toolman',
        shortLabel: 'Toolman',
        description: 'Peminjaman Alat Praktik & Perawatan Bengkel',
        icon: Wrench,
        targetPath: '/dashboard?tab=toolman',
        color: 'bg-amber-50 dark:bg-amber-950/70 text-amber-600 dark:text-amber-400',
        roleEcosystem: 'toolman',
        category: 'kontrol',
      });
    }

    // 12. Pembina Ekstrakurikuler
    if ((isPembinaEskul || isKesiswaan || isAdminRole || can('kesiswaan.view') || can('kesiswaan.manage')) && !isKepsek) {
      list.push({
        id: 'dash-ekskul',
        code: 'EKSKUL',
        tabKey: 'ekskul',
        label: 'Dashboard Ekstrakurikuler',
        shortLabel: 'Ekskul',
        description: 'Presensi Eskul & Rekap Prestasi Siswa',
        icon: Compass,
        targetPath: '/dashboard?tab=ekskul',
        color: 'bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400',
        roleEcosystem: 'ekskul',
        category: 'kesiswaan',
      });
    }

    // 13. Pembimbing PKL
    if (isPembimbingPkl && !isKepsek) {
      list.push({
        id: 'dash-pembimbing-pkl',
        code: 'PKL',
        tabKey: 'pembimbing_pkl',
        label: 'Dashboard Pembimbing PKL',
        shortLabel: 'PKL',
        description: 'Monitoring Kehadiran & Jurnal PKL Siswa',
        icon: Briefcase,
        targetPath: '/dashboard?tab=pembimbing_pkl',
        color: 'bg-teal-50 dark:bg-teal-950/70 text-teal-600 dark:text-teal-400',
        roleEcosystem: 'pembimbing_pkl',
        category: 'akademik',
      });
    }

    // 14. Koperasi & Unit Produksi
    if (isKoperasi || isAdminRole || can('coop.pos.access') || can('coop.manage')) {
      list.push({
        id: 'dash-koperasi',
        code: 'KOPERASI',
        tabKey: 'koperasi',
        label: 'Dashboard Koperasi',
        shortLabel: 'Koperasi',
        description: 'Kasir POS, Tabungan & Keuangan Anggota',
        icon: PiggyBank,
        targetPath: '/cooperative/pos',
        color: 'bg-emerald-50 dark:bg-emerald-950/70 text-emerald-600 dark:text-emerald-400',
        roleEcosystem: 'koperasi',
        category: 'kontrol',
      });
    }

    // 15. Pos Satpam & Gerbang
    if (hasGerbangDuty || isGerbang || isPureGerbangStaff || isAdminRole || can('attendance.gate.scan')) {
      list.push({
        id: 'dash-satpam',
        code: 'SATPAM',
        tabKey: 'satpam',
        label: 'Pos Satpam & Gerbang',
        shortLabel: 'Satpam',
        description: 'Presensi Tap Kartu / QR Gate Scanner',
        icon: ShieldCheck,
        targetPath: '/dashboard?tab=satpam',
        color: 'bg-rose-50 dark:bg-rose-950/70 text-rose-600 dark:text-rose-400',
        roleEcosystem: 'satpam',
        category: 'kesiswaan',
      });
    }

    // 16. Piket Guru
    if (isPiketGuru && !isKepsek) {
      list.push({
        id: 'dash-piket',
        code: 'PIKET',
        tabKey: 'kelola',
        label: 'Dashboard Piket',
        shortLabel: 'Piket',
        description: 'Izin Siswa, Dispen & Presensi Harian Guru',
        icon: ScanLine,
        targetPath: '/dashboard?tab=kelola',
        color: 'bg-blue-50 dark:bg-blue-950/70 text-blue-600 dark:text-blue-400',
        roleEcosystem: 'piket',
        category: 'kesiswaan',
      });
    }

    // 17. Penguji Sidang PKL
    if (isPengujiSidang && !isKepsek) {
      list.push({
        id: 'dash-penguji-sidang',
        code: 'SIDANG',
        tabKey: 'sidang_guru',
        label: 'Meja Penguji Sidang PKL',
        shortLabel: 'Sidang',
        description: 'Penilaian Ujian Laporan Praktik Kerja Lapangan',
        icon: Award,
        targetPath: '/dashboard?tab=ringkasan&subtab=sidang_guru',
        color: 'bg-amber-50 dark:bg-amber-950/70 text-amber-600 dark:text-amber-400',
        roleEcosystem: 'pembimbing_pkl',
        category: 'akademik',
      });
    }

    return list;
  }, [
    isAdminRole,
    isKepsek,
    isKaprog,
    kaprogJurusan,
    isWaliKelas,
    waliKelasNama,
    isTuStaff,
    isTU,
    tuTabMeta,
    isKurikulum,
    can,
    isKesiswaan,
    isHubin,
    isPembimbingPkl,
    isBpbk,
    isBkk,
    isSarpras,
    isKabeng,
    isToolman,
    isPembinaEskul,
    isKoperasi,
    hasGerbangDuty,
    isGerbang,
    isPureGerbangStaff,
    isPiketGuru,
    isPengujiSidang,
  ]);

  // Current active dashboard matcher helper
  const currentTab = searchParams.get('tab') || new URLSearchParams(location.search).get('tab');
  const activeDashboard = useMemo(() => {
    if (!currentTab) return undefined;
    return roleDashboards.find(d => d.tabKey === currentTab || d.targetPath.includes(`tab=${currentTab}`));
  }, [roleDashboards, currentTab]);

  const hasDashboard = (roleEcoOrCode: string): boolean => {
    const clean = roleEcoOrCode.toLowerCase().replace(/^dash-/, '');
    return roleDashboards.some(d => 
      d.roleEcosystem?.toLowerCase() === clean || 
      d.code.toLowerCase() === clean || 
      d.id.toLowerCase() === clean ||
      d.id.toLowerCase() === `dash-${clean}` ||
      d.tabKey.toLowerCase() === clean
    );
  };

  return {
    // Array kanonikal lengkap dengan metadata
    userDashboards: roleDashboards,
    // Alias yang langsung kompatibel dengan BottomNav (MobileBottomSubItem[])
    teacherDashboards: roleDashboards as MobileBottomSubItem[],
    activeDashboard,
    hasDashboard,
    roleCount: roleDashboards.length,
    isPendidik,
    isTuStaff,
    isKepsek,
    isAdminRole,
    waliKelasNama,
    kaprogJurusan,
    tuTabMeta,
  };
}
