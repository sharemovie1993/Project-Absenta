import React, { useMemo, useState, useEffect, useCallback, lazy, Suspense } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ShieldCheck, GraduationCap, Award } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button, SectionCard } from '@/components/ui';
import { hubinApi } from '@/api/hubin.api';
import { toast } from 'sonner';
import { useDudiOptions } from '@/hooks/useDudiOptions';
import { useJurusanOptions } from '@/hooks/useJurusanOptions';
import { useAcademicFilter } from '@/components/common/academic-filter';
import { useAuthStore } from '@/store/authStore';
import { useIsMobile } from '@/hooks/useIsMobile';
import { useCapabilities } from '@/hooks/useCapabilities';
import { 
  scoreFieldSchema, 
  ScoreRow, 
  RawPklItem, 
  calculateNilaiAkhirPkl,
  HubinAssessmentSettings
} from './types';

// Subcomponents
import { PklUnifiedToolbar } from './PklUnifiedToolbar';
import { PklSpreadsheetSkeleton } from './PklSpreadsheetSkeleton';
import { cn } from '@/lib/utils';

const PklNilaiIndustriTab = lazy(() => import('./PklNilaiIndustriTab'));
const PklNilaiSidangTab = lazy(() => import('./PklNilaiSidangTab'));
const PklSkemaSettingsModal = lazy(() => import('./PklSkemaSettingsModal'));

export interface UniversalNilaiPklViewProps {
  jurusanId?: string;
  jurusanNama?: string;
  kelasId?: string;
  guruId?: string;
  tahunPelajaranId?: string;
  semesterId?: string;
  initialTab?: 'dudi' | 'sidang';
  layoutMode?: 'hubin' | 'rapor';
  isModal?: boolean;
  readOnly?: boolean;
  hideHeaderStats?: boolean;
  hideScopeBanner?: boolean;
  onClose?: () => void;
  className?: string;
}

export const NilaiPklView: React.FC<UniversalNilaiPklViewProps> = React.memo(({
  jurusanId: propJurusanId,
  jurusanNama: propJurusanNama,
  kelasId: propKelasId,
  guruId: propGuruId,
  tahunPelajaranId: propTpId,
  semesterId: propSemesterId,
  initialTab = 'dudi',
  layoutMode = 'hubin',
  isModal = false,
  readOnly = false,
  hideHeaderStats = false,
  hideScopeBanner = false,
  onClose,
  className
}) => {
  const isMobile = useIsMobile(768);
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<string>(initialTab === 'sidang' ? 'sidang' : 'dudi');
  const [selectedKelas, setSelectedKelas] = useState(propKelasId || '');
  const [selectedMitra, setSelectedMitra] = useState('');
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  useEffect(() => {
    if (propKelasId) setSelectedKelas(propKelasId);
  }, [propKelasId]);

  // Settings Form State
  const [formMode, setFormMode] = useState<'DUDI_ONLY' | 'COMPOSITE'>('DUDI_ONLY');
  const [formWeightDudi, setFormWeightDudi] = useState<number>(70);
  const [formWeightLaporan, setFormWeightLaporan] = useState<number>(15);
  const [formWeightSidang, setFormWeightSidang] = useState<number>(15);

  // Role Scoping & Multi-Tenant Isolation
  const { user } = useAuthStore();
  const tenantId = user?.tenant_id || 'default';
  const { can, isKaprog, kaprogJurusan, isWaliKelas, walikelasKelas, activeGuruId: capActiveGuruId, isHubin } = useCapabilities();

  // Priority to explicit prop
  const effectiveJurusanId = propJurusanId || (isKaprog && kaprogJurusan?.id ? kaprogJurusan.id : undefined);
  const effectiveJurusanNama = propJurusanNama || kaprogJurusan?.nama || 'Kejuruan';
  const isJurusanScoped = Boolean(effectiveJurusanId);

  const isPrivilegedHubin = !readOnly && (can('hubin.partners.manage') || user?.role?.name === 'ADMIN' || user?.role?.name === 'SUPERADMIN' || can('hubin.pkl.manage') || isKaprog || isHubin || Boolean(propJurusanId));
  const canManageAll = isPrivilegedHubin || isWaliKelas;
  
  const typedUser = user as { guru_profile?: { id?: string }; guru_id?: string; Guru?: { id?: string } } | null;
  const activeGuruId = propGuruId || capActiveGuruId || typedUser?.guru_profile?.id || typedUser?.guru_id || typedUser?.Guru?.id || null;
  const canEditScheme = !readOnly && (can('hubin.partners.manage') || user?.role?.name === 'ADMIN' || user?.role?.name === 'SUPERADMIN');
  const canViewScheme = canEditScheme || can('hubin.guidance.manage') || Boolean(activeGuruId) || isKaprog || isWaliKelas || isHubin;
  
  const [guidanceScope, setGuidanceScope] = useState<'ALL' | 'MY_GUIDANCE'>(canManageAll ? 'ALL' : 'MY_GUIDANCE');
  const [statusFilter, setStatusFilter] = useState<'ELIGIBLE' | 'AKTIF' | 'SELESAI' | 'ALL'>('ELIGIBLE');

  useEffect(() => {
    if (isMobile) {
      setStatusFilter('ELIGIBLE');
    }
  }, [isMobile]);

  useEffect(() => {
    if (!canManageAll) {
      setGuidanceScope('MY_GUIDANCE');
    }
  }, [canManageAll]);

  // Academic Context Terpusat
  const academicFilter = useAcademicFilter({
    enableTp: true,
    enableSemester: true,
    initialTpId: propTpId || '',
    initialSemesterId: propSemesterId || '',
    onTpChange: () => setSelectedKelas(''),
  });

  const {
    values: { tahunPelajaranId: selectedTp, semesterId: selectedSemester },
    handleTpChange: setSelectedTp,
    setSemesterId: setSelectedSemester,
    tpOptions,
    semesterOptions,
    isLoadingTp,
    isLoadingSem,
  } = academicFilter;

  // Single SSOT Query
  const { data: pklRekapResponse, isLoading: isLoadingRekap } = useQuery({
    queryKey: ['pkl-rekap', tenantId, selectedTp, selectedSemester, statusFilter, effectiveJurusanId],
    queryFn: () =>
      hubinApi.getRekapPklSiswa({
        tahun_pelajaran_id: selectedTp || undefined,
        semester_id: selectedSemester || undefined,
        status: statusFilter === 'ALL' ? undefined : statusFilter,
      }),
    staleTime: 60 * 1000,
  });

  const rawList = useMemo<RawPklItem[]>(() => {
    const rawResponse = pklRekapResponse as { data?: RawPklItem[] | { list?: RawPklItem[] } } | RawPklItem[] | undefined;
    if (Array.isArray((rawResponse as { data?: RawPklItem[] })?.data)) {
      return (rawResponse as { data: RawPklItem[] }).data;
    }
    if (Array.isArray(rawResponse)) {
      return rawResponse;
    }
    return (rawResponse as { data?: { list?: RawPklItem[] } })?.data?.list || [];
  }, [pklRekapResponse]);

  const { data: hubinSettings } = useQuery({
    queryKey: ['hubin-settings', tenantId, selectedTp],
    queryFn: () => hubinApi.getSettings({ tahun_pelajaran_id: selectedTp || undefined }),
  });

  const effectiveSettings = useMemo((): HubinAssessmentSettings | undefined => {
    const raw = hubinSettings as { data?: HubinAssessmentSettings } & HubinAssessmentSettings | undefined;
    return raw?.data ?? raw;
  }, [hubinSettings]);

  const isCompositeMode = effectiveSettings?.assessmentMode === 'COMPOSITE';

  useEffect(() => {
    if (effectiveSettings) {
      setFormMode(effectiveSettings.assessmentMode || 'DUDI_ONLY');
      setFormWeightDudi(effectiveSettings.weightDudi ?? 70);
      setFormWeightLaporan(effectiveSettings.weightLaporan ?? 15);
      setFormWeightSidang(effectiveSettings.weightSidang ?? 15);
    }
  }, [effectiveSettings]);

  useEffect(() => {
    if (!isCompositeMode && activeTab === 'sidang') {
      setActiveTab('dudi');
    }
  }, [isCompositeMode, activeTab]);

  const updateSettingsMutation = useMutation({
    mutationFn: (data: Parameters<typeof hubinApi.updateSettings>[0]) => hubinApi.updateSettings(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hubin-settings', tenantId] });
      queryClient.invalidateQueries({ queryKey: ['pkl-rekap', tenantId] });
      queryClient.invalidateQueries({ queryKey: ['rapor', tenantId] });
      toast.success('Pengaturan skema & bobot penilaian PKL berhasil disimpan!');
      setShowSettingsModal(false);
    },
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : 'Gagal menyimpan pengaturan bobot PKL');
    },
  });

  const [scores, setScores] = useState<ScoreRow[]>([]);

  useEffect(() => {
    if (Array.isArray(rawList)) {
      setScores(rawList?.map((item: RawPklItem) => ({
        siswa_pkl_id: item.id || item.siswa_pkl_id || '',
        nama_siswa: item.Siswa?.nama_siswa || item.siswa_nama || '',
        nis: item.Siswa?.nis || item.nis || '',
        foto: item.Siswa?.foto || null,
        kelas_id: item.Siswa?.Kelas?.id || item.Siswa?.kelas_id || item.SiswaAkademik?.kelas_id || '',
        nama_kelas: item.Siswa?.Kelas?.nama_kelas || item.SiswaAkademik?.kelas?.nama_kelas || '',
        jurusan_id: item.Siswa?.jurusan_id || (item.Siswa?.Kelas as any)?.jurusan_id || (item.SiswaAkademik?.kelas as any)?.jurusan_id || '',
        mitra_nama: item.Mitra?.nama || item.mitra_nama || '-',
        instruktur_nama: item.instruktur_nama || '',
        penanggung_jawab_nama: item.penanggung_jawab_nama || '',
        alamat_dudi: item.alamat_dudi || item.Mitra?.alamat || '',
        hard_kompetensi_teknis: item.hard_kompetensi_teknis ?? null,
        hard_sop_k3lh: item.hard_sop_k3lh ?? null,
        hard_alur_bisnis: item.hard_alur_bisnis ?? null,
        soft_kedisiplinan: item.soft_kedisiplinan ?? null,
        soft_kerajinan_inisiatif: item.soft_kerajinan_inisiatif ?? null,
        soft_kerjasama: item.soft_kerjasama ?? null,
        soft_kejujuran: item.soft_kejujuran ?? null,
        soft_tanggung_jawab: item.soft_tanggung_jawab ?? null,
        nilai_laporan: item.nilai_json?.nilai_laporan ?? null,
        nilai_sidang: item.nilai_json?.nilai_sidang ?? null,
        penguji_nama: item.nilai_json?.penguji_nama || item.Pembimbing?.nama_guru || '',
        catatan_sidang: item.nilai_json?.catatan_sidang || '',
        file_portofolio: item.jurnal_json?.file_url || null,
        nilai_akhir_pkl: item.nilai_akhir_pkl ?? null,
        predikat_pkl: item.predikat_pkl || '-',
        catatan_pkl: item.catatan_pkl || '',
        sakit_pkl: item.sakit_pkl !== null && item.sakit_pkl !== undefined && item.sakit_pkl > 0 ? item.sakit_pkl : (item.auto_sakit ?? 0),
        izin_pkl: item.izin_pkl !== null && item.izin_pkl !== undefined && item.izin_pkl > 0 ? item.izin_pkl : (item.auto_izin ?? 0),
        alpa_pkl: item.alpa_pkl !== null && item.alpa_pkl !== undefined && item.alpa_pkl > 0 ? item.alpa_pkl : (item.auto_alpa ?? 0),
        auto_sakit: item.auto_sakit ?? 0,
        auto_izin: item.auto_izin ?? 0,
        auto_alpa: item.auto_alpa ?? 0,
        auto_hadir: item.auto_hadir ?? 0,
        nomor_sertifikat: item.nomor_sertifikat || '',
        deskripsi_tp: item.deskripsi_tp || '',
        status: item.status || 'AKTIF',
        pembimbing_id: item.Pembimbing?.id,
      })));
    }
  }, [rawList]);

  const smartClassOptions = useMemo(() => {
    const map = new Map<string, { id: string; name: string; count: number }>();
    let itemsForOptions = rawList;

    if (guidanceScope === 'ALL' && isWaliKelas && !isPrivilegedHubin && walikelasKelas?.id && !effectiveJurusanId) {
      itemsForOptions = rawList.filter((item) => {
        const kId = item.Siswa?.Kelas?.id || item.Siswa?.kelas_id || item.SiswaAkademik?.kelas_id;
        return kId === walikelasKelas.id;
      });
    } else if (guidanceScope === 'MY_GUIDANCE' && activeGuruId) {
      itemsForOptions = rawList.filter((item) => item.Pembimbing?.id === activeGuruId);
    } else if (isJurusanScoped) {
      const jIdTarget = effectiveJurusanId;
      const jSingkatan = (kaprogJurusan?.singkatan || '').toLowerCase();
      itemsForOptions = rawList.filter((item) => {
        const jId = item.Siswa?.jurusan_id || (item.Siswa?.Kelas as any)?.jurusan_id || (item.SiswaAkademik?.kelas as any)?.jurusan_id;
        if (jIdTarget && jId === jIdTarget) return true;
        const kName = (item.Siswa?.Kelas?.nama_kelas || item.SiswaAkademik?.kelas?.nama_kelas || '').toLowerCase();
        if (jSingkatan && kName.includes(jSingkatan)) return true;
        return false;
      });
    }

    itemsForOptions.forEach((item) => {
      const kId = item.Siswa?.Kelas?.id || item.Siswa?.kelas_id || item.SiswaAkademik?.kelas_id;
      const kName = item.Siswa?.Kelas?.nama_kelas || item.SiswaAkademik?.kelas?.nama_kelas;
      if (kId && kName) {
        const existing = map.get(kId);
        if (existing) {
          existing.count++;
        } else {
          map.set(kId, { id: kId, name: kName, count: 1 });
        }
      }
    });

    return Array.from(map.values())
      ?.sort((a, b) => a.name.localeCompare(b.name))
      ?.map((k) => ({
        value: k.id,
        label: `${k.name} (${k.count} Siswa)`,
      })) || [];
  }, [rawList, guidanceScope, isWaliKelas, isPrivilegedHubin, walikelasKelas, activeGuruId, isJurusanScoped, effectiveJurusanId, kaprogJurusan]);

  const displayedScores = useMemo(() => {
    let filtered = scores;
    if (guidanceScope === 'ALL' && isWaliKelas && !isPrivilegedHubin && walikelasKelas?.id && !effectiveJurusanId) {
      filtered = filtered.filter((s) => s.kelas_id === walikelasKelas.id);
    }
    if (guidanceScope === 'MY_GUIDANCE' && activeGuruId) {
      filtered = filtered.filter((s) => s.pembimbing_id === activeGuruId);
    }
    if (isJurusanScoped) {
      const jIdTarget = effectiveJurusanId;
      const jSingkatan = (kaprogJurusan?.singkatan || '').toLowerCase();
      filtered = filtered.filter((s) => {
        if (jIdTarget && (s as any).jurusan_id === jIdTarget) return true;
        const kelasLower = (s.nama_kelas || '').toLowerCase();
        if (jSingkatan && kelasLower.includes(jSingkatan)) return true;
        return false;
      });
    }
    if (!selectedKelas) return filtered;
    return filtered.filter((s) => s.kelas_id === selectedKelas);
  }, [scores, selectedKelas, guidanceScope, activeGuruId, isWaliKelas, isPrivilegedHubin, walikelasKelas, isJurusanScoped, effectiveJurusanId, kaprogJurusan]);

  const allScopedCount = useMemo(() => {
    if (isWaliKelas && !isPrivilegedHubin && walikelasKelas?.id && !effectiveJurusanId) {
      return rawList.filter((item: RawPklItem) => {
        const kId = item.Siswa?.Kelas?.id || item.Siswa?.kelas_id || item.SiswaAkademik?.kelas_id;
        return kId === walikelasKelas.id;
      }).length;
    }
    if (isJurusanScoped) {
      const jIdTarget = effectiveJurusanId;
      const jSingkatan = (kaprogJurusan?.singkatan || '').toLowerCase();
      return rawList.filter((item: RawPklItem) => {
        const jId = item.Siswa?.jurusan_id || (item.Siswa?.Kelas as any)?.jurusan_id || (item.SiswaAkademik?.kelas as any)?.jurusan_id;
        if (jIdTarget && jId === jIdTarget) return true;
        const kName = (item.Siswa?.Kelas?.nama_kelas || item.SiswaAkademik?.kelas?.nama_kelas || '').toLowerCase();
        if (jSingkatan && kName.includes(jSingkatan)) return true;
        return false;
      }).length;
    }
    return rawList.length;
  }, [rawList, isWaliKelas, isPrivilegedHubin, walikelasKelas, isJurusanScoped, effectiveJurusanId, kaprogJurusan]);

  const myGuidanceCountNilai = useMemo(() => {
    if (!activeGuruId) return 0;
    return rawList.filter((item: RawPklItem) => {
      const pId = item.Pembimbing?.id;
      return pId === activeGuruId;
    }).length;
  }, [rawList, activeGuruId]);

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  useEffect(() => {
    setCurrentPage(1);
  }, [selectedKelas, selectedTp, selectedSemester, guidanceScope, statusFilter]);

  const totalItems = displayedScores.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const paginatedScores = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return displayedScores.slice(start, start + itemsPerPage);
  }, [displayedScores, currentPage, itemsPerPage]);

  const saveBatchMutation = useMutation({
    mutationFn: hubinApi.upsertNilaiPklBatch,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pkl-rekap'] });
      queryClient.invalidateQueries({ queryKey: ['rapor'] });
      queryClient.invalidateQueries({ queryKey: ['penempatan-pkl'] });
      queryClient.invalidateQueries({ queryKey: ['kaprog-pkl-summary'] });
      queryClient.invalidateQueries({ queryKey: ['kaprog-stats'] });
      toast.success('Nilai PKL, identitas instruktur, dan presensi berhasil disimpan!');
    },
    onError: (err: any) => {
      console.error('Error saving batch nilai PKL:', err);
      const msg = err?.response?.data?.message || err?.message || 'Gagal menyimpan nilai PKL';
      toast.error(msg);
    }
  });

  const handleScoreChange = useCallback((siswaPklId: string, field: keyof ScoreRow, val: string | number | null) => {
    if (readOnly) return;
    setScores(prev => {
      const clone = [...(prev || [])];
      const index = clone.findIndex(s => s.siswa_pkl_id === siswaPklId);
      if (index === -1) return prev;
      const target = { ...clone[index] };

      if (field.startsWith('hard_') || field.startsWith('soft_') || field === 'nilai_laporan' || field === 'nilai_sidang') {
        const parsedVal = val === '' || val === null ? null : Math.min(100, Math.max(0, parseFloat(String(val)) || 0));
        scoreFieldSchema.parse(parsedVal);
        (target as Record<string, unknown>)[field] = parsedVal;

        const calculated = calculateNilaiAkhirPkl(target, effectiveSettings);
        target.nilai_akhir_pkl = calculated.nilai_akhir_pkl;
        target.predikat_pkl = calculated.predikat_pkl;
      } else if (field === 'sakit_pkl' || field === 'izin_pkl' || field === 'alpa_pkl') {
        const numVal = val === '' || val === null || val === undefined ? 0 : Math.max(0, parseInt(String(val), 10) || 0);
        (target as Record<string, unknown>)[field] = numVal;
      } else {
        (target as Record<string, unknown>)[field] = val;
      }

      clone[index] = target;
      return clone;
    });
  }, [effectiveSettings, readOnly]);

  const handleApplyToSameMitra = useCallback((mitraNama: string, instruktur: string, pic?: string) => {
    if (readOnly || !mitraNama || !instruktur) return;
    setScores(prev => prev?.map(s => {
      if (s.mitra_nama === mitraNama) {
        return {
          ...s,
          instruktur_nama: instruktur,
          ...(pic ? { penanggung_jawab_nama: pic } : {})
        };
      }
      return s;
    }) || []);
    toast.success(`Data instruktur diterapkan ke seluruh siswa di ${mitraNama}`);
  }, [readOnly]);

  const handleSyncFromDailyAttendance = useCallback(() => {
    if (readOnly) return;
    setScores(prev => prev?.map(s => ({
      ...s,
      sakit_pkl: s.auto_sakit ?? 0,
      izin_pkl: s.auto_izin ?? 0,
      alpa_pkl: s.auto_alpa ?? 0,
    })) || []);
    toast.success('Presensi PKL (S/I/A) berhasil ditarik & disinkronkan dari data absensi harian siswa!');
  }, [readOnly]);

  const handleNavigateCetakRapor = useCallback(() => {
    const params = new URLSearchParams();
    if (selectedKelas) params.set('kelas_id', selectedKelas);
    if (selectedTp) params.set('tahun_pelajaran_id', selectedTp);
    if (selectedSemester) params.set('semester_id', selectedSemester);
    const qs = params.toString();
    navigate(`/rapor/cetak${qs ? `?${qs}` : ''}`);
  }, [navigate, selectedKelas, selectedTp, selectedSemester]);

  const handleSaveBatch = useCallback(() => {
    if (readOnly) return;
    if (scores.length === 0) {
      toast.error('Tidak ada data siswa untuk disimpan');
      return;
    }
    // Strict Mode: Filter UI is ONLY for reading data. Do not pass filter state to grade batch write.
    saveBatchMutation.mutate({
      scores: scores?.map(s => ({
        siswa_pkl_id: s.siswa_pkl_id,
        hard_kompetensi_teknis: s.hard_kompetensi_teknis,
        hard_sop_k3lh: s.hard_sop_k3lh,
        hard_alur_bisnis: s.hard_alur_bisnis,
        soft_kedisiplinan: s.soft_kedisiplinan,
        soft_kerajinan_inisiatif: s.soft_kerajinan_inisiatif,
        soft_kerjasama: s.soft_kerjasama,
        soft_kejujuran: s.soft_kejujuran,
        soft_tanggung_jawab: s.soft_tanggung_jawab,
        nilai_laporan: s.nilai_laporan,
        nilai_sidang: s.nilai_sidang,
        penguji_nama: s.penguji_nama,
        catatan_sidang: s.catatan_sidang,
        nilai_akhir_pkl: s.nilai_akhir_pkl,
        predikat_pkl: s.predikat_pkl,
        catatan_pkl: s.catatan_pkl,
        sakit_pkl: Number(s.sakit_pkl) || 0,
        izin_pkl: Number(s.izin_pkl) || 0,
        alpa_pkl: Number(s.alpa_pkl) || 0,
        nomor_sertifikat: s.nomor_sertifikat,
        deskripsi_tp: s.deskripsi_tp,
        instruktur_nama: s.instruktur_nama,
        penanggung_jawab_nama: s.penanggung_jawab_nama,
        alamat_dudi: s.alamat_dudi
      })) || []
    });
  }, [scores, selectedTp, selectedSemester, saveBatchMutation, readOnly]);

  const tabs = useMemo(() => [
    { id: 'dudi', label: `🏢 DUDI (${displayedScores.length})` },
    ...(isCompositeMode ? [{ id: 'sidang', label: `🎓 Sidang (${displayedScores.length})` }] : []),
  ], [displayedScores.length, isCompositeMode]);

  return (
    <div className={cn('space-y-4', className)}>
      <SectionCard fullWidth className="flex flex-col w-full min-w-0 space-y-4 border-none shadow-none bg-transparent p-0">
        {/* Banner Khusus Kaprog: Hanya muncul jika bukan modal dan tidak di-hide */}
        {isJurusanScoped && !isModal && !hideScopeBanner && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 p-3 bg-indigo-50/80 dark:bg-indigo-950/30 border border-indigo-200/80 dark:border-indigo-900/50 rounded-2xl text-xs text-indigo-900 dark:text-indigo-200">
            <div className="flex items-center gap-2.5">
              <ShieldCheck size={18} className="text-indigo-600 dark:text-indigo-400 shrink-0" />
              <div>
                <span className="font-bold">Mode Ketua Program Keahlian (Kaprog):</span>{' '}
                <span>
                  Rekap nilai PKL dibatasi otomatis untuk Jurusan{' '}
                  <strong>{effectiveJurusanNama}</strong>.
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => navigate('/dashboard?tab=pkl')}
              className="self-start sm:self-auto inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-indigo-700 dark:text-indigo-300 bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-800 shadow-2xs hover:bg-indigo-50 dark:hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
              title="Buka Formulasi TP PKL di Dashboard Kaprog"
            >
              <GraduationCap size={13} />
              <span>Dashboard Kaprog (Formulasi TP) →</span>
            </button>
          </div>
        )}

        {isWaliKelas && !isKaprog && !isPrivilegedHubin && !isModal && !hideScopeBanner && (
          <div className="flex items-center gap-2.5 p-3 bg-emerald-50/80 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-900/50 rounded-2xl text-xs text-emerald-900 dark:text-emerald-200">
            <ShieldCheck size={18} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
            <div>
              <span className="font-bold">Mode Wali Kelas (Monitoring Kelas Binaan):</span>{' '}
              <span>
                Rekap nilai PKL disaring khusus untuk siswa kelas{' '}
                <strong>{walikelasKelas?.nama_kelas || 'Binaan Anda'}</strong>.
              </span>
            </div>
          </div>
        )}

        {/* Unified Control Toolbar Container */}
        <PklUnifiedToolbar
          selectedTp={selectedTp}
          selectedSemester={selectedSemester}
          setSelectedTp={setSelectedTp}
          setSelectedSemester={setSelectedSemester}
          tpOptions={tpOptions}
          semesterOptions={semesterOptions}
          isLoadingTp={isLoadingTp}
          isLoadingSem={isLoadingSem}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          tabs={tabs}
          canViewScheme={canViewScheme}
          canEditScheme={canEditScheme}
          isCompositeMode={isCompositeMode}
          effectiveSettings={effectiveSettings ? {
            assessmentMode: effectiveSettings.assessmentMode || 'DUDI_ONLY',
            weightDudi: effectiveSettings.weightDudi ?? 70,
            weightLaporan: effectiveSettings.weightLaporan ?? 15,
            weightSidang: effectiveSettings.weightSidang ?? 15,
          } : undefined}
          onOpenSettings={() => {
            setFormMode(effectiveSettings?.assessmentMode || 'DUDI_ONLY');
            setFormWeightDudi(effectiveSettings?.weightDudi ?? 70);
            setFormWeightLaporan(effectiveSettings?.weightLaporan ?? 15);
            setFormWeightSidang(effectiveSettings?.weightSidang ?? 15);
            setShowSettingsModal(true);
          }}
          canManageAll={canManageAll}
          activeGuruId={activeGuruId}
          isKaprog={isKaprog || isJurusanScoped}
          isWaliKelas={isWaliKelas}
          walikelasKelas={walikelasKelas}
          allScopedCount={allScopedCount}
          myGuidanceCountNilai={myGuidanceCountNilai}
          guidanceScope={guidanceScope}
          setGuidanceScope={setGuidanceScope}
          isMobile={isMobile}
          statusFilter={statusFilter}
          setStatusFilter={setStatusFilter}
          selectedKelas={selectedKelas}
          setSelectedKelas={setSelectedKelas}
          smartClassOptions={smartClassOptions}
          scoresCount={isJurusanScoped || isWaliKelas ? allScopedCount : scores.length}
          isLoadingRekap={isLoadingRekap}
          onSaveBatch={handleSaveBatch}
          isSavingBatch={saveBatchMutation.isPending}
          displayedScoresLength={displayedScores.length}
        />

        <Suspense fallback={<PklSpreadsheetSkeleton isMobile={isMobile} />}>
          {(activeTab === 'dudi' || activeTab === 'nilai') && (
            <PklNilaiIndustriTab
              hideFilterCard={true}
              canManageAll={canManageAll}
              activeGuruId={activeGuruId || undefined}
              isKaprog={isKaprog || isJurusanScoped}
              isWaliKelas={isWaliKelas}
              walikelasKelas={walikelasKelas}
              allScopedCount={allScopedCount}
              myGuidanceCountNilai={myGuidanceCountNilai}
              guidanceScope={guidanceScope}
              setGuidanceScope={setGuidanceScope}
              isMobile={isMobile}
              statusFilter={statusFilter}
              setStatusFilter={setStatusFilter}
              selectedTp={selectedTp}
              selectedSemester={selectedSemester}
              setSelectedTp={setSelectedTp}
              setSelectedSemester={setSelectedSemester}
              tpOptions={tpOptions}
              semesterOptions={semesterOptions}
              isLoadingTp={isLoadingTp}
              isLoadingSem={isLoadingSem}
              selectedKelas={selectedKelas}
              setSelectedKelas={setSelectedKelas}
              smartClassOptions={smartClassOptions}
              isLoadingRekap={isLoadingRekap}
              totalRawScores={scores.length}
              onSaveBatch={handleSaveBatch}
              isSavingBatch={saveBatchMutation.isPending}
              displayedScores={displayedScores}
              paginatedScores={paginatedScores}
              currentPage={currentPage}
              totalPages={totalPages}
              itemsPerPage={itemsPerPage}
              setItemsPerPage={setItemsPerPage}
              setCurrentPage={setCurrentPage}
              handleScoreChange={handleScoreChange}
              handleApplyToSameMitra={handleApplyToSameMitra}
              handleSyncFromDailyAttendance={handleSyncFromDailyAttendance}
              onNavigateCetakRapor={handleNavigateCetakRapor}
            />
          )}

          {activeTab === 'sidang' && (
            <PklNilaiSidangTab
              hideFilterCard={true}
              canManageAll={canManageAll}
              activeGuruId={activeGuruId || undefined}
              isKaprog={isKaprog || isJurusanScoped}
              isWaliKelas={isWaliKelas}
              walikelasKelas={walikelasKelas}
              allScopedCount={allScopedCount}
              myGuidanceCountNilai={myGuidanceCountNilai}
              guidanceScope={guidanceScope}
              setGuidanceScope={setGuidanceScope}
              isMobile={isMobile}
              statusFilter={statusFilter}
              setStatusFilter={setStatusFilter}
              selectedTp={selectedTp}
              selectedSemester={selectedSemester}
              setSelectedTp={setSelectedTp}
              setSelectedSemester={setSelectedSemester}
              tpOptions={tpOptions}
              semesterOptions={semesterOptions}
              isLoadingTp={isLoadingTp}
              isLoadingSem={isLoadingSem}
              selectedKelas={selectedKelas}
              setSelectedKelas={setSelectedKelas}
              smartClassOptions={smartClassOptions}
              isLoadingRekap={isLoadingRekap}
              totalRawScores={scores.length}
              isCompositeMode={isCompositeMode}
              effectiveSettings={effectiveSettings ? {
                assessmentMode: effectiveSettings.assessmentMode || 'DUDI_ONLY',
                weightDudi: effectiveSettings.weightDudi ?? 70,
                weightLaporan: effectiveSettings.weightLaporan ?? 15,
                weightSidang: effectiveSettings.weightSidang ?? 15,
              } : undefined}
              onSaveBatch={handleSaveBatch}
              isSavingBatch={saveBatchMutation.isPending}
              displayedScores={displayedScores}
              paginatedScores={paginatedScores}
              currentPage={currentPage}
              totalPages={totalPages}
              itemsPerPage={itemsPerPage}
              setItemsPerPage={setItemsPerPage}
              setCurrentPage={setCurrentPage}
              handleScoreChange={handleScoreChange}
              onNavigateCetakRapor={handleNavigateCetakRapor}
            />
          )}
        </Suspense>
      </SectionCard>

      <Suspense fallback={null}>
        {showSettingsModal && (
          <PklSkemaSettingsModal
            isOpen={showSettingsModal}
            onClose={() => setShowSettingsModal(false)}
            canEditScheme={canEditScheme}
            selectedTp={selectedTp}
            formMode={formMode}
            setFormMode={setFormMode}
            formWeightDudi={formWeightDudi}
            setFormWeightDudi={setFormWeightDudi}
            formWeightLaporan={formWeightLaporan}
            setFormWeightLaporan={setFormWeightLaporan}
            formWeightSidang={formWeightSidang}
            setFormWeightSidang={setFormWeightSidang}
            onSave={(payload) => updateSettingsMutation.mutate(payload)}
            isSaving={updateSettingsMutation.isPending}
            onNavigateToSettings={() => {
              setShowSettingsModal(false);
              navigate(`/hubin/settings?tab=skema${selectedTp ? `&tp=${selectedTp}` : ''}`);
            }}
          />
        )}
      </Suspense>
    </div>
  );
});

NilaiPklView.displayName = 'NilaiPklView';
export default NilaiPklView;
