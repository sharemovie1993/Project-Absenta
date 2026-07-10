import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Modal } from '../../components/ui/Modal';
import GuruList from '../../components/academic/guru/GuruList';
import { useAuth } from '../../hooks/useAuth';
import toast from 'react-hot-toast';
import type { Guru } from '../../types/academic';
import { getAcademicStats, type AcademicStats } from '../../api/academic-stats.api';
import { Users, UserCheck, School, Download } from 'lucide-react';
import { AcademicPageLayout } from '../../components/academic/AcademicPageLayout';
import { Button, SectionCard, Loader } from '../../components/ui';
import { 
  getGuruList, 
  importGuruFromExcel, 
  downloadGuruImportTemplate 
} from '../../api/academic/guru.api';
import { downloadFileFromBlob, generateStandardFilename } from '../../utils/file-download.utils';
import { exportDataToExcel, generateImportTemplate } from '../../utils/export.utils';
import { generateAdvancedTemplate } from '../../utils/excel-advanced.utils';
import { lazy, Suspense } from 'react';

// Lazy load heavy components to improve TBT and initial bundle size
const GuruForm = lazy(() => import('../../components/academic/guru/GuruForm').then(module => ({ default: module.GuruForm })));
const ExcelImportModal = lazy(() => import('../../components/academic/shared/ExcelImportModal').then(module => ({ default: module.ExcelImportModal })));

type ModalMode = 'create' | 'edit' | 'view' | null;

interface ModalState {
  mode: ModalMode;
  guruId?: string;
  isOpen: boolean;
}

export const GuruPage: React.FC = () => {
  const { can, isLoading: authLoading } = useAuth();

  const navigate = useNavigate();

  const [modalState, setModalState] = useState<ModalState>({ mode: null, isOpen: false });
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [stats, setStats] = useState<AcademicStats | null>(null);
  const [isLoadingStats, setIsLoadingStats] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [importOpen, setImportOpen] = useState(false);

  // Check permissions
  const canCreate = can('academic.teachers.create');
  const canEdit = can('academic.teachers.update');
  const canView = can('academic.teachers.view.list');

  // Load academic stats
  useEffect(() => {
    const loadStats = async () => {
      if (!canView) return;
      try {
        setIsLoadingStats(true);
        const response = await getAcademicStats();
        setStats(response.data);
      } catch (error) {
        console.error('Error loading academic stats:', error);
      } finally {
        setIsLoadingStats(false);
      }
    };
    loadStats();
  }, [canView, refreshTrigger]);

  const academicStats = useMemo(() => [
    {
      title: "Total Guru",
      value: stats?.total_guru || 0,
      icon: <Users size={14} />,
      gradient: "from-blue-500 to-indigo-600",
      subtitle: "Tenaga pendidik terdaftar"
    },
    {
      title: "Guru Aktif",
      value: stats?.total_guru || 0,
      icon: <UserCheck size={14} />,
      gradient: "from-emerald-500 to-teal-600",
      subtitle: "Guru dengan jadwal aktif",
      onClick: () => navigate('/academic/guru-mapel')
    }
  ], [stats, navigate]);

  const handleCreateGuru = useCallback(() => setModalState({ mode: 'create', isOpen: true }), []);
  const handleEditGuru = useCallback((g: Guru) => setModalState({ mode: 'edit', guruId: g.id, isOpen: true }), []);
  const handleViewGuru = useCallback((g: Guru) => setModalState({ mode: 'view', guruId: g.id, isOpen: true }), []);
  const handleCloseModal = useCallback(() => setModalState({ mode: null, isOpen: false }), []);

  const handleFormSuccess = useCallback(() => {
    handleCloseModal();
    setRefreshTrigger(prev => prev + 1);
  }, [handleCloseModal]);

  const handleExport = useCallback(async () => {
    try {
      setIsExporting(true);
      // Fetch all data (limit 1000 to get all teachers)
      const response = await getGuruList(1, 1000);
      if (response.success && response.data.length > 0) {
        exportDataToExcel<Guru>(response.data, [
          { header: 'Nama Lengkap', accessor: (row: Guru) => row.nama_guru, width: 30 },
          { header: 'NIP', accessor: (row: Guru) => row.nip || '-', width: 20 },
          { header: 'Email', accessor: (row: Guru) => row.email || '-', width: 25 },
          { header: 'No. HP', accessor: (row: Guru) => row.no_hp || '-', width: 15 },
          { header: 'Status Kepegawaian', accessor: (row: Guru) => row.status_kepegawaian || '-', width: 20 },
          { header: 'JK', accessor: (row: Guru) => row.jenis_kelamin || '-', width: 5 }
        ], 'Laporan_Guru', 'DAFTAR TENAGA PENDIDIK & KEPENDIDIKAN');
        toast.success('Data guru berhasil diekspor.');
      } else {
        toast('Tidak ada data untuk diekspor.', { icon: '⚠️' });
      }
    } catch (e: unknown) {
      const errorMsg = e instanceof Error ? e.message : 'Gagal mengekspor data.';
      toast.error(errorMsg);
    } finally {
      setIsExporting(false);
    }
  }, []);

  const handleTemplateDownload = useCallback(async () => {
    try {
      toast('Menyiapkan template cerdas...', { icon: 'ℹ️' });
      await generateAdvancedTemplate(
        [
          { header: 'Nama Lengkap', key: 'nama_guru', width: 35, required: true },
          { header: 'NIP', key: 'nip', width: 20 },
          { header: 'Email', key: 'email', width: 30 },
          { header: 'No. HP', key: 'no_hp', width: 15 },
          { header: 'JK (L/P)', key: 'jenis_kelamin', width: 10, dropdown: { refKey: 'jk' } },
          { header: 'Status Kepegawaian', key: 'status_kepegawaian', width: 20, dropdown: { refKey: 'status' } }
        ],
        {
          fileName: 'template_impor_guru',
          instructions: [
            'Nama Lengkap wajib diisi.',
            'NIP dapat diisi jika memiliki.',
            'Pilih Jenis Kelamin dan Status Kepegawaian dari dropdown jika ingin diisi.',
            'Kolom Kuning Emas wajib diisi.'
          ],
          referenceData: {
            jk: ['L', 'P'],
            status: ['PNS', 'PPPK', 'GTY', 'GTT', 'HONORER']
          }
        }
      );
      toast.success('Template cerdas berhasil diunduh.');
    } catch (error: unknown) {
      const errorMsg = error instanceof Error ? error.message : 'Gagal mengunduh template';
      toast.error(errorMsg);
    }
  }, []);

  const handleOpenImport = useCallback(() => setImportOpen(true), []);
  const handleCloseImport = useCallback(() => setImportOpen(false), []);

  return (
    <AcademicPageLayout
      title="Data Guru & Staf"
      description="Kelola daftar nama dan biodata GTK (Guru & Tenaga Kependidikan). Seluruh personel sekolah seperti Guru, Tata Usaha (TU), Satpam, dan Caraka terdaftar di sini untuk absensi, manajemen penugasan, dan hak akses."
      stats={academicStats}
      isLoadingStats={isLoadingStats}
      breadcrumbs={[
        { label: 'Akademik', path: '/academic' },
        { label: 'Data Guru & Staf', path: '/academic/guru' }
      ]}
      instruction={{
        title: "Panduan Data Personel",
        description: (
          <div className="space-y-2">
            <p>Direktori lengkap profil GTK sekolah. Data ini mencakup Guru (tenaga pendidik) serta staf kependidikan (TU, Satpam, Caraka, dll.) yang dibutuhkan untuk absensi harian, penugasan, dan login sistem.</p>
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-1 text-slate-500">
              <p><strong>Fungsi:</strong> Mengatur identitas Guru & Tenaga Kependidikan.</p>
              <p><strong>Waktu Penggunaan:</strong> Kapan saja saat ada staf/guru baru atau perubahan data.</p>
            </div>
          </div>
        ),
        items: [
          { text: "Daftarkan personel dengan NIP, NIK, atau nomor pengenal yang valid." },
          { text: "Tentukan peran (role) untuk hak akses login sistem jika dibutuhkan." },
          { text: "Gunakan fitur Edit untuk memperbarui biodata lengkap personel." }
        ]
      }}
      canView={canView}
      isLoading={authLoading}
      permissionMessage="Anda tidak memiliki izin untuk mengakses data guru."
      hardeningModuleKey="academic_guru"
    >
      <div className="space-y-6">
        <SectionCard
          fullWidth
          noPadding
        >
          <GuruList
            onEdit={canEdit ? handleEditGuru : undefined}
            onView={handleViewGuru}
            onAdd={canCreate ? handleCreateGuru : undefined}
            onImport={canCreate ? handleOpenImport : undefined}
            onExport={handleExport}
            isExporting={isExporting}
            refreshTrigger={refreshTrigger}
            onRefresh={useCallback(() => setRefreshTrigger(prev => prev + 1), [])}
          />
        </SectionCard>
      </div>

      <Suspense fallback={<div className="p-8 flex justify-center"><Loader /></div>}>
        <ExcelImportModal
          isOpen={importOpen}
          onClose={handleCloseImport}
          title="Import Data Guru"
          onImport={importGuruFromExcel}
          onDownloadTemplate={handleTemplateDownload}
          onSuccess={() => setRefreshTrigger(prev => prev + 1)}
          sampleDataHint="Gunakan NUPTK atau NIK sebagai pengenal unik untuk menghindari duplikasi."
        />
      </Suspense>

      <Modal
        isOpen={modalState.isOpen}
        onClose={handleCloseModal}
        title={modalState.mode === 'create' ? 'Tambah Guru' : 'Data Guru'}
        size="4xl"
      >
        <Suspense fallback={<div className="p-12 flex justify-center"><Loader /></div>}>
          {modalState.mode && (
            <GuruForm
              mode={modalState.mode}
              guruId={modalState.guruId}
              onSuccess={handleFormSuccess}
              onCancel={handleCloseModal}
            />
          )}
        </Suspense>
      </Modal>
    </AcademicPageLayout>
  );
};

export default GuruPage;

