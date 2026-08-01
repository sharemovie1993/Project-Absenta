/**
 * StaffPortalAppLauncher.tsx
 * Launcher Portal App dengan Struktur 2 KELOMPOK UTAMA yang Rapi, Bersih, & Tanpa Clutter.
 * - Kelompok 1: 📱 Aplikasi Operasional Diri & Wali Kelas (Harian & Aksi Cepat)
 * - Kelompok 2: 🏛️ Katalog Modul & Manajemen Sekolah (Dinamis Backend RBAC API)
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
  Layers,
  Building2,
  Loader2,
  Compass,
} from 'lucide-react';
import { Badge } from '../../ui/Badge';
import { Button } from '../../ui/Button';
import { useSmartMenu, type SmartNavItem } from '../../../hooks/useSmartMenu';
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
  gradient: string;
  badgeText?: string;
  badgeVariant?: 'neutral' | 'success' | 'warning' | 'destructive' | 'info';
  path?: string;
  onClick?: () => void;
  categoryLabel?: string;
}

// ── Memoized Tile Component untuk High Performance Re-render (Zero Lag) ──
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
      className="group relative flex flex-col items-start p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800/80 shadow-2xs hover:shadow-xl hover:shadow-indigo-500/10 hover:-translate-y-1 transition-all duration-200 text-left overflow-hidden cursor-pointer transform-gpu w-full"
    >
      {/* Background Accent Hover */}
      <div className="absolute top-0 right-0 -mr-6 -mt-6 w-20 h-20 rounded-full bg-gradient-to-br from-indigo-500/5 to-purple-500/5 group-hover:scale-150 transition-transform duration-300 pointer-events-none" />

      {/* App Icon & Badge */}
      <div className="flex items-center justify-between w-full mb-3">
        <div
          className={`w-11 h-11 rounded-2xl bg-gradient-to-br ${tile.gradient} flex items-center justify-center text-white shadow-md shadow-indigo-500/10 group-hover:scale-110 transition-transform duration-200`}
        >
          <IconComponent size={20} className="stroke-[2.2]" />
        </div>

        {tile.badgeText && (
          <Badge variant={tile.badgeVariant || 'neutral'} className="text-[10px] font-bold py-0.5 px-2">
            {tile.badgeText}
          </Badge>
        )}
      </div>

      {/* App Title & Description */}
      <div className="space-y-1 w-full min-w-0">
        <div className="flex items-center justify-between">
          <h3 className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors truncate">
            {tile.title}
          </h3>
          <ChevronRight size={14} className="text-slate-300 group-hover:text-indigo-500 group-hover:translate-x-0.5 transition-all flex-shrink-0" />
        </div>
        <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 leading-tight font-medium">
          {tile.description}
        </p>
      </div>

      {/* Optional Sub-category tag */}
      {tile.categoryLabel && (
        <span className="mt-2 text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
          {tile.categoryLabel}
        </span>
      )}
    </button>
  );
});

MemoizedAppTileItem.displayName = 'MemoizedAppTileItem';

const GRADIENTS_PALETTE = [
  'from-indigo-600 to-blue-600',
  'from-emerald-500 to-teal-600',
  'from-purple-600 to-indigo-700',
  'from-amber-500 to-orange-600',
  'from-pink-500 to-rose-600',
  'from-sky-500 to-blue-600',
  'from-cyan-600 to-blue-700',
  'from-violet-600 to-purple-700',
  'from-teal-500 to-emerald-600',
  'from-rose-500 to-red-600',
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

  // ── 1. KELOMPOK UTAMA 1: APLIKASI OPERASIONAL DIRI & WALI KELAS ──
  const group1Tiles = useMemo<AppTileData[]>(() => {
    const items: AppTileData[] = [];

    if (isWaliKelas) {
      items.push(
        {
          id: 'g1-monitoring-kbm',
          title: 'Live KBM Kelas',
          description: 'Pantau status KBM & kehadiran jam ke jam rombel',
          iconComp: Monitor,
          gradient: 'from-blue-600 to-indigo-600',
          badgeText: 'Live',
          badgeVariant: 'success',
          path: '/kesiswaan/monitoring',
        },
        {
          id: 'g1-rekap-absensi',
          title: 'Rekap Absensi Siswa',
          description: 'Rekapitulasi kehadiran harian & bulanan kelas',
          iconComp: Activity,
          gradient: 'from-emerald-500 to-teal-600',
          badgeText: absentStudentsCount > 0 ? `${absentStudentsCount} Absen` : undefined,
          badgeVariant: absentStudentsCount > 0 ? 'warning' : 'neutral',
          path: '/attendance/rekap',
        },
        {
          id: 'g1-catatan-rapor',
          title: 'Catatan & Leger Kelas',
          description: 'Pengisian catatan wali kelas & leger ranking',
          iconComp: FileText,
          gradient: 'from-purple-600 to-indigo-700',
          path: '/rapor/cetak',
        },
        {
          id: 'g1-cetak-rapor',
          title: 'Cetak e-Rapor Sekelas',
          description: 'Pratinjau PDF & cetak massal rapor sekelas (1 PDF)',
          iconComp: Printer,
          gradient: 'from-indigo-500 to-blue-700',
          badgeText: 'e-Rapor',
          badgeVariant: 'info',
          path: '/rapor/cetak',
        },
        {
          id: 'g1-risikolog',
          title: 'Risikolog Siswa',
          description: 'Tindak lanjut absensi & mitigasi kesiswaan',
          iconComp: AlertTriangle,
          gradient: 'from-amber-500 to-rose-600',
          path: '/kesiswaan/risikolog',
        }
      );
    }

    // Aksi Pengajaran Guru
    items.push(
      {
        id: 'g1-jadwal',
        title: 'Jadwal Mengajar Saya',
        description: 'Mata pelajaran & jam mengajar mingguan',
        iconComp: Calendar,
        gradient: 'from-sky-500 to-blue-600',
        path: '/jadwal/saya',
      },
      {
        id: 'g1-jurnal-kbm',
        title: 'Isi Jurnal KBM',
        description: 'Laporan materi & jurnal pengajaran hari ini',
        iconComp: BookOpen,
        gradient: 'from-indigo-600 to-violet-600',
        onClick: onOpenJurnalModal,
      },
      {
        id: 'g1-absen-guru',
        title: 'Presensi Diri Guru',
        description: 'Konfirmasi kehadiran & tap gerbang guru',
        iconComp: User,
        gradient: 'from-emerald-500 to-green-600',
        onClick: onOpenAbsenGuruModal,
      },
      {
        id: 'g1-catat-pelanggaran',
        title: 'Catat Pelanggaran',
        description: 'Input insiden & poin tata tertib siswa',
        iconComp: ShieldAlert,
        gradient: 'from-rose-500 to-red-600',
        onClick: onOpenCatatPelanggaranModal,
      },
      {
        id: 'g1-tindak-masal',
        title: 'Tindak Masal Sanksi',
        description: 'Eksekusi tindak lanjut & sanksi masal',
        iconComp: CheckCircle2,
        gradient: 'from-orange-500 to-amber-600',
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

  // ── 2. KELOMPOK UTAMA 2: PORTAL MODUL & MANAJEMEN SEKOLAH (DINAMIS BACKEND API) ──
  const group2BackendTiles = useMemo<AppTileData[]>(() => {
    if (!backendGroupedMenu || backendGroupedMenu.length === 0) return [];

    const result: AppTileData[] = [];
    let tileCounter = 0;

    backendGroupedMenu.forEach((group) => {
      if (!group.items || group.items.length === 0) return;

      group.items.forEach((item) => {
        const gradient = GRADIENTS_PALETTE[tileCounter % GRADIENTS_PALETTE.length];
        tileCounter++;

        result.push({
          id: `g2-item-${item.id || tileCounter}`,
          title: item.name,
          description: (item as any).description || `Navigasi fitur ${item.name}`,
          iconName: item.icon || item.name,
          gradient,
          badgeText: item.premiumInfo?.isPremium ? 'Premium' : undefined,
          badgeVariant: item.premiumInfo?.isPremium ? 'warning' : undefined,
          path: item.path,
          categoryLabel: group.label,
        });
      });
    });

    return result;
  }, [backendGroupedMenu]);

  // Filter Kategori Backend (Tabs Pills)
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
    <div className="space-y-8 animate-in fade-in duration-300 pb-12 w-full max-w-full min-w-0">
      {/* ── Top Portal Header Banner ── */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-950 p-6 sm:p-8 text-white shadow-xl">
        <div className="absolute -right-10 -top-10 h-44 w-44 rounded-full bg-indigo-500/20 blur-3xl pointer-events-none" />
        <div className="absolute -left-10 -bottom-10 h-44 w-44 rounded-full bg-blue-500/20 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-2xl">📱</span>
              <Badge variant="outline" className="border-indigo-400/30 bg-indigo-500/20 text-indigo-200 text-xs font-semibold">
                Portal App Launcher Terstruktur
              </Badge>
              {isWaliKelas && (
                <Badge variant="success" className="text-xs font-bold shadow-xs">
                  WALI KELAS
                </Badge>
              )}
            </div>
            <h1 className="text-xl sm:text-3xl font-black tracking-tight text-white">
              Halo, {user?.full_name?.split(' ')[0]}!
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 max-w-xl font-medium leading-relaxed">
              Tampilan launcher di-klasifikasikan secara rapi ke dalam **2 Kelompok Utama**: Aplikasi Operasional Diri & Katalog Modul RBAC Backend.
            </p>
          </div>

          {/* Controls: Search & Switch Mode */}
          <div className="flex flex-wrap items-center gap-3 flex-shrink-0">
            {/* Search Input */}
            <div className="relative min-w-[220px] w-full sm:w-auto">
              <input
                type="text"
                placeholder="Cari fitur / menu..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white/10 backdrop-blur-md border border-white/20 rounded-xl text-xs font-semibold pl-9 pr-4 py-2.5 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
              <Search size={14} className="absolute left-3 top-3 text-slate-400 pointer-events-none" />
            </div>

            {/* Switch to Desktop Mode */}
            <Button
              onClick={onSwitchToDesktop}
              className="bg-white text-slate-900 hover:bg-slate-100 rounded-xl font-bold text-xs py-2.5 px-4 shadow-lg shadow-black/20 flex items-center gap-2 whitespace-nowrap cursor-pointer"
            >
              <LayoutGrid size={15} className="text-indigo-600" />
              <span>Mode Desktop 🖥️</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Menu Loading Indicator */}
      {isMenuLoading && (
        <div className="flex items-center justify-center p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-xs">
          <Loader2 className="w-5 h-5 animate-spin text-indigo-600 mr-3" />
          <span className="text-xs font-bold text-slate-600 dark:text-slate-400">
            Menyelaraskan Modul RBAC Backend...
          </span>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────────────────
          KELOMPOK 1: 📱 APLIKASI OPERASIONAL DIRI & WALI KELAS
      ───────────────────────────────────────────────────────────────────────────── */}
      {filteredGroup1.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200/80 dark:border-slate-800 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-indigo-600 text-white shadow-xs">
                <Sparkles size={18} />
              </div>
              <div>
                <h2 className="text-base font-black text-slate-900 dark:text-white tracking-tight">
                  1. Aplikasi Utama Diri & Wali Kelas
                </h2>
                <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                  Fitur operasional harian, rekap absensi, e-Rapor, dan aksi cepat mengajar
                </p>
              </div>
            </div>
            <Badge variant="neutral" className="text-xs font-bold py-0.5 px-2.5">
              {filteredGroup1.length} Fitur Harian
            </Badge>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
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
          KELOMPOK 2: 🏛️ KATALOG MODUL & MANAJEMEN SEKOLAH (DINAMIS BACKEND RBAC)
      ───────────────────────────────────────────────────────────────────────────── */}
      <section className="space-y-4 pt-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-200/80 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-600 text-white shadow-xs">
              <Building2 size={18} />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-900 dark:text-white tracking-tight">
                2. Katalog Modul & Manajemen Sekolah
              </h2>
              <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                Seluruh modul akademik & manajemen terintegrasi dinamis dari sistem backend RBAC
              </p>
            </div>
          </div>

          {/* Sub-Category Filter Pills */}
          {backendCategoryLabels.length > 0 && (
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full">
              <button
                onClick={() => setSelectedBackendHub('ALL')}
                className={`text-[11px] font-bold px-3 py-1.5 rounded-xl transition-all whitespace-nowrap ${
                  selectedBackendHub === 'ALL'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                }`}
              >
                Semua Modul ({group2BackendTiles.length})
              </button>
              {backendCategoryLabels.map((catLabel) => {
                const count = group2BackendTiles.filter((t) => t.categoryLabel === catLabel).length;
                return (
                  <button
                    key={catLabel}
                    onClick={() => setSelectedBackendHub(catLabel)}
                    className={`text-[11px] font-bold px-3 py-1.5 rounded-xl transition-all whitespace-nowrap ${
                      selectedBackendHub === catLabel
                        ? 'bg-indigo-600 text-white shadow-xs'
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

        {/* Grid Items Kelompok 2 */}
        {filteredGroup2.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
            {filteredGroup2.map((tile) => (
              <MemoizedAppTileItem
                key={tile.id}
                tile={tile}
                onNavigate={handleTileNavigate}
              />
            ))}
          </div>
        ) : (
          <div className="p-8 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/60 dark:border-slate-800">
            <Compass className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-xs font-bold text-slate-600 dark:text-slate-400">
              Tidak ada modul yang cocok dengan kriteria pencarian / filter Anda.
            </p>
          </div>
        )}
      </section>
    </div>
  );
};
