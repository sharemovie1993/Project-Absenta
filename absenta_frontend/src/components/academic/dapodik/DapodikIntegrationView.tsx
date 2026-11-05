/**
 * DapodikIntegrationView.tsx
 * Universal Role-Ready View untuk Integrasi & Komparasi Data Dapodik.
 * Standar Industri: Shopee-Grade High Density, Caching Cerdas, & Virtual/Paginated Rendering.
 */

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Key, CheckCircle2, AlertTriangle, Download, RefreshCw, 
  Copy, Check, Users, School, Eye, EyeOff,
  HelpCircle, Search, ArrowRight, Database, Server, ShieldAlert,
  SlidersHorizontal, Settings2, ChevronDown, ChevronUp,
  ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Clock, Sparkles,
  Printer, Bookmark
} from 'lucide-react';
import { toast } from 'sonner';

import { SectionCard, Button, Input, Badge, Tabs, TabsList, TabsTrigger, TabsContent, Loader, Modal } from '@/components/ui';
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

export interface UniversalDapodikIntegrationViewProps {
  hideLayout?: boolean;
}

export const DapodikIntegrationView: React.FC<UniversalDapodikIntegrationViewProps> = () => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'reconciliation' | 'connection' | 'guide'>('reconciliation');

  // Form State
  const [configForm, setConfigForm] = useState<DapodikConfig>({
    dapodik_host: 'http://10.10.10.50:5774',
    npsn: '',
    api_token: '',
    is_active: true,
  });
  const [showToken, setShowToken] = useState(false);
  const [copiedIp, setCopiedIp] = useState(false);

  // Filter & Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | StudentReconciliationStatus>('ALL');

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
  });
  const [showMatchingConfig, setShowMatchingConfig] = useState(false);

  // High-Performance Pagination State (Anti Lemot / Memory Optimization)
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);

  // Explicit Fresh Fetch State (Tarik Data Baru dari Dapodik)
  const [isFetchingFresh, setIsFetchingFresh] = useState(false);

  // Audit Template & Official Print Modal State
  const [activeTemplateId, setActiveTemplateId] = useState<string>('full_audit');
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

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

  // 3. Fetch Comparison Data (Secara Default Menggunakan In-Memory Snapshot Cache Backend)
  const {
    data: comparisonData,
    isLoading: isLoadingComparison,
    isRefetching: isRefetchingComparison,
    refetch: refetchComparison,
    error: comparisonError,
  } = useQuery({
    queryKey: ['dapodik-student-comparison', compareOptions],
    queryFn: () => getDapodikStudentComparison(compareOptions, false),
    enabled: Boolean(configData?.data?.is_configured),
    staleTime: 5 * 60 * 1000, // 5 menit cache di client
  });

  const primaryServerIp = serverInfoData?.data?.primaryIp || '10.10.10.116';

  const handleCopyIp = useCallback(() => {
    if (primaryServerIp) {
      navigator.clipboard.writeText(primaryServerIp);
      setCopiedIp(true);
      toast.success(`IP Server Absenta (${primaryServerIp}) berhasil disalin!`);
      setTimeout(() => setCopiedIp(false), 2500);
    }
  }, [primaryServerIp]);

  // Aksi Eksplisit: Tarik Data Baru Langsung dari Port 5774 Dapodik
  const handleFetchFreshDapodik = async () => {
    setIsFetchingFresh(true);
    const toastId = toast.loading('Sedang menghubungi Web Service Dapodik port 5774...');
    try {
      const res = await getDapodikStudentComparison(compareOptions, true);
      // Perbarui cache TanStack Query
      queryClient.setQueryData(['dapodik-student-comparison', compareOptions], res);
      queryClient.invalidateQueries({ queryKey: ['dapodik-config'] });
      toast.success(
        `Berhasil menarik ${res.data.summary.totalDapodik} data siswa terbaru dari Dapodik!`,
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
    toast.success(`Template audit "${tmpl.name}" aktif.`);
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

  const filteredStudents = useMemo(() => {
    return students.filter((s) => {
      if (statusFilter !== 'ALL' && s.status !== statusFilter) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchNama = s.nama.toLowerCase().includes(q);
        const matchNisn = s.nisn.toLowerCase().includes(q);
        const matchNis = (s.nis || '').toLowerCase().includes(q);
        const matchRombel = (s.rombel || '').toLowerCase().includes(q);
        return matchNama || matchNisn || matchNis || matchRombel;
      }
      return true;
    });
  }, [students, statusFilter, searchQuery]);

  // Reset pagination when filter/search/options change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter, compareOptions, pageSize]);

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
    const targets = selectedStudents
      .filter((s) => s.status === 'DAPODIK_ONLY')
      .map((s) => ({
        nisn: s.nisn,
        nik: s.nik || undefined,
        nis: s.nis || undefined,
        nama: s.nama,
        jenis_kelamin: s.jenis_kelamin,
        tempat_lahir: s.tempat_lahir || undefined,
        tanggal_lahir: s.tanggal_lahir || undefined,
        rombel: s.rombel || undefined,
      }));

    if (targets.length === 0) {
      toast.warning('Tidak ada siswa berstatus Dapodik Saja dalam pilihan Anda.');
      return;
    }

    setConfirmDialog({
      isOpen: true,
      title: 'Import Siswa Baru dari Dapodik',
      message: `Import ${targets.length} siswa baru dari Dapodik ke database Absenta? Akun siswa dan data akademik awal akan dibuat.`,
      confirmText: 'Ya, Import Sekarang',
      onConfirm: () => {
        setConfirmDialog(null);
        syncMutation.mutate({
          action: 'IMPORT_SELECTED',
          students: targets,
        });
      },
    });
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
            <AlertTriangle className="w-3 h-3" /> Beda Data (Mismatch)
          </span>
        );
      case 'DAPODIK_ONLY':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300">
            <Download className="w-3 h-3" /> Hanya di Dapodik
          </span>
        );
      case 'ABSENTA_ONLY':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300">
            <HelpCircle className="w-3 h-3" /> Hanya di Absenta
          </span>
        );
    }
  };

  // Helper Format Waktu Cache
  const formattedCacheTime = useMemo(() => {
    if (!cacheInfo?.cachedAt) return null;
    const d = new Date(cacheInfo.cachedAt);
    return d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) + ' WIB';
  }, [cacheInfo?.cachedAt]);

  return (
    <div className="space-y-4">
      {/* ─── TABS NAVIGASI UTAMA ─── */}
      <Tabs value={activeTab} onValueChange={(val: any) => setActiveTab(val)}>
        <TabsList className="bg-slate-100 dark:bg-slate-800/60 p-1 rounded-xl">
          <TabsTrigger value="reconciliation" className="gap-2 font-medium">
            <Database className="w-4 h-4" /> Audit &amp; Komparasi Siswa
          </TabsTrigger>
          <TabsTrigger value="connection" className="gap-2 font-medium">
            <Key className="w-4 h-4" /> Pengaturan Koneksi &amp; Token
          </TabsTrigger>
          <TabsTrigger value="guide" className="gap-2 font-medium">
            <HelpCircle className="w-4 h-4" /> Panduan &amp; Troubleshooting
          </TabsTrigger>
        </TabsList>

        {/* ════════════════════════════════════════════════════════════════════
            TAB 1: AUDIT & KOMPARASI SISWA (HIGH DENSITY & SUPER LIGHTWEIGHT)
        ════════════════════════════════════════════════════════════════════ */}
        <TabsContent value="reconciliation" className="space-y-4 pt-1">
          {!configForm.api_token ? (
            <div className="p-8 text-center bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700 space-y-4">
              <div className="w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto">
                <Key className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h4 className="text-base font-bold text-slate-800 dark:text-slate-100">
                  Konfigurasi Token Dapodik Belum Tersedia
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                  Untuk mulai mengaudit dan membandingkan data siswa, silakan masukkan Host URL, NPSN, dan Token Web Service terlebih dahulu.
                </p>
              </div>
              <Button onClick={() => setActiveTab('connection')} className="gap-2">
                Atur Koneksi Sekarang <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          ) : (
            <>
              {/* 1. SLIM STATUS STRIP (SHOPEE-GRADE HIGH-DENSITY BANNER) */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs text-xs">
                <div className="flex items-center gap-3 flex-wrap min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="font-bold text-slate-900 dark:text-slate-100">
                      {configForm.school_name || `NPSN ${configForm.npsn}`}
                    </span>
                    <span className="text-slate-400 hidden sm:inline">•</span>
                    <span className="font-mono text-[11px] text-slate-500 dark:text-slate-400">
                      {configForm.dapodik_host}
                    </span>
                  </div>

                  {/* Whitelist Server IP Pill */}
                  <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700/80 px-2 py-1 rounded-lg">
                    <Server className="w-3.5 h-3.5 text-indigo-500" />
                    <span className="text-[11px] text-slate-500">IP Server:</span>
                    <code className="font-mono text-[11px] font-bold text-indigo-700 dark:text-indigo-400">
                      {primaryServerIp}
                    </code>
                    <button
                      type="button"
                      onClick={handleCopyIp}
                      title="Salin IP Whitelist"
                      className="text-slate-400 hover:text-indigo-600 transition-colors ml-0.5"
                    >
                      {copiedIp ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                {/* Snapshot Cache Indicator & Explicit Sync Button */}
                <div className="flex items-center gap-2 shrink-0 flex-wrap">
                  {formattedCacheTime && (
                    <div className="flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/40 px-2 py-1 rounded-lg border border-slate-100 dark:border-slate-800">
                      <Clock className="w-3 h-3 text-slate-400" />
                      <span>Snapshot: <strong>{formattedCacheTime}</strong></span>
                      {cacheInfo?.isFromCache && (
                        <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-medium">(In-Memory)</span>
                      )}
                    </div>
                  )}

                  {/* Cetak Berita Acara Resmi Button */}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setIsPrintModalOpen(true)}
                    disabled={!summary || isLoadingComparison}
                    className="h-7 px-2.5 text-[11px] font-semibold gap-1.5 shadow-xs border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/40"
                    title="Cetak Berita Acara Rekonsiliasi Data"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    Cetak Berita Acara
                  </Button>

                  <Button
                    size="sm"
                    variant="primary"
                    onClick={handleFetchFreshDapodik}
                    disabled={isFetchingFresh || isLoadingComparison}
                    className="h-7 px-3 text-[11px] font-semibold gap-1.5 shadow-xs"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isFetchingFresh ? 'animate-spin' : ''}`} />
                    {isFetchingFresh ? 'Mengambil...' : 'Tarik Data Baru dari Dapodik'}
                  </Button>
                </div>
              </div>

              {/* 2. BENTO STATS CARDS (SLIM & CLEAN - SHOPEE HAIRLINE) */}
              {summary && (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
                  <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
                    <div className="flex items-center justify-between text-slate-500 text-[11px] font-medium">
                      <span>Total Dapodik</span>
                      <Users className="w-3.5 h-3.5 text-blue-500" />
                    </div>
                    <div className="text-lg font-black text-slate-900 dark:text-white mt-0.5">
                      {summary.totalDapodik.toLocaleString('id-ID')}
                    </div>
                  </div>

                  <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
                    <div className="flex items-center justify-between text-slate-500 text-[11px] font-medium">
                      <span>Total Absenta</span>
                      <School className="w-3.5 h-3.5 text-indigo-500" />
                    </div>
                    <div className="text-lg font-black text-slate-900 dark:text-white mt-0.5">
                      {summary.totalAbsenta.toLocaleString('id-ID')}
                    </div>
                  </div>

                  <div className="bg-emerald-50/50 dark:bg-emerald-950/20 p-3 rounded-xl border border-emerald-200/70 dark:border-emerald-800/40 shadow-xs">
                    <div className="flex items-center justify-between text-emerald-700 dark:text-emerald-400 text-[11px] font-semibold">
                      <span>Selaras (100%)</span>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    </div>
                    <div className="text-lg font-black text-emerald-800 dark:text-emerald-300 mt-0.5">
                      {summary.matchCount.toLocaleString('id-ID')}
                    </div>
                  </div>

                  <div className="bg-amber-50/50 dark:bg-amber-950/20 p-3 rounded-xl border border-amber-200/70 dark:border-amber-800/40 shadow-xs">
                    <div className="flex items-center justify-between text-amber-800 dark:text-amber-300 text-[11px] font-semibold">
                      <span>Selisih Data</span>
                      <AlertTriangle className="w-3.5 h-3.5" />
                    </div>
                    <div className="text-lg font-black text-amber-900 dark:text-amber-200 mt-0.5">
                      {summary.mismatchCount.toLocaleString('id-ID')}
                    </div>
                  </div>

                  <div className="bg-blue-50/50 dark:bg-blue-950/20 p-3 rounded-xl border border-blue-200/70 dark:border-blue-800/40 shadow-xs">
                    <div className="flex items-center justify-between text-blue-700 dark:text-blue-300 text-[11px] font-semibold">
                      <span>Dapodik Saja</span>
                      <Download className="w-3.5 h-3.5" />
                    </div>
                    <div className="text-lg font-black text-blue-800 dark:text-blue-200 mt-0.5">
                      {summary.dapodikOnlyCount.toLocaleString('id-ID')}
                    </div>
                  </div>

                  <div className="bg-rose-50/50 dark:bg-rose-950/20 p-3 rounded-xl border border-rose-200/70 dark:border-rose-800/40 shadow-xs">
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

              {/* 3. PENGATURAN BIDANG PENCOCOKAN (COLLAPSIBLE MATCHING CRITERIA) */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl p-3 shadow-xs space-y-2.5">
                {/* TEMPLATE SKENARIO AUDIT BAR (1-CLICK TEMPLATES) */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-0.5 no-scrollbar">
                  <div className="flex items-center gap-1 text-[11px] font-bold text-slate-700 dark:text-slate-300 shrink-0 pr-1">
                    <Bookmark className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                    <span>Template Audit:</span>
                  </div>
                  {DAPODIK_AUDIT_TEMPLATES.map((tmpl) => {
                    const isSelected = activeTemplateId === tmpl.id;
                    return (
                      <button
                        key={tmpl.id}
                        type="button"
                        onClick={() => handleApplyTemplate(tmpl)}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all whitespace-nowrap flex items-center gap-1.5 border cursor-pointer ${
                          isSelected
                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                            : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200/80 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700/60'
                        }`}
                        title={tmpl.scenario}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-white' : 'bg-indigo-500'}`} />
                        <span>{tmpl.name}</span>
                      </button>
                    );
                  })}
                </div>

                <div className="flex items-center justify-between flex-wrap gap-2 pt-1 border-t border-slate-100 dark:border-slate-800/80">
                  <div className="flex items-center gap-2 flex-wrap min-w-0">
                    <div className="w-7 h-7 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                      <SlidersHorizontal className="w-3.5 h-3.5" />
                    </div>
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      Bidang yang Dicocokkan ({activeCriteriaCount} Aktif):
                    </span>
                    <div className="flex items-center gap-1 flex-wrap">
                      {compareOptions.checkNama && (
                        <Badge className="text-[10px] px-1.5 py-0.2 bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border-indigo-200/60">
                          Nama
                        </Badge>
                      )}
                      {compareOptions.checkNisn && (
                        <Badge className="text-[10px] px-1.5 py-0.2 bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border-indigo-200/60">
                          NISN
                        </Badge>
                      )}
                      {compareOptions.checkNis && (
                        <Badge className="text-[10px] px-1.5 py-0.2 bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border-indigo-200/60">
                          NIS
                        </Badge>
                      )}
                      {compareOptions.checkNik && (
                        <Badge className="text-[10px] px-1.5 py-0.2 bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border-indigo-200/60">
                          NIK
                        </Badge>
                      )}
                      {compareOptions.checkKelas && (
                        <Badge className="text-[10px] px-1.5 py-0.2 bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border-indigo-200/60">
                          Rombel {compareOptions.ignoreClassWhitespace ? '(Abaikan Spasi)' : ''}
                        </Badge>
                      )}
                      {compareOptions.checkJenisKelamin && (
                        <Badge className="text-[10px] px-1.5 py-0.2 bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border-indigo-200/60">
                          Gender
                        </Badge>
                      )}
                      {compareOptions.checkTanggalLahir && (
                        <Badge className="text-[10px] px-1.5 py-0.2 bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border-indigo-200/60">
                          Tgl Lahir
                        </Badge>
                      )}
                    </div>
                  </div>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setShowMatchingConfig(!showMatchingConfig)}
                    className="h-7 text-xs font-semibold gap-1 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800"
                  >
                    <Settings2 className="w-3.5 h-3.5" />
                    {showMatchingConfig ? 'Sembunyikan' : 'Atur Bidang'}
                    {showMatchingConfig ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </Button>
                </div>

                {showMatchingConfig && (
                  <div className="pt-2.5 border-t border-slate-100 dark:border-slate-800 space-y-2.5 animate-in fade-in duration-150">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                      <label className="flex items-center gap-2 p-2 rounded-lg border border-slate-200/60 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/40 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={compareOptions.checkNama}
                          onChange={(e) => setCompareOptions({ ...compareOptions, checkNama: e.target.checked })}
                          className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                        />
                        <span className="font-semibold text-slate-800 dark:text-slate-200">Nama Siswa</span>
                      </label>

                      <label className="flex items-center gap-2 p-2 rounded-lg border border-slate-200/60 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/40 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={compareOptions.checkNisn}
                          onChange={(e) => setCompareOptions({ ...compareOptions, checkNisn: e.target.checked })}
                          className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                        />
                        <span className="font-semibold text-slate-800 dark:text-slate-200">NISN</span>
                      </label>

                      <label className="flex items-center gap-2 p-2 rounded-lg border border-slate-200/60 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/40 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={compareOptions.checkNis}
                          onChange={(e) => setCompareOptions({ ...compareOptions, checkNis: e.target.checked })}
                          className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                        />
                        <span className="font-semibold text-slate-800 dark:text-slate-200">NIS (NIPD)</span>
                      </label>

                      <label className="flex items-center gap-2 p-2 rounded-lg border border-slate-200/60 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/40 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={compareOptions.checkNik}
                          onChange={(e) => setCompareOptions({ ...compareOptions, checkNik: e.target.checked })}
                          className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                        />
                        <span className="font-semibold text-slate-800 dark:text-slate-200">NIK (KTP)</span>
                      </label>

                      <label className="flex items-center gap-2 p-2 rounded-lg border border-slate-200/60 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/40 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={compareOptions.checkKelas}
                          onChange={(e) => setCompareOptions({ ...compareOptions, checkKelas: e.target.checked })}
                          className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                        />
                        <span className="font-semibold text-slate-800 dark:text-slate-200">Rombongan Belajar</span>
                      </label>

                      <label className="flex items-center gap-2 p-2 rounded-lg border border-slate-200/60 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/40 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={compareOptions.checkJenisKelamin}
                          onChange={(e) => setCompareOptions({ ...compareOptions, checkJenisKelamin: e.target.checked })}
                          className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                        />
                        <span className="font-semibold text-slate-800 dark:text-slate-200">Jenis Kelamin</span>
                      </label>

                      <label className="flex items-center gap-2 p-2 rounded-lg border border-slate-200/60 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/40 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={compareOptions.checkTanggalLahir}
                          onChange={(e) => setCompareOptions({ ...compareOptions, checkTanggalLahir: e.target.checked })}
                          className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                        />
                        <span className="font-semibold text-slate-800 dark:text-slate-200">Tanggal Lahir</span>
                      </label>

                      <label className="flex items-center gap-2 p-2 rounded-lg border border-slate-200/60 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/40 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={compareOptions.checkTempatLahir}
                          onChange={(e) => setCompareOptions({ ...compareOptions, checkTempatLahir: e.target.checked })}
                          className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                        />
                        <span className="font-semibold text-slate-800 dark:text-slate-200">Tempat Lahir</span>
                      </label>
                    </div>

                    {compareOptions.checkKelas && (
                      <div className="p-2 rounded-lg bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-200/60 dark:border-indigo-800/40 text-xs flex items-center justify-between">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={compareOptions.ignoreClassWhitespace}
                            onChange={(e) => setCompareOptions({ ...compareOptions, ignoreClassWhitespace: e.target.checked })}
                            className="rounded border-indigo-300 text-indigo-600 focus:ring-indigo-500"
                          />
                          <span className="font-semibold text-indigo-900 dark:text-indigo-200">
                            Abaikan Perbedaan Spasi Rombel (XI TAV2 dianggap cocok dengan XI TAV 2)
                          </span>
                        </label>
                      </div>
                    )}

                    {/* Presets Cepat */}
                    <div className="flex items-center gap-1.5 pt-1 flex-wrap">
                      <span className="text-[11px] font-semibold text-slate-500">Pilihan Cepat:</span>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-6 text-[10px] px-2"
                        onClick={() => setCompareOptions({
                          checkNama: true, checkNis: true, checkNisn: true, checkNik: true,
                          checkKelas: true, checkJenisKelamin: true, checkTanggalLahir: true,
                          checkTempatLahir: false, ignoreClassWhitespace: true
                        })}
                      >
                        Standar (Semua)
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-6 text-[10px] px-2"
                        onClick={() => setCompareOptions({
                          checkNama: true, checkNis: true, checkNisn: true, checkNik: true,
                          checkKelas: false, checkJenisKelamin: true, checkTanggalLahir: true,
                          checkTempatLahir: false, ignoreClassWhitespace: true
                        })}
                      >
                        Biodata Saja (Abaikan Kelas)
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-6 text-[10px] px-2"
                        onClick={() => setCompareOptions({
                          checkNama: false, checkNis: false, checkNisn: false, checkNik: false,
                          checkKelas: true, checkJenisKelamin: false, checkTanggalLahir: false,
                          checkTempatLahir: false, ignoreClassWhitespace: true
                        })}
                      >
                        Rombel / Kelas Saja
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-6 text-[10px] px-2"
                        onClick={() => setCompareOptions({
                          checkNama: true, checkNis: false, checkNisn: true, checkNik: false,
                          checkKelas: false, checkJenisKelamin: false, checkTanggalLahir: false,
                          checkTempatLahir: false, ignoreClassWhitespace: true
                        })}
                      >
                        Hanya Nama &amp; NISN
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              {/* 4. TOOLBAR SEARCH, STATUS FILTERS, & BULK ACTIONS */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl p-3 shadow-xs space-y-3">
                <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-2.5">
                  <div className="flex flex-wrap items-center gap-2 flex-1">
                    <div className="relative min-w-[200px] flex-1 max-w-sm">
                      <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                      <Input
                        placeholder="Cari Nama, NISN, NIS, atau Rombel..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-8 h-8 text-xs"
                      />
                    </div>

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

                  {/* Page Size Segmented Buttons (Shopee-Grade & Zero Select Clutter) */}
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

                {/* BULK ACTION BAR JIKA ADA DATA YANG DIPILIH */}
                {selectedStudentIds.size > 0 && (
                  <div className="p-2.5 bg-indigo-50 dark:bg-indigo-950/40 rounded-xl border border-indigo-200/80 dark:border-indigo-800/60 flex items-center justify-between flex-wrap gap-2 text-xs animate-in fade-in duration-100">
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
                        className="text-[11px] text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 ml-1"
                      >
                        Batal
                      </button>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleBulkUpdate}
                        disabled={syncMutation.isPending}
                        className="h-7 px-2.5 text-xs font-semibold text-amber-700 dark:text-amber-400 border-amber-300 hover:bg-amber-100/50"
                      >
                        Perbarui Biodata ke Absenta
                      </Button>

                      <Button
                        size="sm"
                        variant="primary"
                        onClick={handleBulkImport}
                        disabled={syncMutation.isPending}
                        className="h-7 px-2.5 text-xs font-semibold"
                      >
                        Import Siswa Baru
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              {/* 5. TABEL KOMPARASI SISWA (VIRTUAL / PAGINATED SUPER RINGAN) */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl overflow-hidden shadow-xs">
                {isLoadingComparison ? (
                  <div className="py-16 text-center space-y-3">
                    <Loader size="lg" className="mx-auto text-indigo-600" />
                    <p className="text-xs font-medium text-slate-600 dark:text-slate-400">
                      Sedang memproses data dan menjalankan komparasi in-memory...
                    </p>
                  </div>
                ) : comparisonError ? (
                  <div className="p-8 text-center space-y-3">
                    <div className="w-10 h-10 rounded-full bg-rose-100 dark:bg-rose-950/50 text-rose-600 mx-auto flex items-center justify-center">
                      <AlertTriangle className="w-5 h-5" />
                    </div>
                    <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                      Gagal Menarik Data Komparasi
                    </h4>
                    <p className="text-xs text-rose-600 dark:text-rose-400 max-w-md mx-auto">
                      {(comparisonError as any)?.response?.data?.message || (comparisonError as any)?.message}
                    </p>
                    <Button size="sm" variant="outline" onClick={() => refetchComparison()}>
                      Coba Lagi
                    </Button>
                  </div>
                ) : filteredStudents.length === 0 ? (
                  <div className="py-12 text-center text-slate-400 text-xs">
                    Tidak ada data siswa yang cocok dengan kriteria filter atau pencarian.
                  </div>
                ) : (
                  <>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300 border-collapse">
                        <thead className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 font-semibold uppercase text-[10px] tracking-wider">
                          <tr>
                            <th className="p-2.5 w-8 text-center">
                              <input
                                type="checkbox"
                                onChange={handleToggleSelectPage}
                                checked={isAllPageSelected}
                                title="Pilih semua baris di halaman ini"
                                className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                              />
                            </th>
                            <th className="p-2.5">Status</th>
                            <th className="p-2.5">NISN &amp; NIK</th>
                            <th className="p-2.5">Nama di Dapodik</th>
                            <th className="p-2.5">Nama di Absenta</th>
                            <th className="p-2.5">Rombel Dapodik</th>
                            <th className="p-2.5">Rombel Absenta</th>
                            <th className="p-2.5">Detail Selisih</th>
                            <th className="p-2.5 text-right">Aksi</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                          {paginatedStudents.map((student) => {
                            const isSelected = selectedStudentIds.has(student.id);
                            return (
                              <tr
                                key={student.id}
                                className={`hover:bg-slate-50/70 dark:hover:bg-slate-800/50 transition-colors ${
                                  isSelected ? 'bg-indigo-50/40 dark:bg-indigo-950/20' : ''
                                }`}
                              >
                                <td className="p-2.5 text-center">
                                  <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={() => handleToggleSelect(student.id)}
                                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                  />
                                </td>
                                <td className="p-2.5 whitespace-nowrap">
                                  {renderStatusBadge(student.status)}
                                </td>
                                <td className="p-2.5 whitespace-nowrap font-mono text-[11px]">
                                  <div className="font-semibold text-slate-900 dark:text-white">
                                    {student.nisn || '-'}
                                  </div>
                                  <div className="text-[10px] text-slate-400">
                                    NIK: {student.nik || '-'}
                                  </div>
                                </td>
                                <td className="p-2.5 font-medium text-slate-900 dark:text-slate-100">
                                  {student.dapodikRaw?.nama || student.nama}
                                </td>
                                <td className="p-2.5 font-medium">
                                  {student.absentaRaw ? (
                                    <span
                                      className={
                                        student.diffs.some((d) => d.field === 'nama_siswa')
                                          ? 'text-amber-700 dark:text-amber-300 font-bold bg-amber-50 dark:bg-amber-950/40 px-1 py-0.5 rounded'
                                          : 'text-slate-900 dark:text-slate-100'
                                      }
                                    >
                                      {student.absentaRaw.nama_siswa}
                                    </span>
                                  ) : (
                                    <span className="text-slate-400 italic">Belum terdaftar</span>
                                  )}
                                </td>
                                <td className="p-2.5 whitespace-nowrap text-slate-600 dark:text-slate-400">
                                  {student.dapodikRaw?.nama_rombel || student.dapodikRaw?.rombel || '-'}
                                </td>
                                <td className="p-2.5 whitespace-nowrap">
                                  {student.absentaRaw?.SiswaAkademik?.[0]?.kelas?.nama_kelas ? (
                                    <span
                                      className={
                                        student.diffs.some((d) => d.field === 'kelas')
                                          ? 'text-amber-700 dark:text-amber-300 font-bold bg-amber-50 dark:bg-amber-950/40 px-1 py-0.5 rounded'
                                          : 'text-slate-600 dark:text-slate-400'
                                      }
                                    >
                                      {student.absentaRaw.SiswaAkademik[0].kelas.nama_kelas}
                                    </span>
                                  ) : (
                                    <span className="text-slate-400">-</span>
                                  )}
                                </td>
                                <td className="p-2.5">
                                  {student.diffs.length > 0 ? (
                                    <div className="flex flex-wrap gap-1">
                                      {student.diffs.map((d) => (
                                        <span
                                          key={d.field}
                                          className="px-1.5 py-0.5 text-[9px] font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 rounded border border-amber-200 dark:border-amber-800/40"
                                        >
                                          {d.label}
                                        </span>
                                      ))}
                                    </div>
                                  ) : student.status === 'MATCH' ? (
                                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                                      Sesuai
                                    </span>
                                  ) : (
                                    <span className="text-[10px] text-slate-400">-</span>
                                  )}
                                </td>
                                <td className="p-2.5 text-right whitespace-nowrap">
                                  <div className="flex items-center justify-end gap-1">
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => setInspectedStudent(student)}
                                      className="h-7 px-2 text-[11px] text-slate-500 hover:text-slate-900"
                                      title="Lihat Perbandingan Lengkap"
                                    >
                                      <Eye className="w-3.5 h-3.5" />
                                    </Button>

                                    {student.status === 'MISMATCH' && student.absentaRaw && (
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() =>
                                          syncMutation.mutate({
                                            action: 'UPDATE_SELECTED',
                                            students: [
                                              {
                                                absentaId: student.absentaRaw.id,
                                                nisn: student.dapodikRaw?.nisn || student.nisn,
                                                nik: student.dapodikRaw?.nik || student.nik || undefined,
                                                nis: student.dapodikRaw?.registrasi_peserta_didik?.nipd || student.nis || undefined,
                                                nama: student.dapodikRaw?.nama || student.nama,
                                                jenis_kelamin: student.dapodikRaw?.jenis_kelamin || student.jenis_kelamin,
                                                tempat_lahir: student.dapodikRaw?.tempat_lahir || student.tempat_lahir || undefined,
                                                tanggal_lahir: student.dapodikRaw?.tanggal_lahir || student.tanggal_lahir || undefined,
                                              },
                                            ],
                                          })
                                        }
                                        disabled={syncMutation.isPending}
                                        className="h-7 px-2 text-[11px] font-semibold text-amber-700 dark:text-amber-400 hover:bg-amber-50"
                                      >
                                        Update Absenta
                                      </Button>
                                    )}

                                    {student.status === 'DAPODIK_ONLY' && (
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() =>
                                          syncMutation.mutate({
                                            action: 'IMPORT_SELECTED',
                                            students: [
                                              {
                                                nisn: student.nisn,
                                                nik: student.nik || undefined,
                                                nis: student.nis || undefined,
                                                nama: student.nama,
                                                jenis_kelamin: student.jenis_kelamin,
                                                tempat_lahir: student.tempat_lahir || undefined,
                                                tanggal_lahir: student.tanggal_lahir || undefined,
                                                rombel: student.rombel || undefined,
                                              },
                                            ],
                                          })
                                        }
                                        disabled={syncMutation.isPending}
                                        className="h-7 px-2 text-[11px] font-semibold text-blue-700 dark:text-blue-400 hover:bg-blue-50"
                                      >
                                        Import
                                      </Button>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    {/* SHOPEE-GRADE HIGH PERFORMANCE PAGINATION BAR */}
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 text-xs">
                      <div className="text-slate-500 text-[11px]">
                        Menampilkan <strong className="text-slate-800 dark:text-slate-200">{filteredStudents.length > 0 ? startIndex + 1 : 0}</strong>–<strong className="text-slate-800 dark:text-slate-200">{endIndex}</strong> dari <strong className="text-slate-800 dark:text-slate-200">{filteredStudents.length.toLocaleString('id-ID')}</strong> siswa
                        <span className="text-slate-400 ml-1.5">(Halaman {currentPage} dari {totalPages})</span>
                      </div>

                      <div className="flex items-center gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setCurrentPage(1)}
                          disabled={currentPage === 1}
                          className="h-7 w-7 p-0"
                          title="Halaman Pertama"
                        >
                          <ChevronsLeft className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                          disabled={currentPage === 1}
                          className="h-7 w-7 p-0"
                          title="Halaman Sebelumnya"
                        >
                          <ChevronLeft className="w-3.5 h-3.5" />
                        </Button>

                        {/* Page Numbers */}
                        <div className="flex items-center gap-1 px-1">
                          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                            let pageNum = currentPage;
                            if (totalPages <= 5) {
                              pageNum = i + 1;
                            } else if (currentPage <= 3) {
                              pageNum = i + 1;
                            } else if (currentPage >= totalPages - 2) {
                              pageNum = totalPages - 4 + i;
                            } else {
                              pageNum = currentPage - 2 + i;
                            }

                            return (
                              <button
                                key={pageNum}
                                type="button"
                                onClick={() => setCurrentPage(pageNum)}
                                className={`h-7 min-w-7 px-2 rounded-lg text-xs font-semibold transition-colors ${
                                  currentPage === pageNum
                                    ? 'bg-indigo-600 text-white shadow-xs'
                                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800'
                                }`}
                              >
                                {pageNum}
                              </button>
                            );
                          })}
                        </div>

                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                          disabled={currentPage === totalPages}
                          className="h-7 w-7 p-0"
                          title="Halaman Berikutnya"
                        >
                          <ChevronRight className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setCurrentPage(totalPages)}
                          disabled={currentPage === totalPages}
                          className="h-7 w-7 p-0"
                          title="Halaman Terakhir"
                        >
                          <ChevronsRight className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </>
          )}
        </TabsContent>

        {/* ════════════════════════════════════════════════════════════════════
            TAB 2: PENGATURAN KONEKSI & TOKEN DAPODIK
        ════════════════════════════════════════════════════════════════════ */}
        <TabsContent value="connection" className="space-y-4 pt-1">
          {/* WHITELIST SERVER CARD (CLEANLY PLACED HERE) */}
          <SectionCard className="p-4 bg-gradient-to-r from-blue-50/60 to-indigo-50/40 dark:from-slate-800/80 dark:to-indigo-950/20 border-indigo-100 dark:border-indigo-900/40 space-y-3">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    IP Server Absenta untuk Whitelist Dapodik
                  </h3>
                  <span className="px-2 py-0.5 text-[10px] font-semibold tracking-wide bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-400 rounded-full border border-emerald-200 dark:border-emerald-800/40">
                    Wajib Didaftarkan
                  </span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 max-w-2xl leading-relaxed">
                  Web Service Dapodik hanya menerima panggilan dari IP yang didaftarkan. Masukkan IP di bawah ini pada menu 
                  <strong className="text-slate-800 dark:text-slate-200"> Pengaturan &gt; Web Service </strong> di aplikasi Dapodik lokal operator.
                </p>
              </div>

              <div className="flex items-center gap-2 bg-white dark:bg-slate-800 border border-indigo-200/80 dark:border-indigo-900/50 rounded-xl p-1.5 shadow-xs shrink-0">
                <code className="px-3 py-1 font-mono text-sm font-bold text-indigo-700 dark:text-indigo-400 tracking-wider">
                  {primaryServerIp}
                </code>
                <Button
                  size="sm"
                  variant={copiedIp ? "primary" : "outline"}
                  onClick={handleCopyIp}
                  className="gap-1.5 h-8 text-xs font-semibold"
                >
                  {copiedIp ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiedIp ? 'Tersalin' : 'Salin IP'}
                </Button>
              </div>
            </div>
          </SectionCard>

          <SectionCard className="max-w-2xl space-y-5">
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Key className="w-4 h-4 text-indigo-600" />
                Formulir Koneksi Web Service Dapodik
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Konfigurasikan alamat host dan token autentikasi Web Service Dapodik lokal port 5774.
              </p>
            </div>

            <div className="space-y-3.5">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Host / Alamat Web Service Dapodik
                </label>
                <Input
                  placeholder="http://10.10.10.50:5774"
                  value={configForm.dapodik_host}
                  onChange={(e) => setConfigForm({ ...configForm, dapodik_host: e.target.value })}
                  className="font-mono text-xs h-9"
                />
                <p className="text-[11px] text-slate-400">
                  Masukkan URL komputer operator Dapodik (misal: <code>http://10.10.10.50:5774</code>).
                </p>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  NPSN Sekolah
                </label>
                <Input
                  placeholder="Contoh: 20229659"
                  value={configForm.npsn}
                  onChange={(e) => setConfigForm({ ...configForm, npsn: e.target.value })}
                  className="font-mono text-xs h-9"
                />
                <p className="text-[11px] text-slate-400">
                  NPSN sekolah digunakan sebagai parameter query wajib pemanggilan API Dapodik.
                </p>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Token Web Service Dapodik
                </label>
                <div className="relative">
                  <Input
                    type={showToken ? 'text' : 'password'}
                    placeholder="Masukkan Token Web Service Dapodik..."
                    value={configForm.api_token}
                    onChange={(e) => setConfigForm({ ...configForm, api_token: e.target.value })}
                    className="font-mono text-xs pr-10 h-9"
                  />
                  <button
                    type="button"
                    onClick={() => setShowToken(!showToken)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-[11px] text-slate-400">
                  Didapatkan dari menu Pengaturan &gt; Web Service pada aplikasi Dapodik setelah mendaftarkan IP Server Absenta.
                </p>
              </div>

              <div className="flex items-center gap-2.5 pt-2">
                <Button
                  variant="outline"
                  onClick={handleTestConnection}
                  disabled={isTesting || !configForm.dapodik_host || !configForm.npsn || !configForm.api_token}
                  className="gap-2 font-semibold text-xs h-8"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isTesting ? 'animate-spin' : ''}`} />
                  {isTesting ? 'Menguji Koneksi...' : 'Uji Koneksi (Handshake)'}
                </Button>

                <Button
                  variant="primary"
                  onClick={() => saveMutation.mutate(configForm)}
                  disabled={saveMutation.isPending || !configForm.dapodik_host || !configForm.npsn || !configForm.api_token}
                  className="gap-2 font-semibold text-xs h-8"
                >
                  {saveMutation.isPending ? 'Menyimpan...' : 'Simpan Konfigurasi'}
                </Button>
              </div>

              {testResult && (
                <div
                  className={`p-3.5 rounded-xl border space-y-2 mt-3 text-xs ${
                    testResult.success
                      ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/40 text-emerald-900 dark:text-emerald-200'
                      : 'bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800/40 text-rose-900 dark:text-rose-200'
                  }`}
                >
                  <div className="flex items-center gap-2 font-bold text-xs">
                    {testResult.success ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-rose-600" />
                    )}
                    <span>{testResult.message}</span>
                  </div>

                  {testResult.schoolInfo && (
                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-emerald-200/60 dark:border-emerald-800/40 text-[11px]">
                      <div>
                        <span className="text-[10px] text-slate-500 uppercase font-semibold">Nama Sekolah:</span>
                        <div className="font-bold">{testResult.schoolInfo.nama}</div>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 uppercase font-semibold">NPSN:</span>
                        <div className="font-mono font-bold">{testResult.schoolInfo.npsn}</div>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 uppercase font-semibold">Bentuk / Status:</span>
                        <div>{testResult.schoolInfo.bentuk_pendidikan} ({testResult.schoolInfo.status_sekolah})</div>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 uppercase font-semibold">Kecamatan:</span>
                        <div>{testResult.schoolInfo.kecamatan}</div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </SectionCard>
        </TabsContent>

        {/* ════════════════════════════════════════════════════════════════════
            TAB 3: PANDUAN PENDAFTARAN & TROUBLESHOOTING
        ════════════════════════════════════════════════════════════════════ */}
        <TabsContent value="guide" className="space-y-4 pt-1">
          <SectionCard className="max-w-3xl space-y-4">
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-indigo-600" />
                Panduan Menghubungkan Dapodik ke Absenta
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Ikuti 3 langkah di bawah ini untuk mengaktifkan integrasi di komputer operator Dapodik:
              </p>
            </div>

            <div className="space-y-3 text-xs text-slate-700 dark:text-slate-300">
              <div className="flex items-start gap-3 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700">
                <span className="w-5 h-5 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center shrink-0 text-[11px]">
                  1
                </span>
                <div className="space-y-0.5">
                  <strong className="text-slate-900 dark:text-white">Buka Aplikasi Dapodik Lokal</strong>
                  <p className="text-slate-600 dark:text-slate-400">
                    Buka browser di komputer operator Dapodik dan akses <code className="bg-slate-200 dark:bg-slate-700 px-1 py-0.5 rounded">http://localhost:5774</code>. Login menggunakan akun Operator Sekolah.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700">
                <span className="w-5 h-5 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center shrink-0 text-[11px]">
                  2
                </span>
                <div className="space-y-0.5">
                  <strong className="text-slate-900 dark:text-white">Daftarkan Aplikasi di Menu Web Service</strong>
                  <p className="text-slate-600 dark:text-slate-400">
                    Masuk ke menu <strong>Pengaturan</strong> &gt; pilih <strong>Web Service</strong> &gt; klik tombol <strong>Tambah</strong>.
                  </p>
                  <ul className="list-disc list-inside space-y-0.5 pt-1 text-slate-600 dark:text-slate-400">
                    <li><strong>Nama Aplikasi:</strong> Absenta Platform</li>
                    <li>
                      <strong>IP Address:</strong> Masukkan IP Server Absenta: <strong className="text-indigo-600 dark:text-indigo-400 font-mono">{primaryServerIp}</strong>
                    </li>
                  </ul>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700">
                <span className="w-5 h-5 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center shrink-0 text-[11px]">
                  3
                </span>
                <div className="space-y-0.5">
                  <strong className="text-slate-900 dark:text-white">Salin Token Key yang Dihasilkan</strong>
                  <p className="text-slate-600 dark:text-slate-400">
                    Setelah disimpan, sistem Dapodik akan menghasilkan sebuah <strong>Token / Key</strong> unik. Salin token tersebut dan tempelkan pada formulir di Tab Pengaturan Koneksi platform Absenta ini.
                  </p>
                </div>
              </div>
            </div>

            <div className="p-3 bg-amber-50 dark:bg-amber-950/30 rounded-xl border border-amber-200 dark:border-amber-800/40 space-y-1.5">
              <h4 className="text-xs font-bold text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
                <ShieldAlert className="w-3.5 h-3.5 text-amber-600" />
                Tips Mengatasi Masalah Koneksi (Troubleshooting):
              </h4>
              <ul className="list-disc list-inside space-y-0.5 text-[11px] text-amber-800 dark:text-amber-300">
                <li>Pastikan Service Windows <strong>DapodikDB</strong> dan <strong>DapodikWebSvc</strong> di komputer operator berstatus <em>Running</em>.</li>
                <li>Jika server Absenta dan komputer Dapodik berada di LAN sekolah, pastikan firewall Windows di komputer operator mengizinkan inbound port 5774 dari IP {primaryServerIp}.</li>
                <li>Jika status tes koneksi mengembalikan 401/403, pastikan Token sudah sesuai dan IP yang didaftarkan di Dapodik sama persis dengan IP Server Absenta ({primaryServerIp}).</li>
              </ul>
            </div>
          </SectionCard>
        </TabsContent>
      </Tabs>

      {/* ─── MODAL DETAIL INTIP RAW COMPARISON ─── */}
      {inspectedStudent && (
        <Modal
          isOpen={Boolean(inspectedStudent)}
          onClose={() => setInspectedStudent(null)}
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
                  <div>NIS: {inspectedStudent.dapodikRaw?.registrasi_peserta_didik?.nipd || inspectedStudent.nis || '-'}</div>
                  <div>Tempat Lahir: {inspectedStudent.dapodikRaw?.tempat_lahir || '-'}</div>
                  <div>Tgl Lahir: {inspectedStudent.dapodikRaw?.tanggal_lahir || '-'}</div>
                  <div>Rombel: {inspectedStudent.dapodikRaw?.nama_rombel || '-'}</div>
                </div>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl space-y-1">
                <span className="font-bold text-[11px] text-indigo-600 uppercase">Data Absenta</span>
                <div className="space-y-1 text-slate-600 dark:text-slate-300">
                  <div>NIS: {inspectedStudent.absentaRaw?.nis || '-'}</div>
                  <div>Tempat Lahir: {inspectedStudent.absentaRaw?.tempat_lahir || '-'}</div>
                  <div>Tgl Lahir: {inspectedStudent.absentaRaw?.tanggal_lahir ? new Date(inspectedStudent.absentaRaw.tanggal_lahir).toLocaleDateString('id-ID') : '-'}</div>
                  <div>Kelas: {inspectedStudent.absentaRaw?.SiswaAkademik?.[0]?.kelas?.nama_kelas || '-'}</div>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <Button variant="outline" onClick={() => setInspectedStudent(null)}>
                Tutup
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* MODAL KONFIRMASI AKSI MASSAL (STANDARD FEEDBACK GUARD - PILAR 15) */}
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
      {/* MODAL CETAK BERITA ACARA RESMI (WYSIWYG PDF / CETAK - STANDAR UNIVERSAL DOCUMENT) */}
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
    </div>
  );
};

export default DapodikIntegrationView;
