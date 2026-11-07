import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { 
  type EcosystemType, 
  getEcosystemTheme 
} from '@/config/bottomNavEcosystems.config';

export interface UniversalEcosystemTopbarProps {
  /**
   * Ekosistem / Divisi (menentukan warna gradien yang 100% selaras dengan bottom nav)
   */
  ecosystem: EcosystemType;

  /**
   * Judul Halaman / Subtab Aktif yang Sedang Dibuka (e.g. "Jadwal & Delegasi Inval", "Perangkat Ajar Guru")
   */
  title: string;

  /**
   * Lencana Divisi / Breadcrumb Ekosistem (e.g. "KURIKULUM", "KAPROG", "WALI KELAS")
   */
  ecosystemBadge?: string;

  /**
   * Subtitle atau Periode Akademik (e.g. "TP 2026/2027 • Semester Ganjil" atau "Kelas X AKL 1")
   */
  subtitle?: React.ReactNode;

  /**
   * Deskripsi ringkas halaman (opsional, muncul di layar desktop md:block)
   */
  description?: string;

  /**
   * Icon divisi/subtab (opsional)
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
   * Status pemuatan refresh (menghidupkan animasi putar pada ikon)
   */
  isRefreshing?: boolean;

  /**
   * Slot tombol aksi tambahan di sebelah kanan (misal: tombol Filter Periode, Ekspor, TV Mode)
   */
  actions?: React.ReactNode;

  /**
   * Slot collapsible filter toolbar (misal: AcademicFilterToolbar)
   */
  filterSlot?: React.ReactNode;

  /**
   * Apakah slot filter sedang terbuka / dimunculkan
   */
  isFilterOpen?: boolean;

  /**
   * Kustomisasi kelas wrapper luar
   */
  className?: string;
}

/**
 * ── UNIVERSAL ECOSYSTEM TOPBAR (STANDAR INDUSTRI ABSENTA) ──
 * Komponen topbar terpadu yang menyelaraskan warna gradien dengan bilah navigasi bawah (bottom dock)
 * dan secara dinamis menampilkan judul subtab/halaman yang sedang dibuka.
 */
export const UniversalEcosystemTopbar: React.FC<UniversalEcosystemTopbarProps> = React.memo(({
  ecosystem,
  title,
  ecosystemBadge,
  subtitle,
  description,
  icon: IconComponent,
  onBack,
  backTo,
  hideBack = false,
  onRefresh,
  isRefreshing = false,
  actions,
  filterSlot,
  isFilterOpen = false,
  className,
}) => {
  const navigate = useNavigate();
  const theme = getEcosystemTheme(ecosystem);
  const isLayer2 = theme.isLayer2;

  // Resolusi aksi kembali
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

  // Resolusi styling container topbar selaras dengan bottom nav
  const getContainerStyles = () => {
    if (!isLayer2) {
      return 'bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-slate-900 dark:text-slate-100 shadow-xs';
    }

    switch (ecosystem) {
      case 'kurikulum':
        return 'bg-gradient-to-r from-emerald-600 via-emerald-600 to-teal-700 text-white border border-emerald-400/40 shadow-lg shadow-emerald-950/20';
      case 'hubin':
      case 'pembimbing_pkl':
      case 'bkk':
        return 'bg-gradient-to-r from-orange-600 via-orange-600 to-amber-700 text-white border border-orange-400/40 shadow-lg shadow-orange-950/20';
      case 'kesiswaan':
      case 'ekskul':
      case 'piket':
      case 'satpam':
        return 'bg-gradient-to-r from-rose-600 via-rose-600 to-red-700 text-white border border-rose-400/40 shadow-lg shadow-rose-950/20';
      case 'kaprog':
        return 'bg-gradient-to-r from-amber-600 via-amber-600 to-amber-700 text-white border border-amber-400/40 shadow-lg shadow-amber-950/20';
      case 'walas':
        return 'bg-gradient-to-r from-sky-600 via-sky-600 to-blue-700 text-white border border-sky-400/40 shadow-lg shadow-sky-950/20';
      case 'sarpras':
      case 'toolman':
        return 'bg-gradient-to-r from-teal-700 via-teal-700 to-emerald-800 text-white border border-teal-400/40 shadow-lg shadow-teal-950/20';
      case 'tu':
        return 'bg-gradient-to-r from-indigo-700 via-indigo-700 to-slate-800 text-white border border-indigo-400/40 shadow-lg shadow-indigo-950/20';
      case 'bpbk':
        return 'bg-gradient-to-r from-purple-600 via-purple-600 to-violet-800 text-white border border-purple-400/40 shadow-lg shadow-purple-950/20';
      case 'koperasi':
        return 'bg-gradient-to-r from-emerald-700 via-emerald-700 to-green-800 text-white border border-emerald-400/40 shadow-lg shadow-emerald-950/20';
      case 'admin':
        return 'bg-gradient-to-r from-slate-800 via-slate-800 to-slate-950 text-white border border-slate-600/40 shadow-lg shadow-slate-950/20';
      default:
        return 'bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-slate-900 dark:text-slate-100 shadow-xs';
    }
  };

  return (
    <header
      className={cn(
        'rounded-2xl p-3 sm:p-4 transition-all relative overflow-hidden',
        getContainerStyles(),
        className
      )}
    >
      <div className="flex items-center justify-between gap-3 relative z-10">
        {/* SISI KIRI: TOMBOL KEMBALI & IDENTITAS HALAMAN / SUBTAB AKTIF */}
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
          {!hideBack && (
            <button
              type="button"
              onClick={handleBack}
              className={cn(
                'w-8 h-8 rounded-xl flex items-center justify-center transition-all shrink-0 cursor-pointer active:scale-90',
                isLayer2
                  ? 'bg-white/15 hover:bg-white/25 text-white ring-1 ring-white/25 backdrop-blur-xs shadow-xs'
                  : 'border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
              )}
              title="Kembali"
              aria-label="Kembali"
            >
              <ArrowLeft size={17} className="stroke-[2.2]" />
            </button>
          )}

          {IconComponent && (
            <div
              className={cn(
                'w-8 h-8 rounded-xl flex items-center justify-center shrink-0 hidden sm:flex',
                isLayer2
                  ? 'bg-white/20 text-white ring-1 ring-white/30 backdrop-blur-xs'
                  : 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400 border border-indigo-200/60'
              )}
            >
              <IconComponent size={16} />
            </div>
          )}

          <div className="min-w-0 flex-1">
            {/* Context Line: Lencana Divisi & Periode */}
            <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap leading-tight">
              {ecosystemBadge && (
                <span
                  className={cn(
                    'text-[9px] sm:text-[9.5px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full inline-flex items-center',
                    isLayer2
                      ? 'bg-white/25 text-white ring-1 ring-white/35 backdrop-blur-xs shadow-2xs'
                      : 'bg-indigo-50 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 ring-1 ring-indigo-200/80 dark:ring-indigo-800/80'
                  )}
                >
                  {ecosystemBadge}
                </span>
              )}

              {subtitle && (
                <>
                  <span className={cn('text-[10px] hidden sm:inline', isLayer2 ? 'text-white/60' : 'text-slate-300 dark:text-slate-700')}>
                    •
                  </span>
                  <span
                    className={cn(
                      'text-[10.5px] sm:text-[11px] font-semibold truncate',
                      isLayer2 ? 'text-white/85' : 'text-slate-500 dark:text-slate-400'
                    )}
                  >
                    {subtitle}
                  </span>
                </>
              )}
            </div>

            {/* Judul Subtab / Halaman Aktif yang Sedang Dibuka */}
            <h1
              className={cn(
                'text-sm sm:text-base font-extrabold tracking-tight truncate mt-0.5',
                isLayer2 ? 'text-white drop-shadow-xs' : 'text-slate-900 dark:text-white'
              )}
            >
              {title}
            </h1>

            {/* Deskripsi Tambahan (Tampil pada Desktop) */}
            {description && (
              <p
                className={cn(
                  'text-[11px] truncate hidden md:block mt-0.5',
                  isLayer2 ? 'text-white/75' : 'text-slate-500 dark:text-slate-400'
                )}
              >
                {description}
              </p>
            )}
          </div>
        </div>

        {/* SISI KANAN: TOMBOL AKSI CEPAT (REFRESH & ACTIONS KUSTOM) */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {actions}

          {onRefresh && (
            <button
              type="button"
              onClick={onRefresh}
              disabled={isRefreshing}
              className={cn(
                'p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50 active:scale-95',
                isLayer2
                  ? 'bg-white/15 hover:bg-white/25 text-white ring-1 ring-white/25 backdrop-blur-xs shadow-xs'
                  : 'border border-slate-200/80 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
              )}
              title="Segarkan Data"
              aria-label="Segarkan Data"
            >
              <RefreshCw size={13} className={cn(isRefreshing && 'animate-spin')} />
              <span className="hidden sm:inline">Segarkan</span>
            </button>
          )}
        </div>
      </div>

      {/* SLOT COLLAPSIBLE FILTER TOOLBAR (Bila Ada) */}
      {isFilterOpen && filterSlot && (
        <div className={cn(
          'mt-3 pt-3 animate-in fade-in slide-in-from-top-2 duration-200',
          isLayer2 ? 'border-t border-white/20' : 'border-t border-slate-100 dark:border-slate-800'
        )}>
          {filterSlot}
        </div>
      )}
    </header>
  );
});

UniversalEcosystemTopbar.displayName = 'UniversalEcosystemTopbar';
