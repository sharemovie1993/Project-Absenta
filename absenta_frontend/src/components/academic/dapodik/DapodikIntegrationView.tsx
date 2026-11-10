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
  Printer, Bookmark, User, ExternalLink, X, ShieldCheck
} from 'lucide-react';
import { toast } from 'sonner';

import { Button, Input, Badge, Loader, Modal } from '@/components/ui';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { SiswaDetailModal } from '@/components/academic/siswa/SiswaDetailModal';
import { FieldDocumentTrigger } from '@/components/documents/FieldDocumentTrigger';
import {
  getDapodikServerInfo,
  getDapodikConfig,
  saveDapodikConfig,
  testDapodikConnection,
  getDapodikStudentComparison,
  syncDapodikStudents,
  type DapodikConfig,
  type ReconciledStudent,
  type StudentReconciliationStatus,
  type TestConnectionResponse,
  type CompareOptions,
} from '@/api/dapodik.api';
import { DAPODIK_AUDIT_TEMPLATES, type DapodikAuditTemplate } from './dapodikAuditTemplates';
import { DapodikBeritaAcaraPrintModal } from './DapodikBeritaAcaraPrintModal';
import { DapodikConnectionModal } from './DapodikConnectionModal';
import { DapodikCriteriaModal } from './DapodikCriteriaModal';
import { DapodikRombelMappingModal } from './DapodikRombelMappingModal';

export interface UniversalDapodikIntegrationViewProps {
  hideLayout?: boolean;
}

export const DapodikIntegrationView: React.FC<UniversalDapodikIntegrationViewProps> = () => {
  const queryClient = useQueryClient();

  // Modals Open State (Packaging All Settings in Modals to Eliminate Visual Noise)
  const [isConnectionModalOpen, setIsConnectionModalOpen] = useState(false);
  const [isCriteriaModalOpen, setIsCriteriaModalOpen] = useState(false);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [isRombelMappingModalOpen, setIsRombelMappingModalOpen] = useState(false);
  const [selectedSiswaDetailId, setSelectedSiswaDetailId] = useState<string | null>(null);

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

  // Source Mode: 'LIVE' (Real-time port 5774) vs 'STAGING' (Snapshot Platform di Server Absenta)
  const [sourceMode, setSourceMode] = useState<'LIVE' | 'STAGING'>('LIVE');

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
  });

  // 2. Fetch Saved Config
  const { data: configData, isLoading: _isLoadingConfig } = useQuery({
    queryKey: ['dapodik-config'],
    queryFn: getDapodikConfig,
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
    enabled: Boolean(configData?.data?.is_configured),
    staleTime: 5 * 60 * 1000, // 5 menit cache di client
  });

  const primaryServerIp = serverInfoData?.data?.primaryIp || '10.10.10.116';

  // Aksi Eksplisit: Tarik Data Baru Langsung dari Port 5774 Dapodik
  const handleFetchFreshDapodik = async () => {
    setIsFetchingFresh(true);
    const toastId = toast.loading('Sedang menghubungi Web Service Dapodik port 5774...');
    try {
      const res = await getDapodikStudentComparison(compareOptions, true, 'LIVE');
      // Perbarui cache TanStack Query
      queryClient.setQueryData(['dapodik-student-comparison', compareOptions, sourceMode], res);
      queryClient.invalidateQueries({ queryKey: ['dapodik-config'] });
      toast.success(
        `Berhasil menarik ${res.data.summary.totalDapodik} data siswa dari Dapodik & disimpan ke Staging Platform!`,
        { id: toastId }
      );
    } catch (err: any) {
      toast.error(
        err?.response?.data?.message || err?.message || 'Gagal menarik data dari Web Service Dapodik',
        { id: toastId }
      );
    } finally {
      setIsFetchingFresh(false);
    }
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
      refetchComparison();
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || err?.message || 'Gagal menyinkronkan siswa');
    },
  });

  // Students List & Filtering
  const students = useMemo(() => {
    return comparisonData?.data?.students || [];
  }, [comparisonData]);

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

  const summary = comparisonData?.data?.summary;
  const cacheInfo = comparisonData?.data?.cacheInfo;

  // Helper Ekstraksi Tingkat Siswa
  const getStudentTingkat = useCallback((s: ReconciledStudent): string => {
    const absTingkat = s.absentaRaw?.SiswaAkademik?.[0]?.kelas?.tingkat;
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

  // Cek apakah ada filter aktif selain default
  const hasActiveFilters = Boolean(
    searchQuery.trim() ||
    statusFilter !== 'ALL' ||
    rombelFilter ||
    tingkatFilter ||
    genderFilter
  );

  const handleResetFilters = useCallback(() => {
    setSearchQuery('');
    setStatusFilter('ALL');
    setRombelFilter('');
    setTingkatFilter('');
    setGenderFilter('');
  }, []);

  const filteredStudents = useMemo(() => {
    return students.filter((s) => {
      // 1. Filter Status Rekonsiliasi
      if (statusFilter !== 'ALL' && s.status !== statusFilter) {
        return false;
      }

      // 2. Filter Rombel
      if (rombelFilter) {
        const sRombel = (s.rombel || s.dapodikRaw?.nama_rombel || '').trim();
        if (sRombel !== rombelFilter) {
          return false;
        }
      }

      // 3. Filter Tingkat
      if (tingkatFilter) {
        const sTingkat = getStudentTingkat(s);
        if (sTingkat !== tingkatFilter) {
          return false;
        }
      }

      // 4. Filter Gender
      if (genderFilter) {
        const sGender = (s.jenis_kelamin || '').toUpperCase().startsWith('L') ? 'L' : 'P';
        if (sGender !== genderFilter) {
          return false;
        }
      }

      // 5. Pencarian Teks
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
  }, [students, statusFilter, rombelFilter, tingkatFilter, genderFilter, searchQuery, getStudentTingkat]);

  // Reset pagination when filter/search/options change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter, rombelFilter, tingkatFilter, genderFilter, compareOptions, pageSize]);

  // Paginated Slicing (Lightweight DOM: Render only 25 - 100 rows instead of 2,755)
  const totalPages = Math.max(1, Math.ceil(filteredStudents.length / pageSize));
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, filteredStudents.length);

  const paginatedStudents = useMemo(() => {
    return filteredStudents.slice(startIndex, endIndex);
  }, [filteredStudents, startIndex, endIndex]);

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
    const targets = selectedStudents
      .filter((s) => s.status === 'MISMATCH' && s.absentaRaw)
      .map((s) => ({
        absentaId: s.absentaRaw.id,
        nisn: s.dapodikRaw?.nisn || s.nisn,
        nik: s.dapodikRaw?.nik || s.nik || undefined,
        nis: s.dapodikRaw?.registrasi_peserta_didik?.nipd || s.nis || undefined,
        nama: s.dapodikRaw?.nama || s.nama,
        jenis_kelamin: s.dapodikRaw?.jenis_kelamin || s.jenis_kelamin,
        tempat_lahir: s.dapodikRaw?.tempat_lahir || s.tempat_lahir || undefined,
        tanggal_lahir: s.dapodikRaw?.tanggal_lahir || s.tanggal_lahir || undefined,
      }));

    if (targets.length === 0) {
      toast.warning('Tidak ada siswa berstatus Selisih (Mismatch) dalam pilihan Anda.');
      return;
    }

    setConfirmDialog({
      isOpen: true,
      title: 'Perbarui Biodata ke Absenta',
      message: `Perbarui ${targets.length} siswa di Absenta dengan data dari Dapodik? Data biodata lokal akan diselaraskan secara otomatis.`,
      confirmText: 'Ya, Perbarui Sekarang',
      onConfirm: () => {
        setConfirmDialog(null);
        syncMutation.mutate({
          action: 'UPDATE_SELECTED',
          students: targets,
        });
      },
    });
  };

  const handleBulkImport = () => {
    const targets = selectedStudents.filter((s) => s.status === 'DAPODIK_ONLY');

    if (targets.length === 0) {
      toast.warning('Tidak ada siswa berstatus Dapodik Saja dalam pilihan Anda.');
      return;
    }

    // Buka Wizard Pemetaan Rombel Dapodik ke Kelas Platform
    setIsRombelMappingModalOpen(true);
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
      {!configForm.api_token ? (
        /* Empty State Jika Belum Dikonfigurasi */
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
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-2.5 px-3.5 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs text-xs">
            {/* Sisi Kiri: Status Lembaga & Snapshot */}
            <div className="flex items-center gap-2.5 flex-wrap min-w-0">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                <span className="font-bold text-slate-900 dark:text-slate-100 truncate max-w-[240px]">
                  {configForm.school_name || `NPSN ${configForm.npsn}`}
                </span>
                <span className="text-slate-300 dark:text-slate-700 hidden sm:inline">•</span>
                <span className="font-mono text-[11px] text-slate-500 dark:text-slate-400 hidden sm:inline">
                  {configForm.dapodik_host}
                </span>
              </div>

              {formattedCacheTime && (
                <div className="flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/60 px-2 py-0.5 rounded-lg border border-slate-200/60 dark:border-slate-700/60">
                  <Clock className="w-3 h-3 text-slate-400" />
                  <span>Snapshot: <strong>{formattedCacheTime}</strong></span>
                  {cacheInfo?.sourceMode === 'STAGING' || sourceMode === 'STAGING' ? (
                    <span className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold">(Staging Platform)</span>
                  ) : cacheInfo?.isFromCache ? (
                    <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-medium">(In-Memory)</span>
                  ) : null}
                </div>
              )}

              <div className="hidden sm:flex items-center gap-1 text-[11px] text-indigo-700 dark:text-indigo-300 bg-indigo-50/70 dark:bg-indigo-950/50 px-2 py-0.5 rounded-lg border border-indigo-200/60 dark:border-indigo-800/50 font-semibold">
                <Users className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />
                <span>{compareOptions.onlyActiveStudents !== false ? 'Konteks: Siswa Aktif' : 'Konteks: Semua Siswa'}</span>
              </div>
            </div>

            {/* Sisi Kanan: Action Buttons Terpadu & Switcher Mode Dapodik */}
            <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
              {/* SWITCHER PERBANDINGAN: STAGING PLATFORM VS DAPODIK LANGSUNG */}
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

              {/* Tombol Pengaturan Koneksi (Modal) */}
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

              {/* Tombol Kriteria Pencocokan & Template (Modal) */}
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

              {/* Cetak Berita Acara Resmi */}
              <Button
                size="sm"
                variant="outline"
                onClick={() => setIsPrintModalOpen(true)}
                disabled={!summary || isLoadingComparison}
                className="h-7 px-2.5 text-[11px] font-semibold gap-1.5 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                title="Cetak Berita Acara Rekonsiliasi Data"
              >
                <Printer className="w-3.5 h-3.5 text-slate-500" />
                Cetak Dokumen
              </Button>

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

          {/* ═══════════════════════════════════════════════════════════════════
              2. BENTO STATS CARDS (RINGKAS & ZERO NOISE)
          ═══════════════════════════════════════════════════════════════════ */}
          {summary && (
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
          )}

          {/* ═══════════════════════════════════════════════════════════════════
              3. TOOLBAR FILTER, PENCARIAN, & AKSI MASSAL
          ═══════════════════════════════════════════════════════════════════ */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl p-2.5 shadow-xs space-y-2.5">
            <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2 flex-1">
                {/* Search Bar */}
                <div className="relative min-w-[200px] flex-1 max-w-sm">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <Input
                    placeholder="Cari Nama, NISN, NIS, atau Rombel..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8 h-7.5 text-xs"
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
                    Selisih Data ({summary?.mismatchCount || 0})
                  </Button>
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

              {/* 1. Filter Rombel Dapodik */}
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

              {/* 2. Filter Tingkat */}
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

              {/* 3. Filter Gender */}
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

              {/* Reset Filter Button */}
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-600 hover:text-rose-700 dark:text-rose-400 px-2 py-1 rounded-md hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors ml-auto"
                >
                  <X className="w-3 h-3" />
                  Reset Filter
                </button>
              )}
            </div>

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

                <div className="flex items-center gap-1.5">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleBulkUpdate}
                    disabled={syncMutation.isPending}
                    className="h-7 text-xs font-semibold gap-1.5 border-amber-300 bg-amber-50/50 text-amber-800 hover:bg-amber-100 dark:bg-amber-950/30 dark:border-amber-800 dark:text-amber-300"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    Perbarui Selisih Terpilih
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
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  {(comparisonError as any)?.response?.data?.message || (comparisonError as any)?.message || 'Terjadi kesalahan sistem.'}
                </p>
                <div className="flex items-center justify-center gap-2 pt-1">
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
                      <th className="p-2.5">Status</th>
                      <th className="p-2.5">NISN &amp; NIK</th>
                      <th className="p-2.5">Nama di Dapodik</th>
                      <th className="p-2.5">Nama di Absenta</th>
                      <th className="p-2.5">Rombel Dapodik</th>
                      <th className="p-2.5">Rombel Absenta</th>
                      <th className="p-2.5 text-right">Aksi</th>
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
                          <td className="p-2.5 whitespace-nowrap">
                            {renderStatusBadge(s.status)}
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
                            {s.absentaRaw?.SiswaAkademik?.[0]?.kelas?.nama_kelas || '-'}
                          </td>
                          <td className="p-2.5 text-right whitespace-nowrap">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setInspectedStudent(s)}
                              className="h-6 px-2 text-[11px] gap-1 text-slate-500 hover:text-indigo-600"
                            >
                              <Eye className="w-3 h-3" /> Intip Detail
                            </Button>
                          </td>
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

      {/* ─── MODAL 3: CETAK BERITA ACARA RESMI (PDF / WYSIWYG) ─── */}
      <DapodikBeritaAcaraPrintModal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        summary={summary}
        students={students}
        templateName={activeTemplate?.name || 'Audit Kustom'}
        dapodikHost={configForm.dapodik_host}
        npsn={configForm.npsn}
        lastCheckAt={comparisonData?.data?.lastCheckAt}
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
        onClose={() => setIsRombelMappingModalOpen(false)}
        students={selectedStudents.filter((s) => s.status === 'DAPODIK_ONLY')}
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
              },
            }
          );
        }}
        isSubmitting={syncMutation.isPending}
      />
    </div>
  );
};

export default DapodikIntegrationView;
