import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button, Modal, SectionCard } from '../../components/ui';
import SiswaList from '../../components/academic/siswa/SiswaList';
import { useAuthStore } from '../../../store/authStore';
import { useCapabilities } from '../../hooks/useCapabilities';
import type { Siswa } from '../../types/academic';
import { getAcademicStats, type AcademicStats } from '../../api/academic-stats.api';
import { Users, CheckCircle2, GraduationCap, UserCheck, UserX } from 'lucide-react';
import { getActiveTahunPelajaran, getActiveSemester } from '../../api/dropdown.api';
import { AcademicPageLayout } from '../../components/academic/AcademicPageLayout';
import { downloadFileFromBlob, generateStandardFilename } from '../../utils/file-download.utils';
import { exportDataToExcel, generateImportTemplate } from '../../utils/export.utils';
import { generateAdvancedTemplate } from '../../utils/excel-advanced.utils';
import { useQuery } from '@tanstack/react-query';
import { getAcademicRegistrationStats, getSiswaList, importSiswaFromExcel } from '../../api/academic/siswa.api';
import { getSemesterByTahunPelajaranForDropdown, getTahunPelajaranForDropdown } from '../../api/dropdown.api';
import { SearchableSelect } from '../../components/ui/SearchableSelect';
import { kelasApi, jurusanApi } from '../../api/academic.api';
import toast from 'react-hot-toast';
import { lazy, Suspense } from 'react';
import { Plus, FileSpreadsheet, Download, RefreshCw } from 'lucide-react';

// Lazy load heavy components
const SiswaForm = lazy(() => import('../../components/academic/siswa/SiswaForm').then(module => ({ default: module.SiswaForm })));
const ExcelImportModal = lazy(() => import('../../components/academic/shared/ExcelImportModal').then(module => ({ default: module.ExcelImportModal })));
const Loader = lazy(() => import('../../components/ui/Loader').then(module => ({ default: module.Loader })));
const SiswaHistory = lazy(() => import('../../components/academic/siswa/SiswaHistory').then(module => ({ default: module.SiswaHistory })));

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
  scenario: 'REGULAR' | 'HISTORIS' | 'PPDB';
}

// v1.0.2 - Fixed Excel Export Engine
const SiswaPage: React.FC = () => {
  const { can, syncSubscription, isLoading: authLoading, user } = useAuthStore();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [modalState, setModalState] = useState<ModalState>({ mode: null, isOpen: false });
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [importOpen, setImportOpen] = useState(false);
  const [importConfig, setImportConfig] = useState<ImportConfig>({ yearId: '', semesterId: '', useDefault: true, scenario: 'REGULAR' });
  const [availableYears, setAvailableYears] = useState<{ label: string; value: string }[]>([]);
  const [availableSemesters, setAvailableSemesters] = useState<{ label: string; value: string }[]>([]);
  const [isExporting, setIsExporting] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historySiswaId, setHistorySiswaId] = useState<string | null>(null);

  const { isKesiswaan, isKurikulum, isAdmin, can: capCan } = useCapabilities();

  // Permissions
  const canCreate = isAdmin || isKesiswaan || isKurikulum || can('academic.students.create');
  const canEdit = isAdmin || isKesiswaan || isKurikulum || can('academic.students.update');
  const canViewDetail = isAdmin || isKesiswaan || isKurikulum || can('academic.students.view.list');
  const canView = true;

  // ── useQuery: Stats parallel ─────────────────────────────────────────────
  const { data: statsData, isLoading: isLoadingAcStats } = useQuery({
    queryKey: ['academic-stats'],
    queryFn: getAcademicStats,
    staleTime: 5 * 60 * 1000,
  });
  const stats = statsData?.data || null;

  const { data: activeSiswaRes, isLoading: isLoadingActive } = useQuery({
    queryKey: ['siswa', 'list', { status: 'AKTIF', page: 1, limit: 1 }],
    queryFn: () => getSiswaList(1, 1, '', '', 'AKTIF'),
    staleTime: 5 * 60 * 1000,
  });
  const activeSiswaCount = activeSiswaRes?.pagination?.total ?? stats?.total_siswa ?? 0;

  const { data: calonRes, isLoading: isLoadingCalon } = useQuery({
    queryKey: ['siswa', 'list', { status: 'CALON', page: 1, limit: 1 }],
    queryFn: () => getSiswaList(1, 1, '', '', 'CALON'),
    staleTime: 5 * 60 * 1000,
  });
  const calonSiswaCount = calonRes?.pagination?.total ?? 0;

  const { data: activeYearData } = useQuery({
    queryKey: ['active-tahun-pelajaran'],
    queryFn: () => getActiveTahunPelajaran().catch(() => null),
    staleTime: 10 * 60 * 1000,
  });
  const { data: activeSemesterData } = useQuery({
    queryKey: ['active-semester'],
    queryFn: () => getActiveSemester().catch(() => null),
    staleTime: 10 * 60 * 1000,
  });
  const activeYearId = activeYearData?.id;
  const activeSemesterId = activeSemesterData?.id;

  const { data: regStatsData, isLoading: isLoadingReg } = useQuery({
    queryKey: ['academic-registration-stats', activeYearId, activeSemesterId],
    queryFn: () => getAcademicRegistrationStats(activeYearId!, activeSemesterId!).catch(() => null),
    enabled: !!activeYearId && !!activeSemesterId,
    staleTime: 5 * 60 * 1000,
  });
  const registeredCount = regStatsData?.registered ?? null;
  const isLoadingStats = isLoadingAcStats || isLoadingActive || isLoadingCalon || isLoadingReg;

  const statCards = useMemo(() => {
    if (!stats) return [];
    
    return [
      {
        title: "Total Siswa Aktif",
        value: activeSiswaCount,
        icon: <Users size={14} />,
        gradient: "from-blue-600 to-indigo-600",
        subtitle: "Aktif di tahun berjalan"
      },
      {
        title: "Registrasi Semester Ini",
        value: registeredCount !== null ? registeredCount : (stats.siswa_terpetakan || 0),
        icon: <UserCheck size={14} />,
        gradient: "from-emerald-500 to-teal-600",
        subtitle: registeredCount !== null 
          ? `Tercatat di semester aktif`
          : `${stats.total_siswa ? Math.round(((stats.siswa_terpetakan || 0) / stats.total_siswa) * 100) : 0}% terdaftar`
      },
      {
        title: "Siswa Tidak Aktif",
        value: stats.total_siswa ? (stats.total_siswa - activeSiswaCount) : 0,
        icon: <UserX size={14} />,
        gradient: "from-slate-400 to-slate-600",
        subtitle: "Lulus / Mutasi / Keluar"
      },
      {
        title: "Pemetaan PPDB",
        value: calonSiswaCount,
        icon: <GraduationCap size={14} />,
        gradient: calonSiswaCount > 0 ? "from-amber-500 to-orange-600" : "from-slate-400 to-slate-500",
        subtitle: calonSiswaCount > 0 ? `${calonSiswaCount} siswa belum dipetakan` : "Semua siswa terpetakan",
        onClick: () => navigate('/academic/ppdb-mapping')
      }
    ];
  }, [stats, activeSiswaCount, registeredCount, navigate, calonSiswaCount]);

  const handleCreateSiswa = useCallback(() => setModalState({ mode: 'create', isOpen: true }), []);
  const handleEditSiswa = useCallback((s: Siswa) => setModalState({ mode: 'edit', siswaId: s.id, isOpen: true }), []);
  const handleViewSiswa = useCallback((s: Siswa) => setModalState({ mode: 'view', siswaId: s.id, isOpen: true }), []);
  const handleCloseModal = useCallback(() => setModalState({ mode: null, isOpen: false }), []);
  const handleFormSuccess = useCallback(() => { handleCloseModal(); setRefreshTrigger(prev => prev + 1); }, [handleCloseModal]);

  const handleTemplateDownload = useCallback(async (selectedScenario?: string) => {
    try {
      const scenario = selectedScenario || importConfig.scenario || 'REGULAR';
      toast('Menyiapkan template...');
      const [kelasRes, jurusanRes] = await Promise.all([
        kelasApi.getAll({ limit: 500 }),
        jurusanApi.getAll({ limit: 100 }).catch(() => ({ data: [] }))
      ]);
      const kelasNames = (kelasRes.data || [])?.map(k => k.nama_kelas).filter(Boolean);
      const jurusanNames = (jurusanRes.data || [])?.map(j => j.nama).filter(Boolean);

      if (scenario === 'HISTORIS') {
        await generateAdvancedTemplate(
          [
            { header: 'Nama Lengkap', key: 'nama_siswa', width: 30, required: true },
            { header: 'Status', key: 'status', width: 22, required: true, dropdown: { refKey: 'status' } },
            { header: 'Tanggal Masuk', key: 'tanggal_masuk', width: 25, isDate: true },
            { header: 'Tanggal Keluar', key: 'tanggal_keluar', width: 25, isDate: true },
            { header: 'Nama Kelas / Angkatan', key: 'nama_kelas', width: 25, dropdown: { refKey: 'kelas' } },
            { header: 'Nama Jurusan', key: 'nama_jurusan', width: 25, dropdown: { refKey: 'jurusan' } },
            { header: 'NIS', key: 'nis', width: 15 },
            { header: 'NISN', key: 'nisn', width: 15 },
            { header: 'JK (L/P)', key: 'jenis_kelamin', width: 10, dropdown: { refKey: 'jk' } },
            { header: 'Tempat Lahir', key: 'tempat_lahir', width: 20 },
            { header: 'Tanggal Lahir', key: 'tanggal_lahir', width: 25, isDate: true },
            { header: 'Alamat', key: 'alamat', width: 40 },
            { header: 'No. HP', key: 'no_hp', width: 15 }
          ],
          {
            fileName: 'template_impor_siswa_lama_alumni',
            instructions: [
              'SKENARIO 2: TEMPLATE IMPOR SISWA LAMA / LULUSAN / ALUMNI & TRACER STUDY.',
              'Kolom EMAS (Nama Lengkap & Status) WAJIB diisi.',
              'Isi kolom Status dengan: LULUS, MUTASI, atau TIDAK_AKTIF.',
              'Sangat disarankan mengisi Tanggal Masuk & Tanggal Keluar untuk akurasi linimasa.',
              'Format tanggal bebas: 20/07/2023, 20-07-2023, 20 Juli 2023, atau 2023-07-20.',
              'Kolom Nama Kelas & Nama Jurusan opsional untuk alumni.'
            ],
            referenceData: {
              kelas: kelasNames,
              jurusan: jurusanNames,
              jk: ['L', 'P'],
              status: ['LULUS', 'MUTASI', 'TIDAK_AKTIF']
            }
          }
        );
      } else if (scenario === 'PPDB') {
        await generateAdvancedTemplate(
          [
            { header: 'Nama Lengkap', key: 'nama_siswa', width: 30, required: true },
            { header: 'Nama Jurusan', key: 'nama_jurusan', width: 25, dropdown: { refKey: 'jurusan' } },
            { header: 'NISN', key: 'nisn', width: 15 },
            { header: 'NIK', key: 'nik', width: 15 },
            { header: 'JK (L/P)', key: 'jenis_kelamin', width: 10, dropdown: { refKey: 'jk' } },
            { header: 'Tempat Lahir', key: 'tempat_lahir', width: 20 },
            { header: 'Tanggal Lahir', key: 'tanggal_lahir', width: 25, isDate: true },
            { header: 'No. HP', key: 'no_hp', width: 15 },
            { header: 'Alamat', key: 'alamat', width: 40 }
          ],
          {
            fileName: 'template_impor_siswa_ppdb_calon',
            instructions: [
              'SKENARIO 3: TEMPLATE IMPOR PENDAFTAR PPDB (CALON SISWA).',
              'Kolom EMAS (Nama Lengkap) WAJIB diisi.',
              'Siswa yang diimpor dari file ini otomatis berstatus CALON.',
              'Untuk SMK/MAK, sangat disarankan mengisi kolom Nama Jurusan.'
            ],
            referenceData: {
              jurusan: jurusanNames,
              jk: ['L', 'P']
            }
          }
        );
      } else {
        await generateAdvancedTemplate(
          [
            { header: 'Nama Lengkap', key: 'nama_siswa', width: 30, required: true },
            { header: 'Nama Kelas', key: 'nama_kelas', width: 25, required: true, dropdown: { refKey: 'kelas' } },
            { header: 'Nama Jurusan', key: 'nama_jurusan', width: 25, dropdown: { refKey: 'jurusan' } },
            { header: 'NIS', key: 'nis', width: 15, required: false },
            { header: 'NISN', key: 'nisn', width: 15 },
            { header: 'JK (L/P)', key: 'jenis_kelamin', width: 10, required: false, dropdown: { refKey: 'jk' } },
            { header: 'Tempat Lahir', key: 'tempat_lahir', width: 20 },
            { header: 'Tanggal Lahir', key: 'tanggal_lahir', width: 25, isDate: true },
            { header: 'Tanggal Masuk', key: 'tanggal_masuk', width: 25, isDate: true },
            { header: 'Alamat', key: 'alamat', width: 40 },
            { header: 'No. HP', key: 'no_hp', width: 15 }
          ],
          {
            fileName: 'template_impor_siswa_aktif',
            instructions: [
              'SKENARIO 1: TEMPLATE IMPOR SISWA BARU / AKTIF TAHUN BERJALAN.',
              'Kolom EMAS (Nama Lengkap & Nama Kelas) WAJIB diisi.',
              'Siswa yang diimpor dari file ini otomatis berstatus AKTIF.',
              'Jika ada nama kelas yang sama di jurusan berbeda (misal: X TE 3), sertakan kolom Nama Jurusan untuk penentuan kelas presisi.',
              'Format tanggal bebas: 20/07/2023, 20-07-2023, 20 Juli 2023, atau 2023-07-20.'
            ],
            referenceData: {
              kelas: kelasNames,
              jurusan: jurusanNames,
              jk: ['L', 'P']
            }
          }
        );
      }
      toast.success('Template cerdas berhasil diunduh.');
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Gagal mengunduh template.';
      toast.error(msg);
    }
  }, [importConfig.scenario]);

  const handleExport = useCallback(async () => {
    try {
      setIsExporting(true);
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
    syncSubscription().catch(() => {});
    setImportConfig(prev => ({ ...prev, useDefault: true, scenario: 'REGULAR' }));
    setImportOpen(true);
  }, [syncSubscription]);
  
  const handleCloseImport = useCallback(() => setImportOpen(false), []);

  const handleImportSiswa = useCallback(async (file: File, onProgress: (p: number) => void, socketId?: string) => {
    const extraParams: Record<string, string> = {
      scenario: importConfig.scenario
    };
    if (!importConfig.useDefault) {
      if (importConfig.yearId) extraParams.tahun_pelajaran_id = importConfig.yearId;
      if (importConfig.semesterId) extraParams.semester_id = importConfig.semesterId;
    }
    return importSiswaFromExcel(file, onProgress, socketId, extraParams);
  }, [importConfig]);

  useEffect(() => {
    const editId = searchParams.get('edit');
    const viewId = searchParams.get('id');
    if (editId) {
      setModalState({ mode: 'edit', siswaId: editId, isOpen: true });
      const newParams = new URLSearchParams(searchParams);
      newParams.delete('edit');
      setSearchParams(newParams, { replace: true });
    } else if (viewId) {
      setModalState({ mode: 'view', siswaId: viewId, isOpen: true });
      const newParams = new URLSearchParams(searchParams);
      newParams.delete('id');
      setSearchParams(newParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const urlContext = searchParams.get('context') || searchParams.get('tab') || searchParams.get('mode');
  const isWaliKelasContext = urlContext === 'walikelas';

  return (
    <AcademicPageLayout
      title={isWaliKelasContext ? "Siswa Kelas Saya" : "Master Data Siswa Sekolah"}
      description={isWaliKelasContext 
        ? "Direktori & pemantauan khusus data siswa rombel binaan Anda." 
        : "Pusat pengelolaan & pemantauan biodata lengkap siswa seluruh sekolah."}
      breadcrumbs={[
        { label: 'Dashboard', path: '/dashboard' },
        { label: 'Akademik', path: '/academic' },
        { label: isWaliKelasContext ? 'Kelas Saya' : 'Data Siswa', path: '/academic/siswa' }
      ]}
      stats={statCards}
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
            onRefresh={useCallback(() => setRefreshTrigger(prev => prev + 1), [])}
            onHistory={useCallback((siswa) => {
              setHistorySiswaId(siswa.id);
              setHistoryOpen(true);
            }, [])}
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
          downloadScenarios={[
            { id: 'REGULAR', label: '1. Siswa Aktif', description: 'Tahun berjalan & aktif' },
            { id: 'HISTORIS', label: '2. Siswa Lama', description: 'Alumni, lulusan, tracer study' }
          ]}
          onSuccess={() => setRefreshTrigger(prev => prev + 1)}
          sampleDataHint="Pilih format template di atas sesuai kebutuhan data yang ingin diunduh dan diimpor."
        >
          <div className="space-y-4">
            <div className="flex items-center gap-2 pt-1">
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

      {/* Academic History Modal */}
      <Modal isOpen={historyOpen} onClose={() => setHistoryOpen(false)} title="Riwayat Akademik Siswa" size="xl">
        <Suspense fallback={<div className="p-12 flex justify-center"><Loader /></div>}>
          {historySiswaId && <SiswaHistory siswaId={historySiswaId} />}
        </Suspense>
      </Modal>
    </AcademicPageLayout>
  );
};

export default SiswaPage;
SiswaPage;
