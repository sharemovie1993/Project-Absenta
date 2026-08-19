import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Smartphone, ShieldAlert, CheckCircle2, AlertTriangle, Users,
  BookOpen, Clock, Send, MessageSquare, Search, Filter,
  TrendingUp, Activity, UserCheck, ShieldCheck, Download,
  ExternalLink, Sparkles, RefreshCw, X, AlertCircle, Phone,
  FileText, ScanFace, ChevronRight, HelpCircle, Layers
} from 'lucide-react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell,
  PieChart, Pie, CartesianGrid
} from 'recharts';

import { AcademicPageLayout } from '@/components/academic/AcademicPageLayout';
import { AnalyticsCard } from '@/components/ui/AnalyticsCard';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui';
import { cn } from '@/lib/utils';
import { toast } from 'react-hot-toast';

// ── Types & Interfaces ──
export interface TeacherComplianceItem {
  id: string;
  nama: string;
  nip: string;
  noWa: string;
  mapel: string;
  jabatan: string;
  lastLoginText: string;
  lastLoginDaysAgo: number;
  faceIdEnrolled: boolean;
  jurnalDigitalPct: number;
  sesiMandiriPct: number;
  rppUploaded: 'LENGKAP' | 'REVIEW' | 'BELUM';
  complianceScore: number; // 0 - 100
  issues: string[];
}

export interface StudentComplianceItem {
  id: string;
  nama: string;
  nisn: string;
  kelas: string;
  noWaOrtu: string;
  lastLoginText: string;
  lastLoginDaysAgo: number;
  faceIdEnrolled: boolean;
  izinDigitalUsed: boolean;
  cbtActive: boolean;
  complianceScore: number; // 0 - 100
  issues: string[];
}

// ── Mock Datasets ──
const MOCK_TEACHERS_COMPLIANCE: TeacherComplianceItem[] = [
  {
    id: 'tc-1',
    nama: 'Hendra Gunawan, S.Kom.',
    nip: '199501252023211005',
    noWa: '081234567890',
    mapel: 'Basis Data & SQL',
    jabatan: 'Guru Mapel',
    lastLoginText: '12 hari yang lalu',
    lastLoginDaysAgo: 12,
    faceIdEnrolled: false,
    jurnalDigitalPct: 0,
    sesiMandiriPct: 20,
    rppUploaded: 'BELUM',
    complianceScore: 28,
    issues: ['Tidak pernah login > 7 hari', 'Jurnal KBM 0% terisi digital', 'Belum rekam biometrik Wajah', 'RPP belum diunggah']
  },
  {
    id: 'tc-2',
    nama: 'Ahmad Fauzi, S.T.',
    nip: '199208152020121008',
    noWa: '081398765432',
    mapel: 'Dasar-Dasar TKJ',
    jabatan: 'Guru Mapel',
    lastLoginText: '4 hari yang lalu',
    lastLoginDaysAgo: 4,
    faceIdEnrolled: true,
    jurnalDigitalPct: 55,
    sesiMandiriPct: 60,
    rppUploaded: 'REVIEW',
    complianceScore: 64,
    issues: ['Jurnal KBM tertunda beberapa sesi', 'Revisi RPP belum diselesaikan']
  },
  {
    id: 'tc-3',
    nama: 'Siti Rahmawati, S.Pd.',
    nip: '198904212014022003',
    noWa: '085712348899',
    mapel: 'Bahasa Inggris Lanjut',
    jabatan: 'Petugas Piket',
    lastLoginText: 'Kemarin (18:20)',
    lastLoginDaysAgo: 1,
    faceIdEnrolled: true,
    jurnalDigitalPct: 82,
    sesiMandiriPct: 90,
    rppUploaded: 'LENGKAP',
    complianceScore: 88,
    issues: ['Sesi jurnal KBM terlambat diisi 1 hari']
  },
  {
    id: 'tc-4',
    nama: 'Budi Santoso, M.Kom.',
    nip: '198205122008011004',
    noWa: '081122334455',
    mapel: 'Pemrograman Web',
    jabatan: 'Wali Kelas XII RPL 1',
    lastLoginText: 'Hari ini (07:15)',
    lastLoginDaysAgo: 0,
    faceIdEnrolled: true,
    jurnalDigitalPct: 98,
    sesiMandiriPct: 100,
    rppUploaded: 'LENGKAP',
    complianceScore: 98,
    issues: []
  },
  {
    id: 'tc-5',
    nama: 'Drs. H. Mulyono',
    nip: '196702141993031002',
    noWa: '081299887766',
    mapel: 'Pendidikan Pancasila',
    jabatan: 'Guru Senior',
    lastLoginText: '18 hari yang lalu',
    lastLoginDaysAgo: 18,
    faceIdEnrolled: false,
    jurnalDigitalPct: 10,
    sesiMandiriPct: 15,
    rppUploaded: 'BELUM',
    complianceScore: 22,
    issues: ['Bypass sistem (selalu absen manual via piket)', 'Belum rekam wajah', 'Tidak pernah input jurnal KBM']
  }
];

const MOCK_STUDENTS_COMPLIANCE: StudentComplianceItem[] = [
  {
    id: 'st-1',
    nama: 'Dimas Pratama',
    nisn: '0068129381',
    kelas: 'XI RPL 2',
    noWaOrtu: '081311223344',
    lastLoginText: 'Belum Pernah',
    lastLoginDaysAgo: 999,
    faceIdEnrolled: false,
    izinDigitalUsed: false,
    cbtActive: false,
    complianceScore: 15,
    issues: ['Belum pernah login portal siswa', 'Belum rekam wajah Face ID di gerbang', 'Orang tua belum terhubung WA']
  },
  {
    id: 'st-2',
    nama: 'Anisa Nurul Aini',
    nisn: '0071293849',
    kelas: 'X TKJ 1',
    noWaOrtu: '085899887711',
    lastLoginText: 'Hari ini (06:45)',
    lastLoginDaysAgo: 0,
    faceIdEnrolled: true,
    izinDigitalUsed: true,
    cbtActive: true,
    complianceScore: 95,
    issues: []
  },
  {
    id: 'st-3',
    nama: 'Rifky Firmansyah',
    nisn: '0059918234',
    kelas: 'XII TBSM 3',
    noWaOrtu: '087766554433',
    lastLoginText: '8 hari yang lalu',
    lastLoginDaysAgo: 8,
    faceIdEnrolled: false,
    izinDigitalUsed: false,
    cbtActive: true,
    complianceScore: 45,
    issues: ['Face ID belum terdaftar (sering antre gerbang manual)', 'Tidak pernah cek rekap presensi mandiri']
  },
  {
    id: 'st-4',
    nama: 'Zahra Amelia',
    nisn: '0067382910',
    kelas: 'XI DKV 1',
    noWaOrtu: '081900112233',
    lastLoginText: '3 hari yang lalu',
    lastLoginDaysAgo: 3,
    faceIdEnrolled: true,
    izinDigitalUsed: true,
    cbtActive: true,
    complianceScore: 78,
    issues: ['Perlu verifikasi nomor WA wali murid']
  }
];

export function getComplianceBadge(score: number) {
  if (score >= 80) return { label: 'Digital Native', grade: '🟢 Aktif', color: 'text-emerald-700 dark:text-emerald-300', bg: 'bg-emerald-50 dark:bg-emerald-950/50', border: 'border-emerald-200 dark:border-emerald-800' };
  if (score >= 50) return { label: 'Perlu Pengingat', grade: '🟡 Pasif', color: 'text-amber-700 dark:text-amber-300', bg: 'bg-amber-50 dark:bg-amber-950/50', border: 'border-amber-200 dark:border-amber-800' };
  return { label: 'Non-Compliant', grade: '🔴 Tidak Pakai', color: 'text-rose-700 dark:text-rose-300', bg: 'bg-rose-50 dark:bg-rose-950/50', border: 'border-rose-200 dark:border-rose-800' };
}

export default function PlatformComplianceFollowUpPage() {
  const [activeTab, setActiveTab] = useState<'GURU' | 'SISWA' | 'TREND'>('GURU');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'PASSIVE' | 'DORMANT'>('ALL');
  const [selectedIssueFilter, setSelectedIssueFilter] = useState<string>('ALL');

  // WhatsApp Nudge Modal State
  const [nudgeModalTarget, setNudgeModalTarget] = useState<{
    nama: string;
    role: 'GURU' | 'SISWA';
    noWa: string;
    issues: string[];
    customMessage?: string;
  } | null>(null);

  const [messageTemplate, setMessageTemplate] = useState<'JURNAL' | 'FACE_ID' | 'LOGIN_PORTAL' | 'RPP'>('JURNAL');

  // Filtered Teachers
  const filteredTeachers = useMemo(() => {
    return MOCK_TEACHERS_COMPLIANCE.filter(t => {
      const matchSearch = t.nama.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.nip.includes(searchTerm) ||
        t.mapel.toLowerCase().includes(searchTerm.toLowerCase());
      
      let matchStatus = true;
      if (statusFilter === 'ACTIVE') matchStatus = t.complianceScore >= 80;
      else if (statusFilter === 'PASSIVE') matchStatus = t.complianceScore >= 50 && t.complianceScore < 80;
      else if (statusFilter === 'DORMANT') matchStatus = t.complianceScore < 50;

      let matchIssue = true;
      if (selectedIssueFilter === 'NO_FACE') matchIssue = !t.faceIdEnrolled;
      else if (selectedIssueFilter === 'NO_JURNAL') matchIssue = t.jurnalDigitalPct < 50;
      else if (selectedIssueFilter === 'NO_LOGIN') matchIssue = t.lastLoginDaysAgo > 7;
      else if (selectedIssueFilter === 'NO_RPP') matchIssue = t.rppUploaded === 'BELUM';

      return matchSearch && matchStatus && matchIssue;
    });
  }, [searchTerm, statusFilter, selectedIssueFilter]);

  // Filtered Students
  const filteredStudents = useMemo(() => {
    return MOCK_STUDENTS_COMPLIANCE.filter(s => {
      const matchSearch = s.nama.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.nisn.includes(searchTerm) ||
        s.kelas.toLowerCase().includes(searchTerm.toLowerCase());
      
      let matchStatus = true;
      if (statusFilter === 'ACTIVE') matchStatus = s.complianceScore >= 80;
      else if (statusFilter === 'PASSIVE') matchStatus = s.complianceScore >= 50 && s.complianceScore < 80;
      else if (statusFilter === 'DORMANT') matchStatus = s.complianceScore < 50;

      let matchIssue = true;
      if (selectedIssueFilter === 'NO_FACE') matchIssue = !s.faceIdEnrolled;
      else if (selectedIssueFilter === 'NO_LOGIN') matchIssue = s.lastLoginDaysAgo > 7;

      return matchSearch && matchStatus && matchIssue;
    });
  }, [searchTerm, statusFilter, selectedIssueFilter]);

  const handleOpenNudgeModal = (item: TeacherComplianceItem | StudentComplianceItem, role: 'GURU' | 'SISWA') => {
    const noWa = 'noWa' in item ? item.noWa : item.noWaOrtu;
    setNudgeModalTarget({
      nama: item.nama,
      role,
      noWa,
      issues: item.issues
    });
  };

  const handleSendWhatsAppNudge = () => {
    if (!nudgeModalTarget) return;
    toast.success(`Pesan pengingat WhatsApp berhasil dikirim ke ${nudgeModalTarget.nama} (${nudgeModalTarget.noWa})!`, {
      icon: '📲',
      duration: 4000
    });
    setNudgeModalTarget(null);
  };

  return (
    <AcademicPageLayout
      breadcrumbs={[]}
      instruction={{
        title: 'Pusat Evaluasi Kepatuhan & Adopsi Platform',
        description: 'Alat kendali IT & Pimpinan untuk memantau, mendeteksi guru/siswa yang pasif, serta melakukan follow-up instan via WhatsApp.',
        items: [
          { text: 'Pantau persentase kepatuhan digital KBM, presensi gerbang, dan kelengkapan profil.' },
          { text: 'Gunakan tombol [Kirim Nudge WA] untuk mengirimkan pesan pengingat personal secara instan.' },
          { text: 'Deteksi guru atau siswa yang masih melakukan bypass presensi manual.' }
        ]
      }}
      hardeningModuleKey="platform_compliance"
    >
      <div className="space-y-6 pt-1">
        {/* ── HEADER BANNER: COMMAND CENTER ── */}
        <div className="p-5 sm:p-6 rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border border-indigo-500/20">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-[10px] font-black uppercase tracking-wider text-indigo-300">
                🔒 Admin &amp; IT Command Center
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-[10px] font-black uppercase tracking-wider text-emerald-300">
                ⚡ Digital Adoption Audit
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight flex items-center gap-2">
              <span>Radar Kepatuhan &amp; Adopsi Platform</span>
            </h1>
            <p className="text-xs text-slate-300 font-medium max-w-2xl leading-relaxed">
              Monitoring kepatuhan digital guru &amp; siswa secara real-time. Deteksi akun pasif, jurnal kosong, dan bypass manual untuk segera ditindaklanjuti.
            </p>
          </div>

          <div className="flex items-center gap-2.5 self-end md:self-auto shrink-0 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={() => toast.success('Daftar target follow-up berhasil diekspor ke Excel!')}
              className="bg-white/10 hover:bg-white/20 text-white border-white/20 text-xs font-black rounded-xl"
            >
              <Download size={14} className="mr-1.5" />
              <span>Export Target (Excel)</span>
            </Button>
            <Button
              size="sm"
              onClick={() => toast.success('Broadcast pengingat masal dikirimkan ke 5 Guru & 24 Siswa!')}
              className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black rounded-xl shadow-md"
            >
              <Send size={14} className="mr-1.5" />
              <span>Broadcast Pengingat Masal</span>
            </Button>
          </div>
        </div>

        {/* ── TOP STATS: 5 KARTU METRIK ADOPSI PLATFORM ── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
          <AnalyticsCard
            variant="premium"
            title="ADOPSI GURU"
            value="84.5%"
            subtitle="87 dari 103 Guru Aktif"
            icon={<Users size={18} className="text-white" />}
            gradient="from-indigo-600 to-indigo-800"
          />
          <AnalyticsCard
            variant="premium"
            title="JURNAL DIGITAL"
            value="76.2%"
            subtitle="KBM Diinput Mandiri"
            icon={<BookOpen size={18} className="text-white" />}
            gradient="from-teal-600 to-emerald-700"
          />
          <AnalyticsCard
            variant="premium"
            title="REKAM BIOMETRIK"
            value="92.4%"
            subtitle="Face ID Terdaftar"
            icon={<ScanFace size={18} className="text-white" />}
            gradient="from-blue-600 to-cyan-700"
          />
          <AnalyticsCard
            variant="premium"
            title="AKTIVITAS SISWA"
            value="88.0%"
            subtitle="Login Portal / PWA"
            icon={<Smartphone size={18} className="text-white" />}
            gradient="from-violet-600 to-purple-800"
          />
          <AnalyticsCard
            variant="premium"
            title="PERLU FOLLOW-UP"
            value="29 Akun"
            subtitle="5 Guru • 24 Siswa Pasif"
            icon={<ShieldAlert size={18} className="text-white" />}
            gradient="from-rose-600 to-rose-800"
          />
        </div>

        {/* ── TAB SWITCHER: GURU VS SISWA VS TREN ── */}
        <div className="flex items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-2">
          <div className="flex items-center gap-2">
            <button
              onClick={() => { setActiveTab('GURU'); setSelectedIssueFilter('ALL'); }}
              className={cn(
                "px-4 py-2 rounded-2xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer",
                activeTab === 'GURU'
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/20"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
              )}
            >
              <span>👨‍🏫 Kepatuhan Guru</span>
              <span className="px-1.5 py-0.5 rounded-full bg-white/20 text-[10px]">
                {MOCK_TEACHERS_COMPLIANCE.length}
              </span>
            </button>

            <button
              onClick={() => { setActiveTab('SISWA'); setSelectedIssueFilter('ALL'); }}
              className={cn(
                "px-4 py-2 rounded-2xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer",
                activeTab === 'SISWA'
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/20"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
              )}
            >
              <span>👨‍🎓 Kepatuhan Siswa</span>
              <span className="px-1.5 py-0.5 rounded-full bg-white/20 text-[10px]">
                {MOCK_STUDENTS_COMPLIANCE.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('TREND')}
              className={cn(
                "px-4 py-2 rounded-2xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer",
                activeTab === 'TREND'
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/20"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
              )}
            >
              <TrendingUp size={14} />
              <span>Analisis Tren Adopsi</span>
            </button>
          </div>
        </div>

        {activeTab !== 'TREND' && (
          <>
            {/* ── FILTER & QUICK SEARCH TOOLBAR ── */}
            <Card className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 shadow-xs">
              <div className="flex flex-col md:flex-row items-center justify-between gap-3">
                {/* Search */}
                <div className="relative w-full md:w-80">
                  <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder={activeTab === 'GURU' ? "Cari nama guru, NIP, atau mapel..." : "Cari nama siswa, NISN, atau kelas..."}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 text-xs font-semibold rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                {/* Status & Issue Filter */}
                <div className="flex items-center gap-2 flex-wrap w-full md:w-auto justify-end">
                  <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl">
                    <span className="text-[10px] font-black text-slate-500 uppercase px-2">Status:</span>
                    {[
                      { id: 'ALL', label: 'Semua' },
                      { id: 'ACTIVE', label: '🟢 Aktif' },
                      { id: 'PASSIVE', label: '🟡 Pasif' },
                      { id: 'DORMANT', label: '🔴 Tidak Pakai' },
                    ].map((s) => (
                      <button
                        key={s.id}
                        onClick={() => setStatusFilter(s.id as any)}
                        className={cn(
                          "px-2.5 py-1 rounded-lg text-xs font-black transition-all cursor-pointer",
                          statusFilter === s.id
                            ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs"
                            : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
                        )}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>

                  <select
                    value={selectedIssueFilter}
                    onChange={(e) => setSelectedIssueFilter(e.target.value)}
                    className="px-3 py-1.5 text-xs font-bold rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 focus:outline-none cursor-pointer"
                  >
                    <option value="ALL">Semua Isu Kepatuhan</option>
                    <option value="NO_FACE">❌ Belum Rekam Wajah (Face ID)</option>
                    <option value="NO_LOGIN">❌ Tidak Pernah Login &gt; 7 Hari</option>
                    {activeTab === 'GURU' && <option value="NO_JURNAL">❌ Jurnal KBM Kosong / Rendah</option>}
                    {activeTab === 'GURU' && <option value="NO_RPP">❌ RPP Belum Upload</option>}
                  </select>
                </div>
              </div>
            </Card>

            {/* ── GURU COMPLIANCE LIST ── */}
            {activeTab === 'GURU' && (
              <Card className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 shadow-xs overflow-hidden">
                <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-sm">
                      👨‍🏫
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">
                        Daftar Kepatuhan Digital Guru ({filteredTeachers.length} Guru)
                      </h3>
                      <p className="text-[11px] text-slate-400 font-medium">
                        Kirim pesan pengingat langsung ke nomor WhatsApp guru yang bersangkutan
                      </p>
                    </div>
                  </div>
                </div>

                <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {filteredTeachers.map((teacher) => {
                    const badge = getComplianceBadge(teacher.complianceScore);
                    const isUrgent = teacher.complianceScore < 50;

                    return (
                      <div
                        key={teacher.id}
                        className={cn(
                          "p-4 sm:p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 transition-colors hover:bg-slate-50/70 dark:hover:bg-slate-850/50",
                          isUrgent && "bg-rose-50/20 dark:bg-rose-950/10"
                        )}
                      >
                        {/* Profile Info */}
                        <div className="flex items-start gap-3.5 min-w-0 flex-1">
                          <div className={cn(
                            "w-10 h-10 rounded-2xl flex items-center justify-center font-black text-sm text-white shrink-0 shadow-sm",
                            isUrgent ? "bg-rose-600" : "bg-indigo-600"
                          )}>
                            {teacher.nama.charAt(0)}
                          </div>
                          <div className="space-y-1 min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="font-black text-sm text-slate-900 dark:text-white truncate">
                                {teacher.nama}
                              </h4>
                              <span className={cn(
                                "px-2 py-0.5 rounded-md text-[10px] font-black border uppercase",
                                badge.bg, badge.color, badge.border
                              )}>
                                {badge.grade} ({teacher.complianceScore}%)
                              </span>
                            </div>
                            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                              NIP: {teacher.nip} • <strong className="text-slate-700 dark:text-slate-300">{teacher.mapel}</strong> ({teacher.jabatan})
                            </p>

                            {/* Flags Matrix */}
                            <div className="flex items-center gap-2.5 pt-1.5 flex-wrap text-[11px]">
                              <span className="flex items-center gap-1 font-semibold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">
                                <Clock size={11} className="text-indigo-500" />
                                Login: <strong className={teacher.lastLoginDaysAgo > 7 ? "text-rose-600" : ""}>{teacher.lastLoginText}</strong>
                              </span>

                              <span className="flex items-center gap-1 font-semibold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">
                                <ScanFace size={11} className={teacher.faceIdEnrolled ? "text-emerald-500" : "text-rose-500"} />
                                Face ID: <strong>{teacher.faceIdEnrolled ? 'Terdaftar' : '❌ Belum Rekam'}</strong>
                              </span>

                              <span className="flex items-center gap-1 font-semibold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">
                                <BookOpen size={11} className={teacher.jurnalDigitalPct > 70 ? "text-emerald-500" : "text-rose-500"} />
                                Jurnal KBM: <strong>{teacher.jurnalDigitalPct}%</strong>
                              </span>

                              <span className="flex items-center gap-1 font-semibold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">
                                <FileText size={11} className={teacher.rppUploaded === 'LENGKAP' ? "text-emerald-500" : "text-amber-500"} />
                                RPP: <strong>{teacher.rppUploaded}</strong>
                              </span>
                            </div>

                            {/* Issues list if any */}
                            {teacher.issues.length > 0 && (
                              <div className="flex items-center gap-1.5 pt-1 flex-wrap">
                                {teacher.issues.map((iss, i) => (
                                  <span key={i} className="text-[10px] font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 px-2 py-0.5 rounded-md border border-rose-200/60 dark:border-rose-900/40">
                                    ⚠️ {iss}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Action Nudge */}
                        <div className="flex items-center gap-2 self-end md:self-center shrink-0">
                          <Button
                            size="sm"
                            onClick={() => handleOpenNudgeModal(teacher, 'GURU')}
                            className={cn(
                              "text-xs font-black rounded-xl gap-1.5 shadow-sm",
                              isUrgent
                                ? "bg-rose-600 hover:bg-rose-500 text-white"
                                : "bg-emerald-600 hover:bg-emerald-500 text-white"
                            )}
                          >
                            <Phone size={13} />
                            <span>Kirim Nudge WA</span>
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Card>
            )}

            {/* ── SISWA COMPLIANCE LIST ── */}
            {activeTab === 'SISWA' && (
              <Card className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 shadow-xs overflow-hidden">
                <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold text-sm">
                      👨‍🎓
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">
                        Daftar Kepatuhan Digital Siswa ({filteredStudents.length} Siswa)
                      </h3>
                      <p className="text-[11px] text-slate-400 font-medium">
                        Follow-up orang tua dan siswa yang belum mengaktifkan akun atau rekam wajah
                      </p>
                    </div>
                  </div>
                </div>

                <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {filteredStudents.map((student) => {
                    const badge = getComplianceBadge(student.complianceScore);
                    const isUrgent = student.complianceScore < 50;

                    return (
                      <div
                        key={student.id}
                        className={cn(
                          "p-4 sm:p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 transition-colors hover:bg-slate-50/70 dark:hover:bg-slate-850/50",
                          isUrgent && "bg-rose-50/20 dark:bg-rose-950/10"
                        )}
                      >
                        <div className="flex items-start gap-3.5 min-w-0 flex-1">
                          <div className={cn(
                            "w-10 h-10 rounded-2xl flex items-center justify-center font-black text-sm text-white shrink-0 shadow-sm",
                            isUrgent ? "bg-rose-600" : "bg-purple-600"
                          )}>
                            {student.nama.charAt(0)}
                          </div>
                          <div className="space-y-1 min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="font-black text-sm text-slate-900 dark:text-white truncate">
                                {student.nama}
                              </h4>
                              <span className={cn(
                                "px-2 py-0.5 rounded-md text-[10px] font-black border uppercase",
                                badge.bg, badge.color, badge.border
                              )}>
                                {badge.grade} ({student.complianceScore}%)
                              </span>
                            </div>
                            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                              NISN: {student.nisn} • Kelas: <strong className="text-slate-700 dark:text-slate-300">{student.kelas}</strong>
                            </p>

                            <div className="flex items-center gap-2.5 pt-1.5 flex-wrap text-[11px]">
                              <span className="flex items-center gap-1 font-semibold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">
                                <Clock size={11} className="text-purple-500" />
                                Login: <strong className={student.lastLoginDaysAgo > 7 ? "text-rose-600" : ""}>{student.lastLoginText}</strong>
                              </span>

                              <span className="flex items-center gap-1 font-semibold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">
                                <ScanFace size={11} className={student.faceIdEnrolled ? "text-emerald-500" : "text-rose-500"} />
                                Face ID: <strong>{student.faceIdEnrolled ? 'Terdaftar' : '❌ Belum Rekam'}</strong>
                              </span>

                              <span className="flex items-center gap-1 font-semibold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">
                                <Smartphone size={11} className={student.izinDigitalUsed ? "text-emerald-500" : "text-slate-400"} />
                                Izin Digital: <strong>{student.izinDigitalUsed ? 'Aktif' : 'Manual'}</strong>
                              </span>
                            </div>

                            {student.issues.length > 0 && (
                              <div className="flex items-center gap-1.5 pt-1 flex-wrap">
                                {student.issues.map((iss, i) => (
                                  <span key={i} className="text-[10px] font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 px-2 py-0.5 rounded-md border border-rose-200/60 dark:border-rose-900/40">
                                    ⚠️ {iss}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 self-end md:self-center shrink-0">
                          <Button
                            size="sm"
                            onClick={() => handleOpenNudgeModal(student, 'SISWA')}
                            className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black rounded-xl gap-1.5 shadow-sm"
                          >
                            <Phone size={13} />
                            <span>Kirim WA ke Ortu</span>
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Card>
            )}
          </>
        )}

        {/* ── ADOPTION TRENDS TAB ── */}
        {activeTab === 'TREND' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Adoption per Module */}
              <Card className="p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
                <h3 className="text-sm font-black uppercase tracking-wider text-slate-800 dark:text-white">
                  Tingkat Kepatuhan Penggunaan per Modul Absenta
                </h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={[
                        { name: 'Presensi Gerbang', adopsi: 94 },
                        { name: 'Sesi KBM', adopsi: 82 },
                        { name: 'Jurnal Belajar', adopsi: 76 },
                        { name: 'Modul Ajar/RPP', adopsi: 68 },
                        { name: 'CBT Ujian', adopsi: 88 },
                        { name: 'Izin Keluar Siswa', adopsi: 91 },
                      ]}
                      margin={{ top: 10, right: 10, left: -20, bottom: 20 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" className="dark:stroke-slate-800" />
                      <XAxis dataKey="name" stroke="#94a3b8" fontSize={9} angle={-25} textAnchor="end" />
                      <YAxis stroke="#94a3b8" fontSize={10} domain={[0, 100]} />
                      <Tooltip formatter={(v: number) => [`${v}%`, 'Tingkat Adopsi']} />
                      <Bar dataKey="adopsi" fill="#6366f1" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Card>

              {/* Adoption Distribution Pie */}
              <Card className="p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
                <h3 className="text-sm font-black uppercase tracking-wider text-slate-800 dark:text-white">
                  Segmentasi Kesiapan Digital Guru &amp; Siswa
                </h3>
                <div className="h-64 flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={[
                          { name: '🟢 Digital Native (Rutin)', value: 84, color: '#10b981' },
                          { name: '🟡 Pasif / Perlu Diingatkan', value: 11, color: '#f59e0b' },
                          { name: '🔴 Dormant (Belum Pakai)', value: 5, color: '#ef4444' },
                        ]}
                        cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={4}
                        dataKey="value"
                      >
                        {[{ color: '#10b981' }, { color: '#f59e0b' }, { color: '#ef4444' }].map((c, i) => (
                          <Cell key={i} fill={c.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v: number) => [`${v}%`, 'Populasi']} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </Card>
            </div>
          </div>
        )}

        {/* ── MODAL: KIRIM PENGINGAT WHATSAPP INSTAN ── */}
        <AnimatePresence>
          {nudgeModalTarget && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-xs">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col"
              >
                <div className="p-5 bg-gradient-to-r from-emerald-800 to-teal-900 text-white flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center text-xl">
                      📲
                    </div>
                    <div>
                      <h3 className="font-black text-sm">Kirim Pengingat WhatsApp Resmi</h3>
                      <p className="text-[11px] text-emerald-100">
                        Kepada: <strong>{nudgeModalTarget.nama}</strong> ({nudgeModalTarget.noWa})
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setNudgeModalTarget(null)}
                    className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
                  >
                    <X size={16} />
                  </button>
                </div>

                <div className="p-6 space-y-4">
                  <div>
                    <label className="text-xs font-black uppercase tracking-wider text-slate-500 block mb-1.5">
                      Pilih Topik Pengingat:
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { id: 'JURNAL', label: '📖 Isi Jurnal KBM' },
                        { id: 'FACE_ID', label: '📸 Rekam Wajah Face ID' },
                        { id: 'RPP', label: '📁 Upload Modul/RPP' },
                        { id: 'LOGIN_PORTAL', label: '🔑 Panduan Login Portal' },
                      ].map((tpl) => (
                        <button
                          key={tpl.id}
                          onClick={() => setMessageTemplate(tpl.id as any)}
                          className={cn(
                            "p-2 rounded-xl border text-xs font-bold text-left transition-all cursor-pointer",
                            messageTemplate === tld_safe(tpl.id)
                              ? "bg-indigo-50 dark:bg-indigo-950/60 border-indigo-500 text-indigo-700 dark:text-indigo-300"
                              : "bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300"
                          )}
                        >
                          {tpl.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Preview WhatsApp Chat Message */}
                  <div className="space-y-1.5">
                    <span className="text-[11px] font-black uppercase text-slate-400">
                      Preview Pesan WhatsApp (Personalized):
                    </span>
                    <div className="p-3.5 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/60 text-xs font-medium text-slate-800 dark:text-slate-200 space-y-2 leading-relaxed">
                      <p>
                        Halo Bpk/Ibu/Sdr <strong>{nudgeModalTarget.nama}</strong>,
                      </p>
                      <p>
                        {messageTemplate === 'JURNAL' && 'Sistem Absenta mencatat Anda belum mengisi Jurnal KBM dan Presensi Siswa pada beberapa sesi mengajar minggu ini. Mohon segera mengakses platform untuk memutakhirkan jurnal kelas.'}
                        {messageTemplate === 'FACE_ID' && 'Sistem mencatat profil biometrik Wajah (Face ID) Anda belum terdaftar. Mohon segera melakukan perekaman mandiri atau hubungi petugas IT sekolah untuk aktivasi presensi cepat di gerbang.'}
                        {messageTemplate === 'RPP' && 'Mengingatkan kembali bahwa batas pengunggahan Modul Ajar / RPP Kurikulum Merdeka akan segera ditutup. Silakan unggah dokumen Anda melalui menu Perangkat Ajar.'}
                        {messageTemplate === 'LOGIN_PORTAL' && 'Akun Portal Siswa Anda telah aktif. Silakan masuk ke https://absenta.id menggunakan nomor NISN Anda untuk melihat jadwal dan rekap presensi.'}
                      </p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 italic">
                        — Tim IT &amp; Manajemen Absenta Sekolah
                      </p>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-slate-50 dark:bg-slate-850 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setNudgeModalTarget(null)}
                    className="text-xs font-bold rounded-xl"
                  >
                    Batal
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleSendWhatsAppNudge}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black rounded-xl gap-1.5 shadow-sm"
                  >
                    <Send size={13} />
                    <span>Kirim WhatsApp Sekarang</span>
                  </Button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </AcademicPageLayout>
  );
}

function tld_safe(id: string) {
  return id;
}
