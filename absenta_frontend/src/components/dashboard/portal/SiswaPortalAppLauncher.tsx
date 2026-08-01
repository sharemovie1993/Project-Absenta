/**
 * SiswaPortalAppLauncher.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * LAUNCHER PORTAL APPS KHUSUS SISWA (100% DINAMIS BERBASIS API BACKEND & RBAC)
 *
 * Menerapkan arsitektur 4-Blok Unik Terdeduplikasi:
 * - Blok 1: ⚡ Aksi Cepat Siswa (Presensi Mandiri, Jadwal, BK + Aksi Petugas Kelas jika ada)
 * - Blok 2: 🏫 Aktivitas & Rombel Siswa (Jadwal KBM, Presensi Saya, Nilai Rapor, P5)
 * - Blok 3: 🎓 Menu Utama Siswa (Primary Workspace items dari backend API)
 * - Blok 4: 🔗 Fasilitas & Lintas Modul (Koperasi E-Wallet, Sarpras, PKL Hubin)
 * ─────────────────────────────────────────────────────────────────────────────
 */

import React, { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Calendar,
  CheckCircle,
  Clock,
  User,
  Search,
  Sparkles,
  GraduationCap,
  Loader2,
  Compass,
  Zap,
  Network,
  BookOpen,
  FileText,
  HeartHandshake,
  LayoutGrid,
  Shield,
  Briefcase,
  Users,
  Wallet,
  Building2,
} from 'lucide-react';
import { Badge } from '../../ui/Badge';
import { Button } from '../../ui/Button';
import { useSmartMenu } from '../../../hooks/useSmartMenu';
import { iconForName } from '../../../lib/iconForName';
import { useNavStore } from '../../../store/navStore';
import {
  filterNavByWorkspace,
  normalizeFlatMenu,
  getAllUserCrossModuleItems,
} from '../../../helpers/workspaceNavFilter';

export interface AppTileData {
  id: string;
  title: string;
  iconName?: string;
  iconComp?: React.ElementType;
  colorClass: string;
  bgLightClass: string;
  badgeText?: string;
  path?: string;
  onClick?: () => void;
  categoryLabel?: string;
}

interface MemoizedAppTileItemProps {
  tile: AppTileData;
  onNavigate: (path?: string, onClick?: () => void) => void;
}

const MemoizedAppTileItem: React.FC<MemoizedAppTileItemProps> = React.memo(({ tile, onNavigate }) => {
  const IconComponent = tile.iconComp || (tile.iconName ? iconForName(tile.iconName) : GraduationCap);

  const handleClick = useCallback(() => {
    onNavigate(tile.path, tile.onClick);
  }, [onNavigate, tile.path, tile.onClick]);

  return (
    <button
      onClick={handleClick}
      className="group flex flex-col items-center justify-start p-2 sm:p-2.5 rounded-2xl hover:bg-slate-200/60 dark:hover:bg-slate-800/60 transition-all duration-150 cursor-pointer text-center w-full max-w-[96px] sm:max-w-[104px] mx-auto select-none"
    >
      <div className="relative">
        <div
          className={`w-12 h-12 sm:w-14 sm:h-14 rounded-2xl ${tile.bgLightClass} ${tile.colorClass} flex items-center justify-center shadow-xs group-hover:scale-110 group-hover:shadow-md transition-all duration-150 border border-slate-200/50 dark:border-slate-800/50`}
        >
          <IconComponent size={22} className="stroke-[2.2]" />
        </div>
        {tile.badgeText && (
          <span className="absolute -top-1 -right-1 px-1.5 py-0.5 rounded-full text-[9px] font-black bg-rose-500 text-white shadow-xs leading-none">
            {tile.badgeText}
          </span>
        )}
      </div>
      <span className="text-[11px] sm:text-xs font-semibold text-slate-700 dark:text-slate-200 mt-1.5 leading-tight line-clamp-2 text-center break-words group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
        {tile.title}
      </span>
    </button>
  );
});

MemoizedAppTileItem.displayName = 'MemoizedAppTileItem';

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

export interface SiswaPortalAppLauncherProps {
  user: any;
  isPetugasKelas: boolean;
  onSwitchToDesktop: () => void;
}

export const SiswaPortalAppLauncher: React.FC<SiswaPortalAppLauncherProps> = ({
  user,
  isPetugasKelas,
  onSwitchToDesktop,
}) => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');

  const { menu: backendGroupedMenu, isLoading: isMenuLoading } = useSmartMenu();
  const activeWorkspaceId = useNavStore((state) => state.activeWorkspaceId) || 'STUDENT_WORKSPACE';

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

  // ── BLOK 1: ⚡ AKSI CEPAT SISWA
  const block1QuickActionTiles = useMemo<AppTileData[]>(() => {
    const actions: AppTileData[] = [
      {
        id: 'b1-my-attendance',
        title: 'Presensi Saya',
        iconComp: CheckCircle,
        colorClass: 'text-emerald-600 dark:text-emerald-400',
        bgLightClass: 'bg-emerald-50 dark:bg-emerald-950/60',
        path: '/attendance/my-attendance',
      },
      {
        id: 'b1-jadwal-hari-ini',
        title: 'Jadwal Hari Ini',
        iconComp: Calendar,
        colorClass: 'text-blue-600 dark:text-blue-400',
        bgLightClass: 'bg-blue-50 dark:bg-blue-950/60',
        path: '/kurikulum/jadwal',
      },
      {
        id: 'b1-konseling-bk',
        title: 'Konseling BK',
        iconComp: HeartHandshake,
        colorClass: 'text-rose-600 dark:text-rose-400',
        bgLightClass: 'bg-rose-50 dark:bg-rose-950/60',
        path: '/bpbk/konseling',
      },
    ];

    if (isPetugasKelas) {
      actions.push({
        id: 'b1-presensi-rombel',
        title: 'Presensi Rombel',
        iconComp: Users,
        colorClass: 'text-amber-600 dark:text-amber-400',
        bgLightClass: 'bg-amber-50 dark:bg-amber-950/60',
        badgeText: 'Petugas',
        path: '/attendance/sesi',
      });
    }

    return actions;
  }, [isPetugasKelas]);

  // ── BLOK 2: 🏫 AKTIVITAS & ROMBEL SISWA
  const block2BelajarTiles = useMemo<AppTileData[]>(() => {
    const items: AppTileData[] = [
      {
        id: 'b2-jadwal-pelajaran',
        title: 'Jadwal Pelajaran',
        iconComp: BookOpen,
        colorClass: 'text-cyan-600 dark:text-cyan-400',
        bgLightClass: 'bg-cyan-50 dark:bg-cyan-950/60',
        path: '/kurikulum/jadwal',
      },
      {
        id: 'b2-nilai-rapor',
        title: 'Nilai Rapor',
        iconComp: FileText,
        colorClass: 'text-purple-600 dark:text-purple-400',
        bgLightClass: 'bg-purple-50 dark:bg-purple-950/60',
        path: '/rapor/nilai',
      },
      {
        id: 'b2-profil-saya',
        title: 'Profil Saya',
        iconComp: User,
        colorClass: 'text-indigo-600 dark:text-indigo-400',
        bgLightClass: 'bg-indigo-50 dark:bg-indigo-950/60',
        path: '/profile',
      },
    ];

    return items;
  }, []);

  // ── BLOK 3: 🎓 MENU UTAMA SISWA (DINAMIS API BACKEND VIA RBAC)
  const block3PrimaryTiles = useMemo<AppTileData[]>(() => {
    if (!backendGroupedMenu || backendGroupedMenu.length === 0) return [];
    const flatItems = normalizeFlatMenu(backendGroupedMenu);
    const { primaryItems } = filterNavByWorkspace(flatItems, user, activeWorkspaceId);

    return primaryItems.map((item, idx) => {
      const accent = COLOR_ACCENTS[idx % COLOR_ACCENTS.length];
      return {
        id: `b3-item-${item.id || idx}`,
        title: item.title,
        iconName: item.icon,
        colorClass: accent.colorClass,
        bgLightClass: accent.bgLightClass,
        badgeText: item.isPremium ? 'PRO' : undefined,
        path: item.path,
        categoryLabel: item.categoryLabel,
      };
    });
  }, [backendGroupedMenu, user, activeWorkspaceId]);

  // ── BLOK 4: 🔗 FASILITAS & LINTAS MODUL (DINAMIS API BACKEND)
  const block4CrossModuleTiles = useMemo<AppTileData[]>(() => {
    if (!backendGroupedMenu || backendGroupedMenu.length === 0) return [];

    const flatItems = normalizeFlatMenu(backendGroupedMenu);
    const primaryPathSet = new Set(
      block3PrimaryTiles.map((item) => (item.path || '').toLowerCase()).filter(Boolean)
    );

    const crossModuleItems = getAllUserCrossModuleItems(flatItems, user, primaryPathSet);

    return crossModuleItems.map((item, idx) => {
      const accent = COLOR_ACCENTS[idx % COLOR_ACCENTS.length];
      return {
        id: `b4-item-${item.id || idx}`,
        title: item.title,
        iconName: item.icon,
        colorClass: accent.colorClass,
        bgLightClass: accent.bgLightClass,
        badgeText: item.isPremium ? 'PRO' : undefined,
        path: item.path,
        categoryLabel: item.categoryLabel,
      };
    });
  }, [backendGroupedMenu, user, block3PrimaryTiles]);

  // ── HELPER DEDUPLIKASI TERPUSAT ──
  const normalizeKey = (val?: string) => {
    if (!val) return '';
    return val
      .toLowerCase()
      .trim()
      .replace(/[\s\-_/]+/g, '');
  };

  const filteredBlock1 = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return block1QuickActionTiles;
    return block1QuickActionTiles.filter((t) => t.title.toLowerCase().includes(q));
  }, [block1QuickActionTiles, searchQuery]);

  const filteredBlock2 = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return block2BelajarTiles;
    return block2BelajarTiles.filter((t) => t.title.toLowerCase().includes(q));
  }, [block2BelajarTiles, searchQuery]);

  const deduplicatedBlock3 = useMemo(() => {
    const existingPaths = new Set([
      ...block1QuickActionTiles.map((t) => normalizeKey(t.path)).filter(Boolean),
      ...block2BelajarTiles.map((t) => normalizeKey(t.path)).filter(Boolean),
    ]);
    const existingTitles = new Set([
      ...block1QuickActionTiles.map((t) => normalizeKey(t.title)).filter(Boolean),
      ...block2BelajarTiles.map((t) => normalizeKey(t.title)).filter(Boolean),
    ]);
    return block3PrimaryTiles.filter((t) => {
      const pathKey = normalizeKey(t.path);
      const titleKey = normalizeKey(t.title);
      if (pathKey && existingPaths.has(pathKey)) return false;
      if (titleKey && existingTitles.has(titleKey)) return false;
      return true;
    });
  }, [block3PrimaryTiles, block1QuickActionTiles, block2BelajarTiles]);

  const filteredBlock3 = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return deduplicatedBlock3;
    return deduplicatedBlock3.filter(
      (t) =>
        t.title.toLowerCase().includes(q) ||
        (t.categoryLabel && t.categoryLabel.toLowerCase().includes(q))
    );
  }, [deduplicatedBlock3, searchQuery]);

  const deduplicatedBlock4 = useMemo(() => {
    const existingPaths = new Set([
      ...block1QuickActionTiles.map((t) => normalizeKey(t.path)).filter(Boolean),
      ...block2BelajarTiles.map((t) => normalizeKey(t.path)).filter(Boolean),
      ...deduplicatedBlock3.map((t) => normalizeKey(t.path)).filter(Boolean),
    ]);
    const existingTitles = new Set([
      ...block1QuickActionTiles.map((t) => normalizeKey(t.title)).filter(Boolean),
      ...block2BelajarTiles.map((t) => normalizeKey(t.title)).filter(Boolean),
      ...deduplicatedBlock3.map((t) => normalizeKey(t.title)).filter(Boolean),
    ]);
    return block4CrossModuleTiles.filter((t) => {
      const pathKey = normalizeKey(t.path);
      const titleKey = normalizeKey(t.title);
      if (pathKey && existingPaths.has(pathKey)) return false;
      if (titleKey && existingTitles.has(titleKey)) return false;
      return true;
    });
  }, [block4CrossModuleTiles, block1QuickActionTiles, block2BelajarTiles, deduplicatedBlock3]);

  const filteredBlock4 = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return deduplicatedBlock4;
    return deduplicatedBlock4.filter(
      (t) =>
        t.title.toLowerCase().includes(q) ||
        (t.categoryLabel && t.categoryLabel.toLowerCase().includes(q))
    );
  }, [deduplicatedBlock4, searchQuery]);

  return (
    <div className="space-y-6 animate-in fade-in duration-200 pb-12 w-full max-w-full min-w-0">
      {/* Header Banner compact Launcher Siswa */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-indigo-900 via-blue-900 to-indigo-950 p-4 sm:p-5 text-white shadow-md">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-base">🎒</span>
              <Badge variant="outline" className="border-indigo-400/30 bg-indigo-500/20 text-indigo-200 text-[10px] font-semibold">
                Portal App Siswa (Dinamis & RBAC)
              </Badge>
              {isPetugasKelas && (
                <Badge variant="success" className="text-[10px] font-bold py-0 px-2 shadow-xs">
                  PETUGAS KELAS
                </Badge>
              )}
            </div>
            <h1 className="text-lg sm:text-xl font-bold tracking-tight text-white">
              Halo, {user?.full_name?.split(' ')[0] || user?.name?.split(' ')[0] || 'Siswa'}!
            </h1>
            <p className="text-xs text-slate-300 max-w-xl font-medium truncate">
              Aplikasi Belajar & Fasilitas Sekolah Terintegrasi dalam Grid Launcher.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 flex-shrink-0">
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

      {isMenuLoading && (
        <div className="flex items-center justify-center p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 shadow-xs">
          <Loader2 className="w-4 h-4 animate-spin text-indigo-600 mr-2" />
          <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">
            Memuat Aplikasi Siswa...
          </span>
        </div>
      )}

      {/* BLOK 1: ⚡ AKSI CEPAT SISWA */}
      {filteredBlock1.length > 0 && (
        <section className="space-y-3 bg-white/60 dark:bg-slate-900/40 p-4 rounded-2xl border border-slate-200/50 dark:border-slate-800/50">
          <div className="flex items-center justify-between border-b border-slate-200/60 dark:border-slate-800/60 pb-2">
            <div className="flex items-center gap-2">
              <div className="p-1 rounded-lg bg-amber-500 text-white shadow-2xs">
                <Zap size={14} />
              </div>
              <h2 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                1. Aksi Cepat Siswa
              </h2>
            </div>
            <span className="text-[10px] font-bold text-slate-400">
              {filteredBlock1.length} Pintasan Cepat
            </span>
          </div>

          <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-3 sm:gap-4 pt-1">
            {filteredBlock1.map((tile) => (
              <MemoizedAppTileItem key={tile.id} tile={tile} onNavigate={handleTileNavigate} />
            ))}
          </div>
        </section>
      )}

      {/* BLOK 2: 🏫 AKTIVITAS & BELAJAR SISWA */}
      {filteredBlock2.length > 0 && (
        <section className="space-y-3 bg-white/60 dark:bg-slate-900/40 p-4 rounded-2xl border border-slate-200/50 dark:border-slate-800/50">
          <div className="flex items-center justify-between border-b border-slate-200/60 dark:border-slate-800/60 pb-2">
            <div className="flex items-center gap-2">
              <div className="p-1 rounded-lg bg-indigo-600 text-white shadow-2xs">
                <Sparkles size={14} />
              </div>
              <h2 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                2. Aktivitas & Belajar
              </h2>
            </div>
            <span className="text-[10px] font-bold text-slate-400">
              {filteredBlock2.length} Aplikasi Belajar
            </span>
          </div>

          <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-3 sm:gap-4 pt-1">
            {filteredBlock2.map((tile) => (
              <MemoizedAppTileItem key={tile.id} tile={tile} onNavigate={handleTileNavigate} />
            ))}
          </div>
        </section>
      )}

      {/* BLOK 3: 🎓 MENU UTAMA SISWA (API BACKEND RBAC) */}
      {(filteredBlock3.length > 0 || isMenuLoading) && (
        <section className="space-y-3 bg-white/60 dark:bg-slate-900/40 p-4 rounded-2xl border border-slate-200/50 dark:border-slate-800/50">
          <div className="flex items-center justify-between border-b border-slate-200/60 dark:border-slate-800/60 pb-2">
            <div className="flex items-center gap-2">
              <div className="p-1 rounded-lg bg-blue-600 text-white shadow-2xs">
                <GraduationCap size={14} />
              </div>
              <h2 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                3. Menu Utama Siswa
              </h2>
            </div>
            <span className="text-[10px] font-bold text-slate-400">
              {filteredBlock3.length} Menu Akademik
            </span>
          </div>

          {filteredBlock3.length > 0 ? (
            <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-3 sm:gap-4 pt-1">
              {filteredBlock3.map((tile) => (
                <MemoizedAppTileItem key={tile.id} tile={tile} onNavigate={handleTileNavigate} />
              ))}
            </div>
          ) : (
            <div className="p-6 text-center bg-white dark:bg-slate-900 rounded-xl border border-slate-200/60 dark:border-slate-800">
              <Compass className="w-6 h-6 text-slate-300 mx-auto mb-1.5" />
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                Menu akademik siswa disajikan pada Blok 1 & 2.
              </p>
            </div>
          )}
        </section>
      )}

      {/* BLOK 4: 🔗 FASILITAS & LINTAS MODUL SISWA */}
      {filteredBlock4.length > 0 && (
        <section className="space-y-3 bg-white/60 dark:bg-slate-900/40 p-4 rounded-2xl border border-slate-200/50 dark:border-slate-800/50 border-dashed">
          <div className="flex items-center justify-between border-b border-slate-200/60 dark:border-slate-800/60 pb-2">
            <div className="flex items-center gap-2">
              <div className="p-1 rounded-lg bg-teal-600 text-white shadow-2xs">
                <Network size={14} />
              </div>
              <div>
                <h2 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                  4. Fasilitas & Akses Lintas Modul
                </h2>
                <p className="text-[10px] text-slate-400 font-medium mt-0.5">
                  Layanan Koperasi, Sarpras, & PKL Industri
                </p>
              </div>
            </div>
            <span className="text-[10px] font-bold text-slate-400">
              {filteredBlock4.length} Fasilitas
            </span>
          </div>

          <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-3 sm:gap-4 pt-1">
            {filteredBlock4.map((tile) => (
              <MemoizedAppTileItem key={tile.id} tile={tile} onNavigate={handleTileNavigate} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
};
