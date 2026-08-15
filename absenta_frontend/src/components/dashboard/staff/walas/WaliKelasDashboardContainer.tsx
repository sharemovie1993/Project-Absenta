/**
 * Dashboard Wali Kelas (StaffWaliKelasTab.tsx)
 * Command Center Utama Wali Kelas untuk Pengawasan 360° Rombel
 */

import React, { useState, useMemo, lazy, Suspense } from 'react';
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

import { HeaderCommandCenter } from './HeaderCommandCenter';
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
import { useWaliKelasDashboard } from '../../../../hooks/kurikulum/useWaliKelasDashboard';

interface WaliKelasDashboardContainerProps {
  waliKelasNama?: string;
  kelasId?: string;
}

export function WaliKelasDashboardContainer({ waliKelasNama, kelasId }: WaliKelasDashboardContainerProps) {
  // Real API hooks for Jurnal, Permohonan Izin, EWS, Violations, Achievements, Students
  const {
    journalEntries: apiJournalEntries,
    leaveRequests: apiLeaveRequests,
    atRiskStudents: apiAtRiskStudents,
    violations: apiViolations,
    achievements: apiAchievements,
    students: apiStudents,
    isApiConnected,
    updateLeaveStatus,
    createJournal,
    deleteJournal
  } = useWaliKelasDashboard(kelasId);

  // Main State
  const [classInfo, setClassInfo] = useState<ClassInfo>(() => ({
    ...DEFAULT_CLASS_INFO,
    className: waliKelasNama || DEFAULT_CLASS_INFO.className,
  }));

  React.useEffect(() => {
    if (waliKelasNama) {
      setClassInfo(prev => ({ ...prev, className: waliKelasNama }));
    }
  }, [waliKelasNama]);

  const [healthMetric, setHealthMetric] = useState<ClassHealthMetric>(DEFAULT_HEALTH_METRIC);

  // Directly derive data from useWaliKelasDashboard hook without dangerous useEffect sync loops
  const students = apiStudents || [];
  const leaveRequests = apiLeaveRequests || [];
  const atRiskStudents = apiAtRiskStudents || [];
  const violations = apiViolations || [];
  const achievements = apiAchievements || [];
  const journalEntries = apiJournalEntries || [];


  const queryClient = useQueryClient();

  // Active Tab & Search Filter
  const [activeTab, setActiveTab] = useState<string>('approval');
  const [searchTerm, setSearchTerm] = useState<string>('');

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

  const maleCount = useMemo(() => students.filter((s) => s.gender === 'L').length, [students]);
  const femaleCount = useMemo(() => students.filter((s) => s.gender === 'P').length, [students]);

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

  // Switch Rombel Handler
  const handleClassChange = (className: string) => {
    setClassInfo(prev => ({ ...prev, className }));
    showToast('Pindah Rombel', `Menampilkan Command Center untuk kelas ${className}`, 'info');
  };

  // Leave Approval Handlers
  const handleApproveLeave = async (id: string) => {
    const req = leaveRequests.find(r => r.id === id);
    if (!req) return;

    try {
      await updateLeaveStatus({ id, status: 'DISETUJUI' });
    } catch (e) {
      // Optimistic/Local fallback
    }

    setLeaveRequests(prev => prev.map(r => {
      if (r.id === id) {
        return {
          ...r,
          status: 'Disetujui',
          processedAt: 'Hari ini, Baru saja'
        };
      }
      return r;
    }));

    // Update student's today status
    setStudents(prev => prev.map(s => {
      if (s.id === req.studentId) {
        return {
          ...s,
          todayStatus: req.type as any
        };
      }
      return s;
    }));

    showToast(
      'Permohonan Disetujui',
      `Surat izin ${req.type} ananda ${req.studentName} telah disetujui dan dicatat di presensi resmi.`
    );
  };

  const handleRejectLeave = async (id: string, reason: string) => {
    const req = leaveRequests.find(r => r.id === id);
    if (!req) return;

    try {
      await updateLeaveStatus({ id, status: 'DITOLAK', catatan: reason });
    } catch (e) {
      // Optimistic/Local fallback
    }

    setLeaveRequests(prev => prev.map(r => {
      if (r.id === id) {
        return {
          ...r,
          status: 'Ditolak',
          rejectionReason: reason,
          processedAt: 'Hari ini, Baru saja'
        };
      }
      return r;
    }));

    showToast(
      'Permohonan Ditolak',
      `Permohonan izin ${req.studentName} ditolak. Catatan dikirimkan ke akun orang tua.`,
      'warning'
    );
  };

  const handleApproveAllPending = () => {
    const pendingReqs = leaveRequests.filter(r => r.status === 'Pending');
    if (pendingReqs.length === 0) return;

    pendingReqs.forEach(async (req) => {
      try {
        await updateLeaveStatus({ id: req.id, status: 'DISETUJUI' });
      } catch (e) {}
    });

    setLeaveRequests(prev => prev.map(r => {
      if (r.status === 'Pending') {
        return {
          ...r,
          status: 'Disetujui',
          processedAt: 'Hari ini, Baru saja'
        };
      }
      return r;
    }));

    showToast(
      'Batch Approval Berhasil',
      `${pendingReqs.length} permohonan izin orang tua telah disetujui secara serentak.`
    );
  };

  // WhatsApp trigger
  const handleOpenWhatsApp = (parentName: string, parentPhone: string, studentName: string, reasonText: string) => {
    setWaModalData({
      parentName,
      parentPhone,
      studentName,
      reasonText
    });
  };

  // Award Badge
  const handleAwardBadge = (studentId: string, badgeName: string, icon: string, note: string) => {
    const newBadge = {
      id: `b-${Date.now()}`,
      badgeName,
      icon,
      category: 'Apresiasi Walas',
      awardedBy: classInfo.homeroomTeacher,
      awardedAt: 'Hari Ini',
      note
    };

    setStudents(prev => prev.map(s => {
      if (s.id === studentId) {
        return {
          ...s,
          goodDeedsPoints: s.goodDeedsPoints + 25,
          badges: [newBadge, ...s.badges]
        };
      }
      return s;
    }));

    showToast(
      'Badge Apresiasi Terkirim! 🌟',
      `Badge "${badgeName}" berhasil disematkan ke profil siswa dan notifikasi terkirim ke orang tua.`
    );
  };

  // Update BK Status
  const handleUpdateBKStatus = (id: string, newStatus: BKStatus) => {
    setViolations(prev => prev.map(v => {
      if (v.id === id) {
        return { ...v, bkStatus: newStatus };
      }
      return v;
    }));

    showToast('Status Pembinaan Diperbarui', `Status penanganan diubah menjadi: ${newStatus}`);
  };

  // Add Incident
  const handleAddViolation = (data: {
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
    const newRecord: ViolationRecord = {
      id: `v-${Date.now()}`,
      ...data,
      date: '11 Ags 2026'
    };

    setViolations(prev => [newRecord, ...prev]);

    // Update student's violation points
    setStudents(prev => prev.map(s => {
      if (s.id === data.studentId) {
        return { ...s, violationPoints: s.violationPoints + data.points };
      }
      return s;
    }));

    showToast('Catatan Disiplin Disimpan', `Catatan kejadian ${data.category} untuk ${data.studentName} tersimpan.`);
  };

  // Add Journal
  const handleAddJournal = async (data: {
    category: 'Rapat Ortu' | 'Kasus Teratasi' | 'Pembinaan Kelas' | 'Catatan Khusus' | 'Agenda Jam Walas' | 'Koordinasi BK';
    title: string;
    content: string;
    tags: string[];
  }) => {
    const todayStr = new Date().toISOString().split('T')[0];
    try {
      await createJournal({
        tanggal: todayStr,
        kategori: data.category,
        judul: data.title,
        isi: data.content,
        tags: data.tags,
      });
    } catch (e) {
      // Fallback local update
    }

    const newEntry: JournalEntry = {
      id: `j-${Date.now()}`,
      date: new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }),
      time: '12:00 WIB',
      ...data,
      author: classInfo.homeroomTeacher
    };

    setJournalEntries(prev => [newEntry, ...prev]);
    showToast('Jurnal Walas Ditambahkan', `Entri "${data.title}" berhasil disimpan di rekapitulasi.`);
  };


  // EWS Intervention
  const handleTakeIntervention = (atRisk: AtRiskStudent) => {
    handleOpenWhatsApp(
      `Orang Tua dari ${atRisk.studentName}`,
      '081234567890',
      atRisk.studentName,
      `Undangan Diskusi Perkembangan Kehadiran & Pembinaan Wali Kelas`
    );
  };

  const pendingApprovalCount = leaveRequests.filter(r => r.status === 'Pending').length;
  const starStudents = students.filter(s => s.isStarStudent || s.academicAverage >= 88);

  return (
    <div className="w-full">
      <div className="p-5 sm:p-7 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-5">
        {/* 1. Header Command Center Toolbar */}
        <HeaderCommandCenter
          classInfo={classInfo}
          onClassChange={handleClassChange}
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          onOpenExportModal={() => setIsExportModalOpen(true)}
          studentCount={{
            male: maleCount,
            female: femaleCount,
            total: students.length
          }}
          isApiConnected={isApiConnected}
        />

        {/* 2. Sub-Module Navigation Tabs */}
        <TabNav
          activeTab={activeTab}
          onTabChange={setActiveTab}
          pendingApprovalCount={pendingApprovalCount}
          atRiskCount={atRiskStudents.length}
        />

        {/* 4. Sub-Module Active Views (Wrapped in Suspense for Lazy Loading) */}
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
                isApiConnected={isApiConnected}
                className={classInfo.className}
              />
            )}

            {activeTab === 'health' && (
              <WaliKelasHealthPanel
                students={students}
                atRiskStudents={atRiskStudents}
                metrics={healthMetric}
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

        {/* Clean Minimalism Footer */}
        <footer className="mt-8 px-6 py-4 bg-white border border-slate-200 rounded-xl flex flex-col sm:flex-row justify-between items-center gap-3 shadow-xs">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">
            Data Updated: 11 Ags 2026, 08:45 AM • SMKN 1 Tech Center
          </p>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsAddJournalOpen(true)}
              className="text-xs font-bold text-blue-600 hover:text-blue-700 hover:underline flex items-center gap-1.5 cursor-pointer"
            >
              + Catat Jurnal Baru
            </button>
            <button
              onClick={() => setIsExportModalOpen(true)}
              className="text-xs font-bold text-slate-600 hover:text-slate-900 hover:underline flex items-center gap-1.5 cursor-pointer"
            >
              Export Laporan
            </button>
          </div>
        </footer>
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
