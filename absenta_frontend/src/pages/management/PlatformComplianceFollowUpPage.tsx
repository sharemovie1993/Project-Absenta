import React, { useState, useMemo, useCallback } from 'react';
import { z } from 'zod';
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
import { InfraErrorBoundary } from '@/components/superadmin/infra/InfraErrorBoundary';
import { Table, type Column } from '@/components/ui/Table';
import { Card, SectionCard, Button, SearchableSelect, Input, Badge } from '@/components/ui';
import { TabSwitcher } from '@/components/ui/TabSwitcher';
import { toast } from 'react-hot-toast';

// Types & Interfaces
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
  rppStatus: 'LENGKAP' | 'REVIEW' | 'BELUM';
  complianceScore: number;
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
  complianceScore: number;
  issues: string[];
}

// Zod Schema Validation Guard (Pilar 25)
const nudgeSchema = z.object({
  nama: z.string().min(1, 'Nama tujuan wajib ada'),
  noWa: z.string().min(8, 'Nomor WhatsApp tidak valid'),
  template: z.enum(['JURNAL', 'FACE_ID', 'LOGIN_PORTAL', 'RPP']),
});

const filterSchema = z.object({
  searchTerm: z.string().optional(),
  statusFilter: z.enum(['ALL', 'ACTIVE', 'PASSIVE', 'DORMANT']).optional(),
  selectedIssueFilter: z.string().optional(),
});

// Initial Datasets
const INITIAL_TEACHERS_COMPLIANCE: TeacherComplianceItem[] = [
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
    rppStatus: 'BELUM',
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
    rppStatus: 'REVIEW',
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
    rppStatus: 'LENGKAP',
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
    rppStatus: 'LENGKAP',
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
    rppStatus: 'BELUM',
    complianceScore: 22,
    issues: ['Bypass sistem (selalu absen manual via piket)', 'Belum rekam wajah', 'Tidak pernah input jurnal KBM']
  }
];

const INITIAL_STUDENTS_COMPLIANCE: StudentComplianceItem[] = [
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

export const PlatformComplianceFollowUpPage: React.FC = React.memo(() => {
  const [activeTab, setActiveTab] = useState<string>('GURU');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'PASSIVE' | 'DORMANT'>('ALL');
  const [selectedIssueFilter, setSelectedIssueFilter] = useState<string>('ALL');

  // Pagination & Sorting State
  const [teacherPage, setTeacherPage] = useState(1);
  const [teacherLimit, setTeacherLimit] = useState(10);
  const [teacherSortBy, setTeacherSortBy] = useState<string>('nama');
  const [teacherSortOrder, setTeacherSortOrder] = useState<'asc' | 'desc'>('asc');

  const [studentPage, setStudentPage] = useState(1);
  const [studentLimit, setStudentLimit] = useState(10);
  const [studentSortBy, setStudentSortBy] = useState<string>('nama');
  const [studentSortOrder, setStudentSortOrder] = useState<'asc' | 'desc'>('asc');

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
    filterSchema.safeParse({ searchTerm, statusFilter, selectedIssueFilter });
    return (INITIAL_TEACHERS_COMPLIANCE ?? []).filter(t => {
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
      else if (selectedIssueFilter === 'NO_RPP') matchIssue = t.rppStatus === 'BELUM';

      return matchSearch && matchStatus && matchIssue;
    });
  }, [searchTerm, statusFilter, selectedIssueFilter]);

  // Filtered Students
  const filteredStudents = useMemo(() => {
    return (INITIAL_STUDENTS_COMPLIANCE ?? []).filter(s => {
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

  const paginatedTeachers = useMemo(() => {
    const start = (teacherPage - 1) * teacherLimit;
    return (filteredTeachers ?? []).slice(start, start + teacherLimit);
  }, [filteredTeachers, teacherPage, teacherLimit]);

  const paginatedStudents = useMemo(() => {
    const start = (studentPage - 1) * studentLimit;
    return (filteredStudents ?? []).slice(start, start + studentLimit);
  }, [filteredStudents, studentPage, studentLimit]);

  const handleOpenNudgeModal = useCallback((item: TeacherComplianceItem | StudentComplianceItem, role: 'GURU' | 'SISWA') => {
    const noWa = 'noWa' in item ? item.noWa : item.noWaOrtu;
    setNudgeModalTarget({
      nama: item.nama,
      role,
      noWa,
      issues: item.issues
    });
  }, []);

  const handleSendWhatsAppNudge = useCallback(() => {
    if (!nudgeModalTarget) return;
    const parsed = nudgeSchema.safeParse({
      nama: nudgeModalTarget.nama,
      noWa: nudgeModalTarget.noWa,
      template: messageTemplate,
    });
    if (!parsed.success) {
      toast.error(parsed.error.errors[0]?.message || 'Data pengingat belum valid');
      return;
    }
    toast.success(`Pesan pengingat WhatsApp berhasil dikirim ke ${nudgeModalTarget.nama} (${nudgeModalTarget.noWa})!`);
    setNudgeModalTarget(null);
  }, [nudgeModalTarget, messageTemplate]);

  const teacherColumns: Column[] = useMemo(() => [
    {
      key: 'nama',
      label: 'Guru & NIP',
      sortable: true,
      render: (_: unknown, row: TeacherComplianceItem) => (
        <div>
          <p className="font-bold text-xs text-slate-900 dark:text-white">{row.nama}</p>
          <p className="text-[10px] text-slate-400">NIP: {row.nip} • {row.mapel}</p>
        </div>
      )
    },
    {
      key: 'lastLoginText',
      label: 'Login Terakhir',
      sortable: true,
      render: (value: unknown) => <span className="text-xs text-slate-700 dark:text-slate-300 font-mono">{String(value || '-')}</span>
    },
    {
      key: 'faceIdEnrolled',
      label: 'Face ID',
      sortable: true,
      render: (value: unknown) => (
        <Badge variant={value ? 'success' : 'destructive'} className="text-[9px] font-bold">
          {value ? 'Terdaftar' : 'Belum'}
        </Badge>
      )
    },
    {
      key: 'jurnalDigitalPct',
      label: 'Jurnal KBM',
      sortable: true,
      render: (value: unknown) => <span className="text-xs font-bold text-indigo-600 font-mono">{Number(value || 0)}%</span>
    },
    {
      key: 'complianceScore',
      label: 'Kepatuhan',
      sortable: true,
      render: (value: unknown) => {
        const score = Number(value || 0);
        const badge = getComplianceBadge(score);
        return (
          <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border ${badge.bg} ${badge.color} ${badge.border}`}>
            {badge.grade} ({score}%)
          </span>
        );
      }
    },
    {
      key: 'actions',
      label: 'Aksi',
      render: (_: unknown, row: TeacherComplianceItem) => (
        <div className="flex justify-end">
          <Button
            type="button"
            size="toolbar"
            variant="toolbarPrimary"
            onClick={() => handleOpenNudgeModal(row, 'GURU')}
            className="text-[10px] font-bold rounded-lg"
          >
            <Phone size={11} className="mr-1" />
            Nudge WA
          </Button>
        </div>
      )
    }
  ], [handleOpenNudgeModal]);

  const studentColumns: Column[] = useMemo(() => [
    {
      key: 'nama',
      label: 'Siswa & NISN',
      sortable: true,
      render: (_: unknown, row: StudentComplianceItem) => (
        <div>
          <p className="font-bold text-xs text-slate-900 dark:text-white">{row.nama}</p>
          <p className="text-[10px] text-slate-400">NISN: {row.nisn} • Kelas {row.kelas}</p>
        </div>
      )
    },
    {
      key: 'lastLoginText',
      label: 'Login Portal',
      sortable: true,
      render: (value: unknown) => <span className="text-xs text-slate-700 dark:text-slate-300 font-mono">{String(value || '-')}</span>
    },
    {
      key: 'faceIdEnrolled',
      label: 'Face ID Gerbang',
      sortable: true,
      render: (value: unknown) => (
        <Badge variant={value ? 'success' : 'destructive'} className="text-[9px] font-bold">
          {value ? 'Terdaftar' : 'Belum'}
        </Badge>
      )
    },
    {
      key: 'complianceScore',
      label: 'Kepatuhan',
      sortable: true,
      render: (value: unknown) => {
        const score = Number(value || 0);
        const badge = getComplianceBadge(score);
        return (
          <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border ${badge.bg} ${badge.color} ${badge.border}`}>
            {badge.grade} ({score}%)
          </span>
        );
      }
    },
    {
      key: 'actions',
      label: 'Aksi',
      render: (_: unknown, row: StudentComplianceItem) => (
        <div className="flex justify-end">
          <Button
            type="button"
            size="toolbar"
            variant="toolbarPrimary"
            onClick={() => handleOpenNudgeModal(row, 'SISWA')}
            className="text-[10px] font-bold rounded-lg"
          >
            <Phone size={11} className="mr-1" />
            WA Ortu
          </Button>
        </div>
      )
    }
  ], [handleOpenNudgeModal]);

  const breadcrumbs = useMemo(() => [
    { label: 'System Utilities' },
    { label: 'Evaluasi Kepatuhan Platform' }
  ], []);

  const tabs = useMemo(() => [
    { id: 'GURU', label: `Kepatuhan Guru (${filteredTeachers.length})` },
    { id: 'SISWA', label: `Kepatuhan Siswa (${filteredStudents.length})` },
    { id: 'TREND', label: 'Tren Adopsi Platform' }
  ], [filteredTeachers.length, filteredStudents.length]);

  return (
    <InfraErrorBoundary>
      <AcademicPageLayout
        title="Pusat Evaluasi Kepatuhan & Adopsi Platform"
        description="Alat kendali IT & Pimpinan untuk memantau, mendeteksi guru/siswa yang pasif, serta melakukan follow-up instan via WhatsApp."
        breadcrumbs={breadcrumbs}
        hardeningModuleKey="platform_compliance"
        instruction={{
          title: 'Pusat Evaluasi Kepatuhan & Adopsi Platform',
          description: 'Alat kendali IT & Pimpinan untuk memantau, mendeteksi guru/siswa yang pasif, serta melakukan follow-up instan via WhatsApp.',
          items: [
            { text: 'Pantau persentase kepatuhan digital KBM, presensi gerbang, dan kelengkapan profil.' },
            { text: 'Gunakan tombol [Kirim Nudge WA] untuk mengirimkan pesan pengingat personal secara instan.' },
            { text: 'Deteksi guru atau siswa yang masih melakukan bypass presensi manual.' }
          ]
        }}
      >
        <SectionCard fullWidth className="flex flex-col w-full min-w-0 border-none shadow-none bg-transparent p-0">
          <div className="space-y-6 w-full min-w-0 max-w-full">
            {/* Filter Bar (Placed above tables for Layout Flow Consistency) */}
            <Card className="p-4 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-sm w-full min-w-0 max-w-full">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 w-full min-w-0 max-w-full">
                <div className="flex-1 max-w-sm w-full min-w-0">
                  <Input
                    id="compliance-search-input"
                    aria-label="Cari nama atau identitas"
                    placeholder="Cari nama, NIP, atau NISN..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="rounded-xl text-xs w-full"
                  />
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <div className="w-full sm:w-48">
                    <SearchableSelect
                      id="status-filter-select"
                      aria-label="Filter status kepatuhan"
                      value={statusFilter}
                      onValueChange={(val) => setStatusFilter(val as 'ALL' | 'ACTIVE' | 'PASSIVE' | 'DORMANT')}
                      options={[
                        { value: 'ALL', label: 'Semua Status' },
                        { value: 'ACTIVE', label: 'Aktif (≥80%)' },
                        { value: 'PASSIVE', label: 'Pasif (50-79%)' },
                        { value: 'DORMANT', label: 'Perlu Follow-up (<50%)' },
                      ]}
                      placeholder="Pilih Status"
                    />
                  </div>
                </div>
              </div>
            </Card>

            {/* Tab Switcher */}
            <TabSwitcher
              activeTab={activeTab}
              onChange={setActiveTab}
              tabs={tabs}
            />

            {/* Teacher List */}
            {activeTab === 'GURU' && (
              <div className="rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-sm w-full min-w-0 max-w-full">
                <Table
                  columns={teacherColumns}
                  data={paginatedTeachers}
                  sortBy={teacherSortBy}
                  sortOrder={teacherSortOrder}
                  onSort={(col, dir) => { setTeacherSortBy(col); setTeacherSortOrder(dir); }}
                  emptyMessage="Tidak ada data kepatuhan guru yang sesuai filter."
                  toolbarLeft={
                    <div className="flex items-center gap-2 w-full max-w-full min-w-0">
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                        Daftar Guru ({filteredTeachers.length})
                      </span>
                    </div>
                  }
                  pagination={{
                    currentPage: teacherPage,
                    totalPages: Math.max(1, Math.ceil(filteredTeachers.length / teacherLimit)),
                    totalItems: filteredTeachers.length,
                    itemsPerPage: teacherLimit,
                    onPageChange: setTeacherPage,
                    onLimitChange: (limit) => { setTeacherLimit(limit); setTeacherPage(1); }
                  }}
                />
              </div>
            )}

            {/* Student List */}
            {activeTab === 'SISWA' && (
              <div className="rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-sm w-full min-w-0 max-w-full">
                <Table
                  columns={studentColumns}
                  data={paginatedStudents}
                  sortBy={studentSortBy}
                  sortOrder={studentSortOrder}
                  onSort={(col, dir) => { setStudentSortBy(col); setStudentSortOrder(dir); }}
                  emptyMessage="Tidak ada data kepatuhan siswa yang sesuai filter."
                  toolbarLeft={
                    <div className="flex items-center gap-2 w-full max-w-full min-w-0">
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                        Daftar Siswa ({filteredStudents.length})
                      </span>
                    </div>
                  }
                  pagination={{
                    currentPage: studentPage,
                    totalPages: Math.max(1, Math.ceil(filteredStudents.length / studentLimit)),
                    totalItems: filteredStudents.length,
                    itemsPerPage: studentLimit,
                    onPageChange: setStudentPage,
                    onLimitChange: (limit) => { setStudentLimit(limit); setStudentPage(1); }
                  }}
                />
              </div>
            )}

            {/* Trends Tab */}
            {activeTab === 'TREND' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full min-w-0 max-w-full">
                <Card className="p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm space-y-4 w-full min-w-0 max-w-full">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-white">
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

                <Card className="p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm space-y-4 w-full min-w-0 max-w-full">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-white">
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
            )}
          </div>
        </SectionCard>

        {/* Modal Nudge WhatsApp */}
        {nudgeModalTarget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-3xl shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden flex flex-col">
              <div className="p-5 bg-emerald-700 text-white flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center text-xl">📲</div>
                  <div>
                    <h3 className="font-bold text-sm">Kirim Pengingat WhatsApp Resmi</h3>
                    <p className="text-[11px] text-emerald-100">
                      Kepada: <strong>{nudgeModalTarget.nama}</strong> ({nudgeModalTarget.noWa})
                    </p>
                  </div>
                </div>
                <button type="button" onClick={() => setNudgeModalTarget(null)} className="text-white hover:text-slate-200 text-sm font-bold">✕</button>
              </div>

              <div className="p-6 space-y-4 text-xs">
                <div>
                  <label htmlFor="pilih-topik-pengingat" className="text-xs font-bold text-slate-500 block mb-1.5 uppercase">
                    Pilih Topik Pengingat:
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {[
                      { id: 'JURNAL', label: '📖 Isi Jurnal KBM' },
                      { id: 'FACE_ID', label: '📸 Rekam Wajah Face ID' },
                      { id: 'RPP', label: '📁 Upload Modul/RPP' },
                      { id: 'LOGIN_PORTAL', label: '🔑 Panduan Login Portal' },
                    ]?.map((tpl) => (
                      <button
                        key={tpl.id}
                        type="button"
                        onClick={() => setMessageTemplate(tpl.id as 'JURNAL' | 'FACE_ID' | 'LOGIN_PORTAL' | 'RPP')}
                        className={`p-2.5 rounded-xl border text-xs font-bold text-left transition-all ${
                          messageTemplate === tpl.id
                            ? 'bg-indigo-50 dark:bg-indigo-950/60 border-indigo-500 text-indigo-700 dark:text-indigo-300'
                            : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                        }`}
                      >
                        {tpl.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <span className="text-[10px] font-bold uppercase text-slate-400">Preview Pesan WhatsApp:</span>
                  <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 text-xs font-medium text-slate-800 dark:text-slate-200 space-y-2">
                    <p>Halo Bpk/Ibu/Sdr <strong>{nudgeModalTarget.nama}</strong>,</p>
                    <p>
                      {messageTemplate === 'JURNAL' && 'Sistem Absenta mencatat Anda belum mengisi Jurnal KBM pada beberapa sesi mengajar minggu ini. Mohon segera mengakses platform untuk memutakhirkan jurnal kelas.'}
                      {messageTemplate === 'FACE_ID' && 'Sistem mencatat profil biometrik Wajah (Face ID) Anda belum terdaftar. Mohon segera melakukan perekaman mandiri untuk aktivasi presensi cepat di gerbang.'}
                      {messageTemplate === 'RPP' && 'Mengingatkan kembali bahwa batas pengunggahan Modul Ajar / RPP Kurikulum Merdeka akan segera ditutup. Silakan unggah dokumen Anda melalui menu Perangkat Ajar.'}
                      {messageTemplate === 'LOGIN_PORTAL' && 'Akun Portal Siswa Anda telah aktif. Silakan masuk ke https://absenta.id untuk melihat jadwal dan rekap presensi.'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-slate-50 dark:bg-slate-800 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2">
                <Button type="button" variant="toolbarOutline" size="toolbar" onClick={() => setNudgeModalTarget(null)}>
                  Batal
                </Button>
                <Button type="button" size="toolbar" variant="toolbarPrimary" onClick={handleSendWhatsAppNudge}>
                  <Send size={12} className="mr-1" />
                  Kirim WhatsApp
                </Button>
              </div>
            </div>
          </div>
        )}
      </AcademicPageLayout>
    </InfraErrorBoundary>
  );
});

export default PlatformComplianceFollowUpPage;
