import React, { Suspense, lazy } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useIsMobile } from '@/hooks/useIsMobile';
import { 
  FileText, 
  Printer, 
  Plus, 
  Upload, 
  Search, 
  X,
  RotateCcw,
  SlidersHorizontal
} from 'lucide-react';
import type { AcademicFilterToolbarProps } from './types';

const SearchableSelect = lazy(() =>
  import('@/components/ui/SearchableSelect').then((m) => ({ default: m.SearchableSelect }))
);

const SuspenseFallback = () => (
  <div className="h-10 rounded-xl bg-slate-100 dark:bg-slate-800 animate-pulse" />
);

// ── FLAG DEBUG IDENTIFIKASI MIGRASI (DEV MODE ONLY) ───────────
// Nonaktif secara default agar UI bersih di lingkungan pengujian
const DEBUG_BORDER_ACADEMIC_FILTER = false;

export const AcademicFilterToolbar = React.memo(function AcademicFilterToolbar({
  enableTp = true,
  enableSemester = false,
  enableTingkat = false,
  enableKelas = false,
  enableMitra = false,
  enableCohort = true,
  enableMapel = false,
  enableBulan = false,
  enableTanggal = false,
  enableGuru = false,
  enableSiswa = false,
  enableSearch = false,
  enableGender = false,
  enableStatusSiswa = false,

  values,
  setTahunPelajaranId,
  setSemesterId,
  setTingkat,
  setKelasId,
  setMitraId,
  setMapelId,
  setBulan,
  setTanggal,
  setGuruId,
  setSiswaId,
  setSearchQuery,
  setGender,
  setStatusSiswa,

  tpOptions = [],
  semesterOptions = [],
  tingkatOptions = [],
  kelasOptions = [],
  mitraOptions = [],
  mapelOptions = [],
  guruOptions = [],
  siswaOptions = [],
  genderOptions = [],
  statusSiswaOptions = [],

  isLoadingTp = false,
  isLoadingSem = false,
  isLoadingKelas = false,
  isLoadingMitra = false,
  isLoadingMapel = false,
  isLoadingGuru = false,
  isLoadingSiswa = false,
  isLoadingGender = false,
  isLoadingStatusSiswa = false,

  isKelasDisabled = false,

  cohortStages = [],
  onJumpCohortStage,

  onReset,
  onAdd,
  addLabel = 'Tambah Data',
  onImport,
  importLabel = 'Import',
  onExportExcel,
  onExportPdf,

  actionsLeft,
  actionsRight,
  bottomContent,
  children,

  variant = 'card',
  className,
  searchPlaceholder = 'Cari data...',
}: AcademicFilterToolbarProps) {
  const isMobile = useIsMobile(768);
  const effectiveVariant = variant === 'card' && isMobile ? 'mini' : variant;

  const containerClasses = cn(
    'relative transition-all',
    effectiveVariant === 'card' &&
      'p-3 sm:p-4 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/40 shadow-2xs',
    effectiveVariant === 'compact' &&
      'p-2 sm:p-2.5 rounded-lg border border-slate-200/70 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-900/30',
    effectiveVariant === 'sidebar' &&
      'p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs w-full',
    effectiveVariant === 'mini' &&
      'p-2 sm:p-2.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs w-full',
    effectiveVariant === 'plain' && '',
    DEBUG_BORDER_ACADEMIC_FILTER &&
      '!border-2 !border-rose-500 shadow-md shadow-rose-500/10 ring-2 ring-rose-500/20',
    className
  );

  const hasCohortBadges =
    enableKelas &&
    enableCohort &&
    cohortStages.length > 0 &&
    cohortStages.some((s) => s.is_available);

  const hasStandardActions = Boolean(onAdd || onImport || onExportExcel || onExportPdf || actionsRight);

  const resolvedGenderOptions = genderOptions.length > 0 ? genderOptions : [
    { value: '', label: 'Semua' },
    { value: 'L', label: 'Laki-laki (L)' },
    { value: 'P', label: 'Perempuan (P)' },
  ];

  const resolvedStatusSiswaOptions = statusSiswaOptions.length > 0 ? statusSiswaOptions : [
    { value: '', label: 'Semua' },
    { value: 'AKTIF', label: 'Aktif' },
    { value: 'LULUS', label: 'Lulus' },
    { value: 'MUTASI', label: 'Mutasi' },
    { value: 'KELUAR', label: 'Keluar' },
  ];

  const [isMiniExpanded, setIsMiniExpanded] = React.useState(false);

  const activeCount = React.useMemo(() => {
    let c = 0;
    if (enableTp && values.tahunPelajaranId) c++;
    if (enableSemester && values.semesterId) c++;
    if (enableTingkat && values.tingkat) c++;
    if (enableKelas && values.kelasId) c++;
    if (enableMapel && values.mapelId) c++;
    if (enableGuru && values.guruId) c++;
    if (enableSiswa && values.siswaId) c++;
    if (enableMitra && values.mitraId) c++;
    if (enableGender && values.gender) c++;
    if (enableStatusSiswa && values.statusSiswa) c++;
    return c;
  }, [
    enableTp, enableSemester, enableTingkat, enableKelas, enableMapel,
    enableGuru, enableSiswa, enableMitra, enableGender, enableStatusSiswa,
    values
  ]);

  return (
    <div className={containerClasses}>
      {DEBUG_BORDER_ACADEMIC_FILTER && (
        <span className="absolute -top-2.5 right-4 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider bg-rose-600 text-white rounded-md shadow-xs pointer-events-none select-none z-20 flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
          AcademicFilter Engine
        </span>
      )}
      <div className="flex flex-col gap-3.5">
        {/* Top/Left Action bar (jika ada actionsLeft) */}
        {actionsLeft && (
          <div className="flex items-center justify-between pb-1 border-b border-slate-200/60 dark:border-slate-800/60">
            {actionsLeft}
          </div>
        )}

        {/* Header Baris Mini jika effectiveVariant === 'mini' */}
        {effectiveVariant === 'mini' && (
          <div className="flex items-center gap-1.5">
            {enableSearch && (
              <div className="relative flex-1 min-w-0">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                <Input
                  id="filter-search-mini"
                  aria-label="Pencarian Cepat"
                  value={values.searchQuery || ''}
                  onChange={(e) => setSearchQuery?.(e.target.value)}
                  placeholder={searchPlaceholder}
                  className="pl-9 pr-3 h-9 text-xs rounded-xl bg-slate-50 dark:bg-slate-950 border-slate-200/80 dark:border-slate-800"
                />
              </div>
            )}

            <button
              type="button"
              onClick={() => setIsMiniExpanded((prev) => !prev)}
              className={cn(
                "h-9 px-2.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-all shrink-0 cursor-pointer",
                isMiniExpanded || activeCount > 0
                  ? "bg-indigo-50 text-indigo-600 border-indigo-200 dark:bg-indigo-950/50 dark:border-indigo-800 dark:text-indigo-400"
                  : "bg-slate-50 text-slate-600 border-slate-200/80 dark:bg-slate-950 dark:border-slate-800 dark:text-slate-300"
              )}
              aria-label="Toggle Filter Lanjutan"
            >
              <SlidersHorizontal size={13} />
              <span className="text-[11px]">Filter</span>
              {activeCount > 0 && (
                <span className="w-4 h-4 rounded-full bg-indigo-600 text-white text-[9.5px] font-bold flex items-center justify-center">
                  {activeCount}
                </span>
              )}
            </button>

            {onReset && activeCount > 0 && (
              <button
                type="button"
                onClick={onReset}
                className="h-9 px-2 rounded-xl text-xs text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
                title="Reset Semua Filter"
              >
                <RotateCcw size={13} />
              </button>
            )}

            {actionsRight && <div className="shrink-0">{actionsRight}</div>}
          </div>
        )}

        {/* Baris Filter Dinamis */}
        {(effectiveVariant !== 'mini' || isMiniExpanded) && (
          <div className={cn(
            effectiveVariant === 'sidebar'
              ? 'flex flex-col gap-3 w-full'
              : 'flex flex-wrap items-start gap-2.5 sm:gap-3.5',
            effectiveVariant === 'mini' && 'pt-2 border-t border-slate-100 dark:border-slate-800 animate-in fade-in duration-150'
          )}>
          {/* 1. Tahun Pelajaran */}
          {enableTp && (
            <div className={cn('space-y-1.5', effectiveVariant === 'sidebar' ? 'w-full min-w-0' : 'flex-1 min-w-[140px] max-w-full sm:max-w-[240px]')}>
              <label
                htmlFor="filter-tp-select"
                className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1 block"
              >
                Tahun Pelajaran
              </label>
              <Suspense fallback={<SuspenseFallback />}>
                <SearchableSelect
                  id="filter-tp-select"
                  aria-label="Pilih Tahun Pelajaran"
                  value={values.tahunPelajaranId}
                  onValueChange={(v) => setTahunPelajaranId?.(v)}
                  options={tpOptions}
                  isLoading={isLoadingTp}
                  placeholder="Pilih Tahun..."
                  triggerClassName="h-10 rounded-xl bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-xs font-bold"
                />
              </Suspense>
            </div>
          )}

          {/* 2. Semester */}
          {enableSemester && (
            <div className={cn('space-y-1.5', effectiveVariant === 'sidebar' ? 'w-full min-w-0' : 'flex-1 min-w-[130px] max-w-full sm:max-w-[180px]')}>
              <label
                htmlFor="filter-sem-select"
                className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1 block"
              >
                Semester
              </label>
              <Suspense fallback={<SuspenseFallback />}>
                <SearchableSelect
                  id="filter-sem-select"
                  aria-label="Pilih Semester"
                  value={values.semesterId}
                  onValueChange={(v) => setSemesterId?.(v)}
                  options={semesterOptions}
                  isLoading={isLoadingSem}
                  placeholder="Pilih Semester..."
                  triggerClassName="h-10 rounded-xl bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-xs font-bold"
                />
              </Suspense>
            </div>
          )}

          {/* 3. Tingkat */}
          {enableTingkat && (
            <div className={cn('space-y-1.5', effectiveVariant === 'sidebar' ? 'w-full min-w-0' : 'flex-1 min-w-[120px] max-w-full sm:max-w-[160px]')}>
              <label
                htmlFor="filter-tingkat-select"
                className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1 block"
              >
                Tingkat
              </label>
              <Suspense fallback={<SuspenseFallback />}>
                <SearchableSelect
                  id="filter-tingkat-select"
                  aria-label="Pilih Tingkat"
                  value={values.tingkat ? String(values.tingkat) : ''}
                  onValueChange={(v) => setTingkat?.(v ? parseInt(v, 10) : '')}
                  options={[
                    { value: '', label: 'Semua' },
                    ...tingkatOptions,
                  ]}
                  placeholder="Semua"
                  triggerClassName="h-10 rounded-xl bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-xs font-bold"
                />
              </Suspense>
            </div>
          )}

          {/* 4. Pilih Kelas + Cohort Lineage Badges */}
          {enableKelas && (
            <div className={cn('space-y-1.5', effectiveVariant === 'sidebar' ? 'w-full min-w-0' : 'flex-1 min-w-[150px] max-w-full sm:max-w-[240px]')}>
              <label
                htmlFor="filter-kelas-select"
                className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1 block"
              >
                Pilih Kelas
              </label>
              <Suspense fallback={<SuspenseFallback />}>
                <SearchableSelect
                  id="filter-kelas-select"
                  aria-label="Pilih Kelas"
                  value={values.kelasId}
                  onValueChange={(v) => setKelasId?.(v)}
                  options={kelasOptions}
                  isLoading={isLoadingKelas}
                  placeholder="Pilih Kelas..."
                  disabled={isKelasDisabled}
                  triggerClassName="h-10 rounded-xl bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-xs font-bold"
                />
              </Suspense>

              {/* Badges Linimasa Angkatan Rombel Otomatis */}
              {hasCohortBadges && (
                <div className="flex items-center gap-1 pt-1 flex-wrap overflow-x-auto no-scrollbar py-0.5">
                  {cohortStages.map((stage) => {
                    const isCurrent =
                      stage.is_current ||
                      (stage.kelas_id === values.kelasId &&
                        (!stage.tahun_pelajaran_id ||
                          stage.tahun_pelajaran_id === values.tahunPelajaranId));
                    return (
                      <button
                        key={stage.tingkat}
                        type="button"
                        disabled={!stage.is_available}
                        onClick={() => stage.is_available && onJumpCohortStage?.(stage)}
                        className={cn(
                          'px-2 py-0.5 text-[10px] rounded-md font-bold transition-all flex items-center gap-1 border cursor-pointer shrink-0',
                          isCurrent
                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs'
                            : stage.is_available
                              ? 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:border-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-300'
                              : 'bg-slate-100/50 dark:bg-slate-800/30 text-slate-400 dark:text-slate-600 border-dashed border-slate-200 dark:border-slate-800 cursor-not-allowed opacity-40'
                        )}
                        title={
                          stage.is_available
                            ? `Beralih ke ${stage.nama_kelas} (${stage.tahun})`
                            : `Data ${stage.label} belum terdaftar di riwayat akademik`
                        }
                      >
                        <span>{stage.nama_kelas || stage.label}</span>
                        {isCurrent && (
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* 4B. Mitra Industri (DUDI / Hubin) */}
          {enableMitra && (
            <div className={cn('space-y-1.5', effectiveVariant === 'sidebar' ? 'w-full min-w-0' : 'flex-1 min-w-[150px] max-w-full sm:max-w-[240px]')}>
              <label
                htmlFor="filter-mitra-select"
                className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1 block"
              >
                Mitra Industri
              </label>
              <Suspense fallback={<SuspenseFallback />}>
                <SearchableSelect
                  id="filter-mitra-select"
                  aria-label="Pilih Mitra Industri"
                  value={values.mitraId}
                  onValueChange={(v) => setMitraId?.(v)}
                  options={mitraOptions}
                  isLoading={isLoadingMitra}
                  placeholder="Semua"
                  triggerClassName="h-10 rounded-xl bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-xs font-bold"
                />
              </Suspense>
            </div>
          )}

          {/* 4C. Mata Pelajaran */}
          {enableMapel && (
            <div className={cn('space-y-1.5', effectiveVariant === 'sidebar' ? 'w-full min-w-0' : 'flex-1 min-w-[160px] max-w-full sm:max-w-[240px]')}>
              <label
                htmlFor="filter-mapel-select"
                className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1 block"
              >
                Mata Pelajaran
              </label>
              <Suspense fallback={<SuspenseFallback />}>
                <SearchableSelect
                  id="filter-mapel-select"
                  aria-label="Pilih Mata Pelajaran"
                  value={values.mapelId}
                  onValueChange={(v) => setMapelId?.(v)}
                  options={mapelOptions}
                  isLoading={isLoadingMapel}
                  placeholder={
                    enableKelas && !values.kelasId
                      ? 'Pilih kelas dahulu...'
                      : mapelOptions.length === 0
                      ? 'Tidak ada mapel'
                      : 'Pilih Mapel...'
                  }
                  disabled={enableKelas && !values.kelasId}
                  triggerClassName="h-10 rounded-xl bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-xs font-bold"
                />
              </Suspense>
            </div>
          )}

          {/* 5. Guru */}
          {enableGuru && (
            <div className="space-y-1.5 flex-1 min-w-[140px] max-w-full sm:max-w-[220px]">
              <label
                htmlFor="filter-guru-select"
                className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1 block"
              >
                Guru / Pengajar
              </label>
              <Suspense fallback={<SuspenseFallback />}>
                <SearchableSelect
                  id="filter-guru-select"
                  aria-label="Pilih Guru"
                  value={values.guruId}
                  onValueChange={(v) => setGuruId?.(v)}
                  options={guruOptions}
                  isLoading={isLoadingGuru}
                  placeholder="Semua"
                  clearable
                  triggerClassName="h-10 rounded-xl bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-xs font-bold"
                />
              </Suspense>
            </div>
          )}

          {/* 6. Siswa */}
          {enableSiswa && (
            <div className="space-y-1.5 flex-1 min-w-[140px] max-w-full sm:max-w-[220px]">
              <label
                htmlFor="filter-siswa-select"
                className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1 block"
              >
                Siswa
              </label>
              <Suspense fallback={<SuspenseFallback />}>
                <SearchableSelect
                  id="filter-siswa-select"
                  aria-label="Pilih Siswa"
                  value={values.siswaId}
                  onValueChange={(v) => setSiswaId?.(v)}
                  options={siswaOptions}
                  isLoading={isLoadingSiswa}
                  placeholder="Semua"
                  clearable
                  triggerClassName="h-10 rounded-xl bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-xs font-bold"
                />
              </Suspense>
            </div>
          )}

          {/* 6B. Jenis Kelamin */}
          {enableGender && (
            <div className={cn('space-y-1.5', effectiveVariant === 'sidebar' ? 'w-full min-w-0' : 'flex-1 min-w-[120px] max-w-full sm:max-w-[170px]')}>
              <label
                htmlFor="filter-gender-select"
                className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1 block"
              >
                Jenis Kelamin
              </label>
              <Suspense fallback={<SuspenseFallback />}>
                <SearchableSelect
                  id="filter-gender-select"
                  aria-label="Pilih Jenis Kelamin"
                  value={values.gender || ''}
                  onValueChange={(val) => setGender?.(val)}
                  options={resolvedGenderOptions}
                  isLoading={isLoadingGender}
                  placeholder="Semua"
                  triggerClassName="h-10 rounded-xl bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-xs font-bold"
                />
              </Suspense>
            </div>
          )}

          {/* 6C. Status Siswa */}
          {enableStatusSiswa && (
            <div className={cn('space-y-1.5', effectiveVariant === 'sidebar' ? 'w-full min-w-0' : 'flex-1 min-w-[130px] max-w-full sm:max-w-[190px]')}>
              <label
                htmlFor="filter-status-siswa-select"
                className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1 block"
              >
                Status Siswa
              </label>
              <Suspense fallback={<SuspenseFallback />}>
                <SearchableSelect
                  id="filter-status-siswa-select"
                  aria-label="Pilih Status Siswa"
                  value={values.statusSiswa || ''}
                  onValueChange={(val) => setStatusSiswa?.(val)}
                  options={resolvedStatusSiswaOptions}
                  isLoading={isLoadingStatusSiswa}
                  placeholder="Semua"
                  triggerClassName="h-10 rounded-xl bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-xs font-bold"
                />
              </Suspense>
            </div>
          )}

          {/* 7. Bulan Laporan */}
          {enableBulan && (
            <div className="space-y-1.5 flex-1 min-w-[130px] max-w-full sm:max-w-[180px]">
              <label
                htmlFor="filter-bulan-input"
                className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1 block"
              >
                Bulan Laporan
              </label>
              <Input
                id="filter-bulan-input"
                aria-label="Pilih Bulan Laporan"
                type="month"
                value={values.bulan}
                onChange={(e) => setBulan(e.target.value)}
                className="h-10 rounded-xl bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-xs font-bold"
              />
            </div>
          )}

          {/* 8. Tanggal */}
          {enableTanggal && (
            <div className="space-y-1.5 flex-1 min-w-[130px] max-w-full sm:max-w-[170px]">
              <label
                htmlFor="filter-tanggal-input"
                className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1 block"
              >
                Tanggal
              </label>
              <Input
                id="filter-tanggal-input"
                aria-label="Pilih Tanggal"
                type="date"
                value={values.tanggal}
                onChange={(e) => setTanggal(e.target.value)}
                className="h-10 rounded-xl bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-xs font-bold"
              />
            </div>
          )}

          {/* 9. Box Pencarian (Search Input) */}
          {enableSearch && (
            <div className="space-y-1.5 flex-1 min-w-[160px] max-w-full sm:max-w-[260px]">
              <label
                htmlFor="filter-search-input"
                className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1 block"
              >
                Pencarian
              </label>
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <Input
                  id="filter-search-input"
                  aria-label="Kotak Pencarian"
                  type="text"
                  placeholder={searchPlaceholder}
                  value={values.searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-10 pl-9 pr-8 rounded-xl bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-xs font-bold"
                />
                {values.searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5 cursor-pointer"
                    aria-label="Hapus pencarian"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Reset Action Button */}
          {onReset && (
            <div className={cn(effectiveVariant === 'sidebar' ? 'pt-1 w-full' : 'pt-2 sm:pt-6')}>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={onReset}
                className={cn(
                  'h-10 px-3 text-xs font-medium text-rose-600 dark:text-rose-400 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-xl transition-colors cursor-pointer',
                  effectiveVariant === 'sidebar' ? 'w-full justify-center' : 'shrink-0'
                )}
                title="Reset semua filter ke default"
              >
                <RotateCcw size={14} className="mr-1.5" />
                Reset
              </Button>
            </div>
          )}

          {/* Children / Custom Inject Slot */}
          {children}

          {/* Standar CRUD & Export Actions (Align Baseline di Desktop, Full-Width Flex di Mobile) */}
          {hasStandardActions && (
            <div className={cn(
              effectiveVariant === 'sidebar'
                ? 'flex flex-col gap-2 w-full pt-1'
                : 'flex flex-wrap items-center gap-2 w-full sm:w-auto sm:ml-auto pt-2 sm:pt-6'
            )}>
              {onExportExcel && (
                <Button
                  onClick={onExportExcel}
                  variant="outline"
                  size="sm"
                  className="flex-1 sm:flex-initial h-10 rounded-xl font-bold text-[10px] uppercase tracking-widest px-3.5 border-slate-200 dark:border-slate-800 cursor-pointer justify-center"
                >
                  <FileText className="w-3.5 h-3.5 mr-1.5" /> Export Excel
                </Button>
              )}

              {onExportPdf && (
                <Button
                  onClick={onExportPdf}
                  variant="outline"
                  size="sm"
                  className="flex-1 sm:flex-initial h-10 rounded-xl font-bold text-[10px] uppercase tracking-widest px-3.5 border-rose-200 dark:border-rose-900/50 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 cursor-pointer justify-center"
                >
                  <Printer className="w-3.5 h-3.5 mr-1.5" /> Cetak PDF
                </Button>
              )}

              {onImport && (
                <Button
                  onClick={onImport}
                  variant="outline"
                  size="sm"
                  className="flex-1 sm:flex-initial h-10 rounded-xl font-bold text-[10px] uppercase tracking-widest px-3.5 border-indigo-200 dark:border-indigo-900/50 text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 cursor-pointer justify-center"
                >
                  <Upload className="w-3.5 h-3.5 mr-1.5" /> {importLabel}
                </Button>
              )}

              {onAdd && (
                <Button
                  onClick={onAdd}
                  size="sm"
                  className="flex-1 sm:flex-initial h-10 rounded-xl font-bold text-[10px] uppercase tracking-widest px-4 bg-indigo-600 hover:bg-indigo-700 text-white shadow-2xs cursor-pointer justify-center"
                >
                  <Plus className="w-4 h-4 mr-1.5" /> {addLabel}
                </Button>
              )}

              {actionsRight}
            </div>
          )}
        </div>
      )}

        {/* Bottom Content / Embedded Slot dengan Divider */}
        {bottomContent && (
          <div className="pt-3 border-t border-slate-200/60 dark:border-slate-800/60">
            {bottomContent}
          </div>
        )}
      </div>
    </div>
  );
});
