import React, { useState, useMemo, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { z } from 'zod';
import {
  Smartphone, ShieldAlert, CheckCircle2, AlertTriangle, Users,
  BookOpen, Clock, Send, MessageSquare, Search, Filter,
  TrendingUp, Activity, UserCheck, ShieldCheck, Download,
  ExternalLink, Sparkles, RefreshCw, X, AlertCircle, Phone,
  FileText, ScanFace, ChevronRight, HelpCircle, Layers, Copy, Check
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
import { getGuruList } from '@/api/academic/guru.api';
import { getSiswaList } from '@/api/academic/siswa.api';
import type { Guru, Siswa } from '@/types/academic';

export interface TeacherComplianceItem {
  id: string;
  nama: string;
  nip: string;
  noWa: string;
  mapel: string;
  jabatan: string;
  faceIdEnrolled: boolean;
  hasUserAccount: boolean;
  complianceScore: number;
  issues: string[];
}

export interface StudentComplianceItem {
  id: string;
  nama: string;
  nisn: string;
  kelas: string;
  noWaOrtu: string;
  faceIdEnrolled: boolean;
  hasUserAccount: boolean;
  complianceScore: number;
  issues: string[];
}

const nudgeSchema = z.object({
  nama: z.string().min(1, 'Nama tujuan wajib ada'),
  noWa: z.string().min(6, 'Nomor WhatsApp belum terdata atau tidak valid'),
  template: z.enum(['JURNAL', 'FACE_ID', 'LOGIN_PORTAL', 'RPP']),
});

const filterSchema = z.object({
  searchTerm: z.string().optional(),
  statusFilter: z.enum(['ALL', 'ACTIVE', 'PASSIVE', 'DORMANT']).optional(),
  selectedIssueFilter: z.string().optional(),
});

export function getComplianceBadge(score: number) {
  if (score >= 80) return { label: 'Digital Native', grade: '🟢 Aktif', color: 'text-emerald-700 dark:text-emerald-300', bg: 'bg-emerald-50 dark:bg-emerald-950/50', border: 'border-emerald-200 dark:border-emerald-800' };
  if (score >= 50) return { label: 'Perlu Pengingat', grade: '🟡 Pasif', color: 'text-amber-700 dark:text-amber-300', bg: 'bg-amber-50 dark:bg-amber-950/50', border: 'border-amber-200 dark:border-amber-800' };
  return { label: 'Non-Compliant', grade: '🔴 Perlu Follow-up', color: 'text-rose-700 dark:text-rose-300', bg: 'bg-rose-50 dark:bg-rose-950/50', border: 'border-rose-200 dark:border-rose-800' };
}

function cleanIndonesianPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.startsWith('0')) return '62' + digits.slice(1);
  if (digits.startsWith('8')) return '62' + digits;
  return digits;
}

export const PlatformComplianceFollowUpPage: React.FC = React.memo(() => {
  const [activeTab, setActiveTab] = useState<string>('GURU');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'PASSIVE' | 'DORMANT'>('ALL');
  const [selectedIssueFilter, setSelectedIssueFilter] = useState<string>('ALL');

  const [teacherPage, setTeacherPage] = useState(1);
  const [teacherLimit, setTeacherLimit] = useState(10);
  const [teacherSortBy, setTeacherSortBy] = useState<string>('nama');
  const [teacherSortOrder, setTeacherSortOrder] = useState<'asc' | 'desc'>('asc');

  const [studentPage, setStudentPage] = useState(1);
  const [studentLimit, setStudentLimit] = useState(10);
  const [studentSortBy, setStudentSortBy] = useState<string>('nama');
  const [studentSortOrder, setStudentSortOrder] = useState<'asc' | 'desc'>('asc');

  const [nudgeModalTarget, setNudgeModalTarget] = useState<{
    nama: string;
    role: 'GURU' | 'SISWA';
    noWa: string;
    issues: string[];
  } | null>(null);

  const [messageTemplate, setMessageTemplate] = useState<'JURNAL' | 'FACE_ID' | 'LOGIN_PORTAL' | 'RPP'>('JURNAL');
  const [copied, setCopied] = useState(false);

  const { data: rawGurusData, isLoading: loadingGurus } = useQuery<Guru[]>({
    queryKey: ['compliance-guru-list'],
    queryFn: async () => {
      const res = await getGuruList(1, 300);
      const items = Array.isArray(res) ? res : res?.data || [];
      return items;
    },
    staleTime: 60 * 1000,
  });

  const { data: rawSiswaData, isLoading: loadingSiswa } = useQuery<Siswa[]>({
    queryKey: ['compliance-siswa-list'],
    queryFn: async () => {
      const res = await getSiswaList(1, 300);
      const items = Array.isArray(res) ? res : res?.data || [];
      return items;
    },
    staleTime: 60 * 1000,
  });

  const processedTeachers: TeacherComplianceItem[] = useMemo(() => {
    const list = Array.isArray(rawGurusData) ? rawGurusData : [];
    return (list ?? []).map((g: Guru) => {
      const faceIdEnrolled = Boolean(g.face_embedding || g.foto);
      const noWa = g.no_hp || g.telepon || (g as Record<string, unknown>).wa_phone || g.user?.phone || '';
      const hasUserAccount = Boolean(g.user_id || g.user?.id);
      
      const issues: string[] = [];
      let score = 50;

      if (faceIdEnrolled) score += 30;
      else issues.push('Belum rekam biometrik Wajah / Face ID');

      if (typeof noWa === 'string' && noWa.length >= 8) score += 10;
      else issues.push('Nomor WhatsApp belum terdata');

      if (hasUserAccount) score += 10;
      else issues.push('Belum aktivasi akun login sistem');

      return {
        id: g.id || `guru-${Math.random()}`,
        nama: g.nama || 'Tanpa Nama',
        nip: g.nip || g.nik || g.nuptk || '-',
        noWa: typeof noWa === 'string' ? noWa : '',
        mapel: g.mapel?.nama_mapel || g.jabatan || 'Tenaga Pendidik',
        jabatan: g.jenis_ptk || g.status_kepegawaian || 'Guru',
        faceIdEnrolled,
        hasUserAccount,
        complianceScore: Math.min(100, score),
        issues
      };
    });
  }, [rawGurusData]);

  const processedStudents: StudentComplianceItem[] = useMemo(() => {
    const list = Array.isArray(rawSiswaData) ? rawSiswaData : [];
    return (list ?? []).map((s: Siswa) => {
      const faceIdEnrolled = Boolean(s.face_embedding || s.foto);
      const noWaOrtu = s.telepon_ortu || s.no_hp || s.telepon || (s as Record<string, unknown>).no_wa_wali || '';
      const hasUserAccount = Boolean(s.user_id || s.user?.id);
      
      const issues: string[] = [];
      let score = 50;

      if (faceIdEnrolled) score += 30;
      else issues.push('Belum rekam Face ID gerbang');

      if (typeof noWaOrtu === 'string' && noWaOrtu.length >= 8) score += 10;
      else issues.push('Nomor WhatsApp orang tua belum terdaftar');

      if (hasUserAccount) score += 10;
      else issues.push('Belum pernah akses portal mandiri');

      return {
        id: s.id || `siswa-${Math.random()}`,
        nama: s.nama || 'Tanpa Nama',
        nisn: s.nisn || s.nis || '-',
        kelas: s.kelas?.nama_kelas || s.rombel || 'Siswa',
        noWaOrtu: typeof noWaOrtu === 'string' ? noWaOrtu : '',
        faceIdEnrolled,
        hasUserAccount,
        complianceScore: Math.min(100, score),
        issues
      };
    });
  }, [rawSiswaData]);

  const filteredTeachers = useMemo(() => {
    filterSchema.safeParse({ searchTerm, statusFilter, selectedIssueFilter });
    return (processedTeachers ?? []).filter(t => {
      const matchSearch = t.nama.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.nip.includes(searchTerm) ||
        t.mapel.toLowerCase().includes(searchTerm.toLowerCase());
      
      let matchStatus = true;
      if (statusFilter === 'ACTIVE') matchStatus = t.complianceScore >= 80;
      else if (statusFilter === 'PASSIVE') matchStatus = t.complianceScore >= 50 && t.complianceScore < 80;
      else if (statusFilter === 'DORMANT') matchStatus = t.complianceScore < 50;

      let matchIssue = true;
      if (selectedIssueFilter === 'NO_FACE') matchIssue = !t.faceIdEnrolled;
      else if (selectedIssueFilter === 'NO_WA') matchIssue = !t.noWa;

      return matchSearch && matchStatus && matchIssue;
    });
  }, [processedTeachers, searchTerm, statusFilter, selectedIssueFilter]);

  const filteredStudents = useMemo(() => {
    return (processedStudents ?? []).filter(s => {
      const matchSearch = s.nama.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.nisn.includes(searchTerm) ||
        s.kelas.toLowerCase().includes(searchTerm.toLowerCase());
      
      let matchStatus = true;
      if (statusFilter === 'ACTIVE') matchStatus = s.complianceScore >= 80;
      else if (statusFilter === 'PASSIVE') matchStatus = s.complianceScore >= 50 && s.complianceScore < 80;
      else if (statusFilter === 'DORMANT') matchStatus = s.complianceScore < 50;

      let matchIssue = true;
      if (selectedIssueFilter === 'NO_FACE') matchIssue = !s.faceIdEnrolled;
      else if (selectedIssueFilter === 'NO_WA') matchIssue = !s.noWaOrtu;

      return matchSearch && matchStatus && matchIssue;
    });
  }, [processedStudents, searchTerm, statusFilter, selectedIssueFilter]);

  const paginatedTeachers = useMemo(() => {
    const start = (teacherPage - 1) * teacherLimit;
    return (filteredTeachers ?? []).slice(start, start + teacherLimit);
  }, [filteredTeachers, teacherPage, teacherLimit]);

  const paginatedStudents = useMemo(() => {
    const start = (studentPage - 1) * studentLimit;
    return (filteredStudents ?? []).slice(start, start + studentLimit);
  }, [filteredStudents, studentPage, studentLimit]);

  const stats = useMemo(() => {
    const totalGuru = processedTeachers.length;
    const guruFaceIdCount = processedTeachers.filter(t => t.faceIdEnrolled).length;
    const guruWaCount = processedTeachers.filter(t => t.noWa && t.noWa.length >= 8).length;
    const guruActiveCount = processedTeachers.filter(t => t.complianceScore >= 80).length;
    const guruPassiveCount = processedTeachers.filter(t => t.complianceScore >= 50 && t.complianceScore < 80).length;
    const guruDormantCount = processedTeachers.filter(t => t.complianceScore < 50).length;

    const totalSiswa = processedStudents.length;
    const siswaFaceIdCount = processedStudents.filter(s => s.faceIdEnrolled).length;
    const siswaWaCount = processedStudents.filter(s => s.noWaOrtu && s.noWaOrtu.length >= 8).length;

    const teacherFaceIdPct = totalGuru ? Math.round((guruFaceIdCount / totalGuru) * 100) : 0;
    const teacherWaPct = totalGuru ? Math.round((guruWaCount / totalGuru) * 100) : 0;
    const studentFaceIdPct = totalSiswa ? Math.round((siswaFaceIdCount / totalSiswa) * 100) : 0;
    const studentWaPct = totalSiswa ? Math.round((siswaWaCount / totalSiswa) * 100) : 0;

    return {
      totalGuru,
      totalSiswa,
      teacherFaceIdPct,
      teacherWaPct,
      studentFaceIdPct,
      studentWaPct,
      guruActiveCount,
      guruPassiveCount,
      guruDormantCount
    };
  }, [processedTeachers, processedStudents]);

  const handleOpenNudgeModal = useCallback((item: TeacherComplianceItem | StudentComplianceItem, role: 'GURU' | 'SISWA') => {
    const noWa = 'noWa' in item ? item.noWa : item.noWaOrtu;
    setNudgeModalTarget({
      nama: item.nama,
      role,
      noWa,
      issues: item.issues
    });
    setCopied(false);
  }, []);

  const getMessageContent = useCallback((target: { nama: string }, tpl: string) => {
    let body = '';
    if (tpl === 'JURNAL') {
      body = 'Sistem mencatat Anda belum mengisi Jurnal KBM pada beberapa sesi mengajar minggu ini. Mohon segera mengakses platform untuk memutakhirkan jurnal kelas.';
    } else if (tpl === 'FACE_ID') {
      body = 'Sistem mencatat profil biometrik Wajah (Face ID) Anda belum terdaftar. Mohon segera melakukan perekaman mandiri untuk aktivasi presensi cepat di gerbang sekolah.';
    } else if (tpl === 'RPP') {
      body = 'Mengingatkan kembali bahwa batas pengunggahan Modul Ajar / RPP Kurikulum Merdeka akan segera ditutup. Silakan unggah dokumen Anda melalui menu Perangkat Ajar.';
    } else {
      body = 'Akun Portal Anda telah aktif. Silakan masuk ke aplikasi untuk melihat jadwal dan rekap presensi.';
    }

    return `Halo Bpk/Ibu/Sdr *${target.nama}*,\n\n${body}\n\n_Pesan resmi dari Sistem Presensi Sekolah._`;
  }, []);

  const handleSendWhatsAppNudge = useCallback(() => {
    if (!nudgeModalTarget) return;
    const parsed = nudgeSchema.safeParse({
      nama: nudgeModalTarget.nama,
      noWa: nudgeModalTarget.noWa,
      template: messageTemplate,
    });
    if (!parsed.success) {
      toast.error(parsed.error.errors[0]?.message || 'Nomor WhatsApp tidak valid');
      return;
    }

    const cleanPhone = cleanIndonesianPhone(nudgeModalTarget.noWa);
    const message = getMessageContent(nudgeModalTarget, messageTemplate);

    const waUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
    window.open(waUrl, '_blank');
    
    toast.success(`Membuka WhatsApp untuk mengirim pesan ke ${nudgeModalTarget.nama}`);
    setNudgeModalTarget(null);
  }, [nudgeModalTarget, messageTemplate, getMessageContent]);

  const handleCopyMessage = useCallback(() => {
    if (!nudgeModalTarget) return;
    const message = getMessageContent(nudgeModalTarget, messageTemplate);
    navigator.clipboard.writeText(message);
    setCopied(true);
    toast.success('Pesan WhatsApp disalin ke clipboard!');
    setTimeout(() => setCopied(false), 2000);
  }, [nudgeModalTarget, messageTemplate, getMessageContent]);

  const teacherColumns: Column[] = useMemo(() => [
    {
      key: 'nama',
      label: 'Guru & Identitas',
      sortable: true,
      render: (_: unknown, row: TeacherComplianceItem) => (
        <div>
          <p className="font-bold text-xs text-slate-900 dark:text-white">{row.nama}</p>
          <p className="text-[10px] text-slate-400">NIP/NIK: {row.nip} • {row.mapel}</p>
        </div>
      )
    },
    {
      key: 'noWa',
      label: 'Kontak WhatsApp',
      sortable: true,
      render: (value: unknown) => (
        <span className="text-xs text-slate-700 dark:text-slate-300 font-mono">
          {String(value) && String(value).length >= 8 ? String(value) : <span className="text-rose-500 font-sans italic text-[11px]">Belum Ada</span>}
        </span>
      )
    },
    {
      key: 'faceIdEnrolled',
      label: 'Face ID Biometrik',
      sortable: true,
      render: (value: unknown) => (
        <Badge variant={value ? 'success' : 'destructive'} className="text-[9px] font-bold">
          {value ? 'Terdaftar' : 'Belum'}
        </Badge>
      )
    },
    {
      key: 'complianceScore',
      label: 'Kesiapan Digital',
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
      label: 'Aksi Follow-Up',
      render: (_: unknown, row: TeacherComplianceItem) => (
        <div className="flex justify-end">
          <Button
            type="button"
            size="toolbar"
            variant="toolbarPrimary"
            onClick={() => handleOpenNudgeModal(row, 'GURU')}
            className="text-[10px] font-bold rounded-lg cursor-pointer flex items-center gap-1"
          >
            <Phone size={11} />
            Nudge WA
          </Button>
        </div>
      )
    }
  ], [handleOpenNudgeModal]);

  const studentColumns: Column[] = useMemo(() => [
    {
      key: 'nama',
      label: 'Siswa & Identitas',
      sortable: true,
      render: (_: unknown, row: StudentComplianceItem) => (
        <div>
          <p className="font-bold text-xs text-slate-900 dark:text-white">{row.nama}</p>
          <p className="text-[10px] text-slate-400">NISN: {row.nisn} • Kelas {row.kelas}</p>
        </div>
      )
    },
    {
      key: 'noWaOrtu',
      label: 'Kontak WhatsApp Ortu',
      sortable: true,
      render: (value: unknown) => (
        <span className="text-xs text-slate-700 dark:text-slate-300 font-mono">
          {String(value) && String(value).length >= 8 ? String(value) : <span className="text-rose-500 font-sans italic text-[11px]">Belum Ada</span>}
        </span>
      )
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
      label: 'Kesiapan Digital',
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
      label: 'Aksi Follow-Up',
      render: (_: unknown, row: StudentComplianceItem) => (
        <div className="flex justify-end">
          <Button
            type="button"
            size="toolbar"
            variant="toolbarPrimary"
            onClick={() => handleOpenNudgeModal(row, 'SISWA')}
            className="text-[10px] font-bold rounded-lg cursor-pointer flex items-center gap-1"
          >
            <Phone size={11} />
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
            { text: 'Pantau kelengkapan perekaman wajah Face ID, data kontak WA, dan akun login portal.' },
            { text: 'Gunakan tombol [Nudge WA] untuk mengirimkan pesan pengingat personal langsung ke WhatsApp target.' },
            { text: 'Lihat ringkasan adopsi digital sekolah pada tab Tren Adopsi Platform.' }
          ]
        }}
      >
        <SectionCard fullWidth className="flex flex-col w-full min-w-0 border-none shadow-none bg-transparent p-0 pb-24">
          <div className="space-y-6 w-full min-w-0 max-w-full">
            
            {/* ── METRIC STATS SUMMARY CARDS ── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              <Card className="p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800 shadow-xs">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Face ID Guru</span>
                <p className="text-lg sm:text-xl font-black text-indigo-600 dark:text-indigo-400">{stats.teacherFaceIdPct}%</p>
                <p className="text-[10px] text-slate-500 mt-0.5">Dari {stats.totalGuru} Guru Terdata</p>
              </Card>

              <Card className="p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800 shadow-xs">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Kontak WA Guru</span>
                <p className="text-lg sm:text-xl font-black text-emerald-600 dark:text-emerald-400">{stats.teacherWaPct}%</p>
                <p className="text-[10px] text-slate-500 mt-0.5">Nomor Ponsel Valid</p>
              </Card>

              <Card className="p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800 shadow-xs">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Face ID Siswa</span>
                <p className="text-lg sm:text-xl font-black text-blue-600 dark:text-blue-400">{stats.studentFaceIdPct}%</p>
                <p className="text-[10px] text-slate-500 mt-0.5">Dari {stats.totalSiswa} Siswa</p>
              </Card>

              <Card className="p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800 shadow-xs">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">WA Wali Siswa</span>
                <p className="text-lg sm:text-xl font-black text-teal-600 dark:text-teal-400">{stats.studentWaPct}%</p>
                <p className="text-[10px] text-slate-500 mt-0.5">Terhubung Gateway</p>
              </Card>
            </div>

            {/* Filter Bar */}
            <Card className="p-4 bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800 rounded-2xl shadow-xs w-full min-w-0 max-w-full">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 w-full min-w-0 max-w-full">
                <div className="flex-1 max-w-sm w-full min-w-0">
                  <Input
                    id="compliance-search-input"
                    aria-label="Cari nama atau identitas"
                    placeholder="Cari nama, NIP, atau NISN..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="rounded-xl text-xs w-full h-10"
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
                        { value: 'ALL', label: 'Semua Kesiapan' },
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
              <div className="rounded-2xl border border-slate-200/70 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-xs w-full min-w-0 max-w-full">
                {loadingGurus ? (
                  <div className="flex justify-center items-center py-16">
                    <div className="w-8 h-8 rounded-full border-4 border-indigo-500 border-t-transparent animate-spin" />
                  </div>
                ) : (
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
                          Daftar Guru Real ({filteredTeachers.length})
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
                )}
              </div>
            )}

            {/* Student List */}
            {activeTab === 'SISWA' && (
              <div className="rounded-2xl border border-slate-200/70 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-xs w-full min-w-0 max-w-full">
                {loadingSiswa ? (
                  <div className="flex justify-center items-center py-16">
                    <div className="w-8 h-8 rounded-full border-4 border-indigo-500 border-t-transparent animate-spin" />
                  </div>
                ) : (
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
                          Daftar Siswa Real ({filteredStudents.length})
                        </span>
                      </div>
                    }
                    pagination={{
                      currentPage: studentPage,
                      totalPages: Math.max(1, Math.ceil(filteredStudents.length / studentLimit)),
                      totalItems: filteredStudents.length,
                      itemsPerPage: studentLimit,
                      onPageChange: setStudentPage,
                      onLimitChange: (limit) => { setTeacherLimit(limit); setTeacherPage(1); }
                    }}
                  />
                )}
              </div>
            )}

            {/* Trends Tab */}
            {activeTab === 'TREND' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full min-w-0 max-w-full">
                <Card className="p-4 sm:p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/70 dark:border-slate-800 shadow-xs space-y-4 w-full min-w-0 max-w-full">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-white">
                    Tingkat Adopsi Biometrik &amp; WhatsApp Sekolah
                  </h3>
                  <div className="h-64">
                    <ResponsiveContainer minWidth={0} width="100%" height="100%">
                      <BarChart
                        data={[
                          { name: 'Face ID Guru', adopsi: stats.teacherFaceIdPct },
                          { name: 'WA Guru', adopsi: stats.teacherWaPct },
                          { name: 'Face ID Siswa', adopsi: stats.studentFaceIdPct },
                          { name: 'WA Wali Siswa', adopsi: stats.studentWaPct },
                        ]}
                        margin={{ top: 10, right: 10, left: -20, bottom: 20 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" className="dark:stroke-slate-800" />
                        <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} angle={-15} textAnchor="end" />
                        <YAxis stroke="#94a3b8" fontSize={10} domain={[0, 100]} />
                        <Tooltip formatter={(v: number) => [`${v}%`, 'Tingkat Kesiapan']} />
                        <Bar dataKey="adopsi" fill="#6366f1" radius={[6, 6, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </Card>

                <Card className="p-4 sm:p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/70 dark:border-slate-800 shadow-xs space-y-4 w-full min-w-0 max-w-full">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-white">
                    Distribusi Kesiapan Digital Guru
                  </h3>
                  <div className="h-64 flex items-center justify-center">
                    <ResponsiveContainer minWidth={0} width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={[
                            { name: '🟢 Digital Native (≥80%)', value: stats.guruActiveCount || 1, color: '#10b981' },
                            { name: '🟡 Perlu Pengingat (50-79%)', value: stats.guruPassiveCount || 0, color: '#f59e0b' },
                            { name: '🔴 Perlu Follow-up (<50%)', value: stats.guruDormantCount || 0, color: '#ef4444' },
                          ]}
                          cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={4}
                          dataKey="value"
                        >
                          {[{ color: '#10b981' }, { color: '#f59e0b' }, { color: '#ef4444' }].map((c, i) => (
                            <Cell key={i} fill={c.color} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(v: number) => [`${v} Orang`, 'Jumlah']} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </Card>
              </div>
            )}
          </div>
        </SectionCard>

        {/* ── MODAL NUDGE WHATSAPP (REAL & FUNCTIONAL) ── */}
        {nudgeModalTarget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
            <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-3xl shadow-2xl border border-slate-100 dark:border-slate-800 overflow-hidden flex flex-col">
              <div className="p-4 sm:p-5 bg-emerald-700 text-white flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center text-lg">📲</div>
                  <div>
                    <h3 className="font-bold text-sm">Kirim Pengingat WhatsApp Resmi</h3>
                    <p className="text-[11px] text-emerald-100">
                      Kepada: <strong>{nudgeModalTarget.nama}</strong> ({nudgeModalTarget.noWa || 'Tanpa No WA'})
                    </p>
                  </div>
                </div>
                <button type="button" onClick={() => setNudgeModalTarget(null)} className="text-white hover:text-slate-200 text-sm font-bold cursor-pointer p-1">✕</button>
              </div>

              <div className="p-4 sm:p-6 space-y-4 text-xs">
                {/* Detected Issues */}
                {nudgeModalTarget.issues.length > 0 && (
                  <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 space-y-1">
                    <span className="text-[10px] font-bold uppercase text-amber-700 dark:text-amber-300 flex items-center gap-1">
                      <AlertTriangle size={12} /> Isu Kepatuhan Terdeteksi:
                    </span>
                    <ul className="list-disc list-inside text-[11px] text-slate-700 dark:text-slate-300">
                      {nudgeModalTarget.issues.map((iss, i) => (
                        <li key={i}>{iss}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <div>
                  <label htmlFor="pilih-topik-pengingat" className="text-xs font-bold text-slate-600 dark:text-slate-300 block mb-1.5 uppercase tracking-wider">
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
                        className={`p-2.5 rounded-xl border text-xs font-bold text-left transition-all cursor-pointer ${
                          messageTemplate === tpl.id
                            ? 'bg-indigo-50 dark:bg-indigo-950/60 border-indigo-500 text-indigo-700 dark:text-indigo-300 shadow-xs'
                            : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-slate-300'
                        }`}
                      >
                        {tpl.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase text-slate-400">Preview Pesan WhatsApp:</span>
                    <button
                      type="button"
                      onClick={handleCopyMessage}
                      className="text-[11px] font-bold text-indigo-600 hover:text-indigo-500 flex items-center gap-1 cursor-pointer"
                    >
                      {copied ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
                      {copied ? 'Tersalin' : 'Salin Teks'}
                    </button>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 text-xs font-medium text-slate-800 dark:text-slate-200 space-y-2 whitespace-pre-line">
                    {getMessageContent(nudgeModalTarget, messageTemplate)}
                  </div>
                </div>
              </div>

              <div className="p-4 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2">
                <Button type="button" variant="toolbarOutline" size="toolbar" onClick={() => setNudgeModalTarget(null)} className="cursor-pointer">
                  Batal
                </Button>
                <Button
                  type="button"
                  size="toolbar"
                  variant="toolbarPrimary"
                  onClick={handleSendWhatsAppNudge}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold cursor-pointer flex items-center gap-1.5"
                >
                  <Send size={12} />
                  Kirim WhatsApp Langsung
                </Button>
              </div>
            </div>
          </div>
        )}
      </AcademicPageLayout>
    </InfraErrorBoundary>
  );
});

PlatformComplianceFollowUpPage.displayName = 'PlatformComplianceFollowUpPage';
export default PlatformComplianceFollowUpPage;
