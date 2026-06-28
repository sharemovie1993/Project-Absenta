import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Modal } from '../../components/ui/Modal';
import JurusanList from '../../components/academic/jurusan/JurusanList';
import { useAuth } from '../../hooks/useAuth';
import toast from 'react-hot-toast';
import type { Jurusan } from '../../types/academic';
import { getAcademicStats, type AcademicStats } from '../../api/academic-stats.api';
import { School, Users, Download, Calendar, Layers } from 'lucide-react';
import { importJurusanFromExcel, downloadJurusanImportTemplate, getJurusanList } from '../../api/academic/jurusan.api';
import { Alert, Card, Button, SectionCard, Loader } from '../../components/ui';
import { AcademicPageLayout } from '../../components/academic/AcademicPageLayout';
import { downloadFileFromBlob, generateStandardFilename } from '../../utils/file-download.utils';
import { exportDataToExcel, generateImportTemplate } from '../../utils/export.utils';
import { generateAdvancedTemplate } from '../../utils/excel-advanced.utils';
import { lazy, Suspense, useCallback } from 'react';

// Lazy load heavy components
const JurusanForm = lazy(() => import('../../components/academic/jurusan/JurusanForm').then(module => ({ default: module.JurusanForm })));
const ExcelImportModal = lazy(() => import('../../components/academic/shared/ExcelImportModal').then(module => ({ default: module.ExcelImportModal })));

type ModalMode = 'create' | 'edit' | 'view' | null;

interface ModalState {
  mode: ModalMode;
  jurusanId?: string;
  isOpen: boolean;
}

// v1.0.2 - Fixed Excel Export Engine
export const JurusanPage: React.FC = () => {
  const { can, isLoading: authLoading } = useAuth();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();


  const [modalState, setModalState] = useState<ModalState>({ mode: null, isOpen: false });
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [stats, setStats] = useState<AcademicStats | null>(null);
  const [isLoadingStats, setIsLoadingStats] = useState(true);
  const [isExporting, setIsExporting] = useState(false);

  // Import State
  const [importOpen, setImportOpen] = useState(false);

  // Permissions
  const canCreate = can('academic.structures.create');
  const canEdit = can('academic.structures.update');
  const canView = can('academic.structures.view.list');

  // Load academic statistics
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
      title: "Total Jurusan",
      value: stats?.total_jurusan || 0,
      icon: <School size={14} />,
      gradient: "from-blue-500 to-indigo-600",
      subtitle: "Jurusan terdaftar"
    },
    {
      title: "Total Kelas",
      value: stats?.total_kelas || 0,
      icon: <Layers size={14} />,
      gradient: "from-emerald-500 to-teal-600",
      subtitle: "Rombongan belajar aktif",
      onClick: () => navigate('/academic/kelas')
    },
    {
      title: "Total Guru",
      value: stats?.total_guru || 0,
      icon: <Users size={14} />,
      gradient: "from-purple-500 to-indigo-600",
      subtitle: "Tenaga pengajar",
      onClick: () => navigate('/academic/guru')
    },
    {
      title: "Tahun Pelajaran",
      value: stats?.tahun_pelajaran?.tahun || '-',
      icon: <Calendar size={14} />,
      gradient: "from-amber-500 to-orange-600",
      subtitle: stats?.semester?.nama_semester || "Semester Aktif",
      onClick: () => navigate('/academic/tahun-pelajaran')
    }
  ], [stats, navigate]);

  const handleAddJurusan = useCallback(() => setModalState({ mode: 'create', isOpen: true }), []);
  const handleEditJurusan = useCallback((j: Jurusan) => setModalState({ mode: 'edit', jurusanId: j.id, isOpen: true }), []);
  const handleViewJurusan = useCallback((j: Jurusan) => setModalState({ mode: 'view', jurusanId: j.id, isOpen: true }), []);
  const handleCloseModal = useCallback(() => setModalState({ mode: null, isOpen: false }), []);

  const handleFormSuccess = useCallback(() => {
    handleCloseModal();
    setRefreshTrigger(prev => prev + 1);
  }, [handleCloseModal]);

  const handleTemplateDownload = useCallback(async () => {
    try {
      toast('Menyiapkan template...', { icon: 'ℹ️' });
      await generateAdvancedTemplate(
        [
          { header: 'Nama Jurusan', key: 'nama', width: 35, required: true },
          { header: 'Kode', key: 'kode', width: 15, required: true },
          { header: 'Singkatan', key: 'singkatan', width: 15 }
        ],
        {
          fileName: 'template_impor_jurusan',
          instructions: [
            'Nama Jurusan harus diisi lengkap (contoh: Rekayasa Perangkat Lunak).',
            'Kode Jurusan digunakan sebagai pengenal unik (contoh: RPL).',
            'Kolom Kuning Emas wajib diisi.'
          ]
        }
      );
      toast.success('Template berhasil diunduh.');
    } catch (e: unknown) {
      const errorMsg = e instanceof Error ? e.message : 'Gagal mengunduh template.';
      toast.error(errorMsg);
    }
  }, []);

  const handleExport = useCallback(async () => {
    try {
      setIsExporting(true);
      // Fetch all data (limit 1000 to get all majors)
      const response = await getJurusanList(1, 1000);
      if (response.success && response.data.length > 0) {
        exportDataToExcel<Jurusan>(response.data, [
          { header: 'Nama Jurusan', accessor: (row: Jurusan) => row.nama, width: 30 },
          { header: 'Kode', accessor: (row: Jurusan) => row.kode || '', width: 15 },
          { header: 'Singkatan', accessor: (row: Jurusan) => row.singkatan || '', width: 15 }
        ], 'Laporan_Jurusan', 'DATA MASTER JURUSAN SEKOLAH');
        toast.success('Data jurusan berhasil diekspor.');
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

  const handleOpenImport = useCallback(() => setImportOpen(true), []);
  const handleCloseImport = useCallback(() => setImportOpen(false), []);

  return (
    <AcademicPageLayout
      title="Manajemen Jurusan"
      description="Kelola daftar jurusan belajar yang ada di sekolah. Digunakan jika ada jurusan baru atau perubahan nama jurusan."
      stats={academicStats}
      isLoadingStats={isLoadingStats}
      breadcrumbs={[
        { label: 'Akademik', path: '/academic' },
        { label: 'Jurusan', path: '/academic/jurusan' }
      ]}
      instruction={{
        title: "Panduan Jurusan",
        description: (
          <div className="space-y-2">
            <p>Daftar bidang keahlian belajar siswa di sekolah. Jurusan ini menjadi wadah pengelompokan kelas dan mata pelajaran.</p>
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-1 text-slate-500">
              <p><strong>Fungsi:</strong> Mengatur daftar jurusan belajar sekolah.</p>
              <p><strong>Waktu Penggunaan:</strong> Hanya saat pendaftaran awal sekolah atau ketika ada jurusan baru yang dibuka.</p>
            </div>
          </div>
        ),
        items: [
          { text: "Tambah jurusan secara manual atau melalui Impor Excel." },
          { text: "Pastikan Kode Jurusan unik untuk menghindari bentrokan data." },
          { text: "Gunakan fitur Cari untuk menemukan jurusan tertentu dengan cepat." }
        ]
      }}
      canView={canView}
      isLoading={authLoading}
      permissionMessage="Anda tidak memiliki izin untuk mengakses data jurusan."
      hardeningModuleKey="jurusanpage"
    >
      <div className="space-y-6">
        <SectionCard 
          fullWidth 
          noPadding
        >
          <JurusanList
            onAdd={canCreate ? handleAddJurusan : undefined}
            onEdit={canEdit ? handleEditJurusan : undefined}
            onView={handleViewJurusan}
            onImport={canCreate ? handleOpenImport : undefined}
            onExport={handleExport}
            isExporting={isExporting}
            refreshTrigger={refreshTrigger}
          />
        </SectionCard>
      </div>

      <Suspense fallback={<div className="p-8 flex justify-center"><Loader /></div>}>
        <ExcelImportModal
          isOpen={importOpen}
          onClose={handleCloseImport}
          title="Import Data Jurusan"
          onImport={importJurusanFromExcel}
          onDownloadTemplate={handleTemplateDownload}
          onSuccess={() => setRefreshTrigger(prev => prev + 1)}
          sampleDataHint="Pastikan file Excel berisi Nama Jurusan dan Kode Jurusan yang benar."
        />
      </Suspense>

      {/* Modal for Create/Edit/View */}
      <Modal
        isOpen={modalState.isOpen}
        onClose={handleCloseModal}
        title={modalState.mode === 'create' ? 'Tambah Jurusan' : 'Data Jurusan'}
        size="lg"
      >
        <Suspense fallback={<div className="p-12 flex justify-center"><Loader /></div>}>
          {modalState.mode && (
            <JurusanForm
              jurusanId={modalState.jurusanId}
              mode={modalState.mode}
              onSuccess={handleFormSuccess}
              onCancel={handleCloseModal}
            />
          )}
        </Suspense>
      </Modal>
    </AcademicPageLayout>
  );
};
