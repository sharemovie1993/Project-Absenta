import React, { useState, useEffect, useMemo, useCallback, lazy, Suspense } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Layers, Target, BarChart3, ChevronRight,
  BookOpen, Settings, Search, Printer, Loader2, Copy,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { kurikulumApi } from '@/api/kurikulum.api';
import { tahunPelajaranApi, jurusanApi } from '@/api/academic.api';
import { useNavigate } from 'react-router-dom';
import { AcademicPageLayout } from '@/components/academic/AcademicPageLayout';
import { useJenjang } from '@/hooks/useJenjang';
import { cn } from '@/lib/utils';
import { z } from 'zod';
import { performStrukturPrint } from '@/utils/kurikulum/masterStrukturHelper';
import { useCapabilities } from '@/hooks/useCapabilities';
import { getTenantById } from '@/api/tenants.api';

// Theme helpers
import {
  INDIGO_THEME,
  resolveMajorTheme,
} from '@/components/kurikulum/strukturKurikulum.theme';
import type { Jurusan } from '@/components/kurikulum/strukturKurikulum.theme';

// Lazy-loaded heavy UI
const CloneStrukturModal = lazy(() => import('@/components/kurikulum/CloneStrukturModal'));
const SearchableSelect = lazy(() =>
  import('@/components/ui/SearchableSelect').then(m => ({ default: m.SearchableSelect }))
);

const hardeningModuleKey = 'kurikulum_struktur_page';

interface StrukturItem {
  id: string;
  tingkat: number;
  jp_per_minggu: number;
  kelompok?: string;
  Mapel?: { nama_mapel: string; kode_mapel: string };
  [key: string]: unknown;
}

interface GradeStats { count: number; totalJp: number }

function normalizeKelompok(raw: string | undefined): string {
  const k = raw ?? 'MATA PELAJARAN UMUM';
  if (k === 'NASIONAL' || k === 'UMUM') return 'MATA PELAJARAN UMUM';
  if (k === 'KEJURUAN') return 'MATA PELAJARAN KEJURUAN';
  if (k === 'PILIHAN') return 'MATA PELAJARAN PILIHAN';
  if (k === 'LOKAL' || k === 'MUATAN_LOKAL') return 'MUATAN LOKAL';
  return k;
}

export interface UniversalStrukturKurikulumViewProps {
  hideLayout?: boolean;
  isModal?: boolean;
  readOnly?: boolean;
  propJurusanId?: string;
  propTahunPelajaranId?: string;
  onClose?: () => void;
}

export const StrukturKurikulumView: React.FC<UniversalStrukturKurikulumViewProps> = React.memo(({
  hideLayout = false,
  isModal = false,
  readOnly = false,
  propJurusanId,
  propTahunPelajaranId,
  onClose,
}) => {
  const navigate = useNavigate();
  const { user, can, isKurikulum, isAdmin } = useCapabilities();
  const { tingkatList, kelompokOptions, jenjang } = useJenjang();

  const [selectedTingkat, setSelectedTingkat] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedKelompok, setSelectedKelompok] = useState<string>('ALL');
  const [selectedJurusanId, setSelectedJurusanId] = useState<string>(propJurusanId || '');
  const [isPrinting, setIsPrinting] = useState(false);
  const [isCloneModalOpen, setIsCloneModalOpen] = useState(false);

  useEffect(() => {
    if (propJurusanId) {
      setSelectedJurusanId(propJurusanId);
    }
  }, [propJurusanId]);

  const isSmkOrMak = useMemo(() => {
    const j = (jenjang || '').toUpperCase();
    return j === 'SMK' || j === 'MAK';
  }, [jenjang]);

  // ── Remote data ──────────────────────────────────────────────────────────
  const { data: years } = useQuery({
    queryKey: ['academic-years'],
    queryFn: () => tahunPelajaranApi.getAll(),
  });

  const { data: jurusans } = useQuery({
    queryKey: ['academic-jurusans'],
    queryFn: () => jurusanApi.getAll(),
    enabled: isSmkOrMak,
  });

  const { data: tenantRes } = useQuery({
    queryKey: ['tenant-profile', user?.tenant_id],
    queryFn: () => getTenantById(user?.tenant_id ?? ''),
    enabled: !!user?.tenant_id,
  });
  const tenantInfo = tenantRes?.data;

  // Set default jurusan
  useEffect(() => {
    const list: Jurusan[] = jurusans?.data ?? [];
    if (isSmkOrMak && list.length > 0 && !selectedJurusanId) {
      setSelectedJurusanId(list[0].id);
    }
  }, [isSmkOrMak, jurusans, selectedJurusanId]);

  const activeYear = useMemo(() => {
    if (propTahunPelajaranId) {
      return (years?.data ?? []).find(y => y.id === propTahunPelajaranId);
    }
    return (years?.data ?? []).find(y => y.is_active);
  }, [years, propTahunPelajaranId]);

  const { data: mapping, isLoading } = useQuery({
    queryKey: ['kurikulum-struktur-summary', activeYear?.id, selectedJurusanId],
    queryFn: () => kurikulumApi.getStruktur({
      tahun_pelajaran_id: activeYear?.id,
      jurusan_id: isSmkOrMak ? (selectedJurusanId || undefined) : undefined,
    }),
    enabled: !!activeYear,
  });

  // Init selected grade
  useEffect(() => {
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

  const selectedJurusan = useMemo<Jurusan | undefined>(() => {
    if (!isSmkOrMak) return undefined;
    return jurusanList.find(j => j.id === selectedJurusanId);
  }, [isSmkOrMak, jurusanList, selectedJurusanId]);

  const activeTheme = useMemo(() => {
    if (!isSmkOrMak) return INDIGO_THEME;
    return resolveMajorTheme(selectedJurusan?.nama ?? '');
  }, [isSmkOrMak, selectedJurusan]);

  const selectedGradeStats = useMemo(() => {
    if (selectedTingkat === null) return { totalJp: 0, count: 0, byKelompok: {} };
    const items = rawData.filter(i => i.tingkat === selectedTingkat);
    const byKelompok: Record<string, { jp: number; count: number }> = {};
    items.forEach(i => {
      const k = normalizeKelompok(i.kelompok);
      if (!byKelompok[k]) byKelompok[k] = { jp: 0, count: 0 };
      byKelompok[k].jp += i.jp_per_minggu ?? 0;
      byKelompok[k].count++;
    });
    return {
      totalJp: items.reduce((acc, curr) => acc + (curr.jp_per_minggu ?? 0), 0),
      count: items.length,
      byKelompok,
    };
  }, [rawData, selectedTingkat]);

  const filteredItems = useMemo<StrukturItem[]>(() => {
    if (selectedTingkat === null) return [];
    return rawData
      .filter(i => i.tingkat === selectedTingkat)
      .filter(i => {
        if (!searchTerm) return true;
        const q = searchTerm.toLowerCase();
        return (
          (i.Mapel?.nama_mapel?.toLowerCase().includes(q) ?? false) ||
          (i.Mapel?.kode_mapel?.toLowerCase().includes(q) ?? false)
        );
      })
      .filter(i => {
        if (selectedKelompok === 'ALL') return true;
        return normalizeKelompok(i.kelompok) === selectedKelompok;
      });
  }, [rawData, selectedTingkat, searchTerm, selectedKelompok]);

  const canManage = !readOnly && (isAdmin || isKurikulum || can('academic.curriculum.manage'));

  const handlePrint = useCallback(async () => {
    setIsPrinting(true);
    try {
      await performStrukturPrint(
        rawData,
        selectedJurusan?.nama ?? '',
        tenantInfo,
        activeYear?.tahun ?? 'Tahun Pelajaran Terpilih',
      );
    } finally {
      setIsPrinting(false);
    }
  }, [rawData, selectedJurusan, tenantInfo, activeYear]);

  const handleManagePlotting = useCallback(() => {
    navigate('/kurikulum/guru-mapel');
  }, [navigate]);

  const content = (
    <div className="space-y-6 w-full min-w-0">
      {/* Action Bar saat di dalam Dashboard Tab atau Modal (hideLayout = true) */}
      {hideLayout && (
        <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-xs">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200/60 dark:border-indigo-800/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
              <Layers className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
                Struktur Kurikulum & Alokasi JP
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                Pemetaan alokasi jam pelajaran per tingkat & kelompok mapel TP {activeYear?.tahun ?? 'Aktif'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrint}
              disabled={isPrinting}
              className="flex items-center gap-1.5 rounded-xl text-xs px-3"
            >
              {isPrinting ? <Loader2 size={13} className="animate-spin" /> : <Printer size={13} />}
              <span>Cetak Struktur</span>
            </Button>
            {canManage && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsCloneModalOpen(true)}
                className="flex items-center gap-1.5 rounded-xl text-xs px-3"
              >
                <Copy size={13} />
                <span>Salin TP Lain</span>
              </Button>
            )}
            {canManage && (
              <Button
                variant="primary"
                size="sm"
                onClick={() => navigate('/kurikulum/master-struktur')}
                className="flex items-center gap-1.5 rounded-xl text-xs px-3"
              >
                <Settings size={13} />
                <span>Master Struktur</span>
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Selector Jurusan & Tingkat Tabs */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {isSmkOrMak && !propJurusanId && (
          <div className="w-full md:w-80">
            <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-1.5">
              Program Keahlian / Jurusan
            </label>
            <Suspense fallback={<Skeleton className="h-10 w-full rounded-xl" />}>
              <SearchableSelect
                value={selectedJurusanId}
                onValueChange={(val) => setSelectedJurusanId(val)}
                options={jurusanList.map((j) => ({
                  value: j.id,
                  label: `${j.kode_jurusan ? `[${j.kode_jurusan}] ` : ''}${j.nama}`,
                }))}
                placeholder="Pilih Konsentrasi Keahlian..."
                className="rounded-xl"
              />
            </Suspense>
          </div>
        )}

        {/* Tingkat Tabs Pill */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {(tingkatList ?? []).map((t) => {
            const st = statsByGrade[t] ?? { count: 0, totalJp: 0 };
            const isActive = selectedTingkat === t;
            return (
              <button
                key={t}
                type="button"
                onClick={() => setSelectedTingkat(t)}
                className={cn(
                  'flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer',
                  isActive
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-indigo-300'
                )}
              >
                <span>Tingkat {t}</span>
                <span className={cn(
                  'px-1.5 py-0.2 rounded-md text-[10px] font-black',
                  isActive ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                )}>
                  {st.totalJp} JP
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {isLoading ? (
        <div className="p-12 text-center text-slate-400">
          <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-500" />
          <p className="text-xs">Memuat struktur kurikulum...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Main Table Column */}
          <div className="lg:col-span-8 space-y-4">
            <Card className="p-4 sm:p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                <div className="relative flex-1">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Cari mata pelajaran atau kode..."
                    className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
                  <button
                    type="button"
                    onClick={() => setSelectedKelompok('ALL')}
                    className={cn(
                      'px-2.5 py-1 rounded-lg text-[10px] font-bold shrink-0 transition-colors',
                      selectedKelompok === 'ALL'
                        ? 'bg-slate-800 text-white dark:bg-slate-200 dark:text-slate-900'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                    )}
                  >
                    Semua ({selectedGradeStats.count})
                  </button>
                  {(kelompokOptions ?? []).map((k) => (
                    <button
                      key={k.value}
                      type="button"
                      onClick={() => setSelectedKelompok(k.value)}
                      className={cn(
                        'px-2.5 py-1 rounded-lg text-[10px] font-bold shrink-0 transition-colors',
                        selectedKelompok === k.value
                          ? 'bg-indigo-600 text-white'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                      )}
                    >
                      {k.label} ({selectedGradeStats.byKelompok[k.value]?.count || 0})
                    </button>
                  ))}
                </div>
              </div>

              {/* Table */}
              <div className="border border-slate-100 dark:border-slate-800/80 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-900/60 border-b border-slate-100 dark:border-slate-800 text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
                      <th className="p-2.5 w-10 text-center">No</th>
                      <th className="p-2.5">Kelompok</th>
                      <th className="p-2.5">Mata Pelajaran</th>
                      <th className="p-2.5 text-center w-28">Alokasi JP</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
                    {filteredItems.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="p-8 text-center text-xs text-slate-400">
                          Tidak ada mata pelajaran yang sesuai filter
                        </td>
                      </tr>
                    ) : (
                      filteredItems.map((item, idx) => (
                        <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                          <td className="p-2.5 text-center text-slate-400 text-[11px]">{idx + 1}</td>
                          <td className="p-2.5">
                            <span className="text-[10px] font-bold text-slate-600 dark:text-slate-300">
                              {normalizeKelompok(item.kelompok)}
                            </span>
                          </td>
                          <td className="p-2.5">
                            <p className="font-bold text-slate-800 dark:text-slate-100">{item.Mapel?.nama_mapel}</p>
                            <p className="text-[10px] text-slate-400 font-mono">{item.Mapel?.kode_mapel}</p>
                          </td>
                          <td className="p-2.5 text-center">
                            <span className="text-sm font-black text-indigo-600 dark:text-indigo-400">
                              {item.jp_per_minggu}
                            </span>
                            <span className="text-[10px] text-slate-400 font-medium ml-1">JP/Minggu</span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>

          {/* Sidebar Stats Column */}
          <div className="lg:col-span-4 space-y-4">
            <Card className="p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <BarChart3 size={14} className="text-indigo-600" />
                    Analisis Beban Tingkat {selectedTingkat}
                  </h3>
                  <p className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">Alokasi JP per minggu</p>
                </div>
                <div className={cn(
                  'text-[10px] font-black uppercase px-2 py-0.5 rounded-lg',
                  selectedGradeStats.totalJp >= 40 && selectedGradeStats.totalJp <= 48
                    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40'
                    : 'bg-amber-50 text-amber-700 dark:bg-amber-950/40'
                )}>
                  {selectedGradeStats.totalJp >= 40 && selectedGradeStats.totalJp <= 48 ? 'IDEAL' : 'KHUSUS'}
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <div>
                  <p className="text-2xl font-black text-slate-800 dark:text-white">
                    {selectedGradeStats.totalJp} <span className="text-xs font-bold text-slate-500">JP</span>
                  </p>
                  <p className="text-[10px] text-slate-400 font-bold uppercase">Total Beban Kelas</p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-black text-slate-700 dark:text-slate-200">{selectedGradeStats.count}</p>
                  <p className="text-[10px] text-slate-400 font-bold uppercase">Mata Pelajaran</p>
                </div>
              </div>

              {/* Progress per kelompok */}
              <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Kontribusi Kelompok</p>
                {(kelompokOptions ?? []).map((opt) => {
                  const dataKel = selectedGradeStats.byKelompok[opt.value] ?? { jp: 0, count: 0 };
                  const pct = selectedGradeStats.totalJp > 0
                    ? Math.round((dataKel.jp / selectedGradeStats.totalJp) * 100)
                    : 0;
                  return (
                    <div key={opt.value} className="space-y-1">
                      <div className="flex justify-between text-[11px] font-bold">
                        <span className="text-slate-600 dark:text-slate-400">{opt.label}</span>
                        <span className="text-slate-800 dark:text-white">{dataKel.jp} JP ({pct}%)</span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-indigo-500 transition-all duration-300"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>

            {/* Quick Action to Plotting */}
            <Card className="p-4 rounded-2xl bg-slate-900 dark:bg-slate-950 text-white space-y-3">
              <div className="flex items-center gap-2 text-indigo-400 text-xs font-bold">
                <Layers size={14} />
                <span>Langkah Selanjutnya</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed font-medium">
                Setelah struktur alokasi JP terdefinisi, lanjutkan ke pembagian guru pengampu pada modul Plotting Beban Mengajar.
              </p>
              <Button
                size="sm"
                onClick={handleManagePlotting}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold"
              >
                <span>Buka Plotting Beban Guru</span>
                <ChevronRight size={14} className="ml-1" />
              </Button>
            </Card>
          </div>
        </div>
      )}

      {/* Modal Clone Struktur */}
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
    </div>
  );

  if (hideLayout) {
    return content;
  }

  return (
    <AcademicPageLayout
      hardeningModuleKey={hardeningModuleKey}
      title="Struktur Kurikulum"
      description="Kelola kurikulum, tingkat kelas, konsentrasi keahlian, dan pemetaan mata pelajaran."
      breadcrumbs={[
        { label: 'Kurikulum', path: '/kurikulum/jam-kbm' },
        { label: 'Struktur Kurikulum' }
      ]}
      instruction={{
        title: 'Panduan Struktur Kurikulum',
        description: 'Tentukan struktur kurikulum dan alokasi jam pelajaran mingguan untuk setiap tingkat dan konsentrasi keahlian.',
        items: [
          { text: 'Pilih konsentrasi keahlian (SMK) dan tingkat kelas yang ingin dikonfigurasi.' },
          { text: 'Alokasi jam pelajaran (JP) mingguan ideal berkisar antara 40–48 JP per tingkat.' },
          { text: 'Gunakan tombol Salin Struktur untuk menduplikasi kurikulum dari tahun pelajaran sebelumnya.' },
          { text: 'Cetak struktur kurikulum resmi untuk lampiran dokumen KOSP.' }
        ]
      }}
      toolbar={
        <div className="flex items-center gap-2">
          <Button
            variant="toolbarOutline"
            size="toolbar"
            onClick={handlePrint}
            disabled={isPrinting}
            className="flex items-center gap-1.5"
          >
            {isPrinting ? <Loader2 size={13} className="animate-spin" /> : <Printer size={13} />}
            Cetak
          </Button>
          {canManage && (
            <>
              <Button
                variant="toolbarOutline"
                size="toolbar"
                onClick={() => setIsCloneModalOpen(true)}
                className="flex items-center gap-1.5"
              >
                <Copy size={13} />
                Salin Struktur
              </Button>
              <Button
                variant="toolbarPrimary"
                size="toolbar"
                onClick={() => navigate('/kurikulum/master-struktur')}
                className="flex items-center gap-1.5"
              >
                <Settings size={13} />
                Master Struktur
              </Button>
            </>
          )}
        </div>
      }
    >
      {content}
    </AcademicPageLayout>
  );
});

StrukturKurikulumView.displayName = 'StrukturKurikulumView';
