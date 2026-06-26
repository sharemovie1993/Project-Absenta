import React, { useMemo, useState, useEffect, useCallback, lazy, Suspense } from 'react';
import { SectionCard } from '../../components/ui';
import GuruMapelList from '../../components/academic/guru-mapel/GuruMapelList';
import { useAuth } from '../../hooks/useAuth';
import { AcademicPageLayout } from '../../components/academic/AcademicPageLayout';
import { getAcademicStats, type AcademicStats } from '../../api/academic-stats.api';
import { listGuruMapel, importGuruMapelFromExcel } from '../../api/academic/guru-mapel.api';
import { guruApi, mapelApi } from '../../api/academic.api';
import { Users, BookOpen, GraduationCap, Download, Upload, FileSpreadsheet } from 'lucide-react';
import { exportDataToExcel, generateImportTemplate } from '../../utils/export.utils';
import { generateAdvancedTemplate } from '../../utils/excel-advanced.utils';
import toast from 'react-hot-toast';
import type { GuruMapel } from '../../types/academic';
import { Loader } from '../../components/ui/Loader';

// Lazy load Modal dan Komponen Berat
const Modal = lazy(() => import('../../components/ui/Modal').then(module => ({ default: module.Modal })));
const GuruMapelForm = lazy(() => import('../../components/academic/guru-mapel/GuruMapelForm').then(module => ({ default: module.default })));
const ExcelImportModal = lazy(() => import('../../components/academic/shared/ExcelImportModal').then(module => ({ default: module.ExcelImportModal })));

const GuruMapelPage: React.FC = () => {
  const { can, isLoading: authLoading } = useAuth();
  const [createOpen, setCreateOpen] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [stats, setStats] = useState<AcademicStats | null>(null);
  const [isLoadingStats, setIsLoadingStats] = useState(true);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);


  const canView = useMemo(() => can('academic.teaching.view'), [can]);
  const canManage = useMemo(() => can('academic.teaching.manage'), [can]);

  useEffect(() => {
    const loadStats = async () => {
      try {
        setIsLoadingStats(true);
        const res = await getAcademicStats();
        setStats(res.data);
      } catch (e) { console.error(e); }
      finally { setIsLoadingStats(false); }
    };
    if (canView) loadStats();
  }, [canView, refreshTrigger]);

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

  const handleTemplateDownload = useCallback(async () => {
    try {
      toast('Menyiapkan referensi data...', { icon: 'ℹ️' });
      const [gurusRes, mapelsRes] = await Promise.all([
        guruApi.getAll({ limit: 1000 }),
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
      description="Distribusi beban mengajar guru berdasarkan referensi mata pelajaran."
      breadcrumbs={breadcrumbs}
      canView={canView}
      isLoading={authLoading}
      stats={academicStats}
      isLoadingStats={isLoadingStats}
      hardeningModuleKey="gurumapelpage"
      instruction={{
        title: "Pemetaan Guru Mapel",
        description: "Kelola penugasan guru pengampu untuk setiap mata pelajaran.",
        items: [
          { text: "Tentukan guru mana yang mengajar mata pelajaran tertentu." },
          { text: "Data ini digunakan untuk penentuan jadwal dan pengisian jurnal mengajar." }
        ]
      }}
    >
      <div className="space-y-6">
        <SectionCard
          title="Pengampu Mata Pelajaran"
          icon={BookOpen}
          fullWidth
          noPadding
          actions={
            <div className="flex items-center gap-2 px-4 py-2">
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
          <GuruMapelList onAdd={canManage ? handleCreateOpen : undefined} refreshTrigger={refreshTrigger} />
        </SectionCard>
      </div>

      <Suspense fallback={<div className="flex justify-center items-center p-8"><Loader size="lg" /></div>}>
        <Modal isOpen={createOpen} onClose={handleCreateClose} title="Tambah Pengampu Guru-Mapel" size="lg">
          <GuruMapelForm onSuccess={handleSuccess} onCancel={handleCreateClose} />
        </Modal>

        <ExcelImportModal
          isOpen={isImportOpen}
          onClose={handleImportClose}
          onSuccess={handleImportSuccess}
          onImport={importGuruMapelFromExcel}
          title="Import Pengampu Guru-Mapel"
          templateName="template_impor_guru_mapel.xlsx"
          onDownloadTemplate={handleTemplateDownload}
          description="Gunakan fitur ini untuk mengalokasikan beban mengajar guru secara massal."
        />
      </Suspense>
    </AcademicPageLayout>
  );
};

export default GuruMapelPage;

