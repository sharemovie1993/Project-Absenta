import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button, Modal, SectionCard } from '../../components/ui';
import SiswaList from '../../components/academic/siswa/SiswaList';
import { useAuth } from '../../hooks/useAuth';
import type { Siswa } from '../../types/academic';
import { getAcademicStats, type AcademicStats } from '../../api/academic-stats.api';
import { Users, CheckCircle2, GraduationCap, UserCheck, UserX } from 'lucide-react';
import { getActiveTahunPelajaran, getActiveSemester } from '../../api/dropdown.api';
import { AcademicPageLayout } from '../../components/academic/AcademicPageLayout';
import { downloadFileFromBlob, generateStandardFilename } from '../../utils/file-download.utils';
import { exportDataToExcel, generateImportTemplate } from '../../utils/export.utils';
import { generateAdvancedTemplate } from '../../utils/excel-advanced.utils';
import { getAcademicRegistrationStats, getSiswaList, importSiswaFromExcel } from '../../api/academic/siswa.api';
import { getSemesterByTahunPelajaranForDropdown, getTahunPelajaranForDropdown } from '../../api/dropdown.api';
import { SearchableSelect } from '../../components/ui/SearchableSelect';
import { kelasApi } from '../../api/academic.api';
import toast from 'react-hot-toast';
import { lazy, Suspense } from 'react';
import { Plus, FileSpreadsheet, Download, RefreshCw } from 'lucide-react';

// Lazy load heavy components
// Lazy load heavy components
const SiswaForm = lazy(() => import('../../components/academic/siswa/SiswaForm').then(module => ({ default: module.SiswaForm })));
const ExcelImportModal = lazy(() => import('../../components/academic/shared/ExcelImportModal').then(module => ({ default: module.ExcelImportModal })));
const Loader = lazy(() => import('../../components/ui/Loader').then(module => ({ default: module.Loader })));

type ModalMode = 'create' | 'edit' | 'view' | null;

interface ModalState {
  mode: ModalMode;
  siswaId?: string;
  isOpen: boolean;
}

interface ImportConfig {
  yearId: string;
  semesterId: string;
  useDefault: boolean;
}

// v1.0.2 - Fixed Excel Export Engine
const SiswaPage: React.FC = () => {
  const { can, syncSubscription, isLoading: authLoading, user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [modalState, setModalState] = useState<ModalState>({ mode: null, isOpen: false });
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [stats, setStats] = useState<AcademicStats | null>(null);
  const [activeSiswaCount, setActiveSiswaCount] = useState<number>(0);
  const [registeredCount, setRegisteredCount] = useState<number | null>(null);
  const [isLoadingStats, setIsLoadingStats] = useState(true);
  const [importOpen, setImportOpen] = useState(false);
  const [importConfig, setImportConfig] = useState<ImportConfig>({ yearId: '', semesterId: '', useDefault: true });
  const [availableYears, setAvailableYears] = useState<{ label: string; value: string }[]>([]);
  const [availableSemesters, setAvailableSemesters] = useState<{ label: string; value: string }[]>([]);
  const [isExporting, setIsExporting] = useState(false);


  // Permissions
  const canCreate = can('academic.students.create');
  const canEdit = can('academic.students.update');
  const canView = can('academic.students.view.list');

  // Detect if user is in isolated scope (e.g. Wali Kelas)
  // Backend already returns scoped stats, this is only used for label customization
  const isIsolatedScope = useMemo(() => {
    const roles = (user as { role?: { name?: string } })?.role?.name;
    return roles === 'GURU' && !!(user as { guru_profile?: unknown })?.guru_profile;
  }, [user]);

  // Load stats
  useEffect(() => {
    const loadStats = async () => {
      if (!canView) return;
      try {
        setIsLoadingStats(true);
        const [statsRes, activeRes, activeY, activeS] = await Promise.all([
          getAcademicStats(),
          getSiswaList(1, 1, '', '', 'AKTIF'),
          getActiveTahunPelajaran(),
          getActiveSemester()
        ]);
        setStats(statsRes.data);
        setActiveSiswaCount(activeRes.pagination?.total || 0);

        if (activeY && activeS) {
          const regStats = await getAcademicRegistrationStats(activeY.id, activeS.id);
          setRegisteredCount(regStats?.registered ?? null);
        }
      } catch (error) {
        console.error('Failed to load academic stats:', error);
      } finally {
        setIsLoadingStats(false);
      }
    };
    loadStats();
  }, [canView, refreshTrigger]);

  const academicStats = useMemo(() => {
    // Backend already scopes stats.total_siswa for Wali Kelas,
    // and activeSiswaCount from getSiswaList is also scoped.
    // So all we do here is simple arithmetic.
    const totalSiswa = stats?.total_siswa || 0;
    const nonaktifCount = Math.max(0, totalSiswa - activeSiswaCount);
    const unregisteredCount = registeredCount !== null ? Math.max(0, activeSiswaCount - registeredCount) : 0;
    const isComplete = unregisteredCount === 0 && registeredCount !== null;
    return [
      {
        title: isIsolatedScope ? "Siswa di Kelas" : "Total Siswa",
        value: totalSiswa,
        icon: <Users size={14} />,
        gradient: "from-indigo-500 to-purple-600",
        subtitle: isIsolatedScope ? "Total siswa di kelas Anda" : "Peserta didik terdaftar"
      },
      {
        title: "Siswa Aktif",
        value: activeSiswaCount,
        icon: <UserCheck size={14} />,
        gradient: "from-emerald-500 to-teal-600",
        subtitle: isIsolatedScope ? "Aktif di kelas Anda" : "Siswa aktif belajar"
      },
      {
        title: "Nonaktif",
        value: nonaktifCount,
        icon: <UserX size={14} />,
        gradient: "from-slate-400 to-slate-600",
        subtitle: "Lulus / Mutasi / Keluar"
      },
      {
        title: isComplete ? "Status Registrasi" : "Belum Registrasi",
        value: isComplete ? "Lengkap" : unregisteredCount,
        icon: isComplete ? <CheckCircle2 size={14} /> : <GraduationCap size={14} />,
        gradient: isComplete ? "from-emerald-500 to-teal-600" : "from-amber-500 to-orange-600",
        subtitle: isComplete ? "Semua siswa aktif terdaftar" : "Butuh aktivasi semester",
        onClick: () => navigate('/academic/registrasi-siswa')
      }
    ];
  }, [stats, activeSiswaCount, registeredCount, navigate, isIsolatedScope]);

  const handleCreateSiswa = useCallback(() => setModalState({ mode: 'create', isOpen: true }), []);
  const handleEditSiswa = useCallback((s: Siswa) => setModalState({ mode: 'edit', siswaId: s.id, isOpen: true }), []);
  const handleViewSiswa = useCallback((s: Siswa) => setModalState({ mode: 'view', siswaId: s.id, isOpen: true }), []);
  const handleCloseModal = useCallback(() => setModalState({ mode: null, isOpen: false }), []);
  const handleFormSuccess = useCallback(() => { handleCloseModal(); setRefreshTrigger(prev => prev + 1); }, [handleCloseModal]);

  const handleTemplateDownload = useCallback(async () => {
    try {
      toast('Menyiapkan referensi data...');
      const kelasRes = await kelasApi.getAll({ limit: 500 });
      const kelasNames = (kelasRes.data || [])?.map(k => k.nama_kelas).filter(Boolean);

      await generateAdvancedTemplate(
        [
          { header: 'Nama Lengkap', key: 'nama_siswa', width: 30, required: true },
          { header: 'Nama Kelas', key: 'nama_kelas', width: 25, required: true, dropdown: { refKey: 'kelas' } },
          { header: 'NIS', key: 'nis', width: 15, required: false },
          { header: 'NISN', key: 'nisn', width: 15 },
          { header: 'JK (L/P)', key: 'jenis_kelamin', width: 10, required: false, dropdown: { refKey: 'jk' } },
          { header: 'Tempat Lahir', key: 'tempat_lahir', width: 20 },
          { header: 'Tanggal Lahir (YYYY-MM-DD)', key: 'tanggal_lahir', width: 25 },
          { header: 'Alamat', key: 'alamat', width: 40 },
          { header: 'No. HP', key: 'no_hp', width: 15 }
        ],
        {
          fileName: 'template_impor_siswa',
          instructions: [
            'Disarankan import per 1 angkatan dalam 1 file untuk performa optimal.',
            'NIS dan JK boleh dikosongkan (Sistem akan membuat NIS otomatis dan JK default L).',
            'Gunakan Dropdown untuk mengisi kolom Kelas dan Jenis Kelamin.',
            'Format Tanggal Lahir adalah YYYY-MM-DD (contoh: 2008-05-15).',
            'Kolom Kuning Emas wajib diisi.'
          ],
          referenceData: {
            kelas: kelasNames,
            jk: ['L', 'P']
          }
        }
      );
      toast.success('Template cerdas berhasil diunduh.');
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Gagal mengunduh template.';
      toast.error(msg);
    }
  }, []);

  const handleExport = useCallback(async () => {
    try {
      setIsExporting(true);
      // Fetch all data (limit 2000 to get all students)
      const response = await getSiswaList(1, 2000);
      if (response.success && response.data.length > 0) {
        exportDataToExcel<Siswa>(response.data, [
          { header: 'NIS', accessor: (row: Siswa) => row.nis, width: 15 },
          { header: 'NISN', accessor: (row: Siswa) => row.nisn || '-', width: 15 },
          { header: 'Nama Lengkap', accessor: (row: Siswa) => row.nama_siswa, width: 30 },
          { header: 'JK', accessor: (row: Siswa) => row.jenis_kelamin, width: 5 },
          { header: 'Kelas', accessor: (row: Siswa) => row.Kelas?.nama_kelas || '-', width: 15 },
          { header: 'Tempat Lahir', accessor: (row: Siswa) => row.tempat_lahir || '-', width: 20 },
          { header: 'Tanggal Lahir', accessor: (row: Siswa) => row.tanggal_lahir || '-', width: 15 },
          { header: 'Alamat', accessor: (row: Siswa) => row.alamat || '-', width: 40 },
          { header: 'Status', accessor: (row: Siswa) => row.status, width: 10 }
        ], 'Laporan_Siswa', 'DATA MASTER PESERTA DIDIK');
        toast.success('Data siswa berhasil diekspor.');
      } else {
        toast('Tidak ada data untuk diekspor.', { icon: '⚠️' });
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Gagal mengekspor data.';
      toast.error(msg);
    } finally {
      setIsExporting(false);
    }
  }, []);

  // Fetch dropdown data for import
  useEffect(() => {
    if (importOpen) {
      getTahunPelajaranForDropdown().then(setAvailableYears);
    }
  }, [importOpen]);

  useEffect(() => {
    if (importConfig.yearId) {
      getSemesterByTahunPelajaranForDropdown(importConfig.yearId).then(setAvailableSemesters);
    } else {
      setAvailableSemesters([]);
    }
  }, [importConfig.yearId]);

  const handleOpenImport = useCallback(() => {
    // Silent sync in background without triggering global loading state
    syncSubscription().catch(() => {});
    setImportConfig(prev => ({ ...prev, useDefault: true }));
    setImportOpen(true);
  }, [syncSubscription]);
  
  const handleCloseImport = useCallback(() => setImportOpen(false), []);

  const handleImportSiswa = useCallback(async (file: File, onProgress: (p: number) => void) => {
    const extraParams: Record<string, string> = {};
    if (!importConfig.useDefault) {
      if (importConfig.yearId) extraParams.tahun_pelajaran_id = importConfig.yearId;
      if (importConfig.semesterId) extraParams.semester_id = importConfig.semesterId;
    }
    return importSiswaFromExcel(file, onProgress, undefined, extraParams);
  }, [importConfig]);

  // Handle automatic edit modal from URL query
  useEffect(() => {
    const editId = searchParams.get('edit');
    if (editId) {
      setModalState({ mode: 'edit', siswaId: editId, isOpen: true });
      const newParams = new URLSearchParams(searchParams);
      newParams.delete('edit');
      setSearchParams(newParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  return (
    <AcademicPageLayout
      title="Data Siswa"
      description="Kelola biodata lengkap dan identitas siswa. Digunakan saat menerima siswa baru atau memperbarui biodata mereka."
      breadcrumbs={[
        { label: 'Dashboard', path: '/dashboard' },
        { label: 'Akademik', path: '/academic' },
        { label: 'Data Siswa', path: '/academic/siswa' }
      ]}
      stats={academicStats}
      isLoadingStats={isLoadingStats}
      instruction={{
        title: "Panduan Siswa",
        description: (
          <div className="space-y-2">
            <p>Tempat penyimpanan data diri utama siswa secara lengkap. Data di sini wajib diisi sebelum siswa dimasukkan ke dalam kelas.</p>
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-1 text-slate-500">
              <p><strong>Fungsi:</strong> Mengatur biodata utama siswa.</p>
              <p><strong>Waktu Penggunaan:</strong> Saat penerimaan siswa baru atau pemutakhiran biodata berkala.</p>
            </div>
          </div>
        ),
        items: [
          { text: "Tambahkan data siswa baru melalui tombol Tambah Siswa." },
          { text: "Lakukan aktivasi akademik berkala di menu Pembagian Kelas." },
          { text: "Kelola akun login (LMS) siswa melalui tombol Detail/Edit." }
        ]
      }}
      canView={canView}
      isLoading={authLoading}
      permissionMessage="Anda tidak memiliki izin untuk mengakses data siswa."
      hardeningModuleKey="academic_siswa"
    >
      <div className="space-y-6">
        <SectionCard 
          fullWidth 
          noPadding
        >
          <SiswaList
            onEdit={canEdit ? handleEditSiswa : undefined}
            onView={handleViewSiswa}
            onAdd={canCreate ? handleCreateSiswa : undefined}
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
          title="Import Data Siswa"
          onImport={handleImportSiswa}
          onDownloadTemplate={handleTemplateDownload}
          onSuccess={() => setRefreshTrigger(prev => prev + 1)}
          sampleDataHint="Tips: Disarankan import per 1 angkatan (misal: hanya kelas X) dalam satu file untuk proses yang lebih cepat dan terorganisir."
        >
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <input 
                type="checkbox" 
                id="use-default-period"
                checked={importConfig.useDefault}
                onChange={(e) => setImportConfig(prev => ({ ...prev, useDefault: e.target.checked }))}
                className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor="use-default-period" className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-tight cursor-pointer">
                Gunakan Periode Akademik Aktif (Default)
              </label>
            </div>

            {!importConfig.useDefault && (
              <div className="grid grid-cols-2 gap-3 animate-in fade-in slide-in-from-top-1 duration-200">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tahun Pelajaran Target</label>
                  <SearchableSelect
                    value={importConfig.yearId}
                    onValueChange={(val) => setImportConfig(prev => ({ ...prev, yearId: val, semesterId: '' }))}
                    options={availableYears}
                    placeholder="Pilih Tahun..."
                    triggerClassName="h-9 text-xs rounded-xl"
                  />
                  <p className="text-[9px] text-slate-400 italic">Pilih tahun untuk data histori/arsip</p>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Semester Target</label>
                  <SearchableSelect
                    value={importConfig.semesterId}
                    onValueChange={(val) => setImportConfig(prev => ({ ...prev, semesterId: val }))}
                    options={availableSemesters}
                    placeholder="Pilih Semester..."
                    disabled={!importConfig.yearId}
                    triggerClassName="h-9 text-xs rounded-xl"
                  />
                  <p className="text-[9px] text-slate-400 italic">Pilih semester tujuan</p>
                </div>
              </div>
            )}
          </div>
        </ExcelImportModal>
      </Suspense>

      {/* Main Form Modal */}
      <Modal isOpen={modalState.isOpen} onClose={handleCloseModal} title={modalState.mode === 'create' ? 'Tambah Siswa' : 'Data Siswa'} size="4xl">
        <Suspense fallback={<div className="p-12 flex justify-center"><Loader /></div>}>
          {modalState.mode && (
            <SiswaForm siswaId={modalState.siswaId} mode={modalState.mode} onSuccess={handleFormSuccess} onCancel={handleCloseModal} />
          )}
        </Suspense>
      </Modal>
    </AcademicPageLayout>
  );
};

export default SiswaPage;
SiswaPage;
