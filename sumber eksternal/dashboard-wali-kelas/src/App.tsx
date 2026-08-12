/**
 * Dashboard Wali Kelas (StaffWaliKelasTab.tsx)
 * Command Center Utama Wali Kelas untuk Pengawasan 360° Rombel
 */

import React, { useState } from 'react';
import { 
  INITIAL_CLASS_INFO, 
  INITIAL_HEALTH_METRIC, 
  INITIAL_STUDENTS, 
  INITIAL_LEAVE_REQUESTS, 
  INITIAL_AT_RISK, 
  INITIAL_VIOLATIONS, 
  INITIAL_ACHIEVEMENTS, 
  INITIAL_JOURNAL 
} from './data/mockData';

import { 
  Student, LeaveRequest, AtRiskStudent, ViolationRecord, 
  AchievementRecord, JournalEntry, ClassInfo, BKStatus, SeverityLevel 
} from './types';

import { HeaderCommandCenter } from './components/HeaderCommandCenter';
import { HeroStatsRadar } from './components/HeroStatsRadar';
import { TabNav } from './components/TabNav';
import { WaliKelasApprovalPanel } from './components/WaliKelasApprovalPanel';
import { WaliKelasHealthPanel } from './components/WaliKelasHealthPanel';
import { WaliKelasDisciplinePanel } from './components/WaliKelasDisciplinePanel';
import { WaliKelasAchievementPanel } from './components/WaliKelasAchievementPanel';
import { WaliKelasRekapPanel } from './components/WaliKelasRekapPanel';

import { StudentDetailModal } from './components/StudentDetailModal';
import { AttachmentViewerModal } from './components/AttachmentViewerModal';
import { BadgeAwardModal } from './components/BadgeAwardModal';
import { AddIncidentModal } from './components/AddIncidentModal';
import { AddJournalModal } from './components/AddJournalModal';
import { ReportExportModal } from './components/ReportExportModal';
import { WhatsAppModal } from './components/WhatsAppModal';
import { NotificationToast, ToastMessage } from './components/NotificationToast';

export default function App() {
  // Main State
  const [classInfo, setClassInfo] = useState<ClassInfo>(INITIAL_CLASS_INFO);
  const [healthMetric, setHealthMetric] = useState(INITIAL_HEALTH_METRIC);
  const [students, setStudents] = useState<Student[]>(INITIAL_STUDENTS);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>(INITIAL_LEAVE_REQUESTS);
  const [atRiskStudents, setAtRiskStudents] = useState<AtRiskStudent[]>(INITIAL_AT_RISK);
  const [violations, setViolations] = useState<ViolationRecord[]>(INITIAL_VIOLATIONS);
  const [achievements, setAchievements] = useState<AchievementRecord[]>(INITIAL_ACHIEVEMENTS);
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>(INITIAL_JOURNAL);

  // Active Tab & Search Filter
  const [activeTab, setActiveTab] = useState<string>('approval');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Modals & Overlay States
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [viewAttachmentReq, setViewAttachmentReq] = useState<LeaveRequest | null>(null);
  const [badgeStudent, setBadgeStudent] = useState<Student | null>(null);
  const [isAddIncidentOpen, setIsAddIncidentOpen] = useState(false);
  const [isAddJournalOpen, setIsAddJournalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

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
  const handleApproveLeave = (id: string) => {
    const req = leaveRequests.find(r => r.id === id);
    if (!req) return;

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

  const handleRejectLeave = (id: string, reason: string) => {
    const req = leaveRequests.find(r => r.id === id);
    if (!req) return;

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
  const handleAddJournal = (data: {
    category: 'Rapat Ortu' | 'Kasus Teratasi' | 'Pembinaan Kelas' | 'Catatan Khusus' | 'Agenda Jam Walas' | 'Koordinasi BK';
    title: string;
    content: string;
    tags: string[];
  }) => {
    const newEntry: JournalEntry = {
      id: `j-${Date.now()}`,
      date: '11 Ags 2026',
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
    <div className="min-h-screen bg-[#F8FAFC] text-slate-800 font-sans p-3 sm:p-6 md:p-8 antialiased selection:bg-blue-600 selection:text-white flex flex-col justify-between">
      <div className="max-w-7xl mx-auto w-full space-y-6">
        {/* 1. Header Command Center */}
        <HeaderCommandCenter
          classInfo={classInfo}
          onClassChange={handleClassChange}
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          onOpenExportModal={() => setIsExportModalOpen(true)}
          studentCount={{
            male: classInfo.maleCount,
            female: classInfo.femaleCount,
            total: students.length
          }}
        />

        {/* 2. Hero Stats & Health Radar Cards */}
        <HeroStatsRadar
          metrics={healthMetric}
          pendingCount={pendingApprovalCount}
          atRiskCount={atRiskStudents.length}
          starStudents={starStudents}
          activeTab={activeTab}
          onTabChange={setActiveTab}
        />

        {/* 3. Sleek Internal Sub-Module Navigation Tabs */}
        <TabNav
          activeTab={activeTab}
          onTabChange={setActiveTab}
          pendingApprovalCount={pendingApprovalCount}
          atRiskCount={atRiskStudents.length}
        />

        {/* 4. Sub-Module Active Views */}
        <main className="transition-all duration-300">
          {activeTab === 'approval' && (
            <WaliKelasApprovalPanel
              requests={leaveRequests}
              onApprove={handleApproveLeave}
              onReject={handleRejectLeave}
              onApproveAllPending={handleApproveAllPending}
              onViewAttachment={setViewAttachmentReq}
              onOpenWhatsApp={handleOpenWhatsApp}
              onSelectStudent={(id) => setSelectedStudent(students.find(s => s.id === id) || null)}
            />
          )}

          {activeTab === 'health' && (
            <WaliKelasHealthPanel
              students={students}
              atRiskStudents={atRiskStudents}
              metrics={healthMetric}
              onSelectStudent={(id) => setSelectedStudent(students.find(s => s.id === id) || null)}
              onTakeIntervention={handleTakeIntervention}
            />
          )}

          {activeTab === 'discipline' && (
            <WaliKelasDisciplinePanel
              violations={violations}
              onOpenAddIncidentModal={() => setIsAddIncidentOpen(true)}
              onSelectStudent={(id) => setSelectedStudent(students.find(s => s.id === id) || null)}
              onUpdateBKStatus={handleUpdateBKStatus}
            />
          )}

          {activeTab === 'halloffame' && (
            <WaliKelasAchievementPanel
              students={students}
              achievements={achievements}
              onOpenBadgeModal={(st) => setBadgeStudent(st)}
              onSelectStudent={(id) => setSelectedStudent(students.find(s => s.id === id) || null)}
            />
          )}

          {activeTab === 'rekap' && (
            <WaliKelasRekapPanel
              journalEntries={journalEntries}
              onOpenAddJournalModal={() => setIsAddJournalOpen(true)}
              onOpenExportModal={() => setIsExportModalOpen(true)}
            />
          )}
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
      />

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
