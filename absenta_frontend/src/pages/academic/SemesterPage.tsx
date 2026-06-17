import React, { useState, useEffect, useMemo, useCallback, lazy, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Card, Modal, SectionCard } from '../../components/ui';
import SemesterList from '../../components/academic/semester/SemesterList';
import { useAuth } from '../../hooks/useAuth';
import type { Semester } from '../../types/academic';
import { getAcademicStats, type AcademicStats } from '../../api/academic-stats.api';
import { Clock, Calendar } from 'lucide-react';
import { AcademicPageLayout } from '../../components/academic/AcademicPageLayout';

const SemesterForm = lazy(() => import('../../components/academic/semester/SemesterForm'));
const SemesterTransitionWizard = lazy(() => import('../../components/academic/semester/SemesterTransitionWizard'));

type ModalMode = 'create' | 'edit' | 'view' | null;

interface ModalState {
  mode: ModalMode;
  semesterId?: string;
  isOpen: boolean;
}

export const SemesterPage: React.FC = () => {
  const { can, isLoading: authLoading } = useAuth();
  const [modalState, setModalState] = useState<ModalState>({ mode: null, isOpen: false });
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [stats, setStats] = useState<AcademicStats | null>(null);
  const [isLoadingStats, setIsLoadingStats] = useState(true);
  const [wizardOpen, setWizardOpen] = useState(false);

  // Permissions
  const canCreate = can('academic.semesters.create');
  const canEdit = can('academic.semesters.update');
  const canView = can('academic.semesters.view.list');
  const canSetActive = can('academic.semesters.set_active');

  // Load academic stats
  useEffect(() => {
    const loadStats = async () => {
      if (!canView) return;
      try {
        setIsLoadingStats(true);
        const response = await getAcademicStats();
        setStats(response.data);
      } catch (error) {
        console.error('Failed to load academic stats:', error);
      } finally {
        setIsLoadingStats(false);
      }
    };
    loadStats();
  }, [canView, refreshTrigger]);

  const navigate = useNavigate();

  const academicStats = useMemo(() => [
    {
      title: "Total Semester",
      value: stats?.total_semester || 0,
      icon: <Clock size={14} />,
      gradient: "from-indigo-500 to-purple-600"
    },
    {
      title: "Semester Aktif",
      value: stats?.active_semester || '-',
      icon: <Calendar size={14} />,
      gradient: "from-green-500 to-emerald-600",
      onClick: () => navigate('/academic/tahun-pelajaran')
    }
  ], [stats, navigate]);

  const handleCreateSemester = useCallback(() => {
    setModalState({ mode: 'create', isOpen: true });
  }, []);

  const handleEditSemester = useCallback((sem: Semester) => {
    setModalState({ mode: 'edit', semesterId: sem.id, isOpen: true });
  }, []);

  const handleViewSemester = useCallback((sem: Semester) => {
    setModalState({ mode: 'view', semesterId: sem.id, isOpen: true });
  }, []);

  const handleCloseModal = useCallback(() => {
    setModalState({ mode: null, isOpen: false });
  }, []);

  const handleFormSuccess = useCallback(() => {
    handleCloseModal();
    setRefreshTrigger(prev => prev + 1);
  }, [handleCloseModal]);

  const handleWizardDone = useCallback(() => {
    setWizardOpen(false);
    setRefreshTrigger(prev => prev + 1);
  }, []);

  const handleCloseWizard = useCallback(() => {
    setWizardOpen(false);
  }, []);

  return (
    <AcademicPageLayout
      title="Manajemen Semester"
      description="Atur periode semester aktif untuk keperluan pengolahan nilai dan kehadiran akademik."
      stats={academicStats}
      isLoadingStats={isLoadingStats}
      breadcrumbs={[
        { label: 'Akademik', path: '/academic' },
        { label: 'Semester', path: '/academic/semester' }
      ]}
      instruction={{
        title: "Panduan Semester",
        description: "Halaman ini digunakan untuk mengelola periode semester di sekolah Anda.",
        items: [
          { text: "Satu Tahun Pelajaran biasanya terdiri dari 2 Semester (Ganjil & Genap)." },
          { text: "Mengaktifkan Semester akan otomatis mengaktifkan Tahun Pelajaran induknya & menonaktifkan yang lain." },
          { text: "Sistem otomatis mengaktifkan status siswa (NAIK/TINGGAL -> AKTIF) saat semester diaktifkan." }
        ]
      }}
      canView={canView}
      isLoading={authLoading}
      permissionMessage="Anda tidak memiliki izin untuk mengakses halaman data semester."
      hardeningModuleKey="semesterpage"
    >
      <div className="space-y-6">
        <SectionCard
          title="Manajemen Semester"
          icon={Calendar}
          fullWidth
          noPadding
        >
          <SemesterList
            onAdd={canCreate ? handleCreateSemester : undefined}
            onEdit={canEdit ? handleEditSemester : undefined}
            onView={handleViewSemester}
            refreshTrigger={refreshTrigger}
            toolbarRight={canSetActive ? (
              <Card className="p-2 border-gray-100 dark:border-slate-800 dark:bg-slate-900/50 shadow-none">
                <div className="flex items-center gap-3">
                  <div className="hidden sm:flex items-center gap-2">
                    <div className="p-1.5 bg-blue-50 dark:bg-blue-900/20 rounded-md">
                      <Clock className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div className="hidden md:block">
                      <p className="text-[11px] font-bold text-gray-800 dark:text-gray-200 leading-tight">Transisi Semester</p>
                      <p className="text-[9px] text-gray-500 dark:text-gray-400 leading-tight">Pindah semester dengan aman</p>
                    </div>
                  </div>
                  <Button size="sm" onClick={() => setWizardOpen(true)} className="h-8 text-xs">Buka Wizard</Button>
                </div>
              </Card>
            ) : undefined}
          />
        </SectionCard>
      </div>

      <Modal
        isOpen={modalState.isOpen}
        onClose={handleCloseModal}
        title={modalState.mode === 'create' ? 'Tambah Semester' : 'Data Semester'}
        size="lg"
      >
        {modalState.mode && (
          <Suspense fallback={<div className="p-8 text-center text-gray-500">Memuat form...</div>}>
            <SemesterForm
              semesterId={modalState.semesterId}
              mode={modalState.mode}
              onSuccess={handleFormSuccess}
              onCancel={handleCloseModal}
            />
          </Suspense>
        )}
      </Modal>

      <Modal
        isOpen={wizardOpen}
        onClose={handleCloseWizard}
        title="Wizard Transisi Semester"
        size="xl"
      >
        {wizardOpen && (
          <Suspense fallback={<div className="p-8 text-center text-gray-500">Memuat form...</div>}>
            <SemesterTransitionWizard
              onDone={handleWizardDone}
              onClose={handleCloseWizard}
            />
          </Suspense>
        )}
      </Modal>
    </AcademicPageLayout>
  );
};

export default SemesterPage;

