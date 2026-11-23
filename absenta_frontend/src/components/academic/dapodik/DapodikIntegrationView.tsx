/**
 * DapodikIntegrationView.tsx
 * Universal Role-Ready View untuk Integrasi & Komparasi Data Dapodik.
 * Standar Industri: Shopee-Grade Zero-Noise, High-Density Workspace, & Modals for Settings.
 */

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Key, CheckCircle2, AlertTriangle, Download, RefreshCw, 
  Copy, Check, Users, School, Eye,
  HelpCircle, Search, ArrowRight, Database, Server, HardDrive,
  SlidersHorizontal, Settings2,
  ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Clock, Sparkles,
  Printer, Bookmark, User, ExternalLink, X, ShieldCheck, Wrench,
  UserPlus, Edit3, LogOut, Trash2, GitCompare, FileCheck
} from 'lucide-react';
import { toast } from 'sonner';

import { cn } from '@/lib/utils';
import { Button, Input, Badge, Loader, Modal, ModalFooter, Label, Textarea, DebouncedSearchInput } from '@/components/ui';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { SiswaDetailModal } from '@/components/academic/siswa/SiswaDetailModal';
import { bulkUpdateStatus } from '@/api/academic/siswa.api';
import { FieldDocumentTrigger } from '@/components/documents/FieldDocumentTrigger';
import {
  getDapodikServerInfo,
  getDapodikConfig,
  saveDapodikConfig,
  testDapodikConnection,
  getDapodikStudentComparison,
  syncDapodikStudents,
  purgeDapodikStagingSnapshot,
  type DapodikConfig,
  type ReconciledStudent,
  type StudentReconciliationStatus,
  type TestConnectionResponse,
  type CompareOptions,
} from '@/api/dapodik.api';
import { DAPODIK_AUDIT_TEMPLATES, type DapodikAuditTemplate } from './dapodikAuditTemplates';
import { DapodikBeritaAcaraPrintModal, type DapodikPrintTemplateId } from './DapodikBeritaAcaraPrintModal';
import { DapodikWaliKelasChecklistPrintModal } from './DapodikWaliKelasChecklistPrintModal';
import { DapodikConnectionModal } from './DapodikConnectionModal';
import { DapodikCriteriaModal } from './DapodikCriteriaModal';
import { DapodikRombelMappingModal } from './DapodikRombelMappingModal';
import { DapodikToolsModal, type DapodikToolKey } from './DapodikToolsModal';
import { DapodikLppdUsiaModal } from './DapodikLppdUsiaModal';
import { DapodikFieldSyncModal } from './DapodikFieldSyncModal';
import { getTodayIsoDate } from '@/utils/dapodik/dapodikAgeStats';
import { isClassEquivalent } from '@/utils/dapodik/dapodikClassUtils';

const formatDiffValue = (field: string, val: any): React.ReactNode => {
  if (val === null || val === undefined || val === '') {
    return <span className="text-slate-400 italic">(Kosong)</span>;
  }
  if (field === 'jenis_kelamin') {
    const s = String(val).trim().toUpperCase();
    if (s === 'L') return 'Laki-laki (L)';
    if (s === 'P') return 'Perempuan (P)';
    return String(val);
  }
  return String(val);
};

export interface UniversalDapodikIntegrationViewProps {
  hideLayout?: boolean;
  kelasNama?: string;
  kelasId?: string;
  lockKelasScope?: boolean;
  isWalasMode?: boolean;
}

export const DapodikIntegrationView: React.FC<UniversalDapodikIntegrationViewProps> = ({
  hideLayout = false,
  kelasNama,
  kelasId,
  lockKelasScope = false,
  isWalasMode = false,
}) => {
  const queryClient = useQueryClient();

  // Modals Open State (Packaging All Settings in Modals to Eliminate Visual Noise)
  const [isConnectionModalOpen, setIsConnectionModalOpen] = useState(false);
  const [isCriteriaModalOpen, setIsCriteriaModalOpen] = useState(false);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [isWaliKelasPrintOpen, setIsWaliKelasPrintOpen] = useState(false);
  const [isToolsModalOpen, setIsToolsModalOpen] = useState(false);
  const [isLppdUsiaModalOpen, setIsLppdUsiaModalOpen] = useState(false);
  const [printModalTemplate, setPrintModalTemplate] = useState<DapodikPrintTemplateId>('rekon_absenta');
  const [lppdCutoffDate, setLppdCutoffDate] = useState<string>(getTodayIsoDate());
  const [isRombelMappingModalOpen, setIsRombelMappingModalOpen] = useState(false);
  const [selectedSiswaDetailId, setSelectedSiswaDetailId] = useState<string | null>(null);

  // Single & Bulk Import State
  const [importTargetStudents, setImportTargetStudents] = useState<ReconciledStudent[] | null>(null);

  // Granular Field Sync State (Pilih Kolom Pembaruan Data dari Dapodik)
  const [isFieldSyncModalOpen, setIsFieldSyncModalOpen] = useState(false);
  const [fieldSyncTargetStudents, setFieldSyncTargetStudents] = useState<ReconciledStudent[]>([]);

  // Mutasi / Keluar State (Terintegrasi Langsung dengan Modul Data Siswa Absenta)
  const [isMutasiModalOpen, setIsMutasiModalOpen] = useState(false);
  const [mutasiTargetStudents, setMutasiTargetStudents] = useState<ReconciledStudent[]>([]);
  const [mutasiStatus, setMutasiStatus] = useState<string>('PINDAH');
  const [mutasiDate, setMutasiDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [mutasiReason, setMutasiReason] = useState<string>('');
  const [isSubmittingMutasi, setIsSubmittingMutasi] = useState(false);

  // Form State
  const [configForm, setConfigForm] = useState<DapodikConfig>({
    dapodik_host: 'http://10.10.10.50:5774',
    npsn: '',
    api_token: '',
    is_active: true,
  });

  // Filter & Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | StudentReconciliationStatus>('ALL');
  const [rombelFilter, setRombelFilter] = useState('');
  const [tingkatFilter, setTingkatFilter] = useState('');
  const [genderFilter, setGenderFilter] = useState('');
  const [diffAttributeFilter, setDiffAttributeFilter] = useState<string>('');

  // Matching Options State (Opsi Bidang Pencocokan)
  const [compareOptions, setCompareOptions] = useState<CompareOptions>({
    checkNama: true,
    checkNis: true,
    checkNisn: true,
    checkNik: true,
    checkKelas: true,
    checkJenisKelamin: true,
    checkTanggalLahir: true,
    checkTempatLahir: false,
    ignoreClassWhitespace: true,
    onlyActiveStudents: true,
  });

  // High-Performance Pagination State (Anti Lemot / Memory Optimization)
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);

  // Explicit Fresh Fetch State (Tarik Data Baru dari Dapodik)
  const [isFetchingFresh, setIsFetchingFresh] = useState(false);

  // Audit Template State
  const [activeTemplateId, setActiveTemplateId] = useState<string>('full_audit');

  // Source Mode: Default 'STAGING' (Lokal dulu; jika lokal kosong, backend otomatis tarik Live) vs 'LIVE' (Real-time port 5774)
  const [sourceMode, setSourceMode] = useState<'LIVE' | 'STAGING'>('STAGING');

  // Selection State
  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string>>(new Set());

  // Confirm Dialog State (Modern In-App Feedback replacing window.confirm)
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmText?: string;
    onConfirm: () => void;
  } | null>(null);

  // Modal Raw State
  const [inspectedStudent, setInspectedStudent] = useState<ReconciledStudent | null>(null);

  // Test Connection State
  const [testResult, setTestResult] = useState<TestConnectionResponse | null>(null);
  const [isTesting, setIsTesting] = useState(false);

  // 1. Fetch Server Network Info (IP Absenta)
  const { data: serverInfoData } = useQuery({
    queryKey: ['dapodik-server-info'],
    queryFn: getDapodikServerInfo,
    staleTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  // 2. Fetch Saved Config
  const { data: configData, isLoading: _isLoadingConfig } = useQuery({
    queryKey: ['dapodik-config'],
    queryFn: getDapodikConfig,
    staleTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    if (configData?.data) {
      setConfigForm({
        dapodik_host: configData.data.dapodik_host || 'http://10.10.10.50:5774',
        npsn: configData.data.npsn || '',
        api_token: configData.data.api_token || '',
        is_active: configData.data.is_active ?? true,
        school_name: configData.data.school_name,
        is_configured: configData.data.is_configured,
        last_sync_at: configData.data.last_sync_at,
        last_status: configData.data.last_status,
      });
    }
  }, [configData]);

  // 3. Fetch Comparison Data (Mendukung Switch Mode: LIVE vs STAGING)
  const {
    data: comparisonData,
    isLoading: isLoadingComparison,
    isRefetching: isRefetchingComparison,
    refetch: refetchComparison,
    error: comparisonError,
  } = useQuery({
    queryKey: ['dapodik-student-comparison', compareOptions, sourceMode],
    queryFn: () => getDapodikStudentComparison(compareOptions, false, sourceMode),
    enabled: isWalasMode ? true : Boolean(configData?.data?.is_configured),
    staleTime: 5 * 60 * 1000, // 5 menit cache di client
    refetchOnWindowFocus: false,
    retry: false,
  });

  const primaryServerIp = serverInfoData?.data?.primaryIp || '10.10.10.116';

  // Aksi Eksplisit: Tarik Data Baru Langsung dari Port 5774 Dapodik
  const handleFetchFreshDapodik = async () => {
    setIsFetchingFresh(true);
    const toastId = toast.loading('Sedang menghubungi Web Service Dapodik port 5774...');
    try {
      const res = await getDapodikStudentComparison(compareOptions, true, 'LIVE');
      // Perbarui cache TanStack Query untuk mode LIVE & STAGING (karena tarikan fresh otomatis tersimpan ke Staging)
      queryClient.setQueryData(['dapodik-student-comparison', compareOptions, 'LIVE'], res);
      queryClient.setQueryData(['dapodik-student-comparison', compareOptions, 'STAGING'], res);
      if (sourceMode !== 'LIVE') {
        setSourceMode('LIVE');
      }
      queryClient.invalidateQueries({ queryKey: ['dapodik-config'] });

      if (res.data.summary.totalDapodik > 0) {
        toast.success(
          `Berhasil menarik ${res.data.summary.totalDapodik} data siswa dari Dapodik & disimpan ke Staging Platform!`,
          { id: toastId }
        );
      } else {
        toast.warning(
          'Web Service Dapodik merespons 0 data siswa. Periksa NPSN, semester aktif, atau status data di aplikasi Dapodik.',
          { id: toastId }
        );
      }
    } catch (err: any) {
      toast.error(
        err?.response?.data?.message || err?.message || 'Gagal menarik data dari Web Service Dapodik',
        { id: toastId }
      );
    } finally {
      setIsFetchingFresh(false);
    }
  };

  // Aksi Eksplisit: Hancurkan Snapshot Staging & Bersihkan Cache
  const [isPurgingStaging, setIsPurgingStaging] = useState(false);
  const handlePurgeStaging = () => {
    setConfirmDialog({
      isOpen: true,
      title: 'Hancurkan Snapshot Staging?',
      message:
        'Tindakan ini akan menghapus file snapshot staging lokal dan cache di memori server secara permanen. Snapshot baru akan dibuat saat Anda menarik data fresh dari Dapodik.',
      confirmText: 'Ya, Hancurkan Snapshot',
      onConfirm: async () => {
        setIsPurgingStaging(true);
        const toastId = toast.loading('Sedang menghancurkan snapshot staging...');
        try {
          await purgeDapodikStagingSnapshot();
          queryClient.invalidateQueries({ queryKey: ['dapodik-student-comparison'] });
          queryClient.invalidateQueries({ queryKey: ['dapodik-staging-meta'] });
          toast.success('Snapshot staging dan cache memori berhasil dihancurkan.', { id: toastId });
        } catch (err: any) {
          toast.error(err?.response?.data?.message || err?.message || 'Gagal menghancurkan snapshot staging', { id: toastId });
        } finally {
          setIsPurgingStaging(false);
          setConfirmDialog(null);
        }
      },
    });
  };

  // Save Config Mutation
  const saveMutation = useMutation({
    mutationFn: saveDapodikConfig,
    onSuccess: (res) => {
      toast.success(res.message || 'Konfigurasi Dapodik berhasil disimpan.');
      queryClient.invalidateQueries({ queryKey: ['dapodik-config'] });
      setIsConnectionModalOpen(false);
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || err?.message || 'Gagal menyimpan konfigurasi');
    },
  });

  // Execute Test Connection
  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const res = await testDapodikConnection(configForm);
      setTestResult(res);
      if (res.success) {
        toast.success(res.message || 'Koneksi ke Dapodik berhasil!');
        queryClient.invalidateQueries({ queryKey: ['dapodik-config'] });
      } else {
        toast.error(res.message || 'Koneksi ke Dapodik gagal.');
      }
    } catch (err: any) {
      const res = err?.response?.data || {
        success: false,
        message: err.message || 'Gagal terhubung ke host Dapodik.',
      };
      setTestResult(res);
      toast.error(res.message);
    } finally {
      setIsTesting(false);
    }
  };

  // Active Audit Template & Quick Switcher
  const activeTemplate = useMemo(() => {
    return DAPODIK_AUDIT_TEMPLATES.find((t) => t.id === activeTemplateId);
  }, [activeTemplateId]);

  const handleApplyTemplate = (tmpl: DapodikAuditTemplate) => {
    setActiveTemplateId(tmpl.id);
    setCompareOptions({ ...tmpl.options });
    toast.success(`Template audit "${tmpl.name}" diterapkan.`);
  };

  // Sync Students Mutation
  const syncMutation = useMutation({
    mutationFn: syncDapodikStudents,
    onSuccess: (res) => {
      toast.success(res.message || 'Sinkronisasi berhasil diproses.');
      setSelectedStudentIds(new Set());
      queryClient.invalidateQueries({ queryKey: ['dapodik-student-comparison'] });
      queryClient.invalidateQueries({ queryKey: ['siswa'] });
      queryClient.invalidateQueries({ queryKey: ['academic'] });
      refetchComparison();
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || err?.message || 'Gagal menyinkronkan siswa');
    },
  });

  // Students List & Filtering (Scope Aware untuk Walas / Universal View)
  const rawStudents = useMemo(() => {
    return comparisonData?.data?.students || [];
  }, [comparisonData]);

  const students = useMemo(() => {
    if (!lockKelasScope || !kelasNama) {
      return rawStudents;
    }
    return rawStudents.filter((s) => {
      const absKelas = s.absentaRaw?.SiswaAkademik?.[0]?.kelas?.nama_kelas || (s.absentaRaw as any)?.Kelas?.nama_kelas;
      const dapRombel = s.dapodikRaw?.nama_rombel || s.dapodikRaw?.rombel;
      const sRombel = s.rombel;
      return (
        isClassEquivalent(absKelas, kelasNama) ||
        isClassEquivalent(dapRombel, kelasNama) ||
        isClassEquivalent(sRombel, kelasNama)
      );
    });
  }, [rawStudents, lockKelasScope, kelasNama]);

  const activeCriteriaCount = useMemo(() => {
    let count = 0;
    if (compareOptions.checkNama) count++;
    if (compareOptions.checkNis) count++;
    if (compareOptions.checkNisn) count++;
    if (compareOptions.checkNik) count++;
    if (compareOptions.checkKelas) count++;
    if (compareOptions.checkJenisKelamin) count++;
    if (compareOptions.checkTanggalLahir) count++;
    if (compareOptions.checkTempatLahir) count++;
    return count;
  }, [compareOptions]);

  const summary = useMemo(() => {
    if (!lockKelasScope || !kelasNama) {
      return comparisonData?.data?.summary;
    }
    let totalDapodik = 0;
    let totalAbsenta = 0;
    let matchCount = 0;
    let mismatchCount = 0;
    let dapodikOnlyCount = 0;
    let absentaOnlyCount = 0;

    students.forEach((s) => {
      if (s.dapodikRaw) totalDapodik++;
      if (s.absentaRaw) totalAbsenta++;
      if (s.status === 'MATCH') matchCount++;
      else if (s.status === 'MISMATCH') mismatchCount++;
      else if (s.status === 'DAPODIK_ONLY') dapodikOnlyCount++;
      else if (s.status === 'ABSENTA_ONLY') absentaOnlyCount++;
    });

    return {
      totalDapodik,
      totalAbsenta,
      matchCount,
      mismatchCount,
      dapodikOnlyCount,
      absentaOnlyCount,
    };
  }, [comparisonData?.data?.summary, lockKelasScope, kelasNama, students]);
  const cacheInfo = comparisonData?.data?.cacheInfo;

  const totalDapodikSourceCount = useMemo(
    () => students.filter((s) => Boolean(s.dapodikRaw) && s.status !== 'ABSENTA_ONLY').length,
    [students]
  );

  // Helper Ekstraksi Tingkat Siswa
  const getStudentTingkat = useCallback((s: ReconciledStudent): string => {
    const absTingkat =
      s.absentaRaw?.SiswaAkademik?.[0]?.kelas?.tingkat ||
      (s.absentaRaw as any)?.Kelas?.tingkat;
    if (absTingkat) return String(absTingkat);

    const dapTingkat = s.dapodikRaw?.tingkat_pendidikan_id || s.dapodikRaw?.tingkat;
    if (dapTingkat) {
      const parsed = parseInt(String(dapTingkat), 10);
      if (!isNaN(parsed)) return String(parsed);
    }

    const rombel = (s.rombel || s.dapodikRaw?.nama_rombel || '').trim().toUpperCase();
    if (rombel.startsWith('10') || rombel.startsWith('X ') || rombel.startsWith('X-') || rombel.startsWith('X.')) return '10';
    if (rombel.startsWith('11') || rombel.startsWith('XI ') || rombel.startsWith('XI-') || rombel.startsWith('XI.')) return '11';
    if (rombel.startsWith('12') || rombel.startsWith('XII ') || rombel.startsWith('XII-') || rombel.startsWith('XII.')) return '12';
    if (rombel.startsWith('13') || rombel.startsWith('XIII ') || rombel.startsWith('XIII-') || rombel.startsWith('XIII.')) return '13';

    return '';
  }, []);

  // Daftar Pilihan Rombel Unik
  const availableRombelList = useMemo(() => {
    const rombelSet = new Set<string>();
    students.forEach((s) => {
      const r = (s.rombel || s.dapodikRaw?.nama_rombel || '').trim();
      if (r) rombelSet.add(r);
    });
    return Array.from(rombelSet).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  }, [students]);

  // Agregasi Statistik Perbedaan Atribut Siswa (Dapodik vs Absenta)
  const diffAttributeStats = useMemo(() => {
    const counts: Record<string, { label: string; count: number }> = {
      kelas: { label: 'Rombel / Kelas', count: 0 },
      nama_siswa: { label: 'Nama Siswa', count: 0 },
      nis: { label: 'Nomor Induk Siswa (NIS)', count: 0 },
      nisn: { label: 'NISN', count: 0 },
      nik: { label: 'NIK', count: 0 },
      tanggal_lahir: { label: 'Tanggal Lahir', count: 0 },
      tempat_lahir: { label: 'Tempat Lahir', count: 0 },
      jenis_kelamin: { label: 'Jenis Kelamin', count: 0 },
    };

    let totalStudentsWithDiffs = 0;

    students.forEach((s) => {
      if (s.diffs && s.diffs.length > 0) {
        totalStudentsWithDiffs++;
        s.diffs.forEach((d) => {
          if (!counts[d.field]) {
            counts[d.field] = { label: d.label || d.field, count: 0 };
          }
          counts[d.field].count++;
        });
      }
    });

    return { counts, totalStudentsWithDiffs };
  }, [students]);

  // Pilihan Dropdown Filter Perbedaan Atribut
  const diffAttributeOptions = useMemo(() => {
    const list = [
      { value: '', label: 'Semua Status Atribut (Tanpa Filter)' },
      { 
        value: 'ANY_DIFF', 
        label: `Semua Perbedaan Atribut (${diffAttributeStats.totalStudentsWithDiffs} Siswa)` 
      },
    ];

    Object.entries(diffAttributeStats.counts)
      .sort((a, b) => b[1].count - a[1].count)
      .forEach(([field, item]) => {
        list.push({
          value: field,
          label: `Beda ${item.label} (${item.count} siswa)`,
        });
      });

    return list;
  }, [diffAttributeStats]);

  // Cek apakah ada filter aktif selain default
  const hasActiveFilters = Boolean(
    searchQuery.trim() ||
    statusFilter !== 'ALL' ||
    rombelFilter ||
    tingkatFilter ||
    genderFilter ||
    diffAttributeFilter
  );

  const handleResetFilters = useCallback(() => {
    setSearchQuery('');
    setStatusFilter('ALL');
    setRombelFilter('');
    setTingkatFilter('');
    setGenderFilter('');
    setDiffAttributeFilter('');
  }, []);

  const filteredStudents = useMemo(() => {
    return students.filter((s) => {
      // 1. Filter Status Rekonsiliasi
      if (statusFilter !== 'ALL' && s.status !== statusFilter) {
        return false;
      }

      // 2. Filter Perbedaan Atribut Spesifik (Dapodik vs Absenta)
      if (diffAttributeFilter) {
        if (diffAttributeFilter === 'ANY_DIFF') {
          if (!s.diffs || s.diffs.length === 0) return false;
        } else {
          if (!s.diffs || !s.diffs.some((d) => d.field === diffAttributeFilter)) return false;
        }
      }

      // 3. Filter Rombel
      if (rombelFilter) {
        const sRombel = (s.rombel || s.dapodikRaw?.nama_rombel || '').trim();
        if (sRombel !== rombelFilter) {
          return false;
        }
      }

      // 4. Filter Tingkat
      if (tingkatFilter) {
        const sTingkat = getStudentTingkat(s);
        if (sTingkat !== tingkatFilter) {
          return false;
        }
      }

      // 5. Filter Gender
      if (genderFilter) {
        const sGender = (s.jenis_kelamin || '').toUpperCase().startsWith('L') ? 'L' : 'P';
        if (sGender !== genderFilter) {
          return false;
        }
      }

      // 6. Pencarian Teks
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchNama = s.nama.toLowerCase().includes(q);
        const matchNisn = s.nisn.toLowerCase().includes(q);
        const matchNis = (s.nis || '').toLowerCase().includes(q);
        const matchNik = (s.nik || '').toLowerCase().includes(q);
        const matchRombel = (s.rombel || '').toLowerCase().includes(q);
        return matchNama || matchNisn || matchNis || matchNik || matchRombel;
      }

      return true;
    });
  }, [students, statusFilter, diffAttributeFilter, rombelFilter, tingkatFilter, genderFilter, searchQuery, getStudentTingkat]);

  // Reset pagination when filter/search/options change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter, diffAttributeFilter, rombelFilter, tingkatFilter, genderFilter, compareOptions, pageSize]);

  // Paginated Slicing (Lightweight DOM: Render only 25 - 100 rows instead of 2,755)
  const totalPages = Math.max(1, Math.ceil(filteredStudents.length / pageSize));
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, filteredStudents.length);

  const paginatedStudents = useMemo(() => {
    return filteredStudents.slice(startIndex, endIndex);
  }, [filteredStudents, startIndex, endIndex]);

  const currentDiffFilterLabel = useMemo(() => {
    if (diffAttributeFilter === 'ANY_DIFF') return 'Semua Selisih Atribut';
    if (diffAttributeFilter && diffAttributeStats.counts[diffAttributeFilter]) {
      return `Beda ${diffAttributeStats.counts[diffAttributeFilter].label}`;
    }
    if (statusFilter === 'MISMATCH') return 'Selisih Data (MISMATCH)';
    if (statusFilter === 'DAPODIK_ONLY') return 'Hanya Ada di Dapodik';
    if (statusFilter === 'ABSENTA_ONLY') return 'Hanya Ada di Absenta';
    if (statusFilter === 'MATCH') return 'Data Selaras Identik';
    if (rombelFilter) return `Rombel ${rombelFilter}`;
    return 'Daftar Verifikasi Data Siswa';
  }, [diffAttributeFilter, diffAttributeStats, statusFilter, rombelFilter]);

  // Selection Handlers (Support Page & All)
  const isAllPageSelected = useMemo(() => {
    return (
      paginatedStudents.length > 0 &&
      paginatedStudents.every((s) => selectedStudentIds.has(s.id))
    );
  }, [paginatedStudents, selectedStudentIds]);

  const handleToggleSelectPage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const next = new Set(selectedStudentIds);
    if (e.target.checked) {
      paginatedStudents.forEach((s) => next.add(s.id));
    } else {
      paginatedStudents.forEach((s) => next.delete(s.id));
    }
    setSelectedStudentIds(next);
  };

  const handleSelectAllFiltered = () => {
    const all = new Set(filteredStudents.map((s) => s.id));
    setSelectedStudentIds(all);
    toast.info(`Memilih seluruh ${all.size} siswa hasil filter.`);
  };

  const handleClearSelection = () => {
    setSelectedStudentIds(new Set());
  };

  const handleToggleSelect = (id: string) => {
    const next = new Set(selectedStudentIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedStudentIds(next);
  };

  const selectedStudents = useMemo(() => {
    return students.filter((s) => selectedStudentIds.has(s.id));
  }, [students, selectedStudentIds]);

  const handleBulkUpdate = () => {
    const eligible = selectedStudents.filter((s) => Boolean(s.absentaRaw && s.dapodikRaw));

    if (eligible.length === 0) {
      toast.warning('Pilih setidaknya 1 siswa yang terdaftar di Absenta dan memiliki data di Dapodik.');
      return;
    }

    setFieldSyncTargetStudents(eligible);
    setIsFieldSyncModalOpen(true);
  };

  const handleSingleUpdate = (student: ReconciledStudent) => {
    if (!student.absentaRaw || !student.dapodikRaw) {
      toast.warning('Data siswa ini tidak memiliki pasangan di Absenta & Dapodik.');
      return;
    }
    setFieldSyncTargetStudents([student]);
    setIsFieldSyncModalOpen(true);
  };

  const handleExecuteFieldSync = (selectedFields: string[]) => {
    if (!fieldSyncTargetStudents || fieldSyncTargetStudents.length === 0) {
      toast.warning('Tidak ada siswa yang dipilih.');
      return;
    }

    if (!selectedFields || selectedFields.length === 0) {
      toast.warning('Pilih setidaknya satu kolom data yang ingin diperbarui.');
      return;
    }

    const targets = fieldSyncTargetStudents
      .filter((s) => Boolean(s.absentaRaw?.id || s.id))
      .map((s) => {
        const d = s.dapodikRaw;
        const dNipd = d?.nipd || d?.registrasi_peserta_didik?.nipd;
        const dNama = d?.nama || d?.nama_siswa;
        const dRombel = d?.nama_rombel || d?.rombongan_belajar?.nama || d?.rombel;

        return {
          absentaId: s.absentaRaw?.id || s.id,
          // Mengambil nilai resmi dari Dapodik secara presisi
          nisn: (d?.nisn !== undefined && d?.nisn !== null && String(d.nisn).trim() !== '') ? String(d.nisn).trim() : (s.nisn || undefined),
          nik: (d?.nik !== undefined && d?.nik !== null && String(d.nik).trim() !== '') ? String(d.nik).trim() : (s.nik || undefined),
          nis: (dNipd !== undefined && dNipd !== null && String(dNipd).trim() !== '') ? String(dNipd).trim() : (s.nis || undefined),
          nama: (dNama && String(dNama).trim() !== '') ? String(dNama).trim() : s.nama,
          jenis_kelamin: (d?.jenis_kelamin && String(d.jenis_kelamin).trim() !== '') ? String(d.jenis_kelamin).trim() : s.jenis_kelamin,
          tempat_lahir: (d?.tempat_lahir !== undefined && d?.tempat_lahir !== null && String(d.tempat_lahir).trim() !== '') ? String(d.tempat_lahir).trim() : (s.tempat_lahir || undefined),
          tanggal_lahir: (d?.tanggal_lahir !== undefined && d?.tanggal_lahir !== null && String(d.tanggal_lahir).trim() !== '') ? String(d.tanggal_lahir).trim() : (s.tanggal_lahir || undefined),
          rombel: (dRombel && String(dRombel).trim() !== '') ? String(dRombel).trim() : (s.rombel || undefined),
          kelas_id: s.absentaRaw?.kelas_id || undefined,
        };
      });

    if (targets.length === 0) {
      toast.warning('Tidak ada siswa valid yang dapat diperbarui.');
      return;
    }

    setIsFieldSyncModalOpen(false);
    toast.info(`Memproses sinkronisasi data Dapodik untuk ${targets.length} siswa...`);
    syncMutation.mutate({
      action: 'UPDATE_SELECTED',
      fields_to_update: selectedFields,
      students: targets,
    });
  };

  const handleBulkImport = () => {
    const targets = selectedStudents.filter((s) => s.status === 'DAPODIK_ONLY');

    if (targets.length === 0) {
      toast.warning('Tidak ada siswa berstatus Dapodik Saja dalam pilihan Anda.');
      return;
    }

    setImportTargetStudents(targets);
    // Buka Wizard Pemetaan Rombel Dapodik ke Kelas Platform
    setIsRombelMappingModalOpen(true);
  };

  const handleSingleImport = (s: ReconciledStudent) => {
    setImportTargetStudents([s]);
    setIsRombelMappingModalOpen(true);
  };

  // Handlers Mutasi & Keluar Siswa (Tunggal & Massal)
  const handleOpenSingleMutasi = (student: ReconciledStudent) => {
    setMutasiTargetStudents([student]);
    setMutasiStatus('PINDAH');
    setMutasiDate(new Date().toISOString().split('T')[0]);
    setMutasiReason('Siswa mutasi keluar (tidak terdaftar di Dapodik)');
    setIsMutasiModalOpen(true);
  };

  const handleOpenBulkMutasi = () => {
    const targets = selectedStudents.filter((s) => Boolean(s.absentaRaw));
    if (targets.length === 0) {
      toast.warning('Pilih setidaknya 1 siswa Absenta untuk memproses mutasi.');
      return;
    }
    setMutasiTargetStudents(targets);
    setMutasiStatus('PINDAH');
    setMutasiDate(new Date().toISOString().split('T')[0]);
    setMutasiReason('Mutasi massal hasil audit & sinkronisasi Dapodik');
    setIsMutasiModalOpen(true);
  };

  const handleConfirmMutasi = async () => {
    if (!mutasiDate) {
      toast.error('Tanggal efektif mutasi wajib diisi.');
      return;
    }
    if (!mutasiReason.trim()) {
      toast.error('Alasan mutasi/keluar wajib diisi.');
      return;
    }
    const studentIds = mutasiTargetStudents
      .map((s) => s.absentaRaw?.id || s.id)
      .filter(Boolean);

    if (studentIds.length === 0) {
      toast.error('Tidak ditemukan ID siswa Absenta yang valid.');
      return;
    }

    try {
      setIsSubmittingMutasi(true);
      await bulkUpdateStatus({
        ids: studentIds,
        status: mutasiStatus,
        tanggal: new Date(mutasiDate),
        keterangan: mutasiReason.trim(),
      });

      toast.success(
        `Berhasil memproses status mutasi (${mutasiStatus}) untuk ${studentIds.length} siswa.`
      );
      setIsMutasiModalOpen(false);
      setSelectedStudentIds(new Set());
      queryClient.invalidateQueries({ queryKey: ['dapodik-student-comparison'] });
      queryClient.invalidateQueries({ queryKey: ['siswa'] });
      refetchComparison();
    } catch (err: any) {
      toast.error(
        err?.response?.data?.message || err?.message || 'Gagal memproses mutasi siswa.'
      );
    } finally {
      setIsSubmittingMutasi(false);
    }
  };

  // Format Helper Status Badge
  const renderStatusBadge = (status: StudentReconciliationStatus) => {
    switch (status) {
      case 'MATCH':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
            <CheckCircle2 className="w-3 h-3" /> Selaras (100%)
          </span>
        );
      case 'MISMATCH':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
            <AlertTriangle className="w-3 h-3" /> Beda Data (MISMATCH)
          </span>
        );
      case 'DAPODIK_ONLY':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300">
            <Download className="w-3 h-3" /> Dapodik Saja
          </span>
        );
      case 'ABSENTA_ONLY':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300">
            <HelpCircle className="w-3 h-3" /> Absenta Saja
          </span>
        );
    }
  };

  // Helper Format Waktu Cache & Staging
  const formattedCacheTime = useMemo(() => {
    if (!cacheInfo?.cachedAt) return null;
    const d = new Date(cacheInfo.cachedAt);
    return d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) + ' WIB';
  }, [cacheInfo?.cachedAt]);

  const stagingMeta = comparisonData?.data?.stagingMeta;
  const isCurrentlyStaging = cacheInfo?.sourceMode === 'STAGING' || sourceMode === 'STAGING';

  return (
    <div className="space-y-3.5">
      {(!isWalasMode && !configForm.api_token) ? (
        /* Empty State Jika Belum Dikonfigurasi (Khusus Admin Sekolah di Halaman Utama Integrasi) */
        <div className="p-8 text-center bg-white dark:bg-slate-900 rounded-2xl border border-dashed border-slate-300 dark:border-slate-800 space-y-4 shadow-xs">
          <div className="w-12 h-12 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto">
            <Key className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h4 className="text-base font-bold text-slate-800 dark:text-slate-100">
              Koneksi Web Service Dapodik Belum Dikonfigurasi
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
              Untuk mulai membandingkan dan mengaudit data siswa, hubungkan aplikasi ke Web Service Dapodik lokal (port 5774).
            </p>
          </div>
          <Button onClick={() => setIsConnectionModalOpen(true)} className="gap-2 text-xs">
            <Key className="w-4 h-4" /> Atur Koneksi &amp; Token Sekarang
          </Button>
        </div>
      ) : (
        <>
          {/* ═══════════════════════════════════════════════════════════════════
              1. HEADER UTAMA RAMPING (ZERO-NOISE & HIGH-DENSITY ACTION STRIP)
          ═══════════════════════════════════════════════════════════════════ */}
          <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-2.5 px-3.5 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs text-xs">
            {/* Sisi Kiri: Status Lembaga & Snapshot */}
            <div className="flex items-center gap-2.5 flex-wrap min-w-0">
              <div className="flex items-center gap-2 min-w-0 max-w-full">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                {isWalasMode ? (
                  <span className="font-bold text-slate-900 dark:text-slate-100 truncate text-xs sm:text-sm">
                    Cek Data Dapodik • {kelasNama || 'Kelas Binaan'}
                  </span>
                ) : (
                  <>
                    <span className="font-bold text-slate-900 dark:text-slate-100 truncate max-w-[240px]">
                      {configForm.school_name || `NPSN ${configForm.npsn}`}
                    </span>
                    <span className="text-slate-300 dark:text-slate-700 hidden sm:inline shrink-0">•</span>
                    <span className="font-mono text-[11px] text-slate-500 dark:text-slate-400 hidden sm:inline truncate">
                      {configForm.dapodik_host}
                    </span>
                  </>
                )}
              </div>

              {formattedCacheTime && (
                <div className="flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/60 px-2 py-0.5 rounded-lg border border-slate-200/60 dark:border-slate-700/60">
                  <Clock className="w-3 h-3 text-slate-400" />
                  <span>Snapshot: <strong>{formattedCacheTime}</strong></span>
                  {cacheInfo?.sourceMode === 'LIVE' ? (
                    cacheInfo?.isFromCache ? (
                      <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-medium">(In-Memory Live)</span>
                    ) : (
                      <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">(Live Port 5774 • Tersimpan ke Staging)</span>
                    )
                  ) : (
                    <span className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold">(Staging Platform)</span>
                  )}
                </div>
              )}

              <div className="hidden sm:flex items-center gap-1 text-[11px] text-indigo-700 dark:text-indigo-300 bg-indigo-50/70 dark:bg-indigo-950/50 px-2 py-0.5 rounded-lg border border-indigo-200/60 dark:border-indigo-800/50 font-semibold">
                <Users className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />
                <span>{compareOptions.onlyActiveStudents !== false ? 'Konteks: Siswa Aktif' : 'Konteks: Semua Siswa'}</span>
              </div>

              {comparisonData?.data?.academicContext?.tahunPelajaran && (
                <div className="hidden sm:flex items-center gap-1 text-[11px] text-emerald-700 dark:text-emerald-300 bg-emerald-50/70 dark:bg-emerald-950/50 px-2 py-0.5 rounded-lg border border-emerald-200/60 dark:border-emerald-800/50 font-semibold">
                  <School className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                  <span>
                    T.A. {comparisonData.data.academicContext.tahunPelajaran.tahun}
                    {comparisonData.data.academicContext.semester?.nama_semester ? ` • ${comparisonData.data.academicContext.semester.nama_semester}` : ''}
                  </span>
                </div>
              )}
            </div>

            {/* Sisi Kanan: Action Buttons Terpadu & Switcher Mode Dapodik */}
            <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
              {/* SWITCHER PERBANDINGAN: STAGING PLATFORM VS DAPODIK LANGSUNG (Admin Only) */}
              {!isWalasMode && (
                <div className="flex items-center p-0.5 bg-slate-100 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 text-[11px] mr-1">
                  <button
                    type="button"
                    onClick={() => {
                      if (sourceMode !== 'STAGING') {
                        setSourceMode('STAGING');
                        toast.info('Beralih ke Mode Dapodik Lokal (Staging Platform). Komputer Dapodik tidak perlu dinyalakan.');
                      }
                    }}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md font-semibold transition-all ${
                      sourceMode === 'STAGING'
                        ? 'bg-amber-500 text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                    }`}
                    title="Gunakan Data Dapodik yang tersimpan permanen di platform Absenta (Komputer Dapodik tidak perlu dinyalakan)"
                  >
                    <HardDrive className="w-3 h-3" />
                    <span>Dapodik Lokal (Staging)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      if (sourceMode !== 'LIVE') {
                        setSourceMode('LIVE');
                        toast.info('Beralih ke Mode Dapodik Langsung (Live Port 5774).');
                      }
                    }}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md font-semibold transition-all ${
                      sourceMode === 'LIVE'
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                    }`}
                    title="Hubungkan langsung ke Web Service Dapodik operator secara real-time (Port 5774)"
                  >
                    <Server className="w-3 h-3" />
                    <span>Dapodik Langsung (Live)</span>
                  </button>
                </div>
              )}

              {/* Tombol Pengaturan Koneksi (Modal - Admin Only) */}
              {!isWalasMode && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setIsConnectionModalOpen(true)}
                  className="h-7 px-2.5 text-[11px] font-semibold gap-1.5 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                  title="Buka Pengaturan Koneksi, Host, Token, dan Whitelist IP"
                >
                  <Key className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                  Pengaturan Koneksi
                </Button>
              )}

              {/* Tombol Kriteria Pencocokan & Template (Modal - Admin Only) */}
              {!isWalasMode && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setIsCriteriaModalOpen(true)}
                  className="h-7 px-2.5 text-[11px] font-semibold gap-1.5 border-indigo-200 dark:border-indigo-800/70 text-indigo-700 dark:text-indigo-300 bg-indigo-50/50 dark:bg-indigo-950/30 hover:bg-indigo-100/60"
                  title="Atur Bidang Pencocokan dan Template Audit"
                >
                  <SlidersHorizontal className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                  Kriteria Audit ({activeCriteriaCount})
                </Button>
              )}

              {/* Pusat Tools & Utilitas Dapodik (Rekap LPPD, Cetak Berita Acara, dll - Admin Only) */}
              {!isWalasMode && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setIsToolsModalOpen(true)}
                  className="h-7 px-2.5 text-[11px] font-bold gap-1.5 border-indigo-200 dark:border-indigo-900/50 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/30"
                  title="Buka Tools & Utilitas Integrasi Dapodik"
                >
                  <Wrench className="w-3.5 h-3.5 text-indigo-500" />
                  Tools
                </Button>
              )}

              {/* Cetak Berita Acara Rekonsiliasi (Admin Only) */}
              {!isWalasMode && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setPrintModalTemplate('rekon_absenta');
                    setIsPrintModalOpen(true);
                  }}
                  disabled={!summary || isLoadingComparison}
                  className="h-7 px-2.5 text-[11px] font-semibold gap-1.5 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                  title="Cetak Berita Acara Rekonsiliasi Data"
                >
                  <Printer className="w-3.5 h-3.5 text-slate-500" />
                  Cetak Dokumen
                </Button>
              )}

              {/* Cetak Lembar Verifikasi & Ceklis Berkas Siswa untuk Wali Kelas */}
              <Button
                size="sm"
                variant="outline"
                onClick={() => setIsWaliKelasPrintOpen(true)}
                disabled={!summary || isLoadingComparison || filteredStudents.length === 0}
                className="h-7 px-2.5 text-[11px] font-semibold gap-1.5 border-amber-300 dark:border-amber-700/80 bg-amber-50/70 hover:bg-amber-100 dark:bg-amber-950/30 text-amber-900 dark:text-amber-200"
                title="Cetak lembar verifikasi berkas dan selisih data siswa"
              >
                <FileCheck className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                <span>{isWalasMode ? `Cetak Lembar Verifikasi (${filteredStudents.length})` : `Lembar Wali Kelas (${filteredStudents.length})`}</span>
              </Button>

              {/* Hancurkan / Purge Cache Staging (Admin Only) */}
              {!isWalasMode && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handlePurgeStaging}
                  disabled={isPurgingStaging || isLoadingComparison}
                  className="h-7 px-2 text-[11px] font-semibold gap-1 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-900/60 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                  title="Hancurkan snapshot staging dan bersihkan cache untuk penarikan fresh total"
                >
                  <Trash2 className={`w-3.5 h-3.5 ${isPurgingStaging ? 'animate-spin' : ''}`} />
                  <span className="hidden sm:inline">Bersihkan Staging</span>
                </Button>
              )}

              {/* Tarik Data Baru dari Dapodik Port 5774 */}
              <Button
                size="sm"
                variant="primary"
                onClick={handleFetchFreshDapodik}
                disabled={isFetchingFresh || isLoadingComparison}
                className="h-7 px-2.5 text-[11px] font-semibold gap-1.5 shadow-xs"
                title="Kueri data fresh dari komputer operator Dapodik"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isFetchingFresh ? 'animate-spin' : ''}`} />
                {isFetchingFresh ? 'Mengambil...' : 'Tarik Data Baru'}
              </Button>
            </div>
          </div>

          {cacheInfo?.fallbackReason && (
            <div className="flex items-start justify-between gap-3 px-3.5 py-2 rounded-xl bg-amber-50/90 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 text-amber-900 dark:text-amber-200 text-xs">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">Mode Live gagal, otomatis menampilkan Snapshot Staging Platform: </span>
                  <span className="text-amber-800 dark:text-amber-300">{cacheInfo.fallbackReason}</span>
                </div>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setIsConnectionModalOpen(true)}
                className="h-6 px-2 text-[11px] shrink-0 border-amber-300 dark:border-amber-700 text-amber-800 dark:text-amber-200 hover:bg-amber-100/70"
              >
                Cek Koneksi &amp; IP
              </Button>
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════════════
              2. BENTO STATS CARDS (RINGKAS & ZERO NOISE)
          ═══════════════════════════════════════════════════════════════════ */}
          {summary && (
            isWalasMode ? (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center justify-between">
                  <div>
                    <div className="text-slate-500 text-xs font-medium">Total Siswa Binaan</div>
                    <div className="text-xl font-black text-slate-900 dark:text-white mt-0.5">
                      {students.length} <span className="text-xs font-normal text-slate-400">Siswa</span>
                    </div>
                  </div>
                  <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                    <Users className="w-5 h-5" />
                  </div>
                </div>

                <div className="bg-emerald-50/60 dark:bg-emerald-950/20 p-3 rounded-xl border border-emerald-200/70 dark:border-emerald-800/40 shadow-xs flex items-center justify-between">
                  <div>
                    <div className="text-emerald-700 dark:text-emerald-400 text-xs font-semibold">Data Selaras (100%)</div>
                    <div className="text-xl font-black text-emerald-800 dark:text-emerald-300 mt-0.5">
                      {summary.matchCount} <span className="text-xs font-normal text-emerald-600/70 dark:text-emerald-400/70">Siswa</span>
                    </div>
                  </div>
                  <div className="w-9 h-9 rounded-xl bg-emerald-100/70 dark:bg-emerald-900/50 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                </div>

                <div className="bg-amber-50/60 dark:bg-amber-950/20 p-3 rounded-xl border border-amber-200/70 dark:border-amber-800/40 shadow-xs flex items-center justify-between">
                  <div>
                    <div className="text-amber-800 dark:text-amber-300 text-xs font-semibold">Perlu Dicek (Selisih Data)</div>
                    <div className="text-xl font-black text-amber-900 dark:text-amber-200 mt-0.5">
                      {summary.mismatchCount} <span className="text-xs font-normal text-amber-600/70 dark:text-amber-400/70">Siswa</span>
                    </div>
                  </div>
                  <div className="w-9 h-9 rounded-xl bg-amber-100/70 dark:bg-amber-900/50 flex items-center justify-center text-amber-600 dark:text-amber-400">
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
                <div className="bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
                  <div className="flex items-center justify-between text-slate-500 text-[11px] font-medium">
                    <span>Total Dapodik</span>
                    <Users className="w-3.5 h-3.5 text-blue-500" />
                  </div>
                  <div className="text-lg font-black text-slate-900 dark:text-white mt-0.5">
                    {summary.totalDapodik.toLocaleString('id-ID')}
                  </div>
                </div>

                <div className="bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
                  <div className="flex items-center justify-between text-slate-500 text-[11px] font-medium">
                    <span>Total Absenta</span>
                    <School className="w-3.5 h-3.5 text-indigo-500" />
                  </div>
                  <div className="text-lg font-black text-slate-900 dark:text-white mt-0.5">
                    {summary.totalAbsenta.toLocaleString('id-ID')}
                  </div>
                </div>

                <div className="bg-emerald-50/50 dark:bg-emerald-950/20 p-2.5 rounded-xl border border-emerald-200/70 dark:border-emerald-800/40 shadow-xs">
                  <div className="flex items-center justify-between text-emerald-700 dark:text-emerald-400 text-[11px] font-semibold">
                    <span>Selaras (100%)</span>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  </div>
                  <div className="text-lg font-black text-emerald-800 dark:text-emerald-300 mt-0.5">
                    {summary.matchCount.toLocaleString('id-ID')}
                  </div>
                </div>

                <div className="bg-amber-50/50 dark:bg-amber-950/20 p-2.5 rounded-xl border border-amber-200/70 dark:border-amber-800/40 shadow-xs">
                  <div className="flex items-center justify-between text-amber-800 dark:text-amber-300 text-[11px] font-semibold">
                    <span>Selisih Data</span>
                    <AlertTriangle className="w-3.5 h-3.5" />
                  </div>
                  <div className="text-lg font-black text-amber-900 dark:text-amber-200 mt-0.5">
                    {summary.mismatchCount.toLocaleString('id-ID')}
                  </div>
                </div>

                <div className="bg-blue-50/50 dark:bg-blue-950/20 p-2.5 rounded-xl border border-blue-200/70 dark:border-blue-800/40 shadow-xs">
                  <div className="flex items-center justify-between text-blue-700 dark:text-blue-300 text-[11px] font-semibold">
                    <span>Dapodik Saja</span>
                    <Download className="w-3.5 h-3.5" />
                  </div>
                  <div className="text-lg font-black text-blue-800 dark:text-blue-200 mt-0.5">
                    {summary.dapodikOnlyCount.toLocaleString('id-ID')}
                  </div>
                </div>

                <div className="bg-rose-50/50 dark:bg-rose-950/20 p-2.5 rounded-xl border border-rose-200/70 dark:border-rose-800/40 shadow-xs">
                  <div className="flex items-center justify-between text-rose-700 dark:text-rose-300 text-[11px] font-semibold">
                    <span>Absenta Saja</span>
                    <HelpCircle className="w-3.5 h-3.5" />
                  </div>
                  <div className="text-lg font-black text-rose-800 dark:text-rose-200 mt-0.5">
                    {summary.absentaOnlyCount.toLocaleString('id-ID')}
                  </div>
                </div>
              </div>
            )
          )}

          {/* ═══════════════════════════════════════════════════════════════════
              3. TOOLBAR FILTER, PENCARIAN, & AKSI MASSAL
          ═══════════════════════════════════════════════════════════════════ */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl p-2.5 shadow-xs space-y-2.5">
            <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2 flex-1">
                {/* Search Bar */}
                <div className="min-w-[200px] flex-1 max-w-sm">
                  <DebouncedSearchInput
                    placeholder="Cari Nama, NISN, NIS, atau Rombel..."
                    aria-label="Cari Siswa Dapodik"
                    value={searchQuery}
                    onChange={setSearchQuery}
                    className="w-full"
                    inputClassName="h-7.5 text-xs rounded-lg"
                  />
                </div>

                {/* Status Filter Buttons */}
                <div className="flex items-center gap-1 overflow-x-auto pb-1 lg:pb-0">
                  <Button
                    size="sm"
                    variant={statusFilter === 'ALL' ? 'primary' : 'outline'}
                    onClick={() => setStatusFilter('ALL')}
                    className="h-7 text-xs font-medium px-2.5"
                  >
                    Semua ({students.length})
                  </Button>
                  <Button
                    size="sm"
                    variant={statusFilter === 'MISMATCH' ? 'primary' : 'outline'}
                    onClick={() => setStatusFilter('MISMATCH')}
                    className="h-7 text-xs font-medium px-2.5 text-amber-700 dark:text-amber-300"
                  >
                    {isWalasMode ? 'Perlu Dicek' : 'Selisih Data'} ({summary?.mismatchCount || 0})
                  </Button>
                  {!isWalasMode && (
                    <>
                      <Button
                        size="sm"
                        variant={statusFilter === 'DAPODIK_ONLY' ? 'primary' : 'outline'}
                        onClick={() => setStatusFilter('DAPODIK_ONLY')}
                        className="h-7 text-xs font-medium px-2.5 text-blue-700 dark:text-blue-300"
                      >
                        Hanya Dapodik ({summary?.dapodikOnlyCount || 0})
                      </Button>
                      <Button
                        size="sm"
                        variant={statusFilter === 'ABSENTA_ONLY' ? 'primary' : 'outline'}
                        onClick={() => setStatusFilter('ABSENTA_ONLY')}
                        className="h-7 text-xs font-medium px-2.5 text-rose-700 dark:text-rose-300"
                      >
                        Hanya Absenta ({summary?.absentaOnlyCount || 0})
                      </Button>
                    </>
                  )}
                  <Button
                    size="sm"
                    variant={statusFilter === 'MATCH' ? 'primary' : 'outline'}
                    onClick={() => setStatusFilter('MATCH')}
                    className="h-7 text-xs font-medium px-2.5 text-emerald-700 dark:text-emerald-300"
                  >
                    Selaras ({summary?.matchCount || 0})
                  </Button>
                </div>
              </div>

              {/* Rows Per Page */}
              <div className="flex items-center gap-1.5 text-xs shrink-0 self-end lg:self-auto">
                <span className="text-slate-500 text-[11px]">Baris:</span>
                <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg border border-slate-200/80 dark:border-slate-700">
                  {[25, 50, 100, 200].map((sizeOption) => (
                    <button
                      key={sizeOption}
                      type="button"
                      onClick={() => setPageSize(sizeOption)}
                      className={`px-2 py-0.5 rounded-md text-[11px] font-semibold transition-colors ${
                        pageSize === sizeOption
                          ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-xs'
                          : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                      }`}
                    >
                      {sizeOption}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Kontrol Filter Lanjutan: Rombel Dapodik, Tingkat & Gender */}
            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800/80 text-xs">
              <div className="flex items-center gap-1.5 text-slate-500 font-semibold text-[11px] shrink-0">
                <SlidersHorizontal className="w-3.5 h-3.5 text-indigo-500" />
                <span>Filter Siswa:</span>
              </div>

              {/* 1. Filter Rombel Dapodik (Locked badge saat mode kelas binaan Walas) */}
              {lockKelasScope && kelasNama ? (
                <div className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-50/90 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-700/80 rounded-lg text-xs font-bold text-amber-900 dark:text-amber-200 shrink-0 shadow-xs">
                  <ShieldCheck className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                  <span>Kelas Binaan: <strong className="text-amber-950 dark:text-amber-100">{kelasNama}</strong></span>
                  <span className="text-[10px] px-1.5 py-0.5 bg-amber-200/80 dark:bg-amber-900 text-amber-800 dark:text-amber-200 rounded font-semibold ml-0.5">Terkunci</span>
                </div>
              ) : (
                <div className="w-full sm:w-48">
                  <SearchableSelect
                    value={rombelFilter}
                    onValueChange={setRombelFilter}
                    options={[
                      { value: '', label: 'Semua Rombel' },
                      ...availableRombelList.map((r) => ({ value: r, label: r })),
                    ]}
                    placeholder="Semua Rombel"
                    searchPlaceholder="Cari rombel..."
                    triggerClassName="h-7 text-xs rounded-lg bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700"
                  />
                </div>
              )}

              {/* 2. Filter Tingkat (Admin Only) */}
              {!isWalasMode && (
                <div className="w-full sm:w-36">
                  <SearchableSelect
                    value={tingkatFilter}
                    onValueChange={setTingkatFilter}
                    options={[
                      { value: '', label: 'Semua Tingkat' },
                      { value: '10', label: 'Tingkat 10 (X)' },
                      { value: '11', label: 'Tingkat 11 (XI)' },
                      { value: '12', label: 'Tingkat 12 (XII)' },
                      { value: '13', label: 'Tingkat 13 (XIII)' },
                    ]}
                    placeholder="Semua Tingkat"
                    searchPlaceholder="Pilih tingkat..."
                    triggerClassName="h-7 text-xs rounded-lg bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700"
                  />
                </div>
              )}

              {/* 3. Filter Gender (Admin Only) */}
              {!isWalasMode && (
                <div className="w-full sm:w-32">
                  <SearchableSelect
                    value={genderFilter}
                    onValueChange={setGenderFilter}
                    options={[
                      { value: '', label: 'Semua Gender' },
                      { value: 'L', label: 'Laki-laki (L)' },
                      { value: 'P', label: 'Perempuan (P)' },
                    ]}
                    placeholder="Semua Gender"
                    triggerClassName="h-7 text-xs rounded-lg bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700"
                  />
                </div>
              )}

              {/* 4. Filter Perbedaan Atribut */}
              <div className="w-full sm:w-56">
                <SearchableSelect
                  value={diffAttributeFilter}
                  onValueChange={setDiffAttributeFilter}
                  options={diffAttributeOptions}
                  placeholder="Perbedaan Atribut"
                  searchPlaceholder="Cari perbedaan atribut..."
                  triggerClassName={cn(
                    "h-7 text-xs rounded-lg border",
                    diffAttributeFilter
                      ? "bg-amber-50/90 dark:bg-amber-950/60 border-amber-300 dark:border-amber-700 text-amber-900 dark:text-amber-200 font-bold"
                      : "bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700"
                  )}
                />
              </div>

              {/* Tombol Aksi Filter & Cetak */}
              <div className="flex items-center gap-2 ml-auto">
                {!isWalasMode && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setIsWaliKelasPrintOpen(true)}
                    disabled={filteredStudents.length === 0}
                    className="h-7 px-2.5 text-[11px] font-semibold gap-1.5 border-amber-300 dark:border-amber-700 bg-amber-50/70 hover:bg-amber-100 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200"
                    title="Cetak lembar verifikasi berkas dan selisih data untuk diserahkan ke Wali Kelas"
                  >
                    <Printer className="w-3.5 h-3.5 text-amber-600" />
                    <span>Cetak Lembar ({filteredStudents.length})</span>
                  </Button>
                )}

                {/* Reset Filter Button */}
                {hasActiveFilters && (
                  <button
                    type="button"
                    onClick={handleResetFilters}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-600 hover:text-rose-700 dark:text-rose-400 px-2 py-1 rounded-md hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                  >
                    <X className="w-3 h-3" />
                    Reset Filter
                  </button>
                )}
              </div>
            </div>

            {/* Quick Chips Bar: Filter Cepat Perbedaan Atribut */}
            {diffAttributeStats.totalStudentsWithDiffs > 0 && (
              <div className="flex items-center gap-1.5 flex-wrap pt-2 border-t border-slate-100 dark:border-slate-800/60 text-xs">
                <span className="text-[10.5px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1 shrink-0">
                  <GitCompare className="w-3.5 h-3.5 text-amber-500" /> Filter Perbedaan:
                </span>
                <button
                  type="button"
                  onClick={() => setDiffAttributeFilter(diffAttributeFilter === 'ANY_DIFF' ? '' : 'ANY_DIFF')}
                  className={cn(
                    "px-2 py-0.5 rounded-md text-[11px] font-semibold transition-all border inline-flex items-center gap-1 cursor-pointer",
                    diffAttributeFilter === 'ANY_DIFF'
                      ? "bg-amber-600 text-white border-amber-600 shadow-xs"
                      : "bg-amber-50/80 text-amber-800 border-amber-200 hover:bg-amber-100 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/60"
                  )}
                  title="Tampilkan seluruh siswa yang memiliki selisih atribut data"
                >
                  <AlertTriangle className="w-3 h-3" />
                  Semua Selisih ({diffAttributeStats.totalStudentsWithDiffs})
                </button>
                {Object.entries(diffAttributeStats.counts)
                  .filter(([_, item]) => item.count > 0)
                  .sort((a, b) => b[1].count - a[1].count)
                  .map(([field, item]) => {
                    const isSelected = diffAttributeFilter === field;
                    return (
                      <button
                        key={field}
                        type="button"
                        onClick={() => setDiffAttributeFilter(isSelected ? '' : field)}
                        className={cn(
                          "px-2 py-0.5 rounded-md text-[11px] font-medium transition-all border inline-flex items-center gap-1.5 cursor-pointer",
                          isSelected
                            ? "bg-indigo-600 text-white border-indigo-600 shadow-xs font-bold"
                            : "bg-white text-slate-700 border-slate-200 hover:border-indigo-300 hover:text-indigo-600 dark:bg-slate-800/80 dark:text-slate-300 dark:border-slate-700"
                        )}
                        title={`Filter hanya siswa dengan perbedaan ${item.label}`}
                      >
                        <span>{item.label}</span>
                        <span className={cn(
                          "px-1 py-0.2 rounded text-[10px] font-bold",
                          isSelected ? "bg-white/25 text-white" : "bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300"
                        )}>
                          {item.count}
                        </span>
                      </button>
                    );
                  })}

                {/* Quick Print Button from Chips (Admin Only) */}
                {!isWalasMode && (
                  <button
                    type="button"
                    onClick={() => setIsWaliKelasPrintOpen(true)}
                    disabled={filteredStudents.length === 0}
                    className="ml-auto px-2.5 py-1 rounded-md text-[11px] font-semibold bg-amber-600 hover:bg-amber-700 text-white transition-all shadow-xs inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                    title="Cetak lembar verifikasi berkas untuk diserahkan ke Wali Kelas berdasarkan data terfilter saat ini"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Cetak Lembar Wali Kelas ({filteredStudents.length})</span>
                  </button>
                )}
              </div>
            )}

            {/* Bulk Selection Bar */}
            {selectedStudentIds.size > 0 && (
              <div className="p-2 bg-indigo-50 dark:bg-indigo-950/40 rounded-xl border border-indigo-200/80 dark:border-indigo-800/60 flex items-center justify-between flex-wrap gap-2 text-xs animate-in fade-in duration-100">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-indigo-900 dark:text-indigo-200">
                    {selectedStudentIds.size} siswa terpilih
                  </span>
                  {selectedStudentIds.size < filteredStudents.length && (
                    <button
                      type="button"
                      onClick={handleSelectAllFiltered}
                      className="text-[11px] text-indigo-700 dark:text-indigo-400 underline font-semibold hover:text-indigo-900"
                    >
                      Pilih seluruh {filteredStudents.length} siswa hasil filter
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleClearSelection}
                    className="text-[11px] text-slate-500 hover:text-slate-700 underline"
                  >
                    Batal Pilih
                  </button>
                </div>

                <div className="flex items-center gap-1.5 flex-wrap">
                  {isWalasMode ? (
                    <Button
                      size="sm"
                      variant="primary"
                      onClick={() => setIsWaliKelasPrintOpen(true)}
                      className="h-7 text-xs font-semibold gap-1.5 bg-amber-600 hover:bg-amber-700 text-white shadow-xs"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      Cetak Lembar Verifikasi Terpilih ({selectedStudentIds.size})
                    </Button>
                  ) : (
                    <>
                      {selectedStudents.some((s) => Boolean(s.absentaRaw)) && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={handleOpenBulkMutasi}
                          disabled={syncMutation.isPending || isSubmittingMutasi}
                          className="h-7 text-xs font-semibold gap-1.5 border-rose-300 bg-rose-50/50 text-rose-700 hover:bg-rose-100 dark:bg-rose-950/30 dark:border-rose-800 dark:text-rose-300"
                        >
                          <LogOut className="w-3.5 h-3.5" />
                          Mutasi / Keluarkan Terpilih ({selectedStudents.filter((s) => Boolean(s.absentaRaw)).length})
                        </Button>
                      )}

                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleBulkUpdate}
                        disabled={syncMutation.isPending}
                        className="h-7 text-xs font-semibold gap-1.5 border-indigo-300 bg-indigo-50/50 text-indigo-800 hover:bg-indigo-100 dark:bg-indigo-950/30 dark:border-indigo-800 dark:text-indigo-300"
                        title="Pilih kolom data (misal hanya tempat & tgl lahir) dan perbarui ke Absenta"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        Perbarui Biodata Terpilih ({selectedStudents.filter((s) => Boolean(s.absentaRaw && s.dapodikRaw)).length})
                      </Button>

                      <Button
                        size="sm"
                        variant="primary"
                        onClick={handleBulkImport}
                        disabled={syncMutation.isPending}
                        className="h-7 text-xs font-semibold gap-1.5"
                      >
                        <Download className="w-3.5 h-3.5" />
                        Import Siswa Terpilih
                      </Button>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* ═══════════════════════════════════════════════════════════════════
              4. TABEL AUDIT & KOMPARASI DATA SISWA (HIGH DENSITY TABLE)
          ═══════════════════════════════════════════════════════════════════ */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl overflow-hidden shadow-xs">
            {isLoadingComparison ? (
              <div className="p-12 text-center space-y-2">
                <Loader className="w-6 h-6 animate-spin mx-auto text-indigo-600" />
                <p className="text-xs text-slate-500">Mengkonsolidasi data Dapodik &amp; Absenta...</p>
              </div>
            ) : comparisonError ? (
              <div className="p-8 text-center space-y-3">
                <AlertTriangle className="w-8 h-8 text-rose-500 mx-auto" />
                <h4 className="font-bold text-sm text-slate-900 dark:text-white">Gagal Memuat Komparasi Data</h4>
                <p className="text-xs text-slate-500 max-w-lg mx-auto">
                  {(comparisonError as any)?.response?.data?.message || (comparisonError as any)?.message || 'Terjadi kesalahan sistem.'}
                </p>
                <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                  {!isWalasMode && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setIsConnectionModalOpen(true)}
                      className="h-7 text-xs gap-1.5 border-indigo-200 text-indigo-700 hover:bg-indigo-50 dark:border-indigo-800 dark:text-indigo-300"
                    >
                      <Key className="w-3.5 h-3.5" /> Atur Koneksi &amp; Whitelist IP
                    </Button>
                  )}
                  {sourceMode === 'LIVE' && (
                    <Button
                      size="sm"
                      variant="primary"
                      onClick={() => {
                        setSourceMode('STAGING');
                        toast.info('Beralih ke Mode Staging Platform (Snapshot Lokal).');
                      }}
                      className="h-7 text-xs gap-1.5 bg-amber-600 hover:bg-amber-700 text-white"
                    >
                      <HardDrive className="w-3.5 h-3.5" /> Beralih ke Dapodik Lokal (Staging)
                    </Button>
                  )}
                  <Button size="sm" variant="outline" onClick={() => refetchComparison()} className="h-7 text-xs gap-1">
                    <RefreshCw className="w-3.5 h-3.5" /> Coba Lagi
                  </Button>
                </div>
              </div>
            ) : filteredStudents.length === 0 ? (
              <div className="p-10 text-center space-y-1">
                <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                  Tidak ada data siswa yang cocok dengan kriteria pencarian/filter.
                </p>
                <p className="text-[11px] text-slate-400">
                  Coba ubah kata kunci atau pilih status filter lain di atas.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50/80 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-semibold text-[11px]">
                      <th className="p-2.5 w-8 text-center">
                        <input
                          type="checkbox"
                          checked={isAllPageSelected}
                          onChange={handleToggleSelectPage}
                          className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                        />
                      </th>
                      {isWalasMode ? (
                        <>
                          <th className="p-2.5 w-28">Status</th>
                          <th className="p-2.5 w-36">NISN &amp; NIK</th>
                          <th className="p-2.5 min-w-[200px]">Nama Siswa</th>
                          <th className="p-2.5 min-w-[340px]">Keterangan Selisih Data (Dapodik vs Absenta)</th>
                          <th className="p-2.5 w-32 text-center">Aksi</th>
                        </>
                      ) : (
                        <>
                          <th className="p-2.5">Status</th>
                          <th className="p-2.5">NISN &amp; NIK</th>
                          <th className="p-2.5">Nama di Dapodik</th>
                          <th className="p-2.5">Nama di Absenta</th>
                          <th className="p-2.5">Rombel Dapodik</th>
                          <th className="p-2.5">Rombel Absenta</th>
                          <th className="p-2.5 text-right">Aksi</th>
                        </>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {paginatedStudents.map((s) => {
                      const isSelected = selectedStudentIds.has(s.id);
                      return (
                        <tr
                          key={s.id}
                          className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors ${
                            isSelected ? 'bg-indigo-50/40 dark:bg-indigo-950/20' : ''
                          }`}
                        >
                          <td className="p-2.5 text-center">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleToggleSelect(s.id)}
                              className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                            />
                          </td>
                          {isWalasMode ? (
                            <>
                              {/* 1. Status */}
                              <td className="p-2.5 whitespace-nowrap">
                                {s.status === 'MATCH' ? (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10.5px] font-bold bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60 shadow-xs">
                                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                                    Selaras
                                  </span>
                                ) : s.status === 'MISMATCH' ? (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10.5px] font-bold bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60 shadow-xs">
                                    <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                                    Beda Data ({s.diffs?.length || 0})
                                  </span>
                                ) : (
                                  renderStatusBadge(s.status)
                                )}
                              </td>

                              {/* 2. NISN & NIK */}
                              <td className="p-2.5">
                                <div className="font-mono font-bold text-slate-900 dark:text-slate-100 text-xs">
                                  {s.nisn || '-'}
                                </div>
                                <div className="font-mono text-[10.5px] text-slate-400 mt-0.5">
                                  NIK: {s.nik || '-'}
                                </div>
                              </td>

                              {/* 3. Nama Siswa */}
                              <td className="p-2.5">
                                {s.diffs?.some((d) => d.field === 'nama_siswa') ? (
                                  <div className="space-y-1">
                                    <div className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5 flex-wrap">
                                      <span>{s.dapodikRaw?.nama || s.dapodikRaw?.nama_siswa || s.nama}</span>
                                      <span className="text-[9.5px] font-bold px-1.5 py-0.2 rounded bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300">Dapodik</span>
                                    </div>
                                    <div className="text-xs font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5 flex-wrap">
                                      <span>{s.absentaRaw?.nama_siswa || s.absentaRaw?.nama || s.nama}</span>
                                      <span className="text-[9.5px] font-bold px-1.5 py-0.2 rounded bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300">Absenta</span>
                                    </div>
                                  </div>
                                ) : (
                                  <div>
                                    <span className="font-bold text-slate-800 dark:text-slate-200 text-xs">
                                      {s.absentaRaw?.nama_siswa || s.absentaRaw?.nama || s.dapodikRaw?.nama || s.nama}
                                    </span>
                                  </div>
                                )}
                              </td>

                              {/* 4. Keterangan Selisih Data */}
                              <td className="p-2.5">
                                {s.status === 'MATCH' ? (
                                  <div className="flex items-center gap-1.5 text-[11px] text-emerald-700 dark:text-emerald-400 font-medium">
                                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                                    <span>Seluruh data identik selaras (100%)</span>
                                  </div>
                                ) : s.diffs && s.diffs.length > 0 ? (
                                  <div className="space-y-1.5 max-w-lg">
                                    {s.diffs.map((d) => (
                                      <div
                                        key={d.field}
                                        className="p-1.5 rounded-lg bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-800/60 text-[11px]"
                                      >
                                        <div className="font-bold text-amber-900 dark:text-amber-200 mb-1 flex items-center gap-1">
                                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                                          <span>{d.label}</span>
                                        </div>
                                        <div className="grid grid-cols-2 gap-1.5 text-[10.5px]">
                                          <div className="bg-white/95 dark:bg-slate-800/95 px-2 py-0.5 rounded border border-blue-200 dark:border-blue-900/50">
                                            <span className="text-[9.5px] text-blue-600 dark:text-blue-400 font-bold block">Dapodik:</span>
                                            <span className="font-semibold text-slate-800 dark:text-slate-100">
                                              {formatDiffValue(d.field, d.dapodikValue)}
                                            </span>
                                          </div>
                                          <div className="bg-white/95 dark:bg-slate-800/95 px-2 py-0.5 rounded border border-rose-200 dark:border-rose-900/50">
                                            <span className="text-[9.5px] text-rose-600 dark:text-rose-400 font-bold block">Absenta:</span>
                                            <span className="font-semibold text-rose-700 dark:text-rose-300">
                                              {formatDiffValue(d.field, d.absentaValue)}
                                            </span>
                                          </div>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                ) : s.status === 'DAPODIK_ONLY' ? (
                                  <span className="text-blue-600 dark:text-blue-400 text-xs italic">Siswa terdaftar di Dapodik, belum ada di Absenta</span>
                                ) : s.status === 'ABSENTA_ONLY' ? (
                                  <span className="text-rose-600 dark:text-rose-400 text-xs italic">Siswa terdaftar di Absenta, belum ada di Dapodik</span>
                                ) : (
                                  <span className="text-slate-400 text-xs italic">-</span>
                                )}
                              </td>

                              {/* 5. Aksi */}
                              <td className="p-2.5 text-center whitespace-nowrap">
                                <div className="flex items-center justify-center gap-1.5">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => setSelectedSiswaDetailId(s.absentaRaw?.id || s.id)}
                                    className="h-7 px-2.5 text-[11px] font-bold gap-1 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 rounded-lg shadow-xs cursor-pointer"
                                    title="Buka profil lengkap siswa untuk verifikasi berkas (Ijazah, KK, Akta) dan koreksi data"
                                  >
                                    <Edit3 className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />
                                    <span>Koreksi Siswa</span>
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => setInspectedStudent(s)}
                                    className="h-7 w-7 p-0 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                                    title="Intip Perbandingan Mentah Dapodik vs Absenta"
                                  >
                                    <Eye className="w-3.5 h-3.5" />
                                  </Button>
                                </div>
                              </td>
                            </>
                          ) : (
                            <>
                              <td className="p-2.5 whitespace-nowrap">
                                {renderStatusBadge(s.status)}
                                {s.status === 'MISMATCH' && s.diffs && s.diffs.length > 0 && (
                                  <div className="mt-1 flex flex-wrap gap-1 max-w-[150px]">
                                    {s.diffs.map((d) => {
                                      const isCurrentFilter = diffAttributeFilter === d.field;
                                      const shortLabel =
                                        d.field === 'nama_siswa' ? 'Nama' :
                                        d.field === 'kelas' ? 'Rombel' :
                                        d.field === 'tanggal_lahir' ? 'Tgl Lahir' :
                                        d.field === 'tempat_lahir' ? 'Tmp Lahir' :
                                        d.field === 'jenis_kelamin' ? 'Gender' :
                                        d.field.toUpperCase();
                                      return (
                                        <button
                                          key={d.field}
                                          type="button"
                                          onClick={() => setDiffAttributeFilter(isCurrentFilter ? '' : d.field)}
                                          className={cn(
                                            "inline-flex items-center text-[9.5px] px-1.5 py-0.2 rounded border transition-colors cursor-pointer",
                                            isCurrentFilter
                                              ? "bg-indigo-600 text-white border-indigo-700 font-bold"
                                              : "bg-amber-50 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200 dark:border-amber-800 hover:border-amber-400 hover:bg-amber-100"
                                          )}
                                          title={`Filter hanya siswa dengan perbedaan ${d.label} (Klik untuk filter)`}
                                        >
                                          {shortLabel}
                                        </button>
                                      );
                                    })}
                                  </div>
                                )}
                              </td>
                              <td className="p-2.5">
                                <div className="font-mono font-bold text-slate-900 dark:text-slate-100">
                                  {s.nisn || '-'}
                                </div>
                                <div className="font-mono text-[10px] text-slate-400">
                                  NIK: {s.nik || '-'}
                                </div>
                              </td>
                              <td className="p-2.5 font-medium text-slate-800 dark:text-slate-200">
                                {s.dapodikRaw ? (
                                  s.dapodikRaw.nama || s.dapodikRaw.nama_siswa || s.nama
                                ) : (
                                  <span className="text-slate-400 italic">Belum Ada di Dapodik</span>
                                )}
                              </td>
                              <td className="p-2.5 font-medium text-slate-800 dark:text-slate-200">
                                {s.absentaRaw ? (
                                  <button
                                    type="button"
                                    onClick={() => setSelectedSiswaDetailId(s.absentaRaw.id || s.id)}
                                    className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 font-bold inline-flex items-center gap-1.5 cursor-pointer text-left group transition-colors"
                                    title="Buka Profil Lengkap & Rekam Jejak Siswa (Mutasi, Berkas, Biodata)"
                                  >
                                    <span className="group-hover:underline">
                                      {s.absentaRaw.nama_siswa || s.absentaRaw.nama || s.nama}
                                    </span>
                                    <ExternalLink size={12} className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0 text-indigo-500" />
                                  </button>
                                ) : (
                                  <span className="text-slate-400 italic">Belum Ada di Absenta</span>
                                )}
                              </td>
                              <td className="p-2.5 text-slate-600 dark:text-slate-400">
                                {s.dapodikRaw?.nama_rombel || '-'}
                              </td>
                              <td className="p-2.5 text-slate-600 dark:text-slate-400">
                                {s.absentaRaw?.SiswaAkademik?.[0]?.kelas?.nama_kelas || (s.absentaRaw as any)?.Kelas?.nama_kelas || s.rombel || '-'}
                              </td>
                              <td className="p-2.5 text-right whitespace-nowrap">
                                <div className="flex items-center justify-end gap-1.5">
                                  {s.status === 'DAPODIK_ONLY' ? (
                                    <Button
                                      size="sm"
                                      variant="primary"
                                      onClick={() => handleSingleImport(s)}
                                      className="h-6.5 px-2.5 text-[11px] font-bold gap-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg shadow-xs"
                                      title="Tarik & Daftarkan Siswa Dapodik ini ke Absenta"
                                    >
                                      <UserPlus className="w-3 h-3" /> Tarik ke Absenta
                                    </Button>
                                  ) : (
                                    <>
                                      {Boolean(s.absentaRaw && s.dapodikRaw) && (
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          onClick={() => handleSingleUpdate(s)}
                                          className="h-6.5 px-2 text-[11px] font-semibold gap-1 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 rounded-lg"
                                          title="Tarik & Perbarui Kolom Tertentu dari Dapodik"
                                        >
                                          <RefreshCw className="w-3 h-3 text-indigo-600" /> Perbarui
                                        </Button>
                                      )}
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => setSelectedSiswaDetailId(s.absentaRaw?.id || s.id)}
                                        className="h-6.5 px-2 text-[11px] font-semibold gap-1 text-slate-700 dark:text-slate-300 hover:text-indigo-600 hover:border-indigo-300 rounded-lg"
                                        title="Buka & Edit Data Siswa (NIS, NISN, NIK, Biodata)"
                                      >
                                        <Edit3 className="w-3 h-3 text-indigo-500" /> Detail / Edit
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => handleOpenSingleMutasi(s)}
                                        className="h-6.5 px-2 text-[11px] font-semibold gap-1 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-900/50 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg"
                                        title="Mutasikan atau Keluarkan Siswa dari Absenta"
                                      >
                                        <LogOut className="w-3 h-3" /> Mutasi
                                      </Button>
                                    </>
                                  )}

                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => setInspectedStudent(s)}
                                    className="h-6.5 px-1.5 text-[11px] text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                                    title="Intip Perbandingan Detail Dapodik vs Absenta"
                                  >
                                    <Eye className="w-3.5 h-3.5" />
                                  </Button>
                                </div>
                              </td>
                            </>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Paginasi Footer */}
            {filteredStudents.length > 0 && (
              <div className="p-2.5 bg-slate-50/60 dark:bg-slate-800/40 border-t border-slate-200/80 dark:border-slate-800 flex items-center justify-between flex-wrap gap-2 text-xs">
                <div className="text-slate-500 text-[11px]">
                  Menampilkan <strong>{startIndex + 1}</strong> - <strong>{endIndex}</strong> dari <strong>{filteredStudents.length}</strong> siswa
                </div>

                <div className="flex items-center gap-1">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setCurrentPage(1)}
                    disabled={currentPage === 1}
                    className="h-6.5 w-6.5 p-0"
                    title="Halaman Pertama"
                  >
                    <ChevronsLeft className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="h-6.5 w-6.5 p-0"
                    title="Halaman Sebelumnya"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </Button>

                  <span className="px-2 text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                    Hal {currentPage} / {totalPages}
                  </span>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="h-6.5 w-6.5 p-0"
                    title="Halaman Selanjutnya"
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setCurrentPage(totalPages)}
                    disabled={currentPage === totalPages}
                    className="h-6.5 w-6.5 p-0"
                    title="Halaman Terakhir"
                  >
                    <ChevronsRight className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* ─── MODAL 1: PENGATURAN KONEKSI & TOKEN (CLEAN & DIKEMAS DALAM MODAL) ─── */}
      <DapodikConnectionModal
        isOpen={isConnectionModalOpen}
        onClose={() => setIsConnectionModalOpen(false)}
        configForm={configForm}
        setConfigForm={setConfigForm}
        primaryServerIp={primaryServerIp}
        onSave={() => saveMutation.mutate(configForm)}
        isSaving={saveMutation.isPending}
        testResult={testResult}
        isTesting={isTesting}
        onTestConnection={handleTestConnection}
      />

      {/* ─── MODAL 2: KRITERIA PENCOCOKAN & TEMPLATE AUDIT ─── */}
      <DapodikCriteriaModal
        isOpen={isCriteriaModalOpen}
        onClose={() => setIsCriteriaModalOpen(false)}
        activeTemplateId={activeTemplateId}
        onApplyTemplate={handleApplyTemplate}
        compareOptions={compareOptions}
        setCompareOptions={setCompareOptions}
      />

      {/* ─── MODAL 3: CETAK BERITA ACARA RESMI (PDF / WYSIWYG + UNIVERSAL SIGNATURE) ─── */}
      <DapodikBeritaAcaraPrintModal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        summary={summary}
        students={students}
        templateName={activeTemplate?.name || 'Audit Kustom'}
        initialTemplate={printModalTemplate}
        initialReferenceDate={lppdCutoffDate}
        dapodikHost={configForm.dapodik_host}
        npsn={configForm.npsn}
        lastCheckAt={comparisonData?.data?.lastCheckAt}
        sourceMode={cacheInfo?.sourceMode || sourceMode}
      />

      {/* ─── MODAL 3B: CETAK LEMBAR VERIFIKASI WALI KELAS & CEKLIS BERKAS (PDF / A4 LANDSCAPE) ─── */}
      <DapodikWaliKelasChecklistPrintModal
        isOpen={isWaliKelasPrintOpen}
        onClose={() => setIsWaliKelasPrintOpen(false)}
        students={filteredStudents}
        activeFilterLabel={currentDiffFilterLabel}
        activeRombel={rombelFilter || undefined}
        activeTingkat={tingkatFilter || undefined}
        activeDiffAttribute={diffAttributeFilter || undefined}
        dapodikHost={configForm.dapodik_host}
        npsn={configForm.npsn}
        sourceMode={cacheInfo?.sourceMode || sourceMode}
      />

      {/* ─── MODAL 4: DETAIL INTIP RAW COMPARISON ─── */}
      {inspectedStudent && (
        <Modal
          isOpen={Boolean(inspectedStudent)}
          onClose={() => setInspectedStudent(null)}
          size="2xl"
          title={`Detail Data Siswa: ${inspectedStudent.nama}`}
        >
          <div className="space-y-4 text-xs">
            <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-xl">
              <div>
                <div className="font-bold text-sm text-slate-900 dark:text-white">{inspectedStudent.nama}</div>
                <div className="text-slate-500 font-mono text-[11px]">NISN: {inspectedStudent.nisn || '-'} | NIK: {inspectedStudent.nik || '-'}</div>
              </div>
              <div>{renderStatusBadge(inspectedStudent.status)}</div>
            </div>

            {inspectedStudent.diffs.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-bold text-slate-800 dark:text-slate-200">Perbedaan Atribut Terdeteksi:</h4>
                <div className="divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
                  {inspectedStudent.diffs.map((diff) => (
                    <div key={diff.field} className="p-2.5 flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-600 dark:text-slate-400">{diff.label}</span>
                      <div className="flex items-center gap-3">
                        <span className="px-2 py-0.5 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 rounded font-medium">
                          Dapodik: {String(diff.dapodikValue || '-')}
                        </span>
                        <span className="text-slate-400">vs</span>
                        <span className="px-2 py-0.5 bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 rounded font-medium">
                          Absenta: {String(diff.absentaValue || '-')}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3 pt-2">
              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl space-y-1">
                <span className="font-bold text-[11px] text-blue-600 uppercase">Data Dapodik</span>
                <div className="space-y-1 text-slate-600 dark:text-slate-300">
                  <div>Nama: {inspectedStudent.dapodikRaw?.nama || inspectedStudent.dapodikRaw?.nama_siswa || '-'}</div>
                  <div>NIS: {inspectedStudent.dapodikRaw?.registrasi_peserta_didik?.nipd || inspectedStudent.nis || '-'}</div>
                  <div>Tempat Lahir: {inspectedStudent.dapodikRaw?.tempat_lahir || '-'}</div>
                  <div>Tgl Lahir: {inspectedStudent.dapodikRaw?.tanggal_lahir || '-'}</div>
                  <div>Rombel: {inspectedStudent.dapodikRaw?.nama_rombel || '-'}</div>
                </div>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl space-y-1">
                <span className="font-bold text-[11px] text-indigo-600 uppercase">Data Absenta</span>
                <div className="space-y-1 text-slate-600 dark:text-slate-300">
                  <div>Nama: {inspectedStudent.absentaRaw?.nama_siswa || inspectedStudent.absentaRaw?.nama || inspectedStudent.nama || '-'}</div>
                  <div>NIS: {inspectedStudent.absentaRaw?.nis || '-'}</div>
                  <div>Tempat Lahir: {inspectedStudent.absentaRaw?.tempat_lahir || '-'}</div>
                  <div>Tgl Lahir: {inspectedStudent.absentaRaw?.tanggal_lahir ? new Date(inspectedStudent.absentaRaw.tanggal_lahir).toLocaleDateString('id-ID') : '-'}</div>
                  <div>Kelas: {inspectedStudent.absentaRaw?.SiswaAkademik?.[0]?.kelas?.nama_kelas || '-'}</div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
              {inspectedStudent.absentaRaw ? (
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const targetId = inspectedStudent.absentaRaw?.id || inspectedStudent.id;
                      setSelectedSiswaDetailId(targetId);
                    }}
                    className="gap-1.5 text-xs font-bold text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 cursor-pointer"
                  >
                    <User className="w-3.5 h-3.5" />
                    <span>Buka Profil Siswa</span>
                  </Button>
                  <FieldDocumentTrigger
                    entityType="SISWA"
                    entityId={inspectedStudent.absentaRaw.id || inspectedStudent.id}
                    entityName={inspectedStudent.nama}
                    kategori="KK"
                    label="KK"
                  />
                  <FieldDocumentTrigger
                    entityType="SISWA"
                    entityId={inspectedStudent.absentaRaw.id || inspectedStudent.id}
                    entityName={inspectedStudent.nama}
                    kategori="AKTA"
                    label="Akta"
                  />
                </div>
              ) : (
                <div />
              )}
              <Button variant="outline" onClick={() => setInspectedStudent(null)}>
                Tutup
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* ─── MODAL 5: KONFIRMASI AKSI MASSAL ─── */}
      {confirmDialog && (
        <Modal
          isOpen={confirmDialog.isOpen}
          onClose={() => setConfirmDialog(null)}
          title={confirmDialog.title}
        >
          <div className="space-y-4 text-xs">
            <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
              {confirmDialog.message}
            </p>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setConfirmDialog(null)}
                disabled={syncMutation.isPending}
              >
                Batal
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={confirmDialog.onConfirm}
                disabled={syncMutation.isPending}
                className="gap-1.5"
              >
                {syncMutation.isPending && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                {confirmDialog.confirmText || 'Konfirmasi'}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* ─── MODAL 6: PROFIL SISWA LENGKAP & TINDAKAN MUTASI ─── */}
      <SiswaDetailModal
        isOpen={Boolean(selectedSiswaDetailId)}
        onClose={() => {
          setSelectedSiswaDetailId(null);
          queryClient.invalidateQueries({ queryKey: ['dapodik-student-comparison'] });
        }}
        siswaId={selectedSiswaDetailId}
        canEdit={true}
      />

      {/* ─── MODAL 7: PEMETAAN ROMBEL DAPODIK KE KELAS PLATFORM ─── */}
      <DapodikRombelMappingModal
        isOpen={isRombelMappingModalOpen}
        onClose={() => {
          setIsRombelMappingModalOpen(false);
          setImportTargetStudents(null);
        }}
        students={
          importTargetStudents && importTargetStudents.length > 0
            ? importTargetStudents
            : selectedStudents.filter((s) => s.status === 'DAPODIK_ONLY')
        }
        onConfirmImport={(studentsWithKelas, academicContext) => {
          syncMutation.mutate(
            {
              action: 'IMPORT_SELECTED',
              students: studentsWithKelas,
              tahun_pelajaran_id: academicContext.tahun_pelajaran_id,
              semester_id: academicContext.semester_id,
            },
            {
              onSuccess: () => {
                setIsRombelMappingModalOpen(false);
                setImportTargetStudents(null);
                queryClient.invalidateQueries({ queryKey: ['dapodik-student-comparison'] });
                queryClient.invalidateQueries({ queryKey: ['siswa'] });
                refetchComparison();
              },
            }
          );
        }}
        isSubmitting={syncMutation.isPending}
      />
      {/* ─── MODAL 8: PUSAT TOOLS & UTILITAS DAPODIK ─── */}
      <DapodikToolsModal
        isOpen={isToolsModalOpen}
        onClose={() => setIsToolsModalOpen(false)}
        totalDapodikStudents={totalDapodikSourceCount}
        hasComparisonData={Boolean(summary)}
        onSelectTool={(toolKey: DapodikToolKey) => {
          if (toolKey === 'lppdUsia') {
            setIsLppdUsiaModalOpen(true);
          } else if (toolKey === 'beritaAcaraRekon') {
            setPrintModalTemplate('rekon_absenta');
            setIsPrintModalOpen(true);
          }
        }}
      />

      {/* ─── MODAL 9: REKAP DATA SISWA MENURUT USIA (VERVAL LPPD • DAPODIK) ─── */}
      <DapodikLppdUsiaModal
        isOpen={isLppdUsiaModalOpen}
        onClose={() => setIsLppdUsiaModalOpen(false)}
        students={students}
        referenceDate={lppdCutoffDate}
        onChangeReferenceDate={setLppdCutoffDate}
        sourceMode={cacheInfo?.sourceMode || sourceMode}
        onOpenPrintModal={() => {
          setPrintModalTemplate('lppd_usia');
          setIsPrintModalOpen(true);
        }}
      />

      {/* ─── MODAL 10: MUTASI & STATUS KELUAR SISWA DARI DAPODIK VIEW ─── */}
      <Modal
        isOpen={isMutasiModalOpen}
        onClose={() => !isSubmittingMutasi && setIsMutasiModalOpen(false)}
        title={
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-rose-50 dark:bg-rose-950/50 rounded-xl text-rose-600 dark:text-rose-400">
              <LogOut size={20} />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                Proses Mutasi &amp; Status Keluar Siswa
              </h3>
              <p className="text-[11px] text-slate-400 font-medium">
                Pembaruan status kesiswaan terintegrasi langsung ke sistem Absenta
              </p>
            </div>
          </div>
        }
        size="md"
      >
        <div className="p-5 space-y-4">
          {/* Ringkasan Target Siswa */}
          <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/80 dark:border-slate-700 flex items-center justify-between text-xs">
            <div>
              <p className="text-[10px] uppercase font-bold text-slate-400">Target Siswa</p>
              <p className="font-extrabold text-slate-800 dark:text-slate-200 mt-0.5">
                {mutasiTargetStudents.length === 1
                  ? mutasiTargetStudents[0].absentaRaw?.nama_siswa ||
                    mutasiTargetStudents[0].nama ||
                    '1 Siswa'
                  : `${mutasiTargetStudents.length} Siswa Terpilih`}
              </p>
              {mutasiTargetStudents.length === 1 && (
                <p className="text-[10px] text-slate-500 font-mono">
                  NISN: {mutasiTargetStudents[0].nisn || '-'} • Rombel: {mutasiTargetStudents[0].absentaRaw?.SiswaAkademik?.[0]?.kelas?.nama_kelas || '-'}
                </p>
              )}
            </div>
            <Badge variant="outline" className="border-rose-200 text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/40 font-bold">
              {mutasiTargetStudents.length} Siswa
            </Badge>
          </div>

          {/* Form Options */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="space-y-1">
              <Label htmlFor="dapodikMutasiStatus" className="text-[11px] font-bold text-slate-600 dark:text-slate-300">
                Jenis Status Keluar
              </Label>
              <SearchableSelect
                id="dapodikMutasiStatus"
                value={mutasiStatus}
                onValueChange={setMutasiStatus}
                options={[
                  { value: 'PINDAH', label: 'Pindah Sekolah (Mutasi Keluar)' },
                  { value: 'KELUAR', label: 'Keluar / Mengundurkan Diri' },
                  { value: 'DO', label: 'Dikeluarkan / Drop Out' },
                  { value: 'MENINGGAL', label: 'Meninggal Dunia' },
                ]}
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="dapodikMutasiDate" className="text-[11px] font-bold text-slate-600 dark:text-slate-300">
                Tanggal Efektif
              </Label>
              <Input
                id="dapodikMutasiDate"
                type="date"
                value={mutasiDate}
                onChange={(e) => setMutasiDate(e.target.value)}
                className="h-9 text-xs"
                required
              />
            </div>
          </div>

          <div className="space-y-1 text-xs">
            <Label htmlFor="dapodikMutasiReason" className="text-[11px] font-bold text-slate-600 dark:text-slate-300">
              Alasan / Keterangan Mutasi <span className="text-rose-500">*</span>
            </Label>
            <Textarea
              id="dapodikMutasiReason"
              value={mutasiReason}
              onChange={(e) => setMutasiReason(e.target.value)}
              placeholder="Contoh: Pindah ke sekolah lain / Data tidak tercatat pada Dapodik..."
              rows={3}
              className="text-xs"
              required
            />
          </div>

          <ModalFooter className="pt-3 border-t border-slate-100 dark:border-slate-800">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsMutasiModalOpen(false)}
              disabled={isSubmittingMutasi}
            >
              Batal
            </Button>
            <Button
              type="button"
              variant="danger"
              size="sm"
              onClick={handleConfirmMutasi}
              disabled={isSubmittingMutasi || !mutasiReason.trim()}
              className="gap-1.5"
            >
              {isSubmittingMutasi ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <LogOut className="w-3.5 h-3.5" />
              )}
              <span>{isSubmittingMutasi ? 'Memproses...' : 'Konfirmasi Mutasi'}</span>
            </Button>
          </ModalFooter>
        </div>
      </Modal>

      {/* Modal Granular Kolom Dapodik Sync */}
      <DapodikFieldSyncModal
        isOpen={isFieldSyncModalOpen}
        onClose={() => setIsFieldSyncModalOpen(false)}
        targetStudents={fieldSyncTargetStudents}
        onConfirm={handleExecuteFieldSync}
        isLoading={syncMutation.isPending}
      />
    </div>
  );
};

export default DapodikIntegrationView;
