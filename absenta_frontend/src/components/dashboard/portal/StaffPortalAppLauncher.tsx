/**
 * StaffPortalAppLauncher.tsx
 * Launcher Portal App dengan Desain Grid Ikon Smartphone (Android/iOS Style).
 * - Ukuran Ikon Squircle Presisi dengan Nama Menu Ringkas di Bawah Ikon.
 * - Grid Responsif (4 Kolom Mobile, 6-10 Kolom Desktop).
 * - Bebas Kartu Panjang Horizontal & Noise Visual.
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
} from 'lucide-react';
import { Badge } from '../../ui/Badge';
import { Button } from '../../ui/Button';
import { useSmartMenu } from '../../../hooks/useSmartMenu';
import { iconForName } from '../../../lib/iconForName';
import { ROLE_WORKSPACES } from '../../../config/navigation.config';
import { useNavStore } from '../../../store/navStore';

export interface StaffPortalAppLauncherProps {
  user: any;
  jabatanLabel: string;
  isWaliKelas: boolean;
  waliKelasId?: string;
  absentStudentsCount?: number;
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
  onSwitchToDesktop,
  onOpenJurnalModal,
  onOpenAbsenGuruModal,
  onOpenCatatPelanggaranModal,
  onOpenTindakMasalModal,
}) => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');

  // Ambil data menu backend & active workspace persis seperti Sidebar.tsx
  const { menu: backendGroupedMenu, isLoading: isMenuLoading } = useSmartMenu();
  const activeWorkspaceId = useNavStore((state) => state.activeWorkspaceId);

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

  // ── 1. KELOMPOK UTAMA: RUANG KERJA GURU & WALI KELAS ──
  const group1Tiles = useMemo<AppTileData[]>(() => {
    const items: AppTileData[] = [];

    if (isWaliKelas) {
      items.push(
        {
          id: 'g1-monitoring-kbm',
          title: 'Live KBM',
          iconComp: Monitor,
          colorClass: 'text-blue-600 dark:text-blue-400',
          bgLightClass: 'bg-blue-50 dark:bg-blue-950/60',
          badgeText: 'Live',
          path: '/kesiswaan/monitoring',
        },
        {
          id: 'g1-rekap-absensi',
          title: 'Rekap Absensi',
          iconComp: Activity,
          colorClass: 'text-emerald-600 dark:text-emerald-400',
          bgLightClass: 'bg-emerald-50 dark:bg-emerald-950/60',
          badgeText: absentStudentsCount > 0 ? `${absentStudentsCount}` : undefined,
          path: '/attendance/rekap',
        },
        {
          id: 'g1-catatan-rapor',
          title: 'Catatan Leger',
          iconComp: FileText,
          colorClass: 'text-purple-600 dark:text-purple-400',
          bgLightClass: 'bg-purple-50 dark:bg-purple-950/60',
          path: '/rapor/cetak',
        },
        {
          id: 'g1-cetak-rapor',
          title: 'Cetak e-Rapor',
          iconComp: Printer,
          colorClass: 'text-indigo-600 dark:text-indigo-400',
          bgLightClass: 'bg-indigo-50 dark:bg-indigo-950/60',
          badgeText: 'eRapor',
          path: '/rapor/cetak',
        },
        {
          id: 'g1-risikolog',
          title: 'Risikolog Siswa',
          iconComp: AlertTriangle,
          colorClass: 'text-amber-600 dark:text-amber-400',
          bgLightClass: 'bg-amber-50 dark:bg-amber-950/60',
          path: '/kesiswaan/risikolog',
        }
      );
    }

    // Aksi Pengajaran Guru
    items.push(
      {
        id: 'g1-jadwal',
        title: 'Jadwal Mengajar',
        iconComp: Calendar,
        colorClass: 'text-cyan-600 dark:text-cyan-400',
        bgLightClass: 'bg-cyan-50 dark:bg-cyan-950/60',
        path: '/jadwal/saya',
      },
      {
        id: 'g1-jurnal-kbm',
        title: 'Isi Jurnal KBM',
        iconComp: BookOpen,
        colorClass: 'text-indigo-600 dark:text-indigo-400',
        bgLightClass: 'bg-indigo-50 dark:bg-indigo-950/60',
        onClick: onOpenJurnalModal,
      },
      {
        id: 'g1-absen-guru',
        title: 'Presensi Guru',
        iconComp: User,
        colorClass: 'text-emerald-600 dark:text-emerald-400',
        bgLightClass: 'bg-emerald-50 dark:bg-emerald-950/60',
        onClick: onOpenAbsenGuruModal,
      },
      {
        id: 'g1-catat-pelanggaran',
        title: 'Catat Pelanggaran',
        iconComp: ShieldAlert,
        colorClass: 'text-rose-600 dark:text-rose-400',
        bgLightClass: 'bg-rose-50 dark:bg-rose-950/60',
        onClick: onOpenCatatPelanggaranModal,
      },
      {
        id: 'g1-tindak-masal',
        title: 'Tindak Masal',
        iconComp: CheckCircle2,
        colorClass: 'text-amber-600 dark:text-amber-400',
        bgLightClass: 'bg-amber-50 dark:bg-amber-950/60',
        onClick: onOpenTindakMasalModal,
      }
    );

    return items;
  }, [
    isWaliKelas,
    absentStudentsCount,
    onOpenJurnalModal,
    onOpenAbsenGuruModal,
    onOpenCatatPelanggaranModal,
    onOpenTindakMasalModal,
  ]);

  // ── 2. KELOMPOK UTAMA: RUANG JABATAN & LINTAS MODUL (LOGIKA PENYARINGAN SIDEBAR) ──
  const group2BackendTiles = useMemo<AppTileData[]>(() => {
    if (!backendGroupedMenu || backendGroupedMenu.length === 0) return [];

    const isAdmin =
      String(user?.role?.name || '').toUpperCase() === 'ADMIN' ||
      String(user?.role?.name || '').toUpperCase() === 'SUPERADMIN' ||
      user?.tenant_id === 'system';

    const currentWs = ROLE_WORKSPACES.find((w) => w.id === activeWorkspaceId) || ROLE_WORKSPACES[0];

    const allBackendTiles: AppTileData[] = [];
    let tileCounter = 0;

    backendGroupedMenu.forEach((group) => {
      if (!group.items || group.items.length === 0) return;

      group.items.forEach((item) => {
        const accent = COLOR_ACCENTS[tileCounter % COLOR_ACCENTS.length];
        tileCounter++;

        allBackendTiles.push({
          id: `g2-item-${item.id || tileCounter}`,
          title: item.name,
          iconName: item.icon || item.name,
          colorClass: accent.colorClass,
          bgLightClass: accent.bgLightClass,
          badgeText: item.premiumInfo?.isPremium ? 'PRO' : undefined,
          path: item.path,
          categoryLabel: group.label,
        });
      });
    });

    if (isAdmin) {
      return allBackendTiles;
    }

    // UNTUK NON-ADMIN: PENYARINGAN WORKSPACE PERSIS SIDEBAR
    const allowedCrossPaths = new Set(
      (currentWs.crossModulePaths || []).map((p) => p.toLowerCase())
    );

    const filteredTiles = allBackendTiles.filter((tile) => {
      const p = (tile.path || '').toLowerCase();
      if (!p || p === '#' || p === '/dashboard') return false;

      if (currentWs.targetGroupKeywords && currentWs.targetGroupKeywords.length > 0) {
        const catName = (tile.categoryLabel || '').toUpperCase();
        if (currentWs.targetGroupKeywords.some((kw) => catName.includes(kw.toUpperCase()))) return true;
      }

      if (allowedCrossPaths.has(p)) return true;

      if (currentWs.id === 'WALIKELAS_WORKSPACE') {
        if (p.includes('/rapor') || p.includes('/monitoring') || p.includes('/piket')) return true;
      } else if (currentWs.id === 'TEACHER_WORKSPACE') {
        if (
          p.includes('riwayat-ajar') ||
          p.includes('my-attendance') ||
          p.includes('/kurikulum/jadwal') ||
          p.includes('/kurikulum/perangkat') ||
          p.includes('/kurikulum/kalender') ||
          p.includes('/rapor/nilai') ||
          p.includes('/rapor/p5')
        )
          return true;
      } else if (currentWs.id === 'KEPSEK_WORKSPACE') {
        if (
          p === '/kurikulum/dashboard' ||
          p === '/attendance/guru-monitoring' ||
          p === '/kurikulum/supervisi' ||
          p === '/attendance/rekap' ||
          p === '/kesiswaan/monitoring' ||
          p === '/kurikulum/perangkat'
        )
          return true;
      }

      return false;
    });

    if (filteredTiles.length === 0) {
      return allBackendTiles.filter((t) => {
        const p = (t.path || '').toLowerCase();
        return p && p !== '#' && p !== '/dashboard';
      });
    }

    return filteredTiles;
  }, [backendGroupedMenu, user, activeWorkspaceId]);

  // Filtered Group 1 & Group 2 items berdasarkan Search
  const filteredGroup1 = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return group1Tiles;
    return group1Tiles.filter((t) => t.title.toLowerCase().includes(q));
  }, [group1Tiles, searchQuery]);

  const filteredGroup2 = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return group2BackendTiles;
    return group2BackendTiles.filter(
      (t) =>
        t.title.toLowerCase().includes(q) ||
        (t.categoryLabel && t.categoryLabel.toLowerCase().includes(q))
    );
  }, [group2BackendTiles, searchQuery]);

  return (
    <div className="space-y-6 animate-in fade-in duration-200 pb-12 w-full max-w-full min-w-0">
      {/* ── Header Banner Compact Launcher ── */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 p-4 sm:p-5 text-white shadow-md">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-base">📱</span>
              <Badge variant="outline" className="border-indigo-400/30 bg-indigo-500/20 text-indigo-200 text-[10px] font-semibold">
                Portal App Launcher (Android App Grid)
              </Badge>
              {isWaliKelas && (
                <Badge variant="success" className="text-[10px] font-bold py-0 px-2 shadow-xs">
                  WALI KELAS
                </Badge>
              )}
            </div>
            <h1 className="text-lg sm:text-xl font-bold tracking-tight text-white">
              Halo, {user?.full_name?.split(' ')[0]}!
            </h1>
            <p className="text-xs text-slate-300 max-w-xl font-medium truncate">
              Sentuh ikon aplikasi di bawah ini untuk menuju fitur secara cepat.
            </p>
          </div>

          {/* Controls: Search & Switch Mode */}
          <div className="flex flex-wrap items-center gap-2 flex-shrink-0">
            {/* Search Input */}
            <div className="relative min-w-[180px] w-full sm:w-auto">
              <input
                type="text"
                placeholder="Cari aplikasi..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white/10 backdrop-blur-md border border-white/20 rounded-xl text-xs font-semibold pl-8 pr-3 py-2 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
              <Search size={13} className="absolute left-2.5 top-2.5 text-slate-400 pointer-events-none" />
            </div>

            {/* Switch to Desktop Mode */}
            <Button
              onClick={onSwitchToDesktop}
              className="bg-white text-slate-900 hover:bg-slate-100 rounded-xl font-bold text-xs py-2 px-3 shadow-sm flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
            >
              <LayoutGrid size={14} className="text-indigo-600" />
              <span>Mode Desktop 🖥️</span>
            </Button>
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
          KELOMPOK 1: 📱 RUANG KERJA GURU & WALI KELAS (APP ICON GRID HP)
      ───────────────────────────────────────────────────────────────────────────── */}
      {filteredGroup1.length > 0 && (
        <section className="space-y-3 bg-white/60 dark:bg-slate-900/40 p-4 rounded-2xl border border-slate-200/50 dark:border-slate-800/50">
          <div className="flex items-center justify-between border-b border-slate-200/60 dark:border-slate-800/60 pb-2">
            <div className="flex items-center gap-2">
              <div className="p-1 rounded-lg bg-indigo-600 text-white shadow-2xs">
                <Sparkles size={14} />
              </div>
              <h2 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                1. Ruang Kerja Guru & Wali Kelas
              </h2>
            </div>
            <span className="text-[10px] font-bold text-slate-400">
              {filteredGroup1.length} Aplikasi
            </span>
          </div>

          {/* Grid Smartphone App Icon (4 Kolom Mobile, 6-10 Kolom Desktop) */}
          <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-3 sm:gap-4 pt-1">
            {filteredGroup1.map((tile) => (
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
          KELOMPOK 2: 🏛️ RUANG KERJA JABATAN & LINTAS MODUL (APP ICON GRID HP)
      ───────────────────────────────────────────────────────────────────────────── */}
      <section className="space-y-3 bg-white/60 dark:bg-slate-900/40 p-4 rounded-2xl border border-slate-200/50 dark:border-slate-800/50">
        <div className="flex items-center justify-between border-b border-slate-200/60 dark:border-slate-800/60 pb-2">
          <div className="flex items-center gap-2">
            <div className="p-1 rounded-lg bg-blue-600 text-white shadow-2xs">
              <Building2 size={14} />
            </div>
            <h2 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              2. Ruang Kerja Jabatan & Informasi Lintas Modul
            </h2>
          </div>

          <span className="text-[10px] font-bold text-slate-400">
            {filteredGroup2.length} Aplikasi
          </span>
        </div>

        {/* Grid Smartphone App Icon (4 Kolom Mobile, 6-10 Kolom Desktop) */}
        {filteredGroup2.length > 0 ? (
          <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-3 sm:gap-4 pt-1">
            {filteredGroup2.map((tile) => (
              <MemoizedAppTileItem
                key={tile.id}
                tile={tile}
                onNavigate={handleTileNavigate}
              />
            ))}
          </div>
        ) : (
          <div className="p-6 text-center bg-white dark:bg-slate-900 rounded-xl border border-slate-200/60 dark:border-slate-800">
            <Compass className="w-6 h-6 text-slate-300 mx-auto mb-1.5" />
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Tidak ada aplikasi yang cocok dengan kriteria pencarian Anda.
            </p>
          </div>
        )}
      </section>
    </div>
  );
};
