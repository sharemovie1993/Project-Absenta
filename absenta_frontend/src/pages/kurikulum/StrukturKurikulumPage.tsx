import React, { useState, useMemo, useCallback, lazy, Suspense } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Layers, Target, BarChart3, ChevronRight,
  BookOpen, Settings, Search, Printer, Loader2, Copy,
} from 'lucide-react';
import { Card }    from '../../components/ui/Card';
import { Badge }   from '../../components/ui/Badge';
import { Button }  from '../../components/ui/Button';
import { Skeleton } from '../../components/ui/Skeleton';
import { kurikulumApi } from '../../api/kurikulum.api';

const CloneStrukturModal = lazy(() => import('../../components/kurikulum/CloneStrukturModal'));
import { tahunPelajaranApi, jurusanApi } from '../../api/academic.api';
import { useNavigate }       from 'react-router-dom';
import { AcademicPageLayout } from '../../components/academic/AcademicPageLayout';
import { useJenjang }         from '../../hooks/useJenjang';
import { cn }                 from '../../lib/utils';
import { z }                  from 'zod';
import { performStrukturPrint } from '../../utils/kurikulum/masterStrukturHelper';
import { useAuth }            from '../../hooks/useAuth';
import { getTenantById }      from '../../api/tenants.api';

// ─── Theme helpers (Pilar 21B – ekstrak dari God File) ───────────────────────
import {
  INDIGO_THEME,
  resolveMajorTheme,
  buildDynamicStyles,
} from '../../components/kurikulum/strukturKurikulum.theme';
import type { Jurusan } from '../../components/kurikulum/strukturKurikulum.theme';

// ─── Lazy-loaded heavy UI (Pilar 11 – Lazy Loading) ──────────────────────────
const SearchableSelect = lazy(() =>
  import('../../components/ui/SearchableSelect').then(m => ({ default: m.SearchableSelect }))
);

// ─── Zod filter schema (Pilar 26 – Form Validation) ─────────────────────────
const filterSchema = z.object({
  searchTerm:      z.string().optional(),
  selectedKelompok: z.string().optional(),
});

// ─── Local types ──────────────────────────────────────────────────────────────
interface StrukturItem {
  id: string;
  tingkat: number;
  jp_per_minggu: number;
  kelompok?: string;
  Mapel?: { nama_mapel: string; kode_mapel: string };
  [key: string]: unknown;
}

interface GradeStats { count: number; totalJp: number }

// ─── Kelompok normalizer ──────────────────────────────────────────────────────
function normalizeKelompok(raw: string | undefined): string {
  const k = raw ?? 'MATA PELAJARAN UMUM';
  if (k === 'NASIONAL' || k === 'UMUM')         return 'MATA PELAJARAN UMUM';
  if (k === 'KEJURUAN')                          return 'MATA PELAJARAN KEJURUAN';
  if (k === 'PILIHAN')                           return 'MATA PELAJARAN PILIHAN';
  if (k === 'LOKAL'   || k === 'MUATAN_LOKAL')  return 'MUATAN LOKAL';
  return k;
}

// ─── Page ─────────────────────────────────────────────────────────────────────
const StrukturKurikulumPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, can } = useAuth();
  const { tingkatList, kelompokOptions, jenjang } = useJenjang();

  const [selectedTingkat,  setSelectedTingkat]  = useState<number | null>(null);
  const [searchTerm,       setSearchTerm]        = useState('');
  const [selectedKelompok, setSelectedKelompok]  = useState<string>('ALL');
  const [selectedJurusanId, setSelectedJurusanId] = useState<string>('');
  const [isPrinting,       setIsPrinting]        = useState(false);
  const [isCloneModalOpen, setIsCloneModalOpen] = useState(false);

  const isSmkOrMak = useMemo(() => {
    const j = (jenjang || '').toUpperCase();
    return j === 'SMK' || j === 'MAK';
  }, [jenjang]);

  // ── Remote data ──────────────────────────────────────────────────────────
  const { data: years } = useQuery({
    queryKey: ['academic-years'],
    queryFn:  () => tahunPelajaranApi.getAll(),
  });

  const { data: jurusans } = useQuery({
    queryKey: ['academic-jurusans'],
    queryFn:  () => jurusanApi.getAll(),
    enabled:  isSmkOrMak,
  });

  const { data: tenantRes } = useQuery({
    queryKey: ['tenant-profile', user?.tenant_id],
    queryFn:  () => getTenantById(user?.tenant_id ?? ''),
    enabled:  !!user?.tenant_id,
  });
  const tenantInfo = tenantRes?.data;

  // Set default jurusan
  React.useEffect(() => {
    const list: Jurusan[] = jurusans?.data ?? [];
    if (isSmkOrMak && list.length > 0 && !selectedJurusanId) {
      setSelectedJurusanId(list[0].id);
    }
  }, [isSmkOrMak, jurusans, selectedJurusanId]);

  const activeYear = useMemo(
    () => (years?.data ?? []).find(y => y.is_active),
    [years],
  );

  const { data: mapping, isLoading } = useQuery({
    queryKey: ['kurikulum-struktur-summary', activeYear?.id, selectedJurusanId],
    queryFn:  () => kurikulumApi.getStruktur({
      tahun_pelajaran_id: activeYear?.id,
      jurusan_id: isSmkOrMak ? (selectedJurusanId || undefined) : undefined,
    }),
    enabled: !!activeYear,
  });

  // Init selected grade
  React.useEffect(() => {
    if ((tingkatList ?? []).length > 0 && selectedTingkat === null) {
      setSelectedTingkat(tingkatList[0]);
    }
  }, [tingkatList, selectedTingkat]);

  // ── Derived stats ─────────────────────────────────────────────────────────
  const rawData = useMemo<StrukturItem[]>(
    () => (mapping?.data ?? []) as StrukturItem[],
    [mapping],
  );

  const statsByGrade = useMemo<Record<number, GradeStats>>(() => {
    const stats: Record<number, GradeStats> = {};
    rawData.forEach(item => {
      if (!stats[item.tingkat]) stats[item.tingkat] = { count: 0, totalJp: 0 };
      stats[item.tingkat].count++;
      stats[item.tingkat].totalJp += item.jp_per_minggu ?? 0;
    });
    return stats;
  }, [rawData]);

  const jurusanList = useMemo<Jurusan[]>(
    () => (jurusans?.data ?? []) as Jurusan[],
    [jurusans],
  );

  const activeCardTheme = useMemo(() => {
    if (!isSmkOrMak || jurusanList.length === 0) return INDIGO_THEME;
    const j = jurusanList.find(item => item.id === selectedJurusanId);
    return j ? resolveMajorTheme(j) : INDIGO_THEME;
  }, [isSmkOrMak, jurusanList, selectedJurusanId]);

  const dynamicStyles = useMemo(
    () => buildDynamicStyles(jurusanList),
    [jurusanList],
  );

  const filteredData = useMemo<StrukturItem[]>(() => {
    if (!mapping?.data || selectedTingkat === null) return [];
    return rawData.filter(item => {
      if (item.tingkat !== selectedTingkat) return false;
      const matchesSearch = !searchTerm
        || item.Mapel?.nama_mapel?.toLowerCase().includes(searchTerm.toLowerCase())
        || item.Mapel?.kode_mapel?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesKelompok = selectedKelompok === 'ALL'
        || normalizeKelompok(item.kelompok) === selectedKelompok;
      return matchesSearch && matchesKelompok;
    });
  }, [rawData, selectedTingkat, searchTerm, selectedKelompok, mapping]);

  const selectedGradeStats = useMemo(() => {
    const def = { totalJp: 0, mapelCount: 0, byKelompok: {} as Record<string, { jp: number; count: number }> };
    if (!mapping?.data || selectedTingkat === null) return def;
    return rawData
      .filter(item => item.tingkat === selectedTingkat)
      .reduce((acc, curr) => {
        acc.totalJp += curr.jp_per_minggu ?? 0;
        acc.mapelCount++;
        const kel = normalizeKelompok(curr.kelompok);
        if (!acc.byKelompok[kel]) acc.byKelompok[kel] = { jp: 0, count: 0 };
        acc.byKelompok[kel].jp    += curr.jp_per_minggu ?? 0;
        acc.byKelompok[kel].count++;
        return acc;
      }, { totalJp: 0, mapelCount: 0, byKelompok: {} as Record<string, { jp: number; count: number }> });
  }, [rawData, selectedTingkat, mapping]);

  // Validate filter on change
  React.useEffect(() => {
    const v = filterSchema.safeParse({ searchTerm, selectedKelompok });
    if (!v.success) console.warn('Filter tidak valid:', v.error.message);
  }, [searchTerm, selectedKelompok]);

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleManagePlotting = useCallback(() => {
    const params = new URLSearchParams();
    if (selectedTingkat !== null)    params.set('tingkat', String(selectedTingkat));
    if (isSmkOrMak && selectedJurusanId) params.set('jurusan_id', selectedJurusanId);
    navigate(`/kurikulum/plotting?${params.toString()}`);
  }, [navigate, selectedTingkat, isSmkOrMak, selectedJurusanId]);

  const handleCetak = useCallback(async () => {
    if (!mapping?.data) return;
    // Pilar 2 – safe find with typed array (no more `as any`)
    const selectedJurusan = isSmkOrMak
      ? jurusanList.find(j => j.id === selectedJurusanId)
      : undefined;
    await performStrukturPrint({
      tenantInfo,
      selectedTingkat:    selectedTingkat ?? 10,
      selectedTahunNama:  activeYear?.tahun ?? '',
      selectedJurusan,
      mappingData:        rawData,
      setIsPrinting,
    });
  }, [mapping, tenantInfo, selectedTingkat, activeYear, jurusanList, selectedJurusanId, isSmkOrMak, rawData]);

  const selectOptions = useMemo(() => [
    { label: 'SEMUA KELOMPOK', value: 'ALL' },
    ...(kelompokOptions ?? []).map(opt => ({ label: opt.label.toUpperCase(), value: opt.value })),
  ], [kelompokOptions]);

  const breadcrumbs = useMemo(() => [
    { label: 'Akademik',           path: '/academic' },
    { label: 'Kurikulum',          path: '/kurikulum' },
    { label: 'Struktur Kurikulum' },
  ], []);

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <AcademicPageLayout
      title="Struktur Kurikulum"
      description="Overview pembagian beban belajar dan kurikulum operasional."
      breadcrumbs={breadcrumbs}
      hardeningModuleKey="strukturkurikulumpage"
      instruction={{
        title: 'Panduan Struktur Kurikulum',
        description: 'Halaman ini menampilkan alokasi jam pelajaran (JP) per tingkat kelas berdasarkan tahun pelajaran aktif.',
        items: [
          { text: 'Pilih tingkat kelas pada kartu di atas untuk memfilter daftar mata pelajaran di bawah.' },
          { text: 'Pastikan total JP per minggu di setiap tingkat telah sesuai dengan standar Kurikulum Merdeka.' },
          { text: 'Klik "KELOLA PLOTTING JP" untuk menambah atau mengubah pembagian jam pelajaran.' },
        ],
      }}
    >
      {dynamicStyles && <style>{dynamicStyles}</style>}

      <div className="space-y-6 animate-in fade-in duration-500 pb-10">

        {/* ── Header toolbar ──────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3.5">
            <span className={cn(
              'text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-md',
              isSmkOrMak ? activeCardTheme.text : 'text-indigo-500',
              isSmkOrMak ? activeCardTheme.bg   : 'bg-indigo-50 dark:bg-indigo-950/40',
            )}>
              Tahun Pelajaran: {activeYear ? activeYear.tahun : 'Memuat...'}
            </span>

            {/* Jurusan selector – Pilar 1: optional chaining on jurusanList?.map */}
            {isSmkOrMak && jurusanList.length > 0 && (
              <div className="flex flex-wrap gap-1.5 p-1 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800">
                {jurusanList?.map(j => {
                  const isSelected = selectedJurusanId === j.id;
                  const label = j.singkatan || j.kode || j.nama;
                  const theme = resolveMajorTheme(j);
                  return (
                    <button
                      key={j.id}
                      onClick={() => setSelectedJurusanId(j.id)}
                      className={cn(
                        'px-3 py-1.5 text-[11px] font-black rounded-xl transition-all select-none border border-transparent cursor-pointer',
                        isSelected ? theme.activeTab : theme.inactiveTab,
                      )}
                      title={j.nama}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {can('academic.manage.academic') && (
            <div className="flex items-center gap-2 self-end sm:self-auto">
              <Button
                onClick={() => setIsCloneModalOpen(true)}
                variant="outline"
                className="rounded-2xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 font-black shadow-sm"
              >
                <Copy className="w-4 h-4 mr-2 text-indigo-600 dark:text-indigo-400" />
                SALIN STRUKTUR
              </Button>

              <Button
                onClick={handleManagePlotting}
                className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl shadow-lg shadow-indigo-200 dark:shadow-none font-black"
              >
                <Settings className="w-4 h-4 mr-2" />
                KELOLA PLOTTING JP
              </Button>
            </div>
          )}
        </div>

        {!activeYear && !isLoading && (
          <div className="p-4 bg-amber-50 dark:bg-amber-900/20 text-amber-600 rounded-2xl border border-amber-200 dark:border-amber-800 text-sm font-bold flex items-center">
            <span className="mr-2">⚠️</span>
            Tahun Pelajaran Aktif tidak ditemukan. Harap aktifkan Tahun Pelajaran di menu Akademik.
          </div>
        )}

        {/* ── Grade cards ─────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {(tingkatList ?? [])?.map(grade => {
            const s        = statsByGrade[grade] ?? { count: 0, totalJp: 0 };
            const isActive = selectedTingkat === grade;
            return (
              <Card
                key={grade}
                onClick={() => setSelectedTingkat(grade)}
                className={cn(
                  'p-6 border transition-all cursor-pointer relative overflow-hidden group select-none rounded-2xl',
                  isActive ? activeCardTheme.solidBg : activeCardTheme.softBg,
                )}
              >
                <div className={cn('absolute top-0 right-0 w-24 h-24 -mr-12 -mt-12 rounded-full group-hover:scale-110 transition-transform', isActive ? 'bg-white/10' : activeCardTheme.bgDecorative)} />
                <div className="relative z-10 space-y-4">
                  <div className="flex items-center justify-between">
                    <Badge variant={isActive ? 'default' : 'outline'} className={cn('text-[10px] font-black tracking-widest uppercase px-2 py-0.5 rounded-lg border', isActive ? activeCardTheme.badgeActive : activeCardTheme.badgeInactive)}>
                      TINGKAT {grade}
                    </Badge>
                    <Target className={cn('w-5 h-5 transition-colors', isActive ? activeCardTheme.iconActive : activeCardTheme.iconInactive)} />
                  </div>
                  <div>
                    {isLoading
                      ? <Skeleton className="h-10 w-20" />
                      : <p className={cn('text-4xl font-black leading-none', isActive ? activeCardTheme.cardTextActive : activeCardTheme.cardTextInactive)}>{s.totalJp}</p>
                    }
                    <p className={cn('text-[9px] font-bold uppercase tracking-widest mt-2', isActive ? activeCardTheme.cardSubtextActive : activeCardTheme.cardSubtextInactive)}>Total Jam / Minggu</p>
                  </div>
                  <div className={cn('flex items-center justify-between pt-4 border-t transition-colors', isActive ? activeCardTheme.cardDividerActive : activeCardTheme.cardDividerInactive)}>
                    <div className={cn('flex items-center text-[10px] font-bold uppercase tracking-wider', isActive ? activeCardTheme.cardTextActive : activeCardTheme.cardTextInactive)}>
                      <BookOpen size={12} className="mr-1.5" />
                      {s.count} Mata Pelajaran
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>

        {/* ── Main content panel ───────────────────────────────────────── */}
        {selectedTingkat !== null && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">

            {/* Table panel */}
            <div className="lg:col-span-8 flex">
              <Card id="print-area-kurikulum" className={cn('p-6 rounded-2xl border shadow-sm flex flex-col justify-between w-full transition-colors duration-500', activeCardTheme.cardBg, activeCardTheme.borderDividerBase)}>
                <div className="space-y-4">
                  <div className={cn('flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b', activeCardTheme.borderDividerBase)}>
                    <div>
                      <h3 className="font-black text-slate-800 dark:text-white uppercase tracking-tight flex items-center text-sm">
                        <BookOpen size={16} className="mr-2 text-indigo-600" />
                        Daftar Mapel - Tingkat {selectedTingkat}
                      </h3>
                      <p className="text-[10px] text-gray-400 font-bold uppercase mt-1">
                        Menampilkan {filteredData.length} dari {selectedGradeStats.mapelCount} mata pelajaran
                      </p>
                    </div>

                    <div className="flex items-center gap-3 no-print">
                      <Button
                        type="button"
                        onClick={handleCetak}
                        disabled={isPrinting || !mapping?.data}
                        className="h-9 px-3.5 text-[10px] font-black rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all flex items-center gap-1.5 cursor-pointer shadow-sm uppercase tracking-wider disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isPrinting
                          ? <><Loader2 size={13} className="animate-spin text-slate-400" /> Menyiapkan...</>
                          : <><Printer size={13} className="text-slate-500" /> Cetak</>
                        }
                      </Button>

                      <div className="relative">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                          placeholder="Cari mapel..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          aria-label="Cari mata pelajaran"
                          className="w-48 h-9 pl-9 pr-3 text-xs rounded-2xl border border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-slate-900 font-bold focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all outline-none"
                        />
                      </div>

                      <Suspense fallback={<div className="h-9 w-40 bg-slate-50 dark:bg-slate-900 rounded-2xl animate-pulse" />}>
                        <SearchableSelect
                          id="kelompok-select"
                          value={selectedKelompok}
                          onValueChange={setSelectedKelompok}
                          options={selectOptions}
                          placeholder="Semua Kelompok"
                        />
                      </Suspense>
                    </div>
                  </div>

                  {/* Mapel table */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead className="bg-slate-50/50 dark:bg-slate-900/50 text-gray-400 text-[9px] font-black uppercase tracking-widest border-b border-slate-100 dark:border-slate-800">
                        <tr>
                          <th className="px-4 py-3">Kelompok</th>
                          <th className="px-4 py-3">Mata Pelajaran</th>
                          <th className="px-4 py-3 text-center">Beban Belajar</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50 dark:divide-slate-900">
                        {isLoading ? (
                          [1, 2, 3, 4]?.map(i => (
                            <tr key={i}>
                              <td className="px-4 py-3" colSpan={3}><Skeleton className="h-10 w-full rounded-2xl" /></td>
                            </tr>
                          ))
                        ) : filteredData.length === 0 ? (
                          <tr>
                            <td className="px-4 py-16 text-center text-xs font-bold text-gray-400 italic" colSpan={3}>
                              Tidak ada mata pelajaran yang cocok dengan filter.
                            </td>
                          </tr>
                        ) : (
                          filteredData?.map(item => (
                            <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition-colors">
                              <td className="px-4 py-3">
                                <Badge className={cn(
                                  'font-bold border-none px-2 py-0.5 rounded text-[9px] uppercase',
                                  item.kelompok?.includes('KEJURUAN') ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400' :
                                  item.kelompok?.includes('PILIHAN')  ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/20 dark:text-amber-400' :
                                  item.kelompok?.includes('LOKAL')    ? 'bg-sky-50 text-sky-700 dark:bg-sky-950/20 dark:text-sky-400' :
                                  'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/20 dark:text-indigo-400',
                                )}>
                                  {item.kelompok?.includes('KEJURUAN') ? 'MAPEL KEJURUAN' :
                                   item.kelompok?.includes('PILIHAN')  ? 'MAPEL PILIHAN'  :
                                   item.kelompok?.includes('LOKAL')    ? 'MUATAN LOKAL'   : 'MAPEL UMUM'}
                                </Badge>
                              </td>
                              <td className="px-4 py-3">
                                <p className="text-xs font-bold text-slate-800 dark:text-slate-200">{item.Mapel?.nama_mapel}</p>
                                <p className="text-[9px] font-mono text-gray-400 mt-0.5">{item.Mapel?.kode_mapel}</p>
                              </td>
                              <td className="px-4 py-3 text-center">
                                <span className="text-sm font-black text-indigo-600 dark:text-indigo-400">{item.jp_per_minggu}</span>
                                <span className="text-[9px] font-bold text-gray-400 ml-1">JP / Minggu</span>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-50 dark:border-slate-900 text-right">
                  <span className="text-[10px] text-gray-400 font-bold uppercase">* JP: Jam Pelajaran (1 JP bernilai 45 menit)</span>
                </div>
              </Card>
            </div>

            {/* Sidebar panels */}
            <div className="lg:col-span-4 flex flex-col gap-6">

              {/* Metrik panel */}
              <Card className={cn('p-6 rounded-2xl border space-y-6 shadow-sm transition-colors duration-500', activeCardTheme.cardBg, activeCardTheme.borderDividerBase)}>
                <div className="space-y-1">
                  <h3 className="font-black text-slate-800 dark:text-white uppercase tracking-tight text-xs flex items-center">
                    <BarChart3 size={15} className="mr-2 text-indigo-600" />
                    Metrik Beban Tingkat {selectedTingkat}
                  </h3>
                  <p className="text-[9px] text-gray-400 font-bold uppercase">Analisis alokasi jam</p>
                </div>

                <div className="p-4 rounded-2xl border border-slate-50 dark:border-slate-900 bg-slate-50/50 dark:bg-slate-900/30 flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-2xl font-black text-slate-800 dark:text-white">{selectedGradeStats.totalJp} JP</p>
                    <p className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">Total Beban Kelas</p>
                  </div>
                  <div className={cn(
                    'text-[10px] font-black uppercase px-2.5 py-1 rounded-lg',
                    selectedGradeStats.totalJp >= 40 && selectedGradeStats.totalJp <= 48
                      ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20'
                      : 'bg-amber-50 text-amber-700 dark:bg-amber-950/20',
                  )}>
                    {selectedGradeStats.totalJp >= 40 && selectedGradeStats.totalJp <= 48 ? 'IDEAL' : 'KHUSUS'}
                  </div>
                </div>

                <div className="space-y-4">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Kontribusi Kelompok</p>
                  {(kelompokOptions ?? [])?.map(opt => {
                    const dataKel   = selectedGradeStats.byKelompok[opt.value] ?? { jp: 0, count: 0 };
                    const percentage = selectedGradeStats.totalJp > 0
                      ? Math.round((dataKel.jp / selectedGradeStats.totalJp) * 100)
                      : 0;
                    return (
                      <div key={opt.value} className="space-y-1">
                        <div className="flex justify-between text-[10px] font-bold">
                          <span className="text-gray-500 uppercase">{opt.label}</span>
                          <span className="text-slate-800 dark:text-white">{dataKel.jp} JP ({percentage}%)</span>
                        </div>
                        <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-900 overflow-hidden">
                          <div
                            className={cn(
                              'h-full rounded-full transition-all duration-500',
                              opt.value.includes('KEJURUAN') || opt.value.includes('PRODUCTIVE') ? 'bg-emerald-500' :
                              opt.value.includes('PILIHAN')  || opt.value.includes('PEMINATAN')  ? 'bg-amber-500' :
                              opt.value.includes('LOKAL')    || opt.value.includes('LOCAL')      ? 'bg-sky-500' :
                              'bg-indigo-500',
                            )}
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Card>

              {/* CTA card */}
              <Card className="p-6 rounded-2xl border-none shadow-sm bg-slate-900 dark:bg-slate-950 text-white relative overflow-hidden flex-1 flex flex-col justify-between">
                <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 blur-3xl -mr-16 -mt-16" />
                <div className="relative z-10 space-y-4">
                  <div className="p-3 bg-white/10 rounded-2xl w-fit">
                    <Layers size={20} className="text-indigo-400" />
                  </div>
                  <h4 className="text-base font-black uppercase tracking-tight">Otomasi Slot Jadwal</h4>
                  <p className="text-xs text-white/60 leading-relaxed font-medium">
                    Apabila struktur kurikulum (JP) tingkat ini telah terdefinisi secara lengkap, slot waktu mingguan untuk guru pengampu akan terbuat secara otomatis pada modul Jadwal KBM.
                  </p>
                </div>
                <Button
                  onClick={handleManagePlotting}
                  className="mt-6 w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-2xl border-none h-11 text-xs"
                >
                  PLOT STRUKTUR SEKARANG
                  <ChevronRight size={16} className="ml-1.5" />
                </Button>
              </Card>
            </div>
          </div>
        )}
      </div>

      <Suspense fallback={null}>
        {isCloneModalOpen && (
          <CloneStrukturModal
            isOpen={isCloneModalOpen}
            onClose={() => setIsCloneModalOpen(false)}
            years={years?.data || []}
            currentTargetTahunId={activeYear?.id}
          />
        )}
      </Suspense>
    </AcademicPageLayout>
  );
};

export default StrukturKurikulumPage;
