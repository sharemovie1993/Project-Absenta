import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { 
  type EcosystemType, 
  getEcosystemTheme,
  getEcosystemLabel
} from '@/config/bottomNavEcosystems.config';

export interface UniversalEcosystemTopbarProps {
  /**
   * Ekosistem / Divisi (menentukan warna gradien yang 100% selaras dengan bottom nav)
   */
  ecosystem: EcosystemType;

  /**
   * Judul Halaman / Subtab Aktif yang Sedang Dibuka (Murni judul saja)
   */
  title: string;

  /**
   * Icon divisi/subtab (opsional, tampil ramping di samping judul)
   */
  icon?: React.ComponentType<{ className?: string; size?: number }>;

  /**
   * Handler tombol kembali kustom
   */
  onBack?: () => void;

  /**
   * Rute target tombol kembali jika onBack tidak diberikan
   */
  backTo?: string;

  /**
   * Sembunyikan tombol kembali jika berada di root view
   */
  hideBack?: boolean;

  /**
   * Handler tombol refresh / segarkan data
   */
  onRefresh?: () => void;

  /**
   * Status pemuatan refresh (animasi putar pada ikon)
   */
  isRefreshing?: boolean;

  /**
   * Slot tombol aksi minimal di sisi kanan (opsional, misal tombol icon filter/menu)
   */
  actions?: React.ReactNode;

  /**
   * Kustomisasi kelas wrapper luar
   */
  className?: string;
}

/**
 * ── UNIVERSAL ECOSYSTEM TOPBAR (STANDAR INDUSTRI ABSENTA) ──
 * Komponen topbar ramping terpadu yang:
 * 1. Murni menampilkan tombol kembali, judul halaman aktif, dan aksi minimal.
 * 2. Terkunci (sticky top-0) saat scrolling tanpa auto-hide.
 * 3. 100% selaras warna gradien dengan bottom navigation dock.
 * 4. Mandiri dan tidak terikat/menyatu dengan komponen filter atau konten lain.
 */
export const UniversalEcosystemTopbar: React.FC<UniversalEcosystemTopbarProps> = React.memo(({
  ecosystem,
  title,
  icon: IconComponent,
  onBack,
  backTo,
  hideBack = false,
  onRefresh,
  isRefreshing = false,
  actions,
  className,
}) => {
  const navigate = useNavigate();
  const theme = getEcosystemTheme(ecosystem);
  const isLayer2 = theme.isLayer2;

  // Resolusi aksi tombol kembali
  const handleBack = () => {
    if (onBack) {
      onBack();
      return;
    }
    if (backTo) {
      navigate(backTo);
      return;
    }
    if (window.history.state && window.history.state.idx > 0) {
      navigate(-1);
    } else {
      navigate('/dashboard?tab=ringkasan');
    }
  };

  // Resolusi styling warna gradien selaras dengan bottom nav
  const getContainerStyles = () => {
    if (!isLayer2) {
      return 'bg-white/95 dark:bg-slate-900/95 border-slate-200/80 dark:border-slate-800 text-slate-900 dark:text-slate-100 shadow-xs';
    }

    switch (ecosystem) {
      case 'kurikulum':
        return 'bg-gradient-to-r from-emerald-600 via-emerald-600 to-teal-700 text-white border-emerald-400/40 shadow-xs shadow-emerald-950/20';
      case 'hubin':
      case 'pembimbing_pkl':
      case 'bkk':
        return 'bg-gradient-to-r from-orange-600 via-orange-600 to-amber-700 text-white border-orange-400/40 shadow-xs shadow-orange-950/20';
      case 'kesiswaan':
      case 'ekskul':
      case 'piket':
      case 'satpam':
        return 'bg-gradient-to-r from-rose-600 via-rose-600 to-red-700 text-white border-rose-400/40 shadow-xs shadow-rose-950/20';
      case 'kaprog':
        return 'bg-gradient-to-r from-amber-600 via-amber-600 to-amber-700 text-white border-amber-400/40 shadow-xs shadow-amber-950/20';
      case 'walas':
        return 'bg-gradient-to-r from-sky-600 via-sky-600 to-blue-700 text-white border-sky-400/40 shadow-xs shadow-sky-950/20';
      case 'sarpras':
      case 'toolman':
        return 'bg-gradient-to-r from-teal-700 via-teal-700 to-emerald-800 text-white border-teal-400/40 shadow-xs shadow-teal-950/20';
      case 'tu':
        return 'bg-gradient-to-r from-indigo-700 via-indigo-700 to-slate-800 text-white border-indigo-400/40 shadow-xs shadow-indigo-950/20';
      case 'bpbk':
        return 'bg-gradient-to-r from-purple-600 via-purple-600 to-violet-800 text-white border-purple-400/40 shadow-xs shadow-purple-950/20';
      case 'koperasi':
        return 'bg-gradient-to-r from-emerald-700 via-emerald-700 to-green-800 text-white border-emerald-400/40 shadow-xs shadow-emerald-950/20';
      case 'admin':
        return 'bg-gradient-to-r from-slate-800 via-slate-800 to-slate-950 text-white border-slate-600/40 shadow-xs shadow-slate-950/20';
      default:
        return 'bg-white/95 dark:bg-slate-900/95 border-slate-200/80 dark:border-slate-800 text-slate-900 dark:text-slate-100 shadow-xs';
    }
  };

  return (
    <header
      className={cn(
        'sticky top-0 z-30 h-12 px-3 sm:px-4 flex items-center justify-between gap-2.5 backdrop-blur-md transition-all',
        // Edge-to-edge flush menempel ke tepi layar pada mobile (< lg), contained pada desktop (>= lg)
        '-mx-4 -mt-2.5 sm:-mt-3 w-[calc(100%+2rem)] rounded-none border-b border-t-0 border-x-0 mb-3 sm:mb-4 lg:mx-0 lg:mt-0 lg:w-full lg:rounded-2xl lg:border',
        getContainerStyles(),
        className
      )}
    >
      {/* SISI KIRI: TOMBOL KEMBALI & JUDUL HALAMAN MURNI */}
      <div className="flex items-center gap-2 sm:gap-2.5 min-w-0 flex-1">
        {!hideBack && (
          <button
            type="button"
            onClick={handleBack}
            className={cn(
              'w-8 h-8 rounded-xl flex items-center justify-center transition-all shrink-0 cursor-pointer active:scale-90',
              isLayer2
                ? 'bg-white/15 hover:bg-white/25 text-white ring-1 ring-white/25 backdrop-blur-xs shadow-2xs'
                : 'border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
            )}
            title="Kembali"
            aria-label="Kembali"
          >
            <ArrowLeft size={16} className="stroke-[2.4]" />
          </button>
        )}

        {IconComponent && (
          <div
            className={cn(
              'w-7 h-7 rounded-lg flex items-center justify-center shrink-0 hidden sm:flex',
              isLayer2
                ? 'bg-white/20 text-white ring-1 ring-white/30'
                : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
            )}
          >
            <IconComponent size={14} />
          </div>
        )}

        {/* KONTEKS EKOSISTEM (EYEBROW) + JUDUL SUBTAB RAMPING */}
        <div className="flex flex-col min-w-0 flex-1 justify-center leading-tight">
          {isLayer2 && (
            <span className="text-[9px] sm:text-[9.5px] font-extrabold uppercase tracking-wider text-white/80 leading-none truncate">
              {getEcosystemLabel(ecosystem)}
            </span>
          )}
          <h1
            className={cn(
              'text-xs sm:text-sm font-bold tracking-tight truncate leading-tight',
              isLayer2 ? 'text-white drop-shadow-xs mt-0.5' : 'text-slate-900 dark:text-white'
            )}
          >
            {title}
          </h1>
        </div>
      </div>

      {/* SISI KANAN: AKSI MINIMAL (TOMBOL KUSTOM & REFRESH) */}
      <div className="flex items-center gap-1.5 shrink-0">
        {actions}

        {onRefresh && (
          <button
            type="button"
            onClick={onRefresh}
            disabled={isRefreshing}
            className={cn(
              'w-8 h-8 rounded-xl flex items-center justify-center transition-all cursor-pointer disabled:opacity-50 active:scale-95 shrink-0',
              isLayer2
                ? 'bg-white/15 hover:bg-white/25 text-white ring-1 ring-white/25 backdrop-blur-xs'
                : 'border border-slate-200/80 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
            )}
            title="Segarkan Data"
            aria-label="Segarkan Data"
          >
            <RefreshCw size={14} className={cn(isRefreshing && 'animate-spin')} />
          </button>
        )}
      </div>
    </header>
  );
});

UniversalEcosystemTopbar.displayName = 'UniversalEcosystemTopbar';
