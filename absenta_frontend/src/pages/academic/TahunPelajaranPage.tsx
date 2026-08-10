import React, { useState, useEffect, useMemo, useCallback, lazy, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import { Modal, SectionCard } from '../../components/ui';
import TahunPelajaranList from '../../components/academic/tahun-pelajaran/TahunPelajaranList';
import { useAuthStore } from '../../store/authStore';
import { useCapabilities } from '../../hooks/useCapabilities';
import type { TahunPelajaran } from '../../types/academic';
import { useQuery } from '@tanstack/react-query';
import { getAcademicStats } from '../../api/academic-stats.api';
import { getActiveTahunPelajaran, academicQueryKeys } from '../../api/academic/tahunPelajaran.api';
import { useQueryClient } from '@tanstack/react-query';
import { useModalState } from '../../hooks/useModalState';
import { Calendar, CheckCircle } from 'lucide-react';
import { AcademicPageLayout } from '../../components/academic/AcademicPageLayout';

const TahunPelajaranForm = lazy(() => import('../../components/academic/tahun-pelajaran/TahunPelajaranForm').then(m => ({ default: m.TahunPelajaranForm })));

export const TahunPelajaranPage: React.FC = () => {
  
  const { isKurikulum, isAdmin, can: capCan } = useCapabilities();
  const queryClient = useQueryClient();
  const { modal, openCreate, openEdit, openView, close } = useModalState();

  // Permissions
  const canCreate = isAdmin || isKurikulum || can('academic.years.create');
  const canEdit = isAdmin || isKurikulum || can('academic.years.update');
  const canView = isAdmin || isKurikulum || can('academic.years.view.list');

  // Queries using React Query
  const { data: statsRes, isLoading: isLoadingStats } = useQuery({
    queryKey: academicQueryKeys.stats,
    queryFn: getAcademicStats,
    enabled: canView,
    staleTime: 5 * 60 * 1000,
  });

  const { data: activeYear } = useQuery({
    queryKey: academicQueryKeys.tahunPelajaran.active,
    queryFn: getActiveTahunPelajaran,
    enabled: canView,
    staleTime: 10 * 60 * 1000,
  });

  const stats = statsRes?.data;

  // Pilar 8: Penanganan State Kosong (Empty State / NoData Handler)
  const isStatsEmpty = !stats || Object.keys(stats).length === 0;
  const showEmptyStateWarning = !isLoadingStats && !activeYear;

  const navigate = useNavigate();

  const academicStats = useMemo(() => [
    {
      title: "Total Periode",
      value: stats?.total_tahun_pelajaran || 0,
      icon: <Calendar size={14} />,
      gradient: "from-blue-500 to-cyan-600"
    },
    {
      title: "Sistem Berjalan",
      value: activeYear?.tahun || 'Tidak ada',
      icon: <CheckCircle size={14} />,
      gradient: "from-green-500 to-emerald-600",
      onClick: () => navigate('/academic/semester')
    }
  ], [stats, activeYear, navigate]);

  // Memoized Callback Handlers
  const handleFormSuccess = useCallback(() => {
    close();
    queryClient.invalidateQueries({ queryKey: academicQueryKeys.tahunPelajaran.all });
    queryClient.invalidateQueries({ queryKey: academicQueryKeys.stats });
  }, [close, queryClient]);

  const getModalTitle = useCallback(() => {
    switch (modal.mode) {
      case 'create': return 'Tambah Tahun Pelajaran Baru';
      case 'edit': return 'Edit Tahun Pelajaran';
      case 'view': return 'Detail Tahun Pelajaran';
      default: return '';
    }
  }, [modal.mode]);

  const handleEdit = useCallback((tp: TahunPelajaran) => {
    openEdit(tp.id);
  }, [openEdit]);

  const handleView = useCallback((tp: TahunPelajaran) => {
    openView(tp.id);
  }, [openView]);

  const handleAdd = useMemo(() => {
    return canCreate ? openCreate : undefined;
  }, [canCreate, openCreate]);

  return (
    <AcademicPageLayout
      title="Tahun Pelajaran"
      description="Atur tahun ajaran sekolah yang aktif. Digunakan sekali setahun saat menyiapkan tahun ajaran baru."
      stats={academicStats}
      isLoadingStats={isLoadingStats}
      breadcrumbs={[
        { label: 'Akademik', path: '/academic' },
        { label: 'Tahun Pelajaran', path: '/academic/tahun-pelajaran' }
      ]}
      instruction={{
        title: "Panduan Tahun Pelajaran",
        description: (
          <div className="space-y-2">
            <p>Tahun Pelajaran adalah masa belajar utama sekolah. Pastikan hanya ada satu tahun ajaran yang aktif agar absensi dan data siswa berjalan dengan benar.</p>
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-1 text-slate-500">
              <p><strong>Fungsi:</strong> Menentukan rentang tahun ajaran sekolah.</p>
              <p><strong>Waktu Penggunaan:</strong> Sekali setahun saat menyambut tahun ajaran baru.</p>
            </div>
          </div>
        ),
        items: [
          { text: "Gunakan format YYYY/YYYY (contoh: 2025/2026)." },
          { text: "Hanya satu tahun yang bisa berstatus AKTIF dalam satu waktu." },
          { text: "Mengganti tahun aktif akan mengalihkan seluruh operasional sekolah ke periode tersebut." }
        ],
        tips: [
          "Pastikan Tahun Pelajaran sudah dibuat sebelum membuat Semester.",
          "Data di tahun sebelumnya tidak hilang, tetap bisa dilihat dengan mengganti filter tahun."
        ]
      }}
      canView={canView}
      permissionMessage="Anda tidak memiliki izin untuk mengakses halaman data tahun pelajaran."
      hardeningModuleKey="tahunpelajaranpage"
    >
      <div className="space-y-6">
        {showEmptyStateWarning && (
          <div className="p-4 bg-amber-500/10 border border-amber-500/25 rounded-2xl text-amber-600 dark:text-amber-400 text-xs font-semibold flex items-center gap-2 animate-in fade-in slide-in-from-top-1 duration-200">
            <span>⚠️ Perhatian: Belum ada Tahun Pelajaran aktif yang diatur di sistem. Silakan aktifkan salah satu periode di bawah ini.</span>
          </div>
        )}
        <SectionCard
          fullWidth
          noPadding
        >
          <TahunPelajaranList
            onEdit={handleEdit}
            onView={handleView}
            onAdd={handleAdd}
          />
        </SectionCard>
      </div>

      <Modal
        isOpen={modal.isOpen}
        onClose={close}
        title={getModalTitle()}
        size="lg"
      >
        {modal.mode && (
          <Suspense fallback={<div className="p-8 text-center text-gray-500">Memuat form...</div>}>
            <TahunPelajaranForm
              tahunPelajaranId={modal.selectedId}
              mode={modal.mode}
              onSuccess={handleFormSuccess}
              onCancel={close}
            />
          </Suspense>
        )}
      </Modal>
    </AcademicPageLayout>
  );
};

export default TahunPelajaranPage;

