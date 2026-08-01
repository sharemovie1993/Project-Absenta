/**
 * StaffPortalAppLauncher.tsx
 * Launcher Portal App 100% DINAMIS TERINTEGRASI DENGAN BACKEND API & LOGIKA SIDEBAR.
 * - 0% Hardcoded Menu! Seluruh ubin aplikasi berasal dari API Backend (/api/menu/sidebar) & Quick Actions.
 * - Terbagi ke dalam 3 Blok Unik Dideduplikasi:
 *   1. ⚡ Blok 1: Aksi Cepat Diri (Pintasan Aksi Dinamis User)
 *   2. 🏫 Blok 2: Ruang Kerja Guru & Wali Kelas (Modul Pengajaran & Rombel Dinamis Backend)
 *   3. 🏛️ Blok 3: Ruang Kerja Jabatan & Informasi Lintas Modul (Modul Struktural Dinamis Backend)
 */
import React, { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LayoutGrid,
  Search,
  Sparkles,
  Building2,
  Loader2,
  Compass,
  Zap,
} from 'lucide-react';
import { Badge } from '../../ui/Badge';
import { Button } from '../../ui/Button';
import { useSmartMenu } from '../../../hooks/useSmartMenu';
import { iconForName } from '../../../lib/iconForName';
import { ROLE_WORKSPACES } from '../../../config/navigation.config';
import { useNavStore } from '../../../store/navStore';
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
}) => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');

  // ── 100% DINAMIS DARI BACKEND API /api/menu/sidebar & WORKSPACE ENGINE ──
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
      };
    });
  }, [quickActions]);

  // ── MEMISAHKAN MENU BACKEND SECARA DINAMIS MENJADI BLOK 2 & BLOK 3 ──
  const { block2DynamicTiles, block3DynamicTiles } = useMemo(() => {
    if (!backendGroupedMenu || backendGroupedMenu.length === 0) {
      return { block2DynamicTiles: [], block3DynamicTiles: [] };
    }

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
          id: `backend-item-${item.id || tileCounter}`,
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

    // Saring item backend yang diizinkan sesuai role/workspace (logika Sidebar.tsx)
    const allowedCrossPaths = new Set(
      (currentWs.crossModulePaths || []).map((p) => p.toLowerCase())
    );

    const authorizedTiles = isAdmin
      ? allBackendTiles
      : allBackendTiles.filter((tile) => {
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

    const safeTiles = authorizedTiles.length > 0 ? authorizedTiles : allBackendTiles.filter((t) => t.path && t.path !== '#');

    // Pisahkan item backend secara DINAMIS:
    // - Item Pengajaran & Rombel Wali Kelas -> Masuk ke Blok 2 (Ruang Kerja Guru & Wali Kelas)
    // - Item Struktural & Modul Lainnya -> Masuk ke Blok 3 (Ruang Kerja Jabatan & Lintas Modul)
    const b2: AppTileData[] = [];
    const b3: AppTileData[] = [];

    const isGuruOrWaliPath = (pathStr?: string, nameStr?: string) => {
      const p = (pathStr || '').toLowerCase();
      const n = (nameStr || '').toLowerCase();
      return (
        p.includes('jadwal/saya') ||
        p.includes('my-attendance') ||
        p.includes('riwayat-ajar') ||
        p.includes('rapor/input-nilai') ||
        p.includes('rapor/cetak') ||
        p.includes('kesiswaan/monitoring') ||
        p.includes('kesiswaan/risikolog') ||
        n.includes('jadwal mengajar') ||
        n.includes('presensi guru') ||
        n.includes('rekap absensi') ||
        n.includes('input nilai') ||
        n.includes('cetak e-rapor')
      );
    };

    safeTiles.forEach((tile) => {
      if (isGuruOrWaliPath(tile.path, tile.title)) {
        b2.push(tile);
      } else {
        b3.push(tile);
      }
    });

    return { block2DynamicTiles: b2, block3DynamicTiles: b3 };
  }, [backendGroupedMenu, user, activeWorkspaceId]);

  // ── HELPER DEDUPLIKASI UNIK TERPUSAT ──
  const normalizeKey = (val?: string) => {
    if (!val) return '';
    return val
      .toLowerCase()
      .trim()
      .replace(/[\s\-_/]+/g, '');
  };

  // 1. Blok 1 Tiles (Aksi Cepat Diri)
  const filteredBlock1 = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return block1QuickActionTiles;
    return block1QuickActionTiles.filter((t) => t.title.toLowerCase().includes(q));
  }, [block1QuickActionTiles, searchQuery]);

  // 2. Blok 2 Tiles (Dideduplikasi terhadap Blok 1)
  const deduplicatedBlock2 = useMemo(() => {
    const b1Paths = new Set(
      block1QuickActionTiles.map((t) => normalizeKey(t.path)).filter(Boolean)
    );
    const b1Titles = new Set(
      block1QuickActionTiles.map((t) => normalizeKey(t.title)).filter(Boolean)
    );

    return block2DynamicTiles.filter((t) => {
      const pathKey = normalizeKey(t.path);
      const titleKey = normalizeKey(t.title);

      if (pathKey && b1Paths.has(pathKey)) return false;
      if (titleKey && b1Titles.has(titleKey)) return false;

      return true;
    });
  }, [block2DynamicTiles, block1QuickActionTiles]);

  const filteredBlock2 = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return deduplicatedBlock2;
    return deduplicatedBlock2.filter((t) => t.title.toLowerCase().includes(q));
  }, [deduplicatedBlock2, searchQuery]);

  // 3. Blok 3 Tiles (Dideduplikasi terhadap Blok 1 & Blok 2)
  const deduplicatedBlock3 = useMemo(() => {
    const existingPaths = new Set([
      ...block1QuickActionTiles.map((t) => normalizeKey(t.path)).filter(Boolean),
      ...deduplicatedBlock2.map((t) => normalizeKey(t.path)).filter(Boolean),
    ]);

    const existingTitles = new Set([
      ...block1QuickActionTiles.map((t) => normalizeKey(t.title)).filter(Boolean),
      ...deduplicatedBlock2.map((t) => normalizeKey(t.title)).filter(Boolean),
    ]);

    return block3DynamicTiles.filter((t) => {
      const pathKey = normalizeKey(t.path);
      const titleKey = normalizeKey(t.title);

      if (pathKey && existingPaths.has(pathKey)) return false;
      if (titleKey && existingTitles.has(titleKey)) return false;

      return true;
    });
  }, [block3DynamicTiles, block1QuickActionTiles, deduplicatedBlock2]);

  const filteredBlock3 = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return deduplicatedBlock3;
    return deduplicatedBlock3.filter(
      (t) =>
        t.title.toLowerCase().includes(q) ||
        (t.categoryLabel && t.categoryLabel.toLowerCase().includes(q))
    );
  }, [deduplicatedBlock3, searchQuery]);

  return (
    <div className="space-y-6 animate-in fade-in duration-200 pb-12 w-full max-w-full min-w-0">
      {/* ── Header Banner Compact Launcher ── */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 p-4 sm:p-5 text-white shadow-md">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-base">📱</span>
              <Badge variant="outline" className="border-indigo-400/30 bg-indigo-500/20 text-indigo-200 text-[10px] font-semibold">
                Portal App Launcher (100% Dinamis Backend API)
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
              Navigasi Ikon Aplikasi Terstruktur 100% Dinamis dari Endpoint Backend & Logika Sidebar.
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
            Memuat Ikon Aplikasi Backend...
          </span>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────────────────
          BLOK 1: ⚡ AKSI CEPAT DIRI (QUICK ACTIONS DINAMIS PENGGUNA)
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
          BLOK 2: 🏫 RUANG KERJA GURU & WALI KELAS (DINAMIS BACKEND API)
      ───────────────────────────────────────────────────────────────────────────── */}
      {filteredBlock2.length > 0 && (
        <section className="space-y-3 bg-white/60 dark:bg-slate-900/40 p-4 rounded-2xl border border-slate-200/50 dark:border-slate-800/50">
          <div className="flex items-center justify-between border-b border-slate-200/60 dark:border-slate-800/60 pb-2">
            <div className="flex items-center gap-2">
              <div className="p-1 rounded-lg bg-indigo-600 text-white shadow-2xs">
                <Sparkles size={14} />
              </div>
              <h2 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                2. Ruang Kerja Guru & Wali Kelas
              </h2>
            </div>
            <span className="text-[10px] font-bold text-slate-400">
              {filteredBlock2.length} Aplikasi Operasional
            </span>
          </div>

          <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-3 sm:gap-4 pt-1">
            {filteredBlock2.map((tile) => (
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
          BLOK 3: 🏛️ RUANG KERJA JABATAN & INFORMASI LINTAS MODUL (DINAMIS BACKEND API)
      ───────────────────────────────────────────────────────────────────────────── */}
      <section className="space-y-3 bg-white/60 dark:bg-slate-900/40 p-4 rounded-2xl border border-slate-200/50 dark:border-slate-800/50">
        <div className="flex items-center justify-between border-b border-slate-200/60 dark:border-slate-800/60 pb-2">
          <div className="flex items-center gap-2">
            <div className="p-1 rounded-lg bg-blue-600 text-white shadow-2xs">
              <Building2 size={14} />
            </div>
            <h2 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              3. Ruang Kerja Jabatan & Informasi Lintas Modul
            </h2>
          </div>

          <span className="text-[10px] font-bold text-slate-400">
            {filteredBlock3.length} Aplikasi Modul
          </span>
        </div>

        {filteredBlock3.length > 0 ? (
          <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-3 sm:gap-4 pt-1">
            {filteredBlock3.map((tile) => (
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
              Seluruh aplikasi ruang kerja telah disajikan pada Blok Aksi Cepat Diri & Ruang Kerja Utama.
            </p>
          </div>
        )}
      </section>
    </div>
  );
};
