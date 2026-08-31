import React, { useState, useMemo, useCallback, lazy, Suspense } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Award,
  Star,
  TrendingUp,
  Users,
  CheckCircle2,
  AlertTriangle,
  Clock,
  BookOpen,
  Search,
  RefreshCw,
  Eye,
  ChevronRight,
  ShieldCheck,
  Building2,
  GraduationCap,
  Sparkles,
  FileText,
  MessageSquare,
  Printer,
  ChevronDown,
  ChevronUp,
  Layers,
  HeartPulse
} from 'lucide-react';
import {
  ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis,
  PolarRadiusAxis, Radar, BarChart, Bar, XAxis, YAxis, Tooltip, Cell
} from 'recharts';

import { AcademicPageLayout } from '@/components/academic/AcademicPageLayout';
import { SectionCard } from '@/components/ui/SectionCard';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { kurikulumApi } from '@/api/kurikulum.api';
import { useTahunPelajaranOptions } from '@/hooks/useTahunPelajaranOptions';
import { useSemesterOptions } from '@/hooks/useSemesterOptions';
import { useCapabilities } from '@/hooks/useCapabilities';
import { useIsMobile } from '@/hooks/useIsMobile';
import { cn } from '@/lib/utils';
import { toast } from 'react-hot-toast';

const SearchableSelect = lazy(() => import('@/components/ui/SearchableSelect').then(m => ({ default: m.SearchableSelect })));

const hardeningModuleKey = 'evaluasi_kinerja_page';

export interface EvaluasiPillarScores {
  presensi: number;
  kbmJam: number;
  jurnalKbm: number;
  perangkatAjar: number;
  supervisi: number;
  tugasTambahan: number;
}

export interface EvaluasiMetrics {
  kehadiranPct: number;
  keterlambatanMenit: number;
  izinSakitCount: number;
  alpaCount: number;
  jamMengajarTotal: number;
  jamMengajarRealisasi: number;
  jurnalTerisiPct: number;
  perangkatTotal: number;
  perangkatApproved: number;
  perangkatStatus: 'LENGKAP' | 'REVIEW' | 'KURANG';
  supervisiSkor: number;
  supervisiTanggal: string | null;
  catatanPenilai: string | null;
}

export interface TeacherEvaluationRecord {
  id: string;
  nama: string;
  nip: string;
  foto?: string | null;
  mapel: string;
  jabatan: string;
  statusKepegawaian: string;
  compositeScore: number;
  predikat: 'A' | 'B' | 'C' | 'D';
  predikatLabel: string;
  pillarScores: EvaluasiPillarScores;
  metrics: EvaluasiMetrics;
  rekomendasi: string;
  pembinaanKhusus?: string | null;
}

const PREDIKAT_COLORS = {
  A: { bg: 'bg-emerald-500', text: 'text-emerald-700 dark:text-emerald-400', badge: 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800' },
  B: { bg: 'bg-indigo-500', text: 'text-indigo-700 dark:text-indigo-400', badge: 'bg-indigo-50 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-800' },
  C: { bg: 'bg-amber-500', text: 'text-amber-700 dark:text-amber-400', badge: 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800' },
  D: { bg: 'bg-rose-500', text: 'text-rose-700 dark:text-rose-400', badge: 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800' },
};

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

export const EvaluasiKinerjaGuruPage: React.FC = React.memo(() => {
  const isMobile = useIsMobile();
  const { isKurikulum, isAdmin, isKepsek } = useCapabilities();

  const [tahunPelajaranId, setTahunPelajaranId] = useState<string>('');
  const [semesterId, setSemesterId] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [predikatFilter, setPredikatFilter] = useState<'ALL' | 'A' | 'B' | 'C' | 'D'>('ALL');
  const [statusKepegawaianFilter, setStatusKepegawaianFilter] = useState<string>('ALL');
  const [selectedGuruDetail, setSelectedGuruDetail] = useState<TeacherEvaluationRecord | null>(null);
  const [showCharts, setShowCharts] = useState<boolean>(!isMobile);

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

  // Query Data Evaluasi Kinerja Guru dari API
  const { data: evaluasiData, isLoading, refetch } = useQuery({
    queryKey: ['evaluasi-kinerja-guru', tahunPelajaranId, semesterId, predikatFilter, statusKepegawaianFilter],
    queryFn: () => kurikulumApi.getEvaluasiKinerja({
      tahun_pelajaran_id: tahunPelajaranId || undefined,
      semester_id: semesterId || undefined,
      predikat: predikatFilter !== 'ALL' ? predikatFilter : undefined,
      status_kepegawaian: statusKepegawaianFilter !== 'ALL' ? statusKepegawaianFilter : undefined,
    }).catch(() => null),
    staleTime: 5 * 60 * 1000,
  });

  const teachersList = useMemo(() => {
    return (evaluasiData?.data || []) as TeacherEvaluationRecord[];
  }, [evaluasiData]);

  const summary = useMemo(() => {
    return evaluasiData?.summary || {
      totalGuru: teachersList.length,
      avgScore: 0,
      predikatDist: { A: 0, B: 0, C: 0, D: 0 },
      topPerformers: [],
      needsAttentionCount: 0,
    };
  }, [evaluasiData, teachersList]);

  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(12);

  // Reset pagination on filter changes
  React.useEffect(() => {
    setPage(1);
  }, [searchTerm, predikatFilter, statusKepegawaianFilter, tahunPelajaranId, semesterId]);

  // Client-side search filtering
  const filteredTeachers = useMemo(() => {
    if (!searchTerm.trim()) return teachersList;
    const q = searchTerm.toLowerCase();
    return teachersList.filter(t =>
      t.nama.toLowerCase().includes(q) ||
      t.nip.toLowerCase().includes(q) ||
      t.mapel.toLowerCase().includes(q) ||
      t.jabatan.toLowerCase().includes(q)
    );
  }, [teachersList, searchTerm]);

  const totalPages = Math.max(1, Math.ceil(filteredTeachers.length / pageSize));
  const paginatedTeachers = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredTeachers.slice(start, start + pageSize);
  }, [filteredTeachers, page, pageSize]);

  // Data Radar Chart Rata-rata 5 Pilar Sekolah
  const schoolRadarData = useMemo(() => {
    if (teachersList.length === 0) {
      return [
        { subject: 'Presensi', score: 85, fullMark: 100 },
        { subject: 'Realisasi KBM', score: 80, fullMark: 100 },
        { subject: 'Jurnal KBM', score: 78, fullMark: 100 },
        { subject: 'Perangkat', score: 82, fullMark: 100 },
        { subject: 'Supervisi', score: 84, fullMark: 100 },
      ];
    }
    const count = teachersList.length;
    const avgPresensi = Math.round(teachersList.reduce((s, t) => s + (t.pillarScores.presensi || 0), 0) / count);
    const avgKbm = Math.round(teachersList.reduce((s, t) => s + (t.pillarScores.kbmJam || 0), 0) / count);
    const avgJurnal = Math.round(teachersList.reduce((s, t) => s + (t.pillarScores.jurnalKbm || 0), 0) / count);
    const avgPerangkat = Math.round(teachersList.reduce((s, t) => s + (t.pillarScores.perangkatAjar || 0), 0) / count);
    const avgSupervisi = Math.round(teachersList.reduce((s, t) => s + (t.pillarScores.supervisi || 0), 0) / count);

    return [
      { subject: 'Presensi', score: avgPresensi, fullMark: 100 },
      { subject: 'Realisasi KBM', score: avgKbm, fullMark: 100 },
      { subject: 'Jurnal KBM', score: avgJurnal, fullMark: 100 },
      { subject: 'Perangkat', score: avgPerangkat, fullMark: 100 },
      { subject: 'Supervisi', score: avgSupervisi, fullMark: 100 },
    ];
  }, [teachersList]);

  // Data Bar Chart Distribusi Predikat
  const predikatChartData = useMemo(() => [
    { name: 'Sangat Baik (A)', count: summary.predikatDist?.A || 0, fill: '#10B981' },
    { name: 'Baik (B)', count: summary.predikatDist?.B || 0, fill: '#6366F1' },
    { name: 'Cukup (C)', count: summary.predikatDist?.C || 0, fill: '#F59E0B' },
    { name: 'Kurang (D)', count: summary.predikatDist?.D || 0, fill: '#EF4444' },
  ], [summary]);

  const headerStats = useMemo(() => [
    {
      title: "Guru Dinilai",
      value: summary.totalGuru,
      icon: <Users size={16} className="text-white" />,
      gradient: "from-blue-600 to-indigo-700",
      subtitle: "Evaluasi semester aktif"
    },
    {
      title: "Rerata Skor Sekolah",
      value: `${summary.avgScore}/100`,
      icon: <Star size={16} className="text-white" />,
      gradient: "from-indigo-600 to-purple-700",
      subtitle: "Skor komposit 5 pilar"
    },
    {
      title: "Predikat A (Sangat Baik)",
      value: summary.predikatDist?.A || 0,
      icon: <Award size={16} className="text-white" />,
      gradient: "from-emerald-600 to-teal-700",
      subtitle: "Kandidat guru teladan"
    },
    {
      title: "Perlu Bimbingan",
      value: summary.needsAttentionCount || 0,
      icon: <AlertTriangle size={16} className="text-white" />,
      gradient: summary.needsAttentionCount > 0 ? "from-amber-600 to-rose-700" : "from-emerald-600 to-teal-800",
      subtitle: "Predikat C & D"
    }
  ], [summary]);

  return (
    <AcademicPageLayout
      hardeningModuleKey={hardeningModuleKey}
      title="Evaluasi Kinerja Guru"
      description="Laporan penilaian komprehensif performa tenaga pendidik berbasis 5 pilar (Presensi, KBM, Jurnal, Perangkat, Supervisi)."
      breadcrumbs={[
        { label: 'Kurikulum', path: '/kurikulum/dashboard' },
        { label: 'Evaluasi Kinerja Guru' }
      ]}
      instruction={{
        title: 'Panduan Evaluasi Kinerja Guru (5 Pilar)',
        description: 'Sistem mengakumulasikan kinerja guru secara otomatis dari data riil operasional sekolah:',
        items: [
          { text: 'Presensi (20%): Kedisiplinan tap gerbang & kepatuhan jam kerja.' },
          { text: 'KBM Jam (25%): Realisasi sesi tatap muka vs beban rencana kurikulum.' },
          { text: 'Jurnal KBM (20%): Kepatuhan pengisian ringkasan materi dan absensi siswa di kelas.' },
          { text: 'Perangkat Ajar (15%): Kelengkapan & approval RPP/Modul, Prota, dan Promes.' },
          { text: 'Supervisi Akademik (20%): Hasil observasi kelas dari Kepala Sekolah/Tim Penilai.' },
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
              placeholder="Cari guru (Nama, NIP, Mapel, Jabatan)..."
              aria-label="Cari guru"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 h-10 rounded-xl bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
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
            <select
              value={statusKepegawaianFilter}
              onChange={(e) => setStatusKepegawaianFilter(e.target.value)}
              className="h-9 px-3 text-xs font-bold rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 focus:ring-1 focus:ring-indigo-500"
            >
              <option value="ALL">Semua Kepegawaian</option>
              <option value="PNS">PNS</option>
              <option value="PPPK">PPPK</option>
              <option value="GTT_YAYASAN">GTT / Yayasan</option>
              <option value="HONORER">Honorer</option>
            </select>
          </div>

          {/* Predikat Filter Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar pt-1">
            {[
              { id: 'ALL', label: 'Semua Predikat', count: summary.totalGuru, activeCls: 'bg-indigo-600 text-white' },
              { id: 'A', label: 'Predikat A (≥90)', count: summary.predikatDist?.A || 0, activeCls: 'bg-emerald-600 text-white' },
              { id: 'B', label: 'Predikat B (75-89)', count: summary.predikatDist?.B || 0, activeCls: 'bg-indigo-600 text-white' },
              { id: 'C', label: 'Predikat C (60-74)', count: summary.predikatDist?.C || 0, activeCls: 'bg-amber-500 text-white' },
              { id: 'D', label: 'Predikat D (<60)', count: summary.predikatDist?.D || 0, activeCls: 'bg-rose-600 text-white' },
            ].map(tab => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setPredikatFilter(tab.id as any)}
                className={cn(
                  "px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer shrink-0 border",
                  predikatFilter === tab.id
                    ? `${tab.activeCls} shadow-xs border-transparent`
                    : "bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100"
                )}
              >
                <span>{tab.label}</span>
                <span className={cn(
                  "text-[10px] px-1.5 py-0.2 rounded-full",
                  predikatFilter === tab.id ? "bg-white/20 text-white" : "bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300"
                )}>
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          {/* Action Toolbar on Bottom of Filter Card */}
          <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
              Menampilkan {filteredTeachers.length} guru
            </span>

            <div className="flex items-center gap-1.5">
              <Button
                variant="toolbarOutline"
                size="toolbar"
                onClick={() => setShowCharts(prev => !prev)}
                className="text-xs rounded-xl"
              >
                <Layers size={13} className="mr-1" />
                <span>{showCharts ? 'Sembunyikan Grafik' : 'Tampilkan Analisis'}</span>
              </Button>
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

        {/* ─── Analytical Visualizations (Radar & Bar Chart) ───────────── */}
        {showCharts && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 animate-in fade-in duration-300">
            {/* Radar Chart: 5 Pilar Sekolah */}
            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-extrabold text-xs text-slate-900 dark:text-slate-100 uppercase tracking-wider">
                    Radar Kinerja 5 Pilar (Rerata Sekolah)
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Keseimbangan capaian pilar kurikulum sekolah
                  </p>
                </div>
                <div className="flex items-center gap-1 text-[11px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 px-2 py-0.5 rounded-lg border border-indigo-100 dark:border-indigo-900/40">
                  <Sparkles size={12} />
                  <span>Real-Time</span>
                </div>
              </div>

              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={schoolRadarData} margin={{ top: 10, right: 20, bottom: 10, left: 20 }}>
                    <PolarGrid stroke="#e2e8f0" strokeDasharray="3 3" />
                    <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11, fontWeight: 700, fill: '#64748b' }} />
                    <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 9 }} />
                    <Radar name="Capaian Sekolah" dataKey="score" stroke="#6366f1" fill="#6366f1" fillOpacity={0.4} />
                    <Tooltip formatter={(value: any) => [`${value}/100`, 'Skor Rata-Rata']} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Bar Chart: Distribusi Predikat */}
            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-extrabold text-xs text-slate-900 dark:text-slate-100 uppercase tracking-wider">
                    Distribusi Predikat Kelulusan Kinerja
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Komposisi pencapaian predikat mutu pendidik
                  </p>
                </div>
              </div>

              <div className="h-64 w-full pt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={predikatChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <XAxis dataKey="name" tick={{ fontSize: 10, fontWeight: 700 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip formatter={(val: any) => [`${val} Guru`, 'Jumlah']} />
                    <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                      {predikatChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {/* ─── Main Teachers Evaluation Cards ─────────────────────────── */}
        {isLoading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-3 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800">
            <RefreshCw className="w-8 h-8 text-indigo-500 animate-spin" />
            <p className="text-xs font-bold text-slate-500 dark:text-slate-400">Menghitung evaluasi kinerja 5 pilar...</p>
          </div>
        ) : filteredTeachers.length === 0 ? (
          <div className="py-16 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs p-6">
            <Award className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
            <h4 className="font-extrabold text-sm text-slate-800 dark:text-slate-200">Tidak ada data guru ditemukan</h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
              Sesuaikan kata kunci pencarian atau filter predikat di atas.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {paginatedTeachers.map((teacher: TeacherEvaluationRecord) => {
                const avatar = getAvatarColor(teacher.nama);
                const predStyle = PREDIKAT_COLORS[teacher.predikat] || PREDIKAT_COLORS.B;

                return (
                  <div
                    key={teacher.id}
                    className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs hover:border-slate-300 dark:hover:border-slate-700 transition-all flex flex-col justify-between gap-3.5"
                  >
                    {/* Top Profile Header */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className={cn(
                          "w-11 h-11 rounded-xl flex items-center justify-center font-black text-sm shrink-0 border",
                          avatar.bg, avatar.text, avatar.border
                        )}>
                          {getInitials(teacher.nama)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <h4 className="font-extrabold text-slate-900 dark:text-slate-100 text-sm leading-snug truncate">
                            {teacher.nama}
                          </h4>
                          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5 truncate">
                            {teacher.nip ? `NIP: ${teacher.nip}` : teacher.jabatan}
                          </p>
                          <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 block truncate mt-0.5">
                            {teacher.mapel}
                          </span>
                        </div>
                      </div>

                      {/* Predikat & Score Badge */}
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <span className={cn(
                          "text-xs font-black px-2.5 py-0.5 rounded-lg border whitespace-nowrap",
                          predStyle.badge, predStyle.text
                        )}>
                          Predikat {teacher.predikat}
                        </span>
                        <span className="text-xs font-extrabold text-slate-700 dark:text-slate-300">
                          {teacher.compositeScore}<span className="text-[10px] text-slate-400">/100</span>
                        </span>
                      </div>
                    </div>

                    {/* 5-Pillar Score Indicators */}
                    <div className="space-y-1.5 bg-slate-50/70 dark:bg-slate-950/60 p-3 rounded-xl border border-slate-100 dark:border-slate-800/80">
                      <div className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mb-2 flex items-center justify-between">
                        <span>Capaian 5 Pilar Kinerja</span>
                        <span className="text-slate-400 font-medium">Bobot 100%</span>
                      </div>

                      {[
                        { label: 'Presensi (20%)', val: teacher.pillarScores.presensi, color: '#10B981' },
                        { label: 'KBM Jam (25%)', val: teacher.pillarScores.kbmJam, color: '#6366F1' },
                        { label: 'Jurnal KBM (20%)', val: teacher.pillarScores.jurnalKbm, color: '#3B82F6' },
                        { label: 'Perangkat (15%)', val: teacher.pillarScores.perangkatAjar, color: '#8B5CF6' },
                        { label: 'Supervisi (20%)', val: teacher.pillarScores.supervisi, color: '#F59E0B' },
                      ].map(pilar => (
                        <div key={pilar.label} className="flex items-center gap-2 text-xs">
                          <span className="text-[10px] font-bold text-slate-600 dark:text-slate-400 w-24 truncate">
                            {pilar.label}
                          </span>
                          <div className="flex-1 h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                            <div
                              style={{ width: `${pilar.val}%`, backgroundColor: pilar.color }}
                              className="h-full rounded-full transition-all duration-500"
                            />
                          </div>
                          <span className="text-[10px] font-black text-slate-700 dark:text-slate-300 w-7 text-right">
                            {pilar.val}
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* Recommendations Banner */}
                    <div className="p-2.5 rounded-xl bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/30 text-xs flex items-start gap-2">
                      <Sparkles className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
                      <p className="text-[11px] text-slate-700 dark:text-slate-300 leading-relaxed line-clamp-2">
                        {teacher.rekomendasi}
                      </p>
                    </div>

                    {/* Detail Action */}
                    <Button
                      size="xs"
                      variant="outline"
                      onClick={() => setSelectedGuruDetail(teacher)}
                      className="w-full rounded-xl font-bold text-xs py-2 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center justify-center gap-1.5"
                    >
                      <span>Rapor Evaluasi Lengkap</span>
                      <ChevronRight size={13} />
                    </Button>
                  </div>
                );
              })}
            </div>

            {/* Pagination Controls Deck */}
            {filteredTeachers.length > 0 && (
              <div className="bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400 font-medium">
                  <span>
                    Menampilkan <strong className="text-slate-900 dark:text-slate-100 font-bold">{Math.min((page - 1) * pageSize + 1, filteredTeachers.length)}</strong> - <strong className="text-slate-900 dark:text-slate-100 font-bold">{Math.min(page * pageSize, filteredTeachers.length)}</strong> dari <strong className="text-slate-900 dark:text-slate-100 font-bold">{filteredTeachers.length}</strong> guru
                  </span>
                  <div className="h-4 w-px bg-slate-200 dark:bg-slate-800 hidden sm:block" />
                  <div className="flex items-center gap-1">
                    <span className="text-[11px]">Baris:</span>
                    <select
                      value={pageSize}
                      onChange={(e) => {
                        setPageSize(Number(e.target.value));
                        setPage(1);
                      }}
                      className="h-7 px-2 text-xs font-bold rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200"
                    >
                      <option value={6}>6</option>
                      <option value={12}>12</option>
                      <option value={24}>24</option>
                      <option value={48}>48</option>
                    </select>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="xs"
                    disabled={page <= 1}
                    onClick={() => setPage(prev => Math.max(1, prev - 1))}
                    className="rounded-xl px-3 h-8 text-xs font-bold"
                  >
                    Sebelumnya
                  </Button>

                  <div className="flex items-center gap-1 px-1">
                    {Array.from({ length: totalPages }, (_, idx) => idx + 1)
                      .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
                      .map((p, idx, arr) => {
                        const prevP = arr[idx - 1];
                        return (
                          <React.Fragment key={p}>
                            {prevP && p - prevP > 1 && (
                              <span className="px-1 text-slate-400 text-xs">...</span>
                            )}
                            <button
                              type="button"
                              onClick={() => setPage(p)}
                              className={cn(
                                "w-8 h-8 rounded-xl text-xs font-bold transition-all",
                                page === p
                                  ? "bg-indigo-600 text-white shadow-xs"
                                  : "bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
                              )}
                            >
                              {p}
                            </button>
                          </React.Fragment>
                        );
                      })}
                  </div>

                  <Button
                    variant="outline"
                    size="xs"
                    disabled={page >= totalPages}
                    onClick={() => setPage(prev => Math.min(totalPages, prev + 1))}
                    className="rounded-xl px-3 h-8 text-xs font-bold"
                  >
                    Selanjutnya
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ─── Detail Teacher Appraisal Modal ─────────────────────────── */}
        {selectedGuruDetail && (
          <Modal
            isOpen={Boolean(selectedGuruDetail)}
            onClose={() => setSelectedGuruDetail(null)}
            title={`Rapor Kinerja: ${selectedGuruDetail.nama}`}
            size="lg"
          >
            <div className="space-y-4">
              {/* Profile Card */}
              <div className="p-4 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/40 flex items-start justify-between gap-3">
                <div>
                  <h4 className="font-extrabold text-sm text-slate-900 dark:text-slate-100">
                    {selectedGuruDetail.nama}
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                    {selectedGuruDetail.nip ? `NIP: ${selectedGuruDetail.nip}` : 'Tenaga Pendidik'} • {selectedGuruDetail.statusKepegawaian}
                  </p>
                  <p className="text-xs font-bold text-indigo-600 dark:text-indigo-400 mt-1">
                    {selectedGuruDetail.mapel}
                  </p>
                </div>

                <div className="text-right">
                  <span className="text-xs font-black px-2.5 py-1 rounded-xl bg-indigo-600 text-white block mb-1">
                    Predikat {selectedGuruDetail.predikat}
                  </span>
                  <span className="text-sm font-extrabold text-slate-800 dark:text-slate-200">
                    Skor: {selectedGuruDetail.compositeScore}/100
                  </span>
                </div>
              </div>

              {/* 5 Pilar Detailed Breakdown Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center">
                  <span className="text-[10px] text-slate-500 font-bold block">1. Presensi</span>
                  <span className="text-sm font-extrabold text-emerald-600 dark:text-emerald-400 mt-0.5 block">
                    {selectedGuruDetail.pillarScores.presensi}/100
                  </span>
                  <span className="text-[9px] text-slate-400 block mt-0.5">
                    Hadir {selectedGuruDetail.metrics.kehadiranPct}% (Telat: {selectedGuruDetail.metrics.keterlambatanMenit}m)
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center">
                  <span className="text-[10px] text-slate-500 font-bold block">2. Realisasi KBM</span>
                  <span className="text-sm font-extrabold text-indigo-600 dark:text-indigo-400 mt-0.5 block">
                    {selectedGuruDetail.pillarScores.kbmJam}/100
                  </span>
                  <span className="text-[9px] text-slate-400 block mt-0.5">
                    {selectedGuruDetail.metrics.jamMengajarRealisasi} dari {selectedGuruDetail.metrics.jamMengajarTotal} JP
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center">
                  <span className="text-[10px] text-slate-500 font-bold block">3. Jurnal KBM</span>
                  <span className="text-sm font-extrabold text-blue-600 dark:text-blue-400 mt-0.5 block">
                    {selectedGuruDetail.pillarScores.jurnalKbm}/100
                  </span>
                  <span className="text-[9px] text-slate-400 block mt-0.5">
                    {selectedGuruDetail.metrics.jurnalTerisiPct}% Sesi terisi
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center">
                  <span className="text-[10px] text-slate-500 font-bold block">4. Perangkat Ajar</span>
                  <span className="text-sm font-extrabold text-purple-600 dark:text-purple-400 mt-0.5 block">
                    {selectedGuruDetail.pillarScores.perangkatAjar}/100
                  </span>
                  <span className="text-[9px] text-slate-400 block mt-0.5">
                    Status: {selectedGuruDetail.metrics.perangkatStatus}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center">
                  <span className="text-[10px] text-slate-500 font-bold block">5. Supervisi Kelas</span>
                  <span className="text-sm font-extrabold text-amber-600 dark:text-amber-400 mt-0.5 block">
                    {selectedGuruDetail.pillarScores.supervisi}/100
                  </span>
                  <span className="text-[9px] text-slate-400 block mt-0.5">
                    Observasi: {selectedGuruDetail.metrics.supervisiTanggal || 'Terjadwal'}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center">
                  <span className="text-[10px] text-slate-500 font-bold block">Tugas Tambahan</span>
                  <span className="text-sm font-extrabold text-teal-600 dark:text-teal-400 mt-0.5 block">
                    {selectedGuruDetail.pillarScores.tugasTambahan}/100
                  </span>
                  <span className="text-[9px] text-slate-400 block mt-0.5">
                    {selectedGuruDetail.jabatan}
                  </span>
                </div>
              </div>

              {/* Keunggulan & Area Perbaikan Badges */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {selectedGuruDetail.keunggulan && selectedGuruDetail.keunggulan.length > 0 && (
                  <div className="p-3 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30 space-y-1.5">
                    <h6 className="text-[11px] font-extrabold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider flex items-center gap-1.5">
                      <CheckCircle2 size={13} className="text-emerald-600" />
                      <span>Keunggulan Utama</span>
                    </h6>
                    <ul className="space-y-1 text-xs text-slate-700 dark:text-slate-300">
                      {selectedGuruDetail.keunggulan.map((item, idx) => (
                        <li key={idx} className="flex items-start gap-1.5">
                          <span className="text-emerald-500 font-bold">•</span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {selectedGuruDetail.areaPerbaikan && selectedGuruDetail.areaPerbaikan.length > 0 && (
                  <div className="p-3 rounded-2xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/30 space-y-1.5">
                    <h6 className="text-[11px] font-extrabold text-amber-800 dark:text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
                      <AlertTriangle size={13} className="text-amber-600" />
                      <span>Area Perbaikan &amp; Bimbingan</span>
                    </h6>
                    <ul className="space-y-1 text-xs text-slate-700 dark:text-slate-300">
                      {selectedGuruDetail.areaPerbaikan.map((item, idx) => (
                        <li key={idx} className="flex items-start gap-1.5">
                          <span className="text-amber-500 font-bold">•</span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* Recommendations & Coaching */}
              <div className="space-y-2 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                <h5 className="font-extrabold text-xs text-slate-900 dark:text-slate-100 uppercase tracking-wider">
                  Rekomendasi &amp; Tindak Lanjut Pembinaan
                </h5>
                <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                  {selectedGuruDetail.rekomendasi}
                </p>
                {selectedGuruDetail.pembinaanKhusus && (
                  <div className="mt-2 p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-xs text-amber-800 dark:text-amber-300 font-medium">
                    ⚠️ <strong>Fokus Tindak Lanjut:</strong> {selectedGuruDetail.pembinaanKhusus}
                  </div>
                )}
                {selectedGuruDetail.metrics.catatanPenilai && (
                  <div className="mt-2 p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 text-xs text-indigo-800 dark:text-indigo-300">
                    📝 <strong>Catatan Supervisor:</strong> {selectedGuruDetail.metrics.catatanPenilai}
                  </div>
                )}
              </div>

              {/* Footer Actions */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <Button
                  variant="outline"
                  onClick={() => {
                    window.print();
                  }}
                  className="rounded-xl text-xs flex items-center gap-1.5"
                >
                  <Printer size={13} />
                  <span>Cetak Rapor Kinerja</span>
                </Button>
                <Button
                  variant="primary"
                  onClick={() => {
                    toast.success(`Pengingat apresiasi/pembinaan dikirimkan ke ${selectedGuruDetail.nama}`);
                  }}
                  className="rounded-xl text-xs flex items-center gap-1.5 bg-indigo-600 text-white"
                >
                  <MessageSquare size={13} />
                  <span>Kirim Notifikasi Feedback</span>
                </Button>
              </div>
            </div>
          </Modal>
        )}
      </div>
    </AcademicPageLayout>
  );
});

export default EvaluasiKinerjaGuruPage;
