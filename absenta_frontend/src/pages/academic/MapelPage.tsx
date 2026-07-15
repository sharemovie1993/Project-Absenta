import React, { useState, useEffect, useMemo, useCallback, lazy, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import { Modal } from '../../components/ui/Modal';
import MapelList from '../../components/academic/mapel/MapelList';
import { useAuth } from '../../hooks/useAuth';
import { useJenjang } from '../../hooks/useJenjang';
import toast from 'react-hot-toast';
import type { Mapel } from '../../types/academic';
import { getAcademicStats, type AcademicStats } from '../../api/academic-stats.api';
import { BookOpen, Target, FileText, Sparkles, ChevronRight } from 'lucide-react';
import { PresetWizardModal } from '../../components/academic/mapel/PresetWizardModal';
import { 
  importMapelFromExcel, 
  downloadMapelImportTemplate, 
  getMapelList 
} from '../../api/academic/mapel.api';
import { AcademicPageLayout } from '../../components/academic/AcademicPageLayout';
import { SectionCard } from '../../components/ui';
import { downloadFileFromBlob, generateStandardFilename } from '../../utils/file-download.utils';
import { exportDataToExcel, generateImportTemplate } from '../../utils/export.utils';
import { generateAdvancedTemplate } from '../../utils/excel-advanced.utils';

const MapelForm = lazy(() => import('../../components/academic/mapel/MapelForm').then(m => ({ default: m.MapelForm })));
const ExcelImportModal = lazy(() => import('../../components/academic/shared/ExcelImportModal').then(m => ({ default: m.ExcelImportModal })));

type ModalMode = 'create' | 'edit' | 'view' | null;

interface ModalState {
  mode: ModalMode;
  mapelId?: string;
  isOpen: boolean;
}

export const MapelPage: React.FC = () => {
  const { can, isLoading: authLoading } = useAuth();

  const navigate = useNavigate();
  const { tingkatList: hookTingkatList, jenjang } = useJenjang();
  const isSmkMak = jenjang === 'SMK' || jenjang === 'MAK';

  const [modalState, setModalState] = useState<ModalState>({ mode: null, isOpen: false });
  const [subMode, setSubMode] = useState<'manual' | null>(null);
  const [presetOpen, setPresetOpen] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [stats, setStats] = useState<AcademicStats | null>(null);
  const [isLoadingStats, setIsLoadingStats] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [importOpen, setImportOpen] = useState(false);

  // Permissions
  const canCreate = can('academic.subjects.create');
  const canEdit = can('academic.subjects.update');
  const canView = can('academic.subjects.view.list');

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
      title: "Total Mata Pelajaran",
      value: stats?.total_mapel || 0,
      icon: <BookOpen size={14} />,
      gradient: "from-blue-500 to-cyan-600",
      subtitle: "Mata pelajaran aktif"
    },
    {
      title: "Target Kurikulum",
      value: stats?.total_mapel || 0,
      icon: <Target size={14} />,
      gradient: "from-green-500 to-emerald-600",
      subtitle: "Mapel dengan jam mengajar",
      onClick: () => navigate('/academic/guru-mapel')
    }
  ], [stats, navigate]);

  const handleCreateMapel = useCallback(() => {
    setModalState({ mode: 'create', isOpen: true });
    setSubMode(null);
  }, []);
  const handleEditMapel = useCallback((m: Mapel) => setModalState({ mode: 'edit', mapelId: m.id, isOpen: true }), []);
  const handleViewMapel = useCallback((m: Mapel) => setModalState({ mode: 'view', mapelId: m.id, isOpen: true }), []);
  const handleCloseModal = useCallback(() => {
    setModalState({ mode: null, isOpen: false });
    setSubMode(null);
  }, []);

  const handleFormSuccess = useCallback(() => {
    handleCloseModal();
    setRefreshTrigger(prev => prev + 1);
  }, [handleCloseModal]);

  const handleExport = useCallback(async () => {
    try {
      setIsExporting(true);
      // Fetch all data (limit 1000 to get all subjects)
      const response = await getMapelList(1, 1000);
      if (response.success && response.data.length > 0) {
        exportDataToExcel<Mapel>(response.data, [
          { header: 'Nama Mata Pelajaran', accessor: (row: Mapel) => row.nama_mapel, width: 30 },
          { header: 'Kode Mapel', accessor: (row: Mapel) => row.kode_mapel || '-', width: 15 }
        ], 'Laporan_Mata_Pelajaran', 'DATA MASTER MATA PELAJARAN SEKOLAH');
        toast.success('Data mata pelajaran berhasil diekspor.');
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
      const tingkatList = hookTingkatList.map(String);
      const kelompokList = ['A', 'B', 'C', 'Peminatan', 'Muatan Lokal'];

      await generateAdvancedTemplate(
        [
          { header: 'Nama Mata Pelajaran', key: 'nama_mapel', width: 35, required: true },
          { header: 'Kode Mapel', key: 'kode_mapel', width: 15 },
          { header: 'Tingkat', key: 'tingkat', width: 12, required: true, dropdown: { refKey: 'tingkat' } },
          { header: 'Kelompok', key: 'kelompok', width: 15, dropdown: { refKey: 'kelompok' } }
        ],
        {
          fileName: 'template_impor_mapel',
          instructions: [
            'Pilih Tingkat dan Kelompok dari dropdown yang tersedia.',
            'Nama Mata Pelajaran diisi bebas (contoh: Matematika).',
            'Kolom Kuning Emas wajib diisi.'
          ],
          referenceData: {
            tingkat: tingkatList,
            kelompok: kelompokList
          }
        }
      );
      toast.success('Template cerdas berhasil diunduh.');
    } catch (e: unknown) {
      const errorMsg = e instanceof Error ? e.message : 'Gagal mengunduh template.';
      toast.error(errorMsg);
    }
  }, []);

  return (
    <AcademicPageLayout
      title="Mata Pelajaran"
      description="Kelola daftar mata pelajaran yang diajarkan. Digunakan di awal tahun ajaran baru atau saat kurikulum berubah."
      stats={academicStats}
      isLoadingStats={isLoadingStats}
      breadcrumbs={[
        { label: 'Akademik', path: '/academic' },
        { label: 'Mata Pelajaran', path: '/academic/mapel' }
      ]}
      instruction={{
        title: "Panduan Mata Pelajaran",
        description: (
          <div className="space-y-2">
            <p>Daftar pelajaran yang ada di sekolah. Pelajaran ini akan dipakai untuk membuat jadwal mengajar guru dan mengisi jurnal kelas.</p>
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-1 text-slate-500">
              <p><strong>Fungsi:</strong> Mengatur katalog pelajaran sekolah.</p>
              <p><strong>Waktu Penggunaan:</strong> Di awal tahun pelajaran baru atau jika kurikulum pelajaran diubah.</p>
            </div>
          </div>
        ),
        items: [
          { text: "Daftarkan Mapel wajib dan pilihan sesuai kurikulum." },
          { text: "Gunakan fitur Impor untuk memasukkan banyak data sekaligus." },
          { text: "Data Mapel akan digunakan saat menyusun jadwal mengajar Guru." }
        ]
      }}
      canView={canView}
      isLoading={authLoading}
      permissionMessage="Anda tidak memiliki izin untuk mengakses data mata pelajaran."
      hardeningModuleKey="mapelpage"
    >
      <div className="space-y-6">
        <SectionCard
          fullWidth
          noPadding
        >
          <MapelList
            onEdit={canEdit ? handleEditMapel : undefined}
            onView={handleViewMapel}
            onAdd={canCreate ? handleCreateMapel : undefined}
            onImport={canCreate ? () => setImportOpen(true) : undefined}
            onExport={handleExport}
            isExporting={isExporting}
            refreshTrigger={refreshTrigger}
          />
        </SectionCard>
      </div>

      <Suspense fallback={<div className="p-8 text-center text-gray-500">Memuat modul import...</div>}>
        <ExcelImportModal 
          isOpen={importOpen} 
          onClose={() => setImportOpen(false)} 
          title="Import Data Mata Pelajaran" 
          onImport={importMapelFromExcel}
          onDownloadTemplate={handleTemplateDownload}
          onSuccess={() => setRefreshTrigger(prev => prev + 1)}
          sampleDataHint="Pastikan nama mapel dan tingkat kelas sudah sesuai dengan standar kurikulum."
        />
      </Suspense>

      <Modal
        isOpen={modalState.isOpen}
        onClose={handleCloseModal}
        title={modalState.mode === 'create' ? (subMode === 'manual' ? 'Tambah Mata Pelajaran' : 'Pilih Metode Tambah Mapel') : 'Data Mata Pelajaran'}
        size="lg"
      >
        <Suspense fallback={<div className="p-8 text-center text-gray-500">Memuat form...</div>}>
          {modalState.mode === 'create' && !subMode ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4">
              <button
                onClick={() => setSubMode('manual')}
                className="group flex flex-col items-center text-center p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-blue-500 dark:hover:border-blue-500 hover:shadow-md rounded-2xl transition-all"
              >
                <div className="p-3 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-2xl group-hover:scale-105 transition-transform mb-3">
                  <FileText size={28} />
                </div>
                <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm">Tambah Manual</h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 mb-4 leading-relaxed max-w-[220px]">
                  Isi data mata pelajaran secara manual satu per satu. Cocok untuk mapel kustom/lokal.
                </p>
                <span className="text-[11px] font-bold text-blue-600 dark:text-blue-400 flex items-center gap-1 group-hover:translate-x-1 transition-transform mt-auto">
                  Mulai Mengisi <ChevronRight size={14} />
                </span>
              </button>

              <button
                onClick={() => {
                  handleCloseModal();
                  setPresetOpen(true);
                }}
                className="group flex flex-col items-center text-center p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-violet-500 dark:hover:border-violet-500 hover:shadow-md rounded-2xl transition-all"
              >
                <div className="p-3 bg-violet-50 dark:bg-violet-900/20 text-violet-600 dark:text-violet-400 rounded-2xl group-hover:scale-105 transition-transform mb-3">
                  <Sparkles size={28} />
                </div>
                <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm">Gunakan Preset Kurikulum</h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 mb-4 leading-relaxed max-w-[220px]">
                  Pilih cepat dari katalog preset kurikulum nasional {isSmkMak ? '(wajib & kejuruan)' : '(wajib)'} secara massal.
                </p>
                <span className="text-[11px] font-bold text-violet-600 dark:text-violet-400 flex items-center gap-1 group-hover:translate-x-1 transition-transform mt-auto">
                  Mulai Wizard <ChevronRight size={14} />
                </span>
              </button>
            </div>
          ) : (
            modalState.mode && (
              <MapelForm
                mapelId={modalState.mapelId}
                mode={modalState.mode}
                onSuccess={handleFormSuccess}
                onCancel={handleCloseModal}
              />
            )
          )}
        </Suspense>
      </Modal>

      {/* Wizard Multi-Step Preset Mapel */}
      <PresetWizardModal
        isOpen={presetOpen}
        onClose={() => setPresetOpen(false)}
        jenjang={jenjang}
        onSuccess={() => setRefreshTrigger(prev => prev + 1)}
      />
    </AcademicPageLayout>
  );
};

export default MapelPage;
