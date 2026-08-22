/**
 * Dashboard Wali Kelas (StaffWaliKelasTab.tsx)
 * Command Center Utama Wali Kelas untuk Pengawasan 360° Rombel
 */

import React, { useState, useMemo, useEffect, lazy, Suspense } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Loader } from '../../../ui/Loader';

const DEFAULT_CLASS_INFO: ClassInfo = {
  className: 'Kelas Wali',
  academicYear: '2025/2026',
  semester: 'Semester Ganjil',
  homeroomTeacher: 'Wali Kelas',
  nip: '-',
  totalStudents: 0,
  maleCount: 0,
  femaleCount: 0,
  roomNumber: 'Ruang Kelas',
  major: 'Umum'
};

const DEFAULT_HEALTH_METRIC: ClassHealthMetric = {
  overallScore: 100,
  attendancePercentage: 100,
  activeRequestsCount: 0,
  atRiskCount: 0,
  totalViolationPoints: 0,
  parentResponseRate: 100,
  zeroSevereViolations: true
};

import { 
  Student, LeaveRequest, AtRiskStudent, ViolationRecord, 
  AchievementRecord, JournalEntry, ClassInfo, ClassHealthMetric, BKStatus, SeverityLevel 
} from './types';

import { TabNav } from './TabNav';

// Code-Splitting via React.lazy() for Sub-Panels (Standar Multi-Tenant Google Platform)
const WaliKelasApprovalPanel = lazy(() => import('./WaliKelasApprovalPanel').then(m => ({ default: m.WaliKelasApprovalPanel })));
const WaliKelasStudentsPanel = lazy(() => import('./WaliKelasStudentsPanel').then(m => ({ default: m.WaliKelasStudentsPanel })));
const WaliKelasHealthPanel = lazy(() => import('./WaliKelasHealthPanel').then(m => ({ default: m.WaliKelasHealthPanel })));
const WaliKelasDisciplinePanel = lazy(() => import('./WaliKelasDisciplinePanel').then(m => ({ default: m.WaliKelasDisciplinePanel })));
const WaliKelasAchievementPanel = lazy(() => import('./WaliKelasAchievementPanel').then(m => ({ default: m.WaliKelasAchievementPanel })));
const WaliKelasRekapPanel = lazy(() => import('./WaliKelasRekapPanel').then(m => ({ default: m.WaliKelasRekapPanel })));

import { SiswaOnboardingModal } from '../../../academic/siswa/SiswaOnboardingModal';
import { StudentDetailModal } from './StudentDetailModal';
import { AttachmentViewerModal } from './AttachmentViewerModal';
import { BadgeAwardModal } from './BadgeAwardModal';
import { AddIncidentModal } from './AddIncidentModal';
import { AddJournalModal } from './AddJournalModal';
import { ReportExportModal } from './ReportExportModal';
import { WhatsAppModal } from './WhatsAppModal';
import { NotificationToast, ToastMessage } from './NotificationToast';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getSiswaById } from '../../../../api/academic/siswa.api';
import { getKelasDetail } from '../../../../api/academic/kelas.api';
import { useWaliKelasDashboard } from '../../../../hooks/kurikulum/useWaliKelasDashboard';
import { useAuthStore } from '../../../../store/authStore';

interface WaliKelasDashboardContainerProps {
  waliKelasNama?: string;
  kelasId?: string;
}

export function WaliKelasDashboardContainer({ waliKelasNama, kelasId }: WaliKelasDashboardContainerProps) {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const subtabParam = searchParams.get('subtab');

  // Real API hooks for Jurnal, Permohonan Izin, EWS, Violations, Achievements, Students, Rekap Bulanan
  const {
    journalEntries: apiJournalEntries,
    leaveRequests: apiLeaveRequests,
    atRiskStudents: apiAtRiskStudents,
    violations: apiViolations,
    achievements: apiAchievements,
    students: apiStudents,
    rekapBulananKelas,
    isApiConnected,
    updateLeaveStatus,
    createJournal,
    deleteJournal,
    createViolation,
    updateViolation,
    createAchievement
  } = useWaliKelasDashboard(kelasId);

  // Fetch detail kelas riil dari database (Jurusan, Ruang, Nama Wali)
  const { data: kelasDetailRes } = useQuery({
    queryKey: ['kelas-detail-walas', kelasId],
    queryFn: () => getKelasDetail(kelasId!),
    enabled: Boolean(kelasId),
    staleTime: 5 * 60 * 1000,
  });

  const kelasDetail = kelasDetailRes?.data;

  // Main State
  const [classInfo, setClassInfo] = useState<ClassInfo>(() => ({
    ...DEFAULT_CLASS_INFO,
    className: waliKelasNama || DEFAULT_CLASS_INFO.className,
  }));

  useEffect(() => {
    const teacherName = user?.full_name || user?.name || (user?.guru_profile as any)?.nama_guru || 'Wali Kelas';
    const teacherNip = (user?.guru_profile as any)?.nip || (user as any)?.nip || '-';
    const majorName = kelasDetail?.Jurusan?.nama_jurusan || kelasDetail?.Jurusan?.nama || 'Umum';

    setClassInfo({
      className: waliKelasNama || kelasDetail?.nama_kelas || DEFAULT_CLASS_INFO.className,
      academicYear: '2025/2026',
      semester: 'Semester Ganjil',
      homeroomTeacher: teacherName,
      nip: teacherNip,
      totalStudents: apiStudents?.length || 0,
      maleCount: apiStudents?.filter(s => s.gender === 'L').length || 0,
      femaleCount: apiStudents?.filter(s => s.gender === 'P').length || 0,
      roomNumber: kelasDetail?.nama_kelas ? `Ruang ${kelasDetail.nama_kelas}` : 'Ruang Kelas',
      major: majorName,
    });
  }, [waliKelasNama, kelasDetail, apiStudents, user]);

  const students = apiStudents || [];
  const leaveRequests = apiLeaveRequests || [];
  const atRiskStudents = apiAtRiskStudents || [];
  const violations = apiViolations || [];
  const achievements = apiAchievements || [];
  const journalEntries = apiJournalEntries || [];

  // Dynamic Class Health Metric Calculation (Real 360° Data Aggregation)
  const healthMetric: ClassHealthMetric = useMemo(() => {
    if (!students || students.length === 0) return DEFAULT_HEALTH_METRIC;

    const totalStudents = students.length;
    const avgAttendance = Math.round(
      students.reduce((acc, s) => acc + (s.attendanceRate ?? 100), 0) / (totalStudents || 1)
    );
    const activeReqs = leaveRequests.filter(r => r.status === 'Pending').length;
    const atRiskCount = atRiskStudents.length;
    const totalViolPoints = violations.reduce((acc, v) => acc + (v.points || 0), 0);
    const severeViolations = violations.filter(v => v.severity === 'Berat').length;

    const violationPenalty = Math.min(30, Math.round((totalViolPoints / (totalStudents || 1)) * 2));
    const attendancePenalty = Math.max(0, 100 - avgAttendance);
    const overallScore = Math.max(10, Math.min(100, 100 - violationPenalty - attendancePenalty - (atRiskCount * 5)));

    // Real-time parent response rate (rasio izin yang sudah diproses atau konfirmasi kehadiran)
    const processedRequests = leaveRequests.filter(r => r.status === 'Disetujui' || r.status === 'Ditolak').length;
    const parentResponseRate = leaveRequests.length > 0
      ? Math.round((processedRequests / leaveRequests.length) * 100)
      : 100;

    return {
      overallScore,
      attendancePercentage: avgAttendance,
      activeRequestsCount: activeReqs,
      atRiskCount,
      totalViolationPoints: totalViolPoints,
      parentResponseRate,
      zeroSevereViolations: severeViolations === 0,
    };
  }, [students, leaveRequests, atRiskStudents, violations]);

  // Active Tab & Search Filter
  const [activeTab, setActiveTab] = useState<string>(subtabParam || 'approval');

  useEffect(() => {
    if (subtabParam && ['approval', 'students', 'health', 'discipline', 'halloffame', 'rekap'].includes(subtabParam)) {
      setActiveTab(subtabParam);
    }
  }, [subtabParam]);

  const handleTabChange = (newTab: string) => {
    setActiveTab(newTab);
    const newParams = new URLSearchParams(searchParams);
    newParams.set('tab', 'binaan');
    newParams.set('subtab', newTab);
    setSearchParams(newParams, { replace: true });
  };

  // Modals & Overlay States
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [editingStudentId, setEditingStudentId] = useState<string | null>(null);
  const [viewAttachmentReq, setViewAttachmentReq] = useState<LeaveRequest | null>(null);
  const [badgeStudent, setBadgeStudent] = useState<Student | null>(null);
  const [isAddIncidentOpen, setIsAddIncidentOpen] = useState(false);
  const [isAddJournalOpen, setIsAddJournalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

  // Fetch full student details when editing
  const { data: fullSiswaData } = useQuery({
    queryKey: ['siswa-detail', editingStudentId],
    queryFn: () => getSiswaById(editingStudentId!),
    enabled: Boolean(editingStudentId),
    staleTime: 60 * 1000,
  });

  const studentToEdit = useMemo(() => {
    if (!editingStudentId) return null;
    return fullSiswaData || students.find((s) => s.id === editingStudentId) || null;
  }, [editingStudentId, fullSiswaData, students]);

  // WhatsApp Modal state
  const [waModalData, setWaModalData] = useState<{
    parentName: string;
    parentPhone: string;
    studentName: string;
    reasonText: string;
  } | null>(null);

  // Toasts
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const showToast = (title: string, message: string, type: 'success' | 'warning' | 'info' = 'success') => {
    const id = Date.now().toString();
    setToasts(prev => [...prev, { id, title, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  };

  const handleDismissToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  // Leave Approval Handlers
  const handleApproveLeave = async (id: string) => {
    const req = leaveRequests.find(r => r.id === id);
    if (!req) return;

    try {
      await updateLeaveStatus({ id, status: 'DISETUJUI' });
      showToast(
        'Permohonan Disetujui',
        `Surat izin ${req.type} ananda ${req.studentName} telah disetujui dan dicatat di presensi resmi.`
      );
    } catch (e: any) {
      showToast('Gagal Menyetujui', e?.message || 'Terjadi kesalahan sistem', 'warning');
    }
  };

  const handleRejectLeave = async (id: string, reason: string) => {
    const req = leaveRequests.find(r => r.id === id);
    if (!req) return;

    try {
      await updateLeaveStatus({ id, status: 'DITOLAK', catatan: reason });
      showToast(
        'Permohonan Ditolak',
        `Permohonan izin ${req.studentName} ditolak. Catatan dikirimkan ke akun orang tua.`,
        'warning'
      );
    } catch (e: any) {
      showToast('Gagal Menolak Izin', e?.message || 'Terjadi kesalahan sistem', 'warning');
    }
  };

  const handleApproveAllPending = async () => {
    const pendingReqs = leaveRequests.filter(r => r.status === 'Pending');
    if (pendingReqs.length === 0) return;

    for (const req of pendingReqs) {
      try {
        await updateLeaveStatus({ id: req.id, status: 'DISETUJUI' });
      } catch (e) {}
    }

    showToast(
      'Batch Approval Berhasil',
      `${pendingReqs.length} permohonan izin orang tua telah disetujui secara serentak.`
    );
  };

  // WhatsApp trigger
  const handleOpenWhatsApp = (parentName: string, parentPhone: string, studentName: string, reasonText: string) => {
    setWaModalData({
      parentName: parentName || `Orang Tua ${studentName}`,
      parentPhone: parentPhone || '',
      studentName,
      reasonText
    });
  };

  // Award Badge (Persisted to Backend API)
  const handleAwardBadge = async (studentId: string, badgeName: string, icon: string, note: string) => {
    try {
      await createAchievement({
        siswa_id: studentId,
        nama_prestasi: badgeName,
        poin: 25,
        keterangan: note,
        tanggal: new Date().toISOString().split('T')[0],
      });

      showToast(
        'Badge Apresiasi Terkirim! 🌟',
        `Badge "${badgeName}" berhasil disematkan ke profil siswa dan tercatat di database.`
      );
    } catch (e: any) {
      showToast('Gagal Mengirim Badge', e?.message || 'Terjadi kesalahan sistem', 'warning');
    }
  };

  // Update BK Status (Persisted to Backend API)
  const handleUpdateBKStatus = async (id: string, newStatus: BKStatus) => {
    const backendStatus = newStatus === 'Konseling BK' ? 'PROSES' : newStatus === 'Selesai' ? 'SELESAI' : 'PENDING';
    try {
      await updateViolation({ id, data: { status: backendStatus } });
      showToast('Status Pembinaan Diperbarui', `Status penanganan diubah menjadi: ${newStatus}`);
    } catch (e: any) {
      showToast('Gagal Memperbarui Status', e?.message || 'Terjadi kesalahan sistem', 'warning');
    }
  };

  // Add Incident (Persisted to Backend API)
  const handleAddViolation = async (data: {
    studentId: string;
    studentName: string;
    nis: string;
    category: string;
    points: number;
    severity: SeverityLevel;
    description: string;
    reporter: 'Wali Kelas';
    bkStatus: BKStatus;
  }) => {
    try {
      await createViolation({
        siswa_id: data.studentId,
        jenis_pelanggaran: data.category,
        poin: Number(data.points),
        keterangan: data.description,
        tanggal: new Date().toISOString().split('T')[0],
        status: data.bkStatus === 'Konseling BK' ? 'PROSES' : data.bkStatus === 'Selesai' ? 'SELESAI' : 'PENDING',
      });

      showToast('Catatan Disiplin Disimpan', `Catatan kejadian ${data.category} untuk ${data.studentName} berhasil tersimpan di sistem.`);
    } catch (e: any) {
      showToast('Gagal Menyimpan Kejadian', e?.message || 'Terjadi kesalahan sistem', 'warning');
    }
  };

  // Add Journal (Persisted to Backend API)
  const handleAddJournal = async (data: {
    category: 'Rapat Ortu' | 'Kasus Teratasi' | 'Pembinaan Kelas' | 'Catatan Khusus' | 'Agenda Jam Walas' | 'Koordinasi BK';
    title: string;
    content: string;
    tags: string[];
    date?: string;
  }) => {
    const journalDateStr = data.date || new Date().toISOString().split('T')[0];
    try {
      await createJournal({
        tanggal: journalDateStr,
        kategori: data.category,
        judul: data.title,
        isi: data.content,
        tags: data.tags,
      });
      showToast('Jurnal Walas Ditambahkan', `Entri "${data.title}" berhasil disimpan di rekapitulasi.`);
    } catch (e: any) {
      showToast('Gagal Menyimpan Jurnal', e?.message || 'Terjadi kesalahan sistem', 'warning');
    }
  };

  // EWS Intervention (Using real parent phone from student object)
  const handleTakeIntervention = (atRisk: AtRiskStudent) => {
    const targetStudent = students.find(s => s.id === atRisk.studentId || s.name === atRisk.studentName);
    const parentPhone = atRisk.parentPhone || targetStudent?.parentPhone || '';
    const parentName = atRisk.parentName || targetStudent?.parentName || `Orang Tua dari ${atRisk.studentName}`;

    handleOpenWhatsApp(
      parentName,
      parentPhone,
      atRisk.studentName,
      `Undangan Diskusi Perkembangan Kehadiran & Pembinaan Wali Kelas`
    );
  };

  const pendingApprovalCount = leaveRequests.filter(r => r.status === 'Pending').length;

  return (
    <div className="w-full">
      <div className="p-5 sm:p-7 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-5">
        {/* Sub-Module Navigation Tabs */}
        <TabNav
          activeTab={activeTab}
          onTabChange={handleTabChange}
          pendingApprovalCount={pendingApprovalCount}
          atRiskCount={atRiskStudents.length}
        />

        {/* Sub-Module Active Views (Wrapped in Suspense for Lazy Loading) */}
        <main className="transition-all duration-300">
          <Suspense fallback={
            <div className="py-16 flex flex-col items-center justify-center gap-3">
              <Loader />
              <span className="text-xs font-bold text-slate-400">Memuat Modul Wali Kelas...</span>
            </div>
          }>
            {activeTab === 'approval' && (
              <WaliKelasApprovalPanel
                requests={leaveRequests}
                onApprove={handleApproveLeave}
                onReject={handleRejectLeave}
                onApproveAllPending={handleApproveAllPending}
                onViewAttachment={setViewAttachmentReq}
                onOpenWhatsApp={handleOpenWhatsApp}
                onSelectStudent={(id) => setSelectedStudent(students.find(s => s.id === id) || null)}
                isApiConnected={isApiConnected}
              />
            )}

            {activeTab === 'students' && (
              <WaliKelasStudentsPanel
                students={students}
                onSelectStudent={(id) => setSelectedStudent(students.find(s => s.id === id) || null)}
                onEditStudent={(id) => setEditingStudentId(id)}
                onOpenWhatsApp={handleOpenWhatsApp}
                onOpenExportModal={() => setIsExportModalOpen(true)}
                isApiConnected={isApiConnected}
                className={classInfo.className}
              />
            )}

            {activeTab === 'health' && (
              <WaliKelasHealthPanel
                students={students}
                atRiskStudents={atRiskStudents}
                metrics={healthMetric}
                rekapBulananData={rekapBulananKelas}
                className={classInfo.className}
                onSelectStudent={(id) => setSelectedStudent(students.find(s => s.id === id) || null)}
                onTakeIntervention={handleTakeIntervention}
                isApiConnected={isApiConnected}
              />
            )}

            {activeTab === 'discipline' && (
              <WaliKelasDisciplinePanel
                violations={violations}
                onOpenAddIncidentModal={() => setIsAddIncidentOpen(true)}
                onSelectStudent={(id) => setSelectedStudent(students.find(s => s.id === id) || null)}
                onUpdateBKStatus={handleUpdateBKStatus}
                isApiConnected={isApiConnected}
              />
            )}

            {activeTab === 'halloffame' && (
              <WaliKelasAchievementPanel
                students={students}
                achievements={achievements}
                onOpenBadgeModal={(st) => setBadgeStudent(st)}
                onSelectStudent={(id) => setSelectedStudent(students.find(s => s.id === id) || null)}
                isApiConnected={isApiConnected}
                className={classInfo.className}
              />
            )}

            {activeTab === 'rekap' && (
              <WaliKelasRekapPanel
                journalEntries={journalEntries}
                onOpenAddJournalModal={() => setIsAddJournalOpen(true)}
                onOpenExportModal={() => setIsExportModalOpen(true)}
                isApiConnected={isApiConnected}
              />
            )}
          </Suspense>
        </main>
      </div>

      {/* Interactive Overlays & Modals */}
      <StudentDetailModal
        student={selectedStudent}
        onClose={() => setSelectedStudent(null)}
        onOpenBadgeModal={(st) => setBadgeStudent(st)}
        onOpenWhatsApp={handleOpenWhatsApp}
        onEditStudent={(id) => setEditingStudentId(id)}
      />

      {/* Modern SiswaOnboardingModal for Homeroom Teacher Editing */}
      {editingStudentId && (
        <SiswaOnboardingModal
          isOpen={Boolean(editingStudentId)}
          onClose={() => setEditingStudentId(null)}
          siswa={studentToEdit}
          activeSection="all"
          onSuccess={() => {
            setEditingStudentId(null);
            queryClient.invalidateQueries({ queryKey: ['walas-siswa'] });
            queryClient.invalidateQueries({ queryKey: ['siswa-detail', editingStudentId] });
            showToast(
              'Data Siswa Diperbarui',
              'Biodata siswa binaan berhasil disimpan dan dimutakhirkan di sistem.'
            );
          }}
        />
      )}

      <AttachmentViewerModal
        request={viewAttachmentReq}
        onClose={() => setViewAttachmentReq(null)}
      />

      <BadgeAwardModal
        student={badgeStudent}
        onClose={() => setBadgeStudent(null)}
        onAwardBadge={handleAwardBadge}
      />

      <AddIncidentModal
        students={students}
        isOpen={isAddIncidentOpen}
        onClose={() => setIsAddIncidentOpen(false)}
        onAddViolation={handleAddViolation}
      />

      <AddJournalModal
        isOpen={isAddJournalOpen}
        onClose={() => setIsAddJournalOpen(false)}
        onAddJournal={handleAddJournal}
      />

      <ReportExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        classInfo={classInfo}
        students={students}
      />

      {waModalData && (
        <WhatsAppModal
          isOpen={Boolean(waModalData)}
          onClose={() => setWaModalData(null)}
          parentName={waModalData.parentName}
          parentPhone={waModalData.parentPhone}
          studentName={waModalData.studentName}
          reasonText={waModalData.reasonText}
        />
      )}

      {/* Toast Feedback System */}
      <NotificationToast toasts={toasts} onDismiss={handleDismissToast} />
    </div>
  );
}
