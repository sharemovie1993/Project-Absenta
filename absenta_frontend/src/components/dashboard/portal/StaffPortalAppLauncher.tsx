/**
 * StaffPortalAppLauncher.tsx
 * Launcher Portal App dengan 4 BLOK UTAMA TERINTEGRASI BACKEND & WORKSPACE ENGINE:
 * - Blok 1: ⚡ Aksi Cepat Diri (Quick Actions Dinamis Pengguna)
 * - Blok 2: 🏫 Ruang Kerja Guru & Wali Kelas (Aplikasi Operasional Pengajaran & Rombel Diri)
 * - Blok 3: 🏛️ Ruang Kerja Jabatan (Primary Workspace — Menu Jabatan Struktural dari Backend API)
 * - Blok 4: 🔗 Informasi Lintas Modul (Cross-Module Paths — Akses ke Modul Lain yang Relevan)
 */
import React, { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BookOpen,
  Calendar,
  Users,
  Activity,
  FileText,
  Printer,
  AlertTriangle,
  Monitor,
  LayoutGrid,
  ShieldAlert,
  CheckCircle2,
  HeartHandshake,
  User,
  Search,
  Sparkles,
  Building2,
  Loader2,
  Compass,
  Zap,
  ShieldCheck,
  Network,
} from 'lucide-react';
import { Badge } from '../../ui/Badge';
import { Button } from '../../ui/Button';
import { useSmartMenu } from '../../../hooks/useSmartMenu';
import { useWaliKelasOptions } from '../../../hooks/useWaliKelasOptions';
import { iconForName } from '../../../lib/iconForName';
import { filterNavByWorkspace, normalizeFlatMenu, isAdminUser, getAllUserCrossModuleItems, getPrimaryStructuralWorkspaceItems } from '../../../helpers/workspaceNavFilter';
import { resolveUserWorkspaces, getUserPositions } from '../../../config/navigation.config';
import { type QuickAction } from '../shared/QuickActionGrid';

export interface StaffPortalAppLauncherProps {
  user: any;
  jabatanLabel: string;
  isWaliKelas: boolean;
  waliKelasId?: string;
  absentStudentsCount?: number;
  quickActions?: QuickAction[];
  onSwitchToDesktop: () => void;
  onOpenJurnalModal: () => void;
  onOpenAbsenGuruModal: () => void;
  onOpenCatatPelanggaranModal: () => void;
  onOpenTindakMasalModal: () => void;
}

interface AppTileData {
  id: string;
  title: string;
  description?: string;
  iconName?: string;
  iconComp?: React.ElementType;
  colorClass: string;
  bgLightClass: string;
  badgeText?: string;
  path?: string;
  onClick?: () => void;
  categoryLabel?: string;
}

// ── Smartphone App Icon Tile (Android / iOS Style Grid Item) ──
const MemoizedAppTileItem = React.memo<{
  tile: AppTileData;
  onNavigate: (path?: string, onClick?: () => void) => void;
}>(({ tile, onNavigate }) => {
  const IconComponent = useMemo(() => {
    if (tile.iconComp) return tile.iconComp;
    return iconForName(tile.iconName || tile.title);
  }, [tile.iconComp, tile.iconName, tile.title]);

  const handleClick = useCallback(() => {
    onNavigate(tile.path, tile.onClick);
  }, [onNavigate, tile.path, tile.onClick]);

  return (
    <button
      onClick={handleClick}
      className="group flex flex-col items-center justify-start p-2 sm:p-2.5 rounded-2xl hover:bg-slate-200/60 dark:hover:bg-slate-800/60 transition-all duration-150 cursor-pointer text-center w-full max-w-[96px] sm:max-w-[104px] mx-auto select-none"
    >
      {/* Smartphone App Icon Box (Squircle 48px - 56px) */}
      <div className="relative">
        <div
          className={`w-12 h-12 sm:w-14 sm:h-14 rounded-2xl ${tile.bgLightClass} ${tile.colorClass} flex items-center justify-center shadow-xs group-hover:scale-110 group-hover:shadow-md transition-all duration-150 border border-slate-200/50 dark:border-slate-800/50`}
        >
          <IconComponent size={22} className="stroke-[2.2]" />
        </div>

        {/* Badge Indicator Dot / Text */}
        {tile.badgeText && (
          <span className="absolute -top-1 -right-1 px-1.5 py-0.5 rounded-full text-[9px] font-black bg-rose-500 text-white shadow-xs leading-none">
            {tile.badgeText}
          </span>
        )}
      </div>

      {/* App Name Below Icon (Teks Kecil di Bawah Ikon) */}
      <span className="text-[11px] sm:text-xs font-semibold text-slate-700 dark:text-slate-200 mt-1.5 leading-tight line-clamp-2 text-center break-words group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
        {tile.title}
      </span>
    </button>
  );
});

MemoizedAppTileItem.displayName = 'MemoizedAppTileItem';

// Soft Pastel Accent Colors for Smartphone Icons
const COLOR_ACCENTS = [
  { colorClass: 'text-indigo-600 dark:text-indigo-400', bgLightClass: 'bg-indigo-50 dark:bg-indigo-950/60' },
  { colorClass: 'text-blue-600 dark:text-blue-400', bgLightClass: 'bg-blue-50 dark:bg-blue-950/60' },
  { colorClass: 'text-emerald-600 dark:text-emerald-400', bgLightClass: 'bg-emerald-50 dark:bg-emerald-950/60' },
  { colorClass: 'text-amber-600 dark:text-amber-400', bgLightClass: 'bg-amber-50 dark:bg-amber-950/60' },
  { colorClass: 'text-purple-600 dark:text-purple-400', bgLightClass: 'bg-purple-50 dark:bg-purple-950/60' },
  { colorClass: 'text-rose-600 dark:text-rose-400', bgLightClass: 'bg-rose-50 dark:bg-rose-950/60' },
  { colorClass: 'text-cyan-600 dark:text-cyan-400', bgLightClass: 'bg-cyan-50 dark:bg-cyan-950/60' },
  { colorClass: 'text-teal-600 dark:text-teal-400', bgLightClass: 'bg-teal-50 dark:bg-teal-950/60' },
];

export const StaffPortalAppLauncher: React.FC<StaffPortalAppLauncherProps> = ({
  user,
  jabatanLabel,
  isWaliKelas,
  absentStudentsCount = 0,
  quickActions = [],
  onSwitchToDesktop,
  onOpenJurnalModal,
  onOpenAbsenGuruModal,
  onOpenCatatPelanggaranModal,
  onOpenTindakMasalModal,
}) => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');

  // Integrated Dynamic Smart Menu from Backend API
  const { menu: backendGroupedMenu, isLoading: isMenuLoading } = useSmartMenu();
  const { rawList: waliKelasAssignments } = useWaliKelasOptions();

  const handleTileNavigate = useCallback(
    (path?: string, onClick?: () => void) => {
      if (onClick) {
        onClick();
      } else if (path) {
        navigate(path);
      }
    },
    [navigate]
  );

  // ── BLOK 1: ⚡ AKSI CEPAT DIRI (Quick Actions Dinamis Pengguna) ──
  const block1QuickActionTiles = useMemo<AppTileData[]>(() => {
    if (!quickActions || quickActions.length === 0) return [];

    return quickActions.map((act, idx) => {
      const accent = COLOR_ACCENTS[idx % COLOR_ACCENTS.length];
      return {
        id: `blk1-qa-${idx}`,
        title: act.label,
        iconComp: act.icon,
        colorClass: accent.colorClass,
        bgLightClass: accent.bgLightClass,
        onClick: act.onClick,
        path: act.path,
      };
    });
  }, [quickActions]);

  // ── ROLE DETECTION UNTUK QUICK ACTIONS & TILES ──
  const positions: string[] = useMemo(() => {
    return getUserPositions(user);
  }, [user]);

  const isKurikulumRole = positions.includes('KURIKULUM');
  const isKesiswaan = positions.includes('KESISWAAN');
  const isGerbang = positions.includes('GERBANG');
  const isKaprog = positions.includes('KAPROG');
  const isKabeng = positions.includes('KABENG');
  const isPiket = positions.includes('PIKET');

  const isPiketOrKesiswaanOrIndustrial = isKesiswaan || isGerbang || isKaprog || isKabeng || isPiket;

  // ── BLOK 2: 🏫 RUANG KERJA GURU (Operasional Harian Pengajaran Universal) ──
  const block2GuruTiles = useMemo<AppTileData[]>(() => {
    const items: AppTileData[] = [
      {
        id: 'b2-ops-presensi',
        title: 'Operasional Presensi',
        iconComp: CheckCircle2,
        colorClass: 'text-emerald-600 dark:text-emerald-400',
        bgLightClass: 'bg-emerald-50 dark:bg-emerald-950/60',
        badgeText: 'Gerbang & Ops',
        path: '/attendance/ops',
      },
      {
        id: 'b2-absensi-kbm',
        title: 'Absensi Kelas',
        iconComp: Monitor,
        colorClass: 'text-blue-600 dark:text-blue-400',
        bgLightClass: 'bg-blue-50 dark:bg-blue-950/60',
        badgeText: 'Live',
        path: '/attendance/ops?tab=sesi',
      },
      {
        id: 'b2-rekap-absensi',
        title: 'Rekap Absensi',
        iconComp: Activity,
        colorClass: 'text-emerald-600 dark:text-emerald-400',
        bgLightClass: 'bg-emerald-50 dark:bg-emerald-950/60',
        badgeText: absentStudentsCount > 0 ? `${absentStudentsCount}` : undefined,
        path: '/attendance/rekap',
      },
      {
        id: 'b2-input-nilai',
        title: 'Input Nilai',
        iconComp: FileText,
        colorClass: 'text-purple-600 dark:text-purple-400',
        bgLightClass: 'bg-purple-50 dark:bg-purple-950/60',
        path: '/rapor/nilai',
      },
      {
        id: 'b2-jurnal-kbm',
        title: 'Jurnal KBM',
        iconComp: BookOpen,
        colorClass: 'text-indigo-600 dark:text-indigo-400',
        bgLightClass: 'bg-indigo-50 dark:bg-indigo-950/60',
        onClick: onOpenJurnalModal,
      },
      {
        id: 'b2-perangkat-ajar',
        title: 'Perangkat Ajar',
        iconComp: FileText,
        colorClass: 'text-teal-600 dark:text-teal-400',
        bgLightClass: 'bg-teal-50 dark:bg-teal-950/60',
        path: '/kurikulum/perangkat',
      },
      {
        id: 'b2-kalender',
        title: 'Kalender Akademik',
        iconComp: Calendar,
        colorClass: 'text-cyan-600 dark:text-cyan-400',
        bgLightClass: 'bg-cyan-50 dark:bg-cyan-950/60',
        path: '/kurikulum/kalender',
      },
      {
        id: 'b2-absen-guru',
        title: 'Presensi Guru',
        iconComp: User,
        colorClass: 'text-emerald-600 dark:text-emerald-400',
        bgLightClass: 'bg-emerald-50 dark:bg-emerald-950/60',
        onClick: onOpenAbsenGuruModal,
      },
    ];

    // Input Pelanggaran untuk Guru, Wali Kelas, Kesiswaan, Piket, Kaprog (bukan Kurikulum murni)
    if (!isKurikulumRole || isWaliKelas || isPiketOrKesiswaanOrIndustrial) {
      items.push({
        id: 'b2-catat-pelanggaran',
        title: 'Input Pelanggaran',
        iconComp: ShieldAlert,
        colorClass: 'text-rose-600 dark:text-rose-400',
        bgLightClass: 'bg-rose-50 dark:bg-rose-950/60',
        onClick: onOpenCatatPelanggaranModal,
      });
    }

    // Tindak Masal HANYA UNTUK Piket / Kesiswaan / Gerbang / Kaprog / Kabeng!
    if (isPiketOrKesiswaanOrIndustrial) {
      items.push({
        id: 'b2-tindak-masal',
        title: 'Tindak Masal',
        iconComp: CheckCircle2,
        colorClass: 'text-amber-600 dark:text-amber-400',
        bgLightClass: 'bg-amber-50 dark:bg-amber-950/60',
        onClick: onOpenTindakMasalModal,
      });
    }

    if (isGerbang || isPiketOrKesiswaanOrIndustrial) {
      items.push({
        id: 'b2-pos-satpam',
        title: 'Pos Satpam Gerbang',
        iconComp: ShieldCheck,
        colorClass: 'text-indigo-600 dark:text-indigo-400',
        bgLightClass: 'bg-indigo-50 dark:bg-indigo-950/60',
        onClick: () => navigate('/kesiswaan/pos-keamanan'),
      });
    }

    return items;
  }, [
    isWaliKelas,
    isKurikulumRole,
    isPiketOrKesiswaanOrIndustrial,
    absentStudentsCount,
    onOpenJurnalModal,
    onOpenAbsenGuruModal,
    onOpenCatatPelanggaranModal,
    onOpenTindakMasalModal,
  ]);

  // ── SEPARASI STRUCTURAL WORKSPACES (JABATAN UTAMA PIMPINAN vs JABATAN KEDUA) ──
  const userWorkspaces = useMemo(() => resolveUserWorkspaces(user), [user]);
  const structuralWorkspaces = useMemo(() => {
    const filtered = userWorkspaces.filter(
      (w) => w.id !== 'TEACHER_WORKSPACE' && w.id !== 'STUDENT_WORKSPACE'
    );

    // Hirarki Prioritas Jabatan Utama Pimpinan: Kurikulum/Kesiswaan/Kepsek/Sarpras/Hubin > Wali Kelas
    const PIMPINAN_PRIORITY: Record<string, number> = {
      KURIKULUM_WORKSPACE: 1,
      KESISWAAN_WORKSPACE: 2,
      KEPSEK_WORKSPACE: 3,
      SARPRAS_WORKSPACE: 4,
      HUBIN_WORKSPACE: 5,
      KAPROG_WORKSPACE: 6,
      KABENG_WORKSPACE: 7,
      BPBK_WORKSPACE: 8,
      GERBANG_WORKSPACE: 9,
      WALIKELAS_WORKSPACE: 10,
    };

    return [...filtered].sort((a, b) => {
      const pA = PIMPINAN_PRIORITY[a.id] ?? 50;
      const pB = PIMPINAN_PRIORITY[b.id] ?? 50;
      return pA - pB;
    });
  }, [userWorkspaces]);

  const primaryWs = structuralWorkspaces[0];
  const secondaryWs = structuralWorkspaces.length > 1 ? structuralWorkspaces[1] : null;

  // Dynamic Wali Kelas Class Name strictly sourced from Struktur Organisasi
  const waliKelasNama = useMemo(() => {
    const guruProfileId = (user as any)?.guru_profile?.id;
    const userId = user?.id;

    // 1. Primary Source: Check active assignments from Struktur Organisasi API (useWaliKelasOptions)
    if (waliKelasAssignments && waliKelasAssignments.length > 0) {
      const found = waliKelasAssignments.find((item: any) => {
        if (guruProfileId && (item.guru_id === guruProfileId || item.Guru?.id === guruProfileId)) return true;
        if (userId && (item.user_id === userId || item.Guru?.user_id === userId)) return true;
        return false;
      });
      if (found?.Kelas?.nama_kelas) return found.Kelas.nama_kelas;
      if (found?.StrukturOrganisasi?.Kelas?.nama_kelas) return found.StrukturOrganisasi.Kelas.nama_kelas;
    }

    // 2. Secondary Source: Check active positions & assignments in user object (Struktur Organisasi in Auth Context)
    if (Array.isArray(user?.positions)) {
      const foundPos = user.positions.find((p: any) =>
        (p?.code === 'WALIKELAS' || p?.name?.toLowerCase().includes('wali kelas')) && (p?.Kelas?.nama_kelas || p?.kelas_nama)
      );
      if (foundPos?.Kelas?.nama_kelas) return foundPos.Kelas.nama_kelas;
      if (foundPos?.kelas_nama) return foundPos.kelas_nama;
    }

    if (Array.isArray(user?.organizational_assignments)) {
      const foundWk = user.organizational_assignments.find((a: any) =>
        a?.is_active !== false &&
        (a?.Position?.code === 'WALIKELAS' || a?.position_code === 'WALIKELAS' || a?.code === 'WALIKELAS')
      );
      if (foundWk?.Kelas?.nama_kelas) return foundWk.Kelas.nama_kelas;
      if (foundWk?.kelas_nama) return foundWk.kelas_nama;
    }

    // 3. Fallback: Only check legacy profile if not found in Struktur Organisasi
    const directObj = (user as any)?.guru_profile?.wali_kelas_di;
    if (typeof directObj === 'object' && directObj?.nama_kelas) return directObj.nama_kelas;

    return '';
  }, [user, waliKelasAssignments]);

  const primaryWsTitle = useMemo(() => {
    if (!primaryWs) return 'MANAJEMEN AKADEMIK';
    if (primaryWs.id === 'WALIKELAS_WORKSPACE' && waliKelasNama) {
      return `WALI KELAS ${waliKelasNama}`;
    }
    return primaryWs.label;
  }, [primaryWs, waliKelasNama]);

  const secondaryWsTitle = useMemo(() => {
    if (!secondaryWs) return '';
    if (secondaryWs.id === 'WALIKELAS_WORKSPACE' && waliKelasNama) {
      return `WALI KELAS ${waliKelasNama}`;
    }
    return secondaryWs.label;
  }, [secondaryWs, waliKelasNama]);

  // Dynamic Jabatan Label (e.g. "KURIKULUM & WALI KELAS XII RPL 1")
  const dynamicJabatanLabel = useMemo(() => {
    if (structuralWorkspaces.length === 0) return '';
    return structuralWorkspaces
      .map((w) => {
        if (w.id === 'WALIKELAS_WORKSPACE' && waliKelasNama) {
          return `WALI KELAS ${waliKelasNama}`;
        }
        return w.label;
      })
      .join(' & ');
  }, [structuralWorkspaces, waliKelasNama]);

  // Clean first name without trailing commas/punctuation
  const cleanFirstName = useMemo(() => {
    const raw = String(user?.full_name || '').split(' ')[0] || '';
    return raw.replace(/[,!.]+$/g, '').trim();
  }, [user?.full_name]);

  // ── BLOK 2: 🏛️ RUANG KERJA JABATAN UTAMA (Waka / Pimpinan Struktural) ──
  const block2PrimaryTiles = useMemo<AppTileData[]>(() => {
    if (!backendGroupedMenu || backendGroupedMenu.length === 0 || !primaryWs) return [];

    const flatItems = normalizeFlatMenu(backendGroupedMenu);
    const { primaryItems } = filterNavByWorkspace(flatItems, user, primaryWs.id);

    return primaryItems.map((item, idx) => {
      const accent = COLOR_ACCENTS[idx % COLOR_ACCENTS.length];
      const isOpsPath = (item.path || '').toLowerCase().startsWith('/attendance/ops');
      const isPelanggaranPath = (item.path || '').toLowerCase().startsWith('/kesiswaan/pelanggaran');
      const isSiswaPath = (item.path || '').toLowerCase().startsWith('/academic/siswa');

      let itemTitle = item.title;
      let itemPath = item.path;

      if (isOpsPath && primaryWs.id === 'WALIKELAS_WORKSPACE') {
        itemTitle = 'Belum Hadir';
        itemPath = '/attendance/ops?tab=manual';
      } else if (isPelanggaranPath && primaryWs.id === 'WALIKELAS_WORKSPACE') {
        itemTitle = 'Pelanggaran Rombel';
        itemPath = '/kesiswaan/pelanggaran?context=walikelas';
      } else if (isSiswaPath && primaryWs.id === 'WALIKELAS_WORKSPACE') {
        itemTitle = 'Siswa Kelas Saya';
        itemPath = '/academic/siswa?context=walikelas';
      } else if (isPelanggaranPath) {
        itemPath = '/kesiswaan/pelanggaran?context=kesiswaan';
      } else if (isSiswaPath) {
        itemTitle = 'Data Siswa Sekolah';
        itemPath = '/academic/siswa?context=sekolah';
      }

      return {
        id: `b2-prim-${item.id || idx}`,
        title: itemTitle,
        iconName: item.icon,
        colorClass: accent.colorClass,
        bgLightClass: accent.bgLightClass,
        badgeText: item.isPremium ? 'PRO' : undefined,
        path: itemPath,
        categoryLabel: item.categoryLabel,
      };
    });
  }, [backendGroupedMenu, user, primaryWs]);

  // ── BLOK 3: 🏫 RUANG KERJA JABATAN KEDUA (Slot Khusus Double Jabatan, e.g. Wali Kelas) ──
  const block3SecondaryTiles = useMemo<AppTileData[]>(() => {
    if (!backendGroupedMenu || backendGroupedMenu.length === 0 || !secondaryWs) return [];

    const flatItems = normalizeFlatMenu(backendGroupedMenu);
    const { primaryItems } = filterNavByWorkspace(flatItems, user, secondaryWs.id);

    if (secondaryWs.id === 'WALIKELAS_WORKSPACE') {
      const hasOps = primaryItems.some((item) => (item.path || '').toLowerCase().startsWith('/attendance/ops'));
      if (!hasOps) {
        primaryItems.unshift({
          id: 'sec-wk-belum-hadir',
          title: 'Belum Hadir',
          path: '/attendance/ops?tab=manual',
          icon: 'UserCheck',
          categoryLabel: 'Wali Kelas',
        });
      }
    }

    return primaryItems.map((item, idx) => {
      const accent = COLOR_ACCENTS[(idx + 2) % COLOR_ACCENTS.length];
      const isOpsPath = (item.path || '').toLowerCase().startsWith('/attendance/ops');
      const isPelanggaranPath = (item.path || '').toLowerCase().startsWith('/kesiswaan/pelanggaran');
      const isSiswaPath = (item.path || '').toLowerCase().startsWith('/academic/siswa');

      let itemTitle = item.title;
      let itemPath = item.path;

      if (isOpsPath && secondaryWs.id === 'WALIKELAS_WORKSPACE') {
        itemTitle = 'Belum Hadir';
        itemPath = '/attendance/ops?tab=manual';
      } else if (isPelanggaranPath && secondaryWs.id === 'WALIKELAS_WORKSPACE') {
        itemTitle = 'Pelanggaran Rombel';
        itemPath = '/kesiswaan/pelanggaran?context=walikelas';
      } else if (isSiswaPath && secondaryWs.id === 'WALIKELAS_WORKSPACE') {
        itemTitle = 'Siswa Kelas Saya';
        itemPath = '/academic/siswa?context=walikelas';
      }

      return {
        id: `b3-sec-${item.id || idx}`,
        title: itemTitle,
        iconName: item.icon,
        colorClass: accent.colorClass,
        bgLightClass: accent.bgLightClass,
        badgeText: item.isPremium ? 'PRO' : undefined,
        path: itemPath,
        categoryLabel: item.categoryLabel,
      };
    });
  }, [backendGroupedMenu, user, secondaryWs]);

  // ── BLOK 4: 🔗 INFORMASI LINTAS MODUL ──
  const block5CrossModuleTiles = useMemo<AppTileData[]>(() => {
    if (!backendGroupedMenu || backendGroupedMenu.length === 0) return [];

    const flatItems = normalizeFlatMenu(backendGroupedMenu);
    const existingPaths = new Set([
      ...block2PrimaryTiles.map((item) => (item.path || '').toLowerCase()).filter(Boolean),
      ...block3SecondaryTiles.map((item) => (item.path || '').toLowerCase()).filter(Boolean),
    ]);

    const crossModuleItems = getAllUserCrossModuleItems(flatItems, user, existingPaths);

    return crossModuleItems.map((item, idx) => {
      const accent = COLOR_ACCENTS[idx % COLOR_ACCENTS.length];
      return {
        id: `b5-item-${item.id || idx}`,
        title: item.title,
        iconName: item.icon,
        colorClass: accent.colorClass,
        bgLightClass: accent.bgLightClass,
        badgeText: item.isPremium ? 'PRO' : undefined,
        path: item.path,
        categoryLabel: item.categoryLabel,
      };
    });
  }, [backendGroupedMenu, user, block2PrimaryTiles, block3SecondaryTiles]);

  // ── HELPER DEDUPLIKASI & FREQUENCY SORTING TERPUSAT ──
  const normalizeKey = (val?: string) => {
    if (!val) return '';
    return val
      .toLowerCase()
      .trim()
      .replace(/[\s\-_/]+/g, '');
  };

  const getFrequencyWeight = (item: AppTileData): number => {
    const p = (item.path || '').toLowerCase();
    const t = (item.title || '').toLowerCase();

    if (p.includes('/attendance/monitoring') || t.includes('live kbm')) return 10;
    if (p.includes('/attendance/rekap') || t.includes('rekap absensi')) return 15;
    if (p.includes('/rapor/nilai') || t.includes('input nilai')) return 20;
    if (p.includes('/bpbk/cases') || t.includes('monitoring kasus') || p.includes('/kesiswaan/pelanggaran')) return 25;

    if (p.includes('/rapor/cetak') || t.includes('cetak e-rapor')) return 30;
    if (p.includes('/kesiswaan/risikolog') || t.includes('risikolog')) return 35;
    if (p.includes('/kesiswaan/jadwal-kegiatan') || t.includes('jadwal kegiatan')) return 40;
    if (p.includes('/bpbk/asesmen') || t.includes('asesmen')) return 45;

    if (p.includes('/bpbk/rujukan') || t.includes('rujukan')) return 50;
    if (p.includes('/sarpras/loans') || t.includes('peminjaman')) return 60;
    if (p.includes('/cooperative') || t.includes('koperasi')) return 70;
    if (p.includes('/hubin') || t.includes('pkl')) return 80;

    return 99;
  };

  // Filtered Blok 1 (Aksi Cepat Diri)
  const filteredBlock1 = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return block1QuickActionTiles;
    return block1QuickActionTiles.filter((t) => t.title.toLowerCase().includes(q));
  }, [block1QuickActionTiles, searchQuery]);

  // Filtered Blok 2 (Primary Workspace)
  const filteredBlock2Primary = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return block2PrimaryTiles;
    return block2PrimaryTiles.filter(
      (t) => t.title.toLowerCase().includes(q) ||
             (t.categoryLabel && t.categoryLabel.toLowerCase().includes(q))
    );
  }, [block2PrimaryTiles, searchQuery]);

  // Filtered Blok 3 (Secondary Workspace)
  const filteredBlock3Secondary = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return block3SecondaryTiles;
    return block3SecondaryTiles.filter(
      (t) => t.title.toLowerCase().includes(q) ||
             (t.categoryLabel && t.categoryLabel.toLowerCase().includes(q))
    );
  }, [block3SecondaryTiles, searchQuery]);

  // Filtered Blok 4 (Operasional Pengajaran Guru)
  const deduplicatedBlock4Guru = useMemo(() => {
    const existingPaths = new Set([
      ...block2PrimaryTiles.map((t) => normalizeKey(t.path)).filter(Boolean),
      ...block3SecondaryTiles.map((t) => normalizeKey(t.path)).filter(Boolean),
      ...block1QuickActionTiles.map((t) => normalizeKey(t.path)).filter(Boolean),
    ]);
    const existingTitles = new Set([
      ...block2PrimaryTiles.map((t) => normalizeKey(t.title)).filter(Boolean),
      ...block3SecondaryTiles.map((t) => normalizeKey(t.title)).filter(Boolean),
      ...block1QuickActionTiles.map((t) => normalizeKey(t.title)).filter(Boolean),
    ]);
    const filtered = block2GuruTiles.filter((t) => {
      const pathKey = normalizeKey(t.path);
      const titleKey = normalizeKey(t.title);
      if (pathKey && existingPaths.has(pathKey)) return false;
      if (titleKey && existingTitles.has(titleKey)) return false;
      return true;
    });

    return [...filtered].sort((a, b) => getFrequencyWeight(a) - getFrequencyWeight(b));
  }, [block2GuruTiles, block2PrimaryTiles, block3SecondaryTiles, block1QuickActionTiles]);

  const filteredBlock4Guru = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return deduplicatedBlock4Guru;
    return deduplicatedBlock4Guru.filter((t) => t.title.toLowerCase().includes(q));
  }, [deduplicatedBlock4Guru, searchQuery]);

  // Filtered Blok 5 (Informasi Lintas Modul)
  const deduplicatedBlock5Cross = useMemo(() => {
    const existingPaths = new Set([
      ...block2PrimaryTiles.map((t) => normalizeKey(t.path)).filter(Boolean),
      ...block3SecondaryTiles.map((t) => normalizeKey(t.path)).filter(Boolean),
      ...block1QuickActionTiles.map((t) => normalizeKey(t.path)).filter(Boolean),
      ...deduplicatedBlock4Guru.map((t) => normalizeKey(t.path)).filter(Boolean),
    ]);
    const existingTitles = new Set([
      ...block2PrimaryTiles.map((t) => normalizeKey(t.title)).filter(Boolean),
      ...block3SecondaryTiles.map((t) => normalizeKey(t.title)).filter(Boolean),
      ...block1QuickActionTiles.map((t) => normalizeKey(t.title)).filter(Boolean),
      ...deduplicatedBlock4Guru.map((t) => normalizeKey(t.title)).filter(Boolean),
    ]);
    const seenPathsInB5 = new Set<string>();
    const filtered = block5CrossModuleTiles.filter((t) => {
      const pathKey = normalizeKey(t.path);
      const titleKey = normalizeKey(t.title);
      if (pathKey && existingPaths.has(pathKey)) return false;
      if (titleKey && existingTitles.has(titleKey)) return false;
      if (pathKey && seenPathsInB5.has(pathKey)) return false;
      if (pathKey) seenPathsInB5.add(pathKey);
      return true;
    });

    return [...filtered].sort((a, b) => getFrequencyWeight(a) - getFrequencyWeight(b));
  }, [block5CrossModuleTiles, block2PrimaryTiles, block3SecondaryTiles, block1QuickActionTiles, deduplicatedBlock4Guru]);

  const filteredBlock5Cross = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return deduplicatedBlock5Cross;
    return deduplicatedBlock5Cross.filter(
      (t) => t.title.toLowerCase().includes(q) ||
             (t.categoryLabel && t.categoryLabel.toLowerCase().includes(q))
    );
  }, [deduplicatedBlock5Cross, searchQuery]);

  return (
    <div className="space-y-6 animate-in fade-in duration-200 pb-12 w-full max-w-full min-w-0">
      {/* ── Header Banner Compact Launcher ── */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 p-4 sm:p-5 text-white shadow-md">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-base">📱</span>
              {dynamicJabatanLabel && (
                <Badge variant="success" className="text-[10px] font-bold py-0.5 px-2.5 shadow-xs uppercase">
                  {dynamicJabatanLabel}
                </Badge>
              )}
            </div>
            <h1 className="text-lg sm:text-xl font-bold tracking-tight text-white">
              Halo, {cleanFirstName}!
            </h1>
            <p className="text-xs text-slate-300 max-w-xl font-medium truncate">
              Navigasi Ikon Aplikasi Terstruktur Berbasis Fungsi & Peran Jabatan Sekolah.
            </p>
          </div>

          {/* Controls: Search */}
          <div className="flex items-center gap-2 flex-shrink-0 w-full sm:w-auto">
            {/* Search Input */}
            <div className="relative min-w-[200px] w-full sm:w-auto">
              <input
                type="text"
                placeholder="Cari aplikasi..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white/10 backdrop-blur-md border border-white/20 rounded-xl text-xs font-semibold pl-8 pr-3 py-2 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
              <Search size={13} className="absolute left-2.5 top-2.5 text-slate-400 pointer-events-none" />
            </div>
          </div>
        </div>
      </div>

      {/* Loading State */}
      {isMenuLoading && (
        <div className="flex items-center justify-center p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 shadow-xs">
          <Loader2 className="w-4 h-4 animate-spin text-indigo-600 mr-2" />
          <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">
            Memuat Ikon Aplikasi...
          </span>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────────────────
          BLOK 1: ⚡ AKSI CEPAT DIRI
      ───────────────────────────────────────────────────────────────────────────── */}
      {filteredBlock1.length > 0 && (
        <section className="space-y-3 bg-white/60 dark:bg-slate-900/40 p-4 rounded-2xl border border-slate-200/50 dark:border-slate-800/50">
          <div className="flex items-center justify-between border-b border-slate-200/60 dark:border-slate-800/60 pb-2">
            <div className="flex items-center gap-2">
              <div className="p-1 rounded-lg bg-amber-500 text-white shadow-2xs">
                <Zap size={14} />
              </div>
              <h2 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                1. Aksi Cepat Diri
              </h2>
            </div>
            <span className="text-[10px] font-bold text-slate-400">
              {filteredBlock1.length} Pintasan Cepat
            </span>
          </div>

          <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-3 sm:gap-4 pt-1">
            {filteredBlock1.map((tile) => (
              <MemoizedAppTileItem
                key={tile.id}
                tile={tile}
                onNavigate={handleTileNavigate}
              />
            ))}
          </div>
        </section>
      )}

      {/* ─────────────────────────────────────────────────────────────────────────────
          BLOK 2: 🏛️ RUANG KERJA JABATAN UTAMA (LIST JAJARAN PIMPINAN WAKA / KEPSEK / STRUCTURAL)
      ───────────────────────────────────────────────────────────────────────────── */}
      {filteredBlock2Primary.length > 0 && (
        <section className="space-y-3 bg-white/60 dark:bg-slate-900/40 p-4 rounded-2xl border border-slate-200/50 dark:border-slate-800/50">
          <div className="flex items-center justify-between border-b border-slate-200/60 dark:border-slate-800/60 pb-2">
            <div className="flex items-center gap-2">
              <div className="p-1 rounded-lg bg-blue-600 text-white shadow-2xs">
                <Building2 size={14} />
              </div>
              <h2 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                2. Ruang Kerja : {primaryWsTitle.toUpperCase()}
              </h2>
            </div>
            <span className="text-[10px] font-bold text-slate-400">
              {filteredBlock2Primary.length} Menu Struktural
            </span>
          </div>

          <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-3 sm:gap-4 pt-1">
            {filteredBlock2Primary.map((tile) => (
              <MemoizedAppTileItem
                key={tile.id}
                tile={tile}
                onNavigate={handleTileNavigate}
              />
            ))}
          </div>
        </section>
      )}

      {/* ─────────────────────────────────────────────────────────────────────────────
          BLOK 3: 🏫 RUANG KERJA JABATAN KEDUA (SLOT KHUSUS UNTUK DOUBLE JABATAN, MISAL: WALI KELAS)
      ───────────────────────────────────────────────────────────────────────────── */}
      {filteredBlock3Secondary.length > 0 && (
        <section className="space-y-3 bg-white/60 dark:bg-slate-900/40 p-4 rounded-2xl border border-slate-200/50 dark:border-slate-800/50">
          <div className="flex items-center justify-between border-b border-slate-200/60 dark:border-slate-800/60 pb-2">
            <div className="flex items-center gap-2">
              <div className="p-1 rounded-lg bg-emerald-600 text-white shadow-2xs">
                <Users size={14} />
              </div>
              <h2 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                3. Ruang Kerja Jabatan Kedua : {secondaryWsTitle.toUpperCase()}
              </h2>
            </div>
            <span className="text-[10px] font-bold text-slate-400">
              {filteredBlock3Secondary.length} Menu Jabatan Kedua
            </span>
          </div>

          <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-3 sm:gap-4 pt-1">
            {filteredBlock3Secondary.map((tile) => (
              <MemoizedAppTileItem
                key={tile.id}
                tile={tile}
                onNavigate={handleTileNavigate}
              />
            ))}
          </div>
        </section>
      )}

      {/* ─────────────────────────────────────────────────────────────────────────────
          BLOK 4: 🏫 OPERASIONAL PENGAJARAN GURU (UNIVERSAL GURU & KBM)
      ───────────────────────────────────────────────────────────────────────────── */}
      {filteredBlock4Guru.length > 0 && (
        <section className="space-y-3 bg-white/60 dark:bg-slate-900/40 p-4 rounded-2xl border border-slate-200/50 dark:border-slate-800/50">
          <div className="flex items-center justify-between border-b border-slate-200/60 dark:border-slate-800/60 pb-2">
            <div className="flex items-center gap-2">
              <div className="p-1 rounded-lg bg-indigo-600 text-white shadow-2xs">
                <Sparkles size={14} />
              </div>
              <h2 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                {secondaryWs ? '4. Operasional Pengajaran Guru' : '3. Operasional Pengajaran Guru'}
              </h2>
            </div>
            <span className="text-[10px] font-bold text-slate-400">
              {filteredBlock4Guru.length} Operasional Guru
            </span>
          </div>

          <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-3 sm:gap-4 pt-1">
            {filteredBlock4Guru.map((tile) => (
              <MemoizedAppTileItem
                key={tile.id}
                tile={tile}
                onNavigate={handleTileNavigate}
              />
            ))}
          </div>
        </section>
      )}

      {/* ─────────────────────────────────────────────────────────────────────────────
          BLOK 5: 🔗 INFORMASI LINTAS MODUL (LAYANAN LINTAS UNIT KERJA / EKOSISTEM)
      ───────────────────────────────────────────────────────────────────────────── */}
      {filteredBlock5Cross.length > 0 && (
        <section className="space-y-3 bg-white/60 dark:bg-slate-900/40 p-4 rounded-2xl border border-slate-200/50 dark:border-slate-800/50 border-dashed">
          <div className="flex items-center justify-between border-b border-slate-200/60 dark:border-slate-800/60 pb-2">
            <div className="flex items-center gap-2">
              <div className="p-1 rounded-lg bg-teal-600 text-white shadow-2xs">
                <Network size={14} />
              </div>
              <div>
                <h2 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                  {secondaryWs ? '5. Informasi Lintas Modul' : '4. Informasi Lintas Modul'}
                </h2>
                <p className="text-[10px] text-slate-400 font-medium mt-0.5">
                  Layanan & informasi pendukung lintas unit kerja
                </p>
              </div>
            </div>
            <span className="text-[10px] font-bold text-slate-400">
              {filteredBlock5Cross.length} Layanan Lintas
            </span>
          </div>

          <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-3 sm:gap-4 pt-1">
            {filteredBlock5Cross.map((tile) => (
              <MemoizedAppTileItem
                key={tile.id}
                tile={tile}
                onNavigate={handleTileNavigate}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
};
