import React, { useState, useEffect, useCallback, useMemo, lazy, Suspense } from 'react';
import { z } from 'zod';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { 
  Users, 
  CheckCircle2, 
  GraduationCap, 
  UserCheck, 
  UserX, 
  Plus, 
  FileSpreadsheet, 
  Download, 
  RefreshCw,
  Layers,
  ShieldCheck,
  Building2
} from 'lucide-react';
import * as XLSX from 'xlsx-js-style';
import toast from 'react-hot-toast';

import { Button, Modal, SectionCard, Loader } from '../../ui';
import { SearchableSelect } from '../../ui/SearchableSelect';
import { AcademicPageLayout } from '../AcademicPageLayout';
import { InfraErrorBoundary } from '../../superadmin/infra/InfraErrorBoundary';

import SiswaList from './SiswaList';
import { useAuthStore } from '../../../store/authStore';
import { useCapabilities } from '../../../hooks/useCapabilities';
import type { Siswa } from '../../../types/academic';
import { getAcademicStats } from '../../../api/academic-stats.api';
import { 
  getActiveTahunPelajaran, 
  getActiveSemester, 
  getSemesterByTahunPelajaranForDropdown, 
  getTahunPelajaranForDropdown 
} from '../../../api/dropdown.api';
import { 
  getAcademicRegistrationStats, 
  getSiswaList, 
  importSiswaFromExcel 
} from '../../../api/academic/siswa.api';
import { kelasApi, jurusanApi } from '../../../api/academic.api';
import { getKelasList } from '../../../api/academic/kelas.api';
import { generateAdvancedTemplate } from '../../../utils/excel-advanced.utils';
import type { ExcelColumnConfig } from '../../../utils/export.utils';

// Lazy Loaded Modal & Drill-down Components
const SiswaForm = lazy(() => import('./SiswaForm').then(module => ({ default: module.SiswaForm })));
const SiswaDetailView = lazy(() => import('./SiswaDetailView').then(module => ({ default: module.SiswaDetailView })));
const ExcelImportModal = lazy(() => import('../shared/ExcelImportModal').then(module => ({ default: module.ExcelImportModal })));
const SiswaHistory = lazy(() => import('./SiswaHistory').then(module => ({ default: module.SiswaHistory })));

export interface UniversalSiswaViewProps {
  // Universal Scoping Props (Role-Ready)
  jurusanId?: string;
  jurusanNama?: string;
  kelasId?: string;
  kelasNama?: string;
  tingkat?: string | number;
  status?: string;

  // Display & Mode Options
  isModal?: boolean;
  hideLayout?: boolean;
  hideHeaderStats?: boolean;
  hideScopeBanner?: boolean;
  readOnly?: boolean;

  // Academic Context Override
  tahunPelajaranId?: string;
  semesterId?: string;

  // Custom Controls & Action Permissions
  canAdd?: boolean;
  canEdit?: boolean;
  canImport?: boolean;
  canExport?: boolean;

  // Callbacks
  onClose?: () => void;
  onSelectSiswa?: (siswa: Siswa) => void;
}

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

export const SiswaView: React.FC<UniversalSiswaViewProps> = React.memo(({
  jurusanId: propJurusanId,
  jurusanNama: propJurusanNama,
  kelasId: propKelasId,
  kelasNama: propKelasNama,
  tingkat: propTingkat,
  status: propStatus,
  isModal = false,
  hideLayout = false,
  hideHeaderStats = false,
  hideScopeBanner = false,
  readOnly = false,
  tahunPelajaranId: propTahunPelajaranId,
  semesterId: propSemesterId,
  canAdd: propCanAdd,
  canEdit: propCanEdit,
  canImport: propCanImport,
  canExport: propCanExport,
  onClose,
  onSelectSiswa,
}) => {
  const { user, refreshSubscription } = useAuthStore();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const { 
    isKesiswaan, 
    isKurikulum, 
    isAdmin, 
    isKaprog, 
    kaprogJurusan, 
    isWaliKelas, 
    walikelasKelas, 
    can 
  } = useCapabilities();

  // Scope Resolution (Explicit prop overrides capability)
  const effectiveJurusanId = propJurusanId || (isKaprog && kaprogJurusan?.id ? kaprogJurusan.id : undefined);
  const effectiveJurusanNama = propJurusanNama || kaprogJurusan?.nama || 'Kejuruan';
  const effectiveKelasId = propKelasId || (isWaliKelas && walikelasKelas?.id ? walikelasKelas.id : undefined);
  const effectiveKelasNama = propKelasNama || walikelasKelas?.nama_kelas || '';
  const isKelasRestricted = Boolean(effectiveKelasId);

  // States
  const [modalState, setModalState] = useState<ModalState>({ mode: null, isOpen: false });
  const [selectedSiswaIdForDetail, setSelectedSiswaIdForDetail] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [importOpen, setImportOpen] = useState(false);
  const [importConfig, setImportConfig] = useState<ImportConfig>({ yearId: '', semesterId: '', useDefault: true, scenario: 'REGULAR' });
  const [availableYears, setAvailableYears] = useState<{ label: string; value: string }[]>([]);
  const [availableSemesters, setAvailableSemesters] = useState<{ label: string; value: string }[]>([]);
  const [isExporting, setIsExporting] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historySiswaId, setHistorySiswaId] = useState<string | null>(null);

  // Permissions
  const canCreate = propCanAdd ?? (!readOnly && (isAdmin || isKesiswaan || isKurikulum || can('academic.students.create')));
  const canEdit = propCanEdit ?? (!readOnly && (isAdmin || isKesiswaan || isKurikulum || can('academic.students.update')));
  const canImport = propCanImport ?? (!readOnly && (isAdmin || isKesiswaan || isKurikulum || can('academic.students.create')));
  const canExport = propCanExport ?? true;
  const canView = true;

  // ── Queries: Academic Period ──────────────────────────────────────────────
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
  const activeYearId = propTahunPelajaranId || activeYearData?.id;

  // Strict Mode: Filter UI HANYA untuk membaca data
  const isViewingHistorical = Boolean(activeYearData?.id && propTahunPelajaranId && propTahunPelajaranId !== activeYearData?.id);
  const effectiveReadOnly = readOnly || isViewingHistorical;
  const effectiveCanCreate = canCreate && !isViewingHistorical;
  const effectiveCanImport = canImport && !isViewingHistorical;
  const effectiveCanEdit = canEdit && !isViewingHistorical;
  const activeSemesterId = propSemesterId || activeSemesterData?.id;

  // ── Scoped Stats Queries ──────────────────────────────────────────────────
  const { data: statsData, isLoading: isLoadingAcStats } = useQuery({
    queryKey: ['academic-stats'],
    queryFn: getAcademicStats,
    enabled: !effectiveJurusanId,
    staleTime: 5 * 60 * 1000,
  });
  const stats = statsData?.data || null;

  const { data: activeSiswaRes, isLoading: isLoadingActive } = useQuery({
    queryKey: ['siswa', 'list', { status: 'AKTIF', jurusan_id: effectiveJurusanId, kelas_id: effectiveKelasId, page: 1, limit: 1 }],
    queryFn: () => getSiswaList(1, 1, '', effectiveKelasId || '', 'AKTIF', '', '', '', effectiveJurusanId || ''),
    staleTime: 5 * 60 * 1000,
  });
  const activeSiswaCount = activeSiswaRes?.pagination?.total ?? (effectiveJurusanId ? 0 : stats?.total_siswa ?? 0);

  const { data: calonRes, isLoading: isLoadingCalon } = useQuery({
    queryKey: ['siswa', 'list', { status: 'CALON', jurusan_id: effectiveJurusanId, kelas_id: effectiveKelasId, page: 1, limit: 1 }],
    queryFn: () => getSiswaList(1, 1, '', effectiveKelasId || '', 'CALON', '', '', '', effectiveJurusanId || ''),
    staleTime: 5 * 60 * 1000,
  });
  const calonSiswaCount = calonRes?.pagination?.total ?? 0;

  const { data: alumniRes, isLoading: isLoadingAlumni } = useQuery({
    queryKey: ['siswa', 'list', { status: 'LULUS', jurusan_id: effectiveJurusanId, kelas_id: effectiveKelasId, page: 1, limit: 1 }],
    queryFn: () => getSiswaList(1, 1, '', effectiveKelasId || '', 'LULUS', '', '', '', effectiveJurusanId || ''),
    enabled: Boolean(effectiveJurusanId),
    staleTime: 5 * 60 * 1000,
  });
  const alumniCount = alumniRes?.pagination?.total ?? 0;

  const { data: kelasJurusanRes } = useQuery({
    queryKey: ['kelas-list', { jurusan_id: effectiveJurusanId, limit: 100 }],
    queryFn: () => getKelasList(1, 100, '', '', effectiveJurusanId || ''),
    enabled: Boolean(effectiveJurusanId),
    staleTime: 5 * 60 * 1000,
  });
  const rombelJurusanCount = kelasJurusanRes?.data?.length ?? 0;

  const { data: regStatsData, isLoading: isLoadingReg } = useQuery({
    queryKey: ['academic-registration-stats', activeYearId, activeSemesterId],
    queryFn: () => getAcademicRegistrationStats(activeYearId!, activeSemesterId!).catch(() => null),
    enabled: !effectiveJurusanId && !!activeYearId && !!activeSemesterId,
    staleTime: 5 * 60 * 1000,
  });
  const registeredCount = regStatsData?.registered ?? null;

  const isLoadingStats = effectiveJurusanId 
    ? (isLoadingActive || isLoadingCalon || isLoadingAlumni)
    : (isLoadingAcStats || isLoadingActive || isLoadingCalon || isLoadingReg);

  // Stat Cards: Scoped to Jurusan, Kelas, or Global
  const statCards = useMemo(() => {
    if (effectiveKelasId) {
      return [
        {
          title: "Siswa Terdaftar",
          value: `${activeSiswaCount} Siswa`,
          icon: <Users size={14} />,
          gradient: "from-blue-600 to-indigo-600",
          subtitle: `Rombel ${effectiveKelasNama || 'Kelas'}`
        },
        {
          title: "Status Keaktifan",
          value: `${activeSiswaCount} Aktif`,
          icon: <UserCheck size={14} />,
          gradient: "from-emerald-500 to-teal-600",
          subtitle: "100% Aktif"
        }
      ];
    }

    if (effectiveJurusanId) {
      return [
        {
          title: `Total Siswa ${effectiveJurusanNama}`,
          value: activeSiswaCount,
          icon: <Users size={14} />,
          gradient: "from-blue-600 to-indigo-600",
          subtitle: "Siswa aktif kejuruan"
        },
        {
          title: "Rombel Kejuruan",
          value: rombelJurusanCount,
          icon: <Layers size={14} />,
          gradient: "from-indigo-500 to-violet-600",
          subtitle: `Kelas ${effectiveJurusanNama}`
        },
        {
          title: "Alumni / Lulus",
          value: alumniCount,
          icon: <UserX size={14} />,
          gradient: "from-slate-500 to-slate-700",
          subtitle: "Lulusan kejuruan"
        },
        {
          title: "Pendaftar / Calon PPDB",
          value: calonSiswaCount,
          icon: <GraduationCap size={14} />,
          gradient: calonSiswaCount > 0 ? "from-amber-500 to-orange-600" : "from-slate-400 to-slate-500",
          subtitle: calonSiswaCount > 0 ? `${calonSiswaCount} calon terdaftar` : "Belum ada calon",
          onClick: () => navigate('/academic/ppdb-mapping')
        }
      ];
    }

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
  }, [
    effectiveKelasId,
    effectiveKelasNama,
    effectiveJurusanId, 
    effectiveJurusanNama, 
    activeSiswaCount, 
    rombelJurusanCount, 
    alumniCount, 
    calonSiswaCount, 
    stats, 
    registeredCount, 
    navigate
  ]);

  // Action Handlers
  const handleCreateSiswa = useCallback(() => setModalState({ mode: 'create', isOpen: true }), []);
  const handleEditSiswa = useCallback((s: Siswa | string) => {
    const id = typeof s === 'string' ? s : s.id;
    setSelectedSiswaIdForDetail(id);
  }, []);
  const handleViewSiswa = useCallback((s: Siswa) => {
    if (onSelectSiswa) {
      onSelectSiswa(s);
      return;
    }
    setSelectedSiswaIdForDetail(s.id);
  }, [onSelectSiswa]);
  const handleCloseModal = useCallback(() => setModalState({ mode: null, isOpen: false }), []);
  const handleFormSuccess = useCallback(() => { 
    handleCloseModal(); 
    setRefreshTrigger(prev => prev + 1); 
  }, [handleCloseModal]);
  const handleRefresh = useCallback(() => setRefreshTrigger(prev => prev + 1), []);
  const handleHistory = useCallback((s: Siswa) => {
    setHistorySiswaId(s.id);
    setHistoryOpen(true);
  }, []);

  // Excel Template Generator
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
            { header: 'NIK', key: 'nik', width: 20 },
            { header: 'JK (L/P)', key: 'jenis_kelamin', width: 10, dropdown: { refKey: 'jk' } },
            { header: 'Tempat Lahir', key: 'tempat_lahir', width: 20 },
            { header: 'Tanggal Lahir', key: 'tanggal_lahir', width: 25, isDate: true },
            { header: 'Tinggi Badan (cm)', key: 'tinggi_badan', width: 18 },
            { header: 'Berat Badan (kg)', key: 'berat_badan', width: 18 },
            { header: 'Alamat Lengkap', key: 'alamat', width: 40 },
            { header: 'Dusun', key: 'dusun', width: 20 },
            { header: 'RT', key: 'rt', width: 10 },
            { header: 'RW', key: 'rw', width: 10 },
            { header: 'Kelurahan', key: 'kelurahan', width: 20 },
            { header: 'Kecamatan', key: 'kecamatan', width: 20 },
            { header: 'Kab/Kota', key: 'kabupaten', width: 20 },
            { header: 'Provinsi', key: 'provinsi', width: 20 },
            { header: 'Kode Pos', key: 'kode_pos', width: 15 },
            { header: 'Lintang (Latitude)', key: 'lintang', width: 20 },
            { header: 'Bujur (Longitude)', key: 'bujur', width: 20 },
            { header: 'Koordinat', key: 'koordinat', width: 25 },
            { header: 'Transportasi', key: 'transportasi', width: 20 },
            { header: 'Sekolah Asal', key: 'sekolah_asal', width: 25 },
            { header: 'No. Ijazah SMP', key: 'no_ijazah_smp', width: 20 },
            { header: 'No. HP Orang Tua', key: 'no_hp_ortu', width: 20 },
            { header: 'Nama Ayah', key: 'nama_ayah', width: 25 },
            { header: 'NIK Ayah', key: 'nik_ayah', width: 20 },
            { header: 'No. HP Ayah', key: 'no_hp_ayah', width: 20 },
            { header: 'Nama Ibu', key: 'nama_ibu', width: 25 },
            { header: 'NIK Ibu', key: 'nik_ibu', width: 20 },
            { header: 'No. HP Ibu', key: 'no_hp_ibu', width: 20 },
            { header: 'Nama Wali', key: 'nama_wali', width: 25 },
            { header: 'NIK Wali', key: 'nik_wali', width: 20 },
            { header: 'No. HP Wali', key: 'no_hp_wali', width: 20 }
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
            { header: 'NIK', key: 'nik', width: 20 },
            { header: 'JK (L/P)', key: 'jenis_kelamin', width: 10, dropdown: { refKey: 'jk' } },
            { header: 'Tempat Lahir', key: 'tempat_lahir', width: 20 },
            { header: 'Tanggal Lahir', key: 'tanggal_lahir', width: 25, isDate: true },
            { header: 'Tinggi Badan (cm)', key: 'tinggi_badan', width: 18 },
            { header: 'Berat Badan (kg)', key: 'berat_badan', width: 18 },
            { header: 'No. HP', key: 'no_hp', width: 15 },
            { header: 'Alamat Lengkap', key: 'alamat', width: 40 },
            { header: 'Dusun', key: 'dusun', width: 20 },
            { header: 'RT', key: 'rt', width: 10 },
            { header: 'RW', key: 'rw', width: 10 },
            { header: 'Kelurahan', key: 'kelurahan', width: 20 },
            { header: 'Kecamatan', key: 'kecamatan', width: 20 },
            { header: 'Kab/Kota', key: 'kabupaten', width: 20 },
            { header: 'Provinsi', key: 'provinsi', width: 20 },
            { header: 'Kode Pos', key: 'kode_pos', width: 15 },
            { header: 'Lintang (Latitude)', key: 'lintang', width: 20 },
            { header: 'Bujur (Longitude)', key: 'bujur', width: 20 },
            { header: 'Koordinat', key: 'koordinat', width: 25 },
            { header: 'Transportasi', key: 'transportasi', width: 20 },
            { header: 'Sekolah Asal', key: 'sekolah_asal', width: 25 },
            { header: 'No. Ijazah SMP', key: 'no_ijazah_smp', width: 20 },
            { header: 'No. HP Orang Tua', key: 'no_hp_ortu', width: 20 },
            { header: 'Nama Ayah', key: 'nama_ayah', width: 25 },
            { header: 'NIK Ayah', key: 'nik_ayah', width: 20 },
            { header: 'No. HP Ayah', key: 'no_hp_ayah', width: 20 },
            { header: 'Nama Ibu', key: 'nama_ibu', width: 25 },
            { header: 'NIK Ibu', key: 'nik_ibu', width: 20 },
            { header: 'No. HP Ibu', key: 'no_hp_ibu', width: 20 },
            { header: 'Nama Wali', key: 'nama_wali', width: 25 },
            { header: 'NIK Wali', key: 'nik_wali', width: 20 },
            { header: 'No. HP Wali', key: 'no_hp_wali', width: 20 }
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
            { header: 'NIK', key: 'nik', width: 20 },
            { header: 'JK (L/P)', key: 'jenis_kelamin', width: 10, required: false, dropdown: { refKey: 'jk' } },
            { header: 'Tempat Lahir', key: 'tempat_lahir', width: 20 },
            { header: 'Tanggal Lahir', key: 'tanggal_lahir', width: 25, isDate: true },
            { header: 'Tinggi Badan (cm)', key: 'tinggi_badan', width: 18 },
            { header: 'Berat Badan (kg)', key: 'berat_badan', width: 18 },
            { header: 'Tanggal Masuk', key: 'tanggal_masuk', width: 25, isDate: true },
            { header: 'Alamat Lengkap', key: 'alamat', width: 40 },
            { header: 'Dusun', key: 'dusun', width: 20 },
            { header: 'RT', key: 'rt', width: 10 },
            { header: 'RW', key: 'rw', width: 10 },
            { header: 'Kelurahan', key: 'kelurahan', width: 20 },
            { header: 'Kecamatan', key: 'kecamatan', width: 20 },
            { header: 'Kab/Kota', key: 'kabupaten', width: 20 },
            { header: 'Provinsi', key: 'provinsi', width: 20 },
            { header: 'Kode Pos', key: 'kode_pos', width: 15 },
            { header: 'Lintang (Latitude)', key: 'lintang', width: 20 },
            { header: 'Bujur (Longitude)', key: 'bujur', width: 20 },
            { header: 'Koordinat', key: 'koordinat', width: 25 },
            { header: 'Transportasi', key: 'transportasi', width: 20 },
            { header: 'No. HP', key: 'no_hp', width: 15 },
            { header: 'Sekolah Asal', key: 'sekolah_asal', width: 25 },
            { header: 'No. Ijazah SMP', key: 'no_ijazah_smp', width: 20 },
            { header: 'No. HP Orang Tua', key: 'no_hp_ortu', width: 20 },
            { header: 'Nama Ayah', key: 'nama_ayah', width: 25 },
            { header: 'NIK Ayah', key: 'nik_ayah', width: 20 },
            { header: 'No. HP Ayah', key: 'no_hp_ayah', width: 20 },
            { header: 'Nama Ibu', key: 'nama_ibu', width: 25 },
            { header: 'NIK Ibu', key: 'nik_ibu', width: 20 },
            { header: 'No. HP Ibu', key: 'no_hp_ibu', width: 20 },
            { header: 'Nama Wali', key: 'nama_wali', width: 25 },
            { header: 'NIK Wali', key: 'nik_wali', width: 20 },
            { header: 'No. HP Wali', key: 'no_hp_wali', width: 20 },
            { header: 'No. RFID', key: 'no_rfid', width: 20 }
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

  // Export Data Siswa
  const handleExport = useCallback(async () => {
    try {
      setIsExporting(true);
      const response = await getSiswaList(1, 100000, '', effectiveKelasId || '', '', '', '', '', effectiveJurusanId || '');
      if (!response.success || response.data.length === 0) {
        toast('Tidak ada data untuk diekspor.', { icon: '⚠️' });
        return;
      }

      const allSiswa = response.data as Siswa[];
      const statusAktif = ['AKTIF', 'AKTIF_PPDB', 'CALON'];
      const siswaAktif = allSiswa.filter(s => statusAktif.includes((s.status || '').toUpperCase()));
      const siswaLulus = allSiswa.filter(s => !statusAktif.includes((s.status || '').toUpperCase()));

      const now = new Date();
      const tglStr = now.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
      const judulScope = effectiveJurusanNama ? `JURUSAN ${effectiveJurusanNama.toUpperCase()}` : 'SELURUH SEKOLAH';
      const namaSekolah = `DATA MASTER PESERTA DIDIK — ${judulScope}`;

      const wb = XLSX.utils.book_new();

      const buildWorksheet = (data: Siswa[], sheetTitle: string, headerColor: string) => {
        const columns: ExcelColumnConfig<Siswa>[] = [
          { header: 'No', accessor: (_row, idx) => (idx ?? 0) + 1, width: 6 },
          { header: 'NIS', accessor: (row) => row.nis, width: 15 },
          { header: 'NISN', accessor: (row) => row.nisn || '-', width: 15 },
          { header: 'NIK', accessor: (row) => row.nik || '-', width: 20 },
          { header: 'Nama Lengkap', accessor: (row) => row.nama_siswa, width: 30 },
          { header: 'JK', accessor: (row) => row.jenis_kelamin, width: 6 },
          { header: 'Kelas', accessor: (row) => row.Kelas?.nama_kelas || '-', width: 15 },
          { header: 'Tinggi (cm)', accessor: (row) => row.tinggi_badan ?? '-', width: 12 },
          { header: 'Berat (kg)', accessor: (row) => row.berat_badan ?? '-', width: 11 },
          { header: 'Tempat Lahir', accessor: (row) => row.tempat_lahir || '-', width: 20 },
          { header: 'Tanggal Lahir', accessor: (row) => row.tanggal_lahir || '-', width: 15 },
          { header: 'Alamat Lengkap', accessor: (row) => row.alamat || '-', width: 40 },
          { header: 'No HP Siswa', accessor: (row) => row.no_hp || '-', width: 16 },
          { header: 'Sekolah Asal', accessor: (row) => row.sekolah_asal || '-', width: 25 },
          { header: 'Nama Ayah', accessor: (row) => row.nama_ayah || '-', width: 25 },
          { header: 'Nama Ibu', accessor: (row) => row.nama_ibu || '-', width: 25 },
          { header: 'Nama Wali', accessor: (row) => row.nama_wali || '-', width: 25 },
          { header: 'No RFID', accessor: (row) => row.no_rfid || '-', width: 16 },
          { header: 'Status', accessor: (row) => row.status, width: 10 },
        ];

        const excelData: (string | number | boolean | null | undefined)[][] = [];
        excelData.push([sheetTitle]);
        excelData.push([]);
        excelData.push(columns.map(c => c.header));

        data.forEach((item, idx) => {
          const row = columns.map(c => {
            const val = (c.accessor as (row: Siswa, index: number) => unknown)(item, idx);
            return val === null || val === undefined ? '' : val;
          });
          excelData.push(row);
        });

        const ws = XLSX.utils.aoa_to_sheet(excelData);
        ws['!cols'] = columns.map(c => ({ wch: c.width || 15 }));
        return ws;
      };

      if (siswaAktif.length > 0) {
        const wsAktif = buildWorksheet(siswaAktif, `${namaSekolah} — SISWA AKTIF | Diekspor: ${tglStr}`, 'FF0F172A');
        XLSX.utils.book_append_sheet(wb, wsAktif, 'Siswa Aktif');
      }

      if (siswaLulus.length > 0) {
        const wsLulus = buildWorksheet(siswaLulus, `${namaSekolah} — ALUMNI / LULUS | Diekspor: ${tglStr}`, 'FF065F46');
        XLSX.utils.book_append_sheet(wb, wsLulus, 'Alumni & Lulus');
      }

      const filename = `Laporan_Siswa_${effectiveJurusanNama.replace(/[^a-zA-Z0-9]/g, '_')}_${now.getFullYear()}${String(now.getMonth()+1).padStart(2,'0')}${String(now.getDate()).padStart(2,'0')}.xlsx`;
      XLSX.writeFile(wb, filename);
      toast.success(`✅ Berhasil! ${siswaAktif.length} siswa aktif + ${siswaLulus.length} alumni diekspor.`);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Gagal mengekspor data.';
      toast.error(msg);
    } finally {
      setIsExporting(false);
    }
  }, [effectiveKelasId, effectiveJurusanId, effectiveJurusanNama]);

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
    refreshSubscription().catch(() => {});
    setImportConfig(prev => ({ ...prev, useDefault: true, scenario: 'REGULAR' }));
    setImportOpen(true);
  }, [refreshSubscription]);
  
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

  // Deep Link Handling
  useEffect(() => {
    const editId = searchParams.get('edit');
    const viewId = searchParams.get('id');
    if (editId) {
      setModalState({ mode: 'edit', siswaId: editId, isOpen: true });
      const newParams = new URLSearchParams(searchParams);
      newParams.delete('edit');
      setSearchParams(newParams, { replace: true });
    } else if (viewId) {
      setSelectedSiswaIdForDetail(viewId);
      const newParams = new URLSearchParams(searchParams);
      newParams.delete('id');
      setSearchParams(newParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const content = (
    <div className="space-y-6 w-full max-w-full min-w-0">
      {/* Scope Mode Banner */}
      {!hideScopeBanner && (effectiveJurusanId || effectiveKelasId) && (
        <div className="flex items-center gap-2.5 p-3.5 bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-200/80 dark:border-indigo-900/50 rounded-2xl text-xs text-indigo-900 dark:text-indigo-200 shadow-2xs">
          <ShieldCheck size={18} className="text-indigo-600 dark:text-indigo-400 shrink-0" />
          <div className="min-w-0 flex-1">
            <span className="font-bold">Mode Terfokus:</span>{' '}
            <span>
              Menampilkan direktori peserta didik yang terdaftar pada{' '}
              <strong>
                {effectiveKelasId 
                  ? `Kelas ${effectiveKelasNama}` 
                  : `Program Keahlian ${effectiveJurusanNama}`}
              </strong>.
            </span>
          </div>
        </div>
      )}

      {selectedSiswaIdForDetail ? (
        <Suspense fallback={<div className="p-16 flex justify-center"><Loader size="lg" /></div>}>
          <SiswaDetailView
            siswaId={selectedSiswaIdForDetail}
            onBack={() => setSelectedSiswaIdForDetail(null)}
            onEdit={canEdit ? (id) => handleEditSiswa(id) : undefined}
            canEdit={canEdit}
          />
        </Suspense>
      ) : (
        <SectionCard fullWidth noPadding className="w-full max-w-full min-w-0">
          <SiswaList
            onEdit={canEdit ? handleEditSiswa : undefined}
            onView={handleViewSiswa}
            onAdd={canCreate ? handleCreateSiswa : undefined}
            onImport={canImport ? handleOpenImport : undefined}
            onExport={canExport ? handleExport : undefined}
            isExporting={isExporting}
            refreshTrigger={refreshTrigger}
            onRefresh={handleRefresh}
            onHistory={handleHistory}
            jurusanId={effectiveJurusanId}
            jurusanNama={effectiveJurusanNama}
            initialKelasId={effectiveKelasId}
            isKelasDisabled={isKelasRestricted}
            initialStatus={propStatus || 'AKTIF'}
            initialTingkat={propTingkat}
            tahunPelajaranId={activeYearId}
            semesterId={activeSemesterId}
            readOnly={readOnly}
            hideAdd={!canCreate}
            hideImport={!canImport}
            hideExport={!canExport}
          />
        </SectionCard>
      )}

      {/* Excel Import Modal */}
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
                id="use-default-period-universal"
                checked={importConfig.useDefault}
                onChange={(e) => setImportConfig(prev => ({ ...prev, useDefault: e.target.checked }))}
                className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor="use-default-period-universal" className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-tight cursor-pointer">
                Gunakan Periode Akademik Aktif (Default)
              </label>
            </div>

            {!importConfig.useDefault && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 animate-in fade-in slide-in-from-top-1 duration-200">
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

      {/* Main Student Form Modal */}
      <Modal isOpen={modalState.isOpen} onClose={handleCloseModal} title="Tambah Siswa Baru" size="4xl">
        <Suspense fallback={<div className="p-12 flex justify-center"><Loader /></div>}>
          {modalState.mode && (
            <SiswaForm 
              siswaId={modalState.siswaId} 
              mode={modalState.mode} 
              onSuccess={handleFormSuccess} 
              onCancel={handleCloseModal} 
            />
          )}
        </Suspense>
      </Modal>

      {/* Academic History Modal */}
      <Modal isOpen={historyOpen} onClose={() => setHistoryOpen(false)} title="Riwayat Akademik Siswa" size="xl">
        <Suspense fallback={<div className="p-12 flex justify-center"><Loader /></div>}>
          {historySiswaId && <SiswaHistory siswaId={historySiswaId} />}
        </Suspense>
      </Modal>
    </div>
  );

  // If in Modal mode or hideLayout, render clean inline view without AcademicPageLayout
  if (isModal || hideLayout) {
    return (
      <div className="space-y-5 w-full max-w-full min-w-0">
        {!hideHeaderStats && statCards.length > 0 && (
          <>
            {/* Mobile: 1 Baris Kartu Mini Metrik (Shopee-Grade Hairline Divider) */}
            <div className="sm:hidden w-full bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-[0_1px_3px_rgba(0,0,0,0.04)] flex items-stretch divide-x divide-slate-100 dark:divide-slate-800/80 overflow-hidden h-11 mb-2">
              {statCards.map((card, idx) => (
                <div 
                  key={idx} 
                  onClick={card.onClick} 
                  className={`flex-1 flex flex-col items-center justify-center px-1 text-center min-w-0 ${
                    card.onClick ? 'cursor-pointer active:bg-slate-50 dark:active:bg-slate-800' : ''
                  }`}
                >
                  <span className="text-[9.5px] font-medium text-slate-400 dark:text-slate-500 truncate w-full px-1">
                    {card.title}
                  </span>
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate w-full px-1">
                    {card.value}
                  </span>
                </div>
              ))}
            </div>

            {/* Desktop: Grid Kartu Metrik Standar */}
            <div className="hidden sm:grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-2">
              {statCards.map((card, idx) => (
                <div 
                  key={idx} 
                  onClick={card.onClick}
                  className={`p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center gap-3 ${
                    card.onClick ? 'cursor-pointer hover:border-indigo-300 dark:hover:border-indigo-700 transition-all' : ''
                  }`}
                >
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${card.gradient} text-white flex items-center justify-center shrink-0 shadow-2xs`}>
                    {card.icon}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-lg font-black text-slate-900 dark:text-slate-100 leading-tight truncate">
                      {card.value}
                    </div>
                    <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400 truncate">
                      {card.title}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
        {content}
      </div>
    );
  }

  return (
    <InfraErrorBoundary>
      <AcademicPageLayout
        title={effectiveJurusanId ? `Data Siswa ${effectiveJurusanNama}` : "Master Data Siswa Sekolah"}
        description={effectiveJurusanId 
          ? `Direktori & pemantauan data lengkap siswa program keahlian ${effectiveJurusanNama}.` 
          : "Pusat pengelolaan & pemantauan biodata lengkap siswa seluruh sekolah."}
        breadcrumbs={[
          { label: 'Dashboard', path: '/dashboard' },
          { label: 'Akademik', path: '/academic' },
          { label: effectiveJurusanId ? `Siswa ${effectiveJurusanNama}` : 'Data Siswa', path: '/academic/siswa' }
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
        permissionMessage="Anda tidak memiliki izin untuk mengakses data siswa."
        hardeningModuleKey="academic_siswa"
        onBack={selectedSiswaIdForDetail ? () => setSelectedSiswaIdForDetail(null) : undefined}
      >
        {content}
      </AcademicPageLayout>
    </InfraErrorBoundary>
  );
});

export default SiswaView;
