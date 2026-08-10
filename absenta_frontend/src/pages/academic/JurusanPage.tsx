import React, { useState, useEffect, useMemo, useCallback, lazy, Suspense } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Modal } from '../../components/ui/Modal';
import { MethodPickerModal } from '../../components/common/MethodPickerModal';
import JurusanList from '../../components/academic/jurusan/JurusanList';
import { ProgramKeahlianPanel } from '../../components/academic/jurusan/ProgramKeahlianPanel';
import { useAuthStore } from '../../store/authStore';
import { useCapabilities } from '../../hooks/useCapabilities';
import toast from 'react-hot-toast';
import type { Jurusan } from '../../types/academic';
import { getAcademicStats, type AcademicStats } from '../../api/academic-stats.api';
import { School, Users, Download, Calendar, Layers, BookMarked, GraduationCap, FileText, Sparkles, ChevronRight } from 'lucide-react';
import { importJurusanFromExcel, downloadJurusanImportTemplate, getJurusanList } from '../../api/academic/jurusan.api';
import { Alert, Card, Button, SectionCard, Loader } from '../../components/ui';
import { TabSwitcher } from '../../components/ui/TabSwitcher';
import { AcademicPageLayout } from '../../components/academic/AcademicPageLayout';
import { downloadFileFromBlob, generateStandardFilename } from '../../utils/file-download.utils';
import { exportDataToExcel, generateImportTemplate } from '../../utils/export.utils';
import { generateAdvancedTemplate } from '../../utils/excel-advanced.utils';

// Lazy load heavy components
const JurusanForm = lazy(() => import('../../components/academic/jurusan/JurusanForm').then(module => ({ default: module.JurusanForm })));
const JurusanWizardForm = lazy(() => import('../../components/academic/jurusan/JurusanWizardForm').then(module => ({ default: module.JurusanWizardForm })));
const ExcelImportModal = lazy(() => import('../../components/academic/shared/ExcelImportModal').then(module => ({ default: module.ExcelImportModal })));

type ModalMode = 'create' | 'edit' | 'view' | null;
type ActiveTab = 'konsentrasi' | 'program';

interface ModalState {
  mode: ModalMode;
  jurusanId?: string;
  isOpen: boolean;
}

// v1.1.0 - Added Program Keahlian Tab (Kurikulum Merdeka)
export const JurusanPage: React.FC = () => {
  const { can, isLoading: authLoading } = useAuthStore();
  const { isKurikulum, isProgramHead, isAdmin, can: capCan } = useCapabilities();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<ActiveTab>('konsentrasi');
  const [modalState, setModalState] = useState<ModalState>({ mode: null, isOpen: false });
  const [subMode, setSubMode] = useState<'manual' | 'wizard' | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [isExporting, setIsExporting] = useState(false);

  // Import State
  const [importOpen, setImportOpen] = useState(false);

  // Permissions
  const canCreate = isAdmin || isKurikulum || isProgramHead || can('academic.structures.create');
  const canEdit = isAdmin || isKurikulum || isProgramHead || can('academic.structures.update');
  const canView = isAdmin || isKurikulum || isProgramHead || can('academic.structures.view.list');

  // Queries using React Query
  const { data: statsRes, isLoading: isLoadingStats } = useQuery({
    queryKey: ['academic-stats'],
    queryFn: getAcademicStats,
    enabled: canView,
    staleTime: 5 * 60 * 1000,
  });

  const stats = statsRes?.data || null;

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

  const handleAddJurusan = useCallback(() => {
    setSubMode(null);
    setModalState({ mode: 'create', isOpen: true });
  }, []);
  const handleEditJurusan = useCallback((j: Jurusan) => setModalState({ mode: 'edit', jurusanId: j.id, isOpen: true }), []);
  const handleViewJurusan = useCallback((j: Jurusan) => setModalState({ mode: 'view', jurusanId: j.id, isOpen: true }), []);
  const handleCloseModal = useCallback(() => {
    setModalState({ mode: null, isOpen: false });
    setSubMode(null);
  }, []);

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
          { header: 'Singkatan', key: 'singkatan', width: 15 },
          { header: 'Program Keahlian', key: 'program_keahlian', width: 30 }
        ],
        {
          fileName: 'template_impor_jurusan',
          instructions: [
            'Nama Jurusan (Konsentrasi Keahlian) harus diisi lengkap (contoh: Rekayasa Perangkat Lunak).',
            'Kode Jurusan digunakan sebagai pengenal unik (contoh: RPL).',
            'Program Keahlian adalah induk dari Jurusan tersebut (contoh: Teknik Komputer dan Informatika).',
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
      const response = await getJurusanList(1, 1000);
      if (response.success && response.data.length > 0) {
        exportDataToExcel<Jurusan>(response.data, [
          { header: 'Nama Jurusan', accessor: (row: Jurusan) => row.nama, width: 30 },
          { header: 'Kode', accessor: (row: Jurusan) => row.kode || '', width: 15 },
          { header: 'Singkatan', accessor: (row: Jurusan) => row.singkatan || '', width: 15 },
          { header: 'Program Keahlian', accessor: (row: Jurusan) => row.ProgramKeahlian?.nama || '-', width: 25 }
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
      title="Manajemen Jurusan & Program Keahlian"
      description="Kelola hierarki keahlian sekolah: Program Keahlian (induk) dan Konsentrasi Keahlian (jurusan). Sesuai Kurikulum Merdeka SMK."
      stats={academicStats}
      isLoadingStats={isLoadingStats}
      breadcrumbs={[
        { label: 'Akademik', path: '/academic' },
        { label: 'Jurusan', path: '/academic/jurusan' }
      ]}
      instruction={{
        title: "Panduan Keahlian (Kurikulum Merdeka)",
        description: (
          <div className="space-y-2">
            <p>Hierarki: <strong>Bidang Keahlian → Program Keahlian → Konsentrasi Keahlian</strong></p>
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-1 text-slate-500 text-[11px]">
              <p>• <strong>Program Keahlian</strong>: Tingkat X, contoh: <em>Teknik Elektronika (TE)</em></p>
              <p>• <strong>Konsentrasi Keahlian</strong>: Tingkat XI-XII, contoh: <em>TOI, TAV</em></p>
              <p>• Hubungkan Konsentrasi ke Program Keahlian agar Pemetaan Kelas otomatis cerdas</p>
              <p>• Data ini muncul di <strong>Ijazah & Transkrip Nilai</strong></p>
            </div>
          </div>
        ),
        items: [
          { text: "Mulai dari tab 'Program Keahlian' — buat dulu induknya." },
          { text: "Lalu di tab 'Konsentrasi Keahlian', edit setiap jurusan dan pilih Program Keahlian induknya." },
          { text: "Setelah terhubung, fitur Pemetaan Kelas akan otomatis mengelompokkan kelas yang satu program." }
        ]
      }}
      canView={canView}
      isLoading={authLoading}
      permissionMessage="Anda tidak memiliki izin untuk mengakses data jurusan."
      hardeningModuleKey="jurusanpage"
    >
      <div className="space-y-4">
        {/* Tab Navigator */}
        <TabSwitcher
          options={[
            { id: 'konsentrasi', label: 'Konsentrasi Keahlian', icon: GraduationCap, colorClass: 'text-blue-600 dark:text-blue-400' },
            { id: 'program', label: 'Program Keahlian', icon: BookMarked, colorClass: 'text-violet-600 dark:text-violet-400' }
          ]}
          activeTab={activeTab}
          onChange={(id) => setActiveTab(id as ActiveTab)}
        />

        {/* Tab Content */}
        <SectionCard fullWidth noPadding>
          {activeTab === 'konsentrasi' ? (
            <JurusanList
              onAdd={canCreate ? handleAddJurusan : undefined}
              onEdit={canEdit ? handleEditJurusan : undefined}
              onView={handleViewJurusan}
              onImport={canCreate ? handleOpenImport : undefined}
              onExport={handleExport}
              isExporting={isExporting}
              refreshTrigger={refreshTrigger}
            />
          ) : (
            <div className="p-6">
              <ProgramKeahlianPanel canEdit={!!canEdit} />
            </div>
          )}
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

      {/* Method Picker Modal for Create */}
      <MethodPickerModal
        isOpen={modalState.isOpen && modalState.mode === 'create' && !subMode}
        onClose={handleCloseModal}
        title="Tambah Konsentrasi Keahlian"
        options={[
          {
            id: 'manual',
            title: 'Tambah Manual',
            description: 'Isi data jurusan satu per satu secara manual. Cocok untuk nama jurusan kustom.',
            icon: FileText,
            actionLabel: 'Mulai Mengisi',
            colorScheme: 'blue',
            onClick: () => setSubMode('manual')
          },
          {
            id: 'wizard',
            title: 'Tambah Massal (SMK Presets)',
            description: 'Pilih cepat dari preset kurikulum nasional secara massal & otomatis.',
            icon: Sparkles,
            actionLabel: 'Mulai Wizard',
            colorScheme: 'violet',
            badge: 'SMK Presets',
            onClick: () => setSubMode('wizard')
          }
        ]}
      />

      {/* Modal for Create (after subMode selected) / Edit / View */}
      <Modal
        isOpen={modalState.isOpen && (modalState.mode !== 'create' || !!subMode)}
        onClose={handleCloseModal}
        title={modalState.mode === 'create' ? (subMode === 'wizard' ? 'Tambah Massal (Presets)' : 'Tambah Konsentrasi Keahlian') : 'Data Konsentrasi Keahlian'}
        size="lg"
      >
        <Suspense fallback={<div className="p-12 flex justify-center"><Loader /></div>}>
          {modalState.mode === 'create' && subMode === 'manual' ? (
            <JurusanForm
              mode="create"
              onSuccess={handleFormSuccess}
              onCancel={handleCloseModal}
            />
          ) : modalState.mode === 'create' && subMode === 'wizard' ? (
            <JurusanWizardForm
              onSuccess={handleFormSuccess}
              onCancel={handleCloseModal}
            />
          ) : (
            modalState.mode && (
              <JurusanForm
                jurusanId={modalState.jurusanId}
                mode={modalState.mode}
                onSuccess={handleFormSuccess}
                onCancel={handleCloseModal}
              />
            )
          )}
        </Suspense>
      </Modal>
    </AcademicPageLayout>
  );
};
