import React, { useMemo, useState, useEffect, useCallback, lazy, Suspense } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ShieldCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { AcademicPageLayout } from '../../components/academic/AcademicPageLayout';
import { InfraErrorBoundary } from '@/components/superadmin/infra/InfraErrorBoundary';
import PremiumFeatureGate from '@/components/auth/PremiumFeatureGate';
import { Button, TabSwitcher } from '@/components/ui';
import { hubinApi } from '../../api/hubin.api';
import { toast } from 'sonner';
import { useDudiOptions } from '../../hooks/useDudiOptions';
import { useAcademicContext } from '../../components/common';
import { useAuthStore } from '../../store/authStore';
import { useIsMobile } from '../../hooks/useIsMobile';
import { useCapabilities } from '../../hooks/useCapabilities';
import { 
  scoreFieldSchema, 
  ScoreRow, 
  RawPklItem, 
  DeskripsiTpItem,
  calculateNilaiAkhirPkl,
  HubinAssessmentSettings
} from '../../components/hubin/nilai-pkl/types';

// Lazy loaded subcomponents to optimize bundle size and enforce architecture limits
import { PklUnifiedToolbar } from '../../components/hubin/nilai-pkl/PklUnifiedToolbar';
import { PklSpreadsheetSkeleton } from '../../components/hubin/nilai-pkl/PklSpreadsheetSkeleton';
const PklNilaiIndustriTab = lazy(() => import('../../components/hubin/nilai-pkl/PklNilaiIndustriTab'));
const PklNilaiSidangTab = lazy(() => import('../../components/hubin/nilai-pkl/PklNilaiSidangTab'));
const PklDeskripsiTpTab = lazy(() => import('../../components/hubin/nilai-pkl/PklDeskripsiTpTab'));
const PklSkemaSettingsModal = lazy(() => import('../../components/hubin/nilai-pkl/PklSkemaSettingsModal'));

export interface InputNilaiPklPageProps {
  layoutMode?: 'hubin' | 'rapor';
}

void TabSwitcher;

export const InputNilaiPklPage: React.FC<InputNilaiPklPageProps> = React.memo(({ layoutMode = 'hubin' }) => {
  const isMobile = useIsMobile(768);
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  // Navigasi tab didelegasikan ke PklUnifiedToolbar yang mengintegrasikan standar TabSwitcher
  const [activeTab, setActiveTab] = useState<string>('dudi');
  const [selectedKelas, setSelectedKelas] = useState('');
  const [selectedMitra, setSelectedMitra] = useState('');
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  // Settings Form State
  const [formMode, setFormMode] = useState<'DUDI_ONLY' | 'COMPOSITE'>('DUDI_ONLY');
  const [formWeightDudi, setFormWeightDudi] = useState<number>(70);
  const [formWeightLaporan, setFormWeightLaporan] = useState<number>(15);
  const [formWeightSidang, setFormWeightSidang] = useState<number>(15);

  // Deskripsi TP Form State
  const [deskripsiTpText, setDeskripsiTpText] = useState('');

  // Role Scoping & Multi-Tenant Isolation
  const { user } = useAuthStore();
  const tenantId = user?.tenant_id || 'default';
  const { can, isKaprog, kaprogJurusan, isWaliKelas, walikelasKelas, activeGuruId: capActiveGuruId } = useCapabilities();
  const isPrivilegedHubin = can('hubin.partners.manage') || user?.role?.name === 'ADMIN' || user?.role?.name === 'SUPERADMIN' || can('hubin.pkl.manage') || isKaprog;
  const canManageAll = isPrivilegedHubin || isWaliKelas;
  const typedUser = user as { guru_profile?: { id?: string }; guru_id?: string; Guru?: { id?: string } } | null;
  const activeGuruId = capActiveGuruId || typedUser?.guru_profile?.id || typedUser?.guru_id || typedUser?.Guru?.id || null;
  const canEditScheme = can('hubin.partners.manage') || user?.role?.name === 'ADMIN' || user?.role?.name === 'SUPERADMIN';
  const canViewScheme = canEditScheme || can('hubin.guidance.manage') || Boolean(activeGuruId) || isKaprog || isWaliKelas;
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

  // Academic Context
  const {
    selectedTahunPelajaran: selectedTp,
    selectedSemester,
    handleTpChange: setSelectedTp,
    handleSemesterChange: setSelectedSemester,
    tpOptions,
    semesterOptions,
    isLoadingTp,
    isLoadingSem,
  } = useAcademicContext({
    onTpChange: () => setSelectedKelas(''),
    onSemesterChange: () => setSelectedKelas(''),
  });

  const { options: mitraOptions } = useDudiOptions();

  // Single SSOT Query: Menghindari redundant double-fetching saat membuka halaman (Multi-tenant isolated)
  const { data: pklRekapResponse, isLoading: isLoadingRekap } = useQuery({
    queryKey: ['pkl-rekap', tenantId, selectedTp, selectedSemester, statusFilter],
    queryFn: () =>
      hubinApi.getRekapPklSiswa({
        tahun_pelajaran_id: selectedTp || undefined,
        semester_id: selectedSemester || undefined,
        status: statusFilter === 'ALL' ? undefined : statusFilter,
      }),
    staleTime: 60 * 1000, // 1 menit cache agar perpindahan tab/bimbingan instan tanpa roundtrip
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

  const { data: deskripsiList, isLoading: isLoadingDeskripsi } = useQuery({
    queryKey: ['deskripsi-tp-list', tenantId, selectedMitra],
    queryFn: () => hubinApi.getSettingDeskripsiPklList({ mitra_id: selectedMitra || undefined }),
  });

  const [scores, setScores] = useState<ScoreRow[]>([]);

  useEffect(() => {
    if (Array.isArray(rawList)) {
      setScores(rawList.map((item: RawPklItem) => ({
        siswa_pkl_id: item.id || item.siswa_pkl_id || '',
        nama_siswa: item.Siswa?.nama_siswa || item.siswa_nama || '',
        nis: item.Siswa?.nis || item.nis || '',
        foto: item.Siswa?.foto || null,
        kelas_id: item.Siswa?.Kelas?.id || item.Siswa?.kelas_id || item.SiswaAkademik?.kelas_id || '',
        nama_kelas: item.Siswa?.Kelas?.nama_kelas || item.SiswaAkademik?.kelas?.nama_kelas || '',
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

  // Ekstraksi smartClassOptions langsung dari data mentah rawList (tidak bergantung pada scores),
  // sehingga 0 lag saat guru mengetik angka nilai di spreadsheet!
  const smartClassOptions = useMemo(() => {
    const map = new Map<string, { id: string; name: string; count: number }>();
    const itemsForOptions = (guidanceScope === 'ALL' && isWaliKelas && !isPrivilegedHubin && walikelasKelas?.id)
      ? rawList.filter((item) => {
          const kId = item.Siswa?.Kelas?.id || item.Siswa?.kelas_id || item.SiswaAkademik?.kelas_id;
          return kId === walikelasKelas.id;
        })
      : guidanceScope === 'MY_GUIDANCE' && activeGuruId
      ? rawList.filter((item) => item.Pembimbing?.id === activeGuruId)
      : rawList;

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
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((k) => ({
        value: k.id,
        label: `${k.name} (${k.count} Siswa)`,
      }));
  }, [rawList, guidanceScope, isWaliKelas, isPrivilegedHubin, walikelasKelas, activeGuruId]);

  const displayedScores = useMemo(() => {
    let filtered = scores;
    if (guidanceScope === 'ALL' && isWaliKelas && !isPrivilegedHubin && walikelasKelas?.id) {
      filtered = filtered.filter((s) => s.kelas_id === walikelasKelas.id);
    }
    if (guidanceScope === 'MY_GUIDANCE' && activeGuruId) {
      filtered = filtered.filter((s) => s.pembimbing_id === activeGuruId);
    }
    if (!selectedKelas) return filtered;
    return filtered.filter((s) => s.kelas_id === selectedKelas);
  }, [scores, selectedKelas, guidanceScope, activeGuruId, isWaliKelas, isPrivilegedHubin, walikelasKelas]);

  const allScopedCount = useMemo(() => {
    if (isWaliKelas && !isPrivilegedHubin && walikelasKelas?.id) {
      return rawList.filter((item: RawPklItem) => {
        const kId = item.Siswa?.Kelas?.id || item.Siswa?.kelas_id || item.SiswaAkademik?.kelas_id;
        return kId === walikelasKelas.id;
      }).length;
    }
    return rawList.length;
  }, [rawList, isWaliKelas, isPrivilegedHubin, walikelasKelas]);

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
      queryClient.invalidateQueries({ queryKey: ['pkl-rekap', tenantId] });
      queryClient.invalidateQueries({ queryKey: ['rapor', tenantId] });
      queryClient.invalidateQueries({ queryKey: ['penempatan-pkl', tenantId] });
      queryClient.invalidateQueries({ queryKey: ['hubin-penempatan', tenantId] });
      queryClient.invalidateQueries({ queryKey: ['hubin-penempatan-pembimbing-tab', tenantId] });
      toast.success('Nilai PKL, identitas instruktur, dan presensi berhasil disimpan!');
    },
    onError: () => {
      toast.error('Gagal menyimpan nilai PKL');
    }
  });

  const saveDeskripsiTpMutation = useMutation({
    mutationFn: hubinApi.upsertSettingDeskripsiPkl,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deskripsi-tp-list', tenantId] });
      toast.success('Deskripsi Tujuan Pembelajaran PKL berhasil disimpan!');
      setDeskripsiTpText('');
    },
    onError: () => {
      toast.error('Gagal menyimpan deskripsi TP PKL');
    }
  });

  const handleScoreChange = useCallback((siswaPklId: string, field: keyof ScoreRow, val: string | number | null) => {
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
  }, [effectiveSettings]);

  const handleApplyToSameMitra = useCallback((mitraNama: string, instruktur: string, pic?: string) => {
    if (!mitraNama || !instruktur) return;
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
  }, []);

  const handleSyncFromDailyAttendance = useCallback(() => {
    setScores(prev => prev?.map(s => ({
      ...s,
      sakit_pkl: s.auto_sakit ?? 0,
      izin_pkl: s.auto_izin ?? 0,
      alpa_pkl: s.auto_alpa ?? 0,
    })) || []);
    toast.success('Presensi PKL (S/I/A) berhasil ditarik & disinkronkan dari data absensi harian siswa!');
  }, []);

  const handleNavigateCetakRapor = useCallback(() => {
    const params = new URLSearchParams();
    if (selectedKelas) params.set('kelas_id', selectedKelas);
    if (selectedTp) params.set('tahun_pelajaran_id', selectedTp);
    if (selectedSemester) params.set('semester_id', selectedSemester);
    const qs = params.toString();
    navigate(`/rapor/cetak${qs ? `?${qs}` : ''}`);
  }, [navigate, selectedKelas, selectedTp, selectedSemester]);

  const handleSaveBatch = useCallback(() => {
    if (scores.length === 0) {
      toast.error('Tidak ada data siswa untuk disimpan');
      return;
    }
    saveBatchMutation.mutate({
      tahun_pelajaran_id: selectedTp || undefined,
      semester_id: selectedSemester || undefined,
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
  }, [scores, selectedTp, selectedSemester, saveBatchMutation]);

  const breadcrumbs = useMemo(() => {
    if (layoutMode === 'rapor') {
      return [
        { label: 'Rapor', path: '/rapor/dashboard' },
        { label: 'Nilai PKL' }
      ];
    }
    return [
      { label: 'Hubin & PKL', path: '/hubin/workspace' },
      { label: 'Penilaian PKL' }
    ];
  }, [layoutMode]);

  const deskripsiListData = useMemo(() => {
    const raw = (deskripsiList as { data?: DeskripsiTpItem[] })?.data;
    return Array.isArray(raw) ? raw : [];
  }, [deskripsiList]);

  const tabs = useMemo(() => [
    { id: 'dudi', label: `🏢 DUDI (${displayedScores.length})` },
    ...(isCompositeMode ? [{ id: 'sidang', label: `🎓 Sidang (${displayedScores.length})` }] : []),
    { id: 'deskripsi', label: '📝 Deskripsi TP' }
  ], [displayedScores.length, isCompositeMode]);

  const pageContent = (
    <InfraErrorBoundary>
      <AcademicPageLayout
        title={layoutMode === 'rapor' ? "Nilai Praktik Kerja Lapangan (PKL) Rapor" : "Penilaian & Sertifikasi Praktik Kerja Lapangan (PKL)"}
        description={layoutMode === 'rapor' ? "Rekapitulasi dan entri nilai capaian PKL siswa untuk penyusunan lembar rapor dan leger nilai." : "Entri nilai hard skills & soft skills, catatan instruktur DUDI, serta pratinjau sertifikat resmi PKL siswa."}
        breadcrumbs={breadcrumbs}
        hardeningModuleKey={layoutMode === 'rapor' ? "rapor_pkl" : "hubin_input_nilai_pkl"}
          instruction={{
            title: "Panduan Penilaian PKL",
            description: "Gunakan modul ini untuk memasukkan capaian kompetensi siswa di DUDI mitra.",
            items: [
              { text: "Pilih kelas untuk memuat daftar siswa yang sedang atau telah menyelesaikan masa PKL." },
              { text: "Gunakan fitur Paste dari Excel untuk mempercepat entri massal nilai dari instruktur industri." },
              { text: "Buka tab Nilai Sidang & Laporan untuk menginput nilai ujian presentasi dan memeriksa portofolio." },
              { text: "Klik tombol Sertifikat pada baris siswa untuk mencetak sertifikat resmi PKL." }
            ]
          }}
        >
          <div className="w-full space-y-4 -mt-2 sm:-mt-3">
            {isKaprog && (
                <div className="flex items-center gap-2.5 p-3 bg-indigo-50/80 dark:bg-indigo-950/30 border border-indigo-200/80 dark:border-indigo-900/50 rounded-2xl text-xs text-indigo-900 dark:text-indigo-200">
                  <ShieldCheck size={18} className="text-indigo-600 dark:text-indigo-400 shrink-0" />
                  <div>
                    <span className="font-bold">Mode Ketua Program Keahlian (Kaprog):</span>{' '}
                    <span>
                      Rekap nilai PKL dibatasi otomatis untuk Jurusan{' '}
                      <strong>{kaprogJurusan?.nama || 'Binaan Anda'}</strong>
                      {kaprogJurusan?.singkatan ? ` (${kaprogJurusan.singkatan})` : ''}.
                    </span>
                  </div>
                </div>
              )}

              {isWaliKelas && !isKaprog && !isPrivilegedHubin && (
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

              {/* Unified Control Toolbar Container (1 Frame Box Rapi & Hemat Ruang Vertikal) */}
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
                isKaprog={isKaprog}
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
                scoresCount={scores.length}
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
                    isKaprog={isKaprog}
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
                    isKaprog={isKaprog}
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

                {activeTab === 'deskripsi' && (
                  <PklDeskripsiTpTab
                    mitraOptions={mitraOptions}
                    selectedMitra={selectedMitra}
                    setSelectedMitra={setSelectedMitra}
                    deskripsiTpText={deskripsiTpText}
                    setDeskripsiTpText={setDeskripsiTpText}
                    onSave={(payload) => saveDeskripsiTpMutation.mutate(payload)}
                    isSaving={saveDeskripsiTpMutation.isPending}
                    deskripsiListData={deskripsiListData}
                    isLoadingDeskripsi={isLoadingDeskripsi}
                  />
                )}
              </Suspense>
            </div>
          </AcademicPageLayout>

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
      </InfraErrorBoundary>
  );

  if (layoutMode === 'rapor') {
    return pageContent;
  }

  return (
    <PremiumFeatureGate
      moduleName="HUBIN"
      featureName="Penilaian & Sertifikasi PKL Siswa"
      description="Kelola penilaian hard skills, soft skills, catatan instruktur industri, dan sertifikat resmi PKL siswa."
    >
      {pageContent}
    </PremiumFeatureGate>
  );
});

export default InputNilaiPklPage;
