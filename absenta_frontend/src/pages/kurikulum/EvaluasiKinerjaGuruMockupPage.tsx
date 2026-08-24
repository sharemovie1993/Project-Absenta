import { z } from 'zod';
import { formatDate } from '@/utils/date.utils';
const evalSchema = z.object({
  guru_id: z.string().min(1, 'Guru wajib dipilih')
});
import { SearchableSelect } from '../../components/ui/SearchableSelect';
import React, { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShieldCheck, Award, Star, TrendingUp, Users, Calendar,
  BookOpen, CheckCircle2, AlertTriangle, Clock, FileText,
  Search, Filter, ArrowRight, Download, Send, Printer,
  Eye, HelpCircle, UserCheck, ShieldAlert, Sparkles, MessageSquare,
  Building2, GraduationCap, RefreshCw, X, ChevronRight, BarChart3,
  Check, AlertCircle
} from 'lucide-react';
import {
  ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis,
  PolarRadiusAxis, Radar, BarChart, Bar, XAxis, YAxis, Tooltip, Cell
} from 'recharts';

import { AcademicPageLayout } from '@/components/academic/AcademicPageLayout';
import { AnalyticsCard } from '@/components/ui/AnalyticsCard';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui';
import { cn } from '@/lib/utils';
import { toast } from 'react-hot-toast';

// ── Mock Data Evaluasi Guru (Representative Cross-Module Schema) ──
export interface TeacherEvaluationRecord {
  id: string;
  nama: string;
  nip: string;
  foto?: string;
  mapel: string;
  jabatan: string; // e.g. "Guru Mapel", "Wali Kelas XII RPL 1", "Staf Kurikulum"
  statusKepegawaian: 'PNS' | 'PPPK' | 'GTT_YAYASAN' | 'HONORER';
  
  // 5 Pilar Data Lintas Modul (Skor 0 - 100)
  pillarScores: {
    presensi: number;      // attendance gerbang & jam kerja
    kbmJam: number;        // integritas jam mengajar terealisasi
    jurnalKbm: number;     // kepatuhan isi jurnal materi & absensi siswa
    perangkatAjar: number; // kelengkapan & approval RPP/Modul, Promes, Prota
    supervisi: number;     // hasil observasi kelas Kepsek/Penilai
    tugasTambahan: number; // wali kelas / piket / pembina
  };

  // Detail Raw Metrics
  metrics: {
    kehadiranPct: number;
    keterlambatanMenit: number;
    izinSakitCount: number;
    jamMengajarTotal: number;
    jamMengajarRealisasi: number;
    jurnalTerisiPct: number;
    perangkatStatus: 'LENGKAP' | 'REVIEW' | 'KURANG';
    supervisiSkor: number;
    supervisiTanggal: string;
    catatanPenilai: string;
  };

  rekomendasi: string;
  pembinaanKhusus?: string;
}

const MOCK_TEACHER_EVALUATIONS: TeacherEvaluationRecord[] = [
  {
    id: 'g-1',
    nama: 'Budi Santoso, M.Kom.',
    nip: '198205122008011004',
    mapel: 'Pemrograman Web & Perangkat Bergerak',
    jabatan: 'Wali Kelas XII RPL 1',
    statusKepegawaian: 'PNS',
    pillarScores: {
      presensi: 98,
      kbmJam: 96,
      jurnalKbm: 94,
      perangkatAjar: 100,
      supervisi: 95,
      tugasTambahan: 92,
    },
    metrics: {
      kehadiranPct: 98.5,
      keterlambatanMenit: 0,
      izinSakitCount: 1,
      jamMengajarTotal: 24,
      jamMengajarRealisasi: 24,
      jurnalTerisiPct: 96.0,
      perangkatStatus: 'LENGKAP',
      supervisiSkor: 95,
      supervisiTanggal: '12 Agustus 2026',
      catatanPenilai: 'Penguasaan materi sangat mendalam, media praktikum interaktif dan siswa sangat antusias.',
    },
    rekomendasi: 'Sangat Baik (Kandidat Guru Penggerak / Teladan Sekolah). Pertahankan integritas administrasi.',
  },
  {
    id: 'g-2',
    nama: 'Siti Rahmawati, S.Pd.',
    nip: '198904212014022003',
    mapel: 'Bahasa Inggris Lanjut',
    jabatan: 'Guru Mapel & Petugas Piket',
    statusKepegawaian: 'PPPK',
    pillarScores: {
      presensi: 92,
      kbmJam: 88,
      jurnalKbm: 78,
      perangkatAjar: 90,
      supervisi: 88,
      tugasTambahan: 85,
    },
    metrics: {
      kehadiranPct: 94.0,
      keterlambatanMenit: 15,
      izinSakitCount: 2,
      jamMengajarTotal: 22,
      jamMengajarRealisasi: 20,
      jurnalTerisiPct: 81.5,
      perangkatStatus: 'LENGKAP',
      supervisiSkor: 88,
      supervisiTanggal: '15 Agustus 2026',
      catatanPenilai: 'Metode komunikatif berjalan baik, perlu percepatan input jurnal KBM di hari yang sama.',
    },
    rekomendasi: 'Baik. Tingkatkan ketepatan waktu pengisian jurnal mandiri sesaat setelah kelas selesai.',
  },
  {
    id: 'g-3',
    nama: 'Ahmad Fauzi, S.T.',
    nip: '199208152020121008',
    mapel: 'Dasar-Dasar Teknik Jaringan Komputer',
    jabatan: 'Guru Mapel',
    statusKepegawaian: 'GTT_YAYASAN',
    pillarScores: {
      presensi: 85,
      kbmJam: 75,
      jurnalKbm: 60,
      perangkatAjar: 70,
      supervisi: 74,
      tugasTambahan: 65,
    },
    metrics: {
      kehadiranPct: 86.0,
      keterlambatanMenit: 45,
      izinSakitCount: 4,
      jamMengajarTotal: 18,
      jamMengajarRealisasi: 14,
      jurnalTerisiPct: 62.0,
      perangkatStatus: 'REVIEW',
      supervisiSkor: 74,
      supervisiTanggal: '10 Agustus 2026',
      catatanPenilai: 'Manajemen waktu mengajar perlu ditingkatkan. Beberapa sesi terlambat dimulai.',
    },
    rekomendasi: 'Cukup (Perlu Pembinaan Ringan). Disiplin waktu masuk kelas & segera lengkapi revisi RPP.',
    pembinaanKhusus: 'Dijadwalkan konseling kurikulum pada hari Senin mendatang.',
  },
  {
    id: 'g-4',
    nama: 'Dewi Lestari, S.Pd., M.M.',
    nip: '197811032002122001',
    mapel: 'Matematika Terapan',
    jabatan: 'Wali Kelas X TKJ 2',
    statusKepegawaian: 'PNS',
    pillarScores: {
      presensi: 96,
      kbmJam: 95,
      jurnalKbm: 92,
      perangkatAjar: 95,
      supervisi: 91,
      tugasTambahan: 94,
    },
    metrics: {
      kehadiranPct: 97.0,
      keterlambatanMenit: 5,
      izinSakitCount: 1,
      jamMengajarTotal: 24,
      jamMengajarRealisasi: 24,
      jurnalTerisiPct: 94.0,
      perangkatStatus: 'LENGKAP',
      supervisiSkor: 91,
      supervisiTanggal: '08 Agustus 2026',
      catatanPenilai: 'Penyampaian materi runtut dan sistematis. Pengelolaan presensi kelas binaan sangat rapi.',
    },
    rekomendasi: 'Sangat Baik. Disiplin dan pembinaan wali kelas patut menjadi teladan bagi guru muda.',
  },
  {
    id: 'g-5',
    nama: 'Hendra Gunawan, S.Kom.',
    nip: '199501252023211005',
    mapel: 'Basis Data & SQL',
    jabatan: 'Guru Mapel & Toolman',
    statusKepegawaian: 'HONORER',
    pillarScores: {
      presensi: 72,
      kbmJam: 68,
      jurnalKbm: 52,
      perangkatAjar: 50,
      supervisi: 65,
      tugasTambahan: 70,
    },
    metrics: {
      kehadiranPct: 74.0,
      keterlambatanMenit: 90,
      izinSakitCount: 5,
      jamMengajarTotal: 16,
      jamMengajarRealisasi: 11,
      jurnalTerisiPct: 50.0,
      perangkatStatus: 'KURANG',
      supervisiSkor: 65,
      supervisiTanggal: '05 Agustus 2026',
      catatanPenilai: 'Modul ajar belum diunggah secara lengkap, sering izin mendadak tanpa koordinasi inval.',
    },
    rekomendasi: 'Perlu Pembinaan Intensif. Wajib menyusun komitmen perbaikan kehadiran & pengumpulan RPP.',
    pembinaanKhusus: 'Surat Peringatan 1 (SP-1) evaluasi disiplin jam mengajar oleh Waka Kurikulum.',
  }
];

export function calculateTotalScore(p: TeacherEvaluationRecord['pillarScores']): number {
  // Bobot: KBM & Jurnal (30%), Presensi (25%), Perangkat (20%), Supervisi (15%), Tugas Tambahan (10%)
  const kbmAvg = (p.kbmJam + p.jurnalKbm) / 2;
  const score = (kbmAvg * 0.30) + (p.presensi * 0.25) + (p.perangkatAjar * 0.20) + (p.supervisi * 0.15) + (p.tugasTambahan * 0.10);
  return Math.round(score * 10) / 10;
}

export function getScoreGrade(score: number): { label: string; grade: 'A' | 'B' | 'C' | 'D'; color: string; bg: string; border: string } {
  if (score >= 90) return { label: 'Sangat Baik', grade: 'A', color: 'text-emerald-700 dark:text-emerald-300', bg: 'bg-emerald-50 dark:bg-emerald-950/50', border: 'border-emerald-200 dark:border-emerald-800' };
  if (score >= 75) return { label: 'Baik', grade: 'B', color: 'text-blue-700 dark:text-blue-300', bg: 'bg-blue-50 dark:bg-blue-950/50', border: 'border-blue-200 dark:border-blue-800' };
  if (score >= 60) return { label: 'Cukup', grade: 'C', color: 'text-amber-700 dark:text-amber-300', bg: 'bg-amber-50 dark:bg-amber-950/50', border: 'border-amber-200 dark:border-amber-800' };
  return { label: 'Perlu Pembinaan', grade: 'D', color: 'text-rose-700 dark:text-rose-300', bg: 'bg-rose-50 dark:bg-rose-950/50', border: 'border-rose-200 dark:border-rose-800' };
}

export default function EvaluasiKinerjaGuruMockupPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [gradeFilter, setGradeFilter] = useState<string>('ALL');
  const handleSelectTeacher = useCallback((t: unknown) => { setSelectedTeacher(t); }, []);
  const [selectedTeacher, setSelectedTeacher] = useState<TeacherEvaluationRecord | null>(null);
  const [noteInput, setNoteInput] = useState('');

  // 1. Filtered records
  const filteredRecords = useMemo(() => {
    return MOCK_TEACHER_EVALUATIONS.filter(t => {
      const matchSearch = t.nama.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.nip.includes(searchTerm) ||
        t.mapel.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchStatus = statusFilter === 'ALL' || t.statusKepegawaian === statusFilter;
      
      const score = calculateTotalScore(t.pillarScores);
      const grade = getScoreGrade(score).grade;
      const matchGrade = gradeFilter === 'ALL' || gradeFilter === grade;

      return matchSearch && matchStatus && matchGrade;
    });
  }, [searchTerm, statusFilter, gradeFilter]);

  // 2. Summary stats calculation
  const summaryStats = useMemo(() => {
    const total = MOCK_TEACHER_EVALUATIONS.length;
    let sumScore = 0;
    let sumPresensi = 0;
    let sumJurnal = 0;
    let completePerangkat = 0;
    let needGuidanceCount = 0;

    for (const t of MOCK_TEACHER_EVALUATIONS) {
      const s = calculateTotalScore(t.pillarScores);
      sumScore += s;
      sumPresensi += t.metrics.kehadiranPct;
      sumJurnal += t.metrics.jurnalTerisiPct;
      if (t.metrics.perangkatStatus === 'LENGKAP') completePerangkat++;
      if (s < 70) needGuidanceCount++;
    }

    return {
      avgScore: Math.round((sumScore / total) * 10) / 10,
      avgPresensi: Math.round((sumPresensi / total) * 10) / 10,
      avgJurnal: Math.round((sumJurnal / total) * 10) / 10,
      perangkatPct: Math.round((completePerangkat / total) * 100),
      needGuidanceCount
    };
  }, []);

  // 3. Radar chart data for selected teacher
  const radarData = useMemo(() => {
    if (!selectedTeacher) return [];
    const p = selectedTeacher.pillarScores;
    return [
      { subject: 'Presensi', value: p.presensi, fullMark: 100 },
      { subject: 'Jam KBM', value: p.kbmJam, fullMark: 100 },
      { subject: 'Jurnal KBM', value: p.jurnalKbm, fullMark: 100 },
      { subject: 'Perangkat', value: p.perangkatAjar, fullMark: 100 },
      { subject: 'Supervisi', value: p.supervisi, fullMark: 100 },
      { subject: 'Tugas Tambahan', value: p.tugasTambahan, fullMark: 100 },
    ];
  }, [selectedTeacher]);

  const handleSavePrivateNote = useCallback(() => {
    if (!noteInput.trim()) return;
    toast.success('Catatan pembinaan rahasia berhasil disimpan');
    setNoteInput('');
  }, [noteInput]);

  return (
    <AcademicPageLayout
      breadcrumbs={[]}
      instruction={{
        title: 'Mockup Evaluasi Kinerja Guru 360°',
        description: 'Kerangka analitik performa guru lintas modul (Presensi, KBM, Jurnal, Perangkat Ajar, & Supervisi) khusus Kurikulum & Kepala Sekolah.',
        items: [
          { text: 'Pantau nilai indeks kinerja guru secara transparan dan terukur.' },
          { text: 'Klik baris guru untuk membuka Lembar Dossier 360° lengkap beserta radar kekuatan.' },
          { text: 'Gunakan filter grade untuk mendeteksi guru yang memerlukan pembinaan akademik.' }
        ]
      }}
      hardeningModuleKey="kurikulum_evaluasi"
    >
      <div className="space-y-6 pt-1">
        {/* ── HEADER BANNER: EXECUTIVE PORTAL ── */}
        <div className="p-5 sm:p-6 rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border border-indigo-500/20">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-[10px] font-black uppercase tracking-wider text-indigo-300">
                🔒 Pimpinan &amp; Waka Only
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-[10px] font-black uppercase tracking-wider text-emerald-300">
                ✨ Live Matrix Prototype
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight flex items-center gap-2">
              <span>Evaluasi &amp; Rapor Kinerja Guru 360°</span>
            </h1>
            <p className="text-xs text-slate-300 font-medium max-w-2xl leading-relaxed">
              Integrasi analitik performa guru dari 5 modul utama: Presensi Gerbang, KBM, Jurnal Mandiri, Dokumen Ajar, dan Hasil Supervisi Akademik.
            </p>
          </div>

          <div className="flex items-center gap-2.5 self-end md:self-auto shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => toast.success('Format PDF Rapor Kinerja Guru siap diexport!')}
              className="bg-white/10 hover:bg-white/20 text-white border-white/20 text-xs font-black rounded-xl"
            >
              <Printer size={14} className="mr-1.5" />
              <span>Cetak Laporan</span>
            </Button>
          </div>
        </div>

        {/* ── TOP STATS: 5 KARTU METRIK EKSEKUTIF ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
          <AnalyticsCard
            variant="premium"
            title="RATA-RATA KINERJA"
            value={`${summaryStats.avgScore}%`}
            subtitle="Indeks Rata-rata Guru"
            icon={<Award size={18} className="text-white" />}
            gradient="from-indigo-600 to-indigo-800"
          />
          <AnalyticsCard
            variant="premium"
            title="DISIPLIN PRESENSI"
            value={`${summaryStats.avgPresensi}%`}
            subtitle="Rata-rata Masuk Tepat"
            icon={<Clock size={18} className="text-white" />}
            gradient="from-blue-600 to-cyan-700"
          />
          <AnalyticsCard
            variant="premium"
            title="KEPATUHAN JURNAL"
            value={`${summaryStats.avgJurnal}%`}
            subtitle="Input Materi KBM"
            icon={<BookOpen size={18} className="text-white" />}
            gradient="from-teal-600 to-emerald-700"
          />
          <AnalyticsCard
            variant="premium"
            title="PERANGKAT AJAR"
            value={`${summaryStats.perangkatPct}%`}
            subtitle="RPP / Modul Disetujui"
            icon={<FileText size={18} className="text-white" />}
            gradient="from-violet-600 to-purple-800"
          />
          <AnalyticsCard
            variant="premium"
            title="PERLU PEMBINAAN"
            value={`${summaryStats.needGuidanceCount} Guru`}
            subtitle="Skor di Bawah 70%"
            icon={<ShieldAlert size={18} className="text-white" />}
            gradient="from-rose-600 to-rose-800"
          />
        </div>

        {/* ── FILTER CONTROLS & SEARCH BAR ── */}
        <Card className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 shadow-xs">
          <div className="flex flex-col md:flex-row items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative w-full md:w-80">
              <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input aria-label="Input evaluasi guru" 
                type="text"
                placeholder="Cari guru, NIP, atau mata pelajaran..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-xs font-semibold rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-2 flex-wrap w-full md:w-auto justify-end">
              <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl">
                <span className="text-[10px] font-black text-slate-500 uppercase px-2">Grade:</span>
                {['ALL', 'A', 'B', 'C', 'D']?.map((g) => (
                  <button
                    key={g}
                    onClick={() => setGradeFilter(g)}
                    className={cn(
                      "px-2.5 py-1 rounded-lg text-xs font-black transition-all cursor-pointer",
                      gradeFilter === g
                        ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs"
                        : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
                    )}
                  >
                    {g === 'ALL' ? 'Semua' : `Grade ${g}`}
                  </button>
                ))}
              </div>

              <SearchableSelect
    id="eval_select"
    aria-label="Pilih Guru Evaluasi"
    options={[
      { value: 'all', label: 'Semua Guru' },
      { value: 'active', label: 'Guru Aktif' }
    ]}
    placeholder="Pilih Guru..."
  />
            </div>
          </div>
        </Card>

        {/* ── TEACHER EVALUATION MATRIX TABLE ── */}
        <Card className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 shadow-xs overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-sm">
                📋
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">
                  Matriks Skor Kinerja ({filteredRecords.length} Guru)
                </h3>
                <p className="text-[11px] text-slate-400 font-medium">
                  Klik baris guru untuk membuka dossier evaluasi mendalam 360 derajat
                </p>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 dark:bg-slate-800/40 text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-800">
                  <th className="py-3 px-4">Guru &amp; Jabatan</th>
                  <th className="py-3 px-3 text-center">Presensi (25%)</th>
                  <th className="py-3 px-3 text-center">Jam KBM (15%)</th>
                  <th className="py-3 px-3 text-center">Jurnal (15%)</th>
                  <th className="py-3 px-3 text-center">Perangkat (20%)</th>
                  <th className="py-3 px-3 text-center">Supervisi (15%)</th>
                  <th className="py-3 px-3 text-center">Tugas Tambahan (10%)</th>
                  <th className="py-3 px-4 text-center">Skor Akhir</th>
                  <th className="py-3 px-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-xs">
                {filteredRecords?.map((t) => {
                  const finalScore = calculateTotalScore(t.pillarScores);
                  const gradeInfo = getScoreGrade(finalScore);

                  return (
                    <tr
                      key={t.id}
                      onClick={() => setSelectedTeacher(t)}
                      className="hover:bg-indigo-50/40 dark:hover:bg-indigo-950/20 transition-colors cursor-pointer group"
                    >
                      {/* Teacher Profile */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white font-black flex items-center justify-center text-sm shadow-sm shrink-0">
                            {t.nama.charAt(0)}
                          </div>
                          <div className="min-w-0">
                            <h4 className="font-bold text-slate-900 dark:text-white truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                              {t.nama}
                            </h4>
                            <p className="text-[10px] text-slate-400 font-medium truncate">
                              NIP: {t.nip} • <span className="font-semibold text-slate-500 dark:text-slate-300">{t.jabatan}</span>
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Presensi */}
                      <td className="py-3.5 px-3 text-center">
                        <span className={cn(
                          "px-2 py-0.5 rounded-lg font-black text-xs",
                          t.pillarScores.presensi >= 90 ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300" :
                          t.pillarScores.presensi >= 75 ? "bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300" :
                          "bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300"
                        )}>
                          {t.pillarScores.presensi}%
                        </span>
                      </td>

                      {/* Jam KBM */}
                      <td className="py-3.5 px-3 text-center">
                        <span className="font-bold text-slate-700 dark:text-slate-300">
                          {t.pillarScores.kbmJam}%
                        </span>
                      </td>

                      {/* Jurnal KBM */}
                      <td className="py-3.5 px-3 text-center">
                        <span className={cn(
                          "font-bold",
                          t.pillarScores.jurnalKbm < 70 ? "text-rose-600 dark:text-rose-400" : "text-slate-700 dark:text-slate-300"
                        )}>
                          {t.pillarScores.jurnalKbm}%
                        </span>
                      </td>

                      {/* Perangkat Ajar */}
                      <td className="py-3.5 px-3 text-center">
                        <span className={cn(
                          "px-2 py-0.5 rounded-md text-[10px] font-black uppercase",
                          t.metrics.perangkatStatus === 'LENGKAP' ? "bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800" :
                          t.metrics.perangkatStatus === 'REVIEW' ? "bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800" :
                          "bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800"
                        )}>
                          {t.metrics.perangkatStatus}
                        </span>
                      </td>

                      {/* Supervisi */}
                      <td className="py-3.5 px-3 text-center font-bold text-slate-800 dark:text-slate-200">
                        {t.pillarScores.supervisi}
                      </td>

                      {/* Tugas Tambahan */}
                      <td className="py-3.5 px-3 text-center font-bold text-slate-600 dark:text-slate-400">
                        {t.pillarScores.tugasTambahan}%
                      </td>

                      {/* Total Score & Grade Badge */}
                      <td className="py-3.5 px-4 text-center">
                        <div className="inline-flex items-center gap-1.5">
                          <span className="font-black text-sm text-slate-900 dark:text-white">
                            {finalScore}
                          </span>
                          <span className={cn(
                            "px-2 py-0.5 rounded-md text-[10px] font-black border uppercase",
                            gradeInfo.bg, gradeInfo.color, gradeInfo.border
                          )}>
                            Grade {gradeInfo.grade}
                          </span>
                        </div>
                      </td>

                      {/* Action */}
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedTeacher(t);
                          }}
                          className="px-3 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-indigo-600 hover:text-white dark:hover:bg-indigo-600 text-slate-700 dark:text-slate-300 text-xs font-bold transition-all inline-flex items-center gap-1 cursor-pointer"
                        >
                          <span>Dossier</span>
                          <ChevronRight size={13} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>

        {/* ── MODAL DRAWER: LEMBAR DOSSIER 360° GURU ── */}
        <AnimatePresence>
          {selectedTeacher && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-xs">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                className="bg-white dark:bg-slate-900 w-full max-w-4xl max-h-[90vh] rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col"
              >
                {/* Modal Header */}
                <div className="p-5 sm:p-6 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-start justify-between border-b border-indigo-900/40">
                  <div className="flex items-center gap-3.5">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-500 text-white font-black text-xl flex items-center justify-center shadow-md">
                      {selectedTeacher.nama.charAt(0)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-base sm:text-lg font-black">{selectedTeacher.nama}</h2>
                        <span className="px-2 py-0.5 rounded-full bg-white/20 text-[10px] font-black uppercase">
                          {selectedTeacher.statusKepegawaian}
                        </span>
                      </div>
                      <p className="text-xs text-indigo-200 font-medium">
                        NIP: {selectedTeacher.nip} • {selectedTeacher.mapel}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => setSelectedTeacher(null)}
                    className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
                  >
                    <X size={18} />
                  </button>
                </div>

                {/* Modal Body (Scrollable) */}
                <div className="p-6 overflow-y-auto space-y-6 flex-1">
                  {/* Row 1: Radar Chart & Score Grade Overview */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                    {/* Radar Chart */}
                    <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 flex flex-col items-center justify-center">
                      <h4 className="text-xs font-black uppercase tracking-wider text-slate-500 mb-2">
                        Radar Kompetensi &amp; Disiplin 5 Dimensi
                      </h4>
                      <div className="w-full h-56">
                        <ResponsiveContainer width="100%" height="100%">
                          <RadarChart data={radarData}>
                            <PolarGrid stroke="" className="dark:stroke-slate-700" />
                            <PolarAngleAxis dataKey="subject" stroke="" fontSize={10} />
                            <PolarRadiusAxis angle={30} domain={[0, 100]} stroke="" fontSize={9} />
                            <Radar name="Skor Guru" dataKey="value" stroke="" fill="" fillOpacity={0.4} />
                          </RadarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    {/* Final Score & System Recommendation */}
                    <div className="space-y-4">
                      <div className="p-4 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/40 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-indigo-900 dark:text-indigo-300">
                            Indeks Komposit Kinerja
                          </span>
                          <span className="text-2xl font-black text-indigo-600 dark:text-indigo-400">
                            {calculateTotalScore(selectedTeacher.pillarScores)} / 100
                          </span>
                        </div>
                        <div className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
                          <strong>Predikat:</strong> {getScoreGrade(calculateTotalScore(selectedTeacher.pillarScores)).label} (Grade {getScoreGrade(calculateTotalScore(selectedTeacher.pillarScores)).grade})
                        </div>
                      </div>

                      <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 space-y-1.5">
                        <h5 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                          <Sparkles size={14} className="text-amber-500" />
                          <span>Rekomendasi Analitik Sistem:</span>
                        </h5>
                        <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                          {selectedTeacher.rekomendasi}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Row 2: Detail Metrics Matrix */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-black uppercase tracking-wider text-slate-500">
                      Rincian Metrik Riil Lintas Modul
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 sm:grid-cols-4 gap-3">
                      <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                        <span className="text-[10px] text-slate-400 font-bold uppercase">Kehadiran Gerbang</span>
                        <h5 className="text-base font-black text-slate-900 dark:text-white mt-1">
                          {selectedTeacher.metrics.kehadiranPct}%
                        </h5>
                        <p className="text-[10px] text-slate-500">Telat: {selectedTeacher.metrics.keterlambatanMenit} menit</p>
                      </div>

                      <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                        <span className="text-[10px] text-slate-400 font-bold uppercase">Jam KBM Realisasi</span>
                        <h5 className="text-base font-black text-slate-900 dark:text-white mt-1">
                          {selectedTeacher.metrics.jamMengajarRealisasi} / {selectedTeacher.metrics.jamMengajarTotal} JP
                        </h5>
                        <p className="text-[10px] text-slate-500">Keterisian Jurnal: {selectedTeacher.metrics.jurnalTerisiPct}%</p>
                      </div>

                      <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                        <span className="text-[10px] text-slate-400 font-bold uppercase">Perangkat Ajar (RPP)</span>
                        <h5 className="text-base font-black text-slate-900 dark:text-white mt-1">
                          {selectedTeacher.metrics.perangkatStatus}
                        </h5>
                        <p className="text-[10px] text-slate-500">Disetujui Kurikulum</p>
                      </div>

                      <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                        <span className="text-[10px] text-slate-400 font-bold uppercase">Skor Supervisi</span>
                        <h5 className="text-base font-black text-slate-900 dark:text-white mt-1">
                          {selectedTeacher.metrics.supervisiSkor} / 100
                        </h5>
                        <p className="text-[10px] text-slate-500">Tgl: {selectedTeacher.metrics.supervisiTanggal}</p>
                      </div>
                    </div>
                  </div>

                  {/* Row 3: Catatan Supervisi & Catatan Pembinaan Rahasia */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Supervisi Notes */}
                    <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 space-y-1.5">
                      <span className="text-[11px] font-black uppercase tracking-wider text-slate-500">
                        Catatan Observasi Kepala Sekolah:
                      </span>
                      <p className="text-xs text-slate-700 dark:text-slate-300 italic">
                        "{selectedTeacher.metrics.catatanPenilai}"
                      </p>
                    </div>

                    {/* Private Guidance Notes */}
                    <div className="p-4 rounded-2xl bg-amber-50/40 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-800/60 space-y-2">
                      <span className="text-[11px] font-black uppercase tracking-wider text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                        <MessageSquare size={13} />
                        <span>Catatan Pembinaan Khusus (Privat Pimpinan):</span>
                      </span>
                      {selectedTeacher.pembinaanKhusus && (
                        <p className="text-xs text-rose-700 dark:text-rose-300 font-semibold bg-rose-50 dark:bg-rose-950/40 p-2 rounded-xl border border-rose-200 dark:border-rose-800">
                          {selectedTeacher.pembinaanKhusus}
                        </p>
                      )}
                      <div className="flex gap-2">
                        <input aria-label="Input evaluasi guru" 
                          type="text"
                          placeholder="Tambah catatan pembinaan rahasia..."
                          value={noteInput}
                          onChange={(e) => setNoteInput(e.target.value)}
                          className="flex-1 px-3 py-1.5 text-xs rounded-xl bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-700 text-slate-900 dark:text-white"
                        />
                        <Button size="sm" onClick={handleSavePrivateNote} className="text-xs font-bold px-3">
                          Simpan
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Modal Footer Actions */}
                <div className="p-4 sm:p-5 bg-slate-50 dark:bg-slate-800 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
                  <span className="text-[11px] text-slate-400 font-medium">
                    Dokumen ini bersifat rahasia untuk Waka Kurikulum &amp; Kepala Sekolah
                  </span>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => toast.success(`Rapor kinerja ${selectedTeacher.nama} siap dicetak!`)}
                      className="text-xs font-bold rounded-xl"
                    >
                      <Download size={14} className="mr-1.5" />
                      <span>Export Rapor PDF</span>
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => setSelectedTeacher(null)}
                      className="text-xs font-bold rounded-xl bg-slate-900 text-white dark:bg-white dark:text-slate-900"
                    >
                      Tutup Dossier
                    </Button>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </AcademicPageLayout>
  );
}
