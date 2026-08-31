import React, { useState, useMemo, useCallback, lazy, Suspense } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  BarChart2,
  User,
  CheckCircle,
  Clock,
  TrendingUp,
  Search,
  BookOpen,
  AlertTriangle,
  Grid,
  List,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Award,
  Layers,
  GraduationCap,
  Sparkles,
  ChevronRight
} from 'lucide-react';
import { AcademicPageLayout } from '../../components/academic/AcademicPageLayout';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { kurikulumApi } from '../../api/kurikulum.api';
import { useTahunPelajaranOptions } from '../../hooks/useTahunPelajaranOptions';
import { useSemesterOptions } from '../../hooks/useSemesterOptions';
import { useGuruOptions } from '../../hooks/useGuruOptions';
import { useCapabilities } from '../../hooks/useCapabilities';
import { useIsMobile } from '../../hooks/useIsMobile';
import { cn } from '../../lib/utils';
import { z } from 'zod';

const SearchableSelect = lazy(() => import('../../components/ui/SearchableSelect').then(m => ({ default: m.SearchableSelect })));

const hardeningModuleKey = 'rekap_kbm_page';

interface DetailKelas {
  kelas: string;
  mapel: string;
  jp_per_minggu: number;
}

interface RekapKBMRecord {
  guru_id: string;
  nama_guru: string;
  nip: string;
  total_jp_rencana: number;
  jp_dijadwalkan?: number;
  jp_terlaksana: number;
  jp_sisa: number;
  persentase: number;
  detail_kelas?: DetailKelas[];
}

interface RekapKBMMeta {
  total_guru: number;
  total_jp_rencana: number;
  total_jp_terlaksana: number;
}

interface RekapKBMResponse {
  data: RekapKBMRecord[];
  meta: RekapKBMMeta;
}

const ProgressBar = React.memo(function ProgressBar({ pct, color }: { pct: number; color: string }) {
  return (
    <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden flex">
      <div 
        style={{ width: `${Math.min(pct, 100)}%`, backgroundColor: color }} 
        className="h-full rounded-full transition-all duration-500" 
      />
    </div>
  );
});

function pctColor(pct: number) {
  if (pct >= 90) return '#10b981'; // Emerald
  if (pct >= 60) return '#f59e0b'; // Amber
  return '#ef4444'; // Red
}

function statusBadge(pct: number) {
  if (pct >= 90) return { label: 'KBM Baik', color: 'text-emerald-700 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800' };
  if (pct >= 60) return { label: 'Perlu Perhatian', color: 'text-amber-700 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800' };
  return { label: 'KBM Rendah', color: 'text-rose-700 dark:text-rose-400', bg: 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800' };
}

function getAvatarColor(name: string) {
  const hash = name.split('').reduce((acc, char) => char.charCodeAt(0) + ((acc << 5) - acc), 0);
  const colors = [
    { bg: 'bg-indigo-50 dark:bg-indigo-950/50', text: 'text-indigo-600 dark:text-indigo-400', border: 'border-indigo-200 dark:border-indigo-800' },
    { bg: 'bg-blue-50 dark:bg-blue-950/50', text: 'text-blue-600 dark:text-blue-400', border: 'border-blue-200 dark:border-blue-800' },
    { bg: 'bg-emerald-50 dark:bg-emerald-950/50', text: 'text-emerald-600 dark:text-emerald-400', border: 'border-emerald-200 dark:border-emerald-800' },
    { bg: 'bg-amber-50 dark:bg-amber-950/50', text: 'text-amber-600 dark:text-amber-400', border: 'border-amber-200 dark:border-amber-800' },
    { bg: 'bg-purple-50 dark:bg-purple-950/50', text: 'text-purple-600 dark:text-purple-400', border: 'border-purple-200 dark:border-purple-800' },
    { bg: 'bg-rose-50 dark:bg-rose-950/50', text: 'text-rose-600 dark:text-rose-400', border: 'border-rose-200 dark:border-rose-800' },
  ];
  return colors[Math.abs(hash) % colors.length];
}

function getInitials(name: string) {
  return name.split(' ')?.map(n => n[0]).slice(0, 2).join('').toUpperCase();
}

export default function RekapKBMPage() {
  const isMobile = useIsMobile();
  const { isKurikulum, isKaprog, isAdmin, can } = useCapabilities();

  const [tahunPelajaranId, setTahunPelajaranId] = useState<string>('');
  const [semesterId, setSemesterId] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'BAIK' | 'PERHATIAN' | 'RENDAH'>('ALL');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [expandedGuruIds, setExpandedGuruIds] = useState<Set<string>>(new Set());
  const [selectedGuruDetail, setSelectedGuruDetail] = useState<RekapKBMRecord | null>(null);

  const { options: tahunOptions, activeTahunPelajaran } = useTahunPelajaranOptions();
  const { options: semesterOptions, activeSemester } = useSemesterOptions({ tahunPelajaranId: tahunPelajaranId || activeTahunPelajaran?.id });

  React.useEffect(() => {
    if (activeTahunPelajaran?.id && !tahunPelajaranId) {
      setTahunPelajaranId(activeTahunPelajaran.id);
    }
  }, [activeTahunPelajaran, tahunPelajaranId]);

  React.useEffect(() => {
    if (activeSemester?.id && !semesterId) {
      setSemesterId(activeSemester.id);
    }
  }, [activeSemester, semesterId]);

  const { data: rekapData, isLoading, refetch } = useQuery({
    queryKey: ['rekap-kbm-guru', semesterId, tahunPelajaranId],
    queryFn: () => kurikulumApi.getRekapKBM({ 
      semester_id: semesterId || undefined, 
      tahun_pelajaran_id: tahunPelajaranId || undefined 
    }).catch(() => null),
    staleTime: 5 * 60 * 1000,
  });

  const guruDataList = useMemo(() => {
    return (rekapData as RekapKBMResponse | undefined)?.data ?? [];
  }, [rekapData]);

  const metaData = useMemo(() => {
    return (rekapData as RekapKBMResponse | undefined)?.meta;
  }, [rekapData]);

  const countStatus = useMemo(() => ({
    all: guruDataList.length,
    baik: guruDataList.filter((g: RekapKBMRecord) => g.persentase >= 90).length,
    perhatian: guruDataList.filter((g: RekapKBMRecord) => g.persentase >= 60 && g.persentase < 90).length,
    rendah: guruDataList.filter((g: RekapKBMRecord) => g.persentase < 60).length,
  }), [guruDataList]);

  const filtered = useMemo(() => {
    let list = guruDataList;

    // Filter status
    if (statusFilter === 'BAIK') {
      list = list.filter((g: RekapKBMRecord) => g.persentase >= 90);
    } else if (statusFilter === 'PERHATIAN') {
      list = list.filter((g: RekapKBMRecord) => g.persentase >= 60 && g.persentase < 90);
    } else if (statusFilter === 'RENDAH') {
      list = list.filter((g: RekapKBMRecord) => g.persentase < 60);
    }

    // Filter search
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      list = list.filter((g: RekapKBMRecord) => 
        (g.nama_guru && g.nama_guru.toLowerCase().includes(q)) ||
        (g.nip && g.nip.toLowerCase().includes(q)) ||
        (g.detail_kelas && g.detail_kelas.some(dk => 
          dk.kelas.toLowerCase().includes(q) || 
          dk.mapel.toLowerCase().includes(q)
        ))
      );
    }

    return list;
  }, [guruDataList, statusFilter, searchTerm]);

  const avgPct = useMemo(() => {
    if (guruDataList.length === 0) return 0;
    return Math.round(guruDataList.reduce((a: number, g: RekapKBMRecord) => a + (g.persentase ?? 0), 0) / guruDataList.length);
  }, [guruDataList]);

  const toggleExpand = useCallback((guruId: string) => {
    setExpandedGuruIds(prev => {
      const next = new Set(prev);
      if (next.has(guruId)) next.delete(guruId);
      else next.add(guruId);
      return next;
    });
  }, []);

  const headerStats = useMemo(() => [
    {
      title: "Guru Dipantau",
      value: metaData?.total_guru ?? guruDataList.length,
      icon: <User size={16} className="text-white" />,
      gradient: "from-blue-600 to-indigo-700",
      subtitle: "Tenaga pendidik aktif"
    },
    {
      title: "Total JP Rencana",
      value: `${metaData?.total_jp_rencana ?? 0} JP`,
      icon: <Clock size={16} className="text-white" />,
      gradient: "from-indigo-600 to-purple-700",
      subtitle: "Beban kurikulum semester"
    },
    {
      title: "Total JP Terlaksana",
      value: `${metaData?.total_jp_terlaksana ?? 0} JP`,
      icon: <CheckCircle size={16} className="text-white" />,
      gradient: "from-emerald-600 to-teal-700",
      subtitle: "Sesi absensi terverifikasi"
    },
    {
      title: "Rerata Kepatuhan",
      value: `${avgPct}%`,
      icon: <TrendingUp size={16} className="text-white" />,
      gradient: avgPct >= 80 ? "from-emerald-600 to-teal-800" : avgPct >= 60 ? "from-amber-600 to-orange-800" : "from-rose-600 to-red-800",
      subtitle: "Ketercapaian mengajar"
    }
  ], [metaData, guruDataList.length, avgPct]);

  return (
    <AcademicPageLayout
      hardeningModuleKey={hardeningModuleKey}
      title="Audit Realisasi JP Mengajar"
      description="Rekapitulasi ketercapaian jam mengajar (JP) guru per semester untuk audit kurikulum & tunjangan profesi."
      breadcrumbs={[
        { label: 'Kurikulum', path: '/kurikulum/dashboard' },
        { label: 'Audit Realisasi JP' }
      ]}
      instruction={{
        title: 'Panduan Audit Realisasi JP Mengajar',
        description: 'Halaman ini menyajikan audit akumulasi jam mengajar setiap guru (Beban Rencana vs Realisasi Sesi Absensi Sah) selama 1 semester.',
        items: [
          { text: 'JP Rencana diambil dari alokasi Struktur Kurikulum & Ploting Guru Mapel.' },
          { text: 'JP Terlaksana dihitung dari akumulasi sesi absensi KBM yang telah selesai (CLOSED).' },
          { text: 'Digunakan sebagai dokumen pendukung verifikasi audit jam mengajar (TPG/SKTP) & evaluasi kurikulum.' },
        ]
      }}
      stats={headerStats}
    >
      <div className="space-y-4 w-full min-w-0">
        {/* ─── Search & Filter Card (Unified Mobile Block) ──────────────── */}
        <div className="space-y-3 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              type="text"
              placeholder="Cari guru (Nama, NIP, Mapel, Kelas)..."
              aria-label="Cari guru"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 h-10 rounded-xl bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <Suspense fallback={null}>
              <SearchableSelect
                options={tahunOptions}
                value={tahunPelajaranId}
                onValueChange={v => { setTahunPelajaranId(v); setSemesterId(''); }}
                placeholder="Tahun Pelajaran"
                searchPlaceholder="Cari Tahun..."
                triggerClassName="h-9 text-xs rounded-xl bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800"
              />
            </Suspense>
            <Suspense fallback={null}>
              <SearchableSelect
                options={semesterOptions}
                value={semesterId}
                onValueChange={v => setSemesterId(v)}
                placeholder="Semester"
                searchPlaceholder="Cari Semester..."
                triggerClassName="h-9 text-xs rounded-xl bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800"
              />
            </Suspense>
          </div>

          {/* Status Filter Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar pt-1">
            {[
              { id: 'ALL', label: 'Semua Status', count: countStatus.all, activeCls: 'bg-indigo-600 text-white' },
              { id: 'BAIK', label: 'KBM Baik (≥90%)', count: countStatus.baik, activeCls: 'bg-emerald-600 text-white' },
              { id: 'PERHATIAN', label: 'Perlu Perhatian (60-89%)', count: countStatus.perhatian, activeCls: 'bg-amber-500 text-white' },
              { id: 'RENDAH', label: 'KBM Rendah (<60%)', count: countStatus.rendah, activeCls: 'bg-rose-600 text-white' },
            ].map(tab => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setStatusFilter(tab.id as any)}
                className={cn(
                  "px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer shrink-0 border",
                  statusFilter === tab.id
                    ? `${tab.activeCls} shadow-xs border-transparent`
                    : "bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100"
                )}
              >
                <span>{tab.label}</span>
                <span className={cn(
                  "text-[10px] px-1.5 py-0.2 rounded-full",
                  statusFilter === tab.id ? "bg-white/20 text-white" : "bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300"
                )}>
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          {/* Action Toolbar on Bottom of Filter Card */}
          <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
              Menampilkan {filtered.length} guru
            </span>

            <div className="flex items-center gap-1.5">
              {!isMobile && (
                <div className="flex bg-slate-100 dark:bg-slate-800 rounded-xl p-0.5 border border-slate-200/50 dark:border-slate-700/50">
                  <button
                    type="button"
                    onClick={() => setViewMode('grid')}
                    className={cn(
                      "p-1.5 rounded-lg text-xs transition-all",
                      viewMode === 'grid' ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-xs" : "text-slate-500"
                    )}
                    title="Mode Grid"
                  >
                    <Grid size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode('list')}
                    className={cn(
                      "p-1.5 rounded-lg text-xs transition-all",
                      viewMode === 'list' ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-xs" : "text-slate-500"
                    )}
                    title="Mode List"
                  >
                    <List size={14} />
                  </button>
                </div>
              )}

              <Button
                variant="toolbarGhost"
                size="toolbar"
                onClick={() => refetch()}
                disabled={isLoading}
                className="p-2"
                aria-label="Refresh data"
              >
                <RefreshCw size={14} className={isLoading ? "animate-spin" : ""} />
              </Button>
            </div>
          </div>
        </div>

        {/* ─── Main Guru List ────────────────────────────────────────── */}
        {isLoading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-3 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800">
            <RefreshCw className="w-8 h-8 text-indigo-500 animate-spin" />
            <p className="text-xs font-bold text-slate-500 dark:text-slate-400">Memuat data audit KBM...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs p-6">
            <BarChart2 className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
            <h4 className="font-extrabold text-sm text-slate-800 dark:text-slate-200">Tidak ada data rekap KBM ditemukan</h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
              Silakan sesuaikan kata kunci pencarian atau pastikan jadwal dan sesi absensi KBM semester ini sudah berjalan.
            </p>
          </div>
        ) : (
          <div className={cn(
            "grid gap-3",
            viewMode === 'grid' && !isMobile ? "grid-cols-1 md:grid-cols-2 xl:grid-cols-3" : "grid-cols-1"
          )}>
            {filtered?.map((guru: RekapKBMRecord) => {
              const st = statusBadge(guru.persentase);
              const color = pctColor(guru.persentase);
              const avatar = getAvatarColor(guru.nama_guru);
              const isExpanded = expandedGuruIds.has(guru.guru_id);
              const totalClasses = guru.detail_kelas?.length || 0;
              const totalJpWeekly = guru.detail_kelas?.reduce((sum, dk) => sum + (dk.jp_per_minggu || 0), 0) || 0;

              return (
                <div
                  key={guru.guru_id}
                  className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs hover:border-slate-300 dark:hover:border-slate-700 transition-all flex flex-col justify-between gap-3.5"
                >
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className={cn(
                        "w-10 h-10 rounded-xl flex items-center justify-center font-extrabold text-xs shrink-0 border",
                        avatar.bg, avatar.text, avatar.border
                      )}>
                        {getInitials(guru.nama_guru)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h4 className="font-extrabold text-slate-900 dark:text-slate-100 text-sm leading-snug truncate">
                          {guru.nama_guru}
                        </h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5 truncate">
                          {guru.nip ? `NIP: ${guru.nip}` : 'Tenaga Pendidik'}
                        </p>
                      </div>
                    </div>

                    <span className={cn(
                      "text-[10px] font-bold px-2 py-0.5 rounded-lg border whitespace-nowrap shrink-0",
                      st.bg, st.color
                    )}>
                      {st.label}
                    </span>
                  </div>

                  {/* Progress Bar & Realization */}
                  <div className="space-y-1.5 bg-slate-50/70 dark:bg-slate-950/60 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800/80">
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span className="text-slate-600 dark:text-slate-400 font-medium text-[11px]">Realisasi Mengajar</span>
                      <span style={{ color }} className="font-extrabold text-sm">{guru.persentase}%</span>
                    </div>
                    <ProgressBar pct={guru.persentase} color={color} />
                  </div>

                  {/* 4 Mini Metrics Breakdown */}
                  <div className="grid grid-cols-4 gap-1.5 text-center">
                    <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200/60 dark:border-slate-800">
                      <div className="text-[9px] text-slate-500 dark:text-slate-400 font-medium">Rencana</div>
                      <div className="text-xs font-extrabold text-slate-900 dark:text-slate-100 mt-0.5">{guru.total_jp_rencana} JP</div>
                    </div>
                    <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200/60 dark:border-slate-800">
                      <div className="text-[9px] text-slate-500 dark:text-slate-400 font-medium">Jadwal</div>
                      <div className="text-xs font-extrabold text-indigo-600 dark:text-indigo-400 mt-0.5">{guru.jp_dijadwalkan ?? 0} JP</div>
                    </div>
                    <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200/60 dark:border-slate-800">
                      <div className="text-[9px] text-slate-500 dark:text-slate-400 font-medium">Terlaksana</div>
                      <div className="text-xs font-extrabold text-emerald-600 dark:text-emerald-400 mt-0.5">{guru.jp_terlaksana} JP</div>
                    </div>
                    <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200/60 dark:border-slate-800">
                      <div className="text-[9px] text-slate-500 dark:text-slate-400 font-medium">Sisa</div>
                      <div className={cn("text-xs font-extrabold mt-0.5", guru.jp_sisa > 0 ? "text-rose-600 dark:text-rose-400" : "text-emerald-600")}>
                        {guru.jp_sisa} JP
                      </div>
                    </div>
                  </div>

                  {/* Clean Expandable Class Distribution */}
                  {totalClasses > 0 && (
                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2">
                      <button
                        type="button"
                        onClick={() => toggleExpand(guru.guru_id)}
                        className="w-full flex items-center justify-between text-xs text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 font-bold transition-colors cursor-pointer py-0.5"
                      >
                        <span className="flex items-center gap-1.5">
                          <BookOpen size={13} className="text-indigo-500" />
                          <span>{totalClasses} Rombel Ajar ({totalJpWeekly} JP/mg)</span>
                        </span>
                        {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      </button>

                      {isExpanded && (
                        <div className="space-y-1.5 pt-1 animate-in fade-in duration-200">
                          {guru.detail_kelas?.map((dk: DetailKelas, idx: number) => (
                            <div
                              key={idx}
                              className="flex items-center justify-between p-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200/60 dark:border-slate-800 text-xs"
                            >
                              <div className="min-w-0 flex-1 pr-2">
                                <span className="font-extrabold text-slate-800 dark:text-slate-200">{dk.kelas}</span>
                                <span className="text-slate-500 dark:text-slate-400 text-[11px] block truncate">{dk.mapel}</span>
                              </div>
                              <span className="font-extrabold text-indigo-600 dark:text-indigo-400 text-xs bg-indigo-50 dark:bg-indigo-950/40 px-2 py-0.5 rounded-lg border border-indigo-100 dark:border-indigo-900/40 shrink-0">
                                {dk.jp_per_minggu} JP
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Detail Action Button */}
                  <Button
                    size="xs"
                    variant="outline"
                    onClick={() => setSelectedGuruDetail(guru)}
                    className="w-full rounded-xl font-bold text-xs py-2 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center justify-center gap-1.5"
                  >
                    <span>Lihat Rincian Audit</span>
                    <ChevronRight size={13} />
                  </Button>
                </div>
              );
            })}
          </div>
        )}

        {/* ─── Detail Audit Modal ─────────────────────────────────────── */}
        {selectedGuruDetail && (
          <Modal
            isOpen={Boolean(selectedGuruDetail)}
            onClose={() => setSelectedGuruDetail(null)}
            title={`Rincian Audit JP: ${selectedGuruDetail.nama_guru}`}
            size="lg"
          >
            <div className="space-y-4">
              {/* Header Profile */}
              <div className="p-4 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/40 flex items-center justify-between gap-3">
                <div>
                  <h4 className="font-extrabold text-sm text-slate-900 dark:text-slate-100">
                    {selectedGuruDetail.nama_guru}
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                    {selectedGuruDetail.nip ? `NIP: ${selectedGuruDetail.nip}` : 'Tenaga Pendidik'}
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-xs text-slate-500 dark:text-slate-400 block font-medium">Ketercapaian</span>
                  <span className="text-lg font-black text-indigo-600 dark:text-indigo-400">
                    {selectedGuruDetail.persentase}%
                  </span>
                </div>
              </div>

              {/* Metric Breakdown Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center">
                  <span className="text-[10px] text-slate-500 font-bold block">JP Rencana</span>
                  <span className="text-sm font-extrabold text-slate-900 dark:text-slate-100 mt-1 block">
                    {selectedGuruDetail.total_jp_rencana} JP
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center">
                  <span className="text-[10px] text-slate-500 font-bold block">JP Terjadwal</span>
                  <span className="text-sm font-extrabold text-indigo-600 dark:text-indigo-400 mt-1 block">
                    {selectedGuruDetail.jp_dijadwalkan ?? 0} JP
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center">
                  <span className="text-[10px] text-slate-500 font-bold block">JP Terlaksana</span>
                  <span className="text-sm font-extrabold text-emerald-600 dark:text-emerald-400 mt-1 block">
                    {selectedGuruDetail.jp_terlaksana} JP
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center">
                  <span className="text-[10px] text-slate-500 font-bold block">Sisa Beban</span>
                  <span className="text-sm font-extrabold text-rose-600 dark:text-rose-400 mt-1 block">
                    {selectedGuruDetail.jp_sisa} JP
                  </span>
                </div>
              </div>

              {/* Classes Table */}
              <div className="space-y-2">
                <h5 className="font-extrabold text-xs text-slate-900 dark:text-slate-100 uppercase tracking-wider">
                  Daftar Kelas &amp; Alokasi JP Mengajar
                </h5>
                <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden divide-y divide-slate-100 dark:divide-slate-800">
                  {selectedGuruDetail.detail_kelas && selectedGuruDetail.detail_kelas.length > 0 ? (
                    selectedGuruDetail.detail_kelas.map((dk, idx) => (
                      <div key={idx} className="p-3 flex items-center justify-between gap-3 hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                        <div>
                          <span className="font-extrabold text-xs text-slate-900 dark:text-slate-100 block">
                            {dk.kelas}
                          </span>
                          <span className="text-[11px] text-slate-500 dark:text-slate-400">
                            {dk.mapel}
                          </span>
                        </div>
                        <span className="font-extrabold text-xs text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 px-2.5 py-1 rounded-xl border border-indigo-100 dark:border-indigo-900/40">
                          {dk.jp_per_minggu} JP / Minggu
                        </span>
                      </div>
                    ))
                  ) : (
                    <div className="p-6 text-center text-xs text-slate-400 font-medium">
                      Belum ada alokasi kelas ajar yang terdaftar
                    </div>
                  )}
                </div>
              </div>
            </div>
          </Modal>
        )}
      </div>
    </AcademicPageLayout>
  );
}
