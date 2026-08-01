/**
 * StaffPortalAppLauncher.tsx
 * Launcher Portal App dengan Desain Compact 2 KELOMPOK UTAMA:
 * - Kelompok 1: 🏫 Ruang Kerja Guru & Wali Kelas (Harian, Presensi Diri, Jurnal KBM, e-Rapor)
 * - Kelompok 2: 🏛️ Ruang Kerja Jabatan & Struktural (Ruang Kurikulum, Ruang Kesiswaan, Ruang BP/BK, Ruang Sarpras, Ruang Hubin)
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
  ChevronRight,
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
  description: string;
  iconName?: string;
  iconComp?: React.ElementType;
  colorClass: string;
  bgLightClass: string;
  badgeText?: string;
  badgeVariant?: 'neutral' | 'success' | 'warning' | 'destructive' | 'info';
  path?: string;
  onClick?: () => void;
  categoryLabel?: string;
}

// ── Compact Memoized App Tile Item (Ukuran Ringkas 0-Noise) ──
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
      className="group relative flex items-start gap-3 p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/80 shadow-2xs hover:shadow-md hover:border-indigo-300 dark:hover:border-indigo-800 hover:-translate-y-0.5 transition-all duration-150 text-left overflow-hidden cursor-pointer w-full"
    >
      {/* Icon Box Compact (Ukuran 36px / 9x9) */}
      <div
        className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl ${tile.bgLightClass} ${tile.colorClass} flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform duration-150`}
      >
        <IconComponent size={18} className="stroke-[2.2]" />
      </div>

      {/* Title & Short Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-1">
          <h3 className="text-xs font-bold text-slate-800 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors truncate">
            {tile.title}
          </h3>
          {tile.badgeText && (
            <Badge variant={tile.badgeVariant || 'neutral'} className="text-[9px] font-bold py-0 px-1.5 flex-shrink-0">
              {tile.badgeText}
            </Badge>
          )}
        </div>
        <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate mt-0.5 font-medium leading-tight">
          {tile.description}
        </p>
      </div>
    </button>
  );
});

MemoizedAppTileItem.displayName = 'MemoizedAppTileItem';

// Color Palette Minimalis 0-Noise
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
  const [selectedBackendHub, setSelectedBackendHub] = useState<string>('ALL');

  // ── Integrated Dynamic Smart Menu from Backend API ──
  const { menu: backendGroupedMenu, isLoading: isMenuLoading } = useSmartMenu();

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
          title: 'Live KBM Kelas',
          description: 'Status KBM rombel jam ke jam',
          iconComp: Monitor,
          colorClass: 'text-blue-600 dark:text-blue-400',
          bgLightClass: 'bg-blue-50 dark:bg-blue-950/60',
          badgeText: 'Live',
          badgeVariant: 'success',
          path: '/kesiswaan/monitoring',
        },
        {
          id: 'g1-rekap-absensi',
          title: 'Rekap Absensi Siswa',
          description: 'Rekap harian & bulanan kelas',
          iconComp: Activity,
          colorClass: 'text-emerald-600 dark:text-emerald-400',
          bgLightClass: 'bg-emerald-50 dark:bg-emerald-950/60',
          badgeText: absentStudentsCount > 0 ? `${absentStudentsCount} Absen` : undefined,
          badgeVariant: absentStudentsCount > 0 ? 'warning' : 'neutral',
          path: '/attendance/rekap',
        },
        {
          id: 'g1-catatan-rapor',
          title: 'Catatan & Leger',
          description: 'Catatan wali kelas & leger nilai',
          iconComp: FileText,
          colorClass: 'text-purple-600 dark:text-purple-400',
          bgLightClass: 'bg-purple-50 dark:bg-purple-950/60',
          path: '/rapor/cetak',
        },
        {
          id: 'g1-cetak-rapor',
          title: 'Cetak e-Rapor',
          description: 'PDF rapor sekelas 1 file',
          iconComp: Printer,
          colorClass: 'text-indigo-600 dark:text-indigo-400',
          bgLightClass: 'bg-indigo-50 dark:bg-indigo-950/60',
          badgeText: 'e-Rapor',
          badgeVariant: 'info',
          path: '/rapor/cetak',
        },
        {
          id: 'g1-risikolog',
          title: 'Risikolog Siswa',
          description: 'Tindak lanjut absensi & kesiswaan',
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
        description: 'Jadwal mapel mingguan saya',
        iconComp: Calendar,
        colorClass: 'text-cyan-600 dark:text-cyan-400',
        bgLightClass: 'bg-cyan-50 dark:bg-cyan-950/60',
        path: '/jadwal/saya',
      },
      {
        id: 'g1-jurnal-kbm',
        title: 'Isi Jurnal KBM',
        description: 'Jurnal materi pengajaran hari ini',
        iconComp: BookOpen,
        colorClass: 'text-indigo-600 dark:text-indigo-400',
        bgLightClass: 'bg-indigo-50 dark:bg-indigo-950/60',
        onClick: onOpenJurnalModal,
      },
      {
        id: 'g1-absen-guru',
        title: 'Presensi Guru',
        description: 'Konfirmasi kehadiran & tap gerbang',
        iconComp: User,
        colorClass: 'text-emerald-600 dark:text-emerald-400',
        bgLightClass: 'bg-emerald-50 dark:bg-emerald-950/60',
        onClick: onOpenAbsenGuruModal,
      },
      {
        id: 'g1-catat-pelanggaran',
        title: 'Catat Pelanggaran',
        description: 'Input poin tata tertib siswa',
        iconComp: ShieldAlert,
        colorClass: 'text-rose-600 dark:text-rose-400',
        bgLightClass: 'bg-rose-50 dark:bg-rose-950/60',
        onClick: onOpenCatatPelanggaranModal,
      },
      {
        id: 'g1-tindak-masal',
        title: 'Tindak Masal Sanksi',
        description: 'Eksekusi sanksi kesiswaan masal',
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

  // ── 2. KELOMPOK UTAMA: RUANG KERJA JABATAN & STRUKTURAL (Ruang Kurikulum, Kesiswaan, BP/BK, Sarpras, Hubin) ──
  const group2BackendTiles = useMemo<AppTileData[]>(() => {
    if (!backendGroupedMenu || backendGroupedMenu.length === 0) return [];

    const result: AppTileData[] = [];
    let tileCounter = 0;

    backendGroupedMenu.forEach((group) => {
      if (!group.items || group.items.length === 0) return;

      group.items.forEach((item) => {
        const accent = COLOR_ACCENTS[tileCounter % COLOR_ACCENTS.length];
        tileCounter++;

        result.push({
          id: `g2-item-${item.id || tileCounter}`,
          title: item.name,
          description: (item as any).description || `Modul ${item.name}`,
          iconName: item.icon || item.name,
          colorClass: accent.colorClass,
          bgLightClass: accent.bgLightClass,
          badgeText: item.premiumInfo?.isPremium ? 'Premium' : undefined,
          badgeVariant: item.premiumInfo?.isPremium ? 'warning' : undefined,
          path: item.path,
          categoryLabel: group.label,
        });
      });
    });

    return result;
  }, [backendGroupedMenu]);

  // Filter Kategori Backend (Ruang Kurikulum, Ruang Kesiswaan, Ruang Sarpras, Ruang Hubin, BP/BK)
  const backendCategoryLabels = useMemo(() => {
    if (!backendGroupedMenu) return [];
    return backendGroupedMenu.map((g) => g.label);
  }, [backendGroupedMenu]);

  // Filtered Group 1 & Group 2 items based on Search & Tabs
  const filteredGroup1 = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return group1Tiles;
    return group1Tiles.filter(
      (t) => t.title.toLowerCase().includes(q) || t.description.toLowerCase().includes(q)
    );
  }, [group1Tiles, searchQuery]);

  const filteredGroup2 = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    let list = group2BackendTiles;

    if (selectedBackendHub !== 'ALL') {
      list = list.filter((t) => t.categoryLabel === selectedBackendHub);
    }

    if (q) {
      list = list.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          t.description.toLowerCase().includes(q) ||
          (t.categoryLabel && t.categoryLabel.toLowerCase().includes(q))
      );
    }

    return list;
  }, [group2BackendTiles, selectedBackendHub, searchQuery]);

  return (
    <div className="space-y-6 animate-in fade-in duration-200 pb-12 w-full max-w-full min-w-0">
      {/* ── Ringkas Compact Header Banner ── */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 p-4 sm:p-5 text-white shadow-md">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-base">📱</span>
              <Badge variant="outline" className="border-indigo-400/30 bg-indigo-500/20 text-indigo-200 text-[10px] font-semibold">
                Portal App Launcher (Android Grid Mode)
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
              Navigasi Ikon Aplikasi Terbagi ke Dalam 2 Kelompok: Ruang Kerja Guru vs Ruang Kerja Jabatan.
            </p>
          </div>

          {/* Controls: Search & Switch Mode */}
          <div className="flex flex-wrap items-center gap-2 flex-shrink-0">
            {/* Search Input */}
            <div className="relative min-w-[180px] w-full sm:w-auto">
              <input
                type="text"
                placeholder="Cari fitur / menu..."
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

      {/* Menu Loading Indicator */}
      {isMenuLoading && (
        <div className="flex items-center justify-center p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 shadow-xs">
          <Loader2 className="w-4 h-4 animate-spin text-indigo-600 mr-2" />
          <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">
            Memuat Modul Ruang Jabatan Backend...
          </span>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────────────────
          KELOMPOK 1: 🏫 RUANG KERJA GURU & WALI KELAS
      ───────────────────────────────────────────────────────────────────────────── */}
      {filteredGroup1.length > 0 && (
        <section className="space-y-2.5">
          <div className="flex items-center justify-between border-b border-slate-200/80 dark:border-slate-800 pb-2">
            <div className="flex items-center gap-2">
              <div className="p-1 rounded-lg bg-indigo-600 text-white shadow-2xs">
                <Sparkles size={14} />
              </div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white tracking-tight">
                1. Ruang Kerja Guru & Wali Kelas
              </h2>
            </div>
            <span className="text-[11px] font-bold text-slate-400">
              {filteredGroup1.length} Fitur Harian
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2.5">
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
          KELOMPOK 2: 🏛️ RUANG KERJA JABATAN & STRUKTURAL (Kurikulum, Kesiswaan, Sarpras, Hubin, BP/BK)
      ───────────────────────────────────────────────────────────────────────────── */}
      <section className="space-y-2.5 pt-2">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 border-b border-slate-200/80 dark:border-slate-800 pb-2">
          <div className="flex items-center gap-2">
            <div className="p-1 rounded-lg bg-blue-600 text-white shadow-2xs">
              <Building2 size={14} />
            </div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-white tracking-tight">
              2. Ruang Kerja Jabatan & Struktural
            </h2>
          </div>

          {/* Sub-Category Filter Pills (Ruang Kurikulum, Ruang Kesiswaan, Ruang Sarpras, Ruang Hubin, BP/BK) */}
          {backendCategoryLabels.length > 0 && (
            <div className="flex items-center gap-1 overflow-x-auto pb-0.5 max-w-full">
              <button
                onClick={() => setSelectedBackendHub('ALL')}
                className={`text-[10px] font-bold px-2.5 py-1 rounded-lg transition-all whitespace-nowrap cursor-pointer ${
                  selectedBackendHub === 'ALL'
                    ? 'bg-indigo-600 text-white shadow-2xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                }`}
              >
                Semua Ruang ({group2BackendTiles.length})
              </button>
              {backendCategoryLabels.map((catLabel) => {
                const count = group2BackendTiles.filter((t) => t.categoryLabel === catLabel).length;
                return (
                  <button
                    key={catLabel}
                    onClick={() => setSelectedBackendHub(catLabel)}
                    className={`text-[10px] font-bold px-2.5 py-1 rounded-lg transition-all whitespace-nowrap cursor-pointer ${
                      selectedBackendHub === catLabel
                        ? 'bg-indigo-600 text-white shadow-2xs'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                    }`}
                  >
                    {catLabel} ({count})
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Grid Items Kelompok 2 Compact */}
        {filteredGroup2.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2.5">
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
              Tidak ada modul ruang kerja yang cocok dengan kriteria pencarian Anda.
            </p>
          </div>
        )}
      </section>
    </div>
  );
};
