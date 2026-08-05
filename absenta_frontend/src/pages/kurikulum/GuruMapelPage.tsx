import React, { useMemo, useState, useEffect, useCallback, lazy, Suspense } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { SectionCard } from '../../components/ui';
import { Modal } from '../../components/ui/Modal';
import { MethodPickerModal } from '../../components/common/MethodPickerModal';
import GuruMapelList from '../../components/academic/guru-mapel/GuruMapelList';
import { useAuth } from '../../hooks/useAuth';
import { AcademicPageLayout } from '../../components/academic/AcademicPageLayout';
import { getAcademicStats, type AcademicStats } from '../../api/academic-stats.api';
import { listGuruMapel, importGuruMapelFromExcel } from '../../api/kurikulum/guru-mapel.api';
import { guruApi, mapelApi } from '../../api/academic.api';
import { Users, BookOpen, GraduationCap, Download, Upload, FileSpreadsheet, FileText, Sparkles, ChevronRight, Layers } from 'lucide-react';
import { exportDataToExcel, generateImportTemplate } from '../../utils/export.utils';
import { generateAdvancedTemplate } from '../../utils/excel-advanced.utils';
import toast from 'react-hot-toast';
import type { GuruMapel } from '../../types/academic';
import { Loader } from '../../components/ui/Loader';

// Lazy load Modal dan Komponen Berat
const GuruMapelForm = lazy(() => import('../../components/academic/guru-mapel/GuruMapelForm').then(module => ({ default: module.default })));
const GuruMapelWizardForm = lazy(() => import('../../components/academic/guru-mapel/GuruMapelWizardForm').then(module => ({ default: module.GuruMapelWizardForm })));
const ExcelImportModal = lazy(() => import('../../components/academic/shared/ExcelImportModal').then(module => ({ default: module.ExcelImportModal })));
const GuruTimeOffModal = lazy(() => import('../../components/academic/guru-mapel/GuruTimeOffModal').then(module => ({ default: module.GuruTimeOffModal })));

const GuruMapelPage: React.FC = () => {
  const { can, isLoading: authLoading } = useAuth();
  const [selectionOpen, setSelectionOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [timeOffGuruId, setTimeOffGuruId] = useState<string | null>(null);
  const [timeOffGuruName, setTimeOffGuruName] = useState<string>('');
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const handleOpenTimeOff = useCallback((guruId: string, guruName?: string) => {
    setTimeOffGuruId(guruId);
    setTimeOffGuruName(guruName || 'Guru');
  }, []);

  const handleCloseTimeOff = useCallback(() => {
    setTimeOffGuruId(null);
    setTimeOffGuruName('');
  }, []);

  const handleSelectionOpen = useCallback(() => setSelectionOpen(true), []);
  const handleSelectionClose = useCallback(() => setSelectionOpen(false), []);

  const handleWizardOpen = useCallback(() => setWizardOpen(true), []);
  const handleWizardClose = useCallback(() => setWizardOpen(false), []);
  const handleWizardSuccess = useCallback(() => { 
    setWizardOpen(false); 
    setRefreshTrigger(prev => prev + 1); 
  }, []);


  const canView = useMemo(() => can('academic.teaching.view'), [can]);
  const canManage = useMemo(() => can('academic.teaching.manage'), [can]);

  const { data: statsRes, isLoading: isLoadingStats } = useQuery({
    queryKey: ['academic-stats', canView, refreshTrigger],
    queryFn: () => getAcademicStats(),
    enabled: canView,
    staleTime: 10 * 60 * 1000,
  });
  const stats = statsRes?.data || null;

  const academicStats = useMemo(() => [
    { title: "Total Guru", value: stats?.total_guru || 0, icon: <Users size={14} />, gradient: "from-blue-500 to-indigo-600" },
    { title: "Total Mapel", value: stats?.total_mapel || 0, icon: <BookOpen size={14} />, gradient: "from-emerald-500 to-teal-600" },
    { title: "Total Siswa", value: stats?.total_siswa || 0, icon: <GraduationCap size={14} />, gradient: "from-purple-500 to-pink-600" }
  ], [stats]);

  const handleSuccess = useCallback(() => { 
    setCreateOpen(false); 
    setRefreshTrigger(prev => prev + 1); 
  }, []);

  const handleCreateOpen = useCallback(() => setCreateOpen(true), []);
  const handleCreateClose = useCallback(() => setCreateOpen(false), []);
  
  const handleImportOpen = useCallback(() => setIsImportOpen(true), []);
  const handleImportClose = useCallback(() => setIsImportOpen(false), []);
  
  const handleImportSuccess = useCallback(() => { 
    setIsImportOpen(false); 
    setRefreshTrigger(prev => prev + 1); 
  }, []);

  const handleExport = useCallback(async () => {
    try {
      setIsExporting(true);
      const res = await listGuruMapel();
      exportDataToExcel<GuruMapel>(
        res.data,
        [
          { header: 'Nama Guru', accessor: (row: GuruMapel) => row.Guru?.nama_guru || '', width: 30 },
          { header: 'Mata Pelajaran', accessor: (row: GuruMapel) => row.Mapel?.nama_mapel || '', width: 30 },
          { header: 'Kode Mapel', accessor: (row: GuruMapel) => row.Mapel?.kode_mapel || '', width: 15 }
        ],
        'daftar_guru_pengampu'
      );
      toast.success('Data berhasil diekspor.');
    } catch {
      toast.error('Gagal mengekspor data.');
    } finally {
      setIsExporting(false);
    }
  }, []);

  const handleExcelLayoutDownload = useCallback(async () => {
    try {
      toast('Menyiapkan referensi data...', { icon: 'ℹ️' });
      const [gurusRes, mapelsRes] = await Promise.all([
        guruApi.getAll({ limit: 1000, jenis_ptk: 'PENDIDIK' }),
        mapelApi.getAll({ limit: 1000 })
      ]);

      const guruNames = (gurusRes.data || [])?.map(g => g?.nama_guru).filter(Boolean) as string[];
      const mapelNames = (mapelsRes.data || [])?.map(m => m?.nama_mapel).filter(Boolean) as string[];

      await generateAdvancedTemplate(
        [
          { header: 'Nama Guru', key: 'nama_guru', width: 35, required: true, dropdown: { refKey: 'gurus' } },
          { header: 'Nama Mata Pelajaran', key: 'nama_mapel', width: 35, required: true, dropdown: { refKey: 'mapels' } }
        ],
        {
          fileName: 'template_impor_guru_mapel',
          instructions: [
            'Pilih Nama Guru dan Nama Mata Pelajaran dari dropdown yang tersedia.',
            'Jangan mengubah atau menambah data di luar pilihan dropdown untuk menghindari error.',
            'Kolom berwarna Kuning Emas wajib diisi.'
          ],
          referenceData: {
            gurus: guruNames,
            mapels: mapelNames
          }
        }
      );
      toast.success('Template cerdas berhasil diunduh.');
    } catch {
      toast.error('Gagal mengunduh template.');
    }
  }, []);

  const breadcrumbs = useMemo(() => [
    { label: 'Akademik' },
    { label: 'Guru Pengampu' },
  ], []);

  return (
    <AcademicPageLayout
      title="Guru Pengampu"
      description="Tentukan guru pengajar untuk setiap pelajaran di kelas. Digunakan setiap awal semester atau tahun ajaran baru."
      breadcrumbs={breadcrumbs}
      canView={canView}
      isLoading={authLoading}
      stats={academicStats}
      isLoadingStats={isLoadingStats}
      hardeningModuleKey="gurumapelpage"
      instruction={{
        title: "Pemetaan Guru Mapel",
        description: (
          <div className="space-y-2">
            <p>Menghubungkan guru pengampu dengan mata pelajaran yang mereka ajar di masing-masing kelas. Data ini penting agar guru dapat mengisi jurnal mengajar.</p>
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-1 text-slate-500">
              <p><strong>Fungsi:</strong> Menugaskan guru pengajar ke mata pelajaran kelas.</p>
              <p><strong>Waktu Penggunaan:</strong> Setiap awal semester atau tahun ajaran baru.</p>
            </div>
          </div>
        ),
        items: [
          { text: "Tentukan guru mana yang mengajar mata pelajaran tertentu." },
          { text: "Data ini digunakan untuk penentuan jadwal dan pengisian jurnal mengajar." }
        ]
      }}
    >
      <div className="space-y-6">
        <SectionCard
          fullWidth
          noPadding
          actions={
            <div className="flex items-center gap-2 px-4 py-2">
              <Link
                to="/kurikulum/jadwal-kontrak-kbm"
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-lg hover:bg-indigo-100 dark:bg-indigo-950/60 dark:border-indigo-800 dark:text-indigo-300 dark:hover:bg-indigo-900 transition-colors shadow-sm"
              >
                <Layers size={14} />
                Jadwal Kontrak KBM
              </Link>
              <button
                onClick={handleExport}
                disabled={isExporting}
                className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50"
              >
                <Download size={14} />
                {isExporting ? 'Exporting...' : 'Export Excel'}
              </button>
              {canManage && (
                <button
                  onClick={handleImportOpen}
                  className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
                >
                  <Upload size={14} />
                  Import
                </button>
              )}
            </div>
          }
        >
          <GuruMapelList 
            onAdd={canManage ? handleSelectionOpen : undefined} 
            onAddWizard={canManage ? handleWizardOpen : undefined} 
            onOpenTimeOff={canManage ? handleOpenTimeOff : undefined}
            refreshTrigger={refreshTrigger} 
          />
        </SectionCard>
      </div>

      <MethodPickerModal
        isOpen={selectionOpen}
        onClose={handleSelectionClose}
        title="Pilih Metode Tambah Pengampu"
        options={[
          {
            id: 'manual',
            title: 'Tambah Manual',
            description: 'Tentukan guru pengampu dan mata pelajaran secara manual satu per satu.',
            icon: FileText,
            actionLabel: 'Mulai Mengisi',
            colorScheme: 'blue',
            onClick: () => {
              handleSelectionClose();
              handleCreateOpen();
            }
          },
          {
            id: 'wizard',
            title: 'Gunakan Wizard',
            description: 'Tentukan guru pengampu untuk banyak mata pelajaran sekaligus dengan langkah demi langkah (Wizard).',
            icon: Sparkles,
            actionLabel: 'Mulai Wizard',
            colorScheme: 'violet',
            onClick: () => {
              handleSelectionClose();
              handleWizardOpen();
            }
          }
        ]}
      />

      <Suspense fallback={<div className="flex justify-center items-center p-8"><Loader size="lg" /></div>}>
        <Modal 
          isOpen={createOpen} 
          onClose={handleCreateClose} 
          title="Tambah Pengampu Guru-Mapel" 
          size="md"
          className="overflow-visible"
          contentClassName="overflow-visible !max-h-none"
        >
          <GuruMapelForm onSuccess={handleSuccess} onCancel={handleCreateClose} />
        </Modal>

        <Modal 
          isOpen={wizardOpen} 
          onClose={handleWizardClose} 
          title="Tambah Pengampu via Wizard (Bulk)" 
          size="md"
        >
          <GuruMapelWizardForm onSuccess={handleWizardSuccess} onCancel={handleWizardClose} />
        </Modal>

        <GuruTimeOffModal
          isOpen={!!timeOffGuruId}
          onClose={handleCloseTimeOff}
          guruId={timeOffGuruId}
          guruName={timeOffGuruName}
          onSuccess={() => setRefreshTrigger(prev => prev + 1)}
        />

        <ExcelImportModal
          isOpen={isImportOpen}
          onClose={handleImportClose}
          onSuccess={handleImportSuccess}
          onImport={importGuruMapelFromExcel}
          title="Import Pengampu Guru-Mapel"
          templateName="template_impor_guru_mapel.xlsx"
          onDownloadTemplate={handleExcelLayoutDownload}
          description="Gunakan fitur ini untuk mengalokasikan beban mengajar guru secara massal."
        />
      </Suspense>
    </AcademicPageLayout>
  );
};

export default GuruMapelPage;

