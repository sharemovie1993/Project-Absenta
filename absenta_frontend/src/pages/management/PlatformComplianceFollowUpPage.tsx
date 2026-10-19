import React, { useState, useMemo, useCallback, lazy, Suspense } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import {
  Users,
  CheckCircle2,
  GraduationCap,
  UserCheck,
  Search,
  Phone,
  Download,
  RefreshCw,
  TrendingUp
} from 'lucide-react';
import { toast } from 'react-hot-toast';

import { AcademicPageLayout } from '@/components/academic/AcademicPageLayout';
import { InfraErrorBoundary } from '@/components/superadmin/infra/InfraErrorBoundary';
import { SectionCard, SearchableSelect, Input, Button, TabSwitcher } from '@/components/ui';
import { getGuruList } from '@/api/academic/guru.api';
import { getSiswaList } from '@/api/academic/siswa.api';
import type { Guru, Siswa } from '@/types/academic';
import type { NudgeModalTarget } from '@/components/management/compliance/ComplianceNudgeModal';
import {
  type TeacherComplianceItem,
  type StudentComplianceItem,
  computeComplianceScore,
  formatLastLogin
} from '@/components/management/compliance/complianceHelpers';
import { exportDataToExcel } from '@/utils/export.utils';
import { formatDate } from '@/utils/date.utils';

// Lazy Loaded Subcomponents (Pilar 13 & Pilar 21)
const ComplianceTrendsView = lazy(() =>
  import('@/components/management/compliance/ComplianceTrendsView').then((m) => ({ default: m.ComplianceTrendsView }))
);
const ComplianceNudgeModal = lazy(() =>
  import('@/components/management/compliance/ComplianceNudgeModal').then((m) => ({ default: m.ComplianceNudgeModal }))
);
const TeacherComplianceList = lazy(() =>
  import('@/components/management/compliance/TeacherComplianceList').then((m) => ({ default: m.TeacherComplianceList }))
);
const StudentComplianceList = lazy(() =>
  import('@/components/management/compliance/StudentComplianceList').then((m) => ({ default: m.StudentComplianceList }))
);

export type { TeacherComplianceItem, StudentComplianceItem };

const filterSchema = z.object({
  searchTerm: z.string().optional(),
  statusFilter: z.enum(['ALL', 'ACTIVE', 'PASSIVE', 'DORMANT']).optional(),
  selectedIssueFilter: z.string().optional(),
});

function sortComplianceItems<T extends TeacherComplianceItem | StudentComplianceItem>(
  items: T[],
  sortBy: string,
  sortOrder: 'asc' | 'desc'
): T[] {
  return [...items].sort((a, b) => {
    let result = 0;
    if (sortBy === 'nama') {
      result = a.nama.localeCompare(b.nama, 'id');
    } else if (sortBy === 'complianceScore') {
      result = a.complianceScore - b.complianceScore;
    } else if (sortBy === 'rfidEnrolled') {
      result = (a.rfidEnrolled ? 1 : 0) - (b.rfidEnrolled ? 1 : 0);
    } else if (sortBy === 'hasUserAccount') {
      result = (a.hasUserAccount ? 1 : 0) - (b.hasUserAccount ? 1 : 0);
    } else if (sortBy === 'noWa' && 'noWa' in a && 'noWa' in b) {
      result = ((a as TeacherComplianceItem).noWa || '').localeCompare((b as TeacherComplianceItem).noWa || '');
    } else if (sortBy === 'noWaOrtu' && 'noWaOrtu' in a && 'noWaOrtu' in b) {
      result = ((a as StudentComplianceItem).noWaOrtu || '').localeCompare((b as StudentComplianceItem).noWaOrtu || '');
    } else if (sortBy === 'lastLogin') {
      const timeA = a.lastLogin ? new Date(a.lastLogin).getTime() : 0;
      const timeB = b.lastLogin ? new Date(b.lastLogin).getTime() : 0;
      result = timeA - timeB;
    } else {
      result = a.nama.localeCompare(b.nama, 'id');
    }
    return sortOrder === 'desc' ? -result : result;
  });
}

export const PlatformComplianceFollowUpPage: React.FC = React.memo(() => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'GURU' | 'SISWA' | 'TREND'>('GURU');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'PASSIVE' | 'DORMANT'>('ALL');
  const [selectedIssueFilter, setSelectedIssueFilter] = useState<string>('ALL');

  const [selectedTeacherIds, setSelectedTeacherIds] = useState<Set<string>>(new Set());
  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string>>(new Set());
  const [isExporting, setIsExporting] = useState(false);

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
      const res = await getGuruList(1, 1000);
      return Array.isArray(res) ? res : res?.data || [];
    },
    staleTime: 60 * 1000,
  });

  const { data: rawSiswaData, isLoading: loadingSiswa } = useQuery<Siswa[]>({
    queryKey: ['compliance-siswa-list'],
    queryFn: async () => {
      const res = await getSiswaList(1, 5000, '', '', 'AKTIF');
      return Array.isArray(res) ? res : res?.data || [];
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
      
      const { complianceScore, issues } = computeComplianceScore({
        rfidEnrolled,
        noWa,
        hasUserAccount,
        lastLogin,
        rfidMissingMsg: 'Kartu RFID Presensi belum terdaftar',
        waMissingMsg: 'Nomor WhatsApp belum terdata',
        accountMissingMsg: 'Akun login portal mandiri belum aktif',
      });

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
        complianceScore,
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
      
      const { complianceScore, issues } = computeComplianceScore({
        rfidEnrolled,
        noWa: noWaOrtu,
        hasUserAccount,
        lastLogin,
        rfidMissingMsg: 'Kartu RFID Siswa belum dipasangkan',
        waMissingMsg: 'Nomor WhatsApp orang tua belum terdaftar',
        accountMissingMsg: 'Akses portal siswa mandiri belum aktif',
      });

      return {
        id: s.id || `siswa-${Math.random()}`,
        nama: displayName,
        nisn: s.nisn || s.nis || '-',
        kelas: s.kelas?.nama_kelas || s.rombel || 'Siswa',
        noWaOrtu,
        rfidEnrolled,
        hasUserAccount,
        lastLogin,
        complianceScore,
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

  const sortedTeachers = useMemo(() => {
    return sortComplianceItems(filteredTeachers, teacherSortBy, teacherSortOrder);
  }, [filteredTeachers, teacherSortBy, teacherSortOrder]);

  const paginatedTeachers = useMemo(() => {
    const start = (teacherPage - 1) * teacherLimit;
    return (sortedTeachers ?? []).slice(start, start + teacherLimit);
  }, [sortedTeachers, teacherPage, teacherLimit]);

  const sortedStudents = useMemo(() => {
    return sortComplianceItems(filteredStudents, studentSortBy, studentSortOrder);
  }, [filteredStudents, studentSortBy, studentSortOrder]);

  const paginatedStudents = useMemo(() => {
    const start = (studentPage - 1) * studentLimit;
    return (sortedStudents ?? []).slice(start, start + studentLimit);
  }, [sortedStudents, studentPage, studentLimit]);

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

  const statCards = useMemo(() => {
    return [
      {
        title: "RFID GURU",
        value: `${stats.teacherRfidPct}%`,
        icon: <Users size={14} />,
        gradient: "from-blue-600 to-indigo-600",
        subtitle: `Dari ${stats.totalGuru} Guru Terdata`
      },
      {
        title: "WA GURU",
        value: `${stats.teacherWaPct}%`,
        icon: <CheckCircle2 size={14} />,
        gradient: "from-emerald-500 to-teal-600",
        subtitle: "Nomor WhatsApp Valid"
      },
      {
        title: "RFID SISWA",
        value: `${stats.studentRfidPct}%`,
        icon: <GraduationCap size={14} />,
        gradient: "from-slate-600 to-slate-800",
        subtitle: `Dari ${stats.totalSiswa} Siswa Terdaftar`
      },
      {
        title: "WA WALI SISWA",
        value: `${stats.studentWaPct}%`,
        icon: <UserCheck size={14} />,
        gradient: "from-indigo-600 to-purple-600",
        subtitle: "Terhubung Notifikasi WA"
      }
    ];
  }, [stats]);

  const handleOpenNudgeTeacher = useCallback((guru: TeacherComplianceItem) => {
    setNudgeModalTarget({
      nama: guru.nama,
      role: 'GURU',
      noWa: guru.noWa,
      issues: guru.issues
    });
  }, []);

  const handleOpenNudgeStudent = useCallback((siswa: StudentComplianceItem) => {
    setNudgeModalTarget({
      nama: siswa.nama,
      role: 'SISWA',
      noWa: siswa.noWaOrtu,
      issues: siswa.issues
    });
  }, []);

  const handleRefresh = useCallback(() => {
    toast('Memperbarui data kepatuhan...');
    queryClient.invalidateQueries({ queryKey: ['compliance-guru-list'] });
    queryClient.invalidateQueries({ queryKey: ['compliance-siswa-list'] });
  }, [queryClient]);

  const handleExport = useCallback(async () => {
    try {
      setIsExporting(true);
      toast('Menyiapkan file laporan kepatuhan...');
      if (activeTab === 'GURU') {
        exportDataToExcel(
          filteredTeachers,
          [
            { header: 'Nama Guru', accessor: (r) => r.nama, width: 28 },
            { header: 'NIP/Identitas', accessor: (r) => r.nip, width: 20 },
            { header: 'Jabatan / Mapel', accessor: (r) => `${r.jabatan} - ${r.mapel}`, width: 25 },
            { header: 'No. WhatsApp', accessor: (r) => r.noWa || 'Belum Ada', width: 18 },
            { header: 'Kartu RFID', accessor: (r) => r.rfidEnrolled ? 'Terdaftar' : 'Belum Ada', width: 15 },
            { header: 'Akun Portal', accessor: (r) => r.hasUserAccount ? 'Aktif' : 'Belum Aktif', width: 15 },
            { header: 'Login Terakhir', accessor: (r) => formatLastLogin(r.lastLogin).text, width: 20 },
            { header: 'Skor (%)', accessor: (r) => `${r.complianceScore}%`, width: 12 },
            { header: 'Catatan Kendala', accessor: (r) => (r.issues ?? [])?.join('; '), width: 35 },
          ],
          `Laporan_Kepatuhan_Guru_${new Date().toISOString().split('T')[0]}`,
          'Laporan Evaluasi Kepatuhan & Kelengkapan Data Guru'
        );
      } else {
        exportDataToExcel(
          filteredStudents,
          [
            { header: 'Nama Siswa', accessor: (r) => r.nama, width: 28 },
            { header: 'NISN', accessor: (r) => r.nisn, width: 18 },
            { header: 'Kelas', accessor: (r) => r.kelas, width: 15 },
            { header: 'WhatsApp Wali', accessor: (r) => r.noWaOrtu || 'Belum Ada', width: 18 },
            { header: 'Kartu RFID', accessor: (r) => r.rfidEnrolled ? 'Terdaftar' : 'Belum Ada', width: 15 },
            { header: 'Akun Portal', accessor: (r) => r.hasUserAccount ? 'Aktif' : 'Belum Aktif', width: 15 },
            { header: 'Login Terakhir', accessor: (r) => formatLastLogin(r.lastLogin).text, width: 20 },
            { header: 'Skor (%)', accessor: (r) => `${r.complianceScore}%`, width: 12 },
            { header: 'Catatan Kendala', accessor: (r) => (r.issues ?? [])?.join('; '), width: 35 },
          ],
          `Laporan_Kepatuhan_Siswa_${new Date().toISOString().split('T')[0]}`,
          'Laporan Evaluasi Kepatuhan & Kelengkapan Data Siswa'
        );
      }
      toast.success('Laporan berhasil diekspor!');
    } catch {
      toast.error('Gagal mengekspor laporan');
    } finally {
      setIsExporting(false);
    }
  }, [activeTab, filteredTeachers, filteredStudents]);

  const selectedCount = activeTab === 'GURU' ? selectedTeacherIds.size : selectedStudentIds.size;

  const handleBulkNudge = useCallback(() => {
    if (activeTab === 'GURU') {
      const selected = filteredTeachers.filter(t => selectedTeacherIds.has(t.id));
      const target = selected.find(t => t.issues.length > 0) || selected[0];
      if (target) {
        handleOpenNudgeTeacher(target);
      } else {
        toast.error('Pilih setidaknya satu guru dari tabel untuk di-nudge');
      }
    } else {
      const selected = filteredStudents.filter(s => selectedStudentIds.has(s.id));
      const target = selected.find(s => s.issues.length > 0) || selected[0];
      if (target) {
        handleOpenNudgeStudent(target);
      } else {
        toast.error('Pilih setidaknya satu siswa dari tabel untuk di-nudge');
      }
    }
  }, [activeTab, filteredTeachers, filteredStudents, selectedTeacherIds, selectedStudentIds, handleOpenNudgeTeacher, handleOpenNudgeStudent]);

  const breadcrumbs = useMemo(() => [
    { label: 'System Utilities' },
    { label: 'Evaluasi Kepatuhan Platform' }
  ], []);

  const toolbarNode = useMemo(() => (
    <div className="flex flex-col w-full gap-4 p-4">
      {/* Context Switcher Pill (Guru / Siswa / Tren Adopsi) */}
      <TabSwitcher
        activeTab={activeTab}
        onChange={(val) => setActiveTab(val as 'GURU' | 'SISWA' | 'TREND')}
        tabs={[
          { id: 'GURU', label: `Guru (${filteredTeachers.length})`, icon: Users },
          { id: 'SISWA', label: `Siswa (${filteredStudents.length})`, icon: GraduationCap },
          { id: 'TREND', label: 'Tren Adopsi', icon: TrendingUp }
        ]}
      />

      {/* Row 1: Search & Filters */}
      <div className="flex flex-col md:flex-row gap-4 items-center w-full">
        <div className="flex-1 w-full">
          <Input
            type="text"
            placeholder={activeTab === 'GURU' ? "Cari nama, NIP, atau mata pelajaran..." : "Cari nama, NISN, atau kelas..."}
            aria-label="Cari entitas kepatuhan"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            leftIcon={<Search className="h-4 w-4 text-gray-400" />}
            className="h-10 rounded-xl bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 shadow-sm"
          />
        </div>
        
        <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto">
          <div className="w-full md:w-52">
            <SearchableSelect
              value={statusFilter}
              onValueChange={(val) => setStatusFilter(val as 'ALL' | 'ACTIVE' | 'PASSIVE' | 'DORMANT')}
              options={[
                { label: 'Semua Status Kepatuhan', value: 'ALL' },
                { label: 'Lengkap (≥80%)', value: 'ACTIVE' },
                { label: 'Sebagian (50-79%)', value: 'PASSIVE' },
                { label: 'Belum Lengkap (<50%)', value: 'DORMANT' }
              ]}
              placeholder="Semua Status"
              searchPlaceholder="Cari Status..."
              className="w-full"
              triggerClassName="h-10 rounded-xl bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800"
            />
          </div>

          <div className="w-full md:w-52">
            <SearchableSelect
              value={selectedIssueFilter}
              onValueChange={setSelectedIssueFilter}
              options={[
                { label: 'Semua Kendala', value: 'ALL' },
                { label: 'Belum Ada Kartu RFID', value: 'NO_RFID' },
                { label: 'Belum Ada WhatsApp', value: 'NO_WA' }
              ]}
              placeholder="Semua Kendala"
              searchPlaceholder="Cari Kendala..."
              className="w-full"
              triggerClassName="h-10 rounded-xl bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800"
            />
          </div>
        </div>
      </div>

      {/* Row 2: Secondary Actions Toolbar */}
      <div className="flex flex-wrap items-center gap-2 pt-4 border-t border-gray-100 dark:border-gray-800 w-full">
        <Button
          variant="toolbarPrimary"
          size="toolbar"
          onClick={handleBulkNudge}
          disabled={selectedCount === 0}
        >
          <Phone className="w-4 h-4 mr-1.5" />
          Nudge WhatsApp {selectedCount > 0 ? `(${selectedCount})` : ''}
        </Button>

        <Button
          variant="toolbarOutline"
          size="toolbar"
          onClick={handleExport}
          disabled={isExporting}
          className="rounded-xl"
        >
          <Download className="w-3.5 h-3.5 mr-1.5" />
          Export Excel
        </Button>

        <Button
          variant="toolbarOutline"
          size="toolbarIcon"
          onClick={handleRefresh}
          aria-label="Refresh Data"
          className="rounded-xl"
        >
          <RefreshCw className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  ), [activeTab, filteredTeachers.length, filteredStudents.length, searchTerm, statusFilter, selectedIssueFilter, selectedCount, handleBulkNudge, handleExport, isExporting, handleRefresh]);

  return (
    <InfraErrorBoundary>
      <AcademicPageLayout
        title="Pusat Evaluasi Kepatuhan & Kelengkapan Data"
        description="Direktori & pemantauan kelengkapan RFID presensi, nomor kontak WhatsApp, dan akun portal mandiri."
        breadcrumbs={breadcrumbs}
        stats={statCards}
        isLoadingStats={loadingGurus || loadingSiswa}
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
        <div className="space-y-6">
          <SectionCard fullWidth noPadding>
            {activeTab === 'GURU' && (
              <Suspense fallback={
                <div className="flex justify-center items-center py-16 w-full">
                  <div className="w-8 h-8 rounded-full border-4 border-indigo-500 border-t-transparent animate-spin" />
                </div>
              }>
                <TeacherComplianceList
                  data={paginatedTeachers}
                  loading={loadingGurus}
                  totalItems={filteredTeachers.length}
                  currentPage={teacherPage}
                  itemsPerPage={teacherLimit}
                  sortBy={teacherSortBy}
                  sortOrder={teacherSortOrder}
                  onSort={(col, dir) => { setTeacherSortBy(col); setTeacherSortOrder(dir); }}
                  onPageChange={setTeacherPage}
                  onLimitChange={(limit) => { setTeacherLimit(limit); setTeacherPage(1); }}
                  onNudge={handleOpenNudgeTeacher}
                  toolbarLeft={toolbarNode}
                  selectedRowKeys={selectedTeacherIds}
                  onSelectedRowKeysChange={setSelectedTeacherIds}
                />
              </Suspense>
            )}

            {activeTab === 'SISWA' && (
              <Suspense fallback={
                <div className="flex justify-center items-center py-16 w-full">
                  <div className="w-8 h-8 rounded-full border-4 border-indigo-500 border-t-transparent animate-spin" />
                </div>
              }>
                <StudentComplianceList
                  data={paginatedStudents}
                  loading={loadingSiswa}
                  totalItems={filteredStudents.length}
                  currentPage={studentPage}
                  itemsPerPage={studentLimit}
                  sortBy={studentSortBy}
                  sortOrder={studentSortOrder}
                  onSort={(col, dir) => { setStudentSortBy(col); setStudentSortOrder(dir); }}
                  onPageChange={setStudentPage}
                  onLimitChange={(limit) => { setStudentLimit(limit); setStudentPage(1); }}
                  onNudge={handleOpenNudgeStudent}
                  toolbarLeft={toolbarNode}
                  selectedRowKeys={selectedStudentIds}
                  onSelectedRowKeysChange={setSelectedStudentIds}
                />
              </Suspense>
            )}

            {activeTab === 'TREND' && (
              <div className="flex flex-col w-full">
                {toolbarNode}
                <div className="p-4 sm:p-6 border-t border-gray-100 dark:border-gray-800">
                  <Suspense fallback={
                    <div className="flex justify-center items-center py-16 w-full">
                      <div className="w-8 h-8 rounded-full border-4 border-indigo-500 border-t-transparent animate-spin" />
                    </div>
                  }>
                    <ComplianceTrendsView stats={stats} />
                  </Suspense>
                </div>
              </div>
            )}
          </SectionCard>
        </div>

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
