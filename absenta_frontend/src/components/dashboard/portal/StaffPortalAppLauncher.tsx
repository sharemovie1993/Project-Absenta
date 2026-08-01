/**
 * StaffPortalAppLauncher.tsx
 * Tampilan Portal Menu Android-Style Launcher versi Dynamic & Hardened.
 * Terintegrasi 100% dengan backend API (/api/menu/sidebar via useSmartMenu),
 * dioptimasi dengan Memoization (Zero-Lag Re-render), hardware acceleration,
 * dan dynamic icon resolution via iconForName.
 */
import React, { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BookOpen,
  Calendar,
  Users,
  Activity,
  Award,
  FileText,
  Printer,
  Sparkles,
  ShieldAlert,
  AlertTriangle,
  GraduationCap,
  CheckCircle2,
  User,
  Settings,
  Search,
  Monitor,
  LayoutGrid,
  ChevronRight,
  UserCog,
  HeartHandshake,
  Loader2,
  AppWindow,
  Circle,
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
  gradient: string;
  badgeText?: string;
  badgeVariant?: 'neutral' | 'success' | 'warning' | 'destructive' | 'info';
  path?: string;
  onClick?: () => void;
}

interface AppCategoryData {
  categoryTitle: string;
  categoryIcon: React.ElementType;
  categoryBadge?: string;
  items: AppTileData[];
}

// ── Memoized Tile Component untuk 60FPS High Performance Re-render ──
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
      className="group relative flex flex-col items-start p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 shadow-xs hover:shadow-xl hover:shadow-indigo-500/10 hover:-translate-y-1 transition-all duration-200 text-left overflow-hidden cursor-pointer will-change-transform transform-gpu w-full"
    >
      {/* Background Accent Hover */}
      <div className="absolute top-0 right-0 -mr-6 -mt-6 w-20 h-20 rounded-full bg-gradient-to-br from-indigo-500/5 to-purple-500/5 group-hover:scale-150 transition-transform duration-300 pointer-events-none" />

      {/* App Icon Box */}
      <div className="flex items-center justify-between w-full mb-3">
        <div
          className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${tile.gradient} flex items-center justify-center text-white shadow-md shadow-indigo-500/15 group-hover:scale-110 transition-transform duration-200`}
        >
          <IconComponent size={22} className="stroke-[2.2]" />
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
    </button>
  );
});

MemoizedAppTileItem.displayName = 'MemoizedAppTileItem';

const GRADIENTS_PALETTE = [
  'from-blue-600 to-indigo-600',
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

  // ── Formulasi Kategori App Launchers (Dinamis Backend + Operasional Khusus) ──
  const appCategories = useMemo<AppCategoryData[]>(() => {
    const categories: AppCategoryData[] = [];

    // 1. KATEGORI OPERASIONAL KHUSUS WALI KELAS
    if (isWaliKelas) {
      categories.push({
        categoryTitle: 'Operasional Wali Kelas',
        categoryIcon: Users,
        categoryBadge: 'Wali Kelas',
        items: [
          {
            id: 'wk-monitoring-kbm',
            title: 'Live KBM Kelas',
            description: 'Pantau status KBM & kehadiran jam ke jam rombel',
            iconComp: Monitor,
            gradient: 'from-blue-600 to-indigo-600',
            badgeText: 'Live',
            badgeVariant: 'success',
            path: '/kesiswaan/monitoring',
          },
          {
            id: 'wk-rekap-absensi',
            title: 'Rekap Absensi Siswa',
            description: 'Rekapitulasi kehadiran harian & bulanan',
            iconComp: Activity,
            gradient: 'from-emerald-500 to-teal-600',
            badgeText: absentStudentsCount > 0 ? `${absentStudentsCount} Absen` : undefined,
            badgeVariant: absentStudentsCount > 0 ? 'warning' : 'neutral',
            path: '/attendance/rekap',
          },
          {
            id: 'wk-catatan-rapor',
            title: 'Catatan & Leger Kelas',
            description: 'Pengisian catatan wali kelas & leger ranking',
            iconComp: FileText,
            gradient: 'from-purple-600 to-indigo-700',
            path: '/rapor/cetak',
          },
          {
            id: 'wk-cetak-rapor',
            title: 'Cetak e-Rapor Sekelas',
            description: 'Pratinjau PDF & cetak massal rapor sekelas',
            iconComp: Printer,
            gradient: 'from-indigo-500 to-blue-700',
            badgeText: 'Kemendikbud',
            badgeVariant: 'info',
            path: '/rapor/cetak',
          },
          {
            id: 'wk-tindak-lanjut',
            title: 'Risikolog Siswa',
            description: 'Tindak lanjut absensi & mitigasi kesiswaan',
            iconComp: AlertTriangle,
            gradient: 'from-amber-500 to-rose-600',
            path: '/kesiswaan/risikolog',
          },
        ],
      });
    }

    // 2. AKSI CEPAT DIRI GURU
    categories.push({
      categoryTitle: 'Aktivitas Pengajaran Guru',
      categoryIcon: BookOpen,
      items: [
        {
          id: 'guru-jadwal',
          title: 'Jadwal Mengajar Saya',
          description: 'Mata pelajaran & jam mengajar mingguan',
          iconComp: Calendar,
          gradient: 'from-sky-500 to-blue-600',
          path: '/jadwal/saya',
        },
        {
          id: 'guru-jurnal-kbm',
          title: 'Isi Jurnal KBM',
          description: 'Laporan materi & jurnal pengajaran hari ini',
          iconComp: BookOpen,
          gradient: 'from-indigo-600 to-violet-600',
          onClick: onOpenJurnalModal,
        },
        {
          id: 'guru-absen-diri',
          title: 'Presensi Kehadiran Guru',
          description: 'Konfirmasi kehadiran & tap gerbang guru',
          iconComp: User,
          gradient: 'from-emerald-500 to-green-600',
          onClick: onOpenAbsenGuruModal,
        },
      ],
    });

    // 3. TRANSFORMASI DINAMIS MENU BACKEND API (RBAC Dynamic Menus)
    if (backendGroupedMenu && backendGroupedMenu.length > 0) {
      backendGroupedMenu.forEach((group, gIdx) => {
        if (!group.items || group.items.length === 0) return;

        const categoryIcon = iconForName(group.label);
        const mappedItems: AppTileData[] = group.items.map((item, iIdx) => {
          const gradient = GRADIENTS_PALETTE[(gIdx * 3 + iIdx) % GRADIENTS_PALETTE.length];
          return {
            id: `backend-menu-${item.id || iIdx}`,
            title: item.name,
            description: (item as any).description || `Navigasi fitur ${item.name}`,
            iconName: item.icon || item.name,
            gradient,
            badgeText: item.premiumInfo?.isPremium ? 'Premium' : undefined,
            badgeVariant: item.premiumInfo?.isPremium ? 'warning' : undefined,
            path: item.path,
          };
        });

        categories.push({
          categoryTitle: group.label,
          categoryIcon,
          categoryBadge: 'Dynamic API',
          items: mappedItems,
        });
      });
    }

    // 4. KESISWAAN, DISIPLIN & MODUL UTAMA (JIKA CHANNELS TAMBAHAN KOSONG)
    categories.push({
      categoryTitle: 'Kesiswaan & Bimbingan Konseling',
      categoryIcon: ShieldAlert,
      items: [
        {
          id: 'kes-catat-pelanggaran',
          title: 'Catat Pelanggaran Siswa',
          description: 'Input insiden & poin tata tertib',
          iconComp: ShieldAlert,
          gradient: 'from-rose-500 to-red-600',
          onClick: onOpenCatatPelanggaranModal,
        },
        {
          id: 'kes-tindak-masal',
          title: 'Tindak Masal Pelanggaran',
          description: 'Eksekusi tindak lanjut & sanksi masal',
          iconComp: CheckCircle2,
          gradient: 'from-orange-500 to-amber-600',
          onClick: onOpenTindakMasalModal,
        },
        {
          id: 'kes-bpbk',
          title: 'Layanan BP/BK',
          description: 'Konseling & konsolidasi wali murid',
          iconComp: HeartHandshake,
          gradient: 'from-teal-500 to-emerald-600',
          path: '/bpbk',
        },
      ],
    });

    return categories;
  }, [
    isWaliKelas,
    absentStudentsCount,
    onOpenJurnalModal,
    onOpenAbsenGuruModal,
    onOpenCatatPelanggaranModal,
    onOpenTindakMasalModal,
    backendGroupedMenu,
  ]);

  // ── Filtered Categories berdasarkan Search Query (High Speed Optimization) ──
  const filteredCategories = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return appCategories;

    return appCategories
      .map((cat) => ({
        ...cat,
        items: cat.items.filter(
          (item) =>
            item.title.toLowerCase().includes(q) ||
            item.description.toLowerCase().includes(q)
        ),
      }))
      .filter((cat) => cat.items.length > 0);
  }, [appCategories, searchQuery]);

  return (
    <div className="space-y-6 animate-in fade-in duration-300 pb-12 w-full max-w-full min-w-0">
      {/* ── Top Portal Header Banner ── */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-950 p-6 text-white shadow-xl">
        <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-indigo-500/20 blur-3xl pointer-events-none" />
        <div className="absolute -left-10 -bottom-10 h-40 w-40 rounded-full bg-blue-500/20 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xl">📱</span>
              <Badge variant="outline" className="border-indigo-400/30 bg-indigo-500/20 text-indigo-200 text-xs font-semibold">
                Portal App Launcher (Dinamis API)
              </Badge>
              {isWaliKelas && (
                <Badge variant="success" className="text-xs font-bold shadow-xs">
                  WALI KELAS
                </Badge>
              )}
            </div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">
              Halo, {user?.full_name?.split(' ')[0]}!
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 max-w-xl font-medium leading-relaxed">
              Navigasi Ikon Aplikasi Dinamis Real-Time. Seluruh menu terhubung secara otomatis ke sistem backend RBAC Absenta.id.
            </p>
          </div>

          {/* Controls: Search & Switch Mode */}
          <div className="flex flex-wrap items-center gap-3 flex-shrink-0">
            {/* Search Input */}
            <div className="relative min-w-[200px] w-full sm:w-auto">
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
        <div className="flex items-center justify-center p-8 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-xs">
          <Loader2 className="w-6 h-6 animate-spin text-indigo-600 mr-3" />
          <span className="text-xs font-bold text-slate-600 dark:text-slate-400">
            Sinkronisasi Menu Dinamis dari Backend API...
          </span>
        </div>
      )}

      {/* ── App Categories Grid ── */}
      <div className="space-y-8">
        {filteredCategories.map((cat, catIdx) => (
          <div key={catIdx} className="space-y-3">
            {/* Category Header Title */}
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400">
                  <cat.categoryIcon size={16} />
                </div>
                <h2 className="text-sm font-bold text-slate-800 dark:text-slate-200 tracking-tight">
                  {cat.categoryTitle}
                </h2>
                {cat.categoryBadge && (
                  <Badge variant="info" className="text-[10px] py-0 px-2 font-bold">
                    {cat.categoryBadge}
                  </Badge>
                )}
              </div>
              <span className="text-[11px] font-semibold text-slate-400">
                {cat.items.length} Fitur
              </span>
            </div>

            {/* Icon Tiles Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
              {cat.items.map((tile) => (
                <MemoizedAppTileItem
                  key={tile.id}
                  tile={tile}
                  onNavigate={handleTileNavigate}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
