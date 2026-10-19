import React, { useState, useMemo, useCallback, lazy, Suspense } from 'react';
import { useQuery } from '@tanstack/react-query';
import { z } from 'zod';

import { AcademicPageLayout } from '@/components/academic/AcademicPageLayout';
import { InfraErrorBoundary } from '@/components/superadmin/infra/InfraErrorBoundary';
import { Card, SectionCard, SearchableSelect, Input } from '@/components/ui';
import { TabSwitcher } from '@/components/ui/TabSwitcher';
import { getGuruList } from '@/api/academic/guru.api';
import { getSiswaList } from '@/api/academic/siswa.api';
import type { Guru, Siswa } from '@/types/academic';
import type { NudgeModalTarget } from '@/components/management/compliance/ComplianceNudgeModal';
import { ComplianceStatsCards } from '@/components/management/compliance/ComplianceStatsCards';
import {
  type TeacherComplianceItem,
  type StudentComplianceItem,
  computeComplianceScore
} from '@/components/management/compliance/complianceHelpers';
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
      const res = await getGuruList(1, 1000);
      const items = Array.isArray(res) ? res : res?.data || [];
      return items;
    },
    staleTime: 60 * 1000,
  });

  const { data: rawSiswaData, isLoading: loadingSiswa } = useQuery<Siswa[]>({
    queryKey: ['compliance-siswa-list'],
    queryFn: async () => {
      const res = await getSiswaList(1, 5000, '', '', 'AKTIF');
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

  const breadcrumbs = useMemo(() => [
    { label: 'System Utilities' },
    { label: 'Evaluasi Kepatuhan Platform' }
  ], []);

  const tabs = useMemo(() => [
    { id: 'GURU', label: `Guru (${filteredTeachers.length})` },
    { id: 'SISWA', label: `Siswa (${filteredStudents.length})` },
    { id: 'TREND', label: 'Tren Adopsi' }
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
          <div className="space-y-4 sm:space-y-6 w-full min-w-0 max-w-full">
            
            {/* ── METRIC STATS SUMMARY CARDS (Pilar 23 & Pilar 30) ── */}
            <ComplianceStatsCards stats={stats} />

            {/* Filter Bar (Zero-clipping input container) */}
            <Card className="p-3 sm:p-4 bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800 rounded-2xl shadow-xs w-full min-w-0 max-w-full">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 sm:gap-3 w-full min-w-0 max-w-full">
                <div className="flex-1 max-w-sm w-full min-w-0">
                  <Input
                    id="compliance-search-input"
                    aria-label="Cari nama atau identitas"
                    placeholder="Cari nama, NIP, atau NISN..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="rounded-xl text-xs w-full h-9 sm:h-10"
                  />
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto min-w-0">
                  <div className="w-full sm:w-48 min-w-0">
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

            {/* Tab Switcher (Touch-scrollable no-scrollbar flex-nowrap) */}
            <TabSwitcher
              activeTab={activeTab}
              onChange={setActiveTab}
              tabs={tabs}
            />

            {/* Teacher List (Lazy loaded Subcomponent Pilar 13 & 21) */}
            {activeTab === 'GURU' && (
              <div className="rounded-2xl border border-slate-200/70 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-xs w-full min-w-0 max-w-full">
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
                  />
                </Suspense>
              </div>
            )}

            {/* Student List (Lazy loaded Subcomponent Pilar 13 & 21) */}
            {activeTab === 'SISWA' && (
              <div className="rounded-2xl border border-slate-200/70 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-xs w-full min-w-0 max-w-full">
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
                  />
                </Suspense>
              </div>
            )}

            {/* Trends Tab */}
            {activeTab === 'TREND' && (
              <Suspense fallback={
                <div className="flex justify-center items-center py-16 w-full">
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
