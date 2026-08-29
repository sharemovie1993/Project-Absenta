import React, { useState, useMemo, useCallback, lazy, Suspense } from 'react';
import { useQuery } from '@tanstack/react-query';
import { z } from 'zod';
import { Phone } from 'lucide-react';

import { AcademicPageLayout } from '@/components/academic/AcademicPageLayout';
import { InfraErrorBoundary } from '@/components/superadmin/infra/InfraErrorBoundary';
import { Table, type Column } from '@/components/ui/Table';
import { Card, SectionCard, Button, SearchableSelect, Input, Badge } from '@/components/ui';
import { TabSwitcher } from '@/components/ui/TabSwitcher';
import { getGuruList } from '@/api/academic/guru.api';
import { getSiswaList } from '@/api/academic/siswa.api';
import type { Guru, Siswa } from '@/types/academic';
import type { NudgeModalTarget } from '@/components/management/compliance/ComplianceNudgeModal';
import { ComplianceStatsCards } from '@/components/management/compliance/ComplianceStatsCards';
import { formatDate } from '@/utils/date.utils';

const ComplianceTrendsView = lazy(() =>
  import('@/components/management/compliance/ComplianceTrendsView').then((m) => ({ default: m.ComplianceTrendsView }))
);
const ComplianceNudgeModal = lazy(() =>
  import('@/components/management/compliance/ComplianceNudgeModal').then((m) => ({ default: m.ComplianceNudgeModal }))
);

export interface TeacherComplianceItem {
  id: string;
  nama: string;
  nip: string;
  noWa: string;
  mapel: string;
  jabatan: string;
  rfidEnrolled: boolean;
  hasUserAccount: boolean;
  lastLogin: string | null;
  complianceScore: number;
  issues: string[];
}

export interface StudentComplianceItem {
  id: string;
  nama: string;
  nisn: string;
  kelas: string;
  noWaOrtu: string;
  rfidEnrolled: boolean;
  hasUserAccount: boolean;
  lastLogin: string | null;
  complianceScore: number;
  issues: string[];
}

export function formatLastLogin(dateStr?: string | Date | null): { text: string; isRecent: boolean } {
  if (!dateStr) return { text: 'Belum Pernah', isRecent: false };
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return { text: 'Belum Pernah', isRecent: false };

  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffHours = diffMs / (1000 * 60 * 60);

  if (diffHours < 24) {
    const hours = Math.max(1, Math.floor(diffHours));
    return { text: `${hours} jam lalu`, isRecent: true };
  }
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays <= 7) {
    return { text: `${diffDays} hari lalu`, isRecent: true };
  }

  return {
    text: formatDate(d),
    isRecent: false
  };
}

const filterSchema = z.object({
  searchTerm: z.string().optional(),
  statusFilter: z.enum(['ALL', 'ACTIVE', 'PASSIVE', 'DORMANT']).optional(),
  selectedIssueFilter: z.string().optional(),
});

export function getComplianceBadge(score: number) {
  if (score >= 80) return { label: 'Digital Native', grade: '🟢 Lengkap', color: 'text-emerald-700 dark:text-emerald-300', bg: 'bg-emerald-50 dark:bg-emerald-950/50', border: 'border-emerald-200 dark:border-emerald-800' };
  if (score >= 50) return { label: 'Perlu Pengingat', grade: '🟡 Sebagian', color: 'text-amber-700 dark:text-amber-300', bg: 'bg-amber-50 dark:bg-amber-950/50', border: 'border-amber-200 dark:border-amber-800' };
  return { label: 'Non-Compliant', grade: '🔴 Belum Lengkap', color: 'text-rose-700 dark:text-rose-300', bg: 'bg-rose-50 dark:bg-rose-950/50', border: 'border-rose-200 dark:border-rose-800' };
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

  const [nudgeModalTarget, setNudgeModalTarget] = useState<NudgeModalTarget | null>(null);

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
    return (list ?? [])?.map((g: Guru) => {
      const teacherRecord = g as Record<string, unknown>;
      const displayName = String(g.nama_guru || g.nama || teacherRecord.nama_lengkap || g.User?.full_name || 'Guru');
      const rfidEnrolled = Boolean(g.no_rfid || teacherRecord.rfid || teacherRecord.card_uid);
      const noWa = String(g.no_hp || g.telepon || teacherRecord.wa_phone || g.User?.phone || g.user?.phone || '').trim();
      const hasUserAccount = Boolean(g.user_id || g.user?.id || g.User?.id);
      const lastLogin = (g.last_login || g.User?.last_login || teacherRecord.last_login || null) as string | null;
      
      const issues: string[] = [];
      let score = 30;

      if (rfidEnrolled) {
        score += 30;
      } else {
        issues.push('Kartu RFID Presensi belum terdaftar');
      }

      if (noWa && noWa.length >= 8) {
        score += 20;
      } else {
        issues.push('Nomor WhatsApp belum terdata');
      }

      if (hasUserAccount) {
        score += 10;
      } else {
        issues.push('Akun login portal mandiri belum aktif');
      }

      if (lastLogin) {
        score += 10;
      } else {
        issues.push('Belum pernah login ke sistem');
      }

      return {
        id: g.id || `guru-${Math.random()}`,
        nama: displayName,
        nip: g.nip || g.nik || g.nuptk || '-',
        noWa,
        mapel: g.mapel?.nama_mapel || g.jabatan || 'Tenaga Pendidik',
        jabatan: g.jenis_ptk || g.status_kepegawaian || 'Guru',
        rfidEnrolled,
        hasUserAccount,
        lastLogin,
        complianceScore: Math.min(100, score),
        issues
      };
    }) ?? [];
  }, [rawGurusData]);

  const processedStudents: StudentComplianceItem[] = useMemo(() => {
    const list = Array.isArray(rawSiswaData) ? rawSiswaData : [];
    return (list ?? [])?.map((s: Siswa) => {
      const studentRecord = s as Record<string, unknown>;
      const displayName = String(s.nama_siswa || s.nama || studentRecord.nama_lengkap || 'Siswa');
      const rfidEnrolled = Boolean(s.no_rfid || studentRecord.rfid || studentRecord.card_uid);
      const noWaOrtu = String(s.no_hp_ortu || s.telepon_ortu || studentRecord.no_hp_ayah || studentRecord.no_hp_ibu || s.no_hp || s.telepon || studentRecord.no_wa_wali || '').trim();
      const hasUserAccount = Boolean(s.user_id || s.user?.id || studentRecord.User);
      const lastLogin = (s.last_login || s.User?.last_login || studentRecord.last_login || null) as string | null;
      
      const issues: string[] = [];
      let score = 30;

      if (rfidEnrolled) {
        score += 30;
      } else {
        issues.push('Kartu RFID Siswa belum dipasangkan');
      }

      if (noWaOrtu && noWaOrtu.length >= 8) {
        score += 20;
      } else {
        issues.push('Nomor WhatsApp orang tua belum terdaftar');
      }

      if (hasUserAccount) {
        score += 10;
      } else {
        issues.push('Akses portal siswa mandiri belum aktif');
      }

      if (lastLogin) {
        score += 10;
      } else {
        issues.push('Belum pernah login ke sistem');
      }

      return {
        id: s.id || `siswa-${Math.random()}`,
        nama: displayName,
        nisn: s.nisn || s.nis || '-',
        kelas: s.kelas?.nama_kelas || s.rombel || 'Siswa',
        noWaOrtu,
        rfidEnrolled,
        hasUserAccount,
        lastLogin,
        complianceScore: Math.min(100, score),
        issues
      };
    }) ?? [];
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
      if (selectedIssueFilter === 'NO_RFID') matchIssue = !t.rfidEnrolled;
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
      if (selectedIssueFilter === 'NO_RFID') matchIssue = !s.rfidEnrolled;
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
    const totalGuru = (processedTeachers ?? []).length;
    const guruRfidCount = (processedTeachers ?? []).filter(t => t.rfidEnrolled).length;
    const guruWaCount = (processedTeachers ?? []).filter(t => t.noWa && t.noWa.length >= 8).length;
    const guruLoginCount = (processedTeachers ?? []).filter(t => t.lastLogin).length;
    const guruActiveCount = (processedTeachers ?? []).filter(t => t.complianceScore >= 80).length;
    const guruPassiveCount = (processedTeachers ?? []).filter(t => t.complianceScore >= 50 && t.complianceScore < 80).length;
    const guruDormantCount = (processedTeachers ?? []).filter(t => t.complianceScore < 50).length;

    const totalSiswa = (processedStudents ?? []).length;
    const siswaRfidCount = (processedStudents ?? []).filter(s => s.rfidEnrolled).length;
    const siswaWaCount = (processedStudents ?? []).filter(s => s.noWaOrtu && s.noWaOrtu.length >= 8).length;
    const siswaLoginCount = (processedStudents ?? []).filter(s => s.lastLogin).length;
    const siswaActiveCount = (processedStudents ?? []).filter(s => s.complianceScore >= 80).length;
    const siswaPassiveCount = (processedStudents ?? []).filter(s => s.complianceScore >= 50 && s.complianceScore < 80).length;
    const siswaDormantCount = (processedStudents ?? []).filter(s => s.complianceScore < 50).length;

    const teacherRfidPct = totalGuru ? Math.round((guruRfidCount / totalGuru) * 100) : 0;
    const teacherWaPct = totalGuru ? Math.round((guruWaCount / totalGuru) * 100) : 0;
    const teacherLoginPct = totalGuru ? Math.round((guruLoginCount / totalGuru) * 100) : 0;
    const studentRfidPct = totalSiswa ? Math.round((siswaRfidCount / totalSiswa) * 100) : 0;
    const studentWaPct = totalSiswa ? Math.round((siswaWaCount / totalSiswa) * 100) : 0;
    const studentLoginPct = totalSiswa ? Math.round((siswaLoginCount / totalSiswa) * 100) : 0;

    return {
      totalGuru,
      totalSiswa,
      teacherRfidPct,
      teacherWaPct,
      teacherLoginPct,
      studentRfidPct,
      studentWaPct,
      studentLoginPct,
      guruActiveCount,
      guruPassiveCount,
      guruDormantCount,
      siswaActiveCount,
      siswaPassiveCount,
      siswaDormantCount
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
  }, []);

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
      key: 'rfidEnrolled',
      label: 'Kartu RFID Presensi',
      sortable: true,
      render: (value: unknown) => (
        <Badge variant={value ? 'success' : 'destructive'} className="text-[9px] font-bold">
          {value ? 'Terdaftar' : 'Belum Ada'}
        </Badge>
      )
    },
    {
      key: 'hasUserAccount',
      label: 'Akun Portal',
      sortable: true,
      render: (value: unknown) => (
        <Badge variant={value ? 'success' : 'outline'} className="text-[9px] font-bold">
          {value ? 'Aktif' : 'Belum'}
        </Badge>
      )
    },
    {
      key: 'lastLogin',
      label: 'Login Terakhir',
      sortable: true,
      render: (value: unknown) => {
        const { text, isRecent } = formatLastLogin(value as string);
        if (text === 'Belum Pernah') {
          return <span className="text-amber-600 dark:text-amber-400 font-sans italic text-[11px]">Belum Pernah</span>;
        }
        return (
          <div className="flex items-center gap-1.5">
            <span className={`w-1.5 h-1.5 rounded-full ${isRecent ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
            <span className="text-xs text-slate-700 dark:text-slate-300 font-medium">{text}</span>
          </div>
        );
      }
    },
    {
      key: 'complianceScore',
      label: 'Kelengkapan Data',
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
      key: 'rfidEnrolled',
      label: 'Kartu RFID Siswa',
      sortable: true,
      render: (value: unknown) => (
        <Badge variant={value ? 'success' : 'destructive'} className="text-[9px] font-bold">
          {value ? 'Terdaftar' : 'Belum Ada'}
        </Badge>
      )
    },
    {
      key: 'hasUserAccount',
      label: 'Akun Portal Siswa',
      sortable: true,
      render: (value: unknown) => (
        <Badge variant={value ? 'success' : 'outline'} className="text-[9px] font-bold">
          {value ? 'Aktif' : 'Belum'}
        </Badge>
      )
    },
    {
      key: 'lastLogin',
      label: 'Login Terakhir',
      sortable: true,
      render: (value: unknown) => {
        const { text, isRecent } = formatLastLogin(value as string);
        if (text === 'Belum Pernah') {
          return <span className="text-amber-600 dark:text-amber-400 font-sans italic text-[11px]">Belum Pernah</span>;
        }
        return (
          <div className="flex items-center gap-1.5">
            <span className={`w-1.5 h-1.5 rounded-full ${isRecent ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
            <span className="text-xs text-slate-700 dark:text-slate-300 font-medium">{text}</span>
          </div>
        );
      }
    },
    {
      key: 'complianceScore',
      label: 'Kelengkapan Data',
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
    { id: 'GURU', label: `Kelengkapan Guru (${filteredTeachers.length})` },
    { id: 'SISWA', label: `Kelengkapan Siswa (${filteredStudents.length})` },
    { id: 'TREND', label: 'Tren Adopsi Platform' }
  ], [filteredTeachers.length, filteredStudents.length]);

  return (
    <InfraErrorBoundary>
      <AcademicPageLayout
        title="Pusat Evaluasi Kepatuhan & Kelengkapan Data"
        description="Alat kendali IT & Pimpinan untuk memantau kelengkapan RFID, kontak WhatsApp, aktivasi akun, dan melakukan follow-up instan."
        breadcrumbs={breadcrumbs}
        hardeningModuleKey="platform_compliance"
        instruction={{
          title: 'Pusat Evaluasi Kepatuhan & Kelengkapan Data',
          description: 'Alat kendali IT & Pimpinan untuk memantau kelengkapan RFID, kontak WhatsApp, aktivasi akun, dan melakukan follow-up instan.',
          items: [
            { text: 'Pantau kelengkapan registrasi Kartu RFID tap presensi, nomor kontak WhatsApp, dan akun login.' },
            { text: 'Gunakan tombol [Nudge WA] untuk mengirimkan pesan pengingat langsung ke WhatsApp target.' },
            { text: 'Tersedia pilihan kirim via Server WA Bot atau langsung membuka WhatsApp di perangkat Anda.' }
          ]
        }}
      >
        <SectionCard fullWidth className="flex flex-col w-full min-w-0 border-none shadow-none bg-transparent p-0 pb-24">
          <div className="space-y-6 w-full min-w-0 max-w-full">
            
            {/* ── METRIC STATS SUMMARY CARDS ── */}
            <ComplianceStatsCards stats={stats} />

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
                      aria-label="Filter status kelengkapan"
                      value={statusFilter}
                      onValueChange={(val) => setStatusFilter(val as 'ALL' | 'ACTIVE' | 'PASSIVE' | 'DORMANT')}
                      options={[
                        { value: 'ALL', label: 'Semua Status' },
                        { value: 'ACTIVE', label: 'Lengkap (≥80%)' },
                        { value: 'PASSIVE', label: 'Sebagian (50-79%)' },
                        { value: 'DORMANT', label: 'Belum Lengkap (<50%)' },
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
                    emptyMessage="Tidak ada data guru yang sesuai filter."
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
                    emptyMessage="Tidak ada data siswa yang sesuai filter."
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
                      onLimitChange: (limit) => { setTeacherLimit(limit); setTeacherPage(1); }
                    }}
                  />
                )}
              </div>
            )}

            {/* Trends Tab */}
            {activeTab === 'TREND' && (
              <Suspense fallback={
                <div className="flex justify-center items-center py-16">
                  <div className="w-8 h-8 rounded-full border-4 border-indigo-500 border-t-transparent animate-spin" />
                </div>
              }>
                <ComplianceTrendsView stats={stats} />
              </Suspense>
            )}
          </div>
        </SectionCard>

        {/* ── MODAL NUDGE WHATSAPP (LAZY LOADED) ── */}
        {nudgeModalTarget && (
          <Suspense fallback={null}>
            <ComplianceNudgeModal
              target={nudgeModalTarget}
              onClose={() => setNudgeModalTarget(null)}
            />
          </Suspense>
        )}
      </AcademicPageLayout>
    </InfraErrorBoundary>
  );
});

PlatformComplianceFollowUpPage.displayName = 'PlatformComplianceFollowUpPage';
export default PlatformComplianceFollowUpPage;
